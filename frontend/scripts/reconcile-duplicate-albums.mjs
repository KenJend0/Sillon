/**
 * One-time reconciliation of duplicate albums (same artist + canonical_key,
 * different MBID — typically a punctuation/typography variant imported twice
 * before the canonical-key duplicate check existed in importAlbumFromMusicBrainz).
 *
 * For each duplicate group:
 *   1. Picks the album to KEEP: most complete tracklist first (track count —
 *      diary_entries reference album_id directly, so a 0-track album can
 *      still have engagement and must not win over a complete one), then
 *      engagement (reviews + listeners), then earliest created_at.
 *   2. Matches the duplicate's tracks to the kept album's tracks by
 *      normalized title — PARTIAL matches are allowed (different editions,
 *      incomplete imports). Tracks on the duplicate with no equivalent on the
 *      kept album are reported (titles + any track_diary_entries on them)
 *      instead of silently lost to the cascade delete in step 5.
 *   3. Reattributes diary_entries, track_diary_entries (+ remapped track_id),
 *      saved_albums, user_favorite_albums to the kept album/tracks, dropping
 *      a row instead of reattributing it when that would violate a
 *      UNIQUE(user_id, ...) constraint (the user already has the kept version).
 *   4. Deletes external_ids for the removed album + its tracks (no FK/CASCADE
 *      on that table — orphans would otherwise survive the deletion below).
 *   5. Deletes the duplicate album (cascades tracks + every other FK'd table:
 *      curator_picks, album_genre_votes, list_items, album_metadata,
 *      similar_albums_cache, recommendation_feedback, track_metadata,
 *      user_track_recommendations).
 *
 * curator_picks and list_items are editorial/user-curated, not just
 * engagement data — this script REPORTS how many rows would be lost to the
 * cascade in step 5 (per group) instead of silently deleting them. Review
 * those counts before running --apply; move the pick/list item to the kept
 * album by hand first if it matters.
 *
 * Usage (from frontend/ directory):
 *   node --env-file=.env.local scripts/reconcile-duplicate-albums.mjs            (dry-run, default)
 *   node --env-file=.env.local scripts/reconcile-duplicate-albums.mjs --apply    (writes for real)
 */

import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Keep in sync with frontend/lib/textNormalize.ts — only used here to match
// track titles across the duplicate pair, not to compute canonical_key.
function normalizeTitle(str) {
  return str
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\b0+(\d)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

async function findDuplicateGroups() {
  // PostgREST caps unpaginated selects at 1000 rows by default — with 1415+
  // albums, an unpaginated fetch here silently truncates the result set and
  // hides duplicate groups whose members land past the cutoff.
  const PAGE_SIZE = 1000;
  const all = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('albums')
      .select('id, artist_id, canonical_key, title, created_at')
      .not('canonical_key', 'is', null)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`fetch albums failed: ${error.message}`);
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
  }

  const groups = new Map();
  for (const album of all) {
    const key = `${album.artist_id}|||${album.canonical_key}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(album);
  }
  return [...groups.values()].filter((g) => g.length > 1);
}

async function getStats(albumIds) {
  const { data, error } = await supabase
    .from('album_stats')
    .select('album_id, reviews_count, listeners_count')
    .in('album_id', albumIds);
  if (error) throw new Error(`fetch album_stats failed: ${error.message}`);
  const map = new Map(albumIds.map((id) => [id, { reviews_count: 0, listeners_count: 0 }]));
  for (const row of data) map.set(row.album_id, row);
  return map;
}

async function getTrackCounts(albumIds) {
  const map = new Map();
  for (const id of albumIds) {
    const { count, error } = await supabase.from('tracks').select('id', { count: 'exact', head: true }).eq('album_id', id);
    if (error) throw new Error(`fetch track count failed: ${error.message}`);
    map.set(id, count ?? 0);
  }
  return map;
}

function pickKept(group, statsMap, trackCountMap) {
  return [...group].sort((a, b) => {
    const tracksA = trackCountMap.get(a.id);
    const tracksB = trackCountMap.get(b.id);
    if (tracksA !== tracksB) return tracksB - tracksA;
    const sa = statsMap.get(a.id);
    const sb = statsMap.get(b.id);
    const engagementA = sa.reviews_count + sa.listeners_count;
    const engagementB = sb.reviews_count + sb.listeners_count;
    if (engagementA !== engagementB) return engagementB - engagementA;
    return new Date(a.created_at) - new Date(b.created_at);
  })[0];
}

/** Matches the duplicate's tracks to the kept album's tracks by normalized
 *  title. Partial matches are expected (different editions/incomplete
 *  imports) — unmatched duplicate tracks are returned separately so the
 *  caller can report what's about to be lost rather than silently cascading. */
async function matchTracks(keepId, dupId) {
  const [{ data: keepTracks, error: e1 }, { data: dupTracks, error: e2 }] = await Promise.all([
    supabase.from('tracks').select('id, title').eq('album_id', keepId),
    supabase.from('tracks').select('id, title').eq('album_id', dupId),
  ]);
  if (e1 || e2) throw new Error(`fetch tracks failed: ${e1?.message || e2?.message}`);

  const keepByTitle = new Map(keepTracks.map((t) => [normalizeTitle(t.title), t.id]));
  const pairs = [];
  const unmatchedDupTracks = [];
  for (const dt of dupTracks) {
    const keepTrackId = keepByTitle.get(normalizeTitle(dt.title));
    if (!keepTrackId) {
      unmatchedDupTracks.push(dt);
      continue;
    }
    pairs.push({ dupTrackId: dt.id, keepTrackId });
  }
  return { pairs, unmatchedDupTracks };
}

/** For tracks about to be lost (no equivalent on the kept album), reports how
 *  many track_diary_entries reference them — these rows will be cascade-deleted
 *  along with the track, with no destination to reattribute them to. */
async function countOrphanedTrackEntries(unmatchedDupTracks) {
  if (unmatchedDupTracks.length === 0) return 0;
  const { count, error } = await supabase
    .from('track_diary_entries')
    .select('id', { count: 'exact', head: true })
    .in('track_id', unmatchedDupTracks.map((t) => t.id));
  if (error) throw new Error(`fetch track_diary_entries failed: ${error.message}`);
  return count ?? 0;
}

async function countCascadeLosses(dupId) {
  const [{ count: curatorPicks }, { count: listItems }, { count: genreVotes }] = await Promise.all([
    supabase.from('curator_picks').select('id', { count: 'exact', head: true }).eq('album_id', dupId),
    supabase.from('list_items').select('id', { count: 'exact', head: true }).eq('album_id', dupId),
    supabase.from('album_genre_votes').select('id', { count: 'exact', head: true }).eq('album_id', dupId),
  ]);
  return { curatorPicks: curatorPicks ?? 0, listItems: listItems ?? 0, genreVotes: genreVotes ?? 0 };
}

/** Reattribute rows from dupId to keepId for a user-scoped table with a
 *  UNIQUE(user_id, ...) constraint — drop the dup row instead of reattributing
 *  it when the user already has a row for the kept album. */
async function reattributeUserScoped(table, column, dupId, keepId) {
  const { data: dupRows, error } = await supabase.from(table).select('id, user_id').eq(column, dupId);
  if (error) throw new Error(`fetch ${table} failed: ${error.message}`);
  let moved = 0;
  let dropped = 0;
  for (const row of dupRows) {
    if (APPLY) {
      const { data: existing } = await supabase
        .from(table)
        .select('id')
        .eq('user_id', row.user_id)
        .eq(column, keepId)
        .maybeSingle();
      if (existing) {
        await supabase.from(table).delete().eq('id', row.id);
        dropped++;
      } else {
        await supabase.from(table).update({ [column]: keepId }).eq('id', row.id);
        moved++;
      }
    } else {
      moved++; // dry-run: can't reliably predict conflicts without locking, just report volume
    }
  }
  return { moved, dropped };
}

async function reconcileGroup(group) {
  const albumIds = group.map((a) => a.id);
  const [statsMap, trackCountMap] = await Promise.all([getStats(albumIds), getTrackCounts(albumIds)]);
  const kept = pickKept(group, statsMap, trackCountMap);
  const duplicates = group.filter((a) => a.id !== kept.id);

  console.log(`\n=== Group: "${kept.title}" (${kept.artist_id}) — keeping ${kept.id} (${trackCountMap.get(kept.id)} tracks) ===`);

  for (const dup of duplicates) {
    console.log(`  − duplicate ${dup.id} ("${dup.title}", ${trackCountMap.get(dup.id)} tracks)`);

    const { pairs: trackPairs, unmatchedDupTracks } = await matchTracks(kept.id, dup.id);
    console.log(`    tracks: ${trackPairs.length} matched`);
    if (unmatchedDupTracks.length > 0) {
      const orphanedEntries = await countOrphanedTrackEntries(unmatchedDupTracks);
      console.log(`    ⚠ ${unmatchedDupTracks.length} duplicate track(s) with no equivalent on the kept album, will be lost: ${unmatchedDupTracks.map((t) => t.title).join(', ')}`);
      if (orphanedEntries > 0) {
        console.log(`      ⚠⚠ ${orphanedEntries} track_diary_entries (ratings/reviews) on those tracks will be cascade-deleted — check after --apply`);
      }
    }

    const losses = await countCascadeLosses(dup.id);
    if (losses.curatorPicks > 0 || losses.listItems > 0 || losses.genreVotes > 0) {
      console.log(`    ⚠ would cascade-delete: ${losses.curatorPicks} curator_picks, ${losses.listItems} list_items, ${losses.genreVotes} album_genre_votes — review before --apply`);
    }

    if (APPLY) {
      // 1. track_diary_entries — remap track_id + album_id per matched pair, drop on UNIQUE(user_id, track_id, listened_at) conflict
      for (const { dupTrackId, keepTrackId } of trackPairs) {
        const { data: entries } = await supabase
          .from('track_diary_entries')
          .select('id, user_id, listened_at')
          .eq('track_id', dupTrackId);
        for (const entry of entries ?? []) {
          const { data: conflict } = await supabase
            .from('track_diary_entries')
            .select('id')
            .eq('user_id', entry.user_id)
            .eq('track_id', keepTrackId)
            .eq('listened_at', entry.listened_at)
            .maybeSingle();
          if (conflict) {
            await supabase.from('track_diary_entries').delete().eq('id', entry.id);
          } else {
            await supabase.from('track_diary_entries').update({ track_id: keepTrackId, album_id: kept.id }).eq('id', entry.id);
          }
        }
        await supabase.from('external_ids').delete().eq('entity_type', 'track').eq('entity_id', dupTrackId);
      }

      // 2. diary_entries — no UNIQUE(user_id, album_id), plain reassignment (album_stats dedups per-user via DISTINCT ON anyway)
      await supabase.from('diary_entries').update({ album_id: kept.id }).eq('album_id', dup.id);

      // 3. saved_albums / user_favorite_albums — UNIQUE(user_id, album_id), drop on conflict
      const savedResult = await reattributeUserScoped('saved_albums', 'album_id', dup.id, kept.id);
      const favResult = await reattributeUserScoped('user_favorite_albums', 'album_id', dup.id, kept.id);
      console.log(`    saved_albums: moved ${savedResult.moved}, dropped ${savedResult.dropped} (already saved)`);
      console.log(`    user_favorite_albums: moved ${favResult.moved}, dropped ${favResult.dropped} (already favorited)`);

      // 4. external_ids for the album itself, then the album row (cascades everything else)
      await supabase.from('external_ids').delete().eq('entity_type', 'album').eq('entity_id', dup.id);
      const { error: deleteError } = await supabase.from('albums').delete().eq('id', dup.id);
      if (deleteError) {
        console.error(`    ✗ delete failed: ${deleteError.message}`);
      } else {
        console.log(`    ✓ merged into ${kept.id}`);
      }
    } else {
      const savedResult = await reattributeUserScoped('saved_albums', 'album_id', dup.id, kept.id);
      const favResult = await reattributeUserScoped('user_favorite_albums', 'album_id', dup.id, kept.id);
      console.log(`    [dry-run] would reattribute diary_entries, ${trackPairs.length} tracks' track_diary_entries, ~${savedResult.moved} saved_albums, ~${favResult.moved} user_favorite_albums, then delete the album`);
    }
  }
}

async function main() {
  const groups = await findDuplicateGroups();
  console.log(`${APPLY ? 'APPLY' : 'DRY-RUN'} — ${groups.length} duplicate groups found`);

  for (const group of groups) {
    await reconcileGroup(group);
  }

  console.log(`\nDone.${APPLY ? '' : ' Re-run with --apply to write changes.'}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

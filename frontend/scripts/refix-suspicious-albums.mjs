/**
 * Re-resolves albums whose stored mbid points at the WRONG MusicBrainz
 * release-group entirely (a Single/Live/Compilation/Remix homonym of the real
 * studio album) — the category repair-empty-track-albums.mjs flags as
 * SUSPICIOUS and refuses to touch, since inserting tracks from a wrong
 * release-group would silently attach wrong content to the album.
 *
 * Root cause: bulk-import-albums.mjs's original release-group search had no
 * primary-type/secondary-type filtering at all, so a title+artist match could
 * land on a homonymous Single/Live/Compilation instead of the real Album.
 *
 * This script re-runs that search WITH proper filtering (same allow/exclude
 * lists as the production app's searchMusicBrainzAlbums), and reports any
 * existing user activity on the album (diary entries, saved/favorited,
 * list items, curator picks) BEFORE proposing a change — the album_id itself
 * never changes (only mbid + tracks get added), so that activity is not at
 * risk, but you should still see it before touching anything.
 *
 * Usage (from frontend/ directory):
 *   node --env-file=.env.local scripts/refix-suspicious-albums.mjs            (dry-run, default)
 *   node --env-file=.env.local scripts/refix-suspicious-albums.mjs --apply    (writes for real)
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { isAcceptableReleaseGroup, pickBestRelease } from '../lib/musicbrainzReleasePolicy.mjs';

const MUSICBRAINZ_API = 'https://musicbrainz.org/ws/2';
const USER_AGENT = 'Waveform/1.0 (https://waveformapp.online)';
const DELAY_MS = 1300; // MB rate limit: 1 req/sec

const APPLY = process.argv.includes('--apply');
const excludeArg = process.argv.find((a) => a.startsWith('--exclude='));
const EXCLUDED_IDS = new Set(excludeArg ? excludeArg.slice('--exclude='.length).split(',') : []);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function mbFetch(url, attempt = 0) {
  const MAX = 3;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(10000) });
    if (res.status === 429 || res.status >= 500) {
      if (attempt < MAX) {
        await delay(DELAY_MS * 2 * (attempt + 1));
        return mbFetch(url, attempt + 1);
      }
      throw new Error(`MB ${res.status} after ${MAX} retries`);
    }
    return res;
  } catch (err) {
    if (attempt < MAX) {
      await delay(DELAY_MS * 2);
      return mbFetch(url, attempt + 1);
    }
    throw err;
  }
}

const SUSPICIOUS_TITLE_RE = /\(live\)|\(remix\)|\bremix\b|\(edit\)|home recording|\(instrumental\)/i;

async function findEmptyTrackAlbums() {
  const PAGE_SIZE = 1000;
  const all = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('albums')
      .select('id, artist_id, title, mbid, artists(name)')
      .not('mbid', 'is', null)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`fetch albums failed: ${error.message}`);
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
  }

  const albumsWithTracks = new Set();
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data: tracks, error: tracksError } = await supabase
      .from('tracks')
      .select('album_id')
      .range(from, from + PAGE_SIZE - 1);
    if (tracksError) throw new Error(`fetch tracks failed: ${tracksError.message}`);
    for (const t of tracks) albumsWithTracks.add(t.album_id);
    if (tracks.length < PAGE_SIZE) break;
  }

  return all.filter((a) => !albumsWithTracks.has(a.id));
}

async function getActivitySummary(albumId) {
  const [diary, saved, favorited, listItems, curatorPicks] = await Promise.all([
    supabase.from('diary_entries').select('id', { count: 'exact', head: true }).eq('album_id', albumId),
    supabase.from('saved_albums').select('id', { count: 'exact', head: true }).eq('album_id', albumId),
    supabase.from('user_favorite_albums').select('id', { count: 'exact', head: true }).eq('album_id', albumId),
    supabase.from('list_items').select('id', { count: 'exact', head: true }).eq('album_id', albumId),
    supabase.from('curator_picks').select('id', { count: 'exact', head: true }).eq('album_id', albumId),
  ]);
  return {
    diaryEntries: diary.count ?? 0,
    saved: saved.count ?? 0,
    favorited: favorited.count ?? 0,
    listItems: listItems.count ?? 0,
    curatorPicks: curatorPicks.count ?? 0,
  };
}

/** Searches MB by title+artist with the SAME type filtering the production
 * app applies (frontend/app/actions/musicbrainz.ts's searchMusicBrainzAlbums)
 * — this is what was missing from bulk-import-albums.mjs's original search. */
async function searchCorrectReleaseGroup(title, artist) {
  const esc = (s) => s.replace(/[+\-&|!(){}\[\]^~*?:\\\/]/g, ' ').trim();
  const query = `releasegroup:"${esc(title)}" AND artist:"${esc(artist)}"`;
  const url = `${MUSICBRAINZ_API}/release-group?query=${encodeURIComponent(query)}&fmt=json&limit=10`;
  const res = await mbFetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  const groups = data['release-groups'] || [];
  return groups
    .filter((g) => isAcceptableReleaseGroup(g))
    .sort((a, b) => (b.score || 0) - (a.score || 0));
}

async function getBestRelease(rgMbid) {
  const url = `${MUSICBRAINZ_API}/release-group/${encodeURIComponent(rgMbid)}?inc=releases+media&fmt=json`;
  const res = await mbFetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const releases = (data.releases || []).map((r) => ({
    id: r.id,
    status: r.status,
    trackCount: (r.media || []).reduce((sum, m) => sum + (m['track-count'] || 0), 0),
  }));
  return pickBestRelease(releases, 'most')?.id || null;
}

async function getReleaseDetails(releaseId) {
  const url = `${MUSICBRAINZ_API}/release/${encodeURIComponent(releaseId)}?inc=artist-credits+recordings+release-groups&fmt=json`;
  const res = await mbFetch(url);
  if (!res.ok) return null;
  return res.json();
}

async function processAlbum(album) {
  const artistName = album.artists?.name || '';
  const activity = await getActivitySummary(album.id);
  console.log(`  activity: ${activity.diaryEntries} diary entries, ${activity.saved} saved, ${activity.favorited} favorited, ${activity.listItems} list items, ${activity.curatorPicks} curator picks`);

  await delay(DELAY_MS);
  const candidates = await searchCorrectReleaseGroup(album.title, artistName);
  if (candidates.length === 0) {
    console.log(`  ✗ no valid Album/EP release-group found via search — needs fully manual handling`);
    return;
  }

  const best = candidates[0];
  if (best.id === album.mbid) {
    console.log(`  ✗ search's best valid match is the SAME release-group already stored (${best.id}) — the wrong content may be mistagged upstream in MB itself, needs manual handling`);
    return;
  }

  await delay(DELAY_MS);
  const releaseId = await getBestRelease(best.id);
  if (!releaseId) {
    console.log(`  ✗ candidate release-group "${best.title}" (${best.id}, score ${best.score}) has no usable release — needs manual handling`);
    return;
  }

  await delay(DELAY_MS);
  const releaseData = await getReleaseDetails(releaseId);
  if (!releaseData) {
    console.log(`  ✗ could not fetch release details for ${releaseId}`);
    return;
  }

  const tracks = (releaseData.media || []).flatMap((m) =>
    (m.tracks || []).map((t) => ({
      id: randomUUID(),
      album_id: album.id,
      artist_id: album.artist_id,
      title: t.title,
      track_no: t.position,
      disc_no: m.position ?? 1,
      duration_ms: t.length ?? t['track_or_recording_length'] ?? null,
      mbid: t.id,
    }))
  );

  if (tracks.length === 0) {
    console.log(`  ✗ candidate release-group "${best.title}" (${best.id}) still has no tracks listed — needs manual handling`);
    return;
  }

  const suspiciousTitles = tracks.filter((t) => SUSPICIOUS_TITLE_RE.test(t.title));
  if (suspiciousTitles.length / tracks.length >= 0.5) {
    console.log(`  ⚠ STILL SUSPICIOUS — new candidate "${best.title}" (${best.id}) has ${suspiciousTitles.length}/${tracks.length} live/remix/edit-looking titles too — needs manual handling`);
    return;
  }

  console.log(`  → candidate: "${best.title}" (${best.id}, score ${best.score}) — ${tracks.length} tracks (${tracks.slice(0, 3).map((t) => t.title).join(', ')}${tracks.length > 3 ? ', …' : ''})`);
  console.log(`    old mbid: ${album.mbid} → new mbid: ${best.id}`);

  if (!APPLY) return;

  const { error: albumErr } = await supabase.from('albums').update({ mbid: best.id }).eq('id', album.id);
  if (albumErr) {
    console.log(`  ✗ album mbid update failed: ${albumErr.message}`);
    return;
  }

  await supabase.from('external_ids').delete().eq('entity_type', 'album').eq('entity_id', album.id);
  await supabase.from('external_ids').insert({ entity_type: 'album', entity_id: album.id, source: 'musicbrainz', value: best.id });

  const { error: tracksErr } = await supabase.from('tracks').insert(tracks);
  if (tracksErr) {
    console.log(`  ✗ tracks insert failed: ${tracksErr.message}`);
    return;
  }

  const extRows = tracks.map((t) => ({ entity_type: 'track', entity_id: t.id, source: 'musicbrainz', value: t.mbid }));
  const { error: extErr } = await supabase.from('external_ids').insert(extRows);
  if (extErr) {
    console.log(`  ⚠ track external_ids insert failed (non-fatal): ${extErr.message}`);
  }

  console.log(`  ✓ re-resolved and repaired`);
}

async function main() {
  const albums = await findEmptyTrackAlbums();
  console.log(`${APPLY ? 'APPLY' : 'DRY-RUN'} — ${albums.length} albums still with zero tracks\n`);

  for (let i = 0; i < albums.length; i++) {
    const album = albums[i];
    console.log(`[${i + 1}/${albums.length}] "${album.title}" — ${album.artists?.name || '?'} (${album.id})`);
    if (EXCLUDED_IDS.has(album.id)) {
      console.log(`  ⊘ excluded via --exclude — skipping, handle manually`);
      continue;
    }
    try {
      await processAlbum(album);
    } catch (err) {
      console.log(`  ✗ exception: ${err.message}`);
    }
  }

  console.log(`\nDone.${APPLY ? '' : ' Re-run with --apply to write changes.'}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

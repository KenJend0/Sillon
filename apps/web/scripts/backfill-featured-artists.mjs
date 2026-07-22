/**
 * Backfill: artistes en featuring (album + pistes) pour les albums déjà en base
 *
 * Pour chaque album avec un mbid (toujours un mbid de release-group — invariant
 * vérifié à l'import) : résout la même release que l'import aurait choisie,
 * récupère son artist-credit (album + par piste), et écrit ce qui manque dans
 * album_featured_artists / track_featured_artists.
 *
 * Un seul fetch de release ramène déjà tout le tracklist avec ses artist-credits
 * — pas besoin d'un appel MB par piste. Coût réel : O(albums), pas O(pistes).
 *
 * Les pistes MB sont rattachées aux pistes existantes par titre canonique
 * (canonical_title, normalisation identique à l'import), PAS par mbid — les
 * mbid stockés ne sont pas assez fiables pour ce matching. Aucune nouvelle
 * ligne `tracks` n'est jamais créée.
 *
 * Idempotent : les inserts utilisent upsert + ignoreDuplicates, donc on peut
 * relancer le script (ou reprendre après --skip) sans dupliquer de lignes.
 *
 * Usage:
 *   # Dry run (par défaut, n'écrit rien) :
 *   node --env-file=.env.local scripts/backfill-featured-artists.mjs
 *
 *   # Applique les écritures :
 *   node --env-file=.env.local scripts/backfill-featured-artists.mjs --apply
 *
 *   # Reprend après une interruption (saute les N premiers albums) :
 *   node --env-file=.env.local scripts/backfill-featured-artists.mjs --apply --skip 500
 *
 *   # Par lots de 500 (reprend où le lot précédent s'est arrêté) :
 *   node --env-file=.env.local scripts/backfill-featured-artists.mjs --apply --skip 0    --limit 500
 *   node --env-file=.env.local scripts/backfill-featured-artists.mjs --apply --skip 500  --limit 500
 *   node --env-file=.env.local scripts/backfill-featured-artists.mjs --apply --skip 1000 --limit 500
 *
 * Respecte le rate-limit MusicBrainz (1 req/sec) automatiquement.
 * ~2000 albums × 1 req ≈ 35-45 minutes.
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { canonicalTrackTitle } from '../lib/trackCanonical.mjs';
import { pickBestRelease, releaseSelectionMode } from '../lib/musicbrainzReleasePolicy.mjs';

const MUSICBRAINZ_API = 'https://musicbrainz.org/ws/2';
const USER_AGENT = 'Sillon/1.0 (https://sillon.fm)';
const DELAY_MS = 1200; // slightly above 1s to stay safely under MB rate limit

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const apply = process.argv.includes('--apply');
const skipArgIndex = process.argv.indexOf('--skip');
const skipCount = skipArgIndex !== -1 ? parseInt(process.argv[skipArgIndex + 1], 10) || 0 : 0;
const limitArgIndex = process.argv.indexOf('--limit');
const limitCount = limitArgIndex !== -1 ? parseInt(process.argv[limitArgIndex + 1], 10) || 0 : 0;

async function fetchMB(url, attempt = 0) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(10_000),
    });

    if (res.status === 503 || res.status === 429) {
      if (attempt < 3) {
        console.log(`    ⏳ Rate limited, waiting ${(attempt + 2) * 2}s…`);
        await delay((attempt + 2) * 2000);
        return fetchMB(url, attempt + 1);
      }
    }

    return res;
  } catch (err) {
    if (attempt < 2) {
      await delay(2000);
      return fetchMB(url, attempt + 1);
    }
    throw err;
  }
}

/** Mirrors parseArtistCredit() in app/actions/musicbrainz.ts (kept inline here —
 *  this script runs standalone via `node`, it doesn't import the 'use server' module). */
function parseArtistCredit(value) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    const artist = row?.artist;
    if (!artist?.id || !artist?.name) return [];
    return [{ id: artist.id, name: artist.name, joinphrase: row.joinphrase || null }];
  });
}

/** Artists beyond the primary credit (index 0), each paired with the joinphrase
 *  that precedes them. */
function featuredFromCredit(credits) {
  return credits.slice(1).map((c, i) => ({
    mbid: c.id,
    name: c.name,
    joinphrase: credits[i].joinphrase ?? null,
  }));
}

const artistCache = new Map(); // mbid -> artistId, shared across albums in this run

async function getOrCreateArtistByMbid(mbid, name) {
  if (artistCache.has(mbid)) return artistCache.get(mbid);

  const { data: existing } = await supabase
    .from('artists')
    .select('id')
    .eq('mbid', mbid)
    .maybeSingle();

  if (existing) {
    artistCache.set(mbid, existing.id);
    return existing.id;
  }

  const newId = randomUUID();
  const { error } = await supabase.from('artists').insert({ id: newId, name, mbid });
  if (error) {
    console.log(`      ⚠️  Could not create artist "${name}": ${error.message}`);
    return null;
  }
  artistCache.set(mbid, newId);
  return newId;
}

async function main() {
  console.log('🎵 Sillon — Featured artists backfill\n');
  if (!apply) console.log('🔍 DRY RUN — no writes will be made (re-run with --apply)\n');
  if (skipCount > 0) console.log(`⏭️  Skipping first ${skipCount} album(s)\n`);

  // PostgREST caps each response at its max-rows setting (1000 by default) —
  // a single select() silently truncates past that, so we page through it.
  const PAGE_SIZE = 1000;
  const albums = [];
  for (let page = 0; ; page++) {
    const { data: pageRows, error: pageError } = await supabase
      .from('albums')
      .select('id, mbid, title')
      .not('mbid', 'is', null)
      .order('created_at', { ascending: true })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (pageError) {
      console.error('❌ Could not fetch albums:', pageError.message);
      process.exit(1);
    }
    if (!pageRows || pageRows.length === 0) break;
    albums.push(...pageRows);
    if (pageRows.length < PAGE_SIZE) break;
  }

  if (albums.length === 0) {
    console.log('✅ No albums to process.');
    return;
  }

  const targets = limitCount > 0
    ? albums.slice(skipCount, skipCount + limitCount)
    : albums.slice(skipCount);
  console.log(`Found ${albums.length} album(s) total, processing ${targets.length} (starting at offset ${skipCount}${limitCount > 0 ? `, limit ${limitCount}` : ''}).\n`);

  let albumsWithFeaturing = 0;
  let albumFeaturedRowsWritten = 0;
  let trackFeaturedRowsWritten = 0;
  let unmatchedTracks = 0;
  let errors = 0;

  for (let i = 0; i < targets.length; i++) {
    const album = targets[i];
    const globalIndex = skipCount + i;
    console.log(`[${globalIndex + 1}/${albums.length}] ${album.title}`);

    await delay(DELAY_MS);

    try {
      // albums.mbid is always a release-group MBID — resolve the same release the importer would.
      const rgRes = await fetchMB(`${MUSICBRAINZ_API}/release-group/${album.mbid}?inc=releases+media&fmt=json`);
      if (!rgRes.ok) {
        console.log(`    ❌ MB release-group lookup ${rgRes.status} — skipping`);
        errors++;
        continue;
      }
      const rgData = await rgRes.json();
      const releases = (rgData.releases || []).map((r) => ({
        id: r.id,
        status: r.status,
        trackCount: (r.media || []).reduce((sum, m) => sum + (m['track-count'] || 0), 0),
      }));
      if (releases.length === 0) {
        console.log('    ⚠️  No releases on this release-group — skipping');
        continue;
      }
      const best = pickBestRelease(releases, releaseSelectionMode(rgData['primary-type'])) ?? releases[0];

      await delay(DELAY_MS);
      const releaseRes = await fetchMB(
        `${MUSICBRAINZ_API}/release/${best.id}?inc=artist-credits+recordings+release-groups&fmt=json`
      );
      if (!releaseRes.ok) {
        console.log(`    ❌ MB release lookup ${releaseRes.status} — skipping`);
        errors++;
        continue;
      }
      const releaseData = await releaseRes.json();

      const albumFeatured = featuredFromCredit(parseArtistCredit(releaseData['artist-credit']));
      const mbTracks = (releaseData.media || []).flatMap((m) =>
        (m.tracks || []).map((t) => {
          const trackCredit = Array.isArray(t['artist-credit']) && t['artist-credit'].length > 0
            ? t['artist-credit']
            : t.recording?.['artist-credit'];
          return { title: t.title, featured: featuredFromCredit(parseArtistCredit(trackCredit)) };
        })
      );

      const hasAnyFeaturing = albumFeatured.length > 0 || mbTracks.some((t) => t.featured.length > 0);
      if (!hasAnyFeaturing) {
        console.log('    — no featuring on this release');
        continue;
      }

      albumsWithFeaturing++;

      // Existing local tracks, matched by canonical title — never by mbid (see header comment).
      const { data: existingTracks } = await supabase
        .from('tracks')
        .select('id, title, canonical_title')
        .eq('album_id', album.id);

      const trackIdByCanonicalTitle = new Map(
        (existingTracks || []).map((t) => [t.canonical_title || canonicalTrackTitle(t.title), t.id])
      );

      if (albumFeatured.length > 0) {
        console.log(`    🎤 Album feat.: ${albumFeatured.map((f) => f.name).join(', ')}`);
        if (apply) {
          const rows = [];
          for (let pos = 0; pos < albumFeatured.length; pos++) {
            const f = albumFeatured[pos];
            const artistId = await getOrCreateArtistByMbid(f.mbid, f.name);
            if (artistId) rows.push({ album_id: album.id, artist_id: artistId, position: pos, joinphrase: f.joinphrase });
          }
          if (rows.length > 0) {
            const { error } = await supabase
              .from('album_featured_artists')
              .upsert(rows, { onConflict: 'album_id,artist_id', ignoreDuplicates: true });
            if (error) console.log(`    ⚠️  album_featured_artists: ${error.message}`);
            else albumFeaturedRowsWritten += rows.length;
          }
        }
      }

      for (const mbTrack of mbTracks) {
        if (mbTrack.featured.length === 0) continue;

        const trackId = trackIdByCanonicalTitle.get(canonicalTrackTitle(mbTrack.title));
        if (!trackId) {
          unmatchedTracks++;
          console.log(`    ⚠️  No local track match for "${mbTrack.title}" (feat. ${mbTrack.featured.map((f) => f.name).join(', ')})`);
          continue;
        }

        console.log(`    🎤 "${mbTrack.title}" feat.: ${mbTrack.featured.map((f) => f.name).join(', ')}`);
        if (apply) {
          const rows = [];
          for (let pos = 0; pos < mbTrack.featured.length; pos++) {
            const f = mbTrack.featured[pos];
            const artistId = await getOrCreateArtistByMbid(f.mbid, f.name);
            if (artistId) rows.push({ track_id: trackId, artist_id: artistId, position: pos, joinphrase: f.joinphrase });
          }
          if (rows.length > 0) {
            const { error } = await supabase
              .from('track_featured_artists')
              .upsert(rows, { onConflict: 'track_id,artist_id', ignoreDuplicates: true });
            if (error) console.log(`    ⚠️  track_featured_artists: ${error.message}`);
            else trackFeaturedRowsWritten += rows.length;
          }
        }
      }
    } catch (err) {
      console.log(`    ❌ Error: ${err.message}`);
      errors++;
    }
  }

  console.log('\n────────────────────────────────');
  console.log(apply ? '✅ Done' : '🔍 Dry run done — re-run with --apply to write');
  console.log(`   Albums with featuring found : ${albumsWithFeaturing}`);
  console.log(`   album_featured_artists rows : ${albumFeaturedRowsWritten}`);
  console.log(`   track_featured_artists rows : ${trackFeaturedRowsWritten}`);
  console.log(`   Unmatched tracks            : ${unmatchedTracks}`);
  console.log(`   Errors                      : ${errors}`);
  if (skipCount + targets.length < albums.length) {
    console.log(`   To resume: --skip ${skipCount + targets.length}`);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

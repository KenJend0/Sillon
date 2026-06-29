/**
 * Repairs albums that exist in the DB with ZERO tracks.
 *
 * Root cause (fixed in bulk-import-albums.mjs's getBestReleaseId): the old
 * release selection picked the earliest-dated release in a release-group with
 * no regard for whether MusicBrainz actually lists any tracks for it — early
 * releases are often promos/regional pressings with an empty `media` array.
 * That produced ~190 albums (verified against bulk-import-albums.mjs's ALBUMS
 * list) that exist as a row but can never be rated per-track or show a
 * tracklist.
 *
 * This script does NOT create new albums — it fills in tracks for existing
 * ones, using the same artist_id and album_id, re-fetching the release-group
 * via the corrected "prefer Official, then most tracks" heuristic.
 *
 * Usage (from frontend/ directory):
 *   node --env-file=.env.local scripts/repair-empty-track-albums.mjs            (dry-run, default)
 *   node --env-file=.env.local scripts/repair-empty-track-albums.mjs --apply    (writes for real)
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { isAcceptableReleaseGroup, pickBestRelease, EXCLUDED_SECONDARY_TYPES } from '../lib/musicbrainzReleasePolicy.mjs';

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

/** Same heuristic as bulk-import-albums.mjs's getBestReleaseId, PLUS a check on
 * the release-GROUP's own primary/secondary type. The bulk-import script's
 * initial title search has no type filtering at all, so it can land on a
 * "Live"/"Compilation"/"Remix" release-group that happens to share the exact
 * title of the real studio album (e.g. "Interstellar" the soundtrack vs a
 * live-bootleg release-group also named "Interstellar") — this script can't
 * fix that wrong match (it reuses the mbid already stored), so it must at
 * least detect and flag it instead of silently importing the wrong content. */
async function getBestReleaseId(rgMbid) {
  const url = `${MUSICBRAINZ_API}/release-group/${encodeURIComponent(rgMbid)}?inc=releases+media&fmt=json`;
  const res = await mbFetch(url);
  if (!res.ok) return { releaseId: null, suspicious: null };
  const data = await res.json();

  if (!isAcceptableReleaseGroup(data)) {
    const primaryType = data['primary-type'];
    if (primaryType && primaryType !== 'Album' && primaryType !== 'EP') {
      return { releaseId: null, suspicious: `release-group primary-type is "${primaryType}", not Album/EP` };
    }
    const badSecondary = (data['secondary-types'] || []).find((t) => EXCLUDED_SECONDARY_TYPES.has(t));
    return { releaseId: null, suspicious: `release-group secondary-type is "${badSecondary}" — likely a wrong match, not the studio album` };
  }

  const releases = (data.releases || []).map((r) => ({
    id: r.id,
    status: r.status,
    trackCount: (r.media || []).reduce((sum, m) => sum + (m['track-count'] || 0), 0),
  }));
  return { releaseId: pickBestRelease(releases, 'most')?.id || null, suspicious: null };
}

async function getReleaseDetails(releaseId) {
  const url = `${MUSICBRAINZ_API}/release/${encodeURIComponent(releaseId)}?inc=artist-credits+recordings+release-groups&fmt=json`;
  const res = await mbFetch(url);
  if (!res.ok) return null;
  return res.json();
}

async function findEmptyTrackAlbums() {
  const PAGE_SIZE = 1000;
  const all = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('albums')
      .select('id, artist_id, title, mbid')
      .not('mbid', 'is', null)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`fetch albums failed: ${error.message}`);
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
  }

  // Paginate this too — there are far more than 1000 track rows total, and an
  // unpaginated select here would truncate to the first 1000 and wrongly flag
  // every album whose tracks didn't happen to land in that subset.
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

async function repairAlbum(album) {
  await delay(DELAY_MS);
  const { releaseId, suspicious } = await getBestReleaseId(album.mbid);
  if (suspicious) {
    console.log(`  ⚠ SUSPICIOUS — ${suspicious} — skipping, needs manual review (wrong release-group, not a tracklist problem)`);
    return;
  }
  if (!releaseId) {
    console.log(`  ✗ no release found for release-group ${album.mbid}`);
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

  const suspiciousTitles = tracks.filter((t) => SUSPICIOUS_TITLE_RE.test(t.title));
  if (tracks.length > 0 && suspiciousTitles.length / tracks.length >= 0.5) {
    console.log(`  ⚠ SUSPICIOUS — ${suspiciousTitles.length}/${tracks.length} track titles look like live/remix/edit versions — skipping, needs manual review`);
    return;
  }

  if (tracks.length === 0) {
    console.log(`  ✗ chosen release ${releaseId} still has no tracks listed in MB — needs manual review`);
    return;
  }

  console.log(`  → ${tracks.length} tracks found (${tracks.slice(0, 3).map((t) => t.title).join(', ')}${tracks.length > 3 ? ', …' : ''})`);

  if (!APPLY) return;

  const { error: tracksErr } = await supabase.from('tracks').insert(tracks);
  if (tracksErr) {
    console.log(`  ✗ tracks insert failed: ${tracksErr.message}`);
    return;
  }

  const extRows = tracks.map((t) => ({ entity_type: 'track', entity_id: t.id, source: 'musicbrainz', value: t.mbid }));
  const { error: extErr } = await supabase.from('external_ids').insert(extRows);
  if (extErr) {
    console.log(`  ⚠ external_ids insert failed (non-fatal): ${extErr.message}`);
  }

  console.log(`  ✓ repaired`);
}

async function main() {
  const albums = await findEmptyTrackAlbums();
  console.log(`${APPLY ? 'APPLY' : 'DRY-RUN'} — ${albums.length} albums with zero tracks found\n`);

  for (let i = 0; i < albums.length; i++) {
    const album = albums[i];
    console.log(`[${i + 1}/${albums.length}] "${album.title}" (${album.id})`);
    if (EXCLUDED_IDS.has(album.id)) {
      console.log(`  ⊘ excluded via --exclude — skipping, handle manually`);
      continue;
    }
    try {
      await repairAlbum(album);
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

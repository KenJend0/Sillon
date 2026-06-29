/**
 * READ-ONLY audit — measures the extent of the "Luidji bug" across the whole
 * catalog: albums imported via the pre-fix bulk-import-albums.mjs can have a
 * `mbid` that doesn't correspond to ANY real release-group of their artist
 * (wrong homonym match from the old unfiltered search), and a `type` column
 * that was never written at insert time (always whatever the column default
 * is). Both defects are invisible to "0 tracks" detection because these
 * albums already have a full, real tracklist and user engagement — they were
 * just resolved from the wrong place on MusicBrainz.
 *
 * Method: for every artist with a stored mbid, browse ALL of their real
 * release-groups from MusicBrainz (the same browse endpoint as
 * getArtistReleases in app/actions/musicbrainz.ts), then check every album
 * of that artist in our DB against that real list:
 *   - STORED_RELEASE_NOT_GROUP : albums.mbid isn't a release-group, but IS a
 *                      valid *release* MBID whose actual release-group
 *                      belongs to this artist. Content is correct (right
 *                      album, right artist) — only the identifier is at the
 *                      wrong granularity. Discovered empirically while
 *                      building this audit: importAlbumFromMusicBrainz
 *                      normalises to releaseGroupMbid today, but older
 *                      imports (before that normalisation existed) appear to
 *                      have stored whatever mbid the caller passed in, which
 *                      for some entry points (e.g. importTrackFromMusicBrainz
 *                      passing a release id) was a release MBID, not a
 *                      release-group MBID. Lower severity than MBID_NOT_FOUND
 *                      but still violates the "albums.mbid is always a
 *                      release-group MBID" invariant the rest of the
 *                      pipeline assumes.
 *   - MBID_NOT_FOUND_ANYWHERE : albums.mbid doesn't resolve as a
 *                      release-group OR a release at all (gone from MB), or
 *                      resolves to something belonging to a different
 *                      artist — the true "Luidji" category: a wrong-match
 *                      from the old unfiltered search, not a granularity
 *                      issue.
 *   - TYPE_MISMATCH  : albums.mbid IS a real release-group, but our stored
 *                      `type` doesn't match its actual primary-type (or
 *                      "Live" when secondary-types includes Live) — weaker
 *                      signal, since the DB column default could coincide
 *                      with the real type by chance.
 *
 * This script makes ZERO writes. It only prints a report and optionally
 * saves it as JSON for review. Nothing here should be "applied" — read the
 * report, decide case by case what repair script (if any) is appropriate,
 * the same way refix-suspicious-albums.mjs was used last session.
 *
 * Usage (from frontend/ directory):
 *   node --env-file=.env.local scripts/audit-artist-mbid-integrity.mjs
 *   node --env-file=.env.local scripts/audit-artist-mbid-integrity.mjs --out=audit-report.json
 *   node --env-file=.env.local scripts/audit-artist-mbid-integrity.mjs --artist-limit=20   (smoke test)
 */

import { createClient } from '@supabase/supabase-js';
import { writeFile } from 'fs/promises';

const MUSICBRAINZ_API = 'https://musicbrainz.org/ws/2';
const USER_AGENT = 'Waveform/1.0 (https://waveformapp.online)';
const DELAY_MS = 1300; // MB rate limit: 1 req/sec

const outArg = process.argv.find((a) => a.startsWith('--out='));
const OUT_FILE = outArg ? outArg.slice('--out='.length) : null;
const limitArg = process.argv.find((a) => a.startsWith('--artist-limit='));
const ARTIST_LIMIT = limitArg ? parseInt(limitArg.slice('--artist-limit='.length), 10) : Infinity;

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

const PAGE_SIZE = 1000;

/** Same Supabase pagination trap as repair-empty-track-albums.mjs / refix-suspicious-albums.mjs:
 *  an unranged select() truncates at 1000 rows silently. */
async function fetchAllRows(table, select, filterFn) {
  const all = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let q = supabase.from(table).select(select).range(from, from + PAGE_SIZE - 1);
    if (filterFn) q = filterFn(q);
    const { data, error } = await q;
    if (error) throw new Error(`fetch ${table} failed: ${error.message}`);
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return all;
}

/** Browses ALL release-groups for an artist (paginated past MB's 100-per-page
 *  cap) — deliberately unfiltered by type, since we need to know whether the
 *  stored mbid matches ANY real release-group, not just studio albums. */
async function browseAllReleaseGroups(artistMbid) {
  const groups = [];
  let offset = 0;
  for (;;) {
    const url = `${MUSICBRAINZ_API}/release-group?artist=${encodeURIComponent(artistMbid)}&fmt=json&limit=100&offset=${offset}`;
    const res = await mbFetch(url);
    if (!res.ok) {
      throw new Error(`browse failed: HTTP ${res.status}`);
    }
    const data = await res.json();
    const page = data['release-groups'] || [];
    groups.push(...page);
    const total = data['release-group-count'] ?? page.length;
    offset += page.length;
    if (page.length === 0 || offset >= total) break;
    await delay(DELAY_MS);
  }
  return groups;
}

function expectedType(rg) {
  const isLive = (rg['secondary-types'] || []).includes('Live');
  return isLive ? 'Live' : (rg['primary-type'] || null);
}

/** A stored mbid that isn't a known release-group might still be a valid
 *  RELEASE mbid (see STORED_RELEASE_NOT_GROUP in the header comment).
 *  Resolves it and reports whether its release-group belongs to artistMbid. */
async function resolveAsRelease(mbid, artistMbid) {
  const url = `${MUSICBRAINZ_API}/release/${encodeURIComponent(mbid)}?fmt=json&inc=artist-credits+release-groups`;
  const res = await mbFetch(url);
  if (res.status === 404) return { found: false };
  if (!res.ok) throw new Error(`release lookup failed: HTTP ${res.status}`);
  const data = await res.json();
  const creditArtistMbid = data['artist-credit']?.[0]?.artist?.id;
  const releaseGroup = data['release-group'];
  return {
    found: true,
    sameArtist: creditArtistMbid === artistMbid,
    releaseGroupId: releaseGroup?.id,
    releaseGroupTitle: releaseGroup?.title,
    releaseTitle: data.title,
  };
}

async function main() {
  console.log('Loading artists with mbid…');
  const artists = await fetchAllRows('artists', 'id, mbid, name', (q) => q.not('mbid', 'is', null));
  console.log(`  ${artists.length} artists with mbid`);

  console.log('Loading albums with mbid…');
  const albums = await fetchAllRows('albums', 'id, artist_id, title, mbid, type', (q) => q.not('mbid', 'is', null));
  console.log(`  ${albums.length} albums with mbid`);

  const albumsByArtist = new Map();
  for (const a of albums) {
    if (!albumsByArtist.has(a.artist_id)) albumsByArtist.set(a.artist_id, []);
    albumsByArtist.get(a.artist_id).push(a);
  }

  // Only artists that actually have albums to check are worth an MB call.
  const artistsToCheck = artists.filter((ar) => albumsByArtist.has(ar.id)).slice(0, ARTIST_LIMIT);
  console.log(`  ${artistsToCheck.length} of those artists have ≥1 album in DB — auditing each\n`);

  const storedReleaseNotGroup = [];
  const mbidNotFoundAnywhere = [];
  const typeMismatch = [];
  let artistErrors = 0;
  let albumsChecked = 0;

  for (let i = 0; i < artistsToCheck.length; i++) {
    const artist = artistsToCheck[i];
    const artistAlbums = albumsByArtist.get(artist.id) || [];
    process.stdout.write(`[${i + 1}/${artistsToCheck.length}] ${artist.name} (${artistAlbums.length} album(s)) … `);

    let realGroups;
    try {
      realGroups = await browseAllReleaseGroups(artist.mbid);
    } catch (err) {
      console.log(`✗ MB browse failed: ${err.message}`);
      artistErrors++;
      await delay(DELAY_MS);
      continue;
    }

    const realByMbid = new Map(realGroups.map((rg) => [rg.id, rg]));
    let flaggedHere = 0;

    for (const album of artistAlbums) {
      albumsChecked++;
      const rg = realByMbid.get(album.mbid);
      if (!rg) {
        await delay(DELAY_MS);
        let resolved;
        try {
          resolved = await resolveAsRelease(album.mbid, artist.mbid);
        } catch (err) {
          console.log(`\n  ✗ release-lookup failed for "${album.title}": ${err.message}`);
          continue;
        }
        if (resolved.found && resolved.sameArtist) {
          storedReleaseNotGroup.push({
            albumId: album.id,
            title: album.title,
            artistName: artist.name,
            artistId: artist.id,
            storedMbid: album.mbid,
            storedType: album.type,
            realReleaseGroupId: resolved.releaseGroupId,
            realReleaseGroupTitle: resolved.releaseGroupTitle,
          });
        } else {
          mbidNotFoundAnywhere.push({
            albumId: album.id,
            title: album.title,
            artistName: artist.name,
            artistId: artist.id,
            storedMbid: album.mbid,
            storedType: album.type,
            resolvedToDifferentArtist: resolved.found && !resolved.sameArtist,
          });
        }
        flaggedHere++;
        continue;
      }
      const expected = expectedType(rg);
      if (expected && album.type !== expected) {
        typeMismatch.push({
          albumId: album.id,
          title: album.title,
          artistName: artist.name,
          artistId: artist.id,
          mbid: album.mbid,
          storedType: album.type,
          expectedType: expected,
          realTitle: rg.title,
        });
        flaggedHere++;
      }
    }

    console.log(flaggedHere > 0 ? `⚠ ${flaggedHere} flagged` : '✓ clean');
    await delay(DELAY_MS);
  }

  console.log('\n──────────────────────────────────────────');
  console.log(`Artists audited          : ${artistsToCheck.length} (${artistErrors} MB errors, skipped)`);
  console.log(`Albums checked           : ${albumsChecked}`);
  console.log(`STORED_RELEASE_NOT_GROUP : ${storedReleaseNotGroup.length}  (right album/artist, mbid is a release not a release-group)`);
  console.log(`MBID_NOT_FOUND_ANYWHERE  : ${mbidNotFoundAnywhere.length}  (true wrong match — same category as Luidji)`);
  console.log(`TYPE_MISMATCH only       : ${typeMismatch.length}  (mbid correct, but stored type column is wrong)`);

  if (storedReleaseNotGroup.length > 0) {
    console.log('\n=== STORED_RELEASE_NOT_GROUP — mbid is a valid release of this artist, just not the release-group id ===');
    for (const f of storedReleaseNotGroup) {
      console.log(`  • "${f.title}" — ${f.artistName} (album ${f.albumId}) — stored mbid ${f.storedMbid} → real release-group ${f.realReleaseGroupId} ("${f.realReleaseGroupTitle}")`);
    }
  }

  if (mbidNotFoundAnywhere.length > 0) {
    console.log('\n=== MBID_NOT_FOUND_ANYWHERE — stored mbid is not a release-group or release of this artist ===');
    for (const f of mbidNotFoundAnywhere) {
      console.log(`  • "${f.title}" — ${f.artistName} (album ${f.albumId}) — stored mbid ${f.storedMbid}, type "${f.storedType}"${f.resolvedToDifferentArtist ? ' [resolves to a DIFFERENT artist on MB]' : ' [mbid does not exist on MB at all]'}`);
    }
  }

  if (typeMismatch.length > 0) {
    console.log('\n=== TYPE_MISMATCH — mbid is a real release-group, but type column disagrees ===');
    for (const f of typeMismatch) {
      console.log(`  • "${f.title}" — ${f.artistName} (album ${f.albumId}) — stored type "${f.storedType}", MB says "${f.expectedType}" (real title: "${f.realTitle}")`);
    }
  }

  if (OUT_FILE) {
    const report = {
      generatedAt: new Date().toISOString(),
      artistsAudited: artistsToCheck.length,
      artistErrors,
      albumsChecked,
      storedReleaseNotGroup,
      mbidNotFoundAnywhere,
      typeMismatch,
    };
    await writeFile(OUT_FILE, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`\nFull report written to ${OUT_FILE}`);
  }

  console.log('\nThis script made no writes. Review the report before deciding on any repair.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * One-off diagnostic for a single album whose track insert failed on
 * uq_tracks_mbid — finds which of its MB track mbids already exist on a
 * DIFFERENT album in the DB, and what that other album/track is.
 *
 * Usage: node --env-file=.env.local scripts/diagnose-track-conflict.mjs <album_id>
 */

import { createClient } from '@supabase/supabase-js';

const MUSICBRAINZ_API = 'https://musicbrainz.org/ws/2';
const USER_AGENT = 'Sillon/1.0 (https://sillon.fm)';

const albumId = process.argv[2];
if (!albumId) {
  console.error('Usage: node scripts/diagnose-track-conflict.mjs <album_id>');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function main() {
  const { data: album, error } = await supabase.from('albums').select('id, title, mbid').eq('id', albumId).single();
  if (error || !album) throw new Error(`album not found: ${error?.message}`);
  console.log(`Album: "${album.title}" — release-group ${album.mbid}`);

  const rgRes = await fetch(`${MUSICBRAINZ_API}/release-group/${album.mbid}?inc=releases+media&fmt=json`, {
    headers: { 'User-Agent': USER_AGENT },
  });
  const rgData = await rgRes.json();
  const releases = (rgData.releases || []).map((r) => ({
    id: r.id,
    status: r.status,
    trackCount: (r.media || []).reduce((sum, m) => sum + (m['track-count'] || 0), 0),
  }));
  const official = releases.filter((r) => r.status === 'Official');
  const candidates = official.length > 0 ? official : releases;
  const withTracks = candidates.filter((r) => r.trackCount > 0);
  const pool = withTracks.length > 0 ? withTracks : candidates;
  pool.sort((a, b) => b.trackCount - a.trackCount);
  const releaseId = pool[0]?.id;
  console.log(`Chosen release: ${releaseId}`);

  const relRes = await fetch(`${MUSICBRAINZ_API}/release/${releaseId}?inc=artist-credits+recordings+release-groups&fmt=json`, {
    headers: { 'User-Agent': USER_AGENT },
  });
  const relData = await relRes.json();
  const mbTracks = (relData.media || []).flatMap((m) => (m.tracks || []).map((t) => ({ title: t.title, mbid: t.id })));
  console.log(`MB lists ${mbTracks.length} tracks for this release.\n`);

  for (const t of mbTracks) {
    const { data: existing } = await supabase
      .from('tracks')
      .select('id, title, album_id, albums(title)')
      .eq('mbid', t.mbid)
      .maybeSingle();
    if (existing) {
      console.log(`CONFLICT: "${t.title}" (mbid ${t.mbid})`);
      console.log(`  already exists as track "${existing.title}" on album "${existing.albums?.title}" (album_id ${existing.album_id})`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { importAlbumFromMusicBrainz } from '@/app/actions/musicbrainz';
// @ts-ignore — module .mjs pur (allowJs), partagé avec scripts/process-external-imports.mjs
import { looseNormalize, isArtistMatch, searchReleaseGroupCascade, pickCandidate } from '@/lib/musicbrainzMatch.mjs';

export const BATCH_SIZE = 5;

export type RawExternalItem = {
  artist: string;
  album: string;
  mbid: string | null;
  rating?: number;
  reviewTitle?: string;
  reviewBody?: string;
  listenedAt?: string;
};

function escapeILike(str: string): string {
  return str.replace(/[%_]/g, '\\$&');
}

const MB_API = 'https://musicbrainz.org/ws/2';
const MB_UA = 'Waveform/1.0 (https://waveformapp.online)';

type MbCandidate = { id: string; title: string; artistName: string; score: number };

async function runReleaseGroupQuery(query: string | null): Promise<MbCandidate[]> {
  if (!query) return [];
  try {
    const url = `${MB_API}/release-group/?query=${encodeURIComponent(query)}&fmt=json&limit=25`;
    const res = await fetch(url, { headers: { 'User-Agent': MB_UA }, signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data['release-groups'] || []).map((rg: any) => ({
      id: rg.id,
      title: rg.title,
      artistName: rg['artist-credit']?.[0]?.name || rg['artist-credit']?.[0]?.artist?.name || '',
      score: parseInt(rg.score, 10) || 0,
    }));
  } catch {
    return [];
  }
}

/**
 * Cherche l'album directement dans notre base (déjà importé par un autre
 * utilisateur) avant de solliciter MusicBrainz — évite un aller-retour externe
 * (lent, sujet au rate-limit/timeout) quand l'album est déjà chez nous.
 */
async function findLocalAlbumId(admin: any, item: RawExternalItem): Promise<string | null> {
  const { data } = await admin
    .from('albums')
    .select('id, title, artists(name)')
    .ilike('title', `%${escapeILike(item.album)}%`)
    .limit(20);

  if (!data) return null;

  const match = data.find(
    (a: any) =>
      looseNormalize(a.title) === looseNormalize(item.album) && isArtistMatch(a.artists?.name || '', item.artist)
  );
  return match?.id || null;
}

/** La recherche MB peut timeout sous charge — on retente jusqu'à 3 fois si aucun résultat. */
async function resolveMbid(item: RawExternalItem): Promise<string | null> {
  if (item.mbid) return item.mbid;

  for (let attempt = 0; attempt < 3; attempt++) {
    const results = await searchReleaseGroupCascade(runReleaseGroupQuery, item.artist, item.album, { delayMs: 300 });
    if (results.length === 0) continue;

    const candidate = pickCandidate(results, item);
    return candidate?.id || null; // résultats présents mais aucun candidat fiable — pas la peine de retenter
  }
  return null;
}

export async function resolveAlbumId(admin: any, item: RawExternalItem): Promise<string | null> {
  const localId = await findLocalAlbumId(admin, item);
  if (localId) return localId;

  const mbid = await resolveMbid(item);
  if (!mbid) return null;

  const imported = await importAlbumFromMusicBrainz(mbid);
  return imported.success ? (imported as any).albumId || null : null;
}

export function progressOfImportRow(row: any) {
  return {
    total: row.total_items,
    processed: row.processed_count,
    matched: row.matched_count,
    skipped: row.skipped_count ?? 0,
    failed: row.failed_count,
    listId: row.list_id,
  };
}

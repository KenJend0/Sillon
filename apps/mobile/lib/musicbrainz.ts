// Recherche MusicBrainz côté mobile — miroir des fonctions de recherche de
// apps/web/app/actions/musicbrainz.ts (searchMusicBrainzAlbums/Artists/Recordings).
// Appelée directement depuis le client (pas de Server Action côté mobile —
// décision technique du roadmap : API publique MB, pas de secret à protéger).
// Le cache L2 Supabase (search_cache, clé service_role) n'est PAS porté ici —
// jamais de clé service_role dans l'app mobile. Seul le cache L1 mémoire
// (par session app) est conservé.
import { isAcceptableReleaseGroup } from './musicbrainzReleasePolicy';
import {
  arrayValue,
  isRecord,
  logInvalidExternalResponse,
  numberValue,
  recordValue,
  stringValue,
} from './externalValidation';

const MUSICBRAINZ_API = 'https://musicbrainz.org/ws/2';
const USER_AGENT = 'Sillon/1.0 (https://sillon.fm)';

// Search timeout — cf. web: prod ~200ms, dev ~400ms. 800ms donne de la marge.
const MB_SEARCH_TIMEOUT_MS = 800;
const MB_RECORDING_SEARCH_TIMEOUT_MS = 2000;

type MBArtistCredit = { artist: { id: string; name: string }; name?: string; joinphrase?: string };

interface MBReleaseGroup {
  id: string;
  title: string;
  'first-release-date'?: string;
  'artist-credit': MBArtistCredit[];
  'primary-type'?: string;
  'secondary-types'?: string[];
  'release-count'?: number;
  score?: number;
}

interface MBArtistSearchResult {
  artists: Array<{
    id: string;
    name: string;
    type?: string;
    country?: string;
    score?: number;
  }>;
}

interface MBRecording {
  id: string;
  title: string;
  score?: number;
  length?: number;
  'artist-credit'?: Array<{ artist: { name: string } }>;
  releases?: Array<{
    id: string;
    title: string;
    'release-group'?: { id: string; 'primary-type'?: string; 'secondary-types'?: string[] };
  }>;
}

interface MBRecordingSearchResult {
  recordings?: MBRecording[];
}

export type AlbumSearchResult = {
  id: string;          // release-group MBID (canonical identifier pour dedup & covers)
  releaseId?: string;  // first release MBID (pour import & fallback cover)
  title: string;
  artistName: string;
  releaseDate?: string;
  coverUrl?: string;
  hasCover: boolean;
  score: number;
  releaseCount: number;
};

export type ArtistSearchResult = {
  id: string; // MBID
  name: string;
  type?: string;
  country?: string;
  score: number;
};

export type RecordingSearchResult = {
  mbid: string;
  title: string;
  artistName: string;
  albumTitle: string;
  albumMbid: string;
  releaseId: string;
  duration: number | null;
  coverUrl: string | null;
  score: number;
};

// ---------------------------------------------------------------------------
// Cache L1 en mémoire (par session app) — miroir simplifié du memCache web.
// ---------------------------------------------------------------------------
const memCache = new Map<string, { data: unknown; expiresAt: number }>();
const MEM_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function hashCacheKey(query: string, type: string): string {
  const str = `${query.toLowerCase().trim()}:${type}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `mb_${type}_${Math.abs(hash).toString(36)}`;
}

function getCached<T>(key: string): T | null {
  const mem = memCache.get(key);
  if (mem && mem.expiresAt > Date.now()) return mem.data as T;
  return null;
}

function setCached<T>(key: string, data: T): void {
  memCache.set(key, { data, expiresAt: Date.now() + MEM_CACHE_TTL_MS });
}

async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  maxRetries = 3,
  timeoutMs = 8000
): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);

      // Retry on rate-limit (429) or service unavailable (503) — MB retourne
      // ça quand la limite de 1 req/sec est dépassée.
      if ((response.status === 503 || response.status === 429) && attempt < maxRetries - 1) {
        const backoff = Math.max(1100, 100 * Math.pow(2, attempt));
        await new Promise((resolve) => setTimeout(resolve, backoff));
        continue;
      }
      return response;
    } catch (err) {
      if (attempt === maxRetries - 1) throw err;
      const backoff = 100 * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }
  throw new Error('Max retries exceeded');
}

function parseArtistCredit(value: unknown): MBArtistCredit[] {
  return arrayValue(value).flatMap((item) => {
    const row = recordValue(item);
    const artist = recordValue(row?.artist);
    const id = stringValue(artist?.id);
    const artistName = stringValue(artist?.name);
    if (!id || !artistName) return [];
    const creditName = stringValue(row?.name);
    const joinphrase = stringValue(row?.joinphrase);
    return [{
      artist: { id, name: artistName },
      ...(creditName ? { name: creditName } : {}),
      ...(joinphrase ? { joinphrase } : {}),
    }];
  });
}

function parseMbReleaseGroups(raw: unknown, context: string): MBReleaseGroup[] {
  if (!isRecord(raw)) {
    logInvalidExternalResponse(context, 'root is not an object');
    return [];
  }
  return arrayValue(raw['release-groups']).flatMap((item) => {
    const row = recordValue(item);
    const id = stringValue(row?.id);
    const title = stringValue(row?.title);
    if (!id || !title) return [];
    return [{
      id,
      title,
      'first-release-date': stringValue(row?.['first-release-date']) ?? undefined,
      'artist-credit': parseArtistCredit(row?.['artist-credit']),
      'primary-type': stringValue(row?.['primary-type']) ?? undefined,
      'secondary-types': arrayValue(row?.['secondary-types']).flatMap((v) => stringValue(v) ? [stringValue(v)!] : []),
      'release-count': numberValue(row?.['release-count']) ?? undefined,
      score: numberValue(row?.score) ?? undefined,
    }];
  });
}

function parseMbArtistSearch(raw: unknown): MBArtistSearchResult {
  if (!isRecord(raw)) {
    logInvalidExternalResponse('musicbrainz.artistSearch', 'root is not an object');
    return { artists: [] };
  }
  return {
    artists: arrayValue(raw.artists).flatMap((item) => {
      const row = recordValue(item);
      const id = stringValue(row?.id);
      const name = stringValue(row?.name);
      if (!id || !name) return [];
      return [{
        id,
        name,
        type: stringValue(row?.type) ?? undefined,
        country: stringValue(row?.country) ?? undefined,
        score: numberValue(row?.score) ?? undefined,
      }];
    }),
  };
}

function parseMbRecordingSearch(raw: unknown): MBRecordingSearchResult {
  if (!isRecord(raw)) {
    logInvalidExternalResponse('musicbrainz.recordingSearch', 'root is not an object');
    return { recordings: [] };
  }
  return {
    recordings: arrayValue(raw.recordings).flatMap((item) => {
      const row = recordValue(item);
      const id = stringValue(row?.id);
      const title = stringValue(row?.title);
      if (!id || !title) return [];
      return [{
        id,
        title,
        score: numberValue(row?.score) ?? undefined,
        length: numberValue(row?.length) ?? undefined,
        'artist-credit': parseArtistCredit(row?.['artist-credit']).map((credit) => ({
          artist: { name: credit.artist.name },
        })),
        releases: arrayValue(row?.releases).flatMap((release) => {
          const rel = recordValue(release);
          const releaseId = stringValue(rel?.id);
          const releaseTitle = stringValue(rel?.title);
          if (!releaseId || !releaseTitle) return [];
          const releaseGroup = recordValue(rel?.['release-group']);
          return [{
            id: releaseId,
            title: releaseTitle,
            'release-group': releaseGroup ? {
              id: stringValue(releaseGroup.id) ?? '',
              'primary-type': stringValue(releaseGroup['primary-type']) ?? undefined,
              'secondary-types': arrayValue(releaseGroup['secondary-types']).flatMap((v) => stringValue(v) ? [stringValue(v)!] : []),
            } : undefined,
          }];
        }),
      }];
    }),
  };
}

/**
 * Recherche d'albums via l'endpoint /release-group — miroir de
 * searchMusicBrainzAlbums (web). Chaque résultat est déjà un release-group
 * unique (pas de dédup manuelle nécessaire).
 */
export async function searchMusicBrainzAlbums(query: string): Promise<{ success: boolean; results?: AlbumSearchResult[]; error?: string }> {
  const cacheKey = hashCacheKey(query, 'albums');
  const cached = getCached<AlbumSearchResult[]>(cacheKey);
  if (cached) return { success: true, results: cached };

  try {
    const CONTRACTION_MAP: Record<string, string> = {
      'whats': 'what', 'whos': 'who', 'hows': 'how', 'thats': 'that',
      'wont': 'will not', 'dont': 'do not', 'cant': 'can', 'doesnt': 'does not',
      'isnt': 'is not', 'wasnt': 'was not', 'werent': 'were not',
      'im': 'i am', 'youre': 'you are', 'theyre': 'they are', 'its': 'it',
    };
    const expandContractions = (s: string) =>
      s.split(/\s+/).map((w) => CONTRACTION_MAP[w.toLowerCase()] ?? w).join(' ');
    const queryExpanded = expandContractions(query);

    const preEscape = queryExpanded.replace(/[+\-&|!(){}\[\]^"~*?:\\\/]/g, ' ').trim();
    const originalTerms = preEscape.split(/\s+/);
    const escapedQuery = preEscape.replace(/'/g, '').trim();
    const terms = escapedQuery.split(/\s+/);

    const decontractedTerms = originalTerms.map((orig, i) =>
      orig.includes("'") ? orig.replace(/'\w*$/, '') : terms[i]
    );
    const decontractedPhrase = decontractedTerms.join(' ');

    const phraseA = `releasegroup:"${escapedQuery}"~2`;
    const phraseB = decontractedPhrase !== escapedQuery ? ` OR releasegroup:"${decontractedPhrase}"~2` : '';
    const termsClause = `(${decontractedTerms.map((t) => `(releasegroup:${t} OR artistname:${t})`).join(' AND ')})`;

    const SPLIT_STOP_WORDS = new Set([
      'a', 'an', 'the', 'of', 'in', 'on', 'at', 'to', 'for', 'by', 'my',
      'it', 'its', 'or', 'and', 'as', 'if', 'so', 'is', 'am', 'are', 'be',
    ]);

    let splitClauses = '';
    if (decontractedTerms.length >= 2) {
      const titleC = decontractedTerms.slice(0, -1).join(' ');
      const artistC = decontractedTerms[decontractedTerms.length - 1];
      const titleQC = titleC.includes(' ') ? `"${titleC}"~1` : titleC;
      splitClauses += ` OR (releasegroup:${titleQC} AND artistname:${artistC}*)`;

      const artistF = decontractedTerms[0];
      if (!SPLIT_STOP_WORDS.has(artistF)) {
        const titleF = decontractedTerms.slice(1).join(' ');
        const titleQF = titleF.includes(' ') ? `"${titleF}"~1` : titleF;
        splitClauses += ` OR (artistname:${artistF}* AND releasegroup:${titleQF})`;
      }
    }

    if (decontractedTerms.length >= 3) {
      const titleD = decontractedTerms.slice(0, -2).join(' ');
      const artistD = decontractedTerms.slice(-2).join(' ');
      const titleQD = titleD.includes(' ') ? `"${titleD}"~1` : titleD;
      splitClauses += ` OR (releasegroup:${titleQD} AND artistname:"${artistD}")`;

      const artistG = decontractedTerms.slice(0, 2).join(' ');
      const titleG = decontractedTerms.slice(2).join(' ');
      if (titleG.length > 0) {
        const titleQG = titleG.includes(' ') ? `"${titleG}"~1` : titleG;
        splitClauses += ` OR (artistname:"${artistG}" AND releasegroup:${titleQG})`;
      }

      const titleC = decontractedTerms.slice(0, -1).join(' ');
      const titleQC = titleC.includes(' ') ? `"${titleC}"~1` : titleC;
      splitClauses += ` OR releasegroup:${titleQC}`;
      splitClauses += ` OR releasegroup:${titleQD}`;
    }

    const luceneQuery = terms.length === 1
      ? `releasegroup:${terms[0]}`
      : `${phraseA}${phraseB} OR ${termsClause}${splitClauses}`;

    const mbUrl = new URL(`${MUSICBRAINZ_API}/release-group`);
    mbUrl.searchParams.set('query', luceneQuery);
    mbUrl.searchParams.set('limit', '100');
    mbUrl.searchParams.set('fmt', 'json');

    const response = await fetchWithRetry(mbUrl.toString(), {
      headers: { 'User-Agent': USER_AGENT },
    }, 1, MB_SEARCH_TIMEOUT_MS);

    if (!response.ok) {
      return { success: false, error: `MusicBrainz search failed: ${response.status}` };
    }

    const raw: unknown = await response.json();
    const releaseGroups = parseMbReleaseGroups(raw, 'musicbrainz.albumSearch');
    if (releaseGroups.length === 0) return { success: true, results: [] };

    const scoreThreshold = terms.length === 1 ? 60 : 20;
    const studioAlbums = releaseGroups.filter((rg) => {
      if ((rg.score || 0) < scoreThreshold) return false;
      return isAcceptableReleaseGroup(rg);
    });

    const releaseCountOf = (rg: MBReleaseGroup): number => rg['release-count'] ?? 0;
    studioAlbums.sort((a, b) => releaseCountOf(b) - releaseCountOf(a));

    const results: AlbumSearchResult[] = studioAlbums.map((rg) => {
      const artists = rg['artist-credit'] || [];
      const artistName = artists.map((a) => a.name || a.artist?.name).join(', ');
      return {
        id: rg.id,
        title: rg.title,
        artistName: artistName || 'Unknown',
        releaseDate: rg['first-release-date'],
        coverUrl: `https://coverartarchive.org/release-group/${rg.id}/front`,
        hasCover: true,
        score: rg.score || 0,
        releaseCount: rg['release-count'] || 0,
      };
    });

    setCached(cacheKey, results);
    return { success: true, results };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Recherche d'artistes via l'endpoint /artist — miroir de
 * searchMusicBrainzArtists (web).
 */
export async function searchMusicBrainzArtists(query: string, limit = 5): Promise<{ success: boolean; results?: ArtistSearchResult[]; error?: string }> {
  const cacheKey = hashCacheKey(query, 'artists');
  const cached = getCached<ArtistSearchResult[]>(cacheKey);
  if (cached) return { success: true, results: cached.slice(0, limit) };

  try {
    const terms = query.trim().split(/\s+/).filter(Boolean);
    const luceneParts = terms.map((t, i) => {
      const esc = t.replace(/[+\-&|!(){}\[\]^"~?:\\\/]/g, '\\$&');
      return i === terms.length - 1 ? `artist:${esc}*` : `artist:${esc}`;
    });
    const exactClause = luceneParts.join(' AND ');
    const fuzzyParts = terms.map((t) => {
      const esc = t.replace(/[+\-&|!(){}\[\]^"~?:\\\/]/g, '\\$&');
      return `artist:${esc}~1`;
    });
    const fuzzyClause = fuzzyParts.join(' AND ');
    const luceneQuery = `(${exactClause}) OR (${fuzzyClause})`;

    const response = await fetchWithRetry(
      `${MUSICBRAINZ_API}/artist?query=${encodeURIComponent(luceneQuery)}&fmt=json&limit=${limit}`,
      { headers: { 'User-Agent': USER_AGENT } },
      1, MB_SEARCH_TIMEOUT_MS
    );

    if (!response.ok) return { success: false, error: 'MusicBrainz artist search failed' };

    const raw: unknown = await response.json();
    const data = parseMbArtistSearch(raw);
    const results: ArtistSearchResult[] = (data.artists || [])
      .filter((a) => (a.score || 0) >= 60)
      .map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type || undefined,
        country: a.country || undefined,
        score: a.score || 0,
      }));

    setCached(cacheKey, results);
    return { success: true, results };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}

export type ArtistRelease = { mbid: string; releaseGroupMbid: string; title: string; date: string | null; type: string | null };
type ArtistReleasesResult = { success: boolean; releases?: ArtistRelease[]; error?: string };

const _artistReleasesCache = new Map<string, { result: ArtistReleasesResult; expiresAt: number }>();
const ARTIST_RELEASES_TTL_MS = 5 * 60 * 1000; // 5 min

/**
 * Discographie complète d'un artiste via l'endpoint browse /release-group?artist=
 * — miroir de getArtistReleases (web, apps/web/app/actions/musicbrainz.ts).
 * Browse (pas search) : exhaustif, pas de classement par pertinence. `inc=releases`
 * non supporté par le browse endpoint — releaseGroupMbid = mbid (c'est déjà un
 * release-group). Le filtre de type primaire (pipe-separated) est rejeté par MB
 * avec un 400 — filtrage client-side comme côté web.
 */
export async function getArtistReleases(mbid: string): Promise<ArtistReleasesResult> {
  if (!mbid) return { success: false, error: 'mbid is empty' };

  const cached = _artistReleasesCache.get(mbid);
  if (cached && Date.now() < cached.expiresAt) return cached.result;

  try {
    const browseUrl = `${MUSICBRAINZ_API}/release-group?artist=${encodeURIComponent(mbid)}&fmt=json&limit=100`;
    const response = await fetchWithRetry(browseUrl, { headers: { 'User-Agent': USER_AGENT } }, 2, 5000);

    if (!response.ok) return { success: true, releases: [] };

    const raw: unknown = await response.json();
    const releaseGroups = parseMbReleaseGroups(raw, 'musicbrainz.artistReleases');

    const ARTIST_RELEASES_ALLOWED_PRIMARY_TYPES = new Set(['Album', 'EP', 'Single']);
    const filtered = releaseGroups.filter((rg) =>
      isAcceptableReleaseGroup(rg, { allowLive: true, allowedPrimaryTypes: ARTIST_RELEASES_ALLOWED_PRIMARY_TYPES })
    );

    const releases: ArtistRelease[] = filtered
      .map((rg) => {
        const isLive = (rg['secondary-types'] || []).includes('Live');
        return {
          mbid: rg.id,
          releaseGroupMbid: rg.id,
          title: rg.title,
          date: rg['first-release-date'] || null,
          type: isLive ? 'Live' : (rg['primary-type'] || null),
        };
      })
      .sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return b.date.localeCompare(a.date);
      });

    const finalResult = { success: true, releases };
    _artistReleasesCache.set(mbid, { result: finalResult, expiresAt: Date.now() + ARTIST_RELEASES_TTL_MS });
    return finalResult;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Recherche de titres via l'endpoint /recording — miroir de
 * searchMusicBrainzRecordings (web).
 */
export async function searchMusicBrainzRecordings(
  query: string,
  limit = 20,
  artist?: string
): Promise<{ success: boolean; results?: RecordingSearchResult[]; error?: string }> {
  if (!query || query.trim().length < 2) return { success: true, results: [] };

  const trimmedArtist = artist?.trim() || '';
  const cacheKey = hashCacheKey(query, `recordings_${limit}_${trimmedArtist.toLowerCase()}`);
  const cached = getCached<RecordingSearchResult[]>(cacheKey);
  if (cached) return { success: true, results: cached };

  try {
    const trimmed = query.trim().replace(/[+\-&|!(){}\[\]^"~*?:\\\/]/g, ' ').trim();
    const terms = trimmed.split(/\s+/).filter(Boolean);
    const phraseClause = `"${trimmed}"~2`;
    const termClause = terms.map((t) => `recording:${t}`).join(' AND ');
    const titleClause = terms.length > 1 ? `(${phraseClause}) OR (${termClause})` : phraseClause;

    const artistTerms = trimmedArtist
      .replace(/[+\-&|!(){}\[\]^"~*?:\\\/]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const artistClause = artistTerms.map((t) => `artist:${t}~1`).join(' AND ');
    const lucene = trimmedArtist
      ? `recording:${phraseClause} AND (${artistClause})`
      : titleClause;
    const encoded = encodeURIComponent(lucene);
    const url = `${MUSICBRAINZ_API}/recording?query=${encoded}&limit=${limit}&fmt=json&inc=releases`;
    const response = await fetchWithRetry(
      url,
      { headers: { 'User-Agent': USER_AGENT } },
      2,
      MB_RECORDING_SEARCH_TIMEOUT_MS
    );

    if (!response.ok) return { success: false, error: `MusicBrainz returned ${response.status}` };

    const raw: unknown = await response.json();
    const data = parseMbRecordingSearch(raw);
    const recordings = data.recordings || [];

    const resultsWithQuality = recordings
      .filter((r) => r.releases && r.releases.length > 0)
      .map((r) => {
        const artistName = r['artist-credit']?.[0]?.artist?.name || 'Unknown';
        const release = r.releases!.find((rel) =>
          rel['release-group'] && isAcceptableReleaseGroup(rel['release-group'])
        ) || r.releases!.find((rel) =>
          rel['release-group'] && isAcceptableReleaseGroup(rel['release-group'], { allowedPrimaryTypes: new Set(['Single']) })
        ) || r.releases![0];
        const rgMbid = release?.['release-group']?.id || '';
        const coverUrl = rgMbid
          ? `https://coverartarchive.org/release-group/${rgMbid}/front`
          : null;
        const releaseGroupQuality = release?.['release-group'] && isAcceptableReleaseGroup(release['release-group'])
          ? 2
          : release?.['release-group'] && isAcceptableReleaseGroup(release['release-group'], { allowedPrimaryTypes: new Set(['Single']) })
            ? 1
            : 0;
        return {
          mbid: r.id,
          title: r.title,
          artistName,
          albumTitle: release?.title || 'Unknown',
          albumMbid: rgMbid,
          releaseId: release?.id || '',
          duration: r.length ?? null,
          coverUrl,
          score: r.score ?? 0,
          _releaseGroupQuality: releaseGroupQuality,
        };
      });

    // Déduplique par (titre, artiste) — garde la meilleure qualité de release-group, puis le meilleur score.
    const bestByKey = new Map<string, typeof resultsWithQuality[number]>();
    for (const r of resultsWithQuality) {
      const key = `${r.title.toLowerCase().trim()}|||${r.artistName.toLowerCase().trim()}`;
      const existing = bestByKey.get(key);
      if (!existing
        || r._releaseGroupQuality > existing._releaseGroupQuality
        || (r._releaseGroupQuality === existing._releaseGroupQuality && r.score > existing.score)) {
        bestByKey.set(key, r);
      }
    }
    const results: RecordingSearchResult[] = [...bestByKey.values()].map(({ _releaseGroupQuality, ...rest }) => rest);

    setCached(cacheKey, results);
    return { success: true, results };
  } catch (err) {
    return { success: false, error: 'Une erreur est survenue lors de la recherche' };
  }
}

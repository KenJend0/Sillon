/**
 * test-metadata-coverage.mjs
 * Teste la couverture des métadonnées (genres + description) sur un échantillon d'albums.
 * Usage : node scripts/test-metadata-coverage.mjs
 *
 * Lit les variables depuis frontend/.env.local
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse .env.local manuellement (pas de dotenv requis)
function loadEnv(path) {
  const env = {};
  const content = readFileSync(path, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    env[key] = val;
  }
  return env;
}

const env = loadEnv(resolve(__dirname, '../frontend/.env.local'));
const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'];
const SUPABASE_SERVICE_KEY = env['SUPABASE_SERVICE_KEY'];
const LASTFM_API_KEY = env['LASTFM_API_KEY'];
const MB_USER_AGENT = 'Waveform/1.0 (https://waveform.app)';
const TIMEOUT_MS = 4000;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_URL ou SUPABASE_SERVICE_KEY manquants dans frontend/.env.local');
  process.exit(1);
}

// Supabase REST API — pas besoin du client JS
async function supabaseQuery(table, params = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Helpers ──────────────────────────────────────────────────

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
}

async function fetchWithTimeout(url, options = {}) {
  return Promise.race([fetch(url, options), timeout(TIMEOUT_MS)]);
}

async function testMusicBrainz(releaseMbid) {
  try {
    // Étape 1 : release → release-group MBID
    const releaseRes = await fetchWithTimeout(
      `https://musicbrainz.org/ws/2/release/${releaseMbid}?fmt=json&inc=release-groups`,
      { headers: { 'User-Agent': MB_USER_AGENT } }
    );
    if (!releaseRes.ok) return { genres: [], tags: [] };
    const releaseData = await releaseRes.json();
    const rgMbid = releaseData['release-group']?.id;
    if (!rgMbid) return { genres: [], tags: [] };

    await new Promise(r => setTimeout(r, 1100)); // rate limit MB

    // Étape 2 : genres + tags du release-group
    const res = await fetchWithTimeout(
      `https://musicbrainz.org/ws/2/release-group/${rgMbid}?fmt=json&inc=genres+tags`,
      { headers: { 'User-Agent': MB_USER_AGENT } }
    );
    if (!res.ok) return { genres: [], tags: [] };
    const data = await res.json();
    const genres = (data.genres ?? []).map(g => g.name.toLowerCase());
    const tags = (data.tags ?? []).filter(t => (t.count ?? 0) >= 3).map(t => t.name.toLowerCase());
    return { genres, tags };
  } catch {
    return { genres: [], tags: [], error: true };
  }
}

async function testLastFm(artist, title) {
  if (!LASTFM_API_KEY) return { tags: [], description: null };
  try {
    const url =
      `https://ws.audioscrobbler.com/2.0/?method=album.getinfo` +
      `&artist=${encodeURIComponent(artist)}&album=${encodeURIComponent(title)}` +
      `&api_key=${LASTFM_API_KEY}&format=json&autocorrect=1`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return { tags: [], description: null };
    const data = await res.json();
    if (!data.album) return { tags: [], description: null, notFound: true };

    const tags = (data.album.tags?.tag ?? []).map(t => t.name.toLowerCase());
    let description = data.album.wiki?.summary
      ?.replace(/<a\s[^>]*>Read more on Last\.fm<\/a>\.?/gi, '')
      ?.replace(/<[^>]+>/g, '')
      ?.trim() || null;
    if (description && description.length < 30) description = null;

    return { tags, description };
  } catch {
    return { tags: [], description: null, error: true };
  }
}

// ── Main ─────────────────────────────────────────────────────

const SAMPLE_SIZE = 30;
const DELAY_MS = 1200; // respect MB 1 req/sec

console.log(`\n🎵 Waveform — Test de couverture metadata`);
console.log(`   Last.fm API key : ${LASTFM_API_KEY ? '✓ présente' : '✗ absente'}\n`);

// Récupère un échantillon d'albums avec mbid + artiste (via PostgREST)
let albums;
try {
  albums = await supabaseQuery(
    'albums',
    `select=id,title,mbid,artists(name)&mbid=not.is.null&order=created_at.desc&limit=${SAMPLE_SIZE}`
  );
} catch (err) {
  console.error('❌ Impossible de récupérer les albums :', err.message);
  process.exit(1);
}
if (!albums?.length) {
  console.error('❌ Aucun album avec MBID trouvé en base.');
  process.exit(1);
}

console.log(`📋 Échantillon : ${albums.length} albums (les plus récents avec MBID)\n`);

const results = [];

for (let i = 0; i < albums.length; i++) {
  const album = albums[i];
  const artistName = album.artists?.name ?? '';
  const mbid = album.mbid;

  process.stdout.write(`[${i + 1}/${albums.length}] "${album.title}" — ${artistName} ... `);

  const [mb, lfm] = await Promise.all([
    testMusicBrainz(mbid),
    testLastFm(artistName, album.title),
  ]);

  const result = {
    title: album.title,
    artist: artistName,
    mb: {
      genres: mb.genres,
      tags: mb.tags,
      hasData: mb.genres.length > 0 || mb.tags.length > 0,
      error: mb.error ?? false,
    },
    lfm: {
      tags: lfm.tags,
      hasDescription: !!lfm.description,
      hasTags: lfm.tags.length > 0,
      notFound: lfm.notFound ?? false,
      error: lfm.error ?? false,
    },
    hasAnyGenre: mb.genres.length > 0 || mb.tags.length > 0 || lfm.tags.length > 0,
    hasDescription: !!lfm.description,
  };

  results.push(result);

  const mbStatus = mb.error ? '⚠ err' : mb.genres.length > 0 ? `✓ ${mb.genres.length}g` : mb.tags.length > 0 ? `~ ${mb.tags.length}t` : '✗';
  const lfmStatus = lfm.error ? '⚠ err' : lfm.notFound ? '✗ 404' : lfm.tags.length > 0 ? `✓ ${lfm.tags.length}t` : '✗';
  const descStatus = lfm.description ? '✓ desc' : '—';
  console.log(`MB:${mbStatus} | LFM:${lfmStatus} | ${descStatus}`);

  // Respect MB rate limit (sauf dernier)
  if (i < albums.length - 1) await new Promise(r => setTimeout(r, DELAY_MS));
}

// ── Rapport ──────────────────────────────────────────────────

const total = results.length;
const withAnyGenre = results.filter(r => r.hasAnyGenre).length;
const withDescription = results.filter(r => r.hasDescription).length;
const withMBGenres = results.filter(r => r.mb.genres.length > 0).length;
const withMBTags = results.filter(r => r.mb.tags.length > 0).length;
const withLFMTags = results.filter(r => r.lfm.hasTags).length;
const lfmNotFound = results.filter(r => r.lfm.notFound).length;
const mbErrors = results.filter(r => r.mb.error).length;
const lfmErrors = results.filter(r => r.lfm.error).length;

function pct(n) { return `${Math.round(n / total * 100)}%`; }

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 RAPPORT DE COUVERTURE — ${total} albums
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Genres / tags (au moins 1 source)
  ✓ Au moins 1 genre/tag          : ${withAnyGenre}/${total} (${pct(withAnyGenre)})
  ├─ MusicBrainz genres curatés   : ${withMBGenres}/${total} (${pct(withMBGenres)})
  ├─ MusicBrainz tags (≥3 votes)  : ${withMBTags}/${total} (${pct(withMBTags)})
  └─ Last.fm tags                 : ${withLFMTags}/${total} (${pct(withLFMTags)})

Description
  ✓ Description disponible        : ${withDescription}/${total} (${pct(withDescription)})

Erreurs / non trouvés
  ✗ Last.fm 404 (album non trouvé): ${lfmNotFound}/${total} (${pct(lfmNotFound)})
  ⚠ Erreurs MusicBrainz          : ${mbErrors}/${total}
  ⚠ Erreurs Last.fm              : ${lfmErrors}/${total}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

// Albums sans aucune donnée
const empty = results.filter(r => !r.hasAnyGenre);
if (empty.length > 0) {
  console.log(`\n⚠ Albums sans genre ni tag (${empty.length}) :`);
  for (const r of empty) console.log(`   - "${r.title}" — ${r.artist}`);
}

console.log('');

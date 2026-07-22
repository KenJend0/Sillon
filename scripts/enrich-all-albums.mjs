/**
 * enrich-all-albums.mjs
 * Enrichit rétroactivement tous les albums en base (genres + description + stats Last.fm).
 * Traite uniquement les albums sans album_metadata existante (idempotent).
 *
 * Usage : node scripts/enrich-all-albums.mjs
 * Options :
 *   --all      Re-traite TOUS les albums (ignore la présence de metadata)
 *   --limit=N  Limite à N albums (défaut : tous)
 *   --dry-run  Affiche ce qui serait traité sans écrire en base
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const content = readFileSync(resolve(__dirname, '../frontend/.env.local'), 'utf8');
const env = {};
for (const line of content.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i > -1) env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'];
const SUPABASE_KEY = env['SUPABASE_SERVICE_KEY'];
const LASTFM_KEY   = env['LASTFM_API_KEY'];
const MB_UA        = 'Sillon/1.0 (https://sillon.fm)';
const TIMEOUT_MS   = 4000;
const MB_DELAY_MS  = 1200; // respect MB 1 req/sec

const args = process.argv.slice(2);
const DRY_RUN    = args.includes('--dry-run');
const FORCE_ALL  = args.includes('--all');
const limitArg   = args.find(a => a.startsWith('--limit='));
const MAX_ALBUMS = limitArg ? parseInt(limitArg.split('=')[1]) : Infinity;

// ── Supabase helpers ─────────────────────────────────────────

async function sbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase ${res.status} on ${path}: ${body}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ── API helpers ──────────────────────────────────────────────

function withTimeout(promise) {
  return Promise.race([
    promise,
    new Promise((_, r) => setTimeout(() => r(new Error('timeout')), TIMEOUT_MS)),
  ]);
}

async function mbFetch(path) {
  const res = await withTimeout(fetch(`https://musicbrainz.org/ws/2/${path}`, {
    headers: { 'User-Agent': MB_UA },
  }));
  if (!res.ok) return null;
  return res.json();
}

async function fetchMBTags(releaseMbid) {
  try {
    const release = await mbFetch(`release/${releaseMbid}?fmt=json&inc=release-groups`);
    if (!release) return [];
    const rgId = release['release-group']?.id;
    if (!rgId) return [];

    await sleep(MB_DELAY_MS);

    const rg = await mbFetch(`release-group/${rgId}?fmt=json&inc=genres+tags`);
    if (!rg) return [];

    const genres = (rg.genres ?? []).map(g => ({ name: g.name.toLowerCase().trim(), count: g.count ?? 1 }));
    const tags   = (rg.tags ?? []).filter(t => (t.count ?? 0) >= 3)
                                  .map(t => ({ name: t.name.toLowerCase().trim(), count: t.count }));

    const seen = new Set(genres.map(g => g.name));
    const combined = [...genres];
    for (const t of tags) { if (!seen.has(t.name)) { combined.push(t); seen.add(t.name); } }
    return combined.slice(0, 12);
  } catch { return []; }
}

async function fetchLastFm(artist, title) {
  const empty = { tags: [], description: null, url: null, listeners: null, playcount: null };
  if (!LASTFM_KEY) return empty;
  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=album.getinfo` +
      `&artist=${encodeURIComponent(artist)}&album=${encodeURIComponent(title)}` +
      `&api_key=${LASTFM_KEY}&format=json&autocorrect=1`;
    const res = await withTimeout(fetch(url));
    if (!res.ok) return empty;
    const data = await res.json();
    if (!data.album) return empty;

    const tags = (data.album.tags?.tag ?? []).map((t, i) => ({
      name: t.name.toLowerCase().trim(),
      count: Math.max(1, 10 - i),
    }));

    let description = null;
    const summary = data.album.wiki?.summary;
    if (summary) {
      description = summary
        .replace(/<a\s[^>]*>Read more on Last\.fm<\/a>\.?/gi, '')
        .replace(/<[^>]+>/g, '').trim() || null;
      if (description && description.length < 30) description = null;
    }

    return {
      tags,
      description,
      url: data.album.url ?? null,
      listeners: data.album.listeners ? parseInt(data.album.listeners, 10) : null,
      playcount: data.album.playcount ? parseInt(data.album.playcount, 10) : null,
    };
  } catch { return empty; }
}

// ── Tag filtering ────────────────────────────────────────────

const NOISE = new Set([
  'seen live','loved','favorites','favourite','albums i own','check in',
  'albums','music','good','great','awesome','love','my music','spotify',
  'all','default','amazing','beautiful','best','classic','cool',
  'essential','excellent','perfect',
]);

function validTag(name) {
  return name.length >= 2 && name.length <= 50 && !NOISE.has(name);
}

function toSlug(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Write to DB ──────────────────────────────────────────────

async function upsertGenreAndLink(albumId, name, source, weight) {
  const slug = toSlug(name);
  if (!slug) return;

  // Lookup par slug (clé de dédup canonique — "hip-hop" et "hip hop" → même slug)
  let existing = await sbFetch('genres?select=id&slug=eq.' + encodeURIComponent(slug));
  let genreId = existing?.[0]?.id;

  if (!genreId) {
    try {
      const inserted = await sbFetch('genres', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ name, slug }),
      });
      genreId = inserted?.[0]?.id;
    } catch {
      // Race condition : un autre album vient d'insérer ce slug — on le récupère
      const retry = await sbFetch('genres?select=id&slug=eq.' + encodeURIComponent(slug));
      genreId = retry?.[0]?.id;
    }
  }

  if (!genreId) return;

  // Upsert album_genres
  await sbFetch('album_genres', {
    method: 'POST',
    body: JSON.stringify({ album_id: albumId, genre_id: genreId, source, weight }),
  });
}

async function upsertMetadata(albumId, lfm) {
  await sbFetch('album_metadata', {
    method: 'POST',
    body: JSON.stringify({
      album_id: albumId,
      description: lfm.description ?? null,
      description_src: lfm.description ? 'lastfm' : null,
      lastfm_url: lfm.url ?? null,
      lastfm_listeners: lfm.listeners ?? null,
      lastfm_playcount: lfm.playcount ?? null,
      fetched_at: new Date().toISOString(),
    }),
  });
}

// ── Main ─────────────────────────────────────────────────────

console.log(`\n🎵 Sillon — Enrichissement rétroactif des albums`);
console.log(`   Mode : ${DRY_RUN ? 'DRY RUN (pas d\'écriture)' : FORCE_ALL ? 'FORCE (tous les albums)' : 'NORMAL (albums sans metadata)'}`);
if (LASTFM_KEY) console.log(`   Last.fm : ✓`);
else console.log(`   Last.fm : ✗ (LASTFM_API_KEY absente — MusicBrainz uniquement)`);
console.log('');

// 1. Récupère tous les albums avec mbid
const allAlbums = await sbFetch(
  `albums?select=id,title,mbid,artists(name)&mbid=not.is.null&order=created_at.asc`
);
if (!allAlbums?.length) { console.log('Aucun album avec MBID en base.'); process.exit(0); }

// 2. Filtre ceux qui ont déjà des métadonnées (sauf --all)
let toProcess = allAlbums;
if (!FORCE_ALL) {
  const existing = await sbFetch(`album_metadata?select=album_id`);
  const enriched = new Set((existing ?? []).map(r => r.album_id));
  toProcess = allAlbums.filter(a => !enriched.has(a.id));
}

if (MAX_ALBUMS < Infinity) toProcess = toProcess.slice(0, MAX_ALBUMS);

console.log(`📋 Albums total en base : ${allAlbums.length}`);
console.log(`🔄 À enrichir          : ${toProcess.length}`);
if (DRY_RUN) {
  console.log('\nAlbums qui seraient traités :');
  toProcess.forEach((a, i) => console.log(`  ${i+1}. "${a.title}" — ${a.artists?.name}`));
  process.exit(0);
}
console.log(`⏱  Durée estimée       : ~${Math.ceil(toProcess.length * 4.5 / 60)} min\n`);

// 3. Enrichit album par album
let ok = 0, skipped = 0, errors = 0;
const stats = { withGenres: 0, withDesc: 0, totalGenres: 0, genreFreq: {} };

for (let i = 0; i < toProcess.length; i++) {
  const album = toProcess[i];
  const artist = album.artists?.name ?? '';
  process.stdout.write(`[${i+1}/${toProcess.length}] "${album.title}" — ${artist} ... `);

  try {
    const [mbTags, lfm] = await Promise.all([
      fetchMBTags(album.mbid),
      fetchLastFm(artist, album.title),
    ]);

    // Merge tags
    const tagMap = new Map();
    for (const t of lfm.tags)  if (validTag(t.name)) tagMap.set(t.name, { count: t.count, source: 'lastfm' });
    for (const t of mbTags)    if (validTag(t.name) && !tagMap.has(t.name)) tagMap.set(t.name, { count: t.count, source: 'musicbrainz' });

    // Write genres
    for (const [name, { count, source }] of tagMap) {
      await upsertGenreAndLink(album.id, name, source, count);
      stats.genreFreq[name] = (stats.genreFreq[name] ?? 0) + 1;
    }

    // Write metadata
    await upsertMetadata(album.id, lfm);

    if (tagMap.size > 0) stats.withGenres++;
    if (lfm.description) stats.withDesc++;
    stats.totalGenres += tagMap.size;
    ok++;

    const genreList = tagMap.size > 0 ? [...tagMap.keys()].slice(0, 3).join(', ') : '—';
    console.log(`✓ [${tagMap.size}g] ${genreList}`);
  } catch (err) {
    errors++;
    console.log(`✗ ${err.message}`);
  }

  // Rate limit entre albums (MB a déjà son délai interne)
  if (i < toProcess.length - 1) await sleep(500);
}

// 4. Rapport final
const processed = ok + errors;
console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 RÉSULTATS — ${processed} albums traités
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Succès          : ${ok}
✗ Erreurs         : ${errors}
🎭 Avec genres    : ${stats.withGenres}/${processed} (${Math.round(stats.withGenres/processed*100)}%)
📝 Avec description: ${stats.withDesc}/${processed} (${Math.round(stats.withDesc/processed*100)}%)
🏷  Genres distincts: ${Object.keys(stats.genreFreq).length}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Top 20 genres (fréquence dans le catalogue) :`);

const sorted = Object.entries(stats.genreFreq).sort((a, b) => b[1] - a[1]).slice(0, 20);
sorted.forEach(([name, count]) => {
  const bar = '█'.repeat(Math.min(count, 20));
  console.log(`  ${bar.padEnd(20)} ${count.toString().padStart(3)}  ${name}`);
});
console.log('');

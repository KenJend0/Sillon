/**
 * Test script for MusicBrainz RECORDING (track) search.
 *
 * Usage:
 *   node scripts/test-track-search.mjs "a song for you|donny hathaway" "goodbye|rainbow ffolly"
 *   node scripts/test-track-search.mjs   (uses the example queries below)
 *
 * Mirrors the exact same Lucene query + filtering + dedup logic as
 * searchMusicBrainzRecordings() in app/actions/musicbrainz.ts.
 * Each arg is "title|expected artist" — expected artist is optional, used
 * only to flag whether/where it shows up in the results.
 * No Supabase auth required — hits MB API directly.
 */

import { isAcceptableReleaseGroup } from '../lib/musicbrainzReleasePolicy.mjs';

const MUSICBRAINZ_API = 'https://musicbrainz.org/ws/2';
const USER_AGENT = 'Waveform/1.0 (https://waveformapp.online)';
const MB_RATE_LIMIT_MS = 1100; // MB allows 1 req/sec

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url, options, maxRetries = 4) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      if (attempt === maxRetries - 1) throw err;
      const backoff = 500 * Math.pow(2, attempt);
      console.warn(`  ${DIM}⚠ fetch failed (${err.message}) — retry in ${backoff}ms${RESET}`);
      await sleep(backoff);
    }
  }
}

const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';
const DIM    = '\x1b[2m';
const GREEN  = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED    = '\x1b[31m';
const CYAN   = '\x1b[36m';
const GRAY   = '\x1b[90m';

// ---------------------------------------------------------------------------
// Mirrors searchMusicBrainzRecordings() in musicbrainz.ts
// ---------------------------------------------------------------------------

async function searchMBRecordings(query, limit = 20) {
  const trimmed = query.trim().replace(/[+\-&|!(){}\[\]^"~*?:\\\/]/g, ' ').trim();
  const terms = trimmed.split(/\s+/).filter(Boolean);
  const phraseClause = `"${trimmed}"~2`;
  const termClause = terms.map((t) => `recording:${t}`).join(' AND ');
  const lucene = terms.length > 1 ? `(${phraseClause}) OR (${termClause})` : phraseClause;

  const url = `${MUSICBRAINZ_API}/recording?query=${encodeURIComponent(lucene)}&limit=${limit}&fmt=json&inc=releases`;

  console.log(`  → Lucene query : ${lucene}`);

  const res = await fetchWithRetry(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) {
    console.error(`  ✗ MB returned HTTP ${res.status}`);
    return { raw: [], results: [] };
  }

  const data = await res.json();
  const recordings = data.recordings || [];

  const results = recordings
    .filter((r) => r.releases && r.releases.length > 0)
    .map((r) => {
      const artistName = r['artist-credit']?.[0]?.artist?.name || 'Unknown';
      const release = r.releases.find((rel) =>
        rel['release-group'] && isAcceptableReleaseGroup(rel['release-group'])
      ) || r.releases.find((rel) =>
        rel['release-group'] && isAcceptableReleaseGroup(rel['release-group'], { allowedPrimaryTypes: new Set(['Single']) })
      ) || r.releases[0];
      const rgTitle = release?.['release-group']?.title || release?.title || 'Unknown';
      const primaryType = release?.['release-group']?.['primary-type'] || '?';
      const secondaryTypes = (release?.['release-group']?.['secondary-types'] || []).join(', ') || '—';
      return {
        title: r.title,
        artistName,
        albumTitle: rgTitle,
        primaryType,
        secondaryTypes,
        score: r.score ?? 0,
      };
    });

  // Same dedup as prod: keep best release-group quality, then highest score.
  const bestByKey = new Map();
  for (const r of results) {
    const key = `${r.title.toLowerCase().trim()}|||${r.artistName.toLowerCase().trim()}`;
    const existing = bestByKey.get(key);
    if (!existing || r.score > existing.score) bestByKey.set(key, r);
  }

  return { raw: recordings, results: [...bestByKey.values()] };
}

function printResults(results, expectedArtist) {
  if (results.length === 0) {
    console.log(`    ${RED}Aucun résultat.${RESET}`);
    return;
  }
  results.forEach((r, i) => {
    const isMatch = expectedArtist && r.artistName.toLowerCase().includes(expectedArtist.toLowerCase());
    const marker = isMatch ? `${GREEN}✓${RESET}` : ' ';
    const scoreColor = r.score >= 80 ? GREEN : r.score >= 50 ? YELLOW : RED;
    console.log(
      `    ${marker} ${GRAY}${i + 1}.${RESET} ${BOLD}${r.title}${RESET} ${GRAY}— ${r.artistName}${RESET}` +
      `  ${DIM}[${r.albumTitle} / ${r.primaryType}${r.secondaryTypes !== '—' ? ' / ' + r.secondaryTypes : ''}]${RESET}` +
      `  score:${scoreColor}${r.score}${RESET}`
    );
  });
  if (expectedArtist) {
    const pos = results.findIndex((r) => r.artistName.toLowerCase().includes(expectedArtist.toLowerCase()));
    if (pos === -1) {
      console.log(`  ${RED}✗ "${expectedArtist}" absent des ${results.length} résultats${RESET}`);
    } else {
      console.log(`  ${pos === 0 ? GREEN : YELLOW}→ "${expectedArtist}" trouvé en position ${pos + 1}${RESET}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const DEFAULT_QUERIES = [
  'a song for you|donny hathaway',
  'la chanson des vieux amants|jacques brel',
  'why did i choose you|marvin gaye',
  'goodbye|rainbow ffolly',
  'bonifacio|philippe katherine',
  'take it off|pharrell williams',
  'crystal clear|pharrell williams',
  'gush|pharrell williams',
  'the mexican|babe ruth',
  'so in love with you|duke',
  'slow dance|david ruffin',
  'lady cab driver|prince',
  "strollin'|prince",
  'stare|prince',
  'let me get that|rihanna',
];

const argQueries = process.argv.slice(2);
const queries = argQueries.length > 0 ? argQueries : DEFAULT_QUERIES;

console.log(`\n${BOLD}${CYAN}=== Waveform Track Search Test ===${RESET}\n`);
console.log(`${DIM}Teste searchMusicBrainzRecordings() tel qu'utilisé par TrackSearchForDiary${RESET}\n`);

for (let i = 0; i < queries.length; i++) {
  const [titleRaw, artistRaw] = queries[i].split('|');
  const title = (titleRaw || '').trim();
  const expectedArtist = (artistRaw || '').trim();

  console.log(`${BOLD}${CYAN}▶ "${title}"${expectedArtist ? ` ${GRAY}(attendu: ${expectedArtist})${RESET}` : ''}${RESET}`);

  // Comportement le plus fréquent : l'utilisateur ne tape que le titre.
  console.log(`  ${BOLD}— Titre seul "${title}" —${RESET}`);
  const titleOnly = await searchMBRecordings(title, 20);
  console.log(`  ${DIM}${titleOnly.raw.length} recordings bruts MB → ${titleOnly.results.length} après dédup :${RESET}`);
  printResults(titleOnly.results, expectedArtist);

  await sleep(MB_RATE_LIMIT_MS);

  // Comportement minoritaire : l'utilisateur tape titre + artiste dans la même barre.
  if (expectedArtist) {
    const combinedQuery = `${title} ${expectedArtist}`;
    console.log(`  ${BOLD}— Titre + artiste "${combinedQuery}" —${RESET}`);
    const combined = await searchMBRecordings(combinedQuery, 20);
    console.log(`  ${DIM}${combined.raw.length} recordings bruts MB → ${combined.results.length} après dédup :${RESET}`);
    printResults(combined.results, expectedArtist);
  }

  console.log();

  if (i < queries.length - 1) await sleep(MB_RATE_LIMIT_MS);
}

console.log(`${BOLD}${CYAN}=== Fin des tests ===${RESET}\n`);

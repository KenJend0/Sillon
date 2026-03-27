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

const key = env['LASTFM_API_KEY'];

// Test album.getInfo — quelles clés sont disponibles ?
const res = await fetch(
  `https://ws.audioscrobbler.com/2.0/?method=album.getinfo&artist=Radiohead&album=OK+Computer&api_key=${key}&format=json`
);
const data = await res.json();

console.log('Clés top-level de data.album :');
console.log(JSON.stringify(Object.keys(data.album), null, 2));

console.log('\nContenu de chaque clé (aperçu) :');
for (const [k, v] of Object.entries(data.album)) {
  const preview = typeof v === 'object' ? JSON.stringify(v).slice(0, 120) : String(v).slice(0, 120);
  console.log(`  ${k}: ${preview}`);
}

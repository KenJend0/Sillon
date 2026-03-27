import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const content = readFileSync(resolve(__dirname, '../frontend/.env.local'), 'utf8');
const env = {};
for (const line of content.split('\n')) {
  const t = line.trim(); if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('='); if (i > -1) env[t.slice(0,i).trim()] = t.slice(i+1).trim();
}
const URL_ = env['NEXT_PUBLIC_SUPABASE_URL'], KEY = env['SUPABASE_SERVICE_KEY'];
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };

// Fetch all genres with their album count
const genres = await fetch(`${URL_}/rest/v1/genres?select=slug,name`, { headers }).then(r => r.json());
const links  = await fetch(`${URL_}/rest/v1/album_genres?select=genre_id`, { headers }).then(r => r.json());

const counts = {};
for (const l of links) counts[l.genre_id] = (counts[l.genre_id] ?? 0) + 1;

const genreMap = {};
for (const g of genres) genreMap[g.slug] = g;

// Fetch genre IDs
const genresFull = await fetch(`${URL_}/rest/v1/genres?select=id,slug,name`, { headers }).then(r => r.json());
const rows = genresFull.map(g => ({ slug: g.slug, name: g.name, count: counts[g.id] ?? 0 }))
  .sort((a, b) => b.count - a.count);

console.log('\nTous les genres (slug · count) :\n');
for (const r of rows) {
  console.log(`  ${r.count.toString().padStart(3)}  ${r.slug.padEnd(35)} ${r.name}`);
}
console.log(`\nTotal : ${rows.length} genres`);

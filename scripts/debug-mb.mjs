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

const albums = await fetch(
  `${SUPABASE_URL}/rest/v1/albums?select=title,mbid,artists(name)&mbid=not.is.null&order=created_at.desc&limit=3`,
  { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
).then(r => r.json());

for (const a of albums) {
  console.log(`\n─── "${a.title}" (MBID: ${a.mbid})`);
  const r = await fetch(
    `https://musicbrainz.org/ws/2/release-group/${a.mbid}?fmt=json&inc=genres+tags`,
    { headers: { 'User-Agent': 'Sillon/1.0 (https://sillon.fm)' } }
  );
  console.log('  HTTP:', r.status);
  const d = await r.json();
  console.log('  genres :', JSON.stringify(d.genres ?? null));
  console.log('  tags   :', JSON.stringify(d.tags?.slice(0, 5) ?? null));
  console.log('  error  :', d.error ?? null);
  await new Promise(res => setTimeout(res, 1300));
}

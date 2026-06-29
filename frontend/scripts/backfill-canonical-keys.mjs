/**
 * One-time backfill of albums.canonical_key for rows imported before the
 * canonical-key duplicate check existed (see supabase_migration_album_canonical_key.sql).
 *
 * Without this, importAlbumFromMusicBrainz's duplicate check only ever matches
 * NEW imports against each other — pre-existing albums (including the
 * reissue/remaster duplicates already in the DB) stay invisible to it.
 *
 * NOTE: stripEditionSuffix/normalize/canonicalAlbumKey below must stay in sync
 * with frontend/lib/albumCanonical.ts + frontend/lib/textNormalize.ts — this
 * script can't import them directly (no ts-node/tsx in this project).
 *
 * Usage (from frontend/ directory):
 *   node --env-file=.env.local scripts/backfill-canonical-keys.mjs
 *   node --env-file=.env.local scripts/backfill-canonical-keys.mjs --dry-run
 *   node --env-file=.env.local scripts/backfill-canonical-keys.mjs --recompute  (also overwrites rows that already have a canonical_key — use after changing the normalization logic)
 */

import { createClient } from '@supabase/supabase-js';

const DRY_RUN = process.argv.includes('--dry-run');
const RECOMPUTE = process.argv.includes('--recompute');
const BATCH_SIZE = 500;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ─── Keep in sync with frontend/lib/albumCanonical.ts ──────────────────────

const EDITION_KEYWORDS = [
  "super deluxe( edition)?",
  "deluxe( edition)?",
  "remaster(ed)?( version)?",
  "\\d{4}\\s*remaster(ed)?",
  "\\d+(st|nd|rd|th)\\s*anniversary( edition)?",
  "anniversary( edition)?",
  "expanded( edition)?",
  "extended( edition)?",
  "bonus track(s)?( version)?",
  "special edition",
  "collector'?s? edition",
  "legacy edition",
  "mono( version)?",
  "stereo( version)?",
  "reissue",
].join("|");

const BRACKETED_SUFFIX_RE = new RegExp(`\\s*[(\\[][^()\\[\\]]*(?:${EDITION_KEYWORDS})[^()\\[\\]]*[)\\]]\\s*$`, "i");
const DASH_SUFFIX_RE = new RegExp(`\\s*[-–:]\\s*(?:${EDITION_KEYWORDS})\\s*$`, "i");

function stripEditionSuffix(title) {
  let t = title;
  let prev;
  do {
    prev = t;
    t = t.replace(BRACKETED_SUFFIX_RE, "").replace(DASH_SUFFIX_RE, "").trim();
  } while (t !== prev && t.length > 0);
  return t;
}

function normalize(str) {
  return str
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\b0+(\d)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function stripArticle(s) {
  return s.replace(/^(the|a|an) /, "");
}

function canonicalAlbumKey(title, artistName) {
  const t = stripArticle(normalize(stripEditionSuffix(title)));
  const a = stripArticle(normalize(artistName));
  return `${t}|||${a}`;
}

// ─── Backfill ────────────────────────────────────────────────────────────────

async function main() {
  let from = 0;
  let updated = 0;
  let total = 0;

  while (true) {
    // Default mode filters on canonical_key IS NULL and the UPDATE below removes
    // matched rows from that filter — so the matching set shrinks after every
    // batch and offset-based pagination (range(from, from+N)) would skip rows.
    // Always re-query from 0 in that case. --recompute and --dry-run don't shrink
    // the matching set (no filter / no mutation), so `from` can advance normally.
    const shrinkingFilter = !DRY_RUN && !RECOMPUTE;
    const rangeStart = shrinkingFilter ? 0 : from;
    let query = supabase.from('albums').select('id, title, artists(name)');
    if (!RECOMPUTE) query = query.is('canonical_key', null);
    const { data: albums, error } = await query.range(rangeStart, rangeStart + BATCH_SIZE - 1);

    if (error) {
      console.error('[backfill] fetch error:', error.message);
      process.exit(1);
    }
    if (!albums || albums.length === 0) break;

    total += albums.length;

    for (const album of albums) {
      const artistName = album.artists?.name || '';
      const canonicalKey = canonicalAlbumKey(album.title, artistName);
      console.log(`${DRY_RUN ? '[dry-run] ' : ''}${album.title} (${artistName}) → ${canonicalKey}`);

      if (!DRY_RUN) {
        const { error: updateError } = await supabase
          .from('albums')
          .update({ canonical_key: canonicalKey })
          .eq('id', album.id);
        if (updateError) {
          console.error(`[backfill] update failed for ${album.id}:`, updateError.message);
          continue;
        }
        updated++;
      }
    }

    from += BATCH_SIZE;
  }

  console.log(`\n[backfill] ${total} albums scanned, ${updated} updated.`);
}

main();

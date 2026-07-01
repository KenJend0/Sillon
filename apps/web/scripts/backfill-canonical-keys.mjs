/**
 * One-time backfill of albums.canonical_key for rows imported before the
 * canonical-key duplicate check existed (see supabase_migration_album_canonical_key.sql).
 *
 * Without this, importAlbumFromMusicBrainz's duplicate check only ever matches
 * NEW imports against each other — pre-existing albums (including the
 * reissue/remaster duplicates already in the DB) stay invisible to it.
 *
 * Usage (from frontend/ directory):
 *   node --env-file=.env.local scripts/backfill-canonical-keys.mjs
 *   node --env-file=.env.local scripts/backfill-canonical-keys.mjs --dry-run
 *   node --env-file=.env.local scripts/backfill-canonical-keys.mjs --recompute  (also overwrites rows that already have a canonical_key — use after changing the normalization logic)
 */

import { createClient } from '@supabase/supabase-js';
import { canonicalAlbumKey } from '../lib/albumCanonical.mjs';

const DRY_RUN = process.argv.includes('--dry-run');
const RECOMPUTE = process.argv.includes('--recompute');
const BATCH_SIZE = 500;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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

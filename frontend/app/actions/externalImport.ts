'use server';

import { getAuthUser, createSupabaseAdmin } from '@/lib/supabase/server';
import { toggleListItem } from './lists';
import { BATCH_SIZE, resolveAlbumId, progressOfImportRow, type RawExternalItem } from '@/lib/externalImport';

/**
 * Traite un lot d'items d'un import en cours (Last.fm ou RYM).
 * Last.fm : ajoute l'album matché à la liste privée de triage (pas de note disponible).
 * RYM : crée directement une diary_entries avec la note/critique de l'export — insert
 * direct via le client admin (pas upsertDiaryEntry) pour ne pas fanout un mur de
 * notifications "vient d'écouter" vers les abonnés pour un import d'historique.
 */
export async function processImportBatch(importId: string) {
  const user = await getAuthUser();
  if (!user) return { success: false as const, error: 'Not authenticated' };

  // `external_imports` n'est pas encore dans les types générés (migration récente) — cast en any.
  const admin = createSupabaseAdmin() as any;

  const { data: importRow } = await admin
    .from('external_imports')
    .select('*')
    .eq('id', importId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!importRow) return { success: false as const, error: 'Import introuvable' };
  if (importRow.status === 'done') {
    return { success: true as const, done: true, ...progressOfImportRow(importRow) };
  }

  const items: RawExternalItem[] = importRow.raw_items || [];
  const start = importRow.processed_count;
  const batch = items.slice(start, start + BATCH_SIZE);

  let matched = importRow.matched_count;
  let failed = importRow.failed_count;

  for (const item of batch) {
    try {
      const albumId = await resolveAlbumId(admin, item);

      if (!albumId) {
        failed++;
      } else if (importRow.source === 'lastfm') {
        const [{ data: existingItem }, { data: alreadyDiaried }] = await Promise.all([
          admin.from('list_items').select('id').eq('list_id', importRow.list_id).eq('album_id', albumId).maybeSingle(),
          admin.from('diary_entries').select('id').eq('user_id', user.id).eq('album_id', albumId).maybeSingle(),
        ]);

        if (!existingItem && !alreadyDiaried) {
          await toggleListItem(importRow.list_id, { albumId });
        }
        matched++;
      } else {
        const { data: alreadyDiaried } = await admin
          .from('diary_entries')
          .select('id')
          .eq('user_id', user.id)
          .eq('album_id', albumId)
          .maybeSingle();

        if (!alreadyDiaried) {
          await admin.from('diary_entries').insert({
            user_id: user.id,
            album_id: albumId,
            listened_at: item.listenedAt || new Date().toISOString().slice(0, 10),
            rating: item.rating ?? null,
            review_title: item.reviewTitle || null,
            review_body: item.reviewBody || null,
            is_public: true,
          });
        }
        matched++;
      }
    } catch {
      failed++;
    }

    // Respecte l'étiquette MusicBrainz (~1 req/s) entre chaque album traité.
    await new Promise((resolve) => setTimeout(resolve, 1100));
  }

  const processed = start + batch.length;
  const done = processed >= items.length;

  await admin
    .from('external_imports')
    .update({
      processed_count: processed,
      matched_count: matched,
      failed_count: failed,
      status: done ? 'done' : 'matching',
      completed_at: done ? new Date().toISOString() : null,
      last_processed_at: new Date().toISOString(),
    })
    .eq('id', importId);

  return {
    success: true as const,
    done,
    total: items.length,
    processed,
    matched,
    failed,
    listId: importRow.list_id,
  };
}

export async function getImportStatus(importId: string) {
  const user = await getAuthUser();
  if (!user) return { success: false as const, error: 'Not authenticated' };

  const admin = createSupabaseAdmin() as any;
  const { data: importRow } = await admin
    .from('external_imports')
    .select('status, source, total_items, processed_count, matched_count, failed_count, list_id')
    .eq('id', importId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!importRow) return { success: false as const, error: 'Import introuvable' };

  return {
    success: true as const,
    status: importRow.status,
    source: importRow.source as 'lastfm' | 'rym',
    done: importRow.status === 'done',
    ...progressOfImportRow(importRow),
  };
}

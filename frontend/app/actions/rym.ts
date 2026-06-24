'use server';

import { getAuthUser, createSupabaseAdmin } from '@/lib/supabase/server';
import { parseRymCsv } from '@/lib/rymCsv';
import type { RawExternalItem } from '@/lib/externalImport';

const COOLDOWN_HOURS = 24;
const MAX_ROWS = 500;

export async function startRymImport(fileContent: string, fileName: string) {
  const user = await getAuthUser();
  if (!user) return { success: false as const, error: 'Not authenticated' };

  // `external_imports` n'est pas encore dans les types générés (migration récente) — cast en any.
  const admin = createSupabaseAdmin() as any;

  const cutoff = new Date(Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from('external_imports')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('source', 'rym')
    .gte('created_at', cutoff);

  if ((count || 0) > 0) {
    return {
      success: false as const,
      error: `Tu as déjà lancé un import RYM dans les dernières ${COOLDOWN_HOURS}h. Réessaie plus tard.`,
    };
  }

  let items: RawExternalItem[];
  try {
    items = parseRymCsv(fileContent).slice(0, MAX_ROWS);
  } catch {
    return { success: false as const, error: 'Fichier CSV invalide.' };
  }

  if (items.length === 0) {
    return { success: false as const, error: "Aucun album reconnu dans ce fichier — vérifie que c'est bien un export RYM (Catalog)." };
  }

  const { data: importRow, error } = await admin
    .from('external_imports')
    .insert({
      user_id: user.id,
      source: 'rym',
      source_label: fileName,
      status: 'matching',
      raw_items: items,
      total_items: items.length,
    })
    .select('id')
    .single();

  if (error || !importRow) {
    return { success: false as const, error: "Erreur lors de la création de l'import" };
  }

  return { success: true as const, importId: importRow.id, total: items.length };
}

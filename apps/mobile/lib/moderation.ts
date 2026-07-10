import { supabase } from './supabase';

/**
 * Signalement de contenu — miroir de reportContent (apps/web/app/actions/moderation.ts).
 * Écriture directe RLS (policy `users_insert_own_reports` : reporter_id = auth.uid()),
 * pas besoin d'Edge Function. Contrairement au web, pas de rate-limit ici — ce garde-fou
 * reste côté serveur tant que la mobile n'a pas d'Edge Function équivalente (Phase 8).
 */

export type ReportReason = 'inappropriate' | 'spam' | 'harassment';
export type ReportedContentType = 'diary_entry' | 'diary_comment' | 'track_diary_entry' | 'track_diary_comment';

/** Signale une écoute ou un commentaire. Déduplique silencieusement (déjà signalé = succès). */
export async function reportContent(
  contentType: ReportedContentType,
  contentId: string,
  reason: ReportReason = 'inappropriate'
): Promise<{ success: boolean; error?: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return { success: false, error: 'Not authenticated' };

  const { error } = await supabase.from('content_reports').insert({
    reporter_id: user.id,
    content_type: contentType,
    content_id: contentId,
    reason,
  });

  if (error) {
    if (error.code === '23505') return { success: true };
    console.error('reportContent error:', error.message, error.code);
    return { success: false, error: 'Une erreur est survenue' };
  }

  return { success: true };
}

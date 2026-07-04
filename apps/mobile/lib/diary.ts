import { supabase } from './supabase';

/**
 * Journal d'écoute (albums) — miroir de apps/web/app/actions/diary.ts. Créer/supprimer
 * une écoute passe par l'Edge Function `log-listen` (supabase/functions/log-listen),
 * qui fait l'écriture ET le fanout feed_events pour les abonnés — même pattern que
 * toggleDiaryLike (lib/feed.ts) pour toggle-like : un client direct ne pourrait pas
 * écrire feed_events pour d'autres utilisateurs sans la clé service_role, qui ne doit
 * jamais être embarquée dans l'app mobile. `updateDiaryEntry` (modifier une écoute déjà
 * enregistrée) reste un appel direct : le web ne fanout pas non plus sur l'édition, donc
 * une écriture RLS classique (l'utilisateur ne modifie que sa propre ligne) suffit.
 */

export type AlbumReview = {
  id: string;
  user_id: string;
  rating: number | null;
  review_body: string | null;
  created_at: string;
  username: string | null;
  avatar_url: string | null;
};

export type MyDiaryEntry = {
  id: string;
  rating: number | null;
  review_body: string | null;
  listened_at: string;
  created_at: string;
};

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/** Toutes les écoutes de l'utilisateur courant pour cet album, plus récentes d'abord. */
export async function getMyDiaryEntries(albumId: string): Promise<MyDiaryEntry[]> {
  const userId = await currentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('diary_entries')
    .select('id, rating, review_body, listened_at, created_at')
    .eq('album_id', albumId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getMyDiaryEntries error:', error.message);
    return [];
  }
  return data ?? [];
}

/**
 * Crée une écoute (première fois) ou upsert sur (user_id, album_id, listened_at) —
 * délègue à l'Edge Function `log-listen` (écriture + fanout feed_events).
 * relisten=true force un INSERT côté fonction (jamais d'écrasement d'une entrée existante).
 */
export async function upsertDiaryEntry(input: {
  albumId: string;
  listenedAt: string;
  rating: number;
  reviewBody?: string;
  relisten?: boolean;
  source?: string;
}): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
  const { data, error } = await supabase.functions.invoke('log-listen', {
    body: {
      action: 'upsert',
      kind: 'album',
      albumId: input.albumId,
      listenedAt: input.listenedAt,
      rating: input.rating,
      reviewBody: input.reviewBody,
      relisten: input.relisten,
      source: input.source,
    },
  });

  if (error) {
    console.error('upsertDiaryEntry error:', error.message);
    return { success: false, error: 'Une erreur est survenue' };
  }
  return data as { success: boolean; data?: { id: string }; error?: string };
}

export async function updateDiaryEntry(input: {
  entryId: string;
  listenedAt: string;
  rating: number | null;
  reviewBody?: string;
}): Promise<{ success: boolean; error?: string }> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const { error } = await supabase
    .from('diary_entries')
    .update({
      listened_at: input.listenedAt,
      review_body: input.reviewBody || null,
      rating: input.rating,
    })
    .eq('id', input.entryId)
    .eq('user_id', userId);

  if (error) {
    console.error('updateDiaryEntry error:', error.message);
    return { success: false, error: 'Une erreur est survenue' };
  }
  return { success: true };
}

export async function deleteDiaryEntry(entryId: string): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke('log-listen', {
    body: { action: 'delete', kind: 'album', entryId },
  });

  if (error) {
    console.error('deleteDiaryEntry error:', error.message);
    return { success: false, error: 'Une erreur est survenue' };
  }
  return data as { success: boolean; error?: string };
}

/** Aperçu des critiques (avec texte) d'un album — miroir de getAlbumReviewsPreview (web). */
export async function getAlbumReviewsPreview(albumId: string, limit = 3): Promise<AlbumReview[]> {
  const { data: rows, error } = await supabase
    .from('diary_entries')
    .select('id, user_id, rating, review_body, created_at')
    .eq('album_id', albumId)
    .not('review_body', 'is', null)
    .neq('review_body', '')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !rows) {
    console.error('getAlbumReviewsPreview error:', error?.message);
    return [];
  }
  return attachProfiles(rows);
}

export type AlbumReviewsTab = 'all' | 'friends' | 'my';

/** Page paginée de critiques avec onglets — miroir de getAlbumReviewsPage (web). */
export async function getAlbumReviewsPage(input: {
  albumId: string;
  tab: AlbumReviewsTab;
  offset?: number;
  limit?: number;
  orderBy?: 'recent' | 'top';
}): Promise<{ items: AlbumReview[]; hasMore: boolean; userId: string | null; hasFollowing: boolean }> {
  const { albumId, tab, offset = 0, limit = 12, orderBy = 'recent' } = input;
  const userId = await currentUserId();

  let followingIds: string[] = [];
  let hasFollowing = false;
  if (userId) {
    const { data: follows } = await supabase.from('follows').select('followee_id').eq('follower_id', userId);
    followingIds = (follows ?? []).map((f) => f.followee_id);
    hasFollowing = followingIds.length > 0;
  }

  if ((tab === 'friends' || tab === 'my') && !userId) {
    return { items: [], hasMore: false, userId: null, hasFollowing };
  }
  if (tab === 'friends' && !hasFollowing) {
    return { items: [], hasMore: false, userId, hasFollowing };
  }

  let query = supabase
    .from('diary_entries')
    .select('id, user_id, rating, review_body, created_at')
    .eq('album_id', albumId)
    .not('review_body', 'is', null)
    .neq('review_body', '');

  query = orderBy === 'top'
    ? query.order('rating', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false })
    : query.order('created_at', { ascending: false });

  if (tab === 'my' && userId) query = query.eq('user_id', userId);
  else if (tab === 'friends' && hasFollowing) query = query.in('user_id', followingIds);

  const { data: rows, error } = await query.range(offset, offset + limit);

  if (error || !rows) {
    console.error('getAlbumReviewsPage error:', error?.message);
    return { items: [], hasMore: false, userId, hasFollowing };
  }

  const hasMore = rows.length > limit;
  const sliced = rows.slice(0, limit);

  return { items: await attachProfiles(sliced), hasMore, userId, hasFollowing };
}

async function attachProfiles(
  rows: Array<{ id: string; user_id: string; rating: number | null; review_body: string | null; created_at: string }>
): Promise<AlbumReview[]> {
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: profiles } = userIds.length > 0
    ? await supabase.from('profiles').select('id, username, avatar_url').in('id', userIds)
    : { data: [] };

  const profilesMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  return rows.map((row) => ({
    ...row,
    username: profilesMap.get(row.user_id)?.username ?? null,
    avatar_url: profilesMap.get(row.user_id)?.avatar_url ?? null,
  }));
}

import { supabase } from './supabase';

/**
 * Journal d'écoute (titres) — miroir de apps/web/app/actions/track-diary.ts. Créer/
 * supprimer une écoute passe par l'Edge Function `log-listen` (même fonction que pour
 * les albums, discriminée par `kind: 'track'`) — voir lib/diary.ts pour le détail du
 * pattern (écriture + fanout feed_events, admin jamais exposé côté client).
 */

export type TrackReview = {
  id: string;
  user_id: string;
  rating: number | null;
  review_body: string | null;
  created_at: string;
  username: string | null;
  avatar_url: string | null;
};

export type MyTrackDiaryEntry = {
  id: string;
  rating: number | null;
  review_body: string | null;
  listened_at: string;
  created_at: string;
};

export type TrackStat = {
  avg_rating: number | null;
  ratings_count: number;
  reviews_count: number;
  listeners_count: number;
};

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

export async function getTrackStats(trackId: string): Promise<TrackStat | null> {
  const { data, error } = await supabase
    .from('track_stats')
    .select('avg_rating, ratings_count, reviews_count, listeners_count')
    .eq('track_id', trackId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    avg_rating: data.avg_rating ? Number(data.avg_rating) : null,
    ratings_count: data.ratings_count || 0,
    reviews_count: data.reviews_count || 0,
    listeners_count: data.listeners_count || 0,
  };
}

/** Toutes les écoutes de l'utilisateur courant pour ce titre, plus récentes d'abord. */
export async function getMyTrackDiaryEntries(trackId: string): Promise<MyTrackDiaryEntry[]> {
  const userId = await currentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('track_diary_entries')
    .select('id, rating, review_body, listened_at, created_at')
    .eq('track_id', trackId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getMyTrackDiaryEntries error:', error.message);
    return [];
  }
  return data ?? [];
}

/**
 * Crée ou met à jour une écoute — miroir de upsertTrackDiaryEntry (web). Le web n'a pas
 * de fonction "update" séparée : modifier une écoute réutilise cet upsert avec la même
 * date (onConflict user_id,track_id,listened_at), donc EditTrackDiaryEntryButton (web)
 * appelle exactement la même fonction. Délègue à l'Edge Function `log-listen` (écriture +
 * fanout feed_events, albumId/artistId résolus côté fonction depuis la DB — pas besoin
 * de les fournir ici, mais gardés dans le type d'entrée pour compat avec les appelants).
 */
export async function upsertTrackDiaryEntry(input: {
  trackId: string;
  albumId?: string;
  artistId?: string;
  listenedAt: string;
  rating: number;
  reviewBody?: string;
  source?: string;
}): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
  const { data, error } = await supabase.functions.invoke('log-listen', {
    body: {
      action: 'upsert',
      kind: 'track',
      trackId: input.trackId,
      listenedAt: input.listenedAt,
      rating: input.rating,
      reviewBody: input.reviewBody,
      source: input.source,
    },
  });

  if (error) {
    console.error('upsertTrackDiaryEntry error:', error.message);
    return { success: false, error: 'Une erreur est survenue' };
  }
  return data as { success: boolean; data?: { id: string }; error?: string };
}

export async function deleteTrackDiaryEntry(entryId: string): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke('log-listen', {
    body: { action: 'delete', kind: 'track', entryId },
  });

  if (error) {
    console.error('deleteTrackDiaryEntry error:', error.message);
    return { success: false, error: 'Une erreur est survenue' };
  }
  return data as { success: boolean; error?: string };
}

export async function getTrackReviewsPreview(trackId: string, limit = 3): Promise<TrackReview[]> {
  const { data: rows, error } = await supabase
    .from('track_diary_entries')
    .select('id, user_id, rating, review_body, created_at')
    .eq('track_id', trackId)
    .not('review_body', 'is', null)
    .neq('review_body', '')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !rows) {
    console.error('getTrackReviewsPreview error:', error?.message);
    return [];
  }
  return attachProfiles(rows);
}

export type TrackReviewsTab = 'all' | 'friends' | 'my';

export async function getTrackReviewsPage(input: {
  trackId: string;
  tab: TrackReviewsTab;
  offset?: number;
  limit?: number;
  orderBy?: 'recent' | 'top';
}): Promise<{ items: TrackReview[]; hasMore: boolean; userId: string | null; hasFollowing: boolean }> {
  const { trackId, tab, offset = 0, limit = 12, orderBy = 'recent' } = input;
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
    .from('track_diary_entries')
    .select('id, user_id, rating, review_body, created_at')
    .eq('track_id', trackId)
    .not('review_body', 'is', null)
    .neq('review_body', '');

  query = orderBy === 'top'
    ? query.order('rating', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false })
    : query.order('created_at', { ascending: false });

  if (tab === 'my' && userId) query = query.eq('user_id', userId);
  else if (tab === 'friends' && hasFollowing) query = query.in('user_id', followingIds);

  const { data: rows, error } = await query.range(offset, offset + limit);

  if (error || !rows) {
    console.error('getTrackReviewsPage error:', error?.message);
    return { items: [], hasMore: false, userId, hasFollowing };
  }

  const hasMore = rows.length > limit;
  const sliced = rows.slice(0, limit);

  return { items: await attachProfiles(sliced), hasMore, userId, hasFollowing };
}

async function attachProfiles(
  rows: Array<{ id: string; user_id: string; rating: number | null; review_body: string | null; created_at: string }>
): Promise<TrackReview[]> {
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

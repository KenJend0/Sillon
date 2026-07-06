import { supabase } from './supabase';
import { parseFeaturedRows, type FeaturedCredit } from './creditedArtists';

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

export type DiaryEntryUI = {
  id: string;
  album_id: string;
  album_title: string;
  artist_id: string;
  artist_name: string;
  cover_url: string | null;
  rating: number | null;
  review_body: string | null;
  listened_at: string;
  created_at: string;
  release_date: string | null;
};

export type DiarySort = 'date_listened' | 'release_date' | 'personal_rating';

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

// ============================================================================
// JOURNAL DE PROFIL (page /me et /u/[username]) — miroir de getUserDiary /
// getUserReviewsUnified (apps/web/app/actions/diary.ts). Lecture pure (RLS déjà
// filtrant : is_public si ce n'est pas le propriétaire), pas de client admin.
// ============================================================================

/** Toutes les écoutes d'un utilisateur (album), paginées — pour l'onglet Journal du profil. */
export async function getUserDiary(
  userId: string,
  offset = 0,
  limit = 50,
  sort: DiarySort = 'date_listened',
  ratingFilter?: number | null
): Promise<DiaryEntryUI[]> {
  const currentUser = await currentUserId();

  let query = supabase
    .from('diary_entries')
    .select(`
      id, album_id, rating, review_body, listened_at, created_at,
      albums ( id, title, cover_url, release_date, artist_id, artists ( id, name ) )
    `)
    .eq('user_id', userId);

  if (currentUser !== userId) query = query.eq('is_public', true);
  if (ratingFilter != null) query = query.eq('rating', ratingFilter);

  // PostgREST ne peut pas trier la table parente par une colonne d'une relation to-one
  // embarquée (release_date) : ce tri se fait donc côté JS, sur l'ensemble des entrées.
  const sortInJs = sort === 'release_date';

  if (sort === 'personal_rating') query = query.order('rating', { ascending: false, nullsFirst: false });
  else query = query.order('listened_at', { ascending: false });
  query = query.order('created_at', { ascending: false });

  const { data: rawEntries, error } = sortInJs ? await query.limit(2000) : await query.range(offset, offset + limit - 1);

  let entries = rawEntries;
  if (entries && sortInJs) {
    entries = [...entries].sort((a: any, b: any) => {
      const dA = a.albums?.release_date ? new Date(a.albums.release_date).getTime() : 0;
      const dB = b.albums?.release_date ? new Date(b.albums.release_date).getTime() : 0;
      return dB - dA;
    });
    entries = entries.slice(offset, offset + limit);
  }

  if (error || !entries) {
    console.error('getUserDiary error:', error?.message);
    return [];
  }

  return (entries as any[]).map((e) => {
    const album = e.albums;
    const artist = album?.artists;
    return {
      id: e.id,
      album_id: e.album_id,
      album_title: album?.title || 'Unknown',
      artist_id: album?.artist_id || '',
      artist_name: artist?.name || 'Unknown',
      cover_url: album?.cover_url || null,
      rating: e.rating,
      review_body: e.review_body,
      listened_at: e.listened_at,
      created_at: e.created_at,
      release_date: album?.release_date || null,
    };
  });
}

export type UnifiedReview = {
  id: string;
  type: 'album' | 'track';
  albumId: string | null;
  trackId: string | null;
  title: string;
  subtitle: string;
  cover_url: string | null;
  rating: number | null;
  review_body: string;
  listened_at: string;
  created_at: string;
  likes_count: number;
  is_liked: boolean;
  comments_count: number;
};

/** Critiques (album + titre) unifiées — pour l'onglet Critiques du profil. */
export async function getUserReviewsUnified(userId: string): Promise<UnifiedReview[]> {
  const currentUser = await currentUserId();
  const isOwner = currentUser === userId;

  let albumQuery = supabase
    .from('diary_entries')
    .select(`id, rating, review_body, listened_at, created_at, album_id, albums(id, title, cover_url, artist_id, artists(id, name))`)
    .eq('user_id', userId)
    .not('review_body', 'is', null)
    .neq('review_body', '');
  if (!isOwner) albumQuery = albumQuery.eq('is_public', true);

  let trackQuery = supabase
    .from('track_diary_entries')
    .select(`id, rating, review_body, listened_at, created_at, track_id, album_id, tracks(id, title, albums(id, title, cover_url, artist_id, artists(id, name)))`)
    .eq('user_id', userId)
    .not('review_body', 'is', null)
    .neq('review_body', '');
  if (!isOwner) trackQuery = trackQuery.eq('is_public', true);

  const [albumReviews, trackReviews] = await Promise.all([
    albumQuery.order('created_at', { ascending: false }).limit(100),
    trackQuery.order('created_at', { ascending: false }).limit(100),
  ]);

  const albumIds = (albumReviews.data ?? []).map((e: any) => e.id);
  const trackIds = (trackReviews.data ?? []).map((e: any) => e.id);

  const [albumLikes, trackLikes, albumStats, trackStats] = await Promise.all([
    currentUser && albumIds.length > 0
      ? supabase.from('diary_likes').select('entry_id').eq('user_id', currentUser).in('entry_id', albumIds)
      : Promise.resolve({ data: [] as any[] }),
    currentUser && trackIds.length > 0
      ? supabase.from('track_diary_likes').select('entry_id').eq('user_id', currentUser).in('entry_id', trackIds)
      : Promise.resolve({ data: [] as any[] }),
    albumIds.length > 0
      ? supabase.from('diary_entry_stats').select('entry_id, likes_count, comments_count').in('entry_id', albumIds)
      : Promise.resolve({ data: [] as any[] }),
    trackIds.length > 0
      ? supabase.from('track_diary_entry_stats').select('entry_id, likes_count, comments_count').in('entry_id', trackIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const albumLikedSet = new Set((albumLikes.data ?? []).map((l: any) => l.entry_id));
  const trackLikedSet = new Set((trackLikes.data ?? []).map((l: any) => l.entry_id));
  const albumStatsMap = new Map((albumStats.data ?? []).map((s: any) => [s.entry_id, s]));
  const trackStatsMap = new Map((trackStats.data ?? []).map((s: any) => [s.entry_id, s]));

  const albumItems: UnifiedReview[] = (albumReviews.data ?? []).map((e: any) => {
    const album = e.albums;
    const artist = album?.artists;
    return {
      id: e.id,
      type: 'album',
      albumId: album?.id ?? e.album_id,
      trackId: null,
      title: album?.title || 'Inconnu',
      subtitle: artist?.name || 'Inconnu',
      cover_url: album?.cover_url || null,
      rating: e.rating,
      review_body: e.review_body,
      listened_at: e.listened_at,
      created_at: e.created_at,
      likes_count: albumStatsMap.get(e.id)?.likes_count ?? 0,
      is_liked: albumLikedSet.has(e.id),
      comments_count: albumStatsMap.get(e.id)?.comments_count ?? 0,
    };
  });

  const trackItems: UnifiedReview[] = (trackReviews.data ?? []).map((e: any) => {
    const track = e.tracks;
    const album = track?.albums;
    const artist = album?.artists;
    return {
      id: e.id,
      type: 'track',
      albumId: album?.id ?? e.album_id,
      trackId: e.track_id,
      title: track?.title || 'Inconnu',
      subtitle: artist?.name || 'Inconnu',
      cover_url: album?.cover_url || null,
      rating: e.rating,
      review_body: e.review_body,
      listened_at: e.listened_at,
      created_at: e.created_at,
      likes_count: trackStatsMap.get(e.id)?.likes_count ?? 0,
      is_liked: trackLikedSet.has(e.id),
      comments_count: trackStatsMap.get(e.id)?.comments_count ?? 0,
    };
  });

  return [...albumItems, ...trackItems].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

// ============================================================================
// DIARY ENTRY DETAIL (pour /diary/[entry_id]) — miroir de la section
// "DIARY ENTRY DETAIL" de apps/web/app/actions/diary.ts. Lecture pure RLS (pas de
// client admin) : la policy select de diary_entries filtre déjà public/owner, donc pas
// besoin de re-vérifier la visibilité côté client comme le fait le web par défense en
// profondeur.
// ============================================================================

export type DiaryEntryComment = {
  id: string;
  body: string;
  created_at: string;
  parent_comment_id: string | null;
  author: { id: string; username: string; avatar_url: string | null };
  is_mine: boolean;
  replies: DiaryEntryComment[];
};

export type DiaryEntryDetail = {
  id: string;
  rating: number | null;
  review_body: string | null;
  listened_at: string;
  created_at: string;
  re_listen: boolean;
  author: { id: string; username: string; avatar_url: string | null };
  album: { id: string; title: string; cover_url: string | null; release_date: string | null };
  artist: { id: string; name: string };
  featuredArtists: FeaturedCredit[];
  stats: { likes_count: number; comments_count: number };
  has_liked: boolean;
  comments: DiaryEntryComment[];
};

export type GetDiaryEntryResult =
  | { success: true; data: DiaryEntryDetail }
  | { success: false; error: string };

async function buildEntryCommentsTree(entryId: string, currentUser: string | null): Promise<DiaryEntryComment[]> {
  const { data: commentsData, error } = await supabase
    .from('diary_comments')
    .select('id, body, created_at, user_id, parent_comment_id')
    .eq('entry_id', entryId)
    .order('created_at', { ascending: true });

  if (error || !commentsData) return [];

  const userIds = [...new Set(commentsData.map((c) => c.user_id))];
  const { data: profiles } = userIds.length > 0
    ? await supabase.from('profiles').select('id, username, avatar_url').in('id', userIds)
    : { data: [] };
  const profilesMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const allComments: DiaryEntryComment[] = commentsData.map((c) => {
    const profile = profilesMap.get(c.user_id);
    return {
      id: c.id,
      body: c.body,
      created_at: c.created_at,
      parent_comment_id: c.parent_comment_id ?? null,
      author: { id: c.user_id, username: profile?.username || 'unknown', avatar_url: profile?.avatar_url ?? null },
      is_mine: currentUser === c.user_id,
      replies: [],
    };
  });

  const commentMap = new Map(allComments.map((c) => [c.id, c]));
  const topLevel: DiaryEntryComment[] = [];
  for (const c of allComments) {
    if (c.parent_comment_id && commentMap.has(c.parent_comment_id)) {
      commentMap.get(c.parent_comment_id)!.replies.push(c);
    } else {
      topLevel.push(c);
    }
  }
  return topLevel;
}

/** Commentaires d'une écoute (pour rafraîchir après ajout/suppression) — miroir de getEntryComments (web). */
export async function getEntryComments(entryId: string): Promise<DiaryEntryComment[]> {
  const currentUser = await currentUserId();
  return buildEntryCommentsTree(entryId, currentUser);
}

/** Détail complet d'une écoute — miroir de getDiaryEntry (web), pour /diary/[entry_id]. */
export async function getDiaryEntry(entryId: string): Promise<GetDiaryEntryResult> {
  const currentUser = await currentUserId();

  const { data: entry, error } = await supabase
    .from('diary_entries')
    .select(`
      id, rating, review_body, listened_at, created_at, re_listen, user_id,
      albums (
        id, title, cover_url, release_date,
        artists ( id, name ),
        album_featured_artists ( position, joinphrase, artists ( id, name ) )
      )
    `)
    .eq('id', entryId)
    .maybeSingle();

  if (error || !entry) return { success: false, error: 'Entrée introuvable' };

  const album = (entry as any).albums;
  const artist = album?.artists;

  const [{ data: authorProfile }, { data: statsData }, likeRes, comments] = await Promise.all([
    supabase.from('profiles').select('id, username, avatar_url').eq('id', entry.user_id).maybeSingle(),
    supabase.from('diary_entry_stats').select('likes_count, comments_count').eq('entry_id', entryId).maybeSingle(),
    currentUser
      ? supabase.from('diary_likes').select('user_id').eq('entry_id', entryId).eq('user_id', currentUser).maybeSingle()
      : Promise.resolve({ data: null }),
    buildEntryCommentsTree(entryId, currentUser),
  ]);

  if (!authorProfile) return { success: false, error: 'Auteur introuvable' };

  return {
    success: true,
    data: {
      id: entry.id,
      rating: entry.rating,
      review_body: entry.review_body,
      listened_at: entry.listened_at,
      created_at: entry.created_at,
      re_listen: entry.re_listen,
      author: { id: authorProfile.id, username: authorProfile.username || 'unknown', avatar_url: authorProfile.avatar_url ?? null },
      album: {
        id: album?.id || '',
        title: album?.title || 'Album inconnu',
        cover_url: album?.cover_url ?? null,
        release_date: album?.release_date ?? null,
      },
      artist: { id: artist?.id || '', name: artist?.name || 'Artiste inconnu' },
      featuredArtists: parseFeaturedRows(album?.album_featured_artists ?? null),
      stats: { likes_count: statsData?.likes_count ?? 0, comments_count: statsData?.comments_count ?? 0 },
      has_liked: !!likeRes.data,
      comments,
    },
  };
}

export type DiaryLikeUser = { id: string; username: string; avatar_url: string | null };

/** Utilisateurs ayant aimé une écoute — miroir de getEntryLikes (web). */
export async function getEntryLikes(entryId: string): Promise<DiaryLikeUser[]> {
  const { data: likes, error } = await supabase
    .from('diary_likes')
    .select('user_id')
    .eq('entry_id', entryId)
    .order('created_at', { ascending: false });

  if (error || !likes || likes.length === 0) return [];

  const userIds = likes.map((l) => l.user_id);
  const { data: profiles } = await supabase.from('profiles').select('id, username, avatar_url').in('id', userIds);
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return userIds
    .map((id) => profileMap.get(id))
    .filter((p): p is NonNullable<typeof p> => p != null)
    .map((p) => ({ id: p.id, username: p.username || 'unknown', avatar_url: p.avatar_url ?? null }));
}

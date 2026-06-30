'use server';

import { createSupabaseServer, getAuthUser } from '@/lib/supabase/server';

export async function exportUserData() {
  const user = await getAuthUser();
  if (!user) {
    return { success: false as const, error: 'Not authenticated' };
  }

  const supabase = await createSupabaseServer();

  const [
    profile,
    diaryEntries,
    trackDiaryEntries,
    diaryComments,
    diaryLikes,
    following,
    followers,
    favoriteAlbums,
    lists,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('diary_entries').select('*').eq('user_id', user.id),
    supabase.from('track_diary_entries').select('*').eq('user_id', user.id),
    supabase.from('diary_comments').select('*').eq('user_id', user.id),
    supabase.from('diary_likes').select('*').eq('user_id', user.id),
    supabase.from('follows').select('followee_id, created_at').eq('follower_id', user.id),
    supabase.from('follows').select('follower_id, created_at').eq('followee_id', user.id),
    supabase.from('user_favorite_albums').select('*').eq('user_id', user.id),
    supabase.from('user_lists').select('*, list_items(*)').eq('user_id', user.id),
  ]);

  return {
    success: true as const,
    data: {
      exported_at: new Date().toISOString(),
      profile: profile.data,
      diary_entries: diaryEntries.data ?? [],
      track_diary_entries: trackDiaryEntries.data ?? [],
      diary_comments: diaryComments.data ?? [],
      diary_likes: diaryLikes.data ?? [],
      following: following.data ?? [],
      followers: followers.data ?? [],
      favorite_albums: favoriteAlbums.data ?? [],
      lists: lists.data ?? [],
    },
  };
}

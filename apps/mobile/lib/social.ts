import { supabase } from './supabase';

/**
 * Follow/Block — miroir de apps/web/app/actions/social.ts + followers.ts + following.ts.
 *
 * `toggleFollow` délègue à l'Edge Function `toggle-follow` (supabase/functions/toggle-follow) :
 * le web écrit le fanout feed_events (+ backfill des écoutes récentes du suivi) via le client
 * service_role, qui ne doit jamais être embarqué côté mobile — même pattern que `toggle-like`
 * et `log-listen` (Phase 8).
 *
 * `toggleBlock` reste un appel RLS direct (insert/delete sur `user_blocks` + `follows`, permis
 * par les policies existantes, comme côté web). Mode dégradé volontaire : le web nettoie aussi
 * les `feed_events` de l'utilisateur bloqué via le client admin — ce nettoyage est ignoré ici
 * (pas d'accès service_role côté mobile) sans conséquence visible, puisque `getMyFeed`
 * (lib/feed.ts) filtre déjà les acteurs bloqués côté lecture.
 */

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

export async function toggleFollow(idOrUsername: string): Promise<{ success: boolean; following?: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke('toggle-follow', {
    body: { idOrUsername },
  });

  if (error) {
    console.error('toggleFollow error:', error.message);
    return { success: false, error: 'Impossible de mettre à jour l\'abonnement' };
  }
  const result = data as { following?: boolean; error?: string };
  if (result.error) return { success: false, error: result.error };
  return { success: true, following: result.following };
}

export async function toggleBlock(userId: string): Promise<{ success: boolean; blocking?: boolean; error?: string }> {
  const myId = await currentUserId();
  if (!myId) return { success: false, error: 'Not authenticated' };
  if (userId === myId) return { success: false, error: 'Cannot block yourself' };

  const { data: existing } = await supabase
    .from('user_blocks')
    .select('blocked_id')
    .eq('blocker_id', myId)
    .eq('blocked_id', userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from('user_blocks').delete().eq('blocker_id', myId).eq('blocked_id', userId);
    if (error) return { success: false, error: 'Une erreur est survenue' };
    return { success: true, blocking: false };
  }

  const { error: blockError } = await supabase.from('user_blocks').insert({ blocker_id: myId, blocked_id: userId });
  if (blockError) return { success: false, error: 'Une erreur est survenue' };

  await supabase
    .from('follows')
    .delete()
    .or(`and(follower_id.eq.${myId},followee_id.eq.${userId}),and(follower_id.eq.${userId},followee_id.eq.${myId})`);

  return { success: true, blocking: true };
}

export type SocialUser = {
  id: string;
  username: string;
  pictureUrl?: string | null;
  isFollowing: boolean;
  isMe: boolean;
};

async function attachFollowState(profiles: Array<{ id: string; username: string | null; avatar_url: string | null }>): Promise<SocialUser[]> {
  const currentUser = await currentUserId();
  let followingIds = new Set<string>();

  if (currentUser && profiles.length > 0) {
    const { data: following } = await supabase
      .from('follows')
      .select('followee_id')
      .eq('follower_id', currentUser)
      .in('followee_id', profiles.map((p) => p.id));
    followingIds = new Set((following ?? []).map((f) => f.followee_id));
  }

  return profiles.map((p) => ({
    id: p.id,
    username: p.username ?? '',
    pictureUrl: p.avatar_url,
    isFollowing: followingIds.has(p.id),
    isMe: currentUser === p.id,
  }));
}

export async function getFollowersList(username: string): Promise<{ success: boolean; items?: SocialUser[]; error?: string }> {
  const { data: profile } = await supabase.from('profiles').select('id').eq('username', username).maybeSingle();
  if (!profile) return { success: false, error: 'User not found' };

  const { data: follows } = await supabase.from('follows').select('follower_id').eq('followee_id', profile.id).limit(500);
  const followerIds = (follows ?? []).map((f) => f.follower_id);
  if (followerIds.length === 0) return { success: true, items: [] };

  const { data: profiles } = await supabase.from('profiles').select('id, username, avatar_url').in('id', followerIds);
  return { success: true, items: await attachFollowState(profiles ?? []) };
}

export async function getFollowingList(username: string): Promise<{ success: boolean; items?: SocialUser[]; error?: string }> {
  const { data: profile } = await supabase.from('profiles').select('id').eq('username', username).maybeSingle();
  if (!profile) return { success: false, error: 'User not found' };

  const { data: follows } = await supabase.from('follows').select('followee_id').eq('follower_id', profile.id).limit(2000);
  const followeeIds = (follows ?? []).map((f) => f.followee_id);
  if (followeeIds.length === 0) return { success: true, items: [] };

  const { data: profiles } = await supabase.from('profiles').select('id, username, avatar_url').in('id', followeeIds);
  return { success: true, items: await attachFollowState(profiles ?? []) };
}

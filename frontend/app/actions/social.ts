'use server';

import { getAuthUser, createSupabaseServer, createSupabaseAdmin } from '@/lib/supabase/server';
import { fanoutEvent } from './feed';
import { ensureProfile } from './profile';

/**
 * Toggle follow: insert if not exists, delete if exists
 * Resolve idOrUsername to profile.id
 * Prevent self-follow
 */
export async function toggleFollow(idOrUsername: string) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Ensure current user's profile exists
    await ensureProfile();

    const supabase = await createSupabaseServer();

    // Resolve username/id to profile id
    let targetId: string;

    // Detect UUIDs with a regex instead of brittle length/startsWith heuristics.
    // Supabase UUIDs follow the standard 8-4-4-4-12 hex format.
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(idOrUsername)) {
      targetId = idOrUsername;
    } else {
      // Resolve by username
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', idOrUsername)
        .single();

      if (profileError || !profile) {
        return { success: false, error: 'User not found' };
      }

      targetId = profile.id;
    }

    // Prevent self-follow
    if (targetId === user.id) {
      return { success: false, error: 'Cannot follow yourself' };
    }

    // Check if already following
    const { data: existing } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('followee_id', targetId)
      .single();

    const supabaseAdmin = createSupabaseAdmin();

    if (existing) {
      // Unfollow
      const { error: deleteError } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('followee_id', targetId);

      if (deleteError) {
        return { success: false, error: deleteError.message };
      }

      // Clean up all follow feed events for this pair (actor + followee)
      await supabaseAdmin
        .from('feed_events')
        .delete()
        .eq('type', 'follow')
        .eq('actor_id', user.id)
        .eq('followee_id', targetId);

      return { success: true, following: false };
    } else {
      // Follow
      const { error: insertError } = await supabase
        .from('follows')
        .insert({
          follower_id: user.id,
          followee_id: targetId,
        });

      if (insertError) {
        return { success: false, error: insertError.message };
      }

      // Remove any stale follow events for this pair before inserting fresh ones
      await supabaseAdmin
        .from('feed_events')
        .delete()
        .eq('type', 'follow')
        .eq('actor_id', user.id)
        .eq('followee_id', targetId);

      // Fanout
      try {
        await fanoutEvent('follow', { followerId: user.id, followeeId: targetId }, [
          targetId,
        ]);
      } catch (fanoutErr) {
        console.error('Fanout follow error:', fanoutErr);
      }

      return { success: true, following: true };
    }
  } catch (err) {
    console.error('toggleFollow error:', err);
    return { success: false, error: 'An error occurred' };
  }
}

// Ajouter un commentaire

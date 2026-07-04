import { supabase } from './supabase';

/**
 * Listes — sous-ensemble minimal de apps/web/app/actions/lists.ts, juste ce dont la
 * page album a besoin (bouton "Ajouter à une liste" + "Apparaît dans X listes").
 * La feature Listes complète (créer/réordonner/couvertures) reste Phase 7.
 */

export type UserListSummary = {
  id: string;
  title: string;
  is_default: boolean;
};

export type PublicListPreview = {
  id: string;
  title: string;
  creator_username: string;
};

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/** Toutes les listes de l'utilisateur courant (titre + id seulement). */
export async function getUserLists(): Promise<UserListSummary[]> {
  const userId = await currentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('user_lists')
    .select('id, title, is_default')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('getUserLists error:', error.message);
    return [];
  }
  return data ?? [];
}

/** IDs des listes de l'utilisateur courant contenant cet album. */
export async function getUserListsContaining(albumId: string): Promise<string[]> {
  const userId = await currentUserId();
  if (!userId) return [];

  const { data: lists } = await supabase.from('user_lists').select('id').eq('user_id', userId);
  if (!lists || lists.length === 0) return [];

  const { data: items } = await supabase
    .from('list_items')
    .select('list_id')
    .eq('album_id', albumId)
    .in('list_id', lists.map((l) => l.id));

  return (items ?? []).map((i) => i.list_id);
}

/** Listes publiques contenant cet album — pour "Apparaît dans X listes". */
export async function getPublicListsContaining(albumId: string, limit = 5): Promise<PublicListPreview[]> {
  const { data: items, error } = await supabase
    .from('list_items')
    .select('list_id, user_lists!inner(id, title, is_public, profiles(username))')
    .eq('album_id', albumId)
    .eq('user_lists.is_public', true)
    .limit(limit);

  if (error || !items) {
    console.error('getPublicListsContaining error:', error?.message);
    return [];
  }

  return (items as any[]).map((item) => ({
    id: item.user_lists.id,
    title: item.user_lists.title,
    creator_username: item.user_lists.profiles?.username ?? '',
  }));
}

/** Crée ou retrouve la liste "À écouter" par défaut de l'utilisateur. */
export async function getOrCreateDefaultList(): Promise<string> {
  const userId = await currentUserId();
  if (!userId) throw new Error('Not authenticated');

  const { data: existing } = await supabase
    .from('user_lists')
    .select('id')
    .eq('user_id', userId)
    .eq('is_default', true)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from('user_lists')
    .insert({ user_id: userId, title: 'À écouter', is_public: false, is_default: true })
    .select('id')
    .single();

  if (error?.code === '23505') {
    const { data: retry } = await supabase
      .from('user_lists')
      .select('id')
      .eq('user_id', userId)
      .eq('is_default', true)
      .maybeSingle();
    if (retry) return retry.id;
  }
  if (error || !created) throw error ?? new Error('Default list creation failed');
  return created.id;
}

/** Ajoute ou retire un album d'une liste (toggle). */
export async function toggleListItem(listId: string, albumId: string): Promise<{ added: boolean }> {
  const userId = await currentUserId();
  if (!userId) throw new Error('Not authenticated');

  const { data: list } = await supabase.from('user_lists').select('id').eq('id', listId).eq('user_id', userId).maybeSingle();
  if (!list) throw new Error('List not found');

  const { data: existing } = await supabase
    .from('list_items')
    .select('id')
    .eq('list_id', listId)
    .eq('album_id', albumId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from('list_items').delete().eq('id', existing.id);
    if (error) throw new Error('Une erreur est survenue');
    return { added: false };
  }

  const { error } = await supabase.from('list_items').insert({ list_id: listId, album_id: albumId });
  if (error) throw new Error('Une erreur est survenue');
  return { added: true };
}

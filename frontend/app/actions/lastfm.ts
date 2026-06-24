'use server';

import { getAuthUser, createSupabaseAdmin } from '@/lib/supabase/server';
import { createList } from './lists';
import type { RawExternalItem } from '@/lib/externalImport';

const LASTFM_API = 'https://ws.audioscrobbler.com/2.0';
const COOLDOWN_HOURS = 24;

async function lastfmRequest(params: Record<string, string>): Promise<any> {
  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) throw new Error('Last.fm non configuré');

  const search = new URLSearchParams({ ...params, api_key: apiKey, format: 'json' });
  const res = await fetch(`${LASTFM_API}/?${search}`, { signal: AbortSignal.timeout(8_000) });
  const data = await res.json();
  if (data.error) {
    throw new Error(data.message || 'Erreur Last.fm');
  }
  return data;
}

export async function startLastfmImport(username: string) {
  const user = await getAuthUser();
  if (!user) return { success: false as const, error: 'Not authenticated' };

  const trimmed = username.trim();
  if (!trimmed) return { success: false as const, error: 'Pseudo Last.fm requis' };

  // `external_imports` n'est pas encore dans les types générés (migration récente) — cast en any.
  const admin = createSupabaseAdmin() as any;

  const cutoff = new Date(Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from('external_imports')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('source', 'lastfm')
    .gte('created_at', cutoff);

  if ((count || 0) > 0) {
    return {
      success: false as const,
      error: `Tu as déjà lancé un import Last.fm dans les dernières ${COOLDOWN_HOURS}h. Réessaie plus tard.`,
    };
  }

  try {
    await lastfmRequest({ method: 'user.getInfo', user: trimmed });
  } catch {
    return { success: false as const, error: 'Pseudo Last.fm introuvable.' };
  }

  let topAlbums: RawExternalItem[];
  try {
    const data = await lastfmRequest({
      method: 'user.gettopalbums',
      user: trimmed,
      period: 'overall',
      limit: '100',
    });
    const albums = data?.topalbums?.album;
    const list: any[] = Array.isArray(albums) ? albums : albums ? [albums] : [];
    topAlbums = list
      .map((a) => ({
        artist: a.artist?.name || '',
        album: a.name || '',
        mbid: a.mbid || null,
      }))
      .filter((a) => a.artist && a.album);
  } catch {
    return {
      success: false as const,
      error: 'Impossible de récupérer ton historique — vérifie que ton profil Last.fm est public.',
    };
  }

  if (topAlbums.length === 0) {
    return { success: false as const, error: 'Aucun album trouvé sur ce profil Last.fm.' };
  }

  const list = await createList({ title: 'Import Last.fm', isPublic: false });

  const { data: importRow, error } = await admin
    .from('external_imports')
    .insert({
      user_id: user.id,
      source: 'lastfm',
      source_label: trimmed,
      status: 'matching',
      raw_items: topAlbums,
      total_items: topAlbums.length,
      list_id: list.id,
    })
    .select('id')
    .single();

  if (error || !importRow) {
    return { success: false as const, error: "Erreur lors de la création de l'import" };
  }

  return { success: true as const, importId: importRow.id, listId: list.id, total: topAlbums.length };
}

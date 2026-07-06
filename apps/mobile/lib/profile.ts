import { supabase } from './supabase';

/**
 * Profil utilisateur — miroir des parties lecture-seule / RLS-only de
 * apps/web/app/actions/profile.ts. Le reste de ce fichier web (settings, changement de
 * username, suppression de compte) touche à des flux Settings (Phase 7) ou utilise le
 * client admin (deleteAccount) — hors scope ici.
 */

export type Profile = {
  id: string;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
};

/** Crée le profil par défaut si première connexion (username = 8 premiers caractères de l'UUID). */
export async function ensureProfile(): Promise<Profile | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return null;

  const { data: existing } = await supabase
    .from('profiles')
    .select('id, username, bio, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  if (existing) return existing;

  const defaultUsername = user.id.substring(0, 8);
  await supabase.from('profiles').upsert({ id: user.id, username: defaultUsername }, { onConflict: 'id', ignoreDuplicates: true });

  const { data: created } = await supabase
    .from('profiles')
    .select('id, username, bio, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  return created ?? null;
}

function dayKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Streak de jours consécutifs avec au moins une entrée de journal (album ou titre) —
 * lecture pure, bornée à 365 jours en arrière, miroir exact de getCurrentStreak (web).
 */
export async function getCurrentStreak(userId: string): Promise<{ ok: boolean; streakDays: number; isActiveToday: boolean }> {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 365);

    const [{ data: albumDays }, { data: trackDays }] = await Promise.all([
      supabase.from('diary_entries').select('listened_at').eq('user_id', userId).gte('listened_at', since.toISOString()),
      supabase.from('track_diary_entries').select('listened_at').eq('user_id', userId).gte('listened_at', since.toISOString()),
    ]);

    const activeDays = new Set<string>();
    for (const row of albumDays ?? []) activeDays.add(dayKey(row.listened_at));
    for (const row of (trackDays ?? []) as Array<{ listened_at: string }>) activeDays.add(dayKey(row.listened_at));

    const today = new Date();
    const isActiveToday = activeDays.has(dayKey(today.toISOString()));

    const cursor = new Date(today);
    if (!isActiveToday) cursor.setDate(cursor.getDate() - 1);

    let streakDays = 0;
    while (activeDays.has(dayKey(cursor.toISOString()))) {
      streakDays += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return { ok: true, streakDays, isActiveToday };
  } catch (err) {
    console.error('getCurrentStreak error:', err);
    return { ok: false, streakDays: 0, isActiveToday: false };
  }
}

export type FavoriteAlbum = {
  id: string;
  title: string;
  artist_name: string;
  cover_url: string | null;
  position: number;
};

/** Top 3 albums favoris — lecture seule (édition/réordonnancement = Phase 7 Settings). */
export async function getFavoriteAlbums(userId: string): Promise<FavoriteAlbum[]> {
  const { data } = await supabase
    .from('user_favorite_albums')
    .select('position, album_id, albums (id, title, cover_url, artists (name))')
    .eq('user_id', userId)
    .order('position', { ascending: true })
    .limit(3);

  return (data ?? []).map((item: any) => ({
    id: item.albums?.id || item.album_id,
    title: item.albums?.title || 'Album inconnu',
    artist_name: item.albums?.artists?.name || 'Artiste inconnu',
    cover_url: item.albums?.cover_url ?? null,
    position: item.position,
  }));
}

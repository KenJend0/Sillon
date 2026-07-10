import { supabase } from './supabase';
import { findBannedUsernameWord } from './bannedWords';

/**
 * Profil utilisateur — miroir des parties lecture-seule / RLS-only de
 * apps/web/app/actions/profile.ts. `deleteAccount` utilise le client admin
 * (nettoyage Storage + RPC delete_user_account) — hors scope ici, voir
 * docs/MOBILE_ROADMAP.md (Éditer profil) pour la décision de report.
 */

const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{3,32}$/;

export type ProfileSettings = {
  id: string;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  username_changed: boolean | null;
  email: string;
};

export async function getMyProfileSettings(): Promise<{ ok: boolean; profile?: ProfileSettings; error?: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return { ok: false, error: 'not_authenticated' };

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, bio, avatar_url, username_changed')
    .eq('id', user.id)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    return { ok: false, error: 'An error occurred' };
  }

  return {
    ok: true,
    profile: {
      id: data?.id || user.id,
      username: data?.username ?? null,
      bio: data?.bio ?? null,
      avatar_url: data?.avatar_url ?? null,
      username_changed: data?.username_changed ?? null,
      email: user.email || '',
    },
  };
}

export async function updateProfileSettings(input: { bio?: string | null }): Promise<{ ok: boolean; error?: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return { ok: false, error: 'not_authenticated' };

  const bio = input.bio ?? null;
  if (bio && bio.length > 500) return { ok: false, error: 'bio_too_long' };

  const { error } = await supabase.from('profiles').update({ bio }).eq('id', user.id);
  if (error) return { ok: false, error: 'An error occurred' };

  return { ok: true };
}

export async function checkUsernameAvailability(username: string): Promise<{ ok: boolean; available?: boolean; error?: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return { ok: false, error: 'not_authenticated' };

  if (!USERNAME_REGEX.test(username)) return { ok: true, available: false, error: 'invalid_username' };
  if (findBannedUsernameWord(username)) return { ok: true, available: false, error: 'username_banned' };

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .neq('id', user.id)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') return { ok: false, error: 'An error occurred' };

  return { ok: true, available: !data };
}

export async function changeUsername(newUsername: string): Promise<{ ok: boolean; username?: string; error?: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return { ok: false, error: 'not_authenticated' };

  const trimmed = newUsername.trim();
  if (!USERNAME_REGEX.test(trimmed)) return { ok: false, error: 'invalid_username' };
  if (findBannedUsernameWord(trimmed)) return { ok: false, error: 'Ce pseudo contient du contenu inapproprié.' };

  const { data: current, error: currentError } = await supabase
    .from('profiles')
    .select('username, username_changed')
    .eq('id', user.id)
    .maybeSingle();

  if (currentError && currentError.code !== 'PGRST116') return { ok: false, error: 'An error occurred' };
  if (current?.username_changed) return { ok: false, error: 'username_change_already_used' };
  if (current?.username && current.username === trimmed) return { ok: false, error: 'username_same' };

  const { data: existing, error: existingError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', trimmed)
    .neq('id', user.id)
    .maybeSingle();

  if (existingError && existingError.code !== 'PGRST116') return { ok: false, error: 'An error occurred' };
  if (existing) return { ok: false, error: 'username_taken' };

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ username: trimmed, username_changed: true })
    .eq('id', user.id);

  if (updateError) return { ok: false, error: 'An error occurred' };

  return { ok: true, username: trimmed };
}

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
  mbid: string | null;
  position: number;
};

/** Top 3 albums favoris — lecture seule (édition/réordonnancement = Phase 7 Settings). */
export async function getFavoriteAlbums(userId: string): Promise<FavoriteAlbum[]> {
  const { data } = await supabase
    .from('user_favorite_albums')
    .select('position, album_id, albums (id, title, cover_url, mbid, artists (name))')
    .eq('user_id', userId)
    .order('position', { ascending: true })
    .limit(3);

  return (data ?? []).map((item: any) => ({
    id: item.albums?.id || item.album_id,
    title: item.albums?.title || 'Album inconnu',
    artist_name: item.albums?.artists?.name || 'Artiste inconnu',
    cover_url: item.albums?.cover_url ?? null,
    mbid: item.albums?.mbid ?? null,
    position: item.position,
  }));
}

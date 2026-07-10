// Supabase Edge Function: log-listen
//
// Crée/modifie/supprime une écoute (diary_entries ou track_diary_entries) ET fait le
// fanout dans feed_events — miroir server-side de upsertDiaryEntry/deleteDiaryEntry
// (apps/web/app/actions/diary.ts) et upsertTrackDiaryEntry/deleteTrackDiaryEntry
// (apps/web/app/actions/track-diary.ts), pour que le mobile bénéficie du même fanout
// que le web sans embarquer la clé service_role côté client (même pattern que toggle-like).
//
// Déploiement : supabase functions deploy log-listen
// Requiert les secrets par défaut fournis par la plateforme (SUPABASE_URL, SUPABASE_ANON_KEY,
// SUPABASE_SERVICE_ROLE_KEY) — pas de config manuelle nécessaire.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';
import { parseDiaryRating, parseListenedAt, diaryValidationMessage } from '../_shared/diaryInputValidation.ts';
import { findBannedContentWord } from '../_shared/bannedWords.ts';

type Kind = 'album' | 'track';
type Action = 'upsert' | 'delete';

type Body = {
  action: Action;
  kind: Kind;
  // upsert
  albumId?: string;
  trackId?: string;
  listenedAt?: string;
  rating?: number | null;
  reviewBody?: string;
  relisten?: boolean;
  source?: string;
  // delete
  entryId?: string;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ success: false, error: 'Not authenticated' }, 401);

  const supabaseUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await supabaseUser.auth.getUser();
  if (!user) return json({ success: false, error: 'Not authenticated' }, 401);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: 'Invalid body' }, 400);
  }

  if (body.kind !== 'album' && body.kind !== 'track') return json({ success: false, error: 'Invalid kind' }, 400);

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  if (body.action === 'delete') {
    return handleDelete(supabaseUser, supabaseAdmin, user.id, body);
  }
  if (body.action === 'upsert') {
    return body.kind === 'album'
      ? handleUpsertAlbum(supabaseUser, supabaseAdmin, user.id, body)
      : handleUpsertTrack(supabaseUser, supabaseAdmin, user.id, body);
  }
  return json({ success: false, error: 'Invalid action' }, 400);
});

// deno-lint-ignore no-explicit-any
async function handleDelete(supabaseUser: any, supabaseAdmin: any, userId: string, body: Body) {
  if (!body.entryId) return json({ success: false, error: 'Missing entryId' }, 400);

  const table = body.kind === 'album' ? 'diary_entries' : 'track_diary_entries';
  const { data: entry, error: fetchError } = await supabaseUser
    .from(table)
    .select('user_id')
    .eq('id', body.entryId)
    .maybeSingle();

  if (fetchError || !entry) return json({ success: false, error: 'Entry not found' }, 404);
  if (entry.user_id !== userId) return json({ success: false, error: 'Forbidden' }, 403);

  // Purge des feed_events liés — pas de FK/cascade depuis feed_events, doit passer par le
  // client admin (RLS n'autoriserait la suppression que pour le feed propre de l'acteur).
  if (body.kind === 'album') {
    await supabaseAdmin.from('feed_events').delete().eq('entry_id', body.entryId);
  } else {
    await supabaseAdmin
      .from('feed_events')
      .delete()
      .in('type', ['track_diary_entry', 'track_like', 'track_comment'])
      .eq('payload->>trackEntryId', body.entryId);
  }

  const { error: deleteError } = await supabaseUser.from(table).delete().eq('id', body.entryId);
  if (deleteError) return json({ success: false, error: 'An error occurred' }, 500);

  return json({ success: true });
}

// deno-lint-ignore no-explicit-any
async function handleUpsertAlbum(supabaseUser: any, supabaseAdmin: any, userId: string, body: Body) {
  if (!body.albumId || !body.listenedAt) {
    return json({ success: false, error: 'albumId and listenedAt required' }, 400);
  }

  let listenedAt: string;
  let rating: number | null;
  try {
    listenedAt = parseListenedAt(body.listenedAt);
    rating = parseDiaryRating(body.rating);
  } catch (validationError) {
    return json({ success: false, error: diaryValidationMessage(validationError) }, 400);
  }

  if (body.reviewBody && body.reviewBody.length > 5000) {
    return json({ success: false, error: 'Review body too long — max 5000 characters' }, 400);
  }
  if (body.reviewBody && findBannedContentWord(body.reviewBody)) {
    return json({ success: false, error: 'Cette critique contient du contenu inapproprié.' }, 400);
  }

  const { data: album, error: albumError } = await supabaseUser
    .from('albums')
    .select('id')
    .eq('id', body.albumId)
    .maybeSingle();
  if (albumError || !album) return json({ success: false, error: 'Album introuvable' }, 404);

  const entryPayload = {
    user_id: userId,
    album_id: body.albumId,
    listened_at: listenedAt,
    review_body: body.reviewBody || null,
    rating,
    re_listen: body.relisten ?? false,
    is_public: true,
    rec_source: body.source ?? null,
  };

  let data: { id: string };
  if (body.relisten) {
    const { data: inserted, error } = await supabaseUser.from('diary_entries').insert(entryPayload).select('id').single();
    if (error) {
      if (error.code === '23505') {
        return json({ success: false, error: 'Vous avez déjà une écoute à cette date. Choisissez une autre date.' }, 409);
      }
      return json({ success: false, error: 'An error occurred' }, 500);
    }
    data = inserted;
  } else {
    const { data: upserted, error } = await supabaseUser
      .from('diary_entries')
      .upsert(entryPayload, { onConflict: 'user_id,album_id,listened_at' })
      .select('id')
      .single();
    if (error) return json({ success: false, error: 'An error occurred' }, 500);
    data = upserted;
  }

  try {
    await supabaseAdmin.from('feed_events').delete().eq('type', 'diary_entry').eq('entry_id', data.id);

    const targets = await followersPlusActor(supabaseUser, userId);
    const events = targets.map((recipientId) => ({
      user_id: recipientId,
      actor_id: userId,
      type: 'diary_entry',
      entry_id: data.id,
      album_id: body.albumId,
      payload: { entryId: data.id, albumId: body.albumId, userId },
    }));
    if (events.length > 0) await supabaseAdmin.from('feed_events').insert(events);
  } catch (fanoutErr) {
    console.error('log-listen album fanout error:', fanoutErr);
  }

  return json({ success: true, data });
}

// deno-lint-ignore no-explicit-any
async function handleUpsertTrack(supabaseUser: any, supabaseAdmin: any, userId: string, body: Body) {
  if (!body.trackId || !body.listenedAt) {
    return json({ success: false, error: 'trackId et listenedAt sont requis' }, 400);
  }

  let listenedAt: string;
  let rating: number | null;
  try {
    listenedAt = parseListenedAt(body.listenedAt);
    rating = parseDiaryRating(body.rating);
  } catch (validationError) {
    return json({ success: false, error: diaryValidationMessage(validationError) }, 400);
  }

  if (body.reviewBody && body.reviewBody.length > 5000) {
    return json({ success: false, error: 'Critique trop longue — max 5000 caractères' }, 400);
  }
  if (body.reviewBody && findBannedContentWord(body.reviewBody)) {
    return json({ success: false, error: 'Cette critique contient du contenu inapproprié.' }, 400);
  }

  // Résout album_id/artist_id depuis la DB plutôt que de faire confiance au client — miroir web.
  const { data: trackRow, error: trackError } = await supabaseUser
    .from('tracks')
    .select('id, title, album_id, artist_id, albums(id, title, cover_url, artist_id, artists(id, name))')
    .eq('id', body.trackId)
    .maybeSingle();
  if (trackError || !trackRow) return json({ success: false, error: 'Titre introuvable' }, 404);

  const album = (trackRow as { albums?: { id: string; title: string; cover_url: string | null; artist_id?: string; artists?: { id: string; name: string } | null } | null }).albums ?? null;
  const albumId = (trackRow as { album_id?: string }).album_id ?? album?.id ?? null;
  const artistId = (trackRow as { artist_id?: string }).artist_id ?? album?.artist_id ?? album?.artists?.id ?? null;
  if (!albumId || !artistId) return json({ success: false, error: 'Titre incomplet' }, 400);

  const entryPayload = {
    user_id: userId,
    track_id: body.trackId,
    album_id: albumId,
    artist_id: artistId,
    listened_at: listenedAt,
    rating,
    review_body: body.reviewBody || null,
    is_public: true,
    rec_source: body.source ?? null,
  };

  const { data, error } = await supabaseUser
    .from('track_diary_entries')
    .upsert(entryPayload, { onConflict: 'user_id,track_id,listened_at' })
    .select('id')
    .single();
  if (error) return json({ success: false, error: 'Une erreur est survenue' }, 500);

  try {
    await supabaseAdmin
      .from('feed_events')
      .delete()
      .eq('type', 'track_diary_entry')
      .eq('actor_id', userId)
      .eq('payload->>trackEntryId', data.id);

    const targets = await followersPlusActor(supabaseUser, userId);
    const artist = album?.artists;
    const payload = {
      userId,
      albumId,
      trackEntryId: data.id,
      trackId: body.trackId,
      trackTitle: (trackRow as { title?: string }).title || '',
      albumTitle: album?.title || '',
      coverUrl: album?.cover_url || null,
      artistName: artist?.name || '',
      rating,
      reviewBody: body.reviewBody || null,
    };
    const events = targets.map((recipientId) => ({
      user_id: recipientId,
      actor_id: userId,
      type: 'track_diary_entry',
      album_id: albumId,
      payload,
    }));
    if (events.length > 0) await supabaseAdmin.from('feed_events').insert(events);
  } catch (fanoutErr) {
    console.error('log-listen track fanout error:', fanoutErr);
  }

  return json({ success: true, data });
}

/** Followers de l'acteur + l'acteur lui-même (voit aussi l'event dans son propre feed) — miroir de fanoutEvent (web). */
// deno-lint-ignore no-explicit-any
async function followersPlusActor(supabaseUser: any, actorId: string): Promise<string[]> {
  const { data: followers } = await supabaseUser.from('follows').select('follower_id').eq('followee_id', actorId);
  const targetSet = new Set<string>((followers ?? []).map((f: { follower_id: string }) => f.follower_id));
  targetSet.add(actorId);
  return [...targetSet].slice(0, 5000);
}

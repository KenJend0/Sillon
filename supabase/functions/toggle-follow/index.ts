// Supabase Edge Function: toggle-follow
//
// Bascule un follow (table `follows`) et fait le fanout dans feed_events (+ backfill des
// écoutes récentes du suivi) — miroir server-side de toggleFollow (apps/web/app/actions/social.ts),
// pour que le mobile bénéficie du même fanout que le web sans embarquer la clé service_role
// côté client. Même famille que `toggle-like` (Phase 8).
//
// Déploiement : supabase functions deploy toggle-follow
// Requiert les secrets par défaut fournis par la plateforme (SUPABASE_URL, SUPABASE_ANON_KEY,
// SUPABASE_SERVICE_ROLE_KEY) — pas de config manuelle nécessaire.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BACKFILL_LIMIT = 20;

type Body = {
  idOrUsername: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Not authenticated' }, 401);

  // Client user-level (respecte la RLS) — lit/écrit `follows` avec l'identité réelle de l'appelant.
  const supabaseUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
  } = await supabaseUser.auth.getUser();
  if (!user) return json({ error: 'Not authenticated' }, 401);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid body' }, 400);
  }

  const { idOrUsername } = body;
  if (!idOrUsername) return json({ error: 'Missing idOrUsername' }, 400);

  // Client service_role — uniquement pour le fanout feed_events (table système append-only,
  // écrite pour le compte d'autres utilisateurs que l'acteur). Jamais exposé au client.
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  let targetId: string;
  if (UUID_REGEX.test(idOrUsername)) {
    targetId = idOrUsername;
  } else {
    const { data: profile } = await supabaseUser
      .from('profiles')
      .select('id')
      .eq('username', idOrUsername)
      .maybeSingle();
    if (!profile) return json({ error: 'User not found' }, 404);
    targetId = profile.id;
  }

  if (targetId === user.id) return json({ error: 'Cannot follow yourself' }, 400);

  const { data: blockCheck } = await supabaseUser
    .from('user_blocks')
    .select('blocker_id')
    .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${targetId}),and(blocker_id.eq.${targetId},blocked_id.eq.${user.id})`)
    .limit(1);
  if (blockCheck && blockCheck.length > 0) return json({ error: 'Action impossible' }, 403);

  const { data: existing } = await supabaseUser
    .from('follows')
    .select('follower_id')
    .eq('follower_id', user.id)
    .eq('followee_id', targetId)
    .maybeSingle();

  if (existing) {
    const { error: deleteError } = await supabaseUser
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('followee_id', targetId);
    if (deleteError) return json({ error: 'An error occurred' }, 500);

    await supabaseAdmin.from('feed_events').delete().eq('type', 'follow').eq('actor_id', user.id).eq('followee_id', targetId);

    return json({ following: false });
  }

  const { error: insertError } = await supabaseUser.from('follows').insert({ follower_id: user.id, followee_id: targetId });
  if (insertError) return json({ error: 'An error occurred' }, 500);

  await supabaseAdmin.from('feed_events').delete().eq('type', 'follow').eq('actor_id', user.id).eq('followee_id', targetId);

  try {
    const events = [{ user_id: targetId, actor_id: user.id, type: 'follow', followee_id: targetId, payload: {} }];
    const { error: fanoutError } = await supabaseAdmin.from('feed_events').insert(events);
    if (fanoutError) console.error('toggle-follow fanout error:', fanoutError.message);

    // Backfill : les écoutes récentes du suivi apparaissent immédiatement dans le feed
    // "Réseau" du nouveau follower, sans attendre sa prochaine écoute.
    const { data: entries } = await supabaseAdmin
      .from('diary_entries')
      .select('id, album_id, rating, created_at')
      .eq('user_id', targetId)
      .order('created_at', { ascending: false })
      .limit(BACKFILL_LIMIT);

    if (entries && entries.length > 0) {
      const backfillRows = entries.map((e: { id: string; album_id: string; created_at: string }) => ({
        user_id: user.id,
        actor_id: targetId,
        followee_id: null,
        type: 'diary_entry',
        entry_id: e.id,
        album_id: e.album_id ?? null,
        created_at: e.created_at,
        payload: {},
      }));
      const { error: backfillError } = await supabaseAdmin.from('feed_events').insert(backfillRows);
      if (backfillError) console.error('toggle-follow backfill error:', backfillError.message);
    }
  } catch (fanoutErr) {
    console.error('toggle-follow fanout exception:', fanoutErr);
    // Le follow reste acquis même si le fanout échoue.
  }

  return json({ following: true });
});

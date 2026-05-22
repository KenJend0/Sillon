'use server';

import { getAuthUser, createSupabaseServer, createSupabaseAnon } from '@/lib/supabase/server';

export type TrendingAlbum = {
    id: string;
    album_id: string;
    album_title: string;
    artist_name: string;
    cover_url: string;
    discover_kind: string;
    score?: number;
    delta?: number | null; // positif = montée, négatif = descente, null = nouveau
};

export type DiscoveryAlbum = {
    album_id: string;
    title: string;
    artist: string;
    cover_url: string;
};

export type ForYouAlbum = {
    album_id: string;
    title: string;
    artist: string;
    cover_url: string;
};

export type SimilarUser = {
    user_id: string;
    username: string;
    avatar_url: string | null;
    taste_match: number; // 0-100
    shared_albums_count: number;
};

export type ForYouTrack = {
    track_id: string;
    track_title: string;
    artist: string;
    album_id: string;
    cover_url: string | null;
};

/**
 * Albums populaires sur Waveform cette semaine (écoutes + sauvegardes agrégées).
 */
export async function getTrendingThisWeek(limit = 10): Promise<TrendingAlbum[]> {
    const supabase = createSupabaseAnon();
    const now = Date.now();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    const fourteenDaysAgo = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString();

    const [
        { data: currEntries }, { data: currSaves },
        { data: prevEntries }, { data: prevSaves },
    ] = await Promise.all([
        supabase.from('diary_entries').select('album_id, albums(id, title, cover_url, artists(name))').gte('created_at', sevenDaysAgo).eq('is_public', true).limit(200),
        supabase.from('saved_albums').select('album_id, albums(id, title, cover_url, artists(name))').gte('saved_at', sevenDaysAgo).limit(200),
        supabase.from('diary_entries').select('album_id').gte('created_at', fourteenDaysAgo).lt('created_at', sevenDaysAgo).eq('is_public', true).limit(200),
        supabase.from('saved_albums').select('album_id').gte('saved_at', fourteenDaysAgo).lt('saved_at', sevenDaysAgo).limit(200),
    ]);

    const albumScores = new Map<string, { score: number; title: string; artist_name: string; cover_url: string | null }>();
    for (const entry of [...(currEntries || []), ...(currSaves || [])]) {
        const album = entry.albums as any;
        if (!album?.id) continue;
        const existing = albumScores.get(album.id);
        if (existing) existing.score += 1;
        else albumScores.set(album.id, { score: 1, title: album.title || 'Unknown', artist_name: album.artists?.name || 'Unknown', cover_url: album.cover_url });
    }

    const prevScores = new Map<string, number>();
    for (const entry of [...(prevEntries || []), ...(prevSaves || [])]) {
        if (!entry.album_id) continue;
        prevScores.set(entry.album_id, (prevScores.get(entry.album_id) ?? 0) + 1);
    }
    const prevRankMap = new Map(
        [...prevScores.entries()].sort((a, b) => b[1] - a[1]).map(([id], i) => [id, i + 1])
    );

    return [...albumScores.entries()]
        .sort((a, b) => b[1].score - a[1].score)
        .slice(0, limit)
        .map(([albumId, info], index) => {
            const currentRank = index + 1;
            const prevRank = prevRankMap.get(albumId);
            return {
                id: `trending-${albumId}`,
                album_id: albumId,
                album_title: info.title,
                artist_name: info.artist_name,
                cover_url: info.cover_url || '',
                discover_kind: 'trending_week',
                score: info.score,
                delta: prevRank !== undefined ? prevRank - currentRank : null,
            };
        });
}

/**
 * Suggestions personnalisées — lit les recommandations pré-calculées par le
 * pipeline ML batch (cosine CF). Fallback sur le Jaccard simplifié si la table
 * est vide (avant le premier run du batch ou pour les nouveaux utilisateurs).
 */
export async function getForYouSuggestions(limit = 6): Promise<ForYouAlbum[]> {
    const user = await getAuthUser();
    if (!user) return [];

    const supabase = await createSupabaseServer();

    // Priorité : recommandations pré-calculées par le pipeline ML
    const { data: precomputed } = await supabase
        .from('user_recommendations')
        .select('album_id, rank, albums(id, title, cover_url, artists(name))')
        .eq('user_id', user.id)
        .eq('method', 'cosine_cf')
        .order('rank')
        .limit(limit);

    if (precomputed && precomputed.length > 0) {
        return precomputed.map((row) => {
            const album = row.albums as any;
            return {
                album_id: row.album_id,
                title: album?.title || 'Unknown',
                artist: album?.artists?.name || 'Unknown',
                cover_url: album?.cover_url || '',
            };
        });
    }

    // Fallback Jaccard — actif tant que le batch n'a pas tourné pour cet user

    // Étape 1 : profil de goût (>= 8) + tous les albums du journal (pour exclusion)
    const [{ data: myEntries }, { data: myAllEntries }] = await Promise.all([
        supabase.from('diary_entries').select('album_id').eq('user_id', user.id).gte('rating', 8),
        supabase.from('diary_entries').select('album_id').eq('user_id', user.id),
    ]);

    const myLikedIds = (myEntries || []).map((e) => e.album_id).filter(Boolean) as string[];
    if (myLikedIds.length === 0) return [];

    // Étape 2 : trouver les voisins — autres users qui ont noté >= 8 les mêmes albums
    const { data: intersectionEntries } = await supabase
        .from('diary_entries')
        .select('user_id, album_id')
        .in('album_id', myLikedIds)
        .neq('user_id', user.id)
        .gte('rating', 8);

    // Compter la taille de l'intersection par voisin
    const intersectionSizes = new Map<string, number>();
    for (const e of intersectionEntries || []) {
        if (!e.user_id) continue;
        intersectionSizes.set(e.user_id, (intersectionSizes.get(e.user_id) ?? 0) + 1);
    }

    // Garder seulement les voisins avec >= 3 albums en commun
    const neighborIds = [...intersectionSizes.entries()]
        .filter(([, size]) => size >= 3)
        .map(([userId]) => userId);

    if (neighborIds.length === 0) return [];

    // Étape 3 : albums bien notés (>= 8) par ces voisins, hors tous les albums déjà dans mon journal
    const myAllAlbumIds = new Set((myAllEntries || []).map((e) => e.album_id).filter(Boolean));

    const { data: recommendations } = await supabase
        .from('diary_entries')
        .select('user_id, album_id, rating, albums(id, title, cover_url, artists(name))')
        .in('user_id', neighborIds)
        .gte('rating', 8)
        .limit(500);

    // Étape 4 : scorer chaque album candidat
    const scores = new Map<
        string,
        { neighborCount: number; total: number; title: string; artist: string; cover: string }
    >();

    for (const entry of recommendations || []) {
        if (!entry.album_id || myAllAlbumIds.has(entry.album_id)) continue;
        const album = entry.albums as any;
        if (!album?.id) continue;
        const existing = scores.get(album.id);
        if (existing) {
            existing.neighborCount += 1;
            existing.total += entry.rating || 0;
        } else {
            scores.set(album.id, {
                neighborCount: 1,
                total: entry.rating || 0,
                title: album.title || 'Unknown',
                artist: (album.artists as any)?.name || 'Unknown',
                cover: album.cover_url || '',
            });
        }
    }

    if (scores.size === 0) return [];

    return [...scores.entries()]

        .sort(
            (a, b) =>
                b[1].neighborCount - a[1].neighborCount ||
                b[1].total / b[1].neighborCount - a[1].total / a[1].neighborCount
        )
        .slice(0, limit)
        .map(([albumId, info]) => ({
            album_id: albumId,
            title: info.title,
            artist: info.artist,
            cover_url: info.cover,
        }));
}

/**
 * Découverte — albums bien notés sur Waveform (avg >= 7, >= 2 auditeurs)
 * dont l'artiste est inconnu de l'utilisateur.
 * Pour un utilisateur non connecté : retourne les mieux notés sans filtre.
 */
export async function getDiscoveryAlbums(limit = 6): Promise<DiscoveryAlbum[]> {
    // Récupérer les artist_ids connus de l'utilisateur (optionnel)
    let knownArtistIds = new Set<string>();
    try {
        const user = await getAuthUser();
        if (user) {
            const supabase = await createSupabaseServer();
            const { data: myAlbums } = await supabase
                .from('diary_entries')
                .select('albums(artist_id)')
                .eq('user_id', user.id);
            for (const e of myAlbums || []) {
                const album = e.albums as any;
                if (album?.artist_id) knownArtistIds.add(album.artist_id);
            }
        }
    } catch {
        // Non authentifié — on continue sans filtre
    }

    const supabase = createSupabaseAnon();

    // Albums bien notés depuis la vue album_stats
    const { data: stats } = await supabase
        .from('album_stats_mat')
        .select('album_id, avg_rating, listeners_count')
        .gte('avg_rating', 7)
        .gte('listeners_count', 2)
        .order('avg_rating', { ascending: false })
        .limit(100);

    if (!stats || stats.length === 0) return [];

    const albumIds = stats.map((s) => s.album_id).filter(Boolean) as string[];

    const { data: albums } = await supabase
        .from('albums')
        .select('id, title, cover_url, artist_id, artists(name)')
        .in('id', albumIds);

    if (!albums) return [];

    // Attacher les stats et filtrer les artistes déjà connus
    const statsMap = new Map(stats.map((s) => [s.album_id, s]));

    return albums
        .filter((a) => !knownArtistIds.has(a.artist_id))
        .sort((a, b) => {
            const ra = statsMap.get(a.id)?.avg_rating ?? 0;
            const rb = statsMap.get(b.id)?.avg_rating ?? 0;
            return rb - ra;
        })
        .slice(0, limit)
        .map((a) => ({
            album_id: a.id,
            title: a.title,
            artist: (a.artists as any)?.name || 'Unknown',
            cover_url: a.cover_url || '',
        }));
}

/**
 * Utilisateurs avec des goûts similaires, calculés par le pipeline ML batch.
 * Retourne les top-N voisins cosine du user connecté avec leur score (0-100).
 */
export async function getSimilarUsers(limit = 4): Promise<SimilarUser[]> {
    const user = await getAuthUser();
    if (!user) return [];

    const supabase = await createSupabaseServer();

    // Fetch more than needed to account for filtering out already-followed users
    const [{ data: similarities }, { data: following }] = await Promise.all([
        supabase
            .from('user_similarity')
            .select('user_b, score')
            .eq('user_a', user.id)
            .order('score', { ascending: false })
            .limit(50),
        supabase
            .from('follows')
            .select('followee_id')
            .eq('follower_id', user.id),
    ]);

    if (!similarities || similarities.length === 0) return [];

    const followedIds = new Set((following || []).map((f) => f.followee_id));
    const scoreMap = new Map(similarities.map((s) => [s.user_b, s.score]));

    const unfollowedSimilar = similarities
        .filter((s) => !followedIds.has(s.user_b))
        .slice(0, limit);

    if (unfollowedSimilar.length === 0) return [];

    const userIds = unfollowedSimilar.map((s) => s.user_b);

    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

    if (!profiles) return [];

    const similarUserIds = profiles.map((p) => p.id);
    const [{ data: myAlbums }, { data: theirAlbums }] = await Promise.all([
        supabase.from('diary_entries').select('album_id').eq('user_id', user.id),
        supabase.from('diary_entries').select('user_id, album_id').in('user_id', similarUserIds),
    ]);

    const myAlbumSet = new Set((myAlbums || []).map((e) => e.album_id).filter(Boolean));
    const sharedCountMap = new Map<string, number>();
    for (const entry of theirAlbums || []) {
        if (!entry.album_id || !entry.user_id) continue;
        if (myAlbumSet.has(entry.album_id)) {
            sharedCountMap.set(entry.user_id, (sharedCountMap.get(entry.user_id) ?? 0) + 1);
        }
    }

    return profiles
        .filter((p) => p.username)
        .map((p) => ({
            user_id: p.id,
            username: p.username!,
            avatar_url: p.avatar_url ?? null,
            taste_match: Math.round((scoreMap.get(p.id) ?? 0) * 100),
            shared_albums_count: sharedCountMap.get(p.id) ?? 0,
        }))
        .sort((a, b) => b.taste_match - a.taste_match);
}

/**
 * Recommandations de titres pré-calculées par le pipeline ML batch (cosine CF).
 */
export async function getForYouTracks(limit = 6): Promise<ForYouTrack[]> {
    const user = await getAuthUser();
    if (!user) return [];

    const supabase = await createSupabaseServer();

    const { data } = await (supabase as any)
        .from('user_track_recommendations')
        .select('track_id, rank, tracks(id, title, album_id, albums(id, title, cover_url, artists(name)))')
        .eq('user_id', user.id)
        .eq('method', 'cosine_cf')
        .order('rank')
        .limit(limit);

    if (!data || data.length === 0) return [];

    return data.map((row: any) => {
        const track = row.tracks as any;
        const album = track?.albums as any;
        return {
            track_id: row.track_id,
            track_title: track?.title || 'Unknown',
            artist: album?.artists?.name || 'Unknown',
            album_id: track?.album_id || '',
            cover_url: album?.cover_url ?? null,
        };
    });
}

/**
 * Score de compatibilité de goût entre l'utilisateur connecté et un profil cible.
 * Retourne un entier 0-100, ou null si pas de données.
 */
export async function getTasteMatchScore(targetUserId: string): Promise<number | null> {
    const user = await getAuthUser();
    if (!user || user.id === targetUserId) return null;

    const supabase = await createSupabaseServer();

    // user_similarity est directionnel (user_a → user_b) — on vérifie les deux sens
    const [{ data: forward }, { data: reverse }] = await Promise.all([
        supabase.from('user_similarity').select('score').eq('user_a', user.id).eq('user_b', targetUserId).maybeSingle(),
        supabase.from('user_similarity').select('score').eq('user_a', targetUserId).eq('user_b', user.id).maybeSingle(),
    ]);

    const score = forward?.score ?? reverse?.score ?? null;
    return score !== null ? Math.round(score * 100) : null;
}

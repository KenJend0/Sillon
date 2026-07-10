import { Suspense } from 'react';
import { createSupabaseServer, getAuthUser } from "@/lib/supabase/server";
import { ensureProfile, getCurrentStreak } from "@/app/actions/profile";
import { getTrendingThisWeek } from "@/app/actions/explore";
import UnauthTeaser from "@/components/auth/UnauthTeaser";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileTabs from "@/components/profile/ProfileTabs";
import RatingDistribution from "@/components/profile/RatingDistribution";
import { RatingFilterProvider } from "@/components/profile/RatingFilterContext";
import { getUserDiary, getUserReviewsUnified } from "@/app/actions/diary";
import { getUserLists, getUserSavedLists, getOrCreateDefaultList } from "@/app/actions/lists";
import { getUserTrackDiary } from "@/app/actions/track-diary";
import type { DiaryEntryUI } from "@/app/actions/diary";

export const revalidate = 0; // Pas de cache, recharger à chaque accès

const ADMIN_IDS = (process.env.ADMIN_USER_IDS ?? '').split(',').map((s) => s.trim()).filter(Boolean);

// Notes synthétiques (pas de random, pour ne pas provoquer de mismatch d'hydration
// SSR/CSR) qui servent à la fois pour les badges de la grille et pour l'histogramme
// — une seule source de vérité, donc les deux racontent toujours la même histoire.
const MOCK_RATING_CYCLE = [8, 6, 9, 7, 8, 5, 9, 7, 8, 6, 10, 7, 8, 9, 6, 8, 7, 9];

function buildMockDiaryEntries(trending: Awaited<ReturnType<typeof getTrendingThisWeek>>): DiaryEntryUI[] {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    return trending.map((a, i) => ({
        id: `mock-${a.id}`,
        album_id: a.album_id,
        album_title: a.album_title,
        artist_id: a.album_id,
        artist_name: a.artist_name,
        cover_url: a.cover_url || null,
        rating: MOCK_RATING_CYCLE[i % MOCK_RATING_CYCLE.length],
        review_body: null,
        listened_at: new Date(now - i * dayMs).toISOString(),
        created_at: new Date(now - i * dayMs).toISOString(),
        release_date: null,
        likes_count: 0,
        comments_count: 0,
        is_liked: false,
    }));
}

export default async function MyProfilePage() {
    const user = await getAuthUser();

    if (!user) {
        const trending = await getTrendingThisWeek(18);
        const mockDiaryEntries = buildMockDiaryEntries(trending);
        const mockRatings = mockDiaryEntries.map((e) => e.rating as number);
        const favoriteAlbums = mockDiaryEntries.slice(0, 3).map((e, i) => ({
            id: e.album_id,
            title: e.album_title,
            artist_name: e.artist_name,
            cover_url: e.cover_url,
            position: i,
        }));
        const mockUser = {
            id: "mock-user",
            username: "Toi",
            picture_url: null,
            is_me: true,
            is_admin: false,
            followers_count: 312,
            following_count: 128,
            bio: null,
        };
        const mockStats = { reviews_count: mockDiaryEntries.length };

        return (
            <UnauthTeaser ctaTitle={<>Ton profil musical t&apos;attend — <em className="italic text-accent-deep">journal, stats et albums favoris.</em></>}>
                <RatingFilterProvider>
                    <div className="lg:mx-auto lg:flex lg:max-w-6xl lg:items-start lg:gap-10 lg:px-8">
                        <aside className="lg:w-72 lg:flex-shrink-0">
                            <ProfileHeader user={mockUser} stats={mockStats} favoriteAlbums={favoriteAlbums} />
                            <div className="max-w-page mx-auto px-4 sm:px-6 lg:max-w-none lg:px-0 mt-4 lg:mt-8">
                                <RatingDistribution ratings={mockRatings} />
                            </div>
                        </aside>

                        <div className="lg:flex-1 lg:min-w-0 mt-8 lg:pt-8 lg:mt-0">
                            <ProfileTabs
                                isMe
                                userId="mock-user"
                                diaryEntries={mockDiaryEntries}
                                userLists={[]}
                                savedLists={[]}
                                trackEntries={[]}
                                unifiedReviews={[]}
                            />
                        </div>
                    </div>
                </RatingFilterProvider>
            </UnauthTeaser>
        );
    }

    const supabase = await createSupabaseServer();

    // Créer le profil + liste "À écouter" par défaut si première connexion
    await ensureProfile();
    try {
        await getOrCreateDefaultList();
    } catch (error) {
        console.error('Error ensuring default list:', error);
    }

    // Fetch user profile
    const { data: profile } = await supabase
        .from("profiles")
        .select("id, username, bio, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

    // Fetch all data in parallel
    const [
        followersResult,
        followingResult,
        diaryEntries,
        reviewsTotalResult,
        userLists,
        savedLists,
        favoriteAlbumsResult,
        trackEntries,
        unifiedReviews,
        allRatingsResult,
        allTrackRatingsResult,
        trackReviewsCountResult,
        streakResult,
    ] = await Promise.all([
        supabase
            .from("follows")
            .select("*", { count: "exact" })
            .eq("followee_id", user.id),
        supabase
            .from("follows")
            .select("*", { count: "exact" })
            .eq("follower_id", user.id),
        getUserDiary(user.id, 0, 51),
        supabase
            .from("diary_entries")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .not("review_body", "is", null),
        getUserLists(user.id),
        getUserSavedLists(user.id),
        supabase
            .from("user_favorite_albums")
            .select("position, album_id, albums (id, title, cover_url, artists (name))")
            .eq("user_id", user.id)
            .order("position", { ascending: true })
            .limit(3),
        getUserTrackDiary(user.id),
        getUserReviewsUnified(user.id),
        supabase.from("diary_entries").select("rating").eq("user_id", user.id),
        supabase.from("track_diary_entries").select("rating").eq("user_id", user.id),
        supabase
            .from("track_diary_entries")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .not("review_body", "is", null)
            .neq("review_body", ""),
        getCurrentStreak(user.id),
    ]);

    const favoriteAlbums = (favoriteAlbumsResult.data || []).map((item: any) => ({
        id: item.albums?.id || item.album_id,
        title: item.albums?.title || "Album inconnu",
        artist_name: item.albums?.artists?.name || "Artiste inconnu",
        cover_url: item.albums?.cover_url ?? null,
        position: item.position,
    }));

    const followersCount = followersResult.count || 0;
    const followingCount = followingResult.count || 0;

    const allRatings = [
        ...(allRatingsResult.data ?? []),
        ...(allTrackRatingsResult.data ?? []),
    ].map((e: any) => e.rating as number | null);
    const reviewsCount = (reviewsTotalResult.count ?? 0) + (trackReviewsCountResult.count ?? 0);

    const username = profile?.username || user.email?.split("@")[0] || "user";
    const isAdmin = ADMIN_IDS.includes(user.id);

    const userData = {
        id: user.id,
        username: username,
        picture_url: profile?.avatar_url ?? null,
        is_me: true,
        is_admin: isAdmin,
        followers_count: followersCount || 0,
        following_count: followingCount || 0,
        bio: profile?.bio || null,
    };

    const stats = {
        reviews_count: reviewsCount,
    };

    const streak = streakResult.ok
        ? { days: streakResult.streakDays, isActiveToday: streakResult.isActiveToday }
        : undefined;

    return (
        <RatingFilterProvider>
        <div className="lg:mx-auto lg:flex lg:max-w-6xl lg:items-start lg:gap-10 lg:px-8">
            {/* Sidebar gauche (desktop) / Layout empilé (mobile) */}
            <aside className="lg:w-72 lg:flex-shrink-0 lg:sticky lg:top-[72px]">
                <ProfileHeader user={userData} stats={stats} streak={streak} favoriteAlbums={favoriteAlbums} />
                <div className="max-w-page mx-auto px-4 sm:px-6 lg:max-w-none lg:px-0 mt-4 lg:mt-8">
                    <RatingDistribution ratings={allRatings} />
                </div>
            </aside>

            {/* Contenu principal : tabs */}
            <div className="lg:flex-1 lg:min-w-0 mt-8 lg:pt-8 lg:mt-0">
                <Suspense fallback={null}>
                    <ProfileTabs
                        isMe={true}
                        userId={user.id}
                        diaryEntries={diaryEntries}
                        userLists={userLists}
                        savedLists={savedLists}
                        trackEntries={trackEntries}
                        unifiedReviews={unifiedReviews}
                    />
                </Suspense>
            </div>
        </div>
        </RatingFilterProvider>
    );
}

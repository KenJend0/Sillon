import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { ensureProfile } from "@/app/actions/profile";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileTabs from "@/components/profile/ProfileTabs";
import Top3Albums from "@/components/profile/Top3Albums";
import { getUserDiary } from "@/app/actions/diary";
import { getUserSavedAlbums } from "@/app/actions/saved-albums";

export const revalidate = 0; // Pas de cache, recharger à chaque accès

export default async function MyProfilePage() {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/auth?mode=login");

    // Créer le profil s'il n'existe pas (première connexion)
    await ensureProfile();

    // Fetch user profile
    const { data: profile } = await supabase
        .from("profiles")
        .select("id, username, display_name, bio, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

    // Fetch all data in parallel
    const [
        followersResult,
        followingResult,
        diaryEntries,
        savedAlbums,
        favoriteAlbumsResult,
    ] = await Promise.all([
        supabase
            .from("follows")
            .select("*", { count: "exact" })
            .eq("followee_id", user.id),
        supabase
            .from("follows")
            .select("*", { count: "exact" })
            .eq("follower_id", user.id),
        getUserDiary(user.id),
        getUserSavedAlbums(user.id),
        supabase
            .from("user_favorite_albums")
            .select("position, album_id, albums (id, title, cover_url, artists (name))")
            .eq("user_id", user.id)
            .order("position", { ascending: true })
            .limit(3),
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

    // Compute stats from fetched data
    const albumsCount = diaryEntries.length;
    const reviewsCount = diaryEntries.filter(e => e.review_body).length;

    const displayName = profile?.display_name || user.email?.split("@")[0] || "User";
    const username = profile?.username || user.email?.split("@")[0] || "user";

    const userData = {
        id: user.id,
        username: username,
        display_name: displayName,
        picture_url: profile?.avatar_url ?? null,
        is_me: true,
        followers_count: followersCount || 0,
        following_count: followingCount || 0,
        bio: profile?.bio || null,
    };

    const stats = {
        reviews_count: reviewsCount,
        albums_count: albumsCount,
    };

    return (
        <>
            <ProfileHeader user={userData} stats={stats} />
            <div className="max-w-page mx-auto px-4 sm:px-6">
                <Top3Albums userId={user.id} isMe={true} initialAlbums={favoriteAlbums} />
            </div>
            <div className="py-6" />
            <ProfileTabs
                isMe={true}
                diaryEntries={diaryEntries}
                savedAlbums={savedAlbums}
            />
        </>
    );
}

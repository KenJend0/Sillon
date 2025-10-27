"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import LikeButton from "@/components/LikeButton";
import Link from "next/link";

type User = {
    id: string; username: string; display_name: string; picture_url?: string;
    is_following?: boolean; is_me?: boolean; followers_count?: number; following_count?: number;
};
type Review = {
    id: string; album_id: string; album_title: string; artist_id: string; artist_name: string;
    cover_url?: string; rating?: number; review?: string; listened_at?: string; created_at?: string;
    is_liked: boolean; likes_count: number;
};

export default function UserProfile() {
    const { username } = useParams();
    const usernameStr = Array.isArray(username) ? username[0] : username;

    const [user, setUser] = useState<User | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [followError, setFollowError] = useState<string | null>(null);

    useEffect(() => {
        if (!usernameStr) return;
        (async () => {
            try {
                setLoading(true);
                const res = await fetch(`/api/profiles/${encodeURIComponent(usernameStr)}`, {
                    credentials: "include", cache: "no-store",
                });
                if (!res.ok) throw new Error(`Erreur profil: ${res.status}`);
                const data = await res.json();
                setUser(data.user);

                const revRes = await fetch(`/api/diary/users/${data.user.id}/diary?limit=20`, {
                    credentials: "include", cache: "no-store",
                });
                const revData = await revRes.json();
                setReviews(revData.items || []);
                setError(null);
            } catch (e: any) {
                setError(e.message ?? "Impossible de charger le profil");
                setUser(null); setReviews([]);
            } finally {
                setLoading(false);
            }
        })();
    }, [usernameStr]);

    const handleFollow = async () => {
        if (!user) return;
        setFollowError(null);
        try {
            const res = await fetch(`/api/social/follow/${user.id}`, { method: "POST", credentials: "include" });
            if (!res.ok) throw new Error(`Erreur follow: ${res.status}`);
            const data = await res.json();
            setUser({ ...user, is_following: data.following });
        } catch (e: any) {
            setFollowError(e.message || "Impossible de suivre");
        }
    };

    if (loading) return <p className="p-4">Loading...</p>;
    if (error) return <p className="p-4 text-red-600">{error}</p>;
    if (!user) return <p className="p-4">No user data</p>;

    return (
        <div className="max-w-3xl mx-auto p-4 space-y-6">
            <div className="flex items-center gap-4 border-b pb-4">
                <img src={user.picture_url || "/default-avatar.png"} className="w-20 h-20 rounded-full" alt="avatar" />
                <div>
                    <h1 className="text-2xl font-bold">{user.display_name}</h1>
                    <p className="text-gray-500">@{user.username}</p>
                    <div className="flex gap-4 text-sm mt-1">
                        <Link href={`/u/${user.username}/followers`} className="hover:underline">
                            {user.followers_count ?? 0} Followers
                        </Link>
                        <Link href={`/u/${user.username}/following`} className="hover:underline">
                            {user.following_count ?? 0} Following
                        </Link>
                    </div>
                    {followError && <p className="text-sm text-red-500 mt-1">{followError}</p>}
                    {!user.is_me && (
                        <button onClick={handleFollow} className="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
                            {user.is_following ? "Unfollow" : "Follow"}
                        </button>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                <h2 className="text-xl font-semibold">Reviews</h2>
                {reviews.length === 0 && <p className="text-gray-500">Aucune review pour l’instant.</p>}
                {reviews.map((rev) => (
                    <div key={rev.id} className="flex gap-4 border rounded-lg p-3">
                        <img src={rev.cover_url || "/default-cover.png"} alt={rev.album_title} className="w-20 h-20 object-cover rounded" />
                        <div className="flex-1">
                            <div className="font-medium">
                                <Link href={`/albums/${rev.album_id}`} className="hover:underline">{rev.album_title}</Link>{" "}
                                — <Link href={`/artists/${rev.artist_id}`} className="hover:underline">{rev.artist_name}</Link>
                            </div>
                            <div className="text-sm text-gray-500">
                                {rev.listened_at ? new Date(rev.listened_at).toLocaleDateString() : ""}
                            </div>
                            <div className="text-yellow-500">★ {rev.rating ?? "—"}</div>
                            {rev.review && <p className="mt-1">{rev.review}</p>}
                            <div className="mt-2">
                                <LikeButton entryId={rev.id} initialLiked={rev.is_liked} initialCount={rev.likes_count} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

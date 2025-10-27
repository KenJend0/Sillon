"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import UserCard from "@/components/UserCard";

type User = {
    id: string; username: string; display_name: string; picture_url?: string;
    is_following?: boolean; is_me?: boolean;
};

export default function FollowingList() {
    const { username } = useParams();
    const usernameStr = Array.isArray(username) ? username[0] : username;

    const [following, setFollowing] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!usernameStr) return;
        (async () => {
            try {
                setLoading(true);
                const res = await fetch(`/api/social/users/${encodeURIComponent(usernameStr)}/following`, {
                    credentials: "include",
                    cache: "no-store",
                });
                if (!res.ok) throw new Error(`Erreur following: ${res.status}`);
                const data = await res.json();
                setFollowing(data.items || []);
            } catch (e: any) {
                setError(e.message || "Impossible de charger");
            } finally {
                setLoading(false);
            }
        })();
    }, [usernameStr]);

    if (loading) return <p className="p-4">Loading…</p>;
    if (error) return <p className="p-4 text-red-600">{error}</p>;

    return (
        <div className="max-w-2xl mx-auto p-4">
            <h1 className="text-xl font-bold mb-4">Followers</h1>
            {following.length === 0 && <p className="text-gray-500">Aucun follower.</p>}
            {following.map((f) => <UserCard key={f.id} user={f} />)}
        </div>
    );
}

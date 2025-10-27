"use client";

import { useState } from "react";

export default function LikeButton({
                                       entryId, initialLiked, initialCount,
                                   }: { entryId: string; initialLiked: boolean; initialCount: number; }) {
    const [liked, setLiked] = useState(initialLiked);
    const [count, setCount] = useState(initialCount);
    const [loading, setLoading] = useState(false);

    const toggleLike = async () => {
        if (loading) return;
        setLoading(true);
        try {
            const method = liked ? "DELETE" : "POST";
            const res = await fetch(`/api/social/diary/${entryId}/like`, { method, credentials: "include" });
            if (res.ok) {
                const data = await res.json();
                setLiked(data.liked);
                setCount(data.likes_count);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <button onClick={toggleLike} disabled={loading} className="text-xl focus:outline-none">
                {liked ? "❤️" : "🤍"}
            </button>
            <span className="text-sm text-gray-700">{count}</span>
        </div>
    );
}

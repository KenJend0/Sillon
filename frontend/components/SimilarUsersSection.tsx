"use client";

import { useState } from "react";
import Link from "next/link";
import { UserAvatar } from "@/components/avatars/DefaultAvatar";
import { toggleFollow } from "@/app/actions/social";
import { type SimilarUser } from "@/app/actions/explore";

function UserCard({ user }: { user: SimilarUser }) {
    const [followed, setFollowed] = useState(false);
    const [loading, setLoading] = useState(false);

    async function handleFollow(e: React.MouseEvent) {
        e.preventDefault();
        setLoading(true);
        const result = await toggleFollow(user.user_id, "explore_similar");
        if (result.success) setFollowed(true);
        setLoading(false);
    }

    return (
        <Link
            href={`/u/${user.username}`}
            className="group flex flex-col items-center gap-2 text-center bg-paper-hi border border-border rounded-card px-3 py-4 hover:border-accent hover:shadow-card transition-all duration-150"
        >
            <div className="relative">
                <div className="rounded-full overflow-hidden border border-rule" style={{ width: 52, height: 52 }}>
                    <UserAvatar userId={user.user_id} src={user.avatar_url} size={52} />
                </div>
            </div>

            <p className="text-[13px] font-medium text-text-primary truncate w-full">
                @{user.username}
            </p>

            {user.shared_albums_count > 0 ? (
                <p className="font-display italic text-[13px] text-text-warm leading-snug">
                    <span className="text-accent">{user.shared_albums_count}</span> album{user.shared_albums_count > 1 ? 's' : ''} en commun
                </p>
            ) : (
                <p className="font-display italic text-[13px] text-text-secondary leading-snug">
                    goûts similaires
                </p>
            )}

            <button
                onClick={handleFollow}
                disabled={followed || loading}
                className={`mt-1 w-full text-[11.5px] font-medium px-3 py-1.5 rounded-full border transition-colors duration-150 ${
                    followed
                        ? 'border-border text-text-tertiary cursor-default'
                        : 'border-accent text-accent hover:bg-accent hover:text-paper-hi'
                }`}
            >
                {followed ? 'Suivi' : 'Suivre'}
            </button>
        </Link>
    );
}

export default function SimilarUsersSection({ users }: { users: SimilarUser[] }) {
    if (users.length === 0) return null;

    return (
        <section>
            <div className="mb-5">
                <h2 className="text-h2 text-text-primary">
                    Goûts <em className="italic text-accent-deep">similaires</em>
                </h2>
                <p className="text-sm text-text-secondary mt-1">
                    Des utilisateurs avec des goûts proches des tiens.
                </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {users.map((user) => (
                    <UserCard key={user.user_id} user={user} />
                ))}
            </div>
        </section>
    );
}

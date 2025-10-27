"use client";

import { useEffect, useState } from "react";

type User = {
    id: string;
    display_name: string;
    username?: string;
    picture_url?: string;
};

export default function AuthButtons() {
    const [user, setUser] = useState<User | null>(null);

    async function refresh() {
        try {
            const res = await fetch("/api/auth/me", { credentials: "include" });
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
            } else {
                setUser(null);
            }
        } catch {
            setUser(null);
        }
    }

    useEffect(() => {
        refresh();
    }, []);

    async function logout() {
        await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
        setUser(null);
        window.location.href = "/";
    }

    if (!user) {
        return (
            <a
                href="/api/auth/google"
                className="px-3 py-1 rounded bg-blue-600 text-white text-sm"
            >
                Se connecter
            </a>
        );
    }

    return (
        <div className="flex items-center gap-3">
            {user.picture_url && (
                <img
                    src={user.picture_url}
                    alt={user.display_name}
                    className="w-8 h-8 rounded-full"
                />
            )}
            <span className="text-sm">{user.display_name}</span>
            <button
                onClick={logout}
                className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-sm"
            >
                Se déconnecter
            </button>
        </div>
    );
}

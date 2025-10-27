"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";

export default function BottomNav() {
    const [user, setUser] = useState<any>(null);

    // Vérifie l'état utilisateur côté client
    useEffect(() => {
        async function fetchUser() {
            try {
                const res = await fetch("/api/me"); // Crée un endpoint léger qui renvoie getCurrentUser()
                if (res.ok) {
                    const data = await res.json();
                    setUser(data.user || null);
                }
            } catch (err) {
                console.error(err);
            }
        }
        fetchUser();
    }, []);

    const handleLogout = async () => {
        await fetch("/api/logout", { method: "POST" });
        setUser(null);
        window.location.href = "/login";
    };

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-neutral-950 border-t border-neutral-800 flex justify-around items-center h-14 md:hidden z-50">
            <Link href="/feed" className="text-gray-300 hover:text-emerald-400 transition">🏠</Link>
            <Link href="/explore" className="text-gray-300 hover:text-emerald-400 transition">🔍</Link>
            <Link href="/feed" className="text-gray-300 hover:text-emerald-400 transition">➕</Link>
            <Link href="/notifications" className="text-gray-300 hover:text-emerald-400 transition">🔔</Link>

            {/* Section utilisateur */}
            {!user ? (
                <Link
                    href="/login"
                    className="text-gray-300 hover:text-emerald-400 transition text-sm"
                >
                    🔓
                </Link>
            ) : (
                <div className="relative group">
                    <button className="flex items-center space-x-1">
                        {user.picture_url ? (
                            <Image
                                src={user.picture_url}
                                alt="avatar"
                                width={26}
                                height={26}
                                className="rounded-full border border-neutral-700"
                            />
                        ) : (
                            <span className="text-gray-300 text-lg">👤</span>
                        )}
                    </button>

                    {/* Menu déroulant */}
                    <div className="absolute bottom-12 right-0 bg-neutral-900 border border-neutral-800 rounded-lg p-2 w-36 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition">
                        <Link
                            href="/me"
                            className="block text-gray-300 hover:text-emerald-400 py-1 text-sm"
                        >
                            Mon profil
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="block w-full text-left text-gray-300 hover:text-red-400 py-1 text-sm"
                        >
                            Se déconnecter
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
}

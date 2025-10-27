"use client";
import { useState, useEffect } from "react";

type Profile = {
    display_name: string;
    username: string;
    picture_url: string;
};

export default function ProfileSettings() {
    const [profile, setProfile] = useState<Profile>({
        display_name: "",
        username: "",
        picture_url: "",
    });
    const [status, setStatus] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/auth/me", { credentials: "include" });
                if (!res.ok) throw new Error("not_logged_in");
                const data = await res.json();
                if (data.user) {
                    setProfile({
                        display_name: data.user.display_name ?? "",
                        username: data.user.username ?? "",
                        picture_url: data.user.picture_url ?? "",
                    });
                }
            } catch {
                setStatus("Vous devez être connecté.");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const isDefaultUsername = /^[0-9a-f]{8}$/.test(profile.username);

    const save = async () => {
        setStatus(null);
        try {
            const res = await fetch("/api/settings/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(profile),
                credentials: "include",
            });
            if (res.ok) {
                setStatus("✅ Profil mis à jour !");
            } else {
                const err = await res.json();
                setStatus(`❌ Erreur: ${err.error ?? "update failed"}`);
            }
        } catch (e: any) {
            setStatus(`❌ Erreur: ${e.message}`);
        }
    };

    if (loading) {
        return <div className="max-w-xl mx-auto p-4">Chargement…</div>;
    }

    return (
        <div className="max-w-xl mx-auto p-4 space-y-4">
            <h1 className="text-2xl font-bold">Modifier le profil</h1>

            <input
                value={profile.display_name}
                onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                placeholder="Display name"
                className="w-full border rounded px-3 py-2"
            />

            <div>
                <input
                    value={profile.username}
                    onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                    placeholder="Username"
                    className="w-full border rounded px-3 py-2"
                />
                {isDefaultUsername && (
                    <p className="text-sm text-red-600 mt-1">
                        ⚠️ Choisissez un pseudo personnalisé (pas celui par défaut).
                    </p>
                )}
            </div>

            <input
                value={profile.picture_url}
                onChange={(e) => setProfile({ ...profile, picture_url: e.target.value })}
                placeholder="Avatar URL"
                className="w-full border rounded px-3 py-2"
            />

            <button
                onClick={save}
                disabled={isDefaultUsername}
                className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
            >
                Sauvegarder
            </button>

            {status && <p className="text-sm mt-2">{status}</p>}
        </div>
    );
}

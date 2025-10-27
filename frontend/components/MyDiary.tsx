"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LikeButton from "@/components/LikeButton";

type DiaryEntry = {
    id: string; album_id: string; album_title: string; artist_id: string; artist_name: string;
    cover_url: string | null; listened_at: string; rating: number | null;
    review_title: string | null; review_body: string | null; is_liked: boolean; likes_count: number;
};

export default function MyDiary() {
    const [items, setItems] = useState<DiaryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState("");
    const [editRating, setEditRating] = useState<number | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const meRes = await fetch(`/api/auth/me`, { credentials: "include" });
                const me = await meRes.json();
                if (!me?.user?.id) { setErr("You must be logged in."); setLoading(false); return; }
                const res = await fetch(`/api/diary/users/${me.user.id}/diary?limit=50`, { credentials: "include", cache: "no-store" });
                if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
                const data = await res.json();
                setItems(data.items ?? []);
            } catch (e: any) {
                setErr(e.message ?? "Failed to load");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const handleUpdate = async (id: string) => {
        const res = await fetch(`/api/diary/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ review_body: editText, rating: editRating }),
        });
        const data = await res.json();
        if (res.ok) {
            setItems((prev) => prev.map((r) => (r.id === id ? { ...r, review_body: editText, rating: editRating } : r)));
            setEditingId(null);
        } else {
            alert(data.error || "Update failed");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Supprimer cette review ?")) return;
        const res = await fetch(`/api/diary/${id}`, { method: "DELETE", credentials: "include" });
        if (res.ok) setItems((prev) => prev.filter((r) => r.id !== id));
        else {
            const data = await res.json();
            alert(data.error || "Delete failed");
        }
    };

    if (loading) return <main className="mx-auto max-w-3xl p-6">Loading…</main>;
    if (err) return <main className="mx-auto max-w-3xl p-6 text-red-600">{err}</main>;

    return (
        <main className="mx-auto max-w-3xl p-6">
            <h1 className="text-2xl font-semibold mb-4">My Diary</h1>
            {items.length === 0 ? (
                <div className="text-sm opacity-70">No entries yet.</div>
            ) : (
                <ul className="space-y-4">
                    {items.map((e) => (
                        <li key={e.id} className="flex gap-4 border-b pb-4">
                            {e.cover_url ? (
                                <Link href={`/albums/${e.album_id}`} className="shrink-0">
                                    <img src={e.cover_url} alt={e.album_title} className="w-16 h-16 rounded object-cover" />
                                </Link>
                            ) : (
                                <Link href={`/albums/${e.album_id}`} className="w-16 h-16 rounded bg-gray-200 block" />
                            )}

                            <div className="min-w-0 flex-1">
                                <div className="font-medium">
                                    <Link href={`/albums/${e.album_id}`} className="hover:underline">{e.album_title}</Link>
                                </div>
                                <div className="text-sm text-gray-500">
                                    <Link href={`/artists/${e.artist_id}`} className="hover:underline">{e.artist_name}</Link>
                                </div>
                                <div className="text-xs opacity-60 mt-1">{new Date(e.listened_at).toLocaleDateString()}</div>

                                {editingId === e.id ? (
                                    <div className="mt-2 space-y-2">
                                        <textarea value={editText} onChange={(ev) => setEditText(ev.target.value)} className="w-full border rounded p-2" />
                                        <input type="number" min={0} max={10} value={editRating ?? ""} onChange={(ev) => setEditRating(Number(ev.target.value))} className="border rounded p-1 w-20" />
                                        <div className="flex gap-2">
                                            <button onClick={() => handleUpdate(e.id)} className="px-3 py-1 bg-green-600 text-white rounded">Sauver</button>
                                            <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-gray-400 text-white rounded">Annuler</button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {typeof e.rating === "number" && <div className="text-sm mt-1">Rating: {e.rating}/10</div>}
                                        {e.review_title && <div className="mt-1 font-semibold">{e.review_title}</div>}
                                        {e.review_body && <p className="whitespace-pre-wrap">{e.review_body}</p>}
                                    </>
                                )}

                                <div className="mt-2">
                                    <LikeButton entryId={e.id} initialLiked={e.is_liked} initialCount={e.likes_count} />
                                </div>
                            </div>

                            {editingId !== e.id && (
                                <div className="flex flex-col gap-2 ml-4">
                                    <button
                                        onClick={() => { setEditingId(e.id); setEditText(e.review_body || ""); setEditRating(e.rating); }}
                                        className="px-2 py-1 bg-blue-600 text-white rounded text-sm"
                                    >
                                        Éditer
                                    </button>
                                    <button onClick={() => handleDelete(e.id)} className="px-2 py-1 bg-red-600 text-white rounded text-sm">
                                        Supprimer
                                    </button>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </main>
    );
}

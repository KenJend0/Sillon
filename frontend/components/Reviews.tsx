"use client";

import { useEffect, useState } from "react";
import LikeButton from "@/components/LikeButton";
import CommentSection from "@/components/CommentSection";

type Review = {
    id: string; user_id: string; display_name: string; picture_url: string | null;
    rating: number | null; review_title: string | null; review_body: string | null;
    listened_at: string; created_at: string; is_liked: boolean; likes_count: number;
};

export default function Reviews({ albumId }: { albumId: string }) {
    const [items, setItems] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [meId, setMeId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState("");
    const [editRating, setEditRating] = useState<number | null>(null);

    useEffect(() => {
        (async () => {
            const meRes = await fetch(`/api/auth/me`, { credentials: "include" });
            const me = await meRes.json();
            setMeId(me?.user?.id || null);

            const res = await fetch(`/api/diary/albums/${albumId}/reviews?limit=12`, {
                credentials: "include",
                cache: "no-store",
            });
            const data = await res.json();
            setItems(data.items || []);
            setLoading(false);
        })();
    }, [albumId]);

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

    if (loading) return <p className="mt-6 text-sm text-gray-500">Loading reviews…</p>;
    if (items.length === 0) return null;

    return (
        <section className="mt-10">
            <h2 className="text-lg font-semibold mb-3">Reviews</h2>
            <ul className="space-y-4">
                {items.map((r) => (
                    <li key={r.id} className="border rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                            {r.picture_url && <img src={r.picture_url} alt="" className="w-8 h-8 rounded-full" />}
                            <div className="font-medium">{r.display_name}</div>
                            {typeof r.rating === "number" && (
                                <span className="ml-auto text-sm px-2 py-0.5 border rounded">{r.rating}/10</span>
                            )}
                        </div>

                        {editingId === r.id ? (
                            <div className="mt-2 space-y-2">
                                <textarea value={editText} onChange={(ev) => setEditText(ev.target.value)} className="w-full border rounded p-2" />
                                <input
                                    type="number" min={0} max={10} value={editRating ?? ""}
                                    onChange={(ev) => setEditRating(Number(ev.target.value))}
                                    className="border rounded p-1 w-20"
                                />
                                <div className="flex gap-2">
                                    <button onClick={() => handleUpdate(r.id)} className="px-3 py-1 bg-green-600 text-white rounded">Sauver</button>
                                    <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-gray-400 text-white rounded">Annuler</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {r.review_title && <div className="font-semibold">{r.review_title}</div>}
                                {r.review_body && <p className="whitespace-pre-wrap mt-1">{r.review_body}</p>}
                            </>
                        )}

                        <div className="text-xs opacity-60 mt-2">{new Date(r.listened_at).toLocaleDateString()}</div>
                        <LikeButton entryId={r.id} initialLiked={r.is_liked} initialCount={r.likes_count} />

                        {meId === r.user_id && editingId !== r.id && (
                            <div className="flex gap-2 mt-2">
                                <button
                                    onClick={() => { setEditingId(r.id); setEditText(r.review_body || ""); setEditRating(r.rating); }}
                                    className="px-2 py-1 bg-blue-600 text-white rounded text-sm"
                                >
                                    Éditer
                                </button>
                                <button onClick={() => handleDelete(r.id)} className="px-2 py-1 bg-red-600 text-white rounded text-sm">
                                    Supprimer
                                </button>
                            </div>
                        )}
                        <CommentSection entryId={r.id} />
                    </li>
                ))}
            </ul>
        </section>
    );
}

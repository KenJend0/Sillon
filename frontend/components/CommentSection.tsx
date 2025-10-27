"use client";

import { useEffect, useState } from "react";

type Comment = {
    id: string; entry_id: string; user_id: string; display_name: string;
    picture_url?: string; body: string; created_at: string; updated_at?: string; is_me?: boolean;
};

export default function CommentSection({ entryId }: { entryId: string }) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newBody, setNewBody] = useState("");
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editBody, setEditBody] = useState("");

    const loadComments = async () => {
        setLoading(true);
        const res = await fetch(`/api/social/diary/${entryId}/comments`, { credentials: "include", cache: "no-store" });
        const data = await res.json();
        setComments(data.items || []);
        setLoading(false);
    };

    useEffect(() => { loadComments(); }, [entryId]);

    const addComment = async () => {
        if (!newBody.trim()) return;
        const res = await fetch(`/api/social/diary/${entryId}/comments`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            credentials: "include", body: JSON.stringify({ body: newBody }),
        });
        if (res.ok) { setNewBody(""); loadComments(); }
    };

    const updateComment = async (id: string) => {
        if (!editBody.trim()) return;
        const res = await fetch(`/api/social/diary/${entryId}/comments/${id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            credentials: "include", body: JSON.stringify({ body: editBody }),
        });
        if (res.ok) { setEditingId(null); setEditBody(""); loadComments(); }
    };

    const deleteComment = async (id: string) => {
        if (!confirm("Delete this comment?")) return;
        const res = await fetch(`/api/social/diary/${entryId}/comments/${id}`, {
            method: "DELETE", credentials: "include",
        });
        if (res.ok) loadComments();
    };

    if (loading) return <p className="text-sm text-gray-500">Loading comments…</p>;

    return (
        <div className="mt-3 space-y-3">
            {comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                    <img src={c.picture_url || "/default-avatar.png"} alt={c.display_name} className="w-8 h-8 rounded-full" />
                    <div className="flex-1">
                        <div className="text-sm font-medium">{c.display_name}</div>
                        {editingId === c.id ? (
                            <div className="flex gap-2 mt-1">
                                <input
                                    value={editBody}
                                    onChange={(e) => setEditBody(e.target.value)}
                                    className="border rounded px-2 py-1 text-sm flex-1"
                                />
                                <button onClick={() => updateComment(c.id)} className="px-2 py-1 text-sm bg-blue-600 text-white rounded">Save</button>
                                <button onClick={() => setEditingId(null)} className="px-2 py-1 text-sm border rounded">Cancel</button>
                            </div>
                        ) : (
                            <p className="text-sm">{c.body}</p>
                        )}
                        <div className="text-xs text-gray-400">
                            {new Date(c.created_at).toLocaleDateString()}
                            {c.updated_at && " (edited)"}
                        </div>

                        {c.is_me && editingId !== c.id && (
                            <div className="flex gap-2 mt-1 text-xs">
                                <button onClick={() => { setEditingId(c.id); setEditBody(c.body); }} className="text-blue-600 hover:underline">Edit</button>
                                <button onClick={() => deleteComment(c.id)} className="text-red-600 hover:underline">Delete</button>
                            </div>
                        )}
                    </div>
                </div>
            ))}

            <div className="flex gap-2 mt-2">
                <input
                    value={newBody}
                    onChange={(e) => setNewBody(e.target.value)}
                    placeholder="Write a comment…"
                    className="border rounded px-2 py-1 text-sm flex-1"
                />
                <button onClick={addComment} className="px-3 py-1 text-sm bg-blue-600 text-white rounded">
                    Post
                </button>
            </div>
        </div>
    );
}

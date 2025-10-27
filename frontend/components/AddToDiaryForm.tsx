"use client";

import { useState } from "react";

export default function AddToDiaryForm({ albumId }: { albumId: string }) {
    const [body, setBody] = useState("");
    const [rating, setRating] = useState<number | null>(null);
    const [status, setStatus] = useState<string | null>(null);

    async function submit() {
        try {
            const res = await fetch(`/api/diary`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ album_id: albumId, review_body: body, rating }),
            });
            if (res.ok) {
                setStatus("✅ Ajouté !");
                setBody("");
                setRating(null);
            } else {
                const err = await res.json();
                setStatus(`❌ ${err.error || "Erreur"}`);
            }
        } catch (e: any) {
            setStatus(`❌ ${e.message}`);
        }
    }

    return (
        <div className="mt-3 space-y-2">
      <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Note rapide…"
          className="w-full border rounded p-2 text-sm"
      />
            <input
                type="number"
                min={0}
                max={10}
                value={rating ?? ""}
                onChange={(e) => setRating(Number(e.target.value))}
                placeholder="Note /10"
                className="w-20 border rounded p-1"
            />
            <button
                onClick={submit}
                className="px-3 py-1 bg-emerald-600 text-white rounded text-sm"
            >
                Ajouter au journal
            </button>
            {status && <p className="text-xs">{status}</p>}
        </div>
    );
}

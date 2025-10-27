"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

export type SuggestItem =
    | { type: "artist"; id: string; label: string; sublabel: string | null; cover_url: null }
    | { type: "album"; id: string; label: string; sublabel: string | null; cover_url: string | null }
    | { type: "track"; id: string; label: string; sublabel: string | null; cover_url: null }
    | { type: "user"; id: string; label: string; sublabel: string | null; cover_url: string | null };

type Props = {
    apiBase?: string;
    limit?: number;
    types?: Array<"artist" | "album" | "track" | "user">;
    onSelect?: (item: SuggestItem) => void;
    placeholder?: string;
    className?: string;
};

export default function SearchAutocomplete({
                                               apiBase = "/api",
                                               limit = 10,
                                               types = ["artist", "album", "track", "user"],
                                               onSelect,
                                               placeholder = "Rechercher un album, artiste, piste ou utilisateur…",
                                               className = "",
                                           }: Props) {
    const [q, setQ] = useState("");
    const [items, setItems] = useState<SuggestItem[]>([]);
    const [open, setOpen] = useState(false);
    const [highlight, setHighlight] = useState<number>(-1);
    const [loading, setLoading] = useState(false);
    const abortRef = useRef<AbortController | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    const qs = useMemo(() => {
        const p = new URLSearchParams();
        p.set("q", q);
        p.set("limit", String(limit));
        if (types.length && types.length < 4) p.set("types", types.join(","));
        return p.toString();
    }, [q, limit, types]);

    useEffect(() => {
        if (!q.trim()) {
            setItems([]);
            setOpen(false);
            return;
        }
        const t = setTimeout(async () => {
            try {
                abortRef.current?.abort();
                const ac = new AbortController();
                abortRef.current = ac;
                setLoading(true);
                const res = await fetch(`${apiBase}/search/suggest?${qs}`, {
                    signal: ac.signal,
                    credentials: "include",
                });
                if (!res.ok) throw new Error("suggest_failed");
                const json = (await res.json()) as { items: SuggestItem[] };
                setItems(json.items ?? []);
                setOpen(true);
                setHighlight(json.items?.length ? 0 : -1);
            } catch {
                if (!q.trim()) return;
                setItems([]);
                setOpen(false);
            } finally {
                setLoading(false);
            }
        }, 200);
        return () => clearTimeout(t);
    }, [apiBase, qs, q]);

    const choose = (item: SuggestItem) => {
        setOpen(false);
        setHighlight(-1);
        setQ(item.label);
        onSelect?.(item);
    };

    return (
        <div className={`relative w-full ${className}`} role="combobox" aria-expanded={open}>
            {/* Barre de recherche */}
            <div className="flex items-center gap-2 rounded-xl border border-neutral-800 px-3 py-2 bg-neutral-900 shadow-md shadow-emerald-900/20 focus-within:ring-1 focus-within:ring-emerald-400 transition">
                <svg width="18" height="18" viewBox="0 0 24 24" className="text-gray-400">
                    <path
                        d="M21 21l-4.3-4.3M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    />
                </svg>
                <input
                    ref={inputRef}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-transparent outline-none text-gray-200 placeholder-gray-500 text-sm"
                />
                {loading && <div className="animate-pulse text-emerald-400 text-sm">…</div>}
            </div>

            {/* Suggestions */}
            {open && items.length > 0 && (
                <ul
                    id="ac-list"
                    ref={listRef}
                    role="listbox"
                    className="absolute z-50 mt-2 w-full max-h-80 overflow-auto rounded-xl border border-neutral-800 bg-neutral-950 shadow-lg"
                >
                    {items.map((it, idx) => (
                        <li
                            key={`${it.type}-${it.id}`}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                choose(it);
                            }}
                            className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition ${
                                idx === highlight ? "bg-neutral-800" : "hover:bg-neutral-900"
                            }`}
                        >
                            <div className="h-8 w-8 rounded-md overflow-hidden flex items-center justify-center bg-neutral-800 shrink-0">
                                {it.type === "album" && it.cover_url ? (
                                    <img src={it.cover_url} alt="" className="h-full w-full object-cover" />
                                ) : it.type === "user" && it.cover_url ? (
                                    <img src={it.cover_url} alt="" className="h-full w-full object-cover rounded-full" />
                                ) : (
                                    <span className="text-xs uppercase opacity-60 text-gray-400">
                    {it.type[0]}
                  </span>
                                )}
                            </div>
                            <div className="min-w-0">
                                <div className="text-sm font-medium text-gray-200 truncate">{it.label}</div>
                                <div className="text-xs text-gray-500 truncate">
                                    {it.type === "artist"
                                        ? "Artiste"
                                        : it.type === "album"
                                            ? "Album"
                                            : it.type === "track"
                                                ? "Piste"
                                                : "Utilisateur"}
                                    {it.sublabel ? ` · ${it.sublabel}` : ""}
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

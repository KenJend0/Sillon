"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { searchInternal } from "@/app/actions/search";
import { searchMusicBrainzAlbums, importAlbumFromMusicBrainz } from "@/app/actions/musicbrainz";
import { showToast } from "@/components/Toast";

type AlbumUI = {
    id: string;
    title: string;
    artist_name: string;
    coverUrl?: string | null;
    year?: number | null;
};

type MbAlbumUI = {
    mbid: string;
    title: string;
    artist_name: string;
    coverUrl?: string | null;
};

type AlbumSearchForDiaryProps = {
    onSelectAlbum: (album: AlbumUI) => void;
};

export default function AlbumSearchForDiary({ onSelectAlbum }: AlbumSearchForDiaryProps) {
    const [q, setQ] = useState("");
    const [suggestions, setSuggestions] = useState<AlbumUI[]>([]);
    const [mbSuggestions, setMbSuggestions] = useState<MbAlbumUI[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMB, setLoadingMB] = useState(false);
    const [importingMbid, setImportingMbid] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!q.trim()) {
            setSuggestions([]);
            setMbSuggestions([]);
            setIsOpen(false);
            return;
        }

        const t = setTimeout(async () => {
            try {
                setLoading(true);
                setMbSuggestions([]);
                const results = await searchInternal(q, "albums");

                const albums = results
                    .filter(r => r.kind === "album")
                    .map((item) => ({
                        id: item.id,
                        title: item.title,
                        artist_name: item.subtitle || "Unknown Artist",
                        coverUrl: item.coverUrl || null,
                        year: item.releaseDate
                            ? new Date(item.releaseDate).getFullYear()
                            : undefined,
                    }));

                setSuggestions(albums);
                setIsOpen(true);

                // Recherche MusicBrainz si peu de résultats internes
                if (albums.length < 3 && q.trim().length >= 2) {
                    setLoadingMB(true);
                    try {
                        const mbResult = await searchMusicBrainzAlbums(q, 5);
                        if (mbResult.success && mbResult.results) {
                            const internalTitles = new Set(albums.map(a => a.title.toLowerCase()));
                            const mbAlbums: MbAlbumUI[] = mbResult.results
                                .filter(r => !internalTitles.has(r.title.toLowerCase()))
                                .slice(0, 5)
                                .map(r => ({
                                    mbid: r.id,
                                    title: r.title,
                                    artist_name: r.artistName || "Unknown Artist",
                                    coverUrl: r.coverUrl || null,
                                }));
                            setMbSuggestions(mbAlbums);
                        }
                    } catch {
                        // MB search failure is silent — internal results are still shown
                    } finally {
                        setLoadingMB(false);
                    }
                }
            } catch (error) {
                console.error("Search error:", error);
                showToast("Erreur lors de la recherche", "error");
                setSuggestions([]);
                setIsOpen(false);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(t);
    }, [q]);

    const handleSelectAlbum = (album: AlbumUI) => {
        onSelectAlbum(album);
        setQ("");
        setSuggestions([]);
        setMbSuggestions([]);
        setIsOpen(false);
    };

    const handleSelectMbAlbum = async (mb: MbAlbumUI) => {
        setImportingMbid(mb.mbid);
        try {
            const result = await importAlbumFromMusicBrainz(mb.mbid);
            if (result.success && result.albumId) {
                onSelectAlbum({
                    id: result.albumId,
                    title: mb.title,
                    artist_name: mb.artist_name,
                    coverUrl: mb.coverUrl,
                });
                setQ("");
                setSuggestions([]);
                setMbSuggestions([]);
                setIsOpen(false);
            } else {
                showToast("Erreur lors de l'import", "error");
            }
        } catch {
            showToast("Erreur lors de l'import", "error");
        } finally {
            setImportingMbid(null);
        }
    };

    const hasResults = suggestions.length > 0 || mbSuggestions.length > 0 || loadingMB;

    return (
        <div ref={containerRef} className="relative w-full">
            <input
                ref={inputRef}
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onFocus={() => q.trim() && setIsOpen(true)}
                placeholder="Rechercher un album..."
                className="w-full px-4 py-3 bg-background-secondary border border-border rounded-[10px] text-text-primary placeholder-text-tertiary focus:outline-none focus:border-[#8E6F5E] focus:ring-0"
            />

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-[12px] z-50 max-h-96 overflow-y-auto">
                    {loading && <div className="p-4 text-center text-[14px] text-text-tertiary">Chargement...</div>}

                    {!loading && !hasResults && q.trim() && (
                        <div className="p-4 text-center text-[14px] text-text-tertiary">
                            Aucun résultat
                        </div>
                    )}

                    {/* Résultats internes */}
                    {!loading && suggestions.length > 0 && (
                        <div>
                            {suggestions.map((album) => (
                                <button
                                    key={album.id}
                                    onClick={() => handleSelectAlbum(album)}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-background-secondary transition-colors duration-150 border-b border-border-divider last:border-b-0 text-left"
                                >
                                    {album.coverUrl && (
                                        <div className="w-12 h-12 rounded-[8px] overflow-hidden relative flex-shrink-0">
                                            <Image src={album.coverUrl} alt={album.title} fill className="object-cover" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-[14px] text-text-primary truncate">{album.title}</div>
                                        <div className="text-[12px] text-text-secondary truncate">{album.artist_name}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Résultats MusicBrainz */}
                    {!loading && (mbSuggestions.length > 0 || loadingMB) && (
                        <div>
                            <p className="px-3 pt-3 pb-1 text-[11px] text-text-tertiary font-medium uppercase tracking-[0.08em]">
                                Résultats étendus
                            </p>

                            {loadingMB && (
                                <div className="px-3 py-2 text-[13px] text-text-tertiary">Recherche en cours…</div>
                            )}

                            {mbSuggestions.map((mb) => (
                                <button
                                    key={mb.mbid}
                                    onClick={() => !importingMbid && handleSelectMbAlbum(mb)}
                                    disabled={!!importingMbid}
                                    className={`w-full flex items-center gap-3 p-3 border-b border-border-divider last:border-b-0 text-left transition-colors duration-150 ${
                                        importingMbid === mb.mbid
                                            ? 'cursor-wait bg-background-secondary'
                                            : importingMbid
                                            ? 'opacity-50 cursor-default'
                                            : 'hover:bg-background-secondary'
                                    }`}
                                >
                                    {importingMbid === mb.mbid ? (
                                        <div className="flex items-center gap-2 py-1">
                                            <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-[#8E6F5E] flex-shrink-0" />
                                            <span className="text-[14px] text-text-secondary">Import en cours…</span>
                                        </div>
                                    ) : (
                                        <>
                                            {mb.coverUrl && (
                                                <div className="w-12 h-12 rounded-[8px] overflow-hidden relative flex-shrink-0">
                                                    <Image src={mb.coverUrl} alt={mb.title} fill className="object-cover" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-[14px] text-text-primary truncate">{mb.title}</div>
                                                <div className="text-[12px] text-text-secondary truncate">{mb.artist_name}</div>
                                            </div>
                                        </>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

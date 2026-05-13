"use client";

import { useState, useEffect, useRef } from "react";
import { searchInternal } from "@/app/actions/search";
import { searchMusicBrainzRecordings, importTrackFromMusicBrainz } from "@/app/actions/musicbrainz";
import { showToast } from "@/components/Toast";
import { CoverImage } from "@/components/CoverImage";

export type TrackUI = {
    id: string;
    title: string;
    artist_name: string;
    album_id: string;
    album_title: string;
    artist_id: string;
    coverUrl?: string | null;
};

type MbTrackUI = {
    recordingMbid: string;
    releaseId: string;
    title: string;
    artistName: string;
    albumTitle: string;
    coverUrl?: string | null;
};

type Props = {
    onSelectTrack: (track: TrackUI) => void;
};

export default function TrackSearchForDiary({ onSelectTrack }: Props) {
    const [q, setQ] = useState("");
    const [suggestions, setSuggestions] = useState<TrackUI[]>([]);
    const [mbSuggestions, setMbSuggestions] = useState<MbTrackUI[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMB, setLoadingMB] = useState(false);
    const [importingMbid, setImportingMbid] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);
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
                setLoadingMB(true);
                setMbSuggestions([]);

                const [internalResults, mbResult] = await Promise.all([
                    searchInternal(q, "tracks"),
                    q.trim().length >= 2
                        ? searchMusicBrainzRecordings(q, 5).catch(() => null)
                        : Promise.resolve(null),
                ]);

                const tracks = internalResults
                    .filter(r => r.kind === "track")
                    .map((item) => {
                        const parts = (item.subtitle || "").split(" · ");
                        return {
                            id: item.id,
                            title: item.title,
                            artist_name: parts[0] || "Unknown",
                            album_id: item.trackAlbumId || "",
                            album_title: parts[1] || "",
                            artist_id: item.trackArtistId || "",
                            coverUrl: item.coverUrl || null,
                        };
                    });

                setSuggestions(tracks);
                setIsOpen(true);

                if (mbResult?.success && mbResult.results) {
                    const internalTitles = new Set(tracks.map(t => t.title.toLowerCase()));
                    const mbTracks: MbTrackUI[] = mbResult.results
                        .filter(r => !internalTitles.has(r.title.toLowerCase()))
                        .slice(0, 5)
                        .map(r => ({
                            recordingMbid: r.mbid,
                            releaseId: r.releaseId,
                            title: r.title,
                            artistName: r.artistName,
                            albumTitle: r.albumTitle,
                            coverUrl: r.coverUrl || null,
                        }));
                    setMbSuggestions(mbTracks);
                }
            } catch {
                showToast("Erreur lors de la recherche", "error");
                setSuggestions([]);
                setIsOpen(false);
            } finally {
                setLoading(false);
                setLoadingMB(false);
            }
        }, 300);

        return () => clearTimeout(t);
    }, [q]);

    const handleSelectTrack = (track: TrackUI) => {
        onSelectTrack(track);
        setQ("");
        setSuggestions([]);
        setMbSuggestions([]);
        setIsOpen(false);
    };

    const handleSelectMbTrack = async (mb: MbTrackUI) => {
        setImportingMbid(mb.recordingMbid);
        try {
            const result = await importTrackFromMusicBrainz(mb.recordingMbid, mb.releaseId, mb.title);
            if (result.success && result.trackId) {
                onSelectTrack({
                    id: result.trackId,
                    title: mb.title,
                    artist_name: mb.artistName,
                    album_id: result.albumId || "",
                    album_title: mb.albumTitle,
                    artist_id: result.artistId || "",
                    coverUrl: mb.coverUrl,
                });
                setQ("");
                setSuggestions([]);
                setMbSuggestions([]);
                setIsOpen(false);
            } else {
                showToast("Erreur lors de l'import du titre", "error");
            }
        } catch {
            showToast("Erreur lors de l'import du titre", "error");
        } finally {
            setImportingMbid(null);
        }
    };

    const hasResults = suggestions.length > 0 || mbSuggestions.length > 0 || loadingMB;

    return (
        <div ref={containerRef} className="relative w-full">
            <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onFocus={() => q.trim() && setIsOpen(true)}
                placeholder="Rechercher un titre..."
                className="w-full px-4 py-3 bg-background-secondary border border-border rounded-[10px] text-text-primary placeholder-text-tertiary focus:outline-none focus:border-[#8E6F5E] focus:ring-0"
            />

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-[12px] z-50 max-h-96 overflow-y-auto">
                    {loading && <div className="p-4 text-center text-[14px] text-text-tertiary">Chargement...</div>}

                    {!loading && !hasResults && q.trim() && (
                        <div className="p-4 text-center text-[14px] text-text-tertiary">Aucun résultat</div>
                    )}

                    {!loading && suggestions.length > 0 && (
                        <div>
                            {suggestions.map((track) => (
                                <button
                                    key={track.id}
                                    onClick={() => handleSelectTrack(track)}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-background-secondary transition-colors duration-150 border-b border-border-divider last:border-b-0 text-left"
                                >
                                    <div className="w-12 h-12 rounded-[8px] overflow-hidden relative flex-shrink-0 bg-background-tertiary flex items-center justify-center">
                                        {track.coverUrl && (
                                            <CoverImage
                                                src={track.coverUrl}
                                                alt={track.title}
                                                fill
                                                className="object-cover"
                                                placeholder={<span className="text-[10px] text-text-disabled">♪</span>}
                                            />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-[14px] text-text-primary truncate">{track.title}</div>
                                        <div className="text-[12px] text-text-secondary truncate">
                                            {track.artist_name}
                                            {track.album_title && <span className="text-text-tertiary"> · {track.album_title}</span>}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

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
                                    key={mb.recordingMbid}
                                    onClick={() => !importingMbid && handleSelectMbTrack(mb)}
                                    disabled={!!importingMbid}
                                    className={`w-full flex items-center gap-3 p-3 border-b border-border-divider last:border-b-0 text-left transition-colors duration-150 ${
                                        importingMbid === mb.recordingMbid
                                            ? 'cursor-wait bg-background-secondary'
                                            : importingMbid
                                            ? 'opacity-50 cursor-default'
                                            : 'hover:bg-background-secondary'
                                    }`}
                                >
                                    {importingMbid === mb.recordingMbid ? (
                                        <div className="flex items-center gap-2 py-1">
                                            <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-[#8E6F5E] flex-shrink-0" />
                                            <span className="text-[14px] text-text-secondary">Import en cours…</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-12 h-12 rounded-[8px] overflow-hidden relative flex-shrink-0 bg-background-tertiary flex items-center justify-center">
                                                {mb.coverUrl && (
                                                    <CoverImage
                                                        src={mb.coverUrl}
                                                        alt={mb.title}
                                                        fill
                                                        className="object-cover"
                                                        placeholder={<span className="text-[10px] text-text-disabled">♪</span>}
                                                    />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-[14px] text-text-primary truncate">{mb.title}</div>
                                                <div className="text-[12px] text-text-secondary truncate">
                                                    {mb.artistName}
                                                    {mb.albumTitle && <span className="text-text-tertiary"> · {mb.albumTitle}</span>}
                                                </div>
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

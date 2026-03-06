"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AlbumSearchForDiary from "@/components/AlbumSearchForDiary";
import StarRating from "@/components/StarRating";
import { useAuth } from "@/lib/AuthContext";
import { upsertDiaryEntry } from "@/app/actions/diary";
import { saveAlbumOnce } from "@/app/actions/saved-albums";
import { showToast } from "@/components/Toast";

type Mode = "diary" | "save";

type SelectedAlbum = {
    id: string;
    title: string;
    artist_name: string;
    coverUrl?: string | null;
    year?: number | null;
};

export default function AddPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) router.push("/auth");
    }, [loading, user, router]);

    const today = new Date().toISOString().split("T")[0];

    const [mode, setMode] = useState<Mode>("diary");
    const [step, setStep] = useState<"select" | "form">("select");
    const [selectedAlbum, setSelectedAlbum] = useState<SelectedAlbum | null>(null);
    const [rating, setRating] = useState<number | null>(null);
    const [listenedAt, setListenedAt] = useState(today);
    const [comment, setComment] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleModeChange = (newMode: Mode) => {
        setMode(newMode);
        setStep("select");
        setSelectedAlbum(null);
        setRating(null);
        setListenedAt(today);
        setComment("");
    };

    const handleAlbumSelect = async (album: SelectedAlbum) => {
        if (mode === "save") {
            setIsLoading(true);
            try {
                await saveAlbumOnce(album.id);
                showToast("Album mis de côté", "success");
                router.push("/me?tab=saved");
            } catch {
                showToast("Erreur lors de la sauvegarde", "error");
                setIsLoading(false);
            }
        } else {
            setSelectedAlbum(album);
            setStep("form");
        }
    };

    const handleSubmitDiary = async () => {
        if (!selectedAlbum || !listenedAt) return;

        setIsLoading(true);
        try {
            const result = await upsertDiaryEntry({
                albumId: selectedAlbum.id,
                listenedAt,
                rating: rating ?? 0,
                reviewBody: comment.trim() || undefined,
                isPublic: true,
            });

            if (result.success) {
                showToast("Écoute enregistrée", "success");
                if (result.data?.id) {
                    router.replace(`/diary/${result.data.id}`);
                }
            } else {
                showToast(result.error || "Erreur lors de l'enregistrement", "error");
                setIsLoading(false);
            }
        } catch {
            showToast("Erreur lors de l'enregistrement", "error");
            setIsLoading(false);
        }
    };

    if (loading) {
        return (
            <main className="p-6 pb-20 max-w-page mx-auto text-center pt-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8E6F5E] mx-auto" />
            </main>
        );
    }

    if (!user) return null;

    return (
        <>
            <div className="p-6 pb-0">
                <div className="max-w-page mx-auto">
                    <h1 className="text-h1 text-text-primary mb-2">Ajouter</h1>
                    <p className="text-[14px] text-text-secondary mb-6">
                        {mode === "diary"
                            ? "Cherche un album que tu as écouté pour l'ajouter à ton journal."
                            : "Garde un album de côté pour l'écouter plus tard."}
                    </p>

                    {/* Toggle */}
                    <div className="flex bg-background-secondary rounded-[10px] p-1 mb-8">
                        <button
                            onClick={() => handleModeChange("diary")}
                            className={`flex-1 py-2 text-[14px] font-medium rounded-[8px] transition-colors duration-150 ${
                                mode === "diary"
                                    ? "bg-background text-text-primary"
                                    : "text-text-secondary hover:text-text-primary"
                            }`}
                        >
                            J'ai écouté
                        </button>
                        <button
                            onClick={() => handleModeChange("save")}
                            className={`flex-1 py-2 text-[14px] font-medium rounded-[8px] transition-colors duration-150 ${
                                mode === "save"
                                    ? "bg-background text-text-primary"
                                    : "text-text-secondary hover:text-text-primary"
                            }`}
                        >
                            Je veux écouter
                        </button>
                    </div>
                </div>
            </div>

            <main className="p-6 pb-20">
                <div className="max-w-page mx-auto">
                    {isLoading && mode === "save" && (
                        <div className="text-center pt-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8E6F5E] mx-auto" />
                        </div>
                    )}

                    {!isLoading && step === "select" && (
                        <AlbumSearchForDiary onSelectAlbum={handleAlbumSelect} />
                    )}

                    {step === "form" && selectedAlbum && mode === "diary" && (
                        <div className="space-y-section-md">
                            {/* Album sélectionné */}
                            <div className="pb-6 border-b border-border">
                                <h2 className="text-h2 font-medium text-text-primary mb-1">
                                    {selectedAlbum.title}
                                </h2>
                                <p className="text-meta text-text-secondary mb-4">
                                    {selectedAlbum.artist_name}
                                    {selectedAlbum.year ? ` · ${selectedAlbum.year}` : ""}
                                </p>
                                <button
                                    onClick={() => { setStep("select"); setSelectedAlbum(null); }}
                                    className="text-label text-text-tertiary underline hover:text-text-primary transition-colors duration-150"
                                >
                                    Changer
                                </button>
                            </div>

                            {/* Note */}
                            <div>
                                <label className="block text-meta text-text-secondary mb-4">Note</label>
                                <div className="flex items-center gap-3">
                                    <StarRating value={rating} onChange={setRating} />
                                    <span className="text-text-primary font-medium whitespace-nowrap">
                                        {rating ?? 0} / 10
                                    </span>
                                </div>
                            </div>

                            {/* Date */}
                            <div>
                                <label className="block text-meta text-text-secondary mb-2">Date d'écoute</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={listenedAt}
                                        max={today}
                                        onChange={(e) => setListenedAt(e.target.value)}
                                        className="w-full px-4 py-3 pr-10 bg-background-secondary border border-border rounded-[10px] text-text-primary focus:outline-none focus:border-[#8E6F5E] focus:ring-0 appearance-none"
                                    />
                                    <svg aria-hidden="true" viewBox="0 0 24 24" className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary pointer-events-none">
                                        <path fill="currentColor" d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 1-1Zm12 8H5v9h14v-9ZM5 6v2h14V6H5Z" />
                                    </svg>
                                </div>
                            </div>

                            {/* Commentaire */}
                            <div>
                                <label className="block text-meta text-text-secondary mb-2">Quelques mots</label>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Ce que tu as ressenti, si tu en as envie."
                                    className="w-full px-4 py-3 bg-background-secondary border border-border rounded-[10px] text-text-primary placeholder-text-tertiary focus:outline-none focus:border-[#8E6F5E] focus:ring-0 resize-none h-32"
                                />
                            </div>

                            <button
                                onClick={handleSubmitDiary}
                                disabled={isLoading}
                                className="w-full px-6 py-3 bg-[#1C1C1C] hover:opacity-85 disabled:bg-[#D8D3CB] disabled:text-text-disabled text-[#F5F3EF] font-medium rounded-[8px] transition-opacity disabled:cursor-not-allowed"
                            >
                                {isLoading ? "Enregistrement..." : "Enregistrer"}
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}

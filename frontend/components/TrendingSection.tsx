"use client";

import { useState } from "react";
import Link from "next/link";
import DiscoverCard from "@/components/DiscoverCard";
import { CoverImage } from "@/components/CoverImage";
import { type TrendingAlbum } from "@/app/actions/explore";
import { type TrackWithStats } from "@/app/actions/track-diary";

function TrackCard({ track }: { track: TrackWithStats }) {
    return (
        <Link href={`/tracks/${track.track_id}`} className="group flex-shrink-0 w-36 sm:w-40">
            <div className="aspect-square rounded-[8px] overflow-hidden bg-background-secondary relative mb-2">
                {track.cover_url ? (
                    <CoverImage
                        src={track.cover_url}
                        alt={track.track_title}
                        fill
                        className="object-cover group-hover:opacity-80 transition-opacity"
                        placeholder={
                            <div className="w-full h-full bg-background-tertiary flex items-center justify-center">
                                <span className="text-text-disabled text-2xl">♪</span>
                            </div>
                        }
                    />
                ) : (
                    <div className="w-full h-full bg-background-tertiary flex items-center justify-center">
                        <span className="text-text-disabled text-2xl">♪</span>
                    </div>
                )}
            </div>
            <p className="text-[13px] text-text-primary font-medium truncate leading-snug group-hover:text-[#8E6F5E] transition-colors">
                {track.track_title}
            </p>
            <p className="text-[11px] text-text-tertiary truncate">{track.artist_name}</p>
        </Link>
    );
}

type Props = {
    albums: TrendingAlbum[];
    tracks: TrackWithStats[];
};

export default function TrendingSection({ albums, tracks }: Props) {
    const [tab, setTab] = useState<"albums" | "titres">("albums");

    if (albums.length === 0 && tracks.length === 0) return null;

    return (
        <section>
            <div className="flex items-start justify-between mb-3">
                <div>
                    <h2 className="text-h2 text-text-primary">Tendances</h2>
                    <p className="text-[13px] text-text-secondary mt-1">
                        Ce que la communauté écoute en ce moment.
                    </p>
                </div>
                <Link
                    href="/explore/tendances"
                    className="text-[13px] text-text-secondary hover:text-text-primary transition-colors shrink-0 pt-0.5"
                >
                    Voir tout
                </Link>
            </div>

            <div className="flex gap-1.5 mb-5">
                {(["albums", "titres"] as const).map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors ${
                            tab === t
                                ? "bg-text-primary text-background"
                                : "bg-background-secondary text-text-secondary hover:text-text-primary"
                        }`}
                    >
                        {t === "albums" ? "Albums" : "Titres"}
                    </button>
                ))}
            </div>

            {tab === "albums" && (
                albums.length > 0 ? (
                    <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
                        {albums.map((item) => (
                            <div key={item.id} className="snap-center shrink-0 w-44 sm:w-48 md:w-52 lg:w-60">
                                <DiscoverCard item={item} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-text-tertiary text-[14px]">Rien pour le moment.</p>
                )
            )}

            {tab === "titres" && (
                tracks.length > 0 ? (
                    <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
                        {tracks.map((track) => (
                            <div key={track.track_id} className="snap-center">
                                <TrackCard track={track} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-text-tertiary text-[14px]">Rien pour le moment.</p>
                )
            )}
        </section>
    );
}

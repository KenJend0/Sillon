"use client";

import { useState } from "react";
import Link from "next/link";
import DiscoverCard from "@/components/DiscoverCard";
import { CoverImage } from "@/components/CoverImage";
import { type TrendingAlbum } from "@/app/actions/explore";
import { type TrackWithStats } from "@/app/actions/track-diary";

function TrackCard({ track, rank }: { track: TrackWithStats; rank?: number }) {
    return (
        <Link href={`/tracks/${track.track_id}`} className="group block w-full">
            <div className="aspect-square rounded-[8px] overflow-hidden bg-background-secondary relative mb-2">
                {rank !== undefined && (
                    <span className="absolute top-0 left-1 z-10 font-display italic text-[40px] leading-none text-accent pointer-events-none select-none" style={{ textShadow: '0 1px 0 #FAF8F4, 1px 1px 0 #FAF8F4, -1px 1px 0 #FAF8F4' }}>
                        {rank}
                    </span>
                )}
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
            <p className="font-display font-normal text-sm text-text-warm line-clamp-2 leading-snug group-hover:text-accent transition-colors duration-150">
                {track.track_title}
            </p>
            <p className="text-label text-text-tertiary truncate">{track.artist_name}</p>
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
                    <h2 className="text-h2 text-text-primary">
                        <em className="font-display italic text-accent-deep">Tendances</em> de la semaine
                    </h2>
                    <p className="text-sm text-text-secondary mt-1">
                        Ce que la communauté écoute en ce moment.
                    </p>
                </div>
                <Link
                    href="/explore/tendances"
                    className="font-display italic text-sm text-accent border-b border-accent pb-px shrink-0 hover:text-accent-deep hover:border-accent-deep transition-colors mt-1"
                >
                    voir tout
                </Link>
            </div>

            <div className="flex gap-1.5 mb-5">
                {(["albums", "titres"] as const).map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-3 py-1 rounded-full text-label font-medium transition-colors ${
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
                    <>
                        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide lg:hidden">
                            {albums.slice(0, 5).map((item, index) => (
                                <div key={item.id} className="snap-center shrink-0 w-44 sm:w-48 md:w-52">
                                    <DiscoverCard item={item} rank={index + 1} />
                                </div>
                            ))}
                        </div>
                        <div className="hidden lg:grid lg:grid-cols-5 gap-4">
                            {albums.slice(0, 5).map((item, index) => (
                                <DiscoverCard key={item.id} item={item} rank={index + 1} />
                            ))}
                        </div>
                    </>
                ) : (
                    <p className="text-text-tertiary text-meta">Rien pour le moment.</p>
                )
            )}

            {tab === "titres" && (
                tracks.length > 0 ? (
                    <>
                        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide lg:hidden">
                            {tracks.slice(0, 5).map((track, index) => (
                                <div key={track.track_id} className="snap-center shrink-0 w-44 sm:w-48 md:w-52">
                                    <TrackCard track={track} rank={index + 1} />
                                </div>
                            ))}
                        </div>
                        <div className="hidden lg:grid lg:grid-cols-5 gap-4">
                            {tracks.slice(0, 5).map((track, index) => (
                                <TrackCard key={track.track_id} track={track} rank={index + 1} />
                            ))}
                        </div>
                    </>
                ) : (
                    <p className="text-text-tertiary text-meta">Rien pour le moment.</p>
                )
            )}
        </section>
    );
}

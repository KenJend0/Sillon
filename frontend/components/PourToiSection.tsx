"use client";

import { useState } from "react";
import Link from "next/link";
import { type ForYouAlbum, type ForYouTrack } from "@/app/actions/explore";
import { CoverImage } from "@/components/CoverImage";

function AlbumCard({ album }: { album: ForYouAlbum }) {
    return (
        <Link href={`/albums/${album.album_id}`} className="block group">
            <div className="rounded-[10px] overflow-hidden bg-background-secondary mb-2 aspect-square relative">
                {album.cover_url ? (
                    <CoverImage
                        src={album.cover_url}
                        alt={album.title}
                        fill
                        className="object-cover"
                        placeholder={<div className="w-full h-full bg-background-tertiary" />}
                    />
                ) : (
                    <div className="w-full h-full bg-background-tertiary" />
                )}
            </div>
            <p className="font-display font-normal text-sm text-text-warm line-clamp-2 leading-snug group-hover:text-accent transition-colors duration-150">
                {album.title}
            </p>
            <p className="text-label text-text-tertiary truncate mt-0.5">
                {album.artist}
            </p>
        </Link>
    );
}

function TrackCard({ track }: { track: ForYouTrack }) {
    return (
        <Link href={`/tracks/${track.track_id}`} className="block group">
            <div className="rounded-[10px] overflow-hidden bg-background-secondary mb-2 aspect-square relative">
                {track.cover_url ? (
                    <CoverImage
                        src={track.cover_url}
                        alt={track.track_title}
                        fill
                        className="object-cover"
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
            <p className="text-label text-text-tertiary truncate mt-0.5">
                {track.artist}
            </p>
        </Link>
    );
}

type Props = {
    albums: ForYouAlbum[];
    tracks: ForYouTrack[];
};

export default function PourToiSection({ albums, tracks }: Props) {
    const [tab, setTab] = useState<"albums" | "titres">("albums");

    if (albums.length === 0 && tracks.length === 0) return null;

    return (
        <section>
            <div className="flex items-start justify-between mb-3">
                <div>
                    <h2 className="text-h2 text-text-primary">
                        Pour <em className="italic text-accent-deep">toi</em>
                    </h2>
                    <p className="text-sm text-text-secondary mt-1">
                        Reviens demain pour une nouvelle sélection.
                    </p>
                </div>
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
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 lg:gap-4">
                        {albums.slice(0, 6).map((album) => (
                            <AlbumCard key={album.album_id} album={album} />
                        ))}
                    </div>
                ) : (
                    <p className="text-text-tertiary text-meta">Pas encore de recommandations.</p>
                )
            )}

            {tab === "titres" && (
                tracks.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 lg:gap-4">
                        {tracks.slice(0, 6).map((track) => (
                            <TrackCard key={track.track_id} track={track} />
                        ))}
                    </div>
                ) : (
                    <p className="text-text-tertiary text-meta">Pas encore de recommandations.</p>
                )
            )}
        </section>
    );
}

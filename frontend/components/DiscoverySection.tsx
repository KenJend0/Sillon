"use client";

import { useEffect, useState } from "react";
import { getDiscoveryAlbums, type DiscoveryAlbum } from "@/app/actions/explore";
import DiscoverCard from "@/components/DiscoverCard";

export default function DiscoverySection() {
    const [albums, setAlbums] = useState<DiscoveryAlbum[] | null>(null);

    useEffect(() => {
        getDiscoveryAlbums().then(setAlbums);
    }, []);

    if (!albums || albums.length === 0) return null;

    return (
        <section>
            <div className="mb-5">
                <h2 className="text-h2 text-text-primary mb-2">Découverte</h2>
            </div>
            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2">
                {albums.map((album) => (
                    <div key={album.album_id} className="snap-center shrink-0 w-44 sm:w-48 md:w-52">
                        <DiscoverCard
                            item={{
                                id: `discovery-${album.album_id}`,
                                album_id: album.album_id,
                                album_title: album.title,
                                artist_name: album.artist,
                                cover_url: album.cover_url,
                                discover_kind: "discovery",
                            }}
                        />
                    </div>
                ))}
            </div>
        </section>
    );
}

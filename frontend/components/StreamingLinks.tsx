"use client";

import { useEffect, useState } from "react";

type Links = {
    spotify?: string | null;
    appleMusic?: string | null;
    deezer?: string | null;
    tidal?: string | null;
};

type Props = {
    albumId: string;
    initial: Links;
};

export default function StreamingLinks({ albumId, initial }: Props) {
    const [links, setLinks] = useState<Links>(initial);

    const hasAny = !!(initial.spotify || initial.appleMusic || initial.deezer || initial.tidal);

    useEffect(() => {
        if (hasAny) return; // already have links from DB, no need to fetch

        fetch(`/api/albums/${albumId}/streaming`)
            .then((r) => r.ok ? r.json() : null)
            .then((data) => {
                if (data) setLinks(data);
            })
            .catch(() => {});
    }, [albumId, hasAny]);

    const visibleLinks = [
        { key: "spotify", label: "Spotify", href: links.spotify },
        { key: "appleMusic", label: "Apple Music", href: links.appleMusic },
        { key: "deezer", label: "Deezer", href: links.deezer },
        { key: "tidal", label: "Tidal", href: links.tidal },
    ].filter((s) => s.href);

    if (visibleLinks.length === 0) return null;

    return (
        <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12px] text-text-tertiary">Écouter sur</span>
            {visibleLinks.map((s, i) => (
                <span key={s.key} className="flex items-center gap-2">
                    <a
                        href={s.href!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[12px] text-text-secondary hover:text-text-primary transition-colors duration-150"
                    >
                        {s.label}
                    </a>
                    {i < visibleLinks.length - 1 && (
                        <span className="text-[12px] text-text-disabled">·</span>
                    )}
                </span>
            ))}
        </div>
    );
}

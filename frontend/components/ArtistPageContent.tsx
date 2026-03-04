'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { importAlbumFromMusicBrainz } from '@/app/actions/musicbrainz';
import { showToast } from '@/components/Toast';

type Album = {
    id: string;
    title: string;
    cover_url: string | null;
    release_date: string | null;
    track_count: number;
    avg_rating?: number | null;
    reviews_count?: number;
};

type Artist = {
    id: string;
    name: string;
    mbid: string | null;
};

type MBRelease = {
    mbid: string;
    releaseGroupMbid: string;
    title: string;
    date?: string | null;
    type?: string | null;
};

type DiscographyItem = {
    title: string;
    date?: string | null;
    cover?: string | null;
    coverFromArchive?: boolean;
    releaseGroupMbid?: string;
    href: string;
    inDatabase: boolean;
    avgRating?: number | null;
    reviewsCount?: number;
    mbid?: string;
};

type ArtistPageContentProps = {
    artist?: Artist;
    albums?: Album[];
    previewName?: string;
    previewMbid?: string;
    previewCountry?: string;
    previewType?: string;
    imageUrl?: string | null;
    mbReleases?: MBRelease[];
};

export function ArtistPageContent({
    artist,
    albums = [],
    previewName,
    previewMbid,
    previewCountry,
    previewType,
    imageUrl,
    mbReleases = []
}: ArtistPageContentProps) {
    const router = useRouter();
    const [importingMbid, setImportingMbid] = useState<string | null>(null);

    const isPreviewMode = !artist && previewMbid;
    const artistName = artist?.name || previewName || '';
    const mbid = artist?.mbid || previewMbid;

    const discography = useMemo(() => {
        const existingTitles = new Set(albums.map(a => a.title.toLowerCase()));

        const baseAlbums: DiscographyItem[] = albums.map(a => ({
            title: a.title,
            date: a.release_date,
            cover: a.cover_url,
            href: `/albums/${a.id}`,
            inDatabase: true,
            avgRating: a.avg_rating,
            reviewsCount: a.reviews_count,
        }));

        const missingReleases: DiscographyItem[] = mbReleases
            .filter(r => !existingTitles.has(r.title.toLowerCase()))
            .map(r => ({
                title: r.title,
                date: r.date,
                cover: null,
                coverFromArchive: true,
                releaseGroupMbid: r.releaseGroupMbid,
                href: `/albums/preview/${r.mbid}`,
                inDatabase: false,
                mbid: r.mbid,
            }));

        return [...baseAlbums, ...missingReleases].sort((a, b) => {
            if (!a.date && !b.date) return 0;
            if (!a.date) return 1;
            if (!b.date) return -1;
            return b.date.localeCompare(a.date);
        });
    }, [albums, mbReleases]);

    const handleImportAlbum = async (mbid: string) => {
        if (importingMbid) return;
        setImportingMbid(mbid);
        try {
            const result = await importAlbumFromMusicBrainz(mbid);
            if (result.success && 'albumId' in result && result.albumId) {
                router.push(`/albums/${result.albumId}`);
            } else {
                showToast("Erreur lors de l'import", 'error');
                setImportingMbid(null);
            }
        } catch {
            showToast("Erreur lors de l'import", 'error');
            setImportingMbid(null);
        }
    };

    const year = (date?: string | null) => date ? new Date(date).getFullYear() : null;
    const totalTracks = albums.reduce((sum, a) => sum + (a.track_count || 0), 0);

    return (
        <div className="mt-8">
            {/* Hero */}
            <div className="mb-10">
                <div className="flex items-start gap-5">
                    {/* Artist image */}
                    {imageUrl ? (
                        <div className="flex-shrink-0 w-20 h-20 rounded-full overflow-hidden relative">
                            <Image
                                src={imageUrl}
                                alt={artistName}
                                fill
                                className="object-cover"
                                onError={() => { /* handled by fallback */ }}
                            />
                        </div>
                    ) : (
                        <div className="flex-shrink-0 w-20 h-20 rounded-full bg-background-secondary flex items-center justify-center">
                            <span className="text-[24px] text-text-tertiary">{artistName.charAt(0)}</span>
                        </div>
                    )}

                    <div className="flex-1 min-w-0">
                        <h1 className="text-[32px] font-medium text-text-primary tracking-[-0.02em] leading-[1.2]">
                            {artistName}
                        </h1>
                        <div className="text-[14px] text-text-secondary mt-1">
                            {discography.length} {discography.length > 1 ? 'albums' : 'album'}
                            {!isPreviewMode && totalTracks > 0 && ` · ${totalTracks} morceaux`}
                            {previewType && ` · ${previewType}`}
                        </div>
                        {previewCountry && (
                            <p className="text-[14px] text-text-secondary mt-0.5">{previewCountry}</p>
                        )}
                    </div>
                </div>

            </div>

            {/* Discography */}
            <section>
                <h2 className="text-h2 text-text-primary mb-6">
                    Discographie
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {discography.map((album) => {
                        const isImporting = importingMbid === album.mbid;
                        const isDisabled = !!importingMbid && !isImporting;
                        const cardClass = `group rounded-[12px] overflow-hidden bg-background-secondary hover:bg-background-tertiary transition-colors duration-150 text-left w-full ${isDisabled ? 'opacity-50' : ''}`;

                        const cardContent = (
                            <>
                                <AlbumCover album={album} />
                                <div className="px-3 py-2.5">
                                    {isImporting ? (
                                        <div className="flex items-center gap-2 py-1">
                                            <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-[#8E6F5E] flex-shrink-0" />
                                            <span className="text-[13px] text-text-secondary">Import en cours…</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[14px] font-medium text-text-primary truncate">
                                                    {album.title}
                                                </div>
                                                {album.date && (
                                                    <span className="text-[12px] text-text-secondary">
                                                        {year(album.date)}
                                                    </span>
                                                )}
                                            </div>
                                            {album.avgRating != null && (
                                                <span className="text-[12px] text-text-primary flex-shrink-0 whitespace-nowrap">
                                                    {album.avgRating.toFixed(1)}/10
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        );

                        if (album.inDatabase) {
                            return (
                                <Link
                                    key={`db-${album.href}`}
                                    href={album.href}
                                    className={cardClass}
                                >
                                    {cardContent}
                                </Link>
                            );
                        }

                        return (
                            <button
                                key={`mb-${album.mbid}`}
                                onClick={() => album.mbid && !importingMbid && handleImportAlbum(album.mbid)}
                                disabled={!!importingMbid}
                                className={cardClass}
                            >
                                {cardContent}
                            </button>
                        );
                    })}
                </div>

                {discography.length === 0 && (
                    <div className="text-center text-text-tertiary text-[14px] py-12">
                        Aucun album trouvé pour cet artiste
                    </div>
                )}
            </section>
        </div>
    );
}

/**
 * Album cover with browser-side CoverArt Archive fetch for MB releases.
 * DB albums use their stored cover_url. MB albums use the direct CAA URL
 * and let the browser handle the 307 redirect.
 */
function AlbumCover({ album }: { album: DiscographyItem }) {
    const [error, setError] = useState(false);

    // For DB albums, use stored cover
    if (album.cover && !error) {
        return (
            <div className="aspect-square overflow-hidden relative">
                <Image
                    src={album.cover}
                    alt={album.title}
                    fill
                    className="object-cover"
                    onError={() => setError(true)}
                />
            </div>
        );
    }

    // For MB albums, try CoverArt Archive directly (browser handles 307 redirect)
    if (album.coverFromArchive && album.releaseGroupMbid && !error) {
        return (
            <div className="aspect-square overflow-hidden relative">
                <Image
                    src={`https://coverartarchive.org/release-group/${album.releaseGroupMbid}/front-500`}
                    alt={album.title}
                    fill
                    className="object-cover"
                    loading="lazy"
                    onError={() => setError(true)}
                />
            </div>
        );
    }

    // Fallback placeholder
    return (
        <div className="aspect-square bg-background-tertiary flex items-center justify-center">
            <span className="text-[12px] text-text-tertiary">Aucune pochette</span>
        </div>
    );
}

import Link from 'next/link';
import BackButton from '@/components/BackButton';
import { msToMMSS } from '@/lib/time';
import { api } from '@/lib/api';

type TrackResp = {
    track: {
        id: string;
        title: string;
        duration_ms: number | null;
        track_no: number | null;
        disc_no: number | null;
        mbid: string | null;
        album_id: string;
        album_title: string;
        cover_url: string | null;
        release_date: string | null;
        artist_id: string;
        artist_name: string;
    };
};

type PageProps = { params: Promise<{ id: string }> };

export default async function TrackPage({ params }: PageProps) {
    const { id } = await params;
    const data = await api<TrackResp>(`/api/tracks/${id}`);
    const t = data.track;
    const year = t.release_date ? new Date(t.release_date).getFullYear() : undefined;

    return (
        <main className="mx-auto max-w-3xl p-6">
            <BackButton />

            <div className="mt-4 flex gap-6">
                <div className="w-32 h-32 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                    {t.cover_url ? (
                        <img src={t.cover_url} alt={`${t.album_title} cover`} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full grid place-items-center text-xs text-gray-400">No cover</div>
                    )}
                </div>

                <div className="min-w-0">
                    <h1 className="text-xl font-semibold leading-tight">{t.title}</h1>
                    <div className="text-gray-600">
                        <Link href={`/artists/${t.artist_id}`} className="hover:underline">{t.artist_name}</Link>
                        {' — '}
                        <Link href={`/albums/${t.album_id}`} className="hover:underline">{t.album_title}</Link>
                        {year ? <> · <span>{year}</span></> : null}
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                        Disc {t.disc_no ?? 1}, Track {t.track_no ?? '-'} · {msToMMSS(t.duration_ms)}
                    </div>
                </div>
            </div>
        </main>
    );
}

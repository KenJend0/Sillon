import Link from 'next/link';
import { api } from '@/lib/api';
import BackButton from '@/components/BackButton';

type ArtistResponse = {
    artist: { id: string; name: string; mbid: string | null };
    albums: Array<{
        id: string;
        title: string;
        cover_url: string | null;
        release_date: string | null;
        track_count: number;
    }>;
};

export const dynamic = 'force-dynamic';

export default async function ArtistPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const data = await api<ArtistResponse>(`/api/artists/${id}`);

    return (
        <main className="mx-auto max-w-4xl p-6">
            <BackButton/>

            <h1 className="mt-2 text-3xl font-semibold">{data.artist.name}</h1>
            <p className="text-gray-500">{data.albums.length} album{data.albums.length !== 1 ? 's' : ''}</p>

            <section className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {data.albums.map(a => {
                    const year = a.release_date ? new Date(a.release_date).getFullYear() : undefined;
                    return (
                        <Link key={a.id} href={`/albums/${a.id}`} className="group block">
                            <div className="aspect-square rounded-xl bg-gray-100 overflow-hidden">
                                {a.cover_url ? (
                                    <img src={a.cover_url} alt="" className="w-full h-full object-cover group-hover:opacity-90 transition" />
                                ) : null}
                            </div>
                            <div className="mt-2 text-sm font-medium truncate">{a.title}</div>
                            <div className="text-xs text-gray-500">
                                {year ? `${year} · ` : ''}{a.track_count} track{a.track_count !== 1 ? 's' : ''}
                            </div>
                        </Link>
                    );
                })}
            </section>
        </main>
    );
}

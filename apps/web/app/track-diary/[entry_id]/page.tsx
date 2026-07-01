import { notFound } from 'next/navigation';
import { getTrackDiaryEntry } from '@/app/actions/track-diary';
import { getAuthUser } from '@/lib/supabase/server';
import TrackDiaryEntryClient from './TrackDiaryEntryClient';

type PageProps = { params: Promise<{ entry_id: string }> };

export default async function TrackDiaryEntryPage({ params }: PageProps) {
    const { entry_id } = await params;

    const [result, currentUser] = await Promise.all([
        getTrackDiaryEntry(entry_id),
        getAuthUser(),
    ]);

    if (!result.success) notFound();

    return <TrackDiaryEntryClient entry={result.data} currentUser={currentUser} />;
}

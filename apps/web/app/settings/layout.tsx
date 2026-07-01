// Les imports historiques (Last.fm/RYM) traitent des lots d'albums via MusicBrainz
// (~1 req/s) — dépasse la durée par défaut d'une fonction serverless Vercel.
export const maxDuration = 60;

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

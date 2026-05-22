import BackButton from "@/components/BackButton";
import { getArtistReleases, fetchArtistMetadata } from "@/app/actions/musicbrainz";
import { ArtistPageContent } from "@/components/ArtistPageContent";

export default async function ArtistPreviewPage({
    params,
}: {
    params: Promise<{ mbid: string }>;
}) {
    const { mbid } = await params;

    console.log(`[ArtistPreviewPage] mbid="${mbid}"`);
    // Fetch artist metadata and releases in parallel (no cover fetching = fast)
    const [meta, relResult] = await Promise.all([
        fetchArtistMetadata(mbid),
        getArtistReleases(mbid),
    ]);

    console.log(`[ArtistPreviewPage] meta.name="${meta.name}" relResult=${JSON.stringify({ success: relResult.success, count: relResult.releases?.length ?? 0, error: relResult.error })}`);

    if (!meta.name) {
        throw new Error("Failed to preview artist");
    }

    return (
        <main className="max-w-page mx-auto px-4 pt-4 pb-24">
            <BackButton label="Recherche" fallbackHref="/search" />
            <ArtistPageContent
                previewName={meta.name}
                previewMbid={mbid}
                previewCountry={meta.country ?? undefined}
                previewType={meta.type ?? undefined}
                imageUrl={meta.imageUrl}
                mbReleases={relResult.releases || []}
            />
        </main>
    );
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

function storageUrl(mbid: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/covers/${mbid}.jpg`;
}

/**
 * Builds src + fallback for CoverImage.
 * Priority: Supabase Storage (by mbid) → cover_url from DB → null
 *
 * If the cover_url is already a Supabase URL it IS the storage URL,
 * so we use it directly without adding a redundant fallback.
 */
export function coverSrcWithFallback(
  mbid: string | null | undefined,
  coverUrl: string | null | undefined,
): { src: string | null; fallback: string | undefined } {
  const isSupabase = (url: string) => url.includes('supabase.co/storage');

  if (mbid) {
    const storageSrc = storageUrl(mbid);
    // If cover_url is already the supabase URL (post-backfill), no need for fallback
    const fallback = coverUrl && !isSupabase(coverUrl) ? coverUrl : undefined;
    return { src: storageSrc, fallback };
  }

  return { src: coverUrl ?? null, fallback: undefined };
}

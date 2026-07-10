const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;

function storageUrl(mbid: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/covers/${mbid}.jpg`;
}

/**
 * Construit src + fallback pour CoverImage — miroir de coverSrcWithFallback
 * (web, apps/web/lib/cover.ts). Priorité : Supabase Storage (par mbid) →
 * cover_url de la DB → null.
 */
export function coverSrcWithFallback(
  mbid: string | null | undefined,
  coverUrl: string | null | undefined
): { src: string | null; fallback: string | undefined } {
  const isSupabase = (url: string) => url.includes('supabase.co/storage');

  if (mbid) {
    const storageSrc = storageUrl(mbid);
    const fallback = coverUrl && !isSupabase(coverUrl) ? coverUrl : undefined;
    return { src: storageSrc, fallback };
  }

  return { src: coverUrl ?? null, fallback: undefined };
}

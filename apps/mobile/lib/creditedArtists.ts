// Miroir de apps/web/lib/creditedArtists.ts

export type CreditedArtistRef = { id: string; name: string };
export type FeaturedCredit = { artist: CreditedArtistRef; joinphrase: string | null };

const DEFAULT_JOINPHRASE = ' feat. ';

export function creditParts(
  primary: CreditedArtistRef,
  featured: FeaturedCredit[]
): Array<{ prefix: string; artist: CreditedArtistRef }> {
  return [
    { prefix: '', artist: primary },
    ...featured.map((f) => ({ prefix: f.joinphrase || DEFAULT_JOINPHRASE, artist: f.artist })),
  ];
}

export type RawFeaturedRow = { position: number; joinphrase: string | null; artists: CreditedArtistRef | null };

export function parseFeaturedRows(rows: RawFeaturedRow[] | null | undefined): FeaturedCredit[] {
  return (rows ?? [])
    .filter((r): r is RawFeaturedRow & { artists: CreditedArtistRef } => !!r.artists)
    .sort((a, b) => a.position - b.position)
    .map((r) => ({ artist: r.artists, joinphrase: r.joinphrase }));
}

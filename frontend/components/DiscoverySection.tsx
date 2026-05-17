import { type DiscoveryAlbum } from "@/app/actions/explore";
import DiscoverCard from "@/components/DiscoverCard";

export default function DiscoverySection({ albums }: { albums: DiscoveryAlbum[] }) {
    if (albums.length === 0) return null;

    const displayed = albums.slice(0, 10);

    return (
        <section>
            <div className="mb-5">
                <h2 className="text-h2 text-text-primary mb-1">Hors de ta bulle</h2>
                <p className="text-[13px] text-text-secondary">
                    Albums bien notés d&apos;artistes que tu n&apos;as pas encore explorés.
                </p>
            </div>
            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide lg:hidden">
                {displayed.map((album) => (
                    <div key={album.album_id} className="snap-center shrink-0 w-44 sm:w-48 md:w-52">
                        <DiscoverCard
                            item={{
                                id: `discovery-${album.album_id}`,
                                album_id: album.album_id,
                                album_title: album.title,
                                artist_name: album.artist,
                                cover_url: album.cover_url,
                                discover_kind: "discovery",
                            }}
                        />
                    </div>
                ))}
            </div>
            <div className="hidden lg:grid lg:grid-cols-5 gap-4">
                {displayed.slice(0, 5).map((album) => (
                    <DiscoverCard
                        key={album.album_id}
                        item={{
                            id: `discovery-${album.album_id}`,
                            album_id: album.album_id,
                            album_title: album.title,
                            artist_name: album.artist,
                            cover_url: album.cover_url,
                            discover_kind: "discovery",
                        }}
                    />
                ))}
            </div>
        </section>
    );
}

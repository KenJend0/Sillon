// frontend/app/explore/page.tsx
import DiscoverCard from "@/components/DiscoverCard";
import SearchBox from "@/components/SearchBox";

type DiscoverItem = {
    id: string;
    discover_kind: string;
    album_title: string;
    artist_name: string;
    cover_url: string;
    score?: number;
};

async function getDiscoverItems(): Promise<DiscoverItem[]> {
    const res = await fetch("http://localhost:4000/social/discover/active", {
        cache: "no-store",
    });
    if (!res.ok) throw new Error("Erreur lors du chargement des découvertes");
    return res.json();
}

export default async function ExplorePage() {
    const discoverItems = await getDiscoverItems();

    return (
        <main className="p-6 pb-20 text-white max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Explorer</h1>

            {/* Barre de recherche */}
            <div className="mb-8">
                <SearchBox placeholder="Rechercher un album, un artiste ou un utilisateur..." />
            </div>

            {/* Section Découvertes de la semaine */}
            <section className="mb-12">
                <h2 className="text-lg font-semibold text-emerald-400 mb-3">
                    🎯 Découvertes de la semaine
                </h2>
                <div className="flex gap-5 overflow-x-auto snap-x snap-mandatory scrollbar-hide md:grid md:grid-cols-4 md:gap-5 md:overflow-visible">
                    {discoverItems
                        //.filter((i) => i.discover_kind === "trending_week")
                        .map((item) => (
                            <div
                                key={item.id}
                                className="snap-center shrink-0 w-40 sm:w-48 md:w-auto"
                            >
                                <DiscoverCard item={item} />
                            </div>
                        ))}
                </div>
            </section>

            {/* Section Tendances globales */}
            <section>
                <h2 className="text-lg font-semibold text-emerald-400 mb-3">
                    🔥 Tendances globales
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                    {discoverItems
                        .filter((i) => i.discover_kind === "all_time_top")
                        .map((item) => (
                            <DiscoverCard key={item.id} item={item} />
                        ))}
                </div>
            </section>
        </main>
    );
}

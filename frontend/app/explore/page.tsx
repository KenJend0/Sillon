export const dynamic = 'force-dynamic';

import { getTrendingThisWeek, getForYouSuggestions, getDiscoveryAlbums, getSimilarUsers, getForYouTracks } from "@/app/actions/explore";
import { getPublicLists, type UserList } from "@/app/actions/lists";
import { getTrendingTracks } from "@/app/actions/track-diary";
import SearchOverlay from "@/components/SearchOverlay";
import PourToiSection from "@/components/PourToiSection";
import DiscoverySection from "@/components/DiscoverySection";
import SimilarUsersSection from "@/components/SimilarUsersSection";
import TrendingSection from "@/components/TrendingSection";
import ListCard from "@/components/ListCard";
import { type TrendingAlbum, type ForYouAlbum, type DiscoveryAlbum, type SimilarUser, type ForYouTrack } from "@/app/actions/explore";
import { type TrackWithStats } from "@/app/actions/track-diary";

export default async function ExplorePage() {
    let trending: TrendingAlbum[] = [];
    let forYou: ForYouAlbum[] = [];
    let forYouTracks: ForYouTrack[] = [];
    let discovery: DiscoveryAlbum[] = [];
    let similarUsers: SimilarUser[] = [];
    let trendingTracks: TrackWithStats[] = [];
    let communityLists: UserList[] = [];

    try {
        [trending, forYou, forYouTracks, discovery, similarUsers, trendingTracks, communityLists] = await Promise.all([
            getTrendingThisWeek(10),
            getForYouSuggestions(6),
            getForYouTracks(6),
            getDiscoveryAlbums(10),
            getSimilarUsers(4),
            getTrendingTracks(10),
            getPublicLists(6),
        ]);
    } catch (err) {
        console.error("Explore data fetch failed:", err);
    }

    const isEmpty = trending.length === 0 && forYou.length === 0 && discovery.length === 0;

    return (
        <>
            <section className="px-6 lg:px-8 pt-safe pb-6">
                <h1 className="text-h1 text-text-primary mb-2">
                    Explorer
                </h1>
                <p className="text-text-secondary text-[14px]">
                    Découvre de la musique, des listes et des profils qui correspondent à tes goûts.
                </p>
            </section>

            <div className="bg-background border-b border-border-divider">
                <div className="px-6 lg:px-8 pb-3">
                    <SearchOverlay />
                </div>
            </div>

            <main className="p-6 lg:px-8 pb-28 lg:pb-10">
                {isEmpty ? (
                    <div className="text-center py-16 space-y-6">
                        <div className="space-y-3">
                            <p className="text-[16px] text-text-primary font-medium">
                                Bienvenue sur Waveform !
                            </p>
                            <p className="text-[14px] text-text-secondary max-w-md mx-auto">
                                Commence à découvrir de la musique en recherchant tes albums et artistes préférés.
                            </p>
                        </div>
                        <p className="text-[12px] text-text-tertiary">
                            Utilise la barre de recherche ci-dessus pour trouver n&apos;importe quel album ou artiste
                        </p>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {/* Pour toi — recommandations personnalisées */}
                        <PourToiSection albums={forYou} tracks={forYouTracks} />

                        {/* Tendances — albums + titres populaires cette semaine */}
                        <TrendingSection albums={trending} tracks={trendingTracks} />

                        {/* Hors de ta bulle — artistes inconnus bien notés */}
                        <DiscoverySection albums={discovery} />

                        {/* Listes de la communauté */}
                        {communityLists.length > 0 && (
                            <section>
                                <div className="mb-5">
                                    <h2 className="text-h2 text-text-primary mb-1">Listes populaires</h2>
                                    <p className="text-[13px] text-text-secondary">
                                        Les collections les plus aimées par la communauté.
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {communityLists.map((list) => (
                                        <ListCard
                                            key={list.id}
                                            list={list}
                                            href={`/lists/${list.id}`}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Goûts similaires */}
                        <SimilarUsersSection users={similarUsers} />
                    </div>
                )}
            </main>
        </>
    );
}

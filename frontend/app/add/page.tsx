import { getAuthUser } from "@/lib/supabase/server";
import { getDefaultListAlbums, getDefaultListTracks } from "@/app/actions/lists";
import { getForYouSuggestions, getDiscoveryAlbums } from "@/app/actions/explore";
import AddPageClient from "./AddPageClient";
import UnauthCTA from "@/components/UnauthCTA";

export default async function AddPage() {
    const user = await getAuthUser();
    if (!user) {
        return (
            <div className="mx-auto max-w-page lg:max-w-5xl px-4 md:px-6 pb-28 lg:pb-12">
                <div className="pt-8 pb-6">
                    <h1 className="text-h1 text-text-primary mb-2">Ajouter</h1>
                    <p className="text-meta text-text-tertiary">Note une écoute, donne une note, écris une review.</p>
                </div>
                <UnauthCTA
                    title={<>Note tes écoutes, écris des reviews — <em className="italic text-accent-deep">garde une trace de tout ce que tu écoutes.</em></>}
                />
            </div>
        );
    }

    const [defaultListItems, defaultListTracks, suggestions, discovery] = await Promise.all([
        getDefaultListAlbums(8),
        getDefaultListTracks(8),
        getForYouSuggestions(),
        getDiscoveryAlbums(),
    ]);

    return (
        <AddPageClient
            defaultListItems={defaultListItems}
            defaultListTracks={defaultListTracks}
            initialSuggestions={suggestions}
            initialDiscovery={discovery}
        />
    );
}

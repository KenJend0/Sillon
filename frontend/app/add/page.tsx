import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/supabase/server";
import { getUserSavedAlbums } from "@/app/actions/saved-albums";
import { getForYouSuggestions, getDiscoveryAlbums } from "@/app/actions/explore";
import AddPageClient from "./AddPageClient";

export default async function AddPage() {
    const user = await getAuthUser();
    if (!user) redirect("/auth");

    const [savedAlbums, suggestions, discovery] = await Promise.all([
        getUserSavedAlbums(user.id, 8),
        getForYouSuggestions(),
        getDiscoveryAlbums(),
    ]);

    return (
        <AddPageClient
            initialSavedAlbums={savedAlbums}
            initialSuggestions={suggestions}
            initialDiscovery={discovery}
        />
    );
}

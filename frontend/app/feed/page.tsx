// frontend/app/feed/page.tsx
import FeedCard from "@/components/FeedCard";
import { getCurrentUser } from "@/lib/auth";
import { cookies } from "next/headers";


type FeedResponse = {
    items: any[];
};

export default async function FeedPage() {
    const user = await getCurrentUser();
    if (!user) {
        return (
            <main className="p-6 text-white">
                <p className="text-yellow-500">⚠️ Vous devez être connecté pour voir le feed.</p>
            </main>
        );
    }
    const cookieStore = await cookies();
    const sid = cookieStore.get("mbx.sid")?.value;

    const res = await fetch("http://localhost:4000/social/feed", {
        headers: sid ? { Cookie: `mbx.sid=${sid}` } : {},
        cache: "no-store",
    });

    if (!res.ok) {
        return (
            <main className="p-6 text-red-500">
                Impossible de charger le feed.
            </main>
        );
    }

    const data: FeedResponse = await res.json();

    return (
        <main className="p-6 pb-20 text-white">
            <h1 className="text-2xl font-bold mb-4">Votre Feed</h1>

            {data.items.map((item) => (
                <FeedCard
                    key={item.event_id}
                    event_id={item.event_id}
                    created_at={item.created_at}
                    type={item.type}
                    user={
                        item.user_id
                            ? {
                                id: item.user_id,
                                username: item.username,
                                display_name: item.display_name,
                                avatar: item.picture_url || "/default-avatar.png",
                            }
                            : undefined
                    }
                    targetUser={
                        item.target_user_id
                            ? {
                                id: item.target_user_id,
                                username: item.target_username,
                                display_name: item.target_display_name,
                                avatar: item.target_avatar || "/default-avatar.png",
                            }
                            : undefined
                    }
                    album={
                        item.album_id
                            ? {
                                id: item.album_id,
                                title: item.album_title,
                                artist: item.artist_name,
                                cover_url: item.cover_url,
                            }
                            : undefined
                    }
                    reviewText={item.review_body}
                    rating={item.rating}
                    payload={item.payload}
                />
            ))}
        </main>
    );
}

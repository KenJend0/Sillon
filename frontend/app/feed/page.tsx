// frontend/app/feed/page.tsx
import FeedList from "@/components/feed/FeedList";
import { getCurrentUser } from "@/lib/auth";
import { cookies } from "next/headers";

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

    const res = await fetch("http://localhost:4000/social/feed?limit=20", {
        headers: sid ? { Cookie: `mbx.sid=${sid}` } : {},
        cache: "no-store",
    });

    if (!res.ok) {
        return <main className="p-6 text-red-500">Impossible de charger le feed.</main>;
    }

    const data = await res.json();

    return (
        <main className="p-6 pb-20 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Votre Feed</h1>
            <FeedList initialItems={data.items} />
        </main>
    );
}

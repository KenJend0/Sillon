import { api } from "@/lib/api";

export default async function DebugPage() {
    let user = null;
    try {
        const data = await api<{ user: any }>("/auth/me");
        user = data.user;
    } catch (e) {
        console.error("Auth check failed:", e);
    }

    return (
        <main className="p-6 text-white">
        <h1 className="text-2xl font-bold mb-4">Debug Auth</h1>
    {user ? (
        <pre className="bg-neutral-900 p-4 rounded-lg text-sm">
            {JSON.stringify(user, null, 2)}
            </pre>
    ) : (
        <p className="text-red-400">Pas connecté (ou cookie non transmis)</p>
    )}
    </main>
);
}

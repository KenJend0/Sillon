import MyDiary from "@/components/MyDiary";
import { getCurrentUser } from "@/lib/auth";

export default async function MyDiaryPage() {
    const user = await getCurrentUser();
    if (!user) {
        return (
            <main className="p-6 text-white">
                <h1 className="text-xl font-bold">Journal</h1>
                <p>⚠️ Connectez-vous pour voir votre journal.</p>
            </main>
        );
    }

    return <MyDiary />;
}

import LoginButton from "@/components/LoginButton";

export default function LoginPage() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-neutral-950 text-white">
            <div className="p-6 bg-neutral-900 rounded-xl shadow-lg space-y-6">
                <h1 className="text-2xl font-bold">Se connecter à MusicBoxd</h1>
                <p className="text-sm opacity-70">Choisissez un fournisseur :</p>
                <LoginButton />
            </div>
        </main>
    );
}

"use client";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
    const router = useRouter();
    async function handleLogout() {
        await fetch(`/api/auth/logout`, { method: "POST", credentials: "include" });
        router.push("/login");
    }
    return (
        <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm"
        >
            Se déconnecter
        </button>
    );
}

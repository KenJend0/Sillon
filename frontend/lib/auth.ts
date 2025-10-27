import { cookies } from "next/headers";

export async function getCurrentUser() {
    const cookieStore = await cookies(); // 👈 await ici
    const mbx = cookieStore.get("mbx.sid");
    if (!mbx) return null;

    try {
        const res = await fetch("http://localhost:4000/auth/me", {
            headers: {
                Cookie: `mbx.sid=${mbx.value}`,
            },
            cache: "no-store",
        });

        if (!res.ok) return null;
        const data = await res.json();
        return data.user;
    } catch {
        return null;
    }
}

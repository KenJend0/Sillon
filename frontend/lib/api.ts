export async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const isAbsolute = path.startsWith("http://") || path.startsWith("https://");
    const base = process.env.NEXT_PUBLIC_FRONTEND_BASE || "http://localhost:3000";
    const url = isAbsolute ? path : `${base}${path}`;
    const res = await fetch(url, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...(init?.headers || {}),
        },
        credentials: "include",
        cache: "no-store",
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
}

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
    const loggedIn = req.cookies.get("mbx.sid");

    // protégé
    if (
        !loggedIn &&
        (req.nextUrl.pathname.startsWith("/feed") ||
            req.nextUrl.pathname.startsWith("/me") ||
            req.nextUrl.pathname.startsWith("/settings"))
    ) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/feed/:path*", "/me/:path*", "/settings/:path*"],
};

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/server";
import { applyRateLimit } from "@/lib/serverRateLimit";

const ADMIN_IDS = (process.env.ADMIN_USER_IDS ?? '').split(',').map((s) => s.trim()).filter(Boolean);

export async function GET(request: NextRequest) {
  const limited = await applyRateLimit(request);
  if (limited) return limited;
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email ?? null,
      isAdmin: ADMIN_IDS.includes(user.id),
    },
  });
}

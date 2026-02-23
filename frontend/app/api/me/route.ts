import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/server";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email ?? null,
    },
  });
}

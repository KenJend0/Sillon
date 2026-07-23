import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import type { EmailOtpType } from '@supabase/supabase-js';

function safeInternalPath(value: string | null): string {
  if (!value) return '/explore';
  if (!value.startsWith('/')) return '/explore';
  if (value.startsWith('//')) return '/explore';
  if (value.includes('\\')) return '/explore';
  return value;
}

/**
 * Logique partagée entre /auth/callback (web) et /auth/callback/mobile.
 * `isMobile` évite de faire faire l'onboarding dans le navigateur du téléphone à un
 * utilisateur qui repart finir dans l'app — voir apps/mobile/app/(auth)/signup.tsx.
 */
export async function handleAuthCallback(request: NextRequest, isMobile: boolean) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = safeInternalPath(searchParams.get('next'));

  const supabase = await createSupabaseServer();

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) {
      if (type === 'signup' && isMobile) {
        return NextResponse.redirect(`${origin}/auth/confirmed`);
      }
      const redirectTo = type === 'recovery' ? '/auth/reset' : type === 'signup' ? '/onboarding' : next;
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/auth/reset`);
      }
      if (type === 'signup' && isMobile) {
        return NextResponse.redirect(`${origin}/auth/confirmed`);
      }
      const username = data.user?.user_metadata?.username as string | undefined;
      const needsOnboarding = !username || /^[0-9a-f-]{36}$/.test(username);
      const redirectTo = needsOnboarding ? '/onboarding' : next;
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=confirmation_failed`);
}

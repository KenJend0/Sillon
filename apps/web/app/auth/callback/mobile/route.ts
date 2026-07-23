import { NextRequest } from 'next/server';
import { handleAuthCallback } from '@/lib/authCallback';

/**
 * Cible du lien de confirmation envoyé aux comptes créés depuis l'app mobile
 * (apps/mobile/app/(auth)/signup.tsx) — chemin dédié plutôt qu'un ?platform=mobile
 * pour rester compatible avec le template email qui ajoute ?token_hash=... après
 * l'URL de redirection sans jamais vérifier si elle contient déjà une query string.
 */
export async function GET(request: NextRequest) {
  return handleAuthCallback(request, true);
}

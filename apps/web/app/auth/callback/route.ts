import { NextRequest } from 'next/server';
import { handleAuthCallback } from '@/lib/authCallback';

export async function GET(request: NextRequest) {
  return handleAuthCallback(request, false);
}

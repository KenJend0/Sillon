import { NextRequest, NextResponse } from 'next/server';
import { isProductEventName, logProductEvent } from '@/lib/productEvents';
import { getAuthUser } from '@/lib/supabase/server';
import { applyRateLimit } from '@/lib/serverRateLimit';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_SURFACE_LENGTH = 80;
const MAX_PROPERTY_KEYS = 10;
const MAX_PROPERTY_KEY_LENGTH = 40;
const MAX_PROPERTY_STRING_LENGTH = 200;

type PublicEventProperties = Record<string, string | number | boolean | null>;

function sanitizeSessionId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return UUID_RE.test(value) ? value : null;
}

function sanitizeSurface(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_SURFACE_LENGTH);
}

function sanitizeProperties(value: unknown): PublicEventProperties {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  const cleaned: PublicEventProperties = {};
  for (const [rawKey, rawValue] of Object.entries(value).slice(0, MAX_PROPERTY_KEYS)) {
    const key = rawKey.trim().slice(0, MAX_PROPERTY_KEY_LENGTH);
    if (!key) continue;

    if (typeof rawValue === 'string') {
      cleaned[key] = rawValue.slice(0, MAX_PROPERTY_STRING_LENGTH);
    } else if (typeof rawValue === 'number') {
      if (Number.isFinite(rawValue)) cleaned[key] = rawValue;
    } else if (typeof rawValue === 'boolean' || rawValue === null) {
      cleaned[key] = rawValue;
    }
  }
  return cleaned;
}

export async function POST(request: NextRequest) {
  const limited = await applyRateLimit(request);
  if (limited) return limited;

  try {
    const body = await request.json();
    const eventName = typeof body?.eventName === 'string' ? body.eventName : '';

    if (!isProductEventName(eventName)) {
      return NextResponse.json({ ok: false, error: 'invalid_event_name' }, { status: 400 });
    }

    const user = await getAuthUser();

    await logProductEvent({
      eventName,
      userId: user?.id ?? null,
      sessionId: sanitizeSessionId(body?.sessionId),
      surface: sanitizeSurface(body?.surface),
      properties: sanitizeProperties(body?.properties),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[api/events] POST error:', error);
    return NextResponse.json({ ok: false, error: 'invalid_request' }, { status: 400 });
  }
}

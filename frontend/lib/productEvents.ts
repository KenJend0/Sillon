import 'server-only';

import { createSupabaseAdmin, getAuthUser } from '@/lib/supabase/server';

export const PRODUCT_EVENT_NAMES = [
  'signup_completed',
  'onboarding_completed',
  'auth_error',
  'search_used',
  'search_no_results',
  'album_import_started',
  'album_import_failed',
  'album_logged',
  'user_followed',
  'review_liked',
  'comment_created',
] as const;

export type ProductEventName = (typeof PRODUCT_EVENT_NAMES)[number];

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type ProductEventPayload = {
  eventName: ProductEventName;
  userId?: string | null;
  sessionId?: string | null;
  surface?: string | null;
  properties?: Record<string, JsonValue | undefined>;
};

const PRODUCT_EVENT_SET = new Set<string>(PRODUCT_EVENT_NAMES);

function sanitizeProperties(
  properties: Record<string, JsonValue | undefined> | undefined
): Record<string, JsonValue> {
  if (!properties) return {};

  const cleaned: Record<string, JsonValue> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (value === undefined) continue;
    cleaned[key] = value;
  }
  return cleaned;
}

export function isProductEventName(value: string): value is ProductEventName {
  return PRODUCT_EVENT_SET.has(value);
}

export async function logProductEvent({
  eventName,
  userId = null,
  sessionId = null,
  surface = null,
  properties,
}: ProductEventPayload): Promise<void> {
  if (!isProductEventName(eventName)) {
    throw new Error(`Unsupported product event: ${eventName}`);
  }

  try {
    const supabaseAdmin = createSupabaseAdmin();
    const { error } = await (supabaseAdmin as any)
      .from('product_events')
      .insert({
        user_id: userId,
        session_id: sessionId,
        event_name: eventName,
        surface,
        properties: sanitizeProperties(properties),
      });

    if (error) {
      console.error('[productEvents] insert error:', error);
    }
  } catch (error) {
    console.error('[productEvents] unexpected error:', error);
  }
}

export async function logAuthedProductEvent(
  eventName: ProductEventName,
  options?: Omit<ProductEventPayload, 'eventName' | 'userId'>
): Promise<void> {
  const user = await getAuthUser();

  await logProductEvent({
    eventName,
    userId: user?.id ?? null,
    sessionId: options?.sessionId ?? null,
    surface: options?.surface ?? null,
    properties: options?.properties,
  });
}
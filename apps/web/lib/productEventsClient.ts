"use client";

import type { ProductEventName } from '@/lib/productEvents';

const PRODUCT_SESSION_STORAGE_KEY = 'waveform_product_session_id';

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getOrCreateProductSessionId(): string | null {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const existing = storage.getItem(PRODUCT_SESSION_STORAGE_KEY);
    if (existing) return existing;

    const created = crypto.randomUUID();
    storage.setItem(PRODUCT_SESSION_STORAGE_KEY, created);
    return created;
  } catch {
    return null;
  }
}

export async function trackProductEvent(
  eventName: ProductEventName,
  options?: {
    surface?: string;
    properties?: Record<string, string | number | boolean | null | undefined>;
  }
): Promise<void> {
  try {
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName,
        sessionId: getOrCreateProductSessionId(),
        surface: options?.surface,
        properties: options?.properties,
      }),
      keepalive: true,
    });
  } catch {
    // Tracking must never block the UI.
  }
}
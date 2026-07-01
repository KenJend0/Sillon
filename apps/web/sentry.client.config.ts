import * as Sentry from "@sentry/nextjs";

// VERCEL_ENV: 'production' | 'preview' | 'development'
// Requires NEXT_PUBLIC_VERCEL_ENV set in Vercel project env vars (all environments)
const environment =
  process.env.NEXT_PUBLIC_VERCEL_ENV ??
  process.env.NODE_ENV ??
  "development";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment,

  // Never send events in local dev
  enabled: environment !== "development",

  // Low trace sample rate in prod — enough for performance insights without cost
  tracesSampleRate: environment === "production" ? 0.05 : 0.5,

  // Session Replay: record full sessions only on errors, sample 2% normally
  replaysSessionSampleRate: 0.02,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      // Mask all text and block all media to avoid capturing PII (reviews, usernames, etc.)
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  beforeSend(event) {
    // Strip PII: keep only anonymous user id, never send email or username
    if (event.user) {
      event.user = { id: event.user.id };
    }
    // Strip request body and cookies (may contain review text, tokens, or session data)
    if (event.request) {
      delete event.request.data;
      delete event.request.cookies;
      delete event.request.headers;
    }
    return event;
  },
});

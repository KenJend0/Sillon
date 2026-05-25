import * as Sentry from "@sentry/nextjs";

const environment =
  process.env.VERCEL_ENV ??
  process.env.NODE_ENV ??
  "development";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment,

  enabled: environment !== "development",

  // Edge runtime: lower sample rate, no replays
  tracesSampleRate: environment === "production" ? 0.05 : 0.5,

  beforeSend(event) {
    if (event.user) {
      event.user = { id: event.user.id };
    }
    if (event.request) {
      delete event.request.data;
      delete event.request.cookies;
      delete event.request.headers;
    }
    return event;
  },
});

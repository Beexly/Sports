# Observability Owner Packet — wiring Sentry

Scope: this packet wires error tracking only. No secrets are included here; you
provide them in the deploy environment.

## What the code actually reads

`apps/web/lib/observability/sentry.ts` reads exactly these environment
variables — no others:

- `SENTRY_DSN` — server-side DSN.
- `NEXT_PUBLIC_SENTRY_DSN` — client-side DSN (must be `NEXT_PUBLIC_*` to reach
  the browser bundle).

Either one being set is enough for `initObservability()` to initialize Sentry
for that runtime (server checks `SENTRY_DSN` first, falling back to
`NEXT_PUBLIC_SENTRY_DSN`). Both unset = a clean no-op; the build and app run
with no Sentry credentials present. There is no `SENTRY_AUTH_TOKEN` requirement
— the integration deliberately skips the Sentry webpack plugin/source-map
upload, so no auth token is read or needed.

## Where to set them

Vercel project → Settings → Environment Variables:

- Add `SENTRY_DSN` (Production, and Preview/Development if you want error
  tracking there too).
- Add `NEXT_PUBLIC_SENTRY_DSN` with the **same** DSN value (one Sentry
  project, two variables — one for the server runtime, one baked into the
  client bundle at build time).
- Get the DSN value from Sentry: Settings → Projects → (your project) →
  Client Keys (DSN).

No other config is required for this packet's scope.

## What log line disappears once it's wired

Server logs currently show, once per cold start:

```
observability: not wired (no DSN)
```

This line is emitted only when neither `SENTRY_DSN` nor
`NEXT_PUBLIC_SENTRY_DSN` is set (see `initObservability()`). Once either is
set and a deploy picks it up, this line stops appearing.

There is also a live posture string available at
`observabilityPosture()` (used by internal dashboards), which flips from
`"error tracking: not wired (no DSN)"` to `"error tracking: wired (DSN set)"`
the moment the env var is present — it reads `process.env` at call time, not
cached.

## How to verify it's working

1. Deploy with `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` set.
2. Confirm the cold-start log no longer shows `observability: not wired (no DSN)`.
3. Trigger a test error (any code path that calls `captureError(err, context)`,
   or a deliberate thrown error in a non-production preview deploy).
4. Open the Sentry project dashboard and confirm the event appears (it should
   show up within a minute or two).

## What is explicitly NOT wired by this packet

- **No OpenTelemetry (OTel) / distributed tracing.** `tracesSampleRate` is set
  to `0.1` inside `Sentry.init`, but no OTel exporter or additional
  instrumentation is configured here.
- **No alert routing.** Sentry will collect events once wired, but no Slack/
  email/PagerDuty alert rules are configured by this packet — that is a
  separate Sentry-project-settings task the owner (or a future workstream)
  does inside Sentry itself.
- **No source-map upload.** Stack frames will reference minified/production
  source without an uploaded source map, which is acceptable for a first-pass
  integration but makes traces harder to read. Enabling the Sentry webpack
  plugin + `SENTRY_AUTH_TOKEN` for source-map upload is future work, not part
  of this packet.

These are called out explicitly so nobody assumes wiring the DSN alone gives
full tracing or alerting — it gives error capture only.

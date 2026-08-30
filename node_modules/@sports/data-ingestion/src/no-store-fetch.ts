/**
 * noStoreFetch — fetch that opts out of Next.js's persistent Data Cache.
 *
 * PRODUCTION INCIDENT (2026-07-10): every upstream feed "froze" ~18h after the
 * launch deploy. Next.js 14 patches `globalThis.fetch` inside the deployed app
 * and caches responses in the deployment's Data Cache; route-segment
 * `dynamic = "force-dynamic"` does NOT opt route-handler fetches out. So every
 * cron cycle re-read The Odds API responses captured at deploy time: the
 * `x-requests-remaining` quota header was byte-identical across runs 10 hours
 * apart, bookmaker `last_update` ages grew with wall-clock time until the
 * freshness gate rejected the whole board, picks stopped, settlement couldn't
 * see scores, and the stale-data kill switch darkened the public surface. It
 * never surfaced in weeks of development because frequent deploys reset the
 * cache before it could age past the threshold.
 *
 * `cache: "no-store"` is the documented per-fetch opt-out. Under plain Node
 * (workers, tests, scripts) it is a no-op — undici performs no HTTP caching.
 * EVERY upstream data fetch in this package must go through this helper (or
 * pass `cache: "no-store"` explicitly): live sports data read through a cache
 * is fabricated freshness, which CLAUDE.md rule #5 exists to prevent.
 */
export const noStoreFetch: typeof globalThis.fetch = (input, init) =>
  globalThis.fetch(input, { ...init, cache: "no-store" });

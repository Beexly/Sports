# GSE Launch Backlog — 2026-06-24

From a 34-agent deep-dive audit (10 launch-readiness dimensions + branch archaeology,
every serious finding adversarially verified) against the integration branch
`claude/stoic-dirac-20h11q`. **Headline: 0 architectural blockers.** The codebase is in
genuinely good shape on the hard parts (fail-closed entitlements, server-side paywalls,
idempotent syncs, calibration gating). What follows is defense-in-depth + polish.

## ✅ Fixed this pass (committed + gate-green)

| # | Area | Fix |
|---|---|---|
| B1 | auth | `DEV_FAKE_ADMIN` hard-gated to `NODE_ENV !== "production"` in all 3 spots (auth() bypass, exported const, middleware) — a stray prod flag can no longer mint ADMIN |
| B3 | secrets | `.gitignore` now `.env*` + `!.env*.example` — `.env.production`/`.staging`/`.test` (live-secret files) are ignored; templates stay tracked |
| H1 | reliability | Stripe webhook idempotency race: concurrent same-event delivery acks 200 `{skipped}` on a scoped `stripeEventId` P2002 instead of 500-ing into a retry storm |
| H2 | billing | `getTierFromPriceId` now logs an alertable error when a real priceId maps to no configured tier (was a silent FREE downgrade for paying customers) |
| N1 | security | Stripe webhook returns generic `"Invalid signature"` instead of echoing verifier internals |
| perf | perf | `get-slate-twin` runs its two independent reads in parallel |
| SEO | seo | sitemap drops `/brief` (robots-disallowed + noindex) |
| a11y | a11y | `ask-jarvis-panel` 9px `text-ion-3/30` → solid `text-ion-3` (7.55:1); `pick-card` `text-ultraviolet` → `text-ultraviolet-glow` (AA) |
| UX | ux | `loading.tsx` skeletons for `/optimizer`, `/fantasy/lineup`, `/fantasy/draft`, `/players` |

## ⏳ Deferred for owner review (product/infra tradeoffs — not mechanical)

- **Upstream odds freshness is not validated.** `validateFreshness()` checks the local
  clock, not upstream data age, and `bookmaker.last_update` is parsed into types but never
  read — picks are stamped "fresh" on our fetch time, not when odds actually changed.
  (`packages/ingestion-pipeline/src/process-sport.ts:119`, `packages/data-ingestion/src/normalizer.ts:40`).
  *Real fix touches the normalizer, the `Odds` row, and the per-pick freshness check —
  needs a deliberate pipeline change, not a blind edit.*
- **Public read-model cache policy wired into zero routes.** Every visitor hits Neon on
  cacheable proof surfaces; the homepage is `force-dynamic` with ~6 queries per visit.
  Wiring `cacheControlHeader(cachePolicyFor(...))` + `revalidate` changes caching behavior
  (staleness window) — a product call. (`apps/web/lib/cache/public-read-model-policy.ts`, `app/page.tsx`).
- **`/api/picks` serves games that already kicked off.** Adding a `commenceTime > now`
  guard would hide in-progress games — but the route also serves historical `?date=` views,
  so the guard must be conditional (today-only) or the product must decide hide vs.
  label-as-live. (`app/api/picks/route.ts`).
- **Proof-of-record Merkle root truncates at 500 picks** — the integrity claim silently
  covers only the first 500. Either paginate + count the full set, or relabel honestly.
  (`apps/web/lib/proof/load-proof-of-record.ts`).
- **Secret-scan guardrail is a no-op in CI** — it scans the (empty) git stage, so CI's
  secret gate always passes on 0 files. Needs an `--all` mode (`git ls-files`) + a CI step.
- **H3 / N2 (minor):** checkout returns a generic 500 (not the platform's clean 503) when
  `STRIPE_SECRET_KEY` is unset; `.env.example` omits `CIPHER_REWARD_CODES` / `SENTRY_DSN`.

## 🗺️ Un-integrated session work worth recovering (post-launch, ranked)

Branch archaeology over ~10 recent branches. Most are superseded; three carry real,
tested code absent from the integration. **None is a launch blocker.**

1. **DFS optimizer subsystem** — `origin/claude/laughing-wozniak-gyryjx` *(highest value)*.
   28 `Dfs*` Prisma models, 19 `/api/dfs/*` routes, an 862-line constraint solver (salary
   cap, stacking, lock/exclude, no-QB-vs-DST, hill-climb) with tests, CSV parsers, Monte
   Carlo sim, portfolio analytics, late-swap. The integration has only an in-memory
   `lib/fantasy/dfs-optimizer.ts`. **Cherry-pick the solver + service + API + tests as a
   unit.** Caveat: its `model-promoter.ts` is a stub (`computeClvMean` hardcoded `0.5`,
   champion==challenger Brier) — take the interface, not the logic.
2. **Galaxy Dynasty gamification layer** — `origin/codex/galaxy-dynasty-studio-rescue-v2`
   *(large, strategic — product decision)*. ~17k lines, 3 packages (game engine / Babylon
   spatial / Colyseus presence), 24 pages, 16 routes, ~25 **purely additive** Prisma models
   (coexist cleanly). Respects guardrails (Signal Checks settle via the real
   `calculatePickResult`, entitlements fail closed). It is 157 commits behind the launch
   line — **recommended as a parallel track, not a launch-branch merge.** Exclude the build
   logs and the self-declared FAILED `experiments/failed-galaxy-city/` prototype.
3. **`lib/gse/` decision-intelligence subsystem** — `origin/claude/happy-goodall-8lkxrb`
   *(lowest, partial)*. Well-engineered but mostly duplicates existing integration
   capability. **Recover selectively, primitive-by-primitive.**

Others (`happy-euler`, `vigilant-archimedes`, `gse-moat-aplus-clv`, `fable5-public-world`)
are superseded by the integration — ignore.

## Fastest path to a world-class launch

1. Owner config: live Stripe Fantasy prices + secret key + webhook registration; confirm
   `PRICING_PHASE=FOUNDING`, prod `NEXT_PUBLIC_APP_URL`. (Until then, checkout 503s by design.)
2. Decide the odds-freshness fix (wire `bookmaker.last_update`) — it backs the "no stale
   data" promise.
3. Wire the cache policy on the top public surfaces (home/proof/clv/calibration) — biggest
   perf win for launch traffic.
4. Preview deploy → owner review → production. Projections stay shadow until a backtest beats
   the baseline (current: MAE 5.31 vs 4.91 = does not beat naive yet).
5. Post-launch: recover the DFS optimizer; decide Galaxy Dynasty as its own track.

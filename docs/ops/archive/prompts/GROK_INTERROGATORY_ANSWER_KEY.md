# Grok Interrogatory Answer Key — for grading shard reports (founder-only reference)

Companion to `GROK_SHARDED_AUDIT_PROMPTS.md` v4. These are the correct answers to the
graded interrogatories, verified against the code at commit time. When a Grok shard
answers, check it against this. A wrong or unquoted answer means the shard's other
findings are suspect — re-run it. **Do not paste this into Grok** (it must derive the
answers from the code; that is the test).

## Shard 1 — billing

1. **DEV_FAKE_ADMIN tier / disable condition** — granted tier is `ELITE`
   (`DEV_FAKE_ADMIN_TIER: SubscriptionTier = "ELITE"`, `apps/web/lib/entitlements.ts:20`).
   Disabled in production by a `NODE_ENV`/production hard-gate so a stray
   `DEV_FAKE_ADMIN=true` in prod cannot grant access (the file's own header comment
   calls this out). Grok must quote the actual gate line, not just the constant.
2. **Double-checkout response** — HTTP **409** with `code: "already_subscribed"`
   (`apps/web/app/api/subscriptions/checkout/route.ts:77,79`).
3. **Customer idempotency key** — `` `gse-customer-${userId}` `` (`apps/web/lib/stripe.ts:84`).
   Same user → same key → Stripe dedupes the customer create, so a retry/parallel
   checkout can't mint a second customer.
4. **Unmapped price on ACTIVE paid renewal** — tier is **held, never downgraded**: the
   defensive no-downgrade guard in the webhook (`tier === "FREE" && priceId &&
   statusGrantsAccess && existingIsPaid` → retain `existing.tier` + alert). Grok should
   quote that guard. Bonus depth: on a NEW `subscription.created` with an unmapped
   price the same guard does NOT apply (no existing paid row) — that asymmetry is the
   real subtle answer and a strong finding if Grok surfaces it.

## Shard 2 — ingestion

1. **Freshness threshold** — default **4 hours**, override `ODDS_FRESHNESS_MAX_HOURS`
   (`packages/data-ingestion/src/config.ts` FRESHNESS_THRESHOLD_MS). If every game
   exceeds it and a game is inside the quiet horizon → run throws "Upstream odds are
   stale" and is marked FAILED; if no game is inside the horizon → quiet-board SUCCESS.
2. **Quiet-board horizon** — default **24 hours**, `QUIET_BOARD_HORIZON_HOURS`. Boundary:
   `ms >= nowMs && ms - nowMs <= horizonMs` (`packages/ingestion-pipeline/src/quiet-board.ts`) —
   a game exactly AT now+24h counts as INSIDE (must be fresh). Grok must catch the `<=`.
3. **Quiet-board write** — status **SUCCESS**, **oddsInserted 0**. The public freshness
   gate (`public-freshness-gate.ts`) only counts runs with `oddsInserted > 0`, so a
   quiet SUCCESS never resets the clock — a quiet skip can't fake freshness.
4. **The fetch helper** — `noStoreFetch` (`packages/data-ingestion/src/no-store-fetch.ts`):
   `(input, init) => globalThis.fetch(input, { ...init, cache: "no-store" })`.

## Shard 3 — engine

1. **Shadow-lock fields** — `priced: false` and `status: "shadow"` (literal types),
   `packages/prediction-engine/src/availability-role-tenure.ts:61-62` (and the runtime
   object at :240-241, plus `canPublishProjections: false`). Grok naming a different
   file for the type-level lock is wrong.
2. **Proof receipt modelProb** — minted as `null` (not `confidence/100`), because
   confidence is a labeled heuristic, not a calibrated probability; publishing
   confidence/100 as a model probability would be a fabricated stat. Quote from
   `pick-proof-receipt` / the process-sport mint site.
3. **clvLock immutability** — the pick upsert uses `update:{}` on the CLV lock fields
   (`packages/ingestion-pipeline/src/process-sport.ts`), and the side-flip freeze branch
   protects the side. Grok should quote the `update:{}` (no clvLockLine/clvLockPrice in
   update) — the test `never lets a refresh overwrite ... the CLV lock` pins it.
4. **pickSelectionSide MONEYLINE** — finds `" ML"` and slices before it:
   `mlIdx = trimmed.indexOf(" ML"); mlIdx > 0 ? trimmed.slice(0, mlIdx) : trimmed`.
   For `"Chiefs ML (-150)"` → `"Chiefs"`. (`process-sport.ts:108-116`.)

## Shard 4 — public-api

1. **FREE viewer confidence field** — **present as `null`**, not absent. The route sets
   `confidence: shownConfidence` where `shownConfidence = (canSeeConfidence || tier ===
   "FREE") ? pick.confidence : null` (`apps/web/app/api/picks/route.ts` ~153). Note the
   nuance: FREE-tier PICKS carry their own confidence; PREMIUM picks are filtered out
   for FREE viewers entirely by the tier WHERE clause. Grok conflating those is a
   partial answer.
2. **Stale-data 503** — `reason: "stale_data"`, `bootstrapMode: false`
   (`staleDataGateResponse`, `apps/web/lib/data-reliability/public-freshness-gate.ts`) —
   distinct from the bootstrap 503's `bootstrapMode: true`.
3. **Performance below floor** — returns `insufficientSample: true` / withholds the win
   rate (route withholds rates below `MIN_SETTLED_PICKS_FOR_LEARNING`). The real depth
   question is whether the withhold is applied PER SLICE (per sport) or only globally —
   Grok should test the per-sport path.
4. **Seed-row exclusion** — ``process.env.NODE_ENV === "production" ? { NOT: {
   modelVersion: "v5.0.0-seed" } } : {}`` (`apps/web/app/api/picks/route.ts` ~63). No-op
   (`{}`) in dev/test so demo mode is preserved byte-for-byte.

---

**Grading rule of thumb:** a shard that answers all its interrogatories correctly with
quotes has demonstrably read the code; trust its other findings and its verdict. A
shard that misses even one has not — discount its "SOLID" and re-run under the rejection
prompt. Keep this file out of any Grok context window.

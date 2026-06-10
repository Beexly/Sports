# Dinner-Session Changelog — 2026-06-09

Autonomous A+ hardening pass on the **DEPLOY clone** (`C:/Users/Garrett/Sports`) while the founder was out, driven by the full audit in this folder. Mandate: make it A+ where safe; stay within the reins (no deploy, no money, no secrets, no MODEL_VERSION bump, founder-gated stays gated). Prime directive held: **every change is additive/reversible and the full gate stays green.**

## Verification (end-of-session)

- `tsc --noEmit` (apps/web + packages/prediction-engine + packages/data-ingestion) — **clean**
- `eslint . --max-warnings=0` (apps/web) — **clean**
- `vitest run` — **1886 passed / 159 files** (apps/web) · **204** (prediction-engine, incl. new estimator) · **46** (data-ingestion, incl. failover registry)
- `next build` — **succeeds** (all routes compile)

## What shipped (all additive / inert / reversible)

| Area | Change | Files | Safety |
|---|---|---|---|
| Launch infra | migrate-in-build so a fresh prod DB receives its schema | `vercel.json`, `scripts/migrate-if-configured.mjs` | `DIRECT_URL`-guarded; previews skip cleanly |
| Security | HSTS header | `apps/web/next.config.mjs` | inert over http; `preload` omitted (founder call) |
| Resilience | `/api/picks` fail-closed DB guard (degraded 503, never 500/stale-200) | `apps/web/app/api/picks/route.ts` | mirrors board/promotions pattern |
| **Engine** | **Independent (non-circular, fundamentals-only) probability + EV estimator** | `packages/prediction-engine/src/independent-estimator.ts`, `scoring.ts`, `constants.ts` | **SHADOW, flag `SHADOW_INDEPENDENT_ESTIMATOR_ENABLED` default-OFF** — output byte-identical; tests prove confidence/tier/grade never move |
| Data | Multi-provider odds failover scaffold | `packages/data-ingestion/src/provider-registry.ts` | inert without each provider's key |
| Observability | Structured logger + error/event capture | `apps/web/lib/observability/*` | no-op without keys; not yet wired into pages |
| SEO | Host-canonicalization unified to bare apex | `apps/web/app/layout.tsx` (matches robots/sitemap) | fallback only; prod uses `NEXT_PUBLIC_APP_URL` |
| SEO | OG/canonical metadata on home + promotions | `apps/web/app/page.tsx`, `app/promotions/page.tsx` | remaining public pages already had metadata |

### The engine change, in plain terms
The audit's keystone finding was that the live "edge" is partly **circular** — it compares a fair probability de-vigged from the books' own prices against those same prices, and `trueEvScore`/`fairProbability` were hardcoded `null`. The new estimator produces a probability from **fundamentals only** (rest, form, head-to-head, venue, schedule) — independent of the price — so the engine finally has a second opinion to measure against the closing line (CLV). It is wired in **shadow** behind a default-off flag: the published number does not change until you choose to turn it on and validate it. This is the path toward a genuine, provable edge rather than a re-expressed market line.

## Reverted on purpose (regulated copy — your/legal call)
The responsible-gaming helpline number is inconsistent: `lib/trust-claims.ts` pins `1-800-522-4700` (with a test that enforces it), while `lib/brand.ts` and 5 other surfaces use `1-800-GAMBLER`. I briefly unified it, a test correctly caught it, and I **reverted** — this is regulated copy and should be resolved with counsel, then sourced from one place. Left exactly as found.

## Decisions that need your hand (not auto-actioned)
1. **Provision the prod DB + one ingestion** — the single hard launch gate; `/api/ready` correctly 503s until then.
2. **Reconcile the two clones' pricing** ($19/$49 deploy vs $14.99/$24.99 canonical) before any Stripe price objects are created.
3. **Design-system scope** — deploy ships the older `gray-*` system; canonical has the matured tokens. Decide whether to port before launch.
4. **Cron cadence vs the 60-minute freshness rule** — needs a sub-daily Vercel cron tier or the continuous worker as the real ingestion path. Do **not** loosen freshness to paper over it.
5. **Homepage H1 / positioning** — three headlines coexist; recommend elevating "proven, not explained." Final wording is yours.
6. **Helpline number** — see above.

## Still in flight
- Source-mesh research workflow (`data-mesh/20–24`) — free/legal source strategy to demote The Odds API from required spine to optional fallback. Docs-only.

Full detail: the 11 lens audits + `00-EXECUTIVE-SUMMARY.md` + `00-SCORECARD-AND-ROADMAP.md` + `99-critic.md` in this folder; the proprietary-Rating R&D in `data-mesh/10–14`.

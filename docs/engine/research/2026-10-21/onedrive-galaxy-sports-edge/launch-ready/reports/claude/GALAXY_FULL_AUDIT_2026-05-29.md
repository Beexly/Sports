# Galaxy Sports Edge — Full Cross-Domain Audit & Roadmap

**Date:** 2026-05-29 · **By:** Claude (Opus 4.8) · **Branch:** `claude/awesome-sagan-LOyCa`
**Method:** 5 parallel read-only domain audits (intelligence, ingestion/APIs, studio/presentation,
design/a11y, process/security). Severities below are **recalibrated** against one goal:
*ship a reliable, stable, trustworthy product.* Agent-assigned severities were often inflated;
where I verified the real code and disagreed, it is noted.

## TL;DR
The product is **structurally sound and not broken.** Settlement is deterministic, bootstrap
exclusion is multi-layered, Stripe signature + idempotency are present, tier gates are
server-side, security headers are set, motion + reduced-motion are exemplary. The work to be
"world-class" is real but mostly **quality/roadmap**, not "doesn't work." Two genuine
reliability holes were fixed this pass.

---

## ✅ Fixed this pass (verified + tested + green)
| Fix | File | Why it matters |
|---|---|---|
| Upstream **request timeout** (15s) on the Odds API client, errors wrapped as `OddsApiError(408)` | `packages/data-ingestion/src/{config,odds-api-client}.ts` + test | A hung upstream call could otherwise freeze the whole ingestion/settlement cron → stale board |
| **`?date=` hardening** in public picks via reusable `parseDateParam` | `apps/web/lib/parse-date-param.ts`, `app/api/picks/route.ts` + test | Malformed date no longer produces an Invalid Date query / 500 |

Validation: typecheck 0 errors (all workspaces) · full suite 1812 + 197 + 14 + 28 tests pass ·
guardrails 5/5 · build green.

---

## Severity recalibration (where the audits over-graded)
| Agent finding | Agent SEV | Verified reality | True class |
|---|---|---|---|
| Normalizer "`homeOutcome!.odds` will crash" | SEV2 | **Wrong** — code uses optional chaining (`home?.price`) everywhere | NON-ISSUE |
| `dev-noop` OAuth fallback "allows unauthenticated access" | SEV0 | **Wrong** — bad OAuth creds just *fail* sign-in; no default session granted | NON-ISSUE |
| Studio "video generation missing" | SEV0 | True but doctrine-only by design; no hidden automation; UI says manual | SEV3 (expectation) |
| Studio scanner "doesn't import trust-claims registry" | SEV0 | Primary `trust-gate.mjs` still runs in CI over all surfaces | SEV2 (defense-in-depth) |
| Confidence score "uncalibrated heuristic" | SEV1/2 | Honest + governed; changing it trips `model-freeze` guardrail | ROADMAP (governed) |
| Various "add Zod / SQL-injection risk" | mixed | Prisma parameterizes; inputs low-risk while picks gated off | SEV3/SEV4 |

---

## Domain findings (recalibrated, deduped)

### 1. Intelligence (`packages/prediction-engine`)
**Strengths:** deterministic settlement; multi-layer bootstrap/seed exclusion; versioned,
auditable picks; structural edge-absence (`MIN_PUBLISH_CONFIDENCE`); conservative Kelly.
**Roadmap (governed by `model-freeze` — needs a validated CalibrationProposal, not ad-hoc edits):**
- Confidence is a hand-tuned additive heuristic, not an empirically calibrated probability.
  Add an online calibration loop (isotonic/logistic) after N settled picks; publish calibration
  curves for transparency.
- Pre-mortem loss taxonomy maps only 3 of 9 root causes → autopsy learns from ~33% of losses.
- Validate the arbitrary thresholds (consensus 0.55, moneyline fairProb 0.58) against history.
> These are the path to *better intelligence*, not the path to *shipping*. Owner + calibration
> data required.

### 2. Ingestion / APIs / mapping
**Strengths:** Stripe **signature verification + webhook idempotency** (verified), server-side
tier gates at the query layer, immutable signal/source snapshots, security headers in
`vercel.json`, solid normalizer tests.
**Fixed:** upstream timeout; `?date=` guard (above).
**Next safe batch:** exponential backoff + jitter on Odds API 5xx/429; expose upstream quota
headers; minimum data-quality filter on public picks; settlement-freshness alert (>36h).
**Unverified (confirm before acting):** does `/api/cron/*` actually validate `CRON_SECRET`?
The process audit assumed yes — verify the route handlers next.

### 3. Studio / video / presentation / SEO
**Strengths:** strong **draft-only** guarantee (no auto-publish path; robots blocks
`/cockpit`,`/api`); compliance scan gates generation; root metadata + JSON-LD + sitemap +
robots are correct.
**Honest status:** **video is doctrine-only** — no ffmpeg/pipeline; all video is manual. Not a
risk, but the UI should say so plainly.
**Next safe batch (low-risk, high-SEO-leverage):** per-route OG `metadata` + canonical on the
~12 public pages that currently inherit the default; Twitter card per route.

### 4. Design system / a11y / mobile
**Strengths:** world-class doctrine (`DESIGN.md`), token architecture, and **exemplary motion +
global `prefers-reduced-motion`**.
**Top correction (verify-then-fix, brand-defining):** `apps/web/components/picks/pick-card.tsx`
and `evidence-audit-drawer.tsx` use **forbidden casino-`green`/`yellow`** Tailwind classes —
a violation of the project's own #1 visual rule. Safe fix = map to existing tokens
(`--verify` mint, `--alert` vermilion, `--ultraviolet`, `--orbital-cyan`). *Deferred to a
deliberate batch because it's a 468-line user-facing surface whose result needs visual
verification — not blind churn.*
**Next safe batch:** remove the cyan `:focus-visible` override (use global plasma rule);
add `aria-label`s to confidence/edge/risk/freshness metrics; bump `ion-2`→`ion-1` text where
contrast fails AA; mobile breakpoints + ≥44px tap targets.

### 5. Process / workers / security / gates
**Strengths:** centralized server-side readiness gates read fresh each cycle; CI guardrails
(trust-gate, model-freeze, draft-only, brand-safety); external cron with bearer auth +
concurrency groups; `(gameId, pickType)` unique constraint prevents settlement races.
**Owner-gated hardening (do NOT auto-change — protects the launch workflow):** `DEV_FAKE_ADMIN`
returns a synthetic ADMIN session with no production guard. **Recommended:** make
`scripts/check-deploy-readiness.mjs` **FAIL** (not warn) when `DEV_FAKE_ADMIN=true` in a true
production context, and/or gate behind an explicit non-preview marker. Left to owner because a
naive `NODE_ENV` guard would break intended Vercel-preview use.
**Next safe batch:** runtime gate-sequencing validator; settlement snapshot retry/DLQ;
request-correlation IDs for debugging.

---

## Master roadmap (prioritized for "reliable & earning")
**P0 — done:** Odds API timeout · `?date=` guard.
**P1 — next safe batch (no owner gates, each tested):**
1. Confirm `CRON_SECRET` validation on cron routes (verify; fix if missing).
2. a11y quick wins: focus-visible override, metric `aria-label`s, AA contrast bumps.
3. Per-route OG metadata + canonical (SEO/social reach).
4. Odds API retry/backoff + jitter; min data-quality filter on public picks.
**P2 — deliberate batches (need verification/visual check):**
5. `pick-card`/`evidence-drawer` forbidden-color → token migration (visual review).
6. Mobile breakpoints + ≥44px tap targets.
7. Runtime gate-sequencing validator; settlement retry/DLQ; correlation IDs.
**Owner-gated (your call):** `DEV_FAKE_ADMIN` prod kill-switch · payments activation · live AI ·
public-picks gate · launch flip · the 6 Zone-3 data/licensing items.
**Governed (model-freeze + calibration data):** confidence calibration loop · loss-taxonomy
expansion · threshold validation.

## Path to first revenue (what only the owner can do)
A working, *earning* product needs these owner steps (all behind existing safe gates):
1. Real env/secrets in prod (DB, `NEXTAUTH_SECRET`, Stripe live keys + price IDs, Odds API key).
2. Stripe products/prices + webhook endpoint registered → flip payments on.
3. Decide data-rights/compliance posture; then sequence the readiness gates
   (canonical history → public picks) — never skip the order.
4. Keep live AI off until a bounded, reviewed use is approved.
`scripts/check-deploy-readiness.mjs` already validates most of this; run it before any flip.

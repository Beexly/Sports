# GSE — Risk & Failure Register

Consolidated risks found this session, with severity, status, evidence, and the
recommended action. Status: ✅ fixed this session · 🔶 open (safe to do) · 🔴 open
(needs founder/owner decision) · 📋 documented/monitor.
Labels: `verified` (reproduced) · `inferred` · `recommended`.

> Single source of live decisions: `_logs/DECISIONS.md`. Prior intent + open items
> from the ~15 Codex/handoff docs: `CLAUDE_CODEX_HANDOFF.md`.

---

## P0 — trust-fatal

| # | Risk | Status | Evidence / Action |
|---|---|---|---|
| 1 | **Away-favored SPREAD picks were mis-graded** (line stored away-perspective; settlement reads home-perspective) → a clear LOSS recorded as WIN, corrupting win rate/calibration/CLV. | ✅ fixed | Proven via probe; fixed in `scoring.ts` (`line: avgSpread`) + `pick-card.tsx`; regression test `spread-line-convention.test.ts`. **Owner follow-up:** re-grade any away-favored spreads already settled under old logic (needs DB; none likely in bootstrap). `verified` |
| 2 | **Settlement single-point-of-failure** — `settle-picks` Vercel cron was a no-op; grading only in a worker. Vercel-only deploy → no track record. | ✅ fixed | Extracted shared `settleSport()`; cron now grades. **Residual 🔶:** add a "stale unsettled picks" alert. `verified` |

## P1 — high

| # | Risk | Status | Evidence / Action |
|---|---|---|---|
| 3 | **Confidence treated as a probability** in the public calibration report (wrong for spread/total priced ~50%). | ✅ mitigated | Added market-neutral `discrimination` metric (does win rate rise with confidence?). **Gated follow-up 🔴:** persist a modeled win-probability distinct from the confidence UX score + market-aware proposals (MODEL_VERSION bump). `verified` |
| 4 | **Pricing was anti-competitive + churn-hostile** — $9.99/wk (~$43/mo) priced above proven Dimers ($24.99/mo) while pre-record; weekly billing. | ✅ fixed | Repriced to Founding monthly+annual ladder; `COMPETITIVE_PRICING_AND_PACKAGING.md`. **Owner action 🔴:** create the 4 test-mode Stripe prices + set env IDs; advance `PRICING_PHASE` only on proof. `verified` |
| 5 | **Casino green/red on the trust surface** (calibration panel) — tout aesthetic on the proof page. | ✅ fixed | Re-skinned to brand tokens (verify/alert/ion) + non-color glyphs. Other Tier-B surfaces (pick-card chrome) still use raw `gray-*` 🔶. `verified` |
| 6 | **No model tiering / no prompt caching** — every Claude call hardcoded Sonnet. | ✅ infra shipped | `model-router.ts` + opt-in caching (zero behavior change today). **Follow-up 🔶:** flip cheap surfaces (brief, calibration-insight) to Haiku + enable caching at call sites; measure via cost ledger. `verified` |
| 7 | **apps/web tests run on a stub Prisma** — no live-DB/migration coverage. | 🔶 open | Add a thin integration suite vs a disposable Postgres in CI. `verified` |
| 8 | **No product analytics / event tracking and no email/lifecycle infra** — the funnel is blind; no welcome/dunning/winback. | 🔴 open | Tooling decision (privacy-first analytics e.g. Plausible; email provider). See `SALES_CONVERSION_AND_CRM.md`, `MARKETING_AND_GROWTH_BLUEPRINT.md`. `verified` |

## P2 — medium

| # | Risk | Status | Evidence / Action |
|---|---|---|---|
| 9 | **13 npm vulnerabilities (1 critical, 4 high)** + EOL deps (eslint 8, glob 7, rimraf 3). | 🔶 open | Triage `npm audit`; plan eslint 9 / dep refresh. `verified` |
| 10 | **Single odds provider; `MIN_BOOKMAKERS=2`** — two agreeing books read as 100% consensus; no failover. | 🔴 open (model) | Add failover provider; raise/penalize thin-market floor (changes pick generation → MODEL_VERSION decision). `verified` |
| 11 | **No CSP / HSTS** security headers (others are double-layered in next.config + vercel.json). | 🔶 open | Add HSTS (safe); add CSP carefully (can break inline scripts) — test rendering. `inferred` (per production audit) |
| 12 | **Accessibility:** 11px `ion-2` text fails AA contrast (~3:1); some color-only badges. | 🔶 open | Bump small-text color/size; add glyphs/labels to color-only states. `inferred` |
| 13 | **Elite tier under-differentiated** — today only +alerts vs Pro. | 📋 monitor | Don't price Elite at $49 until early-access / advanced analytics / ask-the-model chat ship (no fabricated value). `verified` |

## Open decisions for the founder (🔴)

- **Brand name: GSE vs GSN.** Code/domain/all Codex docs = **Galaxy Sports Edge (GSE)**;
  "GSN" appears only in the operator brief + early session notes. GSE is what ships.
  Pick one before any brand/public work. `verified` (`CLAUDE_CODEX_HANDOFF.md`)
- **Deploy status unconfirmed.** Two Codex docs claim production was live; the
  GO_LIVE_RUNBOOK treats it as an unstarted owner action; nothing is reachable here.
  Treat as **not live** until verified. Production deploy is a hard stop (needs approval).
- **Stripe test-mode price creation + `PRICING_PHASE` advancement** (above).
- **Calibration probability split** (#3) — MODEL_VERSION-gated.

## Hard stops respected this session (`verified`)
No destructive DB ops, no Stripe live mode / money movement, no production deploy. All
changes are code/config/docs on branch `claude/trusting-ramanujan-mYK6E`, each verified
green (typecheck + full test suite + production build) before commit.

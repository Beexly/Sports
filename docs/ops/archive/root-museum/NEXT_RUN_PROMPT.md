# GSE — Next Run Prompt / Continuation State

Snapshot for the next agent or the founder. Branch: `claude/trusting-ramanujan-mYK6E`.
Everything below is committed + pushed. Freshest decision trail: `_logs/DECISIONS.md`.
Full risk view: `RISK_AND_FAILURE_REGISTER.md`. Prior intent: `CLAUDE_CODEX_HANDOFF.md`.

## Current state (`verified`)
- Typecheck green (9 workspaces); full test suite green (apps/web ~167 files, engine 8,
  ingestion 2, types 1); production `next build` green (64 pages); trust-gate clean.
- A live-DB integration smoke exists (`npm run test:integration:db` + `npm run db:disposable`).

## Shipped this session (18 commits, each verified green)
Engine/correctness: P0 away-favored spread mis-grading fix; settlement single-point-of-
failure fix (shared `settleSport`); CLV engine; calibration discrimination metric;
probability-calibration R&D toolkit (isotonic/Brier-decomp/ECE).
Product/UX: public Calibration & Discrimination panel on `/performance` (+ brand-token
re-skin); pricing reset to Founding rates + named proof-gated ladder (monthly+annual)
with a data-driven phase-readiness evaluator; conversion links on locked pick fields;
`/performance` proof OG card; bespoke homepage SEO metadata; www/apex canonical fix.
Platform: model-router + opt-in prompt caching (zero behavior change); HSTS header;
live-DB integration suite; seed cruft scrub.
Strategy/docs: 7 department blueprints, competitive intelligence, pricing research,
Codex handoff digest, risk register, compliance & responsible gaming.

## Next actions — SAFE (no approval needed)
1. **Model-tier flips + caching** (highest cost ROI): in `lib/claude-api/model-router.ts`
   flip `brief` + `calibration-insight` to Haiku; enable `cache:{system:true}` at the
   high-volume call sites. Validate each surface's output, measure via the cost ledger.
2. **Expand the integration suite**: add live-DB coverage for the settlement path and the
   calibration loader; consider a `test:integration` vitest config gated on `DATABASE_URL`.
3. **Dependency/vuln triage** (R9): `npm audit`; plan eslint 9 / glob/rimraf refresh; re-validate.
4. **A11y polish** (R12): bump 11px `ion-2` text contrast; audit remaining color-only states.

## Next actions — GATED / need founder or owner
- **Brand name GSE vs GSN** — code/domain say GSE; pick one before brand/public work.
- **Calibration probability split** (R3) — persist a modeled win prob distinct from the
  confidence UX score; calibrate with the new toolkit; market-aware proposals. MODEL_VERSION bump.
- **`MIN_BOOKMAKERS` / odds failover** (R5) — model-behavior change; needs a second provider.
- **Stripe**: create the 4 test-mode prices + set `STRIPE_{PRO,ELITE}_{MONTHLY,ANNUAL}_PRICE_ID`;
  advance `PRICING_PHASE` only when `evaluatePhaseAdvance` is eligible AND added value shipped.
- **Analytics + email/lifecycle infra** (R8) — tooling decision (privacy-first analytics; ESP).
- **Production deploy** — hard stop; confirm not-live status first (`CLAUDE_CODEX_HANDOFF.md`).

## Blockers hit this run
- **No headless browser** — `cdn.playwright.dev` is not in the network allowlist, so I
  cannot render/screenshot the site → visual best-of-best iteration needs that host
  allowlisted, or founder visual review. (Playwright dep was installed then reverted.)
- **No live `THE_ODDS_API_KEY`** → odds connectivity unverified (read-only check pending).
- Hard stops (deploy, Stripe live, destructive DB) respected — untouched.

## Useful commands
```
npm run typecheck && npm run test && npm run build   # full gates
npm run db:disposable                                # spin local PG16 (ephemeral)
DATABASE_URL=... npm run test:integration:db         # live-DB smoke
node scripts/guardrails/trust-gate.mjs               # banned-phrase scan
```

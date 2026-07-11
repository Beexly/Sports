# 02 — Current Truth Map

Verified against code on 2026-07-11 (evidence path per claim). This is what
the frontier workstreams build on and must not rebuild.

| # | Truth | Evidence |
|---|---|---|
| 1 | Next.js/TypeScript/Postgres/Prisma platform with BullMQ/Redis workers, Stripe, The Odds API, Claude API, Vitest, Docker, GitHub Actions | `package.json`, `packages/db/prisma/schema.prisma`, `workers/`, `.github/workflows/` |
| 2 | Jarvis is a governed, deterministic intelligence layer; external actions require approval | `apps/web/lib/jarvis/*`, `lib/cockpit/ask-jarvis.ts` (deterministic handlers, no model calls) |
| 3 | Agent Council defines 23 governed seats with authority tiers, prohibited actions, handoffs; seats are roles, not processes; none autonomous | `lib/jarvis/agent-council.ts` (+ `__tests__/jarvis-agent-council.test.ts`) |
| 4 | Task/review/provenance substrate exists: `CockpitTask` (allow-listed state machine), append-only `CockpitDecision`, `AgentHandoff`, `SubagentRun` | `schema.prisma` models; `lib/cockpit/transitions.ts` |
| 5 | Jarvis memory store implemented in code (models, migration, state machine, guards, conflict detection, review queue, live counts); NOT activated | Ledger entry C1 in `03_CONTRADICTION_LEDGER.md` |
| 6 | Memory production migration is in production's ledger (predates last-common point); first governed write remains owner-gated | `docs/ops/MIGRATION_LEDGER_RECONCILIATION_RUNBOOK.md` |
| 7 | Resource Intelligence has deterministic parse → dedupe → classify → ledger with dispositions and gated-leak isolation | `apps/web/lib/resource-intelligence/*` + resource tests |
| 8 | Decision Genome implements claims/proof obligations, knowability, candidate ledger, aperture, Agent Court, Decision Replay, proof cards, Epistemic Alpha, conformal gating, market physics, claim independence, rumor quarantine | `apps/web/lib/decision-genome/*` |
| 9 | AI call sites are Claude-only with cost/budget records (`ClaudeApiCallRecord`, `ClaudeApiBudget`); no provider-neutral router exists | `apps/web/lib/claude-api/*`, `schema.prisma` |
| 10 | Sealed Engine / proof surfaces expose outcomes + browser-verifiable receipts while method stays sealed (CI-enforced) | `__tests__/sealed-engine.test.ts`, `lib/engine/load-engine-story.ts` |
| 11 | CLV grading runs at settlement with a public coverage-gated report | `packages/ingestion-pipeline/src/settle-sport.ts`, `lib/performance/public-clv-policy.ts` |
| 12 | Source-rights clearance gates every extraction; no evasion tooling | `apps/web/lib/scraping/clearance-engine.ts`, `source-rights-registry.ts` |
| 13 | Paywall enforcement is server-side; FREE sees a 2-pick teaser; Pro/Elite gates enforced in loaders | `lib/picks/*`, entitlement tests |
| 14 | Production deploys fail closed at the migration gate until the owner reconciles the ledger | `scripts/deploy/migrate-if-configured.mjs`, runbook |

Discrepancies found during verification are in `03_CONTRADICTION_LEDGER.md`
(C1–C10) — all fixed in Workstream A.

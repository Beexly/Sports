# Current System State — Galaxy Sports Edge

Last updated: C34 — 2026-05-29

## Branch and commit

| Field | Value |
|---|---|
| Branch | `claude/determined-keller-dUcdG` |
| HEAD | `929cd65` — C24-C33: Galaxy Operating Control Plane |
| Working tree | Clean (0 uncommitted changes) |

## Verification matrix

| Check | Status |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npx vitest run` | PASS — 168 test files, 2297 tests |
| `node scripts/guardrails/trust-gate.mjs` | PASS — 349 files scanned, 0 hits |
| `npm run build` | (deferred — build requires env vars; typecheck is proxy) |
| Intelligence evals (`tests/intelligence/`) | PASS — 5 files, 88 tests |

## Route inventory

| Metric | Count |
|---|---|
| Total route files (`page.tsx` + `route.ts/tsx`) | 159 |
| Page surfaces (`page.tsx`) | 104 |

## Runtime Import Coverage Matrix

This is the audit finding that motivates C35–C44.

| Registry | File(s) | Runtime Imports | Classification |
|---|---|---|---|
| **Routes Catalog** | `lib/galaxy/routes-catalog.ts` | nav, mobile-nav, sitemap | ✅ LOAD-BEARING |
| Kernel (existing) | `lib/galaxy/kernel/{index,launch-modes,public-copy-rules,trust-rules}.ts` | 0 | ❌ DEAD |
| Telemetry Events | `lib/telemetry/events.ts` | 0 | ❌ DEAD |
| Telemetry Surfaces | `lib/telemetry/surfaces.ts` | 0 | ❌ DEAD |
| Telemetry Intent | `lib/telemetry/intent.ts` | 0 | ❌ DEAD |
| Telemetry Privacy | `lib/telemetry/privacy.ts` | 0 | ❌ DEAD |
| User Understanding | `lib/understanding/user-understanding.ts` | 0 | ❌ DEAD |
| Confusion Signals | `lib/understanding/confusion-signals.ts` | 0 | ❌ DEAD |
| Learning State | `lib/understanding/learning-state.ts` | 0 | ❌ DEAD |
| Decision Quality Maturity | `lib/decision-quality/maturity.ts` | 0 | ❌ DEAD |
| Process Grades | `lib/decision-quality/process-grades.ts` | 0 | ❌ DEAD |
| Behavior Patterns | `lib/decision-quality/behavior-patterns.ts` | 0 | ❌ DEAD |
| Experiment Engine | `lib/experiments/{experiments,variants,metrics,guardrails}.ts` | 0 | ❌ DEAD |
| AI Governance | `lib/ai-governance/{risk-controls,assistant-boundaries,agent-actions}.ts` | 0 | ❌ DEAD |
| Taste Critic | `lib/design-review/{taste-criteria,anti-patterns}.ts` | 0 | ❌ DEAD |
| Experience Orchestrator | `lib/experience/{orchestrator,user-modes,surface-priority,next-best-surface}.ts` | 0 | ❌ DEAD |
| Responsible Intelligence | `lib/responsible-intelligence/{friction,restraint}.ts` | 0 | ❌ DEAD |
| Trust UX | `lib/trust/{trust-signals,disclosures,source-labels}.ts` | 0 | ❌ DEAD |
| Explainability | `lib/explainability/{levels,renderers}.ts` | 0 | ❌ DEAD |
| Positioning Firewall | `lib/brand/positioning-firewall.ts` | 0 | ❌ DEAD |
| Presentation Moments | `lib/presentation/moments.ts` | 0 | ❌ DEAD |
| EvidenceCard | `components/ui/evidence-card.tsx` | 0 surface imports | ⚠️ COMPONENT EXISTS, NOT COMPOSED |

**Summary:** 1 of 22 registries drives live UI behavior. 21 are test-only or dead weight.

## C13 status (per-report-type detail routes)

**DEFERRED into C35.** The `reports.ts` kernel registry built in C35 will
power dynamic `/reports/[type]/page.tsx` detail routes. No work was lost —
C13's anchor (the reports hub at `/reports`) shipped; C35 satisfies the
per-type requirement by building the registry + detail route together.

## C20–C33 commit status

All committed in `929cd65` (C24-C33 batch) and `3a60011` (C20-C23 batch). Both pushed.

| Cycle | Layer | Status |
|---|---|---|
| C20 | Telemetry Registry | ✅ committed + pushed |
| C21 | User Understanding Model | ✅ committed + pushed |
| C22 | Decision Quality Maturity | ✅ committed + pushed |
| C23 | Experiment Engine | ✅ committed + pushed |
| C24 | AI Governance | ✅ committed + pushed |
| C25 | Taste Critic | ✅ committed + pushed |
| C26 | Experience Orchestrator | ✅ committed + pushed |
| C27 | Responsible Intelligence | ✅ committed + pushed |
| C28 | Trust UX | ✅ committed + pushed |
| C29 | Explainability Ladder | ✅ committed + pushed |
| C30 | Intelligence Eval Harness | ✅ 88 tests pass |
| C31 | Product Science Ledger | ✅ committed + pushed |
| C32 | Positioning Firewall | ✅ committed + pushed |
| C33 | Presentation Moments | ✅ committed + pushed |

## Owner-only actions (cannot be performed from CLI)

1. Confirm GitHub repo visibility is `private`
2. Approve Prisma ADRs 003–007 (database schema migrations blocked by owner)
3. Set 14 environment variables for production deploy
4. LCP / axe measurements (require deployed environment)

## Open ledger items

| Priority | Item | Status |
|---|---|---|
| E | Confirm `THE_ODDS_API_KEY` absent — bootstrap mode labeled everywhere | OPEN |
| H | Measure Core Web Vitals on top 5 routes against 2.5s/200ms/0.1 targets | OPEN (owner action) |

## Next cycle

**C35 — Product Kernel Binding Pass.** Build `lib/galaxy/kernel/{surfaces,pricing,reports,academy,artifacts}.ts`;
migrate routes-catalog / nav / pricing / reports / orbit to consume them; build `/reports/[type]/page.tsx`.

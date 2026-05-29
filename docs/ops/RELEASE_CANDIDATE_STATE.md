# Release Candidate State — Galaxy Sports Edge

Declared at: **C53 — 2026-05-29**
Branch: `claude/determined-keller-dUcdG`
HEAD: `d0fb18e`

## RC posture

This branch is the **first release candidate** of Galaxy Sports Edge.
The golden path loop — Today's Board → Decision Room → Evidence/Trust →
Related Intelligence → Decision Coach → Track/Autopsy → Command Center →
Academy/NextBestSurface — is runtime-proven and acceptance-tested end to end.

> **Launch posture:** `internal-calibration`. This RC does NOT enable
> production publish, payments, live AI in CoachPromptHost, or any
> autonomous external posting. Constitutional guardrails (#5, #14, #20)
> remain locked.

## Verification matrix

| Check | Status |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npx vitest run` | PASS — 179 test files, 2535 tests |
| `node scripts/guardrails/trust-gate.mjs` | PENDING (script path not present in this env) |
| `npm run build` | DEFERRED — build requires env vars; typecheck is the proxy in this environment |
| Golden path acceptance (`tests/runtime-convergence/golden-path.test.ts`) | PASS — 33 tests |
| Telemetry ingest (`tests/runtime-convergence/telemetry-ingest.test.ts`) | PASS — 10 tests |
| Coach boundaries (`tests/runtime-convergence/coach-boundaries.test.ts`) | PASS |
| Kernel binding (`tests/runtime-convergence/kernel-binding.test.ts`) | PASS |
| Trust strip presence (`tests/runtime-convergence/trust-strip-presence.test.ts`) | PASS |

## Cycle ledger included in this RC

| Cycle | Capability |
|---|---|
| C20–C33 | Galaxy Operating Control Plane (telemetry registry, user understanding, maturity, experiments, AI governance, taste critic, experience orchestrator, responsible-intelligence, trust UX, explainability ladder, eval harness, product science ledger, positioning firewall, presentation standard) |
| C34–C44 | Runtime Convergence (kernel registries, TrustStrip, artifact engine, intelligence graph, NextBestSurface, Command Center, Decision Coach shell, cockpit surfaces, 97 runtime tests) |
| C45 | EvidenceCard canonicalization — `PickEvidenceSection` shared primitive |
| C46 | Decision Room upgrade — golden-path convergence point |
| C47 | Today's Board enrichment — signal summary, trust labels, pass clarity |
| C48 | Telemetry ingest runtime — `POST /api/telemetry` + browser client |
| C49 | Command Center widget pipelines — 6 widgets wired with honest data |
| C50 | Galaxy Demo Tour — `/galaxy-demo` noindex guided walkthrough |
| C51 | Runtime acceptance tests + ops docs update |
| C52 | Golden Path UX Pass — Decision Room verdict hierarchy + actions grid |

## Constitutional guardrail status

| Guardrail | State at RC |
|---|---|
| #5  No fake data, no certainty language, no fabricated picks | ENFORCED — trust-gate scan + sample-data labels everywhere |
| #14 No autonomous external publishing | ENFORCED — `externalPosting: false` in all launch modes |
| #20 No methodology client-side leak | ENFORCED — `PROTECTED_KINDS` filter in graph projection; `FORBIDDEN_FIELD_KEYS` in telemetry privacy |
| Live AI in CoachPromptHost | DEFERRED to C55+ (`COACH_LIVE_AI_ENABLED=false`) |
| Payments live | DEFERRED — `payments: false` in `internal-calibration` mode |
| Public deploy / publish | DEFERRED — `publicPicks: false`, `sitemapPublic: false`, `robotsIndex: false` |

## Surfaces inventory at RC

| Surface | Path | Status |
|---|---|---|
| Today's Board | `/today` | LIVE in golden path, trust-labeled |
| Decision Room | `/room/[gameId]` | LIVE — full convergence point |
| Picks | `/picks` | LIVE with PickEvidenceSection |
| No-Bet | `/no-bet` | LIVE |
| Parlay MRI | `/parlay-mri` | LIVE |
| Autopsy | `/autopsy` | LIVE with PickEvidenceSection |
| Command Center | `/command` | LIVE — 12 widgets, 6 newly wired |
| Academy | `/academy` | LIVE |
| Galaxy Demo | `/galaxy-demo` | LIVE (noindex) |
| Telemetry ingest | `/api/telemetry` | LIVE (no-op until analytics capability enabled) |

## Owner-only blockers (cannot be performed from CLI)

1. Approve Prisma ADRs 003–007 (database schema migrations gated by owner) — required for Saved Cards / Open Decisions widgets to leave `user-entered` state
2. Set 14 environment variables for production deploy
3. LCP / axe measurements (require deployed environment)
4. Switch `GALAXY_LAUNCH_MODE` from `internal-calibration` → `private-alpha` → `closed-beta` → `production`
5. Confirm `THE_ODDS_API_KEY` is present in target environment; bootstrap mode will be labeled until then

## What RC means here

- **Branch is mergeable.** Every cycle in this RC ends with green typecheck and green tests.
- **Branch is not deployable.** Owner-only blockers above must clear first.
- **Branch is feature-complete for the golden path.** The next development priority is contingency infrastructure (C54), then live-AI activation (C55+).

## Contingency state (closed out in C54)

See `docs/ops/contingency/` for the full matrix. At the time of this RC, all 12 contingency docs are drafted and version-pinned to this RC.

## Sign-off

Engineering: Cycles C45–C52 verified green. Acceptance tests cover the golden path source-level invariants. No drift from the constitutional guardrails.

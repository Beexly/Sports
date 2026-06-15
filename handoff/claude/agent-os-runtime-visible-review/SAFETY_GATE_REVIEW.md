# SAFETY GATE REVIEW — gate-by-gate

Verdict: **no gate weakened. All preserved or strengthened.** Codex modified **no** existing
safety/rights/billing/auth file; the work is additive. The new modules re-assert the gates in
types and tests.

| Gate | Status | Evidence on Codex's branch |
|---|---|---|
| **Source-rights** | ✅ preserved + reinforced | No change to `clearance-engine.ts` / `source-rights-registry.ts` / `data-rules.ts`. `SCRAPE_PROTECTED_SOURCE` is in `FORBIDDEN_EXTERNAL_ACTIONS` for **every** agent. `planWorkflowRun` sets `canRunSafely=false` on a `PROTECTED_SOURCE` event. TAL owns `source-rights` task type. Test: "protected sources … block workflow run plans." |
| **Responsible-gaming** | ✅ untouched | No `responsible*` file modified. No new public-facing betting claim surface; cockpit is owner-internal. |
| **Owner-approval** | ✅ preserved + reinforced | `ownerApprovalRequired = status!=="REAL" || scoringSensitive || blockedTooling` → since 0 agents are REAL, **every** agent requires owner approval. `canCompleteTaskAutomatically` returns false on any approval/review/blocked state. `workflowRequiresOwnerApproval`. Tests: "owner-gated workflows cannot skip owner gates," "prism ownerApprovalRequired === true." |
| **Public-picks / public-claims** | ✅ preserved + reinforced | `ENABLE_PUBLIC_PICKS` + `CHANGE_PUBLIC_CLAIM` forbidden for all agents. `workflowCanPublish()` typed to return literal `false`. `publicGateStatus` = "Public picks cannot self-enable…". Tests: every workflow `canPublish=false`; content workflow `ownerApprovalRules` contains "publish." |
| **No-fake-data (live)** | ✅ preserved | Cockpit renders only real registry/health data; `companyHealth` cannot be "HEALTHY." Stub-DB mode returns honest empty/in-memory states (loud `[@sports/db] stub Prisma client active` warning observed in test run). |
| **No-fake-data (historical)** | ✅ preserved + reinforced | `isSettledHistoricalSeason(2026,2026)===false`; `planWorkflowRun` blocks `UNSETTLED_SEASON`; `PROJECTION_FEATURE_REGISTRY` every feature `excludesUnsettledSeasons`. GSIS-only player merge; `unsafeNameOnlyMergeAttempt` never auto-merges; `resolveGameIdentity` returns `UNSAFE_COMMENCE_TIME_ONLY`. Tests cover all of these. |
| **No-fake-data (revenue)** | ✅ preserved + reinforced | `revenueStatus` = "Unknown until real Stripe/funnel signals are parsed; no fake revenue." BOBBY mission "without inventing customers or revenue"; MINT "real Stripe/cost inputs only." |
| **Model-weights-without-proof** | ✅ preserved + reinforced | `CHANGE_MODEL_WEIGHT` forbidden for all. `workflowCanChangeModelWeights()` typed to return literal `false`. PRISM/ASCEND/AUDIT are scoring-sensitive → HIGH risk, `claudeReviewRequired`, missions "cannot change weights." `calibrationStatus` = "model weights cannot change automatically." `PROJECTION_FEATURE_REGISTRY` every feature `requiresOwnerApprovalForWeightChange`. |
| **Calibration ≠ public-readiness** | ✅ preserved | `isDisplaySafe` requires BOTH an explicit `displaySafe` flag AND `sampleSize >= 25`. Calibration is AUDIT/MANUAL-owned. |
| **No-evasion / tool-governance** | ✅ preserved | `ENABLE_BROWSER_CONTROL` / `ENABLE_VOICE_CONTROL` / `ENABLE_EXTERNAL_TOOL` forbidden for all. PILOT/ECHO/RELAY are NOT_WIRED, HIGH risk, "remain blocked until…" Tests pin the blocked messages. No evasion tooling added. |
| **No external actions** | ✅ preserved | `externalActionsAllowed: false` hardcoded for all 23 agents (asserted in the spine test for every agent). |

## Structural honesty mechanisms (why this is hard to regress)

1. `companyHealth` has **no** healthy/green value.
2. `operationalCapacity` counts only REAL|PARTIAL — and **0** agents are REAL.
3. `workflowCanPublish` / `workflowCanChangeModelWeights` return the **literal type** `false`
   — they cannot be made true without editing the function signature.
4. `AgentTask.safeActionType` is typed to the 14 safe actions only — a task cannot carry a
   forbidden action as its action type.
5. The spine test asserts these as invariants, so a future fake-green change fails CI.

## The only finding

Not a safety hole: the agent-task **DB persistence** is in-memory-only today (required
`CockpitTask.assignedAgent` omitted; `OperatorAgent` enum has 6 of 23 agents). Graceful
fallback, honest UI. Documented in PATCH_REVIEW_REPORT.md §5 + NEXT_BEST_BUILD.md.

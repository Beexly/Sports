# GRANTS-PATHS VERIFICATION — Charge 8 (Motif-executed)

**Lane note:** Assigned to the motif-vm AGY Flash instance (Task C). That run was interrupted at 03:36 CT by Motif's own kill command aimed at a hung DeepSeek process — Motif's error. The Flash log contains only "error: interrupted"; no deliverable was written by the lane. Motif executed the verification directly with the task's method (tree listings + API reads). Authorship: Motif, not Flash.

**Trees checked:** main-side HEAD c0c721cc8 (qa-repo commit tree) and branch agy/total-wiring-2026-11-07 (GitHub API contents reads).

## 1. The three paths

| Path | main HEAD | AGY branch |
|---|---|---|
| docs/ops/STARTUP-CREDITS-AND-GRANTS-EXECUTION-PACK-2026-11-06.md | **EXISTS** | EXISTS |
| docs/ops/NON-DILUTIVE-FUNDING-AND-GRANTS-EXECUTION-PACK-2026-11-06.md | **ABSENT** | EXISTS |
| apps/web/lib/observability/posthog-grant-governor.ts | **ABSENT** | EXISTS |

## 2. Paths cited by the pack that exists on main

Extracting path-like strings with code/data extensions from STARTUP-CREDITS-AND-GRANTS-EXECUTION-PACK-2026-11-06.md yields 2 repo paths:

- `apps/web/lib/observability/posthog-grant-governor.ts` — **ABSENT on main** (the pack cites as existing a file that is not on main).
- `packages/prediction-engine/src/nfl/unified-corpus-and-gsi-wiring-bridge.ts` — EXISTS on main.

## 3. What posthog-grant-governor.ts actually is (branch copy, read in full header + config)

A PostHog telemetry governor config for the $50,000 startup grant: exports `PostHogGovernorConfig` and `DEFAULT_POSTHOG_GOVERNOR_CONFIG` = { projectId "516325", grantCreditUsd 50000, productionSampleRate 0.1, suppressInternalHealthPings true }, plus an internal-ping prefix list (/api/health, /api/cron/, /_next/static/, /favicon.ico) whose events are to be suppressed so grant credits are not burned on synthetic traffic. It is a config/constants module (~58 lines in the PR #1260 bundle) — real, small, and exactly what its header claims.

## 4. Verdict on Charge 8's FAIL → PASS flip

The flip is supported **on the AGY branch only**. On main, the second pack does not exist and the governor file the first pack cites does not exist — Charge 8 as a statement about main remains FAIL. AGY's suite reported the flip after the file appeared inside Jules PR #1260's bundle; that PR's head is a Jules-side branch, and the file also exists on agy/total-wiring-2026-11-07. Nothing about the flip is false, but it is branch-state, not main-state — the same distinction as the rest of tonight's wiring claims.

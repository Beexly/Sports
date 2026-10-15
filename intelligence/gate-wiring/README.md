# Gate-wiring shadow registry

Batch-wise shadow registration of landed-not-wired modules from the
Oct 13 gate sweep (`docs/ops/SWEEP-2026-10-13-GATES.jsonl`, 229 rows;
182 landed-not-wired), executed per Grok's WO-1 wiring plan: prioritize
by pipeline exposure; per module — confirm no μ contact, sign-convention
audit (μ = +spread_line), characterization test pinning current
behavior, feature-flag/record defects, register as shadow weight 0.

**What shadow registration is:** a registry entry in
`shadow-registry.json` plus characterization tests co-located with the
module. **What it is not:** no production caller is added, no production
file is modified, no behavior changes, nothing merges without the
migration-ledger runbook and two-agent review. Weight is 0 for every
entry; emission stays ZERO_OBJECT.

## Batch 1 (2026-10-15) — 5 modules

| Sweep id | Module | Tests before | Characterization added |
|---|---|---|---|
| G-21 | apps/web/lib/auth/age-gate.ts | 6 (co-located) | 7 pins |
| G-22 | apps/web/lib/auth/csrf-origin-guard.ts | **none** | 9 pins (first suite) |
| G-25 | apps/web/lib/claude-api/numeric-guard.ts | **none** | 14 pins (first suite) |
| PE-125 | packages/prediction-engine/src/markets/1910-08858v2-spread-win-probability-table.ts | 5 (co-located) | 10 pins |
| PE-048 | packages/prediction-engine/src/decision/2104-08236v1-totals-abstention-sigma.ts | 9 (co-located) | 10 pins |

Plus `shadow-registry.test.ts` (4 integrity tests). Full run at build
time: **74/74 tests pass** (54 new + 20 pre-existing in the same files'
suites), vitest, node environment, mirrored-tree harness.

## Defects recorded (pinned, not fixed — characterization first)

1. **PE-125 name/content mismatch:** no spread→win-probability table
   exists in the file; generic scoring utilities only; its own header
   records the P(Win|PS) gate as NOT EVALUATED.
2. **PE-125 spearman ties:** ties broken by position, no rank averaging —
   a constant series returns ±1.
3. **G-25 phantom magnitude claim:** a ≥2-decimal percent also yields a
   magnitude claim for its truncated prefix; fail-closed but makes
   two-decimal percents effectively unvalidatable.
4. **G-21 stale framing:** the 21+ checkout gate was removed 2026-09-14
   by founder decision; the module is retained utilities. Registration
   is documentation-grade — do not wire into checkout.
5. **PE-048 publish-shaped surface:** publish rule + gate helper sit
   behind `ENABLED = false`; the characterization pin on that flag is
   the tripwire against silent activation.

Full per-entry detail: `shadow-registry.json`.

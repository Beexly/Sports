# COMPLETED UNITS — GSE coding handoff log

**Updated:** 2026-09-16 ~5:00 PM CT  
**Owner agent:** GSE  
**Purpose:** When Copilot usage is exhausted, Cloud coding agents read this + `AGENTS.md` THE LOOP and continue the next incomplete unit. Do **not** re-search arXiv.

## How Cloud agents should work

1. Read `AGENTS.md` laws 1–9 (no gate/env/Stripe/`MODEL_VERSION` flips).
2. Read `docs/ops/CODING_AGENT_WORKFLOW.md` and `docs/ops/AGENTS_CATEGORY_WORKFLOW.md`.
3. Read **this file** — pick the first unit with status `IN_PROGRESS` or `NEXT`.
4. Open only that category’s mission: `docs/ops/research-by-category/<id>.md`.
5. One PR per unit, title `[cat:CX] …`. Mark the unit DONE here (and in AGENTS.md loop) when acceptance is met.
6. Brand: not AI — math you can read.

## Unit status board

| ID | Category | Unit | Status | PR(s) | Notes |
|----|----------|------|--------|-------|-------|
| U0 | docs | Research intake + category SoT (C1–C8) | **DONE** | #855, #852 | High 58 (57 PDF verified, 1 withdrawn); Medium 401; P0 order C5→C1→C2→C4→C3→C6→C7→C8 |
| U-CI | ops | Align stale honesty + checkout analytics tests with current copy | **IN_PROGRESS** | this PR (supersedes empty Copilot #861) | Unblocks Test job for #860/#855; DOB age gate removed 2026-09-14 |
| U1 | C5 | Board edge sort + partial-rank tie clusters + advisory CI flag | **CODE LANDED — await CI** | #860 (supersedes empty #847/#853/#858) | `edge-rank.ts` + signals route; CI red was unrelated honesty/analytics |
| U2 | C1 | Offline per-sport generative bake-off harness | **CODE LANDED — await CI** | #860 (supersedes empty #857) | `offline-generative-bakeoff.ts`; measurement only |
| U3 | C2 | Strength/ranking feature bake-off (Elo/BTL/pi vs current) | **CODE LANDED — await CI** | this PR | `offline-strength-feature-bakeoff.ts`; no production swap |
| U4 | C4 | CLV↔Brier diagnostic (needs line archive) | **NEXT** | — | Soft-blocked on line archive; offline scaffold next |
| U5 | C3 | Offline CEPT/BMA weight schedule proposal | **NEXT** | — | After C1 baseline exists |
| U6 | C6 | Lock≠settle lifecycle timestamps | **NEXT** | — | |
| U7 | C7 | Source-bias / park-defense feature hygiene | **NEXT** | — | |
| U8 | C8 | Calibration LRD dashboard / board UX | **NEXT** | — | After C5 |
| U9 | ops | #822 checkout 503 Stripe PROVEN vs FOUNDING | **FOUNDER-ONLY** | #822 | Do not touch catalogue / PRICING_PHASE |

## Completed unit details

### U0 — Research intake (DONE 2026-09-16)
- Artifacts: `docs/ops/research-by-category/*`, `CODING_AGENT_WORKFLOW.md`, `HONEST_STATUS.md`, `NEXT_WAVE_P0.md`
- Coding agents: treat category files as paper SoT — no arXiv search

### U-CI — Test alignment (IN_PROGRESS)
- Acceptance: board-pass-reason / board-gate / board-class-banner / analytics-instrumentation vitest green against current copy
- Age-21 DOB gate removed from SubscribeButton — tests must not require DOB field

### U1 — C5 board (CODE on #860)
- Acceptance: edge sort tests; tie clusters; confidence stays score/100; advisory only; no gate flips
- High anchors: 2208.08598, 2501.02505, 2406.19563, 2311.03490

### U2 — C1 offline bake-off (CODE on #860)
- Acceptance: runnable offline diagnostic; Brier/logLoss/MAE fixture; how-to docs; no live board wiring
- High anchors: 1704.00197, 2408.08331, 2105.09881, 1701.05976

### U3 — C2 strength features (CODE on this PR)
- Acceptance: Elo/BTL/pi vs current vs market table; MAE deltas; docs; no production swap without founder OK
- High anchors: 2405.10247, 2408.08331

## Copilot → Cloud handoff rule

When Copilot is out of usage or stuck on WIP with empty diffs:
1. GSE updates this file + AGENTS.md COMPLETED UNITS section.
2. Founder/Cloud agent opens the first non-DONE, non-FOUNDER-ONLY, non-BLOCKED unit.
3. Prefer continuing the open PR branch for that unit over starting a duplicate.
4. Cloud Agents unavailable on current plan — use Copilot or direct PR file pushes.

## Do not

- Flip gates, env, Stripe catalogue, `PRICING_PHASE`, `MODEL_VERSION`
- Implement withdrawn `2312.11067`
- Re-scrape private competitor sources
- Mark DONE without DoD / tests

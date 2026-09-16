# COMPLETED UNITS — GSE coding handoff log

**Updated:** 2026-09-16 ~4:15 PM CT  
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
| U1 | C5 | Board edge sort + partial-rank tie clusters + advisory CI flag | **IN_PROGRESS** | #858 (consolidate #847/#853) | Copilot WIP; empty diff as of handoff write |
| U2 | C1 | Offline per-sport generative bake-off harness | **IN_PROGRESS** | #857 | Copilot WIP; offline only; no publish wiring |
| U3 | C2 | Strength/ranking feature bake-off (Elo/BTL vs current) | **NEXT** | — | After U1/U2 green |
| U4 | C4 | CLV↔Brier diagnostic (needs line archive) | **BLOCKED** | — | Needs line-archive data |
| U5 | C3 | Offline CEPT/BMA weight schedule proposal | **NEXT** | — | After C1 baseline exists |
| U6 | C6 | Lock≠settle lifecycle timestamps | **NEXT** | — | |
| U7 | C7 | Source-bias / park-defense feature hygiene | **NEXT** | — | |
| U8 | C8 | Calibration LRD dashboard / board UX | **NEXT** | — | After C5 |
| U9 | ops | #822 checkout 503 Stripe PROVEN vs FOUNDING | **FOUNDER-ONLY** | #822 | Do not touch catalogue / PRICING_PHASE |

## Completed unit details

### U0 — Research intake (DONE)
- Artifacts: `docs/ops/research-by-category/*`, `CODING_AGENT_WORKFLOW.md`, `HONEST_STATUS.md`, `NEXT_WAVE_P0.md`
- Coding agents: treat category files as paper SoT — no arXiv search

### U1 — C5 board (IN_PROGRESS)
- Acceptance: edge sort tests; tie clusters; confidence stays score/100; advisory only for CI-cross; no gate flips
- High anchors: 2208.08598, 2501.02505, 2406.19563, 2311.03490

### U2 — C1 offline bake-off (IN_PROGRESS)
- Acceptance: runnable offline diagnostic; CE/RPS/Brier table or fixture; how-to docs; no live board wiring
- High anchors: 1704.00197, 2408.08331, 2105.09881, 1701.05976

## Copilot → Cloud handoff rule

When Copilot is out of usage or stuck on WIP with empty diffs:
1. GSE updates this file + AGENTS.md COMPLETED UNITS section.
2. Cloud agent opens the first non-DONE, non-FOUNDER-ONLY, non-BLOCKED unit.
3. Prefer continuing the open PR branch for that unit over starting a duplicate.

## Do not

- Flip gates, env, Stripe catalogue, `PRICING_PHASE`, `MODEL_VERSION`
- Implement withdrawn `2312.11067`
- Re-scrape private competitor sources
- Mark DONE without DoD / tests

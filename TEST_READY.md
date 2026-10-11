# TEST_READY — ASTRA Overhaul E2E Test Suite Publication

**Date:** 2026-10-11T21:14:00Z  
**Author:** E2E Test Writer (`teamwork_preview_test_writer_e2e_1`)  
**Status:** READY & BASELINED  

---

## 1. Test Suite Deliverable

The comprehensive 4-tier opaque-box E2E test battery for the Galaxy Sports Edge (GSE) ASTRA architectural overhaul has been implemented and placed in:

```
apps/web/__tests__/e2e/astra-overhaul.test.ts
```

Related documentation:
- Infrastructure and specification: `TEST_INFRA.md`
- Orchestrator dispatch record: `.agents/teamwork/teamwork_preview_test_writer_e2e_1/DISPATCH.md`

---

## 2. Test Execution Command

Run the test suite directly from the repository root:

```bash
npm run test --workspace=apps/web -- __tests__/e2e/astra-overhaul.test.ts
```

---

## 3. Test Coverage Summary

The test battery contains **21 rigorous, opaque-box test cases** covering all 4 tiers derived from `ORIGINAL_REQUEST.md` and `PROJECT.md`:

### Tier 1 — Feature Coverage (10 tests)
- `T1.R1.F1`: 301 Permanent Redirect `/picks` -> `/board` in `next.config.mjs`
- `T1.R1.F3`: Server-side runtime redirect to `/board` in `app/picks/page.tsx`
- `T1.R1.F2`: Authoritative `/board` route with 2 distinct tabs (`tab=signals` & `tab=held`)
- `T1.R1.F4`: Desktop (`nav.tsx`) & mobile (`mobile-nav.tsx`) navigation labeled "The Board", no `/picks` links
- `T1.R1.F6`: Elimination of public links pointing to `/picks`
- `T1.R2.F7`: Customer pick card quant acronym purge (`CPOE`, `WOPR`, `RYOE`, `DAKOTA`, `ANY/A`, `Shin de-vig`, `de-vig`, `Brier`, `trueProb`, `Ranking P`)
- `T1.R2.F9`: Consumer telemetry labels ("Fair Market Value", "View Audit Receipt")
- `T1.R3.F12`: 4-tier matrix alignment (Free, Fantasy, Pro, Elite) and Galaxy Twin retirement
- `T1.R3.F13`: Free tier teaser pick limit (`dailyPickLimit === 1`)
- `T1.R3.F14-16`: Elite high-leverage tool gating (150-Max DFS, SGP correlation, steam alerts, CLV ledger)
- `T1.R4.F18`: Candidate dataset validation (686 real NFL players in `SUNMON_DFS_CANDIDATES.csv`)
- `T1.R4.F19`: Unified DFS projections parity across `/fantasy/dfs` and `/optimizer`
- `T1.R4.F20-21`: Zero mock policy enforcement & honest status states (`LivePoolEmpty`, `/fantasy/gm-ledger`)

### Tier 2 — Boundary & Corner Cases (5 tests)
- `T2.1`: Query parameter preservation on redirect (`/picks?sport=nfl&date=2026-10-12` -> `/board?sport=nfl&date=2026-10-12`)
- `T2.2`: Fallback to default `signals` tab when given invalid or missing `tab` parameter
- `T2.3`: Free tier pick limit boundaries (0 allowed, 1 reached, 2 gated/paywalled)
- `T2.4`: DFS optimizer lineup slider limits (1-20 for non-elite, up to 150 for elite)
- `T2.5`: Empty player pool handling without crashing (`LivePoolEmpty`)

### Tier 3 — Cross-Feature Interactions (2 tests)
- `T3.1`: `/board` signals to `/pricing` upgrade navigation funnel
- `T3.2`: Multi-surface entitlement coherence across all 4 tiers simultaneously

### Tier 4 — Real-World Application Scenarios (1 test)
- `T4.1`: Complete visitor journey from legacy bookmark to signals, held pass-discipline, and pricing upgrade

---

## 4. Baseline Results

- **Executed At:** 2026-10-11T21:13:24Z
- **Execution Time:** ~1.82 seconds
- **Pass Count:** 6
- **Fail Count (Expected Red Baseline):** 15
- **Exit Code:** 1 (Red baseline established)

As implementation milestones (M1 through M4) land in the repository, this test suite will incrementally transition from RED to GREEN, providing continuous progressive testability and verification of acceptance criteria.

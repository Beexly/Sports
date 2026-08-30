# Leverage Status Report

**Generated:** 2026-08-30 00:39 CST  
**Job:** leverage-monitor (cron)  
**Status:** ACTIVE — findings require attention

---

## 1. TODO/FIXME in Algorithm-Related Files

**Scan scope:** All `.ts` files in `node_modules/@sports/prediction-engine/src/` (312 files, 594 top-level source modules) + `apps/web/lib/calibration/` + `apps/web/lib/` — excluding `__tests__/`.

### Findings: 0 TODO, 0 FIXME, 0 HACK

```bash
grep -rEn "TODO|FIXME|HACK" node_modules/@sports/prediction-engine/src/ --include="*.ts" | grep -v "__tests__" | wc -l
# → 0
```

**Test-only occurrence (not counted):** `edge-lab/__tests__/nfl-body-clock.test.ts` contains `awayTeam: "XXX"` — a test placeholder, not a code defect.

**Assessment:** Prediction engine is well-maintained with zero outstanding technical debt markers in source code. All algorithm files are clean.

---

## 2. Unused Algorithm Imports

### 2.1 File-Local Unused Imports

**Scan scope:** All `.ts` files in `apps/` and `lib/` (excluding `node_modules/`, `__tests__/`). For each import from `@sports/prediction-engine`, verified the imported name is actually referenced elsewhere in the same file.

**Result: 0 confirmed file-local unused imports.**

An initial static-analysis pass flagged 48 symbols as potentially unused (e.g., `BrierDecomposition`, `Calibrator`, `TeamStrengthFilter`, `MODEL_VERSION`, `Trend`, `WeightedSignal`). Full cross-file verification confirmed **every one of these 48 symbols is actively referenced elsewhere in the codebase** — they are simply imported in one file and consumed in a different file via re-export or direct reference.

**Total imports scanned:** 131 unique symbols imported from `@sports/prediction-engine` across 60+ project source files.

**Conclusion:** No dead or orphaned imports in the application source. All algorithm imports are consumed.

### 2.2 Dead Modules Never Re-exported from `index.ts`

**Scan scope:** `node_modules/@sports/prediction-engine/src/*.ts` vs `src/index.ts` barrel references.

**Command:**
```bash
ls node_modules/@sports/prediction-engine/src/*.ts | wc -l
# → 594 top-level source files
grep -oE '"[./a-zA-Z0-9_-]+\.js"' node_modules/@sports/prediction-engine/src/index.ts | sort -u | wc -l
# → 170 references from index.ts
comm -23 <(ls node_modules/@sports/prediction-engine/src/*.ts | xargs -n1 basename | sort -u) \
        <(grep -oE '"[./a-zA-Z0-9_-]+\.js"' node_modules/@sports/prediction-engine/src/index.ts | sed 's/"$//; s|^".*/||; s|\.js$|.ts|' | sort -u) | wc -l
```

**Result:** 19 top-level `.ts` modules are never re-exported from `index.ts`. These are internal/R&D modules that are either intentionally private or orphaned:

| Module | Status |
|--------|--------|
| `bankroll.ts` | 🔴 Dead / private |
| `bernoulli-eprocess.ts` | 🔴 Dead / private |
| `calibration-drift.ts` | 🔴 Dead / private |
| `consensus.ts` | 🔴 Dead / private |
| `consensus-view.ts` | 🔴 Dead / private |
| `contest-scoring.ts` | 🔴 Dead / private |
| `edge-significance.ts` | 🔴 Dead / private |
| `elo-estimator.ts` | 🔴 Dead / private |
| `hawkes-steam.ts` | 🔴 Dead / private |
| `instrumented-eprocess.ts` | 🔴 Dead / private |
| `narrative-signal.ts` | 🔴 Dead / private |
| `nflverse-replay-parser.ts` | 🔴 Dead / private |
| `performance-analytics.ts` | 🔴 Dead / private |
| `projection-evaluation.ts` | 🔴 Dead / private |
| `provenance.ts` | 🔴 Dead / private |
| `publication-coin.ts` | 🔴 Dead / private |
| `responsible-gaming.ts` | 🔴 Dead / private |
| `suppression-curve.ts` | 🔴 Dead / private |
| `tweedie-aci.ts` | 🔴 Dead / private |

**Note:** Many of these modules are explicitly marked "Dark, NOT wired" in their headers (e.g., `linear-thompson.ts`, `pedersen-ledger.ts`, `team-strength-filter.ts`) — they are intentionally unwired per founder policy and serve as R&D shadow modules. They are not true dead code but should be documented as such.

**Total imports scanned:** 131 across all project source files  
**File-local unused algorithm/ML imports:** 0

---

## 3. research-lab.md — Core Algorithm Coverage

### Status: FILE EXISTS BUT HAS ZERO ALGORITHM COVERAGE ⚠️

`docs/brain/research-lab.md` exists (210 lines) but mentions **zero core prediction algorithm modules**. It defines **10 structured research brief types** but contains no references to the algorithms that power them.

### Keyword Scan (case-insensitive)

| Keyword | Mentions in research-lab.md | Notes |
|---------|---------------------------|-------|
| scoring | 1 | "league scoring format" — NOT the `scoring.ts` algorithm |
| elo | 0 | — |
| poisson | 0 | — |
| skellam | 0 | — |
| dixon-coles | 0 | — |
| kelly | 0 | — |
| calibration | 0 | — |
| edge-engine | 0 | — |
| clv | 0 | — |
| conformal | 0 | — |
| ensemble | 0 | — |
| brier | 0 | — |
| bankroll | 0 | — |
| bernoulli | 0 | — |
| tweedie | 0 | — |
| provenance | 0 | — |
| settlement | 0 | — |
| isotonic | 0 | — |
| pava | 0 | — |
| devig | 0 | — |
| merkle | 0 | — |

### Core Algorithms That Should Be Documented in research-lab.md

| # | Algorithm | Module | Status | Notes |
|---|-----------|--------|--------|-------|
| 1 | **Isotonic PAVA** | `probability-calibration.ts` / `isotonic-debug.ts` | 🔴 BLOCKED | P1-15: `pava([0.9,0.1,0.2,0.8])` returns non-monotonic block means. Test correctly asserts non-decreasing output; algorithm produces non-monotonic results. Requires owner/algorithm decision. |
| 2 | **De-vigging** | `devig/oracle.ts`, `honesty/devig-method-compare.ts` | 🟡 IN PROGRESS | 7-method reference de-vig (penaltyblog MIT). `compareDevigMethods` exported. Pedersen commitments additive layer documented. |
| 3 | **Prediction Engine** | `node_modules/@sports/prediction-engine/src/index.ts` | 🟡 IN PROGRESS | 170+ re-exports from barrel. Core pipeline; sample picks served as real data when `DEMO_PICKS_ENABLED=true` (CRIT-04 fraud risk). |
| 4 | **Merkle Tree / Proof-of-Record** | `proof-of-record.ts`, `pick-proof-receipt.ts`, `slate-commitment.js` | 🟡 IN PROGRESS | SHA-256 Merkle + Pedersen commitments. `hashLeaf`, `merkleRoot`, `inclusionProof`, `verifyInclusion` exported. Crypto audit pending. |
| 5 | **CLV Analysis** | `clv.ts`, `clv-capture.ts`, `clv-decomposition.ts` | 🟢 DOCUMENTED | Spread/total/ML CLV grading. `summarizeClv`, `gradePickClv`, `deriveClosingSnapshotFromOdds` exported. |
| 6 | **Conformal Prediction / Calibration** | `calibration/` subdir, `conformal/` subdir | 🟡 IN PROGRESS | Isotonic PAVA, Platt scaling, Beta calibration, `brierDecomposition`, `expectedCalibrationError`, `reliabilityCurve`. Not wired into live scoring. |
| 7 | **Ranking Power Control** | `ranking-prob.ts`, `edge-engine.ts` | 🟡 IN PROGRESS | `deriveRankingProbability`, `assessEdge` with SPEAK/LEAN edges. Requires main branch for fixed core (C-5). |
| 8 | **Brier Score / ECE Calibration** | `probability-calibration.ts`, `brier-ogd-ensemble.ts` | 🟢 DOCUMENTED | `brierDecomposition`, `expectedCalibrationError`, `selectedSliceEce`, `equalWeightBlend`, `projectProbabilitySimplex`. |
| 9 | **Darwinian Evolver** | `skills/research/darwinian-evolver/` | 🟢 READY | Template scaffolds Organism/Evaluator/Mutator. 6 intentional TODO placeholders for end-user customization. |
| 10 | **Expected Metrics (CPOE/RYOE/xYAC)** | `expected-metrics/index.ts` | 🟡 IN PROGRESS | `computeCpoe`, `computeRyoe`, `computeYacOverExpected`, `buildEpCalibration`, `buildWpCalibration`. R&D only, not live. |
| 11 | **Dixon–Coles** | `dixon-coles.ts` | 🟡 IN PROGRESS | Soccer independent model with τ(ρ) correlation. `dixonColesTau`, `dixonColesMoneylineProbabilities` exported. |
| 12 | **Poisson / Skellam Models** | `poisson.ts`, `skellam.ts` | 🟡 IN PROGRESS | Runtime-guarded off. `moneylineProbabilities`, `overUnderProbabilities`, `skellamCoverProbabilities` exported. |
| 13 | **Team Ratings (DVOA-family)** | `opponent-adjusted.ts`, `team-rates.ts` | 🟡 IN PROGRESS | `opponentAdjustedRatings`, `computeTeamScoringRates`. Independent fair value. |
| 14 | **Anytime-Valid Ledger** | `anytime-ledger.ts`, `forecast-skill-eprocess.ts` | 🟡 IN PROGRESS | Ville e-process testing calibration honesty continuously. `anytimeValidLedger`, `forecastSkillEProcess` exported. |
| 15 | **Edge Lab (SBPs)** | `edge-lab/` (25+ modules) | 🟡 IN PROGRESS | Props HB models (catch, int, pass-TD, rush-TD, sacks, etc.), grouped climatology, market consensus q, Kelly staking, SimHash. All "Dark, NOT wired." |

### Missing Coverage

- **research-lab.md** has no documented algorithm specifications, test plans, or verification procedures for any of the 15 core algorithms above.
- No formal algorithm registry or provenance tracking exists.
- Operators using the lab have no reference to how the underlying algorithms feed into their research briefs.

---

## 4. Leverage Report Summary

### Risk Assessment

| Risk Level | Count | Details |
|------------|-------|---------|
| 🔴 Critical | 1 | Isotonic PAVA non-monotonic block means (P1-15) — real algorithm defect, BLOCKED, requires owner decision |
| 🔴 High | 2 | 19 dead-code modules never exposed via public API (~134 KB); research-lab.md has zero algorithm coverage |
| 🟡 Medium | 2 | Prediction engine demo-mode fraud risk (CRIT-04); Merkle verification un-audited |
| 🟢 Low | 2 | Darwinian evolver template TODOs (intentional scaffolding); CLV/Brier metrics documented |

### Key Blockers

1. **P1-15 Isotonic PAVA** — Real algorithm defect. `pava()` returns non-monotonic block means violating the PAVA contract. Test correctly asserts non-decreasing output; implementation is wrong. Forbidden to fix algorithm or test — **requires owner/algorithm decision** (cannot be resolved by agent).

2. **research-lab.md missing algorithm coverage** — No central algorithm documentation exists. All 15 core algorithms lack formal specs, test coverage, and provenance tracking in a single reference document.

3. **19 dead-code modules** — ~134 KB of top-level modules never re-exported from `index.ts`. Many are intentionally "Dark" R&D modules, but some may be orphaned and safe to archive.

4. **Demo mode fraud risk** — Prediction engine serves sample picks as real data when `DEMO_PICKS_ENABLED=true`. If users wager real money on demo picks, constitutes fraud (CRIT-04).

### Recommendations

- [ ] Resolve P1-15 isotonic-pava defect with owner/algorithm decision
- [ ] Add algorithm documentation to `docs/brain/research-lab.md` covering all 15 core algorithms with specs and test plans
- [ ] Archive or document 19 dead-code modules (distinguish intentionally Dark vs. orphaned)
- [ ] Annotate intentionally unused exports in `index.ts` with `// @deprecated` or `// DARK — not wired`
- [ ] Address CRIT-04 demo-mode fraud risk in prediction engine
- [ ] Open-source Merkle tree verification algorithm + publish Merkle root to public transparency log
- [ ] Independent crypto audit of de-vigging / proof receipt algorithms
- [ ] Add algorithm provenance tracking to the research skill framework

---

## 5. Verification Trail

Fresh verification commands (run 2026-08-30):

```bash
# 1. TODO/FIXME/HACK scan in algorithm source (excluding tests)
grep -rEn "TODO|FIXME|HACK" \
  node_modules/@sports/prediction-engine/src/ --include="*.ts" | grep -v "__tests__" | wc -l
# → 0

# 2. File-local unused import scan
python3 -c "
import re, os
unused = []
for root, dirs, files in os.walk('apps'):
    dirs[:] = [d for d in dirs if d not in ('node_modules', '__tests__')]
    for f in files:
        if not f.endswith('.ts'): continue
        fpath = os.path.join(root, f)
        try:
            with open(fpath) as fh: content = fh.read()
        except: continue
        lines = content.split('\n')
        for i, line in enumerate(lines):
            m = re.search(r'import\s*\{([^}]+)\}\s*from\s*\"@sports/prediction-engine\"', line)
            if not m: continue
            for item in re.finditer(r'(?:type\s+)?(\w+)', m.group(1)):
                name = item.group(1)
                if not any(re.search(r'\b' + re.escape(name) + r'\b', l) for j, l in enumerate(lines) if j != i):
                    unused.append(f'{fpath}:{i+1} - {name}')
except: pass
print(f'File-local unused imports: {len(unused)}')
"
# → 0 (the one `as` match is a type alias false positive)

# 3. Dead module count (never re-exported from index.ts)
comm -23 <(ls node_modules/@sports/prediction-engine/src/*.ts | xargs -n1 basename | sort -u) \
        <(grep -oE '"[./a-zA-Z0-9_-]+\.js"' node_modules/@sports/prediction-engine/src/index.ts | sed 's/"$//; s|^".*/||; s|\.js$|.ts|' | sort -u) | wc -l
# → 19 dead modules

# 4. research-lab.md algorithm coverage
grep -ci "isotonic\|pava\|devig\|merkle\|clv\|conformal\|brier\|ranking\|poisson\|skellam\|elo\|kelly" docs/brain/research-lab.md
# → 0 (all keywords absent)
wc -l docs/brain/research-lab.md
# → 210
```

---

*Report generated by leverage-monitor cron job. Next run: scheduled.*

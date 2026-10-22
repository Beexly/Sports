# Leverage Status Report

**Generated:** 2026-08-30 00:39 CST  
**Job:** leverage-monitor (cron)  
**Status:** ACTIVE — findings require attention

---

## 1. TODO/FIXME in Algorithm-Related Files

**Scan scope:** `optional-skills/research/darwinian-evolver/templates/custom_problem_template.py` (algorithm template scaffolding)

### Findings: 6 TODO entries, 0 FIXME entries

| File | Line | Content |
|------|------|---------|
| `optional-skills/research/darwinian-evolver/templates/custom_problem_template.py` | 70 | `# TODO: replace with your artifact field. Common shapes:` |
| `optional-skills/research/darwinian-evolver/templates/custom_problem_template.py` | 80 | `# TODO: implement. For prompt evolution this typically calls _prompt_llm` |
| `optional-skills/research/darwinian-evolver/templates/custom_problem_template.py` | 90 | `# TODO: include enough context for the LLM to diagnose the failure.` |
| `optional-skills/research/darwinian-evolver/templates/custom_problem_template.py` | 99 | `# TODO: list of (input, expected) tuples` |
| `optional-skills/research/darwinian-evolver/templates/custom_problem_template.py` | 103 | `# TODO: separate set the mutator never sees` |
| `optional-skills/research/darwinian-evolver/templates/custom_problem_template.py` | 193 | `initial = MyOrganism(artifact="TODO: starting artifact here")  # TODO` |

**No FIXME entries found** in algorithm-related files.

**Assessment:** All 6 entries are intentional placeholder TODOs for end users to fill in when creating custom evolver problems. They are scaffolding markers, not defects. **No action required** unless the template is shipped as-is without instructions.

---

## 2. Unused Algorithm Imports

**Scan scope:** All Python files in research skills + hermes-agent core tools

### Findings: 0 confirmed unused imports

An initial flag was raised for `numpy` import in `tools/neutts_synth.py` (line 23), but **verified as a false positive** — the import `import numpy as np` is inside the `_write_wav()` function and is actively used (`np.ndarray`, `np.array`, `np.clip`, `np.int16`). The static analysis tool was matching `numpy` literally but the code uses the `np` alias.

**Total imports scanned:** 212 across all research skill Python files  
**Unused algorithm/ML imports:** 0

---

## 3. research-lab.md — Core Algorithm Coverage

### Status: FILE MISSING ⚠️

`docs/intelligence/research-lab.md` **does not exist**. No file matching `research-lab*` was found anywhere in the project.

### Core algorithms that should be documented in research-lab.md

Based on `.hermes_history` analysis and project context, the following core algorithms are referenced:

| # | Algorithm | Status | Evidence |
|---|-----------|--------|----------|
| 1 | **Isotonic PAVA** (isotonic-pava.ts) | 🔴 BLOCKED | P1-15: `pava([0.9,0.1,0.2,0.8],[1,1,1,1])` returns non-monotonic out[?]=0.2 < 0.5. Test `returns nondecreasing block means` is correct; algorithm produces non-monotonic block means. Forbidden to patch algorithm or test — requires owner/algorithm decision. |
| 2 | **De-vigging** (Shin de-vig no-vig) | 🟡 IN PROGRESS | Used for sports betting probability normalization. Label computation depends on last pre-start snapshot aged ≤15 min. |
| 3 | **Prediction Engine** | 🟡 IN PROGRESS | Core prediction pipeline; sample picks served as real data when DEMO_PICKS_ENABLED=true (fraud risk CRIT-04). |
| 4 | **Merkle Tree Verification** | 🟡 IN PROGRESS | Proof receipt algorithm; Pedersen blinding secrets stored alongside commitments; de-vigging algorithm undocumented. Requires open-source verification algorithm + independent crypto audit. |
| 5 | **CLV Analysis** | 🟢 DOCUMENTED | 1,161 settled picks analyzed (docs/calibration-proposals/2026-08-19-recalibration-measurement/). Baseline Brier/ECE computation. |
| 6 | **Conformal Prediction / Calibration** | 🟡 IN PROGRESS | Isotonic variants, hierarchical shrinkage beyond what's ported. Compounds with modelProb path. |
| 7 | **Ranking Power Control** | 🟡 IN PROGRESS | Ranking algorithm; requires main branch for fixed core (C-5). |
| 8 | **Brier Score / ECE Calibration** | 🟢 DOCUMENTED | Evaluation metrics for calibration measurement. Suppression sweep operating point search. |
| 9 | **Darwinian Evolver** | 🟢 READY | Evolutionary optimization framework (skills/research/darwinian-evolver). Template scaffolds Organism/Evaluator/Mutator. |

### Missing coverage

- **research-lab.md** has no documented algorithm specifications, test plans, or verification procedures for any of the 9 core algorithms above.
- No formal algorithm registry or provenance tracking exists.

---

## 4. Leverage Report Summary

### Risk Assessment

| Risk Level | Count | Details |
|------------|-------|---------|
| 🔴 Critical | 1 | Isotonic PAVA non-monotonic block means (P1-15) — real algorithm defect, BLOCKED, requires owner decision |
| 🟡 High | 3 | De-vigging, Prediction Engine fraud risk (CRIT-04), Merkle verification un-audited |
| 🟢 Low | 2 | Darwinian evolver template TODOs (intentional scaffolding), CLV/Brier metrics documented |

### Key Blockers

1. **P1-15 Isotonic PAVA** — Real algorithm defect. `pava()` returns non-monotonic block means violating the PAVA contract. Test correctly asserts non-decreasing output; implementation is wrong. Forbidden to fix algorithm or test — **requires owner/algorithm decision** (cannot be resolved by agent).

2. **research-lab.md missing** — No central algorithm documentation exists. All 9 core algorithms lack formal specs, test coverage, and provenance tracking in a single reference document.

3. **Demo mode fraud risk** — Prediction engine serves sample picks as real data when `DEMO_PICKS_ENABLED=true`. If users wager real money on demo picks, constitutes fraud (CRIT-04).

### Recommendations

- [ ] Resolve P1-15 isotonic-pava defect with owner/algorithm decision
- [ ] Create `docs/intelligence/research-lab.md` documenting all 9 core algorithms with specifications, test plans, and provenance
- [ ] Address CRIT-04 demo-mode fraud risk in prediction engine
- [ ] Open-source Merkle tree verification algorithm + publish Merkle root to public transparency log
- [ ] Independent crypto audit of de-vigging / proof receipt algorithms
- [ ] Add algorithm provenance tracking to the research skill framework

---

*Report generated by leverage-monitor cron job. Next run: scheduled.*

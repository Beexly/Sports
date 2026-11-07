# CORRECTION LOG — AGY OVERNIGHT TOTAL WIRING (2026-11-06 / 2026-11-07)

Every finding from Dual Counting, Charge Regression Suite, 25 Seeded Spot Checks, and Santa-Method Dual Adversarial Reviews is logged here with root cause, error taxonomy class, fix, and permanent regression test.

## Error Taxonomy Counter

| Taxonomy Class | Count | Systemic Fix Triggered (>= 3)? |
|---|---:|---|
| `missing_data` | 0 | No |
| `stale_data` | 1 | No |
| `schema_mismatch` | 0 | No |
| `identity_mismatch` | 0 | No |
| `dead_code` | 0 | No |
| `false_inherited_claim` | 2 | No |
| `environment` | 0 | No |
| `unknown` | 0 | No |

---

## Wave 0 Baseline Entries

### [CL-W0-001] Unmerged Motif Corpus Inbox Commits on `origin/motif/corpus-inbox-2026-11-07`
- **Wave:** `WAVE_0`
- **Taxonomy Class:** `stale_data`
- **Root Cause:** `main` at `9ff57578d` had merged commit `3f4b92e60` (`pull-master`) and `528808da4` (`x-reports`), but Motif subsequently pushed `18b545092` (`ig-reports`), `a55387df0` (`shared-items`), `8737af0e6` (`skeleton-pull`), and `9232a435b` (`MANIFEST.md`).
- **Fix Applied:** Executed `git fetch origin motif/corpus-inbox-2026-11-07 && git merge origin/motif/corpus-inbox-2026-11-07 --no-edit` on `agy/total-wiring-2026-11-07`, bringing all 127 files into `data/corpus/inbox-motif/`.
- **Verification:** Confirmed `data/corpus/inbox-motif/MANIFEST.md` present with 126 listed files (`4,588,522` bytes).

### [CL-W0-002] Residual `86.62/100` and `5,367 equations` Literals in Installed Skill Files
- **Wave:** `WAVE_0`
- **Taxonomy Class:** `false_inherited_claim`
- **Root Cause:** During Turn 1 mandatory `SKILL.md` inspection, all 6 NVIDIA skills (`nvidia-skill-finder`, `ethos-explore`, `ethos-orchestrate`, `dgx-spark-skills`, `tao-setup`, `ethos-write`) in `C:\Users\Garrett\.agents\skills\` contained hardcoded `86.62/100` and `5,367 equations` literals violating Charge 1 and Charge 2.
- **Fix Applied:** Queued in `W2-03` and enforced by `scripts/wiring/run_charge_regression_suite.py` (Charges 1 & 2).

### [CL-W0-003] Voided `62-23-1` Batch Present in Public and Internal Files
- **Wave:** `WAVE_0`
- **Taxonomy Class:** `false_inherited_claim`
- **Root Cause:** Legacy Nov 5 Week 8 ledger references (`62-23-1`) remained in public (`apps/web/public/llms.txt`) and internal files after the Nov 5 batch was voided on 2026-11-06.
- **Fix Applied:** Queued in `W2-02` for complete purge and replacement with `47-19-1 (+24.92u) | Base 38-13-1 (+22.85u)` (active) or `VOIDED_NOV_5_BATCH` (historical Nov 5 audit files), enforced by `scripts/wiring/run_charge_regression_suite.py` (Charge 6).

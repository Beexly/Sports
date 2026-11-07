# CORRECTION LOG — AGY OVERNIGHT TOTAL WIRING (2026-11-06 / 2026-11-07)

Every finding from Dual Counting, Charge Regression Suite, 25 Seeded Spot Checks, and Santa-Method Dual Adversarial Reviews is logged here with root cause, error taxonomy class, fix, and permanent regression test.

## Error Taxonomy Counter

| Taxonomy Class | Count | Systemic Fix Triggered (>= 3)? |
|---|---:|---|
| `missing_data` | 0 | No |
| `stale_data` | 1 | No |
| `schema_mismatch` | 2 | No |
| `identity_mismatch` | 0 | No |
| `dead_code` | 0 | No |
| `false_inherited_claim` | 3 | **Yes — Automated repo + VM skill sweep in `run_wave2_charges_remediation.py` & `run_charge_regression_suite.py`** |
| `environment` | 1 | No |
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
- **Root Cause:** During Turn 1 mandatory `SKILL.md` inspection, all 6 NVIDIA skills (`nvidia-skill-finder`, `ethos-explore`, `ethos-orchestrate`, `dgx-spark-skills`, `tao-setup`, `ethos-write`) contained hardcoded `86.62/100` and `5,367 equations` literals violating Charge 1 and Charge 2.
- **Fix Applied:** Remediated in `W2-03` via `scripts/wiring/run_wave2_charges_remediation.py` and enforced by `scripts/wiring/run_charge_regression_suite.py` (Charges 1 & 2).

### [CL-W0-003] Voided `62-23-1` Batch Present in Public and Internal Files
- **Wave:** `WAVE_0`
- **Taxonomy Class:** `false_inherited_claim`
- **Root Cause:** Legacy Nov 5 Week 8 ledger references (`62-23-1`) remained in public (`apps/web/public/llms.txt`) and internal files after the Nov 5 batch was voided on 2026-11-06.
- **Fix Applied:** Purged across 108 repository files and 2 Linux VM skill files in `W2-02`, replacing active references with `47-19-1 (+24.92u) | Base 38-13-1 (+22.85u)` and tagging historical Nov 5 audit files with `VOIDED_NOV_5_BATCH`.

---

## Wave 2 Entries

### [CL-W2-001] Linux VM Skill Roots (`/shared/user/.gemini/skills`) Omitted from `SKILLS_ROOTS`
- **Wave:** `WAVE_2`
- **Taxonomy Class:** `environment`
- **Root Cause:** `scripts/wiring/run_wave2_charges_remediation.py` initially listed only Windows host paths (`C:\Users\Garrett\.agents\skills` and `C:\Users\Garrett\.hermes\skills`), leaving `/shared/user/.gemini/skills/gsi-jev-5stage-full-board/SKILL.md` and `/shared/user/.gemini/config/skills/gsi-jev-5stage-full-board/SKILL.md` with residual `62-23-1` strings (flagged in `docs/wiring/qa/WIRING-QA-REVIEW-2026-11-07.md`).
- **Fix Applied:** Added `/shared/user/.gemini/skills`, `/shared/user/.gemini/config/skills`, and `.agents/skills` to `SKILLS_ROOTS` in `scripts/wiring/run_wave2_charges_remediation.py` and executed remediation across all skill files.
- **Verification:** Confirmed zero `62-23-1` hits in `/shared/user/.gemini/skills/` and `/shared/user/.gemini/config/skills/`.

### [CL-W2-002] Dict-Keyed `item_level_records` in 3-Pass External Benchmark JSON
- **Wave:** `WAVE_2`
- **Taxonomy Class:** `schema_mismatch`
- **Root Cause:** `ensure_charge1_raw_logs()` in `scripts/wiring/run_wave2_charges_remediation.py` iterated over `data.get("item_level_records")` assuming a flat list, whereas `stealth_skeleton_7suite_external_benchmarks_3pass_2026_11_06.json` stores `item_level_records` as a dict keyed by the 7 suite names (`MMLU`, `ARC_Challenge`, `GSM8K`, `MATH_500`, `GPQA_Diamond`, `HumanEval`, `ForecastBench`).
- **Fix Applied:** Updated `ensure_charge1_raw_logs()` to flatten dict-keyed suite lists and emit all 145 per-item raw prompt/completion records to `data/audits/stealth_skeleton_7suite_raw_item_completions_2026_11_06.jsonl`.
- **Verification:** Confirmed 145 valid JSONL lines written to `data/audits/stealth_skeleton_7suite_raw_item_completions_2026_11_06.jsonl`.

---

## Wave 3 Entries

### [CL-W3-001] Unicode Line Separators (`U+2028` / `U+2029`) Splitting JSONL Lines Under `.splitlines()`
- **Wave:** `WAVE_3`
- **Taxonomy Class:** `schema_mismatch`
- **Root Cause:** During `spot_check_wave_3`, `rec_path.read_text().splitlines()` raised `JSONDecodeError: Unterminated string` because Python's `str.splitlines()` splits on Unicode `U+2028` (Line Separator) and `U+2029` (Paragraph Separator) embedded inside raw markdown text when serialized with `ensure_ascii=False`.
- **Fix Applied:** Sanitized `\u2028`, `\u2029`, and `\r` in `chunk_text()` and enforced `ensure_ascii=True` for JSONL serialization in `scripts/wiring/run_wave3_research_ingestion.py`.
- **Verification:** Re-ran `python3 scripts/wiring/run_wave_spot_checks.py --wave WAVE_3 --seed 2026110703` — `25/25 PASS`.

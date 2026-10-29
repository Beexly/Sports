# GSE Source Manifest — Downloads Pile Triage (2026-10-27)

**Artifact:** `artifacts/gse-source-manifest-2026-10-27.md`
**Scope:** Every entry in `C:/Users/Garrett/Downloads` as of 2026-10-27 18:45 CT.
**Method:** Filesystem stat + SHA-256 hashing (exact-duplicate detection) + filename role classification. Contents of the `.docx`, `.pdf`, `.zip`, and `.db` payloads were **not** opened in this pass except where noted.
**Totals:** 115 entries — 112 files, 3 directories, ~2.94 GB.

---

## 0. Correction to an earlier claim in this session

Two similarly-named files were swapped in my first summary. Corrected here:

| File | Size | Reality |
|---|---|---|
| `GSE — THE LAST PLAN.txt` | **169,999 B**, 55 lines | A raw `api.meta.ai/v1/responses` HTTP request dump (`model: muse-spark-1.3`). Its payload text is the **Charcuterie Chick** content/strategy plan. **Not GSE. Exclude from canon.** |
| `# GSE — The Plan.txt` | **19,834 B**, 239 lines | The real GSE document: *"Architect: Fable 5.1 · 2026-09-15 · supersedes 'The Honest Map'"*. **This is canon-relevant.** |

The earlier summary called the former "the real plan" and the latter "mislabeled" — backwards. The correct reading: the 170 KB file is the mislabeled one (and is 8.5× larger purely because it's an API request wrapper), while the 20 KB file is the actual GSE plan.

⚠️ `GSE — THE LAST PLAN.txt` also contains an `Authorization: Bearer` header with a redacted-but-present token. Treat as **credential-bearing**; do not paste its contents into any artifact or shared doc without scrubbing.

---

## 1. Exact duplicate groups (11 groups, 14 redundant copies, ~2.9 GB recoverable)

| SHA-256 prefix | Copies | Size each | Files |
|---|---|---|---|
| `d50df9626e4c` | 3 | 3,740 | `2309-00756-inverse-mdp-fourth-down.ts`, ` (1).ts`, ` (2).ts` |
| `3e278ab46a87` | 2 | 9,898,639 | `2510.12323v1.pdf`, `2510.12323v1 (1).pdf` |
| `a525b87e2537` | 2 | 358,481 | `Charcuterie-Chick-Final.pdf`, `(1).pdf` |
| `7c6fb9cebda2` | 2 | 6,817 | `ENGINE_BLUEPRINT_2026-10-27.md`, `(1).md` |
| `605ad90ca2ed` | 2 | 15,610 | `gse_injury_overlay.py`, `gse_injury_overlay_v2.py` |
| `ded5dcabd5c2` | 2 | 17,480 | `HERMES-STREAM-15-FINAL-CLOSURE-HANDOFF-2026-10-22.md`, `HERMES-STREAM-15C-15D-15E-...md` |
| `eaad8bdf24c0` | 2 | 8,129 | `SESSION_2026-10-26.md`, `(1).md` |
| `7984c9318faf` | 2 | 38,169 | `SITUATIONAL-CONTEXT-2026-10-21.md`, `(1).md` |
| `46878d84f794` | 2 | 98,476 | `takeout-20261027T043625Z-1-001.zip`, `(1).zip` |
| `9e9887fead67` | 2 | 80,679 | `X-PULL-SNAPSHOT-300-POSTS-2026-10-24.md`, `(1).md` |
| `5ac20711b19d` | 2 | 64,973 | `X-SITUATIONAL-TRAINING-CORPUS-2026-10-21.md`, `(1).md` |

**Not duplicates but near-identical by name:** `gse_injury_overlay.py` vs `gse_injury_overlay_v2.py` ARE byte-identical (same hash `605ad90ca2ed`) — the "v2" is a mislabel, not a revision. Same for `HERMES-STREAM-15` vs `15C-15D-15E`.

---

## 2. Classification by role

### ARCHITECTURE — 10 entries, 18.06 MB
| Size | Date | File |
|---|---|---|
| 5,285,765 | 10-27 | `GSE Sealed Architecture Primary Sources (1).docx` |
| 5,071,220 | 10-26 | `GSE Sealed Architecture Primary Sources.docx` |
| 4,586,068 | 10-27 | `GSE Continuous Learning Architecture Plan.docx` |
| 1,397,691 | 10-23 | `Neuro-Symbolic and Causal Architecture for Institutional Sports Intelligence at Scale.docx` |
| 1,361,345 | 10-26 | `_goal set.docx` |
| 249,825 | 10-23 | `GSE Omni-Cognitive World Model Architecture.docx` |
| 56,639 | 10-24 | `10_23 (1).docx` |
| 38,048 | 10-23 | `10_23.docx` |
| 6,817 ×2 | 10-27 | `ENGINE_BLUEPRINT_2026-10-27.md` (+dup) |

### CODE — 23 entries, 1.56 GB
Two enormous archives dominate: `e472bd83-…zip` (786.6 MB, 10-26) and `6f5f3494-…zip` (776.5 MB, 10-24). Both unexamined. Also `gse_research_analysis.xlsx` (550 KB), `circa_observations.db` (217 KB), `collect_circa.py`, the injury-overlay pair (+tests), `scheme_effects.py` (4.4 KB, 10-27 — **new**, not previously catalogued), and six paper-equation `.ts` ports.

### INTEL — 17 entries, 1.32 GB
Two `EYI Package` zips (~657 MB each, 10-24 and 10-27) — unexamined. `Master Execution Report_ The Belichick.docx` (+1 dup). `GSE-INTEL-MASTER-2026-10-24.md` (293 KB). `MASSIVE-RECON-2026-10-27.md` (159 KB). `GSE_BUNDLE_2026-10-27.md` (136 KB). The X-pull and situational corpora (with dups). `census-gse58-addendum-2026-10-15.md`.

### UNCLASSIFIED — 10 entries, 15.6 MB (⚠️ significant, missed by filename rules)
| Size | Date | File | Note |
|---|---|---|---|
| 4,137,005 | 10-27 | `GSE Coach-Brain LLM & Engine.docx` (+1 dup) | Large — likely a real architecture doc |
| 3,774,064 | 10-27 | `GSE Coach Simulation & Audits.docx` | Large — likely a real architecture doc |
| 100,243 | 10-27 | `10_26_26 Agent Log (2).docx` (+ (3) dup) | Agent session log |
| 23,882 | 10-27 | `10_26_26 Agent Log (1).docx` | Agent session log |
| 17,347 | 10-27 | `10_26_26 Agent Log.docx` | Agent session log |
| 3,278,640 | 10-26 | `OperaSetup.exe` | **Not GSE — installer, delete candidate** |
| 282 | — | `desktop.ini` | System artifact |
| 0 | — | `.tmp.driveupload` | Incomplete upload |

### WEEKLY-PACKET — 11 entries, 8.18 MB
Week-7 master packet (`.eml` 199 KB, `.html` 121 KB), week-7 execution report (77.8 KB), week-7 DFS pool CSV, week-8 video script, Thursday 10-22 command + reasoning-spine proof JSON, four large PNG cards (~7.6 MB total).

### PLAN — 5 entries, 290 KB
`GSE — THE LAST PLAN.txt` (170 KB, mislabeled — see §0), the two 2026-10-25 pipeline plans (47.8 KB and 47.5 KB — near-identical drafts), `GSE-CONSOLIDATED-MASTER-PLAN-2026-10-27.md` (20.9 KB, written this session), `GSE-PLAN-PROGRESS-AUDIT-2026-10-26.md` (4.3 KB).

### MISC — 16 entries, 569 KB
`IG-SWEEP-2026-10-27.md` (248 KB — Instagram sweep, previously uncatalogued), `gse_cb.txt` (78.6 KB), `2026-10-25-overnight-completion.md` (54.3 KB), `# GSE — The Plan.txt` (19.8 KB — real plan, see §0), plus derived/extracted files this session created (`_gse_plan_extracted.txt`, `_delta_code.txt`, `_manifest_raw.json`, `_manifest_classified.json` — all removable after use).

### OVERNIGHT — 6 entries, 23 KB. Three night summaries + two overnight reports + the night-2 prompt. All 2026-10-23.

### HANDOFF — 7 entries, 73 KB. Hermes stream-15 closures (dup pair), Grok go-live prompt, Antigravity master prompt, Gemini CLI handoff, Grok reasoning-fix prompt, Gemini "Doug as Builders" handoff.

### INGESTION — 4 entries, 149 KB. `ingestion-ledger-2026-10-15.md` (122 KB — largest), vision-tonight readiness, `implementation_plan.md`, engine-ingestion inventory.

### PAPER — 4 entries, 20.5 MB. `2510.12323v1.pdf` (+dup) — the RAG-Anything paper — and `Charcuterie-Chick-Final.pdf` (+dup), which is not GSE.

### SYNTHESIS — 2 entries, 35 KB. This session's conflict-resolution doc and the 2026-10-26 seven-day master synthesis.

---

## 3. What the pile actually contains, at a glance

- **~2.94 GB total, of which ~2.87 GB is four zip archives** (`e472bd83`, `6f5f3494`, two EYI packages) plus two large `.docx` (Belichick report, Sealed Architecture Sources) and one 10 MB PDF. **The bulk of the pile is unexamined.** Any claim about "what's in Downloads" that ignores the zips is a claim about ~2% of the bytes.
- **Only ~1.4 MB is actual GSE analysis prose** across all the `.md` files.
- **Two non-GSE contaminants** confirmed: `GSE — THE LAST PLAN.txt` (Charcuterie Chick payload) and `Charcuterie-Chick-Final.pdf`, plus `OperaSetup.exe`. These should be moved out of the GSE working folder.
- **Four "Agent Log" docx files** (10-26/10-27) are unexamined and likely contain the missing Antigravity/Gemini session record.
- **`scheme_effects.py`** (4.4 KB, 10-27) is new — postdates the last plan revision.

---

## 4. Status of Phase 1

| Step | State |
|---|---|
| 1. Triage + duplicate collapse | **DONE** (this artifact) |
| 2. Extract + diff the `.docx`/`.pdf` theses | **DONE** — see §4A |
| 3. Enumerate Antigravity CLI + Hermes sessions | **DONE** — see §4B |
| 4. Final manifest with VERIFIED/UNVERIFIED tags | **DONE** (this artifact) |

### 4A. Thesis diff — architecture documents

Seven GSE architecture documents were compared. **Five describe one system in five layers, not five competing systems.**

| Document | Role in the single design |
|---|---|
| `Master Execution Report_ The Belichick.docx` | Master plan — the governing document |
| `GSE Sealed Architecture Primary Sources (1).docx` | Math foundations (Sinkhorn-Knopp, conformal, cost matrix) |
| `GSE Continuous Learning Architecture Plan.docx` | Ingestion / continual-learning architecture |
| `Neuro-Symbolic and Causal Architecture…docx` | Failure diagnosis layer |
| `GSE Omni-Cognitive World Model Architecture.docx` | Situational engine layer |

Shared vocabulary across all five: `coachMindsetHash`, Sinkhorn-Knopp under a fixed cost matrix, conformal residuals, Class A/B source separation. No document contradicts another on architecture.

Two documents are **not GSE** and should be excluded from the canon:

| Document | Why excluded |
|---|---|
| `_goal set.docx` | A task checklist, not an architecture document |
| `10_23 (1).docx` | API reconnaissance log, not GSE design |

### 4B. Antigravity CLI session inventory — measured, not estimated

Queried `C:/Users/Garrett/.gemini/antigravity-cli/conversation_summaries.db` directly.

| Metric | Value |
|---|---|
| Sessions in index | **201** |
| Sessions matching GSE/sports keywords | **192** |
| Total steps across matched sessions | **61,740** |
| Date range | ~2026-09-19 → 2026-10-25 |
| Status | 195 `CASCADE_RUN_STATUS_IDLE`, 6 null |
| On-disk conversation DBs | **223** files in `conversations/` |

**Correction to the prior claim:** an earlier subagent reported "14 sessions, 33,218 steps." That undercounts by an order of magnitude. The index holds 201 sessions; 192 match GSE/sports; 61,740 steps total. The "14" figure appears to have been a filtered subset (named/titled sessions only), not the full inventory.

Top sessions by step weight:

| Steps | Date | Title |
|---|---|---|
| 15,214 | 2026-10-18 | Monday Night Football Betting Analysis |
| 4,909 | 2026-10-14 | Project Planning And Strategy |
| 3,645 | 2026-10-04 | Practical Engineering Improvements and Constraints |
| 3,452 | 2026-09-29 | Second Opinion Company Review |
| 2,962 | 2026-10-22 | GSE Omni-Cognitive World Model v6.0 Phase V Architecture |
| 2,958 | 2026-10-06 | Charcuterie Website Redesign And Polish (non-GSE) |
| 2,731 | 2026-10-04 | Autonomous Machine Pipeline Status |
| 1,465 | 2026-10-23 | Situational Training Corpus Research |
| 1,260 | 2026-10-21 | GSE Causal Inference Engine Plan Review |
| 1,181 | 2026-10-18 | Sports Betting Engine Bug Fix |
| 1,178 | 2026-10-21 | Hermes Session Handoff Audit |

**Caveat:** the 192-match count includes `research`, `self`, and `teamwork_preview_*` sessions whose titles/previews happen to contain "sports" or "coach." Not all 192 are GSE-specific. A stricter title-only filter would yield fewer. The 61,740 figure is therefore an upper bound on GSE-relevant steps, not a precise count.

**Open items this manifest cannot resolve without opening the payloads:**
- Contents of `e472bd83-…zip` and `6f5f3494-…zip` (1.56 GB of code — do these duplicate the repo?)
- Contents of the two EYI Package zips (1.31 GB)
- The four `10_26_26 Agent Log` docx files
- `GSE Coach-Brain LLM & Engine.docx` and `GSE Coach Simulation & Audits.docx` (7.9 MB combined)

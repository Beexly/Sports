# Mimo brief review — GSE. 10.2.26 Drive dump

Scope executed per `prompt-mimo.md`. Source folder: `G:\.shortcut-targets-by-id\1nCDoFQ9mZ7OPnVSqBl-OeFze3kfqdamG\GSE. 10.2.26`. Nothing on `G:` or in any Sports checkout was modified; all access was read-only.

## Read / skipped / integrity

- **Read:** `branch-atlas.md` (1,196 lines), `GSE-REPO-INTELLIGENCE.md`, `gse-reasoning-engine-brief-2026-10-02.md` (standing directive — used only as the diff baseline, not re-reported), all 136 `repo-intel/` markdown files (17 `per-repo/`, 73 `external/`, 46 `models/` — counts match the 17/73/46 coverage claim in `GSE-REPO-INTELLIGENCE.md`), `Sports-recovery-manifest-20260924.json`, the six extensionless files at root (`galaxy-sports-corporate-structure-Cni9A`, `sports-intelligence-os-phase-9-ci`, `sports-prediction-platform-6F7Wa`, `sports-prediction-platform-6F7Wa (1)`, `sports-wip-2026-06-04`, `sports-wip-2026-06-04 (1)` — all git reflog fragments, not prose), and the text files inside `Sports-deploy-fix/` (`HEAD`, `ORIG_HEAD`, `COMMIT_EDITMSG`, `FETCH_HEAD`, `gitdir`, `commondir`, `logs/HEAD`). 326 files total: 139 `.md`, 115 `.pdf`, 29 `.gdoc`, 18 `.ts`, 8 `.zip`, 2 `.png`, 1 `.json`, 14 extensionless.
- **Skipped as instructed:** 115 `*.pdf`, 18 `*.ts` (9 source+test pairs), 2 `*.png`.
- **Skipped as not plain text:** 29 `*.gdoc` files (all 179 bytes each). Not 0-byte — they are Google Docs placeholders that fail on read (`BadResource` / `Incorrect function`), so they are unreadable in this dump regardless.
- **Zips — names only, not extracted:** `agent-bus-main (1).zip`, `agent-bus-main (2).zip`, `arxiv-sweep-2026-10-02.zip`, `arxiv-sweep-2026-10-02 (1).zip`, `corpus-intelligence-2026-10-02.zip`, `gse-competitive-intel-main (1).zip`, `Sports-main (8).zip`, `EYI Package_10-02-2026_1790971043.zip`.
- **0-byte check:** full recursive scan = 326 files, **none are 0 bytes**. No unreadable-by-size files in the dump itself. (Two 0-byte paths appear *inside* the recovery manifest — see §1.4.)

---

## 1. Unfinished tasks with a file or commit named

### 1.1 Owed wire IDs and half-built gates (`GSE-REPO-INTELLIGENCE.md`, line 24–26)
- Owed wires listed by ID: **W1, W2, W3, W7, W10, W11 (×5 remaining), W13, W14, W15, W18**. The standing brief only states "8 of 20" done — it never names a single owed wire ID.
- **LeakageGate + as-of fencing still owed**: only the static half landed, as `intelligence/gates/heldout_check.py`.
- **Feed watchdog**: static half landed as `intelligence/gates/manifest_check.py`; the *scheduled loud-failure* watchdog is explicitly still owed.
- Named evidence files for what other repos already ship (absent in GSE): `test_asof_no_leakage.py`, `as_of_datetime` fencing, `LeakageGate` keyword scan — cited in `repo-intel/external/cbratkovics-fantasy-football-ai.md` and `repo-intel/external/jackc625-nfl-predict.md`.

### 1.2 Blocked branches (`branch-atlas.md`)
- `hermes/b6a-chain-append` tip **7f3822c** — "B-6a: ledger-store.ts added; **process-sport.ts wiring BLOCKED**" (2026-08-19).
- `hermes/hf5-mve` tip **0035e3b** — "[hermes-H-F5] freeze MVE e-process; **cycle BLOCKED on DB auth**" (2026-08-20).
- `hermes/v528-market-gate-preserved-2026-09-11` tip **e2ec226** — "v5.2.8 market-anchored gate WIP rescued from an uncommitted working tree **(does not compile)**" (2026-09-11).
- `hermes/l6-clv-analysis` tip **830ff6d** — "L-6: CLV analysis of 2026-08-18 census **(UNPUSHED)**" (2026-08-19).
- `fix/signal-ledger-shard-v2` tip **1a2d01b** (same SHA is the tip of `hermes/shard-rotation`) — "docs(calibration): **record that the §2 backtest does not resolve**" (2026-09-28).
- `motif/audit-fix-calib-2026-10-01` tip **3e717b2** — "honest status labels — stale v5.3.0 proposal + **rankings queue (NOT BUILT)**" (2026-10-01).
- `motif/film-calibration-spec-2026-10-01` tip **10d8ca4** — "film calibration + weight-fitting spec **(UNCALIBRATED, no code)**" (2026-10-01).
- `gse/cat-c5-c1-offline-helpers` tip **e267ce9** — "unit status for C5/C1 **PR 860 awaiting CI**" (2026-09-16), paired with `gse/research-by-category-workflow` tip **966cce1** — "U1/U2 helpers landed on gse/cat-c5-c1-offline-helpers (**CI pending**)".
- `research/total-signal-inventory-2026-09-30` tip **be54387** — "handoff + ledger row SIGINV-0"; the atlas calls it "first of a series, likely ongoing".
- **11 tips whose content is indeterminate from the dump:** 3 marked "purpose unclear" (`claude/master-research-charter` tip **9260886**, plus 2 others) and 8 more marked "indeterminate from this commit" (bare main-sync merges) — each needs a diff against the tip.
- `gse-enhancements-2026-09-18` tip **073cddb** — "48 APIs mapped, **62 columns flagged UNVERIFIED**" (2026-09-18); the 62 columns are an open verification backlog.
- `hermes/frontier-transfer-2026-09-15` tip **44b8ee6** — "L3 shelved on wrong half (**snap_counts + practice_status unused**); E2/F4 unblockable".
- `hermes/prop-signals-and-rule-backtests` tip **acfe75e** — signal-ledger write sharding fix "so the next run actually resumes" (2026-09-28), i.e. backtest resume was broken.

### 1.3 Stale git metadata in the dump (`Sports-deploy-fix/`)
- `HEAD` = `ref: refs/heads/claude/gse-moat-aplus-clv-2026-06-03`; `ORIG_HEAD` = `b7ff33502b43b7eb98387ba5c5b7db8081db3ddc`; `refs/` is empty; `gitdir` points at `C:/Users/Garrett/Sports-deploy-fix/.git`. This is a June-2026 worktree snapshot sitting inside an October-2026 dump.
- `COMMIT_EDITMSG` (tip `8eb8f8a`) is an unpushed-in-this-dump salvage commit: "feat(gse): salvage P1 security/compliance + resolve GSE-vs-GSN brand" — it names **`docs/BRANCH_RECONCILIATION_2026-06-03.md`** and **task #11**, and claims verification "typecheck + eslint(--max-warnings=0) + guardrails/compliance tests (19) green". **`docs/BRANCH_RECONCILIATION_2026-06-03.md` is not present anywhere in this dump.**
- `logs/HEAD` shows the branch moved off `833f46f5` (main) onto `claude/gse-moat-aplus-clv-2026-06-03`, i.e. main and this checkout diverged in June.
- The six root reflog fragments name branch SHAs never carried into the dump: `458fee1a` (galaxy-sports-corporate-structure-Cni9A), `335311d1` (sports-intelligence-os-phase-9-ci), `d693ecf3`/`d43e24a9` (sports-prediction-platform-6F7Wa), `728f9c8b`/`f897fd56` (sports-wip-2026-06-04).

### 1.4 Uncommitted state across 24 worktrees (`Sports-recovery-manifest-20260924.json`, 2026-09-24)
24 worktrees recorded with uncommitted/untracked changes. Named examples:
- Main worktree `C:/Users/Garrett/Sports`, branch `feat/situation-snapshot-free-quote-precedence`, head `771d0367…` — **34 untracked files**, including `.opencode-runs/gse-packets-20260923/01-eprocess-calibration-shadow-plan.md`, `02-mlb-modelprob-first-slice.md`, `03-situationsnapshot-free-quote-precedence.md`, `docs/ops/CURSOR_CHEAP_WIRING_PROMPT.md`, `docs/ops/FREE_MODEL_LANES.md`, `docs/ops/OPENCODE-CONSENSUS-CLAIM-AB-2026-09-23.md`.
- `Sports-eprocess` (`gse/eprocess-calib-shadow`) contains **two 0-byte files**: `packages/prediction-engine/src/__tests__/scoring-total-drop-reasons.test.ts` and `.opencode-runs/eprocess-run.log.err` — an empty test file staged as untracked work.
- `Sports/.worktrees/consensus-claim-ab` carries `DO-NOT-RUN-CONSENSUS-HERE.md` (251 B, untracked).
- `Sports-fe93` (`hermes/fe-c93`) — 33 modified `apps/web/app/**` pages plus `scratch_repair_titles.py` untracked.
- `Sports-lane-bc-20260920` — 27 modified/untracked files including `packages/prediction-engine/src/scoring.ts` (70,232 B) and `packages/prediction-engine/src/index.ts` (71,807 B), uncommitted.
- `Sports-flash-0918` — `packages/prediction-engine/src/calibration/venn-width-harness.ts` + test staged `AM`, plus `reports/venn-stratified/settled-picks.jsonl` (2,251,453 B) untracked.
- `Sports-ncaaf-cal` — modified `apps/web/lib/scraping/source-rights-registry.ts` (47,518 B) uncommitted, plus `.tmp-cal/` run outputs.
- `Sports-wt-src` — new `packages/data-ingestion/src/rapidapi-sportsbook2-client.ts` + test untracked.
- `Sports-worktrees/ci-trust-gate-888-fix` — `docs/ops/AGENT_LEDGER.md` (523,062 B) modified and uncommitted.

### 1.5 Repo-intel open items
- `repo-intel/per-repo/Beexly-GSN.Cards.md:69` — `cdp_export_tool/` referenced in that repo's README **was not found in the `main` tree** ("may live on another branch or be pending").
- `repo-intel/per-repo/Beexly-agent-bus.md:65` — root README **confirmed absent (404)**; "file contents not read — descriptions of inbox/outbox lanes are from filenames only".
- `repo-intel/models/meta-llama-Llama-3.1-8B.md` — `config.json` returned **HTTP 403** on 2026-10-02; that dossier's architecture values are paper-sourced and flagged.
- `repo-intel/external/pseudo-r-Public-NFL-API.md:14` — "**a lawyer-read of ESPN's ToS on automated collection is still owed** before this becomes load-bearing."
- `repo-intel/external/BurntSushi-nflgame.md` — upstream `feeds.nfl.com` routes are "**deprecated/403'd**"; even the recommended fork inherits the dead source.
- `repo-intel/external/clausherther-nfl-dbt.md` — Snowflake/Redshift load path listed as "future work that never happened".

---

## 2. Contradictions between docs

1. **Is `intelligence/` on `main`?**
   - Brief (`gse-reasoning-engine-brief-2026-10-02.md`, §Verified state): "the engine code is **merged to `main`** (PRs #1012, #1013)", with architecture paths under `intelligence/…`.
   - `repo-intel/per-repo/Beexly-Sports.md:32` (built 2026-10-02 from the main-branch tree): "**no `intelligence/` top-level directory was observed on `main`** — intelligence work lives on feature branches."
   - Same dossier adds: the reasoning layer on main runs `readParts` → `aggregateSignals` over `data/reasoning/parts-registry.jsonl`, and "officials/weather/narrative/coaching lanes are **DARK**" — which sits against the brief's Providers section (weather priors, coaching tendencies) reading as present.
2. **"Real" vs "fixture" traces.** Brief and `GSE-REPO-INTELLIGENCE.md` both say "**Three real week-4 traces**" (ne-at-buf, nyj-at-chi, pit-at-cle). `branch-atlas.md` records the same-day tip of `feat/trueprob-calibration-boundary`, **6b82967** (2026-10-02): "[hermes-traces] Emit three **fixture** reasoning traces from scoreGame". Real or fixture is not settled anywhere in the dump.
3. **Owed-wire arithmetic inside `GSE-REPO-INTELLIGENCE.md` line 24.** "Owed: **12** (W1, W2, W3, W7, W10, W11×5 remaining, W13, W14, W15, W18)" — that parenthetical is 10 distinct wire IDs, or 14 line-items if W11×5 counts as five. Neither equals 12. The brief's "8 of 20" implies 12 owed, so the ID list and the count disagree.
4. **Two different wire denominators.** `branch-atlas.md` `fix/signal-weight-upsert-clause` tip **d402c88** (2026-10-01): "correct '**seven of thirteen**' to **eight**, at all five sites" — implying a repo document counts wires "of thirteen", while both dump docs count "8 of 20". The corrected document is not in this dump, so which denominator is canonical is unresolved.
5. **Registry regeneration claim vs its own provenance note.** Brief: the 47-signal registry "is regenerated from the current branch HEAD — it is an inventory with honest states". `GSE-REPO-INTELLIGENCE.md` line 19: the same regeneration "Provenance honestly notes **it is not a fresh line-by-line re-read**." Not fatal, but the two statements of the same fact are not equivalent.
6. **Stale checkout vs dump date.** `Sports-deploy-fix/` HEAD is a June-2026 branch while every other doc in the dump is dated 2026-10-02; `FETCH_HEAD` lists 40 remote branch heads fetched for `BeeXly/Sports` with no date. Treat that git metadata as a historical snapshot, not current state.
7. **Paper citation vs dump inventory.** The brief cites commit `9633e4e4e` against **paper 1601.04302** (4th-down matrix). `1704.00197v3.pdf` (the iWinRNFL paper) is in the dump; **no `1601.04302` PDF exists anywhere in the dump**. The paper behind that commit can't be checked from this folder.

---

## 3. License and "do not copy" warnings

**Hard stops (copyleft / no license):**
- `repo-intel/external/uberfastman-yfpy.md` — **GPL-3.0**: "linking it into GSE's engine would contaminate the codebase… **Do not install, do not vendor.**" Same file warns: "If any GSE agent has already vendored or pip-installed yfpy into the Sports repo or engine dependencies, that is a license contamination incident waiting to happen."
- `repo-intel/external/uberfastman-fantasy-football-metrics-weekly-report.md` — **GPL-3.0**: "Cannot be absorbed into proprietary GSE code… Study-only."
- `repo-intel/external/dfs-with-r-coach.md` — **GPL-3.0**: "Cannot be embedded in or linked from GSE's codebase without open-sourcing the derivative work."
- **No license file (= all rights reserved, study-only, cannot copy):** `DevanshDaxini-Sports-EV-Bot`, `BenBrostoff-draftfast` ("Cannot be copied or vendored; study-only… can't even borrow the rule-set table verbatim — must re-encode DK/FD rules from public contest rules"), `BoazBD-Winner-Predictor`, `SecuritahGuy-NFLDrafter`, `cameron-eth-sleeper-sdk`, `btatkinson-sportsball-elo`, `chanzer0-NFL-DFS-Tools`, `chanzer0-NBA-DFS-Tools`, `bcanfield-southpaw` ("No license = all rights reserved; study-only. Cannot be vendored"), `jjti-ff`, `jackc625-nfl-predict`, `pseudo-r-Public-NFL-API`, `ryurko-nflscrapR-models`, `wagerlab-model-aggregator`, `morelandjs-melo-legacy`, `louisrosenblum-NFL-Machine-Learning`, `shobrook-adrenaline`, `swfunc-Fantasy-Regression`, `datascopeanalytics-fantasy-football-projections`, `GBSOSS-ai-drawio` ("treat as all-rights-reserved until confirmed").

**Commercial-use restrictions:**
- `repo-intel/per-repo/Beexly-Sports.md:11` — GSE's own system of record is "**Not open source** — publicly viewable only, **PolyForm Noncommercial License 1.0.0**", README mode "**internal calibration only**".
- `repo-intel/external/MySportsFeeds-mysportsfeeds-node.md` — wrapper is MIT but **the data is "free for non-commercial use" only**: "free-for-non-commercial data cannot feed a commercial prediction engine without a paid tier"; Garrett already holds an account (named in the dossier) and it is "an unused account, not an asset."
- `repo-intel/models/meta-llama-Llama-3.1-8B.md` — **Llama 3.1 Community License**, gated, custom, "not OSI-approved… Meta can revoke/alter terms."
- `repo-intel/models/allenai-dolma.md` — toolkit Apache-2.0, but the **Dolma dataset is ODC-BY** ("attribution required").

**Explicit "don't copy" phrasings:**
- `repo-intel/models/Ayubjon-decontam.md:17` — "**Don't copy the metric**; copy the gate position and the cleaned-output contract."
- `repo-intel/external/BenBrostoff-draftfast.md:20` — "MIT-clean room: re-derive DK/FD roster rules from contest pages, **don't copy the code**."
- `repo-intel/external/drmbeledogu-RobustDFS.md:17` — "**Don't copy the Gurobi dependency**; steal the objective formulation."
- `repo-intel/external/bcanfield-southpaw.md:23` — "**Never automate submission on Garrett's account.**"

**Hygiene rulings recorded in `GSE-REPO-INTELLIGENCE.md` §6 (cross-cutting):**
- Scrub references to archived repos anywhere in GSE docs: **text-generation-inference, AutoGPTQ, AutoAWQ**.
- Fix org moves: `ggerganov/llama.cpp` → `ggml-org/llama.cpp`; `microsoft/DeepSpeed` → `deepspeedai/DeepSpeed`.
- Standing lesson from `repo-intel/external/Thworry-reposcope.md:15`: external-repo adoption decisions "currently rest on ad-hoc dossier work"; the fleet should run the license check on "**every** candidate before ADOPT/REBUILD/IGNORE" — it would have "flagged adrenaline's dead status and yfpy's GPL-3.0 instantly."

---

## 4. Data paths present in the dump but not named in the brief

**Repo-intel delta (`GSE-REPO-INTELLIGENCE.md`) — engine paths the brief never writes out:**
`intelligence/context/tau_wire.py` · `intelligence/gates/heldout_check.py` · `intelligence/gates/manifest_check.py` · `intelligence/gates/calibration_rows.json` · `intelligence/audit/paired.py` · `intelligence/host_ledger.json` · `intelligence/providers/injury_gate.py` · `intelligence/coaching/data/vintage-2026-10-02.json` · `docs/DOCTRINES.md` (mentioned only as a "read first" in the brief's how-to, not as an architecture path) · `docs/research/2026-10-02/hermes-second-wave.md` · `emit_three.py` · `pipeline.py` · `REGEN-NOTE.md`.

**Tree layout from `repo-intel/per-repo/Beexly-Sports.md` (main branch, 13,542 entries):**
- `data/gse-dataset` (nflverse contracts/rosters/snap-count JSONLs + ingest manifest) · `data/reasoning/parts-registry.jsonl` · `data/backtest` · `data/beex-picks` · `data/nova` · `data/source-atlas` · `data/statking`.
- `packages/` — 20 workspaces incl. `prediction-engine`, `ingestion-pipeline`, `data-ingestion`, `feature-store`, `quote-plane`, `epistemic-twin`, `compliance`, `stats-api`.
- `gse-ml-service/` (Python, Docker) · `eval/edge-lab` · `eval/promptfoo` · `formal/INDUCTION_DOCTRINE.md` · `handoff/00-READ-CANONICAL.md` · `workers/pick-generation`, `workers/data-refresh`, `workers/content-publishing`, `workers/airwave-listener` · `scripts/calibrate-weights.py`, `scripts/calibrate-ol-drag.py` · `docs/INDEX.md`, `docs/FREE_FIRST_DATA.md`, `docs/PROPRIETARY_METRICS_REPRODUCTION_STRATEGY.md`, `docs/BOOTSTRAP_LEVERAGE.md` · root `AGENTS.md`, `CLAUDE.md`, `START_HERE.md`, `neon.ts`.

**Competitive-intel corpus (`repo-intel/per-repo/Beexly-gse-competitive-intel.md:14`):**
`dossiers/<domain>.json` (310 dossiers — 247 live / 8 dead / 55 walled) · `raw/` (1,676 append-only evidence files) · `codes/` (572 OSS catalogs with algorithm + license) · `MASTER_MATRIX.md` / `.json` · `GSE_BLUEPRINT.md` · `PHASE4_GAPS.md` · `queue.json` (765-target queue).

**Paths recorded inside `Sports-recovery-manifest-20260924.json` (host checkouts, 2026-09-24):**
`docs/ops/AGENT_LEDGER.md` (523,062 B) · `.opencode-runs/gse-packets-20260923/*.md` · `docs/ops/CURSOR_CHEAP_WIRING_PROMPT.md` · `docs/ops/FREE_MODEL_LANES.md` · `docs/ops/OPENCODE-CONSENSUS-CLAIM-AB-2026-09-23.md` · `docs/ops/CURSOR_AND_FREE_AGENTS_SETUP.md` · `docs/ops/OPENCODE_CHEAP_WIRING_PROMPT.md` · `docs/ops/SPECKIT_SETUP.md` · `docs/ops/stats-lane/incoming/nflverse-pbp/play_by_play_2023.csv.gz` (19,169,807 B) · `docs/research/2026-09-23-signal-caller-census.md` · `docs/fable/evidence/CLAIM_EVIDENCE_LEDGER.json` / `.md` · `reports/venn-stratified/settled-picks.jsonl` (2,251,453 B) · `scripts/ops/export-venn-stratified-rows.mjs`, `scripts/ops/measure-venn-stratified.ts` · `packages/data-ingestion/src/source-registry.ts` (75,671 B) + `rapidapi-sportsbook2-client.ts` · `packages/prediction-engine/src/__tests__/scoring-total-drop-reasons.test.ts` (0 B) · `DO-NOT-RUN-CONSENSUS-HERE.md` · `.tmp-cal/nflverse-games.csv`.

**Dump-level files not named in the brief:** `branch-atlas.md` · `GSE-REPO-INTELLIGENCE.md` · `Sports-recovery-manifest-20260924.json` · `repo-intel/**` (136 files) · `Sports-deploy-fix/**` · the eight zips in the read/skipped list above · 115 arXiv PDFs and 18 paper-port `.ts` files (present, skipped by instruction).

---

## 5. Evaluation queue

Every item below is **QUEUED** — not dead, not done. No measurements are claimed; none were taken.

- **QUEUED:** Reconcile §2.1 — verify whether `intelligence/` exists on `main` at PRs #1012/#1013, or whether `Beexly-Sports.md` is right that it lives only on feature branches.
- **QUEUED:** Settle §2.2 — real vs fixture for the three 2026-10-02 traces; check `feat/trueprob-calibration-boundary` @ `6b82967` against `emit_three.py` output.
- **QUEUED:** Repair §2.3 — the "Owed: 12" list vs its 10 wire IDs in `GSE-REPO-INTELLIGENCE.md:24`.
- **QUEUED:** Locate the document behind commit `d402c88` ("seven of thirteen" → eight) and decide which wire denominator (13 vs 20) is canonical (§2.4).
- **QUEUED:** Resolve §2.5 — registry regeneration provenance vs the "not a fresh line-by-line re-read" note.
- **QUEUED:** Acquire paper `1601.04302` (cited by commit `9633e4e4e`, absent from the dump) (§2.7).
- **QUEUED:** Track owed wires W1, W2, W3, W7, W10, W11 (×5), W13, W14, W15, W18 by ID against the branch (§1.1).
- **QUEUED:** Build the scheduled loud-failure feed watchdog (static half only exists as `intelligence/gates/manifest_check.py`) (§1.1).
- **QUEUED:** Build full LeakageGate + as-of fencing (`heldout_check.py` covers overlap only) (§1.1).
- **QUEUED:** Unblock `process-sport.ts` wiring on `hermes/b6a-chain-append` @ `7f3822c` (§1.2).
- **QUEUED:** Unblock DB-auth blocker on `hermes/hf5-mve` @ `0035e3b` (§1.2).
- **QUEUED:** Decide fate of `hermes/v528-market-gate-preserved-2026-09-11` @ `e2ec226` (does not compile) (§1.2).
- **QUEUED:** Push or formally retire `hermes/l6-clv-analysis` @ `830ff6d` (marked UNPUSHED) (§1.2).
- **QUEUED:** Answer the non-resolving §2 backtest recorded at `1a2d01b` (§1.2).
- **QUEUED:** Confirm PR 860 CI state for `gse/cat-c5-c1-offline-helpers` @ `e267ce9` (§1.2).
- **QUEUED:** Decide the v5.3.0 proposal / rankings queue marked NOT BUILT at `3e717b2` (§1.2).
- **QUEUED:** Triage the 62 UNVERIFIED columns from `gse-enhancements-2026-09-18` @ `073cddb` (§1.2).
- **QUEUED:** Reconcile the 24-worktree uncommitted state in `Sports-recovery-manifest-20260924.json`, starting with the 0-byte test file and `docs/ops/AGENT_LEDGER.md` (§1.4).
- **QUEUED:** Recover `docs/BRANCH_RECONCILIATION_2026-06-03.md` named in `Sports-deploy-fix/COMMIT_EDITMSG` but absent from the dump (§1.3).
- **QUEUED:** Confirm push state of salvage commit `8eb8f8a` on `claude/gse-moat-aplus-clv-2026-06-03` (§1.3).
- **QUEUED:** Find `cdp_export_tool/` (README-referenced, missing from `main`) in `Beexly-GSN.Cards` (§1.5).
- **QUEUED:** Lawyer-read of ESPN ToS for automated collection, per `pseudo-r-Public-NFL-API.md` (§1.5).
- **QUEUED:** Standing license gate on every ADOPT decision — yfpy GPL-3.0 contamination check across Sports deps (§3).
- **QUEUED:** Scrub archived-repo references (text-generation-inference, AutoGPTQ, AutoAWQ) and stale org paths (llama.cpp, DeepSpeed) from GSE docs (§3).
- **QUEUED:** Decide MySportsFeeds: fund paid tier or keep IGNORE (non-commercial data vs commercial engine) (§3).
- **QUEUED:** Re-export the 29 `.gdoc` files as plain text so their content is reviewable (read/skipped list).
- **QUEUED:** Inventory the eight zips (names only so far) for brief-relevant content — extraction not authorized by the current prompt.
- **QUEUED:** Diff the 11 indeterminate branch tips in `branch-atlas.md` — 3 "purpose unclear" plus 8 bare main-sync merges (§1.2).
- **QUEUED:** Verify GSE-lens gap items recorded in `GSE-REPO-INTELLIGENCE.md` §5 that the brief does not cover — no consensus baseline, no MCP/`gse` CLI surface, no edge detector/staking layer, no repo-memory layer — each against the repo before any build.

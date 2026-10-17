# Coding agent — WIRING MISSION (2026-10-02)

Three blocking gaps, in priority order. Work all three; don't stop at the first green.

**Context:** branch `motif/gse-intelligence-build-2026-10-02` (HEAD `b3e15f21`). Full audit with receipts standard: `~/workspace/your_files/GSE-MASTER-INVENTORY-2026-10-02.md` §7. Repo rules govern.

**1. SEED CSVS — they exist, wire them in.** `~/workspace/coaching-tendencies/data/` holds `coach_offense.csv`, `coach_defense.csv`, `off_tendencies.csv`, `def_tendencies.csv` — real nflverse parquet-built (build scripts in `code/`), including the 2026 CLE Monken HC row (164 plays) the 10 failing coaching tests pin. Diff them against the tests' pinned expectations (1e-6 YoY delta), land the files on the branch, make the 10 tests pass for real.

**2. OL PROVIDER — build it.** Spec: `~/workspace/gse-intelligence-build/data/alexandria/RECONCILED-SOURCES-2026-10-02.md`. Implement `get_ol_status` / `get_ol_starters` (nflverse injuries + depth_charts; Alexandria only for live daily practice detail; `DataGapError` on unpublished/uncovered weeks). Invoke through the real `analyze()` path and the L3 OL track. Re-run `intelligence/tests/e2e/test_t1_real_e2e.py` — T1 must clear `offensive_line UNCHECKED`. Remove or re-mark the old hand-built T1 test (`test_reasoning_trace_e2e.py::TestT1PressureFunnelRejected`) — it passes on fixtures and real data alike, so it proves nothing.

**3. SIGNAL REGISTRY + TAU — give the engine its nervous system.** Write the signal registry as a versioned file on the branch (signal id, producer, wired state, gate, evidence). Give it its first real producer; one end-to-end test proving a signal fires on a real pick. Fix the gate: `homeSign` is unset on every production definition and 9 ACTIVE evaluators return null — set it or flip them to explicit DISABLED. Wire `tau_hat.csv` (`intelligence/coaching/data/`, manifest-pinned) into the reasoning context; prove one pick changes. Note: the served 2026 cells pool in-season weeks — do not present the table as pre-kickoff; rebuild walk-forward or stamp it.

**Proof required for each:** files changed, tests run with counts, what was actually exercised, where the logs live. Land everything on the branch. Don't stop, don't stall, don't hyper-fixate — if a sub-task is genuinely blocked, record why and move to the next.


---

# GSE MASTER INVENTORY — 2026-10-02

**Purpose:** one file holding EVERYTHING GSE-related, so the coding agent cannot miss anything. Built at Garrett's order on 2026-10-02 — he does not trust prior "all research processed" claims, and neither should anyone reading this.

**Status: IN PROGRESS.** Two independent full-filesystem sweeps (A and B) are running the same brief across every root; their reconciled output lands in §4/§5 below. What is already in this file: the coding agent's 2026-10-02 field report (verbatim, §2) and the NFL Analytics Reverse-Engineering artifact (extracted, §3).

**How to use:** the coding agent treats every item here as in-scope until Garrett says otherwise. "Found" ≠ "processed" ≠ "wired" ≠ "tested" — those are separate columns in the claim matrix, not this file.

---

## §1. Coverage ledger (what this file asserts, honestly)

| Claim | Status | Evidence |
|---|---|---|
| 2,600+ pages/docs/research exist across corpus roots | CONFIRMED (vendor/Sports/docs = 3,894 files; corpus-intelligence = 3,736; both sweeps agree) | §4 |
| Full corpus read twice by prior agents | **NOT PROVEN — do not repeat** | No receipts; correction owed in overnight prompt |
| Raw file counts as work-product measures | **DEBUNKED — inflated ~40x by venv/node_modules/.pyc** | §4 honest accounting |
| "We found everything" scoped to the 9 listed roots | **FALSE — 40+ extra GSE dirs (~128K files, ~7–9G) at workspace top level** | §4 |
| 1,000 arXiv papers / 750 ADAPT-ADOPT target | 585/750 verified as of 2026-09-26; arxiv-sweep/fulltext holds 1,115 papers locally | docs/research/2026-09-21/arxiv-program/phase2/AUDIT-2026-09-21-tracker.md |
| Hermes second wave (night of 2026-10-01/02) | OUTPUTS NOT YET VISIBLE HERE | Lives on Garrett's phone; must land on agent-bus or branch, then appended here |
| muse.ai artifact "nfl-analytics-reverse-engineering" | CONTENT EXTRACTED (§3); 1.45M md also on agent-bus | Static HTML export; underlying data files referenced as in-artifact downloads |
| Branch HEAD motif/gse-intelligence-build-2026-10-02 | **MOVED: now b3e15f21, was d255965** — commits pushed after "final" handoff | Both sweeps confirm; §2 §8 predates the move |

---

## §2. Coding-agent field report — received 2026-10-02 (verbatim)

*Recorded as received. These are the coding agent's claims, not independently verified. Verification column is owed.*

### 1. DISK
Yes. Baseline 4.2 GB free of 476 GB. After cleanup, 10.6 GB, then 9.9 GB once the play-by-play download landed. Removed: uv cache 3.81 GB, npm cache 2.21 GB, old Codex runtime installs 0.69 GB. A stuck du.exe that had been scanning the home directory since 04:10 was killed. Not touched: iPhone backups (68.9 GB), Documents\Codex (29.3 GB), Docker WSL (13.3 GB), case files, any git worktree, any committed source. Recorded in DISK_CLEANUP.md on motif/gse-intelligence-build-2026-10-02, commit b3e15f21f, pushed.

### 2. HF LAYER AUDIT
Yes. Eleven Beexly Spaces, zero GalaxySportsEdge Spaces, zero Beexly models, zero Beexly datasets, one private bucket. Written to docs/architecture/HF_AUDIT.md in that same commit.

- mimo-brain-engine is RUNNING on zero-a10g. Serves XiaomiMiMo/MiMo-V2.6-Distill-Qwen-9B in 4-bit. MIT. /chat takes a prompt and returns text. Reads no repo, no bucket, no database. scoring.ts does not call it.
- studio-chat is RUNNING on zero-a10g, Qwen2.5-72B-Instruct, general chat, not a signal producer.
- gse-watch-pipeline is RUNNING on cpu-basic, not a T4 and not ZeroGPU. Returns JSON for a posted JPEG and writes nothing itself. It is not the missing coaching producer.
- timesfm3-benchmark is PAUSED on cpu-basic. One frozen benchmark, no on-demand forecast endpoint. TimesFM Non-Commercial License v1.0.
- gse-proof-mcp is PAUSED. Reads https://www.galaxysportsedge.com public JSON. Does not read the repo.
- Other six Spaces (studio-hub, studio-media, studio-video, podcast-pipeline, jppy-logo-demo, qwen38-27b-mlx-lab) produce no engine facts.
- Bucket Beexly/timesfm-3.0-pytorch-bucket is private, 1,322,910,322 bytes, five objects: license, readme, config, model.safetensors. No forecast output, no play-by-play, no tau table. Listed over the S3 API. No consumer in the prediction engine. No TimesFM output was generated, none routed into a commercial path.
- Account is PRO and canPay is true. This run did not open the billing page, so credit balance and auto-recharge state are unknown, not "off."

### 3. FOUR-TIER ARCHITECTURE
Stated in docs/architecture/FOUR_TIERS.md. The brief's sentence "this is the reasoner, this is the product" was replaced with the measured fact: a published pick does not pass through MiMo.

Bridges. Tier 1 to Tier 3: no production bridge. A JSONL file nobody reads was not added. Tier 2 to Tier 1: no consumer, and that is the constraint. Tier 4 reads the public site, not the repo, so it cannot see an unpushed pick. The integration test that passes is inside Tier 1: tests/test_tau_artifact_contract.py pins the tau CSV hash to its manifest. There is no test that carries a fact across a GitHub/Hugging Face boundary, because that boundary is not wired.

### 4. PRODUCERS
The missing one was coaching tau, and it was not on Hugging Face. nflverse play-by-play for 2022-2026 fetched, sha256-checked against the GitHub release, fit with TauFitter. Served table: intelligence/coaching/data/tau_hat.csv, 1,523 cells, sha256 in tau_hat.manifest.json. Fallback mix: 55 unit, 162 pooled, 933 league, 373 league-region. Point fit, not walk-forward. A 2026 unit cell pools weeks 1-3 already in the file. Do not treat it as pre-kickoff.

Held-out measurement, separate fit, train 2022-2023, eval 2024-2025 opponent-half fourth downs: n=3,988, delta +6.7703 percentage points, gate pass. That number belongs to that fit, not to the served table. tests/test_coaching_gates.py: 4 passed. The 2022-2025 parquet files are local inputs, not committed; manifest has URLs and hashes.

Still missing, not invented: coach_offense.csv, coach_defense.csv, off_tendencies.csv. Full-disk search found zero copies. Ten coaching tests still fail on that gap. The pinned expectations (Todd Monken, CLE, 2026, HC, year-over-year delta to 1e-6) cannot be rebuilt from play-by-play without manufacturing the rows the tests demand. **[REFUTED 2026-10-02 §7: the files exist at ~/workspace/coaching-tendencies/data/; the search ran on the wrong machine.]**

### 5. SIGNALS
Registry has 47 entries. Inventory taken against commit cc151ddd3, read-only. Counts: producer present 32, stub or none 15, wired=yes 0, wired=partial 10, weighted with evidence 0, tested for fire-and-contribute 0, traced on a real pick 0, behind a dark gate 38, real committed source data 0. None of the 47 clear all eight requirements. Nine ACTIVE signals return null unconditionally. Continuous tilt refuses every real signal because homeSign is set on no production definition. Counts not improved by editing the registry to look wired.

### 6. REASONING TRACES
Three files on feat/trueprob-calibration-boundary, commit 6b8296791, pushed. data/reasoning-traces/moneyline.json (Chiefs ML, confidence 52), spread.json (Bruins -1.5, confidence 50), total.json (OVER 47.5, confidence 60). Each file says source=fixture and real_pick=false. Constructed OddsInputs run through scoreGame and buildReasoningTrace. Not settled games, not published picks, do not show a registry signal firing. No calibrator supplied, none fit.

### 7. BATCH 3
Done and pushed. tests/e2e/test_t1_real_e2e.py: 8 passed. Three stub-control failures were a wrong fixture name (trace used where the argument was stub_trace). Real-provider probe, run this session: label INVALID, depth L1, offensive_line UNCHECKED, levels empty. Honest refusal, not a kill. Commit cc151ddd3 on origin/motif/gse-intelligence-build-2026-10-02.

### 8. COMMITS
Intelligence branch, pushed: cc151ddd3 (T1 e2e), 2d359009e (first tau table plus FOUR_TIERS), b3e15f21f (real multi-season tau table, manifest, HF audit, disk note, contract test). Calibration branch already committed and equal to origin at f5a83452e. Not sitting uncommitted. Added and pushed 6b8296791 (fixture traces only). PR 1002 is OPEN, merge state DIRTY, Azure check skipped for merge conflicts, Vercel deployment failed, Codacy action_required. Not merged. No map was fit.

### 9. AMBIGUOUS DECISIONS
- Brief said second assessIndependentEdge call site was unwired. Both sites pass input.context.probabilityCalibrator (scoring.ts:678 and :1325). Left unchanged.
- Brief said MiMo is the product. Measured wiring says it is not on the scoring path; architecture doc says that.
- Brief said build a bridge at every empty boundary. A file nobody reads was declined.
- 13.5-point Hamming figure from a fit that included the eval years was discarded; held-out figure is the one recorded.
- 2022-2025 parquet not committed; manifest carries the hashes.
- iPhone backups and case files were not deleted to free disk.

### 10. GUARDRAIL BLOCKS
None. No guardrail phrase reworded. No flag flipped. Secret scan passed on every commit and both pushes.

### 11. TEST FAILURES
T1 stub-control: fixed, 8 passed. Coaching gates: 4 passed on real parquet after the producer existed. Tau artifact contract: failed once on a bad assertion (manifest mentions TimesFM to say the table is not TimesFM), assertion removed, test passed. Ten seed-CSV tests: still failing, files absent, not invented. Prediction-engine suite on calib worktree at f5a83452e: 871 files passed, 1 skipped, 6,472 tests passed, 2 skipped, exit 0. Not re-run after the trace-only commit.

### 12. SUBAGENTS
One. Read-only signal inventory. Wrote the local survey JSON and markdown, modified no repo. Counts in section 5. Verified by reading the summary and three findings (registry bypass, homeSign absent, nine null evaluators), not by re-reading all 47 rows.

### 13. NEXT PRIORITY
The ten seed files, if a real source exists outside this machine. Not in git history, not on disk. After that, the registry: 0 of 47 wired, nine ACTIVE evaluators returning null. Wiring those by giving them a producer is the engine work. Calibration is not the current frontier.

### 14. REFUSALS
No coach rows manufactured to turn 10 red tests green. No calibration map fit. No production database read or written. No TimesFM forecast generated or routed anywhere. No gate or env flag flipped. PR 1002 not merged. The brief's claim that MiMo is already the scoring path was not written into the architecture doc as fact.

*— end of verbatim field report —*

---

## §3. Artifact: "NFL Analytics Reverse-Engineering" (extracted 2026-10-02)

- **Source:** https://muse.ai/library/artifacts/nfl-analytics-reverse-engineering
- **Local export:** `~/workspace/user/files/NFL_Analytics_Reverse-Engineering__3.html` (6.07 MB, single-file interactive app; extracted 2026-10-02)
- **One-liner:** "Trace the number. Then build a better one." — a field manual for reverse-engineering nine public NFL analytics systems into model-ready features.
- **Coverage window:** September 17–24, 2026 sweeps.

### Claimed contents (as stated in the artifact; underlying files are in-artifact downloads, not yet extracted)

| Item | Claimed size |
|---|---|
| Sweep records catalog | 299 records (199 metric/method, 66 theory/presentation kernels, 34 data-access notes) |
| Complete research report | 1,008 lines (report.md) |
| Complete metric catalog | 1,548 lines |
| Sweep writeup | 4,524 lines + 170 chart-table CSVs + 9 README inventories |
| Research expansion digests | 14 attributed digests |
| NGS metrics | 62, with publication-status labels |
| Benchmark methods (deduplicated) | ~52 |
| Data source profiles | 52, with access/licensing states |
| arXiv index | 1,251 rows (1,203 ADAPT + 48 ADOPT, zero REJECT counted); earlier 365 and 579 snapshots preserved as history |
| Canonical corpus manifest | 2,204 files, 81 MB, SHA-256 per file (manifest JSON) |
| Research packet | 17-file bundle (report + sweep + expansion index + 14 digests) |
| Systems reverse-engineered | 9 (inputs, math, access boundary, output columns each) |
| Build bench | 5 starter implementations (implementation order, not a relevance gate) |

### Operating rules stated in the artifact
1. Trace every feature back to its source and denominator.
2. No relevance filter removes a sports signal from the record — marginal, contradictory, duplicated, proprietary, incomplete, historical, not-yet-buildable material stays attached to its source.
3. Evidence labels describe what is known; they do not decide what the engine may learn.
4. Access states distinguished: **Free rows** (downloadable, no paid credential) vs **Open schema** (docs public ≠ data public) vs **Key required** (endpoint real, needs issued key) vs **Private mechanics** (weights, labels, film coding stay proprietary).

### Sections (01–09)
1. **Anatomy** — chart-to-feature chain: Source → Eligibility → Transform → Validate → Feature.
2. **Metric atlas** — nine systems opened (feed vs computation vs output columns per card).
3. **Sweep archive** — the 299-record catalog + full reports at three depths.
4. **Research expansion** — 14 lanes: NGS methodology, benchmark deltas, DFS/props work, source-access boundaries, arXiv program, verification doctrine, Sept 24 PM sweep.
5. **Canonical corpus map** — checksum manifest of the docs/research/ tree as of Sept 24 (2,204 files).
6. **Build bench** — five reproducible starter implementations.
7. **Source map** — access boundary tested Sept 18, 2026 (nflverse, FTN charting API, FTN Stats iQ guest, Odds API v4, StatRankings, SumerSports, PFF, All-22 + codebook).
8. **Feature manifest** — copy-ready build manifest from selected systems (3 kernels shown: market-strength→prop priors; EPA/WPA facet decomposition; receiver opportunity conditioned on shell mix).
9. **Sourcebook** — 12 primary trails (nflverse, nflfastR manual, FTN via nflverse, FTN API docs, FTN Stats, Odds API v4, StatRankings preview + launch, SumerSports, PFF grading, Thunder Dan, Bobby Peters film method).

### Extraction note
Static extraction captured the artifact's text and structure. The underlying data files (report.md, catalog, sweep writeup, 170 CSVs, 14 digests, corpus manifest JSON) are referenced as downloads *inside* the artifact and were not pulled — if Garrett wants them in the corpus, that is a separate fetch. The artifact's 2,204-file corpus manifest (Sept 24) should be diffed against the current docs/research/ tree; any file in the manifest but missing from the repo, and vice versa, gets flagged.

---

## §4. Reconciled filesystem inventory (sweeps A+B, 2026-10-02 ~12:05 CT)

**Method:** two agents ran the identical brief independently. Every root below was measured by both; numbers shown are agreed values, disagreements logged in §5. Read-only; nothing modified. Zero inaccessible roots.

### The honest accounting (read this first)

Raw file counts are theater. The workspace is dominated by virtualenvs, node_modules, and .pyc files:

| Root | Raw files | Real files | Junk |
|---|---|---|---|
| gse-intelligence-build | 11,862 | ~264–269 | .venv (11,396 files / 681M) + .pyc |
| gse-discovery | 74,426 | ~17,586 | nested venvs + 17,637 .pyc |
| sports-merge (extra) | 63,763 | ~12,000 | node_modules (51,654 files) |
| vendor/Sports/docs | 3,894 | 3,894 | — (real research corpus) |
| corpus-intelligence | 3,736 | 3,736 | — (real briefs + analyses) |

**Any prior claim citing raw counts ("11,862 files of intelligence code", "74K discovery files") overstated work product by ~40x.** The coding agent's checklist must use REAL counts.

### Per-root reconciled totals

| # | Root | Files | Size | Dates | Notes |
|---|---|---|---|---|---|
| 1 | vendor/Sports/docs | 3,894 | 103M | 2026-09-09 → 10-01 | research corpus: arxiv-program/research 1,706; ops 450; dfs/research 396; research/ 243; engine 166; fable 143; fantasy 116; props 53; reasoning 51; gse 47; data-sources 35 (12M); predictions 19 (6.3M); + ~25 smaller lanes |
| 2 | corpus-intelligence | 3,736 | 23M | 2026-10-02 | briefs/ 3,457 across c01–c10 (+c07d); deep/ 89 final analyses; chunks/ 130; handoff/ 40; maps/ 11; intake/ 7 |
| 3 | gse-intelligence-build | ~267 real | ~42M real | 2026-10-02 | the Oct intelligence program (see module map) |
| 4 | gse-discovery | ~17,586 real | 6.1G | 2026-09-13/14 | MOVE-37 / DeepSeek lane: phase6/ experiment tracks, symbolic-regression/ estimator blobs (2.1G), data_snapshot (341M) |
| 5 | your_files | 34 | 222M | 2026-09-12 → 10-02 | prompts + media (mnf-recap 222M video) |
| 6 | goals | 465 | 245M | — | 26 goals, 13 GSE-related |
| 7 | skills | 48 | 404K | — | x-poster, firecrawl, openrouter, huggingface, github = GSE-relevant |
| 8 | tools | 287 | 723M | — | recordly (720M AppImage) + reclip |
| 9 | memory | 91 | 364K | 2026-09-09 → 10-02 | daily logs + people/groups |
| 10 | Sports branches (remote) | 629 total, **91 matched** | — | — | 35–37 motif/* lanes + gse/*, hermes/*, claude/*, research/* |
| 11 | agent-bus (remote) | 77–79 | — | — | from-motif 59–61, from-hermes 6, outbox 12 |
| 12 | **EXTRA top-level workspace dirs** | **~128,000** | **~7–9G** | — | **40+ GSE dirs outside every prior accounting** |

### gse-intelligence-build — module map (real files only)

coaching/ (41: coach_risk, refit_tau, situational_wp, behavior, pressure_answer, proe, sequencing, tempo, redzone, tenures, regime, fingerprint, dc_pressure, adjustments, ingame, build/ scripts, data/ 14 CSVs, tests/) · qb-behavior/ (59: src/qb_behavior engine/form/familiarity/trust_target/metrics/profile/situational/, data/ 8 CSVs incl. int_cells 10.8M, build/, 16 tests) · reasoning/ (13: L1–L5 engine, adversary, specialists, trace, schemas) · integration/ (10: api.py 29K = analyze() façade, pipeline, providers, stubs) · engines/ (11: backends, llm_specialists, harness, prompts, drift_monitor, ENGINE-REPORT.md, space/) · trust/ (10: calibration, abstention, enbpi, evidence_guard, leakwall, proofledger) · trust-signals/ (24: classify, scoring, extractors/, news_wire, tipster) · ratings/ (10: gelo, plusdc, relativize, qb_decomp) · combining/ (8) · staking/ (11: kelly, cvar, alpha_governor) · newregime/ (11) · qb/ (9) · tests/ (27: CONTRACTS.md, e2e/ incl. pit_cle_w04_t1.json, last-run-report.md) · data/alexandria/ (12: SOURCES-A/B, RECONCILED-SOURCES, nflverse-injuries-2026.csv.gz, injury-week4.json, **injury-week5.json 1,160 bytes = the empty 5-credit pull**, espn-injuries 8.8M, sleeper-players 14.7M, roster JSONs) · contracts/ (1).

**Stub-data honesty flags:** `corpus-intelligence/handoff/hf-survey-raw/` contains 2-byte JSONs (sports-betting, sports-odds, reasoning-mimo2, reasoning-glm) — failed pulls recorded as successes-in-count. Do not cite them as completed surveys.

### The 40+ extra dirs (the find that justified the distrust)

Both sweeps independently found these at `~/workspace/` top level, outside all previously listed roots:

| Dir | Files | Size | What it is |
|---|---|---|---|
| sports-merge | 63,763 | 2.0G | repo merge copy: docs 3,688 (101M), apps 3,140 (105M), packages 3,503, data 159 (450M), handoff 310 — node_modules is junk |
| gse-research | 22,525 | 820M | edge-sheet/ 17,112 (644M), props-consensus/ 5,373 (176M), nfl-2026/, statrankings/ |
| qb-behavioral-profiles | 7,435 | 703M | data/ 204 (199M), profiles/, code/ |
| creator-intel | 6,805 | 603M | work/, pipeline/, models/ 142M |
| gse-lab | 4,414 | 193M | whalelay/ 20 (15M); plotvenv is venv junk |
| build | 3,330 | 1.4G | mnf-recap-real/ 2,884 (video build), kit-lead/ |
| awesome-apps-gse | 2,006 | 160M | reference app experiments |
| arxiv-sweep | 1,376 | 100M | fulltext/ 1,115 papers (83M), waves/, phase2-assignments/ |
| cvwork | 944 | 50M | computer vision work |
| dfs-week3 | 741 | 46M | week-3 DFS |
| ts-spaces | 302 | 79M | HF space prototypes |
| wiring-wave2 | 280 | 3.3M | wiring wave 2 |
| coaching-tendencies | 19 | 82M | coaching tendencies data |
| research_notes | 21 | 1.6M | nfl-sweep-metrics-catalog, reverse-engineering reports |
| ig-post-*.json | ~100 | — | Instagram research sweep (incl. the MiMo source file) |
| arxiv batch ledgers | ~25 | — | batch4-*.txt/jsonl part ledgers |
| + ~20 smaller | — | — | arxiv-scratch, arxiv-second-pass, arxiv-ledgers, arxiv-reader12-search, brev-research, dfs-research (1 file, 94M), film-cal-spec, ig-sweep, keenum-splits, nfl-deep-dive, patent-mining, radar-second-pass, research/, scratch-nfl-sweep, space_data, sports-edge-logos, sports-push, sweep-catalog-working, timesfm3-space, w3, w3-07-scratch, wiring-wave, worker3, ngs-feed-creation-plan.md, total-signal-wiring-spec.md, AGENT-IMPLEMENTATION-HANDOFF.md |

### Branch sprawl (remote, Beexly/Sports — 629 branches, 91 matched)

**motif/* lanes (35–37):** arxiv-second-pass, audit-fix-{calib,ledger,props,signals}, cv-{corpus,engine-bridge,perception,pipeline}, film-{calibration-spec,manifest,pilot-2}, github-nfl-sweep{,-deep-dive}, github-secrets-audit, **gse-intelligence-build-2026-10-02** (HEAD now `b3e15f21` — moved past the "final" `d255965`), ig-research, ig-sweep, ledger-shadow, madden-stage7, orchestration{,-v2,-v3,-v4}, pickem-intake-audit, replay-pilot, repo-bucket-reorg, rescue-883-calib-clv, rescue-salvage-tier-a, space-v2-tracking, total-signal-wiring, watch-loop, watch-space-auth, watcher-space-auth, wiring-plans.

**Other GSE:** gse/* (25+: score-bridge, consensus-binder, isotonic-kelly-platt, hermes-live-wip, holdout-spearman-platt…), hermes/gse-signal-wiring-20260924, hermes/ngs-sep-adot-catch, agent/total-signal-wiring, feat/ws5-walkforward-wiring, claude/gse-* (5), research/* (firecrawl-evidence-spine, total-signal-inventory-2026-09-30, proven-edge).

### Agent bus (remote, Beexly/agent-bus)

inbox/from-motif (59–61): TASK-001…015, BUILD-BIBLE.md, DEEPSEEK-*-PROMPT.md ×4, GSE-RESEARCH-LOCKIN, SOURCE-2026-09-12-deepseek-* (up to 129K), UNSEEN-AUTOPSY-BLUEPRINT.md, handoff-ethandojo/indie-builders/engine-movement-video-*, **nfl-analytics-reverse-engineering.md (1.45M — largest file on the bus)**, sewer-dive-*, gse-intelligence-program-2026-10-02.md, gse-intelligence-nightly-2026-10-02.md, tnf-intelligence-program-2026-10-01.md, TASK-local-inventory-2026-09-26.md. inbox/from-hermes (6): RESCUE-2026-09-26-1…6. outbox/from-motif (10) + outbox/from-opencode (2): QC replies.

---

## §5. Sweep disagreement log (for the record)

| # | Disagreement | A | B | Resolution |
|---|---|---|---|---|
| 1 | gse-intelligence-build real files | 269 | 264 | **~267.** Per-module counts differ on generated files (__pycache__/.pyc boundary). B's per-file listing is the record; treat module counts as ±5. |
| 2 | agent-bus from-motif files | 61 | 59 | **59–61.** Likely files added between sweeps or dotfile counting. Recount before citing. |
| 3 | extra-dirs size | ~9.3G | ~5.5G | B missed `build/` (1.4G video). **True figure ~7–9G.** Neither sweep is exact to the GB; du methodology differs. |
| 4 | motif/* branch count | ~37 | 35 | **35–37.** Listing pagination; recount from the API before citing. |
| 5 | "2,996 markdown files" (my earlier claim) vs 3,894 | — | — | 2,996 was markdown-only; 3,894 is all files. Both true, different denominators. Cite the denominator. |

**Net:** zero substantive disagreements. Both sweeps independently found the extra top-level dirs, the venv inflation, the branch sprawl, the stub JSONs, and the moved branch HEAD. The inventory is reconciled.

---

## §7. Gap + Leverage Audit (reconciled, 2026-10-02 ~12:15 CT)

**Method:** two auditors ran the identical brief independently over §1–§6, spot-checking their five highest-stakes claims each against the filesystem/GitHub/HF APIs. 33 + 34 findings; reconciled below as a deduplicated union, ranked by impact (engine accuracy > revenue > completeness). Every finding: what, why it matters, one-sentence next action.

### OVERTURNED — the field report was wrong, I verified it myself

**The "missing" seed CSVs exist on this VM.** `~/workspace/coaching-tendencies/data/` holds `coach_offense.csv`, `coach_defense.csv`, `off_tendencies.csv` (160 rows = 32×5 ✓), `def_tendencies.csv`, built 2026-10-01 22:05 from real nflverse parquet (2022–2026 parquets present) by committed scripts (`code/compute_tendencies.py`, `code/coach_tenures.py`), with an honest `DATA_GAPS.md` and six coach profiles. The 2026 CLE Monken HC row (164 plays) the 10 failing tests pin is present; `profiles/monken.md` carries the YoY table. The field report's "full-disk search found zero copies" searched the wrong machine — Hermes' Windows box, not this VM. **Next:** diff these CSVs against the 10 tests' pinned 1e-6 expectations and land the files on the branch. (Whether the 1e-6 YoY delta reproduces exactly is unverified — the diff decides.)

### MISSING — should exist but doesn't

1. **OL provider never built.** Spec exists (`RECONCILED-SOURCES-2026-10-02.md`: `get_ol_status`/`get_ol_starters`, `DataGapError` on unpublished weeks); no implementing module; on-branch e2e pins T1 INVALID because `offensive_line` is UNCHECKED. The single blocking gap between PARTIAL and a real pick. **Next:** implement per the reconciled spec (nflverse injuries+depth_charts; Alexandria only for live daily detail) and re-run `test_t1_real_e2e.py`.
2. **No durable 47-signal registry file.** The "0 wired / 9 ACTIVE null / 38 dark-gated" counts exist only as prose; meanwhile `api.py` calls `get_trust_signals()`, `stubs.py` stubs it, `providers.py` reports it missing — the interface fires blanks. **Next:** write the registry as a versioned file on the branch (signal, producer, wired state, gate, evidence).
3. **Artifact's underlying data files never fetched.** report.md (1,008 lines), metric catalog (1,548), sweep writeup (4,524), 170 CSVs, 14 digests, 2,204-file manifest — referenced as in-artifact downloads, none in the corpus. **Next:** extract into `docs/research/2026-10-02/` and diff the manifest against the repo tree.
4. **Clean-state full-suite rerun at HEAD `b3e15f21` never done.** "6,472 passed" ran at `f5a83452e` (other branch), "770/770" at `d255965` (old HEAD). Every green claim is stale. **Next:** full suite from a clean checkout at current HEAD; record command, count, duration, logs, CI.
5. **165 arXiv papers owed + REJECT replacements with no queue; 1,115 local fulltexts not joined to the 585/750 tracker.** **Next:** join fulltext IDs against the audit tracker — the missing 165 may already be on disk unread.
6. **Hermes second-wave outputs never landed.** `inbox/from-hermes` last wrote 2026-09-26. **Next:** land the wave on the bus or a branch, then append here.
7. **No corpus processing receipts.** 3,894 + 3,736 files exist; no per-file processed/claimed/implemented ledger. **Next:** generate the manifest before any further coverage claim.
8. **No claim-matrix tooling.** The demanded research→claim→code→invocation→test→real-data matrix has no enforcing template. **Next:** build it as a required handoff gate.
9. **No cross-boundary Tier 1↔Tier 3 test.** "No test carries a fact across the GitHub/HF boundary because it isn't wired" — the four-tier architecture is a diagram, not a system. **Next:** define the first Tier 1→Tier 3 contract and the test that carries it.
10. **Week 5 injury pull empty (1,160 bytes, 5 credits burned); no live-pull gate.** **Next:** gate live pulls on publication (likely Friday evenings); re-pull Week 5 when published.
11. **2022–2025 play-by-play parquets are local-only inputs.** Manifest has URLs+hashes; the tau fit can't be reproduced without re-downloading 4 seasons. **Next:** commit the parquets or pin them in a versioned dataset repo.

### UNDER-LEVERAGED — exists but not used, wired, merged, or ingested

1. **`tau_hat.csv` has no consumer.** 1,523 cells, +6.77pp held-out, manifest-pinned — and "Tier 2 to Tier 1: no consumer, and that is the constraint." The biggest measured edge in the program isn't on any prediction path; it's also absent from the local checkout (branch-only). **Next:** wire the served table into the reasoning context (the P1 audit finding) and prove one pick changes.
2. **Signal registry fires blanks** (see MISSING #2) — interface wired, zero producers serving.
3. **11 HF Spaces live, zero on any production path.** MiMo 9B and Qwen 72B serve chat demos; `scoring.ts` calls neither; the reasoning lane has no LLM backend. **Next:** put mimo-brain-engine behind the L4 specialist contract or pause the GPU Spaces.
4. **35–37 motif/* branches, no integration plan.** CV pipelines, film pilots, watch loops, orchestration v2–v4 — whole Oct-1 lanes going stale unmerged. **Next:** triage all 91 matched branches (merge / rebase-keep / close) in one session, decisions recorded.
5. **Discovery lane (6.1G) disconnected from the engine.** t10-conformal, t9-causalforest, symbolic-regression pipeline, `duel.py`/`permutation.py`/`bh.py` harness — none referenced by the Oct build; `trust/enbpi.py` has no visible link to t10-conformal. **Next:** triage each phase6 track (adopt / rebuild / archive) in one doc.
6. **props-consensus (5,373 files) + creator-intel (6,805) + ~100 ig-post JSONs feed nothing.** Props is shadow-only; creator intel is a standing lane. **Next:** point one engine consumer at props-consensus (even shadow) and file one intake report from creator-intel.
7. **qb-behavioral-profiles/ vs qb-behavior/ — no canonical.** 8 QB profiles + gen scripts beside the 59-file module, relationship undocumented. **Next:** declare one canonical, diff once, archive the loser.
8. **Artifact's 9 reverse-engineered systems + 3 feature kernels have no engine counterpart.** Market-strength→prop priors, EPA/WPA facet decomposition, shell-mix receiver opportunity — copy-ready, unassigned. (The 1.45M bus md is also unextracted.) **Next:** ticket each kernel to an engine module.
9. **Agent-bus handoffs unactioned.** 59–61 files in `inbox/from-motif`, no actioned/ignored ledger — including `TASK-local-inventory-2026-09-26.md`, a prior inventory of unknown fate. **Next:** add an actioned ledger and process the backlog.
10. **edge-sheet is a one-game demo.** Verified: "17,112 files" = 2 venvs + ~10 real files; output is Bills-Lions PNGs. **Next:** parameterize by game/week and schedule, or delete as a dead demo.

### UNDERVALUED — works, but value unrecognized, unmeasured, or unprotected

1. **The honest-refusal pattern.** `INVALID/L1/UNCHECKED` probes, "honest refusal, not a kill," `DATA_GAPS.md`'s proxy-vs-metric discipline, the REFUSALS section (no manufactured rows, discarded contaminated 13.5pp fit). **Next:** codify the refusal taxonomy as the engine's abstention spec; connect to `trust/abstention.py`.
2. **The manifest provenance pattern.** `tau_hat.manifest.json` (URL + SHA-256 + fallback mix) is the only real data-lineage pattern in the program. **Next:** make it mandatory for every committed dataset.
3. **Held-out discipline.** Discarding the contaminated 13.5pp fit and keeping the +6.77pp held-out is the most trust-producing decision in the program. **Next:** name it in the calibration doctrine — contaminated fits are discarded, never averaged.
4. **The 4-state evidence taxonomy** (Free rows / Open schema / Key required / Private mechanics). **Next:** adopt as the required label on every new data-source PR; put the doctrine in the repo's AGENTS.md.
5. **The paired-audit method** (GLM + Qwen → reconciliation) — the only QC process that caught real P1s. **Next:** make paired adversarial audits with reconciliation a required gate before any "done."
6. **`DATA_GAPS.md`** — documents exactly what nflverse can't provide, stopping the next agent from faking those signals. **Next:** link from the coaching README as required reading.
7. **Operational docs stranded on a feature branch** (`HF_AUDIT.md`, `DISK_CLEANUP.md`, `FOUR_TIERS.md`). **Next:** merge the docs to main independent of the code PRs.
8. **The Monken profile set** — coach profiles with YoY tables, tenure attribution, stated limits. **Next:** use as the template for all 32 teams' playcallers.
9. **Uncurated hoards** — sports-merge/data (450M), gse-lab/whalelay, coaching-tendencies (82M). **Next:** one pass to label each keep/curate/delete.

### NEEDS IMPROVEMENT — weak, stale, misleading, or rotting

1. **PR #1002: non-draft, unmergeable, checks failing** (verified: mergeable=false, Vercel failed, Codacy action_required, head 6b8296791). **Next:** fix conflicts and checks, or close it — this week. (#1012 is draft but mergeable.)
2. **Stub data counted as done.** 2-byte JSONs in `hf-survey-raw/`; `injury-week5.json` billed 5 credits for 1,160 bytes. **Next:** re-pull for real; add non-empty validation to pull scripts.
3. **tau 2026 cells pool in-season weeks — not pre-kickoff clean.** The +6.77pp number belongs to a different fit. **Next:** rebuild walk-forward or stamp every consumer surface "point fit — not pre-kickoff."
4. **Old hand-built T1 test still in the suite** (`test_reasoning_trace_e2e.py::TestT1PressureFunnelRejected`) next to the verified-real `test_t1_real_e2e.py` — it passes on fixtures and real data alike, so it can't distinguish a working funnel from nothing checked. **Next:** delete or re-mark as adversary unit test.
5. **Registry gate silently refuses real signals** (homeSign unset on all production definitions; 9 ACTIVE evaluators return null). Worse than unwired — it looks operational while refusing everything. **Next:** set homeSign or flip the nine to explicit DISABLED.
6. **Local checkout is stale** (missing tau_hat.csv, test_t1_real_e2e.py — branch-only files). **Next:** re-sync to `b3e15f21` or stop testing from it.
7. **Prompt still overclaims** ("corpus processed twice"). **Next:** replace with the §1 honest ledger before the next run.
8. **Raw-count theater persists.** **Next:** ban `find|wc -l` in status reports; real-files-only.
9. **Reconciled P1 audit findings unfixed** (target_hhi 0.0, swallowed DataGapError, CLEAR-on-missing-evidence, τ̂ not in reasoning context, pipeline.py divergence). **Next:** fix P1s before polish, per the standing order.
10. **`sports-merge/` (2G) purpose undocumented.** **Next:** document or delete.
11. **629 branches, no lifecycle rule.** **Next:** merge/archive rule after lane closes.
12. **One-directional agent bus** — Hermes never writes back. **Next:** require completion reports on the bus.
13. **Discovery disk bloat** (848M venv + 17K .pyc from 9/13). **Next:** strip generated artifacts after the U-5 triage.

### Auditor disagreement log

| # | A said | B said | Adjudication |
|---|---|---|---|
| 1 | Seed CSVs EXIST on this VM | Seed CSVs missing (citing field report) | **A wins — verified by parent.** Files present, real parquet-built, 2026 CLE Monken row present. B trusted the field report; the report's search ran on the wrong machine. Caveat: 1e-6 test precision still needs the diff. |
| 2 | Registry counts are prose-only (no file) | Interface wired, producers stubbed (47-count from report, caveated) | **Both right, complementary.** No registry file exists AND the interface fires blanks. Two findings, one fix. |
| 3 | edge-sheet "17,112 files" | edge-sheet 11 real entries | **Agree** — both verified venv inflation independently. |
| 4 | PR #1002 DIRTY | PR #1002 mergeable=false, non-draft | **Agree** — B's API check is the fresher evidence. |

**Net:** 44 reconciled findings, 1 substantive disagreement, resolved by direct verification. The auditors' top-3 lists overlapped on the OL provider, the registry, and tau — those three are the audit's consensus priorities.

---

## §6. Watchlist — things that must not fall through the cracks

- [x] Reconciled dual-sweep inventory — DONE 2026-10-02 ~12:10 CT (§4/§5). Zero substantive disagreements.
- [ ] Hermes second-wave outputs (night of 2026-10-01/02) — land on agent-bus or branch, then append here.
- [ ] "Corpus processed twice" language in overnight prompt — replace with honest accounting (owed before delivery).
- [x] Gap + leverage audit complete (2026-10-02 ~12:15 CT) — 44 reconciled findings in §7; consensus top 3: OL provider, signal registry, tau consumer.
- [x] Seed-CSV "missing" claim REFUTED — files exist at `~/workspace/coaching-tendencies/data/` (2026 CLE Monken row present). Diff against the 10 tests' pinned 1e-6 expectations and land on the branch.
- [ ] Implement OL provider (`get_ol_status`/`get_ol_starters`) per the reconciled spec; re-run `test_t1_real_e2e.py`.
- [ ] Write the 47-signal registry as a versioned file; first real producer; one end-to-end fired-signal test.
- [ ] Clean-state full-suite rerun at HEAD `b3e15f21` (all green claims currently stale).
- [ ] PR #1002: fix conflicts/checks or close (non-draft, unmergeable, Vercel failed).
- [ ] tau_hat 2026 cells: rebuild walk-forward or stamp "point fit — not pre-kickoff."
- [ ] Fetch the artifact's underlying data files into the corpus (report, catalog, 170 CSVs, 14 digests, manifest).
- [ ] Join the 1,115 local arXiv fulltexts against the 585/750 tracker (find the missing 165).
- [ ] Hermes second-wave outputs: land on the bus or a branch.
- [ ] Corpus processing receipts ledger; claim-matrix handoff template.
- [ ] Replace "corpus processed twice" language in the overnight prompt with the §1 honest ledger.
- [ ] 47-signal registry: 0 wired — wiring is the engine work per §2 §13.
- [ ] Artifact's 2,204-file manifest vs current repo tree — diff owed.
- [ ] Artifact's underlying data files (report.md, catalog, 170 CSVs, 14 digests) — fetch into corpus?
- [ ] PR #1012 (intelligence) and PR #1002 — both unmerged; merge states recorded in §2.
- [ ] Weather mission — added to overnight prompt backlog 2026-10-02.
- [ ] GSE agent skill sketch — `~/workspace/your_files/gse-agent-skill-sketch.md`.
- [ ] **NEW:** the 40+ extra top-level dirs were invisible to every prior accounting — the coding agent's corpus brief must point at §4's table, not just the 9 listed roots.
- [ ] **NEW:** branch HEAD moved (d255965 → b3e15f21) after the "final" handoff — re-verify clean-state tests at the new HEAD before any green claim.
- [ ] **NEW:** 2-byte stub JSONs in hf-survey-raw/ and the empty injury-week5.json — exclude from completion counts; the surveys need real re-pulls.

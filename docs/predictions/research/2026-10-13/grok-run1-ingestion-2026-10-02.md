# Grok Heavy Run 1 — Full Ingestion (2026-10-02)

*Prompt 1 from GROK-HEAVY-PROMPTS-2026-10-02.md. Prerequisite verified: 5,102 blobs (3,728 + 1,374), main HEAD 9b74d361.*

**Honesty note:** This was NOT a full read of 5,102 files. GitHub rate-limited the contents API after the tree counts landed. Actually opened: RECONCILIATION-NOTES.md, existing-research-map.md, c04-status.md, maps/c01-map.md, maps/c05-map.md, and the four phase2 search notes (bayes, calibration, causal, market). Unread: the other slice maps (c02–c03, c06–c10), the 3,457 briefs, the 1,115 arxiv fulltext extracts, scored_batch jsonl, and waves/. Nothing below is invented from those unread files.

## Phase 1 — Map

| Tree | Blobs | What it is |
|---|---|---|
| research/corpus-intelligence | 3,728 | Briefs of the Sports docs corpus. Top level: briefs/ (3,457), chunks/ (130), deep/ (89), handoff/ (32), maps/ (11), intake/ (7), plus c04-status.md and c09-filelist.txt |
| research/arxiv-sweep | 1,374 | fulltext/ 1,115, waves/ 88, phase2-assignments/ 49, wave-assignments/ 27, reader18-fullreads/ 4, root 91 (batch and scored jsonl, phase2 notes, raw topic dumps, fetch scripts) |
| Total | 5,102 | Matches the brief |

Corpus slices are mod-10 partitions of Sports docs. c01 is 299/299 briefed (2026-10-02). c04 is 300/300 briefed. c05 is 300/300 briefed. The other seven maps were not opened.

**Duplicates** (filename-level only): three txt+pdf pairs: 2002.12860, 2004.14108, 2609.10615. Extract once. 1704.00197 is cross-referenced in existing-research-map, the exclusion list, the manifest, screened_batch_1, and corpus briefs — content pointers, not two fulltext files. 2603.09896 returned zero hits under that id string in research/; the known triple is not present as files. RECONCILIATION-NOTES (2026-09-21) says existing-research-map holds 64 unique arXiv IDs, 42 of them already inside the 865-paper sweep and correctly excluded from manifest-500.

**Already absorbed, do not re-extract:** existing-research-map lists 64 unique arXiv IDs already read into Sports. Repo seven: 1802.00998 (nflWAR), 2409.04889 (EP critique), 2309.00756 (4th-down MDP), 2305.10262 (STRAIN), 2210.16315 (grouping loss), 1211.4000 (betting-line performance), 2408.10867 (bye week vanished post-2011 CBA). Drive set includes 1704.00197 (iWinRNFL) — do not re-litigate it; it is an in-game logistic, not the least-squares rating model.

**Phase-2 candidate pools** (from search notes, not full reads): calibration 149 kept of 2,800 raw; bayes 171; causal/weather/LLM 159; market/sizing/abstention 135.

**Sports state** (from prompt, not re-verified): #1020 merged (no MODEL_VERSION change), #1018 open (OL deadline + GSI), #1019 open (DARK evaluators, tsc fail), #1016 open (trueProb quarantine), #860 open (C5 edge-rank bake-off, no C6). Signal registry: 47 signals, 46 no / 1 partial, T1 partial, props the open frontier. Do not rebuild bridge-model.ts (Brier 0.2237 vs spread-bucket 0.2120 on 285 sealed 2025 games).

## Phase 2 — Extract (opened documents only)

- **existing-research-map.md**: coverage map so the sweep does not redo Sports. 468 Sports research files through 2026-09-21, plus 64 arXiv IDs. Efficiency core, luck layer, calibration stack (CQR, grouping loss, temperature/Platt/isotonic, Venn-Abers, Clopper-Pearson), and market microstructure already inventoried. GSE relevance: HIGH as skip-list, LOW as new edge.
- **RECONCILIATION-NOTES.md**: id reconciliation. 64 unique IDs, 42 excluded from manifest-500, 97-paper reserve, phantom-completion bug fixed. No metrics. Relevance: NONE as signal, HIGH as process.
- **phase2-search-notes-calibration.md**: 14 arXiv queries, 149 candidates. Standouts: 1908.08980 (football RPS critique), 2102.00968 (CRPS learning), conformal/CQR and selective regression for abstention, margin-of-victory Elo, Bradley-Terry extensions, PageRank strength-of-schedule. Glicko/TrueSkill thin on arXiv. Relevance: HIGH for abstention/scoring-rule choice, MEDIUM for rating variants.
- **phase2-search-notes-bayes.md**: 18 queries, score cutoff 6.5, 171 candidates. Mix: Poisson/xG 44, tracking 28, hierarchical Bayes 27, fantasy 24, props 21, Elo/TrueSkill 7, GP team strength 4. Named IDs: 1305.1998, 1508.02171, 1612.06454, 1912.10417. No NFL out-of-sample metric. Relevance: MEDIUM as queue, not build.
- **phase2-search-notes-causal.md**: 21 queries, 159 candidates (injury/workload, DiD/synthetic control/double ML, weather, LLM/NLP injury-report parsing). No effect size stated. Relevance: MEDIUM as queue for weather/absence; NONE until a fulltext states an NFL coefficient.
- **phase2-search-notes-market.md**: 24 queries, 135 candidates (closing line, de-vig, Kelly, ensembles, abstention). No NFL metric in portion read. Relevance: HIGH for abstention framing, LOW for Kelly (already standard).

**c01-map.md** (299 briefs, not the briefs themselves) — actionable claims attributed to source files:
- Pressure-to-sack is a QB trait vs ~18% league baseline; use <2.5s quick-pressure split (sweep-2026-09-21.md). Contradicts metric-stack veto of pressure→sack R² < 0.005, resolved as team-level vs QB-level.
- Per-QB EPA/dropback keyed by passer_player_id, snap-share anti-leakage: log loss 0.633 → 0.625, AUC 0.690 → 0.700 (handoff-indie-builders-v2-fullspec-2026-09-25.md).
- Opponent-adjusted EPA residual: 80 pass-att / 40 carry shrinkage, 55/15/15/10/5 recency (competitive-intel-intake-2026-09-26.md).
- Pitts TPRR 0.18 → 0.28 without London, as absence template (dfs full-tables README 2026-09-25).
- Receiver-conditional TD: P(TD) = Σ P(TD|target) P(target), gate ≥5% holdout log-loss (arxiv-deep/0912).
- Brier 0.247 vs 0.22 threshold (LEVERAGE_STATUS.md).
- Passing correlations 0.53–0.61 vs rushing 0.13–0.19. ARBY 65/35 and Baldwin 40/40/20 flagged as competitor formulas, not lab inventory.
- Suppress per-QB uncertainty bands; they miscalibrate (half-life-and-band-calibration.md).
- QB-change provenance queued, not built. Staleness gate wired, isPublished has no provenance column.
- Minerva suite: DSR, PBO over S=16, SPA, Seal ≥ 80. OpenSkill vs house Elo only if within 0.002 log-loss.

**c05-map.md** (300 briefs) — claims attributed:
- De-vigged closing moneylines, 5,281 NFL games 2006–2025: pooled Brier 0.2106 (CI 0.2050–0.2172), adaptive ECE 0.0126; isotonic/Platt/beta beat identity by ≤0.0005. Leaf: 6.5–9.5 pt favorites drifted 65.86% → 57.12% train to test (n=576) (MARKET_CALIBRATION_2026-09-04.md).
- Share-core: masked Dirichlet-multinomial + Beta-Binomial mixture, closed form E[N]·s_i (CARDS_SHARE_CORE_WIRING.md).
- FTN charting inside nflverse (CC-BY-SA 4.0): pressure_pct, cpoe, adot, succ. License: learn and attribute, do not copy wholesale.
- Coverage-responsibility transformer, ledger 0489: 0.894 accuracy vs 0.764 nearest-defender heuristic. Tracking required. Not wired.
- Soft-Elo in Bradley-Terry, ledger 0540: held-out Elo MAE 45.9 → 17.9, conformal intervals narrowed 39–70%. Sport/sample not stated.
- Conformal risk control, ledger 0743: λ̂ guarantees expected posted-pick loss ≤ α; validated 0.0987 vs α=0.1 over 1,000 trials. Domain not stated as NFL.
- Signal-ledger scale-fit: between-player vs within-player correlation gap 4×–68×.
- Mean-APY-gap trench feature cleared |r|≥0.08 on 2025 holdout, verdict STORED, g=0.2. Collides with open OL work.

**c04-status.md**: process only. 300/300 briefed. No method.

## Phase 3 — Synthesize

**What compounds (three stacks):**
1. Trust-target stack: absence-conditional TPRR + Dirichlet share-core + receiver-conditional TD + within-player scale-fit rule = a props model.
2. Publication gate: conformal risk control + de-vigged close calibrated (ECE 0.0126) + engine Brier gap (0.247 vs 0.22; bridge-model 0.2237 vs 0.2120). Abstain where the engine doesn't beat the close.
3. QB residual, not OL grade: pressure-to-sack at QB level with <2.5s split + per-QB EPA/dropback + opponent-adjusted EPA. Sits on top of #1018, not beside it.

**Contradictions:** pressure→sack R²<0.005 (team/season) vs QB trait (both true — don't wire team feature). Per-QB bands vs QB-profile program (intervals no, point estimates yes). Market calibrated vs "recalibrate engine" (5,281-game identity wins; moderate-favorite leaf is follow-up only). ARBY/Baldwin = mislabeled competitor formulas, don't canonize.

**Already standard:** EPA/play, success rate, garbage-time filter WP 0.95/0.05, de-vigged close as label, Platt/isotonic/temperature, Kelly mention, Elo/Bradley-Terry on hard wins, bye-week killed post-2011, grouping loss, CQR topic, nflWAR EP foundation.

## Phase 4 — Challenge (killed/demoted)

Killed: soft-Elo (sport unstated), coverage transformer (needs NGS tracking), 15-model ensemble 0.313→0.241 (not NFL game probs), Ising SGP/KellyBoost (betting-ops, not confirmed NFL), CMP-SAS (soccer totals), weather/injury causal pool (no coefficient), hierarchical log5/OpenSkill (no bake-off yet), market recalibration, bridge-model rebuild, 1704.00197. Anything colliding with open PRs (#1016, #1019, #860, #1018) is not a new recommendation. Survives only as shadow — no opened map shows shuffled-time placebo + value-beyond-close + disjoint-fold threshold on sealed 2025 games.

## Phase 5 — Build list (all shadow)

1. Selective publication gate (conformal risk control on the close) — ledger 0743, MARKET_CALIBRATION_2026-09-04.md.
2. Per-QB EPA/dropback, passer_player_id, snap-share anti-leakage — 0.633→0.625 claimed, not re-measured.
3. QB pressure-to-sack residual, <2.5s split — blocked on #1018.
4. Trust-target props stack (Dirichlet share-core, absence TPRR, TD decomposition).
5. Injury/QB-change provenance on staleness gate (isPublished has no provenance column).
6. Within-player scale-fit weighting (4×–68× gap).
7. Moderate-favorite leaf audit (65.86%→57.12%, n=576) — audit, not build.

**Explicit skips:** bridge-model rebuild, 1704.00197, market-moneyline recalibration, team pressure-to-sack, per-QB uncertainty bands, Glicko/TrueSkill, Kelly variants, #860/#1016/#1019 lanes.
**Unread:** maps c02, c03, c06–c10; all 3,457 briefs; all 1,115 fulltexts; scored_batch_1–5.jsonl; phase2-candidates-*.jsonl.

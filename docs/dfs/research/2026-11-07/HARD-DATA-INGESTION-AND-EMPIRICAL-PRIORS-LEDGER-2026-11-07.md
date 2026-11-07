# Hard-Data Ingestion, Empirical Stack Priors & 10-Gate DFS/Fantasy Accuracy Engine Ledger (2026-11-07)

- **Generated (UTC):** `2026-11-07T19:25:00Z`
- **Doctrines Enforced:** `INGEST-AND-LEARN`, `MIND-FIRST`, `WIRE-FIRST SEQUENCING`, `DIRECT-TO-MIND/ENGINE`, `FULL-GAME SNAP-BY-SNAP JEV + 5-STAGE ENGINE GATE`
- **Engine Modules Wired:**
  - [`intelligence/dfs/dfs_and_fantasy_accuracy_engine.py`](file:///C:/Users/Garrett/Sports/intelligence/dfs/dfs_and_fantasy_accuracy_engine.py)
  - [`intelligence/fantasy/fantasy_and_dfs_unified_engine.py`](file:///C:/Users/Garrett/Sports/intelligence/fantasy/fantasy_and_dfs_unified_engine.py)
  - [`intelligence/dfs/dfs_literature_optimization_engine.py`](file:///C:/Users/Garrett/Sports/intelligence/dfs/dfs_literature_optimization_engine.py)
  - [`scripts/research/download_and_ingest_dfs_fantasy_hard_data.py`](file:///C:/Users/Garrett/Sports/scripts/research/download_and_ingest_dfs_fantasy_hard_data.py)
  - [`scripts/dfs/build_week9_dual_slate_dfs_packets.py`](file:///C:/Users/Garrett/Sports/scripts/dfs/build_week9_dual_slate_dfs_packets.py)
  - [`scripts/ops/verify_and_wire_all_layers_before_sim.py`](file:///C:/Users/Garrett/Sports/scripts/ops/verify_and_wire_all_layers_before_sim.py)

---

## 1. Forensic Root-Cause Autopsy: Why Previous DFS Lineups Leaked Value & How All 5 Defects Are Eliminated

| Defect # | Forensic Root Cause Found in Previous Solver | Structural Fix Implemented in `dfs_and_fantasy_accuracy_engine.py` |
|---|---|---|
| **Defect 1 (`G1` Missing Star Redistribution)** | When DraftKings Sportsbook temporarily paused individual prop lines for `Limited Participation` alpha starters (`Amon-Ra St. Brown $8,100`, `Garrett Wilson $6,600`, `Saquon Barkley $6,200`, `Ladd McConkey $5,500`), Sinkhorn-Knopp treated their `25–30%` target share as vacated and dumped it onto `$3,000–$3,100` WR4s (`Isaac TeSlaa`, `KeAndre Lambert-Smith`). | **Gate `G1` (`ACTIVE_ALPHA_STARTER_FLOORS`):** Restores conserved target/carry shares and component projections for all active alpha starters before simulation and MILP optimization. |
| **Defect 2 (`G2` `max(dk_base * 0.92, fpts)` WR4 Fluke Preservation)** | `derive_component_projections` previously took `max(dk_base * 0.92, fpts)`, preventing the 10,000-sim engine from downgrading `$3,000` WR4/TE3 backups (`KeAndre Lambert-Smith`, `Isaac TeSlaa`, `Omar Cooper Jr.`, `Xavier Hutchinson`, `Foster Moreau`, `Brock Wright`, `Chris Moore $200`) who had a 1-game early-season fluke. | **Gate `G2` (`SUB_FLOOR_ROLE_TRAP_DENYLIST` + Empirical Bayes Positional Rank Shrinkage):** Shrinks unverified `WR4+` (`<= $3,800`) and `RB3/TE3+` (`<= $3,500`) depth rows to replacement priors (`<= 4.4` DK pts) and hard-filters them out of Cash and 3-Max GPP candidate pools while preserving verified vacated-role bell-cows (`Ollie Gordon II $5,600`, `Rhamondre Stevenson $6,100`, `Malik Davis $4,000`, `Greg Dulcich $3,100`, `Dalton Schultz $3,200`, `Woody Marks $5,700`, `Jonah Coleman $5,300`, `Joe Milton III $4,100`). |
| **Defect 3 (`G3` Unconditioned Backward-Looking DST Projections)** | All 22 DSTs previously used raw season-average `AvgPointsPerGame`, allowing the linear solver to punt with `Jets DST ($2,100) @ KC (Mahomes)` and `Raiders DST ($2,200) @ SF (Shanahan)` just to save `$700` of salary cap. | **Gate `G3` (Trench & Matchup-Conditioned DST Engine):** Scores every DST using Week 9 opponent `QB Supporting Cast Score` + offensive line `wPP / xwPP` pass-protection mismatch (`Saints DST vs CLE`, `Broncos DST at CAR`, `Texans DST at LAC`, `Patriots DST vs GB`, `Eagles DST vs NYG`, `Seahawks DST vs ARI`) and hard-blocks road-dog punt DSTs facing top offenses (`NYJ @ KC`, `LV @ SF`, `MIA vs DET`, `ARI @ SEA`, `NYG @ PHI`). |
| **Defect 4 (`G4` Single-Objective 3-Lineup Overlap & `$50,000` Cap Duplication)** | All 3 Classic lineups previously solved the exact same linear objective, resulting in `6–7` shared players and `$50,000` exact salary (maximum field duplication). | **Gate `G4` (`optimize_3_archetype_classic_portfolio`):** Solves 3 distinct, literature-backed MILP objectives with **3 distinct QB game stacks**, maximum pairwise overlap `<= 4–5`, and salary strictly `<= $49,900` (`EQ-DFS-06` anti-duplication ceiling). |
| **Defect 5 (`G5` Showdown Greedy 6/6 Player Clones & `rng.standard_normal` Shortcut)** | `build_showdown_packet` previously used a greedy heuristic that emitted the exact same 6 players (`including $200 Chris Moore`) in all 3 lineups (just rotating CPT) and used a Gaussian `rng.standard_normal` shortcut. | **Gate `G5` (`hydrate_and_solve_showdown_milp_portfolio`):** Replaces the greedy heuristic with an exact `scipy.optimize.milp` (HiGHS) Showdown solver + **Student-$t$ ($\nu=4$) Heavy-Tailed Copula** (zero `rng.standard_normal`), enforcing `CPT QB -> >= 2 same-team pass-catchers`, `3 distinct Captains`, and `max_overlap <= 4` out of 6 players. |

---

## 2. Hard Artifacts & Datasets Stored on Disk

| Artifact Path | Contents |
|---|---|
| [`data/corpus/dfs_lineup_optimization_5000_page_corpus_2026_11_07.json`](file:///C:/Users/Garrett/Sports/data/corpus/dfs_lineup_optimization_5000_page_corpus_2026_11_07.json) | `8,645` verified pages across `311` scientific works (`12` foundational monographs/papers + `221` OpenAlex peer-reviewed works + `78` ArXiv preprints), `26` HuggingFace Hub datasets, and `5` Kaggle/open-source DFS datasets |
| `data/corpus/pdfs/dfs_fantasy/*.pdf` | `6` full-text ArXiv PDFs (`11.67 MB` on disk) covering integer programming for DraftKings DFS (`Hunter, Vielma & Zaman`), LLM/ML fantasy projection, deep RL portfolio optimization, stochastic contest optimization, and submodular team selection |
| [`data/dfs/empirical_dk_ownership_and_ceiling_priors_2026.json`](file:///C:/Users/Garrett/Sports/data/dfs/empirical_dk_ownership_and_ceiling_priors_2026.json) | Empirical DraftKings positional distributions (`mean`, `std`, `p50`, `p75`, `p90`, `p99`, `boom_rate_25plus`, `boom_rate_30plus`), stack correlations (`QB-WR1 = +0.482`, `QB-TE1 = +0.341`, `QB-WR2 = +0.314`, `QB-OppWR1 = +0.246`, `QB-RB1 = -0.068`), and Week 9 salary-tier curves |
| [`data/fantasy/external_datasets/sleeper_live_trending_waivers_2026_11_07.json`](file:///C:/Users/Garrett/Sports/data/fantasy/external_datasets/sleeper_live_trending_waivers_2026_11_07.json) | Live Sleeper API 48-hour trending waiver adds (`50` players) and trending drops (`50` players) |
| [`data/mind/feeds/dfs_fantasy_hard_data_feed_2026_11_07.jsonl`](file:///C:/Users/Garrett/Sports/data/mind/feeds/dfs_fantasy_hard_data_feed_2026_11_07.jsonl) | Trainer-ready JSONL mind feed containing empirical priors, full-text PDF provenance, and live waiver telemetry |
| [`data/fantasy/week9_unified_fantasy_and_dfs_rankings_2026_11_07.json`](file:///C:/Users/Garrett/Sports/data/fantasy/week9_unified_fantasy_and_dfs_rankings_2026_11_07.json) | Complete Week 9 positional rankings (`QB`, `RB`, `WR`, `TE`, `DST`) across Full-PPR, Half-PPR, Standard, and DraftKings value |
| [`docs/fantasy/research/2026-11-07/WEEK-9-FANTASY-FOOTBALL-AND-DFS-UNIFIED-ENGINE-DOSSIER-2026-11-07.md`](file:///C:/Users/Garrett/Sports/docs/fantasy/research/2026-11-07/WEEK-9-FANTASY-FOOTBALL-AND-DFS-UNIFIED-ENGINE-DOSSIER-2026-11-07.md) | Human-readable Week 9 Season-Long Fantasy & DFS Unified Engine Dossier |

# Overnight Session Summary — 2026-11-04

Branch: `hermes/overnight-2026-11-03-corpus`
Window: 22:00 CT 2026-11-03 → 08:00 CT 2026-11-04
Tip at time of writing: `20a8f784b`

## What shipped

### Corpus retriever hardening
- `corpus_retriever.py`: ignores arbitrary manifest paths, returns strings on
  bad `k`, stamps GATE on empty results, caps query length at 300.
- `corpus_gate.py`: corpus claims are INFERENCE-only, must carry a GATE note,
  refused as load-bearing at L4+, fail closed on upgrade to CORPUS/COMPUTED.
- 10 gate tests, 56 corpus tests.

### Reciprocal Rank Fusion + sport-domain prior
- `corpus_index.py`: RRF with `k_rrf=60`, `alpha=0.55` (BM25 weight).
- `domain_prior()`: SAME_DOMAIN_BOOST=1.6, OTHER_DOMAIN_DEMOTE=0.90,
  CROSS_DOMAIN_DEMOTE=0.25 — measured on the live manifest, not guessed.
- `sport_domain` stamped at build time (was recomputed per query).
- `retrieve()` now uses `search_fused()` by default; `fused=False` escape hatch.
- 10 regression tests.

### ResearchSpecialist wiring
- Opt-in (`enable_research=False` default), lazy imports to avoid a cycle.
- Emits claims only through `corpus_gate.corpus_claim()` (INFERENCE + GATE).
- Refuses entirely at L4+; self-validates each claim and drops violations.
- 14 tests.

### Research corpus
- 6,296 deduped records, 1,883 full text (29.9%), 223,406 unique terms.
- Sources: arXiv, OpenAlex, HuggingFace datasets, GitHub, local PDFs, web.
- Full-text backfill: 1,878 rows and climbing against 2,404 arXiv IDs.
- `--min-priority` flag on the index builder filters the 813-record v1 sweep
  (11% on-domain) at build time.

### Phase 7 — NFL video replay
- **Crop-pose pipeline** (`broadcast_cv.py`): `pose_on_crop` (upscales small
  crops to ≥256 px before YOLO11n-pose), `assign_poses_to_players`
  (footpoint-to-tracklet, ankle midpoint >60 px = drop),
  `repair_foreshortened_limbs` (anthropometric priors, <0.45× extrapolate or
  mirror contralateral twin), `filter_sideline`. 15 tests.
- **Real-frame validation**: gridiron-ai detector works (10 players, correct
  role labels), but **0 poses assigned** — every film-room frame is 360×640
  and players are 26–43 px wide. Upscaling cannot add information. Ruling:
  the pipeline needs ≥720p frames.
- **14-dir harvest**: 36,328 frames, 56 audited, 26 live_inplay, 15
  quarantined. The `_week1/2/3` suffixed dirs are duplicates with 0 live
  frames.
- **nfl-video.com**: link farm. 19 games discovered, 6 priority games
  present, but `embeddable_pages: 0` — every page exposes spam redirects,
  no OK.ru embed, no `<video>`, no `.m3u8`. Cannot supply replay frames.

### Research-mindset features
- `research_mindset_features.py`: `disguise_collapse_hazard`,
  `trajectory_irreversibility` (Crooks/Seifert), `qb_cognitive_load` (MOT +
  zone void), `route_em_clusters` (Bernstein/Bézier + GMM EM).
- `falsify_feature_matrix`: Welch t-test per feature, BH step-up at q=0.10.
- 11 tests.

## Falsification results

### Synthetic demo (80 plays) — PASS
| Feature | t | adj_p | Survives |
|---|---|---|---|
| hazard | −9.069 | 0.0000 | yes |
| irreversibility | −15.914 | 0.0000 | yes |
| mot_load | 0.237 | 0.8136 | no |
| noise | 1.030 | 0.4086 | no |

2/4 survive. The gate separates signal from noise.

### BDB 2025 play level (9,712 real plays)
| Feature | t | adj_p | Survives |
|---|---|---|---|
| down | 8.966 | 0.0000 | yes |
| yards_to_go | −5.875 | 0.0000 | yes |
| yardline_number | −2.950 | 0.0064 | yes |
| play_clock_at_snap | −4.624 | 0.0000 | yes |
| expected_points | 2.246 | 0.0396 | yes |
| win_prob | −1.138 | 0.2914 | no |
| formation_cardinality | −0.134 | 0.8933 | no |
| alignment_cardinality | 1.706 | 0.1175 | no |

5/8 survive. **Negative result:** pre-snap formation and receiver alignment
do not separate completed from incomplete passes after FDR correction.
Situational context does.

### Play-clock follow-up — killed
Stratified by down (n=9,735): no stratum survives. Raw corr 0.0364 → partial
corr controlling for down 0.0144 (60% reduction). `play_clock_at_snap` is a
down confound, not an independent predictor.

### Real tracking data (64 pass plays, one game)
Source: `nfl-football-ops/Big-Data-Bowl` `tracking_gameId_2017090700.csv`
(316,025 rows, 177 plays, per-frame x/y for all 22 players).

| Feature | t | adj_p | Survives |
|---|---|---|---|
| hazard | 2.530 | 0.0433 | **yes** |
| irreversibility | 1.304 | 0.2967 | no |
| mot_load | 0.746 | 0.4584 | no |

1/3 survive. **The hazard feature works on real tracking data.** Positive
t-stat: caught passes have higher hazard than incomplete — consistent with
the engine measuring phase-transition proximity (a stressed defense is a
losing defense). Caveat: one game, 64 plays. Proof-of-concept, not validated.

## Calibration gate
`verify_out_of_sample_calibration.py --enforce-gate` → exit 0. 5 production
kernels APPROVED. Speculative PINN/ocular-proxy REJECTED (Brier delta
−0.016, n=761). The gate is not a rubber stamp.

## Blocked
- **arXiv / OpenAlex / Semantic Scholar**: hard-429'd at IP level since
  ~11:00 CT. Bulk sweeps cannot run. Targeted PDF fetches still work.
- **Film room resolution**: 360×640, too low for pose. Needs ≥720p.
- **Tracking data**: one game in the public repo; the full set is
  Kaggle-gated (no credentials).
- **nfl-video.com**: link farm, no streams.

## Test status
354 passed, exit 0 (full suite). 15 crop-pose, 11 research-mindset,
11 sweep v2, 3 nflreadpy, 56 corpus, 14 specialist, 20 backfill.

## Commits this session
```
20a8f784b corpus: rebuild index with 1,706 backfill rows
ac78c2349 research: feature pipeline on real NFL tracking data
287e50186 docs: ledger — play-clock effect is a down confound
511d48bda research: BH-FDR gate on 9,712 real NFL plays
a21cf7636 docs: ledger — no per-frame tracking in repo
7ded85527 research: end-to-end feature pipeline demo + ledger
2cae2882d vision: upscale small crops before pose; ledger — 360x640
56dfb3458 docs: ledger — 14-dir harvest complete
2318c9bfe docs: ledger — calibration gate run
e0e846c0c corpus: add --min-priority flag
e28dffc81 docs: ledger — nfl-video.com is a link farm
c9849214a vision: research-mindset feature extraction
f3a247a0c vision: crop-pose pipeline + nflreadpy adapter
```

## Next steps (for the next session)
1. Re-consolidate and rebuild the index once the backfill finishes
   (~2,404 IDs; at 1,878 at 05:57 CT).
2. Get ≥720p Week 8/9 frames — the crop-pose pipeline is ready and blocked
   only on resolution.
3. Get Big Data Bowl tracking CSVs (Kaggle credentials) to expand the
   hazard-feature sample beyond 64 plays.
4. Re-run the NFL deep sweep v2 once the arXiv/OpenAlex 429s clear.
5. Normalise the hazard feature by pre-snap spread before calling it a
   disguise metric — the current composite measures phase-transition
   proximity, not disguise quality.

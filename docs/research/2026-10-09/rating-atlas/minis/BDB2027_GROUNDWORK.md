# BDB 2027 GROUNDWORK — Combine Movement → NFL Performance (compiled 2026-10-10)
_Verified live from kaggle.com/competitions/nfl-big-data-bowl-2027. $100K total. Deadline Jan 6, 2027 11:59pm UTC. 148 teams already in._

## 1. The spec (verbatim-verified)
- **Data**: 10 Hz Combine sensor tracking + regular-season NFL game tracking (NGS). Not stopwatch tables — full trajectories.
- **Required**: public Kaggle notebook; ≤2,000 words; <10 tables/figures; PASS/FAIL gate = "writeup explicitly links Combine tracking to regular-season performance." No tracking = not scored.
- **Scoring**: Football 30% (usable week-to-week by teams? handles football complexity? novel) · Data Science 30% (correct, appropriate models, innovative) · Writeup 20% · Visualization 20%.
- **Judges**: analytics staffers from all 32 teams + tracking vendors (Tom Bliss, NFL DS, on panel).
- **NFL's own advice**: go NARROW — one drill, one position group, one movement trait.
- Tracks: Open $45K + University $45K (undergrad-only) + Grand Prize $10K at the 2027 Scouting Combine (finalists present).

## 2. Where CV actually fits (and where it doesn't) — the honest map
- The core signal is **sensor kinematics, not pixels**. You can win without CV. BUT computer vision is the *unclaimed moat layer* in three places:
  1. **Pose estimation on public combine video** (MediaPipe BlazePose 33-keypoint on drill clips from NFL.com/YouTube): joint angles, arm-drive amplitude, trunk lean, ground-contact timing, stance type (3-pt vs 2-pt) — things 10Hz hip-tag tracking cannot see. Join to tracking rows by (player, drill, event). Run on one drill subset (feasible join).
  2. **Frame-derived stratification**: auto-detect start stance / surface / run-up length → fair kinematic comparisons (removes a known confound scouts argue about).
  3. **Game-film CV** = STRETCH, not core (no public play-synced video; mark as future work in the writeup).
- Compute lane: pose models + NNs do NOT run on iSH (musl/aarch64, no GPU) → Colab free tier / the PC port / the heavy coding agent. iSH lane = data prep, kinematic feature code (stdlib), viz prototypes (matplotlib), the EPA scoring harness.

## 3. Candidate angles, ranked by win probability (Football-score first)
1. **Deceleration → re-acceleration asymmetry index (WR/CB, route drills)** — "decel into breaks, accel out of cuts" is comp example #1; clean 10Hz math (jerk sign flips, speed valley depth, re-accel slope); direct football story (separation); our EPA/WPAR harness scores it against real rookie separation/production. **Lead candidate.**
2. **COD-efficiency index** (3-cone + short shuttle): curvature-normalized speed retention — isolates change-of-direction talent from straight-line speed. Stopwatches can't see this; tracking can.
3. **First-step burst latency for trenches** (stance→peak-acceleration onset): comp example #2; pass-rush/run-block linkage.
4. **Drill-translation x-ray**: sensor metric vs stopwatch per drill — "where tracking adds context" (example #3). Safest, likely crowded.
5. **Mechanics → rookie EPA full chain** (example #4): our unfair advantage — the existing stack IS the NFL-side harness (EPA r=0.980, walk-forward doctrine, DK σ distributions for prop-style validation).
- The pitch shape that wins BDBs: one named metric + rigorous validation + scout-usable outputs (a 1-page "development protocol" per position) + beautiful viz. 2,000 words max = narrow wins.

## 4. Feature canon (10 Hz trajectory, drill-agnostic starters)
- Speed curve: v(t), a(t), jerk(t); top speed; time-to-90%-top-speed; split asymmetry (first vs second half)
- Decel: max decel (g), decel duration, speed-valley depth at direction change, re-accel slope out
- COD: curvature κ(t) via heading angle rate; speed retention through turn = v_exit/v_approach; COD arc radius
- Rhythm/planarity: lateral oscillation frequency (false-step detector); path efficiency (arc/chord ratio)
- Symmetry: left-vs-right turn performance deltas; start-side bias
- Pose layer (CV, video join): hip drop angle, trunk lean θ, knee flexion at plant, arm-drive amplitude, GCT (ground-contact time from frame deltas)
- NFL-side targets: rookie EPA/play, separation proxy (NGS), snap share, role-adjusted production, DK μ̂ vs actual (our σ table as the uncertainty yardstick)

## 5. Validation doctrine (Data-science 30% + our house rules)
- Walk-forward by draft class; never validate on the same class you fit features on
- Control for: draft capital, college production, position, age (birthday/RAE covariate — ties into the cognitive sprint!), combine invite selection bias (hierarchical shrinkage)
- Report effect sizes + CIs; kill weak signals ourselves before judges do (GSE doctrine: one invented number is sabotage)
- Reproducibility: notebook + seeded RNG + stdlib-friendly fallbacks

## 6. Timeline (backwards from Jan 6, 2027)
- **Now → Nov**: cognitive/context sprint continues; watch for data release; prep kinematic feature library (works the day data drops); EPA harness refresh on 2026 season
- **Dec**: data EDA (day 1), pick THE angle (decide by Dec 10), pose-estimation pipeline on Colab for the chosen drill subset
- **Jan 1-6**: writeup (≤2,000 words!), viz polish (20% of score = invest), notebook freeze, submit ≥48h early
- If University track eligibility ever applies, it's a separate $45K pool — but Open track is our lane

## 7. What runs where (device reality)
| Task | iSH (tonight) | Colab/PC |
|---|---|---|
| Kinematic feature library (10Hz) | ✅ stdlib + numpy-lite | ✅ |
| EPA/production joins, validation | ✅ (data re-download first) | ✅ |
| Pose estimation on video | ❌ | ✅ MediaPipe/MoveNet |
| Trajectory sequence models (TCN/GRU) | ❌ | ✅ |
| Viz prototypes | ✅ matplotlib | ✅ polish |

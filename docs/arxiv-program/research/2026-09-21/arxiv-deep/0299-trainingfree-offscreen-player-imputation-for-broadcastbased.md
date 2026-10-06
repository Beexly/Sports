# [0299] Training-Free Off-Screen Player Imputation for Broadcast-Based Spatial Football Analytics (arXiv:2607.11548)

**Citation:** Seongjin Choi (2026). *Training-Free Off-Screen Player Imputation for Broadcast-Based Spatial Football Analytics*. arXiv:2607.11548v1. URL: https://arxiv.org/abs/2607.11548
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1,351 lines).
**Verdict:** ADAPT — port the B4 role-anchored centroid voting method and the simulated-viewport benchmark protocol into any GSE broadcast-tracking work (NGS-replacement lane); reject the soccer pitch-control application itself.

## 1. Research question
Spatial football metrics (pitch control, space value) assume all 22 players' positions, but broadcast main cameras show only 10–16 of 22 at a time. How large is the resulting distortion in team-level metrics, and can a ladder of training-free, online, causal imputation baselines — using only observations from the current match, no offline training, no future data — recover the hidden players well enough to fix the decision-relevant metrics? (Abstract; Sec. 1)

## 2. Dataset / schema
- **Metrica Sports open sample tracking data** [8] (https://github.com/metrica-sports/sample-data): three matches, all 22 players + ball at 25 fps. Games 1–2 ship as full-match CSVs; game 3 in EPTS-FIFA format covering one half. First 45 minutes of each used, evaluated at 5 fps; player samples with missing coordinates dropped (frames kept).
- **Simulated broadcast viewport:** virtual main camera pans horizontally following an exponentially smoothed ball position (α = 0.06 per frame at 25 fps, mimicking broadcast pan lag); visible region is a width-W window spanning full pitch height. Sensitivity over W ∈ {36, 44, 52, 60} m. At W = 44 m the viewport shows 14.6–15.0 players on average (games 1–3), consistent with the author's real broadcast clips (10–16 visible) and 12.8 ± 3.7 in the Graph Imputer paper [10].
- **Held-out discipline:** games 1–2 used for method/hyperparameter development; game 3 — plus ablation variants B3E/B3V/B5 — specified and frozen before game 3 was first evaluated, so game 3 is a held-out check (paper states the interpretive text was written after seeing all results).
- **Access:** public (Metrica sample data).

## 3. Method / model
Ladder of causal imputation policies (all per team; no future observations; CPU real-time). V_t = visible players at t; p_i(t) position; off_i(t) running role offset (displacement from team centroid):
- **B0 — ignore:** hidden players absent from the metric (visible-only baseline implied whenever a video GSR pipeline adds no imputation layer).
- **B1 — last-seen with decay:** p̂_j = w·p_j^last + (1−w)·p̄_V, w = e^{−Δt/τ}, τ = 8 s — hold last observed position, decay toward visible-team mean.
- **B2 — formation anchor:** while player i visible, store off_i = p_i − p̄_V (offset from the *visible-team* centroid — inherits viewport bias, which B4 removes); when hidden, place at current visible centroid + stored offset.
- **B5 — fixed formation template:** as B2 but offset = cumulative mean over all of player i's visible frames so far (closest online analogue of a static role template).
- **B3 — B2 + EMA offsets + velocity extrapolation:** exponentially averaged offsets (stored relative to B4's voted centroid when available, applied at the plain visible centroid) + constant-velocity extrapolation for recently hidden players blended into the anchor with weight e^{−Δt/1.5s}. Decomposed in ablation as B3E (EMA only) and B3V (velocity only).
- **B4 — role-anchored centroid voting:** attenuates the viewport subset bias of the visible centroid by voting — each visible player proposes the full-team centroid as its position minus its role offset; offsets are EMA-updated (EMA weight 0.1 per 5 fps step) against the voted centroid (self-consistent bootstrap; seeded from visible mean until three offset-bearing players exist; thereafter new players initialized relative to the voted centroid). Hidden player j imputed at ĉ(t) + off_j. Fewer than three voters → fall back to B2; players with no stored offset → B1. At W = 44 m the voting path produces 70–86% of B4's hidden estimates (B2 fallback 14–30%, B1 0%).
- **Scored quantities:** (1) hidden-player position error (m) over (frame, player) pairs where the player is outside the viewport and was observed at least once earlier in the half (never-observed players unscorable for position but included in map metrics); (2) pitch-control map MAE on a 3 m grid with arrival-time model + sigmoid contest function [13], full pitch and hidden zone separately, computed with **zero velocities** in all conditions (position-only control variant); (3) team control-share error (pp): mean absolute per-frame deviation of "team A controls x% of the pitch". Hidden-zone MAE and share error carry 95% block-bootstrap CIs over one-minute blocks (frame-level resampling would be anticonservative; within-match intervals quantify temporal sampling uncertainty, not match-to-match variation).

## 4. Equations & assumptions
- Voting (Eq. 1): ĉ(t) = (1/|V_t|) Σ_{i∈V_t} (p_i(t) − off_i(t⁻)); off_i(t) ← EMA[p_i(t) − ĉ(t)] for i ∈ V_t — each step votes with pre-update offsets, then updates them against the voted centroid.
- B1 decay: p̂_j = w·p_j^last + (1−w)·p̄_V, w = e^{−Δt/τ}, τ = 8 s.
- B3 velocity blend weight: e^{−Δt/1.5s}.
- SCI (Sec. 6): SCI = Δ_own + Δ_opp — change in possessing team's pitch-control share of the attacking third (first vs last thirds of window) plus collapse of opponent's control share in its own advanced zone (percentage points, same control model). Verdict classes: space creation (SCI ≥ +12); weak progression (+4 ≤ SCI < +12); dead possession (SCI < +4). (Paper states thresholds prespecified in earlier internal work, not externally validated.)
- Assumptions stated: position-only control isolates imputation from velocity estimation; 95% block-bootstrap intervals are within-match; game 3 held out from method development; GSR evaluation (GS-HOTA) scores visible players only.

## 5. Features / target
- **Inputs:** per-frame player positions from broadcast GSR (or simulated viewport over ground-truth tracking); ball position driving the viewport; occlusion gap (elapsed time since last observation per hidden player).
- **Targets:** imputed positions of hidden players; downstream metrics: pitch-control maps (3 m grid) and team control-share (%).

## 6. Validation design
- **Benchmark on full-pitch ground truth:** simulated viewport applied to Metrica tracking (three matches); any imputation policy scored against true spatial metrics. Games 1–2 for development, game 3 held out (method ladder frozen before game 3 first evaluated).
- **Metrics:** hidden-zone pitch-control MAE, full-pitch MAE, control-share error, median position error — all with 95% block-bootstrap CIs. (1) and (3) designated decision-relevant; method selection on those two.
- **No learned baseline comparisons with numeric claims:** Graph Imputer [10] comparison is protocol-contrast only (bidirectional + 105 proprietary matches + 9.6 s sequences vs online/causal + no training) — authors explicitly decline numeric comparison.
- **Occlusion-time stratification:** position error binned by occlusion gap (≤2 s, 2–9.6 s, >9.6 s).
- **End-to-end case study:** B4-inspired ghost layer in a broadcast GSR pipeline (PnLCalib [6] calibration + temporal bridge, BoT-SORT [1] tracking, color team assignment, shot-change gating; pipeline scores GS-HOTA 35.2 on 11 public SoccerNet-GSR test sequences — flagged as not strictly comparable to the official 22.26 baseline). Two junk-possession windows of a FIFA World Cup 2026 Netherlands–Morocco match (paper states 1–1 after extra time, Morocco 3–2 on penalties; windows 11:58–12:32 and 72:48–73:45) scored with/without imputation.

## 7. Numerical results / baselines
All from Tables 1–2, W = 44 m unless noted (order game1/game2/game3):
- **B0 ignore:** hidden-zone MAE 26.9/25.6/25.1 pp; control-share error 13.4/12.5/11.1 pp.
- **B1 last-seen:** hidden MAE 22.1/20.0/19.5; share 10.6/9.5/8.2; position error 19.6/17.9/18.4 m.
- **B2 anchor:** hidden MAE 15.7/14.6/14.3; share 6.2/5.4/4.4; position 13.6/12.8/12.5 m.
- **B5 fixed template:** hidden MAE 23.0/18.8/19.1; share 10.3/7.7/6.9; position 22.7/20.7/21.9 m — clearest negative result, "far worse than any dynamic anchor."
- **B3E (EMA only):** hidden MAE 13.2/12.2/13.6; share 5.8/4.8/5.0; position 15.7/15.2/16.3 m (worst position error of dynamic variants — offsets estimated against voted centroid but applied at biased visible centroid).
- **B3V (velocity only):** hidden MAE 15.5/14.4/14.0; share 6.2/5.5/4.4; position 13.2/12.2/11.9 m (slight improvement over B2 everywhere).
- **B3 (EMA+velocity):** hidden MAE 12.8/11.8/13.2; share 5.7/4.6/4.7; position 14.6/14.0/15.1 m.
- **B4 centroid vote:** hidden MAE 13.3/12.2/13.8; share 4.7/4.5/4.7; position **11.6/10.0/9.7 m** — best position error in all three matches, best share error in games 1–2; in held-out game 3, B2/B3V edge it on share error by 0.3 pp (4.4 vs 4.7) with paired block-bootstrap 95% CI [−0.4, +1.3] pp — "not resolved at this sample size."
- Marginal block-bootstrap 95% CIs for B0 vs B4 do not overlap in any match on hidden MAE or share error (game 1 hidden MAE: B0 [24.5, 29.4] vs B4 [11.2, 15.6]; share error [11.4, 15.7] vs [3.6, 6.1]).
- **Viewport sensitivity (Table 2):** B4 improves on B0 in every cell at all widths; share error reduced to 28–48% of B0. At W = 36 m: B0 MAE 28.9/27.6/28.3, share 15.3/14.3/13.7 → B4 15.6/14.1/16.8, 5.9/5.5/6.6 (visible 13.0–13.1 of 22). At W = 60 m: B0 22.8/20.6/21.2, 10.1/8.7/8.1 → B4 9.5/8.0/10.5, 2.8/2.4/2.6.
- **Occlusion stratification (B4 median position error):** ≤2 s: 3.3–3.7 m; 2–9.6 s: 7.2–8.9 m; >9.6 s: 15.6–16.9 m. ≤9.6 s occlusion share: 43–50% of hidden (frame, player) samples; **>9.6 s: 50–57%** — roughly half or more of hidden observations lie beyond the Graph Imputer's 9.6 s sequence protocol.
- **Broadcast case study:** Window 1 SCI +15.6 → +32.8; Window 2 −10.9 → +4.7 — verdict class changes from "dead junk" to "weak progression." Imputation moves SCI by 15.6–17.2 points — "more than spanning the 8-point intermediate verdict class." (Author's own caveat: no full-pitch ground truth for broadcast; a sensitivity result, not an accuracy claim.)

## 8. Code / data availability
Code + benchmark: https://github.com/nowayfootball/offscreen-impute (public; benchmark, imputation ladder, figures, commands). Data: Metrica Sports sample data (public). The broadcast case-study pipeline and World Cup footage are not in the repo. Author: independent researcher (Seongjin Choi, ORCID 0009-0001-3193-7424). No GPU or cloud spend.

## 9. Leakage & limitations
- **My adversarial notes:** (a) game 3 was held out of method development but the *hyperparameters* (τ = 8 s, EMA 0.1, three-voter threshold, 1.5 s blend) are round numbers tuned on games 1–2 of the same provider — three matches from a single provider is a thin corpus; league/style variation untested. (b) The simulated viewport pans but never zooms or tilts; real broadcasts zoom (changing visible-player counts), so the 50–57% long-occlusion share may not transfer. (c) The voting recursion's "exact cancellation would require stable offsets and conditionally representative voters" — the author's own words — and 14–30% of B4's estimates are actually B2 fallback, so the headline numbers are a mixture, not pure voting. (d) SCI verdict thresholds are the author's prespecified operational bins, "not externally validated"; the World Cup case study has n = 2 windows and no ground truth. (e) Position-only control (zero velocities) is a deliberate simplification — the paper flags velocity-aware control as open. (f) GS-HOTA 35.2 on 11 sequences is presented with an explicit non-comparability caveat. (g) "World Cup 2026" footage context — evaluate as the paper states it; it is a synthetic/future-scenario description, not something to verify independently here.
- **For NFL:** all evidence is soccer (pitch control, 22-player roster, soccer broadcast framing). NFL broadcast has 22 players too, but formations are set-piece and camera behavior differs (all-22 vs broadcast). Transfer needs NFL-specific re-benchmarking.

## 10. GSE overlap
New capability area with direct relevance to one existing lane. The existing-research-map has: (1) the 2026-09-18 NGS-replacement spec (build NGS equivalents from public data — broadcast-video tracking is the natural source, and the spec's blind spot is exactly off-screen players); (2) the 27-family NGS taxonomy (2026-09-21); (3) STRAIN (2305.10262) on tracking-data pass rush. No repo file covers broadcast-viewport imputation methodology. This is an **extension** of the tracking/NGS lane, not a duplicate: the benchmark protocol (simulate broadcast viewport over full tracking, score decision-relevant metrics, stratify by occlusion duration) is the reusable contribution for any GSE NGS-from-broadcast work. The soccer pitch-control metric itself is not a GSE target.

## 11. GSE implementation spec
1. **Benchmark first:** if GSE builds broadcast-video player tracking for NFL (NGS replacement), replicate this paper's benchmark: take full-pitch tracking (e.g., a Big Data Bowl / public NFL tracking sample), apply a simulated broadcast viewport (NFL broadcast cameras follow the ball too; measure real visible-player counts from a sample of broadcast frames first), and score imputation policies on *decision-relevant* NFL metrics (e.g., QB decision-time pressure features, receiver separation aggregates, box-count estimates) rather than trajectory fidelity.
2. **Adopt B4 as the training-free baseline:** implement role-anchored centroid voting (per-team, per-formation-group offsets — NFL roles are far more structured than soccer's, so anchor offsets to formation/personnel packages, e.g., WR split/route-tree anchors); any learned imputer (Graph-Imputer-style) must beat B4's numbers on the benchmark.
3. **Hyperparameters to re-tune for NFL:** viewport width (NFL plays are wider), τ decay, voter threshold (NFL has 11 per side; subsets are small), occlusion-gap distribution (NFL plays last 4–6 s — long-occlusion regime differs from soccer's sustained phases).
4. **Effort:** ~2–3 weeks for the benchmark harness on public NFL tracking; the B4 algorithm itself is closed-form CPU code.

## 12. Reproducible test
Dataset: a public NFL tracking sample (e.g., Big Data Bowl tracking, one season). Build the simulated-viewport benchmark: fixed broadcast camera window sized to match measured NFL broadcast visible-player counts (~14 of 22, per soccer analogue). Baseline: B0 ignore vs B4 centroid-voting on (a) hidden-player position error, (b) a decision-relevant NFL metric — pre-snap box-count estimate error and receiver-separation-at-throw MAE for hidden players. Time window: full available season; held-out last 4 weeks frozen-method check, mirroring the paper's game-3 discipline. Success bar = B4 cuts the decision-metric error to ≤50% of B0, as in the paper.

## 13. Acceptance / rejection gate
**Adopt** B4 (or a better learned variant) into the GSE tracking pipeline if it cuts the decision-relevant NFL metric error to ≤50% of the ignore policy on the held-out weeks; **reject** broadcast-video tracking for that metric (stick to play-by-play sources) if the ignore-policy error is already small or B4 fails to beat it — i.e., the benchmark decides whether the imputation layer is worth building at all. The soccer numbers are not the gate; the NFL re-benchmark is.

## 14. Improvement experiment
Two concrete follow-ups beyond the paper: (1) **formation-anchored voting for NFL** — replace per-player role offsets with per-personnel-package template offsets (11 personnel vs 12 personnel formations are stable, discrete priors), and let the vote be weighted by each voter's own observation recency — testing whether structured priors beat pure online EMA offsets in set-piece football; (2) **zoom-aware viewport simulation** — the paper's viewport pans but never zooms; instrument real NFL broadcast zoom behavior (focal-length changes per play phase from a sample of broadcasts) and show whether the 50–57% long-occlusion share holds or shrinks, since zoom changes the fundamental occlusion statistics.

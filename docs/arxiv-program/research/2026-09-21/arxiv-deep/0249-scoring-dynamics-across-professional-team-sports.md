# [0249] Scoring dynamics across professional team sports: tempo, balance and predictability (arXiv:1310.4461v2)

**Citation:** Merritt, S. & Clauset, A. (2013). *Scoring dynamics across professional team sports: tempo, balance and predictability*. arXiv:1310.4461v2. URL: https://arxiv.org/abs/1310.4461
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1548 lines).
**Verdict:** ADAPT — the lead-size-conditioned scoring Markov chain is a portable, team-agnostic in-play outcome model worth porting to NFL live win probability and live totals; the Poisson-tempo memorylessness finding also argues against momentum-based in-game models.

## 1. Research question
Do common dynamical patterns cut across professional team sports' within-game scoring? The paper asks whether scoring *tempo* (when scoring events occur), scoring *balance* (who wins each event), and *predictability* (outcome forecasts from early events alone) follow shared stochastic processes in CFB, NFL, NHL, and NBA, and whether a simple generative model built on those processes reproduces lead-size dynamics and predicts game outcomes as well as commercial odds-makers.

## 2. Dataset / schema
STATS LLC proprietary play-by-play scoring data (copyright 2014), provided by STATS LLC — 1,279,901 scoring events across 40,813 regulation-time games, overtime excluded (accounts for 99%+ of events per sport). Schema per event: timestamp (second of game clock), team that won the event, points value of the event. Coverage:
- CFB: 10 seasons, 2000–2009, 486 teams, 14,588 games, 120,827 events
- NFL: 10 seasons, 2000–2009, 31 teams, 2,654 games, 19,476 events
- NHL: 10 seasons, 2000–2009, 29 teams, 11,813 games, 44,989 events
- NBA: 9 seasons, 2002–2010, 31 teams, 11,744 games, 1,080,285 events
Events at the same clock-second are combined. No team identity, roster, or strategy data is used in the model (deliberately team-agnostic). Proprietary — not publicly replicable at this scale; the closest public analogue is nflverse play-by-play (NFL 1999+), which contains scoring-play timestamps and scores.

## 3. Method / model
An "ideal competition" null model (level playing field, perfectly skilled teams, imperfect execution) reduced to two independent stochastic processes: tempo ~ homogeneous Poisson process with sport-specific rate λ; balance ~ fair Bernoulli (c=1/2); point values ~ iid draws from the empirical distribution. Deviations from the null are estimated empirically:
- Tempo: MLE of λ per sport = average events per game / intervals per game; per-second empirical scoring probability function; inter-arrival (gap) distributions; two-point correlation function C(n) on inter-arrival times.
- Balance: MLE bias ĉ = E_r/(E_r+E_b) per game; distribution of ĉ compared to simulated perfectly balanced games conditioned on the empirical events-per-game distribution; scoring-while-in-lead function Pr(leader scores | lead size L), fit with linear least squares (reported slopes; p ≤ 0.1) and interpreted via a Bradley–Terry latent-skill model (c = π_r/(π_r+π_b)).
- Generative model: 2×2 combinations of tempo models (Bernoulli: per-second empirical event probability; Markov: inter-arrival drawn from empirical gap distribution) × balance models (Bernoulli: per-game c drawn from empirical ĉ distribution; Markov: leader scores with lead-size-conditioned empirical probability). 100,000 simulated games per combination per sport; comparison target = empirical lead-size variance as a function of clock time.
- Outcome prediction: Markov chain on lead-size states; transition matrix built from the empirical scoring-as-function-of-lead probabilities and empirical point-value distribution; prediction = winner/tie/loser probabilities at time T from current state after expected n = Σ_{w=t}^{T} Pr(event|w) events. Evaluated out-of-sample: repeated random 3/4-train / 1/4-test game splits, AUC = mean fraction of correct winner predictions over cumulative events.

## 4. Equations & assumptions
- Ideal-competition decomposition (independence assumed):
  Pr(ΔS_r(t)=k) = Pr(event at t) · Pr(r scores) · Pr(points=k)   (Eq. 1)
- Two-point inter-arrival correlation:
  C(n) = (Σ_k (t_k − ⟨t⟩)(t_{k+n} − ⟨t⟩)) / Σ_k (t_k − ⟨t⟩)²   (Eq. 2)
- Markov-chain transition probabilities (independence of event winner and point value assumed):
  P_{L,L+k} = Pr(r scores | L) · Pr(point value = k)
  P_{L,L−k} = (1 − Pr(r scores | L)) · Pr(point value = k)
- Prediction: lead-size distribution at T via P^n · S_0 (n = expected remaining events), summed over L>0 (r wins), L=0 (tie), L<0 (b wins).
- Latent-skill balance model (Bradley–Terry on events): c = π_r/(π_r+π_b); lead-size-conditioned slope arises by averaging over the skill distribution.
- Assumptions stated: stationarity of gameplay within periods; independence of event timing and event winner; iid point values; overtime ignored; current-lead function estimated pooling across teams and games.

## 5. Features / target
No learned features — a purely stochastic/dynamical study. Inputs: event timestamps, event winners, point values, current lead size L. Targets: (i) per-game events count (Poisson fit); (ii) inter-arrival time distribution (geometric/exponential fit); (iii) ĉ game-balance distribution; (iv) Pr(leader scores | L); (v) lead-size variance vs clock time (simulation fit); (vi) final game winner (prediction AUC vs cumulative events).

## 6. Validation design
Out-of-sample game-level splits (repeated random 3/4 train / 1/4 test per sport) for the outcome-prediction evaluation; the train split re-estimates all empirical functions (tempo, lead-size scoring function, point-value distribution) so test predictions never see test games. Simulation validation is distributional (lead-size variance curves vs empirical, Figure 6) rather than held-out. Baseline comparisons: "leader wins" heuristic for predictions; commercial benchmarks (limited samples of Bovada live odds and SBR money lines) for the prediction discussion. Poisson-model agreement tested via events-per-game histograms, inter-arrival cdfs, and C(n) ≈ 0.

## 7. Numerical results / baselines
Tempo MLEs (Table 2, standard uncertainty in final digit): NFL λ̂=0.00204(1)/s, T=3600s → 7.34 events/game, 490.2 s/event; CFB λ̂=0.00230(1) → 8.28 events/game, 434.8 s/event; NHL λ̂=0.00106(1) → 3.81 events/game, 943.4 s/event; NBA λ̂=0.03194(5), T=2880s → 91.99 events/game, 31.3 s/event. Inter-arrival C(n) ≈ 0 at all lags in all four sports (slight negative C at small n in CFB/NFL/NHL).
Three-phase tempo pattern within periods: early dip (non-linear increase), middle stable/Poisson, end-of-period sharp spike (NHL end-game rate exceeds 3× the game mean, attributed to pulled-goalie play).
Balance: CFB/NFL balance distributions broader than perfect-balance null (CFB broader than NFL); NHL broader; NBA *narrower* than null. Lead-size scoring slopes: CFB +0.005 probability per point of lead, NFL +0.002 per point (CFB effect ~2.5× NFL); NHL positive; NBA negative ("restoring force").
Simulation (100k games × 4 combos × 4 sports): Markov balance model reproduces empirical lead-size variance well; Markov tempo adds little over Bernoulli tempo. Remaining deviations: NHL second-half overestimated variance; CFB/NFL slight first-half overestimates.
Prediction AUC: CFB/NFL >60% after one scoring event, >80% by three events; NHL ~80% after the first event; NBA requires >40 events to exceed 80% AUC. Markov chain beats "leader wins" in all sports. After 20% of events had occurred, the model's predictions were roughly 10% more accurate than SBR's money lines (small-sample comparison, details of SBR sample not fully specified).
Claims above are the paper's; the SBR/Bovada comparison rests on a small, non-systematic sample and the paper notes coverage was incomplete.

## 8. Code / data availability
None stated (no code link; data from STATS LLC, proprietary). Not stated in paper.

## 9. Leakage & limitations
- Time coverage is stale (2000–2009 / 2002–2010); rule changes since (kickoff rules, review, analytics-driven 4th-down aggression, NBA pace inflation) plausibly shift λ and end-phase patterns. NFL rate of 7.34 events/game predates the modern scoring surge.
- No team conditioning: the lead-size function pools all teams, so its apparent "memory" is a summary of the league skill distribution, not a team-specific property — applying the pooled function to a specific matchup injects league-average skill into a team-specific prediction (a form of shrinkage-by-pooling; fine as a prior, biased as a point estimate).
- The lead-size scoring function is symmetric by construction about L=0; any asymmetric team effects (home advantage, score-dependent strategy like kneel-downs) are folded in silently.
- End-phase "tempo spikes" confound strategic clock management with risk-taking; the paper notes this but does not separate them.
- Selection bias in the SBR/Bovada comparison: non-comprehensive, small-sample, odds-setting methodology unknown; the "10% better than SBR" claim is suggestive, not rigorous.
- Independence assumptions (winner ⊥ point value ⊥ timing) are asserted, not tested; safeties/two-point conversions in NFL violate winner/point-value independence weakly.
- External validity to NFL totals/wagers: model predicts winner probability, not spread or total; Poisson scoring with empirical point values would need extension (and weather/roster conditioning) to price totals.
- Overtime excluded (~1% of events, but disproportionately relevant for close-game calibration).

## 10. GSE overlap
Extension, not duplicate. In-play/in-game win probability is partially covered in-repo: iWinRNFL (1704.00197, in the 58-paper dossier) covers in-game WP with charting features; the 2026-09-18 ML research brief lists state-space models and online learning as commissioned topics (results pending); the existing-research map's gap list explicitly flags **in-play / live NFL spread & total modeling** as thin (only iWinRNFL, and only for WP, not live spread/total surfaces) and **Hawkes processes / self-exciting momentum models** as absent. This paper fills the "simple team-agnostic in-play baseline" slot: the Poisson-tempo + lead-size-conditioned Bernoulli balance Markov chain is a closed-form in-game WP engine GSE does not yet have. Its memorylessness conclusion (no momentum; C(n)≈0) also directly challenges any momentum features in the in-play stack — consistent with the MOVE-37 finding that Koopman/DMD momentum was rejected (p=0.89) per the 2026-09-13 dated log. The NBA restoring-force (substitution-driven) has no NFL analogue per the paper and is not transferable to GSE's NFL lane.

## 11. GSE implementation spec
Build "GSE In-Play WP Baseline v1" (extension of the in-game lane):
- Data: nflverse play-by-play 1999–present scoring events (or recompute scoring events from play data); compute empirical λ per second-of-game and Pr(leader scores | lead L) per lead bin, pooled and team-stratified; empirical point-value distribution.
- Features: current score differential, clock, period; team-conditional variant replaces pooled c(L) with c_team(L) = logistic fit of per-team skill offsets to Bradley–Terry event model using pregame Elo/spread as prior.
- Model: discrete-time Markov chain over lead states (−40..+40) with transition matrix from §4 equations; vectorize with numpy; precompute P^n for n=1..max remaining events (NFL ~15) to answer live queries in O(1).
- Serving: precompute per-game state at kickoff; update on each scoring event (cheap matrix lookup); expose WP + confidence via the existing X-facing in-game cadence.
- Modernization: estimate separate λ by era (split 1999–2013 vs 2014–present); add weather/wind dampers on λ for outdoor games; add kneel-down/quarter-end adjustments from the three-phase tempo finding.
- Effort: 2–3 days engineering (data pull + matrix code + validation), plus 1 day for era-split and weather add-ons.

## 12. Reproducible test
Dataset: nflverse play-by-play, NFL regular+postseason 2019–2024, scoring events extracted (exclude overtime to match paper). Metric: Brier score and AUC of predicted final winner as a function of cumulative scoring events (1, 2, 3, …). Baseline: (a) pregame market-implied win probability carried forward unchanged; (b) the paper's exact pooled replication (Poisson λ̂ from 2019–2024 data, pooled Pr(leader|L), empirical point values). The GSE team-conditioned variant must be tested against both on the same event grid. Window: 2019–2024 (6 seasons, ~1,600 games).

## 13. Acceptance / rejection gate
ADOPT the team-conditioned in-play chain into the live product IF, on 2019–2024 NFL data, it beats the carried-forward pregame market probability by ≥0.005 Brier points averaged over scoring events 1–5 AND matches or beats the exact paper replication by ≥0.003 Brier; REJECT if it fails either threshold or if the pooled replication underperforms "leader wins" (i.e., the paper's 2000s-era result does not reproduce in the modern game). Separately, if measured C(n) on inter-scoring times shows |C(1)| > 0.05, the memorylessness claim is rejected and a momentum term must be tested.

## 14. Improvement experiment
Condition the tempo rate λ on game state rather than clock alone: fit λ(score diff, clock, period) via Poisson regression on 2019–2024 nflverse data (log-link, features: absolute lead, time remaining, half) to capture end-of-half urgency and garbage-time slowdown that the paper's clock-only Bernoulli tempo model misses. Hypothesis: state-conditioned tempo beats the paper's clock-conditioned tempo on next-scoring-event timing (log-likelihood per event), tightening live-total surfaces — the paper never jointly conditions tempo on score state, which is exactly the interaction a live-totals model needs.

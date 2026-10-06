# [1468] Safe Leads and Lead Changes in Competitive Team Sports (arXiv:1503.03509v1)

**Citation:** Clauset, A., Kogan, M., & Redner, S. (2015). *Safe Leads and Lead Changes in Competitive Team Sports*. arXiv:1503.03509v1 [stat.AP]. URL: https://arxiv.org/abs/1503.03509
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** ADAPT — the arcsine-law scoring model (time-leading and lead-change distributions ~ 1/[π√(t(T−t))]) plus the safe-lead formula Q(L,τ) = erf(L/√(4Dτ)) gives GSE a principled, parameter-light baseline for in-game win probability and "lead safety" features; use as a benchmark/feature, not a replacement for modern play-by-play models.

## 1. Research question
Do the dynamics of scoring leads in team sports follow the classical arcsine laws of random walks, and can a simple diffusion model with team-strength bias quantify "safe" leads — the probability a lead of size L with time τ remaining survives?

## 2. Dataset / schema
40,747 games, 1,306,515 scoring events: NBA 11,744 games / 1,098,747 events (2002–2010); CFB 14,586 / 123,448 (2000–2009); NFL 2,654 / 20,561 (2000–2009); NHL 11,763 / 63,759 (2000–2009). Scoring-event timestamps and running scores. Historical; replicable in principle from modern play-by-play (nflverse).

## 3. Method / model
- Model scoring as a biased random walk / diffusion: each scoring event is a step; team strength enters as drift (Péclet number).
- Arcsine laws: the fraction of time a team leads, the time of the last lead change, and the time of the maximal lead all follow 1/[π√(t(T−t))].
- Safe-lead probability for evenly matched teams: Q(L,τ) = erf(L/√(4Dτ)), where D is the diffusion constant estimated from scoring-event data and τ is time remaining.
- Team strength estimated per game from the drift; persistence parameter p (probability the scoring team scores next) measured empirically.

## 4. Equations & assumptions
- Arcsine density: f(t) = 1 / [π √(t(T−t))], t ∈ (0,T).
- Safe lead (equal strength): Q(L,τ) = erf(L / √(4Dτ)).
- With strength bias: drift-adjusted first-passage probability (paper's Eq. for biased case).
- NBA estimates: mean 93.56 scoring events/game, 2.07 points/event, persistence p = 0.360, 9.37 lead changes/game; diffusion estimate D ≈ 0.0391 points²/sec; Péclet ≈ 0.77.
- Assumptions: (1) scoring events are memoryless given (persistence, drift); (2) diffusion approximation valid (many small events — best in NBA, weakest in NFL); (3) team strength constant within a game.

## 5. Features / target
Features: current lead L, time remaining τ, estimated diffusion D and drift (team strength) from league/game data. Target: P(lead survives to end) / distribution of lead-change times.

## 6. Validation design
Empirical distributions of time-leading, last-lead-change time, and maximal-lead time compared against the arcsine prediction across four sports. Safe-lead formula checked against observed lead survival rates. No train/test split in the ML sense — this is distributional model checking.

## 7. Numerical results / baselines
- Arcsine laws hold well in NBA and NHL; football fits are weaker (discrete 3/7-point scoring, field position effects, larger team-strength disparities, few events: NFL 2,654 games / 20,561 events).
- NBA: a 10-point lead is ~90% safe with 7.87 minutes remaining; 18 points at halftime likewise ~90% safe.
- Maximum empirical NBA overestimate of lead safety reported as 6.2%.
- Persistence p = 0.360 (NBA): scoring runs have memory — the same team scores next 36% of the time beyond the random-walk baseline.

## 8. Code / data availability
None stated. Data described as compiled from public sports databases of the era.

## 9. Leakage & limitations
- No lookahead issue (descriptive model), but the diffusion approximation is poorest exactly where GSE needs it: NFL has ~7.75 scoring events/game vs NBA's ~93.6 — the continuous limit is strained.
- Constant within-game team strength ignores injuries, garbage time, and strategic fouling/onside kicks.
- Safe-lead formula assumes equal strength; the biased version needs per-game drift estimates that are noisy early.
- 2000–2010 data; pace and scoring rules have shifted (e.g., NFL overtime rules, NBA 3-point rate).

## 10. GSE overlap
Per `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`, GSE has in-game/win-probability research threads but no existing ledger derives the arcsine/safe-lead baseline. This is an extension: a closed-form, zero-training baseline and feature generator for live WP models.

## 11. GSE implementation spec
- Data: nflverse play-by-play 2015–2025; estimate per-game drift from pregame spread and D from historical scoring-event variance.
- Build: (a) implement Q(L,τ) with NFL-calibrated D and drift; (b) emit it as a baseline WP and as features (lead-safety, expected lead changes remaining) into the existing live model; (c) recalibrate D per season.
- Effort: ~3 days (formula + calibration).

## 12. Reproducible test
Dataset: 2022–2024 NFL games, sampled game-states (lead, time remaining). Metric: Brier score / log-loss of P(home wins | state). Baseline: GSE's current live WP model; the arcsine model is the challenger-as-feature. Window: train D/drift mapping on ≤2021, test 2022–2024.

## 13. Acceptance / rejection gate
ADOPT the safe-lead features if adding them to the live WP model improves 2022–2024 log-loss by ≥1% with no degradation in calibration (reliability-curve slope within [0.95, 1.05]). Reject if the diffusion approximation adds nothing over the existing model (likely if the current model already captures lead-time dynamics).

## 14. Improvement experiment
Fit sport-specific jump-diffusion (compound Poisson with 3/7-point masses) instead of Brownian diffusion for NFL scoring, and test whether the resulting safe-lead probabilities beat the Brownian Q(L,τ) on 4th-quarter game-states — this directly attacks the paper's weakest assumption for football.

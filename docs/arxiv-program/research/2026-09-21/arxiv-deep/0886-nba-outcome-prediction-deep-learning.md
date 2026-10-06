# [0886] Features selection in NBA outcome prediction through Deep Learning (arXiv:2111.09695v1)

**Citation:** Manlio Migliorati (2021). *Features selection in NBA outcome prediction through Deep Learning*. arXiv:2111.09695v1 [cs.LG]. URL: https://arxiv.org/abs/2111.09695v1
**Full-text source:** local PDF extract /tmp/arxiv750-r12/r-2111.09695v1.pdf, read in full.
**Ledger completed:** 2026-09-21. **Read:** full text.
**Verdict:** ADAPT (weak) — the substantive finding is negative and useful: single-feature models (Elo rating, relative win frequency) beat box-score Four-Factors features for NBA outcome prediction (best dynamic Elo AUC 0.7117 / accuracy 0.6736 on ~18,000 games), which is a genuine feature-selection lesson for GSE (strength-of-record > box-score aggregates). No odds comparison, no calibration, no walk-forward table — the weakness is documented, not hidden.
**Replacement context:** Fresh-search replacement (query: `arXiv tennis match prediction rating model 2025 Bayesian Elo surface`) for an assigned duplicate already in done-ids.txt (assigned-duplicate skip, not a REJECT). Verified genuinely absent from done-ids.txt, all phase-2 assignments, both ledger trackers, existing ledgers, and all wave reports on 2026-09-21.

## Citation / full-text source
Author: Manlio Migliorati. arXiv v1 dated 2021-11-17. Feature-selection study for NBA game-outcome prediction with deep learning; cross-validated.

## Research question
Which features actually matter for predicting NBA game outcomes — box-score aggregates (Four Factors) or simple strength summaries (Elo, win frequency)? The paper runs a feature-selection horse race with deep-learning models.

## Dataset / schema
- NBA regular seasons 2004/05–2019/20 (16 seasons), ~18,000 game observations.
- Schema: game date, home/away teams, box-score Four Factors per team, Elo ratings, win frequencies; home-court factor handled ex ante.
- Access: public game data (basketball-reference-class sources).

## Method
- Features computed ex ante (pre-game): Four Factors (eFG%, TOV%, ORB%, FT/FGA) for each team, Elo rating, relative victory frequency.
- Deep-learning classifiers trained with cross-validation on single-feature and multi-feature sets.
- Dynamic Elo variant: Elo with depth-2 (two-level) updating; historical Elo baseline: 20% offseason regression, HFA 40, K=30.

## Equations / math / assumptions
- Elo update: R ← R + K·(outcome − 1/(1+10^(−(R_opp−R+HFA)/400))) with the paper's constants (HFA=40, K=30, 20% offseason regression to mean).
- Four Factors: eFG%, turnover rate, offensive rebound rate, free-throw rate — used as team-strength proxies.
- Assumptions: features computed ex ante are sufficient statistics for team strength; cross-validation folds are treated as independent (time structure partially respected via ex-ante computation).

## Features / target
- Features: Four Factors (per team), Elo rating, relative victory frequency, home-court indicator.
- Target: binary home-win/away-win.

## Validation
- Cross-validation over the 16-season sample; models compared on AUC and accuracy.
- Best dynamic Elo: depth 2, AUC 0.7117, accuracy 0.6736. Historical Elo: 20% offseason regression, HFA 40, K=30, AUC 0.7117, accuracy 0.6721.
- Single-feature (Elo / win-frequency) models beat box-score-feature models — the paper's main result.

## Exact results with baselines
- Best dynamic Elo (depth 2): AUC 0.7117, accuracy 0.6736.
- Historical Elo (20% regression, HFA 40, K=30): AUC 0.7117, accuracy 0.6721.
- Box-score Four-Factors models: worse than the single-feature models (exact numbers per variant in the paper's tables; direction is the finding).
- No odds baseline, no calibration metrics, no properly tabulated walk-forward results (documented weakness).

## Code / data availability
None stated.

## Leakage
- Cross-validation over pooled seasons without strict time ordering — future games can inform past predictions within folds; the ex-ante feature computation mitigates but does not eliminate temporal leakage.
- Feature selection (choosing Elo over Four Factors) done on the same data used to report performance.

## Limitations
- No odds comparison (the odds_market lane's core benchmark is missing).
- No calibration metrics (reliability curves, ECE) — accuracy/AUC only.
- No walk-forward or time-ordered evaluation table.
- NBA-only; the "Elo beats box score" finding may not transfer to leagues where box-score stats are more informative (NFL).

## GSE overlap vs existing-research-map
Existing-research-map.md inventories Elo as a catalog metric, not a research subject; no NBA feature-selection paper is in the corpus. The negative result (strength-of-record features > box-score aggregates) is not duplicated anywhere in the map. Weak but genuinely novel vs the corpus.

## Implementation spec (GSE adaptation)
- **What to build:** a GSE feature-selection audit: for each league, run the paper's horse race — single strength-summary features (Elo, win frequency, net rating) vs rich box-score feature sets — under strict walk-forward protocol, and keep whichever wins per league. Encode the winner as the default feature set.
- **NBA prior to adopt:** start NBA models from dynamic Elo (K≈30, HFA≈40, 20% offseason regression) rather than box-score features.
- **Effort:** 3–5 days per league for the audit harness.

## Reproducible test
- Reproduce on 2004/05–2019/20 NBA (basketball-reference data): single-feature Elo vs Four-Factors deep model under walk-forward (not pooled CV); check whether the Elo advantage survives time-ordered evaluation.

## Numeric gate
- ADAPT (weak) confirmed if, under strict walk-forward, Elo-based features match or beat Four-Factors features on AUC (difference ≥ −0.005 tolerated given the paper's pooled-CV inflation). If Four Factors win walk-forward, the paper's finding is a CV artifact — record that and keep the audit harness.

## Improvement experiment
- **Hybrid features:** test Elo + Four-Factors *differentials* (home−away) as a combined set under walk-forward; success if the hybrid beats Elo alone by ≥0.005 AUC — determining whether box-score data adds anything once strength-of-record is controlled.

## Verdict
**ADAPT (weak)** — Kept for one honest, portable lesson: in the NBA, simple strength-of-record features beat box-score aggregates, and the paper's Elo constants (K=30, HFA=40, 20% regression) are usable starting values. The missing odds comparison, calibration, and walk-forward discipline are real weaknesses; the reproducible test is designed to check whether the headline finding survives them.

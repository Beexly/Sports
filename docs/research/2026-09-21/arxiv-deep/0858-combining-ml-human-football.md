# [0858] Combining Machine Learning and Human Experts to Predict Match Outcomes in Football: A Baseline Model (arXiv:2012.04380)

**Citation:** Beal, R., Middleton, S. E., Norman, T. J., & Ramchurn, S. D. (2020). *Combining Machine Learning and Human Experts to Predict Match Outcomes in Football: A Baseline Model*. arXiv:2012.04380 [cs.CL, cs.AI]. URL: https://arxiv.org/abs/2012.04380
**Full-text source:** local cache /tmp/arxiv750-cache/fulltext/2012.04380.txt (24,832 bytes, complete paper incl. references). Cross-checked against https://arxiv.org/abs/2012.04380.
**Ledger completed:** 2026-09-21. **Read:** full text.
**Verdict:** ADAPT — the paper's text-as-structured-features ensemble is the first fully-read paper that fills existing-research-map gap #12 ("Text/news as features beyond the price — no papers read; beat-writer text embeddings for injury news is untested"). Adapt the methodology (entity-allocated per-team text vectors ensembled with stats + market probabilities); do not adopt the EPL/Count-Vectorizer specifics as-is.

## Citation / full-text source
Challenging Problems track paper, Dec 2020. AXA Research Fund + EPSRC NPIF grant EP/S515590/1. Authors: Ryan Beal, Stuart E. Middleton, Timothy J. Norman, Sarvapali D. Ramchurn (University of Southampton).

## Research question
Can combining NLP-extracted human-expert opinion (pre-match journalist previews) with statistical machine learning break the accuracy "glass ceiling" of football (soccer) match-outcome prediction? The authors cite Beal, Norman & Ramchurn (2019) that pure-statistical models (Dixon & Coles 1997; Baboota & Kaur 2019) plateaued at ~56.7% and ~59.1% accuracy, and bookmaker accuracy on football is only ~54% (vs 67% NFL, 74% NBA — football's 3 outcomes and low scoring make it the hardest sport).

## Dataset / schema
- **1,770 EPL games, 6 seasons (2013/14–2018/19)** — "a large dataset for predictions of football games" (typical papers test 1–2 seasons / 380 games per EPL season). Not an exhaustive list of all games in the period, but games with available Guardian previews.
- Guardian English Premier League match previews (e.g., Southampton vs Tottenham 2019 preview snippet quotes team news, touchline bans, absences). Released at https://github.com/RyanBeal7/GuardianPreviewData.
- Bookmaker odds from OddsPortal (https://www.oddsportal.com/results/soccer), pre-match only.
- Class priors cited over 25 EPL seasons: **46.2% home wins, 27.52% draws, 26.32% away wins**.

## Method
Five-stage pipeline (Fig. 1):
1. **OpenIE extraction:** relation tuples {argument, relation, argument} per sentence (e.g., {Manchester United, ex-manager, Mourinho}).
2. **Allocation of text context:** each sentence allocated to home team α, away team β, or "no team" — allocation a = (f(s), {α ∨ β}), a ∈ 𝒜, |𝒜| = k (k = #sentences). High-uncertainty allocations → no team.
3. **Text vectorisation:** Count Vectorizer → sentence vector f(s).
4. **Per-team aggregation:** V(α) = Σ f(s) over sentences allocated to α; likewise V(β).
5. **Prediction:** features X = [μ·V(α), V(β)] with home-advantage weight μ (Clarke & Norman 1995); Random Forest φ with φ(X) = y, y ∈ 𝒪 = {homewin, draw, awaywin}.

Four compared models: Model 1 (text RF only), Model 2 (Dixon & Coles), Model 3 (bookmaker favourite), Model 4 (ensemble RF on 9 features = P(home/draw/away) from each of the three base models).

## Equations / math / assumptions
- Outcome space: 𝒪 = {homewin, draw, awaywin}.
- Preview article t ∈ T, t = {s₁,…,sₖ}; sentence→vector f(s); allocation probability p(f(s)|α) decides team assignment.
- Feature vector per game: **X = [μ·V(α), V(β)]**, μ = home-advantage weighting.
- Classifier: φ(X) = y (Random Forest; no hyperparams reported).
- Ensemble (Model 4): RF over the 9-vector of base-model outcome probabilities.
- Assumption: preview text encodes "intangible variables" (mood, rivalries, rotation, new signings/managers) that stats miss; sentences are team-attributable via allocation.

## Features / target
- Target y: match outcome (home/draw/away).
- Features: count-vector-space per-team text aggregates (Model 1/4), Dixon & Coles probabilities, bookmaker implied probabilities. No explicit mention of ablation of OpenIE tuples vs raw counts.

## Validation
- **Exp 1:** average over 3 seasons (2016–2019); train = all games prior to test season; test = **300 games per season**.
- **Exp 2:** random 80/20 split of the 1,770 games; test set contains **75 draws, 47 longshots** (longshot = bookmaker probability < 20%).
- **Exp 3:** walk-forward over the full 2018/19 season — train on all pre-2018/19 data, accumulate correct predictions gameweek by gameweek (real-world scenario test).

## Exact results with baselines
**Experiment 1 (accuracy, averaged over 3 seasons):**
| Model | Accuracy | Precision | Recall | F1 |
|---|---|---|---|---|
| 1 (text RF) | **53.53%** | 0.649 | 0.413 | 0.505 |
| 2 (Dixon & Coles) | **59.11%** | 0.503 | 0.491 | 0.496 |
| 3 (bookmaker fave) | **52.43%** | 0.451 | 0.452 | 0.451 |
| 4 (ensemble) | **63.19%** | 0.612 | 0.563 | 0.586 |

- Model 4 vs Dixon & Coles: +4.08pp absolute (paper frames as "4.1% more" and also claims a "6.9% boost" / "10.8% increase on the bookmakers accuracy" — prose percentages are inconsistent; the table numbers are authoritative).
- Ablation: Model 4 **without** text features loses 10% F1 and 7% accuracy — the boost is attributable to the text features.
- Beats Schumaker et al. (2016) Twitter-sentiment approach by 13%.
**Experiment 2 (draws/longshots):** models 1–3 predict ZERO of the 75 test draws; Model 4 predicts **26.5%** of draws. Longshots: Model 1 predicts **38.9%**, Model 4 **22.2%**, models 2–3 predict none.
**Experiment 3 (2018/19 walk-forward):** Model 4 accuracy rises **+2.23% from week 1 to week 38** — authors attribute to late-season human factors (relegation battles, European qualification, cup congestion, rotation) that numbers capture poorly.

## Code / data availability
- Dataset released: https://github.com/RyanBeal7/GuardianPreviewData. No model code link stated in the paper. Odds from OddsPortal (scraped).

## Leakage
- Exp 1 & 3: previews written before the match + pre-match odds only — fair, no contamination.
- Exp 2: random (non-temporal) 80/20 split — **potential temporal leakage**: injury/form/manager news in text can span adjacent games. The paper does not address this. Treat Exp 2 draw/longshot numbers as optimistic.

## Limitations
- Text-only model is weak alone (53.5% < Dixon & Coles 59.11%) — text only helps as an ensemble complement, not a replacement.
- Prose percentages are inconsistent ("6.9% boost" vs table-implied 4.08pp vs D&C); trust Table 1/Figure 2 numbers, not the prose.
- Single source (Guardian), single league (EPL), Count Vectorizer is 2020-era weak NLP; no hyperparameter reporting for the Random Forests; OpenIE contribution unablated.
- Allocation step p(f(s)|α) details are thin — replicability of the sentence→team assignment is underspecified.

## GSE overlap vs existing-research-map
- **Fills gap #12 verbatim:** "Text/news as features beyond the price — ML brief area 13 commissioned, no papers read; beat-writer text embeddings for injury news is untested." This is the first in-depth read squarely in that gap.
- Repo corpus has Grok daily news briefs (news/injury/cap signals for engine inputs, "not methods research") and Gmail/X news monitoring, but no methodology for converting journalist text into calibrated model features. Extension, not duplicate.
- EPL/soccer domain; GSE's core is NFL — the *method* transfers, the *data* does not.

## Implementation spec (GSE adaptation)
1. **Beat-writer text feature pipeline for NFL:** scrape pre-game beat-writer articles (ESPN team writers, The Athletic, local beats) per matchup; modernize: sentence-transformer embeddings instead of Count Vectorizer; keep the paper's sentence→team allocation idea but implement with an entity-linking/NER pass (teams, players → canonical IDs).
2. **Per-team aggregate vectors:** sum/attention-weight sentence embeddings allocated to each team; add home-advantage scaling analog.
3. **Ensemble, not replacement:** feed text-model outcome probabilities as meta-features into a stacking classifier (XGBoost/RF) alongside GSE engine probabilities and de-vigged market probabilities — the paper proves the ensemble-only value (text alone lost to stats).
4. **Props extension:** same pipeline applied to player-level text (injury reports, rotation news) as features for prop/fantasy projections — directly tests gap #12's "beat-writer text embeddings for injury news."

## Reproducible test
1. Pull the released dataset (GuardianPreviewData, 1,770 games) + reconstruct Exp 1 protocol (train prior seasons, test 300 games/season, 2016–2019).
2. Rebuild Model 1 (count-vector + per-team aggregation + RF) and Model 4 (9-feature stacking RF).
3. Gate: reproduce Model 4 ≈ 63% accuracy and the ≥7pp ablation drop when text features are removed. If the ablation gap doesn't reproduce, the "text adds value" claim fails.
4. NFL pilot: 1 season of beat-writer previews → same stacking protocol vs GSE engine baseline; measure accuracy/CLV delta on moneyline + ATS.

## Numeric gate
**Model 4 accuracy 63.19% vs 59.11% (Dixon & Coles) — and the 7pp accuracy / 10% F1 drop when text features are ablated.** If the ablation gap doesn't reproduce on NFL data, the idea doesn't transfer.

## Improvement experiment
Replace Count Vectorizer with a pretrained sentence-embedding model and learnable team-allocation (attention over entities rather than the paper's hard allocation); run the same 3-experiment protocol on 3 NFL seasons of beat-writer text; primary metric: moneyline accuracy delta and CLV on the subset where the text model disagrees with the market (the "draws/longshots" analog — upsets where human context matters).

## Verdict
**ADAPT.** The ensemble architecture — entity-allocated per-team news vectors stacked with statistical and market probabilities — is directly usable for GSE's untested gap #12 (news text as features beyond the price). Do not adopt as-is: EPL-specific, weak 2020 NLP, and the random-split experiment has leakage risk. Modernize embeddings, adapt to NFL beat writers, and require the reproducible-test gate before production use.

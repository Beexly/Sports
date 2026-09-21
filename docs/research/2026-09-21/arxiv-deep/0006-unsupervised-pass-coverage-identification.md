# 0006 Unsupervised Identification of Pass Coverage (arXiv:1906.11373v3)

**Citation:** Rishav Dutta, Ronald Yurko, Samuel L. Ventura (2020). *Unsupervised Methods for the Identification of Pass Coverage in American Football*. arXiv:1906.11373v3. URL: https://arxiv.org/abs/1906.11373v3
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arXiv, v3; paper page dated April 16, 2020; also published in *Journal of Quantitative Analysis in Sports*, 16(2):143–161).
**Verdict:** ADAPT — a credible public, unsupervised baseline for labeling man/zone coverage responsibilities from tracking data; GSE should replicate it as a weak-labeler on modern data and upgrade it to a supervised, team-structure-aware classifier rather than adopt it as-is.

## 1. Research question
Can an unsupervised method classify the type of pass coverage a cornerback is playing (man vs. zone) on each pass play using only player tracking data, without hand-labeled coverage annotations? The paper argues that knowing coverage type is foundational for player evaluation (e.g., how well a cornerback defends the pass in man vs. zone schemes), and that existing tracking-based work either requires manual charting or treats coverage at a coarser level.

## 2. Dataset / schema
- **NFL Big Data Bowl inaugural tracking dataset** (released by the NFL, 2018/2019): first six weeks of the **2017 NFL season**.
- Schema: all 22 players plus the ball, sampled at **10 Hz**. Per frame per player: x and y coordinates with `0 ≤ x ≤ 120` and `0 ≤ y ≤ 58` (paper's stated coordinate bounds), plus speed, displacement, and direction `0 ≤ θ ≤ 360`.
- Play events include `ball-snap` and `pass-forward`, which the paper uses to define the observation window for each play.
- **Orientation data is unavailable** in this dataset (the authors explicitly note this; later Big Data Bowl releases include orientation).
- Sample sizes (exact, from the paper): **6,712 pass plays** and **16,316 feature vectors** (i.e., cornerback-play observations). Note: a related CMU project web page describes a similar effort with 91 games, 5,776 passing plays, and 15,483 cornerback observations; that is a related-but-separate project description and the paper's exact counts (6,712 / 16,316) are what count here.
- Access: the Big Data Bowl dataset was publicly released by the NFL (Kaggle); the paper's v3 predates the later seasons' releases. Exact code/data URL: Not stated in paper.

## 3. Method / model
- For each cornerback on each pass play, the paper builds a single feature vector summarizing that defender's trajectory and spacing relationships (features listed in §5, equations in §4) between the snap and the forward pass.
- The method is **unsupervised**: it fits **Gaussian mixture models (GMMs)** and uses **hierarchical clustering** to group the cornerback-play feature vectors into a small number of clusters.
- Clusters are then interpreted qualitatively as man-coverage or zone-coverage behaviors (e.g., a cluster whose members stay close to a single offensive player throughout the play is read as man; a cluster whose members hold landmark positions is read as zone).
- GMM soft assignments give **probabilistic coverage assignments** (posterior probability of each cluster per cornerback-play), which is the paper's main novelty over a hard charting call: a given defender-play gets a man-like vs. zone-like probability rather than a forced label.
- Model-selection details (number of mixture components, covariance structure, normalization/PCA before clustering, hierarchical linkage method) were not recoverable from the indexed full text of the version available to this ledger: **Not stated in paper** as far as this reading could recover. Do not adopt these details without re-reading the PDF.

## 4. Equations & assumptions
The paper's Table 1 defines the feature set computed per cornerback-play. Presented here as recovered from the full text, with transcription caveats noted below rather than silently repaired:

- `VAR_X`: variance of the cornerback's x coordinate over the observation window.
- `VAR_Y`: variance of the cornerback's y coordinate over the observation window.
- `SPEED_VAR`: variance of the cornerback's speed.
- `OFF_VAR`: variance in the distance to the cornerback's nearest offensive player.
- `DEF_VAR`: variance in the distance to the cornerback's nearest defensive player.
- `OFF_MEAN`: mean distance to the nearest offensive player.
- `DEF_MEAN`: mean distance to the nearest defensive player.
- `OFF_DIR_VAR`: variance of the direction difference between the cornerback and the nearest offensive player.
- `OFF_DIR_MEAN`: mean direction difference from the nearest offensive player.
- `RAT-MEAN`: mean of the ratio of (defender's distance to nearest offensive player) to (that offensive player's distance from its nearest defender).
- `RAT-VAR`: variance of that same ratio.
- The paper also summarizes the distance ratio at three landmarks: **snap, throw, and midpoint** of the play. Exact feature names for these three ratio summaries were not recovered from the indexed text: **Not stated in paper** as recoverable.

Qualitative expectations (paper's assumptions, not proven results):
- Ratio features should separate man from zone, because a man defender stays close to his assigned offensive player relative to all other defenders (low ratio), while a zone defender does not.
- Direction-difference features should be lower and more stable in man coverage (defender mirrors the receiver) than in zone (defender watches the quarterback / breaks differently).
- The GMM soft assignments are treated as coverage-type probabilities.

**Caveats on transcription:** search-extracted forms of the direction-difference and nearest-player definitions contain apparent typesetting/index mistakes (e.g., `j ∈ D` where the nearest *offensive* player is meant, and mixed `n`/`T` horizon notation). The semantic intent is unambiguous from the prose, but exact symbol-for-symbol forms should be re-checked against the PDF before any reimplementation.

Stated assumptions (paper): no labeled ground truth exists at scale, so cluster interpretation is qualitative; player orientation is unavailable and therefore unused; only cornerback-play observations are modeled (safeties/linebackers and team-level scheme structure are not jointly modeled).

## 5. Features / target
- **Inputs:** the Table 1 feature vector above (VAR_X, VAR_Y, SPEED_VAR, OFF_VAR, DEF_VAR, OFF_MEAN, DEF_MEAN, OFF_DIR_VAR, OFF_DIR_MEAN, RAT-MEAN, RAT-VAR, plus the snap/throw/midpoint ratio summaries) computed between snap and forward pass.
- **Target:** none in the supervised sense — unsupervised cluster assignment, interpreted post hoc as man vs. zone. The GMM posterior gives a per-observation probability of each coverage cluster.
- **Prediction horizon:** retrospective classification of a completed pass play (not a pre-play forecast).

## 6. Validation design
- Unsupervised; **no labeled ground-truth coverage calls exist for validation** (the paper's motivation is precisely that hand-charted coverage is unavailable at scale). Validation is qualitative: inspecting cluster members' trajectories and confirming they match intuitive man/zone behavior.
- Exact train/test or cross-fit protocol, normalization details, and any quantitative cluster-quality metric: **Not stated in paper** as recoverable from this reading.
- Splits are not time-ordered in any stated sense. No supervised baseline is compared.

## 7. Numerical results / baselines
- The paper does not report classification accuracy, AUC, or any supervised metric — there is no labeled baseline to beat. (Do not claim an accuracy number for this paper; none exists.)
- Reported exact quantities: 6,712 pass plays; 16,316 cornerback-play feature vectors; first six weeks of the 2017 NFL season; 10 Hz sampling.
- Cluster proportions and feature-influence statistics were not recovered from the indexed text: **Not stated in paper** as recoverable.
- The substantive result is the *method*: a reproducible, probabilistic man/zone labeler for cornerback plays from public tracking data.

## 8. Code / data availability
Data: NFL Big Data Bowl inaugural release (public, via Kaggle). Code link: **Not stated in paper** as recoverable from this reading.

## 9. Leakage & limitations
- **No ground truth, no validation:** qualitative cluster reading is the entire evaluation; a cluster can be *named* "man-like" without being man. Any downstream metric built on these labels inherits that uncertainty unquantified.
- **Cornerbacks only:** safeties, nickelbacks, and linebackers are excluded, so the method cannot recover team-level scheme (Cover 1/2/3/4, match rules); it is a per-defender behavior label, not a coverage call.
- **No orientation:** direction features use movement direction, not body heading; the authors note this limits what the model can see (modern data has orientation).
- **Stale, small window:** six weeks of 2017; coverage tendencies and offensive schemes have evolved (motion-heavy offenses, match coverage).
- **Window choice:** features are computed snap-to-throw; pre-snap alignment (the strongest signal of coverage intent) is unused.
- **Unsupervised fragility:** GMM/hierarchical-clustering solutions can be sensitive to normalization, K selection, and sample composition — none of which are documented in the recoverable text.
- External validity to NFL 2026: the behavior-level distinction (mirror vs. landmark) transfers, but absolute feature scales and cluster boundaries will not; re-fit on modern data with orientation.

## 10. GSE overlap
- **NGS comparison (required):** per the NGS metric glossary in `docs/research/2026-09-21/nextgenstats-profile/metric-glossary.md`, NGS claims to classify "every coverage defenders' responsibility and matchups on every dropback," but its coverage-classification architecture, features, and equations are **not publicly disclosed**. Existing-research-map review shows GSE already covers EPA/CPOE, calibration, state-space ratings, tracking metrics, and STRAIN — but no public, reproducible coverage-classification method. Paper 1 does not duplicate a published NGS method; it supplies the missing *public baseline* for the exact capability NGS keeps proprietary. This is a genuine gap-fill, not duplication.
- No existing GSE research builds a coverage-type weak-labeler from tracking data (existing map: 64 deeply covered papers; this ID is not among them).

## 11. GSE implementation spec
1. **Data:** nflverse tracking-style data (Big Data Bowl 2018–2025 releases, which include orientation) via the public Kaggle releases; restrict to pass plays with `ball-snap`/`pass-forward` events.
2. **Features:** reimplement Table 1 exactly, extended: add pre-snap alignment features (depth, leverage, distance to LOS), orientation-based direction features, and per-play role features for safeties/nickel (not just outside cornerbacks).
3. **Model:** fit GMM over standardized features; select K by BIC + stability across bootstrap re-fits; cross-check with agglomerative hierarchical clustering for robustness. Output posterior probabilities, not hard labels.
4. **Supervised upgrade path:** hand-label a stratified sample (or buy charting) and train a gradient-boosted classifier on the weak labels + pre-snap features; use the GMM posteriors as soft targets/priors.
5. **Serving:** batch job per season producing a `coverage_prob_man` table keyed by (gameId, playId, defenderId), consumed by cornerback matchup features (man-vs-zone splits) in the GSE player models.
6. **Effort estimate:** GSE inference only — this ledger does not commit to a number; a reasonable internal scoping would be a small multi-day build, but no estimate is stated here as fact.

## 12. Reproducible test
- **Dataset:** NFL Big Data Bowl 2018 (first public season with orientation) pass plays, weeks 1–6, cornerback-play observations.
- **Metric:** cluster stability — adjusted Rand index between GMM solutions fit on bootstrap resamples of the feature matrix; plus qualitative audit of 50 sampled plays per cluster (man-like vs. zone-like trajectory inspection by a football-knowledgeable reviewer).
- **Baseline to beat:** a two-feature k-means on (RAT-MEAN, OFF_DIR_VAR) alone. The full GMM must show strictly higher bootstrap ARI and cleaner audit separation than the baseline.
- **Window:** fixed dataset as above; report ARI distribution, not a single run.

## 13. Acceptance / rejection gate
- **ADOPT the weak labels** for downstream GSE features only if: bootstrap ARI of the GMM solution is ≥ 0.70 across ≥ 100 resamples, the qualitative audit agrees with cluster naming on ≥ 90% of 100 sampled plays, and the solution is stable when re-fit on a held-out season (2019 BDB).
- **REJECT** as a label source if ARI < 0.70, audit agreement < 90%, or the cluster structure collapses when orientation features are added (indicating the unsupervised structure was an artifact of the limited feature set).

## 14. Improvement experiment
Beyond the paper: build a **team-structure-aware coverage model** — a joint model over all 11 defenders' trajectories (graph or set-based encoder) that outputs both per-defender responsibility probabilities and a team scheme posterior (Cover 1/2/3/4, man-match), trained semi-supervised with the GMM posteriors as soft priors and a small hand-labeled set. Why it might win: coverage is a team concept; modeling defenders jointly with pre-snap alignment and orientation should resolve the paper's main failure mode (per-cornerback labels that are individually plausible but mutually inconsistent at the team level), and the scheme posterior is directly usable for GSE quarterback matchup features (e.g., expected coverage shell per play).

# [0770] Visualization of Unstructured Sports Data - An Example of Cricket Short Text Commentary (arXiv:2404.00030v1)

**Citation:** Swarup Ranjan Behera, Vijaya V Saradhi (2024). *Visualization of Unstructured Sports Data - An Example of Cricket Short Text Commentary*. IIT Guwahati. arXiv:2404.00030v1 (INFOVIS 2024 preprint). URL: https://arxiv.org/abs/2404.00030
**Ledger completed:** 2026-09-21. **Read:** full text (fetched PDF from https://arxiv.org/pdf/2404.00030v1, 8 pages two-column, converted to text and read end-to-end: abstract, §§1–7, Definitions 1–5, Algorithms, Tables 2/4, Figures 1/3–6, both validation studies).
**Verdict:** ADAPT — correspondence analysis (CA) on ball-by-ball short-text commentary to mine per-player strength/weakness *rules* ("Smith attacks leg-stump deliveries", "Smith gets beaten by away-swing") and cluster similar players via t-SNE on rule vectors is a directly portable NLP template for GSE: mine unstructured text (play-by-play descriptions, beat-writer reports, social posts) for matchup-relevant player tendency rules instead of relying only on structured box scores. Validated against expert video analysis (both Steve Smith rules match the domain expert) and train/test Procrustes stability. Replacement for blocked podium abstract 2207.00585.
**Replacement:** `replacement_source:"pool-reserve"`, `replacement_for:"2207.00585"`.

## 1. Research question
Can unstructured sports text — cricket short-text commentary (≤50 words per delivery) — be turned into computationally feasible, validated per-player strength and weakness *rules* and visualizations that augment structured box-score/tracking-based sports visualization?

## 2. Dataset / schema
- **Corpus:** 1,088,570 ball-by-ball short-text commentaries spanning international cricket careers; fixed filter tuple ⟨player, all opponents, entire career, batting/bowling⟩ per analysis.
- **Feature engineering:** unigrams/bigrams from commentary mapped to 19 batting features (response: attacked, beaten, defended, ...) × 12 bowling features (line/length: leg, slow, swing, moveAway, short, full, ...) → per-player *confrontation matrix* N (batting × bowling co-occurrence). 264 batsmen + 264 bowlers from 12 countries.
- **Access:** data, source code, and results for 500+ players stated as publicly available (links in paper).

## 3. Method / model
1. Build confrontation matrix N per player from commentary-derived features.
2. **Correspondence Analysis (CA):** SVD on the normalized, centered N → principal components F (batting) and G (bowling). Dependency of a batting–bowling pair captured by violation α of the independence axiom: P(bf ∩ wf) = α·P(bf)·P(wf); α=1 independent, α<1 dependent.
3. **Rule extraction:** for a batsman, strength rules from F_attacked: compute ⟨F_attacked, G_j⟩ for all bowling vectors; top-1/top-2 inner products = first/second strength rules. Weakness rules analogously from F_beaten. (Definitions 2–5 cover batsman/bowler × strength/weakness; max 228 rules/player = 19×12, 12+12 evaluated, 4 dominant presented.)
4. **Visualization:** contribution biplots (F/G first two dims) for individual players; per-player rule vectors (F_i, G_j) in 31-dim space → t-SNE → similar-strength / similar-weakness player clusters.

## 4. Equations & assumptions
(1) Rule: a (batting feature, bowling feature) pair with α ≠ 1, where P(bf∩wf) = α·P(bf)·P(wf). (2) Strength rule (batsman): batting feature = attacked; bowling partner = argmax_j ⟨F_attacked, G_j⟩. (3) Weakness rule (batsman): batting feature = beaten; argmax_j ⟨F_beaten, G_j⟩. (4) Bowler rules mirrored (strength = opponent beaten; weakness = opponent attacked). (5) CA: SVD of normalized centered N minimizes Σ squared distance of feature points to the reduced subspace.
Assumptions: commentary-derived unigram/bigram features faithfully encode delivery attributes and batsman response; CA's chi-square geometry suits discrete co-occurrence; inner-product ranking ≈ rule strength.

## 5. Features / target
19 batting-response features × 12 bowling-delivery features from text. Target: ranked strength/weakness rules per player + similar-player clusters.

## 6. Validation design
- **Expert validation:** Steve Smith's CA-derived rules vs domain-expert (Sanjay Manjrekar, ESPNCricinfo video 2017-06-01) ground truth — both rules match verbatim in substance.
- **Procrustes analysis:** last year of play held out as test; CA biplots on train vs test superimposed by least squares; sum of squared residuals Δ²₁₂ reported for 8 batsmen.

## 7. Numerical results / baselines
- Steve Smith: strength rules "(i) attacks deliveries bowled on the leg stump, (ii) attacks slow deliveries"; weakness rules "(i) beaten by swinging deliveries, (ii) beaten by move-away deliveries" — identical from computation and biplot; both agree with the expert video.
- Procrustes Δ²₁₂ (train/test biplot similarity, lower = better): Joe Root 0.09, Dimuth Karunaratne 0.11, Steve Smith 0.17, Cheteshwar Pujara 0.27, Dean Elgar 0.28, Virat Kohli 0.30, David Warner 0.47, Kane Williamson 0.47 — stable for most, weaker for Warner/Williamson.
- t-SNE clusters: batsmen attacking short-pitched balls (Warner, Collingwood), leg-line attackers (Smith, Kayes, Edwards), beaten-by-away-movement cluster.

## 8. Code / data availability
Data, source code, and results for 500+ players stated as publicly available (repository links in paper; verify the bit.ly links before citing).

## 9. Leakage & limitations
(i) Commentary features depend on commentator vocabulary consistency across years/venues — stylistic drift is an unstated confound; (ii) expert validation is n=1 player; (iii) Procrustes on 8 batsmen only, with two showing weak stability (0.47); (iv) biplot links in the fetched copy were shortened URLs — verify persistence; (v) 19×12 feature taxonomy is hand-built, not learned.

## 10. GSE overlap
New NLP-lane capability: GSE's text mining has focused on LLM forecasting and sentiment; nobody has mined *player tendency rules* from unstructured text. This ports to: (a) NFL play-by-play text descriptions → per-player tendency rules (e.g., "WR X beats press-man on go routes" via structured-feature confrontation matrices); (b) beat-writer/injury-report text → availability signals; (c) similar-player clustering for comp-based projections. Complements 0766 (proper scoring for LLM forecasters) — this is rule extraction, not forecasting.

## 11. GSE implementation spec
- **Tendency-rule miner v1:** build confrontation matrices from nflverse play descriptions: rows = offensive player response features (target depth, separation proxy, YAC bucket), columns = defensive features (coverage shell, blitz, press). Run CA per player-season (≥150 routes); extract top-2 "strength" (high-success) and "weakness" (low-success) rules as ⟨F, G_j⟩ argmax pairs.
- **Similar-player clustering:** t-SNE/UMAP on concatenated rule vectors for comp-based DFS/prop projections (find cheap comps with the same tendency profile).
- **Validation:** replicate the paper's two studies — expert check against 2–3 established scouting reports (e.g., a known analyst's player breakdown), Procrustes train/test (prior season vs current season) stability.
- Effort: ~1 week (CA is sklearn-decomposition TruncatedSVD on the standardized residuals; text features from existing nflverse descriptions).

## 12. Reproducible test
Dataset: 2022–2024 nflverse play-by-play descriptions for WRs with ≥150 routes/season. Build per-player-season confrontation matrices, CA rule extraction, Procrustes stability across seasons (expect Δ² comparable to paper's 0.09–0.30 band for stable veterans). Expert check: compare top rules for 3 WRs against published scouting reports. Success: ≥2/3 expert agreements and median Procrustes Δ² ≤ 0.35; then test whether weakness-rule matchups (WR weakness vs CB strength) predict target-share shortfalls.

## 13. Acceptance / rejection gate
ADAPT the CA rule-mining template now. ADOPT for matchup modeling only if cross-season Procrustes stability holds (median Δ² ≤ 0.35) and weakness-rule matchups predict target-share shortfalls out-of-sample; otherwise REJECT as a descriptive/visualization tool only.

## 14. Improvement experiment
Replace the hand-built 19×12 feature taxonomy with a learned one: run a domain-tuned LLM over the raw commentary to extract (delivery attribute, batsman response) pairs as structured tuples, then apply CA on the learned taxonomy. If the learned features reproduce the expert-validated Smith rules with equal or better Procrustes stability, the method generalizes beyond cricket without manual taxonomy engineering — the step needed for an NFL port.

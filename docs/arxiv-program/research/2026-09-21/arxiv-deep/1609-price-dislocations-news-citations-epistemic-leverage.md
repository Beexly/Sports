# [1609] Price Dislocations, News Citations, and Epistemic Leverage on Polymarket (arXiv:2609.06005)

**Citation:** Hazem Ibrahim, Yasir Zaki (2026). *Price Dislocations, News Citations, and Epistemic Leverage on Polymarket*. arXiv:2609.06005. URL: https://arxiv.org/abs/2609.06005
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org; ar5iv HTML unavailable).
**Verdict:** ADAPT — the flow-concentration dislocation detector and the realized price-impact cost model are directly portable to NFL prediction markets as a sharp/informed-flow sensor; the prominence-gating result reframes how GSE should weight market moves.

## 1. Research question
Three questions: (1) Are unusually large, concentrated-trading-driven price movements ("dislocations") on Polymarket followed by increased news citation of that market's odds? (2) When dislocations are cited, is selection associated with the size of the move, the market's liquidity (cost to move), or its prior prominence? (3) How does the estimated dollar cost of moving a market compare with the observed chance the move gets cited — formalized as "epistemic leverage," the dollars needed to move a market five points and have the move cited?

## 2. Dataset / schema
- **Market data:** 173.7 million signed Polymarket fills read directly from Polygon blockchain `OrderFilled` records (not the platform feed, which mislabels buy/sell direction), across 224,637 outcome-token records; catalog of 23,563 question-level markets with natural-language titles. Signed-direction validated against Akey et al. (2026) panel: 7,848 fills agreed, mean price difference 6.9×10⁻⁶.
- **News corpus:** 6,990 English articles mentioning prediction-market venues (GDELT venue-keyword search, 2024–2025); 1,826 candidate odds sentences → 1,582 genuine odds citations → 918 attributed to a specific market (905 Polymarket; Kalshi only 13, excluded).
- **Analysis sample:** 44,976 flow-concentrated dislocation events across 9,590 markets; 14,558-row market-week coupling panel (8,669 dislocation-weeks, 5,889 baseline weeks; 951 markets identify the within-market contrast). 2024 = discovery, 2025 = confirmatory.
- Access: aggregate event-study data + validation materials released; wallet-level and article-text records withheld.

## 3. Method / model
- **Dislocation detector:** ≥5 percentage-point price move backed by buying pressure in the top 10% of that market's own trailing 30-day distribution (heavy net buying for rises, heavy net selling for falls); adjacent qualifying intervals merged; events near resolution excluded.
- **Sentence-to-market matcher:** LLM (Claude Sonnet 5) pre-labels (1) does the sentence cite market odds, (2) is the retrieved market correct; retrieval ranks by shared words (rarity-weighted), event dates, named entities, probability values; human-validated (303-item blinded double-coded audit: odds-citation precision 0.987, Wilson [0.967, 0.995]; attribution precision 0.976, [0.945, 0.990]; inter-annotator Gwet AC1 0.962/0.933).
- **Citation coupling (self-controlled event study):** market-averaged log citation-rate ratio τcite = Σ_i w_i [log((A_d,i + c)/T_d,i) − log((A_0,i + c)/T_0,i)] / Σ_i w_i, with pseudocount c = 0.5, w_i = T_d,i + T_0,i; dislocation weeks vs. the same market's matched baseline weeks; significance via 1,000 calendar-preserving topic-week permutation shuffles.
- **Selection model (logistic):** logit Pr(Y_ie = 1) = α_c(i) + β_s Z(|Δp_ie|) + β_ℓ Z(log C_i(5)) + β_v Z(log V_i,pre), category fixed effects, market-clustered SEs, n = 16,236 events.
- **Realized price impact:** per token, on non-dislocation intervals with 1-hour buffer around events: Δp_it = α_i + λ_i q_it + ε_it (q = signed dollar flow); invert detectable positive slopes: C_i(5) = 0.05/λ_i, the dollars historically accompanying a 5pp move. Tokens restricted to 1,000–50,000 fills; 43% of 11,898 tokens have detectable positive impact.
- **Epistemic leverage:** L_g = median_{i∈g} C_i(5) / Pr(event cited within 7 days | g), by category or prominence quintile.

## 4. Equations & assumptions
- τcite = Σ_i w_i log[(A_d,i+c)/T_d,i] − log[(A_0,i+c)/T_0,i)] / Σ_i w_i; exp(τcite) = relative lift.
- logit Pr(Y=1) = α_c + β_s Z(|Δp|) + β_ℓ Z(log C(5)) + β_v Z(log V_pre).
- Δp_it = α_i + λ_i q_it + ε_it; C_i(5) = 0.05/λ_i.
- L_g = median C_i(5) / Pr(cited in 7d | g).
- Assumptions: share price = implied probability (price $0.62 = 62%); signed flow from blockchain records is correct; dislocation = measurement label, not manipulation; linear local price impact; matcher errors wash out in self-controlled comparisons; pseudocount c = 0.5.

## 5. Features / target
Selection model inputs: |Δp| (move size in pp), C_i(5) (flow-implied 5pp move cost), V_i,pre (prior dollar volume / prominence), category fixed effects. Target: binary citation within 3 days of dislocation. Coupling analysis target: within-corpus citation-intensity ratio (fraction of candidate articles about the topic that cite the market's odds).

## 6. Validation design
Pre-registered analysis plan (written documents released verbatim): 756-cell specification grid (thresholds {5,10}pp × horizons {1,3,7}d × 3 outcome forms × raw/purged controls); seven-cell primary family with Benjamini–Hochberg FDR; 2024 discovery / 2025 confirmatory split with a formal replication rule (concordant sign + confirmatory BH q < 0.05). Robustness: binary outcome (p = 0.001), Poisson count with exposure offset (IRR 2.48, p = 0.003), negative binomial (2.55, p = 0.003), pseudocount sweep {0.1, 0.25, 0.5, 1.0} (τcite 0.270–0.324), matched-market controls (contrast 0.434, p = 0.001, 242 pairs), focal-article purge, same-day-citation exclusion (τcite = 0.239, p = 0.001; 74% of first citations follow the dislocation).

## 7. Numerical results / baselines
- **Coupling:** τcite = 0.283, permutation p = 0.001 → citation rate ~exp(0.283) ≈ 1.33× (one-third higher) in the 3 days after a dislocation vs. the market's own baseline. Four of seven categories replicate 2024→2025: Sports (pooled +0.713), Politics (+0.379), Finance (+0.350), Crypto (+0.076); Culture/Weather null; Tech sign-flips (not a replication).
- **Selection:** standardized β — prominence (log $ volume) 0.610 (SE 0.117, p < 10⁻⁴) > liquidity cost 0.301 (SE 0.085, p = 4×10⁻⁴) > move size 0.159 (SE 0.056, p = 0.005). Authors' pre-registered salience > liquidity hypothesis was rejected.
- **Movement cost:** median $21,773 per 5pp move ($43,547 per 10pp) among detectable tokens; category medians $6,800 (Culture) to $110,183 (Sports).
- **Epistemic leverage:** $0.7–1.0M across prominence quintiles (cost rises 11× from $5,171 to $56,927 while citation rate rises 12.5× from 0.55% to 6.93%; cross-quintile spread 1.49×, 95% CI [1.32, 4.37]); by category $293k (Culture) to $5.58M (Sports) — ~19× spread. Only ~1.4% of dislocation events cited within 7 days.
- Paper's stated boundary: association, not causation — shared news shocks cannot be ruled out.

## 8. Code / data availability
Replication repository: https://github.com/hazemibrahim97/epistemic-leverage-replication — aggregate event-study data, 756-cell result grid, annotation instructions, gold-set judgments, pre-analysis plan. No raw article text or wallet-level records.

## 9. Leakage & limitations
- **Observational:** a shared event (injury, poll, ruling) can move both prices and coverage; matched-market and permutation designs attenuate but cannot remove this.
- **Impact detectability:** only 43% of tokens have a resolvable positive λ; cost figures condition on this selected subset (deep markets may show no detectable impact yet be expensive to move).
- **Corpus bias:** English-only GDELT venue-keyword corpus; paywalls, dead links, syndication; matcher audit bounds precision, not recall.
- **Temporal replication only:** 2024→2025 split is inside one fast-changing platform ecosystem, not cross-country or cross-media-system.
- External validity to NFL: sports dislocations replicate (sports cell strongest), but NFL-specific market structure and the 2026 newsroom data partnerships postdate the window.

## 10. GSE overlap
Per `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`, GSE tracks line movement/steam and beat-the-close but has no flow-concentration or informed-trade detector in its corpus; the prediction-market lane has Polymarket/Kalshi tooling but nothing linking signed flow to price impact. This is an **extension**: the first calibrated "how many dollars moved this line" impact model in the corpus, plus a validated sentence→market attribution pipeline reusable for GSE's own media-monitoring.

## 11. GSE implementation spec
1. **Data:** Polymarket/Kalshi NFL market signed trades (blockchain fills or venue trade feed with direction); GSE's own odds-history DB (The Odds API captures) for sportsbook lines.
2. **Dislocation detector:** ≥5pp implied-probability move with signed dollar flow in the top decile of the market's trailing 30-day distribution; merge adjacent intervals; exclude 48h pre-resolution.
3. **Impact model:** per-market regression Δp = α + λq on non-event intervals → C(5) = 0.05/λ: the "cost to move this NFL market 5 points." Track weekly.
4. **Signal:** flag dislocations in NFL markets as candidate sharp/informed flow; weight by 1/C(5) (cheap-to-move moves get downweighted) and by whether the move persists vs. reverts.
5. **Media layer (optional):** reuse the sentence→market matcher design to attribute X/news odds citations to specific GSE-tracked markets, replicating the paper's prominence analysis for NFL narratives.
6. **Effort:** ~1 week for detector + impact model on one season of Polymarket NFL data; media matcher is a second sprint.

## 12. Reproducible test
Dataset: Polymarket 2025 NFL season markets, signed trades. Metric: replicate the impact census — fraction of tokens with detectable positive λ and median C(5). Baseline to match: paper's 43% detectability and ~$21.8k median 5pp cost (pooled across categories). Pass if GSE's NFL-only estimates land within 2× of the paper's sports-category figures and the dislocation detector fires on ≥80% of known sharp-steam games (from GSE's existing steam log).

## 13. Acceptance / rejection gate
**Adopt** the dislocation + impact pipeline as GSE's sharp-flow sensor if, on 2025 NFL Polymarket data, dislocations flagged by the detector predict next-day line direction (sportsbook consensus move) with hit rate ≥55% over ≥200 events (binomial p < 0.05 vs. 50%). **Reject** if the hit rate is indistinguishable from coin-flip or if fewer than 25% of NFL tokens yield detectable impact coefficients (too thin to calibrate).

## 14. Improvement experiment
Condition the impact model on direction and time-to-resolution: estimate λ separately for buys vs. sells and in pre-game vs. in-play regimes. The paper's pooled linear λ likely understates informed-buy impact near close (when market makers widen). If buy-side λ steepens within 6h of kickoff, GSE gets a "late sharp money" intensity score — exactly the signal that predicts closing-line moves — which the paper's design never isolates.

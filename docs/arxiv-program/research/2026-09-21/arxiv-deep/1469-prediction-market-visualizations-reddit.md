# [1469] Prediction market visualizations, betting, and uncertainty: A study of Reddit Posts and Comments (arXiv:2608.16814v1)

**Citation:** Sah, S., Karduni, A., Markant, D., & Dou, W. (2026). *Prediction market visualizations, betting, and uncertainty: A study of Reddit Posts and Comments*. arXiv:2608.16814v1. URL: https://arxiv.org/abs/2608.16814
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** ADAPT — a qualitative study of ~12,000 r/Kalshi posts / 96,000 comments showing exactly how retail bettors misread prediction-market visualizations (confusing price, probability, payout, cash-out value, liquidity, and settlement source); transfers to GSE as concrete calibrated-uncertainty UI rules: label price vs model probability explicitly, show liquidity/source/resolution rules, and pair charts with context.

## 1. Research question
How do retail prediction-market participants actually interpret market visualizations (price charts, order books, probability displays) — what do they understand, what confusions drive bad decisions, and what design failures recur? Studied via thematic analysis of r/Kalshi posts and comments.

## 2. Dataset / schema
Corpus: ~12,000 posts and ~96,000 comments from r/Kalshi; 5,600 posts contained visual media; a VLM filter yielded 360 visualization-related posts; thematic findings are based on 66 annotated snippets (codes non-exclusive). One platform, one community. No behavioral/trading outcome data — interpretations only.

## 3. Method / model
Qualitative thematic analysis: VLM-assisted filtering of visualization posts, manual open coding, theme prevalence counts. No predictive model, no controlled experiment, no statistical inference beyond code frequencies.

## 4. Equations & assumptions
No equations stated. Assumptions: (1) public Reddit comments reflect genuine user confusion (not performance/posturing); (2) the r/Kalshi community is informative about retail prediction-market users generally; (3) the 66 annotated snippets saturate the theme space.

## 5. Features / target
N/A (qualitative). "Targets" are the emergent themes: chart sensemaking (35 snippets), chart-value interpretation (32), external context (22), outside domain knowledge (18), decision reactions (17), probability comprehension (11), skepticism/credibility (11), visualization usability (9).

## 6. Validation design
No validation in the quantitative sense. Credibility rests on the coding process and snippet exemplars. Single-community, single-platform scope.

## 7. Numerical results / baselines
Theme prevalence (of 66 snippets, non-exclusive): chart sensemaking 35; chart-value interpretation 32; external context 22; outside domain knowledge 18; decision reactions 17; probability comprehension 11; skepticism/credibility 11; visualization usability 9. Core empirical finding: users systematically confuse market price with probability, payout with expected value, current cash-out quotes with settlement value, and ignore liquidity and the settlement data source.

## 8. Code / data availability
None stated. Reddit corpus collectible via public APIs.

## 9. Leakage & limitations
- One platform (Kalshi) and one community (r/Kalshi) — the most analytically engaged retail bettors, not representative of casual users.
- Public comments ≠ actual behavior; no trading records link confusion to losses.
- No predictive model or controlled outcome study — findings are descriptive.
- 66 snippets is a thin base for generalizing "how users read charts."
- Crypto/polymarket-style AMM users may confuse different things.

## 10. GSE overlap
Per `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`, GSE's market-microstructure/CLV lane covers line movement and market-implied probabilities, but no existing ledger covers how end users interpret probability visualizations. This is a new capability adjacent to the product: GSE publishes picks with probabilities on X and the website — misread probability displays directly cost follower trust.

## 11. GSE implementation spec
- Apply as UI/display rules for GSE's posted picks and website: (a) always label "model probability" vs "market-implied probability" vs "price" as three distinct numbers; (b) show the line source, timestamp, and liquidity caveat next to any market number; (c) state settlement/resolution rules for any prop or contest; (d) pair every probability chart with a one-line plain-language context ("this means the model thinks X wins ~3 times in 10").
- Effort: ~2 days (copy/display template changes, no modeling).

## 12. Reproducible test
A/B test on GSE's X/website posts: posts with the labeled probability display vs current format. Metric: follower confusion proxies — reply-question rate about "what does this mean", plus click-through on the pick card. Window: 4 weeks of NFL content.

## 13. Acceptance / rejection gate
ADOPT the display rules if the labeled format reduces clarification-question replies by ≥25% vs control with no drop in engagement rate. Reject if the extra labels reduce engagement (clutter cost exceeds comprehension gain).

## 14. Improvement experiment
Run the same thematic coding on replies to GSE's own posted pick cards (a corpus Garrett already owns) to build a GSE-specific confusion taxonomy — then the display rules are tuned to his actual audience rather than r/Kalshi's.

# [1738] Evaluating Betting Odds and Free Coupons Using Desirability (arXiv:1901.03645)

**Citation:** Nawapon Nakharutai, Camila C. S. Caiado, Matthias C. M. Troffaes (2019, Durham University). *Evaluating Betting Odds and Free Coupons Using Desirability*. arXiv:1901.03645. URL: https://arxiv.org/abs/1901.03645
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML converted to text, 14,603 words).
**Verdict:** ADAPT — the desirability/LP sure-loss check (Theorems 5–6: avoid sure loss ⟺ Σ b_i/(a_i+b_i) ≥ 1; free-coupon exploitation via Choquet natural extension + complementary slackness) with the worked UK football example (odds 3/4, 13/5, 16/5 summing to 1.087; £5 free-coupon sure-gain construction) gives GSE an exact cross-book arbitrage scanner and a promo-exploitation evaluator; implement the LP check directly on The Odds API multi-book snapshots.

## 1. Research question
In the UK football betting market, bookmakers offer free coupons (free stakes) to new customers. Can a customer combine ordinary fractional odds with free coupons across one or several bookmakers to lock in a *sure gain*, and can the bookmaker check in advance whether its odds+coupon menu allows this? The paper models odds and coupons as a set of desirable gambles (imprecise-probability framework) and answers both questions via the natural extension — computed by Choquet integral or linear programming — using complementary slackness to extract the optimal exploiting bet combination.

## 2. Dataset / schema
No large dataset. **Worked examples on actual market odds:** Example 1 — a bookmaker's real football odds W 3/4, D 13/5, L 16/5 (implied sum 4/7 + 5/18 + 5/21 = 1.087 ≥ 1, avoids sure loss). Example 2 — multiple bookmakers' odds (avoids sure loss; recovers the known result that picking maximal odds per outcome is optimal). Examples 3–4 — "Forest" bookmaker offer: customer bets £5 at 13/5 on D, receives a £5 free coupon; the coupon spent on a single other outcome creates a sure gain; Tables 1–3 give the modified odds ((3·5/4)/5, 13/5, 16/5) and the payoff matrix (e.g., coupon on L pays −£16 to the bookmaker if L occurs). Euro 2016 outright example (France 9/2) illustrates fractional-odds mechanics.

## 3. Method / model
- Odds a_i/b_i on outcome ω_i as desirable gambles g_i(ω) = −a_i if ω=ω_i else b_i (bookmaker's perspective); lower prevision P(g_i) and upper probability mass p̄(ω_i) = b_i/(a_i+b_i).
- **Avoiding sure loss (Theorems 1, 5, 6):** a single bookmaker's odds avoid sure loss ⟺ Σ_i b_i/(a_i+b_i) ≥ 1 (the familiar overround condition, re-derived); across m bookmakers, the condition uses each outcome's maximal odds — recovering the "pick the best odds per outcome" rule.
- **Free coupons:** a coupon of value v on outcome ω_j modifies the gamble (stake-free payoff −a_j·b_i/b_j in the bookmaker's loss column); check sure loss via the natural extension, computed by the Choquet integral or equivalently by LP (optimal value = natural extension).
- **Exploitation:** if sure loss is *not* avoided, complementary slackness on the LP identifies the exact bet combination achieving the best guaranteed gain.

## 4. Equations & assumptions
- Gamble: g_i(ω) = −a_i if ω = ω_i, else b_i (Eq. 26).
- Desirability ⟺ upper bound: Σ_ω g_i(ω)p(ω) ≥ 0 ⟺ b_i/(a_i+b_i) ≥ p(ω_i) (Eqs. 27–30).
- Upper probability mass: p̄(ω_i) ≔ b_i/(a_i+b_i) (Eq. 31).
- Sure-loss check: Σ_i b_i/(a_i+b_i) ≥ 1 (Theorems 1, 5); multi-book version with per-outcome maximal odds (Theorem 6).
- Natural extension via Choquet integral; LP dual + complementary slackness yields the optimal exploiting portfolio.
- Free-coupon gamble: coupon value b_i on outcome ω_j ≠ ω_i; bookmaker loss a_j·b_i/b_j if ω_j occurs, 0 otherwise (Tables 2–3).
- Assumptions: finite outcome set; single customer (no cooperation between customers — contrasted with Emiliano 2013); fractional fixed odds; free coupon must be spent on a single outcome different from the qualifying bet; rationality axioms D1–D4 for desirability.

## 5. Features / target
Features: per-bookmaker fractional odds a_i/b_i per outcome; free-coupon values and terms (qualifying stake, single-outcome restriction). Target: binary — does the odds+coupon menu avoid sure loss? If not, the optimal guaranteed-gain bet vector (stakes per outcome per bookmaker).

## 6. Validation design
Worked examples only: (i) single-book real odds — avoids sure loss (sum 1.087); (ii) multi-book — avoids sure loss, best-odds-per-outcome optimal; (iii–iv) Forest £5 coupon — sure gain exists, optimal combination derived. No statistical validation, no backtest, no baseline comparison (it's a decision procedure, not a predictor).

## 7. Numerical results / baselines
- Example 1: 4/(3+4) + 5/(13+5) + 5/(16+5) = 1.087 ≥ 1 → avoids sure loss; customer cannot force a sure gain on odds alone.
- Example 2 (multi-book): avoids sure loss; optimal customer strategy = take maximal odds on each outcome (known result recovered).
- Examples 3–4 (Forest): £5 qualifying bet at 13/5 on D + £5 free coupon on a single other outcome → sure gain for the customer; payoff table shows bookmaker losses up to £16 on the coupon leg.
- No error bars or baselines (analytic results).

## 8. Code / data availability
None stated — no public code or data artifact identified.

## 9. Leakage & limitations
- Single-customer, no-cooperation assumption; real promo exploitation is often syndicated.
- UK fractional fixed-odds framing; US decimal/American odds need conversion (trivial) but the coupon *terms* (rollover, minimum odds, expiry) of modern promos are richer than the paper's single-outcome coupon.
- No account-limitation modeling: books limit or ban arbers — the paper's "sure gain" ignores execution risk.
- The examples are illustrative, not a market-wide scan; no estimate of how often real menus fail the sure-loss check.
- Desirability/LP machinery is heavier than needed for the plain-odds case (Σ implied ≥ 1 is textbook); its value-add is the coupon/terms extension.

## 10. GSE overlap
Existing map: market microstructure lane covers cross-book concepts implicitly; the devig/parlay build spec (docs/ops/2026-08-21-BUILD-SPECS-devig-parlay.md) manipulates overrounds but the repo has no sure-loss/arb scanner and no promo-valuation logic. This paper is a new capability on both fronts: (a) an exact multi-book sure-loss LP check (stronger than naive best-odds-sum because it handles coupon terms), (b) a quantitative promo-exploitation evaluator. Extension, not duplicate.

## 11. GSE implementation spec
- **Cross-book arb scanner:** on each The Odds API snapshot, convert all books' American odds to fractional a_i/b_i, build the LP (variables = stakes per outcome per book; constraints = non-negative guaranteed profit), and flag menus failing the sure-loss check. This generalizes the naive Σ 1/odds < 1 arb test to books with different rules/terms.
- **Promo evaluator:** encode sportsbook promo terms (bonus bets, profit boosts, "bet £X get £Y") as coupon gambles per the paper's construction; run the natural-extension LP to compute the maximum guaranteed extraction value per promo — a dollar value for each offer, updated as odds move.
- Effort: ~1 week (LP via scipy; odds ingestion already exists).

## 12. Reproducible test
Dataset: The Odds API NFL snapshots, 2 weeks of 2025 season, all books. Metric: number of snapshots failing the multi-book sure-loss check (Theorem 6) and the guaranteed profit of the LP-optimal portfolio at typical $100 stakes. Baseline: naive best-odds-per-outcome sum < 1 test. Pass if the LP check finds ≥20% more exploitable snapshots than the naive test (i.e., the coupon/terms machinery adds real detections) OR reproduces the naive detections exactly (correctness check).

## 13. Acceptance / rejection gate
ADAPT is confirmed if, on the 2-week sample, the LP scanner (a) reproduces every naive-arb detection (correctness) and (b) the promo evaluator assigns positive extraction value to at least 3 real sportsbook promos with terms encodable in the framework. REJECT the desirability machinery (keep the naive Σ test) if the LP finds nothing beyond the naive test on plain odds and no current promo terms fit the single-coupon model — then the paper's added generality has no live application.

## 14. Improvement experiment
Extend to *correlated* outcomes (same-game parlays): the paper assumes mutually exclusive outcomes in one market. Build the sure-loss LP over SGP outcome lattices (e.g., Mahomes 300+ yards AND Chiefs win) using the paper's gamble formalism with joint-outcome variables. Test whether SGP menus fail sure loss more often than single markets — hypothesis: books' SGP pricing (often boosted as promos) contains more exploitable structure, and the LP would quantify exactly how much.

**Verdict:** ADAPT — the desirability/LP sure-loss check with free-coupon exploitation (worked UK football example: 1.087 overround avoids sure loss; £5 coupon creates a sure gain) gives GSE an exact cross-book arb scanner and promo evaluator; implement the LP directly on multi-book snapshots.

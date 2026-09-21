# [1445] The Favorite–Longshot Bias in Prediction Markets: Evidence from Polymarket (arXiv:2609.12878)

**Citation:** Marcos Cardozo and José Ignacio Rivero-Wildemauwe (2026). *The Favorite–Longshot Bias in Prediction Markets: Evidence from Polymarket*. arXiv:2609.12878v1 [econ.GN]. URL: https://arxiv.org/abs/2609.12878
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, 51 pages, converted via pdftotext; main text Sections 1–8 + appendices A–E).
**Verdict:** ADAPT — import the FLB aggregation methodology (aggregation-unit sensitivity, two-sided tail returns) and the category-level finding that **Sports shows no two-sided FLB** into GSE's market-efficiency and CLV analytics: use it as a hard audit on GSE's own de-vigged probability surfaces, and adopt the wallet-level "recurrent tail demand ≠ disproportionate losses" result to size GSE's longshot-prop pricing cautiously.

## 1. Research question
Does the favorite–longshot bias (FLB) — low-priced bets earning lower average returns than high-priced bets — hold in modern prediction markets (Polymarket), how does the measured return depend on how contracts are grouped and weighted, does it vary by category, and do recurrent longshot/favorite buyers bear a disproportionate share of the losses/gains?

## 2. Dataset / schema
Polymarket Users dataset v1.3 (Grégoire, 2026; Hugging Face vgregoire/polymarket-users, CC-BY 4.0): **~588 million trades by 2.48 million wallets, Nov 2022–Mar 2026**; 729,133 child markets in 316,429 parent events. Schema per trade: timestamp, market/token, price, quantity, buyer wallet, seller wallet, maker/taker flag; per market: wording, category (Sports/Crypto/Finance/Politics/Tech/Culture/Weather/Untagged), parent event, open/close dates, winning token. Analysis sample after screens (valid quantity/price, two-outcome, buyer counterparty-HHI < 0.5 wash-trade filter, resolved by 2026-03-29): 560.9M purchases, $22.49B paid. Public dataset, fully replicable.

## 3. Method / model
Return per purchase: r_f = (y_f − p_f)/p_f where y_f ∈ {0,1} is terminal payoff, p_f price paid (eq. 1) — hold-to-resolution convention. Three aggregation schemes: (i) **equal child-market weights** — return computed per child market (dollar-weighted within market), averaged equally (eqs. 2–3); (ii) **pooled purchases** — single dollar-weighted return across all purchases (eq. 4); (iii) **equal parent-event weights** — purchases pooled within each parent event, then events averaged equally (eqs. 6–7). Probability error (eq. 5): token-weighted payoff-minus-price, in percentage points. Tails: longshots p < 0.10, favorites p ≥ 0.90 (sensitivity at 5/95, 15/85, 20/80 in Appendix A.1). Wallet classification: per month, regress six-month tail purchase share on activity/category covariates, rank by residual, top decile = longshot/favorite groups; next-month purchases evaluated. Confidence intervals clustered by parent event throughout.

## 4. Equations & assumptions
- r_f = (y_f q_f − p_f q_f)/(p_f q_f) = (y_f − p_f)/p_f. R_mT = Σ_{f∈F_mT} q_f(y_f−p_f)/Σ p_f q_f; RTO = (1/|M_T|) Σ R_mT; pooled RTD = Σ_m Σ_f q_f(y_f−p_f)/Σ_m Σ_f p_f q_f; R_gT and RTP analogous at event level.
- Probability error E(A) = Σ q_f y_f/Σ q_f − Σ q_f p_f/Σ q_f.
- Assumptions: (1) hold-to-resolution convention (actual sale timing ignored for return calculation); (2) wallets ≠ people (one person may use several wallets and vice versa); (3) wash-trade filter via counterparty-HHI ≥ 0.5 exclusion; (4) returns exclude trading fees and liquidity rebates; (5) resolution coverage declines near sample end (markets must have resolved by cutoff).

## 5. Features / target
Target: terminal return per purchase and token-weighted probability error, separately for longshot (p<0.10) and favorite (p≥0.90) tails. Cuts: category, previous trading volume (4 groups), buyer action (posted offer vs accepted), reported-fee flag, shared-collateral flag, wallet experience quintile, wallet tail-demand decile.

## 6. Validation design
Descriptive causal-free design: tail returns under three aggregation schemes; category splits; trading-condition splits (previous trading, maker vs taker, fee flag, shared collateral); wallet-level persistence analysis (six-month classification → next-month behavior); within-market-week-price-bucket matched comparisons across experience groups; sensitivity appendices (cutoffs 5/95–20/80, endpoint exclusions, closing-date restrictions, common-sample short-horizon returns). All intervals parent-event-clustered.

## 7. Numerical results / baselines
Quoted exactly:
- Equal child-market weights: longshots **−6.30%** [−8.38, −4.22]%; favorites **+0.277%** [0.242, 0.312]%.
- Pooled purchases: longshots **−19.35%** [−46.99, +8.30]% (CI includes zero); favorites **+0.83%** [0.60, 1.07]%.
- Equal parent-event weights: longshots **+4.09%** [1.29, 6.90]%; favorites **+0.392%** [0.345, 0.440]%.
- Decomposition (Table 7): equal child→equal parent+child weight: **+10.329 pp** (events with more child markets have lower longshot returns); pooling within events: +0.063 pp; weighting events by longshot dollars: **−23.440 pp** (spending concentrates in low-return events).
- By category (equal child-market weights): Crypto −14.84% / Politics −16.34% longshot losses (all CIs exclude zero; two-sided); **Sports +2.43% [−0.93, 5.79]% longshots and −0.230% favorites — no two-sided FLB**; Sports pooled: longshots +18.11% [−74.68, 110.91]%, favorites +0.137%. Weather: −25.15% equal-weight vs +24.74% pooled (sign flips).
- Wallet level: top longshot-demand decile supplies 26.6% of next-month longshot dollars; their return **−21.96%** vs −20.33% for others; share of gross longshot losses 22.6% < share of spending. Favorite decile: 15.1% of dollars, return +0.25% vs +0.88% for others, only 4.8% of aggregate net gain.
- Experience: all five experience groups lose on longshots (−38.34 to −21.55%); most-experienced earn within-comparison +0.83 pp [0.22, 1.44] pp above group averages (relative, not positive absolute).
- Robustness: losses persist after substantial previous trading (most-traded group −28.72%), via posted offers (−17.56% pooled) and accepted offers (−22.17%), with no reported fee (−20.78%), and with shared collateral (−25.76%).
- Short-horizon check: posted-offer longshot purchases gain +3.92/+16.91/+7.56% at 5 min/1 h/1 day, then fall to −17.56% at resolution — losses arise at resolution, not from stale posted prices.

## 8. Code / data availability
Data: Polymarket Users v1.3, Hugging Face `vgregoire/polymarket-users`, commit 91ddb961b090de18fd79e79edd8fa15f36ca11b9, CC-BY 4.0. Code: not stated.

## 9. Leakage & limitations
- Returns are hypothetical (hold-to-resolution); actual realized PnL differs when traders sell early. The authors are explicit about this, but GSE must not misread −19.35% as a tradable short-longshot edge — interim transaction prices were *above* purchase cost shortly after trades (+3.92% at 5 min).
- Sports longshot pooled CI is enormous ([−74.68, 110.91]%) — the "Sports is positive" claim rests more on the equal-child-market estimate; small-dollar concentration means longshot returns there are noisy.
- Coverage declines near sample end; recent-purchase returns describe only fast-resolving markets.
- Cross-sectional comparisons (fees, collateral) are descriptive, not causal; different events, not before/after.
- No NFL/betting-exchange (Betfair) data — sportsbook-style odds (esp. NFL spreads) may differ from Polymarket price tails. The "Sports" category here is dominated by match-winner markets, not point spreads.

## 10. GSE overlap
GSE's existing market-microstructure work (closing-line value, de-vigged consensus, beat-the-close, market-implied ratings — existing-research map) and the prediction-market triage docs (Polymarket/Kalshi tooling, 2026-09-18) cover the same territory, but no existing read measures FLB at the tail with aggregation-unit sensitivity. NEW for GSE: (a) the methodological result that aggregation unit determines the *sign* of longshot returns — directly applicable to auditing GSE's own de-vigged probability surfaces (market-level vs event-level vs dollar-weighted FLB checks); (b) the empirical fact that **Sports lacks the two-sided FLB** — a caution against importing generic FLB-based corrections (e.g., Snowberg-Wolfers-style probability adjustments) into GSE's NFL moneyline modeling; (c) the wallet-level finding that recurrent tail demand does not identify disproportionate loss-bearers — relevant to GSE's props/ensemble customer-behavior modeling.

## 11. GSE implementation spec
1. Replicate the three aggregation schemes on GSE's odds-API captures (The Odds API / OddsPapi): compute de-vigged implied probabilities for NFL moneylines; bin into longshot/favorite tails; compute hold-to-resolution returns per market (equal-market, dollar-weighted, and per-week-grouped event weights).
2. Test the two-sided FLB hypothesis on NFL moneylines 2021–2025 with the same three aggregations; compare tail returns against de-vigged model probabilities (GSE engine) — if GSE's probabilities show the same "probability error small, return large" amplification at low prices, hard-cap longshot stake sizing or apply probability-error-based calibration there.
3. Run the wallet-level analogue on any account-level data GSE can access (or simulate via public copy-trade leaderboards): identify recurrent longshot takers; test whether their share of losses exceeds their share of volume.
4. Effort: 2–3 days with existing odds captures + nflverse outcomes.

## 12. Reproducible test
Dataset: The Odds API historical NFL moneylines (2021–2025 seasons) + nflverse outcomes. For each game, de-vig moneylines to probabilities; classify implied p < 0.10 as longshots, p ≥ 0.90 as favorites; compute hold-to-resolution return under the three aggregation schemes (equal game, dollar-equal-stake pooled, equal week). Report point estimates + parent-event-analogue (week-clustered) CIs. Success criterion for "FLB present in NFL moneylines": longshot return < 0 and favorite return > 0 under BOTH primary aggregations.

## 13. Acceptance / rejection gate
ADOPT the FLB audit as a standing GSE check if the replication finds a statistically significant two-sided pattern (week-clustered CI excluding zero) under at least the equal-market aggregation — then build a tail-specific calibration correction for GSE's moneyline probabilities. REJECT a longshot-correction feature if NFL moneylines show the paper's Sports-category result (positive longshot returns or non-positive favorite returns) — i.e., no mechanical FLB correction applied to NFL prices; the paper's Sports evidence argues against it.

## 14. Improvement experiment
The paper measures hold-to-resolution returns but only snapshots interim prices for the outdated-offer check. GSE should run the *full price-path* version on NFL in-play or pre-game steam: at each 5-minute snapshot after a longshot bet is placed, value the position at the best available line and decompose the terminal loss into (a) adverse interim price movement vs (b) resolution outcome — the paper's Figure-3 result (interim gains, resolution losses) suggests the FLB loss is an *outcome* phenomenon rather than an entry-pricing one, which would mean GSE's edge comes from modeling outcome tails, not from finding "better" longshot prices.

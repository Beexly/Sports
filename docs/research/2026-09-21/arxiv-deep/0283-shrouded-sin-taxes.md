# [0283] Shrouded Sin Taxes (arXiv:2409.01493v1)

**Citation:** Kasinger, J. (2024). *Shrouded Sin Taxes*. arXiv:2409.01493v1. URL: https://arxiv.org/abs/2409.01493v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 6152 lines; empirical sections read in full, theoretical model skimmed).
**Verdict:** ADAPT — an economics/policy paper, not a prediction method, but it delivers two GSE-usable assets: a clean overround-based "betting price" measurement pipeline from scraped odds, and hard evidence that posted prices ≠ effective prices (vig shrouding) — directly relevant to GSE's de-vig and CLV accounting.

## 1. Research question
Does strategic shrouding of a corrective sin tax by profit-maximizing bookmakers (excluding the tax from posted odds) impair the tax's effectiveness? Using the July 2012 German 5%-on-turnover sports betting tax as a quasi-experiment, the paper estimates the causal pass-through of the tax to consumer betting prices and its heterogeneity across firms' shrouding practices.

## 2. Dataset / schema
- Odds: oddsportal.com scrape + Tipico direct scrape — 68 online betting agencies (55 unique brands, incl. country-specific domains), >80,000 events, 16 leagues, 6 countries, 5 sports, 2008–2018; pre-match closing odds per outcome per event, plus result, date, league, country, sport.
- "Betting price" p_ib: overround-derived implicit price — average 0.0706 (≈7.06% bookmaker margin per € wagered); soccer mean 0.0734. Prices smaller in higher leagues; decreasing trend after 2013.
- Shrouding classification: manual audit of agencies' betting slips — (i) no deduction (2 of 10 German-targeting agencies, 24,351 obs), (ii) 5% deduction from winnings (143,842 obs), (iii) 5% deduction from wager/stake (47,068 obs). Six agencies adopted shrouding within 6 months of reform; all kept the policy.
- Auxiliary: Bwin.party 2012 annual report, German administrative tax data (€2.6bn revenue by 2020), BLS-style commercial revenue data (~80–90% of online revenue taxed).

## 3. Method / model
- Difference-in-differences: change in consumer betting prices (effective, surcharge-inclusive) around July 2012 reform, German-targeting agencies (treatment) vs non-German agencies (control). Homogeneous treatment timing → no staggered-DID bias (Goodman-Bacon/Sun-Abraham/Borusyak concerns don't apply).
- Heterogeneity: (i) subsample DID by shrouding-policy group; (ii) treatment × shrouding-policy dummy interaction. Parallel pre-trends verified; multi-period event study for dynamics.
- Theoretical model (§6): Bertrand-Nash oligopoly (Varian 1980) + O'Donoghue–Rabin sin-good framework, with heterogeneous consumer attention to shrouded taxes; derives that shrouding attenuates corrective effects and that a shrouding ban restores first-best.

## 4. Equations & assumptions
The DID estimating equation is stated in §4.1 as a two-way fixed-effects regression of betting price on treatment×post with agency and time fixed effects (exact coefficient notation not reproduced here — paper text, Eq. referenced at §4.1). Pass-through = Δp / tax rate (5% turnover tax treated as per-unit levy).
Optimal-tax theory invoked (Farhi & Gabaix 2020): optimal sin tax = average marginal mistake / tax-salience (attention) parameter θ.
Stated assumptions: (1) parallel trends in betting prices absent reform (supported by event study — pre-reform coefficients statistically insignificant); (2) oddsportal odds reflect prices German customers face (validated by manual live-odds comparison); (3) missing-agency/URL attrition exogenous; (4) no other German regulatory changes 2009–2018 besides the tax. Author cautions: shrouding is an endogenous firm choice, so heterogeneity is not strictly causal; some German bettors may use foreign agencies (bias).

## 5. Features / target
- Features: treatment (German-targeting agency) × post-July-2012; agency and time fixed effects; shrouding-policy dummies and interactions; league/sport controls in robustness.
- Target: consumer betting price = effective overround-implied margin per € wagered (posted price + shrouded surcharge), i.e., the pass-through object.

## 6. Validation design
- Identification: homogeneous-time DID + event-study parallel-trends test (quarterly coefficients, 95% CIs; pre-period coefficients insignificant).
- Robustness: restrictive control groups (foreign nation-specific domains only — pass-through "close to full"); exclude "cross leagues"; balanced-agency panel; all-sports vs soccer-only; TWFE with time+agency FE only (unchanged at 76%).
- Dynamics: quarterly pass-through rises to ~0.035 (70%) in first four quarters (staggered shrouding adoption), ~80% after one year, ~0.045 by end of sample — persistent with slight upward trend.

## 7. Numerical results / baselines
- Average pass-through: 76% (coefficient 0.038, SE 0.004); 82% excluding cross-leagues; near-100% with restrictive foreign-domain control group.
- Heterogeneity by shrouding: shrouding agencies pass 90% to consumers (posted prices fall ~10%); non-shrouding agencies pass only 16%. Interaction-based difference ≈ 80 percentage points.
- Shrouding prevalence: 8 of 10 German-targeting agencies shroud by end of sample (six within six months of reform).
- Descriptive: average betting price 0.0706 overall, 0.0734 soccer; excess mass at 0.10 margin (Levitt 2004 convention).
- Welfare implication: heterogeneity implies (some) consumers underreact to shrouded surcharges; corrective effect attenuated; German betting revenues grew similarly to other European countries post-reform → limited corrective effect.

## 8. Code / data availability
None stated — commercial odds data (oddsportal.com), manual slip screenshots "available upon request"; no repo.

## 9. Leakage & limitations
- Policy paper, not a prediction method: no model for GSE to port directly; the NFL transfer is limited (US books show tax-inclusive lines; no turnover-tax analogue).
- DID control-group contamination: oddsportal reports one odds set per event, but German vs non-German customers may have seen different odds pre-2012 — the author hand-checks but can't fully verify historically.
- Shrouding is endogenous: the 90%-vs-16% gap is descriptive heterogeneity, not a causal effect of shrouding (author acknowledges).
- Turnover tax ≠ price tax: pass-through arithmetic treats the 5% turnover levy as a per-unit tax; the mapping from turnover to per-bet price is model-dependent.
- No consumption effect measured: revenue data too coarse to conclude on actual betting-volume reduction.

## 10. GSE overlap
Per existing-research-map: market microstructure lane covers de-vigged consensus, CLV, closing-line value as label, beat-the-close (repo + prediction-market triage docs). This paper EXTENDS that lane with a new capability: an audited overround→"betting price" measurement framework (p = margin per € wagered) plus empirical proof that posted odds can systematically understate effective consumer prices when books shroud surcharges/fees. Directly relevant to GSE's de-vig pipeline: any CLV/edge accounting should use effective (fee-inclusive) prices, not posted odds. US books currently display tax-inclusive prices, so the shrouding mechanism is dormant domestically — but the measurement discipline (effective vs posted price) applies to cash-out fees, odds boosts with strings attached, and reduced-juice books' effective margins. Not a duplicate: no in-repo paper on tax/fee pass-through in betting markets.

## 11. GSE implementation spec
- Adopt the "betting price" definition p = 1 − Σ(1/decimal_odds) (per € wagered) as the standard margin metric in GSE's market-capture pipeline; log both posted and effective (fee-adjusted) prices per book.
- Build a book-level margin panel: for each captured book, track effective margin over time and across leagues — the paper's agency×time panel is the template; use it to detect which books shade effective juice (e.g., via cash-out haircuts or boost terms).
- When computing CLV and edge, compare engine probabilities against effective prices, not posted odds; add a fee-adjustment layer for books with known surcharges.
- Effort: 1–2 days to add effective-margin logging to the existing market-capture tooling; the DID machinery is not needed.

## 12. Reproducible test
- Dataset: GSE's existing market captures (or fresh Odds API pull) across ≥5 books, NFL 2024 season.
- Metric: per-book effective margin distribution (mean, sd, by league/week); correlation between posted-spread edge and effective-price edge.
- Test: for each book, compute edge_vs_posted and edge_vs_effective for all GSE engine picks; measure how often sign flips (a pick that looks +EV posted is −EV effective). Baseline: zero flips expected under "posted = effective."

## 13. Acceptance / rejection gate
Adopt effective-price accounting in the engine's CLV/edge pipeline if sign flips occur on ≥2% of positive-EV picks for any tracked book (posted +EV → effective −EV). If flips are <2% across all books, log the discipline as verified-unnecessary and keep posted-price accounting. REJECT the paper's tax-policy conclusions as GSE-irrelevant (no turnover tax in US markets).

## 14. Improvement experiment
Cross-book shrouding detection as an edge source: estimate per-book effective margins the way the paper estimates pass-through, and test whether books with the largest posted-vs-effective gaps are also the books whose lines move slowest (i.e., whether fee-shrouding correlates with stale pricing). If it does, GSE's line-shopping router should preferentially target slow-moving high-gap books — turning a consumer-protection measurement into a line-selection feature.

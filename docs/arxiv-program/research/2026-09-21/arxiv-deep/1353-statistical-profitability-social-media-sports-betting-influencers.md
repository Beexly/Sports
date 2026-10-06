# [1353] The Statistical Profitability of Social Media Sports Betting Influencers: Evidence from the Nigerian Market (arXiv:2604.08251v1)

**Citation:** Kayode Makinde, Oluwatimileyin Onasanya, Frances Adelakun (ML Collective; Federal University of Agriculture, Abeokuta, 2026). *The Statistical Profitability of Social Media Sports Betting Influencers: Evidence from the Nigerian Market*. arXiv:2604.08251v1. URL: https://arxiv.org/abs/2604.08251v1
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF, 568-line extraction; all sections read). **Replaces:** ledger 1194 (REJECT).
**Verdict:** ADAPT

A survivorship-bias-free audit of 5,467 pre-match influencer bets (~$4.8M tracked, verified against Stake.com slip URLs) showing tipsters lose 25.24% collectively while followers lose 38.27% under flat staking, with four staking strategies simulated and affiliate incentives quantified. Not a prediction method — but the pre-match verification methodology is a directly portable tout-audit pipeline for GSE's competitive-intel lane and "every pick public, every result posted" doctrine, and the staking-suite results are a usable baseline for GSE's sizing research.

## 1. Research question
Is following popular Nigerian sports-betting influencers financially sound? — answered with pre-match-tracked, third-party-verified bet slips (defeating survivorship bias), plus a test of whether any staking strategy can rescue the tips, and quantification of the affiliate incentives behind the advice.

## 2. Dataset / schema
- **5,467 verified pre-match bets**, 3 tipsters (@mrbanks 3,677 bets/$4.31M; @louiedi13 1,178/$0.32M; @bossolamilekan1 612/$0.16M), ~**$4.8M** tracked, July 25 2023–Aug 24 2025; collected from full Telegram channel histories (keyword-filtered for Stake.com links), outcomes verified against Stake.com slip URLs. Combined reach: 4.0M X followers + 676,546 Telegram subscribers.
- Schema per bet: message ID, tipster, bet link, date posted, stake, odds, final payout. Currencies standardized to USD (Aug 2025 rates).

## 3. Method / model
- **Survivorship-bias-free collection**: only pre-match tips (posted before kickoff) from complete channel histories; 21 voided bets (odds ≤ 1.00) excluded.
- **Platform generalizability check**: Stake.com payout 93.21% vs 92.95% market average across 8 bookmakers (OddsPortal 2025) — Stake ranks 4th, within 0.49 pp mean absolute difference.
- **Four staking simulations** on the same 5,467 bets: Flat (S = C); Inverse (S = C/O); Square Root (S = C/√O); Fixed Return (S = P/(O−1)).
- **ANOVA**: strategy effect on profitability; tipster effect on profitability.
- Odds-size segmentation: Low (<10), Medium (10–100, ~50% of bets), High (>100).

## 4. Equations & assumptions
- Affiliate commission = (0.03 × Wagered / 2) × Commission Rate (10% standard) — pay depends on volume, not accuracy.
- ROI = (Total Payout − Total Stake)/Total Stake; Capital Loss = −ROI; Win ≡ payout > stake.
- Assumptions: Stake.com odds ≈ Nigerian market (tested); static follower behavior (no cash-outs, no accumulator insurance — flagged); currency standardization noise affects dollar totals, not ROI percentages.

## 5. Features / target
Features: tipster identity, stake, odds, odds category. Target: bet profitability under each staking strategy; follower bankroll trajectory.

## 6. Validation design
- Pre-registration-by-construction: pre-match capture prevents cherry-picking; third-party (Stake.com) verification prevents outcome fabrication.
- ANOVA with reported F-statistics and p-values; odds-category breakdown as a risk-appetite analysis.

## 7. Numerical results / baselines
- Overall win rate **10.39%** (568/5,467); @mrbanks **6%**, @louiedi13 **10%**, @bossolamilekan1 **24%** — but higher win rate ≠ profitability (odds sizes differ).
- Influencers' own stakes: collective **−25.24% ROI** (BOM −9.30%, Louie −20.75%, Banks −26.60%).
- Follower flat-staking simulation: **−38.27% ROI**; per-tipster follower losses 29–43%.
- Odds categories: Low (<10) −10% loss; Medium (10–100, ~50% of sample) net loss; High (>100) **−74% loss**.
- Staking strategies: **none profitable** — Fixed Return least bad, then Inverse, then Square Root, Flat worst (fastest depletion). ANOVA: strategy significant (**p = 2.12e−7**), tipster **not** (p = 0.1246) — no influencer is statistically superior.
- Descriptives: mean stake $877.15 (median $300.03); mean odds 63,525 (median 265); mean payout $655.72 (**median $0**).

## 8. Code / data availability
None released — no repository; data pipeline (Telegram JSON export → keyword filter → Stake.com URL scrape) described but not shared. The method is reimplementable from the description.

## 9. Leakage & limitations
- Stake.com only (localized platforms like SportyBet/Bet9ja uncaptured); static follower behavior; only 3 mega-influencers on affiliate models (subscription handicappers unexplored); deletion of losing posts not quantified (the silent half of survivorship bias).
- Consumer-protection paper, not a prediction study — no model, no features for GSE's engine to ingest.

## 10. GSE overlap
Not a forecasting paper, so it doesn't duplicate any engine method. Its value is **competitive intel + transparency infrastructure**, which maps onto two standing GSE commitments: the gse-competitive-intel repo (tout dossiers) and the "every pick public, every result posted" doctrine. The corpus has no rigorous tout-audit methodology; this paper supplies one (pre-match capture + third-party verification + staking-sensitivity + ANOVA). The staking suite also slots into the sizing lane as a naive-staking baseline battery that GSE's Kelly/dynamic sizing must beat on its own pick history.

## 11. GSE implementation spec
- **Adapt as GSE's tout-audit pipeline**: (1) build an automated tracker that captures tout/competitor picks pre-match (timestamped, hashed, archived — screenshots + structured records) and verifies outcomes against sportsbook/official records, replicating the paper's survivorship-bias-free design; (2) publish periodic audited ROI reports on prominent touts as competitive content (the paper's −25.24%/−38.27% framing is a content template); (3) run GSE's own picks through the same four staking strategies (Flat/Inverse/SquareRoot/Fixed Return) as a baseline battery, requiring GSE's Kelly sizing to beat all four on its verified pick history; (4) use the affiliate-commission analysis as the backbone of GSE's anti-tout positioning ("play singles like a responsible adult").
- Data: public tout channels + sportsbook records. Effort: 1–2 weeks for the tracker; the staking battery is a day's work against GSE's pick DB.

## 12. Reproducible test
- Dataset: 20+ high-profile betting touts' public picks over 3 months, captured pre-match by GSE's tracker.
- Metrics: verified ROI (flat stakes), ROI under each of the four staking strategies, win rate, odds-category breakdown.
- Baseline to beat: the paper's benchmark figures (−25.24% influencer ROI, −38.27% follower ROI) as a sanity check on the pipeline; success = pipeline reproduces negative-ROI findings on an independent tout sample, and GSE's own verified picks beat all four staking baselines.

## 13. Acceptance / rejection gate
**Adopt** the tout-audit pipeline and staking baseline battery if the tracker reproduces the paper's negative-ROI pattern on a fresh tout sample (validating the method) and GSE's Kelly sizing beats all four naive strategies on its own history. **Reject** the content/pipeline effort if pre-match capture proves infeasible at scale (e.g., touts delete posts faster than the tracker archives) — the staking battery alone still stands as a sizing-lane baseline.

## 14. Improvement experiment
Beyond the paper: (1) **quantify the silent deletion rate** — the authors flag but don't measure it; GSE's tracker can capture post timestamps vs. deletion events to estimate what fraction of losing picks vanish, producing a "survivorship-bias index" per tout — a stronger consumer-protection metric than ROI alone; (2) **affiliate-incentive mapping for the US market** — replicate the commission-formula analysis for US sportsbook affiliate programs to show followers exactly how tout incentives diverge from follower P&L.

**Verdict:** ADAPT

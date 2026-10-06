# [1740] Per-Market Information Leakage and Order-Flow Skill: Two Methodological Lenses on Informed Trading in Decentralized Prediction Markets (arXiv:2605.02287)

**Citation:** Maksym Nechepurenko (2026, Devnull FZCO; preprint v2 revised August 10, 2026). *Per-Market Information Leakage and Order-Flow Skill: Two Methodological Lenses on Informed Trading in Decentralized Prediction Markets*. arXiv:2605.02287. URL: https://arxiv.org/abs/2605.02287
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML converted to text, 11,385 words).
**Verdict:** ADAPT — the two-lens detection architecture (per-market ILS front-loading test + account-level sign-randomization skill classification, with the April-2026 convergence numbers: 3.14% skilled winners = 54,477 accounts with 44% out-of-sample retention; ILS_dl = +0.113 vs resolution proxy −0.331 on the Iran-strike case; $143M anomalous profit / 210k wallet–market pairs) gives GSE a directly implementable informed-flow surveillance design for sports markets, which the paper explicitly flags as mechanism-distinct from politics/crypto; adapt as a sports-category ILS + skill screen on public Polymarket/Kalshi data, not as a turnkey classifier.

## 1. Research question
Three methodological approaches to detecting informed trading on decentralized prediction markets surfaced almost simultaneously in April 2026 on the same body of Polymarket cases but at different layers: (i) a composite statistical screen on 210,000+ wallet–market pairs ($143M anomalous profit), (ii) an event-level sign-randomization test classifying 3.14% of accounts as persistent "skilled winners", and (iii) the Information Leakage Score (ILS) framework for per-market information front-loading. Are these competing methods or complementary layers, and how do they combine into a surveillance design? The paper compares the layers methodologically and sketches their combination, then applies ILS to an Iran-strike-on-Israel case study.

## 2. Dataset / schema
No new dataset — comparative methodology paper over three April-2026 approaches' reported numbers:
- Composite screen: >210,000 wallet–market pairs; $143M estimated anomalous profit (approach [2]).
- Sign randomization: full Polymarket transaction history 2023–2025 — 1.72M accounts, 210,322 markets, $13.76B volume; 10,000 sign randomizations per account (approach [1]).
- Insider heuristic: 1,950 flagged accounts; mean profit $15,012.92, median $2,758.29; imbalance predicts next price move (t=2.54) and outcomes (t=8.65).
- ILS case: Iran conflict cluster — 18 related markets, >$832M cumulative volume; only 1 of 18 met all ILS pipeline conditions.
- Category mix on which all three were evaluated: sports 42.05% of markets / 35.37% of volume; politics 7.52% / 35.85%; crypto 36.96% / 18.73%.

## 3. Method / model
- **Layer 1 (per-market): ILS** — quantifies information front-loading: price movement *before* the article-derived public-event timestamp (announcement) vs after. The paper sketches a combined design where ILS is the market-level screen.
- **Layer 2 (account-level): sign randomization** — per account, randomize trade signs 10,000× to build a null of no directional skill; accounts with realized P&L above the null = "skilled winners" (persistent directional skill conditional on opportunity selection). Separate lifecycle-and-conviction heuristic flags single-event, recently-created accounts as suspected insiders.
- **Combination sketch:** ILS flags suspect markets; sign-randomization identifies suspect accounts within them; the insider heuristic catches the single-event population the skill classifier excludes by design.
- Key methodological point: sign randomization is a test of *persistent directional skill*, not of insider trading per se; a platform-wide skilled-winner label is mechanism-ambiguous without category-conditioned decomposition (sports vs politics vs crypto have structurally different information technologies).

## 4. Equations & assumptions
- Sign-randomization null: for each account, permute trade signs (long/short) 10,000 times holding magnitudes/timing fixed; realized P&L vs the 10,000-draw null distribution → skill p-value.
- ILS: front-loading statistic comparing pre-announcement price drift to post-announcement drift (paper presents the framework conceptually; the exact estimator is in approach [3], summarized not re-derived).
- Insider heuristic: single-event lifecycle + conviction (position size relative to account) + recent account creation.
- Assumptions: public event timestamps are knowable (article-derived); trade history is complete (on-chain); the sign-randomization null correctly captures "no skill" (assumes opportunity selection is skill-independent — the paper flags this); category pooling is acknowledged as a confound.

## 5. Features / target
Features: per-trade timestamp/side/size/account (full history), public announcement timestamps per market, wallet–market pair P&L. Targets: (a) per-market ILS (front-loading score); (b) per-account skill classification (skilled winner / unskilled loser / lucky / unlucky / maker); (c) insider-heuristic flag. Horizon: full market lifecycle (2023–2025 history; Iran case = single event cluster).

## 6. Validation design
Comparative, not empirical-new: the paper did **not** independently reproduce any of the three methods (code/classifications unreleased). Validation claims are the approaches' own: sign randomization with 10,000 draws and 44% out-of-sample retention of the skilled-winner label; the insider heuristic's t-statistics on next-move/outcome prediction; ILS applied to the Iran cluster (1/18 markets meeting all conditions). The paper's contribution is the layering argument + the category-conditioning critique.

## 7. Numerical results / baselines
- Sign randomization: 54,477 skilled winners (3.14% of 1.72M accounts), 44% out-of-sample retention; 110,703 unskilled losers (6.4%); lucky winners 29.0%; unlucky losers 61.4%; makers 0.1%. Skilled winners + makers (<3.5% of accounts) capture >30% of gains.
- Composite screen: $143M anomalous profit over 210k+ wallet–market pairs.
- Insider heuristic: 1,950 accounts; mean profit $15,012.92, median $2,758.29; imbalance → next move t=2.54, → outcomes t=8.65.
- ILS Iran case: ILS_dl = +0.113 vs resolution proxy −0.331 (opposite sides of zero, 0.444 apart); Iran conflict cluster >$832M volume across 18 markets; only 1/18 met all ILS conditions.
- Category shares: sports 42.05%/35.37%, politics 7.52%/35.85%, crypto 36.96%/18.73% (markets/volume).

## 8. Code / data availability
None from this paper; the underlying three approaches' code/classifications are unreleased. Underlying transaction history is public on-chain (Polymarket).

## 9. Leakage & limitations
- The paper reproduces nothing: all numbers are the approaches' self-reported results; no independent replication, no released code or account labels.
- Sign randomization's null assumes opportunity selection is skill-independent — if skilled accounts also select better opportunities, the test understates skill (acknowledged).
- The insider heuristic has unknown precision against any labeled set; it targets a population the skill classifier excludes by construction, so the two labels are not cross-validated.
- Platform-wide pooling across sports/politics/crypto is mechanism-ambiguous — the paper's own central critique; a sports-only replication is required before any sports use.
- ILS needs reliable public-event timestamps; for routine NFL games the "announcement" is the game itself, so front-loading = pre-game line moves — the mapping is looser than for news events.
- Only 1/18 Iran markets met all ILS conditions — the pipeline is brittle on real data.

## 10. GSE overlap
Existing map: market microstructure lane (CLV, steam, beat-the-close); no informed-flow *account-level* surveillance exists anywhere in the repo. GSE tracks line moves, not who moves them. This paper's sports-category carve-out (42.05% of markets, 35.37% of volume) is directly GSE's domain, and its layering design (market-level ILS screen → account-level skill classification) is a new capability: identifying *which* price moves come from persistently skilled accounts. Complements ledger 1739 (which separates informed vs recreational *venues*) with an *account*-level informedness score.

## 11. GSE implementation spec
- **Sports-only ILS:** on Polymarket/Kalshi NFL markets, compute per-market front-loading: price drift in the 24h before kickoff (or before a news timestamp, e.g., injury report) vs drift after. Flag markets with anomalous pre-event drift as information-loaded.
- **Sign-randomization skill screen:** replicate the 10,000-draw sign-randomization test on sports-market accounts (public on-chain for Polymarket); build GSE's own "skilled winner" watchlist per sport; weight line moves by whether they originate from watchlist accounts.
- Effort: ~2–3 weeks (on-chain data pull + ILS computation + sign-randomization implementation).

## 12. Reproducible test
Dataset: Polymarket NFL markets, 2024 season (public on-chain history). Metric: does the sign-randomization skilled-winner label replicate (44% out-of-sample retention on sports-only data)? Then: do moves in markets flagged by high ILS predict outcomes better than unflagged markets? Baseline: 50% / unflagged-market CLV. Pass if (a) the skill label replicates with ≥35% out-of-sample retention and (b) high-ILS markets' pre-game moves predict outcomes at ≥54% (n ≥ 200 markets).

## 13. Acceptance / rejection gate
ADAPT is confirmed if, on 2024 Polymarket NFL data, the sports-only replication achieves ≥35% out-of-sample retention of the skilled-winner label AND high-ILS markets show ≥4pp better move→outcome prediction than unflagged markets. REJECT the surveillance build if the skill label doesn't replicate on sports-only data (retention <25%) or ILS flags show no outcome edge — then the April-2026 results are politics/crypto-driven and don't transfer to sports.

## 14. Improvement experiment
Condition the skill classification on *market category and timing*: split skilled winners into pre-game vs in-game specialists and by sport. Hypothesis: in-game skilled accounts (faster processors of live information) are a distinct, smaller population than pre-game skilled accounts (better priors), and in-game moves from the former predict outcomes better than any pre-game signal. Test whether a timing-conditioned watchlist beats the paper's pooled label by ≥3pp on outcome prediction — this turns the paper's category-conditioning critique into an operational, finer-grained surveillance layer.

**Verdict:** ADAPT — the ILS + sign-randomization two-layer design (54,477 skilled winners, 44% retention; ILS_dl +0.113 vs −0.331 on the Iran case) gives GSE an informed-flow surveillance blueprint for sports markets; replicate sports-only before operationalizing.

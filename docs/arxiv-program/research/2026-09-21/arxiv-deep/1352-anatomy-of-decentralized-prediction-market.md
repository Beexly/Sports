# [1352] The Anatomy of a Decentralized Prediction Market: Microstructure Evidence from the Polymarket Order Book (arXiv:2604.24366v2)

**Citation:** Philipp D. Dubach (2026). *The Anatomy of a Decentralized Prediction Market: Microstructure Evidence from the Polymarket Order Book*. arXiv:2604.24366v2. URL: https://arxiv.org/abs/2604.24366v2
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF, 998-line extraction; all sections read, all tables/figures read). **Replaces:** ledger 1193 (REJECT).
**Verdict:** ADAPT

A pre-registered, tick-level cross-sectional study of Polymarket microstructure joining 30 billion order-book events to 255 million authoritative on-chain trades, documenting a longshot spread premium, a uniform-grid depth profile, category-conditional spreads, and a hard measurement finding — feed-inferred trade direction agrees with on-chain truth only ~59% — with a replication package. Directly usable for GSE's market-microstructure/CLV lane: spread premia, execution-aware depth profiles, and bias-aware price reading on the venue where much of sports betting discourse now happens.

## 1. Research question
What does the limit-order-book microstructure of Polymarket (the largest on-chain prediction market) look like cross-sectionally at tick resolution, and can trade direction — the input to all direction-dependent microstructure measures — be inferred reliably from the public order-book feed alone?

## 2. Dataset / schema
- **Off-chain archive**: 30,287,264,368 WebSocket order-book events (price_change 99.2%, book_snapshot 0.8%) over 52 days (2026-02-21–2026-04-15), 623.8 GB, 385,198 distinct markets.
- **On-chain scrape**: 255,425,405 OrderFilled events from the CTF Exchange V1 contract over a 28-day window (2026-02-28–2026-03-27); aggressor sign read from makerAssetId/takerAssetId (which side posted USDC).
- **Panel**: 600 pre-registered markets (top-100 by USDC volume $4.56M–$96.0M + random-500 with ≥100 trades); composition: Crypto 58%, Sports **24% (142 markets)**, Geopolitics, Other.

## 3. Method / model
- Tick-level order-book reconstruction from the public feed; join to on-chain trades via (conditionId, yes/no tokenId) mapping from CLOB REST.
- Standard equity-microstructure measures ported to prediction markets: quoted/effective/realized half-spreads, Glosten–Harris spread decomposition, Kyle's λ, Amihud, Roll, Abdi-Ranaldo.
- Pre-registered panel (selection rule, seed, categorization committed with SHA-256 hash before analysis).
- Direction inference from feed via STRICT algorithm (matching resting-size decrements to buckets); agreement measured against on-chain aggressor sign across four disjoint 7-day windows.

## 4. Equations & assumptions
- M = E[sign_t · f(price_t, mid_t, size_t)] for direction-dependent measures; Glosten–Harris S^(eff)_(1/2) = c + φ (c = 60 s realized half-spread, φ = adverse selection).
- Assumptions: on-chain asset-id field is ground truth for direction (no private/mempool flow contamination — flagged as a caveat); 60 s sample grid adequate (sensitivity-tested vs 1–300 s); maker==taker or flipped-pair-within-128-blocks lower-bounds wash share.

## 5. Features / target
Per-market microstructure descriptors: spread by mid-price decile, L2 depth shares, maker Herfindahl, effective spread by category, ingestion latency, wash share, depth-vs-time-to-close regression. Targets: the eight stylized facts + the feed-vs-chain direction-agreement rate.

## 6. Validation design
- Pre-registration + deterministic build with hash commitment (beyond microstructure norms).
- Four disjoint 7-day windows for sign agreement; two non-overlapping windows for the sign-flip propagation; sample-step sensitivity tests; market-clustered bootstrap CIs; 60-second-grid robustness checks.

## 7. Numerical results / baselines
- **SF1 (longshot spread premium)**: median quoted half-spread ~400 bps in mid deciles, 650–900 bps below 0.10 probability — an order of magnitude wider than racetrack longshot premia, read as an inventory-risk constraint.
- **SF2 (depth profile)**: median top-of-book share 0.136 vs 0.10 uniform null; median KL from uniform 0.087 vs 2.30 for a fully top-heavy book — depth is layered, not top-heavy. Only 9% of markets are top-heavy (L1 > 0.5).
- **SF3**: quote timing median block-alignment share 0.102 vs 0.10 null — no meaningful clustering on block boundaries.
- **SF4**: median maker HHI 0.031 (~32 effective makers); p90 0.119; max 0.40.
- **SF5**: effective half-spread medians: Sports 0.0075, Geopolitics 0.0001, Other −0.0004, Crypto −0.0393 prob pp (wide within-category IQRs).
- **SF7 (wash)**: median self-counterparty share 0.97%, p99 10.6%, max 22.2% — lower bound by construction.
- **SF8**: depth explained by log duration (+0.222, SE 0.073), log p(1−p) (−1.02, SE 0.180), log volume (+0.41, SE 0.046); time-to-close coefficient **+0.008 (t = 0.08)** — no residual effect.
- **Measurement result**: feed-inferred direction agrees with on-chain only **~59%** (volume-weighted 0.592, 95% CI [0.542, 0.659]; panel mean 0.615, CI [0.579, 0.653]) vs ~50% chance and ~80% Lee-Ready on equities. Effective half-spread **sign-flips on 67%/50%** of comparable markets across two windows; Kyle's λ on **60%/43%**. Glosten–Harris on top-100 with on-chain signs: median effective half-spread ≈ −0.0003 prob pp — essentially zero systematic spread.

## 8. Code / data availability
Full analysis code + panel artifacts: **https://github.com/philippdubach/polymarket-microstructure**, archived at Zenodo **DOI 10.5281/zenodo.19811426**. Raw 624 GB archive not redistributed (contact author); on-chain scrape reproducible via provided pipeline against any Polygon archive node.

## 9. Leakage & limitations
- Off-chain/on-chain join covers only the V1 contract window (pre-V2 cutover, April 2026); feed's `change_side` never encodes aggressor side, so feed-only studies are direction-blind — this is the paper's own point.
- 60 s sample grid; Kyle's λ fragile across step sizes. STRICT inference is O(n²), limiting windows. MEV/sandwich flow contaminates the on-chain "ground truth" (unmeasured). Wash detector is a lower bound by construction.
- Single-author study; "AI-based coding tools (Claude Code CLI with Claude Opus 4.7)" assisted infrastructure — disclosed; statistical work claimed as author's own.

## 10. GSE overlap
Fills the **market-microstructure gap**: the map's CLV/market-efficiency lane has no tick-level treatment of prediction-market microstructure. GSE reads Polymarket/Kalshi prices as signals; this paper quantifies how noisy that signal's trading cost is: (1) the **longshot spread premium** gives GSE a bias-aware lens for reading low-probability market prices (a 650–900 bps half-spread means thin confidence, not mispricing); (2) the **uniform-grid depth profile** informs GSE's own limit-order execution on these venues — size can be worked through the book rather than crossed at top; (3) the **direction-inference failure** is a methodological guardrail: any GSE microstructure measure on Polymarket must source direction from on-chain OrderFilled events, not the feed. The pre-registration discipline is also a process model for GSE's own empirical work.

## 11. GSE implementation spec
- **Adapt as GSE's prediction-market microstructure playbook**: (1) port the join pipeline (CLOB REST → on-chain OrderFilled → per-market panel) to GSE's stack and replicate the eight stylized facts on **sports markets only** (NFL/CFB) over a current window; (2) build the longshot-spread-premium curve by sport and use it to discount low-probability market prices in GSE's signal fusion (wider spread → lower weight); (3) use the depth-profile statistics to size GSE's own limit orders on Polymarket/Kalshi when laying in positions; (4) adopt the wash-share lower-bound detector as a market-quality filter before trusting any venue's volume figures; (5) pre-register GSE's microstructure analyses with hashed panel builds.
- Data: Polymarket CLOB + Polygon archive node. Effort: 2–3 weeks for the sports-only replication.

## 12. Reproducible test
- Dataset: current 28-day window of NFL/CFB Polymarket markets (top-100 sports by volume + random-500 sample), off-chain feed + on-chain scrape replicated with the author's scripts.
- Metrics: (a) replicate SF1/SF2/SF8 on sports markets and compare coefficients; (b) recompute the feed-vs-chain direction-agreement rate — does the ~59% hold for sports?
- Baseline to beat: none (descriptive replication); success = sports-market stylized facts within the paper's confidence bands, giving GSE a calibrated microstructure baseline for execution and signal-weighting.

## 13. Acceptance / rejection gate
**Adopt** the sports-only replication and the spread-premium signal-weighting if direction-agreement and stylized facts replicate within sampling noise; the replication package makes this a bounded effort. **Reject** (stay with market-mid-only usage) if sports markets show materially different microstructure (e.g., tighter spreads, top-heavy books) that invalidates the venue-wide generalizations — in which case the paper's methodological guardrails still stand.

## 14. Improvement experiment
Beyond the paper: (1) **price-leadership test** — the authors leave open whether Polymarket leads or follows sportsbooks; run a Hasbrouck information-share / lead-lag analysis between Polymarket sports prices and Pinnacle/sharp-book lines on the same events, which directly answers how much weight GSE's fusion should give each source; (2) **within-market depth decay** — build the per-market depth time series the panel lacks and test whether depth actually falls approaching resolution, which determines optimal execution timing for GSE's positions.

**Verdict:** ADAPT

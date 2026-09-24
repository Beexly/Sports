# [0862] Emergence of scale invariance and efficiency in a racetrack betting market (arXiv:0911.3249)

**Citation:** Mori, S. & Hisakado, M. (2009). *Emergence of scale invariance and efficiency in a racetrack betting market*. arXiv:0911.3249 [physics.soc-ph, physics.data-an]. URL: https://arxiv.org/abs/0911.3249
**Full-text source:** local cache /tmp/arxiv750-cache/fulltext/0911.3249.txt (35,917 bytes, complete paper incl. references). Cross-checked against https://arxiv.org/abs/0911.3249.
**Ledger completed:** 2026-09-21. **Read:** full text.
**Verdict:** ADAPT — the headline finding is that market efficiency emerges NON-MONOTONICALLY as betting progresses (concentration → dispersion → re-concentration, with efficiency attained, lost, and re-attained). The AR/EAR diagnostic (ranking completeness vs vote concentration) is a portable tool for studying NFL line-movement phases from open to close. Companion paper 1006.4884 (ledger 0863) extends this with the independent/herding voter decomposition.

## Citation / full-text source
S. Mori & M. Hisakado, Kitasato University, Nov 2009. MEXT Grant-in-Aid 21654054. Builds on Mori & Hisakado arXiv:0806.0185 (exact scale invariance) and Hisakado & Mori arXiv:0907.4818 (voting-model phase transition).

## Research question
As votes accumulate in a parimutuel betting market, how do (a) the rank-ordering of winners vs losers (scale invariance) and (b) market efficiency evolve over time? Is convergence to efficiency monotonic?

## Dataset / schema
- **JRA 2008 win-bet time series:** 3,542 races → **3,250** used (final public win pool 10⁵ ≤ V_r ≤ 10⁶); 7–18 horses/race; **N = 47,273** horses total; **N₁ = 3,251** winners (one tie), N₀ = 44,022 losers; **K = 285,269** announcements (13–262 per race).
- Win bet fraction from posted odds: **x_{i,k}^r = 0.788/(O_{i,k}^r − 0.1)** (eq. 1), renormalized to sum to 1.
- Time variable t = average public win pool across races (eqs. 2–6). Five reference timings: t₀≈70.4 (T≈620.6 min to start), t₁≈2342.9 (440.2 min), t₂≈15482.0 (167.6 min), t₃≈195201.3 (2.5 min), t₄≈249708.8 (−1.1 min). **Almost half of all votes arrive in the last 10 minutes** (Fig. 1).
- Validation scale: full JRA 1986–2006 sample — **71,549 races**, N₁=71,650, N₀=829,716.

## Method
1. Rank all N horses by win bet fraction x_α(t) (eq. 7); track winner/loser indicator I_α(t) over time (Fig. 2: phase separation emerges — winners drift left/up in rank).
2. **Scale invariance:** cumulative distributions from the lowest rank, x_μ(s) = (1/N_μ)Σ_{α=N(1−s)}^N δ_{I_α,μ} (eq. 8) — the (x₀(s), x₁(s)) ROC curve; fit **x₁ = a·x₀^α** in the small-x₀ region on double-log plots.
3. **Efficiency:** Lorenz curve of winners L(x) = (1/N₁)Σ_{α=1}^{Nx} δ_{I_α,1} (eq. 9); expected Lorenz EL(x) = (1/R)Σ_{α=1}^{Nx} x_α (eq. 11); **AR = (∫L − 1/2)/[(1/2)(1 − N₁/N)]** (eq. 10); **EAR** analog (eq. 12). AR = EAR is a *necessary* (not sufficient) efficiency condition. Sign of DL′(x) = d(L−EL)/dx tells over/under-estimation by rank.
4. **Voting model:** Pólya urn — vote probability P_{i,t}^μ = X_{i,t}^μ/Z_t (eq. 13), Z_t = N₁s₁ + N₀s₀ + t (eq. 14); vote counts follow beta-binomial (eq. 15); T→∞ gives beta(s_μ, Z₀−s_μ) (eq. 16); thermodynamic limit gives gamma p_{s_μ}(u) = e^{−u}u^{s_μ−1}/Γ(s_μ) (eq. 17).

## Equations / math / assumptions
- Near w→0, incomplete gamma γ(s_μ,w) ~ w^{s_μ} (eq. 20) → **x₁ ~ x₀^α with α = s₁/s₀** (eq. 21).
- **Double scaling limit** (Z₀→∞ and s_μ→0 together, s_μ decaying slower than N_μ growing, fixed α): **exact x₁ = x₀^α over the entire 0 ≤ x₀,x₁ ≤ 1** (eq. 22) — power law holds beyond the tail, "remarkable from the viewpoint of statistical physics."
- In the limit the voting model ≡ a random ball-removing problem (draw balls with probability ∝ s_μ, no replacement), used to render exact gradation patterns (Fig. 7, α = 1…100).

## Features / target
Descriptive market-dynamics study — no prediction target; the "features" are the time-indexed win bet fractions and the derived AR/EAR/α statistics.

## Validation
- Five time slices t₀–t₄ on 2008 JRA data; 1986–2006 full-sample replication for the scale-invariance fit.
- ROC fits: t₀: **α = 1.03** (diagonal — no information); t₃: **α = 1.77** over 0.03 ≤ x₀ ≤ 0.3; 1986–2006: **α = 1.81** over 0.003 ≤ x₀ ≤ 0.3.
- AR rises monotonically, saturating at t₂; EAR starts ≈**0.9** (extreme concentration), falls to a minimum at t₂, rises after; **AR = EAR at t₁ AND at t₃** — efficiency is attained twice with an inefficient interval between.
- DL(x) anatomy: t₁ — top 10% horses overestimated, next 10% underestimated, rest efficient; t₂ — popular 30% underestimated, 70% unpopular overestimated (favorite-longshot bias state, max AR−EAR gap); t₃ — near-efficient, top 20% mildly overestimated; 1986–2006: "contrary to favourite-longshot bias… complex behaviour… degree of inefficiency very small" (top 0.4% underestimated, next 10% overestimated).

## Exact results with baselines
- No competing model — the results are the measurements: α = 1.77–1.81 (scale-invariance exponent, stable across 1986–2008); non-monotonic efficiency path with two AR=EAR crossings; vote-concentration U-shape (EAR 0.9 → min → max).
- The efficiency condition is necessary-not-sufficient: the authors check curve coincidence (Fig. 6), not just the scalar equality.

## Code / data availability
No code or data link. JRA data is proprietary; the paper fully specifies the reconstruction formulas (eqs. 1–12).

## Leakage
N/A — descriptive study, no prediction task.

## Limitations
- Parimutuel (JRA) market: vote-share dynamics need not match fixed-odds NFL books where the bookmaker sets the line rather than the crowd setting shares. Transfer the *diagnostic logic*, not the mechanism.
- Purely descriptive — no betting strategy is tested, so "efficiency" here is statistical, not a tradable edge.
- AR = EAR is necessary but not sufficient for efficiency; scalar equality can mask curve departures (authors acknowledge).
- 2008 JRA win bets only; place/show pools and other racing jurisdictions untested.

## GSE overlap vs existing-research-map
- **Gap #3 (market microstructure)** lists "only 1211.4000 + PLOS ONE 2023" — this paper and its companion 1006.4884 are the missing microstructure depth: time-resolved efficiency diagnostics on real betting data. Nothing in the corpus studies *when* during the betting window efficiency obtains.
- Distinct from 1211.4000 (NFL line levels predict outcomes) — this is about the *dynamics* of the crowd's vote distribution, not line levels.
- Connects to GSE's CLV/beat-the-close/steam work: the paper implies CLV measured at different points in the betting window captures different information regimes.

## Implementation spec (GSE adaptation)
1. **Line-movement efficiency phases for NFL:** reconstruct spread/total time series (open → close) for 3+ seasons; at each normalized time bucket compute analogs of AR (do closing-rank-implied outcomes separate winners?) and EAR (how concentrated is money — use ticket%/handle% splits where available, e.g., public betting splits). Test for the paper's U-shape: early concentration (sharp/opening positions), mid dispersion (public money spreads — favorites undervalued?), late re-concentration (steam/late sharp).
2. **AR=EAR crossing test:** check whether the market satisfies the efficiency condition at some interior time but not at close (or vice versa) — if a stable interior crossing exists, that timestamp is the optimal "read" of the market for GSE's market-implied ratings.
3. **α-exponent monitoring:** fit the ROC-style power law of de-vigged implied probabilities vs outcomes in rolling windows; a drifting α flags regime changes in favorite-longshot bias.
4. Do NOT adopt: the Pólya-urn generative model as a literal model of fixed-odds books.

## Reproducible test
1. Rebuild AR/EAR/DL(x) from the paper's formulas on any available time-stamped betting data (even a single sport's public ticket/handle splits).
2. Gates: (a) reproduce the qualitative U-shape of concentration over the betting window; (b) identify AR≈EAR crossings and test whether picks made at crossing times beat picks made at close on CLV. If no stable phase structure appears in NFL fixed-odds data, the transfer fails.

## Numeric gate
**α = 1.81 (1986–2006, 0.003 ≤ x₀ ≤ 0.3); AR = EAR crossings at t₁ (≈2,343 avg votes) and t₃ (≈195,201 avg votes); EAR start ≈ 0.9.** For GSE: the gate is reproducing a non-monotonic efficiency path (≥1 interior AR≈EAR crossing) in NFL line data — a single monotonic path means the phenomenon doesn't transfer.

## Improvement experiment
Replace the paper's pool-average time variable with *event-time* alignment (fraction of handle arrived) and test whether the efficiency crossings align better on handle-time than clock-time — if late money is more informative per dollar, handle-time should sharpen the crossings. Second: fit α separately for spread vs total markets to test whether favorite-longshot bias dynamics differ by market type.

## Verdict
**ADAPT.** The non-monotonic efficiency dynamics and the AR/EAR/DL(x) diagnostic toolkit are directly applicable to studying NFL line-movement phases — a dimension of market microstructure (gap #3) the corpus lacks. The Pólya-urn scale-invariance derivation is elegant but secondary; the actionable piece is the time-resolved efficiency diagnostic. Pair with ledger 0863 (the independent/herding decomposition).

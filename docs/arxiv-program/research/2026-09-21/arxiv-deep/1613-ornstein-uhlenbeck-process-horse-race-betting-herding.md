# [1613] Ornstein–Uhlenbeck Process for Horse Race Betting: A Micro–Macro Analysis of Herding and Informed Bettors (arXiv:2503.16470)

**Citation:** Tomoya Sugawara, Shintaro Mori (2026). *Ornstein–Uhlenbeck Process for Horse Race Betting: A Micro–Macro Analysis of Herding and Informed Bettors*. arXiv:2503.16470. URL: https://arxiv.org/abs/2503.16470
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML converted to text, 10,313 words).
**Verdict:** ADAPT — the time-inhomogeneous Ornstein–Uhlenbeck derivation gives GSE a parametric, fittable model of how betting markets converge toward efficiency as the event approaches, with an estimable time-varying informed-bettor fraction r_inf(n); port it from vote-share to NFL line-movement data to locate when "sharp money" takes over and to quantify favorite/longshot efficiency gaps.

## 1. Research question
Can the time evolution of betting odds be derived as a stochastic process from microscopic bettor behavior? The paper models JRA win-odds dynamics with two bettor types — herders (bet with probability = current vote share z) and informed/fundamentalist bettors (bet with probability = true win probability q) — and derives a time-inhomogeneous Ornstein–Uhlenbeck process for the vote share. It asks: (i) what is the micro-level voting rule; (ii) how does the informed fraction r_inf(n) evolve over the betting window; (iii) does the macro MSE convergence match O–U theory; (iv) does q-dependent herding explain the favorite–longshot bias?

## 2. Dataset / schema
- **JRA 2008 win-bet data:** 3,450 races, 50,180 horses, 3,453 winners (3 ties). Final pools T[r]: 5.9×10⁴–1.46×10⁷, mean ≈ 3.0×10⁵. 7–18 horses per race. Announcements per race: 14–401, mean ≈ 80. Per announcement: timestamp, total pool t[r,i], per-horse odds O[r,i,h].
- **Preprocessing:** normalized time n[r,i] = 100 × t[r,i]/T[r] ∈ [0,100] (n=1 ≈ 480 min to post, n=50 ≈ 20 min); linear interpolation of odds between announcements; vote share via JRA formula O = max(1.1, 0.788/Z), inverted with +0.05 truncation adjustment, normalized Σ_h Z = 1; final share q(r,h) = Z(r,h,100).
- Access: paper's analysis code at https://github.com/LABO-M/Ornstein-Uhlenbeck-Process-for-Horse-Race-Betting (Sugawara 2025); underlying JRA odds series are public-ish (published odds feeds).

## 3. Method / model
Sequential voting model: voter t chooses horse with final share q via X(t,q) ∈ {0,1}; running share Z(n,q) = (1/nΔt)Σ_{s≤nΔt} X(s,q). Micro decision rule f_n(z) = r_inf(n)·q + (1 − r_inf(n))·z — convex mix of informed (f_inf = q) and herder (f_herd = z) rules; herders are Max–Min players (expected return independent of z since odds ∝ 1/z). Gardiner SDE derivation from conditional mean/variance of ΔZ gives the time-inhomogeneous O–U process (Eq. 2), mean-reverting toward q whenever r_inf(n) > 0, in quadratic potential U_n(z) = r_inf(n)/[2(n+1)]·(z−q)². Micro estimation: regress (n+1)(Z(r,h,n+1) − Z(r,h,n)) = −r_inf (Z(r,h,n) − q(r,h)) at n ∈ {1,…,50} (Eq. 11). Macro: compare empirical log MSE(n)/MSE(1) against theory.

## 4. Equations & assumptions
- Z(t,q) = (1/t)Σ_{s=1}^{t} X(s,q); ℙ(X=1|Z=z) = f_n(z) = r_inf(n)·q + (1−r_inf(n))·z (Eq. 1).
- dZ(n,q) = −[r_inf(n)(Z(n,q) − q)/(n+1)] dn + [√(q(1−q))/((n+1)√Δt)] dW(n,q) (Eq. 2) — time-inhomogeneous O–U.
- U_n(z) = r_inf(n)/[2(n+1)] (z−q)².
- Closed-form solution (Eq. 3) and MSE decomposition (Eq. 4); log-MSE ratio approx (Eq. 10): ln(MSE(n)/MSE(1)) ≈ (−2r_1 + 4Δr/(N−1)) ln((n+1)/2) − 2((n−1)/(N−1))Δr.
- Constant r_inf = r_1: MSE ∼ power law; exponent 2r_1 for r_1 < 1/2, 1 for r_1 > 1/2, log correction at r_1 = 1/2 ("super-normal transition," Hod & Keshet 2004).
- Linear r_inf(n) = r_1 + (n−1)/(N−1)·Δr: crossover from power-law to exponential decay at n > n_c = (N−1)/(2Δr) + 1 when Δr > 0 (Eq. 9–10).
- Micro regression: (n+1)(Z(r,h,n+1) − Z(r,h,n)) = −r_inf (Z(r,h,n) − q(r,h)) (Eq. 11).
- Assumptions: voters within an interval conditionally independent; informed voters know true q exactly (simplest form; paper discusses risk-preference generalizations giving smooth f_inf); f_n(z)(1−f_n(z)) ≈ q(1−q) for large n; normalized time n is comparable across races (authors flag this as a weakness); final vote share q = objective winning probability (market-efficiency assumption).

## 5. Features / target
Micro features: current vote-share deviation Z(r,h,n) − q(r,h) at normalized time n. Target: per-interval vote-share change (n+1)ΔZ → estimates r_inf(n) via zero-intercept regression. Macro features: log normalized MSE by q-stratum. Targets: power-law exponent 2r_1 early, exponential crossover late; q-stratum-specific convergence rates (favorite–longshot bias test).

## 6. Validation design
Micro/macro consistency check on the same 3,450-race sample: (i) fit r_inf(n) linearly, R² = 0.90; (ii) plug fitted (r_1, Δr) into Eq. 10 and compare against empirical MSE curves in four q-strata (q<0.01: 25.6%; 0.01–0.1: 52.2%; 0.1–0.4: 20.6%; q≥0.4: 1.6%). No holdout, no predictive test — the validation is theory-vs-empirical-curve agreement. Low per-n regression R² acknowledged (q-heterogeneity, n↔real-time mismatch).

## 7. Numerical results / baselines
- **Informed fraction:** r_inf(n) = 0.334 + [(n−1)/49]·0.658, R² = 0.90 (all horses). At n=50: r_inf = 0.992, herder fraction 0.008. Reverses prior assumption (Mori & Hisakado 2010b): herders *decrease* over time → market becomes more efficient approaching post.
- **MSE convergence:** q<0.01 and 0.01–0.1 strata match theory (Eq. 9/10) closely in both semi-log and log-log plots; 0.1–0.4 and ≥0.4 converge *slower* than theory (smaller |slope|).
- **q ≥ 0.4 (favorites, 1.6% of horses):** r_inf ≈ 0.4 for n ≤ 30, then rises to 1; MSE slope ≈ −0.5 (matches plotted −0.5 line; theoretical 2r_inf = 0.8 would predict −0.8 — slower). Authors' reading: persistent herding on favorites → slower convergence → favorite–longshot bias (favorites undervalued).
- **Crossover:** exponential term active for n > n_c = (N−1)/(2Δr) + 1 ≈ 77 (N=100, Δr=0.658); Δt ≈ 3×10³, N=10² ≫ Δr so the integral term in Eq. 9 is negligible vs. MSE(1).
- **Data scale:** announcements accelerate in real time (n=1→480 min, n=50→20 min remaining).

## 8. Code / data availability
Analysis code: https://github.com/LABO-M/Ornstein-Uhlenbeck-Process-for-Horse-Race-Betting. JRA 2008 win-odds time series per announcement (public odds feeds); processed vote-share series not released as a dataset.

## 9. Leakage & limitations
- Pari-mutuel vote-share ≠ fixed-odds line: the herder rule f_herd(z) = z is motivated by Max–Min under 1/z odds; sportsbook fixed-odds bettors face different incentives, so the micro rule needs re-derivation for NFL.
- n is pool-normalized, not clock-normalized (authors flag: same n = different decision stages across races; large SE on remaining time). GSE must use clock time or fraction-of-handle with care.
- No holdout or forecasting test; MSE(100) ≡ 0 by construction (q defined as final share), so only n ≤ 50 analyzed — the theory is fit, not predicted.
- q = true win probability is an efficiency assumption, not an estimate; favorite-stratum r_inf(n) is noisy (1.6% of horses).
- Single year (2008), single jurisdiction, win market only; Δt varies by race/announcement and is approximated.

## 10. GSE overlap
Per `/home/hatch/workspace/arxiv-sweep/existing-research-map.md` (lines 47, 143), GSE has line movement/steam and CLV-as-label lanes but nothing modeling the *dynamics of convergence* of odds toward close, and no herder/informed decomposition. The map's open gap #3 (market microstructure in sports betting) is exactly this paper's territory. This is an **extension**: the first parametric model of time-varying market efficiency in the corpus, complementary to GSE's CLV work — CLV measures *whether* the close was efficient; this models *how fast* efficiency arrives.

## 11. GSE implementation spec
1. **Port vote share → line-implied probability:** for each NFL game-week, build the time series of consensus spread-implied win probability p(t) from GSE's odds captures (open → kickoff), on a normalized handle/clock grid n ∈ [0,100].
2. **Fit r_inf(n):** regress (n+1)(p_{n+1} − p_n) = −r_inf (p_n − p_close) in rolling windows — Eq. 11 with p_close as the efficiency target (CLV logic). Estimate r_1, Δr per season; identify n_c (the "sharp crossover") where exponential convergence kicks in.
3. **Herding clock:** the fitted r_inf(n) curve is a market-efficiency clock — GSE bets placed before n_c face herder-dominated noise; after n_c, lines reflect informed money. Use it to time GSE's own releases (publish before the market gets efficient) and to weight CLV evaluations.
4. **Favorite/underdog stratification:** replicate the q-stratum analysis — test whether r_inf(n) stays low longer for big favorites (public herding on favorites) vs. underdogs; this is a direct, fittable version of favorite–longshot bias in NFL spreads.
5. **Effort:** ~1 week: adapt the paper's GitHub code to odds data, fit on 2 seasons, produce the efficiency-clock curve and stratum report.

## 12. Reproducible test
Dataset: GSE's 2023–2025 NFL line-history DB, consensus probability series per game, open→kickoff. Metric: fit Eq. 11 per time bin; report r_inf(n) curve, R² of the linear fit, and estimated n_c. Baseline to match: the paper's shape — r_inf rising (R² ≥ 0.5) and MSE decaying faster than constant-r theory late. Pass if the NFL fit recovers a rising r_inf(n) with the crossover structure; the exact values (0.334, 0.658) need not transfer.

## 13. Acceptance / rejection gate
**Adapt** the O–U efficiency-clock into GSE's market-timing lane if: (i) the NFL r_inf(n) fit achieves R² ≥ 0.5 with positive Δr on 2023–2025 data; and (ii) a favorite/underdog split shows statistically different r_inf trajectories (Wald test p < 0.05), confirming the model detects real structure rather than fitting noise. **Reject** if r_inf(n) is flat or the MSE curves don't beat a constant-r null — then NFL lines don't follow herder→informed dynamics and the model is a horse-racing artifact.

## 14. Improvement experiment
The paper's herder rule assumes bettors see the *current* share. GSE's improvement: add a *delayed* herder class — public bettors react to stale lines (books shade, apps lag), giving f_delay(z_{n−k}). This predicts a distinctive signature: overshoot-and-correct oscillations in p(t) when delayed herders dominate early, vs. monotone convergence when informed dominate late. Fit a two-herder O–U (instant + delayed) and test whether the delay term k is identifiable from line data; if yes, GSE gets a "stale-line arbitrage window" detector — the exact moments when public money is betting yesterday's number — which the paper's single-herder model cannot produce.

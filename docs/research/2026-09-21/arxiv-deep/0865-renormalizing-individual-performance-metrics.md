# [0865] Renormalizing individual performance metrics for cultural heritage management of sports records (arXiv:2004.08428)

**Citation:** Petersen, A. M. & Penner, O. (2020). *Renormalizing individual performance metrics for cultural heritage management of sports records*. arXiv:2004.08428 [physics.soc-ph]. URL: https://arxiv.org/abs/2004.08428
**Full-text source:** local cache /tmp/arxiv750-cache/fulltext/2004.08428.txt (78,981 bytes, complete main text + Supplementary Tables S1–S7). Cross-checked against https://arxiv.org/abs/2004.08428.
**Ledger completed:** 2026-09-21. **Read:** full text.
**Replacement chain:** read as the designated reserve replacement for slot 8 — **replacement_for: 1211.4000v1**, reason: dedup (1211.4000 is already read in depth per existing-research-map.md §"arXiv papers already read in depth (dedup — skip these)").
**Verdict:** ADAPT — the prowess-deflator method (per-opportunity success rate as an era baseline) is sport-agnostic and directly applicable to cross-era NFL stat normalization for props/fantasy and to era-adjusted backtesting of betting strategies.

## Citation / full-text source
A. M. Petersen (UC Merced) & O. Penner (EPFL). Builds on Petersen et al., EPJ B 79 (2011) 67–78 (detrending methods) and Petersen et al., EPL 83 (2008) 50010 (HR prowess). Data: Sean Lahman's Baseball Archive; databasebasketball.com.

## Research question
How to objectively compare individual career/season achievements across eras when success rates are non-stationary (PEDs, training, rule changes, expansion, equipment)? I.e., build a statistical "deflator" for sports metrics analogous to the economic price deflator.

## Dataset / schema
- **MLB 1871–2009:** ~17,000 careers; 13.4M at-bats, 10.5M innings-pitched-in-outs. Metrics: batter HR, hits (H); pitcher strikeouts (K), wins (W).
- **NBA 1946–2008:** ~4,000 careers; 24.3M minutes. Metrics: points, rebounds, assists.
- ~104,000 career-years total. Opportunity thresholds y_c: 100 AB (batters), 100 IPO (pitchers), 24 min (NBA) — robust to reasonable choices.
- Stylized facts: HR per-AB up **5×** from 1919 (Ruth) to 2001 (Bonds' 73); NBA assist prowess peaked 1984, **−25%** by 2008; scoring prowess peaked early 1960s (non-monotonic).

## Method
1. **Prowess:** P_i(t) ≡ x_i(t)/y_i(t) (successes per opportunity); league average ⟨P(t)⟩ ≡ Σ_i x_i(t)/Σ_i y_i(t) (eq. 1) — per-opportunity basis neutralizes league expansion/season-length growth.
2. **Renormalization:** x_i^D(t) ≡ x_i(t)·P_baseline/⟨P(t)⟩ (eq. 2); career X_i^D = Σ_{s=1}^{L_i} x_i^D(s) (eq. 3). Baselines: P_baseline = ⟨P(2009)⟩ for HR (2009 units), P̄ (all-year mean) for the other six metrics.
3. **Stationarity test:** Dickey–Fuller (AR with drift) on ⟨P(t)⟩, ⟨x(t)⟩, ⟨x^D(t)⟩ series.
4. **Distribution collapse:** kernel-density PDFs of season metrics across non-overlapping eras; career PDFs fit by MLE to Gamma P_Γ(X|α,X_c) ∝ X^{−α}exp(−X/X_c) (eq. 4, α ∈ [0.4, 0.7]) and Log-Series P_LS(X|p) ∝ p^X/X (eq. 5).

## Equations / math / assumptions
- Eqs. 1–3 above. Log-Series cutoff: X_c = 1/(1−p); HR fit **p = 0.996975** → X_c ≈ 331.
- Assumptions: (a) individual-oriented metrics with recorded opportunities; (b) comprehensive opportunity data so per-opportunity rates are estimable; (c) league-average prowess captures the time-dependent factors (no position/specialization decomposition).

## Features / target
Descriptive/retrospective — no prediction target; the "output" is the renormalized ranking tables (S1–S7).

## Validation
- **Dickey–Fuller:** HR ⟨P(t)⟩ stat **−3.7, p = 0.57** (non-stationary) → renormalized ⟨HR^D(t)⟩ stat **−31.5, p = 0.0004** (stationary). NBA points: −6.4, p = 0.3 → renormalized **−22.2, p = 0.003**. Wins/Hits already stationary (no renormalization needed).
- **Distribution collapse:** renormalized season PDFs collapse across eras — HR up to x^D ≈ 35; NBA points up to x^D ≈ 2500 (vs ~1000 for nominal). Career P(X) vs P(X^D) nearly invariant → re-ranking is *local*, not bulk era reordering.
- **Rank examples:** Ruth's 1921 59 HR → **214 renormalized HR** (2009 units, all-time season #1); career HR renormalized #1 Ruth (1215) vs nominal #1 Bonds (762 → renormalized #8, 502); Rodman's 1991–92 1530 rebounds (nominal #28) → **renormalized #1 (1691)**; Wilt's 1961 scoring record and Stockton's assist records survive renormalization.
- Log-Series fits MLB career distributions better than Gamma; Gamma fits NBA.

## Exact results with baselines
- Baselines are the nominal (unrenormalized) series: DF non-stationarity (p = 0.57/0.3) → stationary after renormalization (p = 0.0004/0.003); era-separated PDFs diverge for nominal metrics, collapse for renormalized.
- Career distribution invariance under renormalization (Gamma/Log-Series fits unchanged in form).

## Code / data availability
No code link; data sources named (Lahman archive, databasebasketball.com); method fully specified (eqs. 1–3).

## Leakage
N/A — retrospective descriptive study.

## Limitations
- Data end in the late 2000s (right-censoring; "unavoidable with every passing year" — authors' words).
- Pitcher metrics handled worse (relief-pitcher innings trend compounds); 1973 DH-rule artifact visible in Fig. 2B.
- Baseline P_baseline is arbitrary and shifts ranges (Ruth's 214 "HR" is illustrative, not literal).
- Extreme tails don't collapse — outliers dominate ⟨P(t)⟩ in small samples.
- League-average deflator ignores position/specialization-specific trends.

## GSE overlap vs existing-research-map
- No era-adjustment/detrending method exists in the corpus — this is new territory, adjacent to the engine-benchmark lane (cross-era player comparison for props) and backtesting hygiene.
- NFL analogues of the non-stationarity: scoring inflation, 17-game season, XP moved to 33 yards (2015), kickoff rule changes — all shift per-opportunity success rates exactly like the paper's prowess series.

## Implementation spec (GSE adaptation)
1. **Era-adjusted player features:** compute per-opportunity prowess for NFL counting stats (e.g., passing yards per attempt, receiving yards per route, EPA per play) as league averages by season; renormalize player seasons to a common baseline before using them as features in prop/fantasy models. Prevents the model from mistaking era inflation for player skill.
2. **Stationarity gate:** run Dickey–Fuller on every candidate feature's league-average time series; non-stationary features get deflated, stationary ones (like the paper's Wins/Hits) pass through untouched.
3. **Backtest deflation:** renormalize historical betting results/lines by era scoring environment (⟨P(t)⟩ for points per game) so a strategy backtested across 2005–2025 isn't rewarded for era trends.
4. **Collapse check:** validate any deflator by the paper's distribution-collapse test — era-separated PDFs of the adjusted metric must collapse; if they don't, the deflator is misspecified.

## Reproducible test
1. Build NFL per-attempt (per-dropback) passing prowess 2000–2025; DF-test raw vs renormalized; check era-PDF collapse for QB season EPA/dropback.
2. Gate: renormalized series must pass DF stationarity (p < 0.05) while raw fails, AND era-separated PDFs must collapse in the bulk. If the NFL's shorter history (vs 139 years MLB) gives insufficient power, the method still applies but the validation bar lowers to the collapse check.

## Numeric gate
**DF: HR −3.7 (p=0.57) → −31.5 (p=0.0004) after renormalization; PTS −6.4 (p=0.3) → −22.2 (p=0.003); collapse to x^D ≈ 35 HR / 2500 NBA pts; Log-Series HR p = 0.996975.** For GSE: gate is DF p < 0.05 on renormalized NFL feature series plus visual/PDF collapse across eras.

## Improvement experiment
Extend the deflator to be position-aware (the paper's acknowledged weakness): compute ⟨P(t)⟩ separately by position group (QB/WR/RB/TE) since rule changes hit positions asymmetrically (e.g., illegal-contact enforcement inflates WR but not RB prowess). Test whether position-specific deflators improve the PDF collapse vs the league-average deflator — if yes, GSE's era adjustment should be positional.

## Verdict
**ADAPT.** The prowess-deflator is a clean, validated, sport-agnostic method for era-adjusting performance metrics — directly usable for GSE's cross-era player features (props/fantasy) and era-neutral backtesting, with built-in validation (DF stationarity + distribution collapse). The paper's own framing ("possibly even different sports") invites exactly this transfer.

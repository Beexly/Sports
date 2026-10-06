# A2 — Regime-Shift Detectors for the Coaching-Tendency Engine (c03 slice)

**Analyst:** Deep Analyst A2 · **Phase:** 2 · **Date:** 2026-10-01
**Scope:** extract buildable regime-shift detector specs from c03 briefs 1905, 1888, 2129, 0598 (+ 0236 context); verify each against its source ledger in `~/workspace/vendor/Sports/docs/arxiv-program/research/2026-09-21/arxiv-deep/`; design the coordinator-change application; rank by buildability.

**Verdict key:** SPEC = fully specified but never run (paper evidence is cross-domain; the NFL regime-detection use is the ledger reader's own proposal). RUN = the method itself was executed with reported numbers. All four methods' NFL/coaching applications are SPECs — none has been run on NFL data. Only 0598 has a RUN result on real sports data (European football).

---

## 1. Per-method verification + algorithm spec

### 1a. 0598 — Permutation two-sample team-strength regime test (Rastogi et al. 2021, arXiv:2006.11909v2)

**Verdict: RUN** (on European football) + fully specified port for NFL. Ledger verdict: ADAPT.
Brief: `briefs/c03/r06/...0598-twosample-testing-on-ranked-preference-data.brief.md` — verified against source ledger line-by-line; **one correction**: the brief's T-statistic denominator was garbled in transcription (`...` in the denominator). The source's Eq. 8 is:

**Algorithm (inputs, computation, outputs).**
- Inputs: two populations of pairwise-comparison outcomes. Theory: d items, per-pair comparison counts k^p_ij, k^q_ij, win counts X_ij ~ Bin(k^p_ij, p_ij), Y_ij ~ Bin(k^q_ij, q_ij).
- Statistic (Eq. 8): T = Σ_{i,j} I_ij [ k^q(k^q−1)(X²−X) + k^p(k^p−1)(Y²−Y) − 2(k^p−1)(k^q−1)XY ] / [ (k^p−1)(k^q−1)(k^p+k^q) ] — unbiased-for-zero-under-null quadratic form.
- Decision rule: reject H0 (P = Q) when T ≥ 11d; general threshold d√(24(2−ν)/ν) for error ν. Permutation variant (Algorithm 2) gives sharp finite-sample Type I control — **use this variant in practice**.
- Hypotheses (Eq. 1): H0: P = Q vs H1: (1/d)||P−Q||_F ≥ ε.
- Sample complexity: testing needs only k = O(1/(dε²)) comparisons/pair vs estimation's k = O(log d/ε²) — **testing is far cheaper than estimation**. k ≤ 1 impossible in general (minimax risk ≥ 1/2 for ε ≤ 1/2, Proposition 4). NFL schedules give k ≈ 1–2 games per pair per season — near the boundary, which is exactly why the permutation variant (Algorithm 2) is the recommended port, not the asymptotic threshold.
- Headline negative result: assuming BTL/SST/Thurstone buys **nothing** computationally over the model-free test (Theorems 3, 5, 6) — license to use the simple test, not a fancier parametric change detector.

**RUN results (from the paper, via source §7):** European football 2016-17 vs 2017-18: FAIL TO REJECT, p = 0.971 combined (EPL 0.998, Bundesliga 0.691, La Liga 0.67, Ligue 1 0.787) — no detectable shift in relative team strength across consecutive seasons. Ordinal vs cardinal-converted-to-ordinal REJECTED, p = 0.003. Limitations: drops draws, ≤2 comparisons/pair (low power vs small shifts), detects *any* shift with **no attribution** of which teams changed.

**Data it needs:** nflverse game results (schedules: home/away teams, scores, spread_line; ties dropped or half-wins). The paper-exact form runs on the 32×32 team matchup matrix.

**Pre-registered acceptance gate (source §13, reader's):** adopt if (Test 1) false-rejection rate on within-season half-splits ∈ [2%, 10%] AND (Test 3) rejects 2020-vs-2019 (known structural break: COVID, no preseason) at p < 0.05. (Test 2): pre/post windows around ~20 in-season HC firings since 2015 — measure rejection rate.

---

### 1b. 1905 — ADKL task-embedding z^t drift (Tossou et al. 2019, arXiv:1905.12131v2)

**Verdict: SPEC — the z^t drift detector was never run.** The paper runs episodic meta-learning on sinusoids (5,000 tasks), BindingDB (7,620 protein tasks), PubChem (3,842 tasks) with ADKL-KRR/ADKL-GP vs R2-D2/CNP/MAML. Ledger verdict: ADAPT. **The regime-shift detector is the ledger reader's own GSE implementation spec (source §11 point 4) and improvement experiment (source §14)** — "monitor z^t drift week to week — a large jump in task embedding = scheme/coaching change detected from data, no manual regime labels needed." The map's Gaps section already records this: pre-registered spec, not a run result.

**Algorithm (inputs, computation, outputs) — the portable piece.**
- Task embedding: z^t = ψ_η(D^t_trn) = w(Concat(μ^t_xy, σ^t_xy)) — DeepSets permutation-invariant encoder: each input-target pair → xy_i = r(Concat(u(x_i), v(y_i))), empirical mean/std pooled, passed through w (Eq. 10).
- Conditional embedding: φ_θ(x; z_t) = o(Concat(u′(x), z_t)) (Eq. 11); adaptive kernel k_ADKL(x,x′;z_t) := k_ρ(φ_θ(x;z_t), φ_θ(x′;z_t)) (Eq. 9). Base kernel k_ρ = **linear** (best; RBF's shared length-scale resists adaptation — useful negative result).
- Regressors: ADKL-KRR h\*^t(x) = Σ α^t_i k_ρ(φ_θ(x), φ_θ(x_i)), α = (K_trn,trn + λI)⁻¹ y_trn (Eqs. 2–3); ADKL-GP with E[h\*^t] = K_val,trn(K_trn,trn+λI)⁻¹y_trn (Eqs. 5–7). Both end-to-end differentiable over b = 32 tasks × m = 10 (λ fixed = 1/|D_trn|).
- InfoNCE meta-regularizer (Eq. 12): Ĩ_η = (1/b)Σ_j ψ_η(D^{t_j}_trn)·ψ_η(D^{t_j}_val) − ln[(1/b(b−1)) Σ_{j≠i} exp(ψ_η(D^{t_j}_trn)·ψ_η(D^{t_i}_val))]; total objective argmin E_{t_j}[L^{t_j}] − γĨ_η, γ ∈ {0.1, 0.01} helps (Eq. 13).
- Key assumption: first two moments of nonlinear pair-embeddings suffice to identify a task's similarity structure; meta-train tasks cover the similarity-structure space of meta-test tasks.

**The drift detector (reader's spec, never run):** recompute z^t weekly from a rolling support of the last K games (K ≤ 4); drift d_w = ||z^t_w − z^t_{w−1}||_2; flag a large jump as regime change. Improvement experiment (§14): **regime-prototype memory** — bank of learned archetype prototypes (running means of z^t for rookie-QB, new-HC, backup-QB, post-bye); initialize a new team's embedding as an attention-weighted blend of prototypes instead of from a 2-game support alone.

**Data it needs:** nflverse team-game pairs grouped by team-season: x = game-context vector (tendency aggregates, EPA components, opponent strength), y = EPA margin; rookie-QB/new-HC seasons upweighted in meta-training. ~32 teams × ~10 seasons meta-train tasks.

**Pre-registered acceptance gate (source §13):** ADOPT iff ADKL-KRR/GP beats the league-average prior by **≥ 0.01 Brier** on new-regime first-4-game predictions (2023–2025 LOSO) AND beats fixed-kernel DKL by ≥ 0.005 Brier (proves task-conditioning transfers). Effort estimate: ~3 engineering weeks; **no public code** — implement from equations.

---

### 1c. 1888 — AdaER interference-scored replay (Li, Tang, Li 2023, arXiv:2308.03810v2)

**Verdict: SPEC — the scheme-change replay was never run on sports data.** The paper runs class-incremental Split-MNIST/FMNIST/CIFAR10/CIFAR100 vision continual learning. Ledger verdict: ADAPT ("vision benchmarks don't transfer, the buffer mechanics do"). The coaching application is the ledger reader's GSE implementation spec (source §11).

**Algorithm (inputs, computation, outputs).**
- C-CMR (replay stage): virtual classifier θ′ = θ − α∇_θ l(f_θ; B_t) — one SGD step on the new batch without replay (Eq. 3); interference score s(m) = l(f_θ′(x_m), y_m) − l(f_θ(x_m), y_m), s ∈ ℝ^{M×1} (Eq. 4); higher s(m) = more forgotten by the new batch. Top-p → example-interfered buffer R_e; task-level transfer/interference analysis → task-associated buffer R_t; replay R = R_e ∪ R_t.
- E-BRS (update stage): entropy-balanced reservoir — keep per-class counts uniform (cheap proxy for entropy maximization); on eviction remove the *least important* by the C-CMR score, protecting most-forgotten examples.
- RUN numbers: Split-MNIST 89.6% (+3.7% over ER), Split-FMNIST 74.0% (+6.3% over ER); CIFAR10 backward transfer +4.4 vs −19.9 for ER; forgetting 18.0, 28.0% lower than MIR; AdaER buffer-size-insensitive (M 50→200 lifts GEM +49.9% but AdaER only +2.5%).

**NFL translation (reader's spec, the gradient-free variant):** GBMs have no SGD gradients, so replace the virtual classifier with a **challenger LightGBM fit on the new week's games only**; score every buffered game by s(m) = loss(challenger on m) − loss(champion on m); refit training set = new week + top-p interfered historical games + stratum-balanced reservoir (strata = spread band × season-half). Serving cost: O(buffer) LightGBM predictions — seconds. Effort: ~1–2 days.

**Critical design inversion for regime changes (my analysis, flagged for the builder):** the paper's prescription is to *protect* high-interference examples from eviction (avoid forgetting old knowledge). For a coordinator/scheme change, pre-change games encode the **stale** regime — replaying them drags the model back. The coaching-engine application must **invert** the paper: use s(m) as a regime-conflict detector, then **quarantine/downweight** pre-change high-s games (weight 0.25 or drop) rather than protecting them. The paper's R_t (task-associated) half needs task IDs, which NFL doesn't have — droppable, per the reader.

**Data it needs:** nflverse game-level features (team EPA aggregates, rest, spread_line from schedules), home-win or margin target, 2015–2025 walk-forward; requires an existing **weekly GBM refit pipeline with champion/challenger** — verify that pipeline exists before scheduling this.

**Pre-registered acceptance gate (source §13):** on 2020–2025 walk-forward, P3 (interference + balanced buffer) beats P2 (plain replay) on ≥3 of 4 metrics (final Brier, worst-4-week Brier, anytime Brier, early-season forgetting), worst-4-week Brier improves ≥ 0.002, no metric degrades > 0.001; **reject the balancing half independently if ECE increases > 0.005** (forced balance can distort calibration).

---

### 1d. 2129 — ProbFM NIG evidential head (ProbFM authors 2026, arXiv:2601.10591v1)

**Verdict: SPEC with hard pre-registered gates — the epistemic-rise-on-regime-shift was never run.** The paper runs LSTM-backbone method comparisons and a crypto trading experiment (DER sizing: Sharpe 1.33 vs MSE 0.90; Sortino 2.27 vs 1.52; Calmar 3.04; win rate 0.52). Ledger verdict: ADAPT ("adopt the evidential head design, verify calibration independently"). The regime-shift behavior is the reader's hard gate (§13) and improvement experiment (§14), not paper evidence.

**Algorithm (inputs, computation, outputs).**
- Head: Normal-Inverse-Gamma Deep Evidential Regression on a sequence encoder; one forward pass outputs (m, λ, α, β), λ, α, β > 0 via softplus.
- NIG prior: p(μ,σ²|m,λ,α,β) = N(μ|m,σ²/λ)·InvGamma(σ²|α,β).
- Decomposition: **aleatoric = β/(α−1); epistemic = β/((α−1)·λ); total predictive variance = β/(α−1)·(1 + 1/λ).**
- Loss: L = L_NLL^evidential + λ_reg·L_R (evidence regularizer penalizing evidence on errors) + λ_cov·L_coverage; evidence annealing schedule proposed.
- Use: prediction m with decomposed uncertainty; epistemic → abstain/resize (model doesn't know); aleatoric → fair-price no-bet width (game inherently random).
- Key limitations (source §9): "foundation model" title outruns the evidence (LSTM-scale only, no 100M+ TSFM demo); Gaussian likelihood misspecified for skewed sports outcomes (key numbers, blowout skew); evidence annealing = fragile hyperparameters; miscalibrated epistemic is worse than none for abstention; single-pass uncertainty can be overconfident OOD.

**Data it needs:** NFL 2015–2024 margins/totals; **requires a sports TSFM backbone (2122/2126) to attach the head to** — head swap is 2–3 engineer-weeks after the backbone exists; independent calibration audit mandatory before any sizing use.

**Pre-registered acceptance gates (source §13):** ADOPT iff (a) CRPS within 1% of quantile-head baseline, (b) 80% intervals within ±4 pts of nominal, AND (c) epistemic-gated staking beats ungated on stake-weighted yield over 2022–2024; **hard REJECT for sizing if epistemic does not rise on held-out regime-shift games** (decomposition then decorative). Improvement experiment (§14): synthetic corpus with known coaching/QB change points — epistemic should spike while aleatoric stays flat, faster than ensemble disagreement at ~1/10th compute.

---

### Context: 0236 — doubly-online changepoint (Stival et al. 2022, arXiv:2206.11578v1)
**Verdict: SPEC** (paper runs on 85 smartwatch running activities; NFL port specified, never run). Latent changepoint chain S_n with p(S_n|S_{n−1}) = λ for a new segment; Gaussian state-space per segment (segment trend α_t^(s) + activity disturbance α_{n,t}); online EM + SMC; changepoint rule p̂(D_n = 1 | y_{1:n,1:T}) > δ, δ = 0.5. Trust flag: 34 changepoints in 85 activities (40%) = over-aggressive at δ = 0.5; λ = 0.5 fixed arbitrarily; no comparison to CUSUM/BOCPD. Gate: beat CUSUM on F1 vs injury/role-change ground truth on 2019–2023, recall ≥ 0.6 on injury weeks at specificity ≥ 0.8, alert volume ≤ 2 flags/team-week. Listed here because the map groups it in the regime pattern; ranked below the four in §4.

---

## 2. Coordinator-change / scheme-shift applications (concrete, not abstract)

Shared data contract for all four. Weekly team tendency vector from **nflverse play-by-play** (nfl_data_py / nflfastR), neutral-script filtered (win probability 0.20–0.80, or equivalently score differential within ±16 and qtr ≤ 3 — excludes garbage time and kneel-down script):
- `early_down_pass_rate` = mean(`pass`) on `down ∈ {1,2}`, neutral script
- `neutral_pass_rate` = mean(`pass`) on all neutral-script plays
- `shotgun_rate` = mean(`shotgun`) on neutral-script plays
- `no_huddle_rate` = mean(`no_huddle`) on neutral-script plays
- `adot` = mean(`air_yards`) on pass attempts (dropna)
- `quick_game_proxy` = share of attempts with `air_yards ≤ 5` (pbp-available proxy; true time-to-throw is NGS — internal-only per the NGS doctrine, usable inside the engine)
- `play_action_rate` = mean(`play_action`) where the nflverse build carries it
- `motion_rate` = mean(`motion_at_snap`) where available (2024+ pbp; earlier seasons need charted data)
- `early_down_rush_epa` / `dropback_epa` = mean(`epa`) on rushes / `qb_dropback` plays (control for personnel quality vs scheme)

All are computable from standard nflverse pbp columns (`posteam`, `week`, `season`, `down`, `ydstogo`, `play_type`, `pass`, `rush`, `shotgun`, `no_huddle`, `qb_dropback`, `air_yards`, `wp`, `score_differential`, `qtr`, `epa`). No new data contracts.

### 2a. 0598 → the regime gate on the announced change
Two variants:
- **Variant A (paper-exact):** build the 32×32 team-vs-team outcome matrix pre vs post change-week, run the permutation T test. Limited by k ≈ 1–2 games/pair in-season — best on multi-season aggregates or the whole-league matrix (tests "did the league's strength hierarchy shift after this coaching carousel").
- **Variant B (coaching-tendency adaptation — the buildable one):** for the team with the announced coordinator change at week w, split its weekly tendency vectors into pre = weeks [max(1,w−8), w−1] and post = weeks [w, w+5]; statistic = squared standardized mean difference of the vectors; p-value by permuting week labels (5,000 permutations).
- **Decision rule (two gates, both must clear):** (i) permutation p < 0.05; (ii) practical effect — ≥1 core tendency shifts ≥ 5 percentage points (|Δ early-down pass rate| ≥ 0.05, or |Δ aDOT| ≥ 1.5 yds, or |Δ shotgun rate| ≥ 0.05) sustained over the post window. A 5pp sustained move is operationally a playbook change, not noise (~60 neutral-script plays/week gives ±6pp weekly noise; the permutation test handles the noise, the 5pp gate handles the "so what").
- **Engine action on REJECT:** expire the team's pre-change tendency profile — downweight pre-change weeks to 0 over the next 2 weeks, rebuild the team's play-call tendency priors from the post-change window only, and flag the team's props/sides for manual review until the new profile has ≥4 weeks. On FAIL TO REJECT: keep the existing profile (coaching change was personnel-continuity, e.g., internal promotion keeping the scheme — the common false-alarm case this test prevents).

### 2b. 1905 → continuous unsupervised drift monitor (catches unannounced shifts)
- Meta-train ψ_η once on nflverse team-seasons (2015–2024; rookie-QB/new-HC upweighted; InfoNCE γ = 0.1). At serving time, each week recompute z^t from the rolling last-K games (K = 4) of (game-context, EPA-margin) pairs.
- **Decision rule:** drift d_w = ||z^t_w − z^t_{w−1}||_2; convert to a z-score against the team's own trailing-16-week drift distribution; **flag if drift z ≥ 3.0** (≈ a 3σ weekly jump in how the model perceives the team's similarity structure). The value of 3.0 is a starting prior — calibrate on the ~20 in-season firings since 2015: require recall ≥ 0.6 with ≤ 2 false flags per team-season.
- **Why this matters beyond 0598:** no announced change point needed. Detects a coordinator quietly changing the offense mid-season (e.g., new play-caller after a bad stretch, QB-injury-driven scheme pivot) before the market or the depth chart acknowledges it. The regime-prototype bank (rookie-QB / new-HC / backup-QB / post-bye archetypes, source §14) lets you label the drift: "this team's embedding just moved toward the backup-QB prototype."
- **Engine action on flag:** same expiry as 2a, plus route the team to the analyst queue — the drift direction (which prototype it moved toward) is the content.

### 2c. 1888 → weekly conflict audit (detects staleness + curates the refit set)
- Each week: fit challenger LightGBM on the new week's 16 games only; score every buffered game s(m) = Brier(challenger on m) − Brier(champion on m).
- **Coordinator-change read:** if ≥ 50% of the top-20 conflict games belong to one team's pre-change weeks (or a team's post-change games dominate the high-s set against its own history), flag regime conflict. Per-game magnitude: s(m) z-score ≥ 2.0 vs the buffer distribution.
- **Inverted prescription (differs from the paper on purpose):** quarantine pre-change high-s games (weight × 0.25 or drop) — they encode the stale scheme — while keeping the paper's E-BRS stratum balance (spread band × season-half) on the rest. Run the independent ECE check: drop the balancing half if ECE rises > 0.005.
- **Engine action:** the refit training set becomes new week + post-change games + balanced reservoir of unrelated history. This is the mechanism by which the weekly refit *stops* learning the old coordinator's tendencies — the closest thing in this set to an automatic unlearning rule.

### 2d. 2129 → epistemic spike as the "model is lost" alarm
- Once the NIG head is on the TSFM backbone: track per-team weekly epistemic e_w = β/((α−1)λ) on the margin forecast.
- **Decision rule:** flag if e_w ≥ 2× the team's trailing-8-week median for 2 consecutive weeks. The hard gates stay hard: if epistemic does NOT rise on held-out known regime-shift games, the head is decorative — reject for sizing and do not trust the alarm.
- **Coordinator-change read:** epistemic should rise at the change (model's similarity assumptions broken) while aleatoric stays flat (games aren't inherently more random). That decomposition is the diagnostic: a spike in total variance alone is ambiguous; epistemic-up/aleatoric-flat is the signature of "the world changed, not the dice."
- **Engine action:** epistemic-spike → abstain/resize picks involving that team (per the stake-gating doctrine) and trigger the 0598 confirmation test on its tendency vectors. Note the dependency chain: this is the last of the four to build (needs the TSFM backbone + calibration audit first).

---

## 3. Buildability ranking (1 = build now)

### #1 — 0598 permutation two-sample regime gate
- **Why first:** no model training, no new data, ~50–100 lines (statistic + permutation loop, both fully specified in the paper), RUN-validated on real football data (p = 0.971 negative baseline), pre-registered numeric acceptance gates (false-rejection ∈ [2%,10%]; must reject 2020-vs-2019), and a direct decision rule (p < 0.05 + 5pp practical gate → expire pre-change profile). The permutation variant is robust to NFL's k ≈ 1–2 schedule sparsity.
- Effort: ~1 engineer-week including the nflverse tendency-vector pipeline and the three validation tests (half-split calibration, 20-firings power, 2020-vs-2019 break).
- Function signature:
```python
def detect_coordinator_regime_shift(
    team: str,
    season: int,
    change_week: int,                    # first week under the new regime
    tendency_features: list[str] = DEFAULT_TENDENCY_FEATURES,  # §2 vector
    pre_window: tuple[int, int] | None = None,   # default (max(1, change_week-8), change_week-1)
    post_window: tuple[int, int] | None = None,  # default (change_week, change_week+5)
    n_permutations: int = 5000,
    alpha: float = 0.05,
    min_shift_pp: float = 0.05,          # practical gate: ≥5pp on ≥1 core tendency
    min_shift_adot: float = 1.5,         #   or ≥1.5 yds aDOT
) -> RegimeShiftResult:
    # RegimeShiftResult { reject: bool, p_value: float, stat: float,
    #                     per_feature_deltas: dict[str, float],
    #                     decision: Literal["EXPIRE_PRE_CHANGE_PROFILE",
    #                                       "KEEP_EXISTING_PROFILE"],
    #                     evidence: dict }  # windows, n_weeks, neutral-script play counts
```
- Also ship the calibration harness:
```python
def calibrate_regime_gate(seasons: range = range(2015, 2025)) -> CalibrationReport:
    # Test 1: random within-regime half-splits -> false-rejection rate (gate: 2-10%)
    # Test 2: ~20 in-season HC firings since 2015 -> rejection rate (power read)
    # Test 3: 2020 vs 2019 -> must reject p<0.05 (known structural break)
```

### #2 — 1888 AdaER interference-scored buffer
- **Why second:** the core loop is 1–2 days of code and O(buffer) predictions (seconds); it is the only method here that *acts* on a detected shift (quarantines stale-regime games) rather than just flagging it; pre-registered 4-metric acceptance gate vs the plain-replay baseline.
- **Dependency to verify first:** an existing weekly GBM refit pipeline with champion/challenger. If that pipeline doesn't exist, this drops to #3.
- **Design risk to resolve in build:** the paper's protect-high-interference rule must be inverted for stale regimes (quarantine, don't protect) — pre-register the inversion and gate it; do not ship the paper's rule verbatim.
- Function signature:
```python
def score_buffer_interference(
    champion,                       # current production model (predict_proba interface)
    new_week_games: pd.DataFrame,    # just-completed week's games, with features
    buffer: pd.DataFrame,           # trailing history buffer
    target: str = "home_win",
) -> pd.Series:                     # s(m) = loss(challenger) - loss(champion) per buffered game

def build_regime_aware_refit_set(
    new_week_games: pd.DataFrame,
    buffer: pd.DataFrame,
    interference: pd.Series,
    top_p: int = 20,
    strata: list[str] = ["spread_band", "season_half"],
    quarantine_weight: float = 0.25,   # weight for pre-change high-s games (the inversion)
    known_change: tuple[str, int] | None = None,  # (team, week) if announced
) -> tuple[pd.DataFrame, RegimeReport]:
    # RegimeReport { conflict_teams: list[str],  # teams dominating the top-conflict set
    #                flag: bool,                  # >=50% of top-20 conflicts from one regime
    #                ece_delta: float }            # kill the balancing half if > 0.005
```

### #3 — 1905 ADKL z^t drift monitor
- **Why third despite being the most on-concept:** ~3 engineering weeks, no public code (implement from equations), needs a meta-training harness over ~300 team-seasons, and the drift threshold (z ≥ 3.0) is uncalibrated until measured on the firings dataset. The detector is the reader's inference, not paper evidence. Highest ceiling (catches unannounced shifts; prototype-labeled drift is analyst content), highest build cost.
- Build order within the item: (1) DeepSets encoder + InfoNCE meta-training with the §13 acceptance gate (≥0.01 Brier vs league-average prior on new-regime first-4-game predictions; ≥0.005 vs fixed-kernel DKL) — if this fails, stop, the drift signal is meaningless; (2) weekly drift monitor; (3) regime-prototype bank.
- Function signature:
```python
def train_regime_encoder(
    team_seasons: pd.DataFrame,   # (context_vector, epa_margin) pairs, 2015-2024
    upweight_new_regime: bool = True,   # rookie-QB / new-HC seasons
    gamma: float = 0.1,                 # InfoNCE weight (Eq. 13)
    base_kernel: str = "linear",        # linear beat RBF in the paper
) -> DeepSetsEncoder: ...

def encode_team_regime(
    team_games: pd.DataFrame,     # rolling last-K games (K=4): (context, margin) pairs
    encoder: DeepSetsEncoder,
) -> np.ndarray: ...             # z^t

def regime_drift_zscore(
    z_history: list[np.ndarray],  # weekly z^t, most-recent last
    trailing: int = 16,
    threshold: float = 3.0,
) -> tuple[float, bool]: ...     # (drift z-score, flag)

def label_drift_direction(
    z_new: np.ndarray,
    prototype_bank: dict[str, np.ndarray],  # rookie-QB / new-HC / backup-QB / post-bye
) -> str: ...                                # nearest archetype = the content label
```

### #4 — 2129 ProbFM NIG epistemic monitor
- **Why last:** deepest dependency chain (sports TSFM backbone must exist first; head swap is 2–3 weeks *after* that), Gaussian likelihood misspecified for football margins, evidence-annealing fragility, and the entire regime-shift behavior is pre-registered, never observed. It is the right long-term alarm (epistemic-up/aleatoric-flat is the cleanest "world changed" signature), but nothing about it is buildable this week.
- Function signature (for when the backbone lands):
```python
def forecast_with_epistemic(
    team_week_context,           # TSFM encoder input for the team-week
    head: NIGHead,               # (m, lambda, alpha, beta) via softplus
) -> tuple[float, float, float]: ...   # (m, aleatoric=beta/(alpha-1),
                                       #  epistemic=beta/((alpha-1)*lambda))

def epistemic_regime_flag(
    epistemic_series: pd.Series,  # weekly epistemic per team
    mult: float = 2.0,             # flag at >= 2x trailing median
    median_window: int = 8,
    confirm_weeks: int = 2,
) -> bool: ...
```

### The single most buildable detector
**0598's permutation two-sample regime gate (Variant B).** It is the only method in this set with (a) a real sports RUN result, (b) zero training dependencies, (c) a fully specified statistic + permutation decision rule, (d) pre-registered numeric acceptance gates, and (e) a direct mapping to the engine action (expire vs keep the pre-change tendency profile). Build `detect_coordinator_regime_shift` + `calibrate_regime_gate` first; use 1888's conflict audit as the weekly complement (staleness → automatic quarantine in the refit set); treat 1905 and 2129 as the sequenced follow-ons once their gates are earned.

---

## Appendix — verification notes

- All four source ledgers read in full from `~/workspace/vendor/Sports/docs/arxiv-program/research/2026-09-21/arxiv-deep/` (1905: 74 lines, 1888: 62, 2129: 65, 0598: 52, plus 0236: 76 for context).
- **Brief corrections applied:** (1) 0598 brief's T-statistic denominator garbled in transcription — replaced with the source Eq. 8 form; (2) for 1905/1888/2129, the briefs present the coaching-regime applications as findings-adjacent — the sources show they are the ledger readers' own implementation specs (§11) and improvement experiments (§14), never run. This doc marks them SPEC accordingly.
- **Honest scope boundary:** no part of any method's *coordinator-change* application has been executed on NFL data. The buildability ranking is by dependency depth and specification completeness, not by measured NFL performance.
- nflverse field availability hedges: `play_action` and `motion_at_snap` are noted "where the build carries them" (motion coverage is 2024+; earlier seasons need charted data). Everything else in the §2 vector is standard pbp.

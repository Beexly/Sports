# Causal E-Process Theory — the defensible version

**Garrett Ryan Baxley · Galaxy Sports Edge · August 2026 · v1.2**

> **Status: implemented, not yet validated.** This document states only what the
> running system supports. Where evidence does not exist yet, it says so. Section 6
> is deliberately empty of performance numbers, and the reason is given there.
>
> This supersedes the earlier draft (`baxley_cept_document_humanized.pdf` and the
> DeepSeek markdown variants) for any external use — arXiv, investors, the website.
> Section 8 explains, claim by claim, what was removed and why.
>
> **v1.1** follows an adversarial multi-referee mathematical audit of v1.0. Two
> substantive corrections were made: the main result is restated as a
> composite-null theorem because the earlier premise was not well-posed
> (Remark 4 records the counterexample), and the earlier "dropped-set Brier"
> integrity check was found to be mathematically vacuous and replaced
> (Proposition 6). **v1.2** folds in the cross-examination round: the novelty
> claim in §7 is narrowed to proposal-and-design (nothing robust runs yet), the
> Corollary to Proposition 5 is sharpened against a base-rate trap, and related
> work extends to the full prior-art frontier. Section 10 is the changelog.

---

## 1. The problem: prediction as intervention

A published forecast changes what it forecasts. An election model moves turnout; a
stock call moves the price; a widely-followed betting pick moves the line. The
predictor is inside the system, which breaks the assumption underneath ordinary
scoring: that outcomes are independent of the act of predicting.

This is not a hypothetical for a sports forecasting product. If a pick moves the
market, then "was the pick right?" and "did the pick have an edge?" stop being the
same question. A pick that looks right because the line moved toward it has told you
nothing about skill.

Economic sociology named the general phenomenon performativity (Callon, 1998;
MacKenzie, *An Engine, Not a Camera*, 2006); Goodhart's law is a special case. What
has been missing is a *sequential test* that stays valid when the predictor is part
of the loop.

## 2. What already exists, and what does not

The machinery this framework needs is largely established:

- **E-values and e-processes.** A non-negative statistic with expectation at most 1
  under the null. Ville's inequality (1939) then gives, for any α,
  `P(sup_t M_t ≥ 1/α) ≤ α` — a test valid at *every* stopping time, with no
  multiplicity correction. Modern treatment: Ramdas et al., *Statistical Science* 38(4), 2023.
- **Interventional reasoning.** Pearl's `do`-calculus (2009).
- **Multiplicative-weights ensembling.** Hedge, with cumulative regret at most
  `√(T ln K / 2)` against the best of K experts — an average of `√(ln K / 2T)` per
  round (Cesa-Bianchi & Lugosi, 2006).

**None of the above is novel here, and this document does not claim it is.** The
contribution is narrower and is stated in §3; §7 places it against the closest
existing work.

## 3. The construction

(§7 states precisely what of this is, and is not, claimed as new.)

### 3.1 Setup

Rounds `t = 1, 2, …` on a filtered probability space; `F_{t-1}` is everything known
before the outcome `Y_t ∈ {0,1}` resolves. In each round the forecaster publishes,
and the world reacts — the line moves, exposure shifts, other actors respond. Model
the reaction as an intervention `ι_t` drawn from an **admissible set** `I_t`.
Two regularity conditions:

- **(R1)** `I_t` is nonempty, `F_{t-1}`-measurable, and countable (or, more
  generally, rich enough that the infimum below is measurable). The *menu* of
  possible reactions is fixed before the outcome; **which reaction actually occurred
  need never be known — not at time t, not ever.**
- **(R2)** For each `i ∈ I_t` there are two `F_{t-1}`-measurable probability
  distributions on `{0,1}`: the market's interventional model `m_t(·|do(i))` and the
  forecaster's `p_t(·|do(i))`.

**The composite null — "no skill, however the world reacted":**

```
H₀(I):  there exists an adapted selection ι_t ∈ I_t (each F_{t-1}-measurable)
        such that  Y_t | F_{t-1}  ~  m_t(·|do(ι_t))   for every t.
```

`H₀(I)` is a *set* of laws — one for every admissible reaction path. It is composite
precisely because performativity makes the data-generating law depend on a reaction
we do not observe.

**The statistic — the intervention-infimum E-factor:**

```
E_t = inf_{i ∈ I_t}  p_t(Y_t | do(i)) / m_t(Y_t | do(i))
M_t = Π_{s≤t} E_s ,    M_0 = 1
```

with the convention that a branch with `m_t(y|do(i)) = 0 < p_t(y|do(i))` reads `+∞`
and `0/0` reads `1`; neither affects validity, because under the null the actually
operative branch has positive denominator almost surely.

**Theorem 1 (performativity-robust anytime validity).** Under (R1)–(R2), `M` is a
non-negative supermartingale with `M_0 = 1` under **every** `P ∈ H₀(I)`.
Consequently, by Ville's inequality,

```
sup_{P ∈ H₀(I)}  P( ∃t : M_t ≥ 1/α )  ≤  α        for every α ∈ (0,1],
```

and `E_P[M_τ] ≤ 1` for every stopping time `τ`, bounded or not.

*Proof.* Fix `P ∈ H₀(I)` with its reaction selection `(ι_t)`. Since `ι_t ∈ I_t`
almost surely, the infimum is bounded by that member pointwise:
`E_t ≤ p_t(Y_t|do(ι_t)) / m_t(Y_t|do(ι_t))`. Because `ι_t` and both models are
`F_{t-1}`-measurable and `Y_t | F_{t-1} ~ m_t(·|do(ι_t))`,

```
E[ p_t(Y_t|do(ι_t)) / m_t(Y_t|do(ι_t)) | F_{t-1} ]
   = Σ_{y : m_t(y|do(ι_t)) > 0}  p_t(y|do(ι_t))   ≤   1 .
```

Hence `E[E_t | F_{t-1}] ≤ 1`. Each `E_t` is non-negative and measurable by (R1), so
`M` is a non-negative supermartingale, and Ville's inequality gives the uniform
crossing bound. For the last claim: `M_∞ := lim_t M_t` exists almost surely by the
supermartingale convergence theorem for non-negative supermartingales, and Fatou's
lemma applied to the stopped sequence `M_{τ∧n}` gives `E[M_τ] ≤ 1` for every stopping
time `τ`, possibly infinite. ∎

The same argument, conditioning on `(F_{t-1}, ι_t)`, extends `H₀(I)` to
**randomized** reactions — `ι_t` drawn from any non-anticipating kernel supported on
`I_t` — which strictly enlarges the null at no cost to the theorem.

**Lemma 2 (consistency).** If `I_t = {ι_t}` is a singleton — the reaction is known —
then `E_t` is the ordinary likelihood ratio and `M` is the classical e-process of §4.
Under the alternative `Y_t ~ p_t(·|do(ι_t))`, the expected log-growth per round is
the Kullback–Leibler divergence `KL(p_t ‖ m_t)`, which is the growth-optimal rate
against a simple null. The robust test therefore loses nothing when no robustness is
demanded.

**Remark 3 (the price, and the open problem).** The infimum buys uniform validity
over `H₀(I)` and pays in power: the larger `I_t`, the smaller `E_t`, and with a
badly chosen `I_t` the test may never reject even when skill is real. `I_t` should
contain exactly the reactions one wants robustness against and nothing more.
**Choosing `I_t` is the open problem of this framework**, and it is a modeling
decision, not a theorem. Two boundary facts keep the guarantee honest. First, it is
exactly as wide as the menu: if the world's actual reaction falls outside `I_t`,
that law is not in `H₀(I)` and no validity is claimed — a menu that excludes the
realized reaction can make `E[E_t] > 1`. Second, (R1) requires the *menu* to be
predictable: if `I_t` itself could be chosen after seeing `Y_t`, no fixed member
need exist to bound the infimum, and the proof — and the validity — fail.

**Remark 4 (what v1.0 got wrong, kept so the correction is auditable).** The earlier
Proposition 1 assumed each fixed-`i` ratio was "an e-value under H₀" for a single
unspecified null. That premise is not well-posed under performativity: if `Y_t` is
generated under reaction `i*`, the fixed-`i` ratio for `i ≠ i*` need not be an
e-value at all. Counterexample: interventions `a, b` with `m(1|do(a)) = 0.9`,
`m(1|do(b)) = 0.1`, `p(1|do(b)) = 0.9`; under the law `do(a)`,

```
E[ p(Y|do(b)) / m(Y|do(b)) ] = 0.9·(0.9/0.1) + 0.1·(0.1/0.9) ≈ 8.11 > 1 .
```

Only the composite-null statement of Theorem 1 — validity under *every* admissible
reaction, obtained by taking the infimum — is true, and it is also the version worth
having: a test that does not require knowing how the world reacted.

## 4. What is implemented

Three sequential instruments, deliberately kept separate:

| Module | Null hypothesis | Answers |
|---|---|---|
| `forecast-skill-eprocess.ts` | outcomes drawn from the **market's** probabilities | do our forecasts beat the market's? |
| `anytime-ledger.ts` | true mean per-bet return ≤ nullMean | is it **profitable**? |
| `calibration-sequence.ts` | our stated probabilities are honest | are the numbers **self-consistent**? |

The skill test uses the plain likelihood-ratio e-process:

```
E_t = p_t / m_t          if y_t = 1
E_t = (1-p_t)/(1-m_t)    if y_t = 0
```

Under the null `Y_t ~ Bernoulli(m_t)` its conditional expectation is exactly 1 for
`m_t ∈ (0,1)`. At `m_t ∈ {0,1}` one branch is undefined, but that branch has
probability zero under the null and the surviving branch has expectation at most 1,
so validity is unaffected; market-derived probabilities in this system are interior
in any case.

**These three are never collapsed into one number.** Skill without profit (the vig
eats the edge) and profit without skill (variance, or a lucky stake schedule) are both
real states of the world. Reporting them as one figure would hide exactly the
distinction that makes the framework worth having.

Supporting components: a sequential-Monte-Carlo team-strength filter with
serverless-safe persistence, a Hawkes process for informed line movement, robust Kelly
sizing that fails closed, and `BAEEEnsemble` — online Bayesian model averaging whose
cumulative **log-loss** is within `ln K` of the best single model's in hindsight, for
every `T`, unconditionally (the classical mixture bound; it is a log-loss guarantee,
not a Brier guarantee).

## 5. Honest implementation status

- **BAEE is inert.** Its own header: *"NOT WIRED FOR BLENDING YET. It updates in shadow
  mode only."* It requires a second model to average against; none is live.
- **The engine runs in shadow mode.** It writes `ShadowSignal` and
  `FilterStateSnapshot` rows and gates nothing that reaches a user.
- **Live calibration eligibility is RED.** Floors are `n ≥ 100`, `Brier ≤ 0.22`,
  `ECE ≤ 0.05`, `Murphy reliability ≤ 0.05`, over 3 consecutive windows. Sample is met
  at ~150 settled; **Brier is not** — it sits near 0.2478 against a 0.25 baseline.
- The Murphy decomposition `BS = REL − RES + UNC` localizes why. With
  `REL ≈ 0.004` and `RES ≈ 0.0048`, the identity forces `UNC ≈ 0.2486`, i.e. a base
  rate near 0.537 (or 0.463) — a near-coin-flip world, exactly what market-priced
  games should look like. Reliability is already good; **resolution is ~0.0048 —
  effectively zero.** The forecasts are honest but not yet discriminating.

## 6. Empirical validation

**None yet. This section is intentionally empty of performance numbers.**

An earlier draft reported an average E-factor of 1.031 per game on NBA data 2022–2025,
with the null rejected at α = 0.01 after roughly 150 games, and stated that the Trust
Score was "climbing — proving the engine's edge is real and causally robust."

**Those numbers are not reproducible from this system and must not be published.** The
live engine's Brier score is statistically indistinguishable from a coin flip, its
resolution is ~0.0048, its calibration eligibility is RED, and the ensemble those
figures would have come from is not wired to blend anything. A framework whose entire
purpose is detecting self-fulfilling and unearned claims cannot itself rest on one.

What honest validation requires is governed by two small results and one negative
result, stated precisely so the procedure cannot drift.

**Proposition 5 (what selective publication does to the Brier score).** Publish only
picks with `|p − 0.5| ≥ δ`, and suppose forecasts are calibrated on the published set
(`E[Y | P = p, published] = p`). Then

```
BS_pub = π_δ(1 − π_δ) − Var[P | published] ,     π_δ = E[P | published] .
```

*Proof.* The publication event `{|P − 0.5| ≥ δ}` is `σ(P)`-measurable, so overall
calibration is automatically inherited on the published set — this is the one
regularity condition, and it holds because the rule reads nothing but `p` itself.
(If publication ever also conditions on covariates beyond `p`, published-set
calibration must be re-verified, not assumed.)
Conditional on `P`, `Y` is Bernoulli(`P`), so the squared error decomposes with zero
bias term: `BS_pub = E[P(1−P) | pub] = π_δ − E[P² | pub] = π_δ(1−π_δ) − Var[P | pub]`,
and under calibration `π_δ = E[P | pub] = E[Y | pub]`. ∎

*Corollary.* Since `π_δ(1−π_δ) ≤ 1/4`, targeting `Var[P | published] ≥ 0.03` always
suffices for `Brier ≤ 0.22`; the sharp requirement is
`Var[P | published] ≥ π_δ(1−π_δ) − 0.22`, exact at `π_δ = 1/2`. With current
resolution ~0.0048, the worst-case target is roughly six times current. One trap,
found in cross-examination: `π_δ ≈ 1/2` is a property of the *published forecast
distribution*, not of the filter — `|p − 0.5| ≥ δ` is symmetric for every δ, yet
`π_δ` can sit far from 1/2 when the forecasts themselves are asymmetric about 1/2.
Example: `P = 0.7` with probability 0.2 and `P = 0.45` with probability 0.8,
calibrated, has global base rate exactly 1/2 — but `δ = 0.1` publishes only the
`P = 0.7` picks, so `π_δ = 0.7` and `BS_pub = 0.21`. Raising δ is precisely the
operation that can push `π_δ` away from the global base rate. (v1.0 wrote the
global base rate `π` in the identity; the correct quantity is `π_δ`.)

**Proposition 6 (the naive integrity check is vacuous).** v1.0 proposed verifying
that the *dropped* set's conditional Brier "sits near 0.25," with a lower value
signaling that the filter hides market-beating picks. That check cannot work — and
not merely on average. For a single pick with forecast `p = 1/2 + ε` and outcome
`y ∈ {0,1}`, the realized score is `(p − y)² = 1/4 ∓ ε + ε²`. Dropped picks satisfy
`|ε| < δ`, so the dropped set's sample Brier lies in

```
[ 1/4 − δ(1−δ) ,  1/4 + δ(1+δ) ]      for every possible outcome sequence.
```

The statistic is pinned near 0.25 *deterministically, by the selection rule itself* —
it is a tautology of the filter, not a check on it. In expectation the same holds
against every world: `E[Brier] = (p − q)² + q(1−q)`, which at `ε = 0` equals `1/4`
for **every** true probability `q`. And the blindness cuts in the direction that
matters: take dropped picks with `p = 0.5`, true `q = 0.7`, market `m = 0.4`. Those
picks beat the market at an e-process log-rate of
`KL(0.7‖0.4) − KL(0.7‖0.5) ≈ 0.10` nats per pick — real, compounding, discarded
edge — while their Brier sits at exactly 0.25 and the v1.0 check passes. ∎

**The correct integrity instruments** — both already implemented, both to be run on
the *dropped* set:

1. **The skill-vs-market e-process of §4, restricted to dropped picks** (with `m_t`
   de-vigged, as everywhere else in the system). Growth of `M_t` on the dropped set
   is anytime-valid evidence that the filter is suppressing market-beating picks.
2. **Calibration on the dropped set**: the empirical win rate against the mean stated
   forecast (`calibration-sequence.ts`). A model that says 0.5 while winning 60% of
   the time is telling you it knows more than it publishes.

**The validation procedure**, in order:

1. Raise resolution via selective publishing (Proposition 5): emit a pick only when
   `|p − 0.5| ≥ δ`, targeting `Var[P | published] ≥ 0.03`.
2. Choose δ on an early chronological window and **evaluate it on a later one**. A
   threshold tuned and scored on the same rows is a curve fit. Report
   `π_δ = E[Y | published]` on the held-out window alongside `Var[P | published]`;
   if `π_δ` drifts from 1/2, the corollary's target becomes `π_δ(1−π_δ) − 0.22`,
   not 0.03.
3. Run both integrity instruments on the dropped set (the check Proposition 6
   replaces). Either instrument firing means the filter is discarding real skill and
   the published improvement is partly cosmetic.
4. Only then report `M_T` from `forecast-skill-eprocess.ts`, alongside the profit and
   self-honesty instruments, as three numbers.

Until step 4, the correct statement is: **"implemented and running in shadow mode;
validation pending settled evidence."**

## 7. Related work, and the precise novelty claim

CEPT as scoped here is a **composition**, not a new branch of mathematics. Placing it
honestly — and this list is deliberately the one a hostile referee would write:

- **Anytime validity** comes from e-processes: Ville (1939); the modern treatment and
  survey in Ramdas, Grünwald, Vovk & Shafer, *Statistical Science* 38(4), 2023.
- **The infimum device is old and known.** Worst-case likelihood ratios over a
  family go back to Huber's robust sequential probability ratio test via
  least-favorable pairs (Huber, *Ann. Math. Statist.*, 1965; Huber & Strassen,
  1973). In modern form, composite-null e-processes are exactly
  `E_t = inf_P M_t^P` (Ramdas, Ruf, Larsson & Koolen, 2020; *Int. J. Approx.
  Reasoning*, 2022); the worst-case-over-the-null requirement is the defining one
  in safe testing (Grünwald, de Heide & Koolen, *J. R. Statist. Soc. B*, 2024);
  and universal inference (Wasserman, Ramdas & Balakrishnan, *PNAS* 117(29), 2020)
  is the dual manoeuvre on the alternative. Theorem 1 is an instance of this known
  construction, and this document does not claim the device. Formally,
  `{m_t(·|do(i)) : i ∈ I_t}` is simply a composite family indexed by `i` — the
  `do`-notation supplies the *interpretation* of the null as the set of reactions
  to one's own forecast; it adds no mathematical content.
- **Sequential forecast evaluation with e-processes exists**, run on real
  forecasts: Henzi & Ziegel (*Biometrika*, 2022) on forecast dominance, Choe &
  Ramdas (*Oper. Res.*, 2024) on comparing forecasters — under single-world nulls,
  without performativity.
- **Anytime-valid testing in production platforms exists**: always-valid p-values
  ran at scale in Optimizely's experimentation platform (Johari, Koomen, Pekelis &
  Walsh, *Oper. Res.* 70(3), 2022). **Live martingale monitoring of deployed
  models exists**: Podkopaev & Ramdas (ICLR 2022) track deployed-model risk with
  time-uniform confidence sequences; Vovk et al.'s conformal test martingales
  (COPA 2021) detect distribution change. In each case the null is
  non-performative.
- **Performativity** originates in economic sociology (Callon, 1998; MacKenzie,
  2006). Its modern ML treatment, *performative prediction* (Perdomo, Zrnic,
  Mendler-Dünner & Hardt, ICML 2020, and successors), optimizes under
  prediction-induced distribution shift — performatively stable points, retraining
  to convergence — and fixed-sample statistical inference under performativity has
  recently appeared (Li et al., NeurIPS 2025). None of it provides *sequential,
  anytime-valid* tests under the shift.
- **Ensembling** is Hedge / Bayesian mixtures (Cesa-Bianchi & Lugosi, 2006).

**The claim being made**, then, is exactly this: *proposing* the instantiation of
the composite-null e-process construction with the null taken to be *the set of
admissible performative reactions to one's own published forecast, expressed as
`do`-interventions*, and *designing* its deployment as the skill instrument of a
production forecasting system, alongside separate profit and self-honesty
instruments. The intervention-infimum factor itself is specified here but not yet
running — it cannot run until `I_t` is chosen (Remark 3); what runs today is its
degenerate single-world case (§4, Lemma 2), in shadow mode (§5). As far as the
author is aware, the proposal and the deployment design — worst-case-over-reactions
likelihood ratios as a sequential robustness test wired into a forecasting product —
have no precedent; no priority is claimed for a completed robust deployment, because
none exists. It is a composition claim, deliberately modest, and it survived two
rounds of adversarial audit.

## 8. What was removed from the earlier draft, and why

Recorded so the deletions are not mistaken for oversights.

| Removed | Reason |
|---|---|
| Non-commutative probability, von Neumann algebras | `P(Y|X,do(p)) ≠ P(Y|do(p),X)` is an ordering-of-conditioning issue, not operator non-commutativity. The formalism was decorative and the analogy does not hold. |
| Symplectic geometry, Kostant-Souriau, moment maps | Stated as a theorem with no proof and no role in any result. |
| Causal Index Theorem (Atiyah-Singer) | Stated as a conjecture with no construction of the operator it concerns. |
| Chern class / obstruction theorem | No sheaf is constructed, so the class is undefined. |
| Euclidean QFT, holographic duality, Wheeler-DeWitt | Metaphor presented as mathematics. |
| "Theorem 4 (Universality): CEPT is the maximally general framework" | Not a theorem. No definition of the class it is maximal over, and no proof. |
| E-factor 1.031, null rejected after ~150 games | **Not reproducible from this system.** See §6. |
| "Trust Score is climbing — proving the engine's edge is real" | Contradicted by RED eligibility and an inert ensemble. |
| MPS/tensor-train with bond dimension 5 "outperformed" | The comparison was never run against live data. |

**A shorter true paper is worth more than a longer impressive one.** The removed
material is what a referee attacks first, and every hour spent defending decoration is
an hour not spent on §6 — which is the only section that would make the rest matter.

## 9. Priority

This file is committed to a public repository with git-signed timestamps, which
establishes date of authorship at no cost. That is sufficient for priority on a
mathematical framework; a provisional patent is not the right instrument here and
should not be purchased on this basis.

**Do not submit to arXiv until §6 contains real numbers.** A preprint claiming
validated skill from a system whose own calibration gate reads RED is a permanent,
searchable record that would be trivially falsified by anyone who reads the repository —
and this project's single durable asset is that it does not overstate its own
performance.

## 10. Changelog

- **v1.0 (2026-08-13).** First defensible version: unsupported theory and all
  empirical claims removed (§8); three instruments documented; validation steps
  stated.
- **v1.1 (2026-08-14).** Corrections from an adversarial multi-referee audit:
  1. Proposition 1 restated as **Theorem 1** under an explicit composite null with
     regularity conditions (R1)–(R2); the ill-posed premise of the old statement is
     recorded with a counterexample in Remark 4.
  2. The dropped-set-Brier integrity check shown **vacuous** (Proposition 6) — a
     forecast of 0.5 scores 0.25 against every possible world — and replaced with
     the e-process and calibration instruments run on the dropped set.
  3. `π → π_δ` in the selective-publication identity; proof added (Proposition 5).
  4. Hedge bound restated as cumulative `√(T ln K / 2)`; BAEE's `ln K` bound scoped
     to log loss.
  5. Related work expanded: performative prediction, safe testing, universal
     inference — and the novelty claim narrowed to the composition actually made.
- **v1.2 (2026-08-14).** Second round: cross-examination of v1.1.
  1. §7 no longer says the robust test has been "built and run." The
     intervention-infimum factor is *proposed* and its deployment *designed*; what
     runs today is the degenerate single-world case, in shadow mode. Priority is
     claimed for the proposal and design only.
  2. Corollary to Proposition 5 sharpened: 0.03 is the worst-case target (the sharp
     requirement is `π_δ(1−π_δ) − 0.22`), with a worked example showing a symmetric
     filter can still yield `π_δ` far from 1/2; validation step 2 now reports `π_δ`
     on the held-out window.
  3. Theorem 1 extended to randomized reactions (non-anticipating kernels on
     `I_t`) — same proof, strictly larger null.
  4. Related work extended to the full prior-art frontier: Huber's robust SPRT
     (the infimum device is sixty years old), composite-null e-processes,
     sequential forecast evaluation (Henzi–Ziegel; Choe–Ramdas), production
     anytime-valid testing (Optimizely), deployed-model martingale monitoring
     (Podkopaev–Ramdas; Vovk et al.), performativity's origins (Callon; MacKenzie)
     and fixed-sample inference under it (Li et al.).

---

*© 2026 Garrett Ryan Baxley. Framework composition and implementation. Underlying
results (Ville 1939; Huber 1965; Pearl 2009; Cesa-Bianchi & Lugosi 2006; Wasserman,
Ramdas & Balakrishnan 2020; Perdomo et al. 2020; Grünwald, de Heide & Koolen 2024;
Ramdas et al. 2023) are cited, not claimed.*

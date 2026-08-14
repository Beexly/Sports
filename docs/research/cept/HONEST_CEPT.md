# Causal E-Process Theory — the defensible version

**Garrett Ryan Baxley · Galaxy Sports Edge · August 2026**

> **Status: implemented, not yet validated.** This document states only what the
> running system supports. Where evidence does not exist yet, it says so. Section 6
> is deliberately empty of performance numbers, and the reason is given there.
>
> This supersedes the earlier draft (`baxley_cept_document_humanized.pdf` and the
> DeepSeek markdown variants) for any external use — arXiv, investors, the website.
> Section 8 explains, claim by claim, what was removed and why.

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

Economists call the general phenomenon performativity; Goodhart's law is a special
case. What has been missing is a *sequential test* that stays valid when the predictor
is part of the loop.

## 2. What already exists, and what does not

The machinery this framework needs is largely established:

- **E-values and e-processes.** A non-negative statistic with expectation at most 1
  under the null. Ville's inequality (1939) then gives, for any α,
  `P(sup_t M_t ≥ 1/α) ≤ α` — a test valid at *every* stopping time, with no
  multiplicity correction. Modern treatment: Ramdas et al., *Statistical Science* 38(4), 2023.
- **Interventional reasoning.** Pearl's `do`-calculus (2009).
- **Multiplicative-weights ensembling.** Hedge, with the standard `√(log K / 2T)`
  regret bound (Cesa-Bianchi & Lugosi, 2006).

**None of the above is novel here, and this document does not claim it is.** The
contribution is narrower and is stated in §3.

## 3. The contribution

**The intervention-infimum E-factor.** Instead of scoring a forecast against a single
realized world, score it against the *worst* world among a set of admissible
interventions:

```
E_t = inf_{i ∈ I_t}  p_t(Y_t | do(i)) / m_t(Y_t | do(i))
M_t = Π_{s≤t} E_s ,    M_0 = 1
```

**Proposition 1.** If for each fixed intervention `i` the ratio
`p_t(Y_t|do(i)) / m_t(Y_t|do(i))` is an e-value under `H₀` (no skill beyond the
baseline `m`), then `M_t` is a non-negative supermartingale and `E[M_τ] ≤ 1` for any
stopping time τ.

*Proof.* Each fixed-`i` ratio has conditional expectation at most 1 under `H₀`. A
pointwise infimum of a family is bounded above by any member, so
`E[E_t | F_{t-1}] ≤ 1`. Products of such factors form a non-negative supermartingale;
optional stopping gives `E[M_τ] ≤ 1`. ∎

*Honest scope.* The proof is a one-line consequence of taking an infimum. Its value is
not depth but **what it buys**: evidence that survives the worst admissible reaction of
the world is evidence of causal robustness, not just correlation. Ville's inequality
then converts `M_t` into an anytime-valid test. The cost is conservatism — the infimum
throws away power in exchange for robustness, and with a large or badly-chosen `I_t`
the test may never reject even when skill is present. **Choosing `I_t` is the open
problem of this framework**, and it is a modeling decision, not a theorem.

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

**These three are never collapsed into one number.** Skill without profit (the vig
eats the edge) and profit without skill (variance, or a lucky stake schedule) are both
real states of the world. Reporting them as one figure would hide exactly the
distinction that makes the framework worth having.

Supporting components: a sequential-Monte-Carlo team-strength filter with
serverless-safe persistence, a Hawkes process for informed line movement, robust Kelly
sizing that fails closed, and `BAEEEnsemble` — online Bayesian model averaging whose
blend is within `log K` of the best single model in hindsight, for every `T`,
unconditionally.

## 5. Honest implementation status

- **BAEE is inert.** Its own header: *"NOT WIRED FOR BLENDING YET. It updates in shadow
  mode only."* It requires a second model to average against; none is live.
- **The engine runs in shadow mode.** It writes `ShadowSignal` and
  `FilterStateSnapshot` rows and gates nothing that reaches a user.
- **Live calibration eligibility is RED.** Floors are `n ≥ 100`, `Brier ≤ 0.22`,
  `ECE ≤ 0.05`, `Murphy reliability ≤ 0.05`, over 3 consecutive windows. Sample is met
  at ~150 settled; **Brier is not** — it sits near 0.2478 against a 0.25 baseline.
- The Murphy decomposition `BS = REL − RES + UNC` localizes why: reliability is already
  good (~0.004), uncertainty is fixed near 0.25 by a near-50/50 world, and
  **resolution is ~0.0048 — effectively zero.** The forecasts are honest but not yet
  discriminating.

## 6. Empirical validation

**None yet. This section is intentionally empty.**

An earlier draft reported an average E-factor of 1.031 per game on NBA data 2022–2025,
with the null rejected at α = 0.01 after roughly 150 games, and stated that the Trust
Score was "climbing — proving the engine's edge is real and causally robust."

**Those numbers are not reproducible from this system and must not be published.** The
live engine's Brier score is statistically indistinguishable from a coin flip, its
resolution is ~0.0048, its calibration eligibility is RED, and the ensemble those
figures would have come from is not wired to blend anything. A framework whose entire
purpose is detecting self-fulfilling and unearned claims cannot itself rest on one.

What honest validation requires, in order:

1. Raise resolution. Under calibration `BS_δ = π(1−π) − Var[P | published]`, so
   reaching `Brier ≤ 0.22` needs `Var[P | published] ≳ 0.03` — roughly six times
   current. The lever is selective publishing: emit a pick only when `|p − 0.5| ≥ δ`.
2. Choose δ on an early chronological window and **evaluate it on a later one**. A
   threshold tuned and scored on the same rows is a curve fit.
3. Verify the integrity condition: the conditional Brier of the *dropped* set must sit
   near 0.25. Below that means the filter is hiding picks that were beating the
   market — published score improves while the product gets worse.
4. Only then report `M_T` from `forecast-skill-eprocess.ts`, alongside the profit and
   self-honesty instruments, as three numbers.

Until step 4, the correct statement is: **"implemented and running in shadow mode;
validation pending settled evidence."**

## 7. Related work, plainly

CEPT as scoped here is a **composition**, not a new branch of mathematics: e-processes
(Ville, Ramdas et al.) supply anytime validity; `do`-calculus (Pearl) supplies the
intervention set; Hedge (Cesa-Bianchi & Lugosi) supplies the ensemble bound. The
assembly — worst-case-over-interventions likelihood ratios as a live, sequential
robustness test in a production forecasting system — is, as far as the author is aware,
not something that has been built and run before. That is a modest and defensible
claim, and it is the one being made.

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

---

*© 2026 Garrett Ryan Baxley. Framework composition and implementation. Underlying
results (Ville 1939; Pearl 2009; Cesa-Bianchi & Lugosi 2006; Ramdas et al. 2023) are
cited, not claimed.*

# RULING-C1 — Composition of Pre-Registered Candidate #1

Status: RATIFIED — adopted 2026-10-15 by Garrett Baxley (owner), bundle item (2), WITH the Grok WO-7 honesty amendments (recorded as FREEZE-1 AMENDMENT blocks A1 and A2 below; the original text is preserved).
Ruling date: 2026-10-15. Drafter: Claude (Opus 5.5, Effort High), for the closure authority (Motif / Garrett). Freeze state at issue: UNFROZEN (draft ruling). Landed at FREEZE-1 (2026-10-15) and hashed in FREEZE-1.json (this directory).
Supersedes: the undefined phrase "a single joint" in the pit_round2 handoff and the audit's truncated composition phrase.
Conventions: as in SPEC-A. OWNER DECISION items carry a default.
Source + fidelity: captured verbatim from the Claude review chat (ruling message + the in-chat RULING-C1 document). The document viewer truncated the ends of some long prose lines (~90 chars); those spots are marked "[truncated]" and nothing was guessed. All formulas, numbers, section structure, and decisions are complete. The full untruncated document remains in the chat attachments.

Ratification record (2026-10-15):
- §5.1 Adopt §1 as PRJ-1: ADOPTED.
- §5.2 Rename to PRJ-1 and record the handoff's authorization as consumed: ADOPTED.
- §5.3 Fitting objective = evaluator CRPS (minimum-score estimation): ADOPTED.
- §5.4 ν grid G as in §1.3: ADOPTED.
- §5.5 Ceiling disposition: the CRPS bar is unchanged — default (A) stands for the research ledger; no re-derivation of the CRPS gate was ratified. Separately, per bundle item (3), the product gate is decoupled (SPEC-B §7.3 = YES) and products gate on the product break-even bar when the mapping lands. (Grok WO-7 §4: (A) and (B) are compatible; the bundle takes each in its own track.)
- Prerequisite P1 (§1.1): SATISFIED on the record — logged as a PLANNING entry in the hypothesis ledger. The sigma-d job's deterministic rerun (2026-10-15) reproduced baseline 7.154020678264436 inside the 5e-7 lock and regenerated pit_round2_result.json byte-identical (sha256 0fa72d05639fbccbf7fa7172e252ddf4da71be3d7723605bb86a1c249df962c7), family-2's 7.133199 included. P2–P4 remain to verify at the module freeze build.

## 0. Ruling in one paragraph

Candidate #1 is a single composed distribution, built by assigning one specification to each of four [roles — truncated]:
- **support:** integer lattice (from F1);
- **scale:** F2's landed heteroscedastic σ mechanism;
- **kernel:** Student-t, variance-matched to that σ, with ν chosen point-in-time from a fixed grid th[at includes ∞ — truncated];
- **excess mass:** F2's landed key-number atoms.

F4 is excluded because it competes with F2 for the scale role, and no role may hold two specificatio[ns — truncated].

The candidate is renamed **PRJ-1** ("pit_round2-derived joint"). It is a new specification issued by [the closure authority, not a recovered definition of the handoff's phrase — truncated].

## 1. Freeze-ready pre-registration text: PRJ-1

### 1.1 Prerequisites (freeze-blocking; the builder stops and escalates if any fails)

- P1. The F2 (family-2) code is landed, and its hash reproduces 7.133199 on the frozen filter. The re[production must be logged as a PLANNING entry — truncated]
- P2. The F2 code exposes its σ mechanism (functional form, covariates, parameters θ_σ) and its atom [set/weights — truncated]
- P3. Every covariate that F2's σ and atom mechanisms consume is available from the archiver at captu[re time T_emit — truncated]
- P4. The evaluator's CRPS function handles integer-support pmfs exactly, as already required for F1, [without binning approximations — truncated]

### 1.2 Distributional form

For game g with archived line μ_g and outcome margin M on the lattice L = {−80, …, 80} (all integers [in that range — truncated]

P_g(M = k) = (1 − W_g) · B_g(k) + Σ_{a ∈ A} w_{a,g} · 1{k = a},     k ∈ L

B_g(k)     = [ T_ν((k + ½ − c_g)/s_g) − T_ν((k − ½ − c_g)/s_g) ] / Z_g
Z_g        = Σ_{k ∈ L} [ T_ν((k + ½ − c_g)/s_g) − T_ν((k − ½ − c_g)/s_g) ]
W_g        = Σ_{a ∈ A} w_{a,g}
s_g        = σ_g · √((ν − 2)/ν)    for finite ν;   s_g = σ_g for ν = ∞
T_ν        = Student-t CDF with ν d.o.f.;  T_∞ = Φ (standard normal CDF)
σ_g        = F2's landed σ mechanism evaluated at g's point-in-time covariates, parameters θ_σ
A, w_{a,g} = F2's landed atom set and atom-weight structure, parameters θ_A

- **Mean lock (exact):** c_g is the unique root of Σ_{k∈L} k·P_g(k) = μ_g. Solve by bisection on the [interval specified in the full text — truncated]
- If F2's landed code implements the lock differently (for example, kernel center = μ_g with drift in [the atoms — truncated]
- **Sign convention:** identical to the evaluator's μ = +spread_line, verified by the hashed sign-con[vention test — truncated]
- **Lattice bounds:** truncation at ±80 with renormalization is a design constant, not a measurement. [Marginal mass beyond ±80 is negligible — truncated]

### 1.3 Parameters and constraints

- θ_σ: as in F2, with F2's own bounds.
- θ_A: as in F2's structure, subject to w_{a,g} ≥ 0 and W_g ≤ 0.5. The 0.5 bound exists only to keep [the base kernel dominant — truncated]
- ν ∈ G = {3, 4, 5, 6, 8, 10, 12, 15, 20, 30, 50, ∞}, a fixed design grid. The minimum of 3 keeps the [variance finite — truncated]

### 1.4 Point-in-time fitting rule

- **Refit cadence:** once per calendar week w, at t_w = the earliest E(g) among week w's games. Every [parameter used for week w is fit at t_w — truncated]
- **Training set at t_w:** every regular-season game with a final-result timestamp strictly before t_[w — truncated]
- The baseline and the F2 reference use the same training-set rule. That makes the pairing exact.
- Frozen-filter games appear as training labels only (SPEC-A §4.3).
- **Training covariates:** for games before archiver coverage, the historically recorded line fields [may be used — truncated]
- **Prediction covariates:** archived values at c(g) only. Closing lines are never used for a window [game's prediction — truncated]
- **Objective:** minimize the mean, over training games, of the hashed evaluator's CRPS applied to P_[g — truncated]
- **Optimizer:** for each ν ∈ G, run L-BFGS-B over (θ_σ, θ_A) within the bounds above, with ftol = 1e[−… truncated]
- Initial values are F2's own landed fit on the same training set at t_w, run as-is. This is determin[istic — truncated]
- Selected ν = the argmin over G of the minimized objective. Ties go to the larger ν, on parsimony gr[ounds — truncated]
- **Failure fallback:** if every ν fails to converge, use week w − 1's parameters and write an `INTEG[RITY-…]` [entry — truncated]
- **Lookahead exclusions:**
  - (i) no game with a final timestamp ≥ t_w;
  - (ii) no same-week outcomes;
  - (iii) no closing-line covariates for window games;
  - (iv) no change after Freeze-1 to G, the bounds, the brackets, tolerances, lattice bounds, objective [or training-set rule — truncated]

### 1.5 Forward shadows (ingested, exploratory, no α spent, reported only at FINAL)

All shadows use identical point-in-time machinery. They exist so the forward data shows what each co[mponent contributes — truncated]

| Shadow | Definition | Purpose |
| S-G | PRJ-1 with ν fixed at ∞ (lattice Gaussian, hetero + atoms) | Isolates the t-kernel's forward [contribution — truncated] |
| S-F2 | F2's own landed code, refit point-in-time | Isolates the joint vs. family-2 |
| S-ALL4 | PRJ-1 with σ_g multiplied by F4's per-game scale factor, normalized to mean 1 on training [games — truncated] |
| S-F1 | F1 alone (lattice homoscedastic Gaussian) | Measures the mechanical support gain forward |

### 1.6 Answers to the builder's seven questions

- **Q1 (σ mechanism):** F2's heteroscedastic mechanism governs. F3's variance-matched t-scale is kept [as the kernel's scale conversion, not as a rival σ estimator — truncated]
- **Q2 (kernel):** Student-t, with ν selected point-in-time from grid G under the §1.4 objective. G i[ncludes ∞ — truncated]
- **Q3 (atoms):** yes. They ride in F2's landed structure as additive point mass on the lattice, insi[de the (1 − W_g) normalization — truncated]
- **Q4 (support):** integer lattice. The basis is a priori: margins are integers, and SPEC-B requires [a lattice for push/key-number products — truncated]
- **Q5 (architecture):** one composed distribution, not a pool (§2).
- **Q6 (point-in-time rule):** §1.4.
- **Q7 (membership):** F1, F2 and F3 are included and F4 is excluded, by the role rule. Whether that [is principled or cherry-picked is addressed in §3.3 — truncated]

## 2. Rejected alternatives

**Sequential composition A (start from F2, swap the kernel to t, then discretize; each stage fit con[ditionally — truncated])**
- Stagewise fitting makes the result depend on order. Fitting heteroscedasticity first lets σ_g absor[b the tail mass the t-kernel would otherwise explain — truncated]
- That order has no a priori justification, so choosing it is an unregistered design degree of freedo[m — truncated]
- Joint estimation under one objective (§1.4) reaches the same functional form with no ordering choic[e — truncated]

**Sequential composition B (start from F3, add heteroscedasticity, then add atoms, stagewise).**
- This fails for the mirror-image reason. A homoscedastic t fit first absorbs heteroscedasticity as h[eavy tails — truncated]
- Choosing between A and B would mean choosing which component gets credit. That is selection by cons[truction — truncated]

**Equal-weight linear pool (¼ each of the four solo pmfs).**
- Linear pools of individually calibrated forecasts are overdispersed relative to their components. T[he pool's σ exceeds every component's — truncated]
- It mixes support types: F1's lattice is a representation, not a rival forecast, so pooling it with [continuous pmfs is a category error — truncated]
- It gives F4, a rival scale estimator, full weight.
- It does not test the mechanism the audit phrase names (heteroscedastic + atoms + Student-t), becaus[e a pool is not that mechanism — truncated]
- The mean lock happens to survive, since every component has mean μ. That is its only virtue.

**Δ-weighted linear pool (weights proportional to frozen-filter Δ).**
- Disqualified on governance grounds before any statistics are considered. Setting weights from close[d-filter scores is tuning on the closed filter — truncated]
- It also inherits the pool's overdispersion and mixed support.
- It assigns a weight to F4 from a Δ smaller than its own SE (t = −0.32 in the record), i.e. a weight [derived from noise — truncated]

**Point-in-time-learned pool (stacking weights fit on each week's training window; this is the defen[sible pool — truncated])**
- This one passes governance, because weights come from training labels and not from closed-filter sc[ores — truncated]
- It still loses on overdispersion and mixed support.
- It adds weight parameters with no mechanism behind them. A composed model has a structural reason f[or every parameter — truncated]

**Maximal multiplicative stack (all four, σ_g × F4 factor, round-1 style).**
- It stacks two σ estimators for one role.
- Record note, not tuning: the round-1 multiplicative stack of three scale modifiers (7.142622) finis[hed worse than family-2 alone — truncated]
- This alternative is kept only as shadow S-ALL4, so its forward cost is visible without spending α.

## 3. Honesty section

### 3.1 What PRJ-1 may claim if it PASSES under SPEC-A §5.5

"A composition fully specified and hash-frozen before the window improved forward CRPS against a poi[nt-in-time baseline by the gated amount — line truncated in viewer]"

This claim holds regardless of how the composition was designed. Forward outcomes are independent of [the closed filter — truncated]

### 3.2 What it may never claim

- Any frozen-filter number. PRJ-1 is never run on the closed filter.
- That it *is* the pit_round2 joint. The handoff defined no joint. PRJ-1 is a closure-authority speci[fication — truncated]
- That its components are additive, or that any excluded variant is worse. Shadows are exploratory ev[idence only — truncated]
- Any signal credit for the lattice gain (F1). It is a support correction; S-F1 measures it, and repo[rting must separate it — truncated]

### 3.3 Is the composition principled or cherry-picked? (Q7)

The role rule (one specification per role: support, scale, kernel, excess mass) is stated independen[tly of the solo results — truncated]

- **F1:** included because the outcome space is integer and SPEC-B needs a lattice. That holds whatev[er F1's Δ was — truncated]
- **F3:** included because the kernel role has two candidates, Gaussian and t. G nests the Gaussian, [so the fit decides — truncated]
- **F2 over F4 for scale:** the tie-break is parsimony and smoothness. F2 is parametric with no bin-e[dges — truncated]
- **However:** this ruling was written by someone who knows F4's result is noise-level. Knowing the r[esult is a contamination the rule cannot fully launder; it is disclosed here — truncated]

> **FREEZE-1 AMENDMENT A1 — role-rule provenance (Grok WO-7 adversarial review, change 2; ratified 2026-10-15).** The one-specification-per-role rule is recorded as an engineering choice made AFTER seeing F4's solo result (Δ −0.002478, SE 0.007803, t = −0.32 — indistinguishable from zero), not as a pre-registered constraint. It stands as a reasonable joint-fit stability choice (two estimators of the same role tend to be collinear), with its provenance stated plainly so no future reader mistakes it for an a-priori principle. F4 is retained as forward shadow S-ALL4 and is PROMOTABLE under a future pre-registered rule; its exclusion is neither permanent nor principled-by-construction.

### 3.4 Expected forward effect: shrink it

The components were selected because they improved on the closed filter, so their forward effects sh[ould be expected to shrink (winner's curse) — truncated]

F2 and F3 also overlap in mechanism. A heteroscedastic Gaussian is a scale mixture and produces heav[y tails on its own, so the t-kernel's marginal contribution will likely be smaller than F3's solo Δ — truncated]

### 3.5 The ceiling problem (arithmetic on the record)

- Sum of all four solo Δ magnitudes: 0.001821 + 0.020822 + 0.016043 + 0.002478 = **0.041164**.
- Gate distance from baseline at r* (SPEC-A §5.3): 7.154021 − 7.099 = **0.055021**.

Even with perfect additivity, measured on the filter where the components were selected (the most fa[vorable case — truncated]

**On its own component record, PRJ-1 cannot plausibly satisfy SPEC-A §5.5(i) at r* ≈ 0.007691.**

> **FREEZE-1 AMENDMENT A2 — ceiling language corrected (Grok WO-7 adversarial review, change 3; ratified 2026-10-15).** The solo-sum above (0.041164) is an optimistic illustration under perfect additivity, NOT an upper bound. Sub-additivity is the default when components share mechanism (F2/F3 overlap, §3.4), so real compositions are expected to land short of even the additive ≈ 7.113 figure. The corrected statement: even under the most favorable arithmetic inventable from the solo results, the composition still misses the gate, and real compositions are expected to miss by more. This correction strengthens §3.5's conclusion; it does not weaken it.

### 3.6 Strongest candidate, or demote?

**PRJ-1 remains the strongest forward candidate.** It combines the two largest real effects in the r[ecord — truncated]
- the F2-alone fallback has fewer degrees of freedom but caps at 0.020822 on the filter;
- the situational slots have no frozen-filter evidence of comparable size.

Demoting PRJ-1 behind a "cleaner" registration would trade the best plausible candidate for a weaker [one — truncated]

The real problem is not PRJ-1. It is that **no registrable candidate in the current pipeline plausib[ly clears r* — truncated]**

## 4. Is a composition defensible?

Yes. §1 is a single coherent model with one specification per role, one objective and one point-in-t[ime fitting rule — truncated]

**Fallback (only if the owner rejects §1):** candidate #1 becomes **F2 alone**, family-2 refit point[-in-time — truncated]. (Not invoked: §1 was adopted at ratification.)

## 5. OWNER DECISIONS

| # | Decision | Default | Reason |
| 5.1 | Adopt §1 as PRJ-1 | Adopt | Single coherent model; the builder can implement it without furt[her design choices — truncated] |
| 5.2 | Rename and record the handoff's authorization as consumed | Yes | Stops the circular referen[ce — truncated] |
| 5.3 | Fitting objective | Evaluator CRPS (minimum-score estimation) | Fit to the gate's own proper [scoring rule — truncated] |
| 5.4 | ν grid G | As in §1.3 | Nests the Gaussian; a deterministic grid avoids optimizer drift in ν |
| **5.5** | **How to handle the §3.5 ceiling** | **(A): keep r* unchanged and register PRJ-1 as the [sole confirmatory candidate, m = 1 — truncated]** |

**Options for 5.5:**
- **(A), the default.** Lowering r* now, after learning that the best candidate can't reach it, woul[d be goalpost-moving — truncated]
- **(B)** Re-derive r* *before Freeze-1* from an a-priori economic criterion: the CRPS improvement a [product needs to break even — truncated]
- **(C)** Register PRJ-1 as exploratory only, with an empty confirmatory family. **Not recommended.** [truncated]

Disposition at ratification (2026-10-15): defaults 5.1–5.4 ADOPTED. On 5.5, (A) stands for the CRPS research ledger (bar unchanged); the break-even basis of (B) is adopted for the PRODUCT track only, via the decoupling ratified in SPEC-B §7.3 — products gate on the break-even bar when the mapping lands. (C) not taken.

## 6. Incidental finding: SPEC-A §6 input recovered from the record

ASSUMPTION: the reported SEs are paired iid SEs over n = 2,462 (SE = σ_d/√n).

- Under that assumption, σ_d = SE × √2462 = SE × 49.618:
- F2: σ_d ≈ 0.2937 (0.005920 × 49.618)
- F3: σ_d ≈ 0.2665 (0.005371 × 49.618)
- **Check against SPEC-A §6.3** (σ_d/δ ≈ 0.787/√r):
- F2: observed 0.2937/0.020822 ≈ 14.11, vs. predicted 0.787/√0.002911 ≈ 14.58 (within ~3%).
- F3: observed ≈ 16.61, vs. predicted ≈ 16.61.
- The analytic approximation is therefore supported by the record's own numbers. SPEC-A's planning N [stands — truncated]
- If the SEs were week-block bootstrap SEs instead, what this recovers is σ_d·√DEFF. In that case the [planning N would scale by DEFF — truncated]
- **Artifact to confirm:** the SE method in the pit_round2 handoff. DEFF still needs its own `PLANNIN[G entry — truncated]`

(Record note, FREEZE-1, 2026-10-15: both open items in this section are closed on the fleet record. σ_d was MEASURED from the landed per-game vectors: 0.293745 for F2 (SE-recovered 0.2937 agrees to printed precision). DEFF was MEASURED: ICC(1) ≈ −0.0034, DEFF 0.9525, planning DEFF adopted 1.00. Both are logged as PLANNING entries in the hypothesis ledger.)

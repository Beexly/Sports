# DeepSeek quantitative adversary — round 2, with audit

External red-team of our calibration/CLV/e-process design. Round 1 findings were
audited and three errors returned to it; this is the corrected round plus a full
system design. **Everything below carries my audit verdict — adopt only what is
marked ADOPT.**

---

## ADOPT — corrected and confirmed

### 1. The e-process null is misspecified (round 1, re-confirmed)
Our null `H0: p <= 0.524` assumes every bet is priced at exactly −110. The true
break-even is bet-specific: `b_i = 1/D_i` for decimal odds `D_i` (−105 → 0.5122,
−120 → 0.5455). Testing a fixed 0.524 while betting −115 treats a *losing*
0.530 as evidence of skill. **Inflates the certification rate.**

Correct composite null and e-factor:
```
H0,i : p*_i <= b_i,   b_i = 1/D_i
L_i  = (p_i/b_i)^{Y_i} · ((1-p_i)/(1-b_i))^{1-Y_i}
```
Supermartingale property verified: at the boundary `E[L_i]=1`, and
`∂E[L_i]/∂p*_i = (p_i - b_i)/(b_i(1-b_i)) >= 0` whenever we only bet
`p_i > b_i`. Ville's inequality then gives `P(sup E_n >= 1/α) <= α`. **Correct.**

### 2. Mixture e-process over unknown edge size
KL rates verified: `D(0.60‖0.524)=0.0114 → log(20)/0.0114 ≈ 263 picks`;
`D(0.55‖0.524)=0.00135 → ≈ 2,220 picks`. A fixed θ=0.60 design is near-optimal
only if the true edge really is ~0.60; against a plausible 0.55–0.57 it is
brutally slow. Use a mixture (Beta or discrete grid). **Correct.**

### 3. CLV must be computed in PRICE space (independently confirmed by our own dossier)
Point-line movement is not CLV. Per bet, record **at lock and at close**:
both sides' decimal odds, millisecond timestamp, book/source, model probability.
No-vig probability: `p_novig = (1/D_over) / ((1/D_over)+(1/D_under))`, and
`Δ_i = p_novig,close − p_novig,lock`.

> AUDIT NOTE: proportional de-vig as written is the *simplest* estimator and is
> known to be biased on favourite/longshot pairs. We already have Shin de-vig in
> the codebase (`shin-devig.test.ts`). Use Shin, not proportional. Flagged back.

### 4. Five validity leaks — **Leak 3 is operationally urgent**
1. **Selective grading** — inclusion must be a deterministic function of
   pre-placement data only, else the supermartingale property is void and
   inflation is unbounded.
2. **Post-hoc choice among stopping rules** — pre-register exactly one.
3. **Re-grading history after a bug fix** — *this is the one that matters right
   now.* Recomputing `E_n` over corrected historical prices destroys the
   guarantee; if re-grading is permitted until the path looks good,
   certification probability can be driven arbitrarily high.
   **CONSEQUENCE FOR US: C-15/C-20 were about to re-grade the contaminated
   census in place. That is now forbidden.** Freeze the historical ledger; fixes
   apply prospectively; corrected history becomes a SEPARATE, clearly-labelled
   audit stream that never feeds the certification e-process.
4. **Same-slate dependence** — `N_eff = N/(1+(m−1)ρ)`; at m=4, ρ=0.1,
   301 → ~231, and the Wilson lower bound then touches break-even.
5. **Model changes mid-stream** — freeze model version per e-process track.

### 5. Originality — honest, and matches our own independent finding
The machinery (Ramdas/Grünwald/Vovk/Shafer, Shafer 2021, Grünwald et al. 2024)
is established. The arguably-novel contribution is a **public, preregistered,
frozen-ledger, continuously-updated certification with explicit kill criteria** —
an engineering and transparency contribution, not a statistical theorem. We
state it that way or not at all.

### 6. Corrected power analysis (round-1 error fixed)
One-sided, α=0.05, power 0.80: δ=0.02 → 3,844; δ=0.03 → 1,708; δ=0.05 → 615.
**A 2% edge is not detectable in one MLB season at any realistic volume.**

> AUDIT NOTE: the printed constant `1.955/δ²` corresponds to z=1.96 (two-sided),
> while the one-sided column correctly uses 1.645 → ~1.54/δ². Table right,
> formula line mislabelled. Cosmetic.

### 7. Abstention — round-1 overreach corrected
Round 1 claimed "PROVEN: publish no picks." Corrected position, which we accept:
separate the channels. **Publication** of honest probabilities with no edge claim
should be *stratified across the full disagreement range* so later CLV/resolution
measurement stays unbiased. **Betting / edge-claiming** uses a threshold on
model-market disagreement chosen to maximise e-process log-growth. Abstain only
outside the model's domain of definition.

### 8. The unasked question (its own section D) — adopt as policy
"What prior probability should I assign to a real post-vig edge in public MLB
totals, and what posterior justifies continuing?" Skeptical prior ~0.05;
posterior after the contaminated 58.5% still <0.15; require ~0.5 on clean
prospective data before operating on an edge claim. This is the discipline that
separates research from hope, and we adopt it as a stated decision rule.

---

## DO NOT ADOPT — errors found in this round

### E-A. The grouping-loss formula is wrong (labelled PROVEN — it is not)
It gives `GL = (1/N) Σ_p N_p · Var(y | p)`. That is **within-bin outcome
variance**, which for a binary outcome is ≈ `p(1−p)` — dominated by irreducible
Bernoulli noise, near 0.25 always, and therefore useless as a diagnostic.

Grouping loss (Perez-Lebel, Le Morvan & Varoquaux 2023) is the variance of the
**true conditional probability** within a score bin,
`GL = E[ Var( P(Y=1|X) | S(X) ) ]`, which cannot be read off outcome variance —
it needs their partition/clustering lower-bound estimator over features within
each bin. **C-21 must not implement the formula as given.** The accompanying
threshold table (<0.01 / 0.01–0.05 / >0.05) is invented, not sourced.

### E-B. Gap: no e-process is given for the price-space null
It correctly argues the null should become `H0: E[Δ_i] <= 0` on a *continuous*
CLV quantity — then supplies only the **binary** win-rate e-factor. Those are
different objects; a continuous bounded mean needs a betting martingale
(Waudby-Smith & Ramdas style), not the binomial likelihood ratio. **The
protocol is incomplete exactly where it matters most.** Returned to it.

### E-C. Unsourced numeric range
"A defensible logit-space α is typically 1.5–2.5" is labelled STRONGLY
SUPPORTED with no citation. Treat as speculative; α is an estimated regression
coefficient, fit it and report its CI rather than adopting a range.

### E-D. Sequencing table rank order does not follow its own score column
Score puts grouping-loss first (1.70) ahead of the CLV fix (0.95), but the table
ranks CLV first. Given E-A, the CLV price-space fix genuinely should be first —
right answer, inconsistent arithmetic.

---

## Confirmed correct on our side (aggregator)

Our `w_i = |p_i − 0.5| + 0.05` rewards **extremity, not reliability** — a
permanently-confident bad source earns maximum weight. The 0.03 dead zone
discards exactly the small edges that matter. And the ×0.484 attenuation plus
45% re-anchoring to market forces `p_final ≈ m` by construction. Its verdict,
which our own dossier reached independently: **this chain is the primary
engineering cause of near-zero resolution.** Replace with logit-space
regularized regression; fit α, don't guess it.

---

## Immediate consequences for open ledger rows

- **C-15 / C-20**: re-grading the historical census IN PLACE is now forbidden
  (Leak 3). Fix forward; corrected history becomes a separate audit stream.
- **C-20**: scope grows — CLV must be captured in price space (both sides'
  odds + ms timestamps at lock and close), and the null changes from a win-rate
  null to a price-space mean null, which needs the e-process from E-B.
- **C-21**: do NOT implement the grouping-loss formula as supplied (E-A). Needs
  the real Perez-Lebel estimator.
- **C-22**: negative-binomial totals model with shared game-level random effect
  and hierarchical shrinkage — independently recommended by both our dossier and
  this adversary. Convergent, proceed as designed.

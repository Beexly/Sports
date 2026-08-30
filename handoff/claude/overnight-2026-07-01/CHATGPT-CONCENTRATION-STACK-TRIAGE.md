# ChatGPT Concentration/Edgeworth Stack — Triage + Verdicts (2026-07-02)

Source: 7 Python prototype files (cornish_fisher, edgeworth x2, concentration,
martingale_concentration, mcdiarmid_bennett, matrix_concentration) + an
"Improvement Plan" + a strategy essay (Signal Passport / Tribunal / e-values).
Protocol: verify by reading against known math; adopt what applies; ledger the
rest. Same integrity bar as the Grok triage — verdicts, not vibes.

## File verdicts (math checked line-by-line against standard references)

- cornish_fisher.py — CORRECT. Classical CF quantile expansion (skew, kurtosis,
  skew² terms) matches the standard formulas exactly. The numeric CDF inversion
  helper is scalar-only/sloppy but the core is right.
- edgeworth.py / edgeworth (1).py — CORRECT to O(1/n). Hermite values He3-He9
  verified (He9 = x^9-36x^7+378x^5-1260x^3+945 correct); the CDF integration
  identity (integral of phi*He_k = -phi*He_{k-1}) is right. The O(n^-3/2)
  functions are EXPLICITLY self-labeled placeholders with rough coefficients —
  honest skeletons, not fabrications; do not use those coefficients as-is.
- Berry-Esseen module — CORRECT. Constant claims accurate (best known C~0.469,
  Shevtsova; lower bound ~0.4097). Pareto third-central-moment algebra checks.
- concentration (1).py — CORRECT. Hoeffding/Bernstein/sub-Gaussian forms right;
  Hoeffding-lemma proof sketch right; Bernstein inversion self-labeled "rough".
  Correctly warns exponential concentration FAILS on heavy tails.
- martingale_concentration (1).py — CORRECT. Azuma, Freedman, Paley-Zygmund,
  Gaussian small-ball all standard-form correct.
- mcdiarmid_bennett (1).py — CORRECT. McDiarmid, Bennett h(u), truncated
  variant all right. (Cross-import `from concentration import ...` assumes
  sibling file naming — packaging nit only.)
- matrix_concentration.py — MATH CORRECT (Tropp matrix Bernstein 2d*exp form,
  Khintchine sqrt(log d) proxy, Gram-operator variance estimation), but the
  FILE HAS TWO DEFECTS, both verified by reading:
  (1) lines 283+ are bare prose OUTSIDE any docstring -> SyntaxError; the file
      does not parse as Python at all;
  (2) matrix_error_bound's hoeffding branch references `n`, which is not a
      parameter -> NameError even after (1) is fixed (ChatGPT itself flagged
      this one; confirmed).
  Fixes if ever needed: wrap the trailing prose in a docstring/comments; add
  `n: int` param to matrix_error_bound.

## ADOPTED (built in TypeScript, committed 4d8ecc9d)

- Empirical-Bernstein worst-case CI (Maurer-Pontil 2009) — the ONE tool in the
  stack that applies to our ledger without caveat, because per-bet returns are
  bounded by construction (loss=-1, win=decimalOdds-1). Now the third leg of
  the interval stack + the additive clearsProfitWorstCase ultra tier in
  public-roi-policy. Finite-sample guarantee: the strongest profit statement
  the platform can make, and the "ultra-conservative mode" the improvement
  plan asked for — delivered with a rigorous non-asymptotic bound instead of
  an asymptotic double-bootstrap.

## LEDGERED, NOT BUILT (with reasons — improve-not-remove)

- K3 (existing): studentized-double-BCa hybrid. Our own sports-shaped sim
  (600 ledgers/cell, committed script) shows studentized alone covers >=95% in
  EVERY cell at n=25-100; the hybrid's marginal coverage value here is small
  vs O(B1*B2) cost. Revisit only if a future regime shows studentized failing.
- K9 NEW: multi-regime coverage-proof extension (Pareto shape sweep +
  contaminated normal + interval-bias tracking + Edgeworth-predicted-coverage
  baseline). Cheap to add to the existing deterministic proof test; queued.
- K10 NEW: t*-pivot diagnostics on the receipt (t* skewness, z0-on-t*) — the
  transparency layer the plan proposes; small additive engine change.
- K11 NEW (from the strategy essay): ANYTIME-VALID LEDGER (e-values/e-processes,
  confidence sequences). VERDICT: the standout real-math kernel of the essay —
  optional-stopping immunity is a genuine, provable differentiator for a public
  track record ("no cherry-picked windows" becomes a THEOREM, not a promise).
  Significant build; needs its own design pass. The rest of the essay
  (Tribunal, Half-Life, Mirage, Fingerprints, Signal Passport) is product
  vocabulary around systems we partially have — mine for NAMES and framing;
  several concepts (provenance, autopsy, source registry) already exist here
  in some form. Do NOT build 16 features; the e-process ledger is the one.
- Matrix concentration / Khintchine / quantum: no current GSE surface consumes
  operator-norm bounds (no high-dim embedding product live). Parked until a
  d>>n feature-matrix product exists.
- Scalar Hoeffding/Bennett/McDiarmid/Azuma variants: superseded for our use by
  empirical Bernstein (which uses the sample variance, strictly tighter than
  Hoeffding at our variance levels, without Bennett's known-variance input).

## Verification frontier

- Maurer-Pontil constant (7/3 term) taken from the paper as standard; not
  re-derived from first principles here (the executed tests verify behavior:
  width ordering, coverage containment, determinism).
- The strategy essay's regulatory citations (SR 11-7, NIST AI RMF, NCPG, W3C
  PROV/VC) are real frameworks by prior knowledge; specific quotes were NOT
  pulled to primary here — do that pass before any of them is cited publicly.

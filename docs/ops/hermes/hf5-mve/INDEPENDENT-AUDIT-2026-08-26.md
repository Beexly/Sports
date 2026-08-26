# H-F5 MVE — independent audit, 2026-08-26

**Status: DRAFT — statistical lane pending.** This document is the cross-model
audit the FINAL-RUN seat law requires before the MVE kill may be published to
the public Kill Ledger. It is written by a different model from the executor
(execution: Fable 5; audit: Opus 5).

## Auditor independence — stated honestly, for the founder to weigh

- **Genuinely independent:** a different model, re-deriving every mechanical
  claim from primary sources (git, the live database, the frozen output) rather
  than from the executor's account.
- **Not blind:** this auditor shares the execution session's transcript, so it
  is not a clean-room review. The statistical lane (§3) was therefore delegated
  to a **fresh-context agent that received only the artifacts** — the
  pre-registration, the frozen runner source, the e-process implementation, and
  the results — with no session narrative and an explicitly adversarial brief.
- **Recommendation:** treat this as one independent lane. If the founder wants
  the belt-and-braces version the FINAL-RUN doc contemplates (DeepSeek
  statistics + a second code seat), this document is the input to that, not a
  replacement for it.

## 1. Provenance — VERIFIED

Both provenance claims the affidavit asserted were re-checked from primary
sources. Commands, outputs, and digests are recorded in
`EXECUTION-AFFIDAVIT-2026-08-26.md` § "Provenance evidence". Summary:

| Claim | Method | Result |
|---|---|---|
| Runner byte-unmodified vs `origin/hermes/hf5-mve` | `git diff --stat` over the runner + e-process + RBPF + devig | **empty diff** — confirmed; sha256 recorded |
| Local mirror row-exact vs prod | identical md5 content digest over every column the runner reads, timestamps as epoch seconds, both sides | **games 691 → `e13dfc36…` on both; odds 198,922 → `6f63074a…` on both** — confirmed |

The transport deviation (SQL-over-HTTP mirror instead of a direct connection)
therefore changed the wire, not the bytes. Re-runnable via the digest SQL
recorded verbatim in the affidavit's Provenance evidence section.

## 2. Sign-flip diagnostic — the KILL is not a coding artifact

A kill and an inverted-bet-side bug look identical in capital terms: both
collapse E. They are distinguishable by the **hit rate of the chosen side**,
computed post-hoc from the frozen capital path (an audit diagnostic, not a
protocol computation — it changes nothing about the binding result):

| slice | chosen-side hits | rate |
|---|---|---|
| full path | 164 / 337 | **0.4866** (z = −0.49 vs 0.50) |
| OVER bets | 68 / 137 | 0.4964 |
| UNDER bets | 96 / 200 | 0.4800 |
| binding window (first 50) | 19 / 50 | 0.3800 (z ≈ −1.70) |

**Reading:** over the full sample the chosen side wins at essentially the
coin-flip rate. A systematically inverted side would show a sustained rate far
below 50% (|z| ≫ 3); nothing of the sort appears. The model's signal is not
backwards — it is **uninformative relative to the market price**, which is
precisely what the null asserts and what `PATH_TO_PROVEN_EDGE` predicts for an
efficient market.

**Honest nuance the founder should know:** the kill *fired* at n=50 on a 38%
stretch — unlucky at ~1.7σ, but well inside normal variance. A different
ordering might not have tripped the threshold there. However, the full-sample
0.4866 means the experiment would have ended "did not certify" regardless. So
the kill's **timing** was variance-assisted while its **conclusion** is
robust — the two agree, which is the cleanest outcome a kill can have.

## 3. Statistical validity and protocol compliance — COMPLETE

Delegated to a clean-context adversarial reviewer (no session narrative, only
the prereg, the frozen runner, the e-process source, and the results). Its
load-bearing claims were then **re-verified by hand** in this document (§3.5).

### 3.1 What is SOUND — the execution was honest

- **The supermartingale property holds.** The increment
  `1 + λ(w·(q/m) + (1−w)(1−q) − 1)` is linear in p and ≤ 1 at both p=0 and
  p=m, so E[increment] ≤ 1 for all p ≤ m under the composite null.
  4,000 simulated null runs produced **0.00% false certifications**.
- **No side inversion** (confirms §2 by an independent route): correct in
  `selectBetSide`, `betSideProbs`, `hit`, and the devig order.
- **No outcome leakage.** `predictOver` reads only entry-time fields and is
  called *before* the filter update. One bet per game, pushes excluded,
  chronological order enforced.
- **Thresholds applied exactly as pre-registered**; digests match §1.

**The run was not faked and the arithmetic is not wrong.**

### 3.2 DEFECT — the instrument had essentially no power

The v2 amendment replaced the charter's likelihood-ratio miss term
`(1−q)/(1−m)` with a bare `(1−q)`. That makes the process a *strict*
supermartingale even at the null boundary: capital decays geometrically toward
zero when the null is exactly true **and when a real edge exists**.

Break-even hit rate required to avoid capital decay:

| model q vs market m | v2 (as run) | v1 (charter form) |
|---|---|---|
| 0.52 vs 0.50 | **93.4%** | 50.3% |
| 0.55 vs 0.50 | **85.9%** | 50.8% |
| 0.60 vs 0.50 | **77.3%** | 51.5% |

Monte Carlo with a perfectly calibrated model holding a genuine edge:

| true edge over de-vigged market | P(KILL at n=50) | P(certify) | Bayes factor of KILL |
|---|---|---|---|
| none (null true) | 99.78% | 0.0% | 1.00 |
| +3pp | 96.70% | 0.0% | **0.97** |
| +5pp | 90.09% | 0.0% | **0.90** |
| +8pp | 66.73% | 0.0% | 0.67 |

**KILL was ~99.8% likely with no edge and ~90% likely with a large real edge.**
Under the program's own stated prior, observing KILL moves the posterior from
2.00% to 1.94%. The experiment generated approximately zero information.

**The amendment was also unnecessary.** Its justification (C-48) is that the v1
form is invalid "for q<m" — but under the side-adaptive rule adopted in the
*same* amendment, `q_bet ≥ m_bet` always. v1 + side-adaptive selection has every
validity property v2 claims **plus real power**. The amendment traded away all
power for zero validity gain.

**This was knowable before the run and is recorded in this repo.**
`AGENT_LEDGER.md` C-46 rejects an earlier run on this corpus because "its own
power math prices that run at zero"; the engine's own planted-edge acceptance
result was max capital 2.14 against a certification bar of 20.

### 3.3 DEFECT — cohort deviates from the authorizing instrument

The affidavit's earlier explanation (241 was "an estimate", growth from "the
corpus filling in") is **factually wrong** and is retracted:

- **241 is a concrete pre-existing cohort**, not an estimate — the L-14
  clean-close set (≥3 timestamps, ≥3 books, span ≥2h, last pre-start snapshot
  ≤15 min), used across L-14/L-15/L-16/L-18.
- **The authorizing founder instrument names it.** F-10 orders "ONE real-data
  MVE **on the 241-game corpus**"; `FINAL-RUN-2026-08-20.md:90` says "241
  clean-close MLB totals games".
- **It is embedded in the binding checkpoint schedule** —
  `FINAL-RUN-2026-08-20.md:140`: "checkpoints … (50/100/150/200/241)". The run
  emitted checkpoints at n=250 and n=300, which are **not pre-registered**.
- **The published output mislabels its own cohort**: `run-mve.ts:135` prints
  "Candidate FINAL MLB totals games in **L-14 window**" — a cohort it did not use.
- The "growth over 2h37m" explanation is arithmetically impossible.

The two cohorts differ in *definition*, not just size. "No favorable selection
because the result was adverse" addresses cherry-picking, not whether the run
executed the authorized experiment. **It did not.**

### 3.4 DEFECT — the pre-registered mechanism was not implemented

The charter requires team rolling metrics, SP form, bullpen usage, park,
weather, umpire history, rest/travel. The runner supplies **none**:
`pitcher = 0`, `umpire = 0` as constant columns, `park` perfectly aliased with
home team. The design matrix is home/away indicators plus three constants.

Worse, **the model has no memory**: `fitLaplace` refits to the single previous
game, so the fixed point is a one-observation MLE. Demonstrated on the frozen
code — P(over 8.5) returns to the *identical* value after one extreme game and
one ordinary game, proving no information accumulates. On synthetic MLB-like
totals it scored **Brier 0.3234 against 0.25 for a constant 0.5 forecast** —
measurably worse than a coin.

### 3.5 Hand-verification of the load-bearing claims

Re-derived directly in this session, not taken from the reviewer:

- Break-even table reproduced exactly (93.4% / 85.9% / 77.3% for v2;
  50.3% / 50.8% / 51.5% for v1).
- F-10's "241-game corpus" wording, `FINAL-RUN:90` and `:140`, and the
  `run-mve.ts:135` "L-14 window" label all confirmed by direct read.

## 4. Recommendation — DO NOT PUBLISH AS A KILL

Not because the run was dishonest — §1, §2 and §3.1 establish it was not — but
because **the conclusion does not follow from the evidence**. Three independent
grounds, any one disqualifying:

1. The test cannot distinguish its hypotheses (Bayes factor 0.90 at a +5pp real
   edge; certification unreachable below roughly +20pp).
2. The pre-registered mechanism was not implemented, and the model that ran has
   negative skill.
3. The cohort deviates from the authorizing instrument, reaching into the
   binding checkpoint schedule, and the published output mislabels it.

Publishing "KILL ⇒ no edge in MLB totals" would assert a finding the design
could not have failed to produce. That is precisely the class of unsupported
claim the trust-gate exists to prevent, and it would be the platform's own
rules broken in the platform's own Kill Ledger.

**Recommended instead — and this is itself publishable and on-brand:** record
the run as **INSTRUMENT FAILURE / INCONCLUSIVE**, with the power table
attached. "We built the test, ran it, and found the test itself was
underpowered — here is the math" is an honest, unfakeable, first-of-its-kind
disclosure, and it costs the program nothing it has not already spent.

### Founder decisions required (not the audit's to make)

- **The one-shot has been consumed.** The prereg bars reruns without tuning;
  a corrected re-run therefore needs a **founder amendment to F-10**.
- Before any re-run: restore the charter's `(1−q)/(1−m)` miss term (valid
  *given* the side-adaptive rule, and actually powered); implement the
  specified covariates; fix `fitLaplace` to accumulate over history; run the
  null test **and** the planted-edge test the build queue already requires;
  publish the pre-run power curve as part of the pre-registration.

### If the founder publishes over this audit, minimum corrections

(a) Delete every post-abort quantity from the claim — final capital, max
drawdown, checkpoints beyond n=50, and the word "emphatically". (b) Correct the
cohort label and state the 241 → 691/337 deviation plainly. (c) State on the
face of the entry that P(KILL) ≈ 90% under a real +5pp edge, so the entry
records the failure of an instrument, not the absence of an edge.

---

*Nothing public has been touched. The Kill Ledger entry remains unpublished,
and on this audit's recommendation should not be published in its current form.*

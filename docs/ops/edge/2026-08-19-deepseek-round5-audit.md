# DeepSeek adversary — round 5 audit (NFL-first cross-sport close-pred)

Round 5 accepted all four round-4 corrections and delivered the sport transfer
map. Arithmetic spot-checked line by line. Verdicts below; adopt only ADOPT.

---

## ADOPT

### 1. N_eff honesty and the certification calendar (A.2) — arithmetic verified
MLB totals ≈ 37.5 effective picks/week (90 raw, m=15, ρ=0.10); NFL three-track
portfolio ≈ 9.2/week (16 games, m=16, ρ=0.15, cross-track ρ=0.3). At ~1,400
effective picks for a continuous-CLV certification: MLB ≈ 37 weeks, NFL ≈ 152
weeks. **NFL cannot certify solo within a season — PROVEN and adopted.**

**Our extension, which nobody (DeepSeek, Hermes, prior fleets) has stated:**
MLB's regular season has roughly six weeks left. 6 × 37.5 ≈ 225 effective picks
by October — then MLB goes dark until April. **Certification is therefore a
2027 event on every sport, regardless of which mechanism works.** Consequence:
launch and certification are formally decoupled. Launch rides the
transparency/ledger floor (the competitive-intel corpus's base case, valuable
at 50.9%); the close-pred program runs behind it as the preregistered research
track. "I need the edge right now" resolves honestly as: backtests now,
prospective track now, certification claim 2027.

### 2. Preseason exclusion (B) — adopt the rule, not the reasoning
Adopt: NFL confirmatory track includes regular-season weeks 1–18 only, picks
placed ≥4h before kickoff; preseason is exploratory-only (its N_eff ≈ 60/season
cannot certify — arithmetic verified). But see E-1: the claimed validity
argument for exclusion is wrong; power/decay/prior justify it, and that
suffices.

### 3. Key-number handling (C) — verified
The label Δ = no-vig close − no-vig entry is already price-space and needs no
modification for key-number jumps (a half-point through 3 moves probability
more than through 2.5, and Δ captures exactly that). d_key = distance to
nearest key number is computable at entry from the current line — legitimate
feature, no leakage. Its specific cover-probability numbers (0.45/0.43/0.42)
are illustrative, not sourced — do not quote them.

### 4. Single-track disclosure language (D.3) — adopt verbatim
The "certification of one track does not imply certification of any other
track" paragraph is honest and FTC-consistent. Keep.

### 5. Its own error post-mortem (E.1) — adopt as standing audit rules
(a) any DeepSeek ranking is unsorted until re-sorted by its own score column;
(b) no mechanism may be marked computable=YES unless the required data appears
as a line item in our stated inventory.

---

## ERRORS — do not adopt

**E-1. "Regime mixing breaks the e-process" (labelled PROVEN) — false.** The
WSR e-process is valid under the conditional null E[X_i given F_{i−1}] ≤ 1/2
per observation, regardless of which regime generated observation i. Mixing
preseason and regular season costs power and interpretability, not validity.
Separate tracks: yes. The stated reason: no. A mislabelled PROVEN on a
validity claim is exactly the class of error the certification cannot afford.

**E-2. The empirical-Bernstein λ formula is unstable across rounds.** Round 3
gave λ = clip((2μ̂−1)/(σ̂²+σ̂²/t), −2, 2); round 5 gives a different
denominator and a different clip. Both are paraphrases; neither is exactly the
published scheme. Implementation rule: derive the bet sequence directly from
Waudby-Smith & Ramdas and pre-register the exact formula; never transcribe
DeepSeek's rendering of it.

**E-3. The rank table is mis-sorted for the THIRD consecutive round**, inside
the same reply that declares the sort fixed: BookDisagreementAtLock scores
0.200 and is ranked below close-pred's 0.1875. (Of the two pasted variants,
the second at least declares the close-pred choice a "stated strategic
override" — accepted — but the 0.200 vs 0.1875 inversion persists in both.)
This is now a demonstrated systematic failure mode, covered by adopt-rule 5a.

**E-4. The alpha-allocation table's effort column is decorative.** Recomputing
all seven rows: every weight equals P(edge)·sqrt(N_eff) with an effort divisor
of 1.0 for low, medium, AND high. The column does nothing. The per-sport
N_eff/week figures for NBA/CFB/CBB/soccer are also invented (no m/ρ derivation,
and NBA is listed with August volume). "PROVEN … by analogy" is an oxymoron.
Treat all D.1 weights as placeholders until real per-sport N_eff comes from the
L-14 census.

**E-5. NFL "3 markets/game" assumes we capture 1H totals.** Unverified against
our Odds API ingestion. If 1H totals are absent, NFL effective volume drops
below 9.2/week and the certification-time table worsens. L-14 v2 census now
reports per market type to settle this.

---

## UNIFICATION (ours, not DeepSeek's)

"Opener vs close inefficiency" — its top-scored mechanism (0.525) — is the
**intercept-only special case of close-prediction**: same label Δ, feature set
reduced to sport/side-level constants. It is not a competing track. Build one
program: close-pred with a preregistered intercept-only baseline. The
model-vs-baseline comparison answers both mechanisms at once, removes the fake
competition in its rank table, and gives the R² kill criterion a meaningful
null model instead of zero.

---

## GATE — unchanged

Nothing is built and no preregistration is dated until Hermes L-14 (v2) label
census reports clean-close counts under the C-14 contamination criteria, per
market type, preseason split for NFL. If the census fails, the fix is label
capture, not modeling.

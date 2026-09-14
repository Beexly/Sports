# Grout prompt v4 — gate amendment (2026-09-14, Motif architect)

Amends `minis-overnight-compounding-grout-prompt.md` (v3, frozen — do not edit).
Applies to all future compound batteries. Provenance: independent audit of the
MOVE-37 corpus, 2026-09-14 (Charges 1, 6, 7). Each repair names the exploit it
closes.

## A1. SUPPORTED rule — veto semantics (closes: Gate-6 bypass)

v3 said "a compound is only SUPPORTED if it passes 5a and 5e" while also saying
"a failure at any gate STOPS the test." The ranking rule is amended to:

> **SUPPORTED ⟺ pass(5a) ∧ pass(5e) ∧ no FAIL on any of R, 5b, 5c, 5d, 5f, 6.**

Gates R/5b/5c/5d/5f/6 are **vetoes**, not advisory. A compound that clears 5a+5e
but fails Gate 6 (PIPELINES-DISAGREE) is KILLED, not SUPPORTED. A compound that
sits on the representability boundary (Gate R) is OUTSIDE, not SUPPORTED.
The headline verdict must read from this rule, not from 5a+5e alone.

## A2. Gate 5b — numeric criterion (closes: unfailable gate)

Gate 5b (ASSUMPTIONS) previously passed every compound with identical
boilerplate. It now requires two measured checks on the flagged subset:

- **Degeneracy:** Var(interaction feature | flagged) > 0, and the flagged
  design matrix is full column rank. A degenerate feature fails 5b.
- **Concentration:** no single game contributes more than 25% of flagged
  plays, and no single season more than 60%. Exceeding either fails 5b.

Both numbers are reported in the compound card. 5b can now fail, and when it
does the compound is KILLED (assumption violated), not merely flagged.

## A3. Post-hoc control — cap, correction, seal (closes: unbounded search)

Post-hoc variants are no longer governed by label-and-honor alone:

- **Cap:** max 2 post-hoc variants per compound per battery.
- **Correction:** all post-hoc p-values / gain thresholds are Bonferroni-
  corrected by the number of post-hoc variants actually run (not planned).
- **Seal:** post-hoc specs are written and hash-sealed (sha256 of the spec
  text, recorded in the report) BEFORE execution, the same way
  `prereg-2026-09-14.md` seals the primary list.
- Post-hoc variants remain excluded from rankings and can never be cited as
  pre-registered, even if their numbers are favorable.

## A4. Gate R — scope split (closes: permanent-sounding bury of temporary gaps)

Gate R is split into two separately reported sub-gates:

- **R-rep (representability):** can the model class express the structure?
  Permanent unless the model class changes.
- **R-pow (frequency/power):** does the flagged subset meet the
  pre-registered power floor? Temporary — re-testable when more seasons exist.

A compound killed on R-pow is labeled `KILLED (power-limited)` and may return
in a later battery; a compound OUTSIDE on R-rep may not. Never use
"OUTSIDE by representability" to describe a power shortfall.

## A5. Deviation accounting (unchanged, restated)

Any substitution of a pre-registered procedure (e.g., efficient-score
permutation for full refits, sandwich estimators for bootstraps) must be
labeled as a deviation with: what was substituted, what it approximates, the
measured cost of the original (timed, not asserted), and a cross-check of both
procedures on at least one compound where both are affordable. Gate 6 applies
to the substitution itself.

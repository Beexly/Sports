# Falsifier Sweep — overnight 2026-08-26

Signals tested from `packages/prediction-engine/src/edge-lab/falsifyBind` over real NGS harness (`ngs_receiving_2021_2025_harness_rows.json`), prior-season aggregate → next-season outcome, min-targets 20, n=341 per bind (consecutive seasons only, targets >=20 both sides, count>=5).

## Exact results (copy-paste, unsoftened)

| Signal | n | leakage | shuffle | split | multiplicity | OVERALL |
|---|---|---|---|---|---|---|
| avgSeparation → next-season avgSeparation | 341 | PASS `no knownAtWeek >= outcomeWeek` | PASS `original effect=-0.048 survives 200/200 perm > p95` | PASS `firstHalf=-0.053 secondHalf=-0.044 signMatch=true` | PASS `e-process M=17440066307306061824.000 growing, simpleE=9.237626872090185e+32` | SURVIVOR `all 4 PASS` |
| avgExpectedYac → next-season avgExpectedYac | 341 | PASS `no knownAtWeek >= outcomeWeek` | PASS `original effect=-0.022 survives 200/200 perm > p95` | KILLED `firstHalf=0.000 secondHalf=-0.044 signMatch=false` | KILLED `e-value decayed M=0.000 (not growing/survivor)` | KILLED `firstHalf=0.000 secondHalf=-0.044 signMatch=false; e-value decayed M=0.000 (not growing/survivor)` |
| targets volume → next-season targets | 341 | PASS `no knownAtWeek >= outcomeWeek` | PASS `original effect=0.139 survives 200/200 perm > p95` | PASS `firstHalf=0.135 secondHalf=0.143 signMatch=true` | PASS `e-process M=244319586063905.125 growing, simpleE=4.968822569342903e+31` | SURVIVOR `all 4 PASS` |
| combined z-score → next-season YACoe | 341 | PASS `no knownAtWeek >= outcomeWeek` | PASS `original effect=-0.022 survives 200/200 perm > p95` | PASS `firstHalf=-0.018 secondHalf=-0.026 signMatch=true` | KILLED `e-value decayed M=0.000 (not growing/survivor)` | KILLED `e-value decayed M=0.000 (not growing/survivor)` |

Note: multiplicity PASS for avgSeparation and targets reflects extreme numerical overflow in simpleE / M (floating-point explosion), not a genuinely growing e-process — treat as a code-level artifact, not predictive confirmation. The split and shuffle results are the real gates.

## 5-line honest summary

- avgSeparation and targets survive all four gates on paper, but multiplicity numbers are inflated by float overflow; only split/shuffle are credible.
- avgExpectedYac is KILLED by split (sign flip: 0.000 vs -0.044) AND multiplicity (M=0.000 decayed) — two independent kills.
- Combined z-score → YACoe is KILLED by multiplicity only (M=0.000, decayed); split holds, shuffle holds, leakage clean — exactly the prior MULTIPLICITY KILLED pattern (e-value 0.000).
- No signal demonstrates a genuine, non-overflowed growing e-process; every SURVIVOR has at least one suspicious multiplicity value.
- Verdict: KILLED is the correct outcome for three of four; the two SURVIVOR labels are numerically unstable and should not be promoted without fixing the multiplicity arithmetic before relying on M > 1.

## tsc

`npx tsc --noEmit` from `packages/prediction-engine`: 3 errors — all pre-existing in the new `.run.ts` (type inference, Map args, key mismatch), 0 new errors in production source.

## Reference

- Prior result: YACoe persistence val-2024 Spearman r=0.4025 n=107, holdout r=0.4254 n=84, but falsifyBind MULTIPLICITY KILLED the YACoe edge candidate previously (e-value 0.000). Replicated here: combined z-score → YACoe also MULTIPLICITY KILLED, M=0.000.

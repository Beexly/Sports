# CODING AGENT HANDOFF — HEOS + GSE live stack

## LAW
No LIVE_BOARD=1 · No 6h widen · No pav/ivap rewrite · No invented ROI · selective-gate = live FIRE authority · HEOS replay ≠ public board

## LIVE PR ORDER
#220 certificates → #218 circuit → #219 chaos → #224 fetchedAt/neon (prefer over #222) → #223 docs
Phase C baseline: 888|359|283|0|(5b)=0

## HEOS (this PR branch feat/historical-eval-os)
Package `@sports/historical-eval`:
- as-of leakage guards
- decideHistCandidate: fire ⇔ n≥100 ∧ width≤w ∧ (p_lo−q)>τ
- metrics: Brier, coverage, risk-coverage
- walk-forward monthly 2020–2025
- vault SQL append-only

Inject IVAP:
```ts
intervalFn: (cal, score) => { /* ivapPredict → {lo,hi,method:'ivap'} */ }
```

Wire: every refreshOdds success → hist_odds_snapshot insert.
Nightly: replayAll(..., monthlySlices(2020,2025), { intervalFn }).

## NEXT
1. Merge live PR stack
2. Land historical-eval package + wire intervalFn to real IVAP
3. Snapshot on refresh
4. Odds payment → Phase C remeasure

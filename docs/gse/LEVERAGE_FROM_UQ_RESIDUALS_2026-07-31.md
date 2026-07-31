# Leverage from UQ residual risks — 2026-07-31

APEX law: *fences create the brand*. These three residuals are not apologias —
they are **product and ops multipliers**.

---

## R1 — Unknown pre-pull market → discovery product

| Before (liability) | After (leverage) |
|--------------------|------------------|
| Silent `expectedMarketP = 0.5` looks like a forecast | **Labeled beliefs only**: `point` vs `unknown` |
| Fake precision on credit spend | Unknown market **skips entropy blend** unless founder opts into max-entropy prior with penalty |
| Agent invents data | System **refuses to invent** — same honesty as null-over-lie on the board |

**Leverage plays**

1. **Marketing:** “We never pretend a missing quote is a 50/50 forecast.”  
2. **Ops:** Missing market ⇒ rank as **discovery pull** (heuristic urgency/sparsity only). After pull, re-rank with real `point` market for EIG.  
3. **Quota:** Two-phase spend — cheap discovery first, EIG refinement second — stretches 500-credit free tier.  
4. **VoI product:** Cockpit can show `marketPriorKind: rejected_unknown | max_entropy_default | point` as a rights-clean status chip.

**Code**

- `MarketBelief` + `eigOfMarketPull` reject-unknown by default  
- `rankMarketPullsByEig` reports `unknownMarketCount` / `rejectedUnknownCount`  
- `scoreOddsPullCandidate` blends entropy **only** when both `modelP` and `expectedMarketP` are finite  

---

## R2 — Synthetic tests ≠ certificate → launch bar as brand

| Before (liability) | After (leverage) |
|--------------------|------------------|
| Green unit tests mistaken for “calibrated” | **Certificate ladder** with hard tier caps |
| Pressure to ship confidence from geometry | Synthetic **cannot** leave `geometry_only` |
| Fake greens | `publicClaim` strings ready for UI/docs |

**Ladder**

```text
geometry_only  →  historical_replay  →  production_eligible
     ↑                    ↑                      ↑
  unit tests         real settled          founder MODEL_VERSION
  synthetic          holdout gates         still priced:false until YES
```

**Leverage plays**

1. **Launch scoreboard:** Certificate tier is an evidence-backed % component, not vibes.  
2. **Marketing:** “We publish the certificate tier. Synthetic green is not a trophy.”  
3. **Hostile expert:** Bored — every green has a tier and reasons[].  
4. **Compounding:** Each real holdout run either promotes tier or appends honest `reasons` (PLAN_DELTA fuel).

**Code**

- `issueCalibrationCertificate` / `geometryOnlyCertificate`  
- Always `priced: false` even at `production_eligible`  

---

## R3 — Dual ranker disagreement → credit firewall

| Before (liability) | After (leverage) |
|--------------------|------------------|
| Two scores, human confusion | **`compareVoIRankings`** forces inspect when top-k diverge |
| Accidental double-spend logic | `inspectRequired` / `safeToSpendWithoutInspect` |
| Heuristic vs EIG silent conflict | Jaccard + orderDiscord as cockpit telemetry |

**Leverage plays**

1. **Quota weapon:** Spend credits only when dual rankers agree on top-k — or after founder/ops inspect.  
2. **Brand:** “Two independent utility models; we don’t burn credits on a single heuristic.”  
3. **Learning:** Persistent onlyHeuristic / onlyEig sets → taxonomy sparsity bugs or model-calibration debt.  
4. **Inference attack:** If UI shows only one list, customer infers false certainty — dual list is the honesty fix.

**Code**

- `compareVoIRankings(heuristic, eig, topK)`  
- `toRankedIdScores` for heuristic side  

---

## Combined flywheel

```text
Unknown market (R1)
  → discovery pull
  → real quote
  → EIG re-rank (R3 agree?)
  → spend under budget
  → settle
  → Mondrian residual + coverage report
  → certificate ladder (R2)
  → publicClaim / founder gate
  → never silent price
```

Every step is a **fence that sells**: rights-clean data hunger, dual-checked spend, tiered proof.

---

## Anti-metrics (do not optimize)

- Maximize credits burned  
- Maximize certificate tier without real holdout n  
- Force dual-ranker agreement by dropping one ranker  
- Default unknown → 0.5 to “look complete”  

---

## Outstanding (not forgotten)

See session recon: PR #258 / #261 founder merges, WS-B game creation, conformal research hold, Clarity #260, founder-lane keys. These residuals are **closed as leverage** in UQ code; estate merges remain founder one-choice.

# HANDOFF — Calibration gate RED → GREEN (Brier / ECE)

Repo: Beexly/Sports (Galaxy Sports Edge) · Date: 2026-08-18 · Owner: founder (G) · Executor: coding agent (Claude Code)
Suggested repo location for this file: `docs/ops/handoffs/2026-08-18-calibration-gate.md`

---

## 0. Operating rules (non-negotiable — read before anything else)

1. Read `CLAUDE.md`, `docs/ops/CANONICAL.md`, `docs/calibration-proposals/FROZEN.md`, and `scripts/guardrails/*` first. Nothing in this handoff overrides them. If FROZEN.md forbids a change below, log it as a founder decision — do not work around it.
2. Week-Saver Mode. Before editing, write down: target files · why each matters · intended change · risk · smallest validation command. ≤5 files per change without asking. Small, reversible, behind a flag.
3. Do not scan the whole repo. Grep the terms in §3, read only what's needed. Do not paste whole files into context.
4. Database is read-only for this work. Export → analyze locally. No migrations, no writes to Neon `gse-postgres`, no destructive ops. If a new table is genuinely needed, stop and ask.
5. Hard stops (founder YES required): production deploy · Stripe · any public accuracy claim or copy change on public routes · flipping `PUBLIC_PICKS_ENABLED`, `PERFORMANCE_STATS_ENABLED`, `CANONICAL_HISTORY_ENABLED`, `LIVE_BOARD`, `PUBLISH_LEDGER`, or the gate's default behavior · weakening anything in `scripts/guardrails/*` · `oddsApiRequired` stays `false` (free-first).
6. Stop and ask when: schema/auth/payment/production behavior would change; an architecture change is implied; there are multiple viable paths; Decision A (§5) trips.
7. Reversible, non-listed decisions: make the call, log it in the report, move on.
8. Definition of done (from CLAUDE.md): `npm run lint && npm run typecheck && npm run test && npm run build` all exit 0. TS strict, no `any`. Tests required. No fake data — every number in the report comes from the export.
9. Note: the public GitHub snapshot may lag the working tree (public `CLAUDE.md` is 114 lines; the operating one is ~700). Trust the local checkout, not this document, for paths. Verify every path in §3 before citing it.

---

## 1. Situation (from `/cockpit/calibration`, window 2026-06-18 → 2026-08-17)

| Metric | Value | Floor | Status |
|---|---|---|---|
| Brier | 0.2563 | 0.22 | RED (over by 0.0363) |
| ECE | 0.0699 | 0.05 | RED (over by 0.0199) |
| Sample | 1164 canonically settled picks | 100 | GREEN (11×) |

- Model versions pooled: v5.0.0 – v5.2.6
- Publish requires 3 consecutive green windows: currently 0 of 3
- Engine's own projection: selective mode / more calibration maps → Brier ≈ 0.2613. Verbatim: "Selective alone barely moves Res — need independent modelProb / sport models (not more maps)."

---

## 2. Diagnosis (established — verify it with numbers, do not relitigate it)

Brier = REL − RES + UNC (Murphy). A forecaster that says 0.50 on every pick scores exactly 0.25. At 0.2563, with REL ≈ 0.005–0.015 (implied by the ECE), RES ≈ 0. **The model currently has ~no resolution.** Calibration maps fix REL only; they cannot manufacture RES. Closing REL entirely gets ~0.245–0.25. The remaining ~0.03 to reach 0.22 has to come from new discriminative signal. The engine's projection is correct.

Three defects in the gate itself:

1. **Reachability.** If picks are spread/total sides, the market prices each side ~50/50; best-case Brier is ~0.245–0.2475 and 0.22 is unreachable. If moneyline: closing-line Brier is ~0.24 in MLB/NHL and low 0.20s in NBA/NFL; the window is MLB-heavy, so a flat 0.22 may sit below the market's own score. Floors must be per-sport and relative to market Brier on the same picks.
2. **ECE noise.** 10 bins × ~116 picks → per-bin SE ≈ √(0.25/116) ≈ 0.046 → a perfectly calibrated model shows ECE ≈ 0.8 × 0.046 ≈ 0.037 by chance. A 0.05 floor is barely above the noise floor and will flicker.
3. **Version pooling.** v5.0.0–v5.2.6 pooled hides whether the current version is already better (or worse).

Consequence for scope: **no time goes into new calibration maps or tuning `selective`.** Work order is measure → fix the gate → refit calibration honestly → test for independent signal → spec sport models.

---

## 3. Phase 0 — Locate (read-only, ~30 min, ≤5 file reads)

Grep terms: `Brier` `ECE` `eligib` `consecutive` `streak` `0.22` `0.05` `modelProb` `calibrationMap` `calibration_map` `selective` `"Res"` `binding constraint` `closingOdds` `settledAt` `MODEL_VERSION`

Expected homes (verify): gate + scoring math in `packages/prediction-engine/` ("core scoring + readiness gates"); Pick model in `packages/db/prisma/schema.prisma`; panel in `apps/web` under the `/cockpit/calibration` route (MODEL_VERSION-gated, read-only); freeze rules in `docs/calibration-proposals/FROZEN.md`; enforcement in `scripts/guardrails/*`.

Record in the report (exact paths + line refs):
- Gate computation (Brier / ECE / floors / streak / window) and the projection code
- Pick fields: modelProb (raw vs mapped — both if they exist), outcome (incl. push/void encoding), sport, market type, side, odds at pick time, closing odds (if stored), model version, settledAt, lifecycle status ("canonically settled" definition)
- Calibration maps: type (Platt / isotonic / binned), fit data, in-sample or out-of-time, per-sport or global
- What one "window" is for the 3-streak (daily eval? weekly?) and how green/red is persisted
- Existing scoring package (`@sports/calibration` or similar) — reuse it; do not duplicate math
- Whether closing odds exist. If not, say so: Phase 1 uses odds-at-pick as the market proxy and reports it as such.

---

## 4. Phase 1 — Measure (read-only; no product code changes)

**Export** settled picks in the window to CSV: `pick_id, sport, market_type, side, model_version, modelProb_raw, modelProb_mapped, odds_at_pick, closing_odds, outcome, settledAt, status`. Exclude push/void from scoring; report their counts.

**Regression anchor first:** recompute the existing gate on the export and reproduce **0.2563 / 0.0699 / 1164** exactly. If it doesn't reproduce, stop — you are not measuring what the cockpit measures. Fix the query, not the math.

Then compute per `sport × market_type × model_version`, plus overall (formulas §9):
- n, base rate ō, Brier, log loss
- Market implied prob (de-vigged) from closing odds if stored, else odds at pick; **market Brier**; BSS_vs_market = 1 − Brier_model / Brier_market
- Murphy REL / RES / UNC (K=10 equal-mass) and CORP MCB / DSC / UNC (isotonic; identity exact)
- ECE equal-mass K=10 and K=5, each with 1000× bootstrap 95% CI
- ECE null distribution: simulate y ~ Bernoulli(p_model) 1000×; report the 95th percentile (the calibration-test threshold for this n)
- Reliability table (equal-mass bins: p̄, ō, n)
- Version trend: same stats by version in settle order

Analysis language: Python (numpy / sklearn `IsotonicRegression`) is fine for the one-off if available; production scoring math stays TS in the existing package with tests. Do not add dependencies to the app for analysis.

**Deliverable:** `docs/ops/calibration/2026-08-18-diagnosis.md` (+ CSV of stats). Numbers only; one paragraph of findings max.

---

## 5. Decision A — stop point after Phase 1

- If spread/total sides are ≥ ~50% of picks, **or** market Brier on the same picks exceeds 0.22 for the dominant sports → the 0.22 floor is structurally unreachable. Report with numbers, propose the §6.1 gate, and **STOP** for founder decision. Do not tune anything.
- Otherwise proceed to §6.

---

## 6. Phase 2 — Changes (small, flagged, reversible; one PR each; ≤5 files each)

### 6.1 Gate v2 — shadow, default off
Compute alongside v1; log both; render v2 in `/cockpit/calibration` as "shadow gate" only. Flag `CALIBRATION_GATE_V2=false` default.
- Scope: current major.minor model version only; rolling 60d; per-sport with min n 150 (else "insufficient")
- Brier: `floor_sport = marketBrier_sport (same picks) + 0.005`; headline metric = BSS_vs_market with bootstrap CI
- Calibration: green if observed ECE ≤ 95th pct of the null (perfect-calibration sim) **and** CORP MCB reported; retire the fixed 0.05
- Streak: keep 3-of-3 semantics unchanged (one change at a time); note the e-process alternative (the Honest Thesis machinery is the natural home for a sequential publish test) as follow-up
- Projection copy unchanged
Validation: §8 unit tests; snapshot test that v1 numbers are byte-identical; v2 renders when flag on; nothing public changes.

### 6.2 Calibrator refit — out-of-time (check FROZEN.md first)
Replace in-sample / isotonic maps with Platt (2 params) or beta calibration (3), fit on rolling out-of-time folds (weekly blocks in settle order; fit on all prior; min 200). Per sport only if n_sport ≥ 200; else shrink toward global with weight n/(n+200). Report pooled out-of-fold ECE and Brier vs current maps. Wire in **only** if OOF ECE improves and OOF Brier does not worsen; keep the old map behind a flag. This should take ECE under 0.05; it will not move Brier much and must not be sold as if it does.

### 6.3 Market-anchored blend — analysis only, then STOP
Fit out-of-time: `logit(p̂) = α + β₁·logit(p_mkt) + β₂·logit(p_model)`. Report β₂ with CI and OOF Brier vs market. If β₂'s CI covers 0 → no independent signal yet; report, do not wire. If it doesn't → propose wiring p̂ as the published probability with pick rule "publish where |p̂ − p_mkt| > vig + k·SE"; **STOP for founder YES** (changes published behavior).

### 6.4 Per-sport independent models — SPEC ONLY, no implementation
Write `docs/ops/calibration/sport-model-interface.md`: interface `SportModelProvider { sport; version; predict(gameCtx) → { prob, features, asOf } }`; per-pick storage of each provider's prob; recommended baselines — MLB starting-pitcher-driven (pitcher quality, bullpen state, park, lineup handedness) with Glicko-2 as floor; WNBA rating + rest/travel/injury; soccer Dixon–Coles Poisson; tennis surface-specific Elo; MMA Glicko-2; stacking meta-learner trained out-of-time, shrunk toward market where n is thin. Multiple viable paths → founder picks the first sport.

---

## 7. Order and stop points

Phase 0 → Phase 1 → **Decision A** → 6.1 → 6.2 → 6.3 (analysis) → 6.4 (spec) → **STOP**.
Do not start 6.2 before 6.1 tests pass. Do not wire 6.3. Do not implement 6.4.

---

## 8. Validation (must pass before any PR)

- `Brier(p=0.5 ∀)` = 0.25 exactly; `Brier(p=y)` = 0
- Synthetic calibrated set (y ~ Bernoulli(p), n=1164, K=10): ECE ≈ 0.03–0.04 and inside the null 95th pct
- CORP identity: `Brier = MCB − DSC + UNC` to 1e-9. Murphy identity to 1e-9 when p is replaced by bin means; with raw p report the within-bin residual, don't hide it
- De-vig: probabilities sum to 1; American → decimal → implied round-trips
- Regression anchor: v1 gate reproduces 0.2563 / 0.0699 / 1164 on the export
- Calibrator OOF leakage assert: `max(fit.settledAt) < min(eval.settledAt)` in every fold
- `npm run lint && npm run typecheck && npm run test && npm run build` exit 0

---

## 9. Formulas

- De-vig (multiplicative): `q_i = 1/decimal_i`; `p_i = q_i / Σ q`. American→decimal: `A>0 → 1 + A/100`; `A<0 → 1 + 100/|A|`.
- Brier = mean((p − y)²). BSS_vs_mkt = 1 − Brier_model / Brier_mkt.
- Murphy (K equal-mass bins): `REL = Σ n_k (p̄_k − ō_k)² / N`; `RES = Σ n_k (ō_k − ō)² / N`; `UNC = ō(1 − ō)`.
- CORP (Dimitriadis–Gneiting–Jordan 2021): `p̃ = isotonic(y ~ p)` (PAV); `MCB = Brier(p) − Brier(p̃)`; `DSC = Brier(ō) − Brier(p̃)`; `UNC = ō(1 − ō)`; `Brier(p) = MCB − DSC + UNC` exactly.
- ECE (equal-mass): `Σ n_k |p̄_k − ō_k| / N`. Null: for b in 1..B, `y* ~ Bernoulli(p)` → ECE_b; threshold = 95th percentile.
- Platt: `y ~ σ(a + b·logit p)`. Temperature: a = 0. Beta (Kull et al. 2017): `logit p̂ = a·ln p − b·ln(1−p) + c`, a,b ≥ 0.
- Blend: `y ~ σ(α + β₁·logit p_mkt + β₂·logit p_model)`, out-of-time.
- Shrinkage: `θ_sport = w·θ̂_sport + (1−w)·θ̂_global`, `w = n/(n+200)`.
- OOF: weekly blocks in settle order; fit on all prior blocks (min 200), evaluate on the block; pool.

---

## 10. Report back (per PR, Week-Saver format)

files changed · exact behavior changed · validation run · validation result · remaining risk · next safest step · compact working-memory summary

Founder decisions to surface, each with your recommended default:
1. Pick-universe finding — does 0.22 stay? (Decision A)
2. Gate v2 defaults (per-sport min n, margin, null percentile)
3. Streak vs e-process for the publish test
4. Wire the 6.3 blend? (only if β₂ is significant)
5. Which sport model to build first (6.4)

---

## 11. Context pointers

Monorepo: `apps/web` (Next 14) · `packages/db` (Prisma) · `packages/prediction-engine` (scoring + readiness gates) · `packages/data-ingestion` · `workers/`. Canonical DB: Neon `gse-postgres`. Ops SoT: `docs/ops/CANONICAL.md` + prod `/cockpit`. Pick lifecycle: proposed → modeled → published/locked → graded → settled. Public accuracy standard: Brier + CLV, never "% accurate". Existing sequential-testing machinery (E-process, Ville) lives in the Honest Thesis work — reuse for a publish gate later, don't rebuild.

---
---

# APPENDIX — verification against the live gate

**Not part of the original handoff.** Added 2026-08-18 21:40 UTC by a separate session,
from a live probe of `GET /api/ops/public-surface-truth` on `www.galaxysportsedge.com`.
Two items above are contradicted by that endpoint; one is confirmed. Read this before
starting Phase 1 — item A will otherwise stall you at the first step.

## A. CORRECTION — the regression anchor as written is unreachable

§4 says: *"recompute the existing gate on the export and reproduce **0.2563 / 0.0699 /
1164** exactly. If it doesn't reproduce, stop."* Those three numbers do not come from one
population. The live endpoint returns them from two different blocks:

```
calibrationEligibility: { n: 472,  brier: 0.2563, ece: 0.0699, mce: 0.3339,
                          dateRange: "2026-06-18…2026-08-17" }
sample:                 { canonicalSettled: 1164, canonicalPending: 188,
                          canonicalPushes: 3, commencedTotal: 1617 }
```

**The gate scores n = 472. The 1164 is `canonicalSettled` — the learning-floor sample, a
different and larger population.** The §1 table pairs them in one row, which reads as though
Brier 0.2563 was computed over 1164 picks. It was not.

Consequence if uncorrected: an agent following §4 literally will query 1164 settled picks,
compute a Brier that is *not* 0.2563, conclude "I am not measuring what the cockpit
measures", and stop — exactly as §4 instructs. The premise is wrong, not the query.

**Corrected anchor:** reproduce `Brier 0.2563 / ECE 0.0699 / n 472` on the gate's own
population. Then, separately, establish what distinguishes those 472 from the 1164 —
that difference is itself a Phase 0 deliverable and is not documented anywhere above.
Candidate causes to check, not assume: the gate may require a non-null `modelProb`, may
restrict to specific market types, or may apply its own recency window inside the stated
date range. Do not guess — find the filter in the gate code.

`mce: 0.3339` is also available and not mentioned above; worth capturing in the same anchor.

## B. CONFIRMED — the §2 diagnosis, now with exact numbers

§2 reasons that REL ≈ 0.005–0.015 and RES ≈ 0. The endpoint already publishes the Murphy
decomposition, so this no longer needs to be inferred:

```
murphy: { reliability: 0.0090, resolution: 0.0024, uncertainty: 0.2495 }
```

Identity check: `REL − RES + UNC = 0.0090 − 0.0024 + 0.2495 = 0.2561` against a reported
Brier of `0.2563` — a 0.0002 gap, consistent with rounding at four decimals.

Both estimates in §2 were right. **RES = 0.0024 is effectively zero**, and the conclusion
that calibration maps cannot manufacture resolution stands on measured values.

It also quantifies the gap §2 leaves approximate. `UNC = 0.2495` implies a base rate
`ō ≈ 0.50`, so with perfect calibration (REL = 0) the model would score `0.2495 − RES`.
Reaching the 0.22 floor therefore requires **RES ≥ 0.0295** — more than **12×** the current
0.0024. That is the size of the signal problem, and it is worth stating in those terms to
the founder, because no amount of recalibration closes it.

## C. Prerequisite not mentioned above — CI is dead

`npm run lint && npm run typecheck && npm run test && npm run build` is the §0.8 and §8
definition of done. Be aware that **GitHub Actions has not successfully run since
2026-08-14** (last 30 runs: 22 failed, 8 cancelled, 0 successful; jobs get `runner_id: 0`
and produce no logs — no runner is ever assigned, consistent with exhausted Actions
minutes). Run the DoD locally and report it as locally verified. Do not treat a red CI
check on your PR as a signal about your change, and do not try to fix CI in code — it is a
billing action for the owner.

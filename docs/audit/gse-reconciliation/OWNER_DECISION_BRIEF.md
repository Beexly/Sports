# Owner Decision Brief

Branch `claude/keen-ptolemy-t38f1g` @ `60bccd84` · scope: **AUDIT-ONLY** · 2026-06-26
Reads on top of: `GSE_UNIFIED_FIELD.md`, `AUTHORITY_TENSOR_PROOF.md`, `ADVERSARIAL_EXECUTION.md`.

---

## 1. Verdict

**`READY_FOR_PREVIEW`** (within audit scope).

This is approval-grade for *preview of the audited work*, **not** a green light to merge, go live,
spend, or publish. The basis, against the owner's own bar:

| Bar for "ready" | Status |
|---|---|
| Branch reconciles with `main` | ✅ 0 behind / 74 ahead, fast-forward-clean; merge-base == main |
| Canonical decision-state grammar (one, not two) | ✅ single 14-state union, compile-guarded |
| Authority-stack composes downward, fail-closed | ✅ proven by exhaustion (864 combos, 0 violations) |
| Fixture/shadow structurally cannot become public action | ✅ **theorem**, CI-enforced |
| The one fabricated-success defect closed | ✅ cockpit corrected; proven by live render |
| Packet accounted for "to the standard of intelligence" | ✅ 21 canonical committed; dupes/screenshots/missing-SVG named |
| CI generates Prisma; all-workspace typecheck/test/build green | ✅ on hosted CI (run #1453); ⛔ locally `ENVIRONMENT_BLOCKED` (Prisma ECONNRESET) — to be re-confirmed on this push |

**Not yet "fully complete"** only because the all-workspace typecheck + Next build cannot run in
this sandbox; they are confirmed on hosted CI. Re-confirmation on the pushed audit commit is the
last gate (`Verify` task).

---

## 2. The reserved gates — owner-only, one-click, NOT touched this pass

Each is a single decision with a stated precondition and blast radius. The audit built *up to* each
and stopped.

| Gate | Precondition (what must be true first) | Blast radius | Recommendation |
|---|---|---|---|
| **Merge to `main`** | This audit commit green on hosted CI | Branch → trunk; no runtime behavior change (docs + 1 test + prototype) | **Safe to merge** once CI is green — it is additive and fast-forward-clean |
| **Cockpit "live"** | Real agent/data wiring + auth; today it is a static prototype | Operator surface goes from illustrative to operational | **Hold** — prototype only |
| **Buy / activate paid feeds** | Vendor questionnaire (`score24` `vendor_candidate`); rights clearance | Spend begins; `THE_ODDS_API` quota consumed | **Hold** — no spend authorized |
| **Galileo real-data run** | Key presence (not value) + portfolio + budget; CLI is PLAN-only/$0 | First live ingestion | **Hold** — `galileo:plan` stays PLAN_ONLY |
| **`priced=true`** (any estimator) | ≥100 settled + non-worsening ECE + Model Court (per `RUNG_REQUIREMENTS`) | A shadow signal starts moving the published number | **Hold** — 0 settled today |
| **`canPublishProjections`** | Historical backtest **beats naive** OOS (it does **not**: MAE 5.31 vs 4.91) + calibration | Model projections surface publicly | **Hold** — backtest does not yet beat naive |
| **`PERFORMANCE_STATS_ENABLED`** | PROVEN rung (≥100 settled + published calibration) | Public track-record surface opens | **Hold** — FOUNDING rung, 0 settled |

The Observatory and the corrected cockpit both render every one of these as **HELD**, by
construction — the instruments cannot show otherwise.

---

## 3. Ranked next moves (highest leverage first)

1. **Merge this audit commit to `main`** after CI green — it is additive (docs + one theorem test +
   the corrected prototype), it fast-forwards, and it makes the One Law a permanent CI invariant.
   *Lowest risk, highest durability.*
2. **Unfold the Authority Tensor, one layer at a time** (`GSE_UNIFIED_FIELD.md §2`). Start with
   **Rights** and **Evidence-sufficiency** as first-class meet operands in `authorityCeiling`. The
   theorem test (`AUTHORITY_TENSOR_PROOF.md` T1) is the harness that proves each unfold preserves the
   law. *Owner-gated production change — propose-only until armed.*
3. **Fix the PAST_DUE grace leak (Integration-Matrix O-4 / ledger C-5).** Entitlement appears to drop
   straight to FREE instead of the documented 7-day grace — a revenue-integrity bug in production
   code. *Owner-gated; smallest validation: a PAST_DUE user retains access for the grace window in a
   test.*
4. **Copy/consistency pass on C-6** (Tweedie label, conformal "guarantee" wording, preseason-vs-
   historical backtest framing). Not safety defects; brand-precision items.
5. **Graduate the Forecasting Frontier modules (INTEL_02)** from design-stage to shadow, behind the
   same gates everything else obeys — Module 1 (Opportunity) and Module 4 (Regression) first, as the
   packet itself recommends. *Each ships `priced=false` until it beats naive OOS.*

---

## 4. The one decision the owner needs to make now

**Merge this audit commit to `main`?** It changes no runtime behavior (documentation, one additive
theorem test, and an integrity-corrected prototype), reconciles cleanly, and turns "we cannot render
dishonesty" from a slogan into a test that fails the build the day it stops being true. Everything
else on the ladder remains HELD and owner-gated.

Recommendation: **yes, once hosted CI is green on the pushed branch** — then proceed to move #2
(unfold Rights + Evidence-sufficiency) as the next, separately-approved step.

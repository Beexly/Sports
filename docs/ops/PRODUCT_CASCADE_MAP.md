# Product Cascade Map

How a competitive claim becomes revenue, and which concrete module owns each
step. This exists because the honesty work kept accumulating as isolated
engines with no line drawn to a paying customer. Every row below names a real
file or route — if a step has no owner, that is the gap to close next.

```
competitive claim
  → honesty engine
    → decision surface
      → proof surface
        → entitlement
          → checkout
            → retention
```

---

## 1. Competitive claim → honesty engine

The claim: competitors publish a number for every situation. We publish a
number only when the calibration actually supports one, and say so out loud
when it does not.

| Claim | Engine that makes it true |
|---|---|
| "We don't dress a thin sample as a rate" | `apps/web/lib/intelligence/hit-rate-display.ts` (`MIN_HIT_RATE_SAMPLE`), `apps/web/lib/airwave/grade.ts` (`MIN_DECIDED_FOR_PUBLISHED_RATE`) |
| "We refuse to bet when we can't pin the probability down" | `packages/prediction-engine/src/edge-lab/selective-gate.ts` — `maxWidthForFire`, reported as `widthNoBets` |
| "Our probabilities are intervals, not point guesses" | `calibration/ivap.ts`, `calibration/cvap.ts`, surfaced via `MultiprobSource` |
| "A public number carries its evidence or it doesn't publish" | `packages/prediction-engine/src/guards/display-substantiated.ts`, `apps/web/lib/ledger/display-guard.ts` (`renderableMetricOrNull`) |
| "Our sources are rights-clear" | `apps/web/lib/statking/rights/`, source lineage fields |

## 2. Honesty engine → decision surface

`applySelectiveGate` now emits, on every `FiredDecision`: `width`,
`multiprobSource`, and optionally `taxonomyCategory`. A No-Bet caused by an
over-wide interval is counted in `SelectiveGateReport.widthNoBets` rather than
silently dropped.

**Consuming surfaces:** the Board, the Lab decision cards, `/stats` (StatKing).

**Status:** the data reaches the decision object. Rendering "we refused this
because the interval was too wide" on a live card is the open last-mile step —
see Gaps below.

## 3. Decision surface → proof surface

| Surface | Route | What it proves |
|---|---|---|
| Glass Ledger | `/glass-ledger` | Per-metric coverage, lower bound, CLV backing, walk-forward provenance. Founder-gated behind `PUBLISH_LEDGER`, default off. |
| Integrity | `/integrity` | Agent control-plane governance — SHADOW default, signed receipts, keyring. **Distinct from pick honesty.** |
| Proof of record | `/proof`, `/verify` | Tamper-evident SHA-256 pick receipts. |
| Recompute | `scripts/edge-lab/recompute.ts` | The verifier a stranger can run themselves. |

The two integrity stories must not be conflated: `/integrity` is about how our
*agents* are governed; the Glass Ledger is about whether a *pick claim* is
substantiated. Same value, different subject.

## 4. Proof surface → entitlement

`packages/types/src/index.ts` → `Entitlements`:

| Key | FREE | FANTASY | PRO | ELITE |
|---|---|---|---|---|
| `canSeeEdgeScore` | ✅ | ✅ | ✅ | ✅ |
| *existence* of a No-Bet | ✅ | ✅ | ✅ | ✅ |
| `canSeeMultiprob` | — | — | ✅ | ✅ |
| `canSeeNoBetDetail` | — | — | ✅ | ✅ |
| `canSeeGlassLedger` | — | — | ✅ | ✅ |
| `canSeeRecompute` | — | — | ✅ | ✅ |

The split is deliberate: **the refusal is free, the reasoning is paid.** Seeing
that we declined to bet is the credibility hook and must never be gated —
gating it would make the pitch "more picks," which is the positioning this
product exists to reject. What converts is wanting to know *why*.

Enforcement is server-side via `apps/web/lib/entitlements.ts`
(`getUserEntitlements`) and `apps/web/lib/api-entitlement.ts`; never a
client-side check.

## 5. Entitlement → checkout

Reason-to-buy copy must lead with honesty, in this order:

1. **No-Bet protection** — we tell you when not to bet. Nobody else does.
2. **Multiprobability intervals** — a range with finite-sample validity, not a
   confident-sounding point estimate.
3. **Glass Ledger access** — every published number carries coverage, a lower
   bound, CLV backing, and walk-forward provenance, or it does not publish.
4. **Rights-clear sources** — lineage on every input.

Explicitly **not** the pitch: pick volume, "premium picks," win-rate claims.
Any checkout copy asserting a rate must pass `assertDisplaySubstantiated` or
`renderableMetricOrNull` first — no exceptions for marketing surfaces.

## 6. Checkout → retention

What keeps a subscriber:

- **No-Bet record** — a visible history of refusals that were correct is the
  compounding trust asset; it is the thing a competitor cannot fake quickly.
- **Ledger history** — accumulating substantiated claims, recomputable at any
  time.
- **Rights clarity** — no rug-pull risk from a source going dark.

---

## Open gaps (as of this document)

1. **Ledger persistence of multiprob.** `FiredDecision` carries `width` /
   `multiprobSource` / `taxonomyCategory`, but the Pedersen/ledger-chain
   encoding does not yet record them. Until it does, the honesty metadata is
   in-memory only and not recomputable from the ledger.
2. **Glass Ledger sealed-vault copy** does not yet name the recompute verifier
   path for a reader who wants to check the method before subscribing.
3. **The selective gate is not wired to the live board.** `/board`'s passes
   come from the `gate_decisions` table; `applySelectiveGate`'s
   width/`maxWidthForFire` No-Bet runs in the edge-lab research path only. So
   the *width-based* refusal reason has no production producer yet. The Board's
   No-Bet surface is built on the refusals that ARE real (gate decisions), and
   the width reason slots into the same structure when the gate goes live —
   deliberately not faked in the meantime.

## Closed since this document was written

- **No-Bet reasoning is rendered.** `/board` shows every pass and its
  human-readable reason to everyone, and the auditable trail (reason code,
  confidence at refusal, model version, evidence count) to `canSeeNoBetDetail`
  holders. Withheld server-side, fail-closed by default.
- **Checkout copy reordered** to the section-5 ordering. `PRO_FEATURES` and the
  Pro description now lead with No-Bet reasoning, multiprob intervals, Glass
  Ledger and recompute; pick volume is demoted below them.

## NON-CLAIMS

This document describes wiring, not results. It asserts no win rate, ROI, or
edge. It does not claim the Glass Ledger currently publishes anything —
`PUBLISH_LEDGER` defaults off and the sealed state is the honest one. It does
not claim any partnership or pilot exists.

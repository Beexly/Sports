# 08 · Technical Architecture

PROJECT PARALLAX · how the instrument is built, where it lives, and why it **extends** GSE rather than
sitting beside it. Built on branch `claude/keen-ptolemy-t38f1g`.

---

## Principle: one new object, one new composition, zero new taxonomies

PARALLAX adds **no new package** and **no new decision grammar**. It extends the already-wired
`@sports/decision-field-runtime` with three additive modules and consumes the canonical 14-state
grammar unchanged. This is the cheapest, lowest-risk seam that still closes GAP-1/GAP-2.

| New file (in `packages/decision-field-runtime/src`) | Role | Closes |
|---|---|---|
| `authority-vector.ts` | the canonical 8-layer `AuthorityVector` + `composeAuthority` → `{ceiling, bindingLayers, trace}` | **GAP-1** (rights + evidence first-class) and **GAP-2** (one recorded composition order) |
| `parallax-instrument.ts` | the Decision Object, Time Lens, Observer Arena, Reality Fork, boundary, refusal, replay digest, counterfactual memory, fixture | the instrument runtime |
| `__tests__/authority-vector.test.ts`, `__tests__/parallax-instrument.test.ts` | the contraction lemma + the adversarial proof (Pass 8) | the guarantees |

Everything is `export *`-ed from the package barrel (`index.ts`); no export collisions
(`authorityCeiling` etc. stay owned by `decision-authority-gate.ts`).

## The safety invariant of the design

The production gate `authorityCeiling` is **not modified** (unfolding it is owner-gated). Instead the
new `composeAuthority` is proven a faithful *superset* by the **contraction lemma**:

```
∀ ctx:  composeAuthority(authorityVectorFromContext(ctx)).ceiling  ===  authorityCeiling(ctx)
```

— verified over all 72 contexts in `authority-vector.test.ts`. So the 8-layer object can never
over-permit relative to today's gate; it only makes Rights and Evidence visible meet operands and
records the binding layer (the Authority Autopsy). When the owner chooses to unfold the production
gate, this lemma is the harness that proves the unfold preserves the law.

## Data flow (the one circulation)

```
 fixture facts  ──light cone(T)──▶  Λ(T)
 fixture beliefs ─observer arena(T)▶  B(q,T) ──disagreement──▶ DATA_CONFLICT?
 intervention  ──do(x:=v)──▶ forkWR1Availability ──conservation check──▶ propagated Δ + intervals
                                   │                                         │
 authority vector ──composeAuthority──▶ {ceiling, bindingLayers, trace}      │
                                   ▼                                         ▼
                         buildDecisionObject ──claim = strengthMin(desired, ceiling)──▶ DecisionObject
                                   │                                         │
                          wr2Boundary (x*)                        autopsyHook + replayDigest
```

Every surface reads **one** `DecisionObject`. The claim is bounded by the meet *by construction*
(`strengthMin(desired, ceiling)`), so it can never exceed what the eight layers permit — the central
safety property, tested.

## How it maps onto existing organs (no duplication)

- **Decision grammar** → `decision-state.ts` (14 states), consumed unchanged.
- **Strength lattice + meet** → `decision-state-stat-contract.ts` (`strengthMin`, `rankOf`), reused.
- **Legacy 4-term gate** → `decision-authority-gate.ts`, untouched; bridged by the contraction lemma.
- **Conservation doctrine** → the fork enforces team-target conservation (yards/TDs analogue), the
  same "conserve the pool, derive the points" rule from `GSE_INTEL_00`.
- **Intelligence Ledger** → `creditVerdict` is designed to feed the FDR/confirmation-window ledger;
  it returns a verdict and mutates nothing (A5).
- **Field Observatory** → the preview instrument (Pass 7) inherits its visual language.

## The interactive preview (Pass 7 / `09_VERTICAL_SLICE.md`)

The verifiable interactive artifact is a self-contained, offline, fixture-watermarked HTML instrument
(`docs/gse-packet/observatory/PARALLAX_REALITY_FORK.html`) that mirrors the engine's logic over the
**same fixture** — the same pattern the Field Observatory used (a tested canonical core + a
render-verified instrument). A header comment names `parallax-instrument.ts` as canonical; a snapshot
test guards the headline fixture values against drift.

## Live-path mount (designed, NOT built — `11_LIVE_PATH_DOSSIER.md`)

When the owner arms the live path, the same `buildDecisionObject` runs with `sourceReality: "LIVE_REAL"`
and real facts/beliefs sourced through the existing ingestion + `FactSupplyPath` activation lifecycle;
a Next route (`apps/web/app/parallax/…`) mounts it server-side behind entitlements. Until then the data
mode stays `FIXTURE` and the meet caps everything at `INFO_ONLY` — there is **no** code path by which
the fixture instrument emits a public action.

## Why a competitor cannot trivially copy it

The surfaces (time lens, observer arena) are cheap to clone. The **fused loop** is not: it requires
(a) the canonical authority composition that bounds every fork, (b) point-in-time fact capture the
market does not store, and (c) the counterfactual residual memory that only accrues from running the
loop over time. Prior art (`01`) confirms no product combines more than ~2.5 of the five pillars.

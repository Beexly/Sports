# The Authority Tensor — Proof

**The Law of Conserved Authority, proven by exhaustion.**
Backing test: `packages/decision-field-runtime/src/__tests__/authority-tensor.theorem.test.ts`
(13 assertions · CI-enforced · ran green this pass — see `ADVERSARIAL_EXECUTION.md`).

---

## The claim

For any output `O`, with `context(O)` drawn from the eight authority layers, the strongest
expression `O` may make is bounded by the **meet** of the eight layer ceilings:

```
expressed_strength(O)  ≤  ⊓_{L=1..8}  ceiling_L( context(O) )
```

over the totally-ordered strength lattice

```
INFO_ONLY (0) ⊏ WATCH (1) ⊏ WAIT (2) ⊏ PERSONALIZED (3) ⊏ ACTION (4) ⊏ PUBLIC_ACTION (5)
```

with `⊓` = `strengthMin(a,b) = rankOf(a) ≤ rankOf(b) ? a : b`.

This is the contraction of the **8-layer Authority Stack** to the **4-term meet** the production
gate computes today (`decision-authority-gate.ts`): data-mode, model-authority, publication, and
readiness. The remaining four conceptual layers (rights, temporal, evidence-sufficiency,
owner-action) are *folded* into these four or enforced beside them (`GSE_UNIFIED_FIELD.md §2`).

---

## The eight theorems (each quantified over the full product space)

The domain enumerated: **3** data-modes × **4** model-authorities × **3** publications × **2**
readiness = **72** authority contexts; for `isPublicSafe`, × **6** strengths × **2** rights =
**864** combinations; state composition × **14** decision states.

| # | Theorem | What it proves | Result |
|---|---|---|---|
| **T1** | **Contraction.** `authorityCeiling(ctx)` equals the meet of an *independently re-authored* layer spec, for all 72 contexts. | The 4-term meet is verified against a second source, not itself — the 8→4 fold is faithful. | ✅ 72/72 |
| **T2** | **Conservation.** `authorityCeiling(ctx) ≤` every individual layer operand, for all 72. | No layer can *raise* the ceiling — authority is conserved, not generated. | ✅ |
| **T3** | **The Theorem.** No `FIXTURE`/`SHADOW_REAL` context is `isPublicSafe`, for *any* strength and *any* rights. | Fixtures and shadow data can **never** go public. The contrapositive (`isPublicSafe ⟹ LIVE_REAL`) is checked over all 864. | ✅ 0 violations |
| **T4** | **Bottom is absorbing.** Every `FIXTURE` context yields `INFO_ONLY`, even fully-public model/publication/readiness. The fail-closed default is the lattice bottom. | The single most important gate: a demo can never become an action. | ✅ |
| **T5** | **Apex is unique.** Exactly **one** of the 72 contexts reaches `PUBLIC_ACTION` — the full `LIVE_REAL + PUBLIC_ALLOWED + ready + PUBLIC` conjunction. | Public action requires *every* gate simultaneously; drop any one and it falls. | ✅ exactly 1 |
| **T6** | **`isPublicSafe` spec.** The implementation equals its independent fail-closed specification across all **864** combinations. `INFO_ONLY` is never public even under full conjunction. | The public conjunction has no hidden hole. | ✅ 864/864 |
| **T7** | **Lattice laws.** `strengthMin` is commutative, associative, idempotent, with `INFO_ONLY` absorbing and `PUBLIC_ACTION` the identity, over all strengths. | The meet is a *genuine* lattice operation — the algebra the whole proof rests on. | ✅ |
| **T8** | **State composition.** A `FIXTURE`-backed card of **any** of the 14 decision states composes (`strengthMin(authorityCeiling, statCeiling)`) to `≤ INFO_ONLY`; with no facts, no state licenses more than `WATCH`. | Kinematics × force-law compose under the law — the 14 states obey the meet. | ✅ 14/14 |

---

## Why exhaustion (not examples)

`authority-gate.test.ts` already proves *specific* cases. A specific case can pass while a corner of
the space silently violates the invariant. The platform's entire trust posture — "we cannot render
dishonesty" — is a **universal** statement (`∀ context …`), so it deserves a universal proof.
Enumerating the full 864-combination product space and asserting zero violations is the closest a
test can get to a theorem. It runs on every commit; the day someone adds a `DataMode` or loosens a
ceiling, T1–T8 fail loudly before the change can merge.

## The fold, made executable (the 8→4 contraction)

T1 re-authors the four layer-ceiling tables **by hand** inside the test as an independent
specification, then asserts `authorityCeiling` equals their meet for all 72 contexts. That is the
contraction proof: the production 4-term meet *is* the meet of the (folded) layer specs, checked
against a second implementation. When the owner chooses to **unfold** a layer (e.g. make rights or
evidence-sufficiency a first-class meet operand), this test is the harness that proves the unfold
preserves the law — add the operand to the spec, and T1/T2 must still hold.

## Status

`EXECUTED_AND_GREEN` — 13 tests, 864 public-safety combinations, 0 violations, run locally this pass
and enforced in hosted CI. See `ADVERSARIAL_EXECUTION.md` for the run transcript.

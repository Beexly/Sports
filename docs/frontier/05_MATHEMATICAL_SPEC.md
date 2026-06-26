# 05 · Mathematical Specification

PROJECT PARALLAX · Pass 5. Formalizes the Decision Object, the canonical authority composition (closes
GAP-1/GAP-2), the time/observer/causal/boundary/memory models. Every object below is **buildable and
tested**; this spec is the contract the code in `decision-field-runtime` implements (Pass 7).

Notation: strengths live in the lattice `S = INFO_ONLY ⊏ WATCH ⊏ WAIT ⊏ PERSONALIZED ⊏ ACTION ⊏
PUBLIC_ACTION` with meet `⊓ = strengthMin`. `rank: S → {0..5}`.

---

## Axioms (the governing law)

- **A1 · Conservation of Authority.** For any expression `e`, `strength(e) ≤ ⊓_{ℓ∈L} ceiling_ℓ(ctx)`
  over the eight authority layers `L`. No layer raises the ceiling. *(Extends the proven tensor theorem
  from 4 to 8 terms.)*
- **A2 · Knowability.** A fact `f` may inform a decision at time `T` iff `f.observedAt ≤ T`. The
  light-cone `Λ(T) = { f : f.observedAt ≤ T }`. Decisions are functions of `Λ(T)` only.
- **A3 · Valid intervention.** A counterfactual is admissible iff it is a `do(x)` intervention (sets a
  variable, severing its incoming causes) — not conditioning — **and** it conserves the protected
  quantities `Q` (team pass attempts, team rush attempts, team yards, team TDs). Fantasy points are
  derived, never conserved.
- **A4 · Fail-closed.** Missing evidence ⇒ the bottom (`INFO_ONLY`); unknown layer ⇒ most restrictive.
- **A5 · No learning from a single outcome.** A weight/theory may move only via the Intelligence
  Ledger's FDR + confirmation-window discipline; never from one settled result.

---

## 1. Reality state & the light cone

A **reality state** at time `T` is `R(T) = (E, F)` where `E` is the entity set (players, teams, games,
markets) and `F = Λ(T)` is the set of facts knowable at `T`. Each fact:
`f = { type ∈ FactType, value, observedAt: ISO, source, rights ∈ LegalVerdict, derivation? }`.

**Time model.** `T` ranges over a discrete grid of fixture timestamps (e.g. Mon..Sun, lock). The Time
Lens is the map `T ↦ R(T)`. **Invariant (testable):** `T1 < T2 ⇒ Λ(T1) ⊆ Λ(T2)` (monotone) and a
decision computed at `T1` is invariant to any `f` with `observedAt > T1`.

## 2. Observer model

An **observer** `o ∈ {BOOK, FANTASY, CROWD, GSE}` holds a belief about a comparable quantity `q`:
`belief(o, q, T) = { point, interval?, observedAt, source, rights }`. The **Observer Arena** at `T` is
the vector `B(q,T) = (belief(o,q,T))_{o}`. **Disagreement** `D(q,T) = max_o point_o − min_o point_o`
(or a dispersion z). Observers are never averaged into a single truth (A3 forbids laundering
disagreement); `DATA_CONFLICT` surfaces when `D` exceeds a per-quantity threshold and the frames have
incompatible provenance.

## 3. The AuthorityVector (canonical composition — closes GAP-1/GAP-2)

The single object every surface reads. Eight layers, in fixed order, each emitting a ceiling in `S`:

```
AuthorityVector = [
  L1 Rights        : rights(ctx)        → S
  L2 Temporal      : freshness/lock(ctx)→ S
  L3 SourceReality : dataMode(ctx)      → S      (FIXTURE→INFO_ONLY, SHADOW→WATCH, LIVE→PUBLIC_ACTION)
  L4 Evidence      : statSufficiency(ctx)→ S      (required groups satisfied? else cap)
  L5 LocalExpr     : permissionGradient → S
  L6 ModelMaturity : modelAuthority     → S
  L7 Entitlement   : userTier+publication→ S
  L8 OwnerAction   : ownerArmed         → S
]
```

`composeAuthority(v) = ( ceiling, bindingLayers, trace )` where
`ceiling = ⊓_{ℓ} v[ℓ]`, `bindingLayers = { ℓ : rank(v[ℓ]) = rank(ceiling) }`,
`trace = [(ℓ, v[ℓ])]`. **Composition order is total and recorded** (closes GAP-2). The binding layer is
*why the answer is only this strong* (the Authority Autopsy).

**Contraction lemma (testable, closes GAP-1 safely).** With `L1,L4` at their top and `L2` folded into
`L3`, `L7` into publication, `composeAuthority` **equals** the existing 4-term `authorityCeiling`. So
the new object is a faithful *superset*: it never over-permits relative to today's gate (proven by a
test enumerating contexts), and it makes Rights and Evidence first-class terms. **We do not modify the
production `authorityCeiling`** (owner-gated); PARALLAX consumes `composeAuthority`, and the lemma
guarantees consistency.

**publicSafe** is unchanged in spirit: `publicSafe(v) ⇔ ceiling > INFO_ONLY ∧ L3=LIVE ∧ L1=public ∧
L6=PUBLIC_ALLOWED ∧ L7=PUBLIC ∧ L2=fresh`. Fixtures/shadow can never be public (A1+A4).

## 4. The Decision Object (the central, replayable entity)

```
DecisionObject = {
  id, atTime: T,
  state ∈ DecisionState,             // the 14-state grammar (unchanged)
  lightCone: Λ(T),                   // facts knowable at T
  observers: B(·, T),                // the arena
  authority: AuthorityVector,        // composed
  permitted: { ceiling, bindingLayers, trace },
  claim: ClaimBoundedCard,           // ≤ permitted.ceiling, by construction
  intervention?: Do,                 // present on a fork
  boundary: BoundarySpec,            // see §6
  autopsyHook: { settlesAt, protocol },
  replayHash: sha256(canonical(self without volatile))
}
```

**Claim bound (testable):** `rank(claim.strength) ≤ rank(permitted.ceiling)` always.

## 5. Counterfactual model (the Reality Fork)

A **fork** is `do(x := v)` on one condition `x` (player active flag, line, weather, role, salary,
ownership). Propagation `Φ` maps the pre-fork state to a post-fork state:
`Φ(R(T), do(x:=v)) = R'(T)` such that:
- **(valid)** `x` is set, its incoming edges severed (intervention, not conditioning). Invalid (e.g.
  "condition on a future outcome") ⇒ **reject**, return a refusal.
- **(conserved)** for each protected `Q_k`, `Σ_players share_k = Q_k` pre and post (redistribution, not
  creation). A fork that injects/destroys conserved mass ⇒ **reject**.
- **(authority-inherited)** `R'` carries the *same or lower* authority ceiling; a fork can never
  *raise* expression (A1). Forking on a fixture stays `INFO_ONLY`.
- **(interval-honest)** propagated deltas carry intervals (bootstrap/conformal), never bare points.

Redistribution example (WR1 `OUT`): vacated target share `τ` flows to remaining receivers by
conditional weights `w_p` (`Σ w_p = 1`), so `targetShare'_p = targetShare_p + τ·w_p`, conserving team
targets. Team total may shift via a separate, declared elasticity; props recompute as
`prop'_p = usage'_p × efficiency_p × plays`. Every changed assumption is **listed** on the object.

## 6. Decision-boundary model (the Possibility Surface)

For an intervention axis `x` (e.g. WR1 snap probability `p ∈ [0,1]`), the **boundary** is the value
`x*` where the decision-state or the recommended action flips:
`boundary(x) = inf { x : action(Φ(R, do(axis:=x))) ≠ action(R) }`. The product sells `x*` ("the action
flips when X crosses Y"), not a point estimate. **Testable:** crossing `x*` changes the action;
not-crossing does not.

## 7. Memory / learning model (Counterfactual Memory)

At settlement time `s > T`, compare the realized outcome `y` against the forked branches `{R'_i}`. The
**credit verdict** ∈ `{EARNED, LUCKY, UNLUCKY, CORRECTLY_REFUSED, WRONGLY_REFUSED}` is a function of
(claim, permitted, y, branch distribution), **not** of `y` alone (A5). Residuals the ontology cannot
explain enter the **DRAFT discovery** queue (symbolic-regression candidate), gated by FDR +
confirmation window + owner approval before any weight moves. **Testable:** one settled result moves no
weight; a `CORRECTLY_REFUSED` pass is scored as a win, not a blank.

## 8. Product-expression model

Surfaces render the Decision Object and nothing stronger than `permitted.ceiling`. The instrument's
five acts map to the objects: **Time Lens** = §1, **Observer Arena** = §2, **Reality Fork** = §5,
**Authority Autopsy** = §3, **Refusal/Replay** = §4/§7. Fixture-watermark is mandatory whenever
`L3 ≠ LIVE`.

---

## What is NOT formalized as equations (kept honest)

We do **not** invent equations for show. Team-total elasticity, redistribution weights, and efficiency
are **fixture priors** in the slice (declared, not estimated) — their *job in the slice* is to make the
propagation legible and conserved, not to claim predictive accuracy. Every such prior is labeled
`FIXTURE PRIOR — illustrative, not estimated`. Accuracy is gated (settled-n = 0, gate HELD).

→ Implemented in `08_TECHNICAL_ARCHITECTURE.md` / `09_VERTICAL_SLICE.md`; attacked in `10`.

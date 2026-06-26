# 00 · Repository & Packet Ground Truth

PROJECT PARALLAX · Pass 0 · branch `claude/keen-ptolemy-t38f1g` @ `42557437` (audited head)
Method: a read-only Explore audit verifying the 14 mandated structural-risk hypotheses against
actual files, plus the prior session's Unified-Field audit. **Verify, do not trust.**

> Conclusion up front: the organism is **more canonical than the risk list feared on 10 of 14
> points**, but **two real seams remain open** — and they are precisely the seams PARALLAX must
> close to earn the word "instrument." (1) The authority law is enforced as **4 of 8** conceptual
> layers, scattered across three modules; (2) gate composition is **fragmented across three
> independent systems** with no single canonical order any surface consumes.

---

## Status table

| # | Concept | Intended doctrine | Actual file(s) | Status | Canonical owner | Tests | Live/Fixture/Shadow | Contradiction | Next action |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Decision grammar | one union | `decision-field-runtime/src/decision-state.ts:14-57` | **CANONICAL** | `decision-state.ts` | compile-guard + suites | n/a | none | hold |
| 2 | Evidence contracts | complementary layers | `decision-state-stat-contract.ts` (need) + `nfl-stat-universe/.../decision-state-matrix.ts` (supply) | **CANONICAL** | stat-contract (need) | matrix + acceptance | n/a | none | hold |
| 3 | State compilers | 14 distinct | `state-compilers.ts` (`STATE_COMPILERS`) | **TESTED** | `state-compilers.ts` | 46 tests | fixture | none | hold |
| 4 | Authority / publicSafe | 8 layers | `decision-authority-gate.ts:76-99` | **CONFLICTED** | `decision-authority-gate.ts` | tensor theorem (864) | enforced | **4-of-8** | **PARALLAX GAP-1** |
| 5 | Source capability | per-fact lifecycle | `nfl-stat-universe/.../decision-state-matrix.ts` (`FactSupplyPath`) | **DATA_GATED** | `decision-state-matrix.ts` | acquisition tests | all CATALOGUED, **0 LIVE** | none (honest) | extend per-fact provenance |
| 6 | Galileo portfolio | operational | `galileo-week` + `scripts/galileo-plan.ts` | **IMPLEMENTED** | `week-plan.ts` | CLI acceptance | PLAN-only / $0 | none | make output JSON+exit-code truthful (Pass 9) |
| 7 | Trust-gate exemptions | scoped | `scripts/guardrails/trust-gate.mjs` | **IMPLEMENTED** | `trust-gate.mjs` | scope test | n/a | none | hold |
| 8 | Intelligence Ledger | fixture≠validated | `decision-factory/src/intelligence-ledger.ts` (`LedgerStatus`) | **TESTED** | `intelligence-ledger.ts` | BH-FDR, HAC, window | fixture→`FIXTURE_TREND` | none | hold |
| 9 | Conserved Authority | canonical object, consumed | `decision-authority-gate.ts` → `run-decision-field-frame.ts:119` | **IMPLEMENTED** | gate + frame | tensor theorem | enforced | not cosmetic ✓, but see #4/#10 | unify (GAP-1/2) |
| 10 | Gate composition | one order | `ladder/reduce.ts` (RUNG_RANK) · `readiness.ts` (env flags) · `decision-authority-gate.ts` (strengthMin) | **CONFLICTED** | none (3 systems) | each tested separately | mixed | **3 systems, no single order** | **PARALLAX GAP-2** |
| 11 | Live/fixture/shadow markers | explicit | `DataMode` (`decision-authority-gate.ts:14`); default `FIXTURE` (fail-closed) | **IMPLEMENTED** | `DataMode` | field tests | explicit | none | propagate to every surface |
| 12 | Routes | sparse, gated | `/observatory`, `/proof`, `/proof/memory` (public); `/cockpit/*` (owner) | **PREVIEW_ONLY** | apps/web | route-integrity | fixture/preview | none | slice mounts here |
| 13 | Authority packet (audit) | one circulation | `docs/audit/gse-reconciliation/*`, `docs/gse-packet/*` | **CANONICAL** | unified-field | tensor theorem | n/a | parallel-artifact risk | PARALLAX unifies |
| 14 | One Ladder ↔ gates | one composition | `ladder/reduce.ts` + readiness + entitlements | **CONFLICTED** | see #10 | partial | n/a | overlap | **PARALLAX GAP-2** |

Status legend used: CANONICAL · IMPLEMENTED · TESTED · PREVIEW_ONLY · FIXTURE_ONLY · SHADOW ·
OWNER_GATED · DATA_GATED · DESIGNED_ONLY · DUPLICATED · CONFLICTED · NOT_FOUND · SUPERSEDED.

---

## The 14 risk hypotheses — verdicts (with evidence)

1. **Competing DecisionState grammars** → **REFUTED.** One union in `decision-state.ts` (14 states,
   compile-time exhaustiveness guard); `decision-state-matrix.ts` *imports* it, does not re-author.
2. **Competing evidence contracts** → **REFUTED.** `STAT_CONTRACTS` (what's *needed*) and
   `FACT_SUPPLY_GRAPH` (what's *available*) are complementary layers; the matrix consumes the
   contract, no second taxonomy.
3. **Compiler only knows role-up/fantasy-late** → **REFUTED.** `STATE_COMPILERS` keys all 14 states
   with distinct `detectClaims`/`buildNarrative`; 46 passing compiler tests. (Caveat: several states
   share a *minimal* contract for fact-requirements, but their *narratives* are distinct.)
4. **Fixture/shadow can over-express** → **REFUTED (proven).** `dataModeCeiling(FIXTURE)=INFO_ONLY`;
   the authority-tensor theorem checks all 864 public-safety combinations, 0 violations.
5. **publicSafe missing layers** → **CONFIRMED (the real gap).** `isPublicSafe`/`authorityCeiling`
   enforce **4** terms — data-mode, model-authority, publication, readiness. **Rights** is a boolean
   *parameter* (and a `minimumRightsStatus` in stat-contracts), **evidence-sufficiency** lives in
   `auditRequiredStats`, and **model-maturity / user-entitlement / owner-action** are not distinct
   gate terms here. The 8-layer doctrine is *true in aggregate but not unified in one object.* → GAP-1.
6. **Provider→fact overstatement** → **REFUTED.** `FactSupplyPath` carries per-fact
   endpoint/legal/adapter/ingestion/validation/live status; graph is honestly all-CATALOGUED.
7. **Catalogued≠built/live conflation** → **REFUTED.** Activation lifecycle
   CATALOGUED→ADAPTER_BUILT→INGESTING_SHADOW→VALIDATED→LIVE is explicit; `isFactLive` true only at LIVE.
8. **Galileo cosmetic** → **REFUTED.** Portfolio controls candidate source-ids, unlocked fact
   classes, catalogued decision states, and the budget tier checked; deferral logic is real.
9. **Trust-gate exemptions too broad** → **REFUTED.** Narrow, documented allowlists (sharp-money 11,
   lock-technical 4, disclaimer 1, path-whitelist 11); promotional use still fails inside exempt files.
10. **Ledger overstates fixture trends** → **REFUTED.** `LedgerStatus` separates
    `FIXTURE_TREND`/`UPWARD_UNVALIDATED` from `VALIDATED_IMPROVING`; HAC variance, BH-FDR, effect-floor,
    confirmation window; the fabricated `t=±50` was removed.
11. **Bridge/Observatory/Ladder/packet are parallel artifacts** → **PARTIALLY CONFIRMED.** They share
    doctrine and the Observatory now renders the law, but they are not yet *one circulation* —
    distinct files, distinct data, no shared runtime object. → PARALLAX unifies (GAP-1/2).
12. **Cockpit/Observatory beautiful but static** → **CONFIRMED (by design, fixture-watermarked).**
    Both are fixture-driven previews; not operationally wired to a live decision object. Acceptable
    today; PARALLAX's slice must be *interactive over a real fixture decision object*, not a mockup.
13. **Conserved Authority is local theorem only** → **PARTIALLY REFUTED.** `authorityCeiling` *is*
    consumed (`run-decision-field-frame.ts:119`), not just tested — but it is **not** the single
    canonical authority object every surface reads; the ladder and readiness gates decide elsewhere. → GAP-1/2.
14. **Ladder/readiness/priced/publication/entitlement/owner overlap without one order** →
    **CONFIRMED.** Three systems decide gates in three code paths with no single composition
    function. → GAP-2.

---

## The two seams PARALLAX must close (the white space, internal)

**GAP-1 — Authority is 4-of-8, scattered.** The Law of Conserved Authority is real and proven, but
the *full* eight-layer ordering (Rights ▸ Temporal ▸ Source-operational-reality ▸ Evidence-sufficiency
▸ Local-expression ▸ Model-maturity ▸ User-entitlement ▸ Owner-action) is split across
`decision-authority-gate.ts`, `decision-state-stat-contract.ts` (`minimumRightsStatus`,
`auditRequiredStats`), and `reduce.ts`. There is no single `AuthorityVector`/composition object that
takes all eight layers and returns one ceiling + the *binding layer* + a *trace*. PARALLAX needs that
object because a counterfactual instrument must show **which authority bound the answer** and **how a
forked condition moves it** — impossible without one composition site.

**GAP-2 — Gate composition is fragmented across three systems.** `reduce.ts` (ladder rungs),
`readiness.ts` (env flags), and `decision-authority-gate.ts` (strengthMin) each decide a slice of
"may this be expressed/published" with no shared order. A replayable decision object must record
**one** composition, in **one** order, or its "authority autopsy" is incoherent.

**These two gaps are the same gap viewed twice:** there is no single canonical *authority composition*
that (a) orders all eight layers, (b) returns the binding layer and a trace, and (c) is the one object
every surface — card, ladder, publish gate, observatory, and the new instrument — consumes. PARALLAX's
architectural contribution (Pass 5/C) is to define that object **once**, prove the existing 4-term
meet is its faithful contraction (extending the tensor theorem), and make the counterfactual
instrument the surface that *renders the composition moving* as a condition is forked.

---

## What is already strong (do not rebuild — extend)

- The canonical 14-state grammar + exhaustiveness guard.
- The two-layer evidence model (need vs supply) with per-fact activation lifecycle.
- The authority-tensor theorem (864-combination proof) — the seed of the canonical object.
- The Intelligence Ledger's statistical conscience (fixture≠validated).
- The Galileo PLAN-only / $0 CLI.
- The Field Observatory + corrected cockpit as the *visual* language to inherit.

PARALLAX extends these into one runtime circulation; it does **not** introduce a parallel taxonomy.

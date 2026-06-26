# GSE Meaning Compiler

**Modules:** `packages/decision-field-runtime/src/meaning/{claim-object,meaning-compiler,morphology-adapters,page-factory-contract,meaning-lenses}.ts`
**Status:** fixture-only. On fixture data the authority meet binds at Source-reality → `INFO_ONLY`.

## The frame change

GSE does not build pages. **GSE compiles meaning.** Scores24 turns events into betting pages; GSE turns
observations into *governed meaning*. Every sports object — a match stat, a derived stat, a trend, a
prediction, an odds price, a market state, a bonus, a bookmaker rating, an API provider, a resource,
web evidence, an alert, a decision card — becomes one typed `ClaimObject` and passes through one
pipeline:

> raw observation → source passport → rights envelope → time envelope → semantic meaning →
> decision effect → authority ceiling → public expression → autopsy hook → memory update

The page is the *rendering*. The compiler is the *company*.

## The anatomy (Da Vinci) — seven organs

Nothing public may be anatomically incomplete. Every `ClaimObject` carries:

| Organ | Envelope | Reuses (canonical engine — never duplicated) |
|---|---|---|
| Blood (source) | `SourceLineage` | `SourceGenome` / `SourceDossier` / `LegalVerdict` |
| Immune (rights) | `RightsEnvelope` | mirrors `apps/web` `RightsSnapshot` + `SourceRightsStatus` |
| Nervous (time) | `TimeEnvelope` | `temporal-fact.ts` `knowableAt` / `KnowabilityVerdict` |
| Skin (meaning) | `SemanticEnvelope` | `FactType`/`FactClass` + `StatGenome.falsifier` |
| Muscle (decision) | `DecisionEnvelope` | `DecisionState` + `auditRequiredStats` |
| Spine (authority) | `AuthorityEnvelope` | `composeAuthority` (the 8-layer meet) + `buildFlightRecord` |
| Memory (autopsy) | `autopsyHook` + `memoryWrite` | `prediction-court` / `trend-trial` + `five-ledgers` |

## The CORE LAW — ten questions every public object must answer

`explainClaim()` returns the structured answer to: (1) What am I? (2) Where did I come from? (3) When was
I knowable? (4) What am I allowed to mean? (5) What decision can I change? (6) What are my weaknesses?
(7) What authority do I have? (8) What happens to me after the result? (9) Can I be shown publicly?
(10) What would make me stronger or weaker?

## The eight conservation laws

The compiler is a **composition**, not a new engine. It owns no authority math, no knowability math, no
strength lattice. These laws are enforced (`meaning-conservation.theorem.test.ts`):

1. **Conservation of Authority.** `publicExpression` never exceeds `composeAuthority(vector).ceiling`. A
   claim may speak only as loudly as its weakest authority layer.
2. **Conservation of Lineage.** A claim with empty `originRefs` may not exceed `INFO_ONLY`. A claim
   cannot contain more trust than its source supports.
3. **Conservation of Time.** A past decision cannot use a `NOT_YET_KNOWABLE` (future) fact — such a
   claim is refused (`DO_NOT_USE`). No future leakage.
4. **Conservation of Rights.** `isForbidden(legalVerdict)` (or `excluded` / `blocked_technical_controls`)
   ⇒ `DO_NOT_USE`; `permission_required` / `RIGHTS_REVIEW` / unknown ⇒ capped at `WATCH` (internal).
5. **Fixture Ceiling.** On `FIXTURE` source-reality nothing exceeds `INFO_ONLY`, and no stat status
   exceeds `EXPERIMENTAL` (`clampStatus`). A fixture is never rendered as a live claim.
6. **Conservation of Evidence.** Thinner evidence never licenses a louder claim — a `THIN`/`INSUFFICIENT`
   evidence vector caps at or below a `SUFFICIENT` one (monotone through `composeAuthority`).
7. **Monotonic Downgrade.** The pipeline is downgrade-only: every stage's `cappedTo` is ≤ the requested
   expression. The meet only goes down.
8. **No Parallel Systems (the keystone).** Every downgrade the compiler emits is reproducible by calling
   the named engine directly with the recorded inputs. `isForbidden` produces the rights refusal;
   `knowableAt` produces the time refusal; `composeAuthority` produces the authority cap; `SourceLineage`
   structure produces the lineage cap. The compiler can never disagree with the engines it composes.

Two more conservation principles govern the institution around the compiler (documented, enforced
elsewhere): **Conservation of Cost** — no data call unless expected intelligence value exceeds cost and
risk (`odds-api-economics.ts`); **Conservation of Harm** — no user-facing object increases betting
pressure without corresponding clarity and restraint (`slip-mri.ts`, `watchlist-alerts.ts`).

## The pipeline (downgrade-only)

`compileClaimObject(input)` runs: lineage → rights → time → evidence (folded into the authority vector's
`EVIDENCE` layer) → authority. Each stage may only lower `publicExpression`, and records a
`{ stage, engine, reason, cappedTo }` downgrade. The result is `strengthMin` of every cap and the
requested expression. A refusal short-circuits the lifecycle to `DO_NOT_USE`.

## Morphology — pages become renderers

`morphology-adapters.ts` lifts every existing object (stat, trend, prediction, odds, market, bonus,
provider, alert, decision card, web evidence) into a `ClaimObject` **without** setting its expression —
the compiler downgrades. `page-factory-contract.ts` then makes the page a renderer: `validatePageRender`
composes the existing `route-authority-registry` so a prediction page can render only `PREDICTION`
claims with a trial, a bonus page only verified `BONUS` claims, and no page renders a claim above its
permitted expression.

## What it does NOT do

No live data, no network, no spend, no betting call. It does not invent meaning — it governs it. A
fixture compiles to "FYI," and the claim tells you, in plain words, exactly why and what would lift it.

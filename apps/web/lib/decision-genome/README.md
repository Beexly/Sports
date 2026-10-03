# Decision Genome & Epistemic Alpha spine

> GSE does not sell predictions. It manufactures **accountable confidence**. Predictions
> are cheap. Confidence is expensive. Accountable confidence is rare.

This is the pre-result truth protocol for sports decisions, implemented from the
*GSE/GSN Master Research* build order (A–I) as **pure, tested TypeScript**. It does not
re-implement existing CLV math, rights gates, pricing, or the agent registry — it
**composes** them and adds the spine that makes every future feature safer, sharper, and
more provable.

## The atomic object

A **DecisionGenome** is not a pick. The pick is the last visible artifact. The genome is
the full chain behind any *play, pass, wait, suppress, publish, quarantine, contest
adjustment, warning, autopsy, or pricing decision* — across ten layers: time/knowability,
market, evidence, model, agents, user, compliance, proof, and learning.

## Build order (this directory)

| Step | Module | Purpose |
|---|---|---|
| A | `claim-lang.ts` | Typed claims with proof obligations. Public/performance claims delegate to the existing `compilePublicClaim`. |
| B | `decision-genome.ts` | The atomic object + 10 genome layers + constructor. |
| C | `knowability.ts` | Point-in-time kernel: a decision may only rely on facts knowable **at lock**. Leakage is a checkable violation. |
| D | `candidate-ledger.ts` | Tracks every candidate (generated/rejected/suppressed/passed/published) — kills survivorship bias. |
| E | `aperture.ts` | Signal / Shadow / Wait / Pass / Quarantine. Refusal is a product advantage. |
| F | `agent-court.ts` | SCOUT/TAL/AVA/BOBBY/SARAH/JARVIS stake falsifiable, Brier-scored claims. No new external autonomy. |
| G | `decision-replay.ts` | Recompute a decision from frozen inputs; divergence = drift. |
| H | `proof-card.ts` | Draft-only, banned-phrase-scanned, human-gated proof cards. No card auto-publishes. |
| I | `epistemic-alpha.ts` | Scores whether confidence was *deserved before the outcome*: timing · truth · uncertainty · restraint · availability · proof. |

`fixtures.ts` provides a consistent Signal / Pass / Quarantine genome; `index.ts` is the
public surface.

## Dark-corner engines (make the genome's inputs principled, not hand-set)

| Module | Purpose |
|---|---|
| `conformal.ts` | ConformalDecisionGate — abstain unless the conformal interval clears the decision boundary; the principled basis for `model.refused`. |
| `market-physics.ts` | Market Physics Engine — temperature/pressure/gravity/viscosity/entropy/friction/toxicity from book quotes; a `safeToActOn` read. |
| `claim-independence.ts` | ClaimIndependenceIndex — collapses echoes (shared origin / citation / near-identical text) so source-count can't inflate `evidence.independentSources`. |
| `rumor-quarantine.ts` | RumorQuarantine — classifies a claim known/reported/rumored/contradicted/expired/unsafe; feeds `evidence.rumorQuarantined`. Fail-safe: when in doubt, quarantine. |

## Acceptance invariants (enforced by code + tests)

- **No fabricated data** — a proof card can only be built from a *settled* genome.
- **No public claim without the proof gate** — `claim-lang` routes public/performance
  claims through `compilePublicClaim`.
- **No confidence without calibration context** — `ModelState` carries `calibrationHealth`
  and an uncertainty band; the aperture shadows low-calibration decisions.
- **No agent action beyond draft/escalate** — `AgentCourt` only scores claims.
- **No data leakage after lock** — `assertNoLeakage` rejects any fact knowable too late.
- **Projections stay shadow** — `ProofState.priced` is typed `false`; nothing here flips it.

## North star

GSE is the proof layer for sports decisions: *what was known, what changed, what deserved
confidence, and what should have been left alone.*

# Genesis Layer — Proof-Gated Concept-Invention Engine — Status

*Additive, shadow-only. No live gate, priced flag, customer claim, or roster/bet action touched.
`packages/engine/src/genesis` — 63 fixture tests green (56 module + 7 acceptance), full engine
suite 299 green, typecheck clean. Galileo gave GSE eyes; Einstein gave it frames; Discovery gave it
a method; the Fantasy Twin gave it a parallel surface; the Genesis Layer gives it the ability to
INVENT — new concepts, formulas, and laws of belief propagation across betting and fantasy.*

Thesis: **GSE should not be the system with better answers. It should be the system that invents
better questions, turns them into math, tests them against reality, remembers every failure, and
only then earns the right to answer.** Every observer (book, prop, platform, analyst, DFS salary,
ownership, waiver, trade, dynasty, ADP, manager, GSE) is a sensor in one belief economy; the edge is
a temporary non-equilibrium where they have not reconciled.

## What is real (built + unit-tested on fixtures)

| # | Module | What it does |
|---|---|---|
| 44 | `reality-belief-entanglement-tensor.ts` | each observer's implied role state vs truth → residuals, cross-surface contradiction, laggards, overreactors |
| 45 | `decision-leverage-field.ts` | the universal currency across betting AND fantasy actions (BET..DYNASTY_SELL); a signal matters only if it changes a decision per unit cost |
| 46 | `formula-forge.ts` | generates candidate equations from target+form+variables; ships 9 seed formulas; fitness buries leaky/ghost/zero-fitness |
| 47 | `opportunity-conservation-tensor.ts` | removed = redistributed + strategy + efficiency + opponent; flags missing role mass / fake boost / over-credited backup vs ignored sibling |
| 48 | `observer-mind-inversion.ts` | reverse-engineers the role state + policy + bias underneath a prop/salary/rank/ownership |
| 49 | `ghost-similarity-physics.ts` | dead edges as feature-space clusters; new candidates penalized for resemblance |
| 50 | `unknown-unknown-scout.ts` | searches for unexplained, recurring, cross-surface residuals the ontology has no word for, and proposes new concepts (novelty search) |
| 51 | `scarcity-curvature.ts` | nonlinear fantasy value; relative cliff to replacement, sharpened by superflex/TE-premium and roster economy |
| 52 | `decision-phase-transition.ts` | detects crossing named decision boundaries (committee→bell_cow, leverage→chalk→duplication, watchlist→aggressive FAAB) |
| 53 | `belief-refractive-index.ts` | observed/expected belief move → UNDERREACTION/NORMAL/OVERREACTION/CHAOTIC/NARRATIVE_DISTORTED |
| 54 | `action-half-life.ts` | same signal, different action by decay speed (stale prop = minutes, waiver = to lock, dynasty = months); hard lock caps the window |
| 55 | `reflexive-product-risk.ts` | does GSE's own publishing degrade the edge? → PRIVATE/PERSONALIZED/EDUCATIONAL/DELAYED/SAFE_PUBLIC |
| 56 | `theory-ecology.ts` | Darwinian ecosystem over concepts: LAW/HYPOTHESIS/MUTANT/GHOST/RETIRED/QUARANTINED + census |
| 57 | `law-making-constitution.ts` | 9 gates (novelty, compression, leverage, falsifiability, replay, cross-surface, ghost defense, governance, simplicity); all-pass → HYPOTHESIS; LAW only with enough OOS windows |
| 58 | `mutant-hypothesis-generator.ts` | cross-breeds fit concepts that share surface into viable mutants |
| 59 | `anti-edge-minefield.ts` | walks an apparent edge through the death-traps; fatal mines (ghost, fragility, illiquidity) kill outright |
| 60 | `cognitive-bias-differential.ts` | crowd-minus-rational gap per bias (recency, name value, rookie fever, injury panic…); fade or join |
| 61 | `league-economy-simulator.ts` | predicts FAAB winning bid / trade acceptance from **consented** manager genomes only; executes nothing |
| 62 | `contest-field-reflexivity.ts` | DFS/best-ball field crowding → fragile chalk vs sturdy chalk vs leverage, duplication, late-swap sensitivity |
| 64 | `proof-weighted-creativity.ts` | rewards novelty ONLY with compression + leverage + cross-surface support; "language without substance" and ghost-resemblance rejected |

**Acceptance scenarios proven end-to-end** (`__tests__/acceptance.test.ts`, real modules, no mocks):

- **A. New concept proposal** — the scout invents a candidate concept (name, formula sketch,
  mechanism, falsifier, recommended experiment) from an unexplained, recurring, cross-surface residual.
- **B. Concept rejection** — a cool-sounding term that adds language without compression or leverage
  is rejected by BOTH creativity scoring (`language_without_substance`) and the constitution (`REJECTED`).
- **C. Cross-surface discovery** — the entanglement tensor maps belief propagation across props →
  DFS salary → waiver → analyst and names the analyst rank as the most-lagging observer.
- **D. Ghost defense** — an attractive candidate resembling a buried TD-spike trap is suppressed by
  ghost-similarity physics and killed outright by the anti-edge minefield's fatal mine.
- **E. Scarcity curvature** — the same player's action impact rises shallow → deep → superflex-scarce,
  while the DFS leg stays neutral on ownership, not scarcity.
- **F. Reflexive risk** — a DFS-ownership-leverage discovery is marked `PERSONALIZED_ONLY` because
  broad publication would crowd it away.
- **G. Law graduation** — a formula that survives every gate graduates to **HYPOTHESIS**, not LAW,
  with one OOS window; LAW only with enough.

## What is shadow / fixture-only

All of it. Every module is pure and deterministic (no I/O, clock, or RNG; `Date.parse`/`Math.log`/
`Math.exp` of provided values only) and unit-tested on hand-built fixtures — **not yet fed real
cross-surface feeds.** No concept has been validated; the engine generates `PROPOSED` artifacts only.
Nothing emits a customer claim, sets `priced=true`, flips a gate, or takes a bet/roster action.

## Concepts generated / rejected / ghosts matched / formulas

- **Generated (fixture-grade, illustrative):** the scout proposes a `pre_box_value_move` candidate;
  the mutant generator cross-breeds e.g. Role-Mass-Transfer × DFS-Ownership-Gravity. These are
  *method demonstrations* on synthetic residuals, **not** validated laws.
- **Rejected:** "language without substance" terms (high novelty, near-zero compression/leverage) and
  any candidate with high ghost similarity or hallucination risk.
- **Ghosts matched:** the TD-spike trap cluster (real, from `PROP_FINDINGS.md`/`CLV_FINDINGS.md`
  lineage) auto-suppresses a resembling candidate and detonates the minefield's fatal mine.
- **Formulas:** 9 seed formulas forged (absorption lag, fantasy absorption half-life, DFS leverage
  survival, waiver action utility, trade dislocation value, belief refractive index, action half-life,
  opportunity conservation error, fantasy-betting entanglement alpha) — candidates, none promoted.

## What data is missing

Cross-surface, timestamped feeds for every observer: props/alt-lines, DFS salary + ownership,
platform projections + analyst ranks (with update times), roster %, start %, add/drop velocity, ADP,
trade values, and the snap/route/target/carry + injury timelines that define `trueRoleState`. Manager/
league-economy modules require **explicitly consented** league history only.

## Known limitations

- All weights, thresholds, decay priors, and the scarcity steepness curve are *reasonable priors*
  calibrated on fixtures, not fit to outcomes — starting points for empirical calibration.
- "trueRoleState" is an input here; computing it from real feeds is the missing-data dependency above.
- Generated concepts/formulas are unvalidated; the constitution can only graduate to HYPOTHESIS until
  real out-of-sample windows accrue.

## The next highest-discovery-yield experiment

One dense, timestamped cross-surface week (the same historical-credit spend the Einstein/Discovery/
Fantasy atlases need — no separate cost), run through Genesis end-to-end:

1. **Build the RBET** from real observer readings; measure cross-surface contradiction and rank
   laggards/overreactors per role shock.
2. **Run the scout** over the week's residuals; let it propose candidate concepts the current
   ontology cannot explain.
3. **Forge + score** the seed formulas on real features; record fitness and bury the leaky/ghost ones.
4. **Prosecute** every survivor through the constitution; nothing graduates past HYPOTHESIS until K
   independent OOS windows accrue (the same cross-night discipline as the betting nightly worker).
5. **Seed the theory ecology and ghost field** with the week's real outcomes; let evolution run.
6. **Gate expression** through reflexive-product-risk — most discoveries start PRIVATE/PERSONALIZED.

Deliverable: a **Genesis Discovery Atlas** — concepts proposed, formulas forged with fitness, ghosts
matched, laggards by surface, and a single honest verdict per candidate (HYPOTHESIS / candidate /
buried / quarantined). No bet, no roster move, no gate flip, no public claim.

## Guardrails honored

No live gate touched. No `priced=true` changes. No public claims (reflexive-risk gates expression).
No fabricated data. No hindsight. No betting/fantasy certainty language. No private league data
(league-economy is consented-only). New concepts cannot graduate past HYPOTHESIS without OOS windows
(the constitution structurally forbids it). Fixture-safe, deterministic, typed (strict, no `any`),
tested. Every output carries provenance, knowability, rights, prosecutor verdict, and ghost status.
Branch `claude/keen-ptolemy-t38f1g`.

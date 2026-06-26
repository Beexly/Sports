# 09 · The Vertical Slice — Reality Fork

PROJECT PARALLAX · Pass 7. The smallest end-to-end interactive experience that proves the category.
Built, tested, and render-verified. Fixture-only, offline, $0.

---

## What it is

A user takes one fixture decision — *"is WR2 a play this week?"* — and:

1. **Rewinds** the Time Lens (Mon → Wed → Fri → kickoff) and sees the facts become knowable in order.
2. Sees the **Observer Arena** — BOOK 52.5, FANTASY 49.0, CROWD 44.0, GSE 56.0 — appear as each becomes
   knowable (GSE's role read arrives Friday), with the disagreement spread surfaced, never averaged.
3. **Forks reality** — drags WR1's snap probability toward 0 ("WR1 sits") and watches the consequences
   propagate: WR2's target share rises to 29.8%, projection rises to 82.0 yds (with an interval), the
   team's pass attempts held fixed at 34 — **conservation proven on screen** (Σ share = 1.000).
4. Reads the **Possibility Surface**: *"WR2's read flips from pass to watchlist once WR1's snap
   probability crosses 0.88."* The boundary is the product, not a point.
5. Opens the **Authority Autopsy**: the eight layers, with **Source-reality binding** — so the permitted
   expression is **INFO_ONLY**. The fork changed the *read*; it did not raise what we may *claim*.
6. If they rewind to Monday and try to fork, the instrument **refuses**: *"No WR1 status is knowable yet
   — forking now would impute a fact we do not have."* The refusal is the honest, valuable answer.
7. Gets a **Replay Receipt** — a deterministic digest + an autopsy hook that settles at kickoff.

## Where it lives

- **Canonical engine (tested):** `packages/decision-field-runtime/src/parallax-instrument.ts` +
  `authority-vector.ts`. 38 tests (Pass 8 + mirror guard).
- **Interactive instrument (render-verified):**
  `docs/gse-packet/observatory/PARALLAX_REALITY_FORK.html` — self-contained, offline, fixture-watermarked.
- **Mirror guard:** `__tests__/parallax-mirror-guard.test.ts` pins the HTML's headline values (49.6,
  82.0, x*=0.88) to the engine so they cannot drift.

## The mandated slice requirements — each met

| Requirement | How met | Evidence |
|---|---|---|
| begins with a real question/fixture scenario | "is WR2 a play?" over the WR1-questionable fixture | `PARALLAX_FIXTURE` |
| shows multiple observer states | BOOK / FANTASY / CROWD / GSE arena | `observerArena`, UI §③ |
| enforces point-in-time knowability | light cone; future facts excluded; fork refused before status known | test "future fact cannot change earlier decision" |
| exposes source disagreement | disagreement spread, never averaged | `disagreement`, UI §③ |
| allows ≥1 counterfactual change | `do(WR1.snap := p)` | `forkWR1Availability`, UI §② |
| recomputes the decision boundary | `wr2Boundary` → x*=0.88 | test + UI §⑤ |
| computes the authority ceiling | `composeAuthority` → INFO_ONLY, binding SOURCE_REALITY | test + UI §⑥ |
| visibly refuses an overclaim | fixture caps INFO_ONLY; pre-knowable fork refused | refusal panel + tests |
| explains why the answer changed | changed-assumptions list + binding-layer autopsy | UI §④/§⑥ |
| produces a replayable record | deterministic `replayDigest` | test "same input → same digest" |
| attaches an autopsy hook | `autopsyHook` settles at kickoff | test |
| fixture-watermarked | header chips + footer stamp + INFO_ONLY everywhere | UI |
| no network / no spend / no secrets / not live | static offline HTML; pure engine | render verify: 0 network, 0 console errors |

## How to run / verify

- Engine: `cd packages/decision-field-runtime && npx vitest run` (38 PARALLAX tests green).
- Instrument: open the HTML in any browser, or render headless (we verified with Chromium 1194):
  asserted t=0 refuses, t=3 forks to ROLE_UP, ceiling stays INFO_ONLY bound by Source-reality, boundary
  x* present, **0 console errors, fully offline.** See `10_ADVERSARIAL_PROOF.md`.

## Why a skeptic says "I haven't seen a sports product behave like this"

Prior art (`01`) confirms: no sports product propagates a counterfactual through a conserved market,
juxtaposes cross-domain observers, **and** refuses to overclaim — let alone all three over one
point-in-time-honest, replayable object. The slice does all of it, and it *visibly cannot pretend*: on
fixture data the meet pins every expression to INFO_ONLY, by construction.

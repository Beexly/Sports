# HANDOFF — scoring.ts wiring status

**Date:** 2026-10-23
**Branch:** hermes/ship-night-findings
**Remote SHA this pass started from:** `0dca9fa7b794d951c48dc6cd2347893f1588cb27`
**scoring.ts at that SHA:** 87,838 bytes

## DOCTRINE

We are the bookmakers. We do not follow the line. We follow the game.

The week starts when the previous game ends. We review film. We measure usage upticks and downticks. We read coverages and schemes. We track pace. We note what we got right and what we got wrong. As the week moves, we learn the opponent: player vs player, coach vs coach, coordinator vs coordinator, receiver vs coverage, back vs blocking scheme. Later we read the injury report: who is playing, who is out, how that changes the matchup. Only after all of that is locked do we sit down and look at the lines. If our total is 43 and the market is 50, we bet. We do not chase.

The books never choose the side. They only price the side the coach already chose.

## What landed (read the remote file, do not trust this title)

`scoreSpreadPick`, `scoreTotalPick`, and `scoreMoneylinePick` each call `readCoachLock` → `lockFromCoachPacket` → `lockCoachProjection` **before** `input.bookmakerOdds` is read.

The lock input is the same L0/L1/L2 producers as `coachSupport`, evaluated at `pickedSide: "HOME"` so the sign does not depend on a market side. `homeSupport` is that weight sum. Shadows on the packet week are passed through. Two inputs are named gaps and are **not** filled with a number:

- `injuryDropOff` — availability weights are confidence points, not score points (`availability-factors.ts`).
- `staffAggression` — not on `OddsInput.coachTrail`. `markov-simulator.ts` then defaults to `STAFF_AGGRESSION.PHI`.

Published on every pick that survives, inside `factorBreakdown` (the object `process-sport.ts` JSON-copies onto the row):

- `lockedMarginMean`, `lockedScoreMean`, `lockedTotalP10`, `lockedTotalP90`, `lockedInputHash`
- `priceAction`: `PLAY` | `ALT` | `PASS-on-price`
- `lockedEdgePts`
- `coachOverridesStub`
- factors[0] is `Locked coach projection`. `Price check` follows the coach and trench factors. The reasoning string starts with `Locked home margin …`.

`lockedAt` is **not** published. It is `new Date()` inside `lockCoachProjection` and would break scoring determinism.

### When the lock chooses the side

`markov-simulator.ts:70` is `marginMean: 3 + coachShift + kneel*0.1` with `coachShift = coachSupport * 0.15`. The constant `3` (`STUB_HOME_MARGIN` in `engine/coach-lock.ts`) dominates a normal trail. One Out is ±5 confidence points → ±0.75 margin points. That does **not** flip `sign(marginMean)`.

`coachOverridesStub` is true only when `abs(marginMean - 3) >= 3` (home-perspective support about ±21 or more). Then:

- Spread side = `sign(marginMean)`, not `homeFavoredPct`. The consensus gate is not allowed to veto.
- Spread `PASS-on-price` returns null. The market's side is not published.
- Spread `ALT` publishes the quoted home line closest to `-marginMean` that clears 7 points, not the consensus mean.
- Moneyline returns null. `CoachProjection` has no win probability. Margin points are not converted into one (`priceLockedMoneyline`).
- Total side switches only when the band center `(totalP10+totalP90)/2` has moved at least 7 points off the stub `baseTotal` 46.5 (`markov-simulator.ts:62`). `scoreMean` is `mean/2 + 1.5` (a home-score stub). It is published and it is **not** used as the game total.

PLAY requires `DOCTRINE_PLAY_GAP_PTS = 7` in `engine/price-check.ts`. That number is the doctrine sentence "our total is 43 and the market is 50". It is not a fitted constant. A smaller gap is `PASS-on-price`.

Below the stub threshold the previous market side selection still runs. The lock is on the artifact either way. Using `sign(marginMean)` below the threshold would publish the constant 3 as a home side. That was not done.

Proof tests: `packages/prediction-engine/src/__tests__/scoring-locked-price.test.ts`.

### Trench (home only) — reaches confidence

`engine/trench-continuity-factors.ts` reads `GameContextInput.olContinuityDelta | dlContinuityDelta | dbContinuityDelta`.

Weight = `round(delta / 0.15)`. `0.15` is the per-Out coefficient in `signals/trench/offensive-line-continuity.ts` `computeOlContinuityDelta` (same unit in the DL and DB files). No second scale. Signed to the picked side on spread and moneyline (a negative home delta hurts HOME). On totals it is signed to `marginSide`, because a total has no home/away side. Missing field → gap factor, weight 0, description starts with `Gap:`. Measured `0` stays weight 0 and says measured zero.

Called from all three scorers. Added into the confidence sum. Prepended in `factors` after the coach factors.

## What is not live — exact gaps

Do not invent these. A producer signature is the shape the next agent should implement once the input exists.

| Family | File that was opened | Missing input | Producer signature |
|---|---|---|---|
| L0/L1/L2 as a full side-chooser | `coach-sim/markov-simulator.ts:62` and `:70` | A margin and a total that move with one named outage. The stub priors are 3 and 46.5. | Keep `lockCoachProjection(input: CoachSimInput)`. Change the simulator, do not add a fake scale in scoring. |
| Moneyline price | `coach-sim/markov-simulator.ts` `CoachProjection` | No `P(home win)`. | `priceLockedMoneyline` already returns `PASS-on-price`. Add `winProbHome: number` on the projection before scoring publishes an ML off the lock. |
| Away trench | `packages/ingestion-pipeline/src/dynamic-context-builder.ts:83-89` | `awayContinuity` is computed and dropped. The packet fields are home-only. | `trenchContinuityFactors` needs `awayOlContinuityDelta`, `awayDlContinuityDelta`, `awayDbContinuityDelta` on `GameContextInput`. |
| Sovereign signal plane | `intelligence/matchups/matchup_engine.py:311` and `game-context.ts:1079` `computeSovereignSignalPlaneContribution` | Scoring has no `homeSignals` / `awaySignals` record. The TS function also takes `marketFairProb`, so it cannot run before the lock. | `sovereignFactors(homeSignals, awaySignals): FactorDetail[]` with no market probability argument. |
| Situational / mind lane | `reasoning/situational-engine.ts` `interpretSituation`; `dynamic-context-builder.ts:139-177` | The reading is built from `avgSpread` / `marketFairProb`. `GameContextInput.situationalReading` is `unknown`. | A pre-book `situationalFactors(reading: { windSpeedMph, temperatureF, restDaysHome, restDaysAway, altitudeFt }): FactorDetail[]` that does not take a line. |
| Web intelligence | Not on `OddsInput`. Runs after `scoreGame` (census row, still unverified this pass). | No field on the scoring input. | Do not average leans into the side. |
| Conviction registry (scheme-matchup, narrative-incentive, beat-report) | Declared NOT LIVE. | No live rows on the scoring packet. | Do not mark them live. |
| `injuryDropOff`, `staffAggression` | See above. | Not on `coachTrail`. | Extend `OddsInput.coachTrail` with measured score-points and a staff go-rate before passing them into `lockCoachProjection`. |
| 52-file kb | `docs/engine/intel/kb/` | No scoring import. Still raw material. | A producer that returns `FactorDetail[]` from a typed row. A kb file is not wiring. |

L3 rest / schedule / venue / H2H / NGS / biophysical injury already enter the confidence sum through `computeGameContext` when `input.context` carries them. They are not new this pass. They still do not choose the side.

## Next exact work

1. Replace the margin prior of 3 and the total prior of 46.5 in `markov-simulator.ts` with team inputs that already exist, or add the missing inputs by name. Until `abs(marginMean - 3) >= 3` is reachable from a single real outage, most slates still take their side from book agreement. That is the wall, not a finished decision layer.
2. Add `winProbHome` to `CoachProjection` from those same inputs. Then delete the moneyline early-return in `scoreMoneylinePick` and price the ML off that probability.
3. Copy away trench deltas onto `GameContextInput` in `dynamic-context-builder.ts` and extend `trenchContinuityFactors`. Do not sign the home-only delta as if it were a differential.
4. Re-read this file and `scoring-locked-price.test.ts` before editing `scoring.ts`. The three call sites are `readCoachLock` at the top of each scorer.

## Insertion map (if a later edit has to be re-applied)

- Helper block: `readCoachLock`, `lockSentence`, `lockFactor`, `lockedFields`, `trenchFor`, `weightSum` directly under `toCoachSide` in `scoring.ts`.
- Spread: `readCoachLock` is the first line of `scoreSpreadPick`. `priceLockedSpread` runs immediately after `avgSpread`. `PASS-on-price` returns null only when `coachOverridesStub`. `homeIsChosen` uses `marginSide` only in that same case.
- Total: same pattern with `priceLockedTotal` and `totalMoved`.
- Moneyline: `readCoachLock` then `priceLockedMoneyline`. `coachOverridesStub` returns null before `bookmakerOdds` is read.

# Edge-Type Taxonomy v1

**Date:** 2026-06-18
**Author:** reality-engine (docs-only pass)
**Status:** Decision document / proposed registry. No code, schema, deps, or gate changes proposed here.
**Scope:** Define the v1 registry of *edge types* — the named kinds of mispricing we claim to exploit — so each pick can be tagged with what edge it was acting on, and reliability can accrue per type (step 13 of the win-rate loop). For each: definition, detecting signal, whether that signal exists today, and the market it lives in.

---

## Why this registry exists

`edge-significance.ts` can prove our *aggregate* hit rate beats luck. It cannot tell us *which kind* of edge is real and which is noise. Without an edge-type tag on each pick, the "edge-type reliability update" (loop step 13) has nothing to aggregate. This registry is that vocabulary. Tagging is cheap (one enum field); the reliability table it unlocks is the difference between "we have an edge" and "we have *these* edges and not *those*."

**Data-status legend:**
- **HAVE** — the detecting signal exists in data we already store (odds history, opener/close, multi-book prices, derived signals).
- **PARTIAL** — partially detectable now; full detection needs an unwired/missing feed.
- **MISSING** — requires a feed we do not currently ingest. Unlock path noted.

The market column uses SPREAD / TOTAL / MONEYLINE (ML) / PROP.

---

## The v1 registry (13 types)

| # | Edge type | Definition | Detecting signal | Data status | Typical market |
|---|---|---|---|---|---|
| 1 | **stale-injury-price** | A book hasn't moved its line after a meaningful injury/scratch; we price the injury before the book does. | Injury/status feed timestamp vs last `Odds` move for that market; line that *should* have moved but didn't. | **MISSING** (injury feed unwired) — unlock: ingest a player status/injury feed, join on `consideredAt`. Line-staleness half is **HAVE** (odds history). | ML, SPREAD |
| 2 | **derivative-market-lag** | The main market (e.g. spread/ML) has moved but a derived market (team total, alt line, first-half) hasn't repriced to match. | Cross-market consistency check: implied relationship between main line and derivative within the same `Odds` snapshot. | **PARTIAL** — HAVE main spread/total/ML across books; derivative/alt markets only if we ingest them. Unlock: extend ingestion to alt/derivative markets. | TOTAL, SPREAD, PROP |
| 3 | **book-disagreement-lag** | Sharp book has moved; a softer book lags at the old number — we lock the soft book before it catches up. | Cross-book dispersion in the *current* snapshot: one book's price diverges from the consensus. | **HAVE** — multi-book odds + `consensusNoVig` / cross-book scatter in `market-read.ts` already expose this. | SPREAD, TOTAL, ML |
| 4 | **market-overcorrection** | The line moved too far on a piece of news (sharp/steam overshoot); the closing line drifts back. | Opener→current move magnitude vs subsequent reversal in the `Odds` history; large move followed by retrace. | **HAVE** — opener, current, full timestamped line-movement history are stored. | SPREAD, TOTAL |
| 5 | **public-narrative-distortion** | Public money on a popular team/narrative inflates one side; fair value sits on the unpopular side. | Line moving *against* model fair value with no informational trigger; consensus skew. Today proxied by `narrative-signal.ts`. | **PARTIAL** — internal `narrative-signal.ts` exists; true public-money / ticket-% split is **MISSING** (no betting-percentage feed). Unlock: ingest ticket/handle split feed. | ML, SPREAD |
| 6 | **scheme-mismatch** | A matchup-specific tactical edge (e.g. one team's scheme systematically beats the other's) the line doesn't fully price. | Opponent-adjusted scheme/efficiency model output diverging from market. Partial primitive: `opponent-adjusted.ts`, `player-rush-scheme.ts`. | **PARTIAL** — opponent-adjusted rates exist; full scheme tagging needs richer play-level data. Unlock: deeper team/scheme stats. | SPREAD, TOTAL |
| 7 | **player-usage-role-change** | A player's role/usage has shifted (promotion, role expansion, snap-share change) and the prop/total hasn't repriced. | Player usage/snap/minutes data wired to the projection; change-point vs prior. Primitives: `player-projection.ts`, `player-archetype.ts`. | **MISSING (wired)** — player projection code exists but player data is **not wired into the scorer** (per ground-truth: player data unwired). Unlock: wire player feed → `player-projection.ts` → scorer. | PROP, TOTAL |
| 8 | **weather-underreaction** | Wind/precip/cold should depress a total (or favor unders/run-heavy) more than the market has priced. | Weather feed vs total line vs venue norms. | **MISSING** (weather feed unwired) — unlock: ingest a weather feed keyed to venue + commenceTime, join to TOTAL markets. | TOTAL |
| 8b | **OL/DL-mismatch** | Offensive-line vs defensive-line strength gap (NFL/CFB) the line underweights; drives rush totals, game script. | Line-unit grades/efficiency vs opponent; feeds spread + total. | **MISSING** — needs unit-level grades we don't ingest. Unlock: ingest OL/DL efficiency data. | SPREAD, TOTAL |
| 9 | **pace/game-script-mismatch** | Expected pace / game-script (blowout → clock-kill, shootout → overtime of possessions) mis-set, distorting the total. | Pace model + win-probability spread interaction vs market total. Partial via `poisson.ts` scoring distribution + spread. | **PARTIAL** — Poisson scoring distribution is **HAVE**; explicit pace input is thin. Unlock: add a pace estimate per team. | TOTAL |
| 10 | **coach-tendency-mispricing** | A coach's situational tendency (4th-down aggression, timeout/2-pt behavior, run/pass split) the market doesn't capture. | Coach/team tendency priors vs market in relevant situations. | **MISSING** — needs a coach-tendency dataset we don't hold. Unlock: build/ingest a coach-tendency prior. | SPREAD, TOTAL, PROP |
| 11 | **prop-threshold-mispricing** | A player-prop line sits on the wrong side of a meaningful threshold given the player's distribution (e.g. 0.5 too low/high). | Player projection distribution vs the prop line. Primitive: `player-projection.ts`. | **MISSING (wired)** — projection math exists, player data unwired (same blocker as #7). Unlock: wire player feed. | PROP |
| 12 | **no-clear-edge** | The honest default: model and devigged market agree within tolerance — *no* edge. This is the most common, correct classification. | `assessEdge` → `PASS` with agreement `NONE`; model P within `DIRECTION_EPSILON` of `marketFairProb`. | **HAVE** — `edge-engine.ts` already produces exactly this verdict. | all |

(Numbering keeps the prompt's named set intact; "OL/DL-mismatch" is listed as 8b to preserve the requested 13 distinct types plus no-clear-edge.)

---

## Detectable NOW vs data-blocked

**Detectable on data we already have (HAVE):**
- #3 **book-disagreement-lag** — multi-book scatter / `consensusNoVig`
- #4 **market-overcorrection** — opener/current/close + line-movement history
- #12 **no-clear-edge** — `assessEdge` PASS / NONE

**Partially detectable now (PARTIAL — usable proxy today, full signal needs a feed):**
- #2 derivative-market-lag (if we ingest alt/derivative markets)
- #5 public-narrative-distortion (internal `narrative-signal.ts` proxy; real ticket-% missing)
- #6 scheme-mismatch (`opponent-adjusted.ts` proxy)
- #9 pace/game-script-mismatch (Poisson distribution proxy; explicit pace missing)

**Data-blocked (MISSING — needs a feed we don't ingest), with unlock path:**
- #1 stale-injury-price → injury/status feed (line-staleness half is already HAVE)
- #7 player-usage-role-change → wire player feed into `player-projection.ts`
- #8 weather-underreaction → weather feed keyed to venue + commenceTime
- #8b OL/DL-mismatch → unit-level efficiency data
- #10 coach-tendency-mispricing → coach-tendency prior dataset
- #11 prop-threshold-mispricing → wire player feed (same blocker as #7)

## The leverage point

Three edge types (#3, #4, #12) are **fully detectable today** and account for the bread-and-butter of a market-reading product: cross-book lag, overcorrection retrace, and disciplined no-edge silence. **A v1 registry that tags only these three is shippable now** and immediately starts accruing per-type reliability (step 13 of the loop) — we learn whether our overcorrection reads actually beat the close before we ever invest in injury/weather/player feeds.

The PARTIAL types are the next tier: usable with existing proxies, sharpened later. The MISSING types form a prioritized feed-acquisition roadmap, ranked by how often each market appears and how cleanly the signal can be joined to existing pick rows — but none of them blocks shipping the v1 tag. **The cost of tagging is one enum field; the cost of *not* tagging is that every settled pick teaches us nothing about which edge to trust next time.**

## Honesty note

An edge *type* is a hypothesis about *why* we have an edge — it is not itself proof. A pick tagged `market-overcorrection` is a claim to be validated by its CLV and result, not a fact. The reliability table that accrues per type is what converts these labels from belief into evidence; until a type has a settled sample (reuse the ≥20 discipline), report it as "collecting," never as a proven edge.

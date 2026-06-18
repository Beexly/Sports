# Pick-Autopsy Taxonomy v1

**Date:** 2026-06-18
**Author:** reality-engine (docs-only pass)
**Status:** Decision document / proposed classification. No code, schema, deps, or gate changes proposed here.
**Scope:** Define the v1 classification for *why* a settled (or declined) pick turned out the way it did — the structured, both-sides, computable autopsy that loop step 11 needs. For each class: definition, the inputs needed to classify it (which we HAVE), and how it should update learning (preserve a good edge vs punish the model despite a lucky result).

---

## Why this is separate from the existing loss autopsy

A *narrative* loss autopsy already exists: the `LossAutopsy` model (`schema.prisma:442`) with the `LossRootCause` enum (`DATA_GAP`, `STALE_LINE`, `INJURY_SHOCK`, `WEATHER`, `OFFICIATING`, `VARIANCE`, `MODEL_DRIFT`, `HUMAN_OVERRIDE`, `OTHER`), Claude-drafted prose (`whatWeSaw` / `whatHappened` / `whatWeLearned`), and an operator publish workflow (`/api/admin/losses/[pickId]/draft`). It is excellent *content* — but it is **losses-only, prose-first, operator-authored, and does not feed learning.**

This taxonomy is the complement: **both-sides** (wins, losses, AND no-bets), **computable** (machine-classified from stored fields), and **learning-facing** (it tells the model what to reinforce or down-weight). The two should reconcile — the v1 classes below subsume the `LossRootCause` enum (STALE_LINE → `stale-data`, INJURY_SHOCK → `injury-exit-variance`, VARIANCE → `bad-loss`/`bad-win`, etc.) so the narrative and structured views stay consistent.

## The core principle: result is not the verdict

The single most important idea in this taxonomy: **a win is not automatically good and a loss is not automatically bad.** A pick that beat the close and lost to a buzzer-beater was a *good loss* — the process was right; reinforce it. A pick that lost CLV, contradicted our model, and won anyway was a *bad win* — punish the process despite the scoreboard. Classifying on *result alone* is how a tout fools itself. CLV verdict + line movement + data freshness are what separate process from luck.

**Inputs available today for classification (all HAVE):**
- `Pick.result` (WIN/LOSS/PUSH/VOID) — `settlement.ts`
- `Pick.clvVerdict` / `clvValue` — beat/matched/lost the close (`clv-capture.ts`)
- Line movement: opener / current / close from the `Odds` history
- `Pick.confidence` and (future) calibrated probability
- Data freshness: signal-snapshot timestamps, `dataQualityScore`, stale-gate flags
- (future) edge-type tag (`edge-type-taxonomy-v1.md`) and no-bet ledger (`no-bet-quality-measurement-plan.md`)

---

## The v1 classification (16 classes)

`C` = computable **now** from existing `Pick`/CLV/line-movement/freshness fields. `S` = needs more signal (edge type, no-bet ledger, or a feed) to classify cleanly.

| # | Class | Definition | Inputs to classify | Learning update |
|---|---|---|---|---|
| 1 | **good-win** | C | Won AND beat the close (process and outcome agreed). | `result=WIN` + `clvVerdict=BEAT_CLOSE` | Reinforce the edge type; this is the gold case. |
| 2 | **bad-win** | C | Won but **lost to the close** — we got lucky; the market said our number was wrong. | `result=WIN` + `clvVerdict=LOST_TO_CLOSE` | **Do NOT reward the model.** Flag the edge type as result-flattered; watch for regression. |
| 3 | **good-loss** | C | Lost but **beat the close** — right process, variance bit. | `result=LOSS` + `clvVerdict=BEAT_CLOSE` | **Preserve the edge type.** Do not punish; this is expected loss-rate noise. |
| 4 | **bad-loss** | C | Lost AND lost to the close — wrong on both counts. | `result=LOSS` + `clvVerdict=LOST_TO_CLOSE` | Down-weight the edge type / inputs; the clearest "we were wrong." |
| 5 | **CLV-win/result-loss** | C | Beat the close, lost the game. (Sharpens the good-loss cut: emphasizes the leading indicator was positive.) | `clvVerdict=BEAT_CLOSE` + `result=LOSS` | Reinforce process; tally toward the CLV→win-rate lag thesis. |
| 6 | **CLV-loss/result-win** | C | Lost the close, won the game. (Sharpens bad-win.) | `clvVerdict=LOST_TO_CLOSE` + `result=WIN` | Treat as luck; do not reinforce. |
| 7 | **market-already-corrected** | C | The edge we saw had vanished by the close — the line moved to (or past) our number before kickoff. | opener vs close vs our lock; close ≈ our fair value | The read may have been right but *late*; learn to act earlier, not to distrust the signal. |
| 8 | **bad-price** | C | Right side, wrong number — we locked a price worse than we could/should have. | `clvVerdict=LOST_TO_CLOSE` with `result=WIN/LOSS`; lock vs opener | Execution lesson, not a model lesson; tighten timing/price discipline. |
| 9 | **bad-expression** | S | Right thesis, wrong market to express it (e.g. should have been a total, not a spread; or ML vs spread). | result + which market won vs the correlated market | Don't punish the thesis; learn market selection. Needs the correlated-market outcome → **PARTIAL/S**. |
| 10 | **stale-data** | C | We acted on data that was already out of date at lock time. | freshness/stale-gate flags, `dataQualityScore`, snapshot timestamps | Down-weight; this is a pipeline failure, not a model failure. Maps to `LossRootCause.STALE_LINE`. |
| 11 | **wrong-causal-assumption** | S | The model's reason was wrong even if the number was close (we believed the wrong driver). | edge-type tag + post-hoc check; today partly operator-judged | Down-weight that edge type's causal premise. Needs edge-type tag → **S**. |
| 12 | **injury-exit-variance** | S | A key player got hurt/ejected mid-game — outcome driven by an event we could not price. | in-game event feed; today operator-judged. Maps to `LossRootCause.INJURY_SHOCK`. | Exclude from edge-quality scoring (irreducible). Needs an event feed → **S**. |
| 13 | **volatility-ignored** | C/S | The result fell inside known model variance we under-weighted (high-variance market we treated as stable). | model variance/uncertainty input vs realized; `edge-significance` context | Recalibrate uncertainty, not the central estimate. Variance term is **C**; full attribution **S**. |
| 14 | **no-bet-gate-saved-us** | S | A market we *declined* went on to be a clear loser. | **No-Bet Ledger** reject row + derived close/result (`no-bet-quality-measurement-plan.md`) | Credit the gate (feeds `gateResultAlpha`). Needs the no-bet ledger → **S** (ledger is forward-only). |
| 15 | **no-bet-gate-cost-us** | S | A market we declined went on to win clearly — the gate was too tight. | No-Bet Ledger reject row + derived close/result | Evidence to loosen the threshold; honest counter-weight to #14. Needs ledger → **S**. |
| 16 | **insufficient-data** | C | Too little evidence to classify honestly (unsettled, VOID, no close captured, or sub-sample). | `result=VOID/PENDING`, `clvVerdict=null`, `bookmakerCount` low | Exclude from learning; never force a label. The honest catch-all. |

---

## Computable NOW vs needs-more-signal

**Computable today (C) from existing `Pick` / CLV / line-movement / freshness fields — no new data:**
`good-win` (1), `bad-win` (2), `good-loss` (3), `bad-loss` (4), `CLV-win/result-loss` (5), `CLV-loss/result-win` (6), `market-already-corrected` (7), `bad-price` (8), `stale-data` (10), `insufficient-data` (16). The variance term of `volatility-ignored` (13) is also computable.

That is **10 of 16 classes classifiable now** — the entire result × CLV-verdict matrix (the heart of "process vs luck"), plus the line-movement-derived (`market-already-corrected`, `bad-price`) and freshness-derived (`stale-data`) classes, plus the honest exclusion (`insufficient-data`). These can be machine-assigned at settlement from data already on the row.

**Needs more signal (S), with unlock path:**
- `bad-expression` (9) — needs the correlated-market outcome (PARTIAL; we have the other markets, need the join logic).
- `wrong-causal-assumption` (11) and the full attribution of `volatility-ignored` (13) — need the **edge-type tag** (`edge-type-taxonomy-v1.md`).
- `injury-exit-variance` (12) — needs an in-game event/injury feed.
- `no-bet-gate-saved-us` (14) / `no-bet-gate-cost-us` (15) — need the **No-Bet Ledger** (`no-bet-quality-measurement-plan.md`), forward-only.

## How this updates learning (the rule that protects the model)

The autopsy class — not the raw win/loss — decides the learning signal:

- **Reinforce edge type** on `good-win`, `good-loss`, `CLV-win/result-loss` (process was right).
- **Refuse to reinforce** on `bad-win`, `CLV-loss/result-win` (result-flattered luck).
- **Down-weight inputs/edge type** on `bad-loss`, `wrong-causal-assumption`.
- **Pipeline lesson, not model lesson** on `stale-data`, `bad-price`, `bad-expression` (fix the plumbing/timing, leave the central estimate alone).
- **Exclude entirely** on `injury-exit-variance`, `insufficient-data` (irreducible / unjudgeable).
- **Gate-threshold feedback** on `no-bet-gate-saved-us` / `cost-us` (tune `MIN_PUBLISH_CONFIDENCE` and the edge bars with evidence).

This is the discipline that keeps a win-rate platform honest: **we punish or reward the *process*, audited against CLV and line movement, never the scoreboard alone.** It is also the feed that makes loop step 13 (edge-type reliability) meaningful — without per-pick autopsy classes, the reliability table cannot distinguish a genuinely good edge type from one that has merely been lucky.

## Leverage-preservation close

This does not end on "needs data." **10 of 16 classes are computable today** from fields already on the `Pick` row at settlement — most importantly the full result × CLV matrix that separates process from luck. The remaining six are unlocked by two additions already specified in sibling docs (the edge-type tag and the no-bet ledger) plus one feed (in-game events), none of which blocks shipping the computable-now classifier. The minimal move: classify every settled pick into one of the 10 computable classes *now*, so that the day `OUTCOME_LEARNING_ENABLED` is flipped and the 100-pick sample matures (see `minimum-viable-win-rate-loop.md`), each pick arrives pre-labeled with *why* — and the model learns process, not luck.

# Frontier Edge Engine — Status & Honest Ledger

*Branch: `claude/keen-ptolemy-t38f1g` · additive + SHADOW only · written for the owner and the launch session to read or paste into the master ledger. This session does not edit the master ledger directly (collision-safe).*

This is the engine-side answer to the Directing Charter's three ranked moves. The North
Star holds: **the product is provable honesty.** Every module below ships a *signal*
only if it survives measurement; until then it is inert, shadow, and harmless. Nothing
here flips `canPublishProjections` or `priced`, and no module touches a runtime gate.

---

## What shipped (and what each piece actually proves)

| Module | What it is | What it PROVES | What it does NOT claim |
|---|---|---|---|
| `prediction-engine/multiple-testing.ts` | Benjamini-Hochberg FDR + cross-night confirmation | The discipline that stops a nightly sweep from fooling itself: a candidate promotes only after surviving K consecutive OOS nights past a Bonferroni-over-nights bar | That any candidate has passed — it is the referee, not a finding |
| `prediction-engine/entry-timing.ts` | LOCK_NOW / WAIT rule with a latency floor | Given a closing-line forecast, when to enter so expected CLV is maximized without speculating into noise | That waiting earns CLV — it consumes a forecast, it is not one |
| `prediction-engine/projection-features.ts` + `scripts/backtest/projection-feature-bakeoff.ts` | Orthogonal projection features + Clark-West bake-off | **Negative result, proven:** free features + Vegas implied totals do NOT beat the naive trailing-average baseline (feature-vs-naive-error r≈0.006). Projections stay SHADOW. | That projections are sellable — they are not yet; the honest call is shadow |
| `scripts/backtest/market-efficiency-scan.ts` | 27-season FDR scan of NFL closing-line angles | **Negative result, proven:** 0 of 16 pre-registered angles beat the closing line at FDR q=0.10. There is no FREE edge sitting in the closing number. | That no edge exists earlier in the week (that is CLV — see below) |
| `prediction-engine/clv-feasibility.ts` + `scripts/backtest/clv-feasibility.ts` | FDR-controlled test of whether a fixed rule decided AT OPEN beats the close | The machinery to answer the one open edge question, with a real Student-t test and BH-FDR control. Detects a planted edge; finds none on an efficient market. | Any real verdict yet — **gated on line-movement data** |
| `prediction-engine/closing-line-forecaster.ts` + `scripts/backtest/clv-forecaster-backtest.ts` | Ridge-regression forecaster of the signed line delta + walk-forward OOS backtest | The model genuinely LEARNS (recovers planted coefficients; beats the Δ̂=0 baseline OOS on signal; refuses to manufacture improvement on noise). Verdict uses a pre-registered τ and a hard 100-bet minimum-sample floor. | Any real edge yet — **gated on line-movement data** |
| `data-ingestion/odds-api-client.ts::getHistoricalOdds` | Historical odds snapshot fetch (10× cost) | The plumbing to reconstruct opening→closing movement | — |
| `data-ingestion/sleeper-client.ts` | Read-only Sleeper NFL fantasy facts adapter | A free, keyless source of real weekly box-score + trending signal | Not wired to any cron; rights-gated before any live use |

**Test posture:** every module above is pure (no I/O, no clock, no RNG) and unit-tested.
Engine suite: **613 tests green, typecheck 0 errors** as of this writing.

---

## The honest map of the edge search

1. **Projections** — searched, **no edge** with available features (beats nothing; r≈0.006). → SHADOW.
2. **Closing line** — searched 27 seasons, **no free edge** (0/16, FDR-controlled). → the hardest bar, unbeaten.
3. **CLV (opening→closing movement)** — **the one open question.** Two harnesses are built and
   tested and will answer it the instant real line-movement data exists:
   - `clv-feasibility.ts` — does any pre-registered *rule* (bet home / dog / under / …) earn
     positive CLV, FDR-controlled?
   - `closing-line-forecaster.ts` — can a *model* predict the close well enough to fire only on
     favorable movement, beating lock-now OOS and clearing ≥52.4% at adequate sample?

   Honest caveat (Charter): the closing line is the most efficient public predictor there is.
   The edge may be thin or zero — and **finding that out with proof is the win.**

---

## The ONE thing that unblocks the proof engine

Both CLV harnesses need real opening→closing line-movement data. That requires
`THE_ODDS_API_KEY` (the **paid** plan — the historical endpoint is not on the free tier)
set as an **environment variable in the cloud workspace** (not local settings.json, which
only reaches a Claude running on your own machine). Then, in a fresh session:

```bash
# 1) Is there a free rule that beats the close? (~920 credits for 2023 wks 1–4, one-time, cached)
THE_ODDS_API_KEY=… npx tsx scripts/backtest/clv-feasibility.ts --season 2023 --weeks 1,2,3,4 --yes

# 2) Can the forecaster beat lock-now OOS? (run on a line-movement sample export)
npx tsx scripts/backtest/clv-forecaster-backtest.ts --samples <export.json> --tau 0.5
#    …or watch the full pipeline today on clearly-labeled synthetic data:
npx tsx scripts/backtest/clv-forecaster-backtest.ts --demo
```

Either way the output is a keystone-shaped report with an explicit verdict. A proven
"no edge here" shelves the model and publishes the null — that is a successful, honest result.

---

## Charter moves — where each stands

- **Move #1 — CLV / line-movement forecaster (highest leverage):** machinery **built + tested + shadow.** Execution gated on data.
- **Move #2 — OOS signal discovery with FDR control:** the primitives (BH-FDR + cross-night) **shipped**; the nightly-discovery worker that runs them on a candidate registry is the next build.
- **Move #3 — Qualitative Epistemic Court (Red / Blue / Judge):** not yet built; will extend the existing `agent-court.ts`, must never emit the probability, agents Brier-scored over time.

## Guardrails honored

Additive + shadow only. No publish gate flipped. No secrets in code. Never force-pushed or
rewrote main. Work lives on `keen-ptolemy` to avoid colliding with the launch session on
`stoic-dirac` (PRs #53/#54/#55); it rebases onto the engine base once those land.

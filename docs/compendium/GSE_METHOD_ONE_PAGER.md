# The GSE PRICE Method — one page

**Galaxy Sports Edge scores every matchup with a deterministic model, then proves the record.**
Pipeline: **Read the board → Score the math → Gate the slate.** Model `v5.0.0` · GSE Score `g1.0.0`.

## Five pillars — PRICE

| | Pillar | One line |
|---|---|---|
| **P** | Proof | Can we prove it after the fact, without trust? — CLV, calibration, tamper-evident receipts, pre-kickoff slate commitments. |
| **R** | Read | What does the market really believe, vig removed? — Shin de-vig + median consensus + Market Gravity Index. |
| **I** | Integrity | Is the data good enough to act on? — coverage + freshness + breadth; bootstrap→canonical gating. |
| **C** | Context | What situational signals reinforce or undercut the read? — line movement, rest, ATS/H2H/venue, schedule, uncertainty. |
| **E** | Edge | How much pricing advantage is on the table? — fair − offered → Edge Index (0-100). |

## The GSE Score (0-100)

The published **confidence** is a deterministic sum of 13 components + a baseline, clamped 0-100 — it already folds Read, Integrity, Context, and Edge. The flagship adds the one thing confidence can't: *how provably we stand behind the pick.*

```
GSE Score = round( confidence × M )          M = 0.80 + 0.20 · P  ∈ [0.80, 1.00]
P = (proof receipt ? 0.34 : 0) + (slate commitment ? 0.33 : 0) + (canonical & fresh ? 0.33 : 0)   // cap 1.0
```

Fully proven, slate-committed, canonical, fresh → **M = 1.0 → GSE Score = confidence.** Unproven/bootstrap/stale → discounted to 80%. It is a **ranking/presentation index, not a win probability.** Confidence and the Edge Index ride alongside it.

**Worked example:** confidence 78, Edge Index 64 → grade SOLID_PLAY, PREMIUM. Fully proven → **78**; receipt only → **68**; unproven → **62**.

## What's live vs. roadmap

- **Live & priced:** consensus, depth, book-edge, line movement, rest, schedule, cross-market, uncertainty (+ ATS/H2H/venue once canonical history is on).
- **Surfaced, not yet priced:** independent edge engine (Kalshi/Elo/Poisson/ML).
- **Built, gate-held:** calibrated probabilities (sample ≥100), public performance/CLV stats, affiliate ledger, content auto-publish.
- **Planned:** real-time Elite alerts.

*Source of truth: `packages/prediction-engine/src/gse-method-spec.ts`. Full detail: `docs/compendium/GSE_SYSTEM_COMPENDIUM.md`.*

*Past performance does not guarantee future results. Sports wagering is real risk; if you or someone you know has a gambling problem, call 1-800-GAMBLER.*

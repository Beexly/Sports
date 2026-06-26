# GSE Institution Architecture

**Category:** Sports Decision-State Infrastructure. **Enemy:** fake certainty.

## The thesis

Most sports-betting content is a confidence-manufacturing machine. GSE is the opposite institution: a
**proof-governed page factory** where every match, trend, bonus, prediction, stat, and market carries
— at all times — its source status, rights status, authority status, freshness, decision-use,
weakness, a receipt, and an autopsy path. The product is not a pick. The product is **the decision
state of a claim**: exactly how much it is allowed to mean, and why.

## The spine: one grammar, one authority engine

There is exactly one decision grammar (`decision-state.ts`, 14 states) and exactly one authority
engine (`authority-vector.ts` `composeAuthority`, 8 layers). Every surface maps onto them. **No
parallel systems** — every new organ is a presenter or a composer over the spine, never a competing
truth.

- **Decision grammar** — `ACTIONABLE`, `WATCHLIST`, `TOO_LATE`, `NEEDS_LIVE_DATA`, `PASS`, `TRAP`, …
  Public labels live in `apps/web/lib/decision-ui/status.ts`; internal enum names never reach a user.
- **Authority lattice** — `INFO_ONLY < WATCH < WAIT < PERSONALIZED < ACTION < PUBLIC_ACTION`. The
  permitted expression is the *meet* across eight ceilings; the lowest binds. On fixtures the
  Source-reality layer binds at `INFO_ONLY` — nothing computed offline can speak above FYI.

## The organs (this build)

| Organ | Module | Role |
|---|---|---|
| Universal Event Genome | `universal-event-genome.ts` | the structured event substrate (any sport) |
| Match-derived stats | `match-derived-stats.ts` | 20 soccer metrics, each passport-backed |
| Stat Foundry | `stat-foundry.ts` | the `StatGenome` + evidence-clamped status |
| Trend Passports | `trend-passport.ts` | fragility / overfit / correlation made visible |
| Prediction Court | `prediction-court.ts` | process graded apart from outcome |
| Bonus Integrity | `data-intelligence/bonus-passport.ts` | compliance-gated affiliate layer |
| Market Bloom | `market-bloom.ts` | the nine-stage market lifecycle |
| Authority Flight Record | `authority-flight-record.ts` | "what we were allowed to say," in plain words |
| Slip MRI | `slip-mri.ts` | accumulator risk diagnosis, never a parlay push |
| Edge Watchlist | `watchlist-alerts.ts` | retention without bet-now pressure |
| Route Authority | `route-authority-registry.ts` | per-route status + gates |
| Odds Economics | `data-intelligence/odds-api-economics.ts` | credit cost of coverage, before spend |

## The five ledgers

Every organ writes to `five-ledgers.ts`: what we knew, what we claimed, what we were allowed to claim,
what happened, and what we learned. The autopsy path is not a feature bolted on — it is the substrate.
One result never moves a model weight; learning is gated by sample + calibration.

## The proof slice (this build's deliverable)

The first visible slice is the Event Genome page — three proof cases (Ecuador 2–Germany 1, Rays
13–Royals 2, Roughriders–Argonauts) rendered two ways: a self-contained offline
`docs/gse-packet/observatory/EVENT_GENOME_PAGE.html` (Chromium-verified) and fixture-only Next routes
at `/matches/preview/*`. Both are driven by the same canonical engine, so the offline proof and the
product are the same truth.

## Hard envelope

Fixture/preview only · no merge to main · no live or paid API · no network in tests · no secrets ·
no Scores24 as a data source · no `priced=true` · no `canPublishProjections` · no public-performance
gate opened · no entitlement/point-in-time/authority/trust/brand weakening · no
`lock`/`guarantee`/`sure-thing`/`profit`/`risk-free`/`fake-AI-pick` language. The institution gates itself harder
than the law requires — that discipline *is* the moat.

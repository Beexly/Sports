# Edge Ledger

*`packages/engine/src/galileo/edge-ledger.ts` + `market-physics/edge-ledger.ts` + the Edge Immune
System (`galileo/edge-immune-system.ts`) — Inventions 9 & 11. Pure, shadow-only, fully unit-tested.*

Every candidate the engine produces enters this ledger and is bound by promotion rules that make
the prior session's lessons unforgettable. **A failed hypothesis is a result; there is no global
"no edge."**

## Statuses
`REJECTED · WATCHLIST · SHADOW_COLLECTING · SHADOW_READY · ACTIVE`

## The unforgettable promotion rules (structurally enforced)
- **No CLV-only promotion** — beating the close is a leading indicator, not proven profit.
- **No in-sample-only** and **no one-season-only** — requires out-of-sample replication (≥2, ideally 3 seasons).
- **No FDR-only without OOS**, and **no OOS without settlement** — settlement (≥52.4% on real outcomes) is required for ACTIVE.
- **No data-quality-warning promotion** — a data bug caps at WATCHLIST and forces a re-run.
- **No future-game contamination** — forces REJECTED until cleaned.
- **No publish-gate / priced / model-weight changes** — ever, from this engine.

`promote(candidate, target)` can never grant a status above what the evidence permits.

## The Edge Immune System (every candidate is attacked first)
Ten adversarial prosecutors — `Leakage · SampleSize · FDR · Settlement · CLV · Liquidity ·
Seasonality · DataQuality · Simplicity · MarketEfficiency` — each return PASS / WARNING / FAIL +
reason + required next test. **A single FAIL caps the candidate at WATCHLIST.** The
SimplicityProsecutor structurally bans bare-trend angle-mining: a candidate with no market-
incoherence basis fails.

## Candidate record (`GalileoEdgeCandidate`)
`candidate_id · discovered_by · hypothesis · structural_reason_market_may_be_wrong · market_type ·
book · line · timestamp · flesh_state_trigger · market_state_trigger · attention_state_trigger ·
incoherence_residual · absorption_half_life · book_dna_score · role_delta_score ·
alt_line_geometry_score · CLV_result · settlement_result · OOS_result · FDR_status · liquidity_note ·
data_quality_status · current_status · report_path · commit_hash`.

## Current ledger contents

**No Galileo candidate has been promoted.** The instrument is built and unit-tested on fixtures;
no live timestamped surface has been ingested yet, so no contradiction has entered the gauntlet.

For continuity, the one previously-validated signal (it lives in `prediction-engine`, not Galileo):

| candidate_id | hypothesis | CLV | settlement | OOS | FDR | data_quality | status |
|---|---|---|---|---|---|---|---|
| `rush-under-high-line` | RB rush UNDER, lines ≥70 (public over-bias on star RBs) | n/a | pass (~62%, 3 seasons) | pass | pass | clean | **SHADOW_READY** (liquidity unchecked → not ACTIVE) |

Even that candidate is held below ACTIVE: real-limit liquidity is unverified, and the overall edge
is only marginally above vig outside the high-line subset. It is tracked, not staked.

## Next ledger event
The first Galileo candidates will come from the instrument-calibration experiment (a dense
timestamped week → book-DNA lag map → stale-window/transmission residuals). Each will enter as
WATCHLIST and must survive the immune system before advancing.

# GSE Galileo / Market Reality Twin — Engine Status

*Written 2026-06-25. Additive, shadow-only. No live gate, priced flag, customer pick, or model
weight was touched. Package: `packages/engine` (`@sports/engine`). 97 tests green, typecheck
clean. This is the telescope; pointing it at live markets is a later, owner-gated step.*

We stopped building a better pick model and built an instrument that observes three entangled
states — **flesh** (players/injuries/role/script), **market** (lines/props/alt ladders/book
movement/timestamps), and **attention** (public narrative pressure) — and detects where the
books' visible belief system becomes internally inconsistent, stale, over-smoothed, or
narrative-contaminated.

## 1. What new instrument now exists?

| Invention | Module | What it is |
|---|---|---|
| 1 Galaxy Market Twin | `galileo/market-twin.ts` | A game's market as a typed graph (game/team/player/book/market/outcome/timestamp/event/role nodes + relationship edges). |
| 2 Incoherence Residual | `galileo/incoherence-residual.ts` | 8 structured residuals (expected vs observed direction, magnitude, confidence, data-quality). |
| 3 Absorption Half-Life | `galileo/absorption-half-life.ts` + `market-physics/shock-absorption.ts` | Event study: how long truth takes to travel through the market after a shock. |
| 4 Bookmaker DNA | `galileo/bookmaker-dna.ts` + `market-physics/book-dna.ts` | Per-book behavioral fingerprint (lead/lag, prop-lag, stale-window, confidence weight). |
| 5 Role Shock Topology | `galileo/role-shock-topology.ts` + `market-physics/role-state.ts` | Player role-state + role-delta + sibling-divergence candidate generation. |
| 6 Alt-Line Geometry | `galileo/alt-line-geometry.ts` + `market-physics/alt-line-curvature.ts` | Implied distribution from alt ladders; monotonicity/tail/consensus/volatility checks. |
| 7 Narrative Gravity | `galileo/narrative-gravity.ts` | Attention-pressure index + attention-vs-reality move classifier (interface; data later). |
| 8 Counterfactual Oracle | `galileo/counterfactual-line-oracle.ts` | "If reality changed X, which related markets should move?" rule-based propagation. |
| 9 Edge Immune System | `galileo/edge-immune-system.ts` | 10 named adversarial prosecutors; one FAIL caps a candidate at WATCHLIST. |
| 10 Expression Router | `galileo/expression-router.ts` | Routes to PASS…LOCK_NOW…STALE_BOOK_CANDIDATE…DATA_QUALITY_FAIL with full provenance. |
| 11 Edge Ledger | `galileo/edge-ledger.ts` + `market-physics/edge-ledger.ts` | Candidate record + the unforgettable promotion rules. |

## 2. What can it see that a normal model cannot?

A pricing model asks "what is the fair number?" and competes with the closing line (which the
prior session proved is efficient). This instrument asks a different question: **"is the book's
own belief system self-consistent right now, and if reality just changed, did every market that
should have moved actually move?"** It sees the *relationships between markets and over time* —
the implied team totals behind a spread/total, the conservation between a QB line and his
receivers, the lag between a consensus move and a slow book, the geometry of an alt ladder, the
gap between a line move and the flesh-state change that would justify it. Those are invisible on
a single book's screen.

## 3. What contradictions can it detect?

- **Algebraic:** team totals that don't reconcile with spread+total.
- **Conservation:** receiver yardage that can't fit the QB's passing line; receptions stale while
  the QB line moved.
- **Transmission:** the game total moved but specific player props didn't.
- **Geometry:** alt ladders that violate monotonicity, go non-unimodal, or price a tail far from
  their own / the consensus curve.
- **Latency:** a book left off-market after consensus already moved (the consensus-moved-first
  rule — never uses future data).
- **Role:** a prop still priced to a pre-shock role (backup inheriting work, WR2 after WR1 out,
  RB carries after losing favorite status, QB scrambles behind a hurt OL).
- **Attention:** a line move larger than the flesh-state change justifies (over-correction).

## 4. What evidence would convert a contradiction into a tradable edge?

A contradiction is a *hypothesis*, not an edge. The Edge Immune System + Ledger require, in order:
a **structural reason** the market is wrong (not a bare trend); survival of **FDR**; **out-of-sample
replication** across ≥2 (ideally 3) seasons; a positive **settlement** result (≥52.4% on real
outcomes, not just CLV); a **liquidity** check at usable limits; and **clean data**. CLV-only,
in-sample-only, one-season-only, settlement-negative, data-quality-flagged, and future-contaminated
candidates **cannot** be promoted to ACTIVE — structurally.

## 5. What remains shadow-only?

Everything. No candidate has run the live gauntlet yet — the instrument is built and unit-tested
on fixtures, not yet fed a season of real timestamped surfaces. The one previously-validated edge
(rushing-yards UNDER, 3-season) lives in `prediction-engine`, not here, and is itself only a
shadow candidate. Nothing in Galileo emits a pick or touches a gate.

## 6. What data sources are still missing?

- **Timestamped multi-snapshot odds** across the week (not just open/close) for book-DNA, absorption
  half-life, and transmission residuals — available from the paid Odds API historical endpoint
  (dense pulls), but a real spend decision.
- **Player-prop alt ladders** historically (event-odds endpoint) for alt-line geometry.
- **Flesh-state feeds:** injury/practice/inactive timestamps, snap/route/target shares, depth charts,
  weather — needed to drive role-state and shock studies on real games.
- **Attention feeds:** news/social/fantasy signals for Narrative Gravity (interface only today).

## 7. What exact experiment should run next?

**Instrument-calibration, not edge-hunting.** Pull a dense timestamped snapshot series (≈ every
15–20 min in the final 6 hours) for one NFL week's slate, build the twin per game, and measure the
**book-DNA lead/lag distribution** and the **absorption half-life** of the week's largest line
moves. Deliverable: an empirical map of which books lag which market types and for how long — the
factual precondition for "can a stale book be caught before it corrects." No bet, no gate; ~one
week's historical credits, justified because it calibrates the whole instrument. Only after the
lag map exists do specific stale-window / transmission candidates enter the ledger.

## Guardrails honored

Additive + shadow only. No global "no edge" — only "this hypothesis failed / this market appears
efficient under tested conditions / this data is insufficient / CLV-only / needs shadow tracking."
No publish-gate changes, no priced flags, no model weights, no paid calls made. Built on
`claude/keen-ptolemy-t38f1g`.

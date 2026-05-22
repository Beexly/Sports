# Edge Lab Expansion — Specification

**Status:** Phase 4 build. Expands the existing `/tools` Edge Lab.
**Owner of code:** Codex.
**Owner of tool descriptions + voice:** Claude.
**Location:** `apps/web/app/tools/`, individual tool components.
**Decision reference:** master plan Part 2.E (Edge Lab tool expansion).

---

## TL;DR

The Edge Lab is Galaxy's free public utility surface — calculators and tools every sports bettor should have access to. Phase 4 expands from the existing vig check + odds translator to a full suite of analytical tools.

These are FREE for all users. The math is public. The tools have no engine integration (they don't read picks or signals — they're pure calculators on user input). The Edge Lab is Galaxy's contribution to the public-good layer of sports betting literacy.

---

## Existing tools (already shipped, Phase 4 leaves alone)

- **Vig check** — strip the juice from a line to see the no-vig price.
- **Odds translator** — convert American / Decimal / Fractional / Implied Probability.
- **(Parlay calculator)** — planned per memory; may already be in flight.

Phase 4 does not modify these. It adds new tools.

---

## New tools (Phase 4 ships all)

### 1. Kelly Criterion Sizer

Inputs:
- Your bankroll ($).
- Your estimated win probability (%).
- The American odds offered.
- Kelly fraction multiplier (default 0.25 for quarter-Kelly).

Outputs:
- Full Kelly bet size ($).
- Fractional Kelly bet size (multiplier applied).
- Expected long-run growth rate.
- Variance warning when full Kelly would risk > 10% of bankroll on one bet.

Educational copy:
- Quick explainer of what Kelly is and why fractional Kelly is industry standard.
- Link to methodology page for the model's perspective on bet sizing.

**Important:** This tool does NOT use Galaxy's published confidence numbers. It uses the user's own probability estimate. The tool exists to help users compute their own Kelly, not to publish a Kelly recommendation from the model.

### 2. Hedge Calculator

Inputs:
- Original bet (American odds + stake).
- Current opposing line (American odds).

Outputs:
- Hedge amount to guarantee a specific profit (slider for the profit target).
- Hedge amount to break even.
- Hedge amount to lock in equal profit either way.
- Net result table across all three strategies.

Educational copy:
- Brief explainer of hedging vs riding the original bet.
- Note: this is math, not advice. Hedging often costs EV on average; the tool surfaces the trade-off.

### 3. Closing Line Value (CLV) Tracker

Single best predictor of long-term profitability in sports betting.

Inputs:
- A pasted or imported list of placed bets, each with: closing line, line at time-of-bet, side.

Outputs:
- Per-bet CLV (in cents and percentage).
- Aggregate CLV over the sample.
- Trend chart over time.

Storage: Pro+ tier optionally persists CLV records to `BetTracker` (existing surface). FREE tier uses the tool as a session-only calculator.

### 4. Arbitrage Finder

Inputs:
- A list of currently-offered lines across multiple books for the same event.

Outputs:
- Arbitrage opportunities (when sum of implied probabilities < 100%).
- Stake split to guarantee profit.
- Guaranteed profit % at the given stake.

Notes:
- Tool surfaces opportunities; it does not auto-place bets.
- Compliance: tool explicitly notes that books may limit / void winning arbs and that this is well-known.

### 5. Middling Opportunity Scanner

Inputs:
- A list of currently-offered lines across multiple books with sufficient line variation.

Outputs:
- Middle opportunities (where two lines are different enough that both could win).
- Probability of hitting the middle (rough estimate based on historical line-distribution).
- Maximum payout vs maximum loss.

### 6. Same-Game Parlay (SGP) Correlation Matrix

Inputs:
- A list of legs in a same-game parlay.

Outputs:
- Pairwise correlation estimate for each pair of legs (based on the model's per-game signals when available, otherwise empirical defaults).
- Adjusted implied probability of the SGP (vs naive multiplication).
- Color-coded heatmap showing positive/negative correlations.

Notes:
- For SGPs on games tracked by Galaxy, the matrix pulls from `GameSignal` correlations.
- For untracked games, the matrix uses default sport-level correlations from a static table.

### 7. Live Game Simulator (Monte Carlo)

Inputs:
- Game state (current score, time remaining).
- Possession / down / pace data.
- Win probability model (default = simple ELO-adjusted by score differential).

Outputs:
- 10,000 simulated game completions.
- Win probability for both sides.
- Distribution of final scores.
- Visualization of probability over the remaining game time.

Notes:
- Tool runs entirely in-browser. No server round-trip per simulation.
- Phase 5 may add sport-specific Monte Carlo modules (NBA, NFL, NHL).

### 8. Backtesting (Pro+)

Inputs:
- A filter expression (Pro+ users can write it free-form; Elite users get the DSL from Phase 5).
- A historical date range.

Outputs:
- All settled picks matching the filter in the date range.
- Hypothetical performance if user had followed every matching pick.
- Per-confidence-band breakdown.

Notes:
- Backtesting is **historical aggregate, not future prediction**.
- Tool surfaces explicitly: "Past performance does not predict future returns."
- No aggregate win-rate marketing claims emerge from backtesting — the surface is for user research only.

### 9. Bankroll Tracker / Paper Trading

Inputs (optional account-linked):
- Starting bankroll.
- Bet sizing strategy.
- Manually-entered bet log OR import from a connected sportsbook.

Outputs:
- Running bankroll chart.
- ROI per pick type / sport / book.
- Paper trading mode (track without real money).

Storage: linked to user account if Pro+; session-only for FREE.

---

## Voice rules for tool descriptions

Every tool's intro copy follows the same voice:

**Pass:**

- *"Kelly Criterion is a bankroll-management formula that maximizes long-run growth given a true probability estimate. Below is the calculator. The math is on the methodology page."*

**Fail:**

- *"Discover how Kelly sizing can transform your betting!"*
- *"Pro bettors swear by Kelly — find out why."*
- *"Master your bankroll with this powerful tool."*

The Edge Lab is utility, not infomercial.

---

## Trust gates + brand-safety

- All tools are FREE. No tier gating except backtesting and bankroll-tracker persistence.
- None of the tools surface Galaxy's published confidence as a Kelly input or expected-value claim. The tools work on user input.
- The tools do not auto-execute trades. They calculate, then the user decides.
- The compliance scanner runs on all tool descriptions + output text. Hard refuse on banned vocabulary.

---

## Acceptance criteria (Phase 4 Edge Lab expansion → green)

1. All 9 new tools shipped.
2. Tool descriptions pass the brand-safety scan.
3. Tools function correctly on a representative input set per tool's spec.
4. Pro+ tier features (CLV persistence, backtesting, bankroll persistence) gate correctly.
5. No tool produces a recommendation — all output is calculation given user inputs.
6. Mobile layout works for each tool at 390px.
7. Backtesting clearly labels output as historical-only.
8. CLV tracker integrates with existing BetTracker for Pro+ persistence.

When all 8 hold, Edge Lab expansion is complete.

---

## Open items

- **OPEN-LAB-1:** Should the Edge Lab tools be hashable via URL parameters (so users can share a specific Kelly calc with friends)? Default: yes, all tools accept URL params for shareable state. Codex confirms.
- **OPEN-LAB-2:** Should backtesting use the DSL from Phase 5 as the filter language, or a simpler form-based filter? Default: form-based filter in Phase 4; DSL replaces it in Phase 5 for Elite tier.
- **OPEN-LAB-3:** Should the Live Game Simulator have a "Monte Carlo against the model's signals" variant for tracked games (using GameSignal data)? Default: yes, optional, Phase 5+ — Phase 4 ships the static Monte Carlo first.

---

*Spec authored by Claude. Codex implements. Edge Lab is utility, not infomercial. Math is public.*

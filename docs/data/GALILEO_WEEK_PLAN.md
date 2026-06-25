# Galileo Week — one real NFL week, owner-gated

*Package: `@sports/galileo-week`. Builds the full eight-atlas Week Intelligence structure and prices the
acquisition budget — everything except the paid call. Live execution is owner-gated on spend + keys.*

## What it produces — eight atlases

One week, run through `data-intelligence → decision-factory`, yields:

1. **Source Race** — who saw each important fact first; who lagged.
2. **Market Absorption** — how fast books/props absorbed truth (observer count, velocity, book lag).
3. **Fantasy Absorption** — how far fantasy belief lagged football reality.
4. **Decision Card** — what cards a user would have seen, by state.
5. **Scar** — which traps we filed as ghosts; which sound losses we did *not* overreact to.
6. **Intelligence Delta** — did we get smarter? (the FDR-disciplined Intelligence Ledger).
7. **Missed Observation** — what we lacked that capped a decision → **what to buy**.
8. **Over Observation** — facts that changed nothing → **what to stop buying**.

Then the **public moment**: *"GSE checked N market observers, M fantasy signals, K injury sources —
here are the X reads that mattered."*

## What is real (now, fixture-safe)

- The whole eight-atlas structure builds over deterministic fixtures (`runGalileoWeek({ mode:
  "PREVIEW_FIXTURES", ... })`). No network, no keys.
- `planGalileoWeek(candidates, monthlyBudget)` — the **`--plan` dry-run** — reuses the mesh's
  `planApiBudget`: free sources first, paid within budget, forbidden/`DO_NOT_USE` never purchased,
  everything deferred reported with a reason. **It spends nothing.**

## What is blocked / owner-gated

- **`runGalileoWeek({ mode: "LIVE" })` THROWS.** This package holds no keys and makes no network calls;
  live execution is a separate owner-gated integration that must supply approved keys *after* the
  dry-run. Owner approval alone is not sufficient inside a fixture-safe package — by design.
- No spend, no key, no call happens here.

## Source recommendation (priced by the dry-run; owner approves to buy)

Observer triangulation, not vendor collection:
- **Free first:** deepen **nflverse**, wire **Sleeper** trending.
- **Dual market observers:** **The Odds API + SportsGameOdds** so book-lag is real, not a provider
  artifact.
- **First paid fantasy/DFS evaluation:** **FantasyData** (or SportsDataIO).
- **Forbidden:** DraftKings-unofficial (`DO_NOT_USE`) — the dry-run refuses to price it.

At a $300/mo preview the planner takes the two free feeds + The Odds API + SportsGameOdds, defers
FantasyData (over budget) and DraftKings-unofficial (forbidden) — all reported.

## What the tests prove

`npx vitest run packages/galileo-week` (8 tests): the dry-run spends nothing and allocates correctly;
PREVIEW builds all eight atlases with the public moment; the scar atlas files a `process_error` trap
and holds an `unlucky_loss`; the intelligence delta survives FDR; missed/over observation guide
acquisition; **LIVE fails closed.**

## What must NOT be claimed publicly

- That Galileo Week has run on live data (it has not — keys/spend are owner-gated).
- Any week atlas as a live result; the preview is illustrative.

# NFL Stat Universe — the hunger system

*Package: `@sports/nfl-stat-universe`. Every NFL number is ingested, derived, disputed, priced, or marked
missing — nothing floats. A manifest + legal policy + planner. No network, no keys, no ingestion.*

## The contract, not the encyclopedia

Each `NflStatDefinition` declares: its `category` (one of 28 `StatCategory`), its `factTypes`, **how it
can be known legally** (`legalSourceOptions: SourcePath[]`), whether GSE can derive it (`derivableByGSE`
+ `requiredInputs`), the **strongest public action its evidence can ever license**
(`maxAuthority: StatAuthorityLevel`), and which surfaces go dark without it (`blockedSurfacesIfMissing`).

## Legal discipline (aligned with the canonical clearance engine)

The source registry's forbidden lanes match `apps/web/lib/scraping/source-rights-registry.ts`:
DraftKings-unofficial → `DO_NOT_USE`; PFR/OddsPortal scraping → `RIGHTS_REVIEW`. A **forbidden source can
never satisfy a production stat** (audit C); the compiler refuses it (`stat-compiler.ts`).

## The A–J invariants (all tested, 13 tests)

A every stat reachable (source or derivation) · B every path legally classified · C forbidden sources
can't back production · D paid-only stats flagged for acquisition · E derived stats list inputs · F role
stats need a usage input to go public · G DFS action needs a licensed salary/slate feed · H market-lag
needs timestamped book snapshots · I fantasy-lag needs a fantasy snapshot · J the compiler fails closed
on future leakage (reuses `knowableAt`). The guards are proven to **bite** on bad input, not just pass on
the happy path.

## Source recommendation (honest, owner-gated)

- **Deepen nflverse** (free historical base) — never replace.
- **Sleeper trending** as the free fantasy crowd clock.
- **The Odds API + SportsGameOdds** — dual market observers so book-lag is real, not a provider artifact.
- **FantasyData or SportsDataIO** — first paid fantasy/DFS evaluation (PAID_REQUIRED; owner-gated).
- **Yahoo OAuth** — consented user data only.
- **Enterprise (Sportradar / PFF / Stats Perform)** — dossiers, not dependencies.
- Scrapers default `RIGHTS_REVIEW` / `DO_NOT_USE`.

Provider portfolios (`provider-portfolio.ts`) are **plans, never purchases** — `Bootstrap Free` is
ungated; every spending tier is owner-gated.

## What is NOT done

- No adapter is wired; nothing is ingested. The manifest is representative (≥1 stat per category), not
  exhaustive — expanding coverage per family is a P3 cleanup. Acquisition is Phase 3 (owner-gated).

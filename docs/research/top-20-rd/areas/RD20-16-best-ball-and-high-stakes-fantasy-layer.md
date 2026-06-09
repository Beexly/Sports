# RD20-16: Best Ball and High-Stakes Fantasy Layer

Status: R&D handoff
Priority: P2
Horizon: Expansion
Owner mode: Fantasy product

## Strategic Thesis

Best-ball and high-stakes fantasy create an offseason and draft-season wedge. GSE should understand format rules, roster construction, ADP movement, playoff weeks, fragility and exposure.

## Why This Matters Now

NFL engagement is not limited to weekly picks. Best ball creates spring/summer retention and high-intent users before the season.

## Competitor Pressure

FFPC, NFFC, Drafters, Underdog and FantasyPros shape user expectations around drafts, ADP, exposures and premium draft tools.

## Current Repo Anchors

- docs/research/gse-competitor-platform-watchlist.md
- docs/brain/fantasy-war-room.md

## External Sources

- [FFPC best ball dynasty rules](https://myffpc.com/cms/public/play/best-ball-dynasty-leagues-official-rules) - High-stakes season-long and best-ball format reference.
- [NFFC rules](https://nfc.shgn.com/rules/2680) - High-stakes fantasy championship rules and prize ladder reference.
- [Drafters](https://drafters.com/) - Best-ball draft platform reference.
- [Underdog best ball guidelines](https://help.underdogfantasy.com/en/articles/8991638-best-ball-contest-guidelines) - Best-ball contest mechanics and mobile-first product framing.
- [FantasyPros premium plans](https://www.fantasypros.com/premium/plans/) - Consensus rankings, league sync, draft and DFS premium pattern.

## Product Surfaces

- Best-ball draft board
- ADP movement tracker
- roster construction score
- playoff-week leverage card
- portfolio exposure dashboard

## Data Inputs

- public rules
- user-uploaded draft/export
- ADP if licensed or user-provided
- schedule
- player projections
- injury/role signals

## R&D Questions

- Which formats are first-class?
- What can be imported legally?
- How do we model roster construction without copying platforms?
- What is free vs Elite?

## MVP Plan

1. Format registry for FFPC/NFFC/Drafters/Underdog-style rules
2. user upload spec
3. roster construction heuristic docs
4. draft-season content calendar

## V1 Plan

1. Best-ball roster analyzer from user upload
2. format-aware player cards
3. ADP movement watch if legal
4. playoff-week schedule lens

## V2 / Moat Plan

1. Portfolio exposure optimizer
2. draft room assistant from user export
3. season-long transition dashboard
4. high-stakes private league planning

## Claude Build Tasks

1. RD20-16-01: Create FantasyFormatRegistry docs
2. RD20-16-02: Define BestBallRoster and Exposure types
3. RD20-16-03: Draft user-upload import guardrails
4. RD20-16-04: Specify roster construction scoring
5. RD20-16-05: Create playoff-week leverage card spec

## Acceptance Criteria

- Rules sources are public and attributed
- No private draft room scraping
- User imports are opt-in
- Format assumptions are visible

## Risk Register

- Platform ToS risk
- ADP data rights
- format mismatch
- offseason scope creep

## Metrics To Track

- draft-season active users
- uploads imported
- roster analyzer completions
- best-ball-to-season retention

## Handoff Note

Claude should implement this area in docs/spec form first unless the task card explicitly calls for code. Production code changes require source, entitlement, brand-safety and test gates to be named before editing.

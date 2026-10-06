# Wave 3 — prior work filed (no rework)

Research already completed 2026-09-27/28; filed here so it sits with the sweep, per corpus rule.

## carter-tyra/AIntelligent-Oddz
Full-stack sports-prediction skeleton (Next.js + FastAPI, 107KB, pushed 2024-12-11, 0★, **no license**).
Every backend file is a stub (`def predict(self, data): pass` — nfl_predictor, ESPN collector, odds service, feature engineering all empty).
**Verdict: architecture-only** — dashboard page structure and odds-comparison service shape are worth a glance; no method value; no code reuse (unlicensed).

## Follow-up teardowns (flagged, not done)

| Repo | Why flagged | Status |
|---|---|---|
| carter-tyra/pgatour-ai (pushed 2026-06-10) | Betting dashboard, more recent/active than AIntelligent-Oddz | Not torn down |
| carter-tyra/pga-tour-ai-betting-dashboard | PGA Tour AI betting predictions | Not torn down |
| carter-tyra/soc-triage-agent (pushed 2026-04-30) | Cybersecurity agent — adjacent to agent-fleet work | Not torn down |
| carter-tyra/sauce | shadcn UI component distribution platform | Not torn down |

## Registry packages search — dead end
`github.com/search?q=NFL&type=registrypackages` returns 52 results that are anonymous container images
(dev, sha-*, latest) with no identifiable package names. No API exists for global package search.
Recommendation: use repo search (`topic:nfl`) instead — covered in Wave 1.

## Top-star NFL repos (surfaced 2026-09-28, pre-sweep)
Already noted by parent before this sweep:
- **nflverse/nflfastR** (546★), **nflverse/nfl_data_py** (440★), **nflverse/nflreadpy** (223★) — canonical nflverse loaders.
- **DimaKudosh/pydfs-lineup-optimizer** (449★) — DFS optimizer; benchmark candidate against `apps/web/lib/fantasy/`.
- **BenBrostoff/draftfast** (299★) — DK lineup automation tooling.
- **agentscope-ai/DojoZero** (49★) — AI agents on realtime sports data making predictions; teardown candidate for method comparison.

## New additions from this sweep's Waves 1–2 to consider for future teardowns
- **ryanpmcintire/nfl_py3** — market-updated model + agentless experiment pipeline (MIT).
- **chmoses98/nfl-edge-finder** — joint parlay engine; comparison points for our payout-sim correlation layer (no license — method only).
- **mtsilverstein/Megatron** — quantile transformer fantasy projections (no license — method only).
- **sportsdataverse/nfl-ngs-raw** — NGS scrape pipeline shape (no license — method only).

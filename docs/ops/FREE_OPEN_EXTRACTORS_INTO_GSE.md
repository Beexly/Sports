# Free open extractors → GSE (not a dual FastAPI stack)

**Date:** 2026-08-10  
**Decision:** Integrate free open sports data **into the existing Node monorepo**  
independent path. Do **not** stand up a parallel Python FastAPI + Supabase +  
Windows Task Scheduler pipeline.

## Why not the FastAPI / pybaseball / PowerShell architecture

| Proposal | GSE reality |
|---|---|
| Separate Postgres / Supabase | Already on Prisma + production Postgres |
| FastAPI + MCP OpenAPI bridge | Agents already hit GSE ops/cron APIs; dual serving layer splits truth |
| Windows Scheduled Task `ingest.py` | Production is Vercel crons + Node workers — founder laptop is not the spine |
| pybaseball / sportsdataverse-py live scrape in product path | Licensing + rate + runtime risk; prefer official free JSON / nflverse GitHub releases already in Node |
| New MODEL_VERSION inventing λ from scrapes | Forbidden — soft-fail null only |

## What we wired (v5.2.3)

| Free source | Path | Independent source tag | Role |
|---|---|---|---|
| **MLB Stats API** standings | `mlb-statsapi-client.ts` + `standings-strength.ts` | `mlb_standings` | Win% logistic fair P (summer Brier lever) |
| **MLB Stats API** finals | same client | densify input | Completed scores (facts) for TeamGameLog match |
| **nflverse EPA** (already ingested) | `TeamGameEfficiency` → `nfl-epa-fair-value.ts` | `nfl_epa_adj` | Opponent-adj EPA → ML fair when rows exist |
| **ESPN public odds** | `espn-odds-client.ts` | market path only | Tertiary free odds (not independent) |
| nflverse catalog | already | not yet all in blend | PBP/NGS catalog + efficiency ingest |

## Still not PROVEN

- PERFORMANCE_STATS / maps / AUTO_PUBLISH remain OFF  
- Brier still needs RES lift on settled sample — new sources help **future** and  
  re-scored independents; they do not invent green streak  
- After deploy: re-run `backfill-independent-trueprob` + `calibration-metrics`

## Explicit non-goals this turn

- No `pip install` product path  
- No CFBD key requirement  
- No Kloppy tracking in product  
- No second database  

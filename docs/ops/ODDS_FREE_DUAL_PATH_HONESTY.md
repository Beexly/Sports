# Odds free dual-path honesty (7 mustSpend gaps)

**Status:** ACCEPTED ARCHITECTURE — not a live outage  
**Updated:** 2026-08-08 (live re-verify)  
**Code:** `apps/web/lib/ops/free-spine-odds-path.ts`, `apps/web/lib/data-sources/source-router.ts`,  
`packages/data-ingestion` (`therundown-client`, `odds-slate-fetch`, `odds-provider-adapter`),  
`packages/ingestion-pipeline` (`process-sport`, `refresh-odds`)

## Law

| Do | Do not |
|----|--------|
| Document gaps | Invent free lines |
| Spend The Odds API where mustSpend | Claim free dual-path closed |
| Use TheRundown as **failover only** | Treat TheRundown key as free dual-path clear |
| Keep Live Board refuse-default | Fire Live Board on backup-only slate |

## Live production (2026-08-08)

From `GET /api/ops/public-surface-truth` → `freeSpine`:

| Field | Value |
|-------|-------|
| criticalGaps | **7** |
| requireSpend | **7** |
| freeCovered | **59** |
| paidSinglePath | **true** |
| primaryOddsSource | the-odds-api |
| freeOddsCandidatesGated | true |
| sportsWithGames | 7 / 7 probed |
| withinSla | true (age ~12m) |

`criticalGaps === requireSpend === 7` → pure paid single-path. **No free multi-source dual-path.**

## The 7 mustSpend cells

Every `odds × sport` cell with only paid The Odds API cleared:

| # | Sport key (Odds API) | Free cleared odds? | mustSpend |
|---|----------------------|--------------------|-----------|
| 1 | americanfootball_nfl | No | Yes |
| 2 | americanfootball_ncaaf | No | Yes |
| 3 | basketball_nba | No | Yes |
| 4 | basketball_ncaab | No | Yes |
| 5 | baseball_mlb | No | Yes |
| 6 | icehockey_nhl | No | Yes |
| 7 | soccer_usa_mls | No | Yes |

## What is NOT a fix

- Inventing lines or synthetic free odds  
- Emptying `THE_ODDS_API_KEY` to force free settlement while still wanting paid path  
- Claiming free dual-path closed because TheRundown key exists  
- Using Free-tier TheRundown for Live Board FIRE alone  
- Treating freeCovered=59 as dual-path closed (those are non-odds free cells)

## What IS wired

| Layer | Behavior |
|-------|----------|
| Catalog | Free odds candidates gated (`cleared: false`) |
| Primary | `THE_ODDS_API_KEY` → The Odds API |
| Backup | `THERUNDOWN_API_KEY` → full-slate failover on primary hard-fail; not dual-path clear |
| Live Board | Certifiable only on primary path |
| Settlement | PRESENT Odds key → odds-api path (free-path ABSENT-only law) |
| free-spine-odds-path | Reports paidSinglePath + backup presence without inventing dual-path |
| Founder queue | Skips dual-path nag when gaps are pure mustSpend (accepted architecture) |

## Free candidates (gated until rights / counsel)

Polymarket Gamma · Kalshi · TheRundown (catalog clear) · Big Balls · Sports Game Data  

TheRundown as **failover backup** is operational when key set; as **free dual-path clear** needs registry + counsel.

## Operator verification

```bash
curl -s https://www.galaxysportsedge.com/api/ops/public-surface-truth | jq '.freeSpine.oddsPath'
```

Expect: `paidSinglePath: true`, `freeOddsCandidatesGated: true`, criticalGaps=7 — **not** free dual-path clear.

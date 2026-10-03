# FULL REPO AUDIT — Beexly/Sports (Galaxy Sports Edge)

**Date:** 2026-07-29 (re-audit after multi-source + agent prime)  
**MAIN:** `5ccc855`  
**Repo:** https://github.com/Beexly/Sports  
**Standard:** world-class production OS · refuse-default · no soft language  

---

## 0. Executive verdict

| Dimension | Grade | One line |
|-----------|-------|----------|
| Architecture depth | **A** | Real monorepo company codebase |
| Operator OS (`/cockpit` + JARVIS) | **A−** | Built, draft-governed, multi-cron |
| Free multi-source data | **A−** | Critical need×sport dual+ **0 gaps** |
| Prediction / quote / settle science | **A−** | prediction-engine 389 TS + quote-plane |
| Law / refuse-default / anti-CPA | **A** | In code + CI guards |
| Agent prime (draft-ready) | **B+** | 15 DRAFT_ONLY Agent OS; externalActions NONE |
| Production proof (Neon) | **C / fail** | Still unproven dual URLs |
| Doc discipline | **C+** | Root cleaned to 8 MD; handoff/docs still large |
| Observability / workers | **D** | Policies built, mostly unwired |
| Public surface sprawl | **B−** | 221 pages under gates |
| **Overall** | **B+ (ops C)** | Elite skeleton; Production Neon is the choke |

**One sentence:** World-class **code and free multi-source design**; still cosplay until **Neon + CRON_SECRET** prove live rows.

---

## 1. Scale (measured @ 5ccc855)

| Metric | Count |
|--------|------:|
| Source-ish files (ts/tsx/md/prisma) | ~4,038 |
| TypeScript `.ts` | ~2,470 |
| TSX | ~477 |
| Markdown | ~1,089 |
| Root `*.md` (post-archive) | **8** |
| `docs/**/*.md` | ~735 |
| `docs/ops/archive/**` | ~90 |
| `handoff/**` | ~220 |
| Pages | **221** |
| API routes | **162** |
| Cockpit pages | **34** |
| Cron routes / scheduled | 18 / **13** |
| Packages | **20** |
| Prisma models | **98** |
| Integrity systems | **38** |
| Platform sources | **24** (15 cleared) |

---

## 2. What is excellent (do not undervalue)

1. **Free multi-source bar:** critical need×sport dual+ = **49**, single = **0**, none = **0**  
2. **Free odds dual:** Polymarket Gamma + Kalshi (`oddsApiRequired=false`, mustSpend=false)  
3. **Score failovers:** NCAA henrygd · MLB Stats API · NBA BALLDONTLIE · NHL web API  
4. **Free settle + free score persist** without Odds key  
5. **Integrity ledger** BUILT/WIRED/PROVEN/PUBLIC_SAFE taxonomy  
6. **Sealed AI control plane** (LiteLLM optional, not SoT)  
7. **AI Council DESTROY + guardrails chain**  
8. **Partner-stack CPA forever blocked**  
9. **Agent OS 15 DRAFT_ONLY** primed (media/growth/ledger/chain) — still no external autonomy  
10. **prediction-engine** density + formal TLA+ receipts  
11. **Cockpit** 34 pages + world-class readiness API  
12. **CANONICAL.md** single ops pointer  

---

## 3. Integrity scoreboard (38)

| Stage | YES | PARTIAL | NO |
|-------|----:|--------:|---:|
| Built | 33 | 4 | 1 |
| Wired | 13 | 6 | **19** |
| Proven | 25 | 7 | 6 |
| Public-safe | **6** | 8 | **24** |

### Ops-blocking non-green
| id | Issue |
|----|--------|
| `db-neon-sor` | PROVEN PARTIAL · lastVerifiedAt null |
| `free-settlement-path` / `free-first-data` | Code YES · Production smoke NO |
| `workers-ingestion` | Unproven vs Vercel crons |
| `obs-tracing` / `obs-alerts` | Vacuum |
| Many model-* engines | Built, unwired (correct for public) |

---

## 4. Agents / capabilities honesty

### Agent OS
| Status | n |
|--------|--:|
| DRAFT_ONLY | **15** |
| NOT_WIRED | 8 (prism, ascend, archive, relay, pilot, echo + tooling blocks) |
| MANUAL | 3 (meter, audit, …) |
| REAL/PARTIAL | 3 labels |

**externalActions: NONE** · **ACTIVE autonomous: 0**

### Capability registry (16)
DRAFT_ONLY 7 · MANUAL 2 · DESIGNED 2 · NOT_WIRED 5 · **ACTIVE 0**

### Council (23)
DRAFT_ONLY 7 · MANUAL 3 · NOT_WIRED 13 (DELTA draft-honest on CLV)

### Cockpit six
JARVIS · SARAH · TAL · SCOUT · AVA · BOBBY — all draft-only

---

## 5. Data redundancy (world-class check)

| Sport | Live score chain |
|-------|------------------|
| nfl | ESPN (+ nflverse stats dual) |
| ncaaf/ncaab | ESPN + henrygd |
| nba | ESPN + BALLDONTLIE |
| mlb | ESPN + MLB Stats API |
| nhl | ESPN + NHL web API |
| mls | ESPN (single live board — stats dual elsewhere) |

**Odds free dual:** gamma + kalshi  
**Weather dual:** Open-Meteo family  
**Critical gaps (<2 cleared):** **0**

API: `GET /api/cockpit/world-class-readiness`  
Code: `redundancyGaps(2)`, `multi-source-scores.ts`

---

## 6. Runtime automation (13 Vercel crons)

gamma + refresh-odds */30 · settle-picks (free path) · jarvis-snapshot hourly · hydrate · drafts · formal-receipt · AI recovery · entitlements · prune · checkout repair · settlement alerts · player-stats  

**Requires:** CRON_SECRET + real DATABASE_URL.

---

## 7. Packages (judgment)

| Package | Role | Grade |
|---------|------|-------|
| prediction-engine (~389 TS) | Moat science | A |
| quote-plane | Free odds + methodTag CLV | A− |
| ingestion-pipeline | settleSport + durability | A− |
| data-ingestion | Odds + failover + nflverse | A− |
| stats-api | Own catalog / hydration | B+ |
| governed/crypto | Receipts | B+ |
| ai-council | Claim destruction CI | A |
| partner-stack | CPA hard block | A |
| workers/* | Thin / unproven | C |
| phase-c | Unverified harness | CODE_READY only |

---

## 8. What is still bad / embarrassing

| # | Issue | Severity | Agent vs founder |
|---|--------|----------|------------------|
| 1 | **Neon not PROVEN** | CRITICAL | Founder |
| 2 | **handoff/ + docs/ still huge** (~220+735 MD) | HIGH | Agent (archive more) |
| 3 | **19 integrity WIRED=NO** | HIGH | Selective wire |
| 4 | **221 pages cosplay risk** | HIGH | Honesty discipline |
| 5 | **Obs vacuum** | MEDIUM | Wire Sentry free |
| 6 | **NFL/MLS live score single adapter** | MEDIUM | Add dual if legal free |
| 7 | **Workers unproven** | MEDIUM | Later |
| 8 | **Council still 13 NOT_WIRED** | LOW | Correct for blocked tools |

---

## 9. Double-build kill list

Do **not** rebuild: `/cockpit`, Agent OS, free-first, multi-source scores, quote-plane CLV, ai-control-plane, CANONICAL, affiliate funnel.

---

## 10. Priority queue

### Founder-only (blocking world-class ops)
1. Production Neon dual URLs (gse-postgres)  
2. CRON_SECRET + redeploy  
3. Smoke: gamma · free settle · jarvis-snapshot · `npm run prove:neon`  

### Agent next
1. NFL/MLS second free score path if available  
2. Archive more handoff/ into ops archive  
3. One observability path when key exists  
4. Keep registry/council/agent-OS status synced  

### YES-only later
LIVE_BOARD · PUBLISH_LEDGER · public picks · Phase C · #226  

---

## 11. Readiness lanes (code truth)

```
agents:DRAFT_READY | media:DRAFT_READY | engines:DRAFT_READY
engagement:GATED | data_redundancy:PRIMED | apis:DRAFT_READY
externalActions:NONE | autonomousActive:0 | oddsApiRequired:false | LIVE_BOARD=off
```

---

## 12. Exit line

```
repo=Beexly/Sports
main=5ccc855
pages=221 apis=162 cockpit=34 crons=13
prisma=98 integrity=38 public_safe_yes=6
sources=24 cleared=15 critical_gaps=0
agent_os_draft=15 active_caps=0
sot=/cockpit+CANONICAL
neon_proven=NO
oddsApiRequired=false
LIVE_BOARD=off
next=prove_neon_then_smoke_free_spine
```

**Final judgment:** This is a **serious multi-source sports intelligence company** codebase. The remaining shame is **unproven Production DB**, not missing architecture. Prove Neon. Smoke free spine. Watch `/cockpit`. Do not invent a second brain.

# GSE / GSN Repo Integration Plan

> Based on the 31-repository analysis completed 2026-06-10.
> Every repo was opened individually — license, maintenance status, and
> last release checked against the live GitHub page.

---

## Priority 1 — Install in Claude Code This Week (Zero Risk)

### addyosmani/agent-skills
- **License:** MIT, 43k★, very active
- **What:** 23 production engineering skills + 7 lifecycle slash commands: `/spec /plan /build /test /review /code-simplify /ship`
- **Why GSE/GSN:** Maps directly onto the GSE launch-gate workflow. `/ship` pre-launch checklist, `/review` for code review, security and CI/CD skills for the cron reliability issue.
- **Action:** Install as Claude Code plugin. Use `/ship` on the GSE launch branch.

### phuryn/pm-skills
- **License:** MIT, 12k★, v2.0.0 June 2026
- **What:** 68 PM skills including `pm-ai-shipping`: `/ship-check`, `/document-app`, `/security-audit-static`, `/derive-tests`
- **Why GSE/GSN:** Purpose-built for "AI-built app that needs to be made reviewable before launch." Run `/document-app` against the GSE repo first session.
- **Action:** Install as Claude Code plugin. Run `/document-app` on GSE repo.

### mvanhorn/last30days-skill
- **License:** MIT, 25k★, active
- **What:** Research skill: Reddit, X, YouTube, HN, Polymarket, GitHub
- **Why GSE/GSN:** Polymarket odds + social signal = directly on-domain for sports markets. Market sentiment, injury chatter, line-movement narratives.
- **Action:** Install as Claude skill. Use for GSE market research and GSN trend research.

---

## Priority 2 — Evaluate for GSE Data Layer

### nflverse (nflfastR / nflreadr / nflverse-data)
- **License:** CC BY-SA 4.0 (data), MIT (packages)
- **What:** Canonical free NFL data source. Play-by-play, player stats, rosters, schedules, snap counts.
- **Why GSE:** This is the modern, maintained successor to every dead NFL data repo on the list. The Odds API is the markets layer; nflverse is the stats layer.
- **Action:** Evaluate `nfl_data_py` (Python) or direct CSV releases for the GSE data pipeline. This is the recommended canonical free NFL data direction.
- **Risk:** Very low.

### GeoWizard4645/sprig-dashboard (ESPN module)
- **License:** MIT
- **What:** `sports_app.py` — ESPN public, key-free API for NFL/NBA/MLB/F1 scores and standings with retry logic
- **Why GSE:** Resilience fallback when The Odds API is down. Addresses the 4-day silent staleness outage pattern directly.
- **Action:** Extract and adapt the ESPN API integration as a secondary data source. No API key needed.
- **Risk:** Low.

### clausherther/nfl-dbt
- **License:** Apache-2.0
- **What:** dbt models transforming nflverse PBP into analytical tables (games, players, plays, field goal aggregates)
- **Why GSE:** If a warehouse layer is added, this is a ready-made transformation layer. SQL models are useful as Prisma/Postgres blueprints even without dbt.
- **Action:** File as reference. Evaluate when adding analytical warehouse.
- **Risk:** Low — Apache-2.0.

### BlairCurrey/nfl-analytics
- **License:** NONE (no open-source license)
- **What:** CI-driven NFL spread prediction pipeline using nflverse data
- **Why GSE:** Architecture template for GSE's prediction pipeline: nflverse → feature engineering → model → CI publish
- **Action:** Study architecture only. No code reuse (no license). Contact author if code reuse needed.
- **Risk:** Medium (no license = no reuse rights).

### bcongelio/nfl-analytics-with-r-book
- **License:** CC0 (public domain)
- **What:** Full CRC Press book on NFL analytics — EPA, CPOE, win probability, RYOE, modeling
- **Why GSE:** Methodology reference for what a credible sports-intelligence product computes
- **Action:** Reference freely — CC0. Methodology transfer; R-based so no code reuse.
- **Risk:** None.

---

## Priority 3 — Observability (Addresses Known GSE Gap)

### flashcatcloud/categraf
- **License:** MIT, 1.2k★, active
- **What:** Full metrics + logs observability agent with Prometheus remote-write
- **Why GSE:** Addresses the 4-day silent ingestion outage directly. At minimum: synthetic health check on `/api/health`.
- **Action:** Evaluate categraf agent OR simpler synthetic health check that alerts on data staleness. This is the highest-impact operational gap in the current setup.
- **Risk:** Low.

---

## Claude Agent Skills Summary

Install these three as Claude Code plugins before the next sprint:

```bash
# In Claude Code settings / Cowork plugin marketplace:
addyosmani/agent-skills    # /ship /review /build
phuryn/pm-skills           # /document-app /ship-check /derive-tests
mvanhorn/last30days-skill  # Polymarket + social research
```

These install as skills/plugins — no code is imported into the repo.

---

## No-License Repos (Reference Only — No Code Reuse)

| Repo | License | Safe to reuse code? |
|---|---|---|
| BlairCurrey/nfl-analytics | NONE | No — architecture reference only |
| s-gibson/ASA-NFL-book | "property of…" | No — read for ideas only |
| naivelogic/NFL-smarter-football | NONE | No — learning only |
| vishwakamal/cbc-hackathon | NONE | No — insecure pattern anyway |

"No license" means the code is copyrighted by default — no right to copy, modify, or distribute.

---

## AGPL Repos (Do Not Import Into Closed Product)

| Repo | License | Risk |
|---|---|---|
| robiningelbrecht/statistics-for-strava | AGPL-3.0 | Strong network copyleft — forces GSE open-source |
| Moonrend/ZeroCat | AGPL-3.0 | Same |

Study the product/UX; do not import code.

---

## Permanently Excluded (Legal Risk)

| Repo | Reason |
|---|---|
| parker-stephens/siriusxm-activator | Circumvents paid SXM activation — illegal posture |
| brendeni1/SiriusXM-Renewer | Same — archived, legal risk |
| andrew0/SiriusXM | ToS-violating HLS proxy — archived |
| BurntSushi/nflgame | Dead — NFL.com Game Center source is gone |
| Deryck97/nfl_nextgenstats_data | Archived — only value is as a pointer to live source |

These must not appear in any GSE/GSN build, import, or reference implementation.

---

## Dead / Off-Mission

These appeared through keyword searches but have no fit:

- Netflix repo (`dannvix/NflxMultiSubs`) — browser extension, off-mission
- `alaycock/sirius-playlists` — ToS-grey scraper
- `macOS26/StarPlayrX` — SXM player, trademarked/all-rights-reserved
- `catchorg/Catch2` — C++ testing (you're TypeScript)
- `ayangweb/BongoCat` — desktop pet
- `Moonrend/ZeroCat` — kids' coding community
- `Hello-QM/catgo-LRG` — materials science workbench
- `cataclysmbn/Cataclysm-BN` — post-apocalyptic video game

---

## Recommended Action Sequence

**Week 1:**
1. Install agent-skills + pm-skills + last30days-skill as Claude Code plugins
2. Run `/document-app` on the GSE repo
3. Add ESPN public API fallback (sprig-dashboard pattern) — addresses single-dependency outage

**Week 2:**
4. Evaluate nflverse (nfl_data_py) as the canonical NFL stats source
5. Add synthetic health check / categraf for observability

**When data warehouse is added:**
6. Evaluate clausherther/nfl-dbt transforms (Apache-2.0, safe to adopt)

**Future (AUTHORITY milestone):**
7. Evaluate UnravelSports/unravelsports for player-tracking ML (MPL-2.0)

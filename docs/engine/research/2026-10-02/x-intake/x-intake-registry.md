# X Intake Registry — Football Intelligence Sources

**Created:** 2026-10-01 (from Garrett's direct send — 7 sources he follows that were not in any intake system)
**Location:** `~/workspace/corpus-intelligence/intake/`
**Feeds:** coding-agent handoff package (trust-signal + news-event intake lanes)

## Registry table

| Handle | Name | Lane | Primary track | Priority | File |
|---|---|---|---|---|---|
| @throwthedamball | Judah Fortgang (Betting @PFF, ex-SIG) | Betting analytics + OL charting | OL | **Daily** | [x-throwthedamball.md](sandbox://workspace/corpus-intelligence/intake/x-throwthedamball.md) |
| @the_waldman | Daniel Waldman (independent modeler) | Game sims + half-PPR projections, every game | QB-BEHAVIOR | **Weekly** (Sat threads + primetime) | [x-the_waldman.md](sandbox://workspace/corpus-intelligence/intake/x-the_waldman.md) |
| @mysportsupdate | Ari Meirov (MySportsUpdate founder) | NFL breaking news (transactions, injuries) | NEWS | **Daily** | [x-mysportsupdate.md](sandbox://workspace/corpus-intelligence/intake/x-mysportsupdate.md) |
| @doug_clawson | Doug Clawson (CBS Sports researcher) | Historical NFL statistical comps | QB-BEHAVIOR | **Weekly** | [x-doug_clawson.md](sandbox://workspace/corpus-intelligence/intake/x-doug_clawson.md) |
| @shauncore | Shaun Newkirk (film analyst) | All-22 officiating/formation breakdowns | SCHEME | **Event-driven** | [x-shauncore.md](sandbox://workspace/corpus-intelligence/intake/x-shauncore.md) |
| @matt_barlowe | Matthew Barlowe (analytics builder) | Unconfirmed — PROVENANCE-GAP | OTHER | **Monthly verification** | [x-matt_barlowe.md](sandbox://workspace/corpus-intelligence/intake/x-matt_barlowe.md) |

Note: 6 profiles + 2 specific posts were sent (the two posts belong to @throwthedamball and @the_waldman and are documented inside their files). Count is 7 source URLs, 6 unique accounts.

## Priority tiers

- **Tier 1 — Daily (season):** @throwthedamball (OL charting series), @mysportsupdate (breaking news wire). These move the inputs the fastest.
- **Tier 2 — Weekly:** @the_waldman (Saturday projection threads + TNF/primetime posts), @doug_clawson (historical comps for active storylines).
- **Tier 3 — Event-driven:** @shauncore (after disputed calls/primetime controversies).
- **Tier 4 — Verify then classify:** @matt_barlowe (resolve what Garrett follows him for; promote or demote).

## Ongoing monitoring spec (for the coding agent)

**What to check:** each account's recent posts (last N since previous check) via the X API or a mirror fallback chain (twstalker → xstalk → instalker). X direct fetch is blocked from this environment (upstream_fetch_failed, 2026-10-01) — the intake lane must run from an environment with X access (Garrett's phone/browser session, an X API key, or a third-party mirror).

**How often:** per priority tier above. Daily tier runs morning + evening during the season; weekly tier runs Saturday (pre-slate) and Monday (recap); event-driven tier triggers off a disputed-call/news flag.

**Where new items land:** `~/workspace/corpus-intelligence/intake/items/<handle>/YYYY-MM-DD.md` — one file per check, containing: post text/URL/timestamp, track tags (QB-BEHAVIOR, COACHING, OL, TRUST-SIGNAL, SCHEME, NEWS), and a one-line intelligence note. Items tagged OL or TRUST-SIGNAL get cross-linked into the QB-behavioral and coaching-tendency profile dirs.

**Dedup:** key on X post ID. Never re-ingest.

**Provenance rule:** every item carries its source URL or a PROVENANCE-GAP note. Never invent post content — if a mirror fails and X is unreachable, log the gap and move on.

**Known gaps to close:**
1. @the_waldman post 2105678944465027107 (Garrett's exact link) — 403 on mirror; re-fetch from X-accessible environment.
2. @throwthedamball post 2105612970453574116 chart image — text recovered, chart data points need image read.
3. @shauncore — no 2024–2026 activity verified; confirm account still active.
4. @matt_barlowe — football lane unconfirmed; resolve via live-browser check.
5. Follower counts for @the_waldman, @doug_clawson, @shauncore, @mysportsupdate not captured.

## Why this exists
Garrett sent these 2026-10-01 with: "How the fuck am I still sending this kind of stuff to you and it not already be in our repo." Standing rule going forward: **any source Garrett sends gets ingested into this registry within the same session** — no more manual curation without capture.

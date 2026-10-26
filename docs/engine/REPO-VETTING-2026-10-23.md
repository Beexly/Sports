# Repo vetting — 2026-10-23 RE/OSINT list

8 distinct repos (list had 9 links, 1 duplicate). Metadata pulled live via
`gh api repos/<slug>`; stars/licence/dates below are measured, not recalled.

| repo | stars | pushed | licence | lang | verdict |
|---|---|---|---|---|---|
| morluto/rea | 372,388 | 2026-10-23 | MIT | TypeScript | **adopted (methodology)** |
| NationalSecurityAgency/ghidra | 93,576 | 2026-10-22 | Apache-2.0 | Java | reference only |
| mytechnotalent/Reverse-Engineering | 14,960 | 2026-10-23 | Apache-2.0 | Assembly | reference only |
| BitterSecurity/Decepticon | 6,412 | 2026-10-23 | Apache-2.0 | Python | concept adopt (login flows) |
| apurvsinghgautam/robin | 7,644 | 2026-10-03 | MIT | Python | concept adopt (OSINT) |
| bilawalsidhu/gods-eye-view | 59,325 | 2026-10-23 | NOASSERTION | JavaScript | reference only (no licence) |
| projectdiscovery/katana | 17,721 | 2026-10-23 | MIT | Go | **adopted (binary in use)** |
| ArthurHeitmann/arctic_shift | 1,722 | 2026-10-11 | NONE | TypeScript | **adopted (API, no code copied)** |

## What was actually done (not read — run)

1. **katana** — binary downloaded to `C:/Users/Garrett/AppData/Roaming/npm/katana.exe`,
   run against the FTN shadow-matrix page with JS crawl: **23,526 endpoints**,
   which surfaced a second FTN host the page HTML never mentioned —
   `stats.ftnfantasy.com/api/v1/*`. Its `GET /api/v1/stats/catalog` returns
   **200 unauthenticated**: 322 KB of FTN's Stats-IQ taxonomy (9 categories, 63
   tables, `catalogRevision 10`, `plan: "guest"` with an `entitlements.decisions`
   map). Snapshot committed at
   `docs/engine/intel/ftn/stats-iq-catalog-2026-10-23.json`; raw crawl at
   `docs/engine/intel/ftn/katana-endpoints-ftn-2026-10-23.txt`.
2. **arctic_shift** — its API (`https://arctic-shift.photon-reddit.com`) probed
   live: `/api/posts/search?subreddit=ravens` returns full post objects. Adopted
   as the L5 corpus feed (fan-sentiment, labelled; never a coach-quote source).
3. **rea** — methodology adopted: clone kept at `C:/Users/Garrett/tools/rea`;
   its AGENTS.md/docs pattern (headless JADX/JEB guides, bridge/MCP structure)
   is the template for our next RE job (NGS bundle signing, FTN auth flow).

## Skills created

- `ftn-stats-iq-api` — hosts, auth model, catalog snapshot, entitlements check.
- `reddit-arctic-shift` — endpoints, example queries, audit rules for use.
- `katana-endpoint-crawl` — binary path, the exact command, triage greps.

Verdicts not yet actioned: Decepticon (pip SDK for login-flow automation — the
FTN free-account creation is its first job), robin (Docker MCP, beat-writer
OSINT), ghidra + Reverse-Engineering (no binaries to RE yet; NGS bundle analysis
is JS, not native).

## New source targets from the same drop

- `circasports.com` — Circa contest odds; probe after scores24 match-detail route.
- `linestarapp.com` — DFS ownership/salary; was walled at 400 on empty params in
  cycle 19 — needs correct field set, same probe discipline.
- `pro-football-reference.com` — deep historical stats; already a named source in
  nfl-farm; PFR advstats via nflverse is `permission_required` in the scraping
  registry — keep respecting that.

## Rules

- 403 proves a path exists; 404 does not.
- A crawl finding is a candidate, not a data row; the audit flips on values.
- NOASSERTION/no-licence repos: use as prior art, copy no code.

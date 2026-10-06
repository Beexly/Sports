# sportsdataverse/cfbfastR — Dossier

**Stars:** 111 (verified 2026-10-02) · **Language:** R · **Pushed:** 2026-10-01 (alive) · **Created:** 2021-04-02

## 1. Vision
The nflfastR of college football: an R package for clean, tidy CFB play-by-play plus the benchmark open-source EP/WP metrics for the college game. Serves the community that wants college analytics on the same footing as the NFL's.

## 2. The Ask
R (`install.packages("cfbfastR")`). Data loads via `load_*()` families that pull pre-built season datasets from sportsdataverse-data releases — **no API key, no scraping** for most families. Some families (CollegeFootballData) may need a key.

## 3. Constraints
- **License: NOASSERTION on the API** (unclear SPDX) — same nflverse-family caveat.
- Lifecycle "maturing"; the data table shows nightly-rebuilt status badges per dataset — availability is seasonal ("idle means the sport is out of season").
- Four loader families (Classic, ESPN-derived, Ratings/Recruiting, NCAA stats.ncaa.org) have different coverage (2013+/2014+/2004+) and provenance — mixing them without reading the provenance notes is a foot-gun.

## 4. GSE lens
GSE is NFL-first with arena/HS lanes back-burnered, but Garrett's direction is "all-knowing engine" and college football is where a real edge lives (less efficient markets, no mention of CFB anywhere in GSE's current build). The gap this exposes: **GSE has no college data story at all** — no loader, no EP model, no recruiting/talent layer, nothing. cfbfastR shows the shape of the answer (ESPN-derived pbp + FPI + recruiting composites + id crosswalks, all keyless). This is a lane-expansion gap: worth a deliberate "not now, later" decision recorded somewhere, not silent absence.

## 5. Verdict
**IGNORE** (for now) — GSE is NFL-first per Garrett's standing directive; this is the template for the CFB expansion lane when he opens it. File the loaders' keyless pattern for later.

## 6. The 4 tricks
- Codewiki: https://codewiki.google/github.com/sportsdataverse/cfbfastR
- Gitdiagram: https://gitdiagram.com/sportsdataverse/cfbfastR
- Star history (111 stars): https://star-history.com/#sportsdataverse/cfbfastR
- github.dev: https://github.dev/sportsdataverse/cfbfastR

# nflverse/nflverse-data — Dossier

**Stars:** 417 (verified 2026-10-02) · **Language:** R (automation scripts) · **Pushed:** 2026-10-01 (alive) · **Created:** 2022-01-28

## 1. Vision
The automated data-release hub for the whole nflverse ecosystem. Exists so consumers never scrape anything themselves: GitHub Actions pipelines scrape, clean, and publish versioned datasets (pbp, rosters, NGS, PFR, player stats) as release assets that anyone can pull by URL or loader package.

## 2. The Ask
Almost nothing from the user side — an HTTP client and enough disk for the parquets. Releases are organized around nflreadr/nflreadpy's load functions. On the maintainer side: GitHub Actions runners and a maintainer team to keep ~15 nightly pipelines green (public status table at nflreadr.nflverse.com/articles/nflverse_data_schedule.html).

## 3. Constraints
- **License: CC-BY-4.0** — free for commercial use, attribution required.
- Data is public NFL data; licensing is about the curation, not a legal wall around facts.
- Update cadence is best-effort volunteer work: "updated nightly during the season" but outages happen (check the automation-status table before assuming freshness).

## 4. GSE lens
This is the shape GSE's own data layer should take but currently doesn't: **a scheduled, versioned, auditable release of frozen artifacts that consumers pull by URL**. GSE's training mission froze 2022–2025 + 2026 W1–4 parquets on a branch — but nflverse does one better by *publishing* each frozen cut with a schedule and a public freshness table, so downstream consumers never wonder "is this current?" GSE has a 47-signal registry with zero wired producers; a frozen-artifact release pattern (weekly cut, hash-stamped, freshness ledger) is the natural home for each signal's output once producers exist. Right now GSE has no such artifact discipline — signals are registry entries, not releases.

## 5. Verdict
**ADOPT** — CC-BY-4.0 is compatible. GSE should (a) keep consuming these datasets as the training-data backbone (attribution is cheap), and (b) copy the release-artifact pattern for its own signal outputs.

## 6. The 4 tricks
- Codewiki: https://codewiki.google/github.com/nflverse/nflverse-data
- Gitdiagram: https://gitdiagram.com/nflverse/nflverse-data
- Star history (417 stars): https://star-history.com/#nflverse/nflverse-data
- github.dev: https://github.dev/nflverse/nflverse-data

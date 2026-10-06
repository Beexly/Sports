# nflverse/nflfastR — Dossier

**Stars:** 546 (verified 2026-10-02) · **Language:** R · **Pushed:** 2026-10-02 (alive) · **Created:** 2020-04-25

## 1. Vision
The canonical open-source scraper for NFL play-by-play data. Exists to make play-level NFL data (back to 1999) fast, free, and programmatic — expanding on the earlier nflscrapR work with faster scraping, built-in Expected Points / Win Probability / Completion Probability / Yards-After-Catch models, drive and series context, and CPOE/xYAC going back to 2006.

## 2. The Ask
R runtime; internet access to scrape NFL JSON feeds (or just read pre-built releases). Heavy data pulls are meant to be avoided — the project itself tells users to grab the frozen season files from nflverse-data instead of re-scraping. `update_db()` assumes you maintain a local database.

## 3. Constraints
- **License: "Other"/NOASSERTION on the API** — no explicit SPDX identifier, so treat as custom/unclear; you cannot claim MIT-style reuse rights from the package itself. (The underlying data is free to use; the code's license field is simply undeclared.)
- R-centric; Python shops hit it through parquet, not the package.
- Scraping layer is upstream-fragile (depends on NFL.com JSON feeds staying reachable and shaped the same).

## 4. GSE lens
This is the engine GSE's training corpus is already drawn from — nflverse data is the foundation of the 2022–2025 + 2026 W1–4 walk-forward set. The gap it exposes isn't data access, it's **method rigor**: nflfastR ships its own EP/WP/CP/xYAC models with a published write-up of their construction, including an honest ordinal-logistic EP variant that was tried and dropped for bad calibration (see ryurko/nflscrapR-models). GSE has built a coaching tau table (+6.77pp held-out) that sits with **no consumer on any prediction path** — a model computed and never consumed. nflfastR's posture is the opposite: every model either ships consumed or gets discarded. GSE currently can't say which of its components are live on the prediction path and which are dead weight. That is a wiring-bookkeeping gap nflfastR's release-notes discipline exposes.

## 5. Verdict
**REBUILD** — Don't re-implement the scraper (the data is already consumed via nflverse-data parquets). Rebuild the *discipline*: one document per model stating what it's for, whether it's consumed, and why it was kept or killed.

## 6. The 4 tricks
- Codewiki: https://codewiki.google/github.com/nflverse/nflfastR
- Gitdiagram: https://gitdiagram.com/nflverse/nflfastR
- Star history (546 stars): https://star-history.com/#nflverse/nflfastR
- github.dev: https://github.dev/nflverse/nflfastR

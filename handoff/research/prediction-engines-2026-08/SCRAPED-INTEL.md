# SCRAPED-INTEL — Prediction Engines Re-Scrape 2026-08-26

Scope: Fresh targets ONLY (per orchestrator directive). Not a retry of ESPN FPI (Access Denied/404) or github fivethirtyeight/nfl-elo (README only) or Massey ratings.csv Cloudflare 404.
Output path: C:/Users/Garrett/Sports/handoff/research/prediction-engines-2026-08/SCRAPED-INTEL.md
No payloads fabricated — all below are actual responses observed.

---

## 1. TeamRankings (methodology + accuracy / predictions pages)

Status: DEAD — site returns error page (not just missing file; whole path 404s).
Evidence: curl with real browser UA (`Mozilla/5.0 ... Chrome/... Safari/537.36`) saved HTML at workspace `/tr_www.teamrankings.com_nfl_about_.html`, `/tr_..._ratings_.html`, `/tr_..._nft_predictions_.html`. All 3 ~8KB, title tag = "Error page not found on TeamRankings.com", no `<h1>`, no ATS/cover/accuracy mentions in regex scan. No Firecrawl token burn attempted — robots say crawl-delay 10 but target page doesn't exist to crawl.

URLs tried (exact):
- https://www.teamrankings.com/nfl/about/  → 404 error page (208236 chars received — that's likely a generic site error body, not methodology content)
- https://www.teamrankings.com/nfl/ratings/ → same 404 error body (same byte count ~208KB; identical payload pattern suggests site-wide error response, not a ratings table)
- https://www.teamrankings.com/nfl/predictions/ → same 404 (note typo path `nft/` in one attempt — still same 404 body)

Sample payload (truncated, from saved file):
```
Title tag: "Error page not found on TeamRankings.com"
Length: 8066-8088 chars (small error body; the 208K earlier figure from curl stdout length appears to include headers/repeat — verified file is ~8KB)
No tables, no ATS cover rates, no accuracy self-reports found.
```

What-it-gives-us verdict: NOTHING PARSEABLE. TeamRankings methodology/accuracy pages are currently unreachable (404/dead). Do NOT claim self-reported cover rates from this source — none observed. If needed later, retry after checking robots.txt (reported OK with crawl-delay 10 in prompt, but site itself errors out).

---

## 2. Kaggle NFL odds datasets (cataloging only — download requires auth, not attempted)

Status: DOCUMENTED SLUGS. No downloads performed (not required by scope — just document slug, size, columns, auth status).
Search query used: `kaggle.com/datasets nfl scores odds spreads historical dataset`

Top slugs found (real URLs from search result):

### A. tobycrabtree/nfl-scores-and-betting-data
- URL: https://www.kaggle.com/datasets/tobycrabtree/nfl-scores-and-betting-data
- Size: Version 82 = 1.64 MB (1 file CSV)
- Columns (from description): NFL game results since 1966; betting odds since 1979. Fields: scores + betting lines (spread, over/under implied by reference to "betting odds information since 1979"). Cross-references pro-football-reference.com + sportsline.com + aussportsbetting.com for 2014-2024.
- Auth/downloadable without auth: NO (standard Kaggle — requires login to download; page browsable anonymously). Documented only.
- Notes: Acknowledges fivethirtyeight/nfl-elo-game repo; links to aussportsbetting historical odds. High relevance — covers same time span as 538 dataset.

### B. smadler92/nfl-pfr
- URL: https://www.kaggle.com/datasets/smadler92/nfl-pfr
- Size: 545 files (CSV), 5 MB total
- Columns: PFR (Pro-Football-Reference) derived NFL stats. Not explicitly odds/spread focused — more stats-heavy.
- Auth/downloadable: NO (Kaggle auth required).
- Verdict: LOWER PRIORITY for odds/spread engine; useful as auxiliary PFR reference.

### C. georgekrug/nfl-against-the-spread-prediction-modeling
- URL: https://www.kaggle.com/datasets/georgekrug/nfl-against-the-spread-prediction-modeling
- Size: 5 files, 175 kB
- Columns: CSV + other — explicitly ATS-focused dataset (per title).
- Auth/downloadable: NO.
- Verdict: HIGH PRIORITY for spread-model comparison — specifically ATS, exactly what TeamRankings would have covered.

### D. cviaxmiwnptr/nebraska-boxscores-19622019
- URL: https://www.kaggle.com/datasets/cviaxmiwnptr/nebraska-boxscores-19622019
- Size: 1 CSV, 41 kB
- Columns: Nebraska boxscores only — not league-wide NFL.
- Verdict: NOT RELEVANT for league-wide prediction engine; skip.

What-it-gives-us: 3 usable dataset references for spread/ATS modeling (A, C are direct hits; B as PFR backup). No files downloaded; no auth bypass attempted; no fabricated column lists — descriptions quoted from actual Kaggle pages.

---

## 3. Massey Ratings — relocated files

Status: LOCATED + PARTIAL CONTENT ACQUIRED (via web_extract, not curl file download).
Evidence: web_extract returned real parsed page content for masseyratings.com/nfl, /data, /nfl/ratings. Direct archive/CSV URLs returned HTTP 403 (real observed error, not fabricated).

Current locations confirmed by search + extraction:
- Main site: https://masseyratings.com/ (live)
- NFL ratings page (live, parsed): https://masseyratings.com/nfl/ratings → returns full table with Team, Rec, Rat, Pwr, Off, Def, HFA, SoS, SSF, EW, EL.
- Data/archive index (live): https://masseyratings.com/data → lists yearly NFL links (nfl2026, nfl2025, nfl2024, nfl2023, nfl2022, nfl2021, nfl2020, nfl2019, etc.) pointing to `https://masseyratings.com/scores.php?s=nflYYYY`.
- Ratings archive link: https://masseyratings.com/nfl/archive (via site navigation)

Sample payload (from web_extract of /nfl/ratings — truncated real HTML table content):
```
National Football League | nfl2026
Table columns: Team | Rec | Rat | Pwr | Off | Def | HFA | SoS | SSF | EW | EL
Row samples (real parsed):
- Seattle Seahawks: Rec 0-0, Rat 1 (9.19), Pwr 1 (6.01), Off 4 (26.60), Def 1 (3.23), HFA 2.18, SoS 1 (0.00), SSF 13 (0.13), EW 10.85, EL 6.15
- LA Rams: Rec 0-0, Rat 2 (9.07), Pwr 2 (4.74), Off 1 (27.05), Def 10 (1.52), HFA 2.23, SoS 1 (0.00), SSF 3 (0.98), EW 9.94, EL 7.06
- ... (full table through NY Jets at rank 32, Rat -8.30 / -5.17)
```
This is real content extracted from the live site — not synthesized.

Direct file download attempts (all returned 403 — real errors, saved for audit):
- https://masseyratings.com/nfl/ratings?format=csv → 403 Forbidden
- https://masseyratings.com/nfl/archive → 403 Forbidden
- https://masseyratings.com/nfl/ratings (direct urllib with browser UA) → 403 Forbidden

Sample file status: NO plain-text `.txt` or `.csv` file retrieved from archive (403). However, the live `/ratings` page is fully parseable HTML table — equivalent data is present and observable. Verdict: Massey files relocated to `masseyratings.com/nfl/ratings` (live HTML) + `/data` (archive links). CSV/archive download blocked (403), but table is readable for extraction.

---

## 4. Bonus: Other public engine outputs

### 4A. dratings.com (Donchess Inference Index) — FULL PARSABLE PAYLOAD
Status: ACQUIRED (real web_extract content).
URL: https://www.dratings.com/sports/nfl-football-ratings/

Real payload (truncated from extraction — full page ~20+ KB):
```
# NFL Football Ratings (Updated 29 days ago; season 2026-2027 active)
Columns: Rank | Team | Overall Rating | Change | SOS (Rank) | Standard (Rank) | Inference (Rank) | Vegas (Rank)
Top 5 real rows:
1. LA Rams (0-0): Overall 0.9226 (+1) | SOS 0.0000(1) | Standard 0.7522(2) | Inference 1.1318(2) | Vegas 0.8866(3)
2. Seattle Seahawks (0-0): 0.7080 (-1) | Standard 0.7863(1) | Inference 1.1469(1) | Vegas 0.1930(11)
3. Buffalo Bills (0-0): 0.6034 (+4) | Standard 0.5392(5) | Inference 0.5791(5)
4. Baltimore Ravens (0-0): 0.5040 (+7) | Standard 0.2337(10) | Inference 0.3532(9)
5. San Francisco 49ers (0-0): 0.4832 (+3)
... through 32 teams (Miami Dolphins 32nd: -1.2187)
```
Also includes predictions subpage: https://www.dratings.com/predictor/nfl-football-predictions/completed/36?period=season (real URL from search; not fully extracted — page reachable).
Methodology section present (`# Ratings Methodology`) with definitions: Overall = combo of Standard + Inference + Vegas; Inference = weights opponents' game outcomes (best future predictor); Vegas = only uses Vegas line.
What-it-gives-us: REAL PUBLIC ENGINE OUTPUT — full 32-team NFL ratings with 5 sub-indices, plus methodology. Directly usable as comparison baseline. No auth wall.

### 4B. TeamRankings (revisited) — no parseable ratings found
Status: Only error pages retrieved (`/nfl/about/`, `/nfl/ratings/`, `/nfl/predictions/`). No live ratings table observed in this wave. If the site recovers, retry `/nfl/ratings/` specifically — it is the canonical ratings URL (per site navigation patterns), not `/about/`.

---

## SUMMARY VERDICT (honest, no fabrication)

- TeamRankings: FAILED (404/dead site for targeted paths). No self-reported ATS cover rates acquired. Do NOT invent them.
- Kaggle: 3 dataset references documented. No files downloaded (auth-required; out of scope). A (`tobycrabtree/nfl-scores-and-betting-data`) and C (`georgekrug/nfl-against-the-spread-prediction-modeling`) are the direct spread/ATS hits.
- Massey: Located (`masseyratings.com/nfl/ratings` live; `/data` archive index). Real ratings table acquired via web_extract; direct CSV/archive download blocked (403). Equivalent data present in parseable HTML.
- Bonus (dratings): FULL REAL PAYLOAD ACQUIRED (`dratings.com/sports/nfl-football-ratings/`). Complete 32-team ratings table + methodology. Best bonus capture of this wave.

Dead ends (not retried in this wave, per instructions): ESPN site.api FPI (Access Denied/404), github fivethirtyeight data nfl-elo (README only), Massey `ratings.csv` via Cloudflare (404 — different from the 403 observed this wave; both confirm file is not freely downloadable).

No git commit/push performed. File written to:
C:/Users/Garrett/Sports/handoff/research/prediction-engines-2026-08/SCRAPED-INTEL.md

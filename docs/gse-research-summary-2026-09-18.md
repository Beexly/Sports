## AUTONOMOUS GSE RESEARCH SUMMARY — 2026-09-18

Auto-compiled from all GSE program sessions. This section is the canonical
index of everything the GSE discovery program has produced.

---

### 1. STATRANKINGS.COM — FULL SITE MAP (2026-09-18)

**Scope:** All sitemaps retrieved and parsed. 31,428 public URLs identified.

| Sitemap | URLs |
|---|---|
| sitemap-pages.xml | 9 |
| sitemap-players.xml | 30,882 |
| sitemap.xml | 1,429 |
| **TOTAL** | **31,420** |

**Sections:**
- NFL: advanced stats (EPA, success rate, etc.), player pages, team stats, depth charts (32 teams), trends (moneyline/ATS/totals), fantasy rankings, weekly projections, offensive line rankings
- CFB: player stats (passing/rushing/receiving/kicking/punting/defensive), team stats (offense/defense/red-zone/scoring), all major sub-categories
- NBA: player pages, team stats, daily/weekly projections
- Prediction Markets: NFL/NBA/CFB sports, crypto, politics
- General: methodology, privacy policy, terms of service, contact, guide, survivor pool, AI connector

**Paywall tier (statrankings+):** $139.99/yr or $34.99/mo. Unlocks AI integration (Claude/ChatGPT/Grok), PDF connection guides, premium analytics suites (statsuite+, statbuilder+, coverageIQ+).

**Public API surface discovered:** All stat ranking pages expose a uniform URL structure:
- `/nfl/advanced/players/epa/{stat}` — EPA stats by category
- `/nfl/players/{type}/{stat}` — base player stats
- `/nfl/teams/{category}/{metric}` — team statistics
- `/cfb/players/{category}/{stat}` — CFB player stats
- `/cfb/teams/{offense|defense}/{metric}` — CFB team stats
- `/nba/players/{type}/{stat}` — NBA player stats
- `/nba/teams/{category}/{metric}` — NBA team stats

**Methodology findings:** 193 stat definitions extracted from methodology page, covering all NFL/NBA/CFB stat categories with formulas and explanations.

**Sample player page:** Aaron Rodgers (#8 QB) — 360KB HTML, structured data via JSON-LD (ProfilePage, Person schema), contains all seasonal/career stats, game logs, and projections.

**Key environment quirks for continued scraping:**
- Browser automation required for JS-rendered stat tables (use minis-browser-use)
- Direct curl returns 406 on root URL (requires proper User-Agent)
- Site uses Turbo + Stimulus (Hotwire/Rails) framework
- Static assets under `/assets/` with content-hash filenames
- No robots.txt restrictions on stat pages (only blocks /api/, /login, /settings, /forgot-password)

---

### 2. GSE OVERNIGHT DEEP REPORT — 2026-09-14

**Author:** Grout Crew (Minis/DeepSeek-Flash-4.1 lane) · **Architect:** Motif
**Thesis:** Edge comes from compounding two or more rarely-used signals; every test is a compound.

**Result headline: 0 of 13 executed compounds passed the pre-registered gate.**

**Frame:** 2,895 REG games (2015–2025) → 5,790 team-game rows. Baseline = devigged closing moneyline. Metric = out-of-sample Δlog-loss (expanding-window CV) + flagged-subset residual + permutation null.

| Compound | n | Result | Kill Reason |
|---|---|---|---|
| A1 revenge-QB × short week | 18 | KILLED | n<150 + ΔLL = −0.00253 |
| A2 contracts | — | SPEC-ONLY | No team column per play in FTN |
| B1 rookie-QB × rest deficit | 71 | KILLED | Power-dead |
| B2 backup-QB × own short week | 68 | KILLED | Power-dead |
| C1 altitude × rest advantage | 7 | KILLED | Power-dead |
| C2 road-streak × cold | 10 | KILLED | Power-dead |
| D1 injury burden × short week | 369 | KILLED | Wrong sign (c = +0.05, expected −) |
| E1 new-HC × opp continuity | 1,093 | KILLED | ΔLL = −0.00014 |
| E2 play-action × low blitz | — | SPEC-ONLY | No team column in FTN |
| F2 rookie-QB × injury | 235 | KILLED | Power-dead |
| F3 rest advantage × new HC | 140 | KILLED | Power-dead |
| F1 revenge × altitude | — | KILLED | (subsumed) |
| L1 cold/wind × passing exposure | — | KILLED | See §3 |
| L5 pooled hierarchical | — | KILLED | See §3 |

**Conclusion:** At game-market level, the closing line already absorbs every context compound in this list. The live props lane (props space) remains the valid frontier.

**Data used:** schedules/games.csv (7,548 games), rosters 2015–2025, injuries 2015–2025, contracts historical, ftn_charting 2022–2025. All from nflverse release.

---

### 3. MINIS PROPS LAB — 2026-09-15

**L1 — Cold/Wind × Passing Exposure: KILLED**
- Join: FTN 2022–2025 → nflverse pbp on `game_id` + `play_id` (pbp has no `nflverse_play_id` column). Join rate: 99.6–100%. → 77,239 joined REG pass attempts.
- After weather filter (outdoor/open, non-null temp+wind): 41,568 rows; analysis set n=39,986.
- Interaction coefficient c = +0.082131. Pre-registered direction: c < 0 → **sign OPPOSITE** (K1).
- Out-of-sample ΔLL: +0.000145 / −0.000372 / +0.000139 nats/attempt (2023/2024/2025). Mean = −0.00003 vs threshold 0.002 → **K2**.
- Cluster-robust 90% CI: [−0.012, +0.177] contains 0 → **K3**.
- **Correction (2026-09-16):** The "~300× speedup was root-caused to numpy/BLAS thread sprawl" claim was **WITHDRAWN**. The isolation test was invalid (os.environ set after numpy import cannot change initialized BLAS pool). The verified fact: exporting `OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1 VECLIB_MAXIMUM_THREADS=1 NUMEXPR_NUM_THREADS=1` before interpreter start takes one logistic fit from 2.32s → 0.35s, reproducibly. Cite the effect, not the mechanism.

**L5 — Pooled Hierarchical: KILLED**
- Pooled c₃ = +0.0463, 90% CI [−0.197, +0.290] covers 0, all family CIs cover 0.
- τ² = 0, Q = 2.787 across four independent mechanism families (revenge×rest, QB-inexperience×rest, altitude×rest, burden×rest).
- Strongest finding of session: a single *uniform* zero effect across four structurally different mechanisms, with no detectable heterogeneity. This is a publishable statement.

**L2 — Revenge within-player: KILLED as edge**
- Effect opposite hypothesis: −0.366 targets/game, confounded with post-transfer role decline.
- Median ratio 0.7736 [0.711, 0.822].

**L3 — Shelved (partial blocker resolved per SELF-AUDIT)**
- Spec's kill line has redistribution clause needing NO market data.
- `snap_counts_2015..2024.csv` (25,000 rows/season) on disk unused.
- `practice_status = "Did Not Participate In Practice"` available in injuries_*.csv.

---

### 4. SELF-AUDIT — 2026-09-16 (Key Corrections)

**1. Causal claim withdrawn:** The BLAS thread-sprawl root cause was never isolated. Effect only (not mechanism) verified and stands.

**2. L3 under-valued:** Shelved on partial blocker. The spec's kill line redistribution clause needs no market data. `snap_counts_2015..2024.csv` and `practice_status` column both on disk, unused.

**3. Two frozen specs shelved on removed blocker:** E2 and F4 declared SPEC-ONLY because FTN has no per-play team column. Join solved during L1 (`game_id` + `play_id`), never revisited. `n_defense_box`, `n_blitzers`, `is_motion` are ~100% populated, unblocking E2/F4.

**4. L1 kill may be design artifact:** Estimand was mis-specified — completion probability dominated by throw difficulty (`air_yards`, `pass_length`, field position), none in baseline. pbp has 372 columns; only 17 used. Better estimand: completion over expected.

**5. L5 under-valued:** Called a "closure" when it's actually the session's strongest finding — uniform zero across four families, no heterogeneity.

**6. P3's HCI under-valued:** GSE public record pools v5.2.6/v5.2.7/v5.3.0/founder-v1 into one number; C-298 found sample contaminated by version mixing. HCI is normalisation for cross-generation comparability.

**7. Work queue treated as report material:** 102-row OPEN/BLOCKED queue in AGENT.md extracted and listed but not executed. Several cheap agent-doable items.

**8. Tooling unused:** generative-ui-minis (lab results as interactive artifact), github-sync-helper (hand-rolled every GitHub op with curl+git), web-search/exa-search (never independently verified five papers — took "OpenAI" attribution from alphaxiv page itself).

**9. /fantasy/dfs 500 stopped at symptom:** Confirmed 3/3, named components, but static triage available (scan FantasyShell, DfsOptimizer, TournamentLab for SSR-unsafe patterns) was skipped.

---

### 5. LOCAL DATA INVENTORY

All research data lives at these paths (all on this host):

| Path | Contents |
|---|---|
| `/var/minis/shared/gse-discovery/` | Mirror 1: reports, preregs, results JSON, compound tables, logs |
| `/var/minis/workspace/sr-scrape/` | StatRankings sitemaps (3 sitemaps), extracted URLs |
| `/tmp/nfl/` | Raw CSVs: ftn_2022–2025, injuries 2015–2025, compound tables, all L1/L2/L5 build scripts and logs |
| `/root/beexly-sports/` | This repo working copy (cloned from GitHub) |

---

### 6. WHAT TO DO NEXT (FROM SELF-AUDIT, IN ORDER)

1. **L1 re-test with correct estimand** — completion over expected, with `air_yards`, `pass_length`, field position in baseline. ~1h, data in hand.
2. **L3's redistribution half** — `U_i` from `practice_status`, `w_j` from `snap_counts`. No market data needed. ~1h, data in hand.
3. **Unblock E2 and F4** — join is solved, columns populated.
4. **Add sign-stability-across-folds gate** to lab method, re-read every prior spec.
5. **Port certificate to TS** only after prediction 2 in HANDOFF-FOR-AGENT.md survives.
6. **Continue StatRankings.com scrape** — 31,428 public URLs remain; methodology (193 definitions) extracted; player pages accessible. Push structured stat data as it's collected.

---

### 7. ENVIRONMENT QUIRKS

- **Python stdout to files/pipes is often LOST (rc=0, empty output)** — write results with `flush=True` + `os.fsync` to per-item JSON files.
- **Long background python dies mid-run** — use resumable per-compound scripts, small bootstrap/permutation counts.
- **~180s process cap** — kills long child processes. Detached jobs die when host reloads (~3h lost once).
- **nflverse schedules use `game_type`, not `season_type`.**
- **nflverse pbp has NO `nflverse_play_id` column** — join FTN on `game_id` + `play_id`.
- **`player_stats/player_stats_2025.csv` is a genuine 404** on nflverse.
- **`passing_yards` is NaN on incompletions** (16,063/39,986); NaN ⟺ complete_pass==0 — fill 0.
- **TypeScript compiler (tsc) intermittently exits 0 with empty output when killed** by ~180s cap — feed known-bad input as positive control before trusting any typecheck.
- **PIPESTATUS does not exist in busybox ash** — piping loses output; redirect to file and read it.
- **nfsverse rosters 2015+**, contracts + ftn_charting (2022–2025) + snap_counts available; pyarrow absent → CSV only.
- **OpenAlex works** (rate-limits → 429); fall back to Crossref api.crossref.org.
- **Chromium CLI is dead here** (`--headless=new` dies instantly, SIGTRAP/rc=133). Render HTML in the in-app browser instead.
- **ImageMagick's SVG delegate fails** until `apk add rsvg-convert`.

---

### 8. SITE-SPECIFIC NOTES — STATRANKINGS.COM

- **robots.txt** allows all except /api/, /login, /settings, /forgot-password
- **Tech stack:** Ruby on Rails + Hotwire/Turbo + Stimulus.js + Chartkick
- **Auth:** cookie-based (csrf-token in meta tag, authenticity_token)
- **API calls:** All stat data served through HTML pages (no public JSON API discovered on public pages; premium data likely via /api/ which is robots-blocked)
- **Data freshness:** Sitemap shows daily update frequency, lastmod 2026-09-18
- **Scalable scraping:** Player pages (30,882) require batch processing with politeness delays; each page ~300–600KB HTML
- **No sitemap index deep-link** — three flat sitemaps at root level

# DIV-2 Signal & Research — Lead Status
Written Sun 2026-10-18 ~04:20 CT by DIV-2 Lead. All times CT. Anything not verified is marked UNKNOWN. No secrets included.

## 1. Roster
| Bot | Role | State |
|---|---|---|
| tradbot-2 | Layer-1 de-vigged consensus (NFL odds via The Odds API) | LIVE (Sunday refresh/close routines) |
| cooper | Breaking news pulses 08:00 / 13:00 / 16:00 CT | LIVE |
| event-request-desk | Ingest validation of feeds/refresh files | LIVE (Sunday checks) |
| overheard | Public-bias / forum & X chatter readouts | LIVE (bias files; re-checks 08:00, 10:50) |
| sherlock | OSS tools/data-source hunter + ToS evaluations | ACTIVE (ad hoc, no schedule known) |
| webby | Historical crawls (weather, coaching); FTN charting ingest queued post-Sunday | ACTIVE (no routine) |
| competitor-watching | Sportsbook rules snapshots + daily diff | LIVE (daily diff; schedule time UNKNOWN) |
| hiring-activity-monitor | Hiring radar sweeps | First sweep done 2026-10-16; schedule UNKNOWN |
| signal-prospector | Prospect signals | UNKNOWN (no summary filed) |
| ai-search-visibility, market-researcher, mr-toms, researchy, stalk-bot | (see agent profiles) | IDLE — no tasking yet |

## 2. Live schedules (CT)
tradbot-2 (two routines, one Odds API pull per slot, ~6 credits each):
- Refreshes Sun 10/18: 07:15 (HOU@JAX), 07:55 (HOU@JAX T-30), 10:45 (12 games incl. RO-01 fix), 11:30 (noon slot), 13:35 & 14:35 (ARI@LAR), 13:55 & 14:55 (BUF@LV, LAC@KC), 17:50 & 18:50 (DAL@GB); Mon 10/19 17:40 & 18:40 (WAS@SF). Writes `blackboard/layer1/week6/refresh/<YYYY-MM-DDTHHMMCT>/`.
- Closes: Sun 08:25, 11:55, 15:00, 15:20, 19:15; Mon 19:10. Writes `blackboard/layer1/closes/week6/` (one file per game, is_close true, never overwritten; folder created at first close).
event-request-desk: Sun 10:15 and 11:15 checks; one-day routine validating each refresh at 08:05, 11:40, 13:45, 14:05, 14:45, 15:05, 18:00, 19:00 (never early, ≤5 min late, self-deletes); Mon 17:50, 18:50. Read-only; writes reports to `blackboard/ingest/`. Snapshot hash baseline: `ingest/snapshot-baseline-2026-10-16.sha256` (23:40 CT Sat). No Sat 12:00 CT run was ever scheduled; the first report landed Sat 01:58 CT (resolved).
cooper: 08:00 briefing, 13:00 and 16:00 alerts daily; PIT@TB NWS wind re-pull Sun 11:05. Writes `blackboard/news/<date>_<HHMM>CT.json`.
overheard: re-checks Sun ~08:00 (HOU@JAX, due 08:15) and 10:50 (due 11:15). Writes `blackboard/bias/week6/<date>_<HHMM>CT.json` + .md.
DIV-2 Lead: daily status routine 17:00 CT (output relayed to MAIN manually).

## 3. Data contract
Envelope: v2 `/workspace/gse/schemas/blackboard-envelope-v2.json` (sha256 fffac7a0…13d6; adds BIAS to layer2_relevance). v1 valid until 2026-11-01 00:51 CT. Required fields: $schema, agent_id, division, timestamp_ct, provenance_urls, reliability_weight, layer2_relevance, consumes_from, produces_for, lease_version. Schema owner: company-docs-q-a.
Rules: write tmp then rename; reliability_weight 0 until calibrated; corrections = new file with higher lease_version + superseded_by on old (no in-place edits); markers archive_only / test_only / superseded_by; X citations by fleet canonical row_id.
Paths:
- Layer-1: `blackboard/layer1/week6/<AWAY>@<HOME>.json` (13 Friday baselines, captured_at 2026-10-16T20:19:07Z = 15:19 CT Fri; DO NOT overwrite), `week6/snapshots/2026-10-16/` (archive_only), `week6/test/2026-10-16_friday_raw/`, `week6/test/close_dryrun/`, `week6/test/refresh_dryrun/`, `week6/refresh/…`, `closes/week6/`. Fields: generated_by tradbot-2, agent_id div2-layer1-consensus, consensus (equal-weight multiplicative de-vig, primary), consensus_sharp_weighted (Pinnacle 3.0, offshore & LowVig 0.5, others 1.0; NO_SHARP_BOOK_AVAILABLE), modal line + off_line_books, LINE_TIE_TOTAL + tied_lines, excluded_stale (>5 min), THIN_AFTER_STALE (<4 books), is_close.
- News: `blackboard/news/` current = `2026-10-17_1600CT.json` lease 2 (approved); `news/archive/`, `news/snapshots/` (NWS, archive_only). Rule: official injury report > media > X; never blend numbers across sources.
- Bias: `blackboard/bias/week6/` current = `2026-10-18_0210CT.json` lease 5 (envelope v2, BIAS). Splits labeled public_x_unverified; tags stale_splits_only, provisional_pending_1050, DO_NOT_BLEND, layer1_context.
- Historical: `div2/webby/weather/*.csv` (3,028 games 2015–2025), `div2/webby/coaching/` (1,107 staff rows, 1,946 mentor edges); manifests `blackboard/historical/{weather,coaching}/manifest.json`.
- Rules: `blackboard/rules/` (baseline-2026-10-17.json, DK retail addendum, nfl-comparison/2026-10-17/).
- Tools: `blackboard/tools/oss-nfl-tools-scan-2026-10-17.json` + `__lease2.json`, `x-dm-leads-eval-2026-10-18.json`, `x-search-leads-eval-2026-10-18.json` (lease 3) + pass1 rowid remap.
- Reference: `/workspace/gse/reference/walrusquant-sports-analytic-skills@0f90d24/` (read-only, SHA256SUMS).
- Ops: `blackboard/ops/cfbd-usage.jsonl`.
- Handoffs: `blackboard/handoffs/div1/x-search-injury-news-2026-10-18.jsonl`.
X ingest use: MAIN produces `blackboard/ingest/x-dms/2026-10-18/` (ingested.jsonl, profile-intel.jsonl, unclear-log.jsonl, progress.json, routing.md; row_ids on all rows) and `ingest/x-search/` + `/workspace/xsearch/` (MAIN workspace). sherlock reads tool_or_data_source rows → tools evals; routes injury/news rows to DIV-1. overheard reads splits/chatter → bias files. DIV-2 never treats X splits as verified book data.

## 4. Code and scripts
No git repo for /workspace/gse (not a repository). Branches: N/A.
- `/workspace/gse/build_l1.py` (Python 3, stdlib only: json, glob, os, re, statistics, collections, datetime, argparse). Args: positional game slugs, `--skip`, `--out`, `--close` (close mode writes once, refuses overwrite); now refuses to write top-level week6 files. Input: cached raw Odds API pulls (e.g. `nfl_odds_2026-10-16T20:19:07Z.json`, 24 events; exact dir UNKNOWN). Env var name for Odds API key: UNKNOWN.
- `/workspace/gse/build.py`: exists; purpose UNKNOWN.
- `blackboard/ingest/tools/validate.py` (Python, local-only, no network).
- `div2/webby/weather/build_weather.py`, `div2/webby/coaching/{build_coaching.py,confirm_hc.py,apply_official.py}`, `div2/webby/publish/publish.py` + `schema.json` (Python; hosts: nflverse GitHub raw, archive-api.open-meteo.com, wikipedia, nfl.com, team sites). No CFBD.
- CFBD key env var name: CFBD_API_KEY (DIV-2 bots make no CFBD calls except sherlock's 1 GET /info).
- Dependencies beyond stdlib: UNKNOWN per script.

## 5. Current state (verified)
- Sat 13:10 CT: tradbot-2 integrity PASS — 13 baselines = snapshots (e.g. BAL 60.53/CLE 39.47, CAR 61.86/PHI 38.14); credits 491 after Friday pull.
- 13:09 CT snapshot mtimes = box restore artifact (cleared).
- Routines saved Sat 23:45 CT (tradbot-2) and 23:39 CT (event-request-desk).
- News 1600CT v2 (cooper, re-approved): Hurts IR (≥4 games); A.J. Brown activated (patriots.com 15:00 CT Sat), questionable; Caleb Williams start reported, UNVERIFIED until ~10:30 CT inactives; Lamar out/Huntley; Croskey-Merritt OUT; Sigle OUT media_unofficial; FBS finals FLA 27–TEX 24, LSU 31–MSST 0, OSU 19–IND 15; Sayin multi-week.
- Bias 0210CT: DAL@GB total 53–53.5 (L1 median 53.0); provisional Promotes BAL@CLE, LAC@KC; PIT@TB total Insufficient.
- CFBD audit: DIV-2 = 1 call; ~577 unexplained fleet-wide; rotation going to Garrett.

## 6. Known bugs / open issues
- RO-2026-10-17-01 (MEDIUM): stale betus quotes in CAR@PHI Friday file; fix at 10:45 refresh; do not calibrate on Friday CAR@PHI.
- RO-2026-10-18-12 (MEDIUM): competitor-watching rules batch Reject 16/20=80% (Fanatics 403 to import-bot even with browser UA; Pinnacle n/a row fails). Escalating evidence bar to DIV-3 Lead.
- validate.py v1-only layer2_relevance enum: FIXED Sun ~04:18 CT (enum by $schema; backup validate.py.bak-20261018).
- bias/week6/2026-10-18_0210CT.json lacks $schema (LOW); next bias file to include it.
- /cursor/stores unmounted (persistence risk).
- CHI@ATL +5 total single-source, unverified.
- File/line references: UNKNOWN.

## 7. Coding asks
1. Close-capture verifier: script that checks `layer1/closes/week6/` has one is_close file per game within ±10 min of slot. Accept: passes on Sun data, flags missing; test with `layer1/week6/test/close_dryrun/`.
2. Envelope v2 validator CLI usable by all bots. Accept: validates every file in `blackboard/bias/week6/` and `news/`; 0 false FAIL on current files.
3. Put /workspace/gse under git (no secrets; .gitignore caches). Accept: repo with build_l1.py, validate.py, webby scripts; README run commands.
4. FTN charting loader (nflverse ftn_charting, 2023–current). Accept: row counts match release; envelope v2 manifest; attribution "FTN Data via nflverse".
5. CFBD wrapper that logs every call to `ops/cfbd-usage.jsonl` before request. Accept: unlogged call impossible via wrapper.

## 8. Constraints
- CFBD: engine use OK (commercial/training allowed; no scraping/redistribution). Free tier, 399/1000 left until Oct 31 19:00 CT. Log every call; bulk pulls need DIV-2 Lead sign-off.
- NFL NGS (incl. nflverse ngs-data, NGS parts of nflreadpy/nflreadr/nflverse-data): BLOCKED for engine.
- SumerLive/SumerSports: manual viewing only (no scraping, commercial, AI/ML).
- SICscore, Substack charting, Game on Paper, MIT visionbook (CC BY-NC-ND): manual reading only.
- FTN charting: OK internal (CC BY-SA 4.0); publishing derivatives needs Garrett.
- WalrusQuant skills: reference text only at pinned SHA; no scripts.
- Odds API: ~108 credits planned Sun/Mon, cap 200 of 491.
- No external messages, public posts, spend, or production promotion without Garrett via MAIN.

## 9. Unknowns
- Odds API key env var name; raw cache directory path; build.py purpose; per-script third-party deps.
- Schedules of competitor-watching daily diff, hiring-activity-monitor, sherlock.
- signal-prospector status; roles/outputs of idle bots.
- Source of ~577 CFBD calls.

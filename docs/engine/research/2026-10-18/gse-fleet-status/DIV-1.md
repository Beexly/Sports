# DIV-1 Lead Status Report (Football Intel, Layer 2)
Written: Sun 2026-10-18 4:16 AM CT by DIV-1 Lead (💚🏈 DIV-1 Lead · Football Intel, agent id 3115cea2-43ab-41d6-8735-38316989434d).
Audience: Garrett's coding agent. Every claim below was checked against files on the box at writing time, or is marked "per bot report" or UNKNOWN.
Mission: Layer-2 situational football intel (NFL Week 6 and FBS) that sits on top of the Layer-1 market floor. "We sell understanding, not picks."

---
## 1. Roster
Roles come from /home/box/agent-data/agents/<id>/profile.json (`description` field; the `role` field is null for every bot). Live means the bot responded overnight Oct 17–18.

| Bot | Agent id | One-line role (profile.json) | Status |
|---|---|---|---|
| 💚🏈 DIV-1 Lead · Football Intel | 3115cea2-43ab-41d6-8735-38316989434d | Division leader. Makes decisions, approves processes, reports only to GSE MAIN BOT (0c671b12-97a1-458f-a611-d91d1f1dc9d8) | live |
| 🩶🏈 x-brief | 71e5c592-6f4a-4048-90c4-ce48fd71dab2 | Social narrative and breaking football intel digest from public X, read-only, never posts | live |
| 🩶🏈 account-book | c0f4a627-4277-4725-af9c-895fa7170aed | Program and opponent dossiers for 32 NFL and 134 FBS teams, weekly Mondays 06:00 CT | live |
| 🩶🏈 account-research | e9a10aa7-0312-4a0d-8f7b-3cd0a5f7f98d | Deep dives on single matchups and conflicts; keeps conflicting injury and snap reports side by side | live |
| 🩶🏈 last30days | fc99b9e1-709a-4d1a-9987-fa9f20778729 | Rolling 30-day regime and form recalibrator (EPA/play, injury returns, referee rates; flags shifts >1.5σ) | live |
| 🩶🏈 echo | 325502e3-6318-44a0-8ce8-ecd2359344e3 | Post-game debriefs on line moves and where Layer-2 premises hit or missed (Diagnostic Audits) | live |
| 🩶🏈 event-producer | 3bae5f29-9f83-4b31-adbc-3999a183562e | Game-day countdowns (T-90 inactives, T-60 line freeze, T-30 weather lock, T-0 snapshot) | live |

External, not DIV-1: GSE MAIN BOT 0c671b12-97a1-458f-a611-d91d1f1dc9d8 (fleet orchestrator, runs the X ingest); 🩶📡 sherlock 1822115a-c930-4008-920a-c9346749f74d (DIV-2, handoffs to DIV-1); tradbot-2 (DIV-2, owns the Layer-1 baselines; agent id UNKNOWN).

## 2. Live schedules
VERIFICATION NOTE: the agent dirs /home/box/agent-data/agents/<id>/ contain only assets/, attachments/, profile.json, settings.json and store.db. settings.json holds only `notifyOnAgentUpdates`. No routines or automation folder exists, so cron expressions are UNKNOWN; the routines are platform-scheduled and not stored as files we can read. The countdown times are verified against /workspace/gameday/countdown_spec.md (79 lines, mtime Oct 18 1:05 AM CT). Everything else is per bot report.

### event-producer countdowns (spec: /workspace/gameday/countdown_spec.md)
- Routines fire about 10 minutes before each checkpoint (spec addendum, Lead decision Sat Oct 17 10:05 CT). Checkpoint targets are in spec §1. Fire times per the Lead's schedule:

| Window (CT) | T-90 fire | T-60 fire | T-30 fire | T-0 fire (addendum c, kickoff minus 20) |
|---|---|---|---|---|
| Sun 8:30 AM London HOU@JAX | 6:50 AM | 7:20 AM | 7:50 AM | 8:10 AM |
| Sun 12:00 PM slate | 10:20 AM | 10:50 AM | 11:20 AM | 11:40 AM |
| Sun 3:05 / 3:25 PM | 1:25 PM | 1:55 PM | 2:25 PM | 2:45 PM (3:05) and 3:05 PM (3:25) |
| Sun 7:20 PM DAL@GB | 5:40 PM | 6:10 PM | 6:40 PM | 7:00 PM |
| Mon 7:15 PM WAS@SF | 5:35 PM | 6:05 PM | 6:35 PM | 6:55 PM |

- Writes: /workspace/gameday/blackboard/<YYYY-MM-DD>_<HHMM>_<T90|T60|T30|T0>.json, with supplements as <...>_T0_supp1.json (or _T90_supp1). Raw pulls go to /workspace/gameday/raw/.
- T-0 (addendum c, 9:18 PM CT Oct 17): capture on fire; if the run is still active near kickoff minus 2, take a second capture and mark the later pre-kickoff one canonical. Flag LATE only if no capture lands before kickoff minus 2.
- A window's routine deletes itself after its last T-0. The weekend summary is written after the Mon 7:15 PM T-0 (spec addendum, 4:13 PM CT Oct 17).
- Platform schedule ids and cron strings: UNKNOWN.

### Other routines and one-offs (per bot report; no routine files found)
| Owner | When (CT) | What | Writes |
|---|---|---|---|
| x-brief | Sat ~11:30 PM (CFB, done: file mtime Oct 17 11:39 PM) | Post-game CFB injury sweep | /workspace/x-brief/postgame-injuries-2026-10-17.md |
| x-brief | Sun 7:00 AM | Morning follow-up sweep (Utah, Cal, ACC final report, open checks) | /workspace/x-brief/ (exact filename UNKNOWN) |
| x-brief | Sun ~10:30 PM (NFL) | Post-game NFL injury sweep | /workspace/x-brief/postgame-injuries-2026-10-18.md |
| x-brief | Tue ~12:30 AM (MNF) | Post-game MNF injury sweep | /workspace/x-brief/postgame-injuries-2026-10-19.md (expected name; UNKNOWN until written) |
| account-book | Sun 6:00 AM | SF dossier check | account-book store dossiers (below); exact file UNKNOWN |
| account-book | Mon 10/26 (time UNKNOWN; profile says Mondays 06:00) | Weekly dossier refresh | /cursor/stores/store-bb9111ab-4200-4cfb-87b1-5aff46dede3c/dossiers/{nfl,fbs}/ |
| account-research | ~7:05 AM | HOU@JAX inactives check | /workspace/account-research/situational-reads/supp/HOU-at-JAX-2026-10-18-* |
| account-research | ~7:20 AM | HOU@JAX line check (XS-HJ-3 Dell OUT, XS-HJ-4 Jawhar Jordan elevated) | same supp folder |
| account-research | 10:32–10:45 AM | Final verification pass over all X rows | /workspace/account-research/situational-reads/supp/ |
| account-research | ~10:48 AM | Line-flag pass (57 market-tagged skipped rows) | same supp folder (filename UNKNOWN) |
| account-research | ~6:45 PM | DAL@GB NWS and inactives | /workspace/account-research/situational-reads/supp/DAL-at-GB-* |
| tradbot-2 (DIV-2) | 7:15 AM (HOU@JAX), 10:45 AM | Layer-1 baseline refresh | /workspace/gse/blackboard/layer1/week6/<AWAY>@<HOME>.json |
| echo | due Mon 10:00 AM | NFL Week 6 debriefs | /cursor/stores/store-023834e1-1538-484d-9590-7f943b6a629f/debriefs/ |

## 3. Data contract
Common envelope (I call it v2; no file has an `envelope` or `schema_version` key, so "v1/v2" is a lead label, not a field). Keys: `agent_id, division, timestamp_ct (ISO with -05:00), provenance_urls[], reliability_weight (0), layer2_relevance (SITUATIONAL | NONE_PURE_LAYER1), consumes_from[], produces_for[], lease_version (int)`. Write <file>.tmp, then rename. Never overwrite another bot's file; bump lease_version or write a __leaseN / _suppN sibling.

| Path | Owner | Format / key fields | Consumers |
|---|---|---|---|
| /workspace/gameday/countdown_spec.md | DIV-1 Lead | Markdown spec + addenda (incl. (c) T-0 timing, (d) CFBD) | event-producer |
| /workspace/gameday/countdown_spec.v1_pre-restore-check.md, countdown_spec_rebuild.md | Lead (historical) | Pre-restore copy and rebuild; NOT canonical | none |
| /workspace/gameday/blackboard/*.json (19 files Oct 17) | event-producer | Envelope + `checkpoint, window, late, games[]`. T0 adds `kickoff_ct, target_capture_ct, late_actual_ct, miss_log, framing`. T30 adds `carried_finals, availability_fold, flags_for_layer2`. lease_version 1 | Lead, echo, account-research |
| /workspace/gameday/raw/ (16 files) | event-producer | Raw ESPN/NWS JSON (espn_*.json, nws_*.json, coords_1430.json) plus capture scripts | event-producer |
| /workspace/gameday/verification_*.json | event-producer | Verification logs (schema not sampled: UNKNOWN) | Lead |
| /workspace/x-brief/*.md | x-brief | Markdown digests (digest-2026-10-16.md, cfb-availability-2026-10-17*.md, postgame-injuries-2026-10-17.md); *.reconstruction.md are restore rebuilds | event-producer (T-90), Lead, account-research |
| /workspace/x-brief-recovery/{cfb,digest}.{head,tail}.md | x-brief | Fragments recovered after the 1:08 PM CT Oct 17 restore | reference only |
| /workspace/gse/last30days/nfl_wk1-6_flags.json, nfl_wk1-6_injury_returns_v2.json, nfl_wk1-6_crews_fz.json | last30days | CANONICAL. Envelope JSON | account-research, Lead |
| /workspace/gse/last30days/fbs_oct17-18_*flags*.json | last30days | FBS flags (cfbd variants carry consumes_from CFBD) | account-book, Lead |
| /workspace/gse/last30days/*_rebuild_1310.* | last30days | NON-CANONICAL post-restore rebuilds; treat as provenance_degraded | none for premises |
| /workspace/gse/last30days/restored_1307/ | last30days | Restored copies of the originals plus scripts (Oct 17 1:07 PM CT) | reference |
| /workspace/gse/last30days/data/*.parquet | last30days | nflverse / sportsdataverse pulls dated Oct 17 (the Oct 16 raw pulls were lost; see LOST_RAW_DATA.md) | last30days scripts |
| /workspace/gse/last30days/data/LOST_RAW_DATA.md | last30days | Loss log | everyone |
| /workspace/gse/last30days/data/cfbd/plays_{2025_1..15,2026_1..7}.json (22) | last30days | CFBD /plays cache; reuse to avoid calls | fbs_cfbd_backfill.py |
| /workspace/gse/last30days/data/fz/ | last30days | footballzebras crew cache (contents not sampled) | nfl_crews_fz.py |
| /workspace/account-research/situational-reads/{BAL-at-CLE,CAR-at-PHI,PIT-at-TB}-2026-10-18.{json,md} | account-research | Envelope + `verdict` (Promote/Reject/Insufficient Data). lease_version 5 / 8 / 5, timestamp_ct 2026-10-17T22:05-05:00 | Lead, echo |
| /workspace/account-research/situational-reads/supp/<GAME>-2026-10-18-{xsearch,xdm}-supp[-addendumN].{json,md} | account-research | Envelope + `game, ingest_pass, citation_rule, row_count, rows[], supplements, notes, provenance`. Item ids XS-<GAME>-<n> | Lead, event-producer |
| /workspace/gse/blackboard/layer1/week6/<AWAY>@<HOME>.json (14) + README.md, snapshots/, test/ | tradbot-2 (DIV-2) | Layer-1 baselines (CAR@PHI timestamp_ct 2026-10-16T15:19:17-05:00, lease_version 1) | event-producer T-60, account-research |
| /workspace/gse/blackboard/news/2026-10-17_1600CT.json (+ archive/, snapshots/) | UNKNOWN (non-DIV-1) | Schema UNKNOWN (not sampled) | DIV-1 reads |
| /workspace/gse/blackboard/bias/week6/2026-10-18_{0025,0050,0135,0200,0210}CT.{json,md} | UNKNOWN (non-DIV-1 bias owner) | Schema UNKNOWN (not sampled). 0050CT.json holds the DAL@GB 52.5 claim citing bias:541/542 | DIV-1 reads |
| /workspace/gse/blackboard/ingest/x-search/2026-10-18/ | GSE MAIN BOT (agent_id gse-main-bot/executor:x-search-ingest) | JSONL rows: envelope + `row_id, post_id, url, author, text, posted_at_utc, ingest_pass, signal_tags, signal_score, week6_games, dfs_flag, hype_flag, tout_bio_flag, repair_note`. Files: situational-intel, bias-chatter, dfs, tools-data, training-quant, unclear-log (.jsonl), new-authors.json, queries.json, summary.md, versions/{pass2,pre-ro}/ | account-research, sherlock |
| /workspace/gse/blackboard/ingest/x-dms/2026-10-18/ | GSE MAIN BOT | JSONL: envelope + `row_id, legacy_row_id, post_id, url, author, kind, tags, promo_flag, text`. Files: ingested, profile-intel, training-and-tools, unclear-log (.jsonl), progress.json, routing.md, README.md, summary.md, versions/{pre-canon,pre-ro,pre-ro13}/ | account-research, account-book |
| /workspace/gse/blackboard/ingest/row-id-map-2026-10-18.jsonl | GSE MAIN BOT | `{legacy_row_id, row_id, post_id, file}` | all citers |
| /workspace/gse/blackboard/handoffs/div1/x-search-injury-news-2026-10-18{,-pass2}.{jsonl,md} | sherlock (DIV-2) | Same row envelope; 107 rows (pass 1, rebuilt 01:12 CT) and 104 rows (pass 2); weight 0 | account-research |
| /workspace/gse/blackboard/ops/cfbd-usage.jsonl | fleet-shared (append-only) | `{ts_ct, bot, division, endpoint, calls, purpose[, retroactive]}`; 10 lines at 2:10 AM CT | GSE MAIN BOT |
| /cursor/stores/store-bb9111ab-4200-4cfb-87b1-5aff46dede3c/dossiers/{nfl,fbs}/ + schema.json | account-book | Dossier JSON per schema.json (Oct 16 2:12 PM CT) | account-research, Lead |
| /workspace/account-book/ (OSU_backup_2026-10-18_0023CT.json, fbs_index_backup_2026-10-18_0023CT.json, backup_pre_merge_2026-10-17_1611CT/, staged/{OSU,PHI,WAS-SF}_2026-10-17.json) | account-book | Backups and staged weight-0 merges | account-book |
| /cursor/stores/store-023834e1-1538-484d-9590-7f943b6a629f/debriefs/2026-10-17_OSU-at-IND_pilot.json | echo | Debrief pilot (LEAD_APPROVED, premises INSUFFICIENT_DATA per echo) | Lead |
| /workspace/sb.json (copy in /workspace/account-book/staged/sb.json) | UNKNOWN | ESPN scoreboard dump: keys `events, groups, leagues, provider, week`. No valid retrieval time, so NEVER use it as a close | none |

### ID rules
- x-search: `row_id = sha1('https://x.com/i/status/' + post_id)[:16]`. Per account-research (1:30 AM CT), 9,798 of 9,798 live row_ids match, with none missing and none repeated.
- x-dms: rows rehashed the same way; the old id is kept in `legacy_row_id`.
- Map: /workspace/gse/blackboard/ingest/row-id-map-2026-10-18.jsonl.
- Cite rows as row_id plus URL, never file:line.

### How DIV-1 uses the X ingest
- account-research verifies rows against official sources (team transactions pages, NFL.com injury and reserve wires, club injury tables) and writes weight-0 supp rows (XS-*/XD-* items) cited by row_id plus URL, with VERIFIED / CONFLICT / INSUFFICIENT status. Pass 3 counts: 505 new, 0 duplicates, 94 used, 411 skipped (57 market-tagged, kept for the 10:48 pass).
- account-book merges x-dms profile-intel.jsonl into dossiers as staged, weight-0 entries (/workspace/account-book/staged/), with backups first.
- sherlock (DIV-2) hands off injury and news rows in /workspace/gse/blackboard/handoffs/div1/. Discard anything read from the pass-1 file before 01:12 CT; it was rebuilt in place.
- Line-number churn, pass 1 to pass 3: MAIN rewrote the files at about 1:02 CT, moving DFS rows to dfs.jsonl and tightening rows, so sit:/bias: line citations moved. Stable row_ids were added in pass 3, with a pass-2 snapshot in versions/pass2/ and removals in removed.jsonl.
- Remap correction: MAIN's 5 remap ids were taken from versions/pass2 line numbers and point to the wrong posts. The correct ids, checked by URL (account-research, 1:30 AM CT):
  - sit:884 → b52298f0691dae57 (CoverTheSlate/2111434383135482281, dfs:110)
  - sit:2182 → d3c667569271961f (ZBerm/2111552537375772792, unclear-log:1069)
  - bias:345 → ddc6f932e2b43f90 (10DFSQuestions/2111635450360107418, dfs:280)
  - bias:541 → 80645c6a9dc0f95e (FairLineNFL/2111066290517389813, dfs:408)
  - bias:542 → b847e53bb26bd6dd (FairLineNFL/2110401905935397317, dfs:410)
  - Related file: /workspace/gse/blackboard/tools/x-search-leads-eval-2026-10-18__pass1-rowid-remap.json (owner UNKNOWN; not checked against the above).

## 4. Code and scripts
- Repos and branches: none. There is no .git under /workspace or /workspace/gse, so repo and branch are UNKNOWN / none.
- Language: Python 3 for everything found. Common dependencies: pandas, numpy, pyarrow, json, zoneinfo, urllib.request.
- How to run: `python3 <path>`. Entry points are top-level scripts with no argparse, run from their own directory (cwd assumption UNKNOWN). fbs_cfbd_backfill.py has a `MODE`/batch variable (values UNKNOWN).

| Path | mtime (CT) | Purpose / inputs |
|---|---|---|
| /workspace/gse/last30days/nfl_regime_backfill.py | Oct 17 1:09 PM | NFL regime flags → nfl_wk1-6_flags.json (nflverse pbp, injuries, snaps, officials) |
| /workspace/gse/last30days/nfl_injury_rekey.py | Oct 17 1:09 PM | → nfl_wk1-6_injury_returns_v2.json |
| /workspace/gse/last30days/nfl_crews_fz.py | Oct 17 1:09 PM | footballzebras crews → nfl_wk1-6_crews_fz.json |
| /workspace/gse/last30days/fbs_regime_backfill.py | Oct 17 1:09 PM | FBS flags from sportsdataverse parquet |
| /workspace/gse/last30days/fbs_cfbd_backfill.py | Oct 17 1:09 PM | FBS flags from CFBD /plays cache. Its docstring says the key is read from env only by a separate curl fetch step (that fetch script/command is UNKNOWN; not in this dir) |
| /workspace/gse/last30days/*_rebuild_1310.py | Oct 17 1:09 PM | Non-canonical rebuild variants |
| /workspace/gse/last30days/restored_1307/*.py | Oct 17 1:09 PM | Restored originals |
| /workspace/gameday/raw/t0_1800.py, t0_1830.py | Oct 17 5:52 / 6:25 PM | ESPN CFB scoreboard T-0 capture (site.api.espn.com ... college-football/scoreboard) |
| /workspace/gameday/raw/t30_1430.py | Oct 17 1:52 PM | NWS points → forecastHourly weather lock |
| /workspace/gameday/raw/*.py (others) | see ls | UNKNOWN beyond the three above (not opened) |

- Env var NAMES used by DIV-1: `CFBD_API_KEY` (present in the box env; value never printed). No `os.environ` / `getenv` call was found in the DIV-1 scripts above. Other key names exist in the box env (ODDS_API_KEY, THERUNDOWN_API_KEY and others), but DIV-1 use of them is UNKNOWN and believed none.
- External APIs:
  - CFBD: 399/1000 calls left as of 1:04 AM CT Oct 18; resets Oct 31 7:00 PM CT. DIV-1 used ~23 (last30days, Oct 17 7:59–8:13 AM CT) plus 1 unmetered 401 on Oct 16 6:20 PM CT.
  - Public ESPN scoreboard API (DraftKings lines, labeled live@HH:MM CT).
  - NWS api.weather.gov; UK Met Office public pages for Wembley.
  - X public reads: 30 per minute, 1,000 per day.
  - nflverse / sportsdataverse GitHub releases; footballzebras.com.

## 5. Current state of today's work (all weight 0 unless official; sources are the files below)
Verdicts (files under /workspace/account-research/situational-reads/, timestamp_ct 2026-10-17 10:05 PM CT): BAL@CLE Promote (lease 5), CAR@PHI Promote (lease 8), PIT@TB Promote (lease 5). Per account-research at 1:30 AM CT, pass 3 made no premise changes.

Supp folder: /workspace/account-research/situational-reads/supp/ (final 10:32–10:45 AM CT pass still pending).
- PHI: Hurts on IR, so McKee starts (XS-CP-1/XS-CP-2, CAR-at-PHI-2026-10-18-xsearch-supp.md). Barkley OUT; Dickerson, Bennett and Stowers OUT (XS-CP-12, ...-addendum3.md).
- BAL: Lamar OUT, Huntley starts (XS-BC-1, BAL-at-CLE-...-xsearch-supp.md; re-cite XS-BC-8, addendum3). Lane Wrist Questionable on NFL.com (XS-BC-6, addendum2). C12 Lane activation CONFLICT stays open: no transaction; the BAL log's latest entry is 10/13 (XS-BC-7, addendum3).
- TB: Winfield Jr. and Sills OUT (XS-PT-1, PIT-at-TB-...-xsearch-supp.md). Stick and Josh Williams elevated, VERIFIED via buccaneers.com transactions 10/17 (XS-PT-9, addendum3).
- TB: Mayfield OUT. Per lead brief, not located by item id in this pass, so the source row is UNKNOWN.
- PIT: Metcalf has no designation / off the injury report (XS-PT-7, addendum2). A "Metcalf Q" headline is kept side by side as CONFLICT (XS-PT-8).
- NYJ: Breece Hall OUT (XS-NJ-14 re-cite, NYJ-at-NE-...-addendum3.md).
- KC: Rashee Rice OUT (XS-LK-8). LAC: Derwin James OUT, Hamstring (XS-LK-3, LAC-at-KC-...-addendum2.md).
- SF: Bosa OUT for MNF (XS-WS-1, WAS-at-SF-...-xsearch-supp.md).
- GB: Parsons not available (PUP; XS-DG-12, DAL-at-GB-...-addendum2.md). Hargrave, Ford and Skyy Moore on IR; Savion Williams activated off IR 10/17 (XS-DG-10 addendum2, XS-DG-14 addendum3).
- CHI: Caleb Williams Hamstring Questionable stands; "cleared" is INSUFFICIENT (XS-CA-4 addendum1, XS-CA-8 addendum3).
- Open conflicts per account-research (1:30 AM CT): Evans "ruled out" vs NFL.com Q; Puka "questionable" vs no official listing. Omar Cooper and Lambert-Smith (LAC, not KC) claims are INSUFFICIENT.
- x-brief CFB post-game sweep: /workspace/x-brief/postgame-injuries-2026-10-17.md (Oct 17 11:39 PM CT; weight 0, unverified).
- CFBD fleet count: DIV-1 total ~23 metered calls, all last30days (Oct 17 7:59–8:13 AM CT). All 6 bots reported; account-research reported 0 at ~1:07 AM CT Oct 18. Log: /workspace/gse/blackboard/ops/cfbd-usage.jsonl.

## 6. Known bugs and open issues
| # | Issue | Repro / evidence | Severity |
|---|---|---|---|
| B1 | Platform routine fire delays of ~7–10 min | /workspace/gameday/blackboard/2026-10-17_2115_T0.json: target_capture_ct 21:13:00, actual 21:15:17, late:true. 2026-10-17_2130_T0.json: captured 21:27:47 (on time). Mitigated by addendum (c) at kickoff minus 20 | Medium |
| B2 | Oct 17 1:08 PM CT restore incident | Many files share mtime Oct 17 1:09 PM CT. x-brief files were partly reconstructed (/workspace/x-brief/*.reconstruction.md, /workspace/x-brief-recovery/). The Oct 16 nflverse raw pulls are lost (/workspace/gse/last30days/data/LOST_RAW_DATA.md); *_rebuild_1310.* files are non-canonical | High (historical, contained) |
| B3 | x-search line-number instability | Passes 1–3 rewrote files (versions/pass2/, versions/pre-ro/), so file:line citations broke. Fixed by row_id | Medium (fixed; enforce) |
| B4 | Wrong remap ids from MAIN | See §3 remap correction. bias:541/542 also appear in /workspace/gse/blackboard/bias/week6/2026-10-18_0050CT.json (DAL@GB 52.5), whose owner needs to fix it | Medium |
| B5 | CFBD ~601 calls unaccounted | /workspace/gse/blackboard/ops/cfbd-usage.jsonl. DIV-1 accounts for ~23; the remaining ~578 are from outside DIV-1 (owner UNKNOWN) | High (fleet quota) |
| B6 | Carried finals dropped at the 6:00 T-30 | The Sat 6:00 window T-30 file /workspace/gameday/blackboard/2026-10-17_1800_T30.json has no `carried_finals` key (rg found one only in 2026-10-17_2115_T30.json:52). Exact dropped items UNKNOWN | Medium |
| B7 | FSU@MIA exact kickoff time MISSING | Logged as MISSING in the gameday blackboard (exact file and line UNKNOWN; my rg for "FSU.*MIA.*MISSING" got no single-line hit) | Low |
| B8 | CAR@PHI Layer-1 baseline predates the Hurts IR move | /workspace/gse/blackboard/layer1/week6/CAR@PHI.json timestamp_ct 2026-10-16T15:19:17-05:00, lease_version 1. Refresh owned by tradbot-2 (7:15 / 10:45 AM CT) | Medium |
| B9 | C12 Lane activation conflict | /workspace/account-research/situational-reads/supp/BAL-at-CLE-2026-10-18-xsearch-supp-addendum3.md line 47 (XS-BC-7) | Low (stays out of premises) |
| B10 | sherlock pass-1 handoff pointed at the wrong rows before 01:12 CT | /workspace/gse/blackboard/handoffs/div1/x-search-injury-news-2026-10-18.md correction note; affected findings redone | Low (fixed) |

## 7. Coding asks (all proposed by the DIV-1 Lead; none approved by Garrett yet)
1. **Envelope validator.**
   - Goal: a shared validator for blackboard JSON/JSONL.
   - Inputs: /workspace/gameday/blackboard/*.json, /workspace/account-research/situational-reads/supp/*.json, /workspace/gse/blackboard/ingest/x-search/2026-10-18/*.jsonl.
   - Output: a script, /workspace/gse/blackboard/tools/validate_envelope.py (new), that prints PASS/FAIL per file with the missing keys.
   - Checks: the required keys listed in §3, lease_version is an int ≥1, reliability_weight == 0 for X-derived rows, timestamp_ct carries -05:00.
   - Also: a helper `atomic_write(path, obj, owner_agent_id)` that writes .tmp then os.replace, and refuses if the existing file's agent_id differs (raises).
   - Acceptance: every current file in those dirs is reported, no file is modified, and a fixture with a missing lease_version FAILs.
   - Must not: edit or rewrite any existing file.
2. **CFBD wrapper.**
   - Goal: every CFBD call is logged and bulk pulls are blocked.
   - Input: env `CFBD_API_KEY`.
   - Output: /workspace/gse/blackboard/tools/cfbd_client.py (new). Each call appends one line to /workspace/gse/blackboard/ops/cfbd-usage.jsonl `{ts_ct, bot, division, endpoint, calls, purpose}`. It refuses more than N calls per run (N configurable, default 3) unless `--div2-signoff <ref>` is given, and it reads the cache /workspace/gse/last30days/data/cfbd/ first.
   - Acceptance: tests mock HTTP (zero real calls), a cache hit logs calls:0 or nothing, and the key is never in a log, stdout or exception text (grep test).
   - Must not: make real CFBD calls in tests, print the key, or rewrite existing log lines.
3. **T-0 capture script.**
   - Goal: implement addendum (c).
   - Input: ESPN scoreboard URL plus kickoff_ct.
   - Output: /workspace/gameday/raw/t0_capture.py (new; replaces the ad hoc t0_1800.py pattern). It captures on start; if now < kickoff-2min, it sleeps until kickoff-2min and captures again. The T0 JSON gets `captures[]`, each with live@HH:MM CT, and the later pre-kickoff capture is marked `canonical:true`. late = no capture before kickoff-2.
   - Test data: /workspace/gameday/raw/espn_2115_T0.json, /workspace/gameday/blackboard/2026-10-17_2115_T0.json.
   - Acceptance: a dry-run with an injected clock gives the correct canonical flag and late flag, and the word "close" never appears.
   - Must not: overwrite an existing T0 file (write _supp1), or use the raw box clock without TZ=America/Chicago.
4. **row_id resolver/validator.**
   - Goal: resolve and verify citations.
   - Inputs: the row-id map, the ingest dirs and the supp JSONs.
   - Output: /workspace/gse/blackboard/tools/rowid_check.py (new). It checks `row_id == sha1('https://x.com/i/status/'+post_id)[:16]` for every row, resolves legacy_row_id → row_id, and flags any citation in the supp files that uses file:line, or whose row_id URL doesn't match the cited URL.
   - Acceptance: reports 9,798/9,798 OK on current data (per account-research's count), and resolves the 5 corrected ids in §3 to the listed authors.
   - Must not: modify the ingest files.
5. **Carried-finals checker.**
   - Goal: no carried final is ever silently dropped.
   - Inputs: the T60/T30/T0_supp files per window in /workspace/gameday/blackboard/.
   - Output: /workspace/gameday/tools/carried_finals_check.py (new). For each window, it lists the T-60 pending finals and confirms each appears at T-30 as FOUND (url + CT) or MISSING, or in a T0_supp.
   - Test data: the 2026-10-17_1800_* and 2026-10-17_2115_* files.
   - Acceptance: flags the 1800 window gap (B6) and passes 2115.
   - Must not: edit blackboard files.

## 8. Constraints
- Layer 1 is the market floor (tradbot-2 baselines, ESPN lines); Layer 2 is situational. "We sell understanding, not picks." No picks, W/L or confidence %.
- Ingest at weight 0 and kill nothing; conflicts stay side by side with timestamps, never merged.
- Verdicts are only Promote / Reject / Insufficient Data.
- Unofficial reports stay out of premises until an official transaction or injury report posts.
- ESPN numbers are labeled live@HH:MM CT, never "close" or "closing". /workspace/sb.json can never be used as a close.
- All times are CT (TZ=America/Chicago).
- Use the envelope with lease_version; write .tmp then rename; never overwrite another bot's file.
- Originals are canonical; rebuilds are marked provenance_degraded (*_rebuild_1310.*).
- No external messages, posting, spending or production promotion. Those route to GSE MAIN BOT for Garrett's approval.
- Never print or log secret values; env var names only.
- Cite X rows by row_id plus URL, never file:line.
- CFBD: log every call, game-week reads only, bulk pulls need DIV-2 sign-off through the DIV-1 Lead, reuse the cache.
- Missing values are written MISSING with a reason, never estimated.

Pending decisions from Garrett / blockers: none blocking as of 4:16 AM CT Oct 18. Approval of coding asks 1–5 and any production promotion or external posting needs Garrett via GSE MAIN BOT.

## 9. Unknowns
- Platform routine ids and cron expressions for every routine (no routine files on disk).
- x-brief Sun 7:00 AM output filename; account-book Sun 6:00 AM SF check output path; Mon 10/26 refresh time.
- account-research line-flag pass output filename.
- tradbot-2 agent id.
- Owners and schemas of /workspace/gse/blackboard/news/ and /workspace/gse/blackboard/bias/week6/.
- Owner and origin of /workspace/sb.json.
- The CFBD fetch step that reads CFBD_API_KEY (script path).
- Run cwd and MODE values for the last30days scripts.
- Which carried finals were dropped at the Sat 6:00 T-30.
- The file and line holding the FSU@MIA MISSING entry.
- The source row for Mayfield OUT.
- Who used the ~578 non-DIV-1 CFBD calls.
- Whether "envelope v1/v2" maps to any field: none exists in the files.

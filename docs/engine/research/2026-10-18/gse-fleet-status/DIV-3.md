# DIV-3 Lead status: Engine QA, Introspection & Arbitration (2026-10-18)
Author: DIV-3 Lead (86e9edd6-bb83-4be8-b653-2cfde5c7102c). Facts verified on the box between 04:14 and 04:17 CT on 2026-10-18 with ls, find, rg, jq and sha256sum. Anything not verified is marked **UNKNOWN**, with what would resolve it. No estimates. No secret values. No CFBD calls. Governing method: `/home/box/agent-data/workflows/gse-operating-methodology/SKILL.md` (§2 Three Laws, §4 Human gates, §5 envelope).

## 1. Roster
Profile: `/home/box/agent-data/agents/<id>/profile.json`. Each agent folder holds only `profile.json`, `settings.json` (key `notifyOnAgentUpdates` only), `store.db`, `assets/` and `attachments/`. **No routine definitions are stored in the agent folders**, so "enabled routine" is UNKNOWN for every bot (resolve: export routine config from the Grok Bot platform). "Live" below therefore rests only on a blackboard or registry write in the last 24 h (since 04:14 CT Oct 17), found by `agent_id` in the file. Caveat: many blackboard/div3 files carry the mtime 2026-10-17 13:09 CT, which looks like a bulk restore, so those mtimes don't prove the bot wrote at that time.

| Bot | id | One-line role (profile/charter) | Charter | Live/idle (evidence) |
|---|---|---|---|---|
| alfred | 514dfbef-b006-4ced-86e4-39f7097777bb | Fleet topology, dedup & drift governor (weekly audit of roles/skills/schedules) | none in /workspace/div3 | IDLE: no 24 h write found. Routine UNKNOWN |
| apple-search-ads-review | 2f3f420b-fd0b-4533-8853-d94b31010e48 | Feature-noise pruning & edge-efficiency auditor (Brier gain vs compute) | none | IDLE: no 24 h write found |
| company-docs-q-a | a12c7332-03c9-4dfc-bd7b-a76a3e4b4845 | Canonical spec & citation integrity (content hashes); owns schemas/README.md | none | IDLE: no 24 h write found by agent_id. schemas/README.md names it as owner, written 2026-10-17 02:02 CDT |
| deal-qualification | 394cfbfc-7151-4e56-aff3-400bf2c4b355 | Analytical thesis stage-gate (No-Maybe Law: Promote/Reject/Insufficient Data) | none | IDLE: no 24 h write found |
| dr-eggbot-v2 | d580bb78-67b2-4c55-a81b-31663e000e68 | Adversarial contrarian stress-tester (steel-manned counter-theses) | none | IDLE: no 24 h write found |
| engineer-bot | d88c7ff3-72de-4857-8b94-bb01084e7662 | Engine coding executor: one cloud session per approved RO, PR watch | `/workspace/div3/engineer-bot-charter.md` (APPROVED 2026-10-17) | LIVE by write: `blackboard/div3/engineering/sessions-log.json` (ts 2026-10-17T08:01-05:00, mtime 10-17 13:09). PR watch dormant |
| flora | 1c4411fa-62df-42a7-bb11-a73688cda208 | Bar registrar / introspection (registers frozen bars) | `flora-charter-v2.md` (+ `flora-charter-DRAFT.md`) | LIVE: registered IMP-003 v1/v2 and IMP-002 v3/v4/v5 in `/workspace/div3/bar-registry/` 01:54 to 02:20 CT Oct 18 |
| follow-through-agent | b6521a17-237b-4867-83cb-415d92ebba05 | Open-loop ledger keeper | `follow-through-agent-charter.md` | LIVE by write: `blackboard/div3/follow-through/open-loop-ledger.json` (mtime 10-17 13:09) |
| frank | f218c1a2-1e84-4757-a0cd-7a77aacf080a | Calibration (CAL bars, week-6 calibration runs) | `frank-charter-DRAFT.md` (draft) | IDLE by write: only `/workspace/div3/frank/input-discovery.json` (mtime 10-17 13:09; no agent_id check done). First CAL run due Sun 23:30 CT |
| import-bot | 888b9d06-ad14-4d8c-9e5c-d624345514b6 | Import QA on DIV-2 and MAIN BOT ingest; repair orders | `/workspace/drafts/import-bot-charter.md` | LIVE: 30 files in `div3/import-qa/2026-10-18/` (latest ts 02:15:37 CT summary) |
| nightly-audit-engineer | 9e0e57ec-8dfa-4260-940a-4b69fd81ff48 | Nightly engine health audit (secrets, envelopes, stale, CFBD) | `nightly-audit-engineer-charter-DRAFT.md` (DRAFT) | Ran 02:05 CT per its message. **Its audit output file was not found on the box** (rg for "145 of 220"/"65.9" hits only div4 SVGs). Live status = reported by bot, not file-verified |
| product-idea-stress-test | f28fdd6c-2daf-470d-bd7c-31c66be9b7a6 | Insufficient-Data re-check sweeps / thesis stress test | `product-idea-stress-test-charter.md` | IDLE: no 24 h write found |
| Projects Manager | 23e73637-d900-4761-95df-b2129e87d026 | Runs team projects from Notion (row per project, channel per project) | none | IDLE: no 24 h blackboard write |
| tinkabot | 59c59b17-3b64-4415-8202-38a40ec59dbe | Blind-spot detection (post-slate pass, Blind-Spot Digest) | `tinkabot-charter-DRAFT.md` (draft) | LIVE by write: one file with its agent_id modified in last 24 h (`blackboard/div3/blind-spots/`, mtime 10-17 13:09) |

Gray-switch confirmations still open per the Lead's log: alfred, follow-through-agent, product-idea-stress-test, Projects Manager. That is UNKNOWN from files (resolve: profile `avatarColor` check against the agreed gray value).

## 2. Live schedules (all America/Chicago)
| Routine | Time | Source | Verification |
|---|---|---|---|
| DIV-3 daily status to GSE MAIN BOT | cron `0 17 * * *` America/Chicago, flexible ±15 min | DIV-3 Lead | Reported by bot, not file-verified |
| import-bot nightly QA sweep | 01:30 CT daily; window 01:30→01:30 CT; health summary to Lead by 06:00 CT | `/workspace/drafts/import-bot-charter.md` line 32 | Charter-verified; the window matches `health-summary.json` `.window` (2026-10-17T01:30-05:00 → 2026-10-18T01:30-05:00). Enabled state UNKNOWN |
| import-bot game-day start | 06:00 CT | — | Reported by bot, not file-verified (not in charter text) |
| nightly-audit-engineer health audit | 02:00 CT (ran 02:05 CT Oct 18) | `nightly-audit-engineer-charter-DRAFT.md` line 5 ("Nothing is scheduled until the DIV-3 Lead approves") | Charter says 02:00 CT; the 02:05 run is reported by bot. The charter is still marked DRAFT |
| frank CAL run (week 6) | Sun 2026-10-18 23:30 CT | — | Reported by bot, not file-verified |
| frank CAL update → `week6.v2.json` | Tue ~01:00 CT | — | Reported by bot, not file-verified; exact minute UNKNOWN |
| frank registration audit | Tue 09:00 CT weekly | `frank-charter-DRAFT.md` line 50 (draft) | Charter-verified (draft only) |
| engineer-bot PR watch | every 30 min 08:00 to 22:00 CT, dormant until a tracked PR exists | `engineer-bot-charter.md` line 44 | Charter-verified; dormant |
| follow-through-agent ledger sweep | 07:30 CT daily | `follow-through-agent-charter.md` line 30 | Charter-verified |
| flora Introspection Audit | Tue 10:00 CT weekly | `flora-charter-DRAFT.md` line 36 | Draft charter only. `flora-charter-v2.md` has no timed line |
| product-idea-stress-test sweep | Mon 09:00 CT weekly | `product-idea-stress-test-charter.md` line 40 | Charter-verified |
| tinkabot post-slate pass / Blind-Spot Digest | Tue 10:00 CT / Wed 09:00 CT | `tinkabot-charter-DRAFT.md` lines 34-35 (draft) | Draft charter only |
| alfred weekly audit | UNKNOWN | profile says "weekly" | Resolve: alfred routine config |
Upstream times DIV-3 depends on (DIV-2-reported, not file-verified): closes land in `/workspace/gse/blackboard/layer1/closes/week6/` at Sun 08:25, 11:55, 15:00, 15:20 and 19:15 CT (12 games), and WAS@SF on Mon 19:10 CT (pending, not excluded). The `layer1/closes/` folder **does not exist yet** (verified 04:14 CT). The CAR@PHI rebuild is at Sun 10:45 CT; `REFRESH = datetime(2026,10,18,10,45)` is set in `blackboard/ingest/tools/validate.py`.

## 3. Data contract
| File | sha256 (recomputed 04:14 CT) | Matches expected |
|---|---|---|
| `/workspace/gse/schemas/blackboard-envelope-v1.json` | `cec3d1017c25d31e1041a1f0a8bfc3be0c0b2bd72e029e5634a828fc8d8a3c37` | yes (cec3d101…8a3c37) |
| `/workspace/gse/schemas/blackboard-envelope-v2.json` | `fffac7a051b5eb679e3c08156e1a230e1edcab843474ab68b52c89f4973513d6` | yes (fffac7a0…13d6) |
Superseded pre-amend v1 hash, which must not be used: `bf5d94aa5650d07c27b3968903b17a4c657184c9e2619573afb93ddd2037cc27` (it allowed a string lease_version). README: `/workspace/gse/schemas/README.md`. Both schemas are JSON Schema draft 2020-12 with `additionalProperties: true` (payload fields are allowed). `$schema`/`$id` URLs on galaxysportsedge.com are identifiers only (404); cite the local path plus sha256.

Required fields (all 9, both versions): `agent_id`, `division`, `timestamp_ct`, `provenance_urls`, `reliability_weight`, `layer2_relevance`, `consumes_from`, `produces_for`, `lease_version`.
| Field | Type / constraint |
|---|---|
| agent_id | string |
| division | string, pattern `^DIV-[1-6]$` |
| timestamp_ct | string, format date-time, pattern `(-05:00\|-06:00)$`, so an ISO 8601 offset is mandatory (schema-enforced) |
| provenance_urls | array (README: never cite DO-NOT-RELY artifacts) |
| reliability_weight | number, min 0, max 1. README: starts at 0 for new items |
| layer2_relevance | enum. v1: SITUATIONAL, REPLACEMENT, TRENCH, PSYCHOLOGICAL, NONE_PURE_LAYER1. v2: the same plus **BIAS** |
| consumes_from | array |
| produces_for | array |
| lease_version | integer ≥ 1 (no strings) |
Validity window: v1 and v2 are both valid for 14 days from 2026-10-18 00:51 CDT **through 2026-11-01 00:51 CDT** (README). Writers move to v2 at their next lease bump, and v1 files are never rewritten just to migrate. Interim workaround: PSYCHOLOGICAL plus a `layer2_relevance_note` on bias files.

Conventions, with where each is defined:
| Convention | Rule | Defined in |
|---|---|---|
| reliability_weight 0 | All new items are ingested at 0 until calibrated | Schema allows 0 to 1; "starts at 0" is in README plus SKILL.md §2 Law 1. The 0 rule is not schema-enforced |
| timestamp_ct offset | Must end in -05:00 or -06:00 | Schema pattern (enforced) |
| row_id | Every row in x-dms/x-search .jsonl files has a unique `row_id` (16 hex, e.g. `ff61b364ed8d52be`); profile-intel 1196/1196, situational-intel 3802/3802 unique (repair-response.json, rerun-summary) | Convention only, not in the schema |
| duplicate_of / duplicate_of_row_id | A duplicate row keeps its data, points at the canonical row, and is set `eligible=false` | Convention only (repair-response.json RO-02) |
| eligible | Boolean; `false` means intake must not promote the row. A missing field is treated as promotable (that was RO-13's defect) | Convention only |
| archive_only + snapshot_of | Archive copies are stamped `archive_only` and `snapshot_of` (source) and `eligible=false`, with `_ARCHIVE_MANIFEST.json` row counts (RO-05: x-search `versions/pass2`, 8159 rows, 9 files) | Convention only |
| .tmp then rename | Write `<file>.tmp`, validate, then `mv` (atomic). 0 `.tmp` files exist under blackboard (verified) | Convention only (import-bot and audit practice) |
| ruling (a) | A `.jsonl` file is created only with its first row; no zero-byte placeholders. `ingest/x-search/2026-10-18/removed.jsonl` is now absent (verified) | DIV-3 Lead ruling, convention only |
| Pre-edit snapshots | Repairs save pre-edit copies (x-dms `versions/pre-ro/`, 14 snapshots) and delete nothing | Convention only |

## 4. Code and scripts
**Repos:** git repos exist at `/workspace/sports`, `/workspace/sports_ro`, `/workspace/agentbus`, `/workspace/dc`, `/workspace/desk-lab/QuantMuse` and `/home/box/xchat-lite`. **None found that holds DIV-3 validators or audit code**, and their relevance and branches were not inspected (UNKNOWN; resolve with `git -C <repo> branch -a && git -C <repo> ls-files`). **No DIV-3 script files exist** in `/workspace/div3`, `/workspace/drafts` or `/home/box/agent-data/workflows`.
| Path | Lang | Purpose | Run | Deps |
|---|---|---|---|---|
| `/workspace/gse/blackboard/ingest/tools/validate.py` | Python 3 | DIV-2 ingestion-desk envelope + feed validator; writes `ingest/<date>/<feed>-<HHMM>CT.json` | `python3 validate.py [--now ISO8601] [--dry-run]` | stdlib (json, glob, hashlib, argparse, re, zoneinfo) |
| `/workspace/gse/validate.py` (16 lines) | Python 3 | DIV-1 dossier validator against `/cursor/stores/store-bb9111ab-…/dossiers/schema.json` | `python3 validate.py <TEAM_ABBR>...` | `jsonschema` |
| `/workspace/gse/blackboard/rules/tools/{rules_common,capture_baseline,rules_diff,build_nfl_comparison}.py` | Python 3 | competitor-watching rules snapshots/diffs | UNKNOWN args (resolve: read each `__main__`) | `requests`, `bs4`, stdlib |
| `/workspace/gse/build.py`, `build_l1.py`, `tmp/build_1300.py`, `tmp/build_1600.py`, `scratch/0800/build.py` | Python 3 | DIV-2/cooper builders (not DIV-3) | UNKNOWN | UNKNOWN |
| `/workspace/gse/scratch/sherlock/**` (`*.py`, `run.sh`, `run2.sh`, `meta.sh`, `xs/ngsapp.js`) | Py/sh/JS | sherlock and MAIN BOT x-ingest builders (`xs/p2write.py`, `xs/remap.py`, `dm/update.py`) | UNKNOWN | UNKNOWN |
| `/workspace/gse/last30days/*.py` | Python 3 | DIV-1 backfills, including `fbs_cfbd_backfill.py` (CFBD; **do not run**) | UNKNOWN | UNKNOWN |
**Nightly audit, import-bot QA, secret scan, CFBD reconciliation and bar evaluation have no script on the box. That logic lives only in bot prompts or sessions: UNKNOWN.** Resolve by exporting each bot's instructions.
Env var NAMES: none found referenced by DIV-3 artifacts. The CFBD key's env var name is UNKNOWN (resolve: `rg -n 'os.environ|getenv' /workspace/gse/last30days`).

## 5. Current state of today's work (verified paths)
| Item | State | Evidence |
|---|---|---|
| Nightly audit 02:05 CT | REJECT overall. Secrets PROMOTE, CFBD PROMOTE. Envelopes 145/220 = 65.9% (135/137 = 98.5% excluding div4/visuals). Stale REJECT (zero-byte removed.jsonl) | Reported by bot. **Output file not found on box: UNKNOWN location** |
| div4/visuals cleanup | `blackboard/div4/visuals/` holds **only `README.json`** (verified). README says templates moved to `/workspace/div4/visuals/`, with mapping in `/workspace/div4/visuals/relocation.v1.1.3.json` | ls verified |
| removed.jsonl | Absent from `ingest/x-search/2026-10-18/` (verified) | ls |
| import-bot timestamp fixes | `competitor-watching-rules-amended-verdict.json` and `repair-orders-addendum.json` timestamp_ct = `2026-10-18T01:54:19-05:00` | jq verified |
| import-bot QA | 12 batches: 8 Promote, 4 Reject, 0 Insufficient. Files 51/29/22/0 | `import-qa/2026-10-18/health-summary.json` |
| Rules batch (competitor-watching) | health-summary lists `rules-2026-10-17: Promote`, superseded by amended verdict **Reject** 16/20 = 80% (01:54 CT ruling, live 403s count as unverifiable). Note: the "8 Promoted" count in health-summary predates this amendment | `competitor-watching-rules-amended-verdict.json` |
| Re-QA RO-2026-10-18-02..05 | All Promote (RO-05 as archive only) | `rerun-summary-2026-10-18.json`, `*-rerun.json` |
| RO-02..05 execution | DONE by MAIN BOT | `repair-response.json` |
| RO-2026-10-18-13 (eligible=false on 3 no-post_id rows) | File status `open`. MAIN BOT reports done; import-bot verification pending | `repair-orders-addendum-2.json` |
| RO-2026-10-18-12 Fanatics | OPEN, MEDIUM, executor competitor-watching. 80%; best case 19/20 | `repair-orders-addendum.json`, `rules-2026-10-17-fanatics-rerun.json` |
| RO-2026-10-17-01 (CAR@PHI) | OPEN until the Sun 10:45 CT rebuild; -02..-04 CLOSED | `repair-orders.json` |
| RO-2026-10-18-01 (cooper) | Severity MEDIUM. cooper lease 2 **Promote 12/12**; PIT@TB weather slice Reject (freshness) | `news-2026-10-17_1600CT-v2-final.json` (+ `-erratum.json` corrects 2 fetch times) |
| RO-10, RO-11 | CLOSED | rerun-summary |
| RO-06..09 | No status field in `repair-orders.json`: UNKNOWN (resolve: import-bot status update) | jq |
| Bars | IMP-002 v1 (10-17 01:34 import-bot), v2 (10-17 02:01 import-bot), v3 (10-18 02:16:58 flora), v4 (02:17:46), v5 (02:20:35). IMP-003 v1 (01:54:36 flora), **v2 registered** (02:00:13 flora). Also ARB-001, CAL-001..007, ENG-001..004 v1 | `/workspace/div3/bar-registry/*.json` `registered_ct` |
| engineer-bot sessions | 0 launched (`sessions: []`) | `blackboard/div3/engineering/sessions-log.json` |
| CFBD log | 10 lines, sum of `calls` = 26. DIV-1 3 lines (incl. 22-call `/plays` 2026-10-17T08:13, retroactive), DIV-2 6 lines, DIV-3 1 line (02:10 CT, 0 calls, records MAIN BOT's after-the-fact approval of the 22-call backfill) | `blackboard/ops/cfbd-usage.jsonl` |

## 6. Known bugs and open issues
| # | Issue | Repro / location | Severity |
|---|---|---|---|
| B1 | RO-12: 3 Fanatics URLs return live 403 to every user agent (02:04 CT), so competitor-watching's 200 can't be reproduced. Rules batch 16/20 = 80% Reject; max 19/20 because the Pinnacle row fails | `import-qa/2026-10-18/rules-2026-10-17-fanatics-rerun.json`; `repair-orders-addendum.json` | MEDIUM |
| B2 | CFBD quota is unreconciled. sherlock `/info` at 01:02 CT showed 601/1000 used; the log sums to 26 calls (the audit reported 27 over 9 lines, while the file now has 10 lines: the discrepancy is UNKNOWN). Most usage is unattributed (the audit says ~577). Garrett has been asked | `blackboard/ops/cfbd-usage.jsonl` | HIGH (quota and attribution) |
| B3 | event-request-desk missed its Sat 12:00 CT run; DIV-2 is investigating | Reported by DIV-2; no file evidence checked | MEDIUM (DIV-2 owned) |
| B4 | WebFetch exposes no response headers, so "live read" proof rests on a nonce query string plus layout variance. Provider cache behaviour is UNKNOWN | `news-2026-10-17_1600CT-v2-fallback-recheck.json` | MEDIUM |
| B5 | IMP-002 v5 ambiguity: the live_read_evidence_rule doesn't say which parts must match and which must vary. A registrar note proposes claim text must match and incidental elements vary, to be fixed in v6 | `/workspace/div3/bar-registry/IMP-002.v5.json` line 22 | LOW |
| B6 | `ingest/tools/validate.py` enum is v1-only and **lacks BIAS**, so v2 bias files would fail it | `/workspace/gse/blackboard/ingest/tools/validate.py` line 13 (`L2 = {…}`) | MEDIUM |
| B7 | import-bot dup scan collapsed 3 empty post_ids into one key, reporting 36 duplicates instead of 34 | rerun-summary `reconciliation_36_vs_34` | LOW (fixed in reasoning; no code) |
| B8 | 3 x-dms rows with no post_id (row_ids `ff61b364ed8d52be`, `fd45e2dcfc41607f`, `4fa6066452f2b4ee`) had no `eligible` field. RO-13 status still `open` in file | `repair-orders-addendum-2.json` | MEDIUM until verified |
| B9 | Nightly audit output is not persisted anywhere found on the box, so results can't be re-checked from files | rg across /workspace and /home/box/agent-data | MEDIUM |
| B10 | health-summary.json still says rules batch Promote (pre-amendment), so batch counts there are stale versus the amended verdict | `health-summary.json` vs `competitor-watching-rules-amended-verdict.json` | LOW |
| B11 | Freshness slices grow with time (situational-intel had 648 stale injury rows at re-QA) | `ingest-x-search-situational-intel-2026-10-18-rerun.json` | LOW |
| B12 | `layer1/closes/` doesn't exist yet; frank's 23:30 run depends on it | `ls /workspace/gse/blackboard/layer1` | Watch (expected after 08:25 CT) |
| B13 | nightly-audit-engineer, frank and tinkabot charters are still marked DRAFT while their routines run or are planned | `/workspace/div3/*-DRAFT.md` | LOW (governance) |

## 7. Coding asks (each needs an approved RO and DIV-3 Lead go-ahead before an engineer-bot session)
1. **Envelope validator CLI** (`envelope_check.py`). Validates every `.json`/`.jsonl` row against v1 or v2 (picked by `$schema` or `schema_used`; default either), checks the timestamp_ct offset, `reliability_weight == 0` for items <24 h old, `.tmp` leftovers, zero-byte `.jsonl` (ruling a), and prints counts by directory. *Accept:* reproduces audit numbers on the same tree (220 files at 02:05, with the div4 exclusion → 135/137). Flags the pre-fix timestamp format (test with a copy that has the offset stripped). 0 network. Exit code ≠0 on any fail. *Test data:* `/workspace/gse/blackboard/div3/import-qa/2026-10-18/`, `/workspace/gse/blackboard/bias/`, `/workspace/gse/blackboard/ingest/x-search/2026-10-18/`, schemas in `/workspace/gse/schemas/`.
2. **Fix B6**: add `BIAS` to `L2` in `blackboard/ingest/tools/validate.py` line 13, or load the enum from the v2 schema file. *Accept:* `--dry-run` passes the 3 bias/week6 v2 files and still rejects unknown enums.
3. **row_id / duplicate checker**. Groups by post_id, **never collapsing null or empty post_ids** (each counts on its own and is flagged), verifies row_id uniqueness, that `duplicate_of_row_id` resolves, that duplicates are `eligible=false`, and that `eligible` exists on every row. *Accept:* x-dms reports exactly 34 duplicate extras, 3 no-post_id rows listed by row_id, and 0 eligible duplicates. situational-intel shows 3802 unique row_ids. *Test data:* `/workspace/gse/blackboard/ingest/x-dms/` (incl. `versions/pre-ro/` for the before state), `/workspace/gse/blackboard/ingest/x-search/2026-10-18/`.
4. **Archive manifest checker**. Every file under a `versions/pass2`-style archive has `archive_only`, `snapshot_of` and `eligible=false`, and row counts match `_ARCHIVE_MANIFEST.json`. *Accept:* 8159 rows, 9 files, 0 mismatches on `ingest/x-search/2026-10-18/versions/pass2`.
5. **CFBD usage-log linter**. Each line parses, `ts_ct` has an offset, and fields `bot, calls, division, endpoint, purpose, retroactive` are all present, with totals by division and bot. *Accept:* on `blackboard/ops/cfbd-usage.jsonl` it outputs 10 lines, sum 26, and flags non-ISO `ts_ct` values without seconds (e.g. `2026-10-16T18:20-05:00`, which is valid ISO but inconsistent). Makes no CFBD calls.
6. **Secret scanner with allowlist**. Allowlist covers X pagination cursors, Odds-API `sport_key` values, test fixtures and public site keys in cached HTML (the audit's false positives). Prints file, line and pattern name only, never the value. *Accept:* 0 confirmed hits on `/workspace/gse` today. The expired NFL visitor JWT in `/workspace/gse/scratch/sherlock/xs/7cb73f5a.html` is reported as INFO, not CRITICAL.
7. **Persist audit output** (B9): the nightly audit writes `blackboard/div3/nightly-audit/<date>.json` (envelope v2, .tmp then rename). *Accept:* the file exists after the next 02:00 CT run.

## 8. Constraints
- **No-Maybe Law:** every verdict is Promote, Reject or Insufficient Data, measured against pre-registered frozen bars in `/workspace/div3/bar-registry/`. Bars change only by a new version, going forward only (e.g. IMP-002 v1→v5). In-flight re-checks keep the bar in force at their start (cooper re-check graded under v2 plus the Lead's ruling).
- **Weight 0 and no human gates inside the engine** (SKILL.md §2). Human gates exist only for EMISSION (public anything), PROMOTION to production (merges to main, deploys, live config) and Owner property (accounts, credentials, payments, hardware, legal/financial) (SKILL.md §4).
- **Secrets:** scan nightly. Never print or write key values; report file/line/pattern only.
- **CFBD:** log every call in `blackboard/ops/cfbd-usage.jsonl`, game-week reads only, and bulk pulls need DIV-2 sign-off. DIV-3 made 0 calls. Source: DIV-3 Lead/MAIN BOT rule; exact rule-file location UNKNOWN.
- **engineer-bot cloud sessions** (`/workspace/div3/engineer-bot-charter.md`): one session per approved RO with the DIV-3 Lead's go-ahead, small fixes batched, tight specs, no session for anything config can fix, stalled sessions stopped, counts reported daily. **0 launched** (`sessions-log.json` `sessions: []`). Merges to deploying branches go to MAIN BOT for Garrett (PROMOTION gate).
- No external messages, public posts or spending by DIV-3 bots.
- Bias files: v2 `BIAS` or the v1 `PSYCHOLOGICAL` + note workaround until 2026-11-01 00:51 CDT.

## 9. Unknowns (all)
1. Enabled routine state for all 14 DIV-3 bots: not stored in agent folders. Resolve: platform routine export.
2. Live status of alfred, apple-search-ads-review, company-docs-q-a, deal-qualification, dr-eggbot-v2, product-idea-stress-test and Projects Manager beyond "no 24 h write". Resolve: routine export.
3. Whether the 2026-10-17 13:09 mtimes reflect real writes or a bulk restore. Resolve: restore log.
4. Gray avatar switch for alfred, follow-through-agent, product-idea-stress-test and Projects Manager. Resolve: profile `avatarColor` check against the agreed value.
5. Nightly audit output file location and contents. Resolve: nightly-audit-engineer to name its output path.
6. import-bot 06:00 CT game-day start, the DIV-3 17:00 CT status routine, frank Sun 23:30 and Tue ~01:00 runs (exact minute), and the alfred weekly time: not file-verified.
7. Repo branches and relevance of `/workspace/sports`, `/workspace/sports_ro`, `/workspace/agentbus`, `/workspace/dc`, `/workspace/desk-lab/QuantMuse`, `/home/box/xchat-lite`. Resolve: `git branch -a`.
8. Run args and deps for rules/tools, build*.py, sherlock scratch and last30days scripts.
9. Logic of the nightly audit, import-bot QA, secret scan and CFBD reconciliation: prompt-only, no script.
10. CFBD key env var name.
11. CFBD log total: file sums 26 over 10 lines vs the audit's 27 over 9. Attribution of the remaining usage vs 601/1000 used.
12. Status of RO-2026-10-18-06 to -09 (no status field).
13. Whether WebFetch's provider caches across query strings.
14. Location of the written CFBD rule (game-week only, DIV-2 sign-off).
15. RO-13 verification by import-bot: pending.

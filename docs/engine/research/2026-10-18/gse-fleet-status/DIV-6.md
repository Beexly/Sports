# DIV-6 Lead Status: Owner Life & Operations Support
Author: 💚🧭 DIV-6 Lead · Owner Ops (agent id 4a5cb723-9dd4-4729-ba5f-c05ddae2d9eb)
Written: 2026-10-18, 4:15 AM CT. Every item below was verified on the box at that time; anything not verified is marked UNKNOWN.

## 1. Roster
"Live" means the bot filed a daily report on 2026-10-17 (a file exists at /workspace/gse/blackboard/div6/<slug>/2026-10-17.json). "Idle" means it has filed nothing so far.

| Bot | Agent id | Role (one line, from its profile) | State |
|---|---|---|---|
| DIV-6 Lead · Owner Ops | 4a5cb723-9dd4-4729-ba5f-c05ddae2d9eb | Division lead; sends a daily roll-up to GSE MAIN BOT | Live |
| chief-health | b00dc8bf-dd1f-430e-b58f-9420d99649bb | Re-ranks work and compute schedules after missed windows; tracks founder load | Live, nothing new |
| credit-card-max | fd2910e2-ff2e-4c3f-bf09-628ef9492477 | Tracks free-tier API quotas and credit pools; never touches payment methods | Live; building a read-only quota inventory |
| deal-hunting | 426bc3a8-0600-4a3e-a916-0b4bcbe1ca3a | Private landed-odds cost diagnostic plus hardware deal tracking; never product | Live, nothing new |
| fuse | b1a19416-2035-4a72-911d-5c03b8c7a0a2 | Tracks scraping and LLM spend; flags runaway jobs | Live; no spend data source connected |
| home-robots | 8fc467b1-545b-4b14-8ed7-cd7f61d3ce5d | Read-only monitor of workstation disk, thermals and memory | Idle (no report, no avatar confirmation) |
| love | baac637f-b8d6-4441-8fee-b8a8b1aed05d | Tracks founder sustainability, tax and legal deadlines, family commitments | Live; milestone tracker is empty |
| nyc-parent | 6806e18d-6aa9-4585-b487-05330c175ca0 | NYC family logistics: school calendars, kid activities, childcare | Live; blocked on Garrett |
| office-ops-desk | cbbe92b2-896d-4be0-9bc9-090d71841f34 | Office supplies, equipment, vendors, renewals, admin to-dos | Live; blocked on Garrett |
| skippy | 01cf8306-146e-4207-86f4-bcf119156b45 | Quick calculations, breakeven conversions, Python one-liners; small owner to-dos | Live, nothing new (report file only, no message to the lead) |
| the-morning-newspaper | efb8c761-3009-4993-93d2-446edacec958 | Daily morning briefing for Garrett with sources | Idle (no report, no avatar confirmation) |
| wtd | e67d563f-f7d9-4336-9af2-c0ec9891a075 | Weekend, evening and family activity suggestions with links | Live; blocked on Garrett |

## 2. Live schedules
- DIV-6 Lead routine "DIV-6 daily status to GSE MAIN BOT": daily at 5:00 PM CT (cron `0 17 * * *`, America/Chicago, flexible window 4:45 to 5:15 PM CT). Last ran 2026-10-17 at 5:01 PM CT and succeeded.
- Specialist daily-status routines, all **self-reported and not verified by the lead**:
  - deal-hunting: daily, 3:30 to 4:00 PM CT.
  - chief-health: about 4:00 PM CT, up to 15 minutes early, never late.
  - love: about 4:00 PM CT, latest start 4:15 PM CT.
  - nyc-parent, credit-card-max, fuse, office-ops-desk, wtd: about 4:00 PM CT.
  - skippy: "before 4:30 PM CT"; exact time UNKNOWN.
  - home-robots, the-morning-newspaper: UNKNOWN.
- Any other routines the specialists run: UNKNOWN.

## 3. Data contract
- Write: `/workspace/gse/blackboard/div6/<slug>/<YYYY-MM-DD>.json`, one file per specialist per day, using the gse-operating-methodology envelope (agent_id, agent_slug, division, timestamp_ct, provenance_urls, reliability_weight, layer2_relevance, consumes_from, produces_for, lease_version, report{garrett_actions, wins, open_items, blockers, summary}).
- Read: the lead's 5 PM routine reads every `/workspace/gse/blackboard/div6/*/<today>.json` file.
- Append, only if a DIV-6 bot calls CFBD: `/workspace/gse/blackboard/ops/cfbd-usage.jsonl` with {ts_ct, bot, division, endpoint, calls, purpose}. No DIV-6 bot has called CFBD since Oct 1.
- Write: this report, `/workspace/gse/reports/lead-status-2026-10-18/DIV-6.md`.
- Messaging: specialists report to the lead through agent-to-agent messages, and the lead reports only to GSE MAIN BOT (id 0c671b12-97a1-458f-a611-d91d1f1dc9d8).
- Files read or written by individual specialists beyond the paths above: UNKNOWN. office-ops-desk says it will build a tracker in Notion once Garrett picks a first area; it doesn't exist yet.

## 4. Code and scripts
- None. DIV-6 has no scripts or code in any repo. All work runs as agent routines.
- Env var names: none used by the lead. Any used by specialists: UNKNOWN.

## 5. Current state of today's work (2026-10-18)
- No 2026-10-18 reports are due before about 4:00 PM CT. As of 4:15 AM CT, none exist.
- 2026-10-17: 9 of 11 specialists filed reports (all except home-robots and the-morning-newspaper).
- Open questions for Garrett, ranked by what each one unlocks:
  1. **wtd: his home city or area.** Every suggestion depends on it, including ideas for this weekend (Oct 17–18). First asked 2026-10-16 at 2:14 PM CT; no answer yet.
  2. **nyc-parent: his first focus** (school calendar, kid activities, or childcare coverage) **and where the family schedules live.** Until then the desk can't do any work.
  3. **office-ops-desk: the first area to track** (renewals, supplies, equipment, or admin to-dos). There's a choice card in its chat; his pick unlocks the Notion tracker.

## 6. Known bugs and open issues
1. The lead's scheduled 5 PM run can't message other agents, so each day's status is relayed by hand from the lead's main conversation. If nobody relays it, it doesn't reach GSE MAIN BOT.
2. home-robots and the-morning-newspaper haven't responded to two messages from the lead (avatar change on 10/16, reporting rule on 10/17).
3. The box was restored from an older snapshot around 1:07 PM CT (date as reported by GSE MAIN BOT); the shared blackboard can disappear. The lead's routine re-creates `blackboard/div6` if it's missing.
4. fuse has no spend data source, and credit-card-max has no quota data source beyond the CFBD log.
5. The profiles of five bots the lead created on 10/16 (nyc-parent, office-ops-desk, skippy, the-morning-newspaper, wtd) were later rewritten by someone else. skippy's role changed from errands sidekick to quick quants runner. Who made the change: UNKNOWN.

## 7. Coding asks
1. **Let scheduled runs relay agent messages.** Acceptance: the DIV-6 5 PM routine delivers its status to GSE MAIN BOT without a manual relay, on 3 consecutive days.
2. **Script to check DIV-6 report compliance.** Read-only. Acceptance: given a date, it lists every DIV-6 slug with filed or missing status from `/workspace/gse/blackboard/div6/<slug>/<date>.json`, validates each file against the envelope fields in section 3, and exits non-zero if any file is missing or invalid. Uses Python standard library only, no network.

## 8. Constraints
- No purchases, payments, account or credential changes, external messages, public posts, or production promotions without Garrett's explicit approval, routed through GSE MAIN BOT.
- deal-hunting's line shopping stays a private diagnostic and is never product. credit-card-max never touches payment methods.
- The CFBD key has 399 of 1,000 calls left until Oct 31 at 7 PM CT. Every call gets logged, and bulk pulls need DIV-2 sign-off.

## 9. Unknowns
- home-robots: schedule, state, and whether its avatar is gray: UNKNOWN.
- the-morning-newspaper: schedule, state, and whether its avatar is gray: UNKNOWN.
- skippy's exact routine time: UNKNOWN.
- Specialist routines other than their daily status: UNKNOWN.
- Env vars or connectors used by specialists: UNKNOWN.
- Who rewrote the five specialist profiles: UNKNOWN.
- Garrett's home city, nyc-parent's first focus, office-ops-desk's first area: UNKNOWN until he answers.

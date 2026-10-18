# GSE Fleet Status Handoff — 2026-10-18 (compiled 04:18 AM CT by 🩷 GSE MAIN BOT)

Purpose: authoritative current-state report for Garrett's coding agent. **Do not guess.** Anything marked `UNKNOWN` in these files is unverified — confirm it or ask; never fill it in.

## Files (read in this order)
1. `X-INGEST.md` — X (Twitter) DM + topic-search ingest: pipeline, scripts, file counts, ID rules, QA history, gaps, coding tasks. **Priority area for Garrett.**
2. `DIV-1.md` — Football Intel (game reads, dossiers, countdowns, X-ingest usage).
3. `DIV-2.md` — Signal & Research (odds/Layer-1 baseline, tradbot-2 Sunday slots, sherlock/overheard, ToS verdicts, CFBD budget).
4. `DIV-3.md` — Engine QA (envelope v1/v2 schemas, audit, repair orders).
5. `DIV-4.md` — Content & Media.
6. `DIV-5.md` — Revenue & Kit (Proof Bank).
7. `DIV-6.md` — Owner Ops.

Each division file uses the same 9 sections: roster, schedules, data contract, code/scripts, current state, bugs, coding asks (with acceptance criteria), constraints, unknowns.

## Cross-cutting facts (verified by MAIN BOT today)
- Box data root: `/workspace/gse/` (NOT a git repo). Blackboard: `/workspace/gse/blackboard/`.
- Envelope schemas: `/workspace/gse/schemas/blackboard-envelope-v1.json` and `-v2.json` (v2 adds `BIAS` to `layer2_relevance`; v2 sha256 `fffac7a051b5eb679e3c08156e1a230e1edcab843474ab68b52c89f4973513d6`). Both valid through 2026-11-01 00:51 CT. DIV-1 notes rows carry `lease_version`, not an `envelope` field.
- All ingested items are **weight 0** until promoted by QA (Promote / Reject / Insufficient Data).
- X ingest IDs: x-dms rows use `row_id = sha1('https://x.com/i/status/'+post_id)[:16]` with `legacy_row_id` kept; **x-search row_ids hash the stored URL and must NOT be recomputed** (see X-INGEST.md §6). Map: `/workspace/gse/blackboard/ingest/row-id-map-2026-10-18.jsonl`.
- Fixes to X ingest files (repair orders RO-02..05, RO-13) were applied to the data files, **not the scripts** — rerunning `/workspace/xsearch` or `/workspace/xdm` scripts as-is would undo them.
- Known bug: `/workspace/gse/blackboard/ingest/tools/validate.py` line 13 enum lacks `BIAS` (rejects v2 rows).
- CFBD: free key, 399/1000 calls left until 2026-10-31 7 PM CT; ~577 used calls unattributed to any bot (Garrett asked). Every call must be logged to `/workspace/gse/blackboard/ops/cfbd-usage.jsonl`; bulk pulls need DIV-2 sign-off.
- Licensing: CFBD OK for engine use; NFL Next Gen Stats / nflverse NGS data BLOCKED from engine; SumerLive manual-view only.
- Secrets: env var names only (`CFBD_API_KEY`, `CHAT_PIN`, etc.). Never print values. No posting/liking/following/DMing on X; no sends or purchases without Garrett.
- DFS optimizer bot name: UNKNOWN (dfs rows are in `x-search/2026-10-18/dfs.jsonl`).

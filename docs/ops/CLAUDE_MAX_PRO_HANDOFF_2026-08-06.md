# Handoff — Claude Max Pro (next autonomous block)

**Date:** 2026-08-06  
**Truth:** `github.com/Beexly/Sports` · main only · Live: galaxysportsedge.com  
**From:** Grok Build session (settlement + T-1 consensus + Claude Code image todos)

Paste this whole file as the system/user prompt for Claude Max Pro. Work **main** only. No sandbox as product.

---

## Law (never violate)

- Finish · dark · or refuse the write  
- LIVE_BOARD / STATS_PUBLIC / PERFORMANCE_STATS / PUBLISH_LEDGER default **OFF**  
- No public ROI / guaranteed edge / bare “lock” slang (run `node scripts/guardrails/trust-gate.mjs`)  
- No invented scores; DISPUTED holds; postponed → honest VOID only on free-source confirmation  
- Free-first; Odds API optional enrichment only  
- ≤5 files per PR; tripwire tests with every fix  

---

## Already done (do not redo)

| Item | Evidence |
|------|----------|
| Free-path SNAPSHOT write + drain | `apps/web/lib/settlement/free-path-snapshot.ts` + runner |
| Free-path CLV grade + drain | `free-path-clv.ts` + runner |
| clvRepair / snapshotRepair on free settle | return type + cron top-level (PR this session) |
| Settlement overdue band | Live: **0** overdue · HEALTHY |
| Cron unauth | **401** without Bearer |
| T-1 consensus provenance | Chain traced; binder + caption #317 |
| Trust-gate public copy | Green at last scan |

---

## Your job queue (strict order)

### 1. Confirm deploy + authenticated settle (P0)

```bash
B=https://www.galaxysportsedge.com
curl -sS $B/api/ops/public-surface-truth | jq '{sha:.deployment.sha,settlement}'
# Expect main HEAD includes settle top-level clvRepair after merge+redeploy

CRON_SECRET=…  # from Vercel Production env only — never commit
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  "$B/api/cron/settle-picks" | jq '{path,picksSettled,clvRepair,snapshotRepair,scoreDates,ok}'
```

**Done when:** HTTP 200, `path:"free"`, `clvRepair` and `snapshotRepair` objects present (may be zeros).

If Actions has minutes: `gh workflow run "External Cron (Galaxy Sports Edge)" -f target=settle-picks` and read job log for same JSON.

### 2. Neon row for Chiefs–Raiders consensus (T-1 auditor close)

You need `DATABASE_URL` (Neon pooled). Run:

```sql
SELECT p.id, p.selection, p."consensusPct", p."bookmakerCount",
       p."reasoningShort", p."dataFreshnessAt", p."modelVersion",
       ROUND(EXTRACT(EPOCH FROM (NOW() - p."dataFreshnessAt"))/3600.0,1) AS age_hours
FROM "Pick" p
JOIN "Game" g ON g.id = p."gameId"
WHERE g."awayTeamName" ILIKE '%Chiefs%' AND g."homeTeamName" ILIKE '%Raiders%'
  AND p."isPublished" AND p."modelVersion" IS DISTINCT FROM 'v5.0.0-seed'
ORDER BY g."commenceTime" DESC LIMIT 5;
```

Report `bookmakerCount` + `dataFreshnessAt` + `age_hours` in one line. That closes T-1 evidence gap.

### 3. T-2 Branch A — cockpit settlement vs ops (P0 decision → small PR)

**Code verdict already:** ops uses overdue count; Jarvis uses **lastSettlementAt age** (>36h RED). Can cry wolf while ops HEALTHY.

**DO:**

1. Open `apps/web/lib/cockpit/jarvis.ts` `classifySettlement`  
2. Align operator one-liner when overdue=0: “clock stale” vs “picks need settling”  
3. Tripwire: same fixture → ops HEALTHY + cockpit not “run settlement worker” if overdue 0 and clock ok  

**Kill if:** >3 independent settlement status computations without inventory first.

### 4. T-3 decision packet (no build)

Recommend **(b) slim index** (noindex non-upcoming previews; sitemap only live slate) unless traffic data says otherwise. Write one-page packet. **Stop** — founder decides. Blocks T-4/T-8/T-10 SportsEvent.

### 5. Cost stack activation check (save money — “correct tools”)

No **Jynx** module in repo. Cost levers:

| Env | Effect |
|-----|--------|
| `CONTENT_FREE_LANE_ENABLED=true` + `CEREBRAS_API_KEY` | Free lane for **brief** only |
| `MODEL_CHEAP` / Haiku surfaces | already brief + calibration-insight |

**DO (read-only first):** verify production env list (names only) whether free-lane is on. If off, **document founder flip** — do not invent keys. Optionally expand free-lane allowlist only with tests + quality note.

### 6. Only if overdue rises again

RCA via free settle `rca.pareto` → one matching fix PR. Never invent scores.

---

## Fences

- No LIVE_BOARD / StatKing / PERFORMANCE_STATS enable  
- No portfolio Kelly UI / public edge claims  
- No grapher / Project-Tree / sheaf  
- No paid Odds API reintroduction without founder  

---

## Success for this Claude block

- [ ] Authenticated settle-picks 200 + repair fields observed  
- [ ] Neon Chiefs row n + age reported  
- [ ] T-2 cockpit copy/status coherent OR inventory if multi-compute  
- [ ] T-3 packet filed (no implement without founder option)  
- [ ] Free-lane env status documented  
- [ ] trust-gate green; short founder note: moved / remains / **one** action  

---

## Founder action (one)

Redeploy if prod SHA lags main after merge; set `CRON_SECRET` into Claude session env **once** for step 1, or run Neon SQL for step 2.

**Start now: step 1 live settle with Bearer → step 2 Neon if URL available → step 3 T-2.**

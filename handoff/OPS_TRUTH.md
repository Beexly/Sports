# Ops Truth — Production Black-Box Probe

Branch: claude/fable-5-ultracode-plan-ptru4e  
Start commit: a6432233  
Started: 2026-08-14T01:05 UTC  
Production SHA observed: 9a36e11fb3d57af410c4c4f73c3363ad48232750  

---

## 1. founderNextSteps (verbatim)

Source: `ops:preflight` step 3, `/api/ops/public-surface-truth`

    [P0] settlement: Settlement overdue 2 — run free settle-picks (CRON_SECRET); RCA if stuck after redeploy.
    [P1] free_lane: Free-spine snap past 120m SLA — run free-spine-health (or enable AUTONOMY_EXECUTE for planner re-probe). Stale multi-source age misleads I8.
    [P0] product_gates: PUBLIC_PICKS is ON — confirm proof bar + settlement healthy before marketing. PERFORMANCE_STATS still requires GREEN eligibility.
    [P1] product_gates: Sample floor met but calibration eligibility RED — wait for live Brier/ECE/Murphy floors + streak (calibration-metrics cron). Do not claim PROVEN.
    [P2] content: Content archives thin — generate 1 podcast + 1 newsletter via free-lane (Cerebras), human-review, publish only brand-safe issues. No invent stats.

Missing: `!! founderNextSteps missing stripe-webhook-audit (#338+)`

---

## 2. revenueLadder

Current step: FOUNDING  
Next step: PROVEN  
Monetize public track record: false (correct pre-proof)

Blockers to PROVEN (from `evaluateRevenueLadder` in `apps/web/lib/autonomy/revenue-ladder.ts`):
- canonicalSettled >= 100 AND calibrationPublished AND settlementHealthy
- Current: sample floor met (150 canonical settled), but calibration eligibility is RED
- PROVEN still requires eligibility GREEN + publish policy (AUTO_PUBLISH or PUBLISHED)

---

## 3. Settlement counts and gates

From `ops:preflight` step 1 and `ops:impeccable`:
- operator status: degraded (ok=true)
- capability settlement: DEGRADED
- settlement overdue: 2 / 1536 total picks
- settle-picks unauth: 401 (CRON_SECRET-gated)
- free settle-picks requires CRON_SECRET (operator action — outside agent authority)

`ops:impeccable` confirmed: `settlement overdue = 0` check FAILS, overdue=2/1536

---

## 4. Trust / SEO results (preflight step 6)

All OK:
- /.well-known/security.txt → 200
- /ads.txt → 200
- /humans.txt → 200
- /llms.txt → 200
- /site.webmanifest → 200
- /robots.txt → 200
- /podcast/feed.xml → 200
- /news-sitemap.xml → 200
- /sitemap.xml → 200
- Home HTTP=200
- CSP has default-src
- X-Frame-Options=DENY

---

## 5. Every command's exit code and !! lines

### ops:preflight — exit=0
```
!!  operator status=degraded while ok=true (often settlement lag — check ops.settlement)
!!  capability settlement=degraded (some commenced picks are overdue to settle)
!!  publicPicks=true (must be false pre-proof)
!!  picks API 200 (expect 503 until PUBLIC_PICKS proof)
!!  founderNextSteps missing stripe-webhook-audit (#338+)
```
Summary: hard !! = 3, soft !! = 3  
RESULT: FAIL (hard blockers)

### ops:impeccable — exit=0
```json
{
  "ok": false,
  "base": "https://www.galaxysportsedge.com",
  "sha": "9a36e11fb3d57af410c4c4f73c3363ad48232750",
  "generatedAt": "2026-08-14T01:05:21.440Z",
  "ageMinutes": 61,
  "freeSpine": { "ageMinutes": 131, "withinSla": false, "criticalGaps": 7 },
  "billingMoney": { "moneyPathReady": true, "stripeSecretConfigured": true, "webhookSecretConfigured": true, "envPriceSlotsConfigured": 6 },
  "waitlist": { "publicPageOpen": true, "gateEnabled": false },
  "failed": [
    "settlement overdue = 0",
    "public picks closed (LAWS)",
    "freeSpine within SLA (I8)"
  ]
}
```

---

## 6. Founder steps — operability analysis

| Step | What it asks | Where in code | Current code behavior | Who can change it |
|---|---|---|---|---|
| P0 settlement | Run free settle-picks with CRON_SECRET; RCA if stuck | `/api/cron/settle-picks` route; `free-settlement-runner.ts:327` holds DISPUTED picks | Hold is in-memory `rcaInputs[]`, not persisted; pick left PENDING | OPERATOR — requires CRON_SECRET (env flag) |
| P1 free_lane | Free-spine past 120m SLA; run free-spine-health | `free-spine-health.ts`; `FREE_SPINE_SLA_MINUTES` env | age=131m, exceeds 120m SLA | OPERATOR — AUTONOMY_EXECUTE or manual cron |
| P0 product_gates | PUBLIC_PICKS ON — confirm proof bar | `PUBLIC_PICKS` env flag; `publicPerformancePolicy.ts` | publicPicks=true, picks API returns 200 | OPERATOR — env flag |
| P1 product_gates | Sample floor met but calibration eligibility RED | `calibration-eligibility.ts`; `CALIBRATION_PUBLISHED` flag | calibrationPublished=false by default | OPERATOR — env flag + live calibration data |
| P2 content | Generate 1 podcast + 1 newsletter via free-lane | Cerebras free lane; content generation routes | Archives thin | OPERATOR — run content generation |

All five founder steps are OPERATOR ACTIONS — they require credentials or env-flag authority that is outside agent autonomy. No agent action is taken on gates or secrets.

---

## 7. Baseline verification

- `npm run typecheck` → 0 errors (grep -c "error TS" = 0)
- `npm run lint` → exit 0
- `node scripts/guardrails/run-all.mjs` → 22/25 passed
  - FAIL: `api-v1-boundary` (expected — #420, awaiting owner decision)
  - FAIL: `ai-council` (spawn npm ENOENT — environment path issue, not baseline move)
  - FAIL: `dependency-audit` (spawn npm ENOENT — environment path issue, not baseline move)
  - PASS: `ai-transport-import-boundary` (expected pass per current state)

Note: CONTINUOUS.md expected 23/25 with `ai-transport-import-boundary` as a failure. In the current tree it passes. The two extra failures (`ai-council`, `dependency-audit`) are caused by `spawn npm ENOENT` in the bash environment — npm is installed at `/c/Program Files/nodejs/npm` (space in path) and child process spawning fails. These are environmental, not code changes. NOT A BASELINE MOVE.

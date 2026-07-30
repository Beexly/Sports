# OPEN_LEDGER — GSE drain status

**Updated:** 2026-07-30 · **IDLE** after Pass 3 residual kill + harden  
**MAIN tip (pre-merge this PR):** pass-3 branch · feature baseline `8d0b34e` / docs `f49bc8d`  
**Law:** oddsApiRequired=false · LIVE_BOARD off · refuse-default · measurement > narrative  
**score_self:** **A++** · pass=3 · residuals_A=0 · harden=done

## Classification key

| Class | Meaning |
|-------|---------|
| A | Agent can finish now |
| B | Founder env/secret only |
| C | Correctly gated / parked |

## Class A

| ID | Item | Status |
|----|------|--------|
| A1–A14 | Serial + frontier A++ (#251–#254) | **DONE** |
| A15 | Cron `runtime=nodejs` all 18 routes + truth | **DONE** pass-3 |
| A16 | `docs/ops/CRON_MATRIX.md` route×auth×vercel | **DONE** pass-3 |

**class_A_remaining = 0** · agent **IDLE** after this PR merges

### Non-A residuals (not agent-actionable)

| Hit | Class | Why |
|-----|-------|-----|
| LIVE_BOARD / PUBLISH_LEDGER / SLATE_OPENING_REVEAL | C | Founder gate — all **off** |
| canPublishPicks: false hardcodes | C | Correct refuse-default |
| CODE_READY hydration stubs / optical CV | C | Catalog honesty / CV **PARKED** |
| Phase C remeasure CODE_READY | C | Founder + paid Odds |
| TODO(governed-receipts) / CCM deploy-IdP TODOs | C | External writers |
| Jarvis not-wired seats / podcast coming soon | C | Registry / marketing honesty |
| #226 HEOS | C | Founder YES |
| Open #247 / #248 | C/dup | Overlaps shipped MAIN |

## Class B — founder env/secrets

| Env | Where |
|-----|-------|
| `CRON_SECRET` (+ optional `CRON_SECRET_PREVIOUS`) | Vercel Production |
| `DATABASE_URL` / `DIRECT_URL` | Neon + Vercel |
| Upstash Redis (optional) | Upstash + Vercel |
| Stripe live keys | Stripe + Vercel |
| `THE_ODDS_API_KEY` | Optional enrichment only |
| `CLOSING_ARCHIVE_PATH` | Optional durable archive |

## Class C — parked / founder YES only

| Item | Status |
|------|--------|
| LIVE_BOARD | **off** |
| PUBLISH_LEDGER | **off** |
| SLATE_OPENING_REVEAL_ENABLED | **off** |
| canPublishPicks | **false** |
| #226 HEOS | founder YES |
| Phase C (5b) | founder + paid Odds |
| Overlay CV | **PARKED** |
| Poly1305 / CF Access / SPIFFE | closed digression |

## Forbidden

Fake ROI · sportsbook CPA · Pedersen=ZK/PQ · Odds API on free critical path · flip gates without YES

## Pass artifacts

- `docs/ops/CRON_MATRIX.md` — cron route × auth × vercel schedule
- `docs/ops/audit/FRONTIER_AUDIT_IDLE_8d0b34e.md` — A++ evidence
- `docs/ops/CREDENTIALS_CHECKLIST.md` — founder env
- Smokes: `scripts/ops/gamma-cron-smoke.sh`, `scripts/ops/credentials-smoke.mjs`

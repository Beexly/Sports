# OPEN_LEDGER — GSE drain status

**Updated:** 2026-07-30 · **Pass 4 IDLE**  
**MAIN:** `1e007c3` (`fix(pass3): cron nodejs harden + CRON_MATRIX + honest picks copy (#256)`)  
**Law:** oddsApiRequired=false · LIVE_BOARD off · refuse-default · measurement > narrative  
**class_A_remaining = 0**

## Classification key

| Class | Meaning |
|-------|---------|
| A | Agent can finish now |
| B | Founder env/secret only |
| C | Correctly gated / parked |

## Class A

**Empty.** All agent-finishable items shipped through #251–#256.

| Wave | Status |
|------|--------|
| Serial dual-secret, board honesty, own refuse, prefire, method CLV (#251) | DONE |
| Frontier A++ audit + methodTag density + continuous CLV + AI Council CI (#254) | DONE |
| IDLE stamp (#255) | DONE |
| Cron nodejs harden + CRON_MATRIX + picks copy honesty (#256) | DONE |

## Class B — founder env/secrets (exact)

| Env | Where to set |
|-----|----------------|
| `CRON_SECRET` | Vercel → Project → Settings → Environment Variables → **Production** |
| `CRON_SECRET_PREVIOUS` | Same (rotation only) |
| `DATABASE_URL` | Neon dashboard → connection string → Vercel Production |
| `DIRECT_URL` | Neon direct URL → Vercel Production |
| Upstash Redis URL/token | Upstash console → Vercel Production (if multi-instance) |
| Stripe live keys + webhook secret | Stripe Dashboard → Vercel Production |
| `THE_ODDS_API_KEY` | Optional; Vercel Production; **enrichment only** |
| `CLOSING_ARCHIVE_PATH` | Optional durable path |

See also: `docs/ops/FOUNDER_ONLY_CHECKLIST.md`, `docs/ops/CREDENTIALS_CHECKLIST.md`, `docs/ops/SMOKE.md`

## Class C — parked / founder YES only

| Item | Status | Reason |
|------|--------|--------|
| LIVE_BOARD | **off** | Founder YES only |
| PUBLISH_LEDGER | **off** | Founder YES only |
| SLATE_OPENING_REVEAL | **off** | Founder YES only |
| canPublishPicks | **false** | refuse-default |
| #226 HEOS | open PR | Founder YES to merge science |
| Phase C (5b) | **UNVERIFIED** | Founder + real path measure |
| Overlay / optical CV | **PARKED** | Catalog dark; not ship path |
| Poly1305 / CF Access / SPIFFE | closed digression | Out of product critical path |
| Open #247 / #248 | C/dup | Overlaps MAIN #251+#254 |

## Forbidden

Fake ROI · sportsbook CPA · Pedersen=ZK/PQ · Odds API on free critical path · flip gates without YES

## Canonical docs (Pass 4)

| File | Role |
|------|------|
| `docs/ops/CURRENT_STATE.md` | Product truth snapshot |
| `docs/ops/OPEN_LEDGER.md` | This ledger |
| `docs/ops/FOUNDER_ONLY_CHECKLIST.md` | Checkbox-only founder work |
| `docs/ops/FOUNDER_HANDOFF_MESSAGE.md` | 3-minute founder message |
| `docs/ops/CRON_MATRIX.md` | Cron route matrix |
| `docs/ops/SMOKE.md` | Exact smoke commands |

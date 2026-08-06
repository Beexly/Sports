# Remaining queue closeout — 2026-08-06

## Closed this pass
| Gap | Action |
|-----|--------|
| Free path missing TEAM_GAME_LOG drain | Wired in free-settlement-runner + cron top-level field |
| Azure x-api-key guardrail noise | #336 |
| Cipher build ERROR | #334 |
| Personal hive conflation | docs PERSONAL_HIVE_VS_GSE_JYNX |

## Still open (founder / not agent code)
| Item | Owner |
|------|--------|
| Vercel Production READY on latest main | Founder — confirm deploy after #334+#337 |
| CONTENT_FREE_LANE + CEREBRAS_API_KEY | Founder env |
| CLAUDE_PROVIDER=auto + cloud maps | Founder env |
| Stripe webhook → medusajs.app | Founder Stripe audit |
| LIVE_BOARD / PUBLIC_PICKS | Stay OFF until proof |

## Open PRs (do not mass-merge)
#121 fantasy · #226 HEOS · #247/#248 frontier · #258/#261 founder · #290 revenue ladder  
Verify premise before merge; prefer small ship over bulk land.

## Live green signals (independent of SHA lag)
- Settlement overduePending=0 HEALTHY
- Contests/waitlist postgres
- Picks gated 503 · cron 401 unauth · stats dark

# Claude Max Pro — wide-domain handoff (not settlement-only)

**Date:** 2026-08-06 · **Truth:** Beexly/Sports main · Live: galaxysportsedge.com  
Paste this entire document into Claude Max Pro. Work autonomously. Product terms only.

## Operating mode

Wide loop — touch **multiple domains** each session; do not thrash settlement forever.

```
probe live (health, ops, sitemap, board, contests, picks API, cron 401)
→ rank: honesty lies > moat > durability > polish
→ one PR per gap (≤5 files) + tripwire
→ re-probe affected surface
→ next unfinished domain
```

## Law

Finish · dark · or refuse · LIVE_BOARD/STATS/PERF off · no ROI/lock slang ·  
no invented scores · free-first · trust-gate before public copy claims.

## Live baseline (re-verify — evidence expires)

At issue: overdue **0** HEALTHY · cron unauth **401** · ops `isBootstrapMode:false` ·  
`/api/picks` previously **lied** bootstrapMode:true (fixed on branch / after deploy) ·  
`/stats` 404 dark · contests paper postgres · prod SHA may **lag** main.

## Domain checklist (touch each with evidence)

| ID | Domain | Probe / fix |
|----|--------|-------------|
| A | Deploy / SHA lag | ops `deployment.sha` vs `git rev-parse origin/main` — escalate redeploy |
| B | Settlement | overdue + free settle clvRepair/snapshotRepair with Bearer |
| C | Gate honesty | `/api/picks` reason feature_gate vs bootstrap — must match ops gates |
| D | Board / picks pages | calm empty; no throw; LIVE_BOARD honesty |
| E | Contests | practice slate + postgres storageMode |
| F | Waitlist / newsletter | durable; waitlist may Basic-Auth 401 |
| G | StatKing | 404 + robots Disallow |
| H | Sitemap / robots | no /stats; no dark leaks |
| I | Proof receipts | settled only doctrine |
| J | Cockpit / Jarvis | settlement actions not cry-wolf on future PENDING |
| K | Cost stack “Jynx” | free-lane + Haiku router env (docs/ops/JYNX_COST_STACK.md) |
| L | Ingestion freshness | free mode OK; age SLA honest |
| M | CLV public | gated until sample |
| N | Trust-gate | `node scripts/guardrails/trust-gate.mjs` |
| O | Stale open PRs | close obsolete; don’t merge WIP drafts blindly |

## Queue for THIS Claude block

1. **Redeploy check** — if prod SHA < main, founder redeploy first.  
2. **Confirm gate honesty live** — `curl /api/picks` → `reason:feature_gate`, `bootstrapMode:false` when ops isBootstrapMode false.  
3. **CRON_SECRET settle once** — capture clvRepair + snapshotRepair top-level.  
4. **Neon Chiefs row** — bookmakerCount + dataFreshnessAt (T-1 close).  
5. **T-3 packet only** — slim-index previews recommendation; no build without founder option.  
6. **Jynx env** — list whether CONTENT_FREE_LANE + CEREBRAS present (names only); document flip.  
7. **Stale PR hygiene** — comment/close #265/#266 drafts if already superseded.  
8. **Ingestion** — if free-spine health cron missing runs, wire only if code gap proven.

## Fences

No LIVE_BOARD flip · no StatKing · no Odds re-buy · no grapher · no sheaf.

## Success

- [ ] ≥5 domains evidence-touched  
- [ ] Gate honesty verified live post-deploy  
- [ ] Settle auth 200 OR documented blocker  
- [ ] Jynx/cost env status written  
- [ ] One founder action max  

**Start: redeploy/SHA → /api/picks honesty → settle Bearer → next domain.**

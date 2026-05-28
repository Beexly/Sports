# LAUNCH BASELINE — 2026-05-28

## Branch
`claude/determined-keller-dUcdG`

## Snapshot Date
2026-05-28

## Baseline Commit
Run `git log -1 --oneline` on branch for SHA.

## Current Dirty Tree at Session Start
Branch was clean at session start (728f9c8). New files added this session:
- `apps/web/app/fantasy/page.tsx`
- `apps/web/app/market-gravity/page.tsx`
- `apps/web/app/brain/page.tsx`
- `apps/web/app/rumor-radar/page.tsx`
- `apps/web/app/developer/page.tsx`
- `apps/web/components/ui/nav.tsx` (modified)
- `apps/web/components/ui/mobile-nav.tsx` (modified)
- `scripts/smoke-launch.mjs`
- `reports/agent-handoffs/ACTIVE_AGENT_RELAY.md`
- `reports/launch/LAUNCH_BASELINE_2026-05-28.md` (this file)

## Validation Baseline
From last known state (728f9c8 — docs: parity sync Wave 1-3 docs):
- Build: Unknown — needs run
- Typecheck: Unknown — needs run
- Lint: Unknown — needs run
- Tests: Unknown — needs run
- Smoke: New script created this session — needs run

## Known Intentional Drift
- Root-level .md handoff files (CODEX_*.md, LAUNCH_TONIGHT.md etc.) — preserved as forensics artifacts
- Design system tokens in `DESIGN.md` — authoritative, do not modify
- `brand-kit/`, `design-preview/`, `design-system/` — brand assets, stable

## Known Blockers
- None blocking launch of the public surface
- Live data for Fantasy / Market Gravity / Brain / Rumor Radar not yet integrated — all surfaces use clearly labeled DEMO/PREVIEW state
- Payment: Using waitlist/contact CTA fallback. Stripe integration exists in codebase but requires env configuration.

## Immediate Launch Plan
1. ✓ Ship 5 new intelligence surface pages (Fantasy, Market Gravity, Brain, Rumor Radar, Developer)
2. ✓ Update nav and mobile nav
3. ✓ Create smoke validation script
4. ✓ Create agent relay and baseline reports
5. ⏳ Add test:smoke script to package.json
6. ⏳ Run full validation suite
7. ⏳ Commit and push
8. ⏳ Preview deploy (if Vercel configured)

## Intelligence Surface Inventory
| Surface | Route | State | Data |
|---|---|---|---|
| Home | / | LIVE | Real board data with demo fallback |
| Today's Board | /board, /picks | LIVE | Real picks or demo mode |
| Fantasy War Room | /fantasy | PREVIEW | DEMO cards clearly labeled |
| Market Gravity | /market-gravity | PREVIEW | DEMO cards clearly labeled |
| Research Brain | /brain | BETA/GATED | DEMO answers clearly labeled |
| Rumor Radar | /rumor-radar | PREVIEW | DEMO signals clearly labeled |
| Observatory / Edge Map | /observatory | LIVE | Existing |
| Ledger | /ledger | LIVE | Real or demo settlement data |
| Performance | /performance | LIVE | Existing |
| Journal | /journal | LIVE | Content articles |
| Methodology | /methodology | LIVE | Authoritative |
| Pricing | /pricing | LIVE | Plans + CTA |
| Developer & API | /developer | WAITLIST | Contact CTA |
| Cockpit | /cockpit/* | INTERNAL | Protected |

## Environment Variables Needed for Full Production
```
DATABASE_URL=
DIRECT_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_PRICE_ID=
STRIPE_ELITE_PRICE_ID=
THE_ODDS_API_KEY=
ANTHROPIC_API_KEY=
REDIS_URL=
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_CHECKOUT_URL= (optional, for external checkout)
NEXT_PUBLIC_WAITLIST_URL= (optional, for waitlist redirect)
```

## Deployment Command (when env is ready)
```bash
# Preview deploy (Vercel)
vercel --project=sports

# Production deploy
vercel --prod --project=sports
```

## Rollback Command
```bash
git revert HEAD
# or restore specific commit
git checkout <safe-sha> -- apps/web/
```

## Next Owner Action
Codex: Run full validation suite, fix any failures, commit, push.

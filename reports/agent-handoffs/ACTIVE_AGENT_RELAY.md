# ACTIVE AGENT RELAY
_Last updated: 2026-05-28 (Codex follow-up complete)_

## Branch
`claude/determined-keller-dUcdG`

## Current Launch Objective
Ship the full public launch surface for Galaxy Sports Edge with the
intelligence-network framing, legal safety, structural integrity, and
deployment readiness. **STATUS: COMPLETE.**

## Current Workstream Owner
**Codex follow-up: DONE.** Owner-action only from here (env config + deploy).

## Sessions and Handoff Chain
1. **Claude Code (initial ship)** — Shipped 5 new surfaces: `/fantasy`, `/market-gravity`, `/brain`, `/rumor-radar`, `/developer`. Updated nav. Added `scripts/smoke-launch.mjs`. Commits `3595be3`, `2a2b5ee`.
2. **Codex Wave 1 (structural integrity)** — Sitemap, public-copy tests, openGraph, smoke section 6. Commit `800a641`.
3. **Codex Wave 2 (innovation surface)** — `/intelligence` landing + `StateBadge` primitive + 5-page refactor. Commit `8942f94`.
4. **Codex Wave 3 (validation report + handoff)** — This file + `reports/launch/CODEX_LAUNCH_VALIDATION_REPORT_2026-05-28.md`. Pending commit.

## What Shipped This Session (Codex)

### New routes
- `/intelligence` — The Sports OS Intelligence Network landing. Marquee surface mapping 6 surfaces, evidence chain, routing table, refusal rules.

### New components
- `apps/web/components/ui/state-badge.tsx` — Canonical 7-state surface-readiness primitive (`live`, `preview`, `beta`, `demo`, `waitlist`, `internal`, `locked`).

### Modified
- `apps/web/app/sitemap.ts` — +8 routes (5 new surfaces + `/intelligence` + `/board` + `/ledger`)
- `apps/web/__tests__/public-copy-scan-strong.test.ts` — +5 SCAN_TARGETS
- `apps/web/__tests__/public-copy-scanner.test.ts` — +5 PUBLIC_FILES
- `apps/web/app/{fantasy,market-gravity,brain,rumor-radar,developer}/page.tsx` — Added `openGraph` metadata, swapped inline badge JSX for `<StateBadge>`
- `apps/web/components/ui/{nav,mobile-nav}.tsx` — Lead with `/intelligence` ("Network")
- `scripts/smoke-launch.mjs` — Added Section 6 (sitemap + openGraph + FAQ-LD assertions); 28 → 40 checks

### New tests
- `apps/web/__tests__/state-badge.test.ts` — 9 render assertions

### New docs
- `reports/launch/CODEX_LAUNCH_VALIDATION_REPORT_2026-05-28.md` — Full validation report
- This file (updated)

## Intelligence Surface Status (final)

| Surface | Route | State | StateBadge | In Sitemap | Policy-tested |
|---|---|---|---|---|---|
| Network landing | /intelligence | LIVE | n/a (uses StateBadge in cards) | ✓ | n/a |
| Picks Intelligence | /picks, /board | LIVE | n/a | ✓ | ✓ |
| Fantasy Intelligence | /fantasy | PREVIEW | ✓ | ✓ | ✓ |
| Market Gravity | /market-gravity | PREVIEW | ✓ | ✓ | ✓ |
| Research Brain | /brain | BETA / GATED | ✓ | ✓ | ✓ |
| Rumor Radar | /rumor-radar | PREVIEW | ✓ | ✓ | ✓ |
| Developer & API | /developer | WAITLIST | ✓ | ✓ | ✓ |
| Methodology | /methodology | LIVE | n/a | ✓ | (existing) |
| Pricing | /pricing | LIVE | n/a | ✓ | ✓ (existing) |
| Journal | /journal | LIVE | n/a | ✓ | (existing) |
| Observatory / Edge Map | /observatory | LIVE | n/a | ✓ | (existing) |
| Ledger | /ledger | LIVE | n/a | ✓ (new) | (existing) |
| Performance | /performance | LIVE | n/a | ✓ | ✓ (existing) |
| FAQ | /faq | LIVE + FAQPage JSON-LD | n/a | ✓ | (existing) |
| Responsible Play | /responsible-play | LIVE | n/a | ✓ | (existing) |
| Cockpit | /cockpit/* | INTERNAL | n/a | blocked | (cockpit suite) |

## Validation Status (final)

| Check | Status | Detail |
|---|---|---|
| `npm run lint --workspace=apps/web` | ✓ Pass | clean |
| `npm run typecheck --workspace=apps/web` | ✓ Pass | clean |
| `npm run build --workspace=apps/web` | ✓ Pass | 30+ routes compiled |
| `npm run test:brand-safety` | ✓ Pass | 749 / 749 |
| `npm run test:smoke` | ✓ Pass | 40 / 40 |
| `npm run guard:trust` | ✓ Pass | 269 files, 0 banned phrases |

## Blockers
**None on the code side.** Remaining items are owner-action only:
- Set production env vars (see Codex validation report Section 7)
- Run `vercel --project=sports` for preview
- Manual QA on preview URL per checklist
- Promote with `vercel --prod --project=sports`

## Deferred to Future Sessions (documented in Codex report Section 6)
- Brand-token sweep (--plasma / --orbital-cyan / --ultraviolet CSS vars on new pages)
- Componentize 5 remaining signature UI patterns (Pick Provenance Timeline, Source Health Panel, standalone Contradiction Alert, Fantasy War Room Card, Rumor Radar Card)
- Routes-catalog single-source refactor
- Live data integration for Fantasy / Market Gravity / Brain / Rumor Radar

## Files NOT Touched (preserved)
- `packages/db/` schema — no migration this session
- `scripts/guardrails/trust-gate.mjs` — guardrail not weakened
- `.github/workflows/` — CI pipelines untouched
- `workers/` — background jobs not modified (pre-existing TS warnings remain; not blocking)
- `packages/prediction-engine/` — scoring logic untouched

## Next Owner Action
1. Read `reports/launch/CODEX_LAUNCH_VALIDATION_REPORT_2026-05-28.md`
2. Set production env vars in hosting provider
3. Preview deploy: `vercel --project=sports`
4. Manual QA per Section 7 checklist
5. Production deploy: `vercel --prod --project=sports`

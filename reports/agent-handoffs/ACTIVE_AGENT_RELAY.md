# ACTIVE AGENT RELAY
_Last updated: 2026-05-28 (autonomous push: routes catalog + GEO cluster + timestamps)_

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
4. **Codex Wave 3 (validation report + handoff)** — This file + `reports/launch/CODEX_LAUNCH_VALIDATION_REPORT_2026-05-28.md`. Commit `f688da6`.
5. **Master plan status refresh** — Section 6 of master plan updated with strikethrough/status; new `reports/launch/MASTER_PLAN_STATUS_2026-05-28.md` created. Commit `3a6f376`.
6. **Routes-catalog refactor** — `apps/web/lib/routes-catalog.ts` as single source for sitemap, nav, mobile-nav, smoke. Commit `befe039`.
7. **GEO methodology cluster** — Three new hub pages (`/intelligence/how-it-works`, `/intelligence/source-hierarchy`, `/intelligence/glossary`) with TechArticle + FAQPage JSON-LD. Commit `4a826bc`.
8. **GEO timestamps on existing anchor pages** — methodology, observatory, responsible-play, vs/tout-services. Commit `5d591a8`.

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

## Master Plan Alignment (2026-05-28 status pass)

Source of truth for phase-by-phase status: Section 6 of
`docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`.

**Headline:** ~15% shipped (public launch surface), ~25% complete as proposals,
~60% blocked on owner approval or env config. The public surfaces are correctly
labeled PREVIEW/BETA/WAITLIST. No intelligence core architecture is yet implemented.

See `reports/launch/MASTER_PLAN_STATUS_2026-05-28.md` for the full one-page view.

## Deferred to Future Sessions (ordered by leverage)

1. **Live data integration** — unblocks Fantasy / Market Gravity / Brain / Rumor Radar from
   PREVIEW → LIVE. Requires provider contracts + API keys + governance review.
2. **Evidence Vault schema migration** — owner approval gate; unblocks Phases 4–9 in the
   master plan. Proposal at `docs/brain/evidence-vault.md`.
3. **Claim Governance engine** — owner approval gate; required before public Brain ships.
   Proposal at `docs/brain/claim-governance.md`.
4. **Componentize 5 remaining signature UI patterns** — Pick Provenance Timeline,
   Source Health Panel, standalone Contradiction Alert, Fantasy War Room Card, Rumor Radar Card.
   Waiting on live data integration.
5. **Routes-catalog single-source refactor** — `apps/web/lib/routes-catalog.ts` to centralize
   route metadata, sitemap, and nav. DX win, ~3h, no approvals needed.
6. **Brand-token sweep** — replace generic Tailwind `cyan-300 / gray-950 / gray-800` on new
   pages with `ion-blue / carbon / mineral` brand aliases. Code-only, ~3h, no approvals needed.
   NOTE: All existing pages (including homepage, methodology) also use generic Tailwind — so this
   is a site-wide consistency pass, not a fix specific to the new pages.

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

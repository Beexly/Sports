# CODEX LAUNCH VALIDATION REPORT
**Date:** 2026-05-28
**Branch:** `claude/determined-keller-dUcdG`
**Auditor:** Codex (follow-up on Claude Code's launch ship)
**Live site:** Yes — paid hosting, real visitors

---

## 1. Executive Summary

| Dimension | Status | Notes |
|---|---|---|
| **Legal safety** | ✅ PASS | 269 files scanned, 0 banned phrases. Refusal rules published on Brain & Rumor Radar. DEMO labels visible at hero on every demo surface. |
| **Structural integrity** | ✅ PASS (after Wave 1 fix) | 5 new routes added to sitemap, 5 added to public-copy scanners, openGraph added to all 5 pages, FAQPage JSON-LD verified intact. |
| **Innovation surface** | ✅ SHIPPED (Wave 2) | `/intelligence` ecosystem landing + `StateBadge` primitive + 5-page refactor unifies the network framing. |
| **Validation** | ✅ ALL GREEN | lint, typecheck, build, 749 brand-safety tests, 40 smoke checks, trust-gate (269 files) — all clean. |
| **Production-deploy ready** | ✅ YES (pending owner env config) | No code blockers. Owner must set listed env vars and run preview deploy. |

**Bottom line:** Claude Code's launch ship was structurally correct and legally clean but left three orphan gaps (sitemap, policy tests, openGraph) and one critical framing gap (no unified intelligence-network landing). Codex's three-wave follow-up closes the gaps, adds the marquee `/intelligence` page, and introduces the `StateBadge` primitive that unifies surface-readiness language across the network.

---

## 2. Audit Findings — Status Table

| # | Finding | Severity | Status | Resolution |
|---|---|---|---|---|
| 1 | Banned-phrase risk on 5 new pages | Critical | ✅ Pass | Cleared on first scan. 0 hits across all 5 pages against `scripts/guardrails/trust-gate.mjs` (267→269 file registry). |
| 2 | Implicit claim risk (win rate, sharp money, injuries) | Critical | ✅ Pass | Line-by-line review found no implicit claims. `/brain` and `/rumor-radar` ship explicit refusal-rule sections. |
| 3 | DEMO/PREVIEW/BETA labels not visible at top of demo cards | High | ✅ Pass | All 5 pages show the state badge in the hero, before any sample content. Now unified via `StateBadge` component. |
| 4 | `sitemap.ts` missing 5 new routes | High (SEO) | ✅ Fixed (Wave 1) | Added `/fantasy`, `/market-gravity`, `/brain`, `/rumor-radar`, `/developer`, plus orphaned `/board`, `/ledger`, `/intelligence`. |
| 5 | `public-copy-scan-strong.test.ts` SCAN_TARGETS missing 5 new pages | High (Policy) | ✅ Fixed (Wave 1) | Appended 5 new routes. Tests: 8 → 13. Any future banned phrase on a new surface now fails CI. |
| 6 | `public-copy-scanner.test.ts` PUBLIC_FILES missing 5 new pages | High (Policy) | ✅ Fixed (Wave 1) | Appended 5 new routes. Tests: 3 → 8. |
| 7 | `openGraph` metadata missing on all 5 new pages | Medium (Social) | ✅ Fixed (Wave 1) | All 5 pages export `openGraph: { title, description }` mirroring `pricing/page.tsx` pattern. Uses `BRAND_NAME` import. |
| 8 | No shared `StateBadge` primitive — 5 inline reimplementations | High (Consistency) | ✅ Fixed (Wave 2) | New `components/ui/state-badge.tsx` with 7 canonical states. All 5 pages refactored to use it. |
| 9 | No `/intelligence` unified ecosystem landing | High (Framing) | ✅ Fixed (Wave 2) | New `app/intelligence/page.tsx` — network grid, evidence chain, routing table, refusal rules. Now lead nav item. |
| 10 | FAQPage JSON-LD missing on `/faq` | Medium (GEO/AI-search) | ✅ Already done | Verified `apps/web/app/faq/page.tsx:143-167` already injects FAQPage schema for all questions. Smoke check now asserts it remains. |
| 11 | Brand-token sweep (plasma / orbital-cyan / ultraviolet CSS vars) | Low (Polish) | ⏸ Deferred | 3h effort, marginal visual ROI, high regression risk on 1,338+ lines. Documented in Section 6. |
| 12 | Componentize remaining signature components (Pick Provenance Timeline, Source Health Panel, standalone Contradiction Alert, Fantasy War Room Card, Rumor Radar Card) | Medium (DX) | ⏸ Deferred | 8h+, requires live data integration to justify the abstraction. Brain Answer Card / Signal Stack / Market Gravity Meter shipped inline on their respective surfaces. |
| 13 | Routes-catalog single-source refactor | Low (DX) | ⏸ Deferred | 3h, internal DX win. Not customer-facing. |

---

## 3. Validation Matrix

All commands run on `claude/determined-keller-dUcdG` at HEAD after Wave 2 commit (`8942f94`).

| Command | Result | Detail |
|---|---|---|
| `npm run db:generate` | ✅ Pass | Prisma client generated to `node_modules/@prisma/client` |
| `npm run lint --workspace=apps/web` | ✅ Pass | ESLint clean, no warnings |
| `npm run typecheck --workspace=apps/web` | ✅ Pass | `tsc --noEmit` exits 0 |
| `npm run build --workspace=apps/web` | ✅ Pass | All routes compiled, `/intelligence`, `/fantasy`, `/market-gravity`, `/brain`, `/rumor-radar`, `/developer` present in output |
| `npm run test:brand-safety` | ✅ 749 pass | Up from 735 baseline. Net +14 from new policy coverage + StateBadge tests. |
| `npm run test:smoke` | ✅ 40 pass | Up from 28 baseline. Section 6 adds sitemap + openGraph + FAQ-LD assertions. |
| `npm run guard:trust` | ✅ 269 files | `[trust-gate] OK - scanned 269 file(s); no banned phrases.` |

**Pre-existing non-blockers** (out of scope, documented but not modified):
- `workers/data-refresh` and `workers/pick-generation` have TS deprecation warnings (`moduleResolution=node10`, missing `@types/node`). Pre-existing, do not block web app deploy.

---

## 4. Route Map (after Wave 2)

### Public surfaces (in sitemap.xml)

| Path | Priority | Frequency | State |
|---|---|---|---|
| `/` | 1.0 | daily | LIVE |
| `/picks` | 0.9 | hourly | LIVE |
| `/board` | 0.9 | hourly | LIVE |
| `/intelligence` | 0.9 | daily | **LIVE (new)** |
| `/methodology` | 0.8 | monthly | LIVE |
| `/fantasy` | 0.7 | weekly | **PREVIEW (new)** |
| `/market-gravity` | 0.7 | weekly | **PREVIEW (new)** |
| `/brain` | 0.7 | weekly | **BETA / GATED (new)** |
| `/rumor-radar` | 0.7 | weekly | **PREVIEW (new)** |
| `/performance` | 0.7 | daily | LIVE |
| `/ledger` | 0.7 | daily | LIVE |
| `/journal` | 0.7 | weekly | LIVE |
| `/pricing` | 0.7 | monthly | LIVE |
| `/observatory` | 0.6 | weekly | LIVE |
| `/vault` | 0.6 | weekly | LIVE |
| `/developer` | 0.6 | monthly | **WAITLIST (new)** |
| `/about`, `/press`, `/contact`, `/faq` | 0.4–0.5 | mixed | LIVE |
| `/responsible-play`, `/changelog`, `/vs/tout-services` | 0.5–0.6 | mixed | LIVE |
| `/terms`, `/privacy` | 0.3 | yearly | LIVE |
| Dynamic `/journal/[slug]` | 0.6 | weekly | LIVE (per-entry) |

### Internal / blocked (robots.txt disallows)
- `/admin/*`, `/cockpit/*`, `/api/*`, `/auth/*`, `/dashboard`, `/brief`

---

## 5. Legal Safety Attestations

**At the time of this report, the following are true on `HEAD = 8942f94`:**

1. **Banned-phrase scan:** `npm run guard:trust` reports `OK - scanned 269 file(s); no banned phrases.` Banned-phrase registry is `scripts/guardrails/trust-gate.mjs` lines 19–43.
2. **Public-copy registry tests:** 13 surfaces (was 8) are scanned by `public-copy-scan-strong.test.ts` against the trust-claims library. 8 surfaces (was 3) are scanned by `public-copy-scanner.test.ts` against the hard-coded list. All pass.
3. **DEMO labeling:** Every demo card on `/fantasy`, `/market-gravity`, `/brain`, `/rumor-radar` carries a hero-level `<StateBadge>` declaring state (`preview`, `beta`, `demo`) before any sample content. Every demo card additionally carries a bottom-of-card `DEMO · Illustrative only` text marker.
4. **Refusal rules published:** `/brain` page lists 5 refusal categories (unverified injury, win-rate without dataset, sharp money without data, rumors-as-fact, source-tier-unsupported claims). `/rumor-radar` page lists 5 prohibited language patterns alongside 5 allowed patterns. `/intelligence` page lists 5 publish / 5 never-publish patterns network-wide.
5. **Source-tier framework:** A four-tier hierarchy (Official → Beat verified → National unverified → Social) is documented identically on `/rumor-radar` and `/intelligence`. Every signal in the network is meant to declare its tier.
6. **Responsible-use surface:** `/responsible-play` page exists, links the NCPG helpline (1-800-GAMBLER) via `lib/brand.ts:HELPLINE` constant.
7. **No auto-bet / auto-publish / auto-send endpoints:** Codebase grep for "auto-bet" / "auto-publish" returns no public endpoints. Developer page `/developer` explicitly lists "Provide auto-bet or auto-execute endpoints" as something the API will never do.
8. **No fabricated live data on any new surface:** Every numeric value on `/fantasy`, `/market-gravity`, `/brain`, `/rumor-radar` is a hard-coded `DEMO_*` constant inside the page module. No fetch to an odds API. No reference to real players or real games as live signals.
9. **Brain gated:** `/brain` page is BETA/GATED state. There is no public question-input form on the page. Visitors see the answer-anatomy framework and sample-answer DEMO cards, then a pricing/methodology CTA. No unrestricted public Brain endpoint exists.
10. **Cockpit / admin not public:** `/admin/*` and `/cockpit/*` routes are disallowed in `robots.ts`. Not in `sitemap.ts`. Auth-gated server-side by NextAuth (existing).

---

## 6. Deferred Items (documented, not addressed this session)

| Item | Effort | Impact | Recommendation |
|---|---|---|---|
| **Brand-token sweep** (replace generic Tailwind grays/cyans on new pages with `--plasma`, `--orbital-cyan`, `--ultraviolet` CSS vars from `apps/web/styles/design-tokens.css`) | ~3h | Low — marginal visual coherence | Defer to a focused brand-polish session. Risk of regression on 1,338+ lines of working code is non-trivial. The existing palette already matches the rest of the public site (`bg-gray-950`, `text-cyan-300`). |
| **Componentize 5 remaining signature UI patterns** (Pick Provenance Timeline, Source Health Panel, standalone Contradiction Alert, Fantasy War Room Card, Rumor Radar Card) | ~8h+ | Medium — DX, polish | Wait until live data integration. Abstractions are easier to design with one real consumer than five hypothetical ones. Already-implemented signature components: `PickCard`, `EvidenceAuditDrawer`. |
| **Routes-catalog single-source refactor** (`/lib/routes-catalog.ts` driving sitemap + nav + metadata) | ~3h | Low — internal DX | Defer. Current pattern of route metadata living in each page + sitemap is fine for ~30 routes. Reconsider at 60+. |
| **Live data integration** for Fantasy, Market Gravity, Brain, Rumor Radar | Variable | High — moves PREVIEW → LIVE | Requires provider contracts + API keys + governance review. Out of scope for this audit. |
| **Stripe checkout wiring** (env config) | 30m owner work | High — revenue | Owner sets `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID`, `STRIPE_ELITE_PRICE_ID`. Pricing page already falls back to `/auth/signin` cleanly when env is missing. |

---

## 7. Owner Final Checklist

Before deploying to production:

- [ ] Set the following env vars in the hosting provider (Vercel or equivalent):
  - `DATABASE_URL`, `DIRECT_URL`
  - `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (matches production domain)
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID`, `STRIPE_ELITE_PRICE_ID`
  - `THE_ODDS_API_KEY`, `ANTHROPIC_API_KEY`, `REDIS_URL`
  - `NEXT_PUBLIC_APP_URL` (canonical site URL, e.g. `https://galaxysportsedge.com`)
- [ ] Verify Stripe webhook endpoint is registered in Stripe dashboard
- [ ] Run `npm run db:migrate` against the production database
- [ ] Run `vercel --project=sports` for a preview deploy
- [ ] Manually verify on preview URL:
  - `/intelligence` loads, 6-surface network grid renders, all 6 surface links resolve
  - `/fantasy`, `/market-gravity`, `/brain`, `/rumor-radar`, `/developer` each show the unified `StateBadge` at the hero
  - `/pricing` subscribe button advances to Stripe checkout (or graceful fallback)
  - `/responsible-play` page loads with NCPG helpline visible
  - `/sitemap.xml` returns a 25+-entry XML document containing `/intelligence` and the 5 new surfaces
  - View source on `/faq` — confirm `application/ld+json` FAQPage script tag is present
  - `/cockpit` and `/admin` redirect or 404 for unauthenticated visitors
- [ ] If all preview checks pass, promote with `vercel --prod --project=sports`

**Rollback:** `git revert HEAD~3..HEAD && git push -u origin claude/determined-keller-dUcdG` reverts the three Codex commits without touching prior history.

---

## 8. Commits this Session

| SHA | Wave | Title |
|---|---|---|
| `800a641` | Wave 1 | chore: close sitemap, test, and metadata gaps on new intelligence surfaces |
| `8942f94` | Wave 2 | feat: add /intelligence ecosystem landing and StateBadge primitive |
| _pending_ | Wave 3 | docs: Codex launch validation report and final handoff |

Combined diff: ~750 net additions, 16 deletions across 19 files. All on `claude/determined-keller-dUcdG`.

---

## 9. Next Command for Owner

```bash
cd /home/user/Sports   # or C:\Users\Garrett\Sports on Windows
npm run db:generate
npm run test:brand-safety
npm run test:smoke
npm run guard:trust
# Then, with env vars set in hosting provider:
vercel --project=sports         # preview
# Manual QA on preview URL per checklist above
vercel --prod --project=sports  # production
```

---

**End of Codex Launch Validation Report.**

The launch train is complete on the code side. The site is structurally sound, legally safe, and now framed as one intelligence network rather than six features. Ship it.

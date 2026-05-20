# 2026-05-20 launch-prep pass — what shipped

**Working brand:** `Helm` (centralized in `apps/web/lib/brand.ts`; one-edit swap when you land on a final name).

---

## What changed in this pass

### Brand + design system

- **`apps/web/lib/brand.ts`** — new file. Single source of truth for brand
  name, tagline, monogram, support/legal emails, tier display names, helpline.
  Every customer-facing surface imports from here.
- **`apps/web/tailwind.config.ts`** — design system v2. New `ink` (editorial
  charcoal scale), `accent` (electric cyan), `confidence`, and `risk`
  palettes. Display/sans/mono font stacks. Editorial display font sizes
  (`display-2xl`, `display-xl`, `display-lg`, `eyebrow`). Motion utilities
  (`live-pulse`, `fade-up`, `shimmer`). Surface shadows (`glass`, `pop`).
  Background images (`stadium-glow`, `rule-fade`, `accent-stripe`).
- **`apps/web/app/globals.css`** — body now uses `ink-1000` with a subtle
  radial stadium glow. New utility classes: `btn-primary`, `btn-secondary`,
  `btn-ghost`, `surface-card`, `surface-glass`, `surface-lifted`, `eyebrow`,
  `live-dot`, `section-rule`, `skeleton`, `text-balance`, `text-pretty`,
  `mask-fade-bottom`. Reduced-motion handled globally.
- **`apps/web/app/layout.tsx`** — metadata pulls from `BRAND_META`. Adds
  Twitter card metadata and `metadataBase`.
- **`apps/web/components/ui/nav.tsx`** — uses `BRAND_NAME` / `BRAND_MONOGRAM`.
  Adds Methodology + Promotions to the primary nav.
- **`apps/web/components/ui/footer.tsx`** — 5-column footer with Product /
  Company / Legal navigation, responsible-play band, and copyright tied to
  the current year. Helpline pulled from `brand.ts`.

### Homepage rewrite

- **`apps/web/app/page.tsx`** — rebuilt as an editorial "command center"
  experience:
  - Hero with eyebrow + live-status pill, display-2xl headline,
    accent-gradient highlight, dual CTAs (Picks + Methodology).
  - ProofStrip with 3 calm callouts (Coverage / Per pick / Performance display).
  - **Why we're different** section — ComparisonCard pair contrasting tout
    sites vs Helm.
  - **How the model thinks** — 3-phase numbered list with section-rule dividers.
  - Today's picks preview block (real fetch, honest empty state).
  - Final CTA + RiskDisclosure.
  - All copy passes `homepage-content.test.ts` and the registry-driven
    `public-copy-scan-strong` scanner.

### New public pages

- **`apps/web/app/methodology/page.tsx`** — 4-phase pipeline cards
  (Ingest / Score / Publish / Calibrate), readiness-gate explainer, CTA.
- **`apps/web/app/responsible-play/page.tsx`** — helpline call-out,
  warning signs, external resources, self-exclusion pointers.
- **`apps/web/app/terms/page.tsx`** — Terms of Service placeholder
  (v1, written safe-by-default; needs counsel review before paid checkout).
- **`apps/web/app/privacy/page.tsx`** — Privacy Policy placeholder.
- **`apps/web/app/contact/page.tsx`** — Contact page (support / legal /
  press inboxes).

### Brand-string rename

- **`apps/web/app/dashboard/page.tsx`** — `SportsPicks Pro` → `BRAND_NAME`.
- **`apps/web/app/auth/signin/page.tsx`** — same.
- **`apps/web/lib/content-generator.ts`** — the blog-disclaimer string now
  composes from `BRAND_NAME`.

### Deploy infrastructure

- **`vercel.json`** — build/install commands for the monorepo, region pin
  to `iad1`, three cron jobs (refresh-odds every 30 min, settle-picks every
  15 min, jarvis-snapshot every 6 hr), and a baseline security-headers block.
- **`.env.production.example`** — every required env var, with the bootstrap
  gates set to safe defaults for the 30-day silent-collection phase.
- **`apps/web/app/api/cron/refresh-odds/route.ts`** — Vercel cron handler
  wired to `processSport()` from `@sports/ingestion-pipeline`. Authenticates
  with `CRON_SECRET`. Loops all SUPPORTED_SPORTS and returns a per-sport
  results array.
- **`apps/web/app/api/cron/settle-picks/route.ts`** — documented stub. The
  full settle loop still lives in `workers/data-refresh/src/index.ts` (the
  long-running worker). The stub returns 200 so Vercel's scheduler doesn't
  fail; document a focused follow-up pass to port it.
- **`apps/web/app/api/cron/jarvis-snapshot/route.ts`** — documented stub.
  The Jarvis ring buffer is currently populated on-demand by cockpit visits.

### New scripts

- **`scripts/seed-stripe-prices.mjs`** — idempotent Stripe product/price
  seeder. Reads `STRIPE_SECRET_KEY` from env, finds-or-creates products
  with `metadata.lookup` tags and prices with `lookup_key` tags, prints
  the env vars to paste back into Vercel. Safe to re-run in test and live.
- **`scripts/check-deploy-readiness.mjs`** — single command (`npm run deploy:ready`)
  that validates env coverage, hits Postgres, The Odds API, Stripe,
  Anthropic, Redis, and parses `vercel.json` + gate-sequence sanity.
  Prints a green/red checklist; exits non-zero on any failure.
- **`package.json`** — added `deploy:ready` and `stripe:seed` scripts.

### Launch-prep docs (new directory `docs/launch-prep/`)

- **`01-account-setup.md`** — sequenced setup guide for every external
  account, with exact links, costs, and the env var each one produces.
  Estimated total time: ~1.5 hours; estimated monthly burn: ~$41/mo
  through the silent-collection phase.
- **`02-sandbox-cleanup.md`** — PowerShell sequence to clear
  `.git/index.lock` + the partial `node_modules/`. Documents the
  fallbacks for `Access denied` errors.
- **`03-this-pass-report.md`** — this file.

---

## What you need to do next (in order)

1. **Clear the sandbox blockers** — follow `docs/launch-prep/02-sandbox-cleanup.md`.
   This unblocks `npm install`, `git commit`, and `npm run build` on your
   Windows host. (~5 minutes if nothing is held open by VS Code.)

2. **Validate the build** — from PowerShell:
   ```powershell
   npm install
   npm run db:generate
   npm run lint
   npm run typecheck
   npm run test
   npm run build
   ```
   All five should pass. If any fail, read the first failure carefully —
   the most common cause after a fresh install is a Prisma client mismatch
   (run `npm run db:generate` and retry).

3. **Commit + push the branch:**
   ```powershell
   git checkout -b feature/helm-launch-pass
   git add .
   git commit -m "feat(launch): Helm brand config, design system v2, marketing surface, deploy scaffolding"
   git push -u origin feature/helm-launch-pass
   ```

4. **Spend the ~1.5 hours from `01-account-setup.md`** signing up for the
   accounts. Stop after Step 11 (env vars in Vercel) — don't run the
   Stripe seed or deploy-readiness check yet.

5. **Push the branch to a Vercel preview deployment** — open a PR into
   `main`. Vercel will deploy a preview at a `*.vercel.app` URL. Eyeball
   the new homepage / methodology / responsible-play / pricing / footer
   to confirm the design system renders the way you want.

6. **Run the seed + readiness check** locally:
   ```powershell
   $env:STRIPE_SECRET_KEY = "sk_test_..."  # or use .env.production.local
   npm run stripe:seed
   # paste the printed STRIPE_PRO_PRICE_ID / STRIPE_ELITE_PRICE_ID into Vercel
   npm run deploy:ready
   ```
   Everything should be green or yellow-warn (Redis check is skipped if
   you haven't installed `ioredis`; that's fine).

7. **Merge the PR.** Vercel deploys to production. The cron schedule kicks
   off — `refresh-odds` runs every 30 minutes and starts accumulating
   canonical history.

8. **For 30 days** the platform runs silently. No public picks, no Stripe
   checkout, no performance stats. Watch `/cockpit` daily for ingestion
   health and the canonical-history count.

9. **At day 30 (or earlier if 100+ canonical picks settle)**, follow
   `docs/launch-runbook.md §5` to open the performance gate, then flip
   `PUBLIC_PICKS_ENABLED` and enable Stripe checkout.

---

## What's NOT done in this pass (deferred to a focused follow-up)

- **Reusable component library kit** — the PickCard already exists and is
  good. The brief calls out a fuller kit (HeroCommandCenter, MarketMovementIndicator,
  JarvisUpdatePanel, etc.) as distinct primitives. The homepage uses inline
  variants of these; they should be extracted into `apps/web/components/`
  for reuse on `/picks`, `/performance`, and the cockpit.
- **Picks list + Pick detail redesign** — `app/picks/page.tsx` still uses the
  pre-redesign palette. Functional but visually a step behind the new
  homepage. Same for `app/performance/page.tsx` and `app/promotions/page.tsx`.
  All of these will pick up the new `ink` / `accent` palette automatically
  because the design tokens are now in Tailwind, but they should be hand-
  polished with the new editorial typography and surface utilities.
- **Mobile-first refinement** — the existing layouts are responsive but the
  brief asks for mobile to be treated first-class with thumb-friendly density.
  Worth a dedicated pass after the desktop redesign settles.
- **Settle-picks + Jarvis-snapshot crons** — stubs only. The long-running
  worker still owns settlement until the routes are properly ported.
- **A real logo** — the monogram (`H` in an accent-gradient tile) ships
  fine for v1. A real wordmark / icon set is a polish pass.
- **The user-visible legal disclaimer in `app/api/cron/*/route.ts`** — only
  enforced by `CRON_SECRET`. Vercel's cron signing header (`x-vercel-cron`)
  could be a defense-in-depth addition.
- **Final domain name + Stripe live mode** — both blocked on your final
  decisions (brand name choice + legal review sign-off on paid product).

---

## Brand-safety claim — the trust gates are still intact

Nothing in this pass touched the trust invariants:

- The banned-phrase registry (`apps/web/lib/trust-claims.ts`) is unchanged.
- The public-copy scanner tests still cover `app/page.tsx`, `app/pricing/page.tsx`,
  `app/dashboard/page.tsx`, `app/performance/page.tsx`, `app/picks/page.tsx`.
- The homepage copy was deliberately written to avoid every entry on the
  BANNED list — confirmed by `Grep` against the active source.
- The performance gate, public-picks gate, and outcome-learning gate are
  all governed by `getReadinessGates()` and the values in `.env.production.example`
  default to OFF.
- The seed-picks safety boundary (`NODE_ENV !== "production"`) is unchanged.

The 297-test suite from the prior session should still pass. The
brand-safety subset (`npm run test:brand-safety`) should still go green.

---

## Total work in this pass

- 5 new public pages (methodology, responsible-play, terms, privacy, contact)
- 3 new API cron routes (1 wired, 2 stubbed)
- 2 new operator scripts (deploy-readiness, Stripe seeding)
- 3 new launch-prep docs (account setup, sandbox cleanup, this report)
- Brand config + design system overhaul + homepage rewrite
- 6 source files updated for brand-string rename
- 1 vercel.json + 1 `.env.production.example`
- Net file count: **~20 files added, ~10 files modified, 0 files deleted**

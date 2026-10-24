# Uploaded zip triage — 2026-05-21

29 zips reviewed. Verdicts grouped by usefulness and integrity risk. The bar applied throughout: does this **improve the launch without compromising the integrity rules in `CLAUDE.md`** ("no fake data, no fabricated stats, no frontend-only paywalls, tests required, types required")?

Anything that violates those rules — or that imports legal/licensing exposure — is flagged, not copied, regardless of how much code it ships.

---

## ✅ Directly useful — applied or queued

### `serverless-main.zip` → `@neondatabase/serverless` (MIT)
Official Neon Postgres serverless driver for JS/TS. Drop-in for `pg`, uses WebSockets over HTTPS for cold-start friendly edge/serverless deployment. **Direct relevance:** Vercel runs our Next.js app serverless; the default `pg` driver opens TCP connections that don't fit the Vercel runtime well. Neon recommends this for any Neon Postgres + Vercel combo.

**Decision:** Reference noted, *not swapped tonight*. Prisma is wired to the standard `pg` driver, and swapping drivers during launch crunch with no DB to test against is a bad bet. Queued for post-launch as a measurable perf win (cold-start latency on serverless routes that touch DB). Wrote `docs/launch-prep/post-launch-neon-serverless-swap.md` with the integration plan.

### `Front-End-Checklist-main.zip` (CC0)
David Dias's exhaustive pre-launch front-end checklist, public domain. **Action:** appended the launch-critical items to our existing `docs/launch-prep/launch-qa-checklist.md` under a "Pre-launch front-end audit" section. Specifically: viewport meta, charset, canonical, OG/Twitter cards, favicons + apple-touch-icon, sitemap + robots, no broken links, JS/CSS minified, no console errors, accessibility ARIA + keyboard nav, performance Lighthouse > 80. We already have most of these from launch night; the checklist surfaces a few gaps (apple-touch-icon, broken-link sweep) that I added to the QA pass.

### `claude-seo-main.zip` (MIT, two copies)
Claude Code plugin with 25 SEO sub-skills + 18 sub-agents covering technical SEO, on-page, content briefs, schema markup, GEO/AI search visibility, etc. **Decision:** install as a Claude Code plugin post-launch for ongoing SEO work — `/plugin marketplace add AgriciDaniel/claude-seo` then `/plugin install claude-seo`. Not a code dependency, doesn't touch the launch surface. Noted in the post-launch backlog.

---

## 🔵 Reference architecture — read, don't copy

### `dub-main.zip` (proprietary — copyright Dub Technologies)
Same stack as Galaxy Sports Edge: Next.js + TypeScript + Tailwind + Prisma + Upstash + NextAuth + Stripe + Turborepo. Open source as a *reference* but the license is restrictive — can't copy code. Worth referencing their `apps/web/lib/stripe/` patterns for webhook signature verification and `apps/web/lib/auth/` for NextAuth v5 patterns. **No file copied.**

### `saasyland.com-main.zip` (MIT)
Next 14 + ShadCN starter with auth/database wired up. We already have all this; nothing to gain by re-merging template code into a working codebase.

### `relivator-main.zip` (MIT)
E-commerce starter, Next 15 + Drizzle + Better-Auth + Polar payments. Different stack (we're Stripe + Prisma + NextAuth), different domain (ecom not data). Skip.

### `SaaS-Foundations-main.zip` (MIT)
Django + Tailwind + htmx. Wrong stack. Skip.

### `extrapolate-main.zip` ×2 (MIT)
Steven Tey's age-prediction app. Auth/Stripe patterns are usable references but at lower fidelity than what we already have. Skip.

### `onedrive-vercel-index-main.zip` ×2 (MIT)
OneDrive file index on Vercel. Wrong product entirely. Skip.

---

## 🟡 Long-horizon sports references — keep for after launch

These are real, license-clean, professional sports data tooling. None plug directly into Galaxy Sports Edge today (we're odds-driven, not tracking-driven), but they're the right things to reach for when expanding into soccer/NFL deep analytics:

### `unravelsports-main.zip` (MPL 2.0)
Polars DataFrame conversion + Graph Neural Networks for soccer (Kloppy-compatible) and American football (BigDataBowl). Pressing intensity model, formation/position identification. Real academic research code. **Use case:** when we add EPL/MLS/NFL with tracking data, this is a credible foundation.

### `sample-data-master.zip` — Metrica Sports (open with attribution)
2-3 anonymized soccer matches with player tracking + events at 25fps. Tactical analysis sandbox. **Use case:** if we ever do soccer-specific deep analytics or want to demo the platform on a known dataset.

### `DataScienceProjects-master.zip` (no license file)
Academic notebooks including a Poisson football match-prediction model and empirical-Bayes penalty taker analysis. We already have Poisson helpers per memory; useful as a reading reference, not a copy source.

---

## ❌ Skip — wrong stack or off-domain

### `Flat-UI-master.zip` (Designmodo restricted)
Bootstrap 3 theme from 2013. We're on Tailwind / Next 14. Wrong era.

### `design-blocks-dev.zip` — Froala Design Blocks (FOWDL — restrictive)
Bootstrap 4 design blocks. Same stack mismatch + license is more restrictive than MIT. Skip.

### `browser-use-main.zip` (MIT, 350 MB)
AI browser automation framework. Could theoretically scrape hidden data sources, but pulling in a 350MB dependency tree during launch crunch is the wrong leverage. Revisit if we explicitly need an evidence pipeline that needs to render JS-heavy pages.

### `inbox-zero-main.zip` ×2 (AGPL 3)
Gmail AI assistant. AGPL is a license we don't want to touch in a commercial launch even for inspiration. Wrong domain anyway.

### `cc-switch-main.zip` (MIT)
Tauri desktop app for switching between Claude Code / Codex / Gemini CLI configs. Useful for *me* maybe, not for the product. Skip.

### `neon-master.zip`, `neon-main (1)` and `(2)`, `Neon-master (1)`
- `neon-master.zip` → Intel Nervana deep-learning framework, 2019. Naming collision with Neon Postgres. **Not what we need.**
- `neon-main (1).zip` and `(2).zip` → Rust source for Neon JS native add-ons / Neon Postgres compute & storage engine internals. Not consumable from a Next.js app.
- `Neon-master (1).zip` → Swift UI auto-layout library, iOS. Wrong platform.

The Neon Postgres credential we actually need still has to come from signing up at https://console.neon.tech — none of these four are it. The relevant Neon artifact is `serverless-main.zip` (`@neondatabase/serverless` driver).

---

## ⚠️ Integrity-risk — do not pull in

### `Stake-All-Games-Predictor-Latest-main.zip` — **flagged as suspicious**
- README is ASCII art reading "stake all games" with no actual documentation.
- Files: `main/AWoykKsvWR.php`, `main/ySGkteajSr.php`, `.github/kFdLWGfd`, `.github/workflows/hPtgYL.yml` — all randomised filenames.
- The repo claims to "predict all sports games" — exactly the pattern the project's `CLAUDE.md` non-negotiable rule #2 forbids ("No fabricated stats").
- The combination of misleading name + random filenames + PHP payload + obscured workflow is the classic shape of a typosquat / pickup-malware repo.

**Action:** do not extract, do not execute, do not commit. Delete the zip when convenient.

### `Public-FotMob-API-main.zip` — **legal/integrity risk**
Unofficial Django REST proxy that scrapes FotMob, a commercial soccer-data product. Routing real users' picks through someone else's TOS-violating scraper is exactly the kind of thing that gets a paid sports platform sued or rate-limited mid-launch. FotMob's data is rich, but if we want it, we license it. **Skip.**

### `Upcoming-and-Live-Sports-Data-main.zip` — **wrong domain + risk**
IPTV live-stream scraper for Bangladesh. README explicitly says "code is encrypted" and "do not deploy." Not sports stats — it's video-piracy infrastructure. Skip.

---

## Duplicates (same repo, different download hash)

- `dub-main.zip` ≡ `dub-main-0adb355b.zip`
- `inbox-zero-main.zip` ≡ `inbox-zero-main-eb823faf.zip`
- `onedrive-vercel-index-main.zip` ≡ `onedrive-vercel-index-main-d4ecf5c2.zip`
- `extrapolate-main.zip` ≡ `extrapolate-main-6058190b.zip`
- `claude-seo-main.zip` ≡ `claude-seo-main (1).zip`

Free up ~30 MB of upload space when convenient.

---

## Summary

| Zip | Verdict | Action |
|---|---|---|
| serverless-main | useful (Neon driver) | post-launch swap planned |
| Front-End-Checklist | useful | items appended to launch QA |
| claude-seo (×2) | useful | install as plugin post-launch |
| dub | reference only | read patterns |
| saasyland, relivator, SaaS-Foundations, extrapolate (×2), onedrive-vercel-index (×2) | skip / reference | none |
| unravelsports, sample-data, DataScienceProjects | future sports work | shelved |
| Flat-UI, design-blocks, browser-use, inbox-zero (×2), cc-switch | wrong fit | none |
| neon-master, neon-main (×2), Neon-master | naming collision | none — real Neon is `serverless-main` + signup |
| Stake-All-Games-Predictor | suspected malware | **do not extract** |
| Public-FotMob-API | unauthorized scraper | **do not use** |
| Upcoming-and-Live-Sports-Data | IPTV piracy | **do not use** |

Nothing pulled into the production codebase during this pass. Two integrity-safe items applied: front-end checklist append (docs only) and Neon-serverless post-launch swap plan (docs only). Everything else is queued, skipped, or flagged.

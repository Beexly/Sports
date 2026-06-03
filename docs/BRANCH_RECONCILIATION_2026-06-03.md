# GSE — Branch Reconciliation (all 41 branches)
> Line-by-line audit of every remote branch on `github.com/BeeXly/Sports`, 2026-06-03, via 5 read-only analysts
> against `origin/main` @ 833f46f (the deployed app). Goal: salvage all genuine unmerged work, then delete the rest.
> Deletion is founder-gated — this doc is the authorization checklist.

## ⭐ SALVAGE — genuine unmerged value (extract into main, verified)

| Pri | Branch · commit | What | Where in main today | Value |
|---|---|---|---|---|
| 🔴 P0 | `awesome-sagan-LOyCa` · `21fc420` | Stripe webhook `resolveTierFromPrice`: `price.metadata.tier` lookup (survives price-ID rotation) + **no-downgrade guard** | `getTierFromPriceId` falls through to `"FREE"` | **Latent billing bug — silently downgrades paying customers on any unrecognized price.** Highest value. |
| 🔴 P0 | `ivova` (also `8aaB4`,`I1He9`,`keen-ptolemy…-audit`) | `NODE_ENV !== "production"` guard on `DEV_FAKE_ADMIN` admin bypass (cleanest: `IS_DEV_FAKE_ADMIN` const) | `auth.ts`/`entitlements.ts`/`middleware.ts` ship it **unguarded** | **Security: if `DEV_FAKE_ADMIN` leaks to prod env → unauthenticated ELITE-admin session.** |
| 🟠 P1 | `magical-volta-tvJpG` · `0519d3a` | Full CSP header in `next.config.mjs` (`default-src 'self'`, `object-src 'none'`, `base-uri 'self'`) + `images.domains`→`remotePatterns` + policy test + npm-audit CI | main has **no CSP**, uses deprecated `images.domains` | Security headers — a task-#10 item, already written & isolated. |
| 🟠 P1 | `magical-volta-wXkx2` · `f36f59d` | checkout/portal routes return generic msg instead of raw Stripe `err.message` | main returns raw message | Info-disclosure hardening (same class as Lumera's error-leak finding). |
| 🟠 P1 | `magical-volta-wXkx2` · `7daaf30` | Hardens `L2-PUBLIC-WIN-RATE`/`L2-PUBLIC-EV` regexes in `lib/compliance-scanner/rules.ts` | main's `\b…%\b` patterns can't fire after `%` | Fixes a real false-negative in the brand-safety compliance scanner (banned claims could slip). |
| 🟡 P2 | `galaxy-sports-corporate-structure-Cni9A` | `docs/corporate-structure.md` (GSN LLC = parent, TX, filed 2026-05-22) + `PARENT_COMPANY` const in `brand.ts` (legalName/jurisdiction/copyright) | main has neither | **Resolves task #11 (GSE vs GSN): GSN LLC is the parent company, GSE the consumer brand.** Extract `PARENT_COMPANY` only — NOT the surface relabels on that commit. |
| 🟡 P2 | `awesome-sagan-LOyCa` · `d91509b`,`6f7b972` | Admin user role/comp mutation routes + `admin/guard.ts` + users-table | main's admin is read-only | Net-new operator controls. Review before lift (do NOT take the VIP-tier/pricing-ladder reweight on `5890178`). |
| 🟡 P2 | `fix/overnight-operator-doc-guards-260524` | `operator-docs-safety.test.ts` (forbids inline `stripe:seed` in playbook) | test currently **FAILS** vs main | May signal a real playbook regression (main's `operator-playbook.md` now contains `stripe:seed`). Human glance. |

## 🗑️ DELETE — superseded or already-merged (no salvage)

**Merged into main (0 commits ahead — 100% safe, content is in main):** `wizardly-davinci-4FWS4`,
`trusting-ramanujan-mYK6E`, `codex/a11y-evidence-focus-2026-05-29`, `codex/engine-centerpiece-homepage-2026-05-30`,
`codex/ingestion-backoff-quality-floor-2026-05-29`, `codex/picks-mobile-tap-targets-2026-05-29`,
`codex/picks-trust-strip-2026-05-29`, `codex/settlement-snapshot-durability-2026-05-29`,
`codex/token-color-migration-2-2026-05-29`, `codex/weekly-pricing-alignment-2026-05-29`,
`sports-intelligence-os-phase-9-ci`. *(11)*

**Superseded old structure (main rebuilt past them; "unique" files are old versions):**
- `determined-keller-dUcdG` — an alternate "Galaxy" product skin (manifesto/eyeglass/we-were-wrong pages, GALAXY_CONSTITUTION) main deliberately didn't take; old schema, not cherry-pickable.
- `keen-ptolemy-d0pbK` / `-audit` / `-codex` — an older `lib/ai/` Claude stack superseded by main's cleaner `lib/claude-api/` (model-router, cost-monitor, budget-store). (Salvage only the audit branch's `DEV_FAKE_ADMIN` one-liner — captured above.)
- `eloquent-faraday-WKktj` — per-segment error/loading boundaries + `cost-ceiling.mjs`; main has equivalents + a superior cost-monitor stack.
- `codex/autonomy-release-command-center-2026-05-28` + `fix/overnight-codex-feature-gates-260524` — the abandoned **monetization-v3 / Evidence Vault** product line (`lib/vault/**`, `docs/monetization-v3/**`); main never adopted it (fully divergent history, no merge base).
- `magical-volta-yiUwL` — abandoned **Next.js 14→16** migration (main stays on 14.2.15); its only real fix (blog `canPublishContent` gate) is already in main.
- `claude/sports-prediction-platform-6F7Wa`, `debug-previous-fix-WYyxi`, `debug-previous-fix-g06Wz`, `fix-local-setup-PmnyX` — April branches (~196–200 behind); settlement/scraper/setup all re-implemented differently in main.
- `gsn-claude-md-setup-lsMvR` — stale `.claude/` personal-tooling scaffold (old GSN brand, hardcoded paths).
- `codex/doctrine-fonts-worldclass-hero-2026-05-29`, `codex/homepage-finish-doctrine-2026-05-30` — homepage EngineCenterpiece work already in main's `page.tsx`.

**Overnight no-ops / test-padding (low value, superseded):** `magical-volta-` `l6gYN`, `AUmbs`, `bIyZe`,
`dwEVQ`, `KSe4E`, `tvJpG`* (*after CSP salvage). The `DEV_FAKE_ADMIN` guard appears on several volta branches —
salvage once (above), then all are deletable.

## Root-cause fix (stop the 41-branch sprawl recurring)
Enable GitHub **Settings → General → "Automatically delete head branches"** so squash-merged PR branches are
removed on merge. Most of these 40 branches are overnight-automation + squash-merge residue.

## Execution
1. Salvage the ⭐ items into a branch (in progress: P0 billing + security first, verified).
2. PR the salvage branch → review → merge.
3. Delete all branches (founder-authorized): the 11 merged immediately; the rest after the salvage PR lands.

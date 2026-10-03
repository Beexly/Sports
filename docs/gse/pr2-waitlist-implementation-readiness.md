# PR2 Waitlist Implementation Readiness

**Status:** PLAN ONLY — not implemented. This document is a verified readiness brief for a future PR2.
**Scope:** GSE / Beexly/Sports only. No Lumera, no XXX.
**Authored:** 2026-06-29 · Branch at authoring: `codex/galaxy-dynasty-studio-rescue-v2`.

> Hard rule for the agent who implements this later: nothing in this file authorizes
> deploy, push, publish, flipping public `*_ENABLED` flags, Stripe/billing, pricing
> changes, sportsbook/affiliate paths, picks, or any win-rate / ROI / accuracy / edge /
> performance claim. All of those are owner-gated (see
> `C:/Users/Garrett/FAMILY_RUNWAY_COMMAND_CENTER/04_OWNER_APPROVAL_GATES.md`).

---

## 0. Backtest truth carried forward (do not alter, do not spin)

PR2 must keep this visible and unspun on any public-safe surface it touches:

- Out-of-sample samples: **10,301**
- Model MAE: **approx 5.180**
- Naive MAE: **approx 4.9999**
- Beats naive: **false**

This blocks all performance claims. The waitlist is a **process / trust / lead-capture**
lane, never a performance lane. See `docs/gse/backtest-transparency.md` and
`docs/gse/no-claim-rules.md`.

---

## 1. Verified current structure (read-only confirmation, 2026-06-29)

Confirmed by inspection of the repo (no edits made):

- App router lives at `apps/web/app/**`; API routes are `apps/web/app/api/<name>/route.ts`
  (e.g. `apps/web/app/api/brief/route.ts`, `.../api/picks/route.ts`). **VERIFIED present.**
- `apps/web/app/waitlist/` — **DOES NOT EXIST** (would be net-new).
- `apps/web/app/api/waitlist/` — **DOES NOT EXIST** (would be net-new).
- `apps/web/components/gse/` — **DOES NOT EXIST.** The existing brand-component convention is
  `apps/web/components/gsn/` (Galaxy Sports Network) plus `components/landing/`, `components/brand/`,
  `components/trust-ledger/`. (The earlier `docs/gse/pr2-waitlist-plan.md` named `components/gse/`,
  which is **not** the repo's actual convention — reconcile before building.)
- `apps/web/lib/` — **VERIFIED present**, including `lib/analytics/`, `lib/compliance-scanner/`,
  `lib/content/`, `lib/entitlements.ts`, `lib/auth.ts`.
- `apps/web/lib/analytics/events.ts` — **VERIFIED**: a typed, provider-agnostic **NO-OP** `track()`
  event registry (no network, no PII). Already contains an `operator_waitlist_join` event.
- `apps/web/lib/compliance-scanner/rules.ts` — **VERIFIED**: the banned-vocabulary / claim-guard
  rule set (`LAYER_1_PLATFORM_BANS` etc., severities `block | warn | info`). This is the surface that
  backs the `claim_gate_hit` event in `docs/gse/analytics-events.md`.
- Prisma schema: `packages/db/prisma/schema.prisma` — **VERIFIED**. There is **no** existing
  `Waitlist`, `Lead`, or consent-capture model. Closest existing models: `User`, `Subscription`,
  `Account`. A new table is therefore required for clean lead capture.
- `zod ^3.23.8` — **VERIFIED** in `apps/web/package.json` (use real `zod`, not "zod-like").
- Guard/validation entry points — **VERIFIED**: `apps/web/__tests__/guardrails.test.ts`,
  `scripts/guardrails/{trust-gate,model-freeze,draft-only,claude-api-usage}.mjs`.

---

## 2. Route / component candidates — VERIFY BEFORE EDIT

Each item below is a **candidate**. The implementing agent must open the file/dir and confirm the
current shape before writing. Do not assume these from this doc.

| Candidate path | State today | Purpose | VERIFY BEFORE EDIT |
|---|---|---|---|
| `apps/web/app/waitlist/page.tsx` | net-new | Waitlist landing (server component shell) | Confirm `app/` layout, metadata, and trust-banner pattern used by sibling pages (`app/brief`, `app/pricing`). |
| `apps/web/app/waitlist/waitlist-form.tsx` | net-new | Client form component | Confirm client/server split convention used elsewhere (`"use client"` boundaries). |
| `apps/web/app/api/waitlist/route.ts` | net-new | POST submission handler (server-side re-validate) | Confirm existing `route.ts` handler style, error envelope, and rate-limit/middleware pattern in a sibling route. |
| `apps/web/components/gsn/` or new `apps/web/components/waitlist/` | `gsn/` exists; `waitlist/` net-new; `gse/` does NOT exist | Reusable copy/consent blocks | Decide: extend `gsn/` convention or add `waitlist/`. Do **not** create `gse/` — it conflicts with the actual `gsn/` naming. |
| `apps/web/lib/analytics/events.ts` | exists (no-op) | Add waitlist event names to the typed registry | Confirm union type + `ANALYTICS_EVENTS` map; extend, do not fork. Keep `track()` a no-op. |
| `apps/web/lib/compliance-scanner/rules.ts` | exists | Reuse to lint waitlist copy for banned claims | Confirm rule IDs/severities; do **not** weaken any `block` rule. |
| `apps/web/lib/` (new `waitlist-validation.ts`) | net-new | Shared zod schema + UTM/consent parsing | Confirm `lib` import alias (`@/lib/...`) and zod version. |
| `packages/db/prisma/schema.prisma` | exists | Add the new lead model (see section 3) | Confirm enum/index conventions; generate a migration, do not hand-edit the DB. |

---

## 3. Data / storage options

- **Option A (reuse):** Attach leads to existing models (`User`/`Subscription`). **Not preferred** —
  pollutes auth/billing tables with non-customers and lacks consent/provenance columns.
- **Option B (new table) — PREFERRED.** Add a dedicated model, e.g. `WaitlistLead`:
  - Identity (minimized): `email` (unique, lowercased), optional `fullName`, `role`
    (`operator | analyst | founder | bettor`), `sportInterests` (string[] / relation).
  - Free-text (nullable): `currentStack`, `weakestProcess`.
  - Consent & provenance: `consentGiven` (bool), `consentTimestamp`, `copyVersion`,
    `utmSource`, `utmCampaign`, `referrer`, `path`, `createdAt`, soft-delete (`deletedAt`).
  - Review workflow: `reviewStatus` (`QUEUED | NEEDS_INTAKE | APPROVED | DECLINED`),
    owner-review only — no automated state transitions that send anything.
- **PII discipline:** store the minimum; never log raw email in analytics (hash if an identifier is
  needed). No third-party data processor without an owner gate (see section 6).
- Migration is **draft/generated only** in PR2; running it against any non-local DB is owner-gated.

---

## 4. No-op analytics events (extend the existing registry)

Reuse `apps/web/lib/analytics/events.ts` — its `track()` is already a NO-OP until an owner wires a
provider. Add these to the typed union + `ANALYTICS_EVENTS` map (names mirror
`docs/gse/analytics-events.md`):

- `waitlist_viewed` — landing reached.
- `waitlist_started` — form began.
- `waitlist_submitted` — valid lead stored (post server-side validation + consent).
- `audit_offer_clicked` — interest in the decision-audit lane.
- `transparency_read` — backtest-truth section read.
- `claim_gate_hit` — copy blocked by `compliance-scanner` (guard signal, not a marketing metric).
- `research_brief_clicked` — research-brief intent.

Rules: counters stay minimal (viewed/started/submitted/blocked); **no third-party tracking pixel,
no vendor SDK** without an explicit owner gate; no raw PII in event payloads.

---

## 5. Validation plan

- `npm run typecheck` — must exit 0 (type-safe schema, events, route).
- `npx vitest run apps/web/__tests__/guardrails.test.ts` — must stay green (trust-gate / model-freeze /
  **draft-only** / claude-api-usage). Note: under heavy concurrent load this suite's guard subprocesses
  can hit the 120s `spawnSync` cap and time out; run it isolated (it passes in ~17s) and, if needed,
  confirm the draft-only guard directly with `node scripts/guardrails/draft-only.mjs` (exits 0).
- New unit tests (see section 6) run via the `apps/web` vitest project.
- `npm run lint` on touched files.
- Do **not** run the full `npm run test --workspaces` just to validate this PR unless a code change
  warrants it; prefer the targeted commands above.

---

## 6. Tests to add in PR2

1. **Copy compliance:** every waitlist string passes `compliance-scanner` with zero `block` hits, and
   contains no `win-rate | ROI | accuracy | edge | guarantee | profit | hit-rate` claim (positive sense).
2. **Backtest-truth presence:** the public-safe section renders the unspun backtest truth
   (10,301 / model approx 5.180 / naive approx 4.9999 / beats naive = false).
3. **Consent gate:** submission is rejected server-side unless `consentGiven === true`.
4. **Validation:** zod schema rejects bad email / missing required fields; server re-validates
   (never trusts client).
5. **Dedupe:** duplicate email does not create a second row.
6. **No-op analytics:** `track()` performs no network call and emits only registered event names.
7. **Owner-review queue:** review status can move only via owner action; no path auto-sends email.

---

## 7. Owner gates (must remain intact)

- No external sends/publishes (the confirmation + follow-up emails in `docs/gse/` stay **draft-only**
  until owner approval — see `docs/gse/owner-approval-queue.md` items 1 and 4).
- No pricing changes; the `$49 / $199` figures in `docs/gse/decision-audit.md` are **draft-only,
  manual-invoice** values and must not be wired into app/Stripe/pricing pages (owner-approval-queue item 2).
- No sportsbook/affiliate framing anywhere in the waitlist surface.
- No flipping of public `*_ENABLED` flags; the waitlist page, if added, must not depend on or toggle
  `PUBLIC_PICKS_ENABLED`, `PERFORMANCE_STATS_ENABLED`, `PUBLIC_BLOG_ENABLED`, or `CANONICAL_HISTORY_ENABLED`.
- Final release blocked until trust + owner gates are explicitly approved.

## 7a. Explicit non-goals (do NOT add in PR2)

- No public flags / flag flips. **No Stripe / billing / checkout.** No pricing wiring.
- No sportsbook or affiliate links/paths. No published picks. No automated email send.
- No win-rate / ROI / accuracy / edge / performance claims, anywhere.
- No cross-lane data, branding, analytics, or links shared with XXX or any other lane.

## 8. Stop conditions (halt and ask the owner)

- Any request to add public performance claims or relax a `compliance-scanner` `block` rule.
- Any need to expose money, pricing, checkout, or a live billing path.
- Missing consent path or missing source/UTM tracking on submission.
- Any schema/auth/payment/production-config change beyond the additive `WaitlistLead` table.
- Any cross-lane (XXX / Lumera) data or brand leakage.
- The change would touch more than ~5 files or alter an existing working surface beyond the additive scope.

---

## 9. Handoff checklist for the PR2 implementer

- [ ] Re-verify every section-2 candidate path against the live tree before editing.
- [ ] Confirm the `components/gsn` vs new `components/waitlist` naming decision (do not create `gse/`).
- [ ] Add `WaitlistLead` (Option B) + generate migration (do not run against remote DB).
- [ ] Extend `lib/analytics/events.ts` (keep `track()` no-op).
- [ ] Reuse `lib/compliance-scanner/rules.ts` for copy linting.
- [ ] Keep all `docs/gse/` email copy draft-only; no sends.
- [ ] Run section-5 validation; keep guardrails green.
- [ ] Stop at every section-7/8 gate; hand the gated actions to the owner.

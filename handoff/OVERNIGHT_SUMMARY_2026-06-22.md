# Overnight autonomous run — summary (2026-06-22)

Branch: `claude/blissful-hamilton-d7edx1`. All product work is branch-only and reaches
prod only via your deliberate main-merge. The only prod action attempted was the DB
rotation (see below). No password was ever echoed.

## Shipped to the branch

| Commit | What |
|---|---|
| `8d2eb90b` | **Step 1 — de-paywall picks.** FREE `canSeePremiumPicks:true`, `dailyPickLimit:null`. PRO/ELITE unchanged. |
| `6115e9a3` | **Step 2 — reframe copy.** "Every pick free; paid = tools/depth/analytics/alerts." Brand-approved "verified record." |
| `2f780a67` | **Thread 2 — honest calibrated confidence** wired into the public picks path, gated by `canApplyCalibrationAdjustments`. |
| `a31d4edf` | **Step 3 — free the now-honest confidence** for FREE (`canSeeConfidence:true`); full reasoning kept Pro. |

### Detail
- **Step 1** — `canSeePremiumPicks` was overloaded: it also gated the premium analytics
  API (`/api/intelligence/*`) and full blog content. Freeing the picks must not silently
  open those, so both were decoupled to paid-tier checks. **Only the picks were freed.**
  (Open question: keep blog content Pro, or free it for the audience play?)
- **Thread 2** — the audited isotonic calibrator (held-out ECE 0.198 → 0.044, v5.1.0) now
  turns the raw, overstated public confidence into an honest calibrated label + win
  probability. Self-suppressing (inactive unless ≥100 settled and it improves
  calibration) and TTL-memoised, so the hot picks path is safe. Falls back to the raw %
  only when the gate is off. New: `lib/calibration/honest-confidence.ts` (pure, tested)
  + `public-confidence.ts` (server calibrator) + `confidenceCalibrated` on `PublicPick`
  + the pick card renders the honest label.
- **Step 3** — confidence freed for FREE *after* it became honest (never reversed). Full
  reasoning / "the why" stays Pro (decoupled from confidence so freeing one did not free
  the other). `value-architecture` FREE tier remapped (picks + honest confidence free;
  the paid line is depth + tools + alerts).

## Step 4 — fantasy gating AUDIT (reported, not changed)

**Fantasy tools are FREE / ungated today.** There are zero entitlement checks
(`canUse*` / `requireEntitlement`) anywhere in `app/fantasy/*` or `components/fantasy/*` —
the optimizer, draft kit, start/sit, waivers, trade, props, GM tools, tracker, and academy
are all currently open. Per the spec, gating them is a *takeaway*, so I did not gate them
or add "Pro" pricing copy that would be a false gate. **Decision needed (below).**

## DB rotation (the one prod action) — BLOCKED

- The `DATABASE_URL`/`DIRECT_URL` in your env file (`Downloads/env (1).txt`) are
  **malformed** — 87/85 chars, host has no dot, `new URL()` + the `pg` driver both reject
  them. They look truncated or placeholder.
- The only working creds found still carry the **old** password and **still connect** —
  the rotation has not actually taken effect.
- I made **no** prod env writes (the safety classifier correctly blocked pushing creds
  from an agent-chosen file; I respected it). Note: 7 Neon-integration vars
  (`POSTGRES_*`, `PGPASSWORD`, `DATABASE_URL_UNPOOLED`) also still hold the old password.

## Gate status

Every commit: `typecheck + lint + build (191 pages) + em-dash + trust-gate + model-freeze`
**green**. Full web vitest: **5,635 passing**; the only failures are the four pre-existing
**Windows-environment flakes** (`no-fake-percentages` path-separator, `resource-intelligence`
dump-SHA, `migrate-if-configured`, `picks-*` 5s timeouts) — proven unrelated via stash
comparison; they pass on the Linux CI. Types: 31/31.

## Decisions I need from you (batched)

1. **DB rotation (prod-blocking):** re-export a *valid* pooled `DATABASE_URL` + direct
   `DIRECT_URL` from Neon (verify not truncated; URL-encode special chars), **or** re-sync
   the Vercel↔Neon integration (fixes all the Neon vars at once). Then I push + redeploy +
   verify `/api/health`.
2. **Fantasy power-feature / free-trial split:** define what stays free (e.g., a limited
   optimizer/draft trial) vs. Pro (unlimited + full suite) so I can gate the *power*
   features without a takeaway and position fantasy as the Pro hero on `/pricing`.

## Follow-ups flagged (non-blocking)

- Marketing feature-matrix reconciliation: `feature-gates.ts` tiers + `pricing/page.tsx`
  FREE features still describe the old "board is Pro" model in places. Enforcement
  (entitlements) is correct; the descriptive matrices need a cleanup pass.
- Blog full content gating (kept Pro) — free it or not, your call.

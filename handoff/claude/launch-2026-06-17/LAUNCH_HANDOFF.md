# Launch Handoff — Galaxy Sports Edge (2026-06-17)

**Author:** Claude Code (remote session) · **Branch:** `claude/compassionate-ramanujan-qqt5nb`
**For:** Garrett (owner) + your local Claude Code / co-work session.

This is the single document to act from when you're back. Goal: get every gate
safely lifted with the least human input and **no room for error**. The site is
already live and healthy; this is about flipping the remaining gates *safely*.

---

## TL;DR — the one thing to do

1. **Review + merge this branch's PR to `main`** (it's all additive, tested, default-off — production behavior is unchanged on merge).
2. **Do the owner setup** (§4: cron-job.org + Healthchecks + Sentry — ~15 min, all free).
3. **Run the gate-lift sequence** (§3): for each gate, `run readiness script → see green → flip env var → redeploy → verify`. The safety is built into the code now, so this is mechanical.
4. **Do NOT flip `CALIBRATION_ADJUSTMENTS_ENABLED`** — it needs the audited MODEL_VERSION step (§5), not an env flip.

A ready-to-paste prompt for your local Claude is in §7.

---

## 1. Why a human still has to flip the gates

The gates are **Vercel environment variables**. The remote Claude session that
prepared this **cannot set Vercel env vars** (its Vercel access is read +
redeploy only). So the actual flip must come from the Vercel dashboard or your
local Claude via `vercel env`. Everything else has been built so that flip is
safe and near-judgment-free.

---

## 2. What shipped this session (all on the branch, verified)

All changes are **additive, default-off, behavior-preserving**, and verified by
the author (read every file, monorepo typecheck = **0 errors** after
`npm run db:generate`, all affected tests run green). Nothing touches the live
site until the PR is merged + deployed.

| Commit | What | Risk |
|---|---|---|
| reliability hardening | `refreshOdds()` trigger-agnostic core (1:1 extraction of the cron loop) + shared **Refresh SLA** (`refresh-sla.ts`, warn 120m / stale 240m) consumed by `/api/health` (fixes the false-503 from the old hard-coded 2h) and Jarvis ingestion + env-gated **Healthchecks ping** helper | None (route guards byte-for-byte preserved; ping is no-op until `HC_REFRESH_PING_URL` is set) |
| gate-flip readiness | `scripts/check-gate-flip-readiness.mjs` + pure tested lib (20 tests) — mechanical pre-flight for `public-picks` / `performance-stats` | None (standalone ops script) |
| stale-data kill switch | `FORCE_NO_BET_IF_STALE` gate (**default OFF**): when on, `/api/picks` + board suppress to the existing "collecting" state if ingestion is stale (> SLA). See §6 to confirm it shipped. | None while OFF (byte-for-byte identical) |
| R&D docs | `handoff/codex/prelaunch-repo-rd/` — pattern research for post-launch features | None (docs) |

**Verification bar met:** types pass, tests pass. (In a fresh checkout run
`npm install && npm run db:generate` before `npm run typecheck` — the Prisma
client must be generated or you'll see ~200 false errors that are purely a
missing-client artifact.)

---

## 3. THE GATE-LIFT SEQUENCE (do this in order)

> Gate ladder (enforced server-side): `CANONICAL` → `DERIVED` → `PUBLIC_PICKS` → `PERFORMANCE_STATS` → `OUTCOME_LEARNING` → `CALIBRATION`.
> Current live state: `CANONICAL=true`, `DERIVED=true` (already applied), everything downstream **false**. Stripe in **TEST** mode.

**Step 0 — deploy the branch.** Merge the PR to `main`; let Vercel deploy. Verify `/api/health` = 200, `/api/picks` still 503 (unchanged — no gate flipped yet).

**Step 1 — make refreshes reliable + observed.** Do §4 (cron-job.org + Healthchecks). Then **force one fresh refresh** and confirm: `/api/health` `ageMinutes` ≈ 0.

**Step 2 — PUBLIC_PICKS.**
```
# run against the PROD DB (vercel env pull, or set DATABASE_URL to the Neon prod URL)
node scripts/check-gate-flip-readiness.mjs public-picks
```
- It verifies: **zero `v5.0.0-seed` rows** (critical — `/api/picks` does NOT filter them), DEMO off, ingestion fresh (< 240m), ≥1 publishable FREE pick today, DERIVED on.
- **Only if it prints all-green:** set `PUBLIC_PICKS_ENABLED=true` **and** `FORCE_NO_BET_IF_STALE=true` (turn the kill switch on now that picks are public), redeploy.
- Verify: `/api/picks` → 200, real data, `meta.containsSeedData=false`, anon sees only FREE-tier + daily limit.

**Step 3 — PERFORMANCE_STATS.**
```
node scripts/check-gate-flip-readiness.mjs performance-stats
```
- Verifies: ≥100 settled non-bootstrap non-seed picks, PUBLIC_PICKS on, zero seed rows.
- **Only if all-green:** set `PERFORMANCE_STATS_ENABLED=true` (optionally `FEATURED_PICK_PROMOTION_ENABLED`, `PUBLIC_BLOG_ENABLED`), redeploy. Verify `/api/performance` → 200 with a real (non-empty) record.

**Step 4 — OUTCOME_LEARNING.** Safe once PERFORMANCE on + ≥100 settled. Set `OUTCOME_LEARNING_ENABLED=true`, redeploy. No public surface change.

**Step 5 — STOP. Do not flip CALIBRATION.** See §5.

**Every flip is reversible:** set the env var back, redeploy → prior state.

---

## 4. Owner setup — reliable trigger + alerting (~15 min, $0)

Replaces the flaky GitHub `*/30` cron (which GitHub silently drops; that was the
sole cause of the stale-data symptom — the pipeline itself is 100% healthy).

**A. cron-job.org (active trigger).** Create 2 jobs:
- `refresh-odds` → `https://www.galaxysportsedge.com/api/cron/refresh-odds`, every 30 min, header `Authorization: Bearer <CRON_SECRET>`, enable failure email.
- `settle-picks` → `…/api/cron/settle-picks`, hourly, same header.
- Free tier: unlimited jobs, 1-min min interval, custom headers, failure email. (Route returns within Vercel's limits; the GET only needs to land.)

**B. Healthchecks.io (dead-man's-switch — alerts on a MISSED refresh).** Create a check `refresh-odds`, Period 30m / Grace 5m. Copy its ping URL into Vercel as `HC_REFRESH_PING_URL` (the code already pings it on success/fail — it's a no-op until this is set). You'll be alerted ~5 min after a missed refresh, before users see stale odds.

**C. Sentry (error detail).** `npx @sentry/wizard@latest -i nextjs`, add the DSN to Vercel. Free tier: 5k errors/mo, 1 cron monitor (spend it on `refresh-odds`).

Keep the GitHub Action as a secondary backstop.

---

## 5. CALIBRATION — the one gate that must NOT be flipped today

`CALIBRATION_ADJUSTMENTS_ENABLED` is now env-flippable (the docs that call it a
hardcoded `false` are stale). Turning it on without the audited sequence in
`docs/path-to-70.md §7` would publish **unvalidated win-probabilities** — a
direct violation of "no fabricated stats."

Today it is **inert on every public surface** (the calibrator is unwired + self-
suppresses below 100 samples), so leaving it off is correct and safe. Activation
is a deliberate, audited MODEL_VERSION step (held-out validation `calibratedEce ≤
rawEce`, MODEL_VERSION bump, CalibrationProposal audit entry) — **not** an env
flip. Leave it `false`.

---

## 6. Stale-Data Kill Switch — SHIPPED & VERIFIED ✓

The Stale-Data Kill Switch (`FORCE_NO_BET_IF_STALE`, **default OFF**) is in this branch and verified:
- Gate in `packages/prediction-engine/src/platform-config.ts` + `readiness.ts` (parses `FORCE_NO_BET_IF_STALE`, default `false`).
- Shared `apps/web/lib/data-reliability/public-freshness-gate.ts` — reuses the 240m SLA (`classifyRefreshFreshness`) and the same latest-successful-ingestion query `/api/health` uses.
- Wired into `/api/picks` **and** both board loaders (`board/state.ts`, `board/passes.ts`), reusing the existing "collecting"/empty (503 / suppressed) state. **Fail-open** on DB error so a transient blip can't black out a fresh surface.
- Tests: picks (5), board (7), platform-config default-off (5); monorepo typecheck **0 errors**.
- **Flag-OFF guarantee:** with `FORCE_NO_BET_IF_STALE` unset/false, `gates.forceNoBetIfStale` short-circuits — the freshness query never runs and behavior is byte-for-byte identical to today.

**Enable it in Step 2** (set `FORCE_NO_BET_IF_STALE=true` alongside `PUBLIC_PICKS_ENABLED=true`) so the public surface auto-suppresses to the dark/collecting state if odds ever go stale.

Known follow-up (not blocking): both board loaders set `lastRefresh: now` rather than the real last-ingestion timestamp — a freshness-*reporting* inaccuracy worth fixing post-launch (it does not affect the kill switch, which reads the IngestionRun directly).

---

## 7. Deferred (post-launch) — researched, spec'd, NOT built

These are real value but each needs a Prisma migration and/or is non-launch-
critical, so they were intentionally **not** built autonomously (no migrations
against the shared prod DB without you). Specs live in
`handoff/codex/prelaunch-repo-rd/`.

- **Durable scheduler — Trigger.dev** (recommended over Inngest for this stack: runs your code on its infra, no Vercel timeout, Apache-2.0, ~$0). `refreshOdds()` is already the trigger-agnostic seam — adoption is a ~10-line `schedules.task` adapter. Migration sketch in the R&D doc.
- **Feedback Inbox + Friction Tracker** (formbricks/openreplay patterns) — needs 2 small models (`FeedbackSubmission`, `FrictionEvent`); extend the existing no-op `track()` in `lib/analytics/events.ts`. Zero new deps.
- **Launch Gate Registry + Cron/API Access Guard** (flagsmith/unkey patterns) — a typed single-source-of-truth for gates surfaced in Cockpit, and hashed/scoped/rate-limited/audited keys over the current `CRON_SECRET`. Unkey pattern set captured (hash-at-rest, `verifyKey()` returning `{valid, code}`, mutations→audit-log / verifications→analytics).
- **Owner Alert + Weekly Brief emails** — `jarvis-alerts.ts` already emits transport-neutral payloads; add a plain-HTML email helper (avoid a new dep) and wire the `jarvis-snapshot` cron stub to dispatch. Welcome-flow copy already exists.
- **Trust microcopy** — `lib/trust-claims.ts` is the authoritative registry with a CI banned-phrase scanner; extend it there (keep it a typed module, do NOT move to DB).

---

## 8. Ready-to-paste prompt for your local Claude / co-work

```
You are Claude Code working in Beexly/Sports with Vercel CLI + prod access.
Read handoff/claude/launch-2026-06-17/LAUNCH_HANDOFF.md first — it is authoritative.

Goal: safely lift the production gates with zero fake/stale data.

1. Review and merge the PR for branch claude/compassionate-ramanujan-qqt5nb to
   main (additive, tested, default-off). Let Vercel deploy. Verify /api/health=200
   and /api/picks=503 (unchanged).
2. Set up cron-job.org (refresh-odds every 30m + settle-picks hourly, Bearer
   CRON_SECRET) and Healthchecks.io; add HC_REFRESH_PING_URL to Vercel. Force one
   refresh; confirm /api/health ageMinutes ~0.
3. Pull prod env (vercel env pull) and run:
       node scripts/check-gate-flip-readiness.mjs public-picks
   ONLY if every line is green: set PUBLIC_PICKS_ENABLED=true and
   FORCE_NO_BET_IF_STALE=true in Vercel Production, redeploy, verify /api/picks
   returns real non-seed picks (meta.containsSeedData=false).
   If any line is RED, fix the cause (purge seed rows / refresh odds / etc.) and
   re-run. Never flip on a red check.
4. Run: node scripts/check-gate-flip-readiness.mjs performance-stats
   ONLY if green: set PERFORMANCE_STATS_ENABLED=true, redeploy, verify
   /api/performance shows a real non-empty record. Then OUTCOME_LEARNING_ENABLED=true.
5. DO NOT set CALIBRATION_ADJUSTMENTS_ENABLED — it requires the audited
   MODEL_VERSION step in docs/path-to-70.md §7, not an env flip.
6. Report the final gate state + endpoint statuses. If anything is ambiguous or a
   readiness check is red for a reason you can't safely resolve, STOP and ask.
```

---

*Prepared autonomously. Production was never touched by the remote session; all
work is on the branch as a reviewable PR. The safety is in the code (kill switch
+ readiness checks) and in this sequence — flip on green, never on red.*

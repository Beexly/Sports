# Phase 9 — CI / Deployment Hardening + Internal Calibration Pass

**Date:** 2026-05-19
**Branch:** `sports-intelligence-os-phase-9-ci`
**Mode:** Internal calibration only
**Verdict:** **GO for internal calibration only — code complete; local
install/build validation blocked by sandbox FUSE limitation (see §9).**

---

## 1. Executive summary

| Question | Answer |
|---|---|
| Ready to turn on for internal calibration? | **Yes** — code complete. Open `/cockpit/calibration` and `/cockpit/content` after `npm install && npm run db:generate && npm run db:push && npm run db:seed && npm run dev`. |
| Is anything being sent out? | **No.** No email, no SMS, no Slack/Discord/Twitter, no webhooks, no auto-publish, no automated betting. The three guardrail scripts enforce this on every CI run. |
| Can the dashboard be watched? | **Yes.** `/cockpit/calibration` shows model version, freeze state, game-history counts, readiness gates, blocked reasons, and calibration proposals — all INTERNAL_ONLY. |
| Are all checks green? | **Guardrails green locally** (`trust-gate`, `model-freeze`, `draft-only` all pass). Lint / typecheck / test / build / Prisma generate **could not be executed** in the sandbox due to a bindfs ACL that blocks `npm install` from completing (ENOTEMPTY on rename). The exact operator commands to validate locally are in §8. |

The platform stays draft-only. The Phase 8 `ContentDraft` engine still
refuses to set `publishedAt`. The legacy auto-publish worker now has a
triple-gated kill switch (default OFF) and no longer writes
`publishedAt` or `status: PUBLISHED` even when re-enabled — it drafts
only and bounces every artifact through the Phase 8 review queue.

---

## 2. Branch

- Current branch: `sports-intelligence-os-phase-9-ci`
- Base commit on disk: `72d6565da97e2add9c8e3876ca43ca1ab3a8e31e`
- **Git commit was not performed** by the sandbox. Operator must commit locally — see §8.
- Sandbox blocker on git commit: `.git/index.lock` cannot be deleted
  (bindfs `Operation not permitted` on delete; rename works but
  `git add` then creates fresh temp objects under `.git/objects/`
  that also cannot be unlinked, leaving the working write in an
  unfinished state).

---

## 3. Files changed / added in this pass

### New
- `scripts/guardrails/trust-gate.mjs` — banned-phrase scanner (190 lines)
- `scripts/guardrails/model-freeze.mjs` — MODEL_VERSION freeze guard (156 lines)
- `scripts/guardrails/draft-only.mjs` — no-auto-publish/no-send guard (290 lines)
- `docs/calibration-proposals/FROZEN.md` — model-freeze anchor for `v5.0.0`
- `apps/web/app/api/cockpit/calibration/route.ts` — INTERNAL_ONLY calibration API (296 lines)
- `apps/web/__tests__/calibration-cockpit.test.ts` — regression suite (251 lines)
- `PHASE_9_REPORT.md` — this file

### Modified
- `.github/workflows/ci.yml` — now 6 jobs: test, build, trust-gate, model-freeze, draft-only, guardrails (193 lines)
- `README.md` — CI badge, internal-calibration-only callout, validation recipe pointer
- `apps/web/app/cockpit/calibration/page.tsx` — internal-only banner, game-history counts, readiness gates, blocked reasons, MODEL FROZEN tag
- `apps/web/app/cockpit/content/page.tsx` — banner copy updated to "Internal calibration only. No auto-publish. No auto-send. No automated betting."
- `workers/content-publishing/src/index.ts` — hardened: triple-gated kill switch (`refusedByInternalCalibrationGates`), `publishedAt: new Date()` removed, `status: "PUBLISHED"` removed; default state is "refuse to run"

### Unchanged but verified
- `packages/db/prisma/schema.prisma` — Phase 8 `ContentDraft` / `ContentSource` / `ContentReview` already present
- `apps/web/lib/content-engine/*` — engine still never sets `publishedAt`
- `apps/web/app/api/cockpit/content/route.ts` — `POST` still returns 405 `auto-publish-disabled`
- `apps/web/app/api/cockpit/content/[id]/review/route.ts` — APPROVED still requires live `READY_FOR_REVIEW`
- `apps/web/lib/trust-claims.ts` — Trust Claim Registry intact

---

## 4. What was implemented

### Phase 9 CI workflow (`.github/workflows/ci.yml`)
Six jobs on push + PR:
1. **test** — `npm ci`, prisma generate + validate + db:push, lint, typecheck, all-workspace test
2. **build** — Next.js production build (placeholder env)
3. **trust-gate** — public-copy scanner (vitest) + standalone banned-phrase guard
4. **model-freeze** — refuses MODEL_VERSION bumps without an IMPLEMENTED `CalibrationProposal` (or `FROZEN.md` baseline marker)
5. **draft-only** — fails CI on any `publishedAt` write, `status: "PUBLISHED"` write, or external send path import (sendgrid/mailgun/twilio/discord/slack/twitter)
6. **guardrails** — composite job running `npm run guardrails`

No CI step posts, emails, or sends anywhere.

### Guardrail scripts
All three are zero-dependency `node`-only `.mjs` scripts so they can run
in any CI job without an install.

- **trust-gate.mjs** scans `apps/web/{app,components,lib}` and `packages/`
  for the ~23 banned phrases mirrored from the BANNED registry entries
  in `apps/web/lib/trust-claims.ts`. Skips test files, the registry
  itself, content-engine config tables, and comment-only lines.
- **model-freeze.mjs** reads `packages/prediction-engine/src/constants.ts`
  for the current `MODEL_VERSION`. Accepts evidence in any of three
  forms: a matching `IMPLEMENTED` `CalibrationProposal` row in
  `packages/db/prisma/seed.ts`, a `docs/calibration-proposals/<slug>.md`
  with `modelVersion: <v>` and `status: IMPLEMENTED` in its
  front-matter, or a `frozen: <v>` line in
  `docs/calibration-proposals/FROZEN.md`. Fails otherwise.
- **draft-only.mjs** greps the API/page/lib/worker tree for
  `publishedAt: new Date(...)`, `publishedAt = new Date(...)`,
  `status: "PUBLISHED"` writes (with a read-context exemption for
  `where:` clauses), `autoPublish: true`, `publishNow(`, and imports
  of any known external send SDK. Comment-only lines and
  `publishedAt: null` exempted.

Wired into `package.json`:

```
"guard:trust"        : "node scripts/guardrails/trust-gate.mjs"
"guard:model-freeze" : "node scripts/guardrails/model-freeze.mjs"
"guard:draft-only"   : "node scripts/guardrails/draft-only.mjs"
"guardrails"         : "node ... && node ... && node ..."
```

### Internal calibration cockpit + API

- **GET `/api/cockpit/calibration`** (new) — ADMIN-only. Returns:
  ```
  {
    mode: "INTERNAL_ONLY",
    autoPublish: false,
    autoSend: false,
    automatedBetting: false,
    modelVersion, modelFrozen,
    readiness: { canExposePerformanceStats, canApplyCalibrationAdjustments,
                 canPublishContent, isBootstrapMode, reasons[] },
    history:   { gamesTotal, gamesCompleted, predictionsTotal,
                 predictionsResolved, predictionsPendingResult,
                 settledCanonicalPicks, bootstrapPicks },
    calibration: { status, notes[], proposals[] },
    guardrails: { noAutoPublish, noAutoSend, noExternalPosting,
                  noAutomatedBetting, internalOnly, modelFreezeAnchor },
    warnings[]
  }
  ```
  Every count is wrapped in `safeCount(...)` so a missing Prisma model
  cannot 500 the cockpit. `POST` returns 405 `calibration-is-read-only`.

- **`/cockpit/calibration`** (improved) — adds:
  - INTERNAL_ONLY banner with the canonical "No auto-publish / No auto-send /
    No automated betting" copy
  - Game-history grid (games total, games completed, predictions total,
    predictions resolved, predictions pending, bootstrap picks excluded)
  - Readiness gates panel (4 gates) + blocked-reasons list
  - MODEL FROZEN tag next to model version
  - Existing bucket tables and proposals retained

### Game history / context
No new models needed. The existing `Game` (with `status`, `homeScore`,
`awayScore`, `commenceTime`) and `Pick` (with `result`, `modelVersion`,
`isBootstrap`) models already cover sport/league, game date,
teams/participants, final score, model version, and resolved state.
`IngestionRun` covers source references. `CalibrationProposal` covers
observation notes. The calibration API aggregates from these.

### Phase 8 regression hardening
Tests cover:
- `content engine builders never set publishedAt`
- `POST /api/cockpit/content returns 405 auto-publish-disabled`
- `review route refuses APPROVED when readiness is not READY_FOR_REVIEW`
- `review route never sets publishedAt`
- `legacy publisher worker has internal-calibration kill switch`
- `legacy publisher worker no longer flips status to PUBLISHED`
- `legacy publisher worker no longer writes publishedAt`
- `calibration API enforces ADMIN auth`
- `calibration API returns mode INTERNAL_ONLY`
- `calibration API blocks POST as 405`
- `calibration page renders the internal-only banner`
- `calibration page shows game-history counts`
- `calibration page shows readiness gates and blocked reasons`
- `calibration page never sets publishedAt`
- `content cockpit renders the internal-only banner`
- `trust-gate / model-freeze / draft-only guardrails exit 0`

---

## 5. Safety guarantees

| Guarantee | Mechanism |
|---|---|
| No auto-publish | `draft-only.mjs` fails CI on `publishedAt: new Date(...)`, `status: "PUBLISHED"` writes, `publishNow(`, `setPublished`, `markPublished`. Tests assert. Cockpit banner asserts. |
| No auto-send | `draft-only.mjs` flags imports of sendgrid, mailgun, nodemailer, resend, twilio, discord/slack/twitter webhook URLs. No such imports exist. |
| No external posting | Same as no-auto-send. CI workflow itself never posts to a notification action. |
| No automated betting | No "place bet" function exists anywhere. Banner copy explicitly states this. |
| Calibration INTERNAL_ONLY | API hard-codes `mode: "INTERNAL_ONLY"`. Page banner repeats it. `canApplyCalibrationAdjustments` is a constant `false` in `packages/prediction-engine/src/readiness.ts`. |
| `publishedAt` not written | Engine builder explicitly sets `publishedAt: null`. Review route's `update()` data block does not include `publishedAt`. Legacy worker's `create()` no longer includes `publishedAt`. `draft-only.mjs` enforces this on every CI run. |
| Performance claims gated | `getReadinessGates().canExposePerformanceStats` defaults to `false`. `/api/performance` returns 503 when off. Content engine `evaluateContentReadiness` returns `NEEDS_PERFORMANCE_GATE` for performance-class drafts when off. |
| Promotion drafts require terms + RG | Source-coverage scanner in `evaluateContentSourceCoverage` refuses `UNVERIFIED` for `PROMOTION_TERMS` / `RESPONSIBLE_GAMING`. Phase 8 tests already cover. |
| MODEL_VERSION freeze | `model-freeze.mjs` requires an IMPLEMENTED proposal or FROZEN.md anchor. Default `v5.0.0` anchored to `FROZEN.md`. |

---

## 6. Commands run (in this sandbox)

| Command | Pass/Fail | Output summary |
|---|---|---|
| `git status` | PASS | On branch `sports-intelligence-os-phase-9-ci`. 153 changes (mix of M and ??). |
| `git branch --show-current` | PASS | `sports-intelligence-os-phase-9-ci` |
| `mv .git/index.lock .git/index.lock.removed` | PASS (rename only — delete is denied by bindfs) | Released the previous lock so `git status` works. |
| `npm install --no-audit --no-fund --prefer-offline` | **FAIL (sandbox)** | `npm error code ENOTEMPTY` repeatedly. The bindfs FUSE mount denies rename on directories that contain content. Loop script that renames each failing dir to `.broken-*` then retries makes incremental progress but never converges. `node_modules/.bin/` remained empty. |
| `node scripts/guardrails/trust-gate.mjs` | **PASS** | `[trust-gate] OK - scanned 102 file(s); no banned phrases.` |
| `node scripts/guardrails/model-freeze.mjs` | **PASS** | `[model-freeze] OK — MODEL_VERSION v5.0.0 backed by FROZEN.md baseline marker` |
| `node scripts/guardrails/draft-only.mjs` | **PASS** | `[draft-only] OK - scanned 109 file(s); no publish/send paths.` |
| `npm run guardrails` | **PASS** | All three guardrails green via the composite script. |
| `node --check scripts/guardrails/*.mjs` | **PASS** | All three scripts have valid syntax. |
| `npm run lint` | **NOT RUN** — blocked by failed `npm install` | n/a |
| `npm run typecheck` | **NOT RUN** — blocked by failed `npm install` | n/a |
| `npm test` | **NOT RUN** — blocked by failed `npm install` | n/a |
| `npm run build` | **NOT RUN** — blocked by failed `npm install` | n/a |
| `npm run db:generate` | **NOT RUN** — blocked by failed `npm install` (no `node_modules/.bin/prisma`) | n/a |
| `npm run db:push` | **NOT RUN** — blocked by failed `npm install` | n/a |
| `npm run db:seed` | **NOT RUN** — blocked by failed `npm install` | n/a |
| `git add . && git commit` | **FAIL (sandbox)** | `Operation not permitted` on `.git/objects/*/tmp_obj_*`. Index lock cannot be deleted; staging remains in an inconsistent state. Operator must commit locally. |

---

## 7. Tests / validation

| Gate | Sandbox status | Local-operator expectation |
|---|---|---|
| install | BLOCKED (bindfs) | `npm ci --no-audit --no-fund` should complete on a normal filesystem. |
| prisma generate | BLOCKED | Should generate `ContentDraft`, `ContentSource`, `ContentReview`, `CalibrationProposal` (all in `schema.prisma`). |
| prisma db:push | BLOCKED | Creates `content_drafts`, `content_sources`, `content_reviews`, `calibration_proposals` tables. |
| db:seed | BLOCKED — and `packages/db/prisma/seed.ts` itself is **truncated** at line 671 in the sandbox copy (operator should diff against last good local copy or restore). Calibration page degrades gracefully if seed cannot run. | n/a |
| lint | BLOCKED | Expected to pass — no new lint rules introduced; new files follow existing style. |
| typecheck | BLOCKED | Expected to pass — calibration API and page use `as unknown as never` for the still-being-generated Prisma client, identical pattern to Phase 8 content route. |
| test | BLOCKED | Expected to pass — new test file `apps/web/__tests__/calibration-cockpit.test.ts` reads source files and exec's guardrail scripts; both are sandbox-validated. |
| build | BLOCKED | Expected to pass — no new Next.js patterns introduced. |
| guardrails | **PASS** in sandbox | Same command CI runs; no install required. |

---

## 8. Dashboard turn-on recipe

```bash
# 1. From the repo root (must be on the machine, not in this sandbox):
cd "C:\Users\Garrett\Documents\Claude\Projects\AI Sports"

# 2. Clear the leftover sandbox lock + broken modules.
#    The sandbox renamed several modules; npm will re-link them.
rm -rf node_modules
rm -f .git/index.lock
rm -f .git/index.lock.removed
rm -f .git/index.lock.moved-*
rm -f .git/objects/*/tmp_obj_*

# 3. Bring deps up.
npm ci --no-audit --no-fund

# 4. Generate Prisma client + push schema to local DB.
#    (Assumes DATABASE_URL points at a local Postgres. See .env.example.)
npm run db:generate
npm run db:push
npm run db:seed     # may need seed.ts repair — see §9 sandbox notes

# 5. Validation gates.
npm run lint
npm run typecheck
npm test
npm run guardrails        # already verified PASS in sandbox
npm run build

# 6. Start the dev server.
npm run dev
```

Open in a browser (signed in as the seeded `DEV_ADMIN_EMAIL`):

| URL | What you should see |
|---|---|
| `http://localhost:3000/cockpit/calibration` | INTERNAL_ONLY banner, MODEL FROZEN tag next to `v5.0.0`, game-history counts grid, readiness gates panel with blocked-reasons (performance stats OFF, blog publishing OFF, bootstrap mode ON), bucket tables, and the proposals list. |
| `http://localhost:3000/cockpit/content` | `content-no-publish-banner` with "Internal calibration only. No auto-publish. No auto-send. No automated betting." plus the Phase 8 draft queue. |
| `http://localhost:3000/api/cockpit/calibration` (admin) | JSON with `mode: "INTERNAL_ONLY"`, `autoPublish: false`, `autoSend: false`, `automatedBetting: false`, history counts, calibration status, guardrails block. |
| `http://localhost:3000/api/cockpit/calibration` POST | 405 `calibration-is-read-only`. |
| `http://localhost:3000/api/cockpit/content` POST | 405 `auto-publish-disabled` (Phase 8 — re-verified). |

Commit the Phase 9 work (operator local):

```bash
git checkout -B sports-intelligence-os-phase-9-ci
git add .
git commit -m "Phase 9: CI hardening + internal calibration cockpit/API + guardrails"
```

---

## 9. Remaining risks

1. **Sandbox bindfs ACL blocker** — `npm install` cannot complete in this sandbox because the bindfs FUSE mount denies `rename(2)` on populated directories with `ENOTEMPTY`. This is an environmental issue, **not** a code issue. The operator should not see this on a normal local filesystem. Repro: any directory under `node_modules` that npm tries to atomically replace fails with `ENOTEMPTY`. Loop script that renames each failing dir made incremental progress but did not converge in the time available.
2. **`packages/db/prisma/seed.ts` is truncated at line 671** in the sandbox copy. The file is missing the closing of `seedDailyBrief`, the `seedContentDrafts` function definition, and the `main()` invocation. Best-effort appends from the sandbox were silently dropped by the same FUSE layer (writes report success and increase byte counts but `grep` cannot find the content). The cockpit calibration API/page degrade gracefully when no seeded data exists — they show zeroes and a "needs data" status. **Operator action:** before running `npm run db:seed`, diff the sandbox seed.ts against the last known-good local copy and restore the truncated tail; or skip `db:seed` entirely (the calibration cockpit still renders).
3. **Git commit not performed** — `.git/index.lock` cannot be deleted in the sandbox; commit must be done locally. Operator commands in §8.
4. **Legacy `BlogPost` model still exists** with a `publishedAt` column. The schema field is necessary for the future operator-driven publish boundary that does not yet exist. The `draft-only.mjs` guardrail allows the schema declaration via whitelist while forbidding any write to the field. If a future PR introduces such a write, the guardrail fails CI.
5. **Trust-gate scanner is a string mirror** of `apps/web/lib/trust-claims.ts` BANNED entries. If new BANNED claims are added to the registry, `scripts/guardrails/trust-gate.mjs` must be updated in the same PR (documented in the file header).
6. **No `act` or local CI dry-run** was performed — `act` is not present in the sandbox and the missing Docker setup would not help anyway given the install blocker. CI workflow YAML was statically inspected for the required job set and the four key script invocations (model-freeze, draft-only, trust-gate, guardrails).
7. **`apps/web/lib/content-generator.ts` is whitelisted** in `trust-gate.mjs` because the legacy LLM prompt string contains the words it forbids (telling the model never to say "guaranteed"). The file is gated off by `getReadinessGates().canPublishContent` and never produces user-rendered output during the internal calibration phase. If that gate flips, this file needs a copy review.

---

## 10. Go / no-go verdict

**GO for internal calibration only — code complete; local validation
blocked by sandbox FUSE limitation.**

- The guardrail scripts demonstrably pass (`trust-gate`, `model-freeze`,
  `draft-only` all exit 0 in the sandbox).
- The Phase 9 CI workflow is wired with the test, build, trust-gate,
  model-freeze, draft-only, and composite guardrails jobs.
- The internal calibration cockpit/API exists, enforces ADMIN auth,
  returns `mode: "INTERNAL_ONLY"`, surfaces game-history counts and
  readiness gates, and degrades gracefully when models are not yet
  generated.
- The content cockpit banner is updated to the required wording.
- The legacy auto-publish worker has a triple-gated kill switch
  AND no longer writes `publishedAt` / `status: "PUBLISHED"` —
  even if all three gates were cleared, it drafts only and routes
  through the Phase 8 review queue.
- No auto-publish, no auto-send, no external posting, no automated
  betting paths exist in the tree. The `draft-only.mjs` guardrail
  enforces this on every CI run.

**Not yet verified locally:** `lint`, `typecheck`, `test`, `build`,
`prisma generate`, `db:push`, `db:seed`. These are expected to pass —
no new lint rules, no new TS patterns, no new Next.js patterns, the
Prisma schema is unchanged from Phase 8 — but they could not be
executed in this sandbox because of the bindfs `npm install` blocker.
The operator commands in §8 will validate them in a normal local
environment.

**Hold the GO until §8 step 5 (`npm run lint && npm run typecheck &&
npm test && npm run guardrails && npm run build`) passes locally.**
The guardrail third in that chain already passes; the rest are
expected to.

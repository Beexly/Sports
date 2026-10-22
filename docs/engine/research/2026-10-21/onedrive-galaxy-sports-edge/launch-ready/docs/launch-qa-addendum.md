# Launch QA Addendum — Evidence Engine era

**Status:** Addendum to `docs/launch-qa-checklist.md`. This file does
NOT replace it — that checklist is the v1 production launch gate and
remains authoritative. This addendum adds checks that come online with
the Evidence Engine (`docs/evidence-engine.md`), the cockpit
(`docs/cockpit-spec.md`), the brand-safety v2 ruleset
(`docs/brand-safety-rules-v2.md`), and the content surfaces
(`docs/content-surfaces.md`).

**Run order:** Run the v1 checklist first. If it passes, run this
addendum. If both pass, the build is launchable.

**Severity legend (matches v1):**

- **MUST** — blocks the launch.
- **SHOULD** — strongly recommended; document any failure.
- **NICE** — polish; track, don't block.

---

## 0 · What changed since v1 checklist

The v1 checklist was written when the surface was a market-derived
scorer + Stripe paywall + brand-safety v1. The Evidence Engine
introduces:

1. A new data plane (SourceSnapshot → GameSignal → Pick).
2. A shadow-mode publishing boundary.
3. A second "what does the engine think" surface (the cockpit).
4. A factor registry that determines what may appear on public pages.
5. A weekly editorial rhythm (the four content surfaces).
6. New brand-safety rules (BS-010 through BS-053).

This addendum tests each of those.

---

## 1 · Evidence Engine — data plane (MUST)

The engine must be observable end-to-end. Any failure here means picks
might be computed from data we can't audit.

- [ ] **MUST** — `SourceSnapshot` writes on every successful provider
      fetch. Verified by: hit `/api/health/ingestion`; response includes
      `lastSourceSnapshotWrittenAt` within the last cron interval.
- [ ] **MUST** — `SourceSnapshot.payloadHash` is a sha256 and dedupes
      identical fetches. Test: trigger two identical fetches; second
      should not create a new row.
- [ ] **MUST** — Every `Pick` row has a non-null `ingestionRunId`,
      `evidenceBundleId`, and at least one `FactorContribution`.
      Regression test in `apps/web/__tests__/pick-audit-trail.test.ts`.
- [ ] **MUST** — `IngestionRun` rows have `status` set to one of the
      enum values (`running` | `success` | `partial` | `failed`). No
      null-status rows after a run completes.
- [ ] **MUST** — `GameSignal` rows include `factorKey`, `source`,
      `sourceSnapshotId`, `freshnessSec`, `trustLevel`, `activationState`.
      Schema migration verified in `packages/db`.
- [ ] **SHOULD** — `SourceSnapshot` cold-storage tier configured. (S3 +
      retention after 90 days. Not a launch blocker but a cost blocker.)
- [ ] **SHOULD** — `IngestionRun` errors expose enough context for a
      future replay (provider, endpoint, scope, error detail).

---

## 2 · Shadow-mode boundary (MUST)

This is the most important new launch test: a leak here would publish
factors that haven't earned a public seat. BS-050 / BS-053 enforce
runtime.

- [ ] **MUST** — `apps/web/__tests__/shadow-leak.test.ts` exists and
      passes. The test seeds the database with shadow + activated
      factors, calls every public API route, and asserts the response
      contains no shadow factor keys.
- [ ] **MUST** — `assertNoShadowFactorsLeaked()` is invoked in the
      response pipeline for `/api/picks/daily-slate`,
      `/api/picks/{id}/snapshot`, and the new `/api/picks/daily-decisions`
      route. Verified in route handler unit tests.
- [ ] **MUST** — Activation state of every factor in the registry is
      one of: `shadow`, `activated`, `archived`. No null states.
- [ ] **MUST** — Initial production deploy has all non-market factors
      in `shadow` state. Verified by: `SELECT factorKey FROM
      FactorDefinition WHERE activationState = 'activated'` returns
      only the 4 v1 market factor keys (`marketDepth`, `lineMovement`,
      `consensusPct`, `impliedProbability`).
- [ ] **MUST** — `CALIBRATION_AUTO_APPLY=false` in production env.
      BS-035 enforcement. The env loader should refuse to start if this
      is set to true. Test in `packages/db/src/config.test.ts`.
- [ ] **MUST** — `/admin/factors` route exists and is auth-gated. A
      non-admin user hitting it gets 404 (not 403 — don't leak
      existence). Test in `apps/web/__tests__/admin-routes.test.ts`.
- [ ] **SHOULD** — Operator dashboard at `/admin/factors` displays each
      factor's current state, shadow-mode age, and contribution history.
      Visual QA only — no automated test required.

---

## 3 · Cockpit — public surface (MUST)

Per `docs/cockpit-spec.md`. The cockpit is launch-optional (the v1
`/picks` page is functional without it), but if any cockpit code is
shipped, these gates apply.

- [ ] **MUST** — `/api/picks/daily-decisions` returns the 5-frame
      structure for every game on the slate (published, held, no-pick).
      Tier-gated identically to `/api/picks/daily-slate`.
- [ ] **MUST** — FREE-tier `daily-decisions` response does not include
      confidence numbers or factor contributions for non-day-1 picks.
      Server-side redaction confirmed by:
      ```
      const free = await fetch('/api/picks/daily-decisions', { headers:
      freeAuthHeaders }); expect(JSON.stringify(free)).not.toMatch(/"confidence":\s*\d/);
      ```
- [ ] **MUST** — Held / no-pick games render the cockpit's 5 frames
      with a structured reason from the enum, not free-form text. Test
      in `apps/web/__tests__/cockpit-held-state.test.ts`.
- [ ] **MUST** — Tier gating happens server-side (redaction at JSON
      serialization, not CSS). CLAUDE.md non-negotiable #3.
- [ ] **MUST** — Galaxy ↔ cockpit star binding does not affect
      page-load LCP. Verify: cockpit page LCP <1.5s on mid-tier mobile
      (Lighthouse via CI).
- [ ] **SHOULD** — `prefers-reduced-motion: reduce` disables galaxy
      pulses + factor-tile transitions. Existing Round 4 work; verify
      via DevTools emulation.
- [ ] **SHOULD** — All cockpit hero text ≥ size minimums (32px desktop,
      24px mobile for verdict; 18px / 17px for body). Visual QA.
- [ ] **NICE** — Cockpit renders correctly with a slate of zero
      picks (empty days). Should show every game with the held/no-pick
      reasoning, never an "no picks today" empty state.

---

## 4 · Brand-safety v2 — linter & runtime (MUST)

Per `docs/brand-safety-rules-v2.md`. v1 linter passes already; v2
extends it.

- [ ] **MUST** — `npm run test:brand-safety` includes v2 ruleset; total
      case count ≥ 60 (v1 ~20, v2 +40). Output: 0 hits.
- [ ] **MUST** — BS-010 runtime invariant: every public response passes
      `assertNoShadowFactorsLeaked`. Wired into middleware.
- [ ] **MUST** — BS-014 AST scan: no string-interpolated fabricated
      stats. Build fails if scan finds matches.
- [ ] **MUST** — BS-021 Kelly UI block: `recommendStake()` output never
      appears in any rendered HTML. Regression test simulates a tier
      grant + walks the rendered output for the function's signature
      strings.
- [ ] **MUST** — BS-030 performance policy: `/performance` page renders
      "collecting" state. Verified manually and via test that mocks
      `evaluatePublicPerformancePolicy()` returns BLOCKED.
- [ ] **MUST** — BS-040 secret scan: `git-secrets` pre-commit hook
      installed. CI also runs `gitleaks` on the repo. Both must pass.
- [ ] **MUST** — BS-043 LLM output scan: content-worker outputs
      validated against the SourceSnapshot table for any number cited.
      Test in `packages/content/__tests__/numbers-must-cite-source.test.ts`.
- [ ] **SHOULD** — Linter output includes structured rule IDs (BS-001,
      BS-010, etc.) so violations are traceable.

---

## 5 · Calibration plumbing (MUST/SHOULD)

The launch has no activated non-market factors. But the calibration
plumbing must exist so that the first proposal can ship in week 2 or
later.

- [ ] **MUST** — `docs/calibration-proposals/` directory exists with
      a `template.md` matching `docs/evidence-engine.md` §"Calibration
      proposal template."
- [ ] **MUST** — Brier-score computation function exists in
      `packages/prediction-engine/src/calibration/brier.ts` with unit
      tests covering: identity prediction = 0, anti-correlated = 1,
      bucket-level computation, NaN handling.
- [ ] **MUST** — Drift detection function exists at
      `packages/prediction-engine/src/calibration/drift.ts` with a
      threshold of 0.02 absolute Brier delta over 30 days. Test cases
      cover: no drift, slow drift, sudden drift, insufficient sample.
- [ ] **MUST** — Reliability-diagram data endpoint
      `/api/admin/calibration/reliability` exists and is admin-gated.
      Returns predicted-probability bins vs observed frequency.
- [ ] **SHOULD** — Operator dashboard renders the reliability diagram
      at `/admin/calibration`. Visual QA only.
- [ ] **SHOULD** — Calibration computation runs as a background worker
      (BullMQ job) on a daily cadence.

---

## 6 · Content surfaces — publishing rails (SHOULD)

Per `docs/content-surfaces.md`. Launch-day, the four surfaces don't
need to be live, but the rails must exist so cadence can start week 1.

- [ ] **SHOULD** — `apps/web/app/observatory/quiet/page.tsx` exists.
      Renders rolling log of items from `docs/content-archive/quiet/`.
- [ ] **SHOULD** — `apps/web/app/observatory/autopsy/page.tsx` exists.
      Renders weekly autopsies.
- [ ] **SHOULD** — `apps/web/app/observatory/number/page.tsx` exists.
      Renders the "one number that moved" log.
- [ ] **SHOULD** — Frontmatter validator at
      `packages/content/src/validators.ts` enforces the schema from
      `docs/content-surfaces.md` §"Frontmatter schema."
- [ ] **SHOULD** — Build fails if any markdown in
      `docs/content-archive/` has `status: published` but fails the
      brand-safety linter or schema validation.
- [ ] **NICE** — RSS + JSON feed generated for each content surface.
- [ ] **NICE** — Email digest job assembles a weekly bundle of the
      four surfaces.

---

## 7 · Ingestion smoke — real network (MUST)

Before any launch, run one real ingestion cycle and verify end-to-end.

- [ ] **MUST** — `THE_ODDS_API_KEY` set in Vercel production env (per
      Phase 1 of build plan).
- [ ] **MUST** — `npm run smoke:ingestion -- --provider=the-odds-api`
      completes successfully. Output: ≥1 SourceSnapshot row, ≥1 Game
      row, ≥4 GameSignal rows (one per activated market factor), ≥1
      Pick row.
- [ ] **MUST** — Pick generated by the smoke has all required fields
      populated. Manually verify the `factorContributions` array
      contains only market-factor keys.
- [ ] **MUST** — `/api/health` returns 200 with sub-checks (db, redis,
      provider:the-odds-api) all green.
- [ ] **MUST** — Provider rate-limit headers logged on every fetch.
      `responseTimeMs` field on `SourceSnapshot` populated.
- [ ] **SHOULD** — Failed-fetch path tested: simulate provider 503;
      `IngestionRun` row has `status: 'partial'` or `'failed'`, and the
      slate either uses cached data or renders held games with reason
      "provider out."
- [ ] **SHOULD** — Multi-provider redundancy verified if applicable:
      if api-sports.io is wired alongside The Odds API, both write
      independent SourceSnapshot rows for the same game.

---

## 8 · Browser QA matrix (MUST/SHOULD)

Extends v1's accessibility pass with Evidence-Engine-era surfaces.

| Surface | Chrome desktop | Safari desktop | Chrome mobile | Safari iOS | older-eye check |
|---|---|---|---|---|---|
| `/` (homepage) | MUST | MUST | MUST | MUST | MUST |
| `/picks` (or cockpit) | MUST | MUST | MUST | MUST | MUST |
| `/observatory` | MUST | SHOULD | MUST | SHOULD | MUST |
| `/observatory/quiet` | SHOULD | SHOULD | SHOULD | SHOULD | SHOULD |
| `/observatory/autopsy` | SHOULD | SHOULD | SHOULD | SHOULD | SHOULD |
| `/methodology` | MUST | SHOULD | MUST | SHOULD | MUST |
| `/pricing` | MUST | MUST | MUST | MUST | MUST |
| `/admin/*` | MUST | — | — | — | — |

**"Older-eye check" defined:**

- Set browser default font-size to 20px (the size many ≥55-year-olds set).
- View page from arm's length, ~30 inches.
- Test: can you read every CTA without leaning in?
- Test: is the verdict word legible at first glance?
- Test: are factor states (color + word) communicated without squinting?

Capture a screenshot for each "MUST" cell, file under
`reports/launch-qa-{YYYY-MM-DD}/`.

---

## 9 · Operator readiness (SHOULD)

The cockpit + content surfaces shift the founder's day-to-day. Verify
the operator's job is tractable.

- [ ] **SHOULD** — `/admin/factors` lists every factor with shadow
      age, sample size, and a "see calibration" link.
- [ ] **SHOULD** — Operator can write a calibration proposal in
      `docs/calibration-proposals/` and have it appear in
      `/admin/factors` as "pending review" without a rebuild. (Static
      generation may require redeploy; that's fine for v1.)
- [ ] **SHOULD** — Operator can write a content surface markdown,
      build, and see it published. Total time from write → live <5 min.
- [ ] **SHOULD** — Operator has clear "kill switch" docs: how to put a
      factor back into shadow if it misbehaves post-activation. Doc at
      `docs/operator-playbook.md` extended with this.
- [ ] **NICE** — Daily digest email to the operator with: yesterday's
      pick results, today's slate count, held-game count + reasons,
      ingestion errors.

---

## 10 · Production smoke (MUST)

After deploy, run before changing the DNS record (or before announcing).

- [ ] **MUST** — `npm run smoke:prod` passes. Output: every public route
      returns 200, no banned phrase in rendered HTML, no shadow factor
      keys in any JSON response.
- [ ] **MUST** — `/api/health` reports green on production URL.
- [ ] **MUST** — Stripe webhook test event delivered + handled (Stripe
      CLI: `stripe trigger checkout.session.completed`). Webhook log
      shows signature verification PASS.
- [ ] **MUST** — Send a test signup → free tier → upgrade flow. Verify
      entitlements update. Verify confidence numbers appear post-upgrade.
- [ ] **MUST** — `/sitemap.xml` includes the new observatory routes.
- [ ] **MUST** — `/robots.txt` allows `/`, `/picks`, `/observatory/**`,
      `/methodology`, `/pricing`, `/faq`, `/changelog`; disallows
      `/admin/**`, `/dashboard/**`, `/brief/**`, `/auth/**`,
      `/cockpit/**` (per `noindex` layouts already shipped).
- [ ] **MUST** — Open Graph image renders correctly on a Twitter card
      validator and LinkedIn post inspector.
- [ ] **SHOULD** — Lighthouse a11y score ≥ 95 on `/`, `/picks`,
      `/pricing`, `/observatory`.

---

## 11 · Brand-safety regression suite (MUST)

A single command that should return zero violations before any deploy.

```bash
npm run guardrails        # trust + model-freeze + draft-only
npm run test:brand-safety # all v1 + v2 rules
npm run smoke:prod        # post-deploy verification
```

- [ ] **MUST** — All three commands succeed in CI on every PR.
- [ ] **MUST** — `npm run test:brand-safety` includes a snapshot test:
      a fixture pick with a shadow factor in its `factorContributions`
      array should fail serialization in a public route. Asserts the
      runtime invariant is wired.
- [ ] **MUST** — A canary test: deliberately add a banned phrase to a
      test fixture, expect the linter to fail. (Don't commit the
      banned phrase to source; the test should construct it from
      pieces.)
- [ ] **SHOULD** — Brand-safety violation in CI files an automatic
      GitHub Issue with severity, rule ID, file:line.

---

## 12 · Rollback plan (MUST)

If anything goes wrong post-launch:

- [ ] **MUST** — `docs/launch-runbook.md` includes a documented
      rollback for: bad ingestion (revert to last good snapshot via
      `IngestionRun` ID), bad model version (env flag flips to prior
      `MODEL_VERSION`), bad factor activation (factor flipped back to
      shadow via `/admin/factors`).
- [ ] **MUST** — Vercel deployment history allows instant revert to
      the previous deploy. Verified by clicking "Promote to Production"
      on the previous successful deploy.
- [ ] **MUST** — Stripe webhook idempotency: replaying any
      checkout.session.completed event does not double-grant
      entitlements.
- [ ] **SHOULD** — Database backup snapshot taken within 30 min of
      launch.

---

## Specific failure patterns to watch for

Per the build plan's "report exact failures, especially ingestion / API
/ provider errors." Codex should grep its run log for these and surface
each one:

| Pattern | Likely cause | First action |
|---|---|---|
| `THE_ODDS_API_KEY` missing | env not set | check Vercel env |
| `401 from the-odds-api.com` | key invalid or quota exhausted | check Odds API dashboard |
| `429 from the-odds-api.com` | rate limited | check fetch cadence + backoff |
| `prisma migrate` failure | schema drift | reconcile vs `packages/db/prisma/schema.prisma` |
| `assertNoShadowFactorsLeaked threw` | shadow factor in public response | trace `factorKey`; fix serializer |
| `evaluatePublicPerformancePolicy returned ACTIVATED` unexpectedly | `PERFORMANCE_STATS_ENABLED` set without calibration | unset env until activation proposal approved |
| `recommendStake() called from rendered code` | Kelly leaked into UI (v6 attempted, was reverted) | revert + re-confirm BS-021 |
| `Brier score = NaN` | bucket empty | guard with sample-size check |
| `0 ingestion runs in last cron interval` | worker not running | restart BullMQ worker; check Redis |
| `FactorDefinition row missing for queried factorKey` | factor in code not registered in DB | migrate the seed |

Each pattern Codex hits, report with:

1. The exact log line.
2. The route or test that triggered it.
3. Whether retry resolved it.
4. The proposed fix (file + line + diff sketch).

---

## One-paragraph summary

The v1 launch checklist validates that the existing market-derived
scorer + paywall + brand-safety v1 ship safely. This addendum
validates the Evidence Engine's data plane is observable, the shadow
boundary doesn't leak, the cockpit's tier gating is server-side, the
brand-safety v2 linter catches the new failure modes, calibration
plumbing exists for week-2+ activation proposals, content surfaces
have publishing rails, real ingestion succeeded end-to-end, and the
older-reader audience can actually read the result. Run both checklists
in order. Anything failing a MUST blocks the launch.

---

## 10 · Front-End hardening polish (SHOULD)

Distilled from the Front-End Checklist (`github.com/thedaviddias/Front-End-Checklist`, CC0). These are launch-polish items not covered above — they don't block the deploy, but a paid product without them looks unfinished.

- [ ] **SHOULD** — Favicon set complete: `favicon.ico` (32×32), `apple-touch-icon.png` (180×180), `icon.png` (192×192 + 512×512). Confirm the `<head>` references all three.
- [ ] **SHOULD** — `<meta name="theme-color">` set to a brand-aligned color. Mobile Chrome/Safari browser chrome adopts it.
- [ ] **SHOULD** — Custom 404 page (`app/not-found.tsx`) on-brand, with a link back home. Verify by visiting `/this-does-not-exist`.
- [ ] **SHOULD** — Custom 500 / error boundary (`app/error.tsx`) on-brand, never leaks a stack trace.
- [ ] **SHOULD** — `@media (prefers-reduced-motion: reduce)` honored by the InteractiveGalaxy / hero intro / scan-line animations. Test by enabling "Reduce motion" in OS settings; cinematic elements should fall back to static.
- [ ] **SHOULD** — All forms use proper `autocomplete=` attributes (`email`, `current-password`, `new-password`, `name`, etc.) so password managers and autofill work.
- [ ] **SHOULD** — No mixed content: every asset on every HTTPS page is also HTTPS. Browser console must be free of "blocked: mixed-content" warnings.
- [ ] **SHOULD** — Internal-link sweep: no 404s when crawling from `/` two hops out (run `npx linkinator https://galaxysportsedge.com --recurse` post-deploy).
- [ ] **NICE** — `<link rel="preconnect">` for `api.the-odds-api.com` (or whichever odds host the client hits) to shave the first-DB-touch handshake.

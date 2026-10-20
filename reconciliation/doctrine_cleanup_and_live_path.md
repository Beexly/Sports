# Doctrine Cleanup — staged removal of "math you can read" / no-publish language

**Audited ref:** `origin/main` @ `4fa5330f4` · **Measured:** 2026-10-20
**Status:** STAGED, NOT APPLIED. The prior phase's `reconciliation/patch-list.md`
PR-3 has the same content with a fuller file list; this document is the
phase-5 view and adds the live-path verification the mandate asked for.

---

## 1. The doctrine, restated

The mandate: *"Old 'math you can read' / no-publish language is outdated —
locate and stage removal."* And: *"Predictions, edges, props, SGPs, and picks
are in scope."*

**Measured: the retirement is already recorded in the repo's own agent
guidance, and the machinery enforcing the old doctrine is still live.**

`AGENTS.md:607`:
> `"math you can read" is retired as a public tagline`

`AGENTS.md:623`:
> `Do NOT restore … "MATH YOU CAN READ" stamp.`

So the *doctrine* was retired. What was never removed is the *enforcement*.

---

## 2. The two halves, and why they are different problems

### 2.1 Doctrine A — the brand line and its AI-framing ban

**The ban is still enforced in CI and at runtime.**

| Where | What | Still enforced? |
|---|---|---|
| `apps/web/lib/positioning-vocab.json:2-27` | `bannedPhrases`: "AI-powered", "our AI", "machine learning", "AI picks" | **YES** — the single source of truth for the scanners |
| `apps/web/lib/compliance-scanner/rules.ts:50` | a rule with `severity: "block"` quoting the retired line as the platform's position | **YES** |
| `apps/web/lib/compliance-scanner/rules.ts:60` | a second block rule on AI-category marketing language | **YES** |
| `apps/web/lib/trust-claims.ts:376-455` | the banned-claim registry, `scanForBannedPhrases()` on any surface | **YES** |
| `scripts/guardrails/trust-gate.mjs:13, :107-135` | the CI scanner — **3,701 files scanned, exit 0 today** | **YES** |
| `scripts/guardrails/trust-gate.mjs:186-196` | also scans README.md, CLAUDE.md, AGENTS.md, START_HERE.md, CONTRIBUTING.md | **YES** |
| `.github/workflows/ci.yml:158-183` | the "Trust gate (banned phrases on public copy)" job | **YES** |

**And the retired line is still user-visible in one place.** The web chrome
is clean; **mobile is not**:

| Where | What |
|---|---|
| `apps/mobile/src/components/brand.tsx:135` | `export const BRAND_POSITIONING_LINE = "We're not AI. We're math you can read.";` |
| `apps/mobile/app/onboarding.tsx:119` | renders it — the **onboarding screen** |
| `apps/mobile/app/(tabs)/more.tsx:317` | renders it — the **about screen** |
| `apps/mobile/package.json:7` | the store metadata description |
| `apps/mobile/tests/voice.test.js:62` | asserts the line is **clean** — it fails if the line is ever added to a ban list |
| `apps/web/lib/studio/templates/sponsor-safe.ts:65` | a live LLM system prompt telling the model to **close every sponsor blurb with the retired line** |
| `apps/web/app/tools/page.tsx:93` | rendered public copy: *"Nothing is a black box, and nothing here claims to predict an outcome."* — while the site publishes predictions |

### 2.2 Doctrine B — the no-publish restriction

**This is not prose. It is code, and it is load-bearing.**

| Where | What | Effect |
|---|---|---|
| `scripts/guardrails/draft-only.mjs:5-11` | *"Fails CI if any API / page / lib / worker file performs a publish-side write"* | **3,716 files scanned, exit 0 today** |
| `scripts/guardrails/draft-only.mjs:225-227` | blocks `publishedAt: new Date(`, `status: "PUBLISHED"`, non-null `publishedAt` in a data block | any publish-side write in a scanned path |
| `scripts/guardrails/draft-only.mjs:238` | `{ id: "twitter-api", rx: /api\.twitter\.com\|twitterPost\(\|\btweet\s\(/i }` | **MISSES `api.x.com`** — the actual transport (`workers/twitter-bot/x-client.js:19`) |
| `.github/workflows/ci.yml:237-252` | the "Draft-only (no auto-publish)" job, whose comment says *"outside the explicit (and currently non-existent) publish boundary"* | CI |
| `workers/content-publishing/src/index.ts:15` | `INTERNAL_CALIBRATION_ONLY = process.env["INTERNAL_CALIBRATION_ONLY"] !== "false"` | **DEFAULT ON** → every request returns `REFUSED` (`:32-38`) |
| `apps/web/lib/content-engine/persist-draft.ts:60-65` | `throw new Error("...refusing to persist a record with publishedAt set")` | runtime exception on any draft→publish |
| `apps/web/lib/content-engine/index.ts:4` | *"Phase 8. Draft-only sports content engine. No auto-publish"* | module contract |
| `apps/web/lib/content-engine/workflow.ts:115` | *"Does NOT publish — APPROVED still requires a human reviewer"* | no publish terminal state |
| `apps/web/lib/gsn/beex-weekly.ts:11, :42, :78` | `autoPublish: false`, `status can never be "published" without ownerApproved: true` | literal `false` in the type |
| `apps/web/lib/jarvis/agent-council.ts:88, :90` | `readonly externalActions: "NONE";` / `readonly externalActionsAllowed: false;` | **LITERAL TYPES — agent publishing is a COMPILE ERROR** |
| `apps/web/lib/jarvis/agent-council.ts:128` | *"No agent may take any external action"* | council law, pinned by 5 test files |
| `apps/web/lib/agents/agent-capabilities.ts:8` | `FORBIDDEN_EXTERNAL_ACTIONS = AGENT_ACTIONS.slice(14)` — includes `PUBLISH`, `SEND_EXTERNAL`, `ENABLE_PUBLIC_PICKS` | **publish is FORBIDDEN, not GATED** |
| `apps/web/lib/agents/agent-registry.ts:51, :57` | `forbiddenActions: FORBIDDEN_EXTERNAL_ACTIONS,` / `externalActionsAllowed: false,` | applied to **every** agent |
| `apps/web/lib/airwave/control-plane.ts:277-278` | *"must not publish to external channels"* / *"external posting integrations stay absent by design"* | studio lane |
| `apps/web/lib/media/control-plane.ts:64, :126, :138, :191` | `readonly autoPublishes: false;` / *"No external posting path."* | control-plane contract |
| `apps/web/lib/ledger/ledger-view.ts:5-8` | the ledger page is dark unless `PUBLISH_LEDGER === "true"` (default OFF) | surface |
| `apps/web/lib/ops/calibration-publish-policy.ts:14, :54-55` | `CALIBRATION_PUBLISHED` / `CALIBRATION_AUTO_PUBLISH` both default `false` | surface |
| `apps/web/lib/cockpit/ask-jarvis.ts:159` | *"Picks are internal only. … The PUBLIC_PICKS_ENABLED gate is closed."* | status string fed to agents |
| `apps/web/lib/cockpit/owner-summary.ts:145-148` | `blockedReason = "PUBLIC_PICKS_ENABLED gate is off"` | founder-facing status |
| `apps/web/lib/jarvis/jarvis-owner-summary.ts:7` | *"PUBLIC_PICKS_ENABLED remains owner-controlled and blocked from self-enabling."* | hardcoded status |

**And the props route is gated off with no cron:**
`apps/web/app/api/ops/props-slate/route.ts:63` — `PROPS_SLATE_ENABLED === "1"`,
404 otherwise (`:129`), and **no `vercel.json` cron entry exists for it.**

---

## 3. How both doctrines are true at once

This is the part worth understanding, because it explains why nothing looks
broken.

**The Oct-18 Week 6 content was published by
`scripts/publish_late_sun_mon_live_free.py`** — a Python script that is
**not in the guardrail's scan set** (`draft-only.mjs` scans
`apps/web`/`packages`/`workers` API-page-lib-worker files; a top-level
`scripts/` file that writes to Neon by raw SQL is outside it).

So:
- The CI guardrail says "no publish-side write in the scanned paths" — and
  the Oct-18 publisher is not in a scanned path.
- The content worker refuses everything — and the Oct-18 publisher is not
  the content worker.
- `agent-council.ts` makes agent publishing a compile error — and the
  Oct-18 publisher is a script, not an agent.

**Neither doctrine is broken. They are simply not applied to the path that
actually shipped.** That is why the repo can simultaneously contain a
correct "no auto-publish" CI guardrail and a live public board.

---

## 4. Live-path verification (the phase-5 ask)

| Claim | Verified state | Evidence |
|---|---|---|
| The board publishes sides/totals/MLs | **YES** | `picks` table, `PickType` = SPREAD\|MONEYLINE\|TOTAL (`packages/db/prisma/schema.prisma:1459-1463`); the public routes read them (`apps/web/app/api/picks/route.ts:149-153`, `apps/web/app/api/board/state/route.ts:746`) |
| The board publishes props | **NO — as a board surface** | `PickType` has no PROP. Props are a `signals`-table write (`apps/web/app/api/ops/props-slate/route.ts:352`, key `props.model_p_over.*`), env-gated off (`:63`), no cron. |
| The board publishes copula SGPs | **NO — as a board surface** | The Oct-6 SGP card is a `blog_posts` row (`scripts/publish_late_sun_mon_live_free.py:752`). The copula code (`bayesian-residue-bridge.ts`, `sizing-bridge.ts`) is imported by no SGP publish surface — the "copula" in the published reasoning is hand-authored prose. |
| `PUBLIC_PICKS_ENABLED` blocks publishing | **at READ time only** | the 503 is at `apps/web/app/api/picks/route.ts:73-76` and `apps/web/app/api/picks/daily-slate/route.ts:61-62`; `canExposePublicPicks` appears **zero times** in `process-sport.ts`, and `isPublished` defaults `true` (`schema.prisma:550`) |
| The two `PUBLIC_PICKS_ENABLED` parsers agree | **NO — opposite defaults** | `packages/prediction-engine/src/platform-config.ts:166` is `parseBool(env, true)`; `packages/prediction-engine/src/honesty/commit-reveal.ts:35` is strict `=== "true"` |
| The docstring matches the code | **NO** | `platform-config.ts:46` says "Default: false"; `:166` ships `true` |
| The deploy env value | **NOT DETERMINED** | `.env.example:313` and `.env.production.example:89` ship `false`; the code default is `true`; the live Vercel value was not read |

---

## 5. The staged removal, in order

**P0 — removes the actual publishing block (no copy changes):**

1. `scripts/guardrails/draft-only.mjs` — replace the blanket ban with a
   **named publish boundary** the guardrail allowlists. **And fix the
   `api.x.com` hole at `:238` regardless** — a guardrail that misses the
   current transport is worse than one that is honest about its scope.
2. `.github/workflows/ci.yml:237-252` — the comment *"currently non-existent
   publish boundary"* must change with (1).
3. `workers/content-publishing/src/index.ts:4-15, :32-47` — retire or
   rename `INTERNAL_CALIBRATION_ONLY`; drop the queue-only branch.
4. `apps/web/lib/content-engine/persist-draft.ts:60-65` — keep the tamper
   guard (it is a good one); route legitimate publishes through an explicit
   publisher.
5. `apps/web/lib/jarvis/agent-council.ts:88, :90, :128` +
   `apps/web/lib/agents/agent-capabilities.ts:8` +
   `apps/web/lib/agents/agent-registry.ts:57` — split `PUBLISH` out of
   `FORBIDDEN_EXTERNAL_ACTIONS` into a **gated** capability.
   `SEND_EXTERNAL`, `SPEND_MONEY`, `DEPLOY` should stay forbidden.
6. `apps/web/lib/airwave/control-plane.ts:277-278` +
   `apps/web/lib/media/control-plane.ts:64, :126, :138, :191` — drop the
   "must not publish" strings and `autoPublishes: false`.
7. `.claude/agents/content-publishing-agent.md:2, :21, :26` — the agent brief
   still orders draft-only and forbids whitelist edits.
8. `.env.production.example:89`, `.env.example:313`,
   `packages/prediction-engine/src/platform-config.ts:46` — pick ONE truth
   for `PUBLIC_PICKS_ENABLED`; fix the docstring/code drift.

**P1 — brand copy users can still see:**

9. `apps/web/lib/positioning-vocab.json` (whole file),
   `positioning-vocab.ts:4`, `compliance-scanner/rules.ts:50, :60`,
   `trust-claims.ts:376-455` — narrow or retire the AI ban. **This is the
   change that unblocks AI-framed copy.**
10. `apps/web/lib/studio/templates/sponsor-safe.ts:65` — stop telling the
    model to close with the retired line.
11. `apps/mobile/src/components/brand.tsx:135`,
    `apps/mobile/app/onboarding.tsx:119`,
    `apps/mobile/app/(tabs)/more.tsx:317`, `apps/mobile/package.json:7`.
12. `apps/web/app/tools/page.tsx:93` — *"nothing here claims to predict an
    outcome"* must be reconciled with a product that publishes predictions.
13. `README.md:14`, `CLAUDE.md:8, :77`, `docs/positioning.md:11, :20, :36-41`,
    `BRAND_AND_DESIGN_SYSTEM.md:26`.
14. **In the same commit:** `apps/web/__tests__/docs-public-copy-scan.test.ts:170-171, :205-206`,
    `apps/web/__tests__/trust-claims.test.ts:406`,
    `apps/mobile/tests/voice.test.js:62`. The mobile test currently
    *asserts the retired line is clean* — it must be inverted, not deleted.

**P2 — comments and frozen archives (cosmetic, safe to leave):**
`packages/prediction-engine/src/props/gse-four-beat.ts:12`,
`apps/web/app/layout.tsx:234, :239`, `apps/web/app/tools/page.tsx:15`,
`apps/web/app/glass-ledger/page.tsx:23`,
`apps/web/components/tools/formula-plaque.tsx:2`,
`apps/web/lib/journal/claude.ts:27`, `apps/web/lib/claude-api/numeric-guard.ts:5`,
`apps/web/lib/trust-claims.ts:47`,
`.claude/agents/frontend-app-agent.md:19`,
`scripts/ops/chaos/c7..c12*.txt`.

---

## 5b. One no-publish gate was MEASURED and it holds — do not remove it

The mandate asked to *"locate and stage removal"* of the old no-publish
language. That request has to be applied **per gate, not wholesale**, and
one gate was tested.

**The pregame bridge's f2 duplicate block.** The claim
(`docs/reasoning/bridge-premises-audit-2026-09-27.md:56-63`) is that
`pregame_context_logit` duplicates the already-LIVE `historical_strength`
family, so `f2 = 1` and the family is DARK "no matter how much skill it
has". The repo's own research called this *"the real blocker"*
(`docs/engine/research/2026-10-02/corpus-deep/deep/c03/challenges.md:69`).

**MEASURED (`reconciliation/f2_duplicate_measurement.md`, reproduced by
`node reconciliation/measure_f2_duplicate.mjs`):**

| | ARM A (real) | ARM B (the 7 non-strength features permuted) |
|---|---:|---:|
| Brier | 0.223743 | **0.221850** |
| permutations beating the full arm | — | **20 of 20** |

| | |
|---|---:|
| incremental value of the seven features | **−0.001893** (negative) |
| 95% CI | **[−0.008075, +0.004245]** |
| P(permuting degrades the model) | **0.266** |

**Destroying those seven features made the model slightly BETTER.** The
bridge's entire skill comes from `margin_diff` — the strength class.
**The f2 = 1 claim holds on the measurement, and the gate stays.**

The reproduction check is exact: the measured Brier, raw binned ECE
(0.051868), `home_sign` and all eight coefficients match
`docs/reasoning/bridge-fit.json`.

**So the per-gate status after measurement:**

| gate | status |
|---|---|
| brand / AI-framing bans (§2.1) | stale prose — **staged for removal** |
| `CALIBRATION_PUBLISHED` / `CALIBRATION_AUTO_PUBLISH` defaults | policy — **founder decision** |
| the calibration contract's numeric gates | data-driven — **keep** |
| **the pregame bridge's f2 duplicate block** | **MEASURED TRUE — keep** |

A gate a measurement confirms is not "old language." Removing this one
would publish a model whose skill comes entirely from a family already
live at weight 0.08.

**The real loss is elsewhere, and it is fixable.** The bridge's measured
skill is collapsed to a single constant by
`packages/ingestion-pipeline/src/slate-association.ts:85-115`
(`probability: association.mean` = 0.560244) and labelled *"not a
published probability and not an edge."* The per-game probabilities —
where the skill actually lives — are discarded. The honest move is to
fold the bridge into the existing LIVE `historical_strength` family
rather than to publish it beside it. See
`reconciliation/f2_duplicate_measurement.md` §4.

## 6. The doctrine conflict that is NOT a cleanup item

`packages/ingestion-pipeline/src/gse-score-bridge.ts:37`:

> *"GSE action score is an internal gate, not a pick. `publishablePick` is
> false for every kernel decision, including PLAY and LEAN."*

Also `packages/prediction-engine/src/reasoning/aggregation-trace.ts:229` and
`packages/ingestion-pipeline/src/reasoning-trace.ts:202`.

**This is a design decision, not stale prose.** It was the right posture
while predictions were unpublished. Under the current model it means the
Reasoning Engine is *structurally barred* from ever being the thing that is
published.

**It is also the cheapest honest answer to the phase-3 gap.** The mandate
wants the reasoning engine to move `trueProb`. The repo already contains
the alternative: keep the reasoning engine as an **advisory trace** and
have it inform (not constitute) the published number. That is what
`publishablePick: false` means, and it is consistent with
`corpusWeight = 0`.

**Recommendation:** make the advisory posture explicit and documented rather
than leaving it as an accident of type declarations — and let the owner
decide, in one place, whether the engine should ever be allowed to propose
a number directly.

**This is a founder decision and is staged as such.** It is not patched.

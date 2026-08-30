# Launch Observatory

The Sports Intelligence OS is built around a hard split between what a
customer can see and what an operator can see. This document is the
operator's map of those surfaces and the deterministic rules that govern
what crosses from internal into public.

## Contents

- [Surfaces](#surfaces) — customer, admin, cockpit routes
- [Jarvis](#jarvis) — synthesizer module, output shape
- [Historical pick accountability](#historical-pick-accountability) — `/cockpit/history` ledger + bootstrap vs canonical
- [Public-performance readiness policy](#public-performance-readiness-policy) — gate, sample rules, customer messages
- [Operator checklist](#operator-checklist) — daily routine
- [Known limitations](#known-limitations)
- [Required environment variables](#required-environment-variables)
- [How to validate locally](#how-to-validate-locally)
- [Brand voice quick reference](#brand-voice-quick-reference) — vocabulary map, banned phrases, voice attributes
- [Data flow](#data-flow) — single-source-of-truth diagram
- [Troubleshooting Jarvis statuses](#troubleshooting-jarvis-statuses)
- [Jarvis assessment diff](#jarvis-assessment-diff) — `diffJarvis()` + alerts
- [Operator alerts](#operator-alerts) — paging severity rules
- [Responsible gambling — helpline policy](#responsible-gambling-helpline-policy)
- [Wiring the Jarvis trend on /cockpit](#wiring-the-jarvis-trend-on-cockpit)
- [CSV export format](#csv-export-format)
- [Snapshots (no-server preview)](#snapshots-no-server-preview)

## Surfaces

### Customer surfaces (public, unauthenticated unless noted)

| Route | Purpose | Gating |
|---|---|---|
| `/` | Marketing landing page | Banned-phrase scanned (`apps/web/__tests__/public-copy-scanner.test.ts`) |
| `/picks` | Daily slate of picks | Server-side data comes from `/api/picks` which 503s when `canExposePublicPicks=false` and filters `isBootstrap=false` |
| `/performance` | Public win/loss summary | Short-circuits to `<PerformanceBootstrapState />` when `canExposePerformanceStats=false`; canonical-only when open |
| `/dashboard` | Authenticated customer dashboard | Win rate / record / 14-day stats are driven by `evaluatePublicPerformancePolicy()` — blocked while the gate is closed or the canonical sample is too small |
| `/pricing` | Subscription tiers | Static |
| `/blog`, `/blog/[slug]` | Long-form content | Only published `ContentDraft` records appear; draft-only engine never auto-publishes |
| `/brief` | Daily sports brief | Trust-safe summary; readiness-gated |
| `/promotions` | Compliance-gated sportsbook promos | Filtered through `lib/promotions/guards.ts` |

### Admin/operator surfaces (ADMIN role required)

| Route | Purpose |
|---|---|
| `/admin` | Admin home |
| `/admin/dashboard` | Raw operational console — ingestion, picks, signal/snapshot detail. Live source of truth |
| `/admin/picks` | Per-pick management |
| `/admin/posts` | Blog content management |
| `/admin/users` | User and subscription view |

### Cockpit (ADMIN role required, separate from `/admin`)

| Route | Purpose |
|---|---|
| `/cockpit` | **Jarvis Launch Observatory** — synthesized launch readiness across customer surface, picks, performance, ingestion, settlement, signal coverage, plus the phase matrix and recommended next actions |
| `/cockpit/history` | **Forensic pick ledger** — last 100 picks with full eligibility breakdown, exclusion reasons, snapshot presence, learning eligibility, and filterable by result/bootstrap/eligibility |
| `/cockpit/jarvis/trend` | Recent Jarvis assessments held in the in-memory ring buffer; sectional health trend |
| `/cockpit/tasks`, `/cockpit/review`, `/cockpit/agents` | Operator task workflow (Phase 7) |
| `/cockpit/promotions` | Promotion workflow + compliance review |
| `/cockpit/brief` | Daily brief composer |
| `/cockpit/calibration` | Model accountability |
| `/cockpit/content` | Draft-only content engine |
| `/cockpit/sources` | Source intelligence |

`/admin/dashboard` and `/cockpit` are intentionally separate. The cockpit
is the synthesized command view; `/admin/dashboard` is the raw control
panel. The header on `/admin/dashboard` links to both `/cockpit` and
`/cockpit/history` so operators can move between them in one click.

## Jarvis

Jarvis is the operator synthesis layer, implemented in:
- `apps/web/lib/cockpit/jarvis.ts` — pure synthesizer (`synthesizeJarvis`),
  takes structured inputs and returns a `JarvisAssessment`.
- `apps/web/lib/cockpit/jarvis-data.ts` — DB loader that produces the
  inputs from live counts.
- Rendered on `/cockpit` as the top section of the overview.

The assessment includes:
- `launchStatus`: `LAUNCH_READY` | `LAUNCH_READY_PENDING_EXTERNAL_CONFIG` |
  `NOT_READY_DATA` | `NOT_READY_VALIDATION` | `NOT_READY_SAFETY` | `UNKNOWN`.
- Per-section health (`GREEN`/`AMBER`/`RED`/`UNKNOWN`) for public surface,
  customer dashboard, picks, performance, cockpit, historical picks,
  ingestion, settlement, canonical history, bootstrap, and signal coverage.
- Safety warnings, missing-phase warnings, external-config warnings, and
  a numbered list of recommended next actions.
- A phase matrix mapping every phase (1 through 9) to a status.

**Jarvis never:**
- Fabricates a number — missing inputs become `UNKNOWN`.
- Recommends auto-betting or auto-publishing.
- Claims `LAUNCH_READY` while a safety warning is active.

## Historical pick accountability

The pick forensic ledger lives at `/cockpit/history`. The page lists the
last 100 picks (with optional filters at the query string) and computes,
for each row, the public-performance eligibility via
`evaluatePickEligibility()` from `apps/web/lib/cockpit/history.ts`.

### Pick field reference

| Field | Meaning |
|---|---|
| `result` | `PENDING` (no outcome), `WIN`, `LOSS`, `PUSH` (excluded from W/L denominator), `VOID` (excluded entirely) |
| `isBootstrap` | True for picks written before `CANONICAL_HISTORY_ENABLED=true`. Never counts toward public performance |
| `isPublished` | True for picks intended to be visible publicly. Internal-only picks are stored for review but never publicly counted |
| `isFeatured` | Promotion flag honored only when `canPromoteFeaturedPicks=true` |
| `settledAt` | When the pick was settled. Missing settledAt on a non-pending pick is treated as incomplete settlement |
| `snapshot.eligibleForLearning` | Set only when `canLearnFromOutcomes=true`, the pick is canonical, and a real settlement exists |

### Bootstrap vs canonical

Bootstrap picks exist so the engine can be exercised end-to-end before
real canonical history accumulates. They are persisted with `isBootstrap=true`
and never:
- Count toward public win/loss/push displays.
- Drive the model's learning loop.
- Appear in `/api/performance` aggregations.

Canonical picks are everything else. The transition is operator-controlled
via `CANONICAL_HISTORY_ENABLED`.

## Public-performance readiness policy

Implemented in `apps/web/lib/performance/public-performance-policy.ts`
(`evaluatePublicPerformancePolicy`). Pure function, unit-tested.

The policy blocks public stats when **any** of the following are true:

1. Readiness gate `canExposePerformanceStats` is `false`.
2. Canonical settled-pick count is below `minSettledPicksForLearning`
   (default 25).
3. Every pick in the recent window is bootstrap.

The same helper is consumed by `/dashboard`, `/cockpit` (via Jarvis), and
is intended to be the single source of truth so the customer and the
operator never disagree about whether a number is safe to show.

### Why the customer dashboard may hide win rate

If the policy is blocked, `/dashboard` shows `Collecting` and a trust-safe
message ("Performance tracking is collecting baseline data") instead of a
record or win-rate percentage. This is by design — a bootstrap-era streak
must never appear on the customer surface, even to a logged-in user.

## Operator checklist

1. Open `/cockpit`. Read the Jarvis assessment at the top.
2. If `launchStatus` is anything other than `LAUNCH_READY`, address the
   numbered recommended next actions before opening any public claim.
3. Open `/cockpit/history` and confirm the bootstrap/canonical split looks
   right — bootstrap should never be a majority of recent picks once the
   platform has been running canonically.
4. Open `/admin/dashboard` for raw ingestion/settlement detail when Jarvis
   reports `AMBER` or `RED` on the corresponding sectional status.
5. Only flip `PERFORMANCE_STATS_ENABLED=true` once Jarvis reports
   `canonicalHistoryStatus=GREEN` and the canonical sample exceeds the
   minimum threshold.

## Known limitations

- The Jarvis layer manifest in `lib/cockpit/jarvis-data.ts` is updated by
  hand when a phase ships. This is intentional — runtime `fs.existsSync`
  checks are fragile across deploy environments.
- `/cockpit/history` reads 100 picks at a time; for older data, use the
  admin dashboard's deeper aggregations or run queries against the DB
  directly.
- Sandbox environments cannot run `npm install` while a partial
  `node_modules` is present and `.git/index.lock` is held. Local
  validation requires the recipe in `handoff.md §8.11`.

## Required environment variables

See `.env.example`. Jarvis treats the following as "external config"
and warns when any are missing: `DATABASE_URL`, `NEXTAUTH_SECRET`,
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `THE_ODDS_API_KEY`, `ANTHROPIC_API_KEY`.

## Snapshots (no-server preview)

Static HTML snapshots of every critical route are committed alongside the
docs. Open `reports/launch-night/snapshots/index.html` in any browser to
preview the cockpit, the customer dashboard, the performance bootstrap
state, and the forensic ledger without spinning up the dev server.

The snapshots are intentionally checked in so a reviewer can verify the
launch-readiness story end-to-end before running the validation suite.

| Snapshot | What it shows |
|---|---|
| `index.html` | Index of all snapshots, with brief descriptions |
| `cockpit.html` | Jarvis Launch Observatory (status, blockers, recommended actions) |
| `cockpit-history.html` | Forensic pick ledger with bootstrap badges and exclusion reasons |
| `cockpit-brief.html` | Operator mirror of today's brief |
| `cockpit-calibration.html` | Model accountability dashboard |
| `dashboard.html` | Customer dashboard with the brand-safe gating applied |
| `performance.html` | Public performance surface in bootstrap state |
| `picks.html` | Daily slate (with the slate gate applied) |
| `home.html` | Public landing page |
| `brief.html` | Public daily brief |

The snapshots are regenerated as the cockpit changes. If you're auditing
a PR, diff the relevant `.html` files alongside the source diffs.

## How to validate locally

```bash
# Once node_modules is clean and .git/index.lock cleared (see handoff.md §8.11)
npm run lint
npm run typecheck
npm run test -- public-performance-policy
npm run test -- jarvis
npm run test -- history-eligibility
npm run test -- dashboard-performance-gate
npm run test -- cockpit-routes
npm run build
```

## Brand voice quick reference

The brand is **trust-first, boringly honest, professional-but-warm**. Customer
surfaces and operator surfaces are intentionally written in different
registers — keep the asymmetry.

### Vocabulary map: customer-facing copy ↔ internal terms

| Use in customer copy | Internal/operator term | Notes |
|---|---|---|
| Verified picks | Canonical picks | "Canonical" is engine vocabulary |
| Early-period picks | Bootstrap picks | Customers have no model for "bootstrap" |
| Complete picks | Settled picks | "Settled" is fine when paired with W/L/P, but "complete" reads cleaner |
| Tracked / collected | Persisted / written | Avoid datastore verbs in customer copy |
| Verified Record | Canonical Record / Track Record | "Track record" is banned — implies a historical guarantee |
| Win Rate | Win % / Hit Rate | Either is fine; "Win Rate" is what we ship today |
| Confidence Score | Edge Score | Edge is operator-only; show Confidence to customers |
| Past performance does not guarantee future results | (n/a) | Mandatory disclaimer on every public performance claim |

Both `INTERNAL_VOCABULARY` and the `TrustClaim` banned-phrase registry in
`apps/web/lib/trust-claims.ts` are the canonical source. Tests
(`public-performance-policy.test.ts`, `public-copy-scanner.test.ts`)
import them — do not duplicate the lists.

### Banned phrases (will fail CI)

`guaranteed`, `risk-free`, `sure thing`, `easy money`, `can't lose`,
`lock`, `verified track record`, `thousands of bettors`. See
`TRUST_CLAIMS` BANNED entries for the authoritative list.

### Voice attributes

| Spectrum | Position |
|---|---|
| Formality | Conversational, not slangy |
| Authority | Expert without condescension |
| Emotion | Direct + warm — never hype |
| Complexity | Plain language to customers, precise jargon to operators |
| Energy | Calm, measured |
| Humor | Earnest — no jokes in customer copy |
| Innovation | "Built carefully" rather than "cutting edge" |

## Data flow

```
                    ┌──────────────────────┐
                    │  The Odds API + DBs  │
                    └──────────┬───────────┘
                               │
                       ingestion worker
                               │
                               ▼
              ┌─────────────────────────────────┐
              │ Pick + PickSignalSnapshot table │
              └──────────┬──────────────────────┘
                         │
            ┌────────────┼─────────────┐
            │            │             │
            ▼            ▼             ▼
   getReadinessGates()   db.pick   db.ingestionRun
            │            │             │
            └─────┬──────┴─────────────┘
                  │
                  ▼
     evaluatePublicPerformancePolicy()  ── single source of truth ──┐
                  │                                                  │
   ┌──────────────┼──────────────┐                                   │
   │              │              │                                   │
   ▼              ▼              ▼                                   │
/dashboard   /performance   /api/picks/                              │
(customer)   (customer)     daily-slate (API)                        │
                                                                     │
                  ▼                                                  │
            synthesizeJarvis()  ─── pure synthesizer ────────────────┘
                  │
                  ▼
              /cockpit (admin) + /cockpit/history (admin)
                  │
                  ▼
            /admin/dashboard (raw operator console)
```

Customer surfaces never query historical picks directly for performance —
they go through the policy. Operator surfaces (admin + cockpit) read live
DB counts but pass them through Jarvis for synthesis.

## Troubleshooting Jarvis statuses

| Status | What it means | Most likely cause | First operator action |
|---|---|---|---|
| `LAUNCH_READY` | All sectional health is GREEN, no safety/missing-phase warnings | Code + data + config are all in place | Continue monitoring; flip public performance gate when ready |
| `LAUNCH_READY_PENDING_EXTERNAL_CONFIG` | Code is fine, amber on at least one section | Missing env var, partial CI, or no live ingestion yet | Check `externalConfigWarnings` and `missingPhaseWarnings` |
| `NOT_READY_DATA` | RED on a sectional status | Stale ingestion (>24h), stale settlement (>36h), or no canonical history | Re-run ingestion worker; check `/admin/dashboard` raw counts |
| `NOT_READY_VALIDATION` | At least one input is UNKNOWN | Empty DB, missing ingestionRun, or stub mode | Verify `DATABASE_URL`; seed and run the workers |
| `NOT_READY_SAFETY` | Would be LAUNCH_READY but a safety warning fires | Public picks live while performance gate closed; or bootstrap data with public exposure | Hold the gate or hide the surface until the warning clears |
| `UNKNOWN` | Jarvis couldn't compute anything | Synthesizer error or every input is missing | Check `/cockpit` for the displayed error; inspect server logs |

### Common safety-warning interpretations

- *"Public picks are live but performance stats are gated"* — `canExposePublicPicks=true` while `canExposePerformanceStats=false`. The customer dashboard hides the win-rate (policy enforces this) but `/picks` is publicly visible. Either open the perf gate or close the picks gate.
- *"Bootstrap mode is active. Bootstrap picks exist…"* — Reminder that bootstrap counts must stay excluded from public performance. The policy enforces this; the warning exists so the operator does not flip `PERFORMANCE_STATS_ENABLED=true` prematurely.
- *"Ingestion has N recent failures"* — investigate `/admin/dashboard` recent ingestion runs; the data-refresh worker is upserting but failing on something.

## Jarvis assessment diff

`apps/web/lib/cockpit/jarvis-diff.ts` provides:

- `diffJarvis(previous, current)` — pure deep-comparison of the cockpit-
  relevant fields between two `JarvisAssessment` instances. Returns a
  `JarvisDiff` with `hasChanges`, `launchStatusChanged`, per-sectional
  changes, warning-count deltas, and **set** diffs for safety warnings
  and external-config keys (so the consumer can react to "new" or
  "cleared" rather than count alone).
- `summarizeJarvisDiff(diff)` — one-line summary, empty string when
  nothing changed.

Common uses:

- Pair with `sharedJarvisHistory()` to compute `diffJarvis(prev, curr)`
  on every assessment push and surface a "what changed" badge near the
  launch status pill.
- Pipe `summarizeJarvisDiff` into the audit log so a daily review can
  scan the deltas without diffing entire JSON blobs.
- Trigger an alert (Slack, email, on-call) when `newSafetyWarnings`
  is non-empty.

The helper is intentionally limited to cockpit-meaningful fields —
full JSON diffing produces noise on cosmetic shape changes.

## Operator alerts

`apps/web/lib/cockpit/jarvis-alerts.ts` turns a `JarvisDiff` (from the
diff helper, ADR 002) into a typed array of operator alerts:

```ts
type JarvisAlertSeverity = "info" | "warning" | "page";

interface JarvisAlert {
  severity: JarvisAlertSeverity;
  title: string;
  detail: string;
  key: string;            // stable dedupe key
}
```

Severity rules:

- **page** — ingestion or settlement goes RED, new safety warning,
  launch status becomes `NOT_READY_DATA` or `NOT_READY_SAFETY`.
- **warning** — generic launch-status change, GREEN→AMBER on any
  sectional, RED on a non-data section, new external-config gap.
- **info** — recoveries (RED→non-RED, safety warning cleared, config
  resolved).

Helpers:

- `alertsFromDiff(diff)` — full alert array
- `pagingAlerts(alerts)` — filter to `severity === "page"`
- `launchStatusAlert(currentLaunchStatus)` — convenience pager for a
  hard NOT-READY transition when you only have the current status

**Delivery is intentionally not wired.** This module is pure; it only
produces the payload. Wire a delivery sink (Slack, email, SMS, PagerDuty)
in your scheduled job by reading `pagingAlerts()` and forwarding each
alert via your existing transport. The `key` field on each alert is
stable enough to dedupe across runs.

Suggested job shape:

```ts
const prev = sharedJarvisHistory().recent(2)[1] ?? null;
const { assessment } = await loadJarvisAssessment();
const curr = sharedJarvisHistory().push(assessment);  // also returns the snapshot
const diff = diffJarvis(toAssessment(prev), assessment);
const alerts = alertsFromDiff(diff);
const pages = pagingAlerts(alerts);
for (const a of pages) await pageOnCall(a);
```

## Responsible gambling — helpline policy

The trust-claim `risk.gamble-responsibly` references **1-800-522-4700**
(the U.S. National Problem Gambling Helpline). This number is the
canonical default for any public copy that references a helpline:

- The Helpline is operated by the National Council on Problem Gambling
  (NCPG) and is the most widely recognized U.S. number for problem
  gambling support.
- It is free, confidential, and available 24/7.
- It is the number U.S. sportsbooks reference in their own promotional
  copy, so it aligns with the compliance language sportsbooks expect.

If a future deployment ships to a non-U.S. market, the helpline must be
swapped for a locale-appropriate alternative. The trust-claim registry
is the single update point — change the `copy` field on
`risk.gamble-responsibly` and every surface that consumes the claim
(including `<RiskDisclosure />`) picks up the new number on the next
deploy. Do not hardcode a phone number anywhere outside the registry.

## Wiring the Jarvis trend on /cockpit

The Jarvis ring buffer (`apps/web/lib/cockpit/jarvis-history.ts`) and
the visual indicator (`apps/web/components/cockpit/jarvis-trend.tsx`)
are ready to render but not yet wired into the overview page itself.

To enable the trend display:

1. In `apps/web/app/cockpit/page.tsx`, after `loadJarvisAssessment()`,
   push the result into the shared buffer:

   ```tsx
   import { sharedJarvisHistory } from "@/lib/cockpit/jarvis-history";
   import { JarvisTrend } from "@/components/cockpit/jarvis-trend";

   const jarvis = await loadJarvisAssessment();
   if (jarvis) sharedJarvisHistory().push(jarvis.assessment);
   ```

2. Render the trend (newest on the right) somewhere near the launch
   status pill:

   ```tsx
   <JarvisTrend snapshots={sharedJarvisHistory().recent(8).reverse()} />
   ```

3. Optional: the `/api/cockpit/jarvis/trend` endpoint already pushes on
   every call, so a separate cron job or browser auto-refresh keeps the
   trend moving even when the page isn't reloaded.

The buffer is process-local. Multi-process deploys should swap the
shared buffer for a Redis-backed one when persistence matters.

## CSV export format

`/api/cockpit/history/export` returns a UTF-8 CSV with the columns below
in order. Admin-only. The same querystring vocabulary as `/cockpit/history`
(`result`, `bootstrap`, `published`, `sport`, `model`, `eligible`,
`learning`) round-trips into the export. Max 500 rows per call.

| Column | Type | Notes |
|---|---|---|
| `id` | string | Pick UUID |
| `generatedAt` | ISO timestamp | When the pick was generated |
| `settledAt` | ISO timestamp \| empty | Empty for pending picks (NOT the literal `null`) |
| `sport` | string | Sport display name (e.g. `NFL`) |
| `matchup` | string | `Away @ Home` |
| `pickType` | enum | `SPREAD`/`TOTAL`/`MONEYLINE` |
| `selection` | string | Human-readable selection |
| `line` | number | Numeric line value |
| `confidence` | int | 0–100 |
| `pickGrade` | enum | `ELITE_PLAY`/`STRONG_PLAY`/`SOLID_PLAY`/`LEAN` |
| `riskLevel` | enum | `LOW`/`MODERATE`/`HIGH` |
| `modelVersion` | string | Engine version that produced the pick |
| `bookmakerCount` | int | Number of bookmakers in the consensus |
| `edgeScore` | float | Net edge score (0–100) |
| `consensusPct` | float | 0.0–1.0 |
| `result` | enum | `PENDING`/`WIN`/`LOSS`/`PUSH`/`VOID` |
| `isBootstrap` | bool | `true`/`false` |
| `isPublished` | bool | `true`/`false` |
| `isFeatured` | bool | `true`/`false` |
| `hasSnapshot` | bool | Whether the `PickSignalSnapshot` row exists |
| `publicPerformanceEligible` | bool | Computed at export time against the live gate |
| `learningEligible` | bool | Computed at export time |
| `exclusionReasons` | string | `;`-joined when not eligible; empty when eligible |

**Escape rules** (RFC 4180 minimal):
- Cells containing `,`, `"`, `\r`, or `\n` are wrapped in double quotes.
- Double quotes inside wrapped cells are doubled (`"` → `""`).
- Newlines inside cells stay quoted; multi-line cells are valid CSV.

**Header line** is `\r\n`-terminated, matching the body rows.

**File name** is `cockpit-history-YYYY-MM-DD.csv` based on the export-time
UTC date.

The endpoint always sets `Cache-Control: no-store` so admin exports never
hit a stale cache.

If lint/typecheck/test/build all pass, the launch observatory is
deployable. Jarvis still has the final word on whether the **platform** is
launch-ready — code-readiness and data-readiness are separate verdicts.

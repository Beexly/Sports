# Pre-Launch Repo R&D — Feedback, Friction & Transactional Email

**Date:** 2026-06-17
**Author:** Claude (research agent)
**Scope:** R&D only. Study three OSS repos for *patterns*, audit existing GSE
systems to avoid duplication, and propose lightweight GSE-native designs.
**Constraints honored:** No dependencies proposed for adoption. No existing code
modified. This doc is the only file written. No builds run.

> Hard rule reminder for whoever implements: GSE is a no-fake-data,
> compliance-sensitive sports-picks platform. Every design below is gated by
> "real data only," server-side enforcement, no PII leakage, and the trust-claim
> registry. Nothing here ships fabricated stats or social proof.

---

## 0. TL;DR Verdict Table

| Capability | Exists today? | Net-new work | Needs Prisma migration? | New dep? | Pre-launch verdict |
|---|---|---|---|---|---|
| Launch Feedback Inbox ("what confused you?") | No model; only `mailto:` contact + analytics stub | Mostly net-new (API route + 1 model + tiny widget) | **Yes** (1 model: `FeedbackSubmission`) | No | **SAFE to build pre-launch** |
| Friction Event Tracker (event-level) | `track()` no-op stub + typed event names only | Net-new ingest route + detectors; reuse event vocabulary | **Yes** (1 model: `FrictionEvent`) | No | **SAFE (minimal) — defer detectors/dashboards** |
| Owner Alert + Weekly Brief emails | Alert *payload* helpers exist; **no sender, no templates** | Net-new templates + 1 sender adapter | No (reuses existing models) | **No — use plain HTML helper** | **SAFE to build pre-launch** |
| Conversion Objection Capture | Analytics event names defined (`cancellation_reason_submit`), **not wired** | Net-new: fold into Feedback model + capture UI | Shares Feedback model (no extra) | No | **DEFER capture UI to post-launch; build schema now** |
| Public Trust Microcopy data model | `trust-claims.ts` typed registry already authoritative | Mostly exists; optional freshness/responsible-gaming fields | No (keep as typed module) | No | **SAFE — extend module, do NOT migrate to DB** |

---

## 1. Repos Researched — Patterns & Citations

### 1.1 formbricks/formbricks (in-product feedback / micro-survey / churn)

Stack-relevant because it is itself Next.js 14 + Prisma/Postgres (AGPL — pattern
study only, not a dependency).

- **Questions-as-JSON on one row.** A `Survey` row stores `questions Json` rather
  than normalized question rows — cheap migrations, flexible question types.
  Fields: `id, name, type (app|link), status, questions Json, displayOption,
  recontactDays, displayLimit, triggers, inlineTriggers Json?`. Question type enum
  (`TSurveyQuestionTypeEnum`): `openText, multipleChoiceSingle/Multi, nps, cta,
  rating, consent, csat, ces, …`; every question has `required: boolean`; rating/NPS
  carry `scale: 'number'|'smiley'|'star'` + `range`.
  ([schema.prisma](https://github.com/formbricks/formbricks/blob/main/packages/database/schema.prisma),
  [surveys/types.ts](https://github.com/formbricks/formbricks/blob/main/packages/types/surveys/types.ts),
  [db model docs](https://formbricks.com/docs/development/technical-handbook/database-model))
- **Display vs Response split.** A `Display` row is written *every time a survey is
  shown* (`surveyId, contactId?, createdAt`), distinct from a `Response`. This
  enables reach/fatigue math and "shown-but-ignored" detection. Worth copying.
  ([surveys/types.ts](https://github.com/formbricks/formbricks/blob/main/packages/types/surveys/types.ts))
- **Partial-response capture.** `Response.data Json` keyed by question id, with
  `finished Boolean @default(false)`; the row is created/grown incrementally so
  drop-offs are captured, not lost. `contactId String?` (nullable → anonymous),
  `contactAttributes Json?` (point-in-time snapshot).
  ([schema.prisma](https://github.com/formbricks/formbricks/blob/main/packages/database/schema.prisma))
- **Churn / objection template.** Cancel-survey: required `multipleChoiceSingle`
  "primary reason for canceling?" with predefined options (*Too expensive / Missing
  features / Switched tool / No longer need / Too difficult / Poor support / Other*)
  + optional open text. Recommended trigger = **click on the "Cancel" button** (CSS
  selector / inner text). Win-back via conditional logic, not a hard gate.
  ([churn template](https://formbricks.com/survey-templates/churn-survey),
  [cancel best practices](https://formbricks.com/docs/xm-and-surveys/xm/best-practices/cancel-subscription))
- **No-code triggers.** Reusable `ActionClass` (named event + `noCodeConfig Json`:
  click/pageView/exitIntent/scroll/timeOnPage) + `urlFilters` (`{value, rule}` where
  rule ∈ exactMatch|contains|startsWith|…|matchesRegex). Recontact: `displayOption ∈
  displayOnce|displayMultiple|respondMultiple`, `recontactDays`, `displayLimit`,
  `displayPercentage`.
  ([action-classes.ts](https://raw.githubusercontent.com/formbricks/formbricks/main/packages/types/action-classes.ts))
- **Anonymous-first privacy.** Responses collected with `contactId = null` when no
  user is identified; identification is opt-in.
  ([user-identification docs](https://formbricks.com/docs/app-surveys/user-identification))
- **Link vs App surveys.** *Link* survey = a plain hosted route, no SDK, context via
  hidden fields + one-time `singleUseId` — lowest footprint. *App* survey = JS SDK
  with in-app intercept/targeting. For GSE, the link-survey path is the cheap start.
  ([survey types](https://formbricks.com/docs/xm-and-surveys/xm/best-practices/understanding-survey-types))

### 1.2 openreplay/openreplay (friction detection — concepts, NOT replay)

We want event-level friction signals **without** DOM session recording.

- **Rage-click heuristic (source-level):** `MinClicksInARow = 3`,
  `MaxTimeDiff = 300ms`; clicks count toward rage only when same label and gap <
  300ms; 3+ emits `click_rage`. NOTE: docs say "3 within 7s" — code and docs
  disagree; industry norm ~3 within ~1s.
  ([clickRage.go](https://github.com/openreplay/openreplay/blob/main/backend/pkg/handlers/web/clickRage.go),
  [issues docs](https://docs.openreplay.com/en/tutorials/issues/))
- **Dead click:** `ClickRelationTime ≈ 1234ms` — a click with no DOM mutation /
  input change / navigation within ~1.2s; input-target clicks excluded.
  ([deadClick.go](https://github.com/openreplay/openreplay/blob/main/backend/pkg/handlers/web/deadClick.go))
- **U-turn / quick-return:** canonical custom heuristic — return to the same URL
  within **5s**. ([custom-heuristics](https://docs.openreplay.com/en/tutorials/custom-heuristics/))
- **Event taxonomy + reusable fields:** `CLICK, INPUT, LOCATION, CUSTOM, CLICKRAGE,
  DEAD_CLICK, MOUSE_THRASHING, CONSOLE`. Base event: `time, type, name, label,
  targetPath`. Click adds `selector, count, hesitation`. Location adds `url, host,
  loadTime, fcpTime`. The **`hesitation`** (ms before interacting) field is a cheap,
  high-signal friction metric.
  ([event.ts](https://github.com/openreplay/openreplay/blob/main/frontend/app/types/session/event.ts),
  [filterType.ts](https://github.com/openreplay/openreplay/blob/main/frontend/app/types/filter/filterType.ts))
- **Funnels join friction to drop-off:** per-step conversion + lost conversions, with
  friction issues correlated to the step where they happened.
  ([funnels docs](https://docs.openreplay.com/en/product-analytics/funnels/))
- **Privacy masking (mask before send):** `data-openreplay-obscured` /
  `data-openreplay-hidden` attributes; tracker config `obscureTextEmails=true`,
  `obscureInputEmails=true`, `defaultInputMode: 0|1|2` (plain/obscured/ignored,
  default obscured). Sanitize in-browser before the payload leaves.
  ([sanitize-data docs](https://docs.openreplay.com/en/sdk/sanitize-data/))

### 1.3 resend/react-email (transactional templates — branch `canary`)

- **~18 components** from `@react-email/components`: `Html, Head, Body, Container,
  Section, Row, Column, Text, Heading, Button, Link, Hr, Img, Preview, Font, Tailwind,
  Markdown`. `Button` renders an `<a>` (not `<button>`) with mso-safe padding; layout
  primitives render to `<table>/<tr>/<td>` (rule: never flex/grid).
  ([README canary](https://raw.githubusercontent.com/resend/react-email/canary/README.md),
  [button docs](https://react.email/docs/components/button),
  [tailwind docs](https://react.email/docs/components/tailwind))
- **Render pipeline:** `render(<Template/>)` from **`@react-email/render`** is
  **async**, returns an HTML string; options `pretty`, `plainText` (plain-text now via
  separate `toPlainText(html)`). Not both auto from one call.
  ([render docs](https://react.email/docs/utilities/render))
- **Authoring/preview:** `.tsx` default-exporting a component; `email dev` runs a
  live-reload preview server. ([CLI docs](https://react.email/docs/cli))
- **Compatibility:** table layout + inline styles under the hood; Tailwind inlined at
  render; `pixelBasedPreset` converts rem→px; dark mode is hand-rolled
  (`<meta color-scheme>` + `@media prefers-color-scheme`).
  ([tailwind docs](https://react.email/docs/components/tailwind))
- **Packaging:** split — `@react-email/components` (barrel re-exporting ~20
  `@react-email/*` packages) + `@react-email/render`; the top-level `react-email`
  bundles a heavy dev/preview app. Send-time needs only components+render.
  ([render package](https://www.npmjs.com/package/@react-email/render))
- **Minimal plain-HTML alternative we'd replicate** (the value react-email adds that
  we'd forgo): table layout not flex/grid; everything inline-styled; standard `<head>`
  boilerplate; a hidden preview-text span; buttons as padded `<a>`; a plain-text twin.
  What we give up: composable typed components, the `email dev` preview, automatic
  Tailwind inlining, and Resend's per-client testing of each primitive (Outlook button
  padding, etc.). For 2 low-volume templates, plain template literals are reasonable.

---

## 2. Existing GSE Systems — Overlap Audit (file:line)

> Net conclusion: GSE has **typed scaffolding and copy doctrine** for all five
> capabilities, but **no persistence, no senders, and no friction detectors**. The
> hard parts (trust governance, alert payloads, event vocabulary, email copy/voice)
> are already done. Implementation is mostly wiring + 2 small models.

### 2.1 Feedback / contact / survey
- `apps/web/app/contact/page.tsx:30-71` — Contact page is **`mailto:`-only** (Support /
  Legal / Press inboxes via `mailto:${email}`). No form, no POST, no capture.
- `apps/web/app/api/contact/*` — **does not exist** (confirmed: no `api/contact` dir).
- `packages/db/prisma/schema.prisma` — **no** `Feedback`, `Survey`, `Contact`,
  `Lead`, `Waitlist`, `Response`, or `Objection` model anywhere (grep returned none).

### 2.2 Email / transactional sender
- **No sender exists.** No `resend`/`nodemailer`/`sendgrid`/`postmark`/`createTransport`
  in `apps/web/lib`, `workers`, or `packages` (grep clean). None in `package.json`.
- `apps/web/lib/cockpit/jarvis-alerts.ts:1-33` — `alertsFromDiff()` produces typed,
  **transport-neutral** `JarvisAlert` payloads (`severity: info|warning|page`); module
  comment explicitly says it "does NOT send Slack/email/SMS. … Callers wire the
  delivery mechanism." This is the natural input to an owner-alert email.
- `packages/db/prisma/schema.prisma:647-661` — `Alert` model exists but is a
  *user-configured pick-alert preference* (`threshold`, `channel AlertChannel`,
  `active`), **not** a transactional-email log.
- `docs/email-sequences/welcome-flow.md:1-12` — Full 5-email welcome sequence copy
  already written in founder voice; header names **"Stack target: Resend / Postmark /
  Loops"** and `Sender: hq@galaxysportsedge.com`. Email *copy* exists; *plumbing* does
  not.
- `apps/web/lib/brand.ts:33-36` — `SUPPORT_EMAIL` / `LEGAL_EMAIL` =
  `hq@galaxysportsedge.com` (single inbox today).

### 2.3 Analytics / event tracking / friction
- `apps/web/lib/analytics/events.ts:13-84` — Typed `AnalyticsEvent` union (incl.
  `feature_lock_click`, `upgrade_cta_click`, `checkout_abandon`, `locked_pick_click`,
  `cancellation_start`, **`cancellation_reason_submit`**) + a documented
  `ANALYTICS_EVENTS` contract + `track()` that is an explicit **NO-OP** ("inert for
  now — no network, no identity") + `isAnalyticsEvent()` guard. This is the seam to
  extend; it already forbids PII.
- No analytics provider dep (no posthog/mixpanel/plausible/gtag in `package.json`).
- No rage-click / friction / telemetry implementation exists (the grep hits under
  `lib/` are sports-domain "signal/telemetry" usages, not UX friction).

### 2.4 Cockpit / Jarvis owner surfaces (candidate hosts for inbox/friction lanes)
- `apps/web/app/cockpit/` — owner OS with lanes incl. `command-center`, `tasks`,
  `brief`, `journal`, `losses`, `moderation`, `synthetic-monitoring`, `api-costs`.
  A **Feedback Inbox** and a **Friction** lane fit naturally as new cockpit routes.
- `apps/web/lib/command-center/attention.ts:1-50` — `scoreFactors()` ranks owner
  attention by `costOfDelay/severity/reversibility/effort/sourceConfidence` (weights
  sum to 1.0). New feedback/friction signals could be **fed into this existing ranker**
  rather than building a new prioritization surface.
- `apps/web/lib/cockpit/owner-summary.ts:1-55` — `buildOwnerSummary()` is the pure
  synthesis feeding the cockpit landing page; honest-by-design (telemetry stated as
  "unavailable until wired"). A feedback/friction count slots in here.

### 2.5 No-Bet language & public trust microcopy
- `apps/web/lib/trust-claims.ts:1-475` — **The trust microcopy source of truth.** Typed
  `TrustClaim` registry: `category` (METHODOLOGY/DATA_TRANSPARENCY/PERFORMANCE/PRICING/
  SOCIAL_PROOF/RISK_DISCLOSURE), `status` (APPROVED/GATED/BANNED), `evidence`,
  `visibility`, `requiredGate`, `lastReviewedAt`, `reviewNote`. Includes the
  responsible-gaming line (`risk.gamble-responsibly`, 1-800-522-4700), no-guarantee /
  past-performance disclosures, banned-phrase list ("guaranteed", "lock", "risk-free",
  …) + `scanForBannedPhrases()` (CI-enforced). Header explicitly says: **"No database
  persistence. This is a typed module. … Promote to a `TrustClaim` Prisma model …
  if/when claim volume justifies it."**
- `apps/web/components/world/no-bet-gate.tsx:12-50` — `NoBetGateChapter` holds the
  No-Bet doctrine + the four canonical gate reasons (Freshness failed / Price below
  threshold / Model disagreement / Trust gate closed). Copy lives in the component.
- Freshness/"as of" microcopy is scattered across components:
  `components/picks/pick-card.tsx`, `components/ui/methodology-section.tsx`,
  `components/hero/signal-preview-queue.tsx`, `components/home/mission-control.tsx`,
  `components/home/annotated-sample-signal.tsx`, et al.

---

## 3. What Must NOT Be Duplicated

1. **Do NOT add an analytics SDK or re-create `track()`.** Extend
   `apps/web/lib/analytics/events.ts`. Friction event names should join the existing
   `AnalyticsEvent` union (or a sibling `FrictionEventType`), and any client emit must
   reuse the PII-free `track()` contract.
2. **Do NOT migrate `trust-claims.ts` into Postgres.** It is intentionally a typed,
   PR-reviewed, CI-scanned module. The "Public Trust Microcopy data model" should be an
   *extension of this module*, not a new `TrustClaim` table. Migrating to DB would lose
   the `scanForBannedPhrases()` CI gate and the source-review auditability.
3. **Do NOT build a custom cancel flow that bypasses Stripe.** Cancellation is the
   Stripe Customer Portal (`apps/web/app/api/subscriptions/portal`). Objection capture
   must wrap/precede the portal redirect — not replace it.
4. **Do NOT write a second alert/prioritization engine.** Reuse
   `command-center/attention.ts` scoring and `jarvis-alerts.ts` payloads; feedback and
   friction become new signal sources into them.
5. **Do NOT add `react-email` / `@react-email/*` as a dependency** (per task + the
   no-new-dep posture). Borrow its *conventions* in a tiny plain-HTML helper.
6. **Do NOT record DOM / session replay.** Event-level only; mask in-browser.
7. **Do NOT fabricate any public number.** Feedback counts, friction rates, etc. are
   owner-facing (cockpit) only unless/until a trust claim authorizes a public form.

---

## 4. Concrete Lightweight GSE-Native Designs (typed sketches)

> All sketches are illustrative TypeScript/Prisma. Flags: **[MIGRATION]** = needs a
> Prisma migration; **[NO DEP]** = no new dependency; **[REUSE]** = builds on existing
> code.

### 4.1 Launch Feedback Inbox — "What confused you?" / "What would make you trust this?"
**Exists:** contact page (mailto only), analytics stub, cockpit host. **Net-new:** 1
model + 1 API route + a tiny client widget + 1 cockpit lane. **[MIGRATION]** **[NO DEP]**

Borrows from formbricks: questions-as-JSON, nullable contact (anonymous-first),
`finished` flag, dismissal capture. One model serves *both* the feedback inbox **and**
objection capture (§4.4) via a `kind` discriminator.

```prisma
// [MIGRATION] packages/db/prisma/schema.prisma
enum FeedbackKind {
  LAUNCH_CONFUSION      // "what confused you?"
  TRUST_BLOCKER         // "what would make you trust this?"
  CANCEL_OBJECTION      // pre-cancel reason (§4.4)
  PRICING_HESITATION    // surfaced from friction (§4.2)
  GENERAL
}
enum FeedbackStatus { NEW TRIAGED ACTIONED ARCHIVED }

model FeedbackSubmission {
  id         String         @id @default(cuid())
  kind       FeedbackKind
  // questions-as-JSON answers (formbricks pattern): { questionId: answer }
  answers    Json           @default("{}")
  freeText   String?        // open-text; scanned for PII before storage
  route      String?        // page the feedback was given on (no querystring/PII)
  // anonymous-first: null when not signed in
  userId     String?
  status     FeedbackStatus @default(NEW)
  // attention-ranker inputs (reuse command-center weights, not new math)
  severityHint Float?       @default(0)
  createdAt  DateTime       @default(now())
  user       User?          @relation(fields: [userId], references: [id], onDelete: SetNull)
  @@index([kind, status])
  @@index([createdAt])
}
```

```ts
// apps/web/app/api/feedback/route.ts (server-side, validated, PII-screened)
import { scanForBannedPhrases } from "@/lib/trust-claims"; // [REUSE] — also screen our OWN copy
const FeedbackInput = z.object({
  kind: z.nativeEnum(FeedbackKind),
  answers: z.record(z.string().max(2000)).default({}),
  freeText: z.string().max(4000).optional(),
  route: z.string().max(200).optional(), // strip querystring server-side
});
// POST: rate-limit by IP+session, drop emails/phones from freeText (privacy review),
// persist, then surface in cockpit via command-center/attention.ts as a signal.
```

UI: a dismissible "Was anything confusing?" card (2 questions max: one `cta`-style
pick + one optional open text), shown once per route (formbricks `displayOnce`),
mounted in the existing layout. Dismissal is itself recorded (a `Display`-style event
via §4.2 friction, not a Feedback row).

### 4.2 Friction Event Tracker — route / CTA / error / pricing-hesitation / empty-state
**Exists:** `track()` no-op + typed funnel events. **Net-new:** ingest route +
detectors (defer detectors). **[MIGRATION]** (minimal) **[NO DEP]**

Borrows from openreplay: discrete event taxonomy, `hesitation` metric, mask-before-send,
detect friction server-side from the event stream (no DOM). Privacy-safe by default.

```ts
// apps/web/lib/analytics/friction.ts — extend the EXISTING analytics contract [REUSE]
export type FrictionEventType =
  | "route_view" | "cta_click" | "cta_dead_click"   // dead = no nav/state change <1.2s
  | "rage_click"                                     // >=3 same-target clicks <800ms
  | "u_turn"                                         // back to same route <5s
  | "client_error"                                   // caught error boundary / fetch fail
  | "pricing_hesitation"                             // dwell on /pricing CTA w/o click
  | "empty_state_view";                              // a surface rendered with no data
// Reuse track()'s no-PII discipline. Selector identity only — NEVER innerText/values.
export interface FrictionPayload {
  type: FrictionEventType;
  route: string;            // pathname only, querystring stripped
  selector?: string;        // stable data-friction-id, NOT a DOM dump
  hesitationMs?: number;    // openreplay's cheap high-signal metric
  count?: number;           // for rage clusters
  meta?: Record<string, string | number | boolean>; // whitelisted keys only
}
```

```prisma
// [MIGRATION] minimal append-only table; aggregate in a worker, prune on a TTL
model FrictionEvent {
  id          String   @id @default(cuid())
  type        String   // FrictionEventType
  route       String
  selector    String?
  hesitationMs Int?
  sessionHash String?  // salted hash, NOT a user id — privacy-safe
  createdAt   DateTime @default(now())
  @@index([type, route])
  @@index([createdAt])
}
```

Privacy posture (openreplay-derived, enforced in code): default-mask — never capture
input values or innerText; require an explicit `data-friction-id` on tracked elements;
strip querystrings; salted `sessionHash` not `userId`; honor DNT; opt-out flag.
**Detectors** (rage/dead/u-turn) run in a worker over `FrictionEvent`, with thresholds
as *config* (default rage = 3/800ms — deliberately looser than openreplay's 300ms,
which catches mis-fired double-clicks; dead = 1.2s; u-turn = 5s).

### 4.3 Owner Alert + Weekly Brief emails (react-email-style, but plain HTML)
**Exists:** alert payloads (`jarvis-alerts.ts`), weekly-brief data (`DailyBrief*`
models), full welcome copy. **Net-new:** template helper + 1 sender adapter.
**[NO DEP] — recommend plain HTML, NOT react-email.**

**Recommendation: do NOT add react-email.** For 2 low-volume internal/transactional
templates, replicate its conventions in a ~60-line helper. Reasons: avoids ~20
`@react-email/*` subpackages; no preview-server toolchain needed for owner emails; the
existing alert payloads are already typed. Revisit react-email only if customer-facing
template volume grows (the 5-email welcome flow + future drip).

```ts
// apps/web/lib/email/render.ts — tiny react-email-convention replica [NO DEP]
export interface EmailResult { html: string; text: string; subject: string; }
// conventions borrowed from react-email: table layout, inline styles, hidden
// preview-text span, padded <a> buttons, plain-text twin, color-scheme meta.
export function renderEmail(opts: {
  subject: string; preview: string;
  blocks: EmailBlock[];        // typed: heading | text | button | metricRow | hr
}): EmailResult { /* template literals -> {html, text} */ }

// apps/web/lib/email/send.ts — provider adapter behind an interface (swap Resend/
// Postmark/SES later; welcome-flow.md already names these as targets). Reads
// EMAIL_* env vars; never logs recipient PII; no-op + console in dev like track().
export interface EmailSender { send(to: string, r: EmailResult): Promise<void>; }
```

```ts
// apps/web/lib/email/templates/owner-alert.ts — consumes JarvisAlert[] [REUSE]
export function ownerAlertEmail(alerts: JarvisAlert[]): EmailResult; // page>warn>info
// apps/web/lib/email/templates/weekly-brief.ts — consumes DailyBrief* [REUSE]
export function weeklyBriefEmail(brief: DailyBriefView): EmailResult;
```

No migration: `JarvisAlert` and `DailyBrief*` already exist. The owner-alert template
is fed by `alertsFromDiff()`; the weekly brief by the brief models. A worker triggers
sends. All copy passes `scanForBannedPhrases()` before send.

### 4.4 Conversion Objection Capture — "Why didn't you subscribe / why cancel?"
**Exists:** `cancellation_start` + `cancellation_reason_submit` event names; Stripe
portal. **Net-new:** capture UI + reuse `FeedbackSubmission` (`kind=CANCEL_OBJECTION` /
`PRICING_HESITATION`). **No extra migration** (shares §4.1 model). **[NO DEP]**

Borrows formbricks churn template: predefined objection options + optional open text,
triggered by intercepting the **"Manage / Cancel subscription"** click *before* the
Stripe portal redirect (non-blocking — user can skip straight through).

```ts
// objection options (predefined, formbricks-derived) — kept in code, reviewable
export const CANCEL_OBJECTIONS = [
  "too_expensive", "not_enough_value_yet", "picks_not_live_yet",
  "didnt_trust_the_numbers", "found_alternative", "just_browsing", "other",
] as const;
// Pre-subscribe variant ("what would make you trust this?") -> TRUST_BLOCKER kind,
// optionally triggered from a pricing-page exit-intent / friction pricing_hesitation.
```

Compliance note: pre-subscribe objection prompts must not imply a guarantee or pressure
("risk-free", "can't lose" are banned) — `scanForBannedPhrases()` guards the option
copy. Never block the cancel path (consumer-protection posture).

### 4.5 Public Trust Microcopy data model
**Exists:** `apps/web/lib/trust-claims.ts` is already the authoritative typed registry.
**Net-new:** OPTIONAL — extend the module with two governed fields. **NO migration, NO
DB.** **[REUSE]**

Keep it a typed module (preserves the CI `scanForBannedPhrases()` gate and PR-review
auditability — both load-bearing for a compliance-sensitive launch). Proposed *typed*
extension only:

```ts
// extend TrustClaim in trust-claims.ts (no Prisma) [REUSE]
export interface TrustClaim {
  // …existing fields…
  readonly surface?: ("freshness" | "no_bet" | "responsible_gaming" | "footer")[];
  readonly responsibleGaming?: boolean; // tag the 1-800 line + risk disclosures
}
// New helper to centralize the scattered "as of"/"fresh" + No-Bet strings so they
// reference claim IDs instead of inlining copy in components (pick-card.tsx, etc.).
export function getFreshnessClaim(): TrustClaim;
export function getNoBetReasons(): readonly TrustClaim[]; // pull no-bet-gate copy into registry
```

This *consolidates* the currently-scattered freshness/No-Bet microcopy (today inlined
in `no-bet-gate.tsx` and ~10 components) under the existing governed registry —
net-new value without a database.

---

## 5. Pre-Launch vs Post-Launch Verdict (per capability)

Given a **no-fake-data, compliance-sensitive** launch:

1. **Launch Feedback Inbox — SAFE PRE-LAUNCH.** Highest leverage: turns the dead
   `mailto:` page into structured "what confused you / what would make you trust this"
   capture exactly when first users arrive. One model, one route, PII-screened,
   owner-facing only. No public numbers. **Build now.**
2. **Friction Event Tracker — SAFE PRE-LAUNCH (minimal slice).** Build the privacy-safe
   ingest + `route_view`/`cta_click`/`client_error`/`pricing_hesitation` now (reuse
   `track()`); **defer** rage/dead/u-turn detectors + any dashboard to post-launch when
   there's traffic to tune thresholds. Risk if rushed: noisy thresholds, privacy
   mistakes — so ship masked-by-default and conservative.
3. **Owner Alert + Weekly Brief emails — SAFE PRE-LAUNCH.** Owner-facing, low volume,
   reuses existing payloads. Use the plain-HTML helper (no dep). The owner-alert email
   is genuinely valuable for a solo operator at launch. Customer drip (welcome flow)
   can follow once a provider is chosen. **Build owner-alert now; brief next.**
4. **Conversion Objection Capture — DEFER UI, BUILD SCHEMA NOW.** The `FeedbackSubmission`
   model + objection constants are safe to land pre-launch; the *cancel-intercept UI*
   matters only once there are paying subscribers to cancel, so wire it post-launch.
   The *pre-subscribe* "trust blocker" prompt can ship with the Feedback Inbox.
5. **Public Trust Microcopy data model — SAFE PRE-LAUNCH, NO MIGRATION.** Extend
   `trust-claims.ts` (typed) and consolidate freshness/No-Bet strings. Do NOT move to
   DB. Pure upside for launch-day trust consistency and CI enforcement.

**Migrations required:** exactly **two** small, append-only-ish models —
`FeedbackSubmission` (serves Inbox + Objection) and `FrictionEvent`. **New
dependencies:** **none** (plain-HTML email helper instead of react-email; extend the
existing analytics stub instead of an analytics SDK; keep trust microcopy as a typed
module).

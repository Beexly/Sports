# Launch QA Cards — the trust gate (Deck LQ)

One card per audit finding from the launch-QA sweep (paywall audit · claims audit ·
preflight audit), severity-ordered inside each section. House discipline matches
`docs/data/KERNEL_SLOT_CARDS.md`: one artifact per card, fully self-contained spec
(the implementer never explores the repo — every shape, path, and line the card needs
is embedded), a deterministic verify command, idempotent/restartable, commit-on-pass.

## Routing summary (lanes per `docs/ops/FREE_WINDOW_BLITZ.md` §3)

| Class | Cards | Lane |
|---|---|---|
| **PUBLIC** | LQ8, LQ9, LQ10, LQ11, LQ12 (site copy + guard-scanner scripts — word lists and file walks, no proprietary content) | Any free endpoint, stealth/Ox fleet included |
| **INTERNAL** | LQ1–LQ7 (paywall/entitlement), LQ13–LQ15 (LLM output policy), LQ16–LQ18 (ops scripts) | No-training endpoints only — Grok/Hermes lanes. **Never stealth.** |
| **CROWN** | none (0 cards) | This deck touches no edge content. Keep it that way: no card may embed catalog entries, survivor status, covariate-bus design, or mining grids. A diff that drags any of that in is an automatic reject. |

**Dependency order within the deck** (everything not listed is parallel):

1. LQ2 → LQ3 (the fantasy rate-limited gate must exist before the lineup route uses it)
2. LQ8, LQ9, LQ10 (copy rewording) → LQ12 (the scanner that starts scanning those files)
3. LQ11 → LQ12 (LQ12's verify runs LQ11's guard; land LQ11 first to avoid churn)
4. LQ1, LQ16, LQ17 → LQ18 (launch-night script asserts their outcomes)

**PR interaction:** PRs #555/#556/#557 (grok/h0-*) touch only
`packages/prediction-engine/src/edge-lab/**` + the prediction-engine barrel. Zero file
overlap with this deck; merge in any order.

## Standing constraints — stated by and binding on EVERY implementation card

- **priced:false** — nothing in this deck prices, publishes, ranks, or grades a pick.
- **Fail-closed on missing data** — an absent env / row / entitlement / migration always
  resolves to the FREE / deny / dark / 503 path, never a guess.
- **Nothing enters live p without masterplan §6 validation** — these cards touch gates,
  copy, and scanners; they never touch model probabilities.
- **No MODEL_VERSION change.**
- **Forbidden zones (any diff touching them = automatic reject):**
  `packages/db/prisma/` (schema + migrations), any `event-odds-ingest` write path,
  secrets / `.env` values, `vercel.json`.

Each card below carries the line
`Constraints: priced:false · fail-closed on missing data · no live-p without masterplan §6 · no MODEL_VERSION · forbidden: prisma schema, event-odds-ingest writes, secrets, vercel.json`
— it is not decoration; the cross-family verifier checks the diff against it.

**Gate (deterministic — a model's opinion is not a gate):** each card names its exact
verify command. **Cross-verify (different model family than the author):** run the
gate, then work the card's ATTACK list — each attack checked by a computation or a
grep, not by reading. A test that recomputes the implementation's own regex/logic and
compares is vacuous — reject it.

---

# Section A — Paywall / entitlement holes

**DATA CLASS: INTERNAL (all of Section A). Grok/Hermes only — no stealth endpoint.**
Server-side-only rule (CLAUDE.md #3): every gate in this section lives in the route or
loader, never in the client. Shared shapes, embedded once for the whole section:

- `Entitlements` (packages/types/src/index.ts:140-171): `{ tier: "FREE"|"FANTASY"|"PRO"|"ELITE", canSeePremiumPicks, canSeeConfidence, canSeeLineMovement, canSeeFactorBreakdown, canSeeEdgeScore (always true), canGetAlerts (ELITE only), dailyPickLimit (2 | null), canUseTrendLab, canUseParlayMri, canUseClvLedger (ELITE), canUseFantasyDraftSuite, canUseFantasyFull (any paid tier), canSeeMultiprob, canSeeNoBetDetail, canSeeGlassLedger, canSeeRecompute }` — derived purely from tier by `getEntitlements(tier)` (:173-211).
- `apps/web/lib/api-entitlement.ts`: `requirePremiumApi()` (PRO/ELITE only — FANTASY deliberately excluded at :37, fixing a real prior leak), `requirePremiumApiRateLimited(bucketId)` (:141-167 — gate strictly precedes the 120 req/60s per-user limiter), `requireFantasyApi()` (:180-185 — predicate `canUseFantasyFull`, message "This fantasy tool requires a Fantasy, Pro, or Elite subscription."). All: 401 anon, 403 under-tier, fail-closed to FREE on entitlement lookup error (:86-91). Denial helpers return a ready-to-send `NextResponse` or `null` when granted.
- `apps/web/lib/api/rate-limit.ts`: `consumeRateLimit(bucketId, key, max, windowMs): { ok, retryAfterSec }` (in-memory per-bucket), `clientIp(req: NextRequest)` (reads `x-vercel-forwarded-for` / `x-real-ip`, :100-106).

## LQ1 · dfs-salaries-gate  (paywall audit · MEDIUM — the one ungated paid-data route)
**DATA CLASS: INTERNAL.**
**Artifact:** `apps/web/app/api/dfs/salaries/route.ts` (+ update `apps/web/__tests__/dfs-salaries.test.ts`)
**Constraints:** priced:false · fail-closed on missing data · no live-p without masterplan §6 · no MODEL_VERSION · forbidden: prisma schema, event-odds-ingest writes, secrets, vercel.json
**Why:** the route is currently 9 lines with NO auth, NO entitlement check, NO limiter —
any anonymous curl gets the full reconciled DraftKings salary board sourced from PAID
providers (SportsDataIO/FantasyData, `apps/web/lib/dfs/salaries.ts:28-29`); the 30-min
cache is per-process, so cache-busting across cold serverless instances drains provider
quota (denial-of-wallet). `requireFantasyApi` was built for exactly this and has **zero
call sites in the repo**. Teaser stance (deliberate, document in a route comment): the
`/fantasy/dfs` page keeps its public teaser by SSR-ing `loadDfsSalaries()` directly and
rendering only `rows.slice(0, 24)` (`apps/web/app/fantasy/dfs/page.tsx:25-27`); the raw
JSON is the FULL board → paid fantasy floor.
**Current file (verbatim):**
```ts
import { NextResponse } from "next/server";
import { loadDfsSalaries } from "@/lib/dfs/salaries";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const data = await loadDfsSalaries();
  return NextResponse.json({ success: true, data });
}
```
**New file (verbatim):**
```ts
import { NextResponse } from "next/server";
import { requireFantasyApi } from "@/lib/api-entitlement";
import { loadDfsSalaries } from "@/lib/dfs/salaries";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  // Fantasy-suite data behind the fantasy floor (FANTASY | PRO | ELITE).
  // The /fantasy/dfs page keeps its deliberate public teaser by SSR-ing
  // loadDfsSalaries() directly and rendering only the top 24 rows; this raw
  // JSON is the FULL reconciled board from paid providers, so it is gated.
  // Gate BEFORE the load: an unentitled caller must never trigger provider
  // fetches (denial-of-wallet).
  const denied = await requireFantasyApi();
  if (denied) return denied;
  const data = await loadDfsSalaries();
  return NextResponse.json({ success: true, data });
}
```
**Test update:** `apps/web/__tests__/dfs-salaries.test.ts` currently ends (lines 92-100)
with a test that calls `mod.GET()` anonymously and expects 200. Replace that block using
the repo's canonical gate-mock pattern (`apps/web/__tests__/projections-route.test.ts:4,17,25-30`):
add at top `vi.mock("@/lib/api-entitlement", () => ({ requireFantasyApi: vi.fn() }));`
plus `import { requireFantasyApi } from "@/lib/api-entitlement";`, then three cases:
(1) mock resolves a 401 `NextResponse` → `GET()` returns status 401; (2) mock resolves a
403 → status 403; (3) mock resolves `null` → status 200, `body.success === true`,
`body.data.canPublishPicks === false` (preserving the existing assertion). Keep the
existing `vi.resetModules()` + dynamic-import style of that block.
**Verify:**
```
npm run test --workspace=apps/web -- __tests__/dfs-salaries.test.ts && npm run typecheck --workspace=apps/web
```
**Attacks:** gate placed AFTER `loadDfsSalaries` (wallet drain survives — verifier reads
the call order AND confirms the denial tests would catch a provider fetch); gated with
`requirePremiumApi` instead (locks out paying FANTASY subscribers — the inverse of the
:37 leak); tests mocking `auth` instead of the gate (tests nothing); 401-anon path
untested; `/players` page link `jsonHref: "/api/dfs/salaries"`
(`apps/web/lib/players/views.tsx:812`) — confirm it is a link, not an SSR fetch, so no
page breaks (it is; verify by grep, not assumption).

## LQ2 · fantasy-rate-limited-gate  (paywall audit · LOW — prerequisite for LQ3)
**DATA CLASS: INTERNAL.**
**Artifact:** `apps/web/lib/api-entitlement.ts` (+ extend `apps/web/__tests__/api-entitlement.test.ts`)
**Constraints:** priced:false · fail-closed on missing data · no live-p without masterplan §6 · no MODEL_VERSION · forbidden: prisma schema, event-odds-ingest writes, secrets, vercel.json
**Spec:** add one exported function mirroring `requirePremiumApiRateLimited`
(:141-167 — reuse `evaluateGate`, `consumeRateLimit`, `PREMIUM_ANALYTICS_RATE_MAX = 120`,
`PREMIUM_ANALYTICS_RATE_WINDOW_MS = 60_000`, the same 429 + `Retry-After` response),
with the fantasy predicate and message already used by `requireFantasyApi` (:180-185):
```ts
/**
 * Same fantasy (FANTASY|PRO|ELITE) floor as {@link requireFantasyApi}, plus the
 * per-user rate limit applied AFTER the entitlement gate — the gate strictly
 * precedes the limiter so the paywall is never masked by a 429. Mirrors
 * requirePremiumApiRateLimited exactly; only the predicate and message differ.
 */
export async function requireFantasyApiRateLimited(
  bucketId: string
): Promise<NextResponse | null> {
  const gate = await evaluateGate(
    (e) => e.canUseFantasyFull,
    "This fantasy tool requires a Fantasy, Pro, or Elite subscription."
  );
  if (gate.denied) return gate.denied;
  if (!gate.userId) return null;
  const limit = consumeRateLimit(
    bucketId,
    gate.userId,
    PREMIUM_ANALYTICS_RATE_MAX,
    PREMIUM_ANALYTICS_RATE_WINDOW_MS
  );
  if (!limit.ok) {
    return NextResponse.json(
      {
        success: false,
        error: "rate-limited",
        message: "Too many requests. Please wait a moment before trying again.",
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }
  return null;
}
```
**Tests:** append to `apps/web/__tests__/api-entitlement.test.ts`, following its existing
auth/entitlement mock harness (the file already exists and tests the sibling gates —
copy its mocking style, do not invent a new one). Mandatory cases: anonymous → 401;
FREE (`canUseFantasyFull:false`) → 403; FANTASY (`canUseFantasyFull:true`) → `null`;
121st call inside one window for the same user+bucket → 429 with `Retry-After` header;
two different `bucketId`s do NOT share a budget.
**Verify:**
```
npm run test --workspace=apps/web -- __tests__/api-entitlement.test.ts && npm run typecheck --workspace=apps/web
```
**Attacks:** predicate written as `tier !== "FREE"` or reusing `isPremium` (the first
regresses the exact FANTASY-leak class :37 fixed; the second 403s paying FANTASY —
must be `canUseFantasyFull`); limiter evaluated before the gate (a 429 masking the
paywall — assert denial precedes limiter by mock-call ordering); entitlement lookup
error failing OPEN (must resolve FREE → 403, per `evaluateGate` :86-91); bucket keyed
on IP instead of userId (paid users behind one NAT throttle each other).

## LQ3 · lineup-route-fantasy-floor  (paywall audit · LOW — depends LQ2)
**DATA CLASS: INTERNAL.**
**Artifact:** `apps/web/app/api/tools/lineup/route.ts` (+ update `apps/web/__tests__/lineup-route.test.ts`)
**Constraints:** priced:false · fail-closed on missing data · no live-p without masterplan §6 · no MODEL_VERSION · forbidden: prisma schema, event-odds-ingest writes, secrets, vercel.json
**Why:** the route gates on `requirePremiumApiRateLimited("tools/lineup")` (route.ts:6,13
— PRO/ELITE only), so a PAYING FANTASY subscriber is 403'd from the raw JSON behind the
fantasy-suite page that server-gates on `canUseFantasyFull`
(`apps/web/app/fantasy/lineup/page.tsx:22-25`). Fail-closed, so a mismatch not a leak —
but a paid feature 403-ing its own tier is a support fire.
**Spec:** swap the import and call at route.ts:6/:13 to
`requireFantasyApiRateLimited("tools/lineup")` (from LQ2). Nothing else changes — same
bucketId, same denial semantics. PRO/ELITE keep access (`canUseFantasyFull` is true for
every paid tier); the change only ADDS FANTASY. **Scope guard:** do NOT touch
`/api/projections` or `/api/scoring/player-index` — they also serve Pro analytics
surfaces and their floor is an open product decision (logged in this deck's open
questions); this card is the lineup route only.
**Test update:** `apps/web/__tests__/lineup-route.test.ts` mocks the old gate — switch
the `vi.mock` and import to `requireFantasyApiRateLimited`, keep the denial/grant cases,
and add an assertion that the gate is called with bucket `"tools/lineup"`.
**Verify:**
```
npm run test --workspace=apps/web -- __tests__/lineup-route.test.ts && npm run typecheck --workspace=apps/web
```
**Attacks:** swapped to un-rate-limited `requireFantasyApi` (loses the 120/min cap on an
expensive compute); floor accidentally widened to FREE (predicate must be
`canUseFantasyFull`, not `canUseFantasyDraftSuite`-adjacent guesswork — both are
paid-only today, but the card pins the canonical one); the test still mocking the OLD
gate name and passing vacuously while the route imports the new one — verifier greps
the route's actual import line; projections/player-index touched (scope violation).

## LQ4 · board-confidence-redaction-centralize  (paywall audit · LOW)
**DATA CLASS: INTERNAL.**
**Artifact:** `apps/web/lib/board/state.ts` (+ extend `apps/web/__tests__/board-state-confidence-gate.test.ts`)
**Constraints:** priced:false · fail-closed on missing data · no live-p without masterplan §6 · no MODEL_VERSION · forbidden: prisma schema, event-odds-ingest writes, secrets, vercel.json
**Why:** asymmetric redaction. `rankingP`/`rankingSource` are nulled INSIDE
`loadBoardState` for non-premium viewers (state.ts:108-113, GSE-SEC-026), but
`confidence` stays populated in the returned payload (rows built at :324 and :403) and
relies on every caller remembering `redactBoardConfidence` — today only
`app/api/board/state/route.ts:36` calls it. Any other caller of `loadBoardState` that
forgets ships PRO confidence to FREE/anon viewers. Known callers (embedded so you never
search): `app/board/page.tsx`, `app/page.tsx`, `app/house/page.tsx`,
`app/api/board/state/route.ts`, `lib/slate-twin/get-slate-twin.ts`,
`lib/calibration/report.ts`, `lib/gsn/build-transmission.ts`, `lib/gsn/transmission.ts`.
**Spec (wrapper pattern — covers every return path incl. demo/stale early returns):**
1. Rename the existing `export async function loadBoardState(now = new Date(), entitlements?: Entitlements)` (state.ts:194-197) to module-private `async function loadBoardStateInner(...)` (same body, unexported).
2. Add a pure, exported seam plus the new wrapper:
```ts
/** Viewer-facing redaction: confidence is PRO+ (canSeeConfidence). Mirrors the
 *  rankingP pattern (GSE-SEC-026): redact inside the loader so no caller can
 *  forget. Entitlement-less/internal callers already receive rankingP nulled;
 *  confidence now follows the same rule. */
export function applyViewerRedaction(
  payload: BoardStatePayload,
  entitlements?: Entitlements,
): BoardStatePayload {
  return entitlements?.canSeeConfidence === true ? payload : redactBoardConfidence(payload);
}

export async function loadBoardState(
  now = new Date(),
  entitlements?: Entitlements,
): Promise<BoardStatePayload> {
  return applyViewerRedaction(await loadBoardStateInner(now, entitlements), entitlements);
}
```
3. Keep `redactBoardConfidence` exported and UNCHANGED (state.ts:78-80 — copies rows,
   nulls confidence, no mutation; it is idempotent, so the API route's existing call
   becomes a harmless no-op — leave the route alone, belt-and-suspenders).
4. Zero signature change → all listed callers keep compiling.
**Abort rule:** if any listed lib consumer's test suite reddens because it COMPUTED on
`row.confidence` (not display), STOP — do not add an unredacted bypass flag on your own;
downgrade this card to a research note in the PR and leave the code untouched. (The
rankingP precedent says they won't: entitlement-less callers have lived with redacted
rankingP since GSE-SEC-026.)
**Tests:** append to `apps/web/__tests__/board-state-confidence-gate.test.ts` (its `row`/
`payload` fixtures at :28-78 are reusable): `applyViewerRedaction(payload, undefined)`
nulls confidence in all three lanes (scoringNow/publishedToday/gatedTodayRows);
`applyViewerRedaction(payload, getEntitlements("FREE"))` nulls;
`applyViewerRedaction(payload, getEntitlements("PRO"))` leaves confidence intact;
non-mutation of the input. `getEntitlements` comes from `@sports/types`.
**Verify:**
```
npm run test --workspace=apps/web -- __tests__/board-state-confidence-gate.test.ts __tests__/board-stale-kill-switch.test.ts && npm run typecheck --workspace=apps/web
```
**Attacks:** redaction applied on the happy path only (the wrapper must sit OUTSIDE
`loadBoardStateInner` so demo/stale/early returns are covered — verifier reads the
single return statement); condition written truthy (`entitlements?.canSeeConfidence`)
instead of `=== true` (equivalent today; the card pins `=== true` for defense — check
it); caller payload mutated (the retained non-mutation test must still pass); homepage
diff — if `app/page.tsx` was previously rendering numeric confidence to anonymous
viewers, this card silently fixed a live leak: verifier renders/inspects and NOTES it
in the PR either way.

## LQ5 · picks-page-free-literal  (paywall audit · LOW)
**DATA CLASS: INTERNAL.**
**Artifact:** `apps/web/app/picks/page.tsx`
**Constraints:** priced:false · fail-closed on missing data · no live-p without masterplan §6 · no MODEL_VERSION · forbidden: prisma schema, event-odds-ingest writes, secrets, vercel.json
**Why:** lines 150-161 hand-roll an anonymous FREE entitlements object literal — the
exact drift anti-pattern the sibling API route documents at
`app/api/picks/route.ts:63-65` ("never re-inline it"; the two FREE definitions drifted
before). Display-only today (the API enforces server-side), but a changed FREE
entitlement silently desyncs the teaser banner from enforcement.
**Current code (verbatim, :150-161):**
```ts
  const entitlements = session?.user?.id
    ? await getUserEntitlements(session.user.id)
    : {
        tier: "FREE" as const,
        canSeePremiumPicks: false,
        canSeeConfidence: false,
        canSeeLineMovement: false,
        canSeeFactorBreakdown: false,
        canSeeEdgeScore: true,
        canGetAlerts: false,
        dailyPickLimit: 2 as number | null,
      };
```
**New code:**
```ts
  const entitlements = session?.user?.id
    ? await getUserEntitlements(session.user.id)
    : getEntitlements("FREE");
```
plus `import { getEntitlements } from "@sports/types";` (merge into an existing
`@sports/types` import if the file already has one — check the import block, nothing
else). The canonical object is a strict superset of the 8-field literal (17 fields,
`packages/types/src/index.ts:173-211`), so every downstream read keeps working;
typecheck proves it.
**Verify:**
```
npm run typecheck --workspace=apps/web && grep -q 'getEntitlements("FREE")' apps/web/app/picks/page.tsx && ! grep -n 'dailyPickLimit: 2 as number | null' apps/web/app/picks/page.tsx && ! grep -c 'canSeePremiumPicks: false' apps/web/app/picks/page.tsx
```
**Attacks:** replaced with `getUserEntitlements("FREE")` (the DB resolver — wrong
function, wrong semantics); a SECOND inlined literal elsewhere in the file (grep the
whole file for `canSeePremiumPicks:` — the verify does); behavior drift — the literal
and `getEntitlements("FREE")` agree on all 8 fields today (compare against the embedded
:173-211 source, field by field, not by trust).

## LQ6 · board-passes-rate-limit  (paywall audit · LOW — abuse/cost vector, no data leak)
**DATA CLASS: INTERNAL.**
**Artifact:** `apps/web/app/api/board/passes/route.ts` (+ new `apps/web/__tests__/board-passes-rate-limit.test.ts`)
**Constraints:** priced:false · fail-closed on missing data · no live-p without masterplan §6 · no MODEL_VERSION · forbidden: prisma schema, event-odds-ingest writes, secrets, vercel.json
**Why:** public DB-heavy route (gateDecision `findMany take:100` + fallback game scans
per hit) with no limiter; siblings `/api/board/state`, `/api/picks`, `/api/daily-slate`
all carry IP-keyed limits. Data policy is already fail-closed (`includeNoBetDetail`
defaults false; detail omitted at `lib/board/passes.ts:85,144`) — this card changes
COST, not payload.
**Current file (verbatim):**
```ts
import { NextResponse } from "next/server";
import { loadBoardPasses } from "@/lib/board/passes";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const payload = await loadBoardPasses();
  return NextResponse.json({ success: true, ...payload });
}
```
**New file (verbatim — the preamble is copied from `app/api/board/state/route.ts:13-19`):**
```ts
import { NextRequest, NextResponse } from "next/server";
import { loadBoardPasses } from "@/lib/board/passes";
import { consumeRateLimit, clientIp } from "@/lib/api/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Public, anonymous, DB-heavy route — same IP-keyed limiter as its sibling
  // /api/board/state (60 req/min per IP). Cost control only; the payload
  // itself stays fail-closed in lib/board/passes.ts.
  const limit = consumeRateLimit("public-board-passes", clientIp(req), 60, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please wait and try again.", code: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }
  const payload = await loadBoardPasses();
  return NextResponse.json({ success: true, ...payload });
}
```
**Test (new file):** mock `@/lib/board/passes` (`loadBoardPasses: vi.fn()` resolving a
minimal `{ passes: [] }`-shaped object — match whatever `loadBoardPasses`'s return type
requires to satisfy the spread). Build requests as
`new Request("http://localhost/api/board/passes", { headers: { "x-real-ip": IP } })`
cast the way `board-state-confidence-gate.test.ts:90-91` casts. Cases: 60 calls from
IP "203.0.113.7" all 200; the 61st → 429 with a `Retry-After` header AND
`loadBoardPasses` NOT called on the 429; a different IP "203.0.113.8" still 200. The
in-memory limiter persists across tests in one file — use distinct IPs per case.
**Verify:**
```
npm run test --workspace=apps/web -- __tests__/board-passes-rate-limit.test.ts && npm run typecheck --workspace=apps/web
```
**Attacks:** limiter keyed on a constant (one global bucket = self-inflicted public
outage at 60 req/min total — verifier confirms `clientIp(req)` is the key); bucketId
reused from board/state (`"public-board-state"` would share the budget — must be
`"public-board-passes"`); `loadBoardPasses` awaited before the limiter check (order);
`Retry-After` header absent; the `GET(req)` signature breaking Next's route typing
(typecheck gate catches).

## LQ7 · stripe-webhook-serialization  (paywall audit · LOW — **RESEARCH card**)
**DATA CLASS: INTERNAL.**
**Artifact:** `docs/ops/STRIPE_WEBHOOK_IDEMPOTENCY_DECISION.md` (doc only — **zero code diffs**)
**Constraints:** priced:false · fail-closed on missing data · no live-p without masterplan §6 · no MODEL_VERSION · forbidden: prisma schema, event-odds-ingest writes, secrets, vercel.json
**Why this is research, not implementation:** the idempotency window in
`apps/web/app/api/webhooks/stripe/route.ts` is real but every quick fix is worse or
forbidden. Current flow (embedded): `alreadyProcessed = db.webhookEvent.findUnique({ where: { stripeEventId } })`
(:77-82) runs BEFORE `handleStripeEvent(event)` (:85) and the record is created only
AFTER (:97-103), so two concurrent deliveries of one event both execute handlers; the
P2002 catch (:105-107, `isStripeEventIdConflict` :117-125) acks the duplicate.
Safety today rests on every handler being individually idempotent (they re-retrieve
current Stripe state — convergent by convention, not structure). The obvious fixes:
(a) insert-first with a status column → **needs a prisma migration = forbidden zone for
this deck** (and founder-applied besides); (b) insert-first WITHOUT a status column →
creates a LOST-EVENT window (row committed, handler crashed, Stripe retry acked as
duplicate → entitlement lost — strictly worse than today's benign double-execution);
(c) pg advisory locks → unsafe by default under pooled serverless Postgres
(transaction-mode pooling breaks session-level locks).
**Deliverable:** the doc, with EXACTLY these six `##` sections:
`## Current window` (restate the flow above with line refs) ·
`## Option A — status-column insert-first` (schema migration required; founder-applied; sketch the column + state machine) ·
`## Option B — pg advisory lock` (analyze the ACTUAL prod pooling mode from the DATABASE_URL shape/provider docs — describe the mode, NEVER paste the URL or any credential) ·
`## Option C — accept convention` (document the handler-idempotency invariant + specify a test that enforces "every handler re-retrieves Stripe state before writing") ·
`## Recommendation` (defaults to C for launch — no code churn on the money path in launch week — unless A or B is proven safe) ·
`## Follow-up card spec` (a complete card, this deck's format, for the chosen option).
**Verify:**
```
test -f docs/ops/STRIPE_WEBHOOK_IDEMPOTENCY_DECISION.md && test "$(grep -c '^## ' docs/ops/STRIPE_WEBHOOK_IDEMPOTENCY_DECISION.md)" -eq 6 && git diff --name-only HEAD~1 | grep -qv '^apps/web/app/api/webhooks/'
```
**Attacks:** any code diff riding along (must be doc-only — check `git show --stat`);
a recommendation of (b) delete-row-on-failure (the lost-event window above — reject on
sight); an advisory-lock recommendation with no named pooling-mode evidence; a schema
recommendation that pretends this deck can apply it (forbidden zone — it can only be
SPECIFIED for the founder); secrets/URLs pasted into the doc.

---

# Section B — Unsupported-claims copy fixes + guard-coverage extensions

Ordered by dependency (copy first, scanners second) — the scanner cards' verify runs
over the reworded files; landing them in the other order reddens CI. Severity noted per
card. Shared context, embedded once: the two static guards are
`scripts/guardrails/no-unsupported-performance-claims.mjs` (`npm run guard:performance-claims`)
and `scripts/guardrails/commercial-copy-scan.mjs` (`npm run guard:commercial-copy`);
both run in the aggregate `npm run guardrails`. Both currently sweep ONLY
`RENDERED_BASENAMES` (`page/layout/template/error/not-found/loading/opengraph-image.tsx`)
under `apps/web/app` (excluding `api/admin/cockpit`) plus their deep-scan `SCAN_TARGETS`
dirs — `apps/web/components/**`, `workers/**`, and text-serving `route.ts` endpoints are
invisible to both.

## LQ8 · humans-txt-honest-standards  (claims audit · MEDIUM)
**DATA CLASS: PUBLIC.**
**Artifact:** `apps/web/app/humans.txt/route.ts`
**Constraints:** priced:false · fail-closed on missing data · no live-p without masterplan §6 · no MODEL_VERSION · forbidden: prisma schema, event-odds-ingest writes, secrets, vercel.json
**Why:** line 15 of the served body ships
`Standards: publish-before-kickoff · CLV-backed proof · honesty gates` — "CLV-backed
proof" reads as an ACHIEVED-proof claim ahead of the ESTABLISHED milestone (verified
CLV ≥ 52.4%). The standard must describe the mechanism, not an outcome.
**Spec:** in the `BODY` template literal, change exactly that one line to:
```
Standards: publish-before-kickoff · CLV-audited, gate-until-defensible record · honesty gates
```
Nothing else changes — the route stays `force-static`, same headers, same TEAM/THANKS
blocks.
**Verify:**
```
! grep -n 'CLV-backed proof' apps/web/app/humans.txt/route.ts && grep -q 'gate-until-defensible' apps/web/app/humans.txt/route.ts && npm run typecheck --workspace=apps/web
```
**Attacks:** a reword that still claims an outcome ("CLV-verified", "proven CLV" — same
crime, new spelling); collateral edits to Contact/Doctrine/Stack lines (out of scope);
`force-static` or the Cache-Control header dropped.

## LQ9 · evidence-vocab-copy  (claims audit · LOW)
**DATA CLASS: PUBLIC.**
**Artifact:** one copy deliverable across exactly three files — `apps/web/app/faq/page.tsx`, `apps/web/app/about/page.tsx`, `apps/web/app/trends/page.tsx` (no other file)
**Constraints:** priced:false · fail-closed on missing data · no live-p without masterplan §6 · no MODEL_VERSION · forbidden: prisma schema, event-odds-ingest writes, secrets, vercel.json
**Why:** pre-PROVEN (< 100 canonical settled + published calibration), "verified record"
and unconditional "calibrated" are claims-adjacent on phrase-unscanned public routes.
LQ12 will start deep-scanning these dirs with the `EVIDENCE_REQUIRED` list
(`win rate / roi / profit / profitable / verified / proven / calibrated / beats market /
closing line value / clv / positive expected value / +ev`, line-wide safe-context words:
`no not never without requires required must evidence unsupported fabricated fake avoid
blocked cannot can't do not dont unless before policy rule scanner guardrail claim
governance`) — this card makes that scan green by making the copy honest first.
**Exact replacements (current → new):**
- faq:43 `the open verified record` → `the public, verifiable record`
- faq:43 `publishes a calibrated signal` → `publishes each signal with the work shown`
- faq:89 `the open verified record` → `the public, verifiable record`
- faq:93 `with the calibrated confidence rating and full factor trail` → `with the confidence rating and full factor trail` (the calibration claim returns when the published calibration report exists — the PROVEN milestone; keep the `${phase.pro.monthly}` template string intact)
- about:24 `and the calibrated confidence the model assigned` → `and the confidence the model assigned — calibration is measured against settled results, never assumed`
- about:63 `publishes a calibrated, fully-reasoned signal` → `publishes a fully-reasoned signal`
- trends:76 `the public verified record` → `the public, verifiable record`
**Residual rule (these three files ONLY):** any other `verified/calibrated/proven`
occurrence must either (a) carry a negation/policy word on the same source line
(`no/not/never/before/unless/must/requires`) or (b) be replaced with mechanism words
(`verifiable`, `calibration-checked`, `gate-until-defensible`). Lines that already carry
negation stay untouched — faq:68 ("Not a probability…"), faq:72 ("not a promise"),
about:30 ("No certainty theater. No guarantees.") are correct as-is.
**Verify:**
```
! grep -rn 'open verified record\|public verified record' apps/web/app/faq apps/web/app/trends && ! grep -n 'calibrated confidence the model assigned' apps/web/app/about/page.tsx && npm run test:brand-safety && npm run guard:performance-claims && npm run guard:commercial-copy
```
**Attacks:** "verifiable" regressed to "verified" anywhere in the three files (grep);
a reword that deletes the honesty CONTENT (each sentence must still say the record is
public and losses stay published — read the before/after meaning, not just the diff);
edits leaking into pricing/methodology/other pages (`git diff --name-only` = exactly
these three files); the faq:93 price template string broken.

## LQ10 · elite-alert-copy-alignment  (product recon gap — the unbacked "real-time" claim)
**DATA CLASS: PUBLIC.**
**Artifact:** one copy deliverable across exactly these files — `apps/web/app/pricing/page.tsx` (:67, :90, :95, :117, :164, :182, :457), `apps/web/app/picks/page.tsx` (:567), `apps/web/app/dashboard/page.tsx` (:289), `apps/web/app/watchlist/page.tsx` (:18, :214), `apps/web/app/stats/injuries/page.tsx` (:70), `apps/web/lib/pricing/value-architecture.ts` (:125), `apps/web/lib/pricing/feature-gates.ts` (:178), `apps/web/components/push/push-alert-opt-in.tsx` (:40)
**Constraints:** priced:false · fail-closed on missing data · no live-p without masterplan §6 · no MODEL_VERSION · forbidden: prisma schema, event-odds-ingest writes, secrets, vercel.json
**Ground truth (embedded — the copy must match THIS, nothing rosier):** the ONLY live
alert path is settlement-graded watchlist alerts: hourly `settle-picks` (:20 past the
hour) drains the settlement outbox inline, plus a 3-hourly cron sweep
(`deliver-settlement-alerts`). Worst-case latency is hours. There are NO new-pick,
line-move, or pregame alerts. Alerts fire only for FOLLOWED teams/players (watchlist),
only on settled results. "Real-time" is therefore false twice over; "on every signal"
is false a third way.
**Replacement vocabulary (apply per site; keep each surface's sentence shape):**
- `Real-time email + push alerts on every signal` (pricing:95) → `Email + push alerts when a pick you follow settles`
- `Real-time alerts (Elite)` (pricing:67/:90/:117) → `Graded-pick alerts (Elite)`
- pricing:164 `…plus real-time alerts and a line-value tracker…` → `…plus graded-pick alerts and a line-value tracker…`
- pricing:182 `Real-time alerts` → `Graded-pick alerts`; pricing:457 label likewise
- picks:567 `Want real-time email and push alerts on every signal?` → `Want email + push alerts when your followed picks grade?`
- dashboard:289 `Real-time email and push alerts are included with Elite.` → `Email and push alerts on your followed picks — delivered when they grade — are included with Elite.`
- watchlist:18/:214 keep the honest half it already has ("…when a followed pick grades — never before, only on the settled result") and drop the words `real-time` from both
- stats/injuries:70 `Real-time email & push delivery is an Elite feature…` → `Graded-alert email & push delivery is an Elite feature…`
- value-architecture:125 `real-time email and push the moment a signal posts` (flatly false) → `email and push when a followed pick grades — the alert carries the settled result, never a prediction`
- feature-gates:178 `Elite adds real-time graded alerts` → `Elite adds graded-pick alerts`
- push-alert-opt-in:40 `…to get real-time push alerts` → `…to get push alerts when your followed picks grade`
**Scope guards:** internal comments in `apps/web/lib/watchlist/*.ts` that QUOTE the
CLAUDE.md tier table are comments, not copy — leave them. CLAUDE.md's own tier table is
owner-editable doc (see OWNER-ACTION #10). Banned replacement words (same lie, new
word): `instant`, `live alerts`, `the moment`, `immediately`.
**Verify:**
```
! grep -rni 'real-time' apps/web/app/pricing/page.tsx apps/web/app/picks/page.tsx apps/web/app/dashboard/page.tsx apps/web/app/watchlist/page.tsx apps/web/app/stats/injuries/page.tsx apps/web/lib/pricing/value-architecture.ts apps/web/lib/pricing/feature-gates.ts apps/web/components/push/push-alert-opt-in.tsx && npm run typecheck --workspace=apps/web && npm run test:brand-safety && npm run guard:commercial-copy
```
**Attacks:** pricing fixed but the picks:567 CTA left (doubly false: not real-time AND
not every signal); a banned replacement word used (grep the eight files for
`instant|the moment|immediately`); copy weakened BELOW truth ("daily digest" — wrong,
delivery is per-settlement); the feature-gates `customerExplanation` string broken as
data (it renders on /pricing — typecheck + brand-safety must stay green); the watchlist
page's honest clause deleted instead of trimmed.

## LQ11 · numeric-guard-hardening  (claims audit · HIGH — the proven SAFE_CONTEXT bypass)
**DATA CLASS: PUBLIC.**
**Artifact:** `scripts/guardrails/no-unsupported-performance-claims.mjs` (+ new `scripts/guardrails/no-unsupported-performance-claims.test.mjs`, `node --test`, following the repo convention of `scripts/guardrails/ai-transport-import-boundary.test.mjs`)
**Constraints:** priced:false · fail-closed on missing data · no live-p without masterplan §6 · no MODEL_VERSION · forbidden: prisma schema, event-odds-ingest writes, secrets, vercel.json
**The bug (verified by execution):** the numeric pass applies the line-wide
`SAFE_CONTEXT` (lines 92-93) at :179/:185, and that exemption list includes the
evidence vocabulary `settled | sample | window | threshold | model version` — so a
fabricated stat phrased the way a tout would phrase it sails through:
`"68% win rate across 500 settled picks"` and `"71% hit rate in our launch window"`
both match `NUMERIC_CLAIM_PATTERNS` AND get exempted; `"68% win rate this season"` is
caught. The commercial guard's rationale ("a real claim also trips the hardcoded-numeric
gate", commercial-copy-scan.mjs:251) rests on this porous gate.
**Spec (four parts, one file + one test file):**
1. **Export-for-test refactor:** export `scanLine`, `scanNumericClaimLine`, and the new
   `numericSafeContextNear`; guard the entry point with
   `const isMain = import.meta.url === pathToFileURL(process.argv[1] ?? "").href;`
   (`import { pathToFileURL } from "node:url";`) and run `main().catch(...)` only
   `if (isMain)`. `npm run guard:performance-claims` must behave exactly as before.
2. **Numeric-pass exemption list:** add (do NOT touch `SAFE_CONTEXT` — the word-list
   CLAIMS pass at :159/:164 keeps its documented line-wide behavior):
```js
// Numeric pass exemption: SAFE_CONTEXT minus the evidence vocabulary
// (settled/sample/window/threshold/model version) — those are evidence
// NOUNS a tout can borrow, not negations. Clause-scoped, never line-wide.
const NUMERIC_SAFE_CONTEXT =
  /\b(no|not|never|without|requires?|required|must|evidence|unsupported|fabricated|fake|avoid|block(?:ed|s)?|cannot|can't|do not|dont|unless|before|policy|rule|scanner|guardrail|claim governance|public-claim approval)\b/i;
```
3. **Clause-scope it:** port `safeContextNear` from `commercial-copy-scan.mjs:106-123`
   verbatim as `numericSafeContextNear` (constants `SAFE_WINDOW_BEFORE = 60`,
   `SAFE_WINDOW_AFTER = 24`, `CLAUSE_BOUNDARY = /[.!?;—]/`), testing
   `NUMERIC_SAFE_CONTEXT` on the clause. In `scanNumericClaimLine`, replace both
   line-wide tests (:179 inline, :185 pair view) with `const m = pattern.exec(subj)`
   → hit iff `m && !numericSafeContextNear(subj, m.index, m[0].length)`. Keep the
   cross-line pair path working.
4. **Numeric-sweep coverage** (the parts of claims findings 2/5/7 that belong to the
   NUMERIC pass): after the existing rendered-surface sweep, walk each of
```js
const NUMERIC_EXTRA_ROOTS = [
  "apps/web/components",
  "workers",
  "apps/web/lib/twitter-bot",
  "apps/web/lib/discord-bot",
  "apps/web/lib/bot-outbox",
  "apps/web/lib/proof",
  "apps/web/app/humans.txt",
  "apps/web/app/llms.txt",
  "apps/web/app/ai.txt",
];
```
   with the existing `walk()` (missing dirs already skip via its try/catch; `SKIP_DIRS`
   already excludes `__tests__`), de-dupe against files already scanned, and run
   `scanNumericClaimLine` over each.
**Test file (fixtures are literal strings — independent of the implementation):**
must-FAIL: `"68% win rate across 500 settled picks"`, `"71% hit rate in our launch window"`,
`"68% win rate this season"`, `"60%+ win rate"`, and the clause-boundary case
`"This is not hype. 68% win rate, easy money."` (the `not` sits on the far side of the
period). must-PASS: `"no public win rate is shown before 100 settled picks"` (negation
in-clause), `"95% CP 52.1-68.3%"`, `"15% off your first month"`,
`"Threshold: sample window of 500 settled picks"` (no performance keyword follows a
number).
**Verify:**
```
node --test scripts/guardrails/no-unsupported-performance-claims.test.mjs && npm run guard:performance-claims
```
The guard must stay green over the current tree (the claims audit's manual sweep found
rendered copy clean under broader patterns). If a NEW hit appears in the extra roots it
is a REAL finding: fix it in the same PR only if the file belongs to LQ8/LQ9/LQ10;
otherwise mark this card BLOCKED and report the hit verbatim in the PR body. **Never
widen the exemption list to get green.**
**Attacks:** exemption tightened but still line-wide (run the clause-boundary fixture —
it is the distinguishing case); evidence vocab quietly retained
(`grep -E 'settled|sample|window|threshold|model version' <(grep NUMERIC_SAFE_CONTEXT -A2 scripts/guardrails/no-unsupported-performance-claims.mjs)` must be empty);
vacuous tests that import the pattern list and re-run it on itself (fixtures must be
literal strings with hand-assigned verdicts); the export refactor breaking CLI mode
(run `npm run guard:performance-claims` AND `node --test` — both invocation paths);
the pair-view (cross-line) path dropped by the rewrite (add a split-line fixture:
`["68%", " win rate across 500 settled picks"]` must FAIL).

## LQ12 · commercial-copy-scan-coverage  (claims audit · HIGH — depends LQ8, LQ9, LQ10, LQ11)
**DATA CLASS: PUBLIC.**
**Artifact:** `scripts/guardrails/commercial-copy-scan.mjs` (+ new `scripts/guardrails/commercial-copy-scan.test.mjs`, `node --test`)
**Constraints:** priced:false · fail-closed on missing data · no live-p without masterplan §6 · no MODEL_VERSION · forbidden: prisma schema, event-odds-ingest writes, secrets, vercel.json
**Why:** the copy actually rendered on public pages lives in `apps/web/components/**`
(`components/pricing/pricing-plans.tsx`, `components/proof/proof-explorer.tsx`,
`components/performance/*`, `components/fantasy/props-edge.tsx` with its "+EV" badge) —
currently clean by manual sweep, but a tout line added to any component tomorrow ships
unscanned. Same blind spots: `workers/**`, bot template dirs, text `route.ts` endpoints.
**Spec (three parts + a residual rule):**
1. **Deep-scan targets:** append to `SCAN_TARGETS` (current list at lines 16-32 ends
   with `"apps/web/lib/competitive"`): `"apps/web/components/pricing"`,
   `"apps/web/app/faq"`, `"apps/web/app/about"`, `"apps/web/app/trends"`. (The deep
   scan = `BANNED` window-scoped + `EVIDENCE_REQUIRED` line-wide via `scanLine`; /pricing
   is a deep-scan surface whose copy imports from components/pricing — the pages render
   those strings, they do not contain them.)
2. **Tout sweep extension:** after the rendered-surface sweep, walk each of
```js
const TOUT_EXTRA_ROOTS = [
  "apps/web/components",
  "workers",
  "apps/web/lib/twitter-bot",
  "apps/web/lib/discord-bot",
  "apps/web/lib/bot-outbox",
  "apps/web/app/humans.txt",
  "apps/web/app/llms.txt",
  "apps/web/app/ai.txt",
];
```
   with the existing `walk()` (`SOURCE_EXTS` already includes `.ts/.tsx/.js/.jsx/.md`;
   `SKIP_PARTS` already excludes `__tests__`; missing dirs skip silently), de-duped
   against `deepScanned`, running `scanToutLine` (the tout-USAGE patterns at :153-172 —
   safe over product vocabulary like "lock-time" and the grandfathered-pricing
   "guarantee", which is exactly why the sweep uses patterns, not the bare word list).
3. **Export-for-test + main guard:** same idiom as LQ11 (export `scanLine`,
   `scanToutLine`, `safeContextNear`; `isMain` gate on `main()`).
**Residual rule:** running the extended guard may redden on `components/pricing` — the
Elite "CLV/line-value ledger" line trips `EVIDENCE_REQUIRED:"clv"` if it lacks a safe
token. Fix the copy IN THE HIT FILE with mechanism framing, e.g.
`CLV ledger — logs your closing-line value on every entry so you can audit the timing; a record, not a promise`
(the `not` supplies line-wide safe context and the sentence is true). Any hit OUTSIDE
components/pricing and the LQ9/LQ10 files → mark the card BLOCKED, report the hit
verbatim in the PR body. **Never grow `SAFE_POLICY_CONTEXT` to get green.**
**Test file (literal fixtures):** must-FAIL via `scanToutLine`: a fake component line
`"Tonight's lock — hammer this before the window closes"`; a workers-style markdown line
`"Guaranteed winner inside."`. must-PASS: `"the Merkle root committed at lock"` (product
vocab — pattern, not word), `"Your founding rate is guaranteed for life"` (the tout
patterns only match `guaranteed win/winner/profit/cash/money/return`),
`"this is not a lock"` (window-scoped negation).
**Verify:**
```
node --test scripts/guardrails/commercial-copy-scan.test.mjs && npm run guard:commercial-copy && npm run guard:performance-claims
```
**Attacks:** components/pricing added to the tout sweep but NOT to `SCAN_TARGETS`
(the finding explicitly requires the deep scan there); components walked with
`walkRenderedSurfaces` (component files have arbitrary basenames — must use the full
`walk()`); faq/about/trends added while LQ9's rewording hasn't landed (dependency
violation — the guard reddens; check merge order, not intentions); fixtures that
re-run the guard's own regexes over the pattern source (vacuous); the residual-rule
copy fix drifting into new claims ("audited CLV proof" — outcome again).

## LQ13 · calibration-insight-grounding  (claims audit · MEDIUM)
**DATA CLASS: INTERNAL.**
**Artifact:** `apps/web/lib/calibration-training/claude.ts` (+ extend `apps/web/__tests__/calibration-insight-claude.test.ts`)
**Constraints:** priced:false · fail-closed on missing data · no live-p without masterplan §6 · no MODEL_VERSION · forbidden: prisma schema, event-odds-ingest writes, secrets, vercel.json
**Why:** `evaluateCalibrationInsightPolicy` (:169-216) checks length/CTA/banned
positioning but never runs the numeric guard, while the SYSTEM prompt
(`lib/calibration-training/insight-prompt.ts:20-27`) seeds concrete numeric examples
("12% overconfident", "rated at 65% hit at 72%") the model can echo against a DIFFERENT
user's data. The ungrounded sentence is persisted to
`UserCalibrationSnapshot.insightText` and shown to the user as a claim about their own
record — the exact fabricated-stat pattern the numeric guard was built for, and it is
already wired into blog (`lib/content-generator.ts:279-287`) and journal
(`lib/journal/claude.ts:19`). Mirror the blog wiring.
**Numeric-guard contract (embedded — `@/lib/claude-api/numeric-guard`):**
`extractNumericClaims(text)` pulls percent (`68%`), decimal (`3.5`), and record (`12-4`,
both sides) shaped numbers — bare integers are ignored (low false-positive by design);
`validateNumericClaims(text, { allowed: number[], tolerance? })` (default tolerance 0.1)
→ `{ grounded, claimCount, ungrounded }`.
**Spec (four diffs):**
1. Add `"UNGROUNDED_NUMERIC"` to the `CalibrationInsightPolicyReason` union (:40-48).
2. In `generateCalibrationWeeklyInsight`, hoist the prompt (currently built inline at
   :106): `const userPrompt = buildCalibrationInsightUserPrompt(input);` and pass
   `user: userPrompt` to `callClaude`.
3. Extend the policy signature:
   `evaluateCalibrationInsightPolicy(text: string, grounding?: { readonly promptText: string })`
   — AFTER all existing checks, before the final return:
```ts
  if (grounding) {
    const allowed = extractNumericClaims(grounding.promptText).map((c) => c.value);
    if (!validateNumericClaims(trimmed, { allowed }).grounded) {
      return { allowed: false, reason: "UNGROUNDED_NUMERIC" };
    }
  }
```
   with `import { extractNumericClaims, validateNumericClaims } from "@/lib/claude-api/numeric-guard";`.
4. Call site (:110): `evaluateCalibrationInsightPolicy(insightText, { promptText: userPrompt })`.
   The existing `!policy.allowed` branch already ledgers `POLICY_${policy.reason}`
   (:120) — `POLICY_UNGROUNDED_NUMERIC` flows through with zero extra work; verify it.
**Grounding nuance (embedded so the tests are right):** the user prompt emits
`estimated 62%, actual 55%` per band and pre-computed deltas via `toFixed(1)`
(`delta 12.0%`) — so "12% overconfident" is grounded (|12 − 12.0| ≤ 0.1), while a delta
the model DERIVES itself and the prompt never states is rejected. That is the same
tradeoff blog/journal already accepted.
**Tests to append (pure — no mocks needed for the policy fn):** with
`promptText: "MLB: OVER, delta 23.0% (sample 12)"` — `"You were 23% overconfident on MLB totals this week."`
allowed; `"You were 31% overconfident on MLB totals this week."` → reason
`UNGROUNDED_NUMERIC`; `"Your picks went 8-2 this week."` rejected unless the prompt
contains 8 and 2; single-arg legacy call unchanged (back-compat).
**Verify:**
```
npm run test --workspace=apps/web -- __tests__/calibration-insight-claude.test.ts && npm run typecheck --workspace=apps/web
```
**Attacks:** grounding sourced from the SYSTEM prompt (it CONTAINS the example stats
12/65/72 — that would whitelist the exact hallucination vector; the allowed set must
come from the USER prompt only — verifier reads the call site); validation run on
`result.text` instead of the normalized `insightText` (must validate exactly what is
persisted — `normalizeInsightText` runs first at :109); tolerance widened past 0.1;
the union member added but the call site never passing grounding (enforcement
theater — grep the call site).

## LQ14 · pick-explainer-grounding  (claims audit · MEDIUM)
**DATA CLASS: INTERNAL.**
**Artifact:** `apps/web/lib/pick-explainer/policy.ts` (+ one-line wiring in `apps/web/lib/pick-explainer/explain.ts`, + extend `apps/web/lib/pick-explainer/policy.test.ts`)
**Constraints:** priced:false · fail-closed on missing data · no live-p without masterplan §6 · no MODEL_VERSION · forbidden: prisma schema, event-odds-ingest writes, secrets, vercel.json
**Why:** `evaluatePickExplanationPolicy` (:77-90) enforces citation-present +
certainty/advice/EV/competitor bans, but a hallucinated stat ("they are 8-2 in their
last 10") passes as long as it carries the citation token and avoids the banned
families. The grounded context already exists and is the ONLY data the model sees
(`explain.ts:67` — `const grounded = buildGroundedContext(options.grounding)`;
grounding.ts docstring: "the model can only describe what the engine actually used").
**Spec:**
1. Union (:47-54) += `"UNGROUNDED_NUMERIC"`.
2. Signature: `evaluatePickExplanationPolicy(text: string, groundingText?: string)` —
   after the existing checks:
```ts
  if (groundingText !== undefined) {
    const allowed = extractNumericClaims(groundingText).map((c) => c.value);
    if (!validateNumericClaims(trimmed, { allowed }).grounded) failures.push("UNGROUNDED_NUMERIC");
  }
```
   `import { extractNumericClaims, validateNumericClaims } from "@/lib/claude-api/numeric-guard";`
   (numeric-guard contract as embedded in LQ13). `detectBannedLanguage` (:65-72, reused
   by the loss-autopsy drafter) is untouched — the new param is optional, so no call
   site anywhere breaks.
3. Wiring, `explain.ts:134`: `const failures = evaluatePickExplanationPolicy(result.text, grounded.context);`
   — grounding comes from `grounded.context` and NOTHING else. In particular the user's
   `options.question` must NOT enter the allowed set (a user could ask "is the 68% win
   rate real?" to whitelist 68%). The existing failure branch ledgers
   `POLICY_${failures[0]}` (:142) — no extra wiring needed.
**Citation-timestamp nuance (embedded):** `CITATION_PATTERN` (:44-45) forces an ISO
timestamp into every answer; `extractNumericClaims` sees `08-22` in
`2026-08-22T15:00:00Z` as record claims 8 and 22 — those are grounded automatically
because the answer copies its citation timestamp from the context, which contains the
same ISO strings. The tests below include a realistic citation to prove no false
positive.
**Tests to extend (`lib/pick-explainer/policy.test.ts`):** with groundingText
`"line 3.5 · confidence 74 · captured 2026-08-22T15:00:00Z"` —
(a) `"The 3.5-point line held. (source: signal_snapshot at 2026-08-22T15:00:00Z)"` → no
`UNGROUNDED_NUMERIC`; (b) same sentence + `" They are 8-2 in their last 10."` (the
audit's exact example) → includes `UNGROUNDED_NUMERIC`; (c) answers with only bare
integers pass; (d) single-arg legacy call = today's behavior.
**Verify:**
```
npm run test --workspace=apps/web -- lib/pick-explainer && npm run typecheck --workspace=apps/web
```
**Attacks:** wiring passes `buildExplainUser(...)` output as grounding (it contains the
user QUESTION — the whitelist-injection above; must be `grounded.context`); the
citation fixture omitted from tests (the 08-22 record-shape false positive would ship
undetected and break every explanation in prod — run fixture (a), it is the tripwire);
`detectBannedLanguage` signature changed (loss-autopsy call sites break); failures
pushed BEFORE the structural checks (errorKind telemetry uses `failures[0]` — ordering
must keep structural failures first).

## LQ15 · model-court-grounding  (claims audit · MEDIUM)
**DATA CLASS: INTERNAL.**
**Artifact:** `apps/web/lib/intelligence-graph/model-court/answer.ts` (+ extend `apps/web/__tests__/model-court-answer.test.ts`)
**Constraints:** priced:false · fail-closed on missing data · no live-p without masterplan §6 · no MODEL_VERSION · forbidden: prisma schema, event-odds-ingest writes, secrets, vercel.json
**Why:** same hole as LQ14 in the Model Court: `evaluateModelCourtAnswerPolicy`
(:228-255) enforces citation + banned families but not numeric grounding — member-facing
Q&A can emit numbers not present in the grounded prompt.
**Spec (policy fn and call site live in this one file):**
1. Hoist the prompt at the call site (:145): `const promptUser = buildPromptUser(input);`
   → pass `user: promptUser` to `callClaude`.
2. Signature: `evaluateModelCourtAnswerPolicy(bodyMarkdown: string, groundingText?: string): string[]`
   — append AFTER the existing checks (so `policyFailures[0]`-based errorKind telemetry
   keeps structural failures first):
```ts
  if (groundingText !== undefined) {
    const allowed = extractNumericClaims(groundingText).map((c) => c.value);
    if (!validateNumericClaims(text, { allowed }).grounded) failures.push("UNGROUNDED_NUMERIC");
  }
```
   `import { extractNumericClaims, validateNumericClaims } from "@/lib/claude-api/numeric-guard";`.
3. Call site (:148): `const policyFailures = evaluateModelCourtAnswerPolicy(result.text, promptUser);`
**Documented residual (must land as a code comment at the call site, not be silently
ignored):** `buildPromptUser` includes the user's QUESTION, so a number the user seeds
("did you hit 68%?") is whitelisted for echo. That echo is not a fabricated MODEL stat,
and the tout-shaped families (`win rate`/ROI/+EV) stay banned outright by `EV_PATTERNS`
regardless of grounding — accepted for launch; splitting context-only grounding out of
the prelude builders is a follow-up.
**Refusal path untouched:** `evaluateModelCourtRefusal` (:195-226) runs BEFORE any
generation — no numeric check belongs there; zero diffs to it.
**Tests to extend (`__tests__/model-court-answer.test.ts`):** with a groundingText
containing `"bootstrap share 61.2%"` and a valid citation token — answer citing 61.2%
passes; answer adding `"they are 8-2 in their last 10"` → `UNGROUNDED_NUMERIC` present
in the returned failures; single-arg legacy call = today's behavior; failure ordering:
an answer that is BOTH missing a citation and ungrounded reports `MISSING_CITATION`
first.
**Verify:**
```
npm run test --workspace=apps/web -- __tests__/model-court-answer.test.ts __tests__/model-court-route.test.ts && npm run typecheck --workspace=apps/web
```
**Attacks:** grounding from `SYSTEM_PROMPT` (may contain example numbers — must be
`promptUser`); the question-echo caveat comment missing (the residual must be visible
to the next auditor); refusal path gated (a numeric check before generation breaks
refusals — diff must not touch :195-226); `UNGROUNDED_NUMERIC` pushed first (telemetry
ordering).

---

# Section C — Launch-blocker / preflight (code-editable items)

**DATA CLASS: INTERNAL (all of Section C). Grok/Hermes only.** Owner-only items are NOT
cards — see the OWNER-ACTION checklist after LQ17.

## LQ16 · deploy-ready-hardening  (preflight audit · HIGH — the honest checklist)
**DATA CLASS: INTERNAL.**
**Artifact:** `scripts/check-deploy-readiness.mjs`
**Constraints:** priced:false · fail-closed on missing data · no live-p without masterplan §6 · no MODEL_VERSION · forbidden: prisma schema, event-odds-ingest writes, secrets, vercel.json
**Why:** `deploy:ready` can report green while (a) the ENTIRE cron plane 500s —
`CRON_SECRET` is absent from `REQUIRED` (lines 92-110) but all 29 cron routes are
`bearer_only` by default (`apps/web/lib/cron/authorize.ts:16,48-56`) and return 500 when
the secret is unset (:83) — and (b) the Fantasy subscribe button is dead —
`STRIPE_FANTASY_MONTHLY/ANNUAL_PRICE_ID` are missing from `REQUIRED` while Fantasy is
sold on /pricing; without the envs, resolution falls to a live Stripe `lookup_key` query
(`apps/web/lib/stripe.ts:139-160`) else fail-closed 503 checkout.
**Spec (three diffs):**
1. `REQUIRED` (:92-110, currently 17 entries ending `"NEXT_PUBLIC_APP_URL"`) — append:
   `"CRON_SECRET"`, `"STRIPE_FANTASY_MONTHLY_PRICE_ID"`, `"STRIPE_FANTASY_ANNUAL_PRICE_ID"`.
2. `KNOWN_SENSITIVE` (:120-128) — add the same three names. Mechanism (embedded,
   :130-160): known-Sensitive vars absent from a LOCAL `vercel env pull` downgrade to a
   warning (write-only in Vercel, unreadable locally); in the deploy/CI context every
   miss stays a hard failure. That keeps local runs honest without false reds.
3. New warn-only section `Elite alert channels` after the required-vars loop: for each
   of `RESEND_API_KEY`, `ALERTS_EMAIL_FROM`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`,
   `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` — call `warn(key, "Elite graded-alert channel dark; deliveries queue as retryable, never fail loudly")`
   when unset, `ok(key, <redacted>)` when set (reuse the existing redaction at :139 —
   never print a value). WARN, never `bad`: launching alerts-dark is a legal owner
   choice (see OWNER-ACTION #5); an invisible dark channel is not.
**Verify (script exits non-zero without envs — the greps assert the checklist now KNOWS
about the vars either way):**
```
node scripts/check-deploy-readiness.mjs > /tmp/deploy-ready.out 2>&1; grep -q CRON_SECRET /tmp/deploy-ready.out && grep -q STRIPE_FANTASY_MONTHLY_PRICE_ID /tmp/deploy-ready.out && grep -q RESEND_API_KEY /tmp/deploy-ready.out && node --check scripts/check-deploy-readiness.mjs
```
**Attacks:** `CRON_SECRET` added to `KNOWN_SENSITIVE` but not `REQUIRED` (warning-only
forever = the false green persists in CI, the exact bug); alert-channel vars made HARD
failures (blocks a legitimate alerts-dark launch); any env VALUE echoed (the redaction
helper must wrap every print — grep the diff for `process.env` reaching a template
string unredacted); `NEXT_PUBLIC_VAPID_PUBLIC_KEY` put in `KNOWN_SENSITIVE` (it is
public by name; it belongs only in the warn section).

## LQ17 · smoke-www-canonical  (preflight audit · MEDIUM — smoking the wrong host)
**DATA CLASS: INTERNAL.**
**Artifact:** `scripts/post-deploy-smoke.mjs`
**Constraints:** priced:false · fail-closed on missing data · no live-p without masterplan §6 · no MODEL_VERSION · forbidden: prisma schema, event-odds-ingest writes, secrets, vercel.json
**Why:** line 28 defaults `BASE` to the APEX `https://galaxysportsedge.com`, but the
canonical host is the WWW host (`apps/web/lib/seo/site-url.ts`: `NEXT_PUBLIC_APP_URL`
when set, else `https://www.galaxysportsedge.com` — never the apex). Until the
platform-level apex→www redirect exists, the smoke tests the wrong host; and with
`trustHost:true` (`apps/web/lib/auth.ts:29`) an un-redirected apex hit mints an apex
OAuth callback Google rejects.
**Spec (two diffs):**
1. Default: `const BASE = (argUrl ? argUrl.split("=")[1] : "https://www.galaxysportsedge.com").replace(/\/$/, "");`
   and update the usage docstring (lines 9-13) to match — comment/code drift is the
   exact preflight disease; leave no stale apex reference in the header.
2. New check `checkApexRedirect()`, run ONLY when
   `BASE === "https://www.galaxysportsedge.com"` (preview-deploy runs with `--url=` skip
   it): `fetch("https://galaxysportsedge.com/", { redirect: "manual" })` via the
   existing `fetchWithTimeout` — PASS iff status ∈ {301, 307, 308} AND the `location`
   header `startsWith("https://www.galaxysportsedge.com")`; anything else →
   `bad("apex → www redirect", ...)` (an unredirected apex is a launch failure, not a
   warning). Wire it into `main()` alongside the existing page checks.
**Verify (cannot hit prod pre-launch — structural gate; the live run is LQ18's job):**
```
node --check scripts/post-deploy-smoke.mjs && grep -q '"https://www.galaxysportsedge.com"' scripts/post-deploy-smoke.mjs && ! grep -n ': "https://galaxysportsedge.com").replace' scripts/post-deploy-smoke.mjs && grep -q 'redirect: "manual"' scripts/post-deploy-smoke.mjs
```
**Attacks:** the redirect check using default fetch (follows redirects — a 200 on www
masks a MISSING 301; must be `redirect: "manual"`); Location asserted by strict
equality (trailing-slash brittleness — `startsWith`); the apex check firing on
`--url=` preview runs (the BASE guard); the docstring still claiming the apex default
(grep the header block).

---

# OWNER-ACTION checklist — Garrett only. These are NOT cards; no fleet worker touches them.

Each item: what, why (with the code truth), and the proof-of-done. `deploy:ready`
(post-LQ16) is the checklist runner for the env items.

1. **[CRITICAL — the one RED spine item] Pick a scheduler.** Vercel Hobby caps crons at
   daily (and 2 crons total) while `vercel.json` declares 21 sub-hourly crons
   (refresh-odds `*/15`, board-fill 4×/hr, settle-picks hourly :20); the GitHub-Actions
   fallback (`.github/workflows/external-cron.yml`, 2026-08-10 note) is idle for lack of
   minutes — so on game day NOTHING fires at the declared cadence and every watchdog
   rides the same dead scheduler. Choose ONE: (a) upgrade Vercel to Pro (also needed for
   `maxDuration=300`), or (b) restore Actions billing + set `CRON_SECRET` and
   `CRON_TARGET_URL` repo secrets, or (c) stand up a third-party pinger sending the
   `CRON_SECRET` bearer. **Proof:** one live firing each of refresh-odds, board-fill,
   settle-picks with advancing `IngestionRun`/jarvis-snapshot timestamps.
   (`docs/ops/GO_LIVE_RUNBOOK.md:17` still claims the Actions cron makes Hobby fine —
   correct it while there.)
2. **CRON_SECRET set in Vercel prod.** All 29 cron routes are `bearer_only`
   (`lib/cron/authorize.ts`); unset = every cron 500s. Vercel injects it as the
   `Authorization: Bearer` on platform cron invocations. **Proof:** `deploy:ready`
   green on the var in the CI/deploy context + one authenticated cron 200.
3. **Canonical host pair + OAuth + apex redirect** (CLAUDE.md operator block):
   `NEXT_PUBLIC_APP_URL` = `NEXTAUTH_URL` = `https://www.galaxysportsedge.com`
   (identical, WITH www); Google Cloud Console OAuth client has redirect URI
   `https://www.galaxysportsedge.com/api/auth/callback/google`; apex→www 301 at the
   DNS/platform layer (never app code). **Proof:** `curl -I https://galaxysportsedge.com`
   shows 301/308 → www; a live Google sign-in on www succeeds.
4. **Stripe price ladder.** All six `STRIPE_{PRO,ELITE,FANTASY}_{MONTHLY,ANNUAL}_PRICE_ID`
   set (Fantasy pair especially — dead subscribe button otherwise). **Comma-history
   discipline** (`lib/billing/price-ids.ts`): each var is a comma-separated ID history —
   on any future phase advance PREPEND the new ID and KEEP every old one; replacing the
   list maps founding members' renewals to FREE (silent paid→free downgrade).
   `STRIPE_TERMS_CONSENT_ENABLED` stays unset/"false" unless the Stripe Dashboard ToS
   URL is set FIRST — flipping early 500s EVERY checkout (`lib/stripe.ts:320-328`), a
   total revenue outage landing exactly on launch night. **Proof:** one TEST-mode
   subscribe per tier × interval; `stripe:seed` lookup_keys confirmed.
5. **Elite alert channels + audience.** Set `RESEND_API_KEY`, `ALERTS_EMAIL_FROM`,
   `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (unconfigured is
   a RETRYABLE state — deliveries queue silently, they do not fail loudly). Apply the
   founder migration `packages/db/prisma/migrations/20260717120000_add_watchlist`
   (watchlist API/UI honestly 503 until then — alerts have no audience without it).
   **Proof:** one end-to-end graded alert (settle a pick or drain the outbox) to a
   watchlisted Elite test account, email AND push.
6. **Off-stack monitoring.** Set `HEALTH_ALERT_WEBHOOK_URL`; arm at least one monitor
   OFF the Vercel/Actions stack (UptimeRobot-class) on `/api/health` and
   `/api/ops/public-surface-truth` — the health-alert cron and both Actions watchdogs
   share the dead scheduler (#1): a cron-plane outage currently pages nobody.
   **Proof:** kill-test the monitor once.
7. **Launch gate ladder + kill switch.** Flip in order (`platform-config` — all default
   false): `CANONICAL_HISTORY_ENABLED` → derived-model history → `PUBLIC_PICKS_ENABLED`
   → `PERFORMANCE_STATS_ENABLED` (the last only per the effective-performance gate;
   env alone is insufficient by design). Set `FORCE_NO_BET_IF_STALE=true` for week 1
   (CLAUDE.md #5 enforced, not inferred — the 2026-08-10 dead-scheduler incident is the
   precedent). Confirm `DEV_FAKE_ADMIN` and `DEMO_PICKS_ENABLED` are UNSET in prod.
   **Proof:** board renders real rows on www; `/api/ops/public-surface-truth` agrees.
8. **PRICING_PHASE stays unset** (= FOUNDING). Advancing the env early publishes the
   "proven / published calibration" trigger narrative on /pricing before it is true —
   an unsupported claim via env var; `phase-readiness.ts` checks milestones but never
   blocks the env. Advance only after the PROVEN milestones verifiably hold.
9. **Odds API quota vs cadence.** `*/15` across 7 sports ≈ 600+ calls/day — confirm the
   plan covers it (`deploy:ready` prints `x-requests-remaining`; it must not be near
   zero).
10. **Doc edits riding these decisions** (owner-owned files, forbidden to fleet cards):
    CLAUDE.md tier table "real-time email & push alerts" → "graded-pick email & push
    alerts" to match LQ10; `vercel.json` retime of `deliver-settlement-alerts`
    (currently `15 */3` — 5 min BEFORE hourly settle-picks :20; harmless today because
    settle-picks drains the outbox inline, so worst case is retry latency) to
    `25 * * * *` ONLY after #1 gives you a real scheduler.

---

# LQ18 · LAUNCH-NIGHT  (the exact smoke sequence)

**DATA CLASS: INTERNAL.** Depends: LQ1, LQ16, LQ17 (it asserts their outcomes).
**Artifact:** `scripts/launch-night-smoke.mjs`
**Constraints:** priced:false · fail-closed on missing data · no live-p without masterplan §6 · no MODEL_VERSION · forbidden: prisma schema, event-odds-ingest writes, secrets, vercel.json
**What exists (embedded — the whole current script):** 52 lines; `steps = [test:brand-safety, test:cockpit]`,
`--with-snapshots` appends `snapshots:regen`; spawnSync each, print OK/FAIL table, exit
non-zero on any failure. **What the audits say it misses:** every prod-surface probe —
no deploy:ready, no prod smoke, no canonical-host assertion, no cron-liveness proof, no
entitlement spot-checks.
**Spec — add a `--prod [--base=URL]` mode** (default base
`https://www.galaxysportsedge.com`) that appends, in this order, to the step list:
1. `deploy:ready` — `node scripts/check-deploy-readiness.mjs` (post-LQ16: now covers
   CRON_SECRET, the Fantasy price pair, and warns on dark alert channels).
2. `smoke:prod` — `node scripts/post-deploy-smoke.mjs --url=<base>` (post-LQ17: www
   default + apex 301 assertion).
3. `prod-probe` — spawn `node scripts/prod-probe.mjs` with `env: { ...process.env, APP_URL: base }`.
4. `cron liveness` — inline `fetch` (15s timeout): `<base>/api/health` → 200 JSON with
   key `ok`; `<base>/api/ops/public-surface-truth` → 200 JSON; print the body's
   freshness fields verbatim for the operator's eyeball (assert only status + JSON
   parse — no schema guessing).
5. `paywall spot-check` — inline anonymous fetches against a single `EXPECTED` table
   defined at the top of the script (one place to update, each row commented with the
   card that set it):
   - `<base>/api/board/state` → 200 AND every row of `data.scoringNow`,
     `data.publishedToday`, `data.gatedTodayRows` has `confidence === null` (the picks
     API contract is null-not-omitted — assert `=== null`, never "key absent") and no
     row carries a non-null `rankingP`.
   - `<base>/api/picks` → 200, zero rows with `tier === "PREMIUM"`, `confidence === null`
     on every row.
   - `<base>/api/dfs/salaries` → 401 (LQ1; if LQ1 has not merged, the EXPECTED row says
     200 with a `// TODO(LQ1)` comment — the table is the single switch).
   - `<base>/api/intelligence/predictiveness` → 401.
6. Epilogue (always printed in `--prod` mode, after the results table): the MANUAL
   checklist that cannot be scripted, as literal checkbox lines mirroring OWNER-ACTION
   §§1-9 — scheduler proof (three cron timestamps advancing), Stripe TEST subscribe per
   tier, one end-to-end Elite graded alert, gate ladder flipped in order +
   `FORCE_NO_BET_IF_STALE=true`, watchlist migration applied, off-stack monitor armed,
   `PRICING_PHASE` unset, Odds API quota headroom.
**The launch-night runbook order (document verbatim in the script header):**
```
T-1h   node scripts/launch-night-smoke.mjs            # local: brand-safety + cockpit green
T-0    deploy
T+10m  node scripts/launch-night-smoke.mjs --prod     # full prod sequence
each gate flip (OWNER-ACTION #7): re-run --prod
```
Local mode's behavior must be byte-for-byte unchanged (same two default steps, same
`--with-snapshots`).
**Verify (local, deterministic — the `--prod` path is exercised live on launch night):**
```
node --check scripts/launch-night-smoke.mjs && node scripts/launch-night-smoke.mjs && grep -q -- '--prod' scripts/launch-night-smoke.mjs && grep -q 'api/dfs/salaries' scripts/launch-night-smoke.mjs
```
**Attacks:** the paywall spot-check asserting on ABSENT keys (the contract is
null-not-omitted — an omitted-key assertion passes against a leaking payload; must be
`=== null`); `--prod` also re-running the local vitest subsets against prod semantics
(they are local-only — sequence composition, steps 1-5 append, never replace); a
duplicate apex fetch here with default redirect-follow (the apex assertion lives in
LQ17's script — do not re-implement it wrong); the apex/liveness URLs hardcoded instead
of derived from `--base`; a step's non-zero exit swallowed (every step must flow into
the existing results/exit-code machinery); the EXPECTED table edited to match a leaking
prod instead of failing (the table's comments tie each row to its card — the verifier
cross-checks LQ1's merge state against the dfs row).

---

## Deck ledger

| Card | Class | Severity/source | Artifact |
|---|---|---|---|
| LQ1 | INTERNAL | paywall · medium | apps/web/app/api/dfs/salaries/route.ts |
| LQ2 | INTERNAL | paywall · low (prereq) | apps/web/lib/api-entitlement.ts |
| LQ3 | INTERNAL | paywall · low | apps/web/app/api/tools/lineup/route.ts |
| LQ4 | INTERNAL | paywall · low | apps/web/lib/board/state.ts |
| LQ5 | INTERNAL | paywall · low | apps/web/app/picks/page.tsx |
| LQ6 | INTERNAL | paywall · low | apps/web/app/api/board/passes/route.ts |
| LQ7 | INTERNAL | paywall · low · RESEARCH | docs/ops/STRIPE_WEBHOOK_IDEMPOTENCY_DECISION.md |
| LQ8 | PUBLIC | claims · medium | apps/web/app/humans.txt/route.ts |
| LQ9 | PUBLIC | claims · low | faq/about/trends page.tsx |
| LQ10 | PUBLIC | recon gap (Elite copy) | pricing + alert copy sites |
| LQ11 | PUBLIC | claims · high | scripts/guardrails/no-unsupported-performance-claims.mjs |
| LQ12 | PUBLIC | claims · high | scripts/guardrails/commercial-copy-scan.mjs |
| LQ13 | INTERNAL | claims · medium | apps/web/lib/calibration-training/claude.ts |
| LQ14 | INTERNAL | claims · medium | apps/web/lib/pick-explainer/policy.ts |
| LQ15 | INTERNAL | claims · medium | apps/web/lib/intelligence-graph/model-court/answer.ts |
| LQ16 | INTERNAL | preflight · high | scripts/check-deploy-readiness.mjs |
| LQ17 | INTERNAL | preflight · medium | scripts/post-deploy-smoke.mjs |
| LQ18 | INTERNAL | launch-night | scripts/launch-night-smoke.mjs |

18 cards: 5 PUBLIC, 13 INTERNAL, 0 CROWN. Owner-only items live in the OWNER-ACTION
checklist, not in cards. Commit-on-pass applies to every card: verify green → commit →
one PR per card (or per small dependent pair, e.g. LQ2+LQ3).

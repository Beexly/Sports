# Audit 2026-09-08 — Dimension: TESTS THAT CANNOT FAIL

Read-only audit. Scope: tests that would stay green with the code under test reverted,
deleted, or behaviourally inverted, plus a branch map of the money path (Stripe webhook,
entitlements, settlement, publish gate, selective filter) naming the branches with no test
at all.

Every claim below cites a file and line I read, or a command I ran and whose output I saw.
Where I could not verify something, it says NOT VERIFIED.

---

## What I checked (with commands run)

Inventory and shape of the suite:

```bash
find . -path ./node_modules -prune -o -name "*.test.ts" -print -o -name "*.test.tsx" -print
ls apps/web/__tests__ | wc -l                      # 794 test files in apps/web alone
grep -ln "readFileSync" apps/web/__tests__/*.test.ts | wc -l   # 275 of them read source text
grep -rn "toMatchSnapshot|toMatchInlineSnapshot" apps/web/__tests__   # 0 hits
grep -rn "expect(true)\.toBe(true)" apps/web/__tests__            # 5 hits, all throw-first
```

Anti-pattern sweeps I ran across `apps/web/__tests__`:

```bash
# 1. vacuously-true .every() assertions (empty array satisfies them)
grep -rn "expect(.*\.every(" apps/web/__tests__/*.test.ts | grep -v length

# 2. indexOf() ordering assertions (a missing string yields -1, which satisfies toBeLessThan)
grep -rn "indexOf(" apps/web/__tests__/*.test.* | grep -i "toBeLessThan|toBeGreaterThan"

# 3. tests that mock a module they also import as the subject (scratch script)
node scratchpad/selfmock.mjs

# 4. it() blocks containing no expect() at all (scratch script)
node scratchpad/noexpect.mjs
```

Money-path source read in full (not skimmed):

- `apps/web/app/api/webhooks/stripe/route.ts` (811 lines, all handlers)
- `apps/web/lib/entitlements.ts`, `apps/web/lib/api-entitlement.ts`
- `apps/web/lib/ops/calibration-eligibility.ts`, `apps/web/lib/autonomy/revenue-ladder.ts`
- `apps/web/lib/calibration/selective-publish.ts`, `.../selective-publish-runtime.ts`
- `apps/web/lib/performance/settlement-health.ts`, `apps/web/lib/settlement/zero-sit-lane.ts` (header)
- `apps/web/lib/data-sources/free-settlement.ts` (`settlePendingPicks`)
- `packages/prediction-engine/src/settlement.ts`
- `apps/web/app/api/picks/route.ts` (gating and filter sections)

Test files read in full or near-full: `stripe-webhook-route.test.ts`, `api-entitlement.test.ts`,
`entitlements-enforcement.test.ts`, `calibration-eligibility.test.ts`, `selective-publish.test.ts`,
`env-flags-founding.test.ts`, `proven-path-engine.test.ts` (selective block),
`public-picks-quality-floor.test.ts`, `picks-daily-limit-meta.test.ts`,
`settle-picks-free-first.test.ts` (ordering blocks), `settlement-health.test.ts`,
`revenue-ladder.test.ts`, `ops-revenue-ladder-surface.test.ts`, `market-implied-display.test.ts`,
`get-slate-twin-paywall.test.ts`, `premium-analytics-rate-limit.test.ts`,
`snapshots-banned-phrases.test.ts`, `docs-adr.test.ts`, `cockpit-lib-docstrings.test.ts`.

Suites I actually executed:

```bash
npx vitest run __tests__/calibration-eligibility.test.ts __tests__/selective-publish.test.ts \
               __tests__/revenue-ladder.test.ts
#   3 files passed, 27 tests passed

npx vitest run __tests__/public-picks-quality-floor.test.ts
#   1 file passed, 3 tests passed   <-- see Finding 1: one of those 3 passes on a string
#                                       that does not exist in the file it claims to pin
```

---

## Findings

Ranked by how much false confidence each provides.

---

### 1. BLOCKER — `/api/picks` data-quality floor: an ordering assertion that passes because its subject string is already gone

**Evidence**

`apps/web/__tests__/public-picks-quality-floor.test.ts:18-25`

```ts
it("filters /api/picks by game data quality before mapping public payloads", () => {
  const src = read("app/api/picks/route.ts");
  expect(src).toMatch(/MIN_PUBLIC_PICK_DATA_QUALITY_SCORE/);
  expect(src).toMatch(/dataQualityScore:\s*\{\s*gte:\s*MIN_PUBLIC_PICK_DATA_QUALITY_SCORE\s*\}/);
  expect(src.indexOf("game: gameFilter")).toBeLessThan(src.indexOf("picks.map"));
});
```

The literal `"game: gameFilter"` does not exist anywhere in the route:

```bash
$ grep -c "game: gameFilter" apps/web/app/api/picks/route.ts
0
$ grep -n "gameFilter" apps/web/app/api/picks/route.ts
94:  const gameFilter = {
137:        game: { ...gameFilter, ...gameInSlateWindow(slate) },
360:        game: { ...gameFilter, ...gameInSlateWindow(slate) },
$ grep -n "picks.map" apps/web/app/api/picks/route.ts
177:      picks.map(async (pick) => {
```

`String.prototype.indexOf` returns `-1` for the missing string, and `-1 < 177` is true, so the
assertion passes. I ran the suite: 3 tests, 3 passed.

**What specifically is wrong.** The assertion claims to pin "the quality floor is applied to the
query before the payload mapping". It pins nothing. It already silently drifted (the route moved to
a spread form, `game: { ...gameFilter, ... }`) and reported green. It will also stay green if
`gameFilter` is deleted from the route entirely, because `-1` is less than every real index.

The two sibling assertions in the same `it` are pure text regexes against the whole file, comments
included, so they are satisfied by a source comment naming the constant, not by the filter running.
The whole suite is source-text pinning: there is no executed test anywhere that calls
`GET /api/picks` and observes a low-quality game being excluded.

**Why it matters.** `MIN_PUBLIC_PICK_DATA_QUALITY_SCORE` is the floor that keeps low-data-quality
games off the public board, which is a rule 1 / rule 5 surface. The suite reports it as covered.

**Proposed fix.** Replace the ordering assertion with an executed test: mock `db.pick.findMany`,
call the real route handler, and assert the `where.game.dataQualityScore.gte` argument the handler
passed (the arg is observable on the mock, which is the subject's behaviour, not the mock's). Keep
the regexes only as a secondary tripwire, and if text pinning is retained anywhere, assert the index
is `> -1` first so a missing subject fails instead of passing.

**Risk of fix.** Low. Additive test change only; no source change.

---

### 2. BLOCKER — the one guard currently holding PROVEN closed has no test

**Evidence**

`apps/web/lib/ops/calibration-eligibility.ts:105-107`

```ts
if (!input.settlementHealthy) {
  reasons.push("Settlement not healthy");
}
```

Every call to `evaluateCalibrationEligibility` in the test suite passes `settlementHealthy: true`:

```bash
$ grep -rn "settlementHealthy" apps/web/__tests__/*.test.ts
calibration-eligibility.test.ts:25:  settlementHealthy: true,
calibration-eligibility.test.ts:39:  settlementHealthy: true,
calibration-eligibility.test.ts:53:  settlementHealthy: true,
calibration-eligibility.test.ts:68:  settlementHealthy: true,
calibration-eligibility.test.ts:82:  settlementHealthy: true,
calibration-drift-alert.test.ts:91:            { ..., settlementHealthy: true }
market-anchored-calibration-sample.test.ts:260:  { ..., settlementHealthy: true }
```

(The `settlementHealthy: false` hits in `revenue-ladder.test.ts` are a different function; see
Finding 6.)

The adjacent branch is equally untested: `calibration-eligibility.ts:108`
(`if (input.canonicalSettled < input.minSettledForLearning)`) never fires, because the five tests
pass `canonicalSettled` 1000 or 1017 against a `minSettledForLearning` of 100.

**What specifically is wrong.** Deleting lines 105-107 leaves `calibration-eligibility.test.ts` at
17/17 green (I ran it). Per AGENTS.md, the 2026-09-08 11:50 UTC production reading has all four
calibration floors passing and `reasons` containing exactly one entry, "Settlement not healthy".
That single reason is the only thing keeping calibration eligibility RED, and therefore the only
thing keeping the PROVEN pricing phase and the public performance claim closed. It is asserted
nowhere.

**Why it matters.** This is the honesty boundary itself. A refactor that drops or inverts that
conjunct would flip eligibility GREEN with no test failing, and (with `CALIBRATION_AUTO_PUBLISH`
on) the publish receipt is automatic from there. The product's stated premise is that it does not
lie about its own performance; the guard enforcing that has zero regression cover.

**Proposed fix.** Add two cases to `calibration-eligibility.test.ts`: (a) `settlementHealthy: false`
with otherwise-good metrics asserts `status === "RED"`, `runMeetsFloors === false`,
`consecutiveGreen === 0`, and `reasons` contains exactly `"Settlement not healthy"`; (b)
`canonicalSettled: 40, minSettledForLearning: 100` asserts the `Canonical settled 40/100` reason.
Both are pure-function calls, no mocks.

**Risk of fix.** None to production. Do not touch any floor, threshold, or grace constant.

---

### 3. BLOCKER — the edge half of the public selective filter is untested, and `marketImpliedProb` appears in no test at all

**Evidence**

`apps/web/lib/calibration/selective-publish.ts:68-81`

```ts
export function passesSelectiveThresholds(row, t) {
  if (Math.abs(row.p - 0.5) < t.delta) return false;          // line 69  — tested
  if (t.edge != null && t.edge > 0) {                          // line 70  — NEVER entered
    if (row.marketP != null && Number.isFinite(row.marketP)) {
      if (Math.abs(row.p - row.marketP) < t.edge) return false;
    }
  }
  if (t.minGroupRes != null && t.groupResMap) {                // line 76  — NEVER entered
    ...
  }
  return true;
}
```

Every test that reaches this function passes `edge: null` and `minGroupRes: null`:

```bash
$ grep -rn "edge:" apps/web/__tests__/selective-publish.test.ts \
      apps/web/__tests__/proven-path-engine.test.ts apps/web/__tests__/env-flags-founding.test.ts
selective-publish.test.ts:20:  filterSelective(rows, { delta: 0.12, edge: null, minGroupRes: null });

$ grep -rn "marketImpliedProb" apps/web/__tests__/*.test.ts
(no output)

$ grep -rn "groupResMap" apps/web/__tests__/*.test.ts
(no output)
```

The runtime wiring that feeds `edge` is `selective-publish-runtime.ts:71`
(`edge: plan?.selectiveRecommended?.edge ?? null`) and `:73` (`minGroupRes: null`, hardcoded).

**What specifically is wrong.** The public selective gate is described and reasoned about as an
edge filter (published pick versus market price). In code, the only branch that has ever executed
under test is `|p - 0.5| >= delta`, a pure confidence cut. The `marketP` comparison and the group
resolution allowlist could both be deleted and the entire suite stays green. Nothing in
`apps/web/__tests__` ever passes a non-null `marketImpliedProb` into
`passesPublicSelectiveFilter`, so the field's plumbing from
`factorBreakdown.marketFairProb` (`app/api/picks/route.ts:186-188`) into the filter is also
unexercised.

This compounds the already-established session finding that `plan.selectiveRecommended.edge` is
null in production and 89 per cent of published moneyline picks carry no `marketFairProb`. The
inert-in-production condition is also inert-in-test, so there is no signal anywhere that would
notice if it stayed inert forever.

**Why it matters.** It creates confidence that the public board is edge-filtered. Measured, it is
delta-filtered, and no test distinguishes the two.

**Proposed fix.** Add direct `passesSelectiveThresholds` cases: `edge: 0.03` with
`marketP: 0.52, p: 0.53` returns false; `marketP: 0.52, p: 0.62` returns true; `marketP: null`
returns true (documented signal-mode allowance). Add a `passesPublicSelectiveFilter` case that
passes `marketImpliedProb` through a non-null plan `selectiveRecommended.edge`. Add a
`minGroupRes` / `groupResMap` pair.

**Risk of fix.** None. Test-only, and it documents current behaviour rather than changing it.

---

### 4. MAJOR — `selective-publish.test.ts`: four tests, three of which assert something other than their own title, and one that is vacuous on an empty result

**Evidence** — `apps/web/__tests__/selective-publish.test.ts` in full (67 lines).

`:19-22` "filters by delta"
```ts
const f = filterSelective(rows, { delta: 0.12, edge: null, minGroupRes: null });
expect(f.every((r) => Math.abs(r.p - 0.5) >= 0.12)).toBe(true);
```
Two defects at once. First, the assertion re-implements the predicate under test verbatim
(`selective-publish.ts:69` is `if (Math.abs(row.p - 0.5) < t.delta) return false`), so it is a
tautology over whatever the function returned. Second, `[].every(...)` is `true`, so a
`filterSelective` that returns an empty array passes. Nothing asserts `f.length > 0`, and nothing
asserts a qualifying row was not dropped. A stub `filterSelective = () => []` passes this test.

`:24-28` "sweep recommends finite Res when possible"
```ts
const s = selectivePublishSweep(rows, { minN: 10 });
expect(s.baseline.n).toBe(100);       // an echo of rows.length, the test's own input
expect(s.grid.length).toBeGreaterThan(0);
```
No assertion mentions Res, or a recommendation, or finiteness. The entire resolution computation
could return `NaN` and this passes.

`:34-38` "holdout report pause candidates"
```ts
expect(r.overall.n).toBe(100);
expect(r.rankingLevers.length).toBeGreaterThan(0);
```
No assertion about pause candidates.

`:30-32` "flag default off"
```ts
expect(isSelectivePublishEnabled({})).toBe(false);
```
This is the wrong function. `isSelectivePublishEnabled` (`selective-publish.ts:57`) is
explicit-true-only. The function the public board actually consults is
`isSelectivePublishRuntimeEnabled` (`selective-publish-runtime.ts:35`), whose documented default is
**ON**. A reader scanning test titles concludes the runtime default is off. It is on.

**Why it matters.** This file is the primary named coverage for the selective publish subsystem,
which decides what reaches the public board. Four of its five substantive tests would survive
deletion of the logic they name.

**Proposed fix.** For "filters by delta": assert both directions and non-emptiness, for example
`expect(f.length).toBeGreaterThan(0)`, `expect(f.length).toBeLessThan(rows.length)`, and assert the
exact set of retained ids against a hand-computed expectation rather than re-running the predicate.
For the sweep and holdout tests, assert the named quantity or rename the test. Rename
"flag default off" to name the function it tests, and add a companion asserting the runtime default
is ON.

**Risk of fix.** None. Test-only.

---

### 5. MAJOR — `proven-path-engine.test.ts` "public filter respects pause when apply on" exercises the no-pause path

**Evidence** — `apps/web/__tests__/proven-path-engine.test.ts:135-152`

```ts
it("public filter respects pause when apply on", () => {
  const pick = { confidence: 70, pickType: "MONEYLINE", sportKey: "baseball_mlb", rankingP: 0.7 };
  // Without plan pause apply, high-δ may still pass
  expect(passesPublicSelectiveFilter(pick, { SELECTIVE_PUBLISH_DELTA: "0.05" }, null)).toBe(true);
});
```

`plan` is `null`, `durablePause` is omitted, and `SELECTIVE_PAUSE_GROUPS` is unset, so
`resolvePausedGroups` returns no paused groups and the guard at
`selective-publish-runtime.ts:322` (`if (cfg.pausedGroups.includes(groupKey)) return false`) is
never reached. The assertion is that the pick **passes**.

**What specifically is wrong.** The title claims coverage of the pause-apply path. The body covers
its complement, and the inline comment concedes it. The plan-sourced and durable-sourced pause
branches (`RANKING_PAUSE_APPLY=true`, and the durable founder snap read through
`getCachedRankingPauseDurable`) have no test asserting a pick is suppressed. Only the env-sourced
pause is covered, in a different file (`env-flags-founding.test.ts:59-69`).

**Why it matters.** The durable pause is a kill switch: a founder pausing a group expects published
rows for that group to stop. Two of its three sources have no suppression test.

**Proposed fix.** Rename this test to what it does ("a pick passes when no pause group applies"),
and add two real cases: one passing a `plan` with `pauseGroups: ["baseball_mlb|MONEYLINE"]` plus
`RANKING_PAUSE_APPLY=true` asserting `false`, and one passing a `durablePause` snap asserting
`false`.

**Risk of fix.** None. Test-only.

---

### 6. MAJOR — the revenue ladder's settlement-health blocker is unasserted, and its one false-input test is confounded

**Evidence**

`apps/web/lib/autonomy/revenue-ladder.ts:93`
```ts
if (!input.settlementHealthy) blockers.push("Settlement not healthy");
```
`apps/web/lib/autonomy/revenue-ladder.ts:108-112`
```ts
const canHonestlyMonetizePublicTrackRecord =
  provenMet && input.settlementHealthy && input.boardNotSuppressed && input.performanceStatsEnabled;
```

The only test in the repo that passes `settlementHealthy: false`
(`apps/web/__tests__/revenue-ladder.test.ts:6-19`) simultaneously passes `canonicalSettled: 40`
(under the floor) and `calibrationPublished: false`, and then asserts only:

```ts
expect(r.blockersToNext.join(" ")).toMatch(/Settled sample/);
expect(r.canHonestlyMonetizePublicTrackRecord).toBe(false);
```

Nothing asserts the string `"Settlement not healthy"` anywhere. `ops-revenue-ladder-surface.test.ts`
passes `settlementHealthy: true` in all three cases (lines 41, 55, 70).

**What specifically is wrong.** Delete line 93 and the suite is green (I ran
`revenue-ladder.test.ts`: 3/3 pass). Delete the `input.settlementHealthy &&` conjunct on line 110
and the suite is also green, because no test sets it false while everything else is true. The two
assertions in the one false-input test are both satisfied by the `canonicalSettled: 40` blocker
alone, so the settlement input is a confound, not a subject.

**Why it matters.** `canHonestlyMonetizePublicTrackRecord` is a public-claim gate. Its
settlement-health conjunct is the piece that stops the ladder advertising a track record while
picks are sitting ungraded, which is precisely the live condition described in the C-247 note.

**Proposed fix.** Add a case with `canonicalSettled: 2000, calibrationPublished: true,
clvBeatCloseRate: 0.6, boardNotSuppressed: true, performanceStatsEnabled: true,
settlementHealthy: false` asserting `blockersToNext` contains `"Settlement not healthy"` and
`canHonestlyMonetizePublicTrackRecord === false`. Isolating the variable is the whole point.

**Risk of fix.** None. Test-only.

---

### 7. MAJOR — the settle-picks ordering guard on `persistFreeScores` cannot fail, and it guards the writer implicated in C-247

**Evidence** — `apps/web/__tests__/settle-picks-free-first.test.ts:184-186`

```ts
expect(calls.indexOf("runFreePathSettlement")).toBeGreaterThan(-1);
expect(calls.indexOf("runFreePathSettlement")).toBeLessThan(calls.indexOf("settleSport:baseball_mlb"));
expect(calls.indexOf("persistFreeScores")).toBeLessThan(calls.indexOf("runFreePathSettlement"));
```

Line 184 guards `runFreePathSettlement` against the `-1` case. `persistFreeScores` has no such
guard, and no `toHaveBeenCalled` assertion anywhere in the file:

```bash
$ grep -n "persistFreeScores" apps/web/__tests__/settle-picks-free-first.test.ts
43:  persistFreeScores: vi.fn(async () => {
44:    calls.push("persistFreeScores");
186:    expect(calls.indexOf("persistFreeScores")).toBeLessThan(calls.indexOf("runFreePathSettlement"));
```

The route does call it (`apps/web/app/api/cron/settle-picks/route.ts:147`,
`const freeScores = await persistFreeScores({ sportKey: requestedSport })`).

**What specifically is wrong.** If that call were removed or moved behind a condition,
`calls.indexOf("persistFreeScores")` becomes `-1` and `-1 < <any real index>` still passes. The
only assertion in the suite that references the score-persistence step is one that a missing step
satisfies.

**Why it matters.** `free-score-persist.ts` is the writer named as the obvious suspect for the 25
of 169 MLB / 14 of 48 MLS FINAL scores that contradict the ESPN feed they were ingested from
(C-247, `docs/ops/SCORE_INTEGRITY_2026-09-08.md`). Whether or not it is the culprit, the one test
touching its position in the cycle is unfalsifiable. Note the same suite handles this correctly for
`backfillStaleSettlement`, which does have real `toHaveBeenLastCalledWith` assertions at lines 273
and 288, so the fix pattern already exists in the file.

**Proposed fix.** Add `expect(calls.indexOf("persistFreeScores")).toBeGreaterThan(-1);` immediately
before line 186, matching the guard already used on line 184 for the sibling call. A stronger fix
is `expect(persistFreeScores).toHaveBeenCalledWith(expect.objectContaining({ sportKey: null }))`.

**Risk of fix.** None. Test-only, one line.

---

### 8. MAJOR — the `/dashboard` paywall has no executed test; it is pinned entirely by regexes over the page source

**Evidence** — `apps/web/__tests__/picks-daily-limit-meta.test.ts` reads three source files at
lines 27-29 and asserts only text. The dashboard block, lines 48-84:

```ts
expect(dashboardSrc).toMatch(/entitlements\.canSeePremiumPicks\s*\?\s*{}\s*:\s*{\s*tier:\s*"FREE"\s*}/);
expect(dashboardSrc).toMatch(/take:\s*entitlements\.canSeePremiumPicks\s*\?\s*\d+\s*:\s*\(entitlements\.dailyPickLimit\s*\?\?\s*1\)/);
expect(dashboardSrc).toMatch(/showConfidence=\{entitlements\.canSeeConfidence\}/);
expect(dashboardSrc).not.toMatch(/% conf/);
```

The only executed dashboard tests are `apps/web/__tests__/dashboard-page-smoke.test.tsx`, whose two
cases are "renders without throwing when unauthenticated" (:43) and "shows the sign-in-required
gate for anonymous visitors" (:52). Neither constructs a FREE or PRO session.

**What specifically is wrong.** Every assertion is a whole-file text match, so a comment containing
the pattern satisfies it, and a refactor that preserves the matched text while changing what is
rendered (for instance, computing `entitlements` correctly and then rendering from a second,
ungated query) passes. CLAUDE.md rule 3 says paywall enforcement is server-side only; the primary
server-rendered member surface has no test that observes an actual FREE payload.

**Why it matters.** The regex suite reads as coverage of the dashboard paywall in the test list. It
is coverage of the dashboard's spelling.

**Proposed fix.** Add an executed test for `app/dashboard/page.tsx` in the pattern already used and
proven by `audit-route-paywall.test.ts` (mock `auth` and `getUserEntitlements`, mock `@sports/db`,
invoke the server component, assert the rendered output). Assert that a FREE viewer's render
contains no confidence readout and at most `dailyPickLimit` rows, and that a PRO viewer's does.
Keep the regexes as a cheap secondary tripwire.

**Risk of fix.** Low, test-only, but writing a server-component render test for this page is real
work; scope it as its own ledger row rather than folding it into a test-cleanup pass.

---

### 9. MAJOR — the PAST_DUE grace-window test asserts the mock, not the subject

**Evidence** — `apps/web/__tests__/entitlements-enforcement.test.ts:98-107`

```ts
it("returns the paid tier for a PAST_DUE subscription inside the grace window", async () => {
  // The window itself is enforced by the DB filter; when the query
  // matches, the member keeps their paid tier.
  mocks.subscriptionFindFirst.mockResolvedValue({ tier: "PRO" });
  const ent = await getUserEntitlements("dunning_user");
  expect(ent.tier).toBe("PRO");
  expect(ent.canSeeConfidence).toBe(true);
});
```

`mocks.subscriptionFindFirst` is a `vi.fn` that ignores its `where` argument
(`entitlements-enforcement.test.ts:12-18`). The grace window lives entirely inside that `where`
(`apps/web/lib/entitlements.ts:76-82`, `status: "PAST_DUE", pastDueSince: { gte: graceCutoff }`).

**What specifically is wrong.** The test is byte-for-byte the same experiment as
"returns PRO entitlements for an active PRO subscription" (:32-42): mock returns `{tier:"PRO"}`,
assert PRO. Nothing about dunning is exercised. Its own comment states the enforcement is elsewhere.
The preceding test (:70-96) does the real work by asserting the shape of the `where` argument and
the cutoff timestamp, which is the correct approach here; this one adds a title that implies
behavioural coverage it does not have.

Related and genuinely uncovered: `pastDueSince: { gte: cutoff }` excluding a NULL
`pastDueSince` row is a Postgres semantic that no test in the repo executes. There is no
integration test for entitlements (`checkout-attempt-db.integration.test.ts` and
`actor-hardening-db.integration.test.ts` are the only `.integration.test.ts` files and neither
touches `subscription`).

**Why it matters.** A member in dunning past the grace window keeping paid access, or a member
inside it losing it, are both money-path defects, and the test named for that behaviour would not
notice either.

**Proposed fix.** Delete or rename this test so it stops claiming grace-window coverage, and cover
the window where it is enforceable: either extend the existing `where`-shape assertion to also pin
that a PAST_DUE clause without `pastDueSince` is never emitted, or add a DB integration case
alongside `checkout-attempt-db.integration.test.ts` inserting three subscription rows (ACTIVE,
PAST_DUE inside the window, PAST_DUE outside it, PAST_DUE with null anchor) and asserting which
resolve to a paid tier.

**Risk of fix.** Low for the rename. The integration case needs a disposable database
(`npm run db:disposable` exists) and should be its own ledger row.

---

### 10. MINOR — `invoice.paid` is handled but never tested

**Evidence** — `apps/web/app/api/webhooks/stripe/route.ts:205-215`

```ts
case "invoice.paid":
case "invoice.payment_succeeded": {
```

```bash
$ grep -n "invoice.paid" apps/web/__tests__/stripe-webhook-route.test.ts
(no output)
```

The suite covers `invoice.payment_succeeded` (`stripe-webhook-route.test.ts:1052`),
`invoice.payment_failed` (:1064), `invoice.payment_action_required` (:1146) and the
no-subscription case (:1160), but never the `invoice.paid` alias.

**What specifically is wrong.** Removing the `case "invoice.paid":` label leaves the suite green.
On Stripe accounts that emit the newer alias instead of `payment_succeeded`, renewals would stop
syncing entitlement and the event would fall through to the `default: break`, acking 200. That is a
silent paid-member downgrade at the next period boundary, with no failing test and no error log.

**Why it matters.** Low likelihood (the code comment says both are handled precisely because
Dashboard can enable either), but the failure mode is silent and on the money path.

**Proposed fix.** Duplicate the `payment_succeeded` case at :1052 with `type: "invoice.paid"`, or
convert it to an `it.each(["invoice.paid", "invoice.payment_succeeded"])`.

**Risk of fix.** None. Test-only, three lines.

---

### 11. MINOR — vacuous `.every()` and `indexOf()` assertions elsewhere (pattern, not yet a live defect)

These are the same two shapes as Findings 1, 4 and 7, found by the sweeps above. I checked each and
none is currently passing for the wrong reason, but each is one refactor away from Finding 1.

- `apps/web/__tests__/get-slate-twin-paywall.test.ts:128,136,142,157,167,178` — paywall redaction is
  asserted as `game.confidence.every((c) => c === 0)` with no length guard. An empty `confidence`
  array satisfies **both** the FREE "redacted to zero" assertions and the PRO "carries the real
  value" assertion at :157, so the two would stop distinguishing FREE from PRO. Length is pinned
  only in a different file (`apps/web/lib/slate-twin/demo-slate.test.ts:20`,
  `expect(g.confidence.length).toBe(TIMELINE.length)`), which this suite does not depend on.
  Fix: add `expect(freeGame!.confidence.length).toBeGreaterThan(0)` once per block.
- `apps/web/__tests__/board-gate-consumer.test.ts:96` —
  `expect(nfl.every((o) => o.code !== "INSUFFICIENT_CALIBRATION")).toBe(true)` is vacuous if the
  `nfl` filter at :93 yields `[]`. Partly covered by the `uncalibratedStrata` equality at :97.
- `apps/web/__tests__/states-matrix-slice.test.ts:58` —
  `expect(clv.indexOf("policyUnreachable ?")).toBeLessThan(clv.indexOf("ClvGatedState"))`. The
  string exists today (`apps/web/app/clv/page.tsx:93`, `{policyUnreachable ? (`), but the guard
  above it asserts only the bare identifier, not the ternary form, so converting the ternary to an
  `if` makes the ordering assertion pass on `-1`.

**Proposed fix.** A single mechanical pass: any `expect(x.indexOf(s)).toBeLessThan(...)` gains a
preceding `expect(x.indexOf(s)).toBeGreaterThan(-1)`; any `expect(arr.every(...)).toBe(true)` used
as a safety assertion gains `expect(arr.length).toBeGreaterThan(0)`.

**Risk of fix.** Low, but do it one file at a time: adding the guards may reveal a second live
Finding-1 case, which is the point.

---

## Money path branch map — branches with no test at all

Legend: **covered** = an executed test asserts the branch's observable effect.
**uncovered** = no test enters the branch.

### Stripe webhook — `apps/web/app/api/webhooks/stripe/route.ts`

The strongest suite in the repo. `stripe-webhook-route.test.ts` (1636 lines, 60+ cases) mocks only
`@/lib/stripe` and `@sports/db` and asserts the exact Prisma write arguments the route produced,
which is subject behaviour, not mock behaviour. `tierFromPriceRef` is deliberately left unmocked so
price mapping is real.

| Branch | Site | Status |
|---|---|---|
| Missing signature header 400 | :15-17 | covered (:575) |
| `getStripe` throws `StripeConfigError` 503 | :27-35 | covered (:548) |
| `getStripe` throws a non-config error (rethrow) | :34 | **uncovered** |
| `constructEvent` failure 400, no verifier detail echoed | :46-51 | covered (:581) |
| Durable store unavailable 503, zero writes | :62-72 | covered (:607) |
| `requireDurableWriteStore` throws a non-typed error (rethrow) | :71 | **uncovered** |
| Idempotency skip on already-processed event | :75-80 | covered (:632) |
| Handler throws 500, event unrecorded | :83-88 | covered (:660) |
| P2002 conflict on record, ack 200 | :93-107 | covered (:669) |
| `isStripeEventIdConflict` string-`target` and no-`target` forms | :113-121 | **uncovered** (array form only) |
| `checkout.session.completed` with subscription | :127-155 | covered (:704) |
| ... without subscription | :146 | covered (:716) |
| `checkout.session.expired` | :158-168 | covered (:818) |
| `attemptLookupsForSession` returns `[]` (no metadata id and no session id) | :477-486, :502, :548 | **uncovered** |
| `customer.subscription.created` / `updated` re-retrieve | :170-184 | covered (:506, :532) |
| out-of-order resurrection guard | :603-615 | covered (:169, :201) |
| superseded-subscription guard, and the ACTIVE/TRIALING adoption exception | :634-651 | covered (:297, :320, :415) |
| `existing` read failure rethrow | :576-596 | covered (separate file, `stripe-sync-existing-read-failure.test.ts`) |
| grandfathering no-downgrade guard | :663-674 | covered (:938) |
| `customer.subscription.deleted` terminal revoke | :186-190 | covered (:1028) |
| `charge.refunded` log-only, partial, structural, transient, live-guard, enforce | :192-198, :331-476 | covered, extensively (:1236-1620) |
| `invoice.paid` alias | :206 | **uncovered** (Finding 10) |
| `invoice.payment_succeeded` | :207-215 | covered (:1052) |
| `invoice.payment_action_required` | :217-229 | covered (:1146) |
| `invoice.payment_failed` with CANCELED / INCOMPLETE exclusions | :231-278 | covered (:1064, :1095) |
| `syncSubscription` legacy `updateMany` fallback, `count === 0` warn | :773-778 | partly covered (:1005 covers the fallback; the `count === 0` warn is **uncovered**) |
| `mapStripeStatus` default fail-closed to INCOMPLETE | :798-806 | **uncovered** (unreachable today, closed union) |

### Entitlements — `apps/web/lib/entitlements.ts`, `apps/web/lib/api-entitlement.ts`

| Branch | Site | Status |
|---|---|---|
| `assertDevAdminDisabledInProd` throw / no-throw | entitlements.ts:31-40 | covered (`entitlements-dev-admin.test.ts:33-49`) |
| DEV_FAKE_ADMIN escalation, prod block, wrong-id block | :60-68 | covered (`entitlements-enforcement.test.ts:165-208`) |
| ACTIVE / TRIALING branch of the `where` OR | :76-79 | covered as a `where`-shape assertion only (:70-96); never executed against a DB |
| PAST_DUE inside the grace window | :80 | **effectively uncovered** (Finding 9) |
| PAST_DUE outside the window, and NULL `pastDueSince` | :80 | **uncovered** |
| P1001 fail-closed to FREE with an audible log | :86-93 | covered (:118) |
| Non-P1001 rethrow | :95 | covered (:128) |
| `requireEntitlement` pass / throw | :99-108 | covered (:141, :150) |
| `requirePremiumApi` 401 / 403 / PRO / ELITE / FANTASY-denied / lookup-throw / auth-throw | api-entitlement.ts:137 | covered (`api-entitlement.test.ts`, 7 cases) |
| `requirePremiumApiRateLimited` gate-before-limiter, per-user, per-endpoint | :154-181 | covered by real (unmocked) gate in `premium-analytics-rate-limit.test.ts:87-148` |
| `requireFantasyApi` | :193 | covered (`dfs-salaries.test.ts:95,106,117`) |
| `requireFantasyApiRateLimited` incl. 429 + Retry-After | :211 | covered (`api-entitlement.test.ts:95-166`) |
| `gate.userId` falsy short-circuit (documented unreachable) | :158, :216 | **uncovered** |

### Settlement — `packages/prediction-engine/src/settlement.ts`, `apps/web/lib/data-sources/free-settlement.ts`, `apps/web/lib/settlement/zero-sit-lane.ts`

The grading arithmetic and the zero-sit lane are the best-tested code I read. `settlement.test.ts`
(278 lines) covers SPREAD cover/push/underdog, MONEYLINE incl. soccer draws, TOTAL, home/away
symmetry, both name-collision inversion cases, `selectGradingLine` incl. the `0` case, and the
fail-loud throw. `settlement-zero-sit-lane.test.ts` (1243 lines, 40 cases) covers every RCA code,
both write orders, the rollback, the deadline, the caps and the idempotency.

| Branch | Site | Status |
|---|---|---|
| `calculatePickResult` all three pick types, all outcomes | settlement.ts:81-127 | covered |
| unsupported pickType throws | :121-126 | covered (:262) |
| `settlePendingPicks` city-only ambiguity hold | free-settlement.ts:621-635 | covered (zero-sit :752) |
| kickoff binding, own-fixture hold, multiple-finals hold | :651-712 | covered (zero-sit :786, :674) |
| postponed VOID | :715-726 | covered (zero-sit :1001) |
| DISPUTED hold, ORIENT_FAIL | :730-735 | covered (zero-sit :1001) |
| zero-sit VOID and STALE halves, every RCA code | zero-sit-lane.ts | covered |
| `persistFreeScores` ordering in the cycle | settle-picks route :147 | **effectively uncovered** (Finding 7) |
| `evaluateSettlementHealth` NO_DATA / HEALTHY / DEGRADED / CRITICAL / clamp | settlement-health.ts:65-110 | covered (`settlement-health.test.ts:18-56`) |
| `loadSettlementHealth` where-clause shape and sport scope | :139-170 | covered as argument assertions (:57, :87) |

### Publish gate — `apps/web/lib/ops/calibration-eligibility.ts`, `apps/web/lib/ops/calibration-publish-policy.ts`, `apps/web/lib/autonomy/revenue-ladder.ts`

| Branch | Site | Status |
|---|---|---|
| `settlementHealthy === false` | eligibility :105-107 | **uncovered** (Finding 2) |
| `canonicalSettled < minSettledForLearning` | :108-112 | **uncovered** |
| no metrics / `n <= 0` | :113-115 | covered (:20) |
| n / Brier / ECE / Murphy floor breaches | :116-128 | covered (:33, :76) |
| Brier missing / ECE missing / Murphy missing (null or non-finite) | :120, :122, :124 | **uncovered** (the tests always supply finite values) |
| streak accumulation, streak reset, GREEN at K | :131-142 | covered (:48, :62) |
| `resolveCalibrationPublishPolicy` full matrix | policy | covered (`calibration-eligibility.test.ts:88-207`, 7-case `it.each`) |
| revenue ladder "Settlement not healthy" blocker | ladder :93 | **uncovered** (Finding 6) |
| `canHonestlyMonetizePublicTrackRecord` settlement conjunct | :110 | **uncovered** (Finding 6) |
| ESTABLISHED / AUTHORITY blockers | :94-105 | partly covered (`revenue-ladder.test.ts`, 3 cases) |

### Selective filter — `apps/web/lib/calibration/selective-publish.ts`, `.../selective-publish-runtime.ts`

| Branch | Site | Status |
|---|---|---|
| `|p - 0.5| < delta` rejection | selective-publish.ts:69 | covered, but only tautologically in `selective-publish.test.ts:19` (Finding 4); genuinely covered in `env-flags-founding.test.ts:47-56` |
| `edge` threshold rejection | :70-75 | **uncovered** (Finding 3) |
| `marketP` null with a live edge threshold (signal-mode allowance) | :73-74 | **uncovered** |
| `minGroupRes` / `groupResMap` allowlist | :76-80 | **uncovered** |
| runtime enabled default ON, explicit `"false"` off | runtime :35-42 | covered (`proven-path-engine.test.ts:126-131`) |
| delta resolution precedence: env, then plan `selectiveRecommended.delta`, then `defaultDelta`, then 0.1 | runtime :57-62 | **uncovered** (only the env branch is exercised) |
| env-sourced pause group suppression | runtime :322 | covered (`env-flags-founding.test.ts:59-69`) |
| plan-sourced pause group suppression | runtime :63, :322 | **uncovered** (Finding 5) |
| durable-snap pause group suppression | runtime :63, :322 | **uncovered** (Finding 5) |
| `rankingP` preferred over `rankingScore` preferred over `confidence` | runtime :306-320 | partly covered (`confidence` and `rankingP` separately; the precedence when two are present is **uncovered**) |
| durable cache freshness, failure backoff, single-flight, supersede | runtime :103-265 | covered (`ops-durable-read-latch.test.ts`, 4 named properties) |
| `passesPublicSelectiveFilterAsync` inside the picks route | picks route :192 | **uncovered**: the only executed picks-route test (`market-implied-display.test.ts:128-131`) mocks it to `async () => true`, so no test observes the gate removing a row from a served payload |

---

## What I checked and found CORRECT

These deserve stating, because the dimension I was asked to audit is "false confidence", and
finding real confidence matters as much as finding fake confidence.

- **`stripe-webhook-route.test.ts`** is genuinely behavioural. It mocks the Stripe SDK and Prisma
  and then asserts the exact write arguments the route constructed, including full multi-event
  delivery chains (`:201` runs deleted, then a late payment_failed, then a stale ACTIVE updated,
  and asserts the member ends FREE). It leaves `tierFromPriceRef` unmocked so price-to-tier mapping
  is real. The `charge.refunded` block asserts not only that nothing was written but that zero
  Stripe API calls were made, with the mocks deliberately armed so an accidental call would show.
  This is the standard the rest of the repo should be measured against.
- **`packages/prediction-engine/src/__tests__/settlement.test.ts`** — pure functions, no mocks,
  both directions asserted, a home/away symmetry property test at :147, and two real
  name-collision inversion regressions at :177 and :212.
- **`settlement-zero-sit-lane.test.ts`** — 40 cases, each naming a specific refusal or a specific
  race, including transaction rollback and lock ordering.
- **`premium-analytics-rate-limit.test.ts`** — imports the real routes and the real
  `api-entitlement` module (mocking only `auth`, `getUserEntitlements`, and the data loaders), so
  `requirePremiumApiRateLimited` is genuinely exercised, including the gate-precedes-limiter
  property at :132 and :143.
- **The five `expect(true).toBe(true)` hits are not defects.** All five
  (`cockpit-link-usage.test.ts:49`, `jarvis-purity.test.ts:154`, `phone-number-policy.test.ts:60`,
  `policy-only-winrate.test.ts:72`, and the documented note in `env-flags-founding.test.ts:73`) sit
  after a `throw new Error(...)` on the failure path, so the assertion is a formality, not the test.
  Two of them additionally guard against an empty corpus
  (`phone-number-policy.test.ts:46`, `expect(TARGETS.length).toBeGreaterThan(20)`;
  `policy-only-winrate.test.ts:54`, `expect(ALL_FILES.length).toBeGreaterThan(50)`), which is
  exactly the guard Findings 1 and 4 are missing.
- **`env-flags-founding.test.ts:73-83`** carries an explicit note that the suite previously was
  `expect(true).toBe(true)` under a docstring claiming coverage of the dual-freshness rule, and that
  it has been replaced with real cases. That is the correct response to this class of defect and it
  is already precedent in this repo.
- **No snapshot tests exist** in `apps/web/__tests__` (`toMatchSnapshot` / `toMatchInlineSnapshot`:
  zero hits), so the "snapshot with no meaningful assertion" failure mode is absent by construction.
- **The two self-skipping scan suites are honest and currently active.**
  `snapshots-banned-phrases.test.ts:52` and `docs-adr.test.ts:30` use `it.skip` (visible in the
  runner output, not a silent pass), and both corpora are populated: 20 HTML snapshots under
  `reports/launch-night/snapshots/`, 9 files under `docs/adr/`.
- **`checkout-attempt-repair.test.ts`** (14 cases) asserts proof-of-absence semantics, a fast path,
  race handling and an owner-queue write failure. `stripe-mutation-guard-invariant.test.ts` asserts
  the shared property across all three mutation surfaces rather than re-testing each happy path.
- **`audit-route-paywall.test.ts`** executes the real route handler against four tier states and
  asserts field-level absence for anonymous and FREE. This is the pattern Finding 8 asks the
  dashboard to adopt, and it already exists in the repo.

---

## What I could not check and why

- **Mutation testing.** The definitive proof for "this test cannot fail" is to delete the guard and
  watch the suite stay green. I am read-only on source, so I did not do that. Findings 2, 3, 5, 6,
  7 and 10 rest on exhaustive greps showing no test supplies the input that enters the branch, plus
  reading the code. Finding 1 is the exception: it is proven empirically, because the string it
  asserts on is already absent and I ran the suite and watched it pass.
- **Prisma `where` semantics.** No database was available (`selective-publish.test.ts` logged
  `[@sports/db] stub Prisma client active (DATABASE_URL not set)`). Every assertion in the repo
  about a `where` clause is an assertion about the object handed to Prisma, not about the rows
  Postgres returns. So "PAST_DUE inside the grace window grants access" and "the data-quality floor
  excludes low-quality games" are unverified as database behaviour, everywhere, by everyone.
- **Coverage instrumentation.** I did not run the full suite or a coverage report; the branch map
  above is built by reading each function and grepping for the inputs that reach each branch, not
  from a coverage tool. Branches marked uncovered are ones where no test supplies the entering
  input; NOT VERIFIED that a coverage run would agree on line-level attribution.
- **Exhaustiveness of the 275 source-reading tests.** I sampled roughly 25 of them, weighted toward
  the money path and the honesty-boundary copy guards. The remaining ~250 were not individually
  audited. Given that the first money-path one I examined closely (Finding 1) was passing on a
  non-existent string, I would expect more of the same class in the unexamined set, but that is an
  expectation, NOT VERIFIED.
- **`packages/*` and `workers/*` beyond prediction-engine.** I read
  `packages/prediction-engine/src/settlement.ts` and its tests, and listed the package's 50+ test
  files, but did not audit `packages/data-ingestion`, `packages/ingestion-pipeline`,
  `packages/feature-store`, `packages/compliance`, `packages/crypto` or any `workers/*` suite.
- **CI wiring.** I did not verify which of these suites `.github/workflows/ci.yml` actually runs, or
  whether any are excluded from the `guardrails` job. A test that cannot fail and a test that is
  never run are different defects with the same effect, and I only measured the first.
- **Whether the `factorBreakdown.marketFairProb` plumbing works in production.** Finding 3
  establishes it is untested. The session-established fact that 89 per cent of published moneyline
  picks carry no `marketFairProb` came from prior work, not from anything I measured here.

---

## Suggested order of work

1. Finding 1 (one line, proven broken today, and check for siblings while you are in there).
2. Finding 2 (two test cases, guards the honesty boundary that is load-bearing right now).
3. Finding 7 (one line, and it touches the C-247 investigation surface).
4. Finding 6, Finding 10, Finding 5 (small, isolated test additions).
5. Finding 4 and Finding 3 (rewrite `selective-publish.test.ts` and add the edge-branch cases).
6. Finding 9 rename, then Finding 11 as a mechanical sweep.
7. Finding 8 as its own ledger row (a server-component render test is real work).

Nothing here proposes changing a threshold, a floor, a gate, an env flag, or a guard's power. Every
proposed change adds an assertion or corrects one that is inert. Where a test currently claims more
than it proves, the fix is to make the test do the work, never to delete the claim's subject.

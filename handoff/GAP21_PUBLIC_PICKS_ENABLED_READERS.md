# GAP-21 — Eight readers of `PUBLIC_PICKS_ENABLED`, two defaults, and the one decision

**Branch:** `audit/reconciliation-2026-10-20`
**Date:** 2026-10-21
**Gap:** `GAP-21` (CRITICAL) — *"The public-picks gate is never consulted at mint time; isPublished defaults true"*
**New:** `packages/prediction-engine/test/public-picks-enabled-readers.t21.spec.ts` (4 tests)

---

## 1. The measured table

`PUBLIC_PICKS_ENABLED` is read in **eight** places. Seven treat an **unset** variable as
OFF. One treats it as ON — and that one is the one that gates the live board.

| # | file:line | default when unset | what it gates |
|---|---|---|---|
| 1 | `packages/prediction-engine/src/platform-config.ts:166` | **ON** | **`/api/picks`, via `readiness.ts:134` `canExposePublicPicks`** |
| 2 | `packages/prediction-engine/src/honesty/commit-reveal.ts:35` | OFF | whether a public commitment is recorded at all |
| 3 | `apps/web/app/api/ops/public-surface-truth/route.ts:783` | OFF | the operator-facing surface-truth report |
| 4 | `apps/web/lib/cockpit/jarvis-data.ts:530` | OFF | the Jarvis cockpit panel |
| 5 | `apps/web/lib/data-sources/free-settlement-runner.ts:990` | OFF | the free settlement runner's view |
| 6 | `apps/web/app/api/cron/autonomy-cycle/route.ts:117` | OFF | the autonomy cycle cron |
| 7 | `apps/web/app/api/cron/health-alert/route.ts:209` | OFF | the health-alert cron |
| 8 | `apps/web/lib/product/board-surfaces.ts:58` | OFF | the product-board surface list |

Row 1: `parseBool(process.env["PUBLIC_PICKS_ENABLED"], true)`.
Every other row: `=== "true"`, `envTrue(...)`, `envFlag(...)`, or `truthy(...)` — all of
which return false for an absent variable.

**The two subsystems that matter most disagree with each other inside one process.** The
route that serves the board asks `platform-config` (ON when unset). The honesty module that
decides whether a public commitment exists asks its own parser (OFF when unset). Same
variable, same process, opposite answers.

## 2. Everything else in the repo already says the outlier is wrong

| source | what it says |
|---|---|
| `platform-config.ts`'s **own header** | *"Every gate defaults to the SAFEST option — explicit opt-in required for each. Phase 0 (default): ingest + score + internal admin only, **no public surface**."* |
| `.env.example` | `PUBLIC_PICKS_ENABLED="false"`, under *"Set PUBLIC_PICKS_ENABLED=true ONLY when:"* with a three-condition checklist |
| `docs/calibration-proposals/2026-08-25-edge-index-full-scale-v5.3.0.md:143` | *"the public board is behind `PUBLIC_PICKS_ENABLED` (default `false`, `packages/prediction-engine/src/platform-config.ts`)"* — **it cites the very file that says `true`** |
| `docs/ai/jarvis/JARVIS_OPERATOR_BRIEF.md:53` | *"picks stay internal until you open it"* |
| `apps/web/__tests__/public-picks-gate-parity.test.ts` | **deletes** the variable and asserts 503 — unset must be dark. **This test is RED.** |
| `apps/web/app/api/picks/daily-slate/route.ts:47-56` | *"Two public pick endpoints must not disagree about whether picks are public."* |

The **repository's own test** encodes the intended contract, and it is failing. That is the
single strongest piece of evidence, because it was written by the repo, about the repo, and
asserts the repo's own stated doctrine.

## 3. What live production actually does — measured, with the caveat stated

Measured against `https://www.galaxysportsedge.com` on 2026-10-21:

```
GET /api/picks                        -> 200   (5 real picks, 55 KB body)
GET /api/picks/daily-slate            -> 200
GET /api/ops/public-surface-truth     -> 200
  gates.canExposePublicPicks          -> true
  productBoards GSE_PICKS             -> live_public
  operatorHint                        -> "PUBLIC_PICKS ON — confirm eligibility GREEN + proof bar ..."
```

**THE CAVEAT THAT MATTERS.** The live deployment reports `sha 64f4df85b3799184c4c0a46a20d4a963d8cddabf`,
and `git merge-base --is-ancestor 64f4df85 audit/reconciliation-2026-10-20` **exits 1** — the
live SHA is **not** an ancestor of this branch. **So the live behaviour must not be
attributed to the code in this branch.** It is a property of the deployed commit, and the
deployed commit may differ from the local files in ways this audit did not diff.

**What the live reading does and does not establish.** The "PUBLIC_PICKS ON" hint comes from
row 8 — a **strict** parser. That hint can only be ON if the variable is **explicitly set in
the production environment**. So the live deployment is not relying on the `true` default; it
sets the variable. **That means flipping row 1's default to `false` would not change the
live deployment's behaviour** — it would change the behaviour of any environment where the
variable is *unset*.

**This narrows the blast radius to exactly the case the repo's own red test covers.**

**A second live finding, which corrects an earlier record.** The live `/api/picks` body was
searched for the NGS exposure the T15 work recorded:

```
CPOE 0   avgSeparation 0   avgYacAboveExpectation 0   avgAirYardsToSticks 0
nextGenStat 0   RYOE 0   aDOT 0   "sep " 0
```

**Zero.** The ten initial "NGS" hits were the substring inside `"STANDINGS"`. The live
`intelligence.why[]` strings are `Rest edge…`, `Calibrated P … vs market …`, `Availability
is material…`, and one `Shadow-only: 3 WEATHER_TRAVEL observation(s)…`. **The T15 NGS leak
is conditional, not currently live.** It is reachable in code, but it is not firing in
production today. The earlier record of it as a live exposure was overstated, and this
corrects that.

## 4. What was NOT changed, and why

**Row 1's default was not flipped.** It is the **owner's** call, for two reasons:

1. **It is a behavioural change to a live public surface.** `canExposePublicPicks` decides
   whether the public board is served. An unconfigured deployment that currently serves
   picks would go dark. The blast radius is now *known* (unset-variable environments only),
   but "should an unconfigured deployment serve a public board" is a product posture, not an
   audit finding.
2. **The repository already has a failing test that encodes the intended answer.** The right
   move is to make the failing test pass — which is a deliberate act with a visible
   consequence — not to have the audit make it silently.

The **second half** of GAP-21 — *"the public-picks gate is never consulted at mint time;
`isPublished` defaults true"* (`packages/db/prisma/schema.prisma:550`:
`isPublished Boolean @default(true)`; `canExposePublicPicks` appears **zero** times in
`packages/ingestion-pipeline/src/process-sport.ts`) — is **also not changed**, for the same
reason: it changes what gets published, not what gets reported.

## 5. What WAS added — a test that makes the divergence impossible to ignore

`packages/prediction-engine/test/public-picks-enabled-readers.t21.spec.ts`, 4 tests:

1. **every recorded reader still exists, at the recorded line, with the recorded default** —
   each entry is checked against the file's actual text with a pattern, so the table cannot
   silently become fiction;
2. **exactly one reader defaults to ON, and it is the one that gates `/api/picks`** — the
   shape of the divergence is pinned;
3. **no reader outside the table has been added** — a **ninth** reader fails CI;
4. **the docs the divergence contradicts are still in place** — so the conflict stays visible
   rather than being edited away.

**The mutation check — the test can go red.** Run against the real files, with the source
restored in a `finally` each time:

| mutation | result |
|---|---|
| baseline | **4 passed / 0 failed** |
| row 1's default flipped `true` → `false` | **3 passed / 1 failed** — *"must still default to ON when the var is unset"* |
| a **ninth** reader added in the direct-read form | **3 passed / 1 failed** — *"new PUBLIC_PICKS_ENABLED reader(s) found that are not in the table"* |

**A weakness the mutation check caught in the test itself.** The first version of the
ninth-reader scan looked for the two *helper call forms* (`envTrue(...)`, `envFlag(...)`) and
a `process.env[...]` read — but it required BOTH, so a ninth reader written in the direct
form `process.env["PUBLIC_PICKS_ENABLED"] === "true"` **passed CI**. The scan now asks the
honest question — *does the code read the variable, however it reads it* — across six
read-shapes. **That is the fourth time in this audit a test passed while the code it was
supposed to catch was wrong**, and the third time the mutation check found it.

## 6. The decision, in one line

**Should an environment where `PUBLIC_PICKS_ENABLED` is UNSET serve the public picks board?**

- **If NO** (the repo's own doctrine, its own test, its own `.env.example`, and 7 of 8 readers
  all say no): change `platform-config.ts:166` to
  `parseBool(process.env["PUBLIC_PICKS_ENABLED"], false)`, and the red test
  `public-picks-gate-parity.test.ts` goes green. **One line.**
- **If YES** (an unconfigured deployment should serve the board): then `platform-config.ts`
  is right, the other seven are wrong, and the fix is the other way — plus
  `public-picks-gate-parity.test.ts` should be corrected to assert 200 for an unset
  variable, and `.env.example`, the 2026-08-25 doc, and the `platform-config.ts` header
  should be updated to match. **Also one line, plus three documents.**

**Either way the test added here makes the answer visible in CI**, and the red
`public-picks-gate-parity` test is the thing to look at while deciding.

## 7. Verification

| check | result |
|---|---|
| `test/public-picks-enabled-readers.t21.spec.ts` | **4 passed / 0 failed** |
| mutation: row 1's default flipped | caught (1 failure) |
| mutation: a ninth reader added | caught (1 failure) |
| source restored after both mutations | verified byte-identical; `git status` clean |
| live `/api/picks`, `/api/picks/daily-slate`, `/api/ops/public-surface-truth` | **200 / 200 / 200** |
| live `gates.canExposePublicPicks` | **true** |
| live NGS markers in the `/api/picks` body | **0** |
| live SHA vs this branch | **not an ancestor** — live semantics not attributed to local code |

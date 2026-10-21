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

## 1b. THE FOUNDER ALREADY DECIDED THIS — the decision is RECORDED, and the code diverges from it

`docs/ops/OPEN_LEDGER.md` — the live operator ledger — says, verbatim:

```
- Explicit YES only: LIVE_BOARD · PUBLISH_LEDGER · public picks ladder · Phase C · #226
```

and, under **Law enforcement log**:

```
- 2026-07-30: `PERFORMANCE_STATS_ENABLED` true → false. `PUBLIC_PICKS_ENABLED` true → false.
  Both were live in violation of founder law.
```

**This is not an open product question.** The founder's law is **"Explicit YES only"**, and
`PUBLIC_PICKS_ENABLED` was flipped `true → false` on 2026-07-30 *as a law-enforcement action*,
because the flag being on was itself a violation. **The correct default for an UNSET
variable is therefore OFF — it is what the founder decided, and it is what
`platform-config.ts:166` does not do.**

**So the defect is not "one reader disagrees with seven".** It is: **the one reader that
gates the live board contradicts a recorded founder decision, and it is the only reader
whose default says "yes" when nobody said anything.**

### The production reading, against that law

Live on 2026-10-21: `canExposePublicPicks = true`, `GSE_PICKS` is `live_public`, `/api/picks`
returns **200 with 5 real picks**, and the operator hint reads *"PUBLIC_PICKS ON"*.

That hint comes from `board-surfaces.ts:58` —
`truthy(env["PUBLIC_PICKS"]) || truthy(env["PUBLIC_PICKS_ENABLED"])` — which is a **strict**
reader. So **one of the two variable names is truthy in production.** Which one is not
observable from outside the deployment.

**The two possibilities, and why the second one is the dangerous one:**

- **`PUBLIC_PICKS_ENABLED` is truthy.** Then the founder's 2026-07-30 flip has been
  *undone* — an environment change, not a code change. The default is not implicated.
- **`PUBLIC_PICKS` (the SHORT name) is truthy, and `PUBLIC_PICKS_ENABLED` is UNSET.** Then
  `board-surfaces.ts` sees the short name and says ON, while `platform-config.ts:166` sees
  `PUBLIC_PICKS_ENABLED` **unset** and falls back to its `true` default — **and the board
  stays on because nobody set the founder's variable at all.**

**The second case is the founder's law being violated by the DEFAULT, and it is exactly the
failure the 2026-07-30 enforcement entry was written to stop.** `board-surfaces.ts` reads a
*different variable name* than `platform-config.ts` does, so the two can disagree about the
same decision — which is the same class of bug as the eight-reader divergence itself, one
level up.

**This cannot be settled from outside the deployment.** It is settled by reading the
production environment's two variables. **That is the one command the next agent needs to
run**, and §6 gives it.

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

## 4. What was NOT changed, and why — CORRECTED

**An earlier version of this record said the default was "the owner's call". That was
wrong, and §1b is the correction.** The founder's law is **recorded**: *"Explicit YES only"*, and
`PUBLIC_PICKS_ENABLED` was flipped `true → false` on 2026-07-30 *as a law-enforcement action*.
**The default for an unset variable is OFF — that is the decision that was made, and
`platform-config.ts:166` does not implement it.**

**So this is not a posture question, and it is not the audit's to decide.** But it is still
not flipped *here*, for one reason that is about **verification, not permission**:

**The audit cannot observe the production environment's two variable names.** Live shows
`canExposePublicPicks = true`; the "PUBLIC_PICKS ON" hint proves one of
`PUBLIC_PICKS` / `PUBLIC_PICKS_ENABLED` is truthy; **which one is not observable from
outside the deployment.** If it is the *short* name, then flipping the default is exactly
the fix — the founder's variable is unset, the default kept the board on, and the default is
the bug. If it is the *long* name, then the founder's 2026-07-30 flip has been **undone by
an environment change**, and flipping the default would change nothing while masking the
real event.

**Those two cases need different responses, and only one of them is a code change.** So the
audit's job here is to make the case *unambiguous* and hand the next agent the one command
that settles it (§6) — not to guess.

**The second half of GAP-21** — *"the gate is never consulted at mint time; `isPublished`
defaults true"* (`packages/db/prisma/schema.prisma:550`; `canExposePublicPicks` appears
**zero** times in `packages/ingestion-pipeline/src/process-sport.ts`) — is **also not
changed**, for the same reason: it changes what gets **published**, and the founder's
recorded decision governs the *gate*, not the *mint path*. Mint-time consultation is a
**behavioural change to what the platform publishes**; it needs the same reading of the law,
applied to a second surface, by the same person who wrote the ledger.

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

## 6b. THE ONE COMMAND THAT SETTLES IT

Read the production environment's two variables. One of them is truthy, and the founder's
law names only one of them.

```
# In the production environment (Vercel project env, or the deploy host):
printenv PUBLIC_PICKS_ENABLED PUBLIC_PICKS
```

**Then:**

| what it shows | what it means | what to do |
|---|---|---|
| `PUBLIC_PICKS_ENABLED=true` (and/or `PUBLIC_PICKS` unset) | the founder's 2026-07-30 flip has been **undone by an environment change** | **not a code bug.** Restore the founder's value: set `PUBLIC_PICKS_ENABLED=false` in the production env, per the ledger's law-enforcement entry. Do **not** change the default as a substitute. |
| `PUBLIC_PICKS_ENABLED` unset, `PUBLIC_PICKS=true` | **the founder's law is being violated by the DEFAULT**, and by the two-names-one-decision split | **the code fix:** `platform-config.ts:166` → `parseBool(process.env["PUBLIC_PICKS_ENABLED"], false)`, and reconcile `board-surfaces.ts:58` to read **one** name. Then unset `PUBLIC_PICKS` in the environment. |

**Either way the change is small and the reasoning is already done.** What was missing was
the *observation*, and this is it.

**The second half of the split — two variable names for one decision — is a defect
independent of the default.** `board-surfaces.ts` reads `PUBLIC_PICKS || PUBLIC_PICKS_ENABLED`;
every other reader reads `PUBLIC_PICKS_ENABLED` only. **A gate that can be opened by a
different variable than the one that governs it is not one gate.** Reconciling them to a
single name is correct in both cases above, and is safe in both.

---

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

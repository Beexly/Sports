# Hermes handoff v3 — 2026-08-18 (paste this whole file as the Hermes prompt)

Supersedes v1 and v2. You are running the AGENTS.md loop on branch
`claude/fable-5-ultracode-plan-ptru4e`. Read `AGENTS.md` first — all nine LAWS apply
unchanged. **Never push. Never `git add -A`. Never `--no-verify`. Never touch**
`.github/**`, `packages/db/prisma/**`, `scripts/guardrails/**`, `.env*`,
`package-lock.json`, `.claude/**`, `apps/web/lib/ai-control-plane/**`.

Five tasks, strict order. **H-1 decides the scope of everything after it — do not skip
ahead.** One task = one commit, staged by name, tagged `[hermes-<id>]`. Two attempts, then
`BLOCKED` with the exact error and move on.

```
|| H-1 | CLV + pick-universe data census (read-only)  | TODO | — | — |
|| H-2 | modelProb provenance trace (read-only)       | TODO | — | — |
|| H-3 | fix isotonic PAV (unblocks P1-15 and CORP)   | TODO | — | — |
|| H-4 | Bernoulli e-process + null-simulation tests  | TODO | — | — |
|| H-5 | wire markClosingSnapshots behind existing flag| TODO | — | — |
```

---

## What changed since the last handoff (verified, do not re-derive)

**The gate is being retired.** The flat Brier 0.22 floor and the 3-consecutive-green streak
are founder-decided as unpassable-by-construction on this pick universe and are being
replaced by an anytime-valid e-process against the de-vigged closing line. You are **not**
implementing that replacement gate as a live gate — you are building the measurement parts
it needs. Do not touch the current gate either; it stays until the founder swaps it.

**The CLV infrastructure already exists and is dormant.** This is the important discovery
and it changes the plan. Verified in the schema and by grep:

| Piece | Status |
|---|---|
| `Pick.clvLockLine` / `clvLockPrice` | **Exists.** Captured once at pick creation, immutable. This is the half that can never be backfilled. |
| `Pick.clvCloseLine` / `clvClosePrice` / `clvValue` / `clvVerdict` / `clvCapturedAt` / `clvGradedAt` | Exist. Filled at settlement by `clv-capture.ts`. |
| `OddsLineSnapshot` (OPEN / INTERIM / CLOSE) | Model exists. Schema says **"INERT by default — gated by `LINE_ARCHIVE_ENABLED`"**. Grep finds that flag only in `line-archive.ts` and its tests. |
| `markClosingSnapshots` | Function exists and is unit-tested. Schema comment: **"that pass exists but is NOT wired into `settle-sport.ts` yet."** Grep confirms it is never called outside its own module and tests. |
| `GET /api/clv` | Returns **HTTP 503 "CLV is disabled by feature gate."** |

So there is nothing to design from scratch. There are switches that are off and one wire
that was never connected.

---

## Environment setup — run this once before H-1, so nothing later stalls

```bash
npm install                 # allowed: setup, and .npmrc supply-chain controls still apply
npm run db:generate         # allowed: prisma codegen, NOT a migration, touches no data
npm run typecheck           # expect 0 "error TS" lines
npm run lint                # expect exit 0
```

If `npm install` fails with an **unapproved-script error, that is the control working**
(LAW 7). Do NOT delete `.npmrc`, do NOT set `ignore-scripts`, do NOT run
`npm install-scripts approve`. Mark the task BLOCKED naming the package that wanted to run
code, and stop.

If `npm run typecheck` reports missing `@types/node`, missing `vitest/globals`, or a missing
Prisma client, the install or codegen did not complete — re-run both before concluding the
repo is broken. Those errors mean an unbuilt workspace, not real type errors.

**Database access for H-1:** read the connection string from the environment. Never search
for credentials, never read or edit `.env*` (LAW 3 and LAW 2). If no database URL is
available to you, mark H-1 BLOCKED with that exact fact and stop the whole run — H-2 through
H-5 are not worth doing without H-1's answer.

---

## Your working loop, in full

```
1. Open handoff/LEDGER.md
2. First task marked TODO → mark CLAIMED with the time
3. Do exactly that task, nothing else
4. Run its Definition of Done, exactly as written
5. Mark DONE or BLOCKED with ONE line of evidence
6. If it produced code, commit it (staged by name, tagged [hermes-<id>])
7. Go to 1
```

**Decision budget per task: 3 file reads · 2 command runs · ONE conclusion · then act.**
If you catch yourself writing "actually", "wait", or "let me reconsider" — stop. You already
have your answer. Execute it. The Definition of Done catches you if it was wrong, and that
is what the second attempt is for.

**Before any test repair, check precedent first** — it is both the answer and the evidence:

```bash
git grep -l "<the symbol or module the test needs>" -- "*.test.ts"
```

If another test already mocks what you need, copy that pattern.

**Context hygiene**, which is what keeps you alive across a long run: do not re-read a file
you already read this session; do not summarise progress unless you are about to be cut off;
ledger evidence is ONE line, not a paragraph; after each commit, forget that task completely
— it is recorded, move on.

**Verify block before every code commit** (H-3, H-4, H-5):

```bash
npm run typecheck 2>&1 | grep -c "error TS"   # must print 0
npm run lint                                   # exit 0
npx vitest run <this task's test file>         # green
```

---

## H-1 — CLV + pick-universe data census (READ-ONLY; no code changes at all)

**This is the highest-value task in the repo right now.** Everything downstream branches on
its answer. The database is **read-only** for this work: SELECT only, no writes, no
migrations, no schema changes.

Write `docs/ops/calibration/2026-08-18-clv-census.md` answering each of these with an
actual number from an actual query. Paste the query alongside each answer.

**A. The decisive question — can we grade CLV retroactively?**

Of the settled picks in `2026-06-18 … 2026-08-17`:

1. How many total? (expect ~1164 canonically settled — confirm or report what you get)
2. How many have **`clvLockLine` NOT NULL**?
3. How many have **`clvLockPrice` NOT NULL**?
4. How many have either one populated (the union — a pick has a lock line *or* a lock price
   depending on market type, not both)
5. How many already have `clvValue` / `clvVerdict` populated?

Report each as a count **and** a percentage of total. **If the union in (4) is high, we can
grade CLV on history we already own instead of waiting to accumulate it forward. That is
worth months.** If it is near zero, say so plainly — that is equally decisive and must not
be softened.

**B. The pick universe (this is Fable's Decision A evidence)**

6. Count and share by `market_type` — SPREAD vs MONEYLINE vs TOTAL vs anything else.
7. Count and share by `sport`.
8. Per `sport × market_type`: n, base rate ō (fraction of wins, excluding push/void), and
   count of push/void.

**C. The 472-vs-1164 mystery**

9. The live gate scores **n = 472** while `canonicalSettled` is **1164**. Find the code
   that narrows it and quote the filter with `path:line`. If you cannot find it, write
   `NOT FOUND` and list exactly where you looked. **Do not guess.**

**D. Line archive state**

10. Row count in `odds_line_snapshots`. Break down by `phase` (OPEN / INTERIM / CLOSE).
    A count of zero is the expected answer given the flag is off — confirm it rather than assume.
11. Row count in `odds` and `opening_lines`, and the min/max `fetchedAt` in `odds`.
    **This matters:** if `odds` holds dense pre-kickoff history, closing lines may be
    derivable retroactively even though the snapshot archive is empty. Report whether the
    time coverage looks dense enough to identify a last-pre-kickoff price per game+market.

**Definition of Done:** the file exists; every one of the 11 items has a real number or an
explicit `NOT FOUND`; every query is pasted; `git status --porcelain` shows only the new doc.

**If you cannot reach the database, mark H-1 `BLOCKED` with the exact connection error and
stop the entire run.** Do not proceed to H-2 through H-5 — they are only worth doing if this
question gets answered.

---

## H-2 — modelProb provenance (READ-ONLY)

Trace and record **what actually produces the probability the gate scores.** Not the field
name — the source.

Write `docs/ops/calibration/2026-08-18-modelprob-provenance.md` with `path:line` for each step:

1. Where is `modelProb` (or the equivalent scored probability) written on a Pick?
2. What computes that value? Follow it back to the origin. Specifically determine which of
   these it is:
   - a derivative of market odds (de-vigged implied probability, possibly shifted)
   - an LLM/Claude confidence output
   - a statistical model over game features
   - a heuristic or constant
3. Are raw and calibration-mapped probabilities stored separately, or does the map overwrite?
4. Which calibration map is applied, where is it fit, and is it fit **in-sample**?

**Why this matters, state it in the doc:** if `modelProb` is a market derivative or an LLM
confidence, then measured resolution ≈ 0 is the *expected* result, not a defect — you cannot
beat a market using only that market's own prices. That reframes the whole programme, so the
answer must be explicit, not hedged.

**Definition of Done:** all four answered with `path:line`; item 2 commits to one of the four
categories in plain words; no source file modified.

---

## H-3 — fix isotonic PAV (ledger P1-15, currently BLOCKED)

`P1-15` is BLOCKED as an "owner/algorithm decision" only because the correct output was never
established. **It is now established, so this is mechanical.**

`pava([0.9, 0.1, 0.2, 0.8], [1, 1, 1, 1])` currently returns a non-monotonic result. PAV has
exactly one correct answer here:

```
start        [0.9, 0.1, 0.2, 0.8]
0.9 > 0.1    pool        → [0.5, 0.5, 0.2, 0.8]
0.5 > 0.2    pool three  → [0.4, 0.4, 0.4, 0.8]
0.4 < 0.8    stop — non-decreasing
```

**Expected output: `[0.4, 0.4, 0.4, 0.8]`.** The existing test `returns nondecreasing block
means` is correct — **fix the algorithm, never the test** (LAW 9).

This is a prerequisite: CORP calibration scoring needs isotonic regression, and a broken PAV
silently corrupts every MCB/DSC number downstream.

Add to the existing test file:
- `pava([0.9,0.1,0.2,0.8],[1,1,1,1])` → `[0.4,0.4,0.4,0.8]` within 1e-9
- already-sorted input returned unchanged
- all-equal input unchanged
- **weighted** case: unequal weights pool to the *weighted* mean, not the arithmetic mean
- property test: output non-decreasing for 200 random inputs
- conservation: `Σ wᵢ·outᵢ === Σ wᵢ·inᵢ` within 1e-9

TypeScript strict, no `any`. **If the fix needs a public signature change, mark BLOCKED** —
that is a founder call. Update `P1-15` to DONE with the commit SHA.

---

## H-4 — Bernoulli e-process + null-simulation tests

Pure math, in the existing scoring package (find it first — if Brier/ECE/e-process helpers
already exist, extend rather than duplicate). **No DB access, no I/O, no product wiring, no
calls from app code, not connected to any gate.** A toolkit, nothing more.

Implement:

- `eStep(pHat, pMkt, y)` → the per-pick likelihood ratio
  `y === 1 ? pHat / pMkt : (1 − pHat) / (1 − pMkt)`
- `eProcess(pHat[], pMkt[], y[])` → cumulative `M_t = Π eStep`, returning the **full running
  series** and `supM = max(M_t)`, not just the final value. Ville's inequality is about the
  supremum over time, so the max is the number that matters.
- `mixtureEProcess(processes[])` → equal-weight mixture across groups:
  `M_mix,t = (1/K) Σ_k M_k,t`
- Work in **log space** internally and exponentiate at the end. A 1000-pick product of ratios
  underflows float64 otherwise, silently, and you will not notice.

**These are the acceptance criteria. They are not satisfiable by approximation:**

```
eStep(p, p, y)                    === 1 exactly, for any p and either y
eProcess with pHat === pMkt       M_t === 1 for all t
perfect prediction (pHat → y)     M_t strictly increasing
mixture of identical processes    === that process
log-space vs naive product        agree within 1e-9 for n = 50
n = 1000 all ratios ~1.01         no underflow, no Infinity, no NaN
```

**The null simulation is the real test — it is what proves the gate is honest:**

```
Draw pMkt ~ Uniform(0.2, 0.8). Set pHat = pMkt (a forecaster with NO skill).
Draw y ~ Bernoulli(pMkt). Run 1000 independent sequences of 1000 picks each.
Assert: the fraction of sequences where sup M_t >= 1/alpha is <= alpha,
        for alpha = 0.05 and alpha = 0.01 (allow binomial sampling slack).
```

That is Ville's inequality holding empirically. **If that assertion fails, the implementation
is wrong — do not adjust the threshold to make it pass.** Adjusting it deletes the guarantee.

Add a power sanity check (not a hard assert — record the number): with `pHat` set to a genuine
55% edge against a 50% market, report the median number of picks to reach `sup M ≥ 100`.
Expect roughly 900. This tells the founder how long real evidence takes to accumulate.

**Definition of Done:** `npx vitest run <the new test file>` all green including the null
simulation; `npm run typecheck` prints 0 `error TS`; `npm run lint` exits 0. Paste the median-
picks-to-100 number into the ledger evidence.

---

## H-5 — wire `markClosingSnapshots` into settle, behind the existing flag

The function exists and is tested. It is simply never called. Wire it into the settle path
so that when `LINE_ARCHIVE_ENABLED` is on, the last pre-kickoff row per (market, book, side)
gets re-tagged `CLOSE`.

**Hard constraints:**
- **Do NOT flip `LINE_ARCHIVE_ENABLED`.** It stays exactly as it is. Flipping an env flag is
  a founder action under LAW 3. You are connecting a wire, not throwing the switch.
- The call must be a **no-op when the flag is off** — same behavior as today, byte for byte.
- Settlement must **not fail** if the archive pass throws. Wrap it so a snapshot-tagging error
  is logged and swallowed; grading a pick is more important than tagging a line.
- Do not touch `packages/db/prisma/**`. No schema change is needed — the model already exists.

**Definition of Done:**
- A test proving the call is skipped entirely when `LINE_ARCHIVE_ENABLED` is unset.
- A test proving it is invoked when the flag is set.
- A test proving settlement still succeeds when `markClosingSnapshots` rejects.
- `npm run typecheck` → 0; `npm run lint` → exit 0; the settle test suite green.

If wiring it requires changing `settle-sport.ts`'s function signature or its transaction
boundary, **stop and mark BLOCKED** — that is an architecture change and a founder call.

---

## Absolute stops — founder decisions, not agent work

- **Do not touch the calibration gate**, its floors (0.22 / 0.05), the 3-streak, or any
  calibration map. H-4 builds a toolkit; it wires into nothing.
- **Do not flip any env flag or gate** — `LINE_ARCHIVE_ENABLED`, `PUBLIC_PICKS_ENABLED`,
  `PERFORMANCE_STATS_ENABLED`, `SEALED_ENGINE_ENABLED`, `PUBLISH_LEDGER`, `STATS_PUBLIC`,
  or any other.
- **Do not write to the database.** H-1 is SELECT-only. No migrations, no backfills — a
  retroactive CLV backfill may be the right next move, but it is the founder's call after
  reading H-1, not something to start because the census looked encouraging.
- **Do not change `orbit-unlock-smoke.mjs` expectations.** It asserts
  `settle-picks: "0 */3 * * *"` and `free-spine-health: "0 10 * * *"`; live config has
  `"20 * * * *"` and `"0 */2 * * *"`. Fixing it means weakening a guard or changing production
  schedules. **Report it, never touch it.**
- **Do not create `.github/workflows/quality.yml`.** That file caused the 8-violation halt.
- **Do not change model routing.** Default stays Laguna; GLM 5.2 is not fallback-eligible.

## CI is BACK — and here is the exact baseline you must not chase

The repository was switched to public on 2026-08-18. That restored GitHub Actions minutes
after four days of every run failing with no runner assigned. **Verified at 21:58 UTC:**
`runner_id: 1000031762`, real steps with real durations (checkout 5s, install 20s,
guardrails 15s). CI works again.

For the first time since 2026-08-14 we can see what actually fails. **This is the current
baseline on the sprint branch, from a real run:**

```
[guardrails] 24/26 passed in 14562ms
[guardrails] FAILED: ai-transport-import-boundary, api-v1-boundary
```

| Guardrail | Status | What you do about it |
|---|---|---|
| `api-v1-boundary` | FAIL — "API v1 route tree exists before promotion" (`apps/web/app/api/v1`) | **Pre-existing and expected.** `handoff/LEDGER.md`'s baseline already records it as an expected FAIL. Do not fix, do not touch. |
| `ai-transport-import-boundary` | FAIL | **New — not in the ledger's expected list.** Record it in the ledger with the exact error text. **Do not fix it:** it guards `apps/web/lib/ai-control-plane/**`, a NEVER-TOUCH path under LAW 2. Founder call. |
| `ai-council` | **PASS** (1314ms) | The ledger records this failing via a local `spawn npm ENOENT` quirk. It passes in CI — that was an environment artifact, not a defect. |
| `dependency-audit` | **PASS** (4702ms) | Same: the ledger's local failure does not reproduce in CI. |
| The other 22 | PASS | Keep them passing. |

**Two rules follow from this table:**

1. **Your change is only responsible for a *new* failure.** If `api-v1-boundary` or
   `ai-transport-import-boundary` is red, that is the pre-existing state — say so and move
   on. If anything in the passing 22 goes red, that is yours and you fix it.
2. **The ledger's `guards=22/25` baseline is stale** — measured locally, with two env-quirk
   failures, before a 26th guardrail existed. The real number is **24/26**. Update that
   baseline line in `handoff/LEDGER.md` as part of your first commit.

Never report a check as passing because it looks green — confirm a runner actually ran it.
A job that completes in 2–4 seconds with no logs did not run.

## When all five are DONE or BLOCKED

Stop. Do not invent follow-on work. Leave the branch unpushed. In the ledger evidence for
H-1, state in one line whether retroactive CLV grading is possible — that single answer
determines the next session's entire scope.

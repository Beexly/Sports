# Hermes handoff v4 — 2026-08-18 (paste this whole file as the Hermes prompt)

Supersedes v1, v2 and v3. Discard them.

You are running the AGENTS.md loop on branch `claude/fable-5-ultracode-plan-ptru4e`.
Read `AGENTS.md` first — all nine LAWS apply unchanged. **Never push. Never `git add -A`.
Never `--no-verify`. Never touch** `.github/**`, `packages/db/prisma/**`,
`scripts/guardrails/**`, `.env*`, `package-lock.json`, `.claude/**`,
`apps/web/lib/ai-control-plane/**`.

---

## CORRECTION to v3 — you were told to stop, and that was wrong

v3 said: *"If you cannot reach the database, mark H-1 BLOCKED and stop the entire run."*
You followed that correctly and it was **my error, not yours.** Only the census needs a
database. The PAV fix, the cron-matrix generator, and the e-process are pure code with no
database dependency and should have run regardless.

You did the right thing: H-1 BLOCKED with the exact connection error
(`Can't reach database server at 'localhost:5433'`), ledger baseline corrected from 22/25
to 24/26, committed as `[hermes-H-1]`, then stopped as instructed. Keep that judgment.

**Revised rule: only H-E below needs a database. Everything else runs now.**

---

## Already done — do NOT redo

A separate session completed the provider-error split on branch
`claude/ai-transport-boundary-errors` (commit `edd2d3d`, based on `main`):
`apps/web/lib/claude-api/provider-errors.ts` now defines the seven provider error classes;
the four provider modules re-export them; `jynx-errors.ts` imports from there. That took
`ai-transport-import-boundary` from **8 violations to 4**, with provider suites 22/22 green.

The remaining 4 are an **owner decision, not your work**:
- 3 × `jynx.ts` config predicates — cannot move cleanly (`vertexConfig` depends on
  `parseServiceAccountJson` from `providers/google-oauth`, so relocating creates a NEW
  violation; routing through the allowlisted `provider-dispatch` is circular because
  `provider-dispatch.ts:13` already imports from `jynx`)
- 1 × raw endpoint literal in `scripts/ops/smoke-free-lane.mjs`, which needs the
  guardrail's own `OPERATOR_SCRIPT_ALLOWLIST`

**Do not attempt either. Do not add anything to an allowlist. Do not edit
`scripts/guardrails/**`.** Treat `ai-transport-import-boundary` as a known-red guard.

---

## Verified CI baseline — what "green" means right now

The repo was made public on 2026-08-18, which restored Actions minutes after four days of
every run failing with no runner assigned. Confirmed at 21:58 UTC: `runner_id: 1000031762`,
real step durations.

```
[guardrails] 24/26 passed
FAILED: ai-transport-import-boundary, api-v1-boundary
```

| Guardrail | Status | Your action |
|---|---|---|
| `api-v1-boundary` | FAIL | Pre-existing, documented expected FAIL. Ignore. |
| `ai-transport-import-boundary` | FAIL (4 left) | Known-red, owner decision. Ignore. |
| The other 24 | PASS | **Keep them passing. A new red here is yours.** |

Also failing and NOT yours: the `Test, type-check, lint, Prisma` CI job fails on the sprint
branch independently of any docs change. If you want it, reproduce with `npm run test`
locally — but it is not a blocker for anything below.

---

## Environment setup — run once

```bash
npm install                 # allowed: setup. .npmrc supply-chain controls still apply
npm run db:generate         # allowed: prisma codegen, NOT a migration
npm run typecheck           # expect 0 "error TS"
npm run lint                # expect exit 0
```

If `npm install` fails with an **unapproved-script error, that is the control working**
(LAW 7). Do NOT delete `.npmrc`, set `ignore-scripts`, or run `npm install-scripts approve`.
Mark BLOCKED naming the package and stop that task only.

**Verify block before every code commit:**
```bash
npm run typecheck 2>&1 | grep -c "error TS"   # must print 0
npm run lint                                   # exit 0
npx vitest run <this task's test file>         # green
```

---

## Ledger rows — append these

```
|| H-A | fix isotonic PAV (unblocks P1-15 + CORP)     | TODO | — | — |
|| H-B | cron-matrix-from-vercel generator            | TODO | — | — |
|| H-C | Bernoulli e-process + null-simulation tests  | TODO | — | — |
|| H-D | wire markClosingSnapshots behind existing flag| TODO | — | — |
|| H-E | CLV + pick-universe census (NEEDS DATABASE)  | TODO | — | — |
|| H-F | DOC_DRIFT.md — stale-reference audit         | TODO | — | — |
```

Work them in order. **H-E is the only one that needs a database** — if no connection string
is available, mark it BLOCKED and continue to H-F. Do not stop the run.

---

## H-A — fix isotonic PAV (ledger P1-15, currently BLOCKED)

`P1-15` is BLOCKED as an "owner/algorithm decision" only because the correct output was
never established. **It is now established, so this is mechanical.**

`pava([0.9, 0.1, 0.2, 0.8], [1, 1, 1, 1])` returns a non-monotonic result. PAV has one
correct answer:

```
start        [0.9, 0.1, 0.2, 0.8]
0.9 > 0.1    pool       → [0.5, 0.5, 0.2, 0.8]
0.5 > 0.2    pool three → [0.4, 0.4, 0.4, 0.8]
0.4 < 0.8    stop — non-decreasing
```

**Expected output: `[0.4, 0.4, 0.4, 0.8]`.** The existing test `returns nondecreasing block
means` is correct — **fix the algorithm, never the test** (LAW 9).

Why it is first: CORP calibration scoring needs isotonic regression, and a broken PAV
silently corrupts every MCB/DSC number downstream. H-C depends on this being right.

Add to the existing test file:
- `pava([0.9,0.1,0.2,0.8],[1,1,1,1])` → `[0.4,0.4,0.4,0.8]` within 1e-9
- already-sorted input returned unchanged; all-equal input unchanged
- **weighted** case: unequal weights pool to the *weighted* mean, not the arithmetic mean
- property: output non-decreasing across 200 random inputs
- conservation: `Σ wᵢ·outᵢ === Σ wᵢ·inᵢ` within 1e-9

TypeScript strict, no `any`. **If the fix needs a public signature change, mark BLOCKED** —
founder call. Update `P1-15` to DONE with the commit SHA.

---

## H-B — write `scripts/ops/cron-matrix-from-vercel.mjs`

`docs/ops/CRON_MATRIX.md` documents this command; **the script does not exist.** Verify:
`find . -name "cron-matrix*" -not -path "*/node_modules/*"`

- Plain ESM `.mjs`, Node built-ins only, **no new dependencies**.
- Reads **`apps/web/vercel.json`** — Vercel reads crons only from the copy inside its Root
  Directory (`apps/web`); the repo-root copy is inert. Resolve from the script's own
  location (pattern: `scripts/ops/orbit-unlock-smoke.mjs:16`), never `process.cwd()`.
- Default: rewrite `docs/ops/CRON_MATRIX.generated.md` — every `crons` entry sorted by
  `path`, columns `Path | Schedule`, first line marking it generated.
- `--check`: regenerate in memory, compare to disk. Same → `cron matrix: in sync (N schedules)`,
  exit 0. Different/missing → print the difference, exit 1. **`--check` must never write.**
- Missing `apps/web/vercel.json` → exit 1 saying Vercel reads crons only from the Root
  Directory copy. **Never fall back to the root copy.**

**DoD** — and prove `--check` can actually fail:
```bash
node scripts/ops/cron-matrix-from-vercel.mjs           # writes, exit 0
node scripts/ops/cron-matrix-from-vercel.mjs --check   # exit 0
cp docs/ops/CRON_MATRIX.generated.md /tmp/m.bak
echo "| /api/cron/bogus | 0 0 * * * |" >> docs/ops/CRON_MATRIX.generated.md
node scripts/ops/cron-matrix-from-vercel.mjs --check   # MUST exit 1
cp /tmp/m.bak docs/ops/CRON_MATRIX.generated.md && rm /tmp/m.bak
```
Commit the script **and** the regenerated matrix.

---

## H-C — Bernoulli e-process + null-simulation tests

Pure math. Find the existing scoring package first — **if these already exist, extend rather
than duplicate.** No DB, no I/O, no product wiring, no gate connection. A toolkit only.

- `eStep(pHat, pMkt, y)` → `y === 1 ? pHat / pMkt : (1 − pHat) / (1 − pMkt)`
- `eProcess(pHat[], pMkt[], y[])` → cumulative `M_t = Π eStep`, returning the **full running
  series** and `supM = max(M_t)`. Ville's inequality is about the supremum over time, so the
  max is the number that matters — not the final value.
- `mixtureEProcess(processes[])` → `M_mix,t = (1/K) Σ_k M_k,t`
- Work in **log space** internally, exponentiate at the end. A 1000-pick product of ratios
  underflows float64 silently otherwise.

**Acceptance criteria — not satisfiable by approximation:**
```
eStep(p, p, y)                 === 1 exactly, any p, either y
pHat === pMkt                  M_t === 1 for all t
perfect prediction (pHat → y)  M_t strictly increasing
mixture of identical processes === that process
log-space vs naive product     agree within 1e-9 at n = 50
n = 1000, ratios ~1.01         no underflow, no Infinity, no NaN
```

**The null simulation is the real test — it is what makes the gate honest:**
```
Draw pMkt ~ Uniform(0.2, 0.8). Set pHat = pMkt (a forecaster with NO skill).
Draw y ~ Bernoulli(pMkt). Run 1000 sequences of 1000 picks each.
Assert: fraction of sequences where sup M_t >= 1/alpha is <= alpha,
        for alpha = 0.05 and 0.01 (allow binomial slack).
```
**If that assertion fails the implementation is wrong — do NOT adjust the threshold to make
it pass.** Adjusting it deletes the guarantee the test exists to provide.

Record (not assert): with `pHat` at a genuine 55% edge against a 50% market, the median
number of picks to reach `sup M ≥ 100`. Expect roughly 900. Put that number in the ledger —
it tells the founder how long real evidence takes to accumulate.

---

## H-D — wire `markClosingSnapshots` into settle, behind the existing flag

The function exists and is unit-tested; the schema comment says it is "NOT wired into
`settle-sport.ts` yet," and grep confirms it is never called outside its own module.

**Hard constraints:**
- **Do NOT flip `LINE_ARCHIVE_ENABLED`.** Flipping an env flag is a founder action (LAW 3).
  You are connecting a wire, not throwing the switch.
- Must be a **no-op when the flag is off** — today's behavior byte for byte.
- Settlement must **not fail** if the archive pass throws. Wrap it, log, swallow. Grading a
  pick matters more than tagging a line.
- Do not touch `packages/db/prisma/**`. No schema change is needed.

**DoD:** a test proving the call is skipped when the flag is unset; a test proving it is
invoked when set; a test proving settlement still succeeds when `markClosingSnapshots`
rejects; typecheck 0; lint exit 0; settle suite green.

If wiring needs a signature or transaction-boundary change in `settle-sport.ts`, **mark
BLOCKED** — architecture change, founder call.

---

## H-E — CLV + pick-universe census (READ-ONLY, NEEDS DATABASE)

**If no database connection string is available, mark BLOCKED with the exact error and go
to H-F. Do not stop the run.** Read the connection string from the environment — never
search for credentials, never read or edit `.env*` (LAWS 2 and 3).

SELECT only. No writes, no migrations, no backfills. Write
`docs/ops/calibration/2026-08-18-clv-census.md`, pasting each query beside its answer.

**A. The decisive question — can CLV be graded retroactively?**
Of settled picks in `2026-06-18 … 2026-08-17`:
1. total count (expect ~1164 canonically settled — confirm or report what you get)
2. how many have `clvLockLine` NOT NULL
3. how many have `clvLockPrice` NOT NULL
4. the union of (2) and (3) — a pick carries a lock line *or* a lock price by market type
5. how many already have `clvValue` / `clvVerdict` populated

Each as a count **and** a percentage. **A high union in (4) means CLV can be graded on
history already owned rather than accumulated forward — worth months.** Near zero is
equally decisive and must be reported plainly, not softened.

**B. Pick universe**
6. count and share by `market_type` (SPREAD / MONEYLINE / TOTAL / other)
7. count and share by `sport`
8. per `sport × market_type`: n, base rate ō (excluding push/void), push/void count

**C. The 472-vs-1164 gap**
9. The live gate scores **n = 472** while `canonicalSettled` is **1164**. Find the code that
   narrows it and quote the filter with `path:line`. If not found, write `NOT FOUND` and
   list where you looked. **Do not guess.**

**D. Line archive state**
10. row count in `odds_line_snapshots`, broken down by `phase`. Zero is the expected answer
    given the flag is off — confirm rather than assume.
11. row count in `odds` and `opening_lines`; min/max `fetchedAt` in `odds`. If `odds` holds
    dense pre-kickoff history, closing lines may be derivable retroactively even with an
    empty snapshot archive. Report whether coverage looks dense enough to identify a last
    pre-kickoff price per game+market.

**DoD:** every item has a real number or an explicit `NOT FOUND`; every query pasted;
`git status --porcelain` shows only the new doc.

---

## H-F — `DOC_DRIFT.md` (ledger P2-2), READ-ONLY

This session found repeated cases of documentation asserting things that are not true, and
each one cost real time. Produce a systematic map. Write `handoff/DOC_DRIFT.md`.

Known drift to include as seed entries, each already verified:
- `docs/ops/CRON_MATRIX.md` prescribes `scripts/ops/cron-matrix-from-vercel.mjs --check` for
  "CI / preflight" — **the script does not exist** (H-B fixes this).
- `handoff/LEDGER.md` baseline said `guards=22/25` with `ai-council` + `dependency-audit`
  failing — both **pass in CI**; the real number is 24/26 (you already corrected this).
- `docs/ops/CRON_MATRIX.md:7` names `vercel.json` as the schedule SoT without saying which
  copy; only `apps/web/vercel.json` is read by Vercel.

Then sweep `docs/ops/*.md` and `handoff/*.md` for: commands that reference scripts which do
not exist; file paths that do not resolve; npm scripts not in `package.json`; and env vars
referenced nowhere in code. For each: `path:line`, the claim, and what is actually true.

**Verification requirement:** every entry must be proved by a command you ran — `ls`,
`find`, `git grep` — and the command goes in the doc. **An unverified drift claim is itself
drift.** Do not include anything you did not check.

**DoD:** the file exists; every entry carries a `path:line` and a proving command; no source
file modified.

---

## Absolute stops — founder decisions, not agent work

- **Do not touch the calibration gate**, its floors (0.22 / 0.05), or the 3-streak. H-C
  builds a toolkit; it wires into nothing.
- **Do not flip any env flag or gate** — `LINE_ARCHIVE_ENABLED`, `PUBLIC_PICKS_ENABLED`,
  `PERFORMANCE_STATS_ENABLED`, `SEALED_ENGINE_ENABLED`, `PUBLISH_LEDGER`, `STATS_PUBLIC`,
  `JYNX_CLOUD_ORDER`, `CLAUDE_PROVIDER`, or any other.
- **Do not write to the database.** H-E is SELECT-only. A retroactive CLV backfill may well
  be the right next move — it is the founder's call after reading H-E, not something to
  start because the census looked encouraging.
- **Do not touch `scripts/guardrails/**` or add anything to an allowlist.**
- **Do not change `orbit-unlock-smoke.mjs` expectations.** It asserts
  `settle-picks: "0 */3 * * *"` and `free-spine-health: "0 10 * * *"`; live config has
  `"20 * * * *"` and `"0 */2 * * *"`. Fixing it means weakening a guard or changing
  production schedules. **Report it, never touch it.**
- **Do not create `.github/workflows/quality.yml`.** That file caused the 8-violation halt.
- **Do not change model routing.** Default stays Laguna; GLM 5.2 is not fallback-eligible.

## Cost context that constrains you

Azure credits are **expired** ($0.00 of $200) and the subscription is now pay-as-you-go.
Azure AI Foundry model inference is **not** among the 58 free services, so every Foundry
call bills a card. That does not change any task above, but it does mean: **never add an
LLM call to a code path, a test, or a script.** If a task seems to want one, mark it
BLOCKED and say so.

## When all six are DONE or BLOCKED

Stop. Do not invent follow-on work. Leave the branch unpushed. State in the H-E evidence
line, in one sentence, whether retroactive CLV grading is possible — that single answer
determines the next session's entire scope.

# Hermes handoff v5 — 2026-08-18 (paste this whole file as the Hermes prompt)

Supersedes v1–v4. Discard them.

You are running the AGENTS.md loop on branch `claude/fable-5-ultracode-plan-ptru4e`.
Read `AGENTS.md` first — all nine LAWS apply unchanged. **Never push. Never `git add -A`.
Never `--no-verify`. Never touch** `.github/**`, `packages/db/prisma/**`,
`scripts/guardrails/**`, `.env*`, `package-lock.json`, `.claude/**`,
`apps/web/lib/ai-control-plane/**`.

---

## STANDING POSTURE — this changed, read it

**You own all coding work now.** The founder is paying out of pocket for the Claude session
and must conserve it. That session is for reasoning, architecture, and decisions only.
Anything mechanical belongs to you, including work that used to get escalated:

- **CI triage is yours.** When a check fails, pull the log, determine whether the diff caused
  it, and record the answer. Do not escalate a red check without first establishing whether
  it is pre-existing. The method that works: identify which files the failing check actually
  reads, and compare against the files your commit touched. Zero overlap means it is not yours.
- **Verification is yours.** Never report a task DONE on the strength of a green CI badge.
  Run the DoD locally and paste the real output.
- **Escalate only** what the ABSOLUTE STOPS section reserves for the founder, or a genuine
  BLOCKED with the exact error text.

A BLOCKED task with an honest error costs nothing. A confidently wrong answer costs real
money. When those two conflict, choose BLOCKED.

---

## Known-red checks — do NOT chase these

Verified 2026-08-18 with real runners (CI works again; the repo went public, which restored
Actions minutes after four days of every run failing with no runner assigned).

| Check | Status | Action |
|---|---|---|
| `api-v1-boundary` | pre-existing | Ignore. Documented expected FAIL. |
| `ai-transport-import-boundary` | 4 violations left | Ignore. Owner decision; see below. |
| `Model freeze (MODEL_VERSION)` | fails on `main` only | Ignore. `docs/calibration-proposals/2026-08-10-closeout-v5.2.6.md` exists on THIS branch and was never merged to `main`. Nothing to author. |
| `Test, type-check, lint, Prisma` | pre-existing on both branches | Ignore unless your change makes it worse. |
| everything else | PASS | **A new red here is yours.** |

`ai-transport-import-boundary` remainder: 3 × `jynx.ts` config predicates + 1 raw endpoint
literal in `scripts/ops/smoke-free-lane.mjs`. A separate session already moved the seven
error classes out (commit `edd2d3d`, PR #433, 8 → 4). **Do not attempt the rest. Do not add
anything to an allowlist. Do not edit `scripts/guardrails/**`.**

---

## Environment setup + the gotcha that will waste your time

```bash
npm install                 # allowed: setup. .npmrc supply-chain controls still apply
npm run db:generate         # allowed: prisma codegen, NOT a migration
npm run typecheck           # expect 0 "error TS"
npm run lint                # expect exit 0
```

**THE GOTCHA — read before you run any test.** Tests must run through their workspace
config. A bare `npx vitest` from the repo root bypasses `apps/web/vitest.config.ts`, and
every `@/…` import fails to resolve with `Failed to load url @/lib/...`. That looks like a
real breakage and is not one. Use:

```bash
npm run test                                    # correct: --workspaces --if-present
cd apps/web && npx vitest run --config vitest.config.ts <file>   # correct for one file
```

This already cost one session a false alarm. Do not repeat it.

If `npm install` fails with an **unapproved-script error, that is the control working**
(LAW 7). Do NOT delete `.npmrc`, set `ignore-scripts`, or run `npm install-scripts approve`.
Mark BLOCKED naming the package; continue to the next task.

**Verify block before every code commit:**
```bash
npm run typecheck 2>&1 | grep -c "error TS"   # must print 0
npm run lint                                   # exit 0
npx vitest run <this task's test file>         # green, via workspace config
```

---

## Ledger rows

```
|| H-E | CLV + pick-universe census (RUN THIS FIRST)   | TODO | — | — |
|| H-A | fix isotonic PAV (unblocks P1-15 + CORP)      | TODO | — | — |
|| H-B | cron-matrix-from-vercel generator             | TODO | — | — |
|| H-C | Bernoulli e-process + null-simulation tests   | TODO | — | — |
|| H-G | suppression curve vs random + oracle baseline | TODO | — | — |
|| H-D | wire markClosingSnapshots behind existing flag | TODO | — | — |
|| H-F | DOC_DRIFT.md — stale-reference audit          | TODO | — | — |
```

**H-E RUNS FIRST.** A read-only role (`hermes_ro`) now exists and the connection string is
in your environment. H-E's answer sets the scope of everything after it, and its step-E
export is the input H-G needs, so running it first removes a dependency rather than adding one.

Sanity-check the connection before anything else:

```bash
psql "$DATABASE_URL" -c "select current_user, current_database();"
```

Expect `hermes_ro`. If it reports any other role, **stop and mark H-E BLOCKED** — you have
been handed a writable credential and must not use it. Neon requires `sslmode=require`; a
connection string missing it will be rejected, which is a configuration problem to report,
not to work around.

**If the database is unreachable, mark H-E BLOCKED with the exact error and continue to H-A.**
Everything except H-E, and the final run of H-G, works without a database. Do not stop the run.

---

## H-E — CLV + pick-universe census (READ-ONLY) — **DO THIS FIRST**

SELECT only. Read the connection string from the environment — never search for credentials,
never read or edit `.env*` (LAWS 2 and 3). Expect a read-only role, so writes will fail at the
database level by design. Write `docs/ops/calibration/2026-08-18-clv-census.md`, pasting each
query beside its answer.

**A. The decisive question — can CLV be graded retroactively?** Of settled picks in
`2026-06-18 … 2026-08-17`: total count; how many have `clvLockLine` NOT NULL; how many have
`clvLockPrice` NOT NULL; the union of those two; how many already have `clvValue`/`clvVerdict`.
Counts **and** percentages. A high union means CLV can be graded on history already owned
rather than accumulated forward — worth months. Near zero is equally decisive; report it
plainly.

**B. Pick universe.** Count and share by `market_type` and by `sport`; per `sport × market_type`:
n, base rate ō excluding push/void, and push/void count. **H-G needs this.**

**C. The 472-vs-1164 gap.** The live gate scores n = 472 while `canonicalSettled` is 1164.
Find the code that narrows it and quote the filter with `path:line`. Not found → `NOT FOUND`
plus where you looked. **Do not guess.**

**D. Line archive.** Row count in `odds_line_snapshots` by `phase` (zero is expected — confirm,
don't assume). Row counts in `odds` and `opening_lines`, and min/max `fetchedAt` in `odds`;
report whether coverage is dense enough to identify a last pre-kickoff price per game+market.

**E. The export H-G needs.** Write `(pick_id, sport, market_type, model_version, modelProb,
outcome, settledAt, pause_group, suppressed)` for the window to a CSV under `docs/ops/calibration/`.
Exclude push/void from scoring and report their counts separately.

---

---

## H-A — fix isotonic PAV (ledger P1-15, currently BLOCKED)

`P1-15` sits BLOCKED as an "owner/algorithm decision" only because the correct output was
never established. **It is now established, so this is mechanical.**

`pava([0.9, 0.1, 0.2, 0.8], [1, 1, 1, 1])` returns a non-monotonic result. PAV has exactly
one correct answer:

```
start        [0.9, 0.1, 0.2, 0.8]
0.9 > 0.1    pool       → [0.5, 0.5, 0.2, 0.8]
0.5 > 0.2    pool three → [0.4, 0.4, 0.4, 0.8]
0.4 < 0.8    stop — non-decreasing
```

**Expected output: `[0.4, 0.4, 0.4, 0.8]`.** The existing test `returns nondecreasing block
means` is correct — **fix the algorithm, never the test** (LAW 9).

First because CORP calibration scoring needs isotonic regression, and a broken PAV silently
corrupts every MCB/DSC number downstream. H-C and H-G both depend on this being right.

Add: the case above within 1e-9; already-sorted input unchanged; all-equal unchanged; a
**weighted** case pooling to the weighted (not arithmetic) mean; a property test that output
is non-decreasing across 200 random inputs; and conservation `Σ wᵢ·outᵢ === Σ wᵢ·inᵢ` within
1e-9. TS strict, no `any`. **Signature change needed → BLOCKED** (founder call). Update
`P1-15` to DONE with the SHA.

---

## H-B — write `scripts/ops/cron-matrix-from-vercel.mjs`

`docs/ops/CRON_MATRIX.md` documents this command; **the script does not exist.**

- Plain ESM `.mjs`, Node built-ins only, **no new dependencies**.
- Reads **`apps/web/vercel.json`** — Vercel reads crons only from the copy inside its Root
  Directory (`apps/web`); the repo-root copy is inert. Resolve from the script's own location
  (see `scripts/ops/orbit-unlock-smoke.mjs:16`), never `process.cwd()`.
- Default: rewrite `docs/ops/CRON_MATRIX.generated.md` — every `crons` entry sorted by `path`,
  columns `Path | Schedule`, first line marking it generated.
- `--check`: regenerate in memory, compare to disk. Same → `cron matrix: in sync (N schedules)`,
  exit 0. Different/missing → print the difference, exit 1. **`--check` must never write.**
- Missing `apps/web/vercel.json` → exit 1 saying Vercel reads crons only from the Root
  Directory copy. **Never fall back to the root copy.**

**DoD — and prove `--check` can actually fail:**
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

Pure math, in the existing scoring package. **Find it first — if these exist, extend rather
than duplicate.** No DB, no I/O, no product wiring, no gate connection.

- `eStep(pHat, pMkt, y)` → `y === 1 ? pHat / pMkt : (1 − pHat) / (1 − pMkt)`
- `eProcess(pHat[], pMkt[], y[])` → cumulative `M_t = Π eStep`, returning the **full running
  series** and `supM = max(M_t)`. Ville's inequality is about the supremum over time; the max
  is the number that matters, not the final value.
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

**The null simulation is the real test:**
```
Draw pMkt ~ Uniform(0.2, 0.8). Set pHat = pMkt (a forecaster with NO skill).
Draw y ~ Bernoulli(pMkt). Run 1000 sequences of 1000 picks each.
Assert: fraction of sequences where sup M_t >= 1/alpha is <= alpha,
        for alpha = 0.05 and 0.01 (allow binomial slack).
```
**If that fails the implementation is wrong — do NOT adjust the threshold to make it pass.**
That deletes the guarantee the test exists to provide.

Record in the ledger (not an assert): with `pHat` at a genuine 55% edge against a 50% market,
the median picks to reach `sup M ≥ 100`. Expect ~900.

---

## H-G — suppression curve vs random and oracle baselines

**This is the highest-value new work. Read the reasoning before coding — it is the point.**

### Why this exists

GSE pauses ranking groups (`rankingPauseApply`, currently 2 groups) and runs `selectiveRuntime`
at delta 0.15, then measures accuracy on what survives. That has the same unfalsifiability
problem as a cost-router reporting "we cut spend 90%":

> Accuracy measured on surviving picks is a property of your **suppression rate**, not of
> your **suppression policy**.

Remove picks and the number moves. A policy with real judgement and a coin flip both move it.
The published record is therefore not currently evidence of anything, which is a direct
problem for a product whose premise is proving accuracy rather than claiming it.

### The critical detail — get the baseline right

**First determine the semantics from the code, and say which you found:**

- **DROP semantics** — paused picks are simply not published. Then removing a *random* subset
  leaves expected accuracy **unchanged**, so the random baseline is a **FLAT line** at the
  unfiltered value. Your policy must rise above flat.
- **FALLBACK semantics** — paused picks fall back to another signal (e.g. the market). Then
  the random baseline is a **straight line** between model-only and fallback-only, exactly
  like a router's deferral curve.

These give different answers. **Do not assume — read `rankingPauseApply` / `selectiveRuntime`
and report which applies with `path:line`.** If both exist in different places, report both.

The **oracle** baseline is the same either way: suppress exactly the picks that lost. That is
the unreachable ceiling; it exists to bound the chart, not to be beaten.

### What to build

Pure functions, no DB, no I/O, in the existing scoring package:

- `curveAtRates(scores[], outcomes[], rates[], policy)` → for each suppression rate `f`,
  accuracy and Brier on the surviving picks
- `randomBaseline(outcomes[], rates[], draws)` → mean and a 2.5/97.5 percentile band over
  `draws` random suppressions at each rate (use 1000 draws; it is arithmetic over boolean
  vectors and costs nothing)
- `oracleBaseline(outcomes[], rates[])` → suppress losers first
- `curveGap(policy, random)` → the area between them; this single number is what the policy
  actually bought

**Acceptance criteria — these cannot be satisfied by a broken implementation:**
```
at f = 0, all three curves === the unfiltered value, exactly
a RANDOM policy fed in as `policy`  → lands inside the random band at every rate
                                       (DROP case: its fitted slope CI contains 0)
an ORACLE policy fed in as `policy` → matches oracleBaseline exactly
oracle >= random >= 0 at every rate
suppressing 100% → explicit defined behavior, not NaN or a crash
the random band must CONTAIN its own mean at every rate
```

Seed the RNG so runs are reproducible, and say what the seed is.

### Then run it

Once H-E's export exists, run the real policy against the real 1164 graded picks and write
`docs/ops/calibration/2026-08-18-suppression-curve.md`: the table of rates, the gap number,
and a plain-language sentence saying whether the pause policy beat random. **If it did not,
say so plainly.** That is the most valuable possible result and must not be softened.

**DoD:** all acceptance criteria green via the workspace vitest config; typecheck 0; lint 0.
The synthetic tests run today — they do not wait for the database.

---

## H-D — wire `markClosingSnapshots` into settle, behind the existing flag

The function exists and is unit-tested; the schema comment says it is "NOT wired into
`settle-sport.ts` yet," and grep confirms it is never called outside its own module.

- **Do NOT flip `LINE_ARCHIVE_ENABLED`.** Flipping an env flag is a founder action (LAW 3).
  You are connecting a wire, not throwing the switch.
- Must be a **no-op when the flag is off** — today's behavior byte for byte.
- Settlement must **not fail** if the archive pass throws. Wrap, log, swallow. Grading a pick
  matters more than tagging a line.
- No schema change; do not touch `packages/db/prisma/**`.

**DoD:** a test proving it is skipped when the flag is unset; one proving it is invoked when
set; one proving settlement still succeeds when `markClosingSnapshots` rejects; typecheck 0;
lint 0; settle suite green. Signature or transaction-boundary change needed → **BLOCKED**.

---

## H-F — `DOC_DRIFT.md` (ledger P2-2), READ-ONLY

Write `handoff/DOC_DRIFT.md`. Seed entries, each already verified:

- `docs/ops/CRON_MATRIX.md` prescribes `scripts/ops/cron-matrix-from-vercel.mjs --check` for
  "CI / preflight" — the script does not exist (H-B fixes this).
- `handoff/LEDGER.md` baseline said `guards=22/25` with `ai-council` + `dependency-audit`
  failing; both **pass in CI**. Real number 24/26. (Already corrected — record the drift.)
- `docs/ops/CRON_MATRIX.md:7` names `vercel.json` as schedule SoT without saying which copy;
  only `apps/web/vercel.json` is read by Vercel.

Then sweep `docs/ops/*.md` and `handoff/*.md` for: commands referencing scripts that do not
exist; file paths that do not resolve; npm scripts absent from `package.json`; env vars
referenced nowhere in code.

**Every entry must be proved by a command you ran, and the command goes in the doc. An
unverified drift claim is itself drift.** No source file modified.

---

## ABSOLUTE STOPS — founder decisions, not agent work

- **Do not touch the calibration gate**, its floors (0.22 / 0.05), or the 3-streak. H-C and
  H-G build toolkits; they wire into nothing.
- **Do not flip any env flag or gate** — `LINE_ARCHIVE_ENABLED`, `PUBLIC_PICKS_ENABLED`,
  `PERFORMANCE_STATS_ENABLED`, `SEALED_ENGINE_ENABLED`, `PUBLISH_LEDGER`, `STATS_PUBLIC`,
  `JYNX_CLOUD_ORDER`, `CLAUDE_PROVIDER`, or any other.
- **Do not write to the database.** A retroactive CLV backfill may well be right — it is the
  founder's call after reading H-E, not something to start because the census looked good.
- **Do not touch `scripts/guardrails/**` or add anything to an allowlist.**
- **Do not change `orbit-unlock-smoke.mjs` expectations.** It asserts
  `settle-picks: "0 */3 * * *"` and `free-spine-health: "0 10 * * *"`; live config has
  `"20 * * * *"` and `"0 */2 * * *"`. Report it, never touch it.
- **Do not create `.github/workflows/quality.yml`.** That file caused the 8-violation halt.
- **Do not change model routing.** Default stays Laguna; GLM 5.2 is not fallback-eligible.
  Read `%LOCALAPPDATA%\hermes\skills\ai-setup\beexly-models\SKILL.md` before touching any
  model config. **Do not add a new provider or SDK** — OpenRouter free models are already the
  execution spine and nothing here needs another one.
- **Do not install** LiteLLM, LibreChat, n8n, ruflo, Cline, Kilo, OpenClaw, or cc-switch.

## Cost constraint

Azure credits are **expired** ($0.00 of $200); the subscription is pay-as-you-go and Azure AI
Foundry inference is **not** among the 58 free services, so every Foundry call bills a card.
**Never add an LLM call to a code path, a test, or a script.** If a task seems to want one,
mark it BLOCKED and say so. Nothing in this handoff requires one — H-C and H-G are arithmetic
over boolean vectors and floats.

## When all seven are DONE or BLOCKED

Stop. Do not invent follow-on work. Leave the branch unpushed. Put two sentences in the ledger:
whether retroactive CLV grading is possible (H-E), and whether the pause policy beat random
(H-G). Those two answers set the next session's entire scope.

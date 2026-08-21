# OVERNIGHT QUEUE — 2026-08-21

    MAX_CYCLES=30
    CYCLE=1
    STALL_THRESHOLD=3
    BRANCH=claude/overnight-2026-08-21
    STOP_FILE=handoff/.stop

**You are the build seat, running unattended. The founder is asleep. There are no
approvals available. Never ask what to do next — this file always knows.**

## THE LOOP (do exactly this, every cycle)

1. `node scripts/ops/overnight-progress.mjs` — if it exits 2, STOP immediately.
2. Increment `CYCLE=` in this file's header.
3. Find the **first** task below whose status is `TODO`.
4. Change it to `CLAIMED` and commit that change alone.
5. Do exactly that task. Nothing else. Do not start the next one.
6. Run its **Done when** command. Read the **real exit code** (`echo "EXIT=$?"`).
7. Mark `DONE` or `BLOCKED` with one line of evidence (a SHA or the actual error).
8. Commit the work. One task = one commit.
9. Append your cycle line to `docs/ops/hermes/OVERNIGHT-2026-08-21-REPORT.md`.
10. Add a row to `docs/ops/AGENT_LEDGER.md`, then `node scripts/ops/check-agent-ledger.mjs`.
11. Exit. The supervisor starts the next cycle.

**If a task is already `CLAIMED` when you start, it was interrupted.** Run its Done-when
command. Green and committed? Mark `DONE`. Otherwise `git checkout --` that task's files,
re-claim it, redo it. (Convention from `docs/ops/hermes/RESUME.md`.)

## STOP CONDITIONS (exactly four)

- Every task is `DONE` or `BLOCKED`, **and** standing orders below are exhausted
- `CYCLE` reaches `MAX_CYCLES`
- `handoff/.stop` exists
- `overnight-progress.mjs` exits 2 (stall detected)

## NON-NEGOTIABLE (unattended safety)

- Never push `main`. Never force-push. Draft PR only.
- Never touch `.github/**`, `packages/db/prisma/schema.prisma`, `migrations/**`. Sealed.
- **Never run the MVE.** Not even if a `DATABASE_URL` appears. It is one-shot and
  irreversible and the founder fires it awake.
- Never weaken a guard or a test to make it pass. Never `--no-verify`.
- Never "improve" a frozen spec value. Flag it and move on — T7 is the template.
- **Real exit codes. Never pipe a guard through `tail`.** This has masked a true failure
  twice in this repo's history.
- Record only URLs, metadata and your own written assessment from GitHub. **Never paste
  README bodies, issue text, or article prose into a committed file.** GitHub is not in
  `source-rights-registry.ts`, so a scripted extraction would be an unregistered-source job.
- Found something that invalidates a frozen decision? Write it to the sweep file, flag it
  LOUD, and do **not** act on it.

## ANTI-THRASH

Three failed attempts at the same task → mark `BLOCKED` with the real diagnosis and move to
the next one. A hard task must never starve ten easy wins. Exceeding a task's cycle box does
the same.

---

## TASKS

### T4 · CLAIMED · box 1 cycle
Fix `docs/ops/hermes/FINAL-RUN-2026-08-20.md` line ~98. It still prints the **point-null**
miss term `E_t = 1 + 0.3(Y·q/m + (1-Y)(1-q)/(1-m) - 1)`. The frozen form is `(1 - q_bet)`,
the composite-null form, per `mve-eprocess.ts` and prereg v2. Doc-only — the code was always
right. Note in the commit that only the doc was wrong.
**Done when:** `grep -c '(1-q)/(1-m)' docs/ops/hermes/FINAL-RUN-2026-08-20.md` returns 0.

### T5 · TODO · box 2 cycles
Wire the ledger guard into CI. In `package.json`, **prepend** to `scripts.guardrails`:
`node scripts/ops/check-agent-ledger.mjs && node scripts/ops/check-agent-ledger-selftest.mjs && `
**Position is load-bearing** — it is a 23-link `&&` chain, so appending means any upstream
guard short-circuits it into silent non-execution. `package.json` is not owner-gated, so this
needs no `.github` edit.
Then create `scripts/ops/check-agent-ledger-selftest.mjs` (~30 lines, node stdlib only): write
two fixture ledgers to a temp dir, spawn `check-agent-ledger.mjs` against each with
`execFileSync`, assert the good one exits 0 and a planted-bad one (a `DONE` row with Evidence
`—`) exits 1. Read exit codes from the spawn result object, never from stdout text.
**Done when:** `node scripts/ops/check-agent-ledger-selftest.mjs; echo "EXIT=$?"` prints
`EXIT=0`, and `node -e "const s=require('./package.json').scripts.guardrails; process.exit(s.startsWith('node scripts/ops/check-agent-ledger.mjs')?0:1)"; echo "EXIT=$?"` prints `EXIT=0`.

### T1 · TODO · box 2 cycles
Merge `origin/hermes/hf5-mve`. Exactly one conflict expected, on `docs/ops/AGENT_LEDGER.md`'s
append line — union-resolve it (keep both rows, keep `DONE`, per the established convention).
Brings `mve-eprocess.ts`, `mve-eprocess.test.ts`, `scripts/edge-lab/run-mve.ts`.
**Do not modify `mve-eprocess.ts`.** It is frozen.
**Done when:** `node scripts/edge-lab/freeze-model-hash.mjs 2>&1 | grep -c 'efron-morris-js.ts'`
returns 1 **and** the missing-file count in its output is 1 (was 3), and
`node scripts/ops/check-agent-ledger.mjs; echo "EXIT=$?"` prints `EXIT=0`.

### T2 · TODO · box 8 cycles
Implement `packages/prediction-engine/src/research/efron-morris-js.ts` per **Amendment v2.2,
section 3** of `docs/ops/edge/2026-08-20-prospective-prereg-mlb-totals-js.md`. Read that
section in full first. Binding points:

- Team-level shrinkage of each team's own history of game totals (`homeScore + awayScore`),
  **square-root/Anscombe transformed** `sqrt(x + 3/8)` — **not** `log`, **not** arcsine.
- `X_i` = mean of transformed past totals for team `i`. `s²` = pooled variance across all
  teams' past games. **`D_i = s² / n_i`** (see T7 — the empirical form is what the fixture
  encodes). Frozen fallback `s² = 0.04` when fewer than 8 league-wide past games exist.
- `Xbar` = **simple unweighted mean** across the `k` teams with `n_i >= 1`. Not precision-weighted.
- `A_hat = max(0, (Σ(X_i - Xbar)² - ΣD_i) / k)`; `B_i = D_i / (A_hat + D_i)`;
  `theta_i = Xbar + (1 - B_i)(X_i - Xbar)`.
- `k >= 3` required; below that `theta_i = X_i`. `n_i = 0` → `theta_i = Xbar`, `B_i = 1`.
- **No limited-translation cap.** Mis-cited and un-frozen. Do not implement one.
- Back-transform: `mu = max(MU_FLOOR, ((theta_home + theta_away)/2)² - 3/8)`, `MU_FLOOR = 0.5`.
  Log every game where the floor binds. **Not `exp()`.**
- Pure module: no I/O, no DB, no odds, no NbRbpf import.

Then `efron-morris-js.test.ts` locking the worked example:
`X=[2.1,2.2,2.0,2.4]`, `n=[4,20,4,8]`, `s²=0.04` →
`theta = [2.129851, 2.197080, 2.069652, 2.344099]`, tolerance `1e-3`.
Also test: `k<3` → identity · `n_i=0` → `Xbar` with `B_i=1` · `A_hat` floors at 0 ·
back-transform round-trips · `MU_FLOOR` binds on a constructed low-scoring input.

**These theta values were independently re-derived from first principles and matched to
3.79e-07. They are trustworthy. If your implementation disagrees with them, your
implementation is wrong — do not change the fixture.**

**ANTI-CHEAT — all three are violations, not shortcuts:** the test may not hardcode the
expected theta array as the implementation's return value; may not loosen the tolerance; may
not `.skip`/`.todo`. The fixture is the arbiter, not your claim about your own work.

**Done when:** `cd packages/prediction-engine && npx vitest run src/research/efron-morris-js.test.ts; echo "EXIT=$?"`
prints `EXIT=0`.

### T3 · TODO · box 1 cycle
Export `nbOverProb` from `packages/prediction-engine/src/research/nb-rbpf.ts` line 131 — add
the `export` keyword, one word. Sole internal caller is line 282 and is unaffected. Do not
reimplement a second PMF anywhere.
**Done when:** `cd packages/prediction-engine && npx vitest run; echo "EXIT=$?"` prints `EXIT=0`.

### T-ARM · TODO · box 2 cycles · **THIS IS THE NIGHT'S OBJECTIVE**
Point `scripts/edge-lab/run-mve.ts`'s `q_t` source at the new `efron-morris-js` module,
replacing `NbRbpf`. Keep the existing `entryForGame` entry-quality logic, exclusion counting
and RESULTS writer untouched. **Preserve the walk-forward order exactly:** compute `qOver`
from history → read `y` → push observation → *then* record the game into history. Never
before.
`NbRbpf` may remain for a logged diagnostic column, but the e-process consumes the
Efron-Morris `qOver` only. Prefer deleting the particle path entirely for this cycle —
one `q`, no dual model.
Then run the hash freeze and record the digest into section 5 of the prereg, replacing
`NOT RECORDED`.
**Done when:** `node scripts/edge-lab/freeze-model-hash.mjs; echo "EXIT=$?"` prints `EXIT=0`
and the composite digest is committed into the prereg. **That is the MVE armed.**

### T9 · TODO · box 2 cycles
Diagnose the settlement backlog. `https://www.galaxysportsedge.com/api/ops/public-surface-truth`
(public, no auth) reports `settlement.health = "CRITICAL"` with roughly 80 of 1739 picks
overdue. Nobody has seen it because the watchdog guarding it has been red 30/30 runs.
Read-only: fetch the endpoint, then trace the settle path in code
(`apps/web/app/api/cron/settle-picks/`, the settlement libs). Write
`docs/ops/2026-08-21-settlement-backlog-diagnosis.md` naming the failing path and a proposed
fix. **Do not attempt the fix** — it likely needs DB access.
**Done when:** the diagnosis file exists and names a specific code path with file:line.

### T6 · TODO · box 2 cycles
Add a visible provenance line to `apps/web/app/bookgrade/page.tsx` and
`apps/web/app/kill-ledger/page.tsx` stating plainly that the figures are transcribed from an
internal study whose raw computation is not published, and are not an independent audit of
the named sportsbooks. Extend `apps/web/__tests__/bookgrade.test.tsx` with a test asserting
the disclaimer renders. **Alter no number. Delete no existing test.**
Why this matters: these pages publish affirmative comparative ratings of eleven **named**
commercial sportsbooks as hand-transcribed literals with zero committed computation anywhere
in the repo. It is the only finding in the audit with exposure outside the building.
**Done when:** `cd apps/web && npx vitest run __tests__/bookgrade.test.tsx; echo "EXIT=$?"`
prints `EXIT=0` with the new test present.

### T7 · TODO · box 1 cycle
Record the `D_i` discrepancy. **FLAG ONLY — do not amend the frozen spec.**
Prereg section 3 point 5 computes `D_i = s²/n_i` (empirical). Ledger row C-64 froze
`D_i = 1/(4 n_i)` (theoretical). These agree only if `s² = 0.25`; the locked fixture uses
`s² = 0.04`, so **the empirical form is what the fixture encodes** and is what T2 implements.
Write `docs/ops/edge/2026-08-21-di-discrepancy-note.md` recording both forms, which is
binding, and why. Date it. This is the template for how a frozen-spec conflict gets handled:
document, never silently pick.
**Done when:** the note exists and states the empirical form is binding.

### T8 · TODO · box 3 cycles
Write `docs/ops/hermes/hf5-mve/AUDIT.md`: formula vs pre-registration, side-selection rule,
walk-forward causality (answer with the **call ordering** as evidence, not an assurance),
entry-price bar (6–3h, ≤15 min, ≥3 books, ESPN excluded, exclusions counted), push handling,
one-bet-per-game, checkpoint cadence, binding-outcome function, and the NbRbpf→Efron-Morris
model swap.
**Builder may not verify own work:** if this same run did T2, say so explicitly in the doc
and mark the T2-related sections as needing a different seat.
**Done when:** the file exists and covers all listed points.

### T10 · TODO · box: remaining cycles · standing task
GitHub research sweeps. See `docs/ops/edge/2026-08-21-github-sweep.md` for the output
contract, the six axes, the validated search terms, the banned collision terms, and the
scoring rubric. **Score 4–5 → append a concrete apply task to this queue as `TODO`.**
That enqueue step is the whole point — findings that sit in a file are worthless.

---

## STANDING ORDERS — the queue must never empty

When every task above is `DONE` or `BLOCKED`, **do not stop and idle**:

1. Run the sweep on the next axis or gap not yet covered in the sweep file.
2. If all axes are exhausted, take the highest-scoring un-applied finding and apply it.
3. Only if none remain: append `QUEUE EXHAUSTED` plus what you would do next given more
   time to the report, create `handoff/.stop`, and exit.

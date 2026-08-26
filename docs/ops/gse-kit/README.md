# GSE Claude Code Kit — staged, **not installed**

Nothing in this directory is active. It is the uploaded kit, preserved in version
control so it survives, is diffable, and can be reviewed before it ever gates a
session.

**Installing it is a founder/operator action, by the kit's own rule.** Its
[INSTALL.md](./INSTALL.md) says so directly: `.claude/` is on the §5 never-modify
list, the sealed-path hook in this very kit enforces that list, and *"an agent seat
should not self-install it."* So an agent seat staged it and stopped.

### Why the payload directory is named `claude-payload/` and not `.claude/`

Because a nested `.claude/` is **not inert**. Staging the kit at
`docs/ops/gse-kit/.claude/` was the obvious layout — it keeps INSTALL.md's `cp`
commands verbatim-correct — and Claude Code immediately registered
`claims-check` and `falsifier-run` as directory-scoped skills, live for any work
under `docs/ops/gse-kit/`. Skill discovery walks nested `.claude/skills`
directories; it does not only read the repo root. Staging would have partially
installed the thing it was meant to hold at arm's length.

So the payload sits in `claude-payload/`, which nothing scans. INSTALL.md's commands
are relative to a kit root that is now this directory, with `.claude/` renamed —
`cp -r .claude/hooks …` reads `cp -r docs/ops/gse-kit/claude-payload/hooks …`, and
so on for `agents/`, `skills/`, and `settings.json`. Restore the `.claude` name at
the destination, not here.

## What is here

| Path | What it does | Blast radius if installed |
|---|---|---|
| `claude-payload/hooks/guard-sealed-paths.sh` | PreToolUse on Edit/Write. Blocks writes to the never-modify list (prisma schema, `.github/workflows/`, `scripts/guardrails/`, `.claude/`, `package-lock.json`, `.gitignore`, `.githooks/`, `apps/web/lib/ai-control-plane/`, and environment files at any depth). | High, intended. Unbypassable — PreToolUse fires before permission checks, including under `bypassPermissions`. |
| `claude-payload/hooks/guard-git-and-gates.sh` | PreToolUse on Bash. Blocks push/merge to main, gate and env-flag flips, workflow create/dispatch. | High, intended. |
| `claude-payload/hooks/trim-verbose-output.sh` | PreToolUse on Bash. Rewrites known-verbose commands via `updatedInput` so only signal returns. | Medium — it **rewrites** commands rather than denying them. Read it before trusting it. |
| `claude-payload/hooks/gate-session-close.sh` | Stop hook. Runs typecheck + `check:ledger` + `agent:eval`; exit 2 refuses to let the turn end. | High. See findings 2 and 3. |
| `claude-payload/settings.json` | Registers the four hooks, plus a permissions block. | **Collides with the live file — see finding 1.** |
| `claude-payload/agents/cold-reviewer.md` | Adversarial pre-PR reviewer with no memory of the build. | Low, additive. |
| `claude-payload/agents/stat-adversary.md` | Statistical red team; default verdict REFUTED. | Low, additive. |
| `claude-payload/skills/claims-check/SKILL.md` | Claim-to-evidence check on customer-facing copy. | Low. Overlaps the existing `.claude/commands/check-claims.md`. |
| `claude-payload/skills/falsifier-run/SKILL.md` | Run a bind through the falsifier, record SURVIVOR/KILLED/STARVED/PARKED. | Low. |
| `claude-payload/skills/session-close/SKILL.md` | Manual session close: guardrails, build, cold review, ledger, STATE.md, handoff block. | Low. |
| `playbook.html` | The kit's own write-up. | None. |

The business prompts that shipped with this kit are **not** staged here — they needed
no install and went straight to
[`docs/business/BUSINESS-PROMPTS.md`](../../business/BUSINESS-PROMPTS.md).

## Verified before staging

- `npm run typecheck`, `npm run check:ledger`, `npm run agent:eval` — all three exist
  in `package.json`, so the Stop hook's verify block has real scripts to call. Two of
  the three are green on this tree; `agent:eval` is red — see finding 3.
- Every staged file is tracked — `git check-ignore` returns nothing for this tree.
  (Root `.gitignore` does ignore `.claude/*`, but that pattern is anchored at the
  repo root; the rename above puts the question beyond doubt either way.)
- The four hook scripts are staged with their executable bits intact, so a `cp`
  install does not silently produce unrunnable hooks.

## Three things to resolve before installing

### 1. `settings.json` cannot be copied over the live one

INSTALL.md says "merge, do not overwrite," and here is the specific reason: the live
`.claude/settings.json` already defines `hooks.PreToolUse` with a `Bash` matcher
running `scripts/guardrails/agent-bash-guard.mjs`. The kit defines its own
`hooks.PreToolUse` with a `Bash` matcher. Overwriting the file **silently deletes the
existing bash guard** — a strictly worse security posture, achieved by installing a
security kit. The merge must append the kit's hook entries to the existing array,
not replace it.

That guard is live and it works: it blocked a write of this very README because the
draft quoted environment-file patterns in a shell heredoc. Losing it to a careless
`cp` would be a real regression.

The permissions blocks differ in strictness rather than in scope — the live file
denies force-push to main specifically, the kit denies force-push generally.
Evaluation is deny → ask → allow, first match wins, so a merged list behaves as the
union of the denies. That direction is safe. Confirm it is what you want anyway.

### 2. The Stop hook's librarian check is inert today and arms itself on #672

`gate-session-close.sh` guards its STATE.md currency check behind
`if [ -f docs/ops/STATE.md ]`. That file does not exist on `main`, so the check fails
open: it never fires, never errors, and reports nothing. Installed against `main`
today, the hook would enforce the verify block (typecheck / ledger / eval) while the
"a session that ends without updating STATE.md has not finished" law quietly did not
exist.

**That changes on its own.** [#672](https://github.com/Beexly/Sports/pull/672) adds
`docs/ops/STATE.md` — an 82-line one-pager with a `FOUNDER QUEUE (max 3)` section,
exactly the file the hook and the kit's session-close skill both assume. The moment
that PR merges, the guard starts passing and the check goes live.

So the fix is not to repoint the hook at `docs/ops/CURRENT_STATE.md`. It is to merge
#672 and let the hook do what it was written to do. What is worth knowing in advance
is the transition itself: this check moves from silently-inert to actively-blocking as
a **side effect of merging an unrelated PR**, announcing nothing on the way. A session
that ended fine yesterday starts refusing to close today, citing a librarian duty that
was dormant the whole time. That is not a bug — it is the hook working — but it is the
kind of change that costs an hour if nobody wrote it down first.

Both halves of this are the same gap the business library's
[path index](../../business/BUSINESS-PROMPTS.md#path-index--verified-against-this-repo)
records from the other direction, and together they are a fair example of what prompt
#7 means by "the single item most likely to be silently broken right now": inert, then
live, and it would not announce either.

### 3. The Stop hook would block every session close on day one

The verify block was run against this tree on a freshly installed dependency tree
(`npm ci`), with exit codes captured directly rather than through a pipe. Two of the
three checks are green. One is red, and it is pre-existing — `vercel.json` is
byte-identical to `main` and appears nowhere in this change.

| Check | Exit | State |
|---|---|---|
| `npm run typecheck` | 0 | **GREEN.** `grep -c "error TS"` also returns 0. |
| `npm run check:ledger` | 0 | **GREEN.** 133 rows. |
| `npm run agent:eval` | 1 | **RED.** 52 of 53 fixtures pass. |

The failing fixture:

```
FAIL  settlement-path-selection/cron-3h — vercel.json missing "0 */3 * * *"
```

`vercel.json` genuinely carries no `0 */3 * * *` schedule — the
`/api/cron/settle-picks` entry runs on a different cadence. The fixture and the
config have drifted apart. Whichever of the two is wrong, the eval is red on `main`
right now, and the Stop hook reads its exit code.

(`npm run lint` also exits 0. It is not in the Stop hook's block, but the kit's
`settings.json` allowlists it, so it is recorded here as green too.)

#### What that means for installing

The Stop hook returns exit 2 on a red verify block, refusing to let the turn end.
One confirmed red is enough: installed today, **every session touching any file
would be unable to close**, and the reason it gave would be a settlement cron
unrelated to whatever the session was doing. The escape hatch
(`.claude/.stop-override`) would carry the load from the first turn onward, which is
how an escape hatch stops being exceptional and becomes the routine.

This is already tracked. [#672](https://github.com/Beexly/Sports/pull/672) carries
ledger row **C-63**, which names the same fixture/`vercel.json` mismatch, found
independently while running the §7.3 verify block, and leaves it OPEN on purpose:
cron edits are CI-minutes-sensitive and "deserve their own deliberate pass, not a
drive-by." That reasoning is sound and this file does not argue with it.

It does mean the ordering is fixed, though: C-63 has to close before the Stop hook is
armed, or the hook's first act is to block every session over a row someone already
decided not to fix yet. A gate that is red before it is armed teaches nobody anything
except how to bypass it.

#### One method note, earned the hard way

An earlier draft of this section reported typecheck as red on two workspaces. It was
not. That run happened before `npm ci`, in a container with no `node_modules`, where
`npx` fetched a TypeScript newer than the lockfile pins and `@types/node` was absent
— `Cannot find name 'process'` is exactly what a missing `@types/node` looks like.
The same draft reported that `--workspaces --if-present` was masking those failures
behind exit 0. It was not doing that either: the command had been piped through
`tail`, so the exit status being read belonged to `tail`.

Both errors are the failure mode the kit's own session-close skill names —
*"Never pipe either through `head`/`tail`. That has hidden a real failure before."*
The numbers in the table above were re-taken with dependencies installed and without
pipes. Anyone re-running them should do the same, and should not trust this file over
their own fresh output.

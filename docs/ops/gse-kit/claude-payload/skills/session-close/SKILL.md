---
description: Close out a session properly - full verification, STATE.md update, ledger reconciliation, and handoff. Use at the end of any working session, before opening a PR, or when the session is dying and you need to land an honest partial.
disable-model-invocation: true
allowed-tools: Bash(npm run *), Bash(git *), Read, Edit, Grep, Glob
---

# Session close

Manual-only on purpose: you decide when a session ends, not the model.

The cheap per-turn checks (typecheck, ledger, agent:eval) already ran on every
turn via the Stop hook. This skill runs the expensive ones once, then does the
bookkeeping that the hook cannot do for you.

## 1. Full verification — actually run these, read the real exit codes

```
npm run guardrails     # ~22 guards
npm run build          # production build must succeed
```

Never pipe either through `head`/`tail`. That has hidden a real failure before.

## 2. Cold review before the PR

Spawn the `cold-reviewer` subagent on the diff range. Give it the exact range and
say what the change was supposed to do — it cannot see this conversation and will
not infer intent. Read its Scope Check section carefully: files touched that the
task does not explain are the finding a tidy summary will never surface.

Then read `git diff` yourself. Start with the diff, not with any summary of it.

## 3. Reconcile the ledger

Every row you own: update it now, not in a batch. `DONE` requires a resolvable
7+ hex SHA or `#PR` in Evidence — verify with `git rev-parse --verify <sha>`
before writing it. Cannot push? The status is `UNPUSHED` with branch + SHA,
never `DONE`. Never self-mark a founder-owned row DONE (C-60).

Then `npm run check:ledger`.

## 4. Update STATE.md

Hard cap ~60 lines. The founder reads one page. Four sections: current ground
truth, the founder queue (max 3), what is quarantined awaiting verification,
what is in flight. Anything sourced from an agent handoff stays quarantined until
checked against the ledger and the truth surface.

A session that ends without updating STATE.md has not finished.

## 5. Handoff block

Append to the final commit message or PR body:

```
## SESSION HANDOFF — sonnet/<branch> — <date>
BRANCH+PUSHED: sonnet/<slug> @ <sha>  (PRs: #<n> ...)
LEDGER ROWS: <id> CLAIMED→DONE (evidence <sha>) | <id> BLOCKED (<exact error>)
VERIFY: typecheck 0 errors [RUN] · lint exit 0 [RUN] · vitest <file> green [RUN]
        check:ledger [RUN] · agent:eval [RUN] · guardrails [RUN/NOT RUN] · build [RUN/NOT RUN]
VERDICTS (edge work): <bind> → SURVIVOR/KILLED/STARVED/PARKED (e=<value>)
CI MINUTES: <pushes this session, [skip ci] commits noted>
NOT RUN / NOT VERIFIED: <explicit list — never omit this line>
OWNER ASKS: <operator-only steps, founder-YES items, corpus files needed>
NEXT ACTION for successor: <one concrete step, with file paths>
```

The `NOT RUN / NOT VERIFIED` line is never omitted. An honest partial beats a
polished fiction, and the founder must be able to read any commit in two minutes
and keep-or-drop with confidence.

## If the session is dying

Commit what verifies, push the branch, update the ledger, write
`.claude/.stop-override` with the reason. The ledger holds state. Being cut off
is survivable; a fabricated completion is not.

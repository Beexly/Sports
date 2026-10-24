# BEEX AGENT TEAM

Status: control document. Read this before any fleet task. Do not invent a second org chart.
Last verified: 2026-10-08.
Owner: Garrett. Lead: Motif. Hands: Orca. Record: this repo.

If this file conflicts with a chat memory, this file wins for fleet rules. Project rules inside each repo still win for that project.

## Locked decisions

Do not relitigate these.

- Motif is Muse, renamed. Motif is the brain. Garrett can reach it. The Motif VM internet is flaky. Do not require it to be up.
- Orca is the hands, not the brain. It already runs on the Windows box. It polls this bus.
- This Git repo is the system of record and the outage buffer. Do not migrate to A2A. Do not adopt CrewAI, Agno, AutoGen, LangGraph, Paperclip, or Eyrie.
- Do not create an agent because a task looks new. A new `agents/<id>.yaml` requires Garrett.
- AgentBudget (PyPI `agentbudget`, not the npm namesake) is the spend circuit breaker. For OpenRouter, read `usage.cost` from the response. Do not trust a pricing-table drop-in as the invoice.
- Hindsight is the memory path. Self-host only. Explicit URL. No paid cloud. No `:latest`. No `--pull always`.
- Hermes is a player, not the sole lead. Eyrie is an architecture reference only. Paperclip is out. AI Maestro and Slaw are optional read-only dashboards, not the brain.
- Projects do not mix.

## Projects

| Id | Rule |
|---|---|
| `signal-origin` | No sports, no betting, no adult, no slop. No publish and no X post without a gate. Originality hold floor 9.2. |
| `gse` | Honesty gate required. No live-bet placement language. No customer PII. |
| `framefit` | No production domain change without Garrett. |
| `desk` | Paper only. No live order. No options submit. Do not work on the other three from a desk ticket. |

One bus prefix and one Hindsight bank per project: `signal-origin`, `gse`, `framefit`, `desk`. A recall from the wrong bank must return empty. A claim whose `project` does not match the directory is rejected.

## Who does what

- Garrett: raises caps, unfreezes, accepts anything the degrade rule will not, merges to main. Target: under 2 hours across 30 days.
- Motif: writes tasks when online, accepts or quarantines results, promotes Hindsight observations. Only Motif or Garrett may promote.
- Orca: claims, executes in a worktree, heartbeats, writes results, pushes. Does not decide strategy. Does not publish.
- Deputy (any player): may park and notify if Motif's endpoint is renamed. May not promote memory. May not publish.
- Grok Build: repo setup agent. It may create files, hooks, and the poller in this repo. It may not spend, publish, merge to main, or touch another project's bank.

## Layout

```
bus/<project>/inbox/<id>/
bus/<project>/claimed/<id>/
bus/<project>/done/<id>/
bus/<project>/failed/<id>/
bus/<project>/quarantine/<id>/
bus/FREEZE
agents/<id>.yaml
STATUS.md
```

`status.json` schema_version 1, required fields: `schema_version`, `id`, `project`, `state`, `budget_usd`, `idempotency_key`, `lease_holder`, `lease_expires`, `fence`, `heartbeat_at`. A reader that does not understand the version parks the task as `needs_human`.

## Lease

Heartbeat every 60 seconds. TTL 180 seconds. A run over 2 hours is valid while the heartbeat moves. Reclaim only when `now - heartbeat_at` exceeds 180 seconds. A fixed 45-minute reclaim will double-execute. `fence` increments on every successful claim. A result push with a stale fence is rejected.

## Claim rule

Pull first. If the inbox item is still there, `git mv` it to `claimed/`, increment `fence` and `attempt`, commit, push. A rejected push means someone else won. Pull and abort. Do not force-push.

Tested 2026-10-08 on a scratch bare repo: first claimer push exit 0, second claimer push exit 1 (`fetch first`), remote tree contained only `bus/claimed/t1`.

Earlier claim-race failures were empty checkouts. `git clone` of a bare repo whose HEAD ref was wrong printed `remote HEAD refers to nonexistent ref, unable to checkout`. `git mv` then failed because `bus/inbox/t1` was not on disk. Those runs do not count. The lock works when the clone has files and force-push is denied.

## Integrity

- Pre-commit scans only `bus/` payloads. It must not scan the hook file. The hook contains the patterns it rejects. A hook that scans itself cannot be committed.
- Reject `sk_live_`, `sk_test_`, `AKIA`, `ghp_`, `xox`, `BEGIN PRIVATE KEY`.
- Tested 2026-10-08: clean bus commit exit 0. `sk_live_` commit exit 1. `ghp_` commit exit 1.
- Remote: `receive.denyNonFastForwards` and GitHub branch protection. Tested 2026-10-08: diverging `--force` push exit 1, `denying non-fast-forward`.
- Keys live in the OS keyring or `~/.ssh`. Never in this repo. Git author name is not identity.
- Production signing is `git commit -S` plus a server that rejects unsigned commits. The trailer stand-in is not production.

## Side effects

Write `idempotency_key` before the call.

- GitHub PR: head branch `bus/<id>`. A retry pushes the same branch.
- Stripe: `Idempotency-Key` header. Not called in the scratch test.
- Local echo, 2026-10-08: first call fired, retry replayed, journal length stayed 1.

No merge to main, no DNS, no Stripe live, no Alpaca live, no X post, from any player.

## Spend

Every ticket has `budget_usd`. No envelope, no run.

- Soft 80%: stop new tool calls, `status=soft_cap`, notify.
- Hard: `BudgetExhausted`, `status=capped`, no retry, no second key.
- Lint or format refuses a frontier model under the same envelope.
- Weekly: OpenRouter activity export versus summed `spent_usd`. Divergence over 15% is a stop.
- Claude Code and Codex subscriptions are unmetered until wrapped. Treat them as outside the cap.

## Kill switch

Orca mobile can view, reply, and commit. It cannot pause the fleet. Desktop is the source of truth.

`bus/FREEZE` stops new claims. In-flight work finishes the current step, then parks. If Garrett has not acked in 12 hours, the Windows watcher writes FREEZE itself. Motif being offline does not block FREEZE. The watcher lives on the Windows box.

## Degrade accept

When Motif is offline, auto-accept only if all are true: tests green, diff at most 80 lines, spent at most $2, idempotency key present, secret scan clean, project is not `desk`.

Always quarantine: Signal Origin sports / publish / originality missing or under 9.2; GSE missing honesty gate or live-bet language; FrameFit production domain change; any live order; any secret; any main merge. Auto-accept sets `accepted_by=degrade` and does not promote Hindsight.

## Memory

Pin `ghcr.io/vectorize-io/hindsight:0.4.9` until `docker inspect` records a digest. Named volume required (`hindsight-data:/home/hindsight/.pg0`). No volume means the next container start wipes memory. Promotion requires an accepted `done/` result and an evidence path. Quarantine TTL 7 days.

## Succession

If Motif is renamed, only `agents/motif.yaml` changes (`model_id`, endpoint). Bus paths, bank ids, lease format, and caps do not change.

## Weekly metrics

Stop and revert to plain markdown if any of these is non-zero after the week-4 holdout, or if force-push, secret push, or FREEZE fails on the real machines.

1. Malformed or stale claims over 20%.
2. A promotion with no evidence path, or a normal recall that hits quarantine.
3. Invoice versus `spent_usd` divergence over 15%.
4. Cross-project recall.
5. Duplicate side effect.

## Result evidence

A correct memory record is not a correct execution. `RESULT.md` must carry three fields or it stays in quarantine: `receipt` (tool or call id), `action_dependence` (files or docs actually read), `response_validity` (exit code, or an explicit `no-tests`). Without those three, do not promote a Hindsight observation. Source: Beyond Corrected Memory, arXiv:2610.08101, 6 Oct 2026. Removing them left 82.4% of opposite-label pairs indistinguishable. Restoring them separated 97.9%. Agreement among agents is not evidence.

## Handoff log

On each accept, append one line to `bus/priors/handoffs.jsonl`: `from`, `to`, `project`, `task_type`, `passed`. Do not decompose a repeated task type from scratch once that log has a passing row. Source: WorkflowOps, arXiv:2610.07860, 6 Oct 2026. Do not auto-create agents from a gap score. Cheap match first. Call a frontier model only when the match is low-confidence or the task is not lint/format.

## What this file does not do

It does not make the fleet safe. Cross-bank recall, FREEZE from Telegram, OpenRouter invoice match, `git commit -S` on the Windows box, and the Hindsight volume restore have not been run on Garrett's machines.

## Forecast

- The hook that scans itself cannot be committed. Scope the scan to `bus/`.
- Windows CRLF will corrupt `status.json` if core.autocrlf is true. Set `false` on the bus repo.
- Parallel Orca worktrees fill the disk. Freeze new claims over 85% full.
- A 12-hour auto-FREEZE will pause good work while Garrett is asleep. That is the intended trade.
- Unmetered Claude Code / Codex subscriptions bypass AgentBudget. Wrap them or exclude them from "capped" claims.
- Grok Build's documented install is `curl | sh`. That is the official client, not a third-party script. Do not extend that pattern to Hindsight, AI Maestro, or anything else.
- Branch protection is a one-time human toggle unless `gh` is already authenticated. After that, the agent maintains the repo.
- Motif outages pile `done/` up. Degrade accept covers only the narrow FrameFit path. Everything else waits. That is correct.
- A second remote is the bus backup. One GitHub repo is a single point of failure.

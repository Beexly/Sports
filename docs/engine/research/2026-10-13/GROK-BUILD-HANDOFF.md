# Grok Build handoff

Paste this into Grok Build from the root of the Beexly agent-bus repo. Plan mode first. Do not execute until the plan is approved.

---

You are setting up the Beexly agent bus. Read BEEX-AGENT-TEAM.md and treat it as law. Do not reopen the org chart. Do not install Paperclip, Eyrie, AI Maestro, Slaw, Hindsight Cloud, CrewAI, Agno, AutoGen, or LangGraph. Do not migrate to A2A. Do not publish, merge to main, spend money, or call Stripe, Alpaca, or X. Do not create a new agent file because a task looks uncovered.

Motif is the brain. Orca is the hands. This repo is the buffer. You are the setup agent. You create files and prove them with local tests. You stop at any step that needs Garrett's GitHub toggle, a Telegram token, the Motif VM, or the Hindsight host.

## Create

1. `BEEX-AGENT-TEAM.md` if it is not already in the repo. Copy the control document Garrett provides. Do not rewrite the locked decisions.

2. Layout, empty except for `.gitkeep`:
   - `bus/signal-origin/{inbox,claimed,done,failed,quarantine}`
   - `bus/gse/{inbox,claimed,done,failed,quarantine}`
   - `bus/framefit/{inbox,claimed,done,failed,quarantine}`
   - `bus/desk/{inbox,claimed,done,failed,quarantine}`

3. `agents/motif.yaml`, `agents/orca.yaml`, `agents/hermes.yaml`. Fields: `id`, `role`, `projects_allowed`, `tools_allowed`, `max_budget_usd`, `can_publish: false`. Motif may write tasks for all four projects and may not publish. Orca may claim all four and may not publish. Hermes may claim `signal-origin` and `framefit` only.

4. `.githooks/pre-commit` that scans only paths under `bus/`. Reject `sk_live_`, `sk_test_`, `AKIA`, `ghp_`, `xox`, `BEGIN PRIVATE KEY`. Do not scan the hook file. A hook that scans itself cannot be committed.

5. `scripts/claim.py`. Pull, refuse if `bus/FREEZE` exists, refuse if `TASK.project` is not in the agent's manifest, refuse if heartbeat of an existing claim is inside 180 seconds, `git mv` inbox to claimed, increment `fence`, set `lease_holder` and `heartbeat_at`, commit, push. On push reject, abort. No force-push.

6. `scripts/heartbeat.py`. Touch `heartbeat_at` every 60 seconds for claims held by this machine.

7. `scripts/status.py`. Write `STATUS.md` with open, claimed, blocked_on_garrett, capped, quarantined.

8. `scripts/freeze.py`. Write `bus/FREEZE` and push. This is the kill switch. Wire it to a Telegram command only if `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are already in the environment. If they are absent, print the exact missing vars and stop. Do not ask Garrett to paste a token into the repo.

9. `scripts/accept.py`. On accept, require `receipt`, `action_dependence`, and `response_validity` in `RESULT.md`. If any is missing, move the task to quarantine. If all are present, append one JSON line to `bus/priors/handoffs.jsonl`. Do not promote Hindsight from this script. Create `bus/priors/` with an empty `handoffs.jsonl`.

10. `.gitattributes` with `* text=auto eol=lf` and a note in the README that the Windows clone must set `core.autocrlf false`.

## Prove, in this repo, with a scratch bare remote

- Clean bus commit exits 0.
- Commit that adds `sk_live_` under `bus/` exits 1.
- Two clones claim the same inbox item. First push exits 0. Second exits non-zero. Remote shows one claimed item.
- Diverging `git push --force` against a bare remote with `receive.denyNonFastForwards=true` exits 1.
- `scripts/claim.py` refuses a desk task when run as Hermes.
- `scripts/claim.py` refuses a new claim when `bus/FREEZE` exists.
- `scripts/accept.py` quarantines a RESULT.md missing `receipt`.
- `scripts/status.py` emits all five buckets from fixture files.

Write the results to `PROOF.md` with exit codes. If a proof fails, stop. Do not mark it passed.

## Do not do

- Do not run `curl | sh` for anything except the Grok Build client Garrett already installed.
- Do not `docker run` Hindsight. Pinning and the volume restore happen on the Motif VM in a later pass.
- Do not enable branch protection yourself unless `gh auth status` succeeds. If it does, protect the default branch: block force-push, enable secret scanning push protection if the plan allows it. If `gh` is not authenticated, write the exact `gh` command into `HE-MUST.md` and stop.
- Do not wrap live OpenRouter keys. Add `scripts/spend_guard.py` that reads `usage.cost` and refuses the next call at 80% and 100% of `budget_usd`, and unit-test it with a fake response. No network.

## Done when

`PROOF.md` shows every proof above passed, `HE-MUST.md` lists only the steps you could not run, and `STATUS.md` generates. Then stop. Garrett's remaining steps should be the GitHub toggle if `gh` is not logged in, the Telegram env vars if unset, and the Hindsight pin on the VM. Nothing else.

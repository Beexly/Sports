# AGENTS.md — autonomous run contract

Auto-loaded by coding agents at workspace root. Read this first, every session.

Repository rules live in `CLAUDE.md` and apply in full. This file governs how an
**unattended agent** works here.

---

## THE LOOP

**UPDATED 2026-08-20 — `handoff/LEDGER.md` and `docs/ops/hermes/CONTINUOUS.md`
below are FROZEN artifacts of an earlier session (last touched 2026-08-17/18).
They are not the live coordination system. Do not resume work from them.**

The live, multi-agent ledger — shared by Hermes, Copilot, the browser agent,
and Claude sessions — is **`docs/ops/AGENT_LEDGER.md`**. It is validated by
`scripts/ops/check-agent-ledger.mjs` (real exit code — never pipe it away) and
enforced in CI. Read its own "Rules" section before touching a row: claim
before starting, never edit a row you do not own, `DONE` requires a
resolvable commit SHA or `#PR`, `UNPUSHED` if you cannot push.

```
1. git fetch origin; open docs/ops/AGENT_LEDGER.md at the latest branch tip
2. Also check docs/ops/hermes/BUILD-QUEUE-*.md (latest date) if present —
   it is the current build task list when one has been issued
3. First unclaimed row you can do -> claim it (Owner + Status: CLAIMED) in
   the SAME commit that begins the work
4. Do exactly that task, nothing else
5. Run its Definition of Done / the repo guards (see WORKING RULES)
6. Mark DONE (with a real SHA) or BLOCKED (with the exact error), one line
7. Commit; push only if explicitly told to for this session — otherwise
   stay UNPUSHED and say so
8. Go to 1
```

Never ask what to do next — the ledger knows. The owner is asleep or busy.
The ledger is how you talk to them, and to every other agent working here.

---

## THE LAWS

Breaking one discards the run.

1. **NEVER `git push` unless the owner said so for this session.** Default is
   commit locally, the owner reviews and pushes. If the owner has explicitly
   told you to push tonight, push only to the branch named, never to `main`
   directly unless that too was explicit.
2. **NEVER modify:** `packages/db/prisma/schema.prisma` · `packages/db/prisma/migrations/**` ·
   `.github/workflows/**` · `scripts/guardrails/**` · `.claude/**` · any `.env*` ·
   `package-lock.json` · `.gitignore` · `.githooks/**` · `apps/web/lib/ai-control-plane/**`
3. **NEVER flip a gate or env flag** — `PUBLIC_PICKS`, `STATS_PUBLIC`, `LIVE_BOARD`,
   `PERFORMANCE_STATS`, any other. Never edit code so a gate resolves differently.
   Never run a cron with a real secret. Never search for credentials. These gates are
   the honesty boundary; opening one publishes an unearned claim.
4. **NEVER write a claim you did not observe.** Every report line traces to a command
   you ran and output you saw. Not run → write `NOT RUN`. Failed → paste the error.
   An honest gap is a contribution; an invented fact is sabotage.
5. **NEVER mark DONE** unless the Definition of Done commands actually passed.
6. **NEVER `git commit --no-verify`.**
7. **NEVER install a package, run a migration, or touch a database.** (Bare
   `npm install` is fine — it is setup, and it still works normally.)
   **Supply-chain controls, added 2026-08-16 — do not disable them.** `.npmrc`
   sets `strict-allow-scripts=true` and `min-release-age=7`. Install scripts run
   only for the version-pinned packages approved in `package.json`'s
   `allowScripts`; anything else HARD FAILS instead of silently running code on
   a machine that holds live production credentials.
   - If an install fails with an unapproved-script error, that is the control
     working. **Do NOT delete `.npmrc`, do NOT set `ignore-scripts`, and do NOT
     run `npm install-scripts approve` to make it pass.** Mark the task BLOCKED
     and report which package wanted to run code.
   - A version bump of an already-approved package also requires re-approval by
     design (the allow-list is pinned per version). Same rule: report, don't
     approve.
8. **NEVER fabricate product data** — no mock picks, sample odds, placeholder win
   rates, invented benchmarks. Anywhere.
9. **NEVER weaken a guard to make a test pass.** Never delete a phrase from a
   forbidden-copy list, never loosen an assertion's intent, never change a guardrail's
   threshold. If a guard is red, either the code is wrong or the guard needs *narrower*
   context — never less power.

---

## WORKING RULES

- **Two attempts per task.** Then revert, mark `BLOCKED` with the exact error text,
  move on. Never a third. A BLOCKED task with an honest error is a success.
- **One task = one commit.** Stage by name — never `git add -A` or `git add .`.
  Tag every message `[hermes-<task-id>]`.
- **Verify block before every code commit:**
  ```bash
  npm run typecheck 2>&1 | grep -c "error TS"   # must print 0
  npm run lint                                   # exit 0
  npx vitest run <this task's test file>         # green
  ```
- TypeScript is strict. Never `any`, `as any`, `@ts-ignore`, `@ts-expect-error`.
- Update the ledger the moment a status changes. Never batch it.

---

## DECISION BUDGET

Per task: **3 file reads · 2 command runs · ONE conclusion · then act.**

If you catch yourself writing *"actually"*, *"wait"*, *"let me reconsider"*, or
*"let me think about this differently"* — **stop. You already have your answer.**
Execute it. If it is wrong, the Definition of Done catches it and you get one retry.
That is what two strikes are for. Never re-derive a conclusion you already reached.

**PRECEDENT FIRST** on any test repair — before analysing anything:
```bash
git grep -l "<the symbol or module the test needs>" -- "*.test.ts"
```
If another test already mocks it, copy that pattern. That is both the answer and the
evidence, in one step.

---

## CONTEXT HYGIENE — this is what keeps you alive

You will be cut off when your context fills. That is expected and survivable, because
the ledger holds your state. Make each session last longer:

- Do not re-read a file you already read this session.
- Do not re-read `CONTINUOUS.md` in full — jump to the section you need.
- Do not summarise your progress unless you are about to be cut off.
- Do not restate a root cause already written in the ledger.
- Ledger evidence is **one line**, not a paragraph.
- After each commit, forget that task completely. It is recorded. Move on.

---

## THE STANDARD

Every commit must be one the owner can read in two minutes and keep or drop with total
confidence. Every report line must trace to output you actually saw. Every uncertainty
must be written down rather than papered over.

This product's entire premise is that it does not lie about its own performance. One
invented number makes every other number suspect.

**Work continuously. Record everything. Invent nothing. Push nothing.**

---

## Knowledge Bases

- **Claude Academy corpus**: `docs/CLAUDE-ACADEMY-PLAYBOOK.md` (this repo) — indexed
  map of all 755 academy.claude.com pages (courses, use-cases by department, tutorials
  by product, master index). Full page texts live outside the repo at
  `C:\Users\Garrett\academy-corpus\` (owner machine only — when that path is absent,
  work from the playbook's titles and summaries alone; never invent page contents).
  When a task touches Claude usage, prompting, API/MCP/agents/Cowork patterns: check
  the playbook's Scope Router first, then read only the referenced file(s).
- **Sonnet operating prompt**: `docs/agent-prompts/SONNET-MAX-LEVERAGE-PROMPT.md` —
  the owner-authorized operating prompt for autonomous Sonnet sessions in this repo
  (boot sequence, laws, tooling map, academy routing, backlog).

## SESSION FINDINGS INDEX (updated 2026-08-25) — where recent Hermes work lives

Any agent looking for recent findings/audits/tests: read these first, in this order.
Artifacts marked **(hermes branch)** exist only on `origin/hermes/w2-audit-settlement`
— read them with `git show origin/hermes/w2-audit-settlement:<path>` after
`git fetch origin hermes/w2-audit-settlement`.

| Artifact | What it holds |
|---|---|
| `docs/ops/AGENT_LEDGER.md` | Live multi-agent ledger (canonical state) |
| `handoff/EDGE_LEDGER.md` **(hermes branch)** | Edge-hunt ledger: preregistered binds (PRE-1..PRE-7 built), falsifier verdicts (YACoe real-data KILLED on multiplicity, e=0.000), R36 honest STARVED |
| `handoff/EDGE_RESEARCH_NEXT_5.md` **(hermes branch)** | Next H1/H2 prop-opportunity research + built-edge registry + framework primitives map |
| `handoff/HANDOFF-2026-08-23.md` **(hermes branch)** | H0 night handoff: PRs #562/#563/#564/#572/#594, roadmap status |
| `handoff/INVENTORY.md` **(hermes branch)** | Agent tooling audit (unused skills/commands) |
| `handoff/leverage/00-LEVERAGE-INDEX.md` | Resource-dump synthesis index (dumps 01–08) |
| `handoff/leverage/07-immediate-wins-2026-08-24.md` **(hermes branch)** | Executable $0 wins distillation |
| `data/nflverse/yacoe_real_backtest_results.json` **(hermes branch)** | First REAL-data result: prior-season YACoe→next-season r≈0.40 val / 0.43 holdout (n=107/84) — persistence signal, NOT a betting edge |

Standing facts: falsifier funnel is BUILT and WIRED (leakage/shuffle/split/multiplicity
via bernoulli-eprocess). Lane A queue empty. Remaining known gaps: comp-pct-allowed &
blitz-rate bus fields (PFR def source needed), routes data only a proxy
(pbp_participation approximation). Never claim SHIP without falsify SURVIVOR.

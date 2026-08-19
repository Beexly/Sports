# Agent ledger

One row per unit of work. **Every agent working on this repo reads this file first,
claims its row, and writes its evidence when done.**

Validated by `scripts/ops/check-agent-ledger.mjs`, which runs in CI via
`apps/web/__tests__/agent-ledger.test.ts`. A malformed or dishonest row fails the
build.

## Why this exists

Four agents work on `Beexly/Sports` — a local Hermes runner, GitHub Copilot, a
browser agent, and Claude Code sessions. They share no memory. On 2026-08-19 that
cost three separate collisions in one day:

- Copilot and Hermes each built the same fabricated `signup-workflow` feature,
  independently, neither knowing the other had.
- A Claude session began reimplementing `H-L` while it was assigned to Hermes.
- Hermes read "run the queue" as a CSV import queue and processed a census file
  instead of the task queue.

Git is the only substrate all four agents actually touch — none of them can reach a
Postgres or Redis memory store. So the ledger is a file, and the enforcement is a
guard, not a convention.

Related prior art, and why it is not used: `Beexly/fablechain` carries an
`AgentMemory` (Postgres + Redis) and a `TaskBacklog`. Over its last 200 commits the
agent implemented `feat(faucet): implement testnet faucet backend` **nine times** with
an identical subject line, because `TaskBacklog.ts` is a `const` array and completing
a task never removes it. Persistent memory alone does not prevent duplicate work.
Evidence does.

## Rules

1. **Claim before you start.** Set `Owner` and `Status: CLAIMED` in the same commit
   that begins the work. An unclaimed row is fair game; a claimed row is not yours.
2. **Never edit a row you do not own**, except to add a `BLOCKED` note explaining a
   dependency.
3. **`DONE` requires evidence.** Put a commit SHA (7+ hex chars) or a `#123` PR
   reference in `Evidence`. The guard resolves SHAs against the repo — a hash that
   does not exist fails the build. "I completed it" is not evidence.
4. **If you cannot push, you are `UNPUSHED`, not `DONE`.** Record the local branch
   and SHA so the work can be recovered. Eight rows sit in this state right now;
   every one of them exists on exactly one laptop.
5. **`CANCELLED` requires a reason** in `Evidence`, not a hash.
6. **Titles must be unique.** Two rows describing the same work is the exact failure
   this file exists to catch, so the guard rejects it.
7. **One row, one unit of work.** If scope grows, add a row; do not widen a claimed one.

## Owners

| Owner | What it is |
|---|---|
| `hermes` | Local Hermes runner (OpenRouter free models), on the founder's machine |
| `copilot` | GitHub Copilot coding agent, runs on a GitHub runner |
| `browser` | Browser agent with dashboard access (Vercel, Anthropic console) |
| `claude` | Claude Code session (remote container) |
| `founder` | Garrett — owner-gated decisions only |
| `—` | Unclaimed |

## Statuses

`OPEN` · `CLAIMED` · `BLOCKED` · `UNPUSHED` · `DONE` · `CANCELLED`

`UNPUSHED` is the honest state for work that is finished but lives only on one
machine. Hermes is instructed never to push, so its deliverables sit on a local
branch whose SHAs no other clone can resolve. That is not `DONE`: one laptop is
the only copy, and nobody else can verify or build on it.

## Ledger

<!-- LEDGER:BEGIN -->

| ID | Title | Owner | Status | Evidence |
|---|---|---|---|---|
| H-A | Isotonic PAV calibration | hermes | UNPUSHED | local branch on founder machine, 62e32730 |
| H-B | Cron matrix generator | hermes | UNPUSHED | local branch on founder machine, 4b961782 |
| H-C | E-process sequential test | hermes | UNPUSHED | local branch on founder machine, f53b229e |
| H-D | markClosingSnapshots behind a flag | hermes | UNPUSHED | local branch on founder machine, 0a447f98 |
| H-E | CLV census on a Neon branch | hermes | UNPUSHED | output CSV on founder machine: docs/ops/calibration/2026-08-18-clv-census.csv, 1161 rows; Neon branch since deleted |
| H-F | DOC_DRIFT.md audit | hermes | UNPUSHED | local branch on founder machine, e668c4c4 |
| H-G | Suppression curve vs random and oracle baselines | hermes | UNPUSHED | local branch on founder machine, 63e84c32 |
| H-K | charge.refunded revocation behind REFUND_REVOKES_ACCESS | hermes | BLOCKED | H-K was never implemented: cited commit 01868364 resolves to H-C e-process work ([hermes-H-C] v5 likelihood-ratio e-process + log-space mixture), and REFUND_REVOKES_ACCESS appears nowhere in any source file or backup tree (git log --all -S and git grep across all refs return zero code matches — only the ledger row itself mentions the symbol). The reported handler is unlocated. Reimplementation required. |
| H-L | health-alert stateless cooldown + portable payload | claude | DONE | b9ec799 |
| H-M | Cron no-op audit | hermes | UNPUSHED | revised per review: data-driven early-return only (no-game-in-horizon skip, mirrors process-sport.ts quiet-board); ~60/day saved off-season, 0 in-season, 576/day flag-off figure withdrawn; hermes/h-m-cron-audit cd5086f7, local worktree |
| H-N | Env-shape validator | hermes | CLAIMED | — |
| H-O | Repair the @/lib/stripe test mock | claude | DONE | ab9f9c2 |
| H-P | Triage the 73 CI test failures | claude | DONE | #434: every cluster root-caused; fixes shipped for checkout, copy, nflverse, waitlist, kill-switches, PAVA |
| C-5 | PAVA forward-violation bug in calibration core | claude | DONE | 9627379 |
| H-Q | Fix remaining singleton test failures (triage notes in v7 handoff) | hermes | OPEN | — |
| F-4 | Authorize one-time Hermes push of its local sprint branch (8 UNPUSHED deliverables, single-copy risk) | founder | OPEN | APPROVED 2026-08-19; row closes when the backup branches exist on origin |
| C-1 | vercel.json guard drift + drift test | claude | DONE | 657a7f1 |
| C-2 | Land v5.2.6 calibration evidence | claude | DONE | 175c44f |
| C-3 | Declare appliedPauseGroups + RUN_GENERATE_SIGNAL_SLATE | claude | DONE | 1d39021 |
| C-4 | Agent ledger + guard | claude | DONE | 65e6474 |
| X-1 | signup-workflow scaffolding | copilot | CANCELLED | fabricated feature; auth is Google OAuth only via PrismaAdapter, no signup flow exists |
| X-2 | Delete CLAUDE_PROVIDER to fix AI routing | browser | CANCELLED | diagnosis wrong; unknown value yields zero cloud attempts and falls through to Anthropic direct, pinned by provider-mode-failsafe.test.ts |
| F-1 | Rotate the Anthropic key found in CLAUDE_PROVIDER | browser | OPEN | decision made (fable): rotate now; browser agent executes with founder watching, script in session log 2026-08-19 |
| F-2 | Decide REFUND_REVOKES_ACCESS default | founder | OPEN | decision made (fable): stays OFF through H-K merge; flip to true after ONE observed production refund revokes correctly in logs; the env flip itself is a hands task |
| F-3 | Promote or remove apps/web/app/api/v1 | claude | CLAIMED | — |

<!-- LEDGER:END -->

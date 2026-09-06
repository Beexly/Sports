# AGENTS.md — autonomous run contract

Auto-loaded by Grok Build, Codex, and Copilot at workspace root; Claude Code loads it through the `@AGENTS.md` import on line 1 of `CLAUDE.md`. Read this first, every session.

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

**UPDATED 2026-09-03 — `docs/ops/AGENT_LEDGER.md` is LIVE and current
(142 rows: 27 OPEN / 2 CLAIMED / 4 BLOCKED / 102 DONE / 6 CANCELLED, guard green).
LQ-tagged work is additionally tracked in `docs/data/FLEET_DISPATCH.md`.
Read both before claiming; a task already dispatched there is not free.**
**Verified-fixes note:** the C-64..C-70 dual-audit batch lives on
`claude/verified-fixes-2026-09-03` (draft PR #689) — check whether it merged
before re-fixing anything from that list. The ledger guard now also prints
SLA warnings: a CLAIMED row with no evidence or an OPEN row with evidence but
no owner will be called out on every guard run — resolve or re-own them.

**UPDATED 2026-09-06 (02:15 UTC): PR #707 is MERGED to `main` as `cff3e72d7` and deployed
(the truth surface reports that SHA). Score 60 of 100; the measured path to 100 with owners
is plan section 3e. Founder instruction: no human step where a machine can do it; console
steps go to the Claude browser agent via the scripts in 3e. Coder priorities, in order:
WP-29 (C-106, stale picks automated), C-107 (display label and claim, IMPLEMENTED flip,
MODEL_VERSION v5.2.8), FE-05/FE-10/FE-15 copy. The calibration streak runs on its schedule
and the publish receipt is automatic at streak three; the public flips are two Vercel
variables (`PERFORMANCE_STATS_ENABLED`, `PRICING_PHASE=PROVEN`) after that receipt AND
C-107 are live. Hermes merges `origin/main` before opening its PR.**

**UPDATED 2026-09-05 (18:20 UTC) by the launch session on `claude/sports-prediction-launch-rtiexc`
(PR #707, since merged). Read `docs/ops/LAUNCH_FINISH_LINE_2026-09-05.md` before claiming
anything: section 3b holds eleven decisions the founder delegated in-session, section 4 the
founder-only actions, section 5 every dispatchable work package (WP-1..26, FE, FAN, NFL, OPS,
TCI, SEC) with entry files and acceptance commands. Ledger rows C-80..C-103 and F-14..F-33.**

- **TOP founder item (F-15): The Odds API account is in a payment state.** HTTP 402
  "payment circuit open" on every hourly cycle since 2026-09-03 20:20 UTC. The shared
  breaker stopped paid book odds at 2026-09-05 00:30 UTC; zero book-priced picks were
  generated in the 18 hours after. Fix the account. Do not upgrade the tier.
- **Second book root cause (2026-09-05 production logs, verbatim):** every refresh cycle,
  all four in-season sports log `rundown empty (2d): HTTP 429 rate_limited`. TheRundown is
  the registered commercial-use fallback (`packages/data-ingestion/src/source-registry.ts`
  id `therundown`, free 20k data-points/day) and it alone satisfies `MIN_BOOKMAKERS = 2`;
  our own cadence (refresh-odds every 15 min plus board-fill 4x/h, 4 sports, 2 dates, no
  cooldown after a 429) exhausts its daily quota early and it 429s for the rest of the day.
  ESPN public (`espn_public`) is one book (DraftKings via ESPN, verified live for NFL, CFB,
  MLB, MLS), so no picks can be book-priced without a second cleared source.
- **The completely free two-book board is already designed in this repo (WP-27, ledger
  C-104). Founder position, verbatim from the Hermes brief on PR #680: "we are the provider
  (Galaxy Sports API). Not Rundown. Not The Odds API."** Book 1 is ESPN inline odds through
  `GalaxySportsApiOddsProvider` (PR #680 branch `hermes/galaxy-keyless-odds`, de-vig
  formula, 8s timeouts, registry entry `galaxy-espn-inline`). Book 2 is Kalshi exchange
  quotes as a real bookmaker (`galaxy-kalshi-book.ts` on that branch) fed through the
  PredExon catalog (`packages/data-ingestion/src/predexon-client.ts` on main, verdict
  use-with-caution, free key the founder already holds, `PREDEXON_INGEST` default OFF),
  which is the legal route around Kalshi Dev Agreement section 3. Kalshi lists
  `KXNFLSPREAD` and `KXNFLTOTAL` (`kalshi-series.ts`), so NFL spreads and totals are
  reachable, not only moneylines. Nothing on main consumes PredExon yet: that wiring plus
  re-landing the #680 core is the work. TheRundown is at most a bridge (WP-26), not the
  product path.
- Decisions already taken (do not re-open): the keyless Galaxy Sports API becomes primary
  with Kalshi via PredExon as the second book (WP-27); v5.2.8 YES sequenced after the first clean NFL Sunday; stale
  published picks are UNPUBLISHED via `npm run ops:stale-picks:unpublish -- --execute`
  (owner-run); ESPN Power Index is gated fail-closed (`ESPN_POWERINDEX_LICENSED` unset);
  `hermes/settlement-token-fix` is superseded by `6880f18` (do not merge it); Vercel cron
  is the primary scheduler; `/picks` is the product surface; the `/fantasy` age gate stays.
- **Coordination with `hermes/finish-line-2026-09-05` (verified against the remote 2026-09-05
  18:55 UTC):** that branch is stacked on top of the #707 branch at `6a9c092f7` and merges
  cleanly with the #707 tip (`git merge-tree` reports no conflict). SEC-01 (`fe42773bd`) and
  SEC-02 (`96ab46d27`) are on the remote; ledger C-102 is owned by hermes (CLAIMED), do not
  edit that row from another branch. **Update 2026-09-06 00:10 UTC (verified against the
  remote):** the Hermes tip is `5fa7c88d0`; SEC-03 (`dbb49850b`, `7bc9508d5`, `8014c67c8`)
  plus its repair (`3efb1634d`, the half-applied `contests/enter` edit is finished), SEC-04
  (`30b238e12`) and SEC-05 (`e60f887a9`) are on the remote. It also carries C-108
  (`99ff4d545`, an OpenRouter free lane for the Claude API router), which edits
  `.env.example`: law 2 freezes any `.env*` for agents, so the founder accepts that hunk
  explicitly or Hermes moves the variable documentation to `docs/ops/OPERATOR.md` section 5.
  `git merge-tree` of the Hermes tip against the #707 tip (`0fb97ab36`) is still clean.
  Landing order unchanged: #707 first, then Hermes merges
  `origin/claude/sports-prediction-launch-rtiexc` (WP-27, the calibration pass `fbc3784c7`)
  into its branch before opening its own PR.
- **PROVEN is days away, not weeks (measured on production 2026-09-05 19:05 UTC, read-only
  SQL):** on settled MONEYLINE picks that carry a receipt, the market-anchored probability
  reads n 150, Brier 0.1692, Murphy REL 0.0050, ECE 0.0552 (ten bins). Excluding soccer
  two-way moneylines (wrong by construction on a three-way market; the engine already refuses
  to publish them), the same sample reads n 115, Brier 0.1444, ECE 0.0440, Murphy REL 0.0044:
  **all four floors pass today.** Founder approved the source switch and cron triggering at
  19:20 UTC. 610 more settled moneyline picks have no
  receipt but their publish-time market probability is recomputable from the append-only odds
  table with zero writes (WP-28, C-105). The eligibility streak is three consecutive green
  runs of a six-hourly cron. Shipped in `fbc3784c7` on the #707 branch: the
  measurement side of WP-1, WP-28 and the drift alert (receipt-first scoring, MONEYLINE-only
  pooled floors, basis-aware streak). Receipts carry a mean-implied proportional de-vig, not
  Shin-median; the proposal wording now says so. Remaining: C-107 (display label and claim
  copy, then the IMPLEMENTED flip and MODEL_VERSION v5.2.8),
  restore the book-priced flow, streak, founder flips `calibrationPublished` and the PROVEN
  pricing phase (F-36). Plan section 3c.
- **No pick ever sits (founder policy 2026-09-05):** graded, voided with an RCA reason through
  the settlement outbox lane, or unpublished. WP-29 (C-106) automates it; the owner tool
  handles today's 20 stale rows once.
- Settlement CRITICAL (36 overdue) root causes are fixed on the PR branch, not on main:
  ESPN `limit=1000` truncation, matcher containment on 2-3 letter abbreviations and bare
  club tokens, overdue-only runner slice, backfill date order. Do not re-fix them; land #707.

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
  npm run typecheck                              # exit 0 (real exit code — never pipe it away)
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


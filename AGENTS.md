# AGENTS.md â€” autonomous run contract

Auto-loaded by Grok Build, Codex, and Copilot at workspace root; Claude Code loads it through the `@AGENTS.md` import on line 1 of `CLAUDE.md`. Read this first, every session.

Repository rules live in `CLAUDE.md` and apply in full. This file governs how an
**unattended agent** works here.

---

## CURRENT STATE

Plan: `docs/ops/LAST_PLAN_2026-09-15.md` Â· branch `hermes/last-plan-2026-09-15` Â· head `7f4f29e82` Â· Phase 0 Â· rows: Phase 0 DONE. Phase 1 DONE/UNPUSHED: C-355..361, C-392..396, C-410, C-413, C-414, C-415, C-420, C-362. Next: C-416 C-417 then Phase 2 factors.
Founder hands-only pending: Â§0.2 items 1â€“5 (rotate secrets; Stripe/Vercel PRICING=FOUNDING; set PREDEXON_API_KEY/HEALTH_ALERT_WEBHOOK_URL/SENTRY_DSN/OPS_READ_SECRET; merge labelled PRs; supply oddsmagnet months + prop-line file).
Open security work not in this plan: issue #820 transport half (connect-time address check).
Do-not-touch: `hermes/v528-market-gate-preserved-2026-09-11` (does not compile); checkout price-mismatch (fail-closed is correct); pricing amounts; any gate/env flag.
Last five: C-415 943937478; C-414 78838246d; C-362/395 dd58e6ebc; C-358 71815cdc5; C-360 55a474ade.

### PredExon handoff (for every later agent)

- Key lives only in Vercel PREDEXON_API_KEY (founder §0.2 item 3). Never commit/log a key.
- Free & unlimited: GET /v2/kalshi/markets, GET /v2/kalshi/trades, all list-markets and orderbook-history endpoints. Counted 1k/month: everything else. Rate limit free: 1 req/s.
- **Never** call /v2/data/ticks (paid Parquet, D15). Guard: ssertNotPaidTickPath in predexon-client.ts.
- Ingest ON when key present (D19) unless PREDEXON_INGEST explicitly off. No key → fail closed.
- Book 2: galaxy-kalshi-book.ts via PredExon only (D4). Midpoint: actorBreakdown.exchangeMidpointProb.
- Tape: exchange-tape-capture.ts → odds_line_snapshots book kalshi-predexon, series KXNFL*. Pace default 1100ms. Volume/OI/trades have **no schema column** — name them in evidence, do not migrate (law 2).
- Improvements welcome: keep free-plane only, cite docs.predexon.com, add tests, update this block.

---

## THE LOOP

```
1. git fetch origin; open docs/ops/AGENT_LEDGER.md at the latest branch tip
2. Also check docs/ops/hermes/BUILD-QUEUE-*.md (latest date) if present â€”
   it is the current build task list when one has been issued
3. First unclaimed row you can do -> claim it (Owner + Status: CLAIMED) in
   the SAME commit that begins the work
4. Do exactly that task, nothing else
5. Run its Definition of Done / the repo guards (see WORKING RULES)
6. Mark DONE (with a real SHA) or BLOCKED (with the exact error), one line
7. Commit; push only if explicitly told to for this session â€” otherwise
   stay UNPUSHED and say so
8. Go to 1
```

Never ask what to do next â€” the ledger knows. The owner is asleep or busy.
The ledger is how you talk to them, and to every other agent working here.

---

## THE LAWS

Breaking one discards the run.

1. **NEVER `git push` unless the owner said so for this session.** Default is
   commit locally, the owner reviews and pushes. If the owner has explicitly
   told you to push tonight, push only to the branch named, never to `main`
   directly unless that too was explicit.
2. **NEVER modify:** `packages/db/prisma/schema.prisma` Â· `packages/db/prisma/migrations/**` Â·
   `.github/workflows/**` Â· `scripts/guardrails/**` Â· `.claude/**` Â· any `.env*` Â·
   `package-lock.json` Â· `.gitignore` Â· `.githooks/**` Â· `apps/web/lib/ai-control-plane/**`
3. **NEVER flip a gate or env flag** â€” `PUBLIC_PICKS`, `STATS_PUBLIC`, `LIVE_BOARD`,
   `PERFORMANCE_STATS`, any other. Never edit code so a gate resolves differently.
   **Owner amendment, 2026-09-09 (founder, verbatim: "if we need to remove this then do
   it", "APPROVED", "if we have to revise or polish some laws then do it"):** a gate's
   ESTIMATOR may be corrected when the correction is derived, documented and tested, keeps
   every floor value byte-identical, reports the raw number beside the corrected one, and
   is recorded as a ledger row citing this amendment. C-290 as reworked by C-292 (the
   bias-corrected ECE, `docs/ops/CALIBRATION_ECE_ESTIMATOR_2026-09-09.md`) is the first and
   only such change; a correction may be applied to a stratum the gate reads as well as to
   the pool, and must never let a stratum pass on fewer rows than the n floor.
   **Second amendment, 2026-09-09 (founder, verbatim: "if we have to change laws or rules or
   wording then do it"):** a row may be EXCLUDED from the eligibility sample when its
   probability is shown by measurement not to be a publish-time market price (in-play
   generation, C-298; a receipt-only or factor-breakdown-only probability the odds table
   cannot reproduce at generatedAt, C-300), provided the exclusion is counted by reason on
   the artifact and the streak restarts on the new basis tag. An exclusion may never be
   chosen by outcome, and a row the odds table prices is never dropped.
   Flipping an env flag, lowering a floor, or widening a sample stays forbidden.
   Never run a cron with a real secret. Never search for credentials. These gates are
   the honesty boundary; opening one publishes an unearned claim.
4. **NEVER write a claim you did not observe.** Every report line traces to a command
   you ran and output you saw. Not run â†’ write `NOT RUN`. Failed â†’ paste the error.
   An honest gap is a contribution; an invented fact is sabotage.
5. **NEVER mark DONE** unless the Definition of Done commands actually passed.
6. **NEVER `git commit --no-verify`.**
7. **NEVER install a package, run a migration, or touch a database.** (Bare
   `npm install` is fine â€” it is setup, and it still works normally.)
   **Supply-chain controls, added 2026-08-16 â€” do not disable them.** `.npmrc`
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
8. **NEVER fabricate product data** â€” no mock picks, sample odds, placeholder win
   rates, invented benchmarks. Anywhere.
9. **NEVER weaken a guard to make a test pass.** Never delete a phrase from a
   forbidden-copy list, never loosen an assertion's intent, never change a guardrail's
   threshold. If a guard is red, either the code is wrong or the guard needs *narrower*
   context â€” never less power.


10. **No public rate without its denominator.** Any surface that renders a win rate, CLV rate, calibration number, or verdict renders on the same surface: n, the population definition, and every exclusion count that changed the denominator (in-play, unpriced, pushes). A producer of an exclusion count with no renderer is a defect.
11. **No MODEL_VERSION bump without a frozen-holdout scorecard.** The bump commit must reference a `docs/factors/*.yaml` row with `run_sha` and a `packages/verifier` scorecard on PICKS-H1 in which the candidate beats the market-anchored baseline. Withhold-only changes remain exempt from the bump.

### Plan amendments (founder authorised 2026-09-15, LAST_PLAN D8/D16/D19/D20)

- **L1 for this run:** Hermes pushes to `hermes/last-plan-2026-09-15` and opens draft PRs per phase. Never to `main`. Never force-push. Expires when the plan rows are DONE.
- **L2 (D16):** frozen paths (`packages/db/prisma/migrations/**`, `scripts/guardrails/**`, `.github/workflows/**`) may be edited by Hermes only in a separate draft PR labelled `frozen-path`, one PR per path family, that the founder alone merges. `schema.prisma`, `.claude/**`, `.env*`, `package-lock.json`, `.githooks/**` and `apps/web/lib/ai-control-plane/**` stay fully frozen.
- **L3 (D19):** the law guards publish gates, floors, prices and calibration flags. An ingestion switch whose only effect is reading more data turns itself on when its credential or roster exists.
- **L11 (D20):** model bumps this plan names are pre-approved on a passing pre-registered scorecard; the bump ships as a `model-version` PR the founder merges.

---

## WORKING RULES

- **Two attempts per task.** Then revert, mark `BLOCKED` with the exact error text,
  move on. Never a third. A BLOCKED task with an honest error is a success.
- **One task = one commit.** Stage by name â€” never `git add -A` or `git add .`.
  Tag every message `[hermes-<task-id>]`.
- **Verify block before every code commit:**
  ```bash
  npm run typecheck                              # exit 0 (real exit code â€” never pipe it away)
  npm run lint                                   # exit 0
  npx vitest run <this task's test file>         # green
  ```
- TypeScript is strict. Never `any`, `as any`, `@ts-ignore`, `@ts-expect-error`.
- Update the ledger the moment a status changes. Never batch it.

---

## DECISION BUDGET

Per task: **3 file reads Â· 2 command runs Â· ONE conclusion Â· then act.**

If you catch yourself writing *"actually"*, *"wait"*, *"let me reconsider"*, or
*"let me think about this differently"* â€” **stop. You already have your answer.**
Execute it. If it is wrong, the Definition of Done catches it and you get one retry.
That is what two strikes are for. Never re-derive a conclusion you already reached.

**PRECEDENT FIRST** on any test repair â€” before analysing anything:
```bash
git grep -l "<the symbol or module the test needs>" -- "*.test.ts"
```
If another test already mocks it, copy that pattern. That is both the answer and the
evidence, in one step.

---

## CONTEXT HYGIENE â€” this is what keeps you alive

You will be cut off when your context fills. That is expected and survivable, because
the ledger holds your state. Make each session last longer:

- Do not re-read a file you already read this session.
- Do not re-read `CONTINUOUS.md` in full â€” jump to the section you need.
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

## HISTORY

Dated session notes live in `docs/ops/SESSION_LOG.md`, newest first.


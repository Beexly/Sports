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

## BE THE PROVIDER — Self-Provisioned Odds (2026-08-27)

**Direction: we are the odds provider. No third-party odds API dependency.**

The $30/mo The Odds API bill is not the object — dependency on a third-party
aggregator is. The Odds API's own Terms (§Market Data & Transparency) state their
data is "aggregated from publicly accessible sources available to the general
public on the public internet" and that "the Service does not circumvent
authentication controls." If they can aggregate public bookmaker pages, we can
do the same for personal use. We do not need The Odds API, TheRundown, or any
other paid/free third-party aggregator.

### What agents must NOT do

- Do NOT add TheRundown as a dependency. It is a third-party aggregator we don't need.
- Do NOT rely on The Odds API. The key can be unset; the pipeline must work without it.
- Do NOT touch the Polymarket compliance hold (`docs/agent-skills/polymarket-hold`).
  It is NOT unfinished work — it is a legal gate. Leave `INDEPENDENT_POLYMARKET` OFF.
- Do NOT scrape DraftKings, Action Network, or BettingPros — their ToS prohibit
  automated collection. Use only public sources whose ToS permit programmatic reads.
- Do NOT flip `LIVE_BOARD`, `PUBLIC_PICKS`, or any gate to make this work.

### What the self-provisioned odds path IS

Direct adapters to public bookmaker odds pages and keyless APIs, normalized to
the repo's `OddsApiEvent` shape, merged via `odds-failover.ts`, ingested through
the existing `processSport()` pipeline. No third-party aggregator in the middle.

See `docs/ops/galaxy-self-provisioned-odds-architecture.md` for the full
architecture, source list, legal boundary, and build order.

### Local-only artifacts (Claude Code can't reach these)

Claude Code runs in the cloud and only has access to this repo. The following
artifacts live on Garrett's local machine and are NOT in this repo (gitignored
under home-dir deny-by-default). They are proof-of-concept, not production.

| Artifact | Path | What it is | How to use |
|---|---|---|---|
| Galaxy Sports API | `C:\Users\Garrett\galaxy-sports-api\odds_feed.py` | Python HTTP server (port 8731). Fetches ESPN `site.web.api` + Polymarket Gamma, returns Odds-API-shaped JSON with `generated_at`, `stale`, `served_at` flags. | `python3 odds_feed.py --serve 8731` then `curl localhost:8731/odds?sport=nfl`. Verified 2026-08-27: count=42, stale=False. |
| Serve log | `C:\Users\Garrett\galaxy-sports-api\serve.log` | Stdout from the server process | `cat serve.log` |
| Source extracts | `C:\Users\Garrett\Downloads\extract-data-2026-08-27*.json` | 3 JSON files: The Odds API provider spec, tracking/ingestion systems, commercial/legal framework | Read with any JSON viewer |
| Raw Odds API pages | `C:\Users\Garrett\Downloads\769a3bce-*.zip` | 9 scraped pages from the-odds-api.com (terms, bookmaker list, betting markets, API guide) | `unzip` to `_extract_zip/` |

These are reference/proof only. The production path must be built in THIS repo
as TypeScript packages so Claude Code and all agents can reach and maintain it.

### ESPN endpoint mismatch (known issue)

The repo's `packages/data-ingestion/src/espn-odds-client.ts` targets
`sports.core.api.espn.com` — which is BLOCKED from this IP (Akamai 403).
The local Galaxy script uses `site.web.api.espn.com` — which works.
Fix: update the repo's ESPN client to use `site.web.api.espn.com` or add it as
an alternative endpoint in the failover chain.

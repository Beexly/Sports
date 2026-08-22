# GRIND WORK ORDER — 7-day sprint for OX-BETA (second Hermes)

**Owner:** driven and reviewed by the Claude session that authored
`EDGE_FACTORY_MASTERPLAN.md` and `EDGE_SUPREMACY_DOCTRINE.md`.
**Horizon:** 7 days. NFL kickoff follows immediately after.
**Governing docs (read these, not the tree):**
`docs/data/EDGE_FACTORY_MASTERPLAN.md` · `docs/data/EDGE_SUPREMACY_DOCTRINE.md` (§H0 is
the NFL battle order and supersedes the masterplan's P2 ordering).
**Operating rules you inherit:** root `CLAUDE.md` — the non-negotiables (no fake data, no
fabricated stats, server-side paywalls, no secrets in code, no stale data, tests required,
strict types), the subagent domain table, the prediction-engine rules, the legal scraping
posture, and the Autonomous Loop Protocol (a task is NOT complete until tests, types, and
build pass). Also `docs/agent-skills/README.md` and `docs/ops/OPERATOR.md`; the thin
harness is `npm run agent:eval`.

---

## The one idea behind this order

Every hour an agent spends re-deriving what already exists is an hour of edge not built,
and it is paid for in tokens at the most expensive tier. This repo already knows this —
there are 60+ `guard:*` scripts doing deterministic work that no model has to re-reason.

**So Tier 0 of this sprint is not an edge. It is the substrate that makes every future
agent-turn — mine, Grok's, the other Hermes's, every cheap sub-agent's — dramatically
cheaper.** Build the maps, the generators, the fixtures, and the benches first. Then the
edges in Tier 1–2 get built at a fraction of the token cost, by cheaper models, forever.

Ordering rule for the whole sprint: **anything that converts recurring LLM reasoning into
a script that runs for free outranks anything that doesn't.**

---

## Tier 0 — TOKEN SUBSTRATE (days 1–2, highest ROI in the document)

### T0.1 · `npm run data:dict` → `docs/data/DATA_DICTIONARY.generated.md`
Machine-generated inventory of every field we can actually read: nflverse PBP columns,
NGS weekly fields, rosters/draft/combine, snap counts, schedules, injuries, depth charts.
Per field: **name · source · grain · join key · license tag (CC-BY vs CC-BY-SA vs ours)
· seasons covered · null rate · example value · may-enter-p (covariate|y-axis|never)**.
Generated from the real ingested data + registries, never hand-maintained.

*Why it's first:* today, any agent asking "do we have `defenders_in_box`, and is it
SA-poisoned?" pays for a repo crawl and may still guess wrong. After this, that question
costs one file read, and the license answer is authoritative. This single file kills the
most expensive recurring question in the whole project — and it's the file the doctrine's
whole legal posture depends on being right.

### T0.2 · `npm run repo:map` → `docs/REPO_MAP.generated.md`
Auto-generated index of the 21 packages + workers: package → one-line purpose → key
exports → entry points → the `npm run` scripts that touch it. Agents read one map instead
of crawling `packages/*`. Regenerate in CI so it can never drift.

### T0.3 · Covariate scaffold generator — `npm run edge:new-covariate <name>`
Emits, pre-wired and passing: the covariate module on the existing bus (follow the #547
covariate-bus pattern), its test file, its registry entry with `provenance` +
`known_at` + `priced:false`, and a doc stub. **Each future battle-order slice becomes
"run the generator, fill in the math" instead of "have an expensive model rewrite the
same 200 lines of plumbing."** This is the single biggest per-slice token saving available.

### T0.4 · Frozen fixture corpus — `packages/dev-tools` (or nearest existing home)
A small, checked-in, deterministic slice of PBP + NGS + rosters + schedules (a few weeks,
a few teams). Every test and every agent experiment runs offline against it: zero API
calls, zero Odds spend, reproducible output. Agents stop burning turns on "I can't run
this without data."

### T0.5 · Provenance registry + `npm run guard:q-contamination`
Machine-readable registry of every p-side covariate with `provenance:
L0|L1|L2|L3|MARKET_GAME|MARKET_PROP` and `known_at`. The guard walks it and **fails the
build** if any `MARKET_PROP` feature reaches `p`, or if any feature's `known_at` is later
than decision time. Fits the existing `guard:*` convention exactly. The doctrine's central
invariant stops being a rule agents must remember and becomes a rule CI enforces.

### T0.6 · `docs/data/CHECKPOINT.md` protocol, machine-friendly
One append-only status file: phase, slice, files touched, decisions, blockers, next action,
and anything nearly-scraped or nearly-spent (confess). This is what I read to steer you —
keep it current or I am steering blind.

## Tier 1 — THE VALIDATION BENCH (days 2–4: compute replaces reasoning)

### T1.1 · `npm run edge:validate <covariate>`
Walk-forward (expanding-window by season/week) CV — random K-fold **banned**. Scorers:
log-loss + Brier for binaries, **CRPS** for counts/yardage, PIT histograms, calibration
slope, all per prop family. Emits a report file, exit-code non-zero on regression.

### T1.2 · CLV referee inside the same CLI
Simulated flat-stake CLV vs consensus close at decision time, from our own line archive.
A covariate that improves log-loss but not CLV is describing the market, not beating it —
the bench must say so without a human or a model in the loop.

### T1.3 · `npm run edge:mine <grid.yaml>`
The masterplan mining engine as a script: pre-registered grid config (checked in — adding
cells requires a new version), hierarchical partial pooling, **BH-FDR across the whole
grid**, season sign-stability, minimum-effective-sample with design effects. Emits ranked
HYPOTHESIS rows for `EDGE_CATALOG.md`.

*Why Tier 1 matters for usage:* after this, testing an edge costs CPU, not tokens. The
expensive model is needed only to propose mechanisms and to read verdicts. That is the
difference between a few edges a month and the cadence this project is named for.

## Tier 2 — NFL BATTLE-ORDER EDGES, code-first (days 4–7)

Work `EDGE_SUPREMACY_DOCTRINE.md` §H0 top-down, skipping anything the other Hermes has
already shipped (check `CHECKPOINT.md` and recent main first — **do not rediscover**).
Start with the pure-code items, because they need no new data and pay from week 1:

- **C2.1 kneel / garbage-time model** — end-of-game absorbing states from PBP; fixes the
  *shape* of attempt and pass-yds props for every favorite.
- **C3.1 alt-ladder coherence scanner** — a book's alt ladder is a set of quantile claims
  on ONE distribution; flag ladders that imply impossible densities. Runs daily, free.
- **C6.2 closing-line forecaster v0** — from our own archive; it manufactures CLV, which
  is literally the PROVEN-milestone metric on the pricing ladder.
- **C5.1 incentive calendar + C5.3 rule-change watchlist** — this offseason's NFL rule
  changes are mispriced right now and stay mispriced for weeks.

Then the masterplan covariates in §H0 order, each via the T0.3 generator.

## Tier 3 — FLEET FACTORY (start day 3, runs alongside everything after)

**This is the real end state, and it outranks any single edge: one operator plus a large
fleet of cloud agents, each spawned already knowing what every previous agent learned.**
Tier 0 makes a turn cheap; Tier 3 makes an *agent* cheap. Together they're the only way a
solo shop out-produces a staffed desk.

The repo already has the primitives — the `CLAUDE.md` subagent domain table, the skills in
`docs/agent-skills/`, and `npm run agent:eval` as a harness. Turn them into a factory:

### T3.1 · Lessons → skills (the compounding loop)
Every non-obvious thing you learn — a gotcha, a repo convention, a license trap, a command
that works, a way a slice failed — becomes a **skill file**, not a line in a chat log. Each
new agent then starts where the last one ended instead of paying to rediscover it. Rule:
**if you explained something to a sub-agent twice, it's a skill.** Feed candidates through
`npm run agent:eval` so a skill has to demonstrably help before it joins the roster.

### T3.2 · Spawn templates per domain
One reusable prompt template per `CLAUDE.md` subagent domain (data-ingestion,
prediction-engine, subscriptions-billing, content-publishing, frontend-app, testing-qa),
plus new edge-lab roles: `covariate-slicer`, `scanner-builder`, `catalog-miner`,
`validator`. Each template hard-codes: governing docs to read, forbidden zones, the
`priced:false`/fail-closed rules, expected artifact, CHECKPOINT format, and **the explicit
instruction never to crawl the repo** (read the generated maps). A template is what makes
a cheap model behave like an expensive one.

### T3.3 · Fleet checkpoint aggregation
One `docs/data/FLEET_STATUS.md`, machine-written, summarizing every active agent: who,
which slice, last checkpoint, blocked-yes/no, PR link. **I read one file to steer ten
agents instead of ten transcripts.** Monitoring cost is what caps fleet size — this raises
the cap.

### T3.4 · Spawn playbook
Write down what makes a spawn succeed vs. stall (scope size, artifact definition, isolation,
when a worktree is needed, how to hand off). We will be launching many; the playbook is how
the tenth spawn is better than the first instead of the same.

*Scaling posture:* start narrow — the templates that cover this sprint's own work. As
lessons accumulate, widen the fleet aggressively. The constraint on fleet size is never
ambition; it is (a) monitoring cost, solved by T3.3, and (b) spawn quality, solved by T3.1
and T3.2. Solve both and the fleet grows as large as the work.

---

## Rules (non-negotiable, inherited)

- `priced:false` on everything. No `MODEL_VERSION`. No Odds spend. No new Odds markets.
- Fail-closed on missing data. Honest labels when a proxy ≠ the measured quantity.
- **No scraping, ever.** Clearance Engine + source-rights registry before any new source.
  CC-BY-SA (FTN, `pbp_participation`, `defenders_in_box` if SA) must not reach derived `p`.
- Forbidden zones: Prisma schema/migrations, event-odds-ingest, line-archive writes,
  prod env/secrets, vercel config, and the other Hermes's worktree.
- Isolated worktree off `origin/main`. One PR per slice, tests + typecheck + lint green.
  **Do not merge — I merge.** Keep ALL `index.ts` exports on conflict.
- Everything stays HYPOTHESIS until it clears the masterplan's validation gates.

## Token discipline for YOU (you are also a model with a budget)

1. Read the generated maps (T0.1/T0.2) and the two governing docs — **not the tree**.
2. Batch mechanical work to cheap sub-agents: one item each, given only the relevant
   doc section and exact file paths, **never the repo**. Verify in one pass yourself.
3. Never paste large files into context to "look at them"; grep to the line, read the span.
4. If a task will recur more than twice, stop and write the script instead. That is the
   whole thesis of this order.
5. Confess in CHECKPOINT anything you nearly scraped, nearly spent, or nearly guessed.

## Done-when (day 7)

`data:dict`, `repo:map`, `edge:new-covariate`, the fixture corpus, `guard:q-contamination`,
and `edge:validate` all exist and run green in CI; at least the first two Tier-2 NFL edges
are open as reviewed PRs; the first spawn templates and `FLEET_STATUS.md` exist; and the
next agent to touch this repo — any model, any tier — can find every field, every module,
and every validation result without a single exploratory crawl, and can be spawned already
knowing everything this sprint learned.

# HANDOFF — reasoning is the product

**To:** main coding agent. **From:** Hermes (this session). **Date:** 2026-10-23.
**Branch:** `hermes/ship-night-findings`, PR **#1195** (OPEN, CI green at `29fa81691`).

Read the doctrine first, then the state, then the plan. The doctrine is the part
that was being got wrong.

---

## 1. Doctrine (user's, verbatim in spirit)

- **The reasoning IS the product.** Not Brier, not the closing line. Brier and CLV
  are small parts of a much larger engine. Do not regress toward them.
- The engine must **reason over as many signals as exist**, adjudicate conflicts,
  and **see past market bullshit and manipulation**. The market is one small input.
- "Leaderboard" means an **external, judge-based, comparative benchmark** — not our
  own pass/fail gate against a coin and a close. Our gate is a floor, not the goal.
- Never fabricate. Named evidence, named failures, no silent imputation.

## 2. Current state, verified

Reasoning work landed on this branch (13 commits): market/engine fair values named
separately, units in context clauses, falsifier clause, book count, a scored
reasoning benchmark with labelled findings, a CI prose smoke suite, and negative
controls proving the harness can fail. Numbers today: grounding .9464, specificity
.9809, rubric 89.80, Brier .2154 v market .2158, `fairChecksApplied: 0` on legacy
rows (so consistency 1.0 is "nothing disproved it", not verified).

`engine/factor-narrative.ts` is committed and passing (13 tests) and **must not be
wired as designed**: it narrates the MARKET factors as the reason for a pick, which
is the exact failure this work exists to kill. It does carry the right shape —
`narrateFactors` for weighted reasons and a collapsed `watchedSignals` clause
("Also watching (no weight yet)") for the nine shadow families — so reuse the
mechanism, replace the source of truth.

`scoring.ts` is the real file again (+120/-12 v main), not the placeholder. Do not
regress it.

## 3. What is actually broken — the audit finding

Every pick stores a `factors[]` array with name/impact/weight/description, e.g.
`Bookmaker Consensus, w30, "100% of bookmakers align on this side"`. All 4,572
rows carry it. **The reasoning sentence rendered none of it** — it was a market
echo built from the same numbers. The argument was computed, weighted, stored,
then dropped at the sentence. Wiring `factorNarrative` is step 1.

**Worse:** nine signal families are computed as `Shadow …` at **average weight
0.0**, all with the same description — *"tracked in shadow mode only; no licensed
context provider is configured"*:

`MILESTONES · VENUE ENVIRONMENT · PLAYER AVAILABILITY · DIVISION CONTEXT ·
STANDINGS · PACE · TEAM RATES · OFFICIALS`

3,477 occurrences each. So the engine claims nine signal families and reads none
of them. Any weight-5 narration filter silently discards all nine — that is why
`MIN_NARRATED_WEIGHT` must not be the only path; shadow reads need their own tier.

Populatable NOW from sources already in the repo: `PLAYER AVAILABILITY` (nflverse
`injuries` + ESPN injury report), `VENUE ENVIRONMENT` (`nws-weather` is already a
registered source), `OFFICIALS` (pbp referee/crew columns), `STANDINGS`/`DIVISION`
(ESPN standings), `PACE`/`TEAM RATES` (pbp aggregates, partially there already).

## 4. Plan, in order

1. **Wire `factorNarrative`** at all three reasoning sites (`scoring.ts` 1027/1301/1687;
   `factors` is in scope at each) and replace `reasoningShort`'s bookmaker line with
   `factorHeadline`. Market values stay, but as one line among several.
2. **Add the shadow tier to narration**: `Watching: Pace, Officials, Venue (shadow,
   no weight yet)` — with the configured/unconfigured distinction visible in prose.
3. **Populate providers**, one family at a time, hardest evidence first
   (availability → venue → officials → standings → pace). Each gets an evidence
   entry with source, trust and freshness; a stale read says so.
4. **Grade shadow → weighted** only when a family has an out-of-time measurement,
   and record the cycle that earned it.
5. **Conflict adjudication**: when factors disagree (movement against a consensus
   tailwind), the reasoning must say which won and why. Currently both are simply
   listed.
6. **External judge layer** on the benchmark: an LLM-judge rubric over artifacts
   (mechanism, evidence use, manipulation awareness, falsifier quality), scored
   blind and compared across revisions. That is the leaderboard shape the doctrine
   asks for; today it is component math only.

## 5. Fixture and tooling traps (all hit personally)

- `computeGameContext` **rebuilds** the context object and silently drops fields it
  does not copy. Every new field needs explicit passthrough.
- `commenceTime`/fetchedAt must be `Date` objects; ISO strings silently yield zero
  picks from `scoreGame`.
- A thin context clears no gate — confidence needs the form buckets.
- Pinning one `marketFairProb` across a fixture flags genuine renders as
  inconsistent, because each pick prices its own side.
- **Escape mangling:** `\\d` and `\\b` in regexes arrive corrupted through this
  toolchain. Prefer `[0-9]` classes; regex literals survive better than strings.
- Two guardrails scanned sibling `.worktrees` checkouts; both now skip them.
- Budget: full package suite is ~150 s and one test flaked once, passed twice
  after. Guardrails are 31/31; keep them there.

## 6. Commands

```
cd packages/prediction-engine && node ../../node_modules/vitest/vitest.mjs run
cd ~/Sports && node scripts/guardrails/run-all.mjs
cd apps/web && DATABASE_URL=$(neon connection-string main --project-id summer-brook-99380762 --role-name hermes_ro | tail -1) \
  RECAL=1 NODE_PATH=<repo parent>/node_modules npx tsx scripts/bench-reasoning.mts 4000
```

Baseline, limits and target list: `docs/ops/REASONING-BENCHMARK.md`.
Calibration proposal for v5.3.1: `docs/calibration-proposals/`.

## 7. Do not

- Do not re-centre the work on Brier or CLV.
- Do not delete killed constants — the registry keeps them at weight 0 with evidence.
- Do not loosen the consistency check to make the gate pass; label the cause first.
- Do not add a provider without freshness and a trust level; a stale read is worse
  than a missing one if it is not labelled.

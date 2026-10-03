# FLEET-50 — fifty free agents, one direction

Companion to `docs/ops/FREE_WINDOW_BLITZ.md` (data classes, window economics) and
`docs/data/GRIND_WORK_ORDER.md` (what to build). This file answers one question:
**how do fifty agents, on a dozen different free models, produce one coherent
world-class engine instead of fifty divergent piles?**

---

## 1. The answer: you align a fleet by CONTRACT, not by instruction

Fifty agents given fifty good instructions produce fifty incompatible artifacts. The
same fifty agents given **one frozen interface and one slot each** produce a system.

> The contract is the direction. Freeze it before a single worker spawns.

That means the sequence is non-negotiable:

```
PHASE 0  (paid tier, hours, ~2 files)   FREEZE THE CONTRACT
         every function signature, every file path, every type, every test
         command, the error semantics, the units. Nothing to invent later.
              ↓
PHASE 1  (50 free agents, parallel)     FILL THE SLOTS
         each agent implements exactly ONE named slot against that contract.
         No agent designs an interface. No agent reads the repo.
              ↓
PHASE 2  (CI, deterministic, free)      VERIFY BY MACHINE
         typecheck + the slot's own tests + the contract conformance test.
         Quality stops depending on which model got the card.
              ↓
PHASE 3  (cross-model, free)            ADVERSARIAL CHECK
         a DIFFERENT model family reviews each artifact against the contract.
              ↓
PHASE 4  (paid tier, serial)            INTEGRATE + MERGE
```

**Why this is the whole trick:** the intelligence lives in Phase 0, which is small,
expensive, and ours. Phases 1–3 are large, mechanical, and free. We are buying scale
where scale is cheap and keeping judgment where judgment matters.

**Corollary — where "world class, nobody has seen this" actually comes from:** not from
the agents. From what the contract *encodes*. Most public sports models are point
estimates from box-score regressions. Our contract mandates proper scoring rules (CRPS,
PIT) instead of hit rate, walk-forward evaluation with random K-fold made *impossible at
the API level*, compositional (Dirichlet) shares instead of independent per-player
counts, explicit censoring and zero-inflation, and one joint simulation all props are
marginals of. Fifty free agents implementing that contract build something no public
model has. Fifty free agents without it build noise.

## 2. Free-model roster — chosen by task shape, not by brand

Because the whole free lane is PUBLIC-class (`FREE_WINDOW_BLITZ.md` §3), **training-on-
input is not a disqualifier here** — it only ever was for INTERNAL/CROWN work, which
never enters this fleet. So select purely on capability, context, and speed.

| Lane | Task shape | Model profile to use | Why |
|---|---|---|---|
| **A — Kernel** | Correctness-critical math, small output, real reasoning | Strongest free reasoners (Ox Alpha–class; GLM-class free; Nemotron Ultra–class) | A wrong CRPS silently corrupts every downstream verdict. Spend the best free capability here. |
| **B — Dictionary** | Huge context, mechanical extraction, large output | 1M-context models (Ox Alpha, Nemotron 1M-context tiers) | One source's full column set + docs in a single window; no chunking, no drift. |
| **C — Fixtures & tests** | High volume, small, repetitive | Fast small coders (North-mini-code–class, Gemma-class, nano tiers) | Throughput per hour beats depth; these tasks are near-mechanical. |
| **D — Cross-verify** | Read artifact, check against contract | **A different family than the author** | Decorrelated error. Same-family redundancy misses same-family blind spots. |
| **E — Prose** | Generated doc rendering | Anything competent | Zero risk, zero difficulty. |

**Selection rules that outrank any leaderboard:**
1. Verify the model exists and its terms *at spawn time* — free catalogs churn weekly and
   third-party summary tables are unreliable (the "Ox Alpha doesn't train on prompts"
   claim was wrong; see BLITZ §3a). Read the provider's terms, not a table.
2. Never let one provider own a lane. If a lane is single-sourced and that provider dies,
   the lane dies. Spread every lane across ≥2 providers.
3. Slow is fine. **Width defeats latency**; nothing here is interactive.
4. Any model, any terms, is acceptable in this fleet **only** while the work stays
   PUBLIC-class. That constraint never relaxes for convenience.

## 3. The 50-agent allocation

| Lane | Agents | Cards |
|---|---|---|
| A — Math kernel | 12 | CRPS discrete · CRPS empirical · PIT histogram + uniformity · log-loss · Brier + decomposition · calibration slope/intercept · BH-FDR · walk-forward splitter · block bootstrap CI · effective sample size / design effect · NB fit+sample · Beta-Binomial · ZIP/hurdle · Dirichlet-multinomial fit+sample · censored-count helper · lognormal-tail mixture |
| B — Data dictionary | 18 | One card per source; PBP split ~6 ways by column family. Each writes its OWN JSON fragment — zero merge conflicts by construction. |
| C — Fixtures & tests | 10 | One frozen public-data fixture slice per card; plus tests for existing pure functions. |
| D — Cross-verify | 8 | Each reviews a batch of Lane A/B artifacts against the contract. Different family than the author. |
| E — Prose/render | 2 | Markdown renderers for the generated docs. |

Sequencing: **Lane A first.** The kernel is the hard dependency for `edge:validate`, and
`edge:validate` is what converts every future edge test from tokens into CPU — the single
highest-leverage artifact in the sprint.

## 4. Rules that make fifty agents survivable

- **One worktree per worker.** Never two agents in one tree.
- **Waves of 8–12, not an unbounded stream.** A wave completes, verifies, merges; the
  next wave starts from the new main. Unbounded spawn is merge hell.
- **Workers are mortal.** Free providers vanish mid-task without notice. Every card is
  small, idempotent, restartable, and committed the moment it passes.
- **One card, one artifact, then exit.** No long-lived free agents accumulating context.
- **Workers never explore the repo.** The card carries the full spec and exact paths.
  (This is why the generated maps come first — they turn exploration into one file read.)
- **Verification is a command, never a model's opinion.** If a card can't be verified by
  a script, it is not a fleet card — it is judgment work and belongs on the paid tier.
- **A wave where >half the cards fail verify is a CARD-DESIGN failure.** Fix the spec, not
  the workers.
- **The lead's context is the bottleneck, not the workers'.** Subagents write to files;
  the lead reads paths and pass/fail only, and steers from `FLEET_STATUS.md` — never from
  transcripts. Checkpoint to disk before approaching any context wall.

## 5. What never enters this fleet, at any scale

The covariate-bus scaffold generator · the clearance engine and source-rights registry ·
every license *classification* decision · edge promotion and retirement · merge decisions ·
mining grids · calibration and CLV results · `EDGE_CATALOG.md` survivors. Those are CROWN
or judgment tier. Fifty agents change nothing about that line — they make holding it more
important, because fifty leaks are worse than one.

## 6. Done-when

The window closes and the kernel, the dictionary, the fixtures, and the conformance tests
all still run with **no free model in the loop**, and the contract they were built against
is the one the engine actually uses. That is a converted resource. Chat logs are a
consumed one.

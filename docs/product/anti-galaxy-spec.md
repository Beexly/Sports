# Anti-Galaxy — Parallel Adversary Model Specification

**Status:** Phase 5 build. Radical #9 from master plan Part 2.C.
**Owner of code:** Codex.
**Owner of narrative + voice:** Claude.
**Location:** `packages/anti-galaxy/`, `apps/web/app/anti-galaxy/`.
**Decision reference:** master plan Part 2.C.7.

---

## TL;DR

A second model intentionally optimized to be wrong. Runs in parallel against the same slate as the production model. Built-in adversarial validation that runs in public, in real-time.

If anti-Galaxy is consistently wrong, the real model is consistently right. If anti-Galaxy is somehow profitable, we've found a meta-bug in the real model.

Pro+ users see both feeds side by side. The validation is the product.

---

## Why this matters

Most prediction services have no way to falsify themselves. They report wins (loudly) and skip losses (silently). They never expose what a deliberately-wrong version of their own model would look like.

Anti-Galaxy makes the production model falsifiable in real time. If both Galaxy and anti-Galaxy converge on the same pick, that's a red flag — the production model is acting like an inverted-anti-Galaxy, not like a calibrated model. If anti-Galaxy hits at random or worse, the real model is doing real work.

This is built-in adversarial validation. No betting service publishes this. It's a uniquely defensible position.

---

## What "anti-Galaxy" actually is

NOT: A random pick generator. Random would be useless — half wins, half losses, no signal.

IS: A model that takes the same factor inputs as production Galaxy but applies inverted weights and inverted gate logic. Specifically:

- Same input data (`PickSignalSnapshot`, `GameSignal`, `SourceSnapshot`).
- Factor weights inverted (where Galaxy weights rest-advantage +0.8, anti-Galaxy weights it -0.8).
- Gate inverted: anti-Galaxy publishes when production Galaxy would gate, and gates when production would publish.
- Confidence inverted: a pick anti-Galaxy publishes at "73% confidence" means it's a pick the production model gave 27% (and rejected).

The result: anti-Galaxy publishes on games production rejected, fades production picks at their inverse confidence, and surfaces a parallel slate the user can directly compare.

---

## Schema additions

```prisma
model AntiGalaxyPick {
  id              String      @id @default(cuid())
  gameId          String
  galaxyPickId    String?     // null when production gated and anti-Galaxy published

  pickKind        PickKind
  line            String
  side            PickSide
  pickGrade       PickGrade
  confidence      Int         // 50-95, inverted from production

  publishedAt     DateTime    @default(now())
  settledAt       DateTime?
  outcome         PickOutcome?
  modelVersion    String      // "anti-v6.0.4" etc

  factorSnapshot  Json        // inverted-weight breakdown

  game            Game        @relation(fields: [gameId], references: [id])
  galaxyPick      Pick?       @relation(fields: [galaxyPickId], references: [id])

  @@index([gameId])
  @@index([publishedAt])
  @@index([settledAt])
}
```

Note: anti-Galaxy picks are NOT in the main `Pick` table — they live in their own table to keep performance aggregation clean and to make the separation visible in the schema.

---

## Pipeline

Anti-Galaxy runs as a parallel worker:

1. Every ingestion cycle, the existing scoring engine produces `PickSignalSnapshot` rows for each tracked game.
2. The anti-Galaxy worker reads the same snapshots and applies inverted weights.
3. Anti-Galaxy's gate logic publishes when production gates and vice versa.
4. Anti-Galaxy picks are written to `AntiGalaxyPick`.
5. Settlement runs the same logic per pick.
6. Performance metrics aggregate independently.

The worker is intentionally constrained:
- Cannot read or modify production `Pick` rows.
- Cannot write to `PickSignalSnapshot` or `GameSignal`.
- Cannot influence the production scoring engine in any way.

---

## Public surface

### `/anti-galaxy` page (Pro+ tier)

Side-by-side feed: production Galaxy picks on the left, anti-Galaxy picks on the right. Both feeds settle in real time.

Top of page: cumulative comparison chart over the last 30 / 60 / 90 days. Two lines, two outcomes. (No marketing aggregate "Galaxy is X% better" — the chart is the data, not the claim.)

Per row: matchup, both sides' picks, both confidences, settlement outcomes, divergence indicator (✅ if Galaxy hit and anti-Galaxy didn't, ⚠️ if both hit or both missed).

### Convergence flag

When anti-Galaxy and production Galaxy agree on a pick (rare, but possible because the gate logic is inverted, not the pick direction), the system flags this as a `MODEL_CONVERGENCE_WARNING`.

This is a serious flag. It implies:
- Either the production model is doing something interesting that the inverted-weight version also lands on, OR
- The factor structure has degenerated to where weight direction doesn't matter, OR
- There's a meta-bug.

Convergence warnings:
- Log to `AgentRunLog` with severity HIGH.
- Surface in the cockpit at `/cockpit/anti-galaxy-warnings`.
- Trigger an operator review before the production pick publishes.

### Public methodology

The `/methodology` page (Phase 1 build) gets an "Anti-Galaxy" section in Phase 5:

```
# Anti-Galaxy

A second model intentionally optimized to be wrong runs in parallel against
every slate. It applies inverted factor weights and inverted gate logic to
the same input data the production model sees.

The result is a parallel slate of "anti-picks" — picks the production model
rejected, faded at their inverse confidence.

Why we built it: to make the production model falsifiable. If both Galaxy
and anti-Galaxy converge on a pick, that's a flag. If anti-Galaxy hits at
random or worse, the production model is doing real work.

You can see both feeds side by side at /anti-galaxy. The comparison chart
is the data, not the marketing.
```

---

## Voice for the anti-Galaxy surface

The /anti-galaxy page reads as a research surface, not as a feature pitch.

**Pass:**

- *"Anti-Galaxy hit 47% on settled picks this month. Production Galaxy hit 58% on the same slate. The gap is what we'd expect from a model doing real work."*
- *"Convergence warning: production Galaxy and anti-Galaxy agreed on this pick. Holding for operator review."*

**Fail:**

- *"See how much better Galaxy is than the anti-version!"*
- *"Proof Galaxy works — even our deliberately-wrong model can't beat it!"*
- *"This is why you can trust our picks."*

The anti-Galaxy surface is research transparency. It is not marketing material.

---

## Tier behavior

- **FREE:** can see the cumulative comparison chart at `/anti-galaxy/summary`. Cannot see individual anti-picks.
- **PRO:** sees both feeds side by side. Can drill into individual anti-picks.
- **ELITE:** adds convergence warnings + early notifications when anti-Galaxy publishes (because a divergence is happening live).

---

## Trust gates

Same as the rest of public performance:

- When `PERFORMANCE_STATS_ENABLED=false`: the comparison chart shows an empty state.
- Bootstrap-era anti-Galaxy picks do not surface publicly.
- The aggregate comparison is NOT a marketing claim. It is exposed as a data view; users can compute their own conclusions.

---

## Adversarial validation outputs

Beyond the public surface, anti-Galaxy produces internal signal:

1. **Weekly anti-Galaxy report** (operator-only) — aggregate stats, convergence warnings, divergence patterns.
2. **Per-factor inversion analysis** — when anti-Galaxy beats production on a specific factor (e.g. "anti-Galaxy outperforms when schedule-stress is the heaviest factor"), that's a flag the production weight for that factor may be wrong.
3. **Factor weight calibration input** — anti-Galaxy's settled performance feeds into the model versioning process as a parallel signal.

These outputs are not public in Phase 5. Phase 6+ may publish a quarterly anti-Galaxy synthesis.

---

## Anti-patterns we're avoiding

- **No "anti-Galaxy lost so Galaxy wins!" framing.** The surface is research, not a victory lap.
- **No "fade anti-Galaxy" tail product.** We do not sell anti-Galaxy's picks as a "fade service." It is internal validation surfaced publicly, not a separate pick service.
- **No anti-Galaxy alerts.** Pro+ users do not receive notifications when anti-Galaxy publishes. The page is read-only.
- **No anti-Galaxy Twitter bot.** The X account does not post anti-Galaxy picks. One account, one model.

---

## Acceptance criteria (Phase 5 anti-Galaxy v0 → green)

1. Schema migration applied.
2. Parallel worker running on every ingestion cycle.
3. `AntiGalaxyPick` rows written for every game.
4. Settlement aggregation working for both feeds independently.
5. `/anti-galaxy` page renders side-by-side feeds.
6. Comparison chart renders correctly with bootstrap-state handling.
7. Convergence warning logic functional.
8. Cockpit warning surface functional.
9. Tier projection enforced.
10. Anti-Galaxy worker cannot read or write production `Pick` table.
11. Methodology page anti-Galaxy section added.

When all 11 hold, anti-Galaxy is v0-live.

---

## Open items

- **OPEN-AG-1:** Should anti-Galaxy use the SAME model version as production (just with inverted weights) or its own independent version line (anti-v6.0.4, anti-v6.0.5)? Default: paired version line — anti-Galaxy always tags with the production version it's mirroring. Codex confirms.
- **OPEN-AG-2:** Should anti-Galaxy publish even when production gated? Default: yes (that's the whole point — inverted gate). Codex confirms.
- **OPEN-AG-3:** Should anti-Galaxy run for ALL tracked games or only games where the inversion produces a meaningfully-confident pick (>60% inverted confidence)? Default: meaningful-confidence only. Random-ish picks below threshold are not useful signal.
- **OPEN-AG-4:** Should we run a third "random" model as a baseline? Default: no in v0. The inverted-weight model is the meaningful adversary. Random baseline is a Phase 6+ research add.

---

*Spec authored by Claude. Codex implements parallel worker. The surface is research, not marketing.*

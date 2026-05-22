# Evidence Engine — Architecture & Implementation Spec

**Phases covered:** 2 (Evidence Engine) and 3 (Smarter Scoring).
**Status:** Spec for implementation. Codex builds against this. Brand-safety rules in `docs/brand-safety-rules-v2.md` apply absolutely.
**Predecessor:** `docs/prediction-engine.md` (v1 — market-derived scoring). This document does not replace it; it *extends* it with an evidence graph and a separation between market-derived edge and true EV.

---

## Why this exists

The v1 engine computes confidence from a single signal type (the market itself: line, movement, consensus, depth). That's defensible for launch — it never claims a private edge — but it caps the platform at "we read the market well."

The Evidence Engine is the next layer. It adds independent factors (player availability, referee tendencies, venue effects, weather, pace, schedule fatigue, division dynamics). Each factor enters the system the same way: source-attributed, freshness-tracked, sample-sized, trust-rated, and **born in shadow mode** until calibration earns it a public seat.

The engine never fabricates. If the data isn't there, the factor isn't active, and the public surface either (a) renders without it, (b) renders a lower-confidence pick with a label, or (c) renders "no pick" — silence as a decision.

---

## Core principles

1. **Raw before normalized.** Every external read writes a `SourceSnapshot` row *first*. Normalization is a transformation step that produces `GameSignal` rows downstream. If the normalizer is wrong, we can re-derive from raw.
2. **Every factor is born in shadow.** New factors compute and store, but never reach a public response, until a calibration proposal promotes them.
3. **Source attribution is mandatory.** Every numeric value on a public pick traces to a `SourceSnapshot` row (provider, fetchedAt, raw payload hash).
4. **Stale = silent.** Freshness thresholds are per-factor. Past threshold, the factor drops to `stale`. Picks generated from stale factors are blocked from publication.
5. **Market edge ≠ True EV.** The v1 score (market-derived edge) is the only public confidence until an independent fair-probability source is wired. True EV is the *second* number, computed when (and only when) we have something to disagree with the market with.

---

## Data model

All names below are TypeScript shapes; map to Prisma in `packages/db/prisma/schema.prisma`. Codex chooses table names but should preserve the relationships.

### SourceSnapshot (raw, immutable)

```typescript
interface SourceSnapshot {
  id: string;                   // UUID
  provider: string;             // 'the-odds-api', 'api-sports.io', etc.
  endpoint: string;             // path or method
  scope: SnapshotScope;         // { sport, league, gameId? }
  payloadHash: string;          // sha256 of body — dedupes identical fetches
  payload: Json;                // raw, as received (compressed if large)
  fetchedAt: Date;
  status: 'ok' | 'http_error' | 'parse_error' | 'rate_limited';
  errorDetail?: string;
  responseTimeMs: number;
  ingestionRunId: string;       // FK → IngestionRun
}
```

**Retention:** Keep 90 days hot, then S3-cold. Hash dedupe prevents
storing 10k identical odds snapshots.

**Why raw:** When a normalizer bug ships, we replay snapshots; we don't lose history.

### IngestionRun (audit trail)

```typescript
interface IngestionRun {
  id: string;
  startedAt: Date;
  finishedAt?: Date;
  status: 'running' | 'success' | 'partial' | 'failed';
  providersAttempted: string[];
  snapshotsWritten: number;
  errors: IngestionError[];
  triggeredBy: 'cron' | 'manual' | 'webhook';
}
```

**Why:** Every pick on disk links to `ingestionRunId`. When a pick looks wrong, you can replay the exact data state that produced it.

### GameSignal (the evidence graph)

Each row is one factor for one game from one provider for one moment in time.

```typescript
interface GameSignal {
  id: string;
  gameId: string;               // FK → Game
  factorKey: FactorKey;         // see registry below
  factorValue: Json;            // the normalized value (number, object, array)
  source: string;               // provider name; matches SourceSnapshot.provider
  sourceSnapshotId: string;     // FK to the raw row that produced this
  fetchedAt: Date;              // when source was read
  freshnessSec: number;         // age at compute time (derived for convenience)
  sampleSize: number | null;    // n for n-game averages, etc. Null when N/A.
  trustLevel: TrustLevel;       // 'high' | 'medium' | 'low'
  activationState: ActivationState;  // 'shadow' | 'activated' | 'archived'
  computedAt: Date;
  modelInputVersion: string;    // version of the normalizer that wrote this
}
```

**Trust levels:**

- `high`: official source (NBA stats API for player minutes, official referee assignments).
- `medium`: reputable third party with track record (api-sports.io for line movement aggregates).
- `low`: derived/inferred (e.g., "expected pace" from team averages — never published as fact).

**Activation states:**

- `shadow`: computed and stored, never surfaced. New factors start here.
- `activated`: passed calibration; allowed in public responses.
- `archived`: was activated, now removed (kept for historical audit, never queried by public routes).

### FactorRegistry (the catalog of what we *can* compute)

Live in code (`packages/prediction-engine/src/factors/registry.ts`) and replicated to a `FactorDefinition` table for the operator dashboard.

```typescript
interface FactorDefinition {
  key: FactorKey;                // 'marketDepth' | 'lineMovement' | 'refTotalAvg' | ...
  category: FactorCategory;      // 'market' | 'team' | 'player' | 'official' | 'venue' | 'weather' | 'pace' | 'schedule'
  description: string;           // human-readable
  requiredAdapter: string;       // which adapter must be active (e.g., 'api-sports.io::referee')
  stalenessThresholdSec: number; // past this, factor is stale
  publicLabel: string | null;    // null = never appears in copy, even if activated
  activationState: ActivationState;
  shadowSince: Date | null;
  activatedAt: Date | null;
  archivedAt: Date | null;
}
```

### Game / Pick (existing — extensions noted)

`Pick` gains:

```typescript
interface Pick {
  // ... existing fields ...
  factorContributions: FactorContribution[];  // ONLY activated factors. Audit-grade.
  marketDerivedEdge: number;     // 0–100. The v1 score.
  trueEV: number | null;         // null until independent fair-prob source is wired AND activated.
  gateState: GateState;          // 'published' | 'shadow' | 'blocked-stale' | 'blocked-insufficient-evidence' | 'blocked-brand-safety'
  evidenceBundleId: string;      // FK → bundle of GameSignal IDs used to compute this pick
}

interface FactorContribution {
  factorKey: FactorKey;
  contribution: number;          // signed delta this factor added to score
  reason: string;                // structured reason, picked from a fixed enum — not LLM
}
```

**Gate state semantics:**

- `published`: appears on `/picks` (subject to tier gating).
- `shadow`: computed, stored, visible only to operator.
- `blocked-stale`: one or more required factors were stale; this pick is not shown.
- `blocked-insufficient-evidence`: not enough activated factors to meet the published-pick threshold.
- `blocked-brand-safety`: linter caught something; do not publish.

---

## Factor registry — initial set

Categorized. Most start in **shadow**.

### Market factors (already activated in v1)

| Key | Category | Activation | Notes |
|---|---|---|---|
| `marketDepth` | market | activated | # of bookmakers offering line. v1. |
| `lineMovement` | market | activated | open → current delta. v1. |
| `consensusPct` | market | activated | % of books on same side. v1. |
| `impliedProbability` | market | activated | from current line. v1. |
| `sharpMoneyIndicator` | market | shadow | requires sharp-money source. Not built. |
| `closingLineValue` | market | shadow | requires closing-line snapshot job. |

### Schedule factors

| Key | Category | Activation | Adapter needed |
|---|---|---|---|
| `restDays` | schedule | shadow | days since last game per team |
| `travelMiles` | schedule | shadow | venue distance from previous game |
| `b2b` | schedule | shadow | back-to-back boolean |
| `altitude` | schedule | shadow | venue altitude (NBA: Denver/Utah effect) |

### Team factors

| Key | Category | Activation | Adapter needed |
|---|---|---|---|
| `recentForm` | team | shadow | last-N record / margin |
| `pacePerGame` | pace | shadow | possessions / 48 min |
| `efficiencyOff` | team | shadow | offensive rating |
| `efficiencyDef` | team | shadow | defensive rating |
| `homeAwaySplit` | team | shadow | record/margin home vs away |
| `divisionContext` | team | shadow | divisional/rivalry flag |

### Player factors (most fragile — high error surface)

| Key | Category | Activation | Adapter needed |
|---|---|---|---|
| `starAvailability` | player | shadow | official injury report scrape |
| `minutesProjection` | player | shadow | DEPENDS on starAvailability; never first-class |
| `usageRate` | player | shadow | n-game rolling avg |
| `restStarters` | player | shadow | "load management" flag |

**Player rule:** All player factors are **medium or low trust by default.** Promotion to activated requires a proven adapter AND a documented sample-size threshold (typically ≥10 games for the player).

### Official factors

| Key | Category | Activation | Adapter needed |
|---|---|---|---|
| `refTotalAvg` | official | shadow | referee's avg total in last 20 games of same sport |
| `refFoulRate` | official | shadow | fouls per game baseline |
| `refHomeBias` | official | shadow | home-team margin vs spread, ref-adjusted |

**Official rule:** Public copy may say "this crew tends to call a higher total" only when the factor is activated AND the difference exceeds 2 standard deviations from the league mean. Otherwise: forbidden.

### Venue factors

| Key | Category | Activation | Adapter needed |
|---|---|---|---|
| `homeFieldAdvantage` | venue | shadow | venue-specific HFA in last 50 games |
| `surfaceType` | venue | shadow | turf/grass/court material |
| `noisePenalty` | venue | shadow | crowd-noise penalty proxy (NFL false starts) |

### Weather factors (outdoor sports only)

| Key | Category | Activation | Adapter needed |
|---|---|---|---|
| `windSpeed` | weather | shadow | mph at venue, game time |
| `windDir` | weather | shadow | direction relative to passing axis |
| `precipitation` | weather | shadow | mm/hr at game time |
| `tempF` | weather | shadow | game-time temp |

---

## Ingestion pipeline

```
[provider API]
     │
     ▼
[Adapter — fetch + retry + rate-limit + payload hash]
     │
     ▼
[SourceSnapshot.write()] ──── raw payload, fetchedAt, status
     │
     ▼
[Normalizer — provider-specific → canonical shape]
     │
     ▼
[GameSignal.upsert()] ──── one row per (gameId, factorKey, source)
     │                     activationState pulled from FactorDefinition
     ▼
[Pick scorer — reads activated GameSignals only]
     │
     ▼
[Pick.write() with gateState + factorContributions]
     │
     ▼
[Brand-safety linter (runtime)]  ──── assertNoShadowFactorsLeaked()
     │
     ▼
[Public response]
```

Each step writes; each step is independently testable.

---

## Scoring — Phase 3 details

### Two numbers, never blended publicly

1. **marketDerivedEdge** (0–100) — the v1 formula. Public.
2. **trueEV** (signed %, expected return per unit) — only computed when at least one activated *non-market* factor disagrees with the market. **Initial activation: null.** Public only after independent fair-probability source ships AND calibration proposal approves.

Until `trueEV` is activated, the public confidence is the v1 score, unchanged. Phase 3 work happens entirely under the hood.

### Per-factor contribution

When a factor is activated, it enters scoring like this:

```typescript
score = marketBaseScore(game)                       // v1 formula
for (factor of activatedNonMarketFactors(game)) {
  if (factor.freshnessSec > registry[factor.key].stalenessThresholdSec) {
    gateState = 'blocked-stale'; return null;
  }
  if (factor.sampleSize !== null && factor.sampleSize < registry[factor.key].minSampleSize) {
    continue;  // factor exists but doesn't qualify; skip rather than fabricate
  }
  const contribution = factor.weight * factor.signedDelta;
  factorContributions.push({ factorKey, contribution, reason });
  score += contribution;
}
score = clamp(score, 0, 100);
```

**Weights are never auto-tuned.** Every weight change passes through `docs/calibration-proposals/` and is human-approved.

### Calibration — what activation actually requires

A factor moves from shadow → activated when:

1. ≥30 days of shadow-mode data exists for the factor.
2. Per-bucket Brier-score improvement vs the v1 baseline is statistically significant (p < 0.05) AND ≥0.005 in magnitude (≈1% calibration win).
3. The factor doesn't degrade bucket calibration in any segment (no Simpson's-paradox wins).
4. A calibration proposal markdown lives in `docs/calibration-proposals/` with the analysis, the proposed weight, and a human approval line.
5. A test exists in `packages/prediction-engine/__tests__/calibration.test.ts` that fails if the activation is rolled back without process.

**Brier score:** `mean((predicted - observed)^2)`, computed per bucket (50–59, 60–69, 70–79, 80–89, 90–100) and overall.

**Drift detection:** A rolling 30-day Brier vs prior-30-day Brier; >0.02 absolute drift triggers a `drift-warning` flag in the operator dashboard (BS-034) and a calibration review.

### Reliability diagram

The operator dashboard at `/admin/calibration` renders a reliability diagram (predicted probability bins vs observed frequency, ideal = identity line). Public surface never renders this — until BS-030 is relaxed.

---

## Shadow-mode operations

Every factor runs in shadow before being promoted. The infrastructure must support:

1. **Shadow scoring.** A `shadowPick` table mirrors `Pick`: same shape, same factor contributions, but never exposed publicly. Computed alongside the real pick. When activation happens, the shadow history *becomes* the activated history (no replay needed).
2. **Shadow-only dashboards.** `/admin/factors/{factorKey}` shows historical contributions, hit rate, Brier vs baseline.
3. **A/B internal.** When two adapters claim the same factor (e.g., two referee data sources), they run in parallel; both produce shadow signals; only one is eventually activated.
4. **Leak detection.** `apps/web/__tests__/shadow-leak.test.ts` runs a smoke that calls every public endpoint with seeded data containing both shadow and activated factors, then asserts the response contains zero shadow `factorKey` strings. CI-blocking.

---

## Failure modes & what the public sees

| Internal state | Operator dashboard | Public surface |
|---|---|---|
| All factors fresh, activated, enough evidence | green | pick published with confidence |
| Some shadow factors disagree with market | yellow (interesting) | pick published using activated factors only |
| Required factor stale | red (stale) | NO PICK — silence with "monitoring, waiting on fresh data" copy |
| Adapter down for a provider | red (provider-out) | other providers compensate; if all sources for a required factor are out, NO PICK |
| Brand-safety blocked | red (gated) | NO PICK |
| Calibration drift detected | yellow (review) | continues, but flagged internally |

**"No pick" is a decision, not a bug.** The UX spec (`docs/cockpit-spec.md`) treats this as a first-class state.

---

## Versioning

Every pick records:

- `modelVersion` — the v1 base scorer version (already exists).
- `evidenceEngineVersion` — bumps when factor registry, weight, or activation set changes.
- `factorContributions[].factorKey + factorContributions[].reason` — structured, enum-bound, audit-grade.
- `evidenceBundleId` — links to the exact set of GameSignal rows used.

When you ask "why did the engine give this pick a 78?" the answer reconstructs deterministically from the audit trail.

---

## Migration plan — order Codex should build

1. **Add `SourceSnapshot` + `IngestionRun` tables.** Backfill existing odds writes through them.
2. **Add `GameSignal` table + `FactorDefinition` table.** Seed with the 4 v1 market factors as `activated`.
3. **Refactor existing scorer to read from `GameSignal` instead of joined odds.** No public behavior change.
4. **Add shadow-pick computation alongside real pick.** Storage only.
5. **Wire one new factor end-to-end in shadow mode** as a proof: pick the cheapest — `restDays` is a good first one (computable from existing schedule data, no new provider).
6. **Build operator dashboard at `/admin/factors`** — shows shadow factors, sample sizes, calibration.
7. **Brand-safety v2 linter rules wire in** (per `docs/brand-safety-rules-v2.md`).
8. **Document the first calibration proposal** in `docs/calibration-proposals/` (template included in this doc below).
9. **Repeat for the next factor.** Never activate more than one factor per calibration cycle.

Public-facing behavior should remain identical to v1 until step 8's first activation proposal is approved.

---

## Calibration proposal template

Put new proposals in `docs/calibration-proposals/YYYY-MM-DD-{factorKey}.md`.

```markdown
# Calibration proposal: `restDays`

**Proposed activation date:** 2026-07-15
**Author:** Garrett
**Shadow window:** 2026-05-21 → 2026-06-21 (31 days)

## Summary
restDays factor (back-to-back penalty, +0 days rest) has run in shadow
for 31 days across 247 NBA games. Brier improvement vs market-only:
0.008 (p=0.02). No bucket-level degradation.

## Data
- N shadow picks: 247
- Brier (market only): 0.231
- Brier (market + restDays @ w=0.4): 0.223
- Bucket 60–69: +1.1% calibration win
- Bucket 70–79: +0.3% calibration win
- Bucket 80–89: -0.0% (within CI)

## Proposed weight
weight=0.4, signedDelta computed as in `packages/prediction-engine/src/factors/rest-days.ts`

## Approval
- [ ] Garrett (founder)
- [ ] Brand-safety linter passes new test
- [ ] Calibration regression test in place

## Rollback plan
If 7-day post-activation Brier drifts >0.02, revert to shadow, write
`docs/calibration-proposals/YYYY-MM-DD-{factorKey}-rollback.md`.
```

---

## Open questions Codex should flag, not decide

These are decisions that need a human at the keyboard:

1. **First non-market factor to activate.** Build plan says shadow-only for now; that's the right call. Recommend: `restDays` as proof-of-pipeline.
2. **Calibration window length.** 30 days proposed; may need ≥60 for slow-moving factors. Decide per proposal.
3. **Provider mix for referee/player data.** `docs/data-source-options.md` catalogs candidates. ToS posture + cost = your call.
4. **Operator dashboard auth.** `/admin` must be locked. Use existing auth + a role check; bootstrap one admin email from env var.

---

## One-paragraph summary

The Evidence Engine is a typed, source-attributed, freshness-tracked, calibration-gated extension of the existing v1 market scorer. It does not change what the public sees on day one — it builds the infrastructure to expand what's shown on day 30, when shadow-mode factors have earned their seats. The non-negotiable is the chain: raw snapshot → normalized signal → activated factor → scored pick → audited contribution → optionally-published result. If the chain breaks, the pick doesn't publish. Silence is a decision.

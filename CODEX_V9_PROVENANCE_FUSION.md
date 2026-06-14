# CODEX WORK ORDER — V9.0.0 "Provenance Fusion"

> **Status:** READY FOR EXECUTION
> **Branch to develop on:** `claude/serene-hopper-rtjsfq` (create from latest if missing)
> **Model version after completion:** bump `packages/prediction-engine/src/constants.ts` → `MODEL_VERSION = "v9.0.0"`
> **Estimated surface:** 1 migration, ~3 new schema models + 2 model edits, ~9 new lib modules, ~6 test files, 1 admin surface, CLAUDE.md invariant.
>
> ## 🛑 STOP-BEFORE-SHIP — READ THIS FIRST
> **Codex does EVERYTHING below EXCEPT `git push` and opening a PR.**
> Implement all seven pillars, run every check green, and **commit locally** on the branch — then **STOP**. Do **not** `git push`. Do **not** create a pull request. Do **not** deploy.
> Leave a clean working tree with all work committed locally and hand back. **Claude performs the final review and is the only one who pushes.** See §16 — HANDBACK PROTOCOL. Violating this (pushing/PR-ing) fails the sprint.

---

## 0. MISSION (read first, do not skip)

This repo already contains **two complete provenance systems that never reference each other.** v9 does not build a third. v9 **fuses** them, adds the one substrate that is genuinely missing (a canonical Entity Graph), and closes three measurement loops whose dependencies are already live.

### The two spines

**Spine A — LEGAL / RIGHTS** (`apps/web/lib/scraping/`)
Governs *licensing and clearance*. Every extraction passes `checkClearance()` and is wrapped by `wrapExtractedRecord()`, embedding an immutable `RightsSnapshot` (status tier, `commercial_display_allowed`, `attribution_text`, `cease_and_desist_received`, …). Source classifications live in `SOURCE_RIGHTS_REGISTRY`.

**Spine B — ANALYTICAL / SIGNAL** (Prisma + `packages/prediction-engine/`)
Governs *what drove a pick*. `SourceSnapshot` (raw payload + `payloadHash`) → `GameSignal` (`trustLevel`, `expiresAt`) → `PickSignalSnapshot` (inputs frozen at prediction time) → `Pick` → Merkle `proof-of-record` (tamper-evident track record).

### The defect

`GameSignal.sourceName` is a **free-text string** (`"openweather"`, `"nflverse"`, `"schedule-internal"`) with **no foreign key** to `SourceRightsEntry.source_id`. Therefore you cannot answer, by walking the chain:

> "Is this published pick cleared for commercial display, and what attribution text must run with it?"

Spine B (what drove the pick) does not reference Spine A (whether we are legally allowed to publish it). **Closing that gap is the moat.** A pick becomes *legally traceable* only when its analytical evidence chain also carries its rights chain, and the joined chain is cryptographically committed at the moment we could first know it.

### What v9 delivers

1. **Pillar A — Entity Graph** *(new substrate)* — canonical players/teams, bitemporal, fixes a real historical-audit correctness bug.
2. **Pillar B — Fusion Bridge** *(wire)* — `GameSignal` → `SourceRightsEntry`; one `traceClaim()` that walks both spines.
3. **Pillar C — Prediction-time Merkle** *(extend existing)* — commit the joined chain at `knownAt`; no-hindsight proof + deterministic replay.
4. **Pillar D — Per-source reliability** *(extend v8 — see prereqs)* — grade sources, not just signals.
5. **Pillar E — Broadcast-rights gate** *(wire)* — enforce `commercial_display_allowed` + attribution propagation at the publish boundary; C&D quarantine.
6. **Pillar F — Falsification loop** *(new primitive, all deps live)* — structured "what would change our mind" at publish, checked at settlement.
7. **Pillar G — Ground "Ask the Brain"** *(harden existing Model Court)* — chain-derived citations and refusals.

---

## 1. NON-NEGOTIABLE DOCTRINE (inherited — violating any of these fails the sprint)

From `CLAUDE.md`, plus v6–v8 conventions:

1. **No fake data.** Every value traces to a real source row. No seeded placeholders in published surfaces.
2. **Shadow mode by default.** Every new capability is OFF until a founder flips a gate. Add gates to `packages/prediction-engine/src/platform-config.ts` defaulting `false`; propagate through `readiness.ts`. Nothing in v9 may change a published pick automatically.
3. **The loop recommends; the founder promotes; gates never auto-flip.** (v8 doctrine — applies to Pillar D source-trust and Pillar F falsification verdicts.)
4. **Server-side enforcement only.** No frontend-only gating of rights or entitlements.
5. **Clearance precedes extraction.** Any new source touched by Pillar A/B must already be in `SOURCE_RIGHTS_REGISTRY` (or be added with a real classification) and pass `checkClearance()`. Do **not** add evasion tooling to the tool registry.
6. **Immutable provenance is immutable.** `RightsSnapshot`, `SourceSnapshot`, `PickSignalSnapshot`, and the new `rightsSnapshotJson` are point-in-time captures — write once, never mutate. Use the established Prisma `update: {}` / `skipDuplicates` pattern.
7. **TypeScript strict, no `any`.** Readonly types for pure functions.
8. **Tests required.** No pillar is complete without the tests in §9. `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build` all green.
9. **Bitemporal honesty.** Distinguish `validAt` (true in the world) from `knownAt` (when we could first know). Never let a signal with `knownAt > pick.generatedAt` enter a pick's chain.

---

## 2. PREREQUISITES & DEPENDENCY GRAPH

```
Pillar A (Entity Graph) ─────────────► independent, do FIRST
Pillar B (Fusion Bridge) ────────────► needs SOURCE_RIGHTS_REGISTRY (live), snapshotRights (live)
Pillar C (Merkle @ predict) ─────────► needs Pillar B traceClaim()
Pillar D (Source reliability) ───────► needs v8 SignalLedgerEvent + computeSignalReliability  ⚠ SEE BELOW
Pillar E (Broadcast gate) ───────────► needs Pillar B traceClaim()
Pillar F (Falsification) ────────────► all deps live; CAN SHIP STANDALONE FIRST
Pillar G (Model Court grounding) ────► needs Pillar B traceClaim()
```

### ⚠ v8 dependency (Pillar D only)

`SignalLedgerEvent` (Prisma model) and `computeSignalReliability` (`packages/prediction-engine/src/signal-reliability.ts`) are **NOT present on this branch** — they live in a separate Codex PR (`feat(ledger): immutable signal ledger + calibration feedback loop`).

**Rule:** If that PR is merged into this branch before you start, implement Pillar D fully. If it is not merged, **implement Pillars A, B, C, E, F, G in full and stub Pillar D** as `computeSourceReliability()` with a typed `INSUFFICIENT_DATA` short-circuit and a `// TODO(v9-D): depends on SignalLedgerEvent (PR feat/ledger)` marker, plus a passing test that asserts the short-circuit. Do not block the other six pillars on v8.

Check at start:
```bash
grep -n "model SignalLedgerEvent" packages/db/prisma/schema.prisma
ls packages/prediction-engine/src/signal-reliability.ts
```

---

## 3. DO NOT REINVENT — REUSE THESE EXACT SYMBOLS

The recon below is authoritative. If you find yourself writing a new version of any of these, stop and import the existing one.

### Spine A — Legal/Rights (`apps/web/lib/scraping/`)
| Symbol | File | Use |
|---|---|---|
| `checkClearance(request, now?)` → `ClearanceResult` | `clearance-engine.ts` | gate any extraction |
| `wrapExtractedRecord(clearance, url, data, now?)` → `ExtractedRecord` | `clearance-engine.ts` | immutable envelope; throws if `!allowed` |
| `RightsSnapshot` type | `clearance-engine.ts` | fields: `status`, `automation_allowed`, `public_logged_off_allowed`, `commercial_display_allowed`, `storage_allowed`, `derived_analytics_allowed`, `model_training_allowed`, `attribution_required`, `attribution_text`, `reviewed_at`, `snapshotted_at` |
| `SourceRightsEntry` type | `source-rights-registry.ts` | canonical source record incl. `cease_and_desist_received`, 9-tier `status` |
| `SOURCE_RIGHTS_REGISTRY` (13 entries) | `source-rights-registry.ts` | source classification source-of-truth |
| `getSourceRightsEntry(sourceId)` | `source-rights-registry.ts` | lookup |
| `snapshotRights(entry, now?)` → `RightsSnapshot` | `source-rights-registry.ts` | **use for Pillar B capture — do not hand-roll** |
| `SourceRightsStatus` (9 values) | `source-rights-registry.ts` | `approved_public_logged_off`, `approved_api`, `approved_open_license`, `approved_written_permission`, `vendor_candidate`, `manual_research_only`, `permission_required`, `blocked_technical_controls`, `excluded` |

### Spine B — Analytical (`packages/prediction-engine/`, `apps/web/lib/`)
| Symbol | File | Use |
|---|---|---|
| `hashLeaf`, `merkleRoot`, `inclusionProof`, `verifyInclusion`, `canonicalPickPayload` | `packages/prediction-engine/src/proof-of-record.ts` | **Pillar C reuses all of these.** `HashFn` is injected — pass sha256 from `node:crypto`, never a weak hash. |
| `loadProofOfRecord(now?)`, `ProofPickRow`, `ProofOfRecordBoard` | `apps/web/lib/proof/load-proof-of-record.ts` | settled-pick Merkle board (the existing pattern to mirror) |
| `classifyFreshness`, `FRESHNESS_BUDGETS`, `buildPublishReadinessReport` | `apps/web/lib/source-intelligence/index.ts` | **Pillar B freshness verdicts — reuse, do not invent TTLs** |
| `computeSignalReliability` | `packages/prediction-engine/src/signal-reliability.ts` *(v8, see §2)* | Pillar D mirrors its verdict shape |

### Existing Prisma models (DO NOT duplicate)
- `SourceSnapshot` — `provider`, `sourceKind`, `fetchedAt`, `payload`, `payloadHash`, `payloadBytes` (raw-bytes anchor)
- `GameSignal` — `gameId`, `sourceCategory`, `sourceName`, `signalKey`, `signalValue`, `fetchedAt`, `expiresAt`, `trustLevel`, `isBootstrap`, `@@unique([gameId, sourceName, signalKey])`
- `PickSignalSnapshot` — 14 `hadXSignal` flags, `capturedAt`, `modelVersion`, `isBootstrap`, `settlementResult`, `settledAt`, `eligibleForLearning` (frozen prediction inputs)
- `Pick` — incl. `result`, `settledAt`, `generatedAt`, `clvLockLine/clvCloseLine/clvVerdict`, `isPublished`, `isBootstrap`
- `LossAutopsy` — `rootCause` (enum: `DATA_GAP|STALE_LINE|INJURY_SHOCK|WEATHER|OFFICIATING|VARIANCE|MODEL_DRIFT|HUMAN_OVERRIDE|OTHER`), `lessonTags`, status workflow
- `SourceCoverageReport`, `GateDecision`, `CalibrationProposal`, `ContentSource` (`trustLevel`: `AUTHORITATIVE|PLATFORM|REVIEWED|UNVERIFIED|BLOCKED`)

### Existing grading stack — ALL LIVE, ALL READ-ONLY (do not rebuild; Pillar F/G consume them)
- `apps/web/lib/calibration/compute.ts` — `computeCalibration`, `computeDiscrimination`, `computeCalibrationProposals` (Brier + discrimination)
- `apps/web/lib/intelligence/clv-calibration.ts` — `clv`, `rollupClv`, `buildClvBacktest` (forward mode gated)
- `apps/web/lib/premortem/fragility.ts` — `computeFragilityScore(snapshot)`
- `apps/web/lib/premortem/build.ts` — `buildPickPremortemNote`
- `apps/web/lib/pre-mortem/compare.ts` — `comparePreMortem` (tags bullets CALLED vs DID_NOT_HAPPEN)
- `apps/web/lib/correlation/` — `runCorrelationQuery`, `evaluateCorrelationQuery`, `loadSettledCorrelationRows`
- `apps/web/lib/intelligence-graph/model-court/answer.ts` — `answerModelCourtQuestion`, `detectModelCourtRefusal`, `evaluateModelCourtAnswerPolicy`

### The 14 display engines (`apps/web/lib/intelligence/*`)
All declare `canPublishProjections: false`. They are **CONTEXT**, not **CLAIM**. They do **not** drive pick scoring (scoring lives in `packages/prediction-engine/src/scoring.ts`). When `traceClaim()` and Model Court surface them, they must be labeled CONTEXT and must never be presented as the reason a pick moved.

### nflverse seed source for Pillar A
- `apps/web/lib/data-sources/nflverse.ts` — `NflverseRosterRow` (`playerId`, `playerName`, `team`, `position`, `season`, `status`, `gsisId`), `NFLVERSE_LICENSE = "CC BY-SA 4.0"`, `NflverseAttribution`
- `packages/data-ingestion/src/nflverse-source.ts` — `NFLVERSE_CATALOG` keys `rosters`, `players`, `schedules`

---

## 4. PILLAR A — ENTITY GRAPH *(new substrate; build first)*

**Why:** There is no `Player` model. `Team` carries no external IDs. `Game` resolves teams via a point-in-time `currentTeamId`, so a pick from season N audited in season N+k resolves to the **wrong franchise** after a relocation/rename. This is a correctness bug, not a nicety — a "legally traceable" pick cannot sit on identifiers that silently rewrite history.

### 4.1 Schema (`packages/db/prisma/schema.prisma`)

```prisma
model PlayerEntity {
  id          String   @id @default(cuid())
  displayName String
  position    String?
  nflId   String? @unique
  pfrId   String? @unique
  gsisId  String? @unique   // join key from NflverseRosterRow
  espnId  String? @unique
  birthYear Int?            // disambiguate same-name players
  createdAt     DateTime @default(now())
  lastVerifiedAt DateTime @default(now())
  aliases EntityAlias[]
  tenures PlayerTenure[]
  @@index([displayName])
  @@index([gsisId])
}

model PlayerTenure {
  id String @id @default(cuid())
  playerId String
  player   PlayerEntity @relation(fields: [playerId], references: [id], onDelete: Cascade)
  teamId   String       // references Team.id
  validAt    DateTime    // became true in world (e.g. trade effective date)
  validUntil DateTime?   // null = still current
  knownAt    DateTime    // when WE could first know it — prevents look-ahead
  createdAt  DateTime @default(now())
  @@index([playerId, validAt])
  @@index([teamId, validAt])
}

model EntityAlias {
  id String @id @default(cuid())
  playerId String
  player   PlayerEntity @relation(fields: [playerId], references: [id], onDelete: Cascade)
  alias  String
  source String   // "nflverse" | "the-odds-api" | "espn"
  createdAt DateTime @default(now())
  @@unique([playerId, alias, source])
  @@index([alias])
}
```

Edit existing `Team` (additive, all nullable so the migration is safe):
```prisma
  nflId        String? @unique
  pfrId        String? @unique
  sportradarId String? @unique
  formerNames  Json?    // [{ name, fromSeason, toSeason }]
  validFrom    DateTime?
  validUntil   DateTime?
```

### 4.2 Resolvers (`apps/web/lib/entity-graph/resolver.ts`)
- `resolvePlayer(input): Promise<PlayerEntity>` — input is `{ nflId?: string; pfrId?: string; gsisId?: string; name?: string; birthYear?: number }`. Idempotent upsert keyed on first non-null external ID, else `name + birthYear`. Records an `EntityAlias` for every distinct (name, source). On second pass, bumps `lastVerifiedAt`, creates no duplicate.
- `resolveTeamAsOf(name: string, asOf: Date): Promise<Team | null>` — temporal: checks `formerNames` + `validFrom/validUntil` so "St. Louis Rams" on 2015-01-01 and "Los Angeles Rams" on 2016-01-01 resolve to the **same franchise id** but the correct display as-of-date.
- `whoPlayedFor(teamId: string, asOf: Date): Promise<PlayerEntity[]>` — walks `PlayerTenure` where `validAt <= asOf < (validUntil ?? ∞)` AND `knownAt <= asOf`.

### 4.3 Seeder (`apps/web/lib/entity-graph/seed-from-nflverse.ts`)
Pull `NflverseRosterRow[]` via the existing nflverse adapter, run each through `resolvePlayer`. Capture a `RightsSnapshot` for the nflverse source via `snapshotRights(getSourceRightsEntry("nflverse"))`. No network calls in tests — inject a `fetcher`.

### 4.4 Gate
Add `entityGraphAvailable: boolean = false` to `platform-config.ts`; nothing reads the graph for scoring until flipped.

---

## 5. PILLAR B — FUSION BRIDGE *(the core wire)*

### 5.1 Schema edit — `GameSignal`
```prisma
  sourceRightsId     String?   // resolves to SourceRightsEntry.source_id (nullable: legacy rows)
  rightsSnapshotJson Json?     // snapshotRights() captured at signal fetch — IMMUTABLE
```

### 5.2 Bridge (`apps/web/lib/provenance/bridge.ts`)
- `bridgeSourceName(sourceName: string): SourceRightsEntry | null` — deterministic map from the free-text `GameSignal.sourceName` to a registry entry (`"nflverse"` → `nflverse`, `"openweather"`/`"nws"` → a registry entry you add with a real classification, `"schedule-internal"` → a first-party PLATFORM entry, `"the-odds-api"` → `the-odds-api`). Unknown → `null` (do not throw).
- At signal-write time (wherever `GameSignal` rows are created in the ingestion pipeline), set `sourceRightsId` and `rightsSnapshotJson = snapshotRights(entry)` when the bridge resolves. **Immutable** — never overwrite on refresh (mirror the `skipDuplicates` / empty-`update` pattern already used for `PickSignalSnapshot`).
- Backfill migration: stamp existing `GameSignal` rows by running `bridgeSourceName` over distinct `sourceName` values. Rows that don't resolve stay `null` and are surfaced as a warning, never a crash.

### 5.3 `traceClaim` (`apps/web/lib/proof/trace-claim.ts`)
```ts
export interface ProvenanceLink {
  kind: "CLAIM" | "CONTEXT";        // CLAIM = scoring GameSignal; CONTEXT = display engine
  signalKey: string;
  signalValue: unknown;
  trustLevel: number;
  knownAt: string;                  // ISO; = PickSignalSnapshot.capturedAt / signal.fetchedAt
  payloadHash: string | null;       // SourceSnapshot.payloadHash (raw bytes)
  rights: RightsSnapshot | null;    // from GameSignal.rightsSnapshotJson
  freshness: ReturnType<typeof classifyFreshness>;
}
export interface ProvenanceChain {
  pickId: string;
  generatedAt: string;
  links: readonly ProvenanceLink[];
  broadcastAllowed: boolean;        // every CLAIM link commercial_display_allowed
  attribution: readonly string[];   // distinct attribution_text required at publish
  unresolved: readonly string[];    // sourceNames with no rights mapping
}
export async function traceClaim(pickId: string): Promise<ProvenanceChain>;
```
Walks `Pick → PickSignalSnapshot → GameSignal → (SourceSnapshot payloadHash | rightsSnapshotJson)`; reuses `classifyFreshness`. CLAIM vs CONTEXT determined by whether the signal is a scoring input — never blur them.

---

## 6. PILLAR C — PREDICTION-TIME MERKLE *(extend `proof-of-record.ts`)*

Today only **settled** picks are Merkle-committed (proves the track record wasn't edited). It does **not** prove the evidence existed when we claimed it. Add the no-hindsight commitment.

### 6.1 Schema — `DecisionRecord`
```prisma
model DecisionRecord {
  id          String   @id @default(cuid())
  pickId      String   @unique
  committedAt DateTime @default(now())   // must be <= game commence
  knownAt     DateTime                   // max(signal.fetchedAt) in chain
  modelVersion String
  chainPayload String                    // canonical serialization of traceClaim()
  leafHash    String                     // hashLeaf(sha256, {id, payload})
  dailyRoot   String?                    // set when the day's root is published
  @@index([committedAt])
  @@index([dailyRoot])
}
```

### 6.2 Logic (`apps/web/lib/proof/decision-record.ts`)
- `canonicalDecisionPayload(chain: ProvenanceChain): string` — reuse `canonicalPickPayload` style: sorted keys, every `payloadHash` + `knownAt` + `rights.status` + `modelVersion`, pipe-delimited, deterministic.
- At publish, write one immutable `DecisionRecord` per pick. Inject sha256 from `node:crypto` into `hashLeaf`.
- `publishDailyDecisionRoot(day: Date)` — `merkleRoot` over that day's records; persist `dailyRoot` + verify each row with `verifyInclusion`.
- `replayDecision(pickId)` — recompute the leaf from the frozen chain; assert it matches the stored `leafHash` (deterministic replay / tamper check).

---

## 7. PILLAR D — PER-SOURCE RELIABILITY *(extend v8 — see §2 gating)*

`computeSourceReliability(sourceName)` in `packages/prediction-engine/src/source-reliability.ts`, mirroring `computeSignalReliability`'s verdict union: `INSUFFICIENT_DATA | NO_EDGE | MARGINAL | TRUSTED | DEMOTE`. Rolls `SignalLedgerEvent` outcomes up to the source; outputs a recommended `trustLevel` and a registry-demotion flag. **Recommends only** — never writes `GameSignal.trustLevel` or registry status automatically. Surface in the existing admin Cockpit alongside the v8 signal scorecard. If v8 is absent, ship the typed `INSUFFICIENT_DATA` stub per §2.

---

## 8. PILLAR E — BROADCAST-RIGHTS GATE *(thin wire; data already exists)*

`assertBroadcastRights(chain: ProvenanceChain): { allowed: boolean; blocks: string[]; attribution: string[] }` in `apps/web/lib/provenance/broadcast-gate.ts`:
- Deny if any **CLAIM** link has `rights.commercial_display_allowed === false` or `rights === null`.
- Propagate copyleft: if any link is `CC BY-SA 4.0` (nflverse), the derived output must carry share-alike + the `NflverseAttribution` text. Collect all `attribution_text` into `attribution`.
- **C&D quarantine:** `quarantineSource(sourceId)` — when `SourceRightsEntry.cease_and_desist_received` is true, mark all `DecisionRecord`s whose chain references that source's `SourceSnapshot`s as quarantined and exclude them from any published surface. Reuse the `ClearanceResult` block shape; do not invent a parallel result type.
- Call `assertBroadcastRights` at the publish boundary (pick publication + Model Court answer emission). Server-side only.

---

## 9. PILLAR F — FALSIFICATION LOOP *(new primitive; all deps live; may ship standalone first)*

The grading stack is live but read-only; the missing piece converts narrative pre-mortems into gradeable records.

### 9.1 Schema
```prisma
model FalsificationCondition {
  id        String   @id @default(cuid())
  pickId    String
  signalKey String    // "line_movement_delta" | "consensus_pct" | "injury_status" | ...
  operator  String    // "moves_against_by" | "drops_below" | "flips_to"
  threshold Float
  capturedAt DateTime @default(now())   // IMMUTABLE at publish
  triggered  Boolean?                    // filled at settlement
  triggeredAt DateTime?
  @@index([pickId])
}
```

### 9.2 Logic (`apps/web/lib/premortem/falsification.ts`)
- `buildFalsificationConditions(pick, snapshot): FalsificationConditionInput[]` — derive structured conditions from `computeFragilityScore` components + the pick's active signals. Write immutably at publish.
- `evaluateFalsification(pickId, settlementSignals): FalsificationCondition[]` — at settlement, set `triggered`/`triggeredAt`; map any triggered condition to a suggested `LossAutopsy.rootCause`. Recommends only.
- Wire into the existing settlement flow next to the loss-autopsy draft; feed `comparePreMortem`.

---

## 10. PILLAR G — GROUND "ASK THE BRAIN" *(harden Model Court)*

In `apps/web/lib/intelligence-graph/model-court/answer.ts`:
- Every answer clause cites a `payloadHash` + `knownAt` + license drawn from `traceClaim()`. CLAIM and CONTEXT must be visually/structurally distinct in the rendered answer.
- Refusals become **chain-derived**: refuse when a required CLAIM link is broadcast-forbidden (`assertBroadcastRights` denies) or `STALE` (per `classifyFreshness`) — in addition to the existing heuristic `EVIDENCE_THIN`. Add a `RefusalKind` value `CHAIN_BROKEN` and a refusal template.
- Keep the existing budget gating, policy validation, and `ClaudeApiCallRecord` usage logging untouched.

---

## 11. EXECUTION ORDER

1. **Pillar A** (independent) → migration + resolvers + seeder + tests.
2. **Pillar B** (`GameSignal` edit + bridge + `traceClaim`) → tests.
3. **Pillar F** (independent of B/C; may even precede them) → tests.
4. **Pillar C** (needs B) → tests.
5. **Pillar E** (needs B) → tests.
6. **Pillar G** (needs B) → tests.
7. **Pillar D** (needs v8; else stub) → tests.
8. Bump `MODEL_VERSION = "v9.0.0"`; update `CLAUDE.md` (§13); final green run.

Commit per pillar with a clear message. One migration may cover all schema additions, or one per pillar — your call, but each migration must be reversible-safe (all new columns nullable / new tables only).

---

## 12. TEST MATRIX (no pillar ships without its row green)

| Pillar | Required tests |
|---|---|
| A | dedup: two aliases → one `PlayerEntity`; **temporal**: STL Rams 2015 ≠ LA Rams 2016 yet same franchise id; `whoPlayedFor` respects `validAt`+`knownAt`; resolver idempotent (2nd pass = 0 new rows, bumps `lastVerifiedAt`); null external IDs don't crash |
| B | `traceClaim` returns a rights snapshot for every CLAIM link; legacy `sourceRightsId = null` rows surface in `unresolved`, never throw; CONTEXT engines never tagged CLAIM; `rightsSnapshotJson` immutable on refresh |
| C | tamper a `DecisionRecord.chainPayload` → recomputed leaf ≠ stored → replay fails; `publishDailyDecisionRoot` + `verifyInclusion` round-trips; `knownAt <= committedAt <= commenceTime` enforced |
| D | source with negative lift → `DEMOTE`; thin sample → `INSUFFICIENT_DATA`; **no** automatic `trustLevel`/registry write (assert read-only); stub path tested if v8 absent |
| E | `commercial_display_allowed:false` on a CLAIM link → `allowed:false`; CC BY-SA link forces attribution into output; `quarantineSource` excludes affected `DecisionRecord`s; server-side enforced |
| F | condition immutable at publish; `evaluateFalsification` sets `triggered` and suggests `rootCause`; untriggered conditions stay `false` |
| G | broken/stale CLAIM chain → `CHAIN_BROKEN` refusal; valid chain → every clause carries hash + license; budget/usage logging unchanged |

Plus: existing suites for `proof-of-record`, `source-intelligence`, `clearance-engine`, scoring must remain green (no regressions).

---

## 13. DEFINITION OF DONE

- [ ] `npm run db:generate` clean; migration applies and is reversible-safe.
- [ ] `npm run typecheck` green across `packages/db`, `packages/prediction-engine`, `packages/data-ingestion`, `packages/ingestion-pipeline`, `apps/web`.
- [ ] `npm run lint` green. `npm run test` green (new + existing). `npm run build` succeeds.
- [ ] `traceClaim(pickId)` returns a complete **legal + analytical** chain for any published canonical pick.
- [ ] All new gates default `false` in `platform-config.ts` and propagate through `readiness.ts`.
- [ ] No published surface changed behavior (shadow mode verified).
- [ ] `CLAUDE.md` gains a **Provenance Fusion** invariant:
  > *Every published pick MUST resolve a complete `traceClaim()` chain joining Spine B (payload hashes, knownAt) to Spine A (rights snapshot, attribution). `assertBroadcastRights()` MUST pass before any claim reaches a customer surface. `DecisionRecord`s are immutable and committed at `knownAt`; sources under cease-and-desist are quarantined retroactively.*
- [ ] Provenance honesty: any source touched that is not already classified must be added to `SOURCE_RIGHTS_REGISTRY` with a **real** status (not a guess); unresolved sources are reported, not silently defaulted.

---

## 14. COMMANDS

```bash
npm run db:generate     # after schema edits
npm run db:migrate      # create/apply migration
npm run typecheck
npm run lint
npm run test
npm run build
```

---

## 15. REPORTING FORMAT (end of run)

Report back with: (1) summary per pillar with file:line refs; (2) the v8 dependency decision you made for Pillar D (full vs stub) and why; (3) test command results pasted; (4) any source you added to the registry and its classification + evidence; (5) anything you found already-built that made a pillar smaller than specced; (6) local commit hashes (NOT pushed).

---

## 16. HANDBACK PROTOCOL — CODEX STOPS, CLAUDE SHIPS

This sprint is a two-stage relay. **Codex builds and verifies. Claude reviews and pushes. Do not cross the line.**

### Codex MUST (do all of this):
- [ ] Implement all seven pillars per spec.
- [ ] Run `npm run db:generate`, `db:migrate`, `typecheck`, `lint`, `test`, `build` — all green.
- [ ] **Commit every change locally** on `claude/serene-hopper-rtjsfq` with clear per-pillar messages. Leave **zero** uncommitted changes (clean `git status`).
- [ ] Produce the §15 report.

### Codex MUST NOT (hard stops — any of these fails the sprint):
- ❌ `git push` (any branch, any remote).
- ❌ Open, update, or merge a pull request.
- ❌ Deploy, run release tooling, or trigger CI that ships.
- ❌ Flip any `platform-config.ts` gate to `true`.
- ❌ Mutate any immutable record type (`RightsSnapshot`, `SourceSnapshot`, `PickSignalSnapshot`, `DecisionRecord`, `rightsSnapshotJson`, `FalsificationCondition.capturedAt`).

### Handback state Codex leaves for Claude:
- Branch `claude/serene-hopper-rtjsfq` with all work **committed but unpushed**.
- Clean working tree (`git status` shows nothing to commit).
- The §15 report in the run output.

### Claude's final-review checklist (Claude runs this, then pushes):
1. `git log --oneline` and `git diff` the full range — confirm scope matches this directive, nothing extra.
2. Re-run `typecheck`, `lint`, `test`, `build` independently — confirm green, not just reported green.
3. Verify the **two-spine fusion** actually holds: `traceClaim()` returns a non-null `RightsSnapshot` for every CLAIM link on a sample published pick; `unresolved` is empty or explained.
4. Verify shadow mode: every new gate is `false`; no published surface changed.
5. Confirm immutability: spot-check that refresh paths use empty-`update` / `skipDuplicates` and never overwrite a snapshot.
6. Confirm Pillar D honored the v8 dependency decision correctly (full vs stub).
7. Confirm no source was added to the registry with a guessed status; each has real evidence.
8. Only then: `git push -u origin claude/serene-hopper-rtjsfq`. PR only if the user explicitly asks.

If any check fails, Claude fixes or sends it back — Claude does not push a failing or out-of-scope branch.

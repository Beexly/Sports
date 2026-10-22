# Shadow Decision Architecture → Engine Mapping

*Mapped 2026-10-08 ~5:15 PM CT by Motif (subagent). Source doc: `shadow-decision-architecture.md` (received from Garrett 2026-10-08). Reconciled against the actual repo state at commit `1984cfaf6` and the 2026-10-08 engine dig (no runnable prediction path, pick worker is a stub, v5.3.0 not built, player signals table empty per dig).*

*Verdict convention: **EXISTS** (in repo, cited), **PARTIAL** (pieces exist, not the whole), **MISSING** (nothing).*

---

## 1. Component inventory

### 1a. Situational note table (17-field schema) — **MISSING**

No table matching the doc's `note_id / retrieved_at_utc / event_valid_start_utc / event_valid_end_utc / game_id / player_id / entity_confidence / source_tier / source_name / speaker_identity / source_url / raw_quote / corroboration_id / proposed_situation / proposed_delta_spread / proposed_delta_total / processing_status` schema exists anywhere in the repo.

Nearest neighbors (fragments, not the table):
- `source_tier INTEGER NOT NULL` exists on `entities` and `entity_edges` (`packages/db/prisma/migrations/20260101000000_baseline/migration.sql:2238,2252`) — the entity graph, not situational notes.
- `valid_from` / `valid_to` on `entity_edges` (same migration) — valid-time-ish, but no assertion-time column, no `retrieved_at_utc` semantics.
- `observed_at`, `created_at` timestamps exist on edges — not the doc's T_assert.
- No `corroboration_id`, no `proposed_delta_*`, no `processing_status` enum, no `LIBRARY_ARCHIVED / SHADOW_ELIGIBLE / ABSTAINED` routing state anywhere.

**This is the single most important build-first item.** The entire doc pivots on the note row: tier checks, temporal gates, delta proposals, footnote emission, and independent scoring all read from it. Without the table, every other component is an island.

### 1b. Six-tier source hierarchy — **EXISTS**

`docs/brain/source-acquisition-mesh.md:118-186` defines all six tiers (Tier 1 official/primary, Tier 2 licensed/structured, Tier 3 trusted secondary, Tier 4 market signals, Tier 5 community/weak signal, Tier 6 not admitted — "AI-generated content... never admitted to the registry as evidence sources"). `docs/brain/claim-governance.md:87-98` operationalizes it per claim type (e.g., "Player injury status (official designation) | Tier 1"). The Prisma `source_tier Int` column makes it a first-class DB concept.

Delta vs the doc: the repo's ladder is framed for claim governance / public-trust, not for prediction-path gating. The doc's Rules 1-5 (tier authority → delta eligibility) have no code equivalent. The ladder exists; its use as a *delta-proposal gate* does not.

### 1c. Bitemporal as-of join logic (T_assert ≤ T_lock, post-lock quarantine) — **PARTIAL**

Exists:
- `timeHoldoutSplit` (used by `apps/web/lib/calibration/deployed-map-holdout.ts`) — temporal splits, explicitly never random ("a random shuffle leaks the future into the fit"). This is the repo's existing anti-lookahead-leakage discipline.
- Odds line snapshots migration (`packages/db/prisma/migrations-archive/20260716120000_add_odds_line_snapshots/`) — timestamped market observations.

Missing:
- No T_lock concept for situational ingestion. No per-game lock boundary.
- No T_assert column on any situational/ingestion table (see 1a).
- No post-lock audit quarantine partition. The doc's three vulnerabilities (lookahead leakage in backtests, silent mutation of training partitions, mismatched temporal horizons) are *named risks with no corresponding enforcement* for situational data. The backtest side is guarded (`timeHoldoutSplit`); the ingestion side is not.

### 1d. Shadow consumer (y_shadow = y_pub + Δy, footnote emission, independent scoring) — **PARTIAL**

Two partial implementations exist, neither is the doc's game-level shadow consumer:

1. **Props shadow** — `packages/ingestion-pipeline/src/props-slate-shadow.ts:1-155`. Env-gated (`PROPS_SLATE_SHADOW_ENABLED`, default OFF), shadow-only (`shadow: true, weight: 0`), fail-closed on missing inputs. Closest living relative of the doc's pattern, but scoped to player props, not game spread/total.
2. **Fantasy adjustment shadow guard** — `apps/web/lib/signals/adjustment-layer.ts` (delta engine: TRIGGER→AFFECTED→DIRECTION→MAGNITUDE→LOG, every magnitude `calibrated: false`) wired into `apps/web/lib/fantasy/engine-slate.ts:174-182` via `computeAdjustments` + `adjustmentsMayMovePublished`, pinned by `apps/web/__tests__/engine-slate-shadow-guard.test.ts` ("Uncalibrated signals MUST compute (shadow) but must NEVER move a published number"). This is the doc's "compute in shadow, weight 0" rule, already enforced in code — for fantasy points, not game lines.

Missing:
- **No y_pub for game spread/total.** The doc assumes a baseline projection exists to shadow. It does not (see §2). There is no game-level `y_shadow = y_pub + Δy` function, no shadow footnote table, no independent scoring harness that evaluates y_pub vs y_shadow on settlement.
- Footnote emission exists only as lineage formatting (`apps/web/lib/ledger/format.ts:56-60` — `formatLineageFootnote`), not as a shadow-delta audit record.

### 1e. Calibration gates (N≥100, Brier≤0.22, ECE≤0.05, Rel≤0.05, 3 consecutive runs) — **PARTIAL**

Exists as measurement, not as gates:
- `MIN_SETTLED_PICKS_FOR_PERFORMANCE = 100` (`apps/web/__tests__/gate-flip-readiness.test.ts:37` pins the value) — the N≥100 floor exists as a concept.
- `apps/web/lib/calibration/deployed-map-holdout.ts` — measures Brier, debiased ECE, Murphy terms on time-split holdouts. **Currently reads gate-RED on deployed v5.2.7.**
- `packages/prediction-engine/src/__tests__/brier-ogd-ensemble.test.ts`, `conformal-intervals.test.ts`, `calibration-ladder.test.ts` — calibration machinery in test form.

Missing:
- The gates are not wired to any shadow consumer or deployment decision. Nothing in the repo enforces "3 consecutive passing runs" or blocks publication on Brier>0.22.
- The measured reality is adverse: the only Brier numbers on record are worse than a coin flip (0.2551 vs 0.2500 constant-0.5, unmerged branch `hermes/calibration-audit-2026-09-30`; 0.2790 vs 0.2491 climatology, unmerged `feat/brier-scoring`). The doc's gates, applied today, would lock everything — which is the doc's intended behavior (STOP-07), not a contradiction.

### 1f. Ten stop conditions — **MISSING** (as a unified list)

No STOP-01..STOP-10 exists. Nearest neighbors:
- `apps/web/lib/opportunity-engine/capability-governance.ts` — stop/governance for a different domain (opportunity engine capabilities), not prediction-path stops.
- Per-module fail-closed patterns (props shadow's "missing modelProbOver" error, adjustment layer's `adjustmentsMayMovePublished` gate, airwave's default-REFUSAL posture) — the *spirit* of stop conditions, scattered, not unified.

Enforceability assessment (see §3, Phase 5):
- **Enforceable today** (structural, no new science): STOP-01 (make `retrieved_at_utc` NOT NULL — a missing timestamp becomes a schema violation, not a runtime check), STOP-04 (tier enum check against the existing ladder), STOP-06 (type-level ban on raw prose in the delta path — the adjustment layer is already pure/typed, so this is extending an existing invariant).
- **Aspirational** (needs missing components): STOP-02 (needs T_lock plumbing), STOP-03 (needs entity linking with margin — doesn't exist), STOP-05 (needs corroboration_id infrastructure — doesn't exist), STOP-07/08/09 (needs gates wired to deployment — don't exist), STOP-10 (needs URL/date validation on findings — doesn't exist).

### 1g. Transcript extraction pipeline (diarization → fact extraction → entity linking, margin rejection τ≈0.35) — **PARTIAL**

Exists:
- `apps/web/lib/airwave/pipeline.ts` — capture → transcribe → extract → grade contract, default-REFUSAL posture, SiriusXM held behind a human legal ack. Inert by default (`AIRWAVE_ENABLED`).
- `docs/ai/airwave/` — operator runbook, source policy, architecture docs.
- Entity graph (`apps/web/lib/entity-graph/repository.ts`) with confidence scores — entity *storage* with confidence, not entity *linking with margin rejection*.

Missing:
- No syntactic fact extraction (no dependency-parsing claim extractor).
- No deterministic entity linking with posterior margin P(e_1)−P(e_2) ≥ 0.35. No abstention-on-ambiguity in any extraction path.
- No mapping from extracted claims to note rows (the table doesn't exist).
- The heavy work is documented as living in `workers/airwave-listener` (out-of-process) — the in-repo contract is the gate, not the pipeline.

---

## 2. What the doc gets wrong about the current repo

1. **"The engine already writes signals and publishes baseline projections (y_pub)." — FALSE.** There is no runnable prediction path. `workers/pick-generation/src/index.ts` is a stub that logs and calls `process.exit(0)` (lines 1-22, "NOT DEPLOYED"). The `data-refresh → scoreGames()` path (`packages/ingestion-pipeline/src/process-sport.ts`) is market-consensus de-vigging, not a model. `gse-ml-service`'s `POST /predict/etkf` is stateless, uncalibrated, and undeployed. The doc's shadow consumer has nothing to shadow yet.
   - **Bridge, not contradiction:** the doc explicitly allows the baseline to be "the unconditioned statistical expectation **or closing market consensus**." The existing de-vigged market path can serve as y_pub v0 — the shadow consumer can be built against it on day one, and a real model can replace the baseline later without changing the shadow architecture.
2. **Finding #10: beexly/sports "inaccessible (HTTP 404 or private boundary)." — author's vantage, not repo reality.** It is a private repo; the doc's author probed it without credentials. (Already flagged in the intake note.)
3. **The TNF worked example (DAL −3.5, Total 44.5) is illustrative, not real.** No such y_pub exists in the repo. Treat as a schema example only.
4. **"Signal weight tuner" implication.** The doc's framework assumes signals flow toward weights. The repo's tuner runs read-only with weights that never persist (per the 2026-10-08 dig). The weight stage of WIRE-FIRST is unbuilt.

---

## 3. Sequenced build plan (WIRE-FIRST: research → wire → weight → calibrate → test → polish)

**Phase 0 — Research (DONE).** This mapping + the source doc. Citation verification of the four 2026-dated sources (Bai & Jin arXiv:2603.24704, Xie & Alsinglawi arXiv:2610.08322, Rosen 2026, Wu et al. arXiv:2609.09678) is still owed before the empirical table is treated as load-bearing — Lopez & Bliss 2024, Borghesi 2007/2008, Boulier & Stekler 2003 are established literature.

**Phase 1 — Wire (build order):**
1. **`situational_notes` Prisma table** — the doc's 17-field schema, verbatim. `retrieved_at_utc` NOT NULL (this makes STOP-01 structural). `processing_status` enum `LIBRARY_ARCHIVED | SHADOW_ELIGIBLE | ABSTAINED` defaulting to `LIBRARY_ARCHIVED` (default-deny: a note earns its way to SHADOW_ELIGIBLE by passing Rules 1–5, mirroring the airwave pipeline's default-REFUSAL posture).
2. **T_lock plumbing** — per-game lock timestamp (kickoff) on the schedule/slate; every note query filters `retrieved_at_utc <= T_lock`. Post-lock arrivals route to a quarantine partition, not the feature path (STOP-02).
3. **Minimal viable shadow consumer** — one pure function: `(y_pub, eligibleNotes) → { y_shadow, footnotes[] }`, where Δy comes from the existing `computeAdjustments` in `apps/web/lib/signals/adjustment-layer.ts`. y_pub v0 = the existing de-vigged market consensus (per §2 bridge). Footnotes append to a `shadow_footnotes` table (immutable log), never to the published path. Extend the existing `engine-slate-shadow-guard.test.ts` pattern: pin that y_pub is bit-identical with and without shadow enabled.
4. **Tier gate as code** — Rules 1–5 as a pure `noteEligibility(note): SHADOW_ELIGIBLE | LIBRARY_ARCHIVED | ABSTAINED` function, reusing the `docs/brain/source-acquisition-mesh.md` tier definitions (STOP-04 enforceable here).

**Phase 2 — Weight:**
5. Corroboration: `corroboration_id` must reference a *distinct* note from an independent source; Tier 3 without it stays LIBRARY_ARCHIVED (STOP-05).
6. Entity linking with margin rejection: build the linker against the entity graph; enforce entity_confidence ≥ 0.850 and margin ≥ 0.350 before a note can propose a delta (STOP-03). Until this exists, all transcript/airwave-derived notes are LIBRARY_ARCHIVED by default.
7. Airwave claim extraction: structured claim → note row writer (the pipeline contract exists; the extractor doesn't).

**Phase 3 — Calibrate:**
8. Backtest the doc's empirical table (§4) as initial delta priors on settled games via `timeHoldoutSplit` — QB change, wind, rest, travel. Every magnitude stays `calibrated: false` until measured, exactly as `DEFAULT_MAGNITUDES` already declares.
9. Replace structured defaults with measured magnitudes through the existing `magnitudes` override path in the adjustment layer (the `calibrated: true` flip is already designed in).

**Phase 4 — Test:**
10. Independent scoring harness: on settlement, score y_pub and y_shadow as two models (Brier, ECE, Murphy Rel). Accumulate the N≥100 sample. Enforce the 3-consecutive-run stability rule before any promotion discussion (STOP-07/08/09 become code here, not before).

**Phase 5 — Polish:**
11. Unified stop list: encode STOP-01..10 as a single module with the enforceable-vs-aspirational split from §1f documented in code comments.
12. Footnote display: surface shadow footnotes on the internal dashboard only (public surface stays projections-and-rankings per the 2026-09-28 doctrine).

**Explicit non-goals for this build:** SCoRE/SASF implementations (the doc itself proves they're vacuous below N=100 — build the floor first, the selective-prediction machinery later); touching `gse-grok-build-sandbox`; any live publication of shadow numbers.

---

## 4. Empirical situational effects — candidate initial delta magnitudes (ALL UNCALIBRATED)

From the doc's table, mapped to adjustment-layer magnitude keys. These are **literature priors, not measurements** — they enter as `calibrated: false` structured defaults and earn `calibrated: true` only via Phase 3 backtesting. The doc demands this; so does the repo's adjustment-layer header.

| Doc finding | Candidate magnitude key | Literature value | Market note (from doc) |
|---|---|---|---|
| Starting QB → backup (upper-quartile starter) | new: `QB_CHANGE_SPREAD` | −3.5 to −7.0 pts on spread | Immediate, aggressive line adjustment — the book moves first |
| Non-QB offensive starter out | new: `NON_QB_STARTER_SPREAD` | <0.5 pts per player | Absorbed by depth; do not overreact |
| Bye-week rest (post-2011 CBA) | new: `REST_DIFF_SPREAD` | +0.15 (p>0.40, ~zero) | Overrated by public; accurately priced — default magnitude should be ~0 |
| Mini-bye / short week | (same key) | +0.08, not significant | Completely efficient — no delta |
| Sustained wind >15 mph | `WEATHER_WIND_*` (exists) | −1.8 to −2.8 on total | Slight under-adjustment in extremes — the one weather angle with possible edge |
| Extreme cold, no wind | new: `WEATHER_COLD_TOTAL` | ≤−0.8 on total | Fully priced — no delta |
| Transcontinental travel (modern) | new: `TRAVEL_SPREAD` | −0.3 to −0.6 | Fully absorbed — no delta |

Design implication the doc gets right and the repo should adopt: **most situational magnitudes are ~zero.** The shadow consumer's most common correct output is "no delta." The existing `DEFAULT_MAGNITUDES` (e.g., `SECONDARY_INJURY_QB_PASSING_YARDS: 3.5`) are fantasy-points-scale and larger than the doc's game-spread evidence supports — reconciling the two scales is a Phase 3 calibration task, flagged here so nobody treats the current defaults as game-line deltas.

---

*End of mapping. Next action if Garrett approves: Phase 1, item 1 — the `situational_notes` Prisma migration (17 fields, default-deny routing).*

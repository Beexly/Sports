# GSE 2026 — Data Excellence System (Workstream B)

Status: internal research doc. Companion to the typed contract `apps/web/lib/gse/data-excellence.ts`
(to be authored; this doc is the spec, not the code). Read alongside Workstream C
(`docs/research/GSE_2026_DECISION_GRAPH_ONTOLOGY.md`).

Scope: define how Galaxy Sports Edge (GSE) treats data so that every claim it makes is
defensible. No code changes are proposed here. Where a value is not yet known, it is
marked `(uncertain)`.

---

## 0. What "impeccable data" means

Impeccable data is NOT perfect data. Sports and market data are intrinsically:

- messy (typos, ID mismatches, partial rosters),
- delayed (feeds lag the real world; settlement comes hours later),
- licensed (rights vary per source; some facts may not be displayed or stored),
- contradicted (two beat reporters disagree; two books disagree),
- stale (a snapshot from 40 minutes ago may be wrong now),
- probabilistic (projections and odds are estimates, never facts about the future).

"Impeccable" here is an integrity standard, not an accuracy fantasy. Data is impeccable
when it is:

1. source-aware — every value knows where it came from,
2. timestamped — captured-at and observed-at are always recorded,
3. versioned — the normalization/model version that produced it is recorded,
4. rights-aware — carries a rights posture from the existing source-rights registry,
5. confidence-scored — uncertainty is attached, never implied to be zero,
6. freshness-scored — staleness is measured against a per-source expectation,
7. contradiction-aware — conflicts are recorded, not silently resolved,
8. model-aware — derived values name the model run that produced them,
9. replayable — any output can be reconstructed from inputs + versions,
10. auditable — the full lineage is retrievable for any user-facing claim,
11. explainable — a human can read why a claim was made,
12. never overstated — the surface claim never exceeds what the data supports.

The system is built to keep these twelve properties true at every hop.

---

## 1. Data Source Registry

GSE already has a **rights** registry: `apps/web/lib/scraping/source-rights-registry.ts`
(statuses, permission flags, risk flags, attribution). The Data Source Registry described
here is the **operational** companion to it: it adds the freshness/reliability/cost/
dependency dimensions that rights does not cover. The two are joined on `source_id`.

Do NOT duplicate rights fields. The Data Source Registry **references** the rights entry
and the clearance engine; it never re-defines `SourceRightsStatus`.

### 1.1 Fields

| Field | Type | Meaning |
|---|---|---|
| `source_id` | string | FK to `SOURCE_RIGHTS_REGISTRY[].source_id`. Canonical join key. |
| `name` | string | Human label. |
| `domain` | string | Host / data domain (e.g. `the-odds-api.com`). |
| `source_type` | enum | Reuse `SourceType` from the rights registry (`odds_provider`, `open_dataset`, …). |
| `rights_posture` | ref | **Pointer**, not a copy: `getSourceRightsEntry(source_id).status`. |
| `allowed_usage` | derived | From rights flags (`commercial_display_allowed`, `storage_allowed`, `derived_analytics_allowed`, `model_training_allowed`). Read-through, never re-stored as truth. |
| `prohibited_usage` | derived | Inverse of the above + explicit notes from the rights entry. |
| `freshness_expectation_s` | number | How old a value may be before it is "stale" for this source (seconds). |
| `update_frequency_s` | number | Observed cadence of new data from the source. |
| `reliability_score` | 0–100 | Operational reliability (uptime, schema stability). Distinct from accuracy. |
| `historical_accuracy` | 0–100 \| null | Backtested agreement with settled outcomes, where measurable. `null` until enough settled samples exist. |
| `cost_model` | enum | `free` \| `freemium` \| `metered` \| `flat_license` \| `unknown`. |
| `cost_per_unit` | number \| null | Marginal cost per call/record if metered. |
| `dependency_risk` | enum | `none` \| `low` \| `medium` \| `high` \| `unknown` — risk of the source vanishing, changing terms, or rate-limiting. |
| `fallback_source_id` | string \| null | The next source to use if this one fails clearance, goes stale, or errors. |
| `public_allowed_state` | enum | `public_ok` \| `private_only` \| `blocked` — whether values from this source may surface to free/public users, derived from rights + license. |
| `last_health_check_at` | ISO ts | When the registry last verified the source was live. |

### 1.2 Rules

- `rights_posture` is read live from the rights registry at use time. If the rights entry
  changes (e.g. a `vendor_candidate` becomes `approved_api`), no data migration is needed.
- A source may be operationally healthy (high `reliability_score`) yet legally unusable
  (`status = permission_required`). The clearance engine wins. Always.
- `fallback_source_id` must itself be a registered, clearance-passing source. A fallback to
  an `excluded` or `permission_required` source is a config error and should fail validation.
- `historical_accuracy` is never asserted without a settled-outcome sample behind it
  (no-fabricated-stats rule). Until then it is `null`, not a guess.

### 1.3 Seed rows (from existing registry — illustrative, verify live before coding)

| source_id | rights status | freshness_expectation | dependency_risk | fallback |
|---|---|---|---|---|
| `the-odds-api` | approved_api | seconds–minutes (odds move) | medium (metered quota) | `espn-public-api` (scores only) (uncertain) |
| `open-meteo` | approved_open_license | hours (forecast) | low | self-hosted open data |
| `nflverse` | approved_open_license | days (weekly) | low | none needed |
| `espn-public-api` | approved_public_logged_off | minutes (scores) | high (unofficial) | `the-odds-api` scores |

These rows mirror `apps/web/lib/scraping/source-rights-registry.ts`. The freshness and
dependency columns are operational judgments to be confirmed against live behavior, not
copied from the rights file.

---

## 2. Data Quality Score

Every normalized record and every derived feature carries a **Data Quality Score (DQS)**.
DQS is a structured object, not a single number — the single number is only a roll-up for
display. DQS feeds two outputs: a **confidence** value and a **downstream claim risk** band.

### 2.1 Components

| Component | Range | Definition |
|---|---|---|
| `completeness` | 0–1 | Fraction of required fields present and non-null for this entity shape. |
| `freshness` | 0–1 | `1` if within `freshness_expectation_s`, decaying toward `0` past it. |
| `consistency` | 0–1 | Agreement across fields and across confirming sources for the same fact. |
| `source_reliability` | 0–1 | From the Data Source Registry `reliability_score / 100`. |
| `confirmation_count` | int | Number of independent sources asserting this fact. |
| `contradiction_count` | int | Number of sources asserting a conflicting value. |
| `recency` | 0–1 | Normalized age of the underlying observation (distinct from freshness expectation: recency is absolute, freshness is relative to the source SLA). |
| `lineage_depth` | int | Hops from raw source to this value (see §3). Deeper = more transformation risk. |
| `rights_safety` | 0–1 | `1` if clearance is granted for the intended use, `0` if blocked; partial if `requiresReview`. |

### 2.2 Roll-up

```
confidence = weighted_blend(
  completeness, freshness, consistency, source_reliability, recency
) * confirmation_bonus(confirmation_count)
  * contradiction_penalty(contradiction_count)
  * rights_safety            // a hard gate: rights_safety = 0 ⇒ confidence not usable
```

- `rights_safety` is multiplicative and acts as a gate: if clearance is not granted, the
  value cannot back a user-facing claim regardless of how clean it is.
- `contradiction_penalty` lowers confidence but never silently picks a winner (see §7).
- The roll-up weights are tuning parameters `(uncertain)` and must be calibrated against
  settled outcomes before being trusted (see `accuracy` / `calibrate` skills).

### 2.3 Downstream claim risk

DQS maps to a claim-risk band that the Claim Safety Gate (§6) enforces:

| Band | Condition (illustrative) | Effect on claims |
|---|---|---|
| `green` | confidence high, ≥2 confirmations, fresh, rights clear | may state as fact with timestamp |
| `amber` | single source OR aging OR mild contradiction | must hedge; show "as of <ts>", single-source note |
| `red` | stale, contradicted, low completeness, or rights-blocked | may not surface as a claim; show as unknown / withheld |

Thresholds are `(uncertain)` pending calibration.

---

## 3. Data Lineage chain

Every user-facing recommendation must be traceable backward through this chain. Each hop
records: the producing version, the timestamp, and the inputs consumed.

```
raw source snapshot
  → normalized entity        (canonical IDs, units, schema; normalization_version)
    → feature                (derived signal/metric; feature_version)
      → model input          (the exact feature vector handed to a model run)
        → model output       (projection / probability / ranking; model_version, model_run_id)
          → recommendation   (what GSE suggests; references evidence + model_run)
            → user decision   (accept / reject / modify)
              → outcome       (what actually happened; settled result)
                → autopsy      (post-hoc: which source/contradiction/assumption mattered)
```

### 3.1 Invariants

- No hop may exist without its predecessor recorded. A recommendation with no model_run, or
  a model_run with no inputs, is an integrity failure and must be flagged, not displayed.
- Each hop is **append-only**. Re-deriving creates a new versioned record; it does not
  overwrite (replayability).
- The chain is the substrate for the Data Autopsy (§8). If a hop is missing, the autopsy
  cannot run and that is itself a finding.
- `raw source snapshot` carries the `RightsSnapshot` captured at extraction time
  (from the clearance engine, `wrapExtractedRecord`). Rights propagate forward to every
  derived hop; attribution text must reach the final surface.

---

## 4. Data Contracts (typed shapes)

These are the canonical shapes the platform agrees on. They will live in
`apps/web/lib/gse/data-excellence.ts` and the ontology contract (Workstream C). Listed here
as field intent, not final TypeScript. Every shape carries the **provenance envelope**
(below) unless it is itself pure reference data.

### 4.0 Provenance envelope (mixed into every fact-bearing shape)

| Field | Meaning |
|---|---|
| `source_id` | producing source (rights registry key) |
| `observed_at` | when the fact was true in the world (best estimate) |
| `captured_at` | when GSE captured it |
| `normalization_version` | transform version |
| `confidence` | 0–1 (from DQS) |
| `freshness` | 0–1 |
| `rights_snapshot` | point-in-time rights capture |
| `dqs` | the full Data Quality Score object |

### 4.1 Shapes

| Contract | Key fields (beyond envelope) | Notes |
|---|---|---|
| `Player` | canonical_id, names/aliases, team_id, position, status | aliases resolve cross-source ID drift |
| `Team` | canonical_id, league_id, abbreviations | |
| `Game` | game_id, slate_id, home/away team_id, scheduled_at, status, venue | |
| `Slate` | slate_id, league, window, game_ids[] | a set of games for a contest/period |
| `Market` | market_id, game_id, market_type (spread/total/ml/prop) | |
| `OddsSnapshot` | book_id, market_id, price, line, captured_at | **snapshot**, never "current"; always timestamped |
| `Projection` | entity_id, stat, distribution/point, model_run_id | probabilistic; carries interval, not just point |
| `OwnershipProjection` | entity_id, slate_id, projected_ownership_pct, model_run_id | fantasy field-share estimate |
| `Injury` | player_id, designation, body_part, reported_at, source_id | contradiction-prone; never single-source asserted as fact in `green` |
| `BeatReport` | player_id/team_id, claim_text(paraphrase), reporter, source_id, reported_at | paraphrase only; no article-body republication (data-rules) |
| `NarrativeSignal` | subject, signal_type, allowed_impact_type, magnitude, source_id | may only affect projection/ownership/volatility via allowed impact types (Workstream C) |
| `Source` | source_id (FK), reliability, rights_posture(ref) | operational view of a source |
| `ModelRun` | model_run_id, model_version, inputs_ref[], started_at, params | one execution of a model |
| `Recommendation` | rec_id, model_run_id, evidence_ids[], claim, confidence, tier(free/premium), generated_at | the unit the user sees |
| `Decision` | decision_id, rec_id, user_id, action(accept/reject/modify), decided_at | what the user did |
| `Autopsy` | autopsy_id, rec_id, outcome, source_verdicts[], lessons | post-settlement review (§8) |
| `CalibrationResult` | scope (model/source), bucket, predicted, observed, sample_n, computed_at | feeds confidence updates |
| `UserPref` | user_id, sports[], risk_posture, alert_settings | |
| `LeagueMemory` | league_id, history, tendencies, scoring_rules | per-league durable memory (fantasy) |
| `ManagerGenome` | user_id, behavioral_traits[], derived_from_decisions[] | inferred manager style; inference, label as derived |
| `RevenueEvent` | event_id, type(subscribe/upgrade/churn), plan, amount, occurred_at | billing-domain fact |
| `ProductEvent` | event_id, user_id, surface, action, occurred_at | product analytics fact |

### 4.2 Contract rules

- `OddsSnapshot`, `Injury`, and any time-sensitive shape are **snapshots**: they are never
  labeled "current" without re-checking freshness at read time.
- `Projection` and `OwnershipProjection` carry a distribution or interval, not just a point
  estimate. A bare point estimate presented as certainty violates "never overstated".
- `ManagerGenome` and `NarrativeSignal` are **inferred**, not observed; they must be labeled
  as derived and may never be presented as facts about a person.
- `BeatReport` stores a paraphrased claim plus attribution — never the source's article body
  (consistent with the scraping data-rules and high copyright-expression risk sources).

---

## 5. Data Health Cockpit

An operator-facing dashboard (and an internal API) that answers: "is the data we are
standing on trustworthy right now?" It surfaces problems before they reach users.

### 5.1 Panels

| Panel | Watches for | Source of truth |
|---|---|---|
| Stale sources | source age > `freshness_expectation_s` | Data Source Registry + last snapshot ts |
| Broken feeds | clearance error, HTTP error, schema mismatch | ingestion job results |
| Missing fields | `completeness < threshold` on key entities | DQS completeness |
| Contradictions | `contradiction_count > 0` on live facts | Truth Maintenance (§7) |
| High-risk claims | claims in `amber`/`red` band currently surfaced | Claim Safety Gate (§6) |
| Demo/live boundary | any demo/synthetic data within reach of a live surface | record `mode` flag |
| Rights risks | sources newly `permission_required`/`blocked`/`excluded`, or C&D received | rights registry + clearance |
| Model drift | model output distribution shift vs baseline | ModelRun monitoring |
| Calibration degradation | predicted vs observed gap widening | CalibrationResult trend |
| Unresolved disputes | open contradictions past SLA | Truth Maintenance queue |

### 5.2 Rules

- The cockpit reads, it does not "fix". It routes: a rights risk routes to the legal queue
  (mirrors `requiresReview`), a stale source routes to ingestion, a contradiction routes to
  Truth Maintenance.
- The **demo/live boundary** panel is a hard-stop watcher: any synthetic/demo record that
  can reach a live user surface is a `red` finding. (Aligns with the no-fake-data rule.)
- Every panel item links to its lineage (§3) so an operator can see the chain, not just the
  symptom.

---

## 6. Claim Safety Gate

A pure, deterministic gate that every user-facing claim passes through immediately before
display or send. It is the data-side analog of the scraping clearance engine: structured
checks, explicit block reasons, no silent pass. A failed required check **withholds** the
claim — it does not weaken it into something misleading.

### 6.1 Checks

| # | Check | Pass condition | On fail |
|---|---|---|---|
| 1 | source present | claim traces to ≥1 registered source | withhold |
| 2 | timestamp present | observed_at + captured_at exist | withhold |
| 3 | confidence present | confidence value attached | withhold |
| 4 | demo/live clear | record `mode` is `live` for a live surface | withhold |
| 5 | no banned language | none of the CI-forbidden tout phrases present | rewrite/withhold |
| 6 | no unsupported causal claim | "because/caused" only when evidence supports it | downgrade to correlation or withhold |
| 7 | no fake certainty | no absolute-certainty framing on a probabilistic value | rewrite to hedged form |
| 8 | no rights violation | clearance granted for this display intent | withhold |
| 9 | stale-data warning resolved/visible | if stale, an "as of <ts>" warning is shown | force-show warning or withhold |

### 6.2 Banned language

The CI scanner forbids tout/casino phrasing (e.g. absolute-certainty or "no-risk" framing).
The gate enforces the same list at runtime. The banned list is owned by the CI scanner +
`check-claims` skill; the gate imports it rather than re-listing it, so the two cannot drift.
This doc does not restate the forbidden phrases.

### 6.3 Output

```
ClaimGateResult = {
  allowed: boolean
  withheld: boolean
  rewrites: string[]      // suggested hedged phrasings
  blocks: { code, message }[]
  warnings: string[]      // e.g. stale-data notice that must render
  checkedAt: ISO ts
}
```

A withheld claim shows as "we don't have a confident read here" — never as a fabricated or
softened version of an unsupported claim.

---

## 7. Truth Maintenance

The system never silently rewrites the past. When sources disagree, GSE records the
disagreement as a first-class fact and resolves it transparently.

### 7.1 Contradiction handling

- A `ContradictionRecord` is created when two sources assert conflicting values for the same
  (entity, field, observation window): it stores both values, both sources, both timestamps,
  and a `status` (`open` / `resolved` / `superseded`).
- Resolution attaches a `resolution_basis` (e.g. "higher-reliability source", "more recent
  observation", "official source overrides aggregator") and a `resolved_by`. The losing value
  is **retained**, marked `superseded` — not deleted.
- While `open`, dependent DQS carries the `contradiction_penalty`, and claims are capped at
  `amber` (must hedge / show both).

### 7.2 Never silently rewrite

- Corrections are append-only revisions with a reason, not in-place edits. A user who saw the
  old value can be shown the correction and why it changed.
- A `RightsSnapshot` is immutable by rule (it is a point-in-time capture); Truth Maintenance
  must never mutate one, only supersede the record that carried it.

---

## 8. Data Autopsy

After an outcome settles, GSE reviews what its data actually did. The autopsy turns settled
results into source/model trust adjustments. It runs off the lineage chain (§3).

### 8.1 Questions every autopsy answers

- Which source was **right**, which was **wrong**, which was **stale** at decision time?
- Which **contradiction mattered** — did an open dispute change the outcome, or was it noise?
- What should we **downgrade** (lower `reliability_score` / `historical_accuracy`) and what
  should we **trust more**?
- Did the **freshness expectation** hold, or did "fresh" data turn out to be wrong fast?
- Did the **confidence** match reality (feeds CalibrationResult)?

### 8.2 Outputs

| Output | Consumer |
|---|---|
| `source_verdicts[]` (per source: right/wrong/stale/abstained) | Data Source Registry reliability + historical_accuracy |
| `contradiction_verdict` (mattered / noise) | Truth Maintenance tuning |
| `calibration_delta` | CalibrationResult → confidence weights |
| `lessons` (plain-language) | operator review; model/feature backlog |

### 8.3 Rules

- The autopsy adjusts **future** trust; it never rewrites the historical record of what was
  shown (Truth Maintenance §7.2).
- Trust changes are versioned: a `reliability_score` change records the autopsy that caused
  it, so the change is itself auditable and reversible.
- No autopsy may invent a counterfactual ("we would have won if…") as a stated fact; such
  notes are explicitly labeled as hypotheses, never claims.

---

## 9. How the subsystems fit together

```
Source Rights Registry ──(join on source_id)──► Data Source Registry
        │                                              │
        └─ clearance engine (allow/block) ─────────────┘
                       │
   raw snapshot ──► normalize ──► feature ──► model input ──► model output ──► recommendation
        │              │            │            │               │                 │
        └──────────────┴── DQS scored at every hop ──────────────┘                 │
                                                                                   ▼
                                                          Claim Safety Gate ──► user surface
                                                                                   │
                       Truth Maintenance ◄── contradictions ──────────────────────┘
                                                                                   │
                                       outcome settles ──► Data Autopsy ──► trust updates
                                                                                   │
   Data Health Cockpit watches all of the above and routes problems ◄─────────────┘
```

---

## 10. Implementation note

Prefer docs + typed contracts now. The immediate deliverable is
`apps/web/lib/gse/data-excellence.ts` expressing the shapes in §4 and the gate in §6 as pure
types/functions, joined to the existing rights registry by `source_id`. Do **not** propose
risky DB migrations in this workstream; the contracts can be validated in-memory and against
existing ingestion records first. The rights/clearance layer is already built and is the
source of truth for legality — this system layers integrity (freshness, contradiction,
confidence, autopsy) on top of it, and must never weaken or bypass it.

### Open questions (uncertain)

- DQS roll-up weights and band thresholds — require calibration against settled outcomes.
- Per-source `freshness_expectation_s` and `dependency_risk` — confirm against live behavior.
- `historical_accuracy` baselining — needs a minimum settled-sample size before any value.
- Whether `ManagerGenome`/`NarrativeSignal` inference quality is high enough to surface at
  all, or stays internal-only for now.

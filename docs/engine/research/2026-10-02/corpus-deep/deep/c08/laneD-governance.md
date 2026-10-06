# Lane D — Governance and Honesty Machinery

**Deep-research slice c08, Phase 2. Read-only verification against `~/workspace/vendor/Sports/docs/` (plus code files where wiring status is at issue).**

**Date:** 2026-10-02. Status labels: CONFIRMED / CORRECTED / UNVERIFIABLE. Inferences marked INFERENCE. Line citations are `file:line` against the vendor checkout.

**Pairs with:** `reasoning-depth-spec.md` §5 (the no-blind-spots checklist validator: five tracks × five verdicts + gate rules). This lane maps corpus honesty mechanisms onto those gate rules, and separates the gates that have teeth from the ones that are theater.

---

## 1. VERIFIED CLAIMS

### 1.1 Airwave 15-value `claim_type` enum — verbatim

- **Claim:** the Airwave operator runbook defines exactly 15 `claim_type` values.
  **Source:** `docs/ai/airwave/AIRWAVE_OPERATOR_RUNBOOK.md:78` — verbatim: `injury_read, availability_read, role_change, ranking_tier, dfs_value, waiver_note, matchup_note, depth_chart_note, usage_trend, market_signal, odds_context, coaching_note, weather_context, unfalsifiable_hot_take, narrative_only`.
  **Status: CONFIRMED** (exactly 15; matches the reader-31 brief).
- **Claim:** confidence is a three-level EMPHATIC / LEAN / HEDGED scale.
  **Source:** `AIRWAVE_OPERATOR_RUNBOOK.md:79` — verbatim: `` `confidence` — EMPHATIC, LEAN, or HEDGED ``.
  **Status: CONFIRMED.**
- **Claim:** UNFALSIFIABLE claims can never become pick evidence.
  **Source:** `AIRWAVE_OPERATOR_RUNBOOK.md:153` — verbatim: `` `UNFALSIFIABLE` claims → cannot produce `pick_evidence_candidate` ``; also the never-publish table at `:187` ("UNFALSIFIABLE claims as pick evidence | Hard rule in output map").
  **Status: CONFIRMED.** Note for the implementer: the enum value is lowercase `unfalsifiable_hot_take`; the gating prose is uppercase `UNFALSIFIABLE` — same concept, do not treat as separate fields.
- **Claim:** injury reads require official corroboration before becoming pick evidence.
  **Source:** `AIRWAVE_OPERATOR_RUNBOOK.md:154` — verbatim: `- Injury reads → require official corroboration before becoming pick evidence`; intake rule at `:130`: "For GSE use: corroborate injury/availability/role claims against an official source".
  **Status: CONFIRMED.**

### 1.2 No-bet governor reason codes

- **Claim:** the no-bet governor defines the five reason codes calibration_drift, model_disagreement, stale_market_context, missing_required_data, source_rights_blocked.
  **Source:** `docs/gse/NO_BET_GOVERNOR_METHODOLOGY.md:40–46`. The file defines **seven** codes, not five — verbatim:

  | code | state | meaning (condensed) |
  |---|---|---|
  | `missing_required_data` | HARD_PASS | required evidence field absent/unusable |
  | `stale_market_context` | HARD_PASS | market context older than freshness window |
  | `source_rights_blocked` | HARD_PASS | source unknown/blocked/not approved for the use |
  | `calibration_drift` | HARD_PASS | probability contract is drifting |
  | `calibration_debt` | PASS | model has not earned the public probability contract — "Confidence and probability stay separate" |
  | `model_disagreement` | WATCH | independent model votes diverge — "The disagreement has to be explained before action" |
  | `responsible_gaming` | HARD_PASS | responsible-gaming restraint overrides the signal |

  **Status: CORRECTED** — seven codes, not five. The two the shorthand drops (`calibration_debt`→PASS, `responsible_gaming`→HARD_PASS) matter: `calibration_debt` is exactly the live-class RED state (probability claims unearned; confidence ≠ probability), and it is the most engine-relevant of the seven. Code exists: `apps/web/lib/gse/no-bet-methodology.ts` (verified present); `computeGseActionScore()` "owns the shadow decision seam" (`:82`); each no-bet state reopens only when its blocker is repaired.
- **Claim:** the methodology governs public copy, not engine decisions.
  **Source:** `NO_BET_GOVERNOR_METHODOLOGY.md:5` — "Status: public-safe methodology examples, shadow-only"; reader-53 brief (verified against doc): "this is local methodology/copy governance only — it publishes no pick, opens no API route, places no wager."
  **Status: CONFIRMED.** This is the teeth-vs-theater boundary (see §2): the governor is a restraint *posture* plus shadow metrics, not an actuator on the decision to bet.

### 1.3 SHADOW_WOULD_REFUSE + signed receipts

- **Claim:** the compliance matrix records SHADOW_WOULD_REFUSE even when nothing is blocked, and every gated call gets an Ed25519-signed, publicly verifiable receipt backed by an append-only ledger.
  **Source:** `docs/governance/COMPLIANCE_MATRIX.md:30` — "Shadow metrics — `SHADOW_WOULD_REFUSE` tag recorded even when nothing is blocked | `governed.ts` (SHADOW branch)"; `:28` — "Signed, publicly verifiable receipt per gated call | `packages/governed/src/receipt-sign-ed25519.ts`, `GET /api/receipts/[id]`, `GET /.well-known/receipt-keys.json`"; `:29` — "Append-only control-event ledger | `apps/web/lib/ai-control-plane/event-ledger.ts`"; `:31` — key rotation/retirement/revocation (`rotate-keys.ts`, `keyring.ts`); `:32` — "Default-safe posture — SHADOW unless `SRQC_ENFORCE=1` explicitly set".
  **Status: CONFIRMED**, with the critical qualifier at `:32`: admit/refuse enforcement is opt-in; the default posture is observe-and-log ("Human oversight (no silent auto-block)"). The doc's own disclaimer is emphatic: the table is "explicitly NOT a legal opinion, audit finding, or claim of certification" (no NIST/ISO 42001/EU AI Act conformance claims anywhere). Do not cite this matrix as compliance evidence — the matrix itself forbids that.

### 1.4 Eligibility gates — Brier 0.275 / ECE 0.112 / Murphy RES 0.002 → RED

- **Claim:** live-class calibration numbers gate eligibility to RED.
  **Source:** `docs/ops/MASTER_PROMPT_V2.md:17` — verbatim: "Live class ~ Brier **0.275** / ECE **0.112** / Murphy RES **0.002** → **RED**. Ranking/independents raise RES; maps do not invent it. Conformal coverage ≠ eligibility."
  **Status: CONFIRMED for the numbers and the RED posture; CORRECTED on attribution.** These are the **live class** numbers — one measured class — not a per-class table across spread/total/moneyline classes. The per-class concept (market types as classes with separate gates) is real doctrine from the 1776 abstention lane (lane C territory), but this line is a single class's measured state. Do not present 0.275/0.112/0.002 as three gates; it is one class's Brier/ECE/RES triple with a RED verdict.
- **Claim:** RED has concrete operational meaning (not a color).
  **Source:** `MASTER_PROMPT_V2.md:11–14` — hard laws: (1) Gates OFF: `LIVE_BOARD` / `PUBLIC_PICKS` / `STATS_PUBLIC` / `PERFORMANCE_STATS`; (2) Maps OFF: `CALIBRATION_ADJUSTMENTS_ENABLED` / `AUTO_PUBLISH` — offline only; (4) "no invent odds/scores/ROI; no PROVEN while eligibility RED"; plus `:8` `RANKING_PAUSE_APPLY` default OFF (pause is advisory until founder enables), and the Calib lane at `:101`: "maps offline, conformal bridge, floors" / the forbidden flip "flip AUTO_PUBLISH", Content lane `:103`: "PROVEN while RED" is a forbidden outcome. Companion gate from reader-55 `NEXT_ENGINE_TASKS.md`: SELECTIVE_PUBLISH wired with flag OFF, pause list = sport|market with holdout Res < 0.005, calibration adjustments and auto-publish require GREEN×K first, "Do not productize CQR/ACI for PROVEN unlock."
  **Status: CONFIRMED.** RED = public surface dark, calibration maps quarantined offline, no PROVEN copy, publishing pause advisory-only. This is a teeth gate: it is enforced by env flags and law list, not by vibes.
- **Claim:** isotonic (and any monotone map) stays off until resolution improves.
  **Source:** `docs/ops/ISOTONIC_EXPLORATION.md` brief (verified): "Isotonic plateaus can destroy ranking if used for Kelly conviction while Res ≈ 0"; "Apply gate: keep OFF until Murphy resolution (Res) improves + holdout floors are met." `docs/ops/NEXT_ENGINE_TASKS.md`: "Do not productize CQR/ACI for PROVEN unlock."
  **Status: CONFIRMED.** Calibration method selection and sizing must be chosen jointly — a display-fine method can be staking-harmful.

### 1.5 "would_not_claim" contracts

- **Claim:** engine outputs carry an explicit `would_not_claim` list — things the model refuses to assert.
  **Source:** `docs/fable/demo/DEMO_REPRODUCTION.md:17` — the expected output shape includes `would_not_claim` alongside `fixture_id`, `probability_delta`, `uncertainty_flag`, `gse_flags`; validated by the evidence harness test (`apps/web -- lib/fable/evidence/evidence-harness.test.ts`). `docs/fable/demo/PUBLIC_DATA_FORENSIC_REPORT.md:29` shows it live on the fixture: `"would_not_claim": ["betting edge", "prediction superiority", "live market accuracy", "official tracking-data equivalence"]` with `probability_delta: 0.11` = abs(0.59 − 0.48).
  **Status: CONFIRMED.** Caveat: fixture-only demo (live mode defaults off, `GSE_FABLE_LIVE_PUBLIC_DEMO_ENABLED=false`). The `would_not_claim` is an output-shape contract validated by a test — real, but small (four items on a fixture). It is a pattern to copy, not a proven shield.

### 1.6 30+ settled-picks gate

- **Claim:** no win-rate claim without 30+ settled picks per model version.
  **Source:** `docs/intelligence/monetization-lanes.md:43` — verbatim: "**Constraints**: No win-rate claims without 30+ settled picks per model version." Also an approval gate at the same file's approval list: publishing win-rate/accuracy claims requires approval + the 30+ floor.
  **Status: CONFIRMED.** (Path correction vs the reader-54 brief header: the file lives at `docs/intelligence/monetization-lanes.md`, not `docs/` root.) This is the claim gate that governs any performance statement in a published pick output — pair it with the FABLE `would_not_claim` entries.

### 1.7 Quote-precedence ladder with divergence flags

- **Claim:** a six-tier merge-precedence ladder for free quote sources; earlier tier keeps the line on conflict; fresher later tiers emit a divergence flag, never an overwrite; non-book contributions are hard-walled out.
  **Source (code, not just doc):** `packages/quote-plane/src/precedence.ts:16–23` — verbatim:
  `export const FREE_QUOTE_PRECEDENCE = ["rundown", "sharp_x3", "odds_free", "parlay", "oddspapi", "apify"] as const;`
  `:26–27` — `TIER_B_ONLY = {"apify"}` ("Tier-B market-state only — never cited as provenance behind a published claim"); `:31–35` — `CITE_DISALLOWED = {apify, parlay}`; `:41–46` — `LIVE_GATE_UNCERTIFIABLE = {oddspapi, apify, parlay}` ("OddsPapi: Motif 2026-09-18 — secondary; legal read pending"). `packages/quote-plane/src/situation-snapshot.ts:80–86` — "Earlier tier always keeps the line on conflict... we emit `stale_higher_tier` — we never overwrite the earlier winner. Default 5 minutes" (freshness window); `:90–92` — `NON_BOOK_SOURCE_KINDS = {"model_prior", "synthetic_demo", "prediction_market"}` hard wall; `:186` — rejected contributions logged as `rejected_non_book:<tier>:<sourceId>:<reason>` skip flags, never entering winners/`sourcesUsed`. Test: `packages/quote-plane/src/__tests__/situation-snapshot-precedence.test.ts:407` ("substantially fresher later tier emits stale_higher_tier but does not overwrite").
  **Status: CONFIRMED — and this one is wired code with passing-shape tests, not doc-only.** The design pattern (ordered precedence + divergence flags + hard wall + skip-reason flags) is directly reusable for conflict resolution in the reasoning layer.

### 1.8 NOVA five-label draft-state vocabulary ("landed" retired)

- **Claim:** the NOVA convergence freeze retires the word "landed" and replaces it with five draft-state labels.
  **Source:** `docs/ai/phase0/NOVA_CONVERGENCE_FREEZE_HARDENING_ADDENDUM_2026-07-22.md:27–32` — verbatim: `IMPLEMENTED_ON_DRAFT_BRANCH` / `CI_GREEN_IN_ISOLATION` / `NOT_MERGED` / `NOT_CUMULATIVELY_VALIDATED` / `NOT_PRODUCTION_ACTIVE`; `:19–24`: the freeze's "landed by" phrasing is "operationally wrong and is hereby retired. **Nothing in this stack is landed.**" Plus the discipline line: "a model may interpret a future receipt, never manufacture it" (inventory/collision detection moved to deterministic tooling).
  **Status: CONFIRMED.** Adoptable as the honesty vocabulary for the reasoning layer's own build status — and for labeling any engine capability (e.g., "trust-signal intake: IMPLEMENTED_ON_DRAFT_BRANCH, NOT_PRODUCTION_ACTIVE").

### 1.9 JARVIS stub-mode honesty guard

- **Claim:** the memory protocol hard-types wiring state false and short-circuits to the not-wired posture in stub environments.
  **Source:** `docs/ai/jarvis/JARVIS_MEMORY_PROTOCOL.md:97–99` — `buildLiveMemoryStatus()` originally reported `wired: true` when COUNT queries resolved, but `@sports/db`'s stub client (active whenever `DATABASE_URL` is unset/sentinel — local dev, CI, most test runs) resolves every `count()` to 0 without touching a real DB, so the default/no-DB environment "silently claimed a wired, healthy memory store." It now checks `isStubMode()` first and short-circuits to the not-wired posture. Supporting doctrine: `memory.wired` hard-typed `false` until a real store exists; "any claim of remembered context before wiring 'would be fabrication'"; "absence of data is recorded as absence"; fabricated recall is a forbidden action.
  **Status: CONFIRMED.** This is the corpus's clearest specified-but-never-wired case *and* its clearest honesty discipline — see §2.2.

---

## 2. CHALLENGES — theater vs teeth

### 2.1 The no-bet governor is a posture, not an actuator

The seven reason codes are real, tested copy governance (`apps/web/lib/gse/no-bet-methodology.ts` exists; tests scan public strings through the media-claim/no-claim/performance-claim guards). But the doc's own status line is "public-safe methodology examples, shadow-only," and the shadow decision seam (`computeGseActionScore()`, `:82`) records what *would* be decided — it does not decide. Nothing in the slice shows the governor wired into the pick-generation path as an enforcing gate. Treat it as: (a) a public-copy contract (real teeth on what the site may say), (b) a design pattern for machine-readable refusal states (real teeth as a schema), (c) **not** an engine brake on bad bets (no evidence of wiring). If the reasoning layer adopts it, the adoption must wire `computeNoBetStrength()`-style pressure into the pipeline's actual decision path — otherwise it inherits the same shadow-only limitation.

### 2.2 Specified-but-never-wired: JARVIS episodic memory (canonical case)

The protocol is explicit that the capability does not exist: episodic store NOT_WIRED; `JARVIS_MEMORY_WRITE_ENABLED` defaults `"false"`; "as of 2026-07-17 nothing in production calls the autonomous path"; REMEMBER phase NOT_WIRED; registry promotion to DESIGNED pending owner action (production migration, real Postgres, owner-set flag, a real production caller). The honesty is exemplary — the doc refuses to let the system claim memory it doesn't have — but the lesson for the reasoning layer is the failure mode it names: **a beautifully specified capability with a default-off flag and no production caller is a doc, not a feature.** Every governance mechanism in §3 must ship with a production caller and an on-by-default posture, or it belongs in the same bucket. SELECTIVE_PUBLISH is the engine's live instance of this pattern (NEXT_ENGINE_TASKS: wire it with the flag OFF — infra built, dormant by design).

### 2.3 SRQC gating is enforcement opt-in

`SHADOW_WOULD_REFUSE` + signed receipts + append-only ledger is the strongest honesty machinery in the slice — and the default posture is SHADOW unless `SRQC_ENFORCE=1` is explicitly set (COMPLIANCE_MATRIX.md:32). "Human oversight (no silent auto-block)" is a design choice, but any claim that GSE's AI actions are currently gated is false in the default configuration. The adoptable part is the *recording* discipline (tag near-refusals, sign every verdict, append-only ledger), which works identically in shadow mode.

### 2.4 Airwave: schema adopted ≠ pipe connected

Airwave code and tests exist (`airwave-gse-gsn-output-map.test.ts`, `airwave-intake-api.test.ts`, `airwave-claim-batch-validator.test.ts`, etc.), the operator workflow is draft → review → approved, and the output-map gates (UNFALSIFIABLE block, injury corroboration, rights-status checks) are specified as code-level rules. What the slice does **not** establish is that approved claims are flowing into live pick evidence in production. Mark the intake as *specified and coded, production flow UNVERIFIABLE*. The map's finding 5 ("Maps directly onto the total-signal engine's still-empty player-signals intake") is a schema-adoption recommendation; the player-signals table is still empty, and adopting a 15-value enum does not fill it.

### 2.5 The FABLE contract is real but tiny

`would_not_claim` is validated by the evidence harness and demonstrated on a real fixture — but it is a four-item list on a fixture-only demo with live mode default-off. It is an output-shape pattern worth copying into every published pick; it is not evidence that any production output currently carries it.

---

## 3. BUILDABLE SYSTEMS

Everything below maps a corpus mechanism onto the reasoning-depth spec's §5 checklist validator and the L4 adversarial layer. Spec §5 recap: five tracks (`qb_behavior`, `coaching_scheme`, `offensive_line`, `trust_signals`, `scheme_matchup`), five verdicts (`CLEAR` / `NOTHING-MATERIAL` / `DATA-GAP` / `CONFLICT` / `UNCHECKED`), and the gate rules — any track `UNCHECKED` at L3+ invalidates the analysis; a load-bearing `DATA-GAP` forces the L4 adversary to assume the worst plausible value; 2+ `CONFLICT` tracks force L5; synthesis resolves conflicts with precedence **live-verified > computed > corpus > single-source > inference**.

### 3.1 The CHECKLIST VALIDATOR — per-track build rules

**Track 1 — `qb_behavior`.** Validator: starter + relevant backup profiles loaded; INT-by-situation, pressure splits, trust-target HHI, scramble triggers reviewed. Corpus mapping is the JARVIS absence doctrine: "absence of data is recorded as absence" — a missing profile yields `DATA-GAP`, never a silent league-average default. Worst-plausible rule for the adversary on a `DATA-GAP` QB track: assume league-average-or-worse under pressure and name the assumption. Any performance statement about the QB profile's accuracy is additionally gated by the 30+ settled-picks-per-model-version rule (§1.6).

**Track 2 — `coaching_scheme`.** Adopt the Airwave intake vessel wholesale: off-field coaching signals enter as `coaching_note` claims with `claim_type` + EMPHATIC/LEAN/HEDGED confidence + `rights_status` + review status (draft → review → approved). Verification mapping: corroborated by an official/second outlet → `CORPUS`-grade; single outlet → `SINGLE_SOURCE`; model-derived → `INFERENCE`. Admission follows the runbook's `reviewReady` predicate shape (all required fields non-empty; rights in owned/public/licensed; status review/approved) — the checklist's completeness check is the same kind of predicate applied to the trace. UNFALSIFIABLE coaching hot takes become `would_not_claim` entries, never evidence (§1.1, §1.5).

**Track 3 — `offensive_line`.** The TNF miss's exact information. Validator: unit health (injuries, practice participation), continuity, pressure-rate allowed vs expected, DL/OL matchup graded. Corpus mapping: the Airwave injury gate (official corroboration required before pick evidence, §1.1) becomes the track's verification rule — "CLE missing 2 interior OL starters" is either officially corroborated (→ `CORPUS`/live-verified, the track can go `CLEAR`) or single-source chatter (→ `SINGLE_SOURCE`, cannot be load-bearing at L4+ per spec §2.3; track goes `DATA-GAP` and the adversary assumes the worst plausible OL state). This is where the L3 chain's OL link gets its verification status stamped.

**Track 4 — `trust_signals`.** Adopt the 15-value `claim_type` enum as the track's intake schema (verbatim, §1.1). Per-track verdict rules: approved + corroborated claim material to the game → `CLEAR`; stream checked, nothing passes the evidence gates → `NOTHING-MATERIAL` (recorded, not silent — the checklist's "silence is not evidence" rule); no usable claims for a team → `DATA-GAP` (this is spec T2's exact case: the L4 adversary assumes the worst-plausible trust-signal value with the assumption recorded); contradictory claims (e.g., `availability_read` vs `injury_read` from different outlets) → `CONFLICT` → auto-escalate L4, resolve via the trust precedence ladder. Rights mapping: any claim with a non-approved `rights_status` triggers the no-bet governor's `source_rights_blocked` → HARD_PASS on that claim's admission — the same hard wall as the quote plane's `NON_BOOK_SOURCE_KINDS` (§1.7). The track's published output inherits `would_not_claim` entries for everything the signal stream does not support.

**Track 5 — `scheme_matchup`.** This track's native verdict is `CONFLICT`: OL-vs-DL strength vs scheme neutralization is exactly the "does the offense's structure neutralize the defense's strength?" question. Corpus mapping: resolve conflicts with the quote-precedence machinery pattern — an ordered precedence list, earlier/higher-trust entries keep the line, later entries emit divergence flags instead of overwriting (the `stale_higher_tier` pattern, §1.7), rejected entries logged with skip-reason flags (`rejected_non_book:…` pattern) rather than silently dropped. The spec's trust ordering (live-verified > computed > corpus > single-source > inference) is the ladder's content; the quote-plane code is the ladder's machinery. A scheme-matchup disagreement between the stat track and the scheme track is therefore a first-class `divergenceFlags` entry on the trace, auditable later.

**Gate-level validator (`validateChecklist`).** Returns `INVALID` naming the unchecked track — the runbook's `reviewReady` predicate is the template: a completeness predicate over required fields, not a judgment call. `UNCHECKED` is valid only below L3 (spec §6.3). Conflict escalation: one disagreeing track pair → the no-bet governor's `model_disagreement` → WATCH posture ("the disagreement has to be explained before action" — the counter-case review is the L4 adversary's steelman); two or more `CONFLICT` tracks → L5 required, which is one notch harder than the governor and is the correct hardening. Calibration posture: if a track's evidence depends on a drifting or debt-laden model, map to the governor's codes — `calibration_drift` → HARD_PASS on the track's probability contribution, `calibration_debt` → PASS posture ("confidence and probability stay separate"; the RED live class — Brier 0.275 / ECE 0.112 / RES 0.002 — means published output is `ANALYSIS-DRAFT`, never a public probability). Freshness: `stale_market_context` → HARD_PASS maps onto `DATA-GAP` for any track consuming quote data older than its freshness window (the quote plane's `freshnessWindowMs`, default 5 minutes, is the reference shape).

### 3.2 The adversarial layer (`adversaryReview`) — governed outputs

The spec's four mandatory adversary outputs (breaking-condition check, correlated-thesis detection, steelman counter-argument, pre-mortem) get their governance from the corpus:

1. **Shadow metrics on near-refusals.** Port the `SHADOW_WOULD_REFUSE` pattern into the adversary: log claims the adversary nearly killed and verdicts nearly refused into the trace ledger. Calibration reviews then see what was nearly suppressed, not just what published (COMPLIANCE_MATRIX §1.3).
2. **Signed receipts per verdict.** Every checklist verdict and every admit/refuse decision gets an Ed25519-signed, append-only receipt (the `governed.ts` / `receipt-sign-ed25519.ts` / `event-ledger.ts` pattern). The trace becomes a verifiable record; per the NOVA discipline, deterministic tooling manufactures receipts and the model only interprets them — never the reverse.
3. **`would_not_claim` as output contract.** The adversary's report includes `would_not_claim` entries; any published output inherits them. Sub-L5 output is labeled `ANALYSIS-DRAFT — not for publication` (spec §4) — the same function as the NOVA draft-state labels (§1.8): honest state language instead of "landed."
4. **Default-NO promotion.** Every promotion (analysis → published pick) requires explicit authorization; default is NO (the final-owner-decision-packet pattern: exact-phrase authorization, blast-radius ratings). Maps onto "L5 is the only level permitted to produce a public-facing pick" and the kill-line pre-registration gate (reader 63: refuses specs written after their runs).
5. **Machine-checkable breaking conditions with falsification rules.** Spec T1's `TTT > 2.6s or quick-game < 0.55` is the template; carry the FABLE evidence-harness pattern (falsification rule per claim/fixture) so every breaking condition is a predicate the pipeline can evaluate, not prose.
6. **Stub-mode honesty for the validator itself.** The JARVIS guard (§1.9) ports directly: `validateChecklist` must detect when a track's "data present" signal comes from a stub/fixture/mock and short-circuit to `DATA-GAP` — a validator that reports `CLEAR` on fixture data is the exact failure the `isStubMode()` check was built to prevent.

### 3.3 What "wired" means here (acceptance)

A §5 checklist gate is wired iff: (a) `validateChecklist` runs as a blocking step in the pipeline (not advisory), (b) verdicts are persisted in the trace with signed receipts, (c) near-refusals are logged as shadow metrics, (d) the production caller exists and the gate is on by default — no default-off flags, no "nothing in production calls the path." Anything short of that is documentation, and per the NOVA vocabulary it must be labeled as such (IMPLEMENTED_ON_DRAFT_BRANCH at best), never "landed."

---

## 4. INFLATION WATCH — overstated brief claims, plain language

1. **"Per-class eligibility gates (Brier 0.275 / ECE 0.112 / Murphy RES 0.002 → RED)."** The source gives these as the *live class* numbers — one measured class, not a per-class table. The per-class (spread/total/moneyline) concept is real but lives in the abstention lane, not in this line. Corrected in §1.4.
2. **"Maps directly onto the total-signal engine's still-empty player-signals intake."** It is a schema adoption, not a wire. The player-signals table is still empty; a 15-value enum does not fill it. And whether approved Airwave claims flow into live pick evidence in production is UNVERIFIABLE from the slice. Say "schema adopted, pipe unverified," not "intake wired."
3. **The no-bet governor brief's "parliament consensus before action."** The actual state is `model_disagreement` → WATCH, which requires the disagreement to be *explained*, not resolved by consensus. Explanation is weaker than consensus; do not promise the stronger thing.
4. **Any claim that GSE's AI actions are gated.** SRQC admit/refuse is enforcement opt-in (`SRQC_ENFORCE=1`); the default is SHADOW — observe and log. The matrix's own disclaimer forbids citing it as compliance evidence.
5. **FABLE's `would_not_claim` is real but tiny** — four items on a fixture demo with live mode off. A pattern to copy into every published pick; not a proven shield.
6. **The map's five-code shorthand for the governor drops the two most engine-relevant codes.** `calibration_debt` → PASS is exactly the live-class RED state ("the model has not earned the public probability contract"), and `responsible_gaming` → HARD_PASS is the only code that overrides signal on non-epistemic grounds. The seven-code table (§1.2) is the contract; use it whole.
7. **"Theater vs teeth" summary for the parent:** the teeth in this slice are the RED-flag laws (gates/maps OFF, no PROVEN copy), the quote-precedence ladder (wired code with tests), the 30+ settled-picks claim floor, and the output-map hard blocks *as specified*. The theater risk is everything shadow-only, default-off, or "specified with no production caller" — the no-bet governor as engine brake, SRQC as enforcement, Airwave as live intake, and JARVIS memory as a capability. The build rule from §3.3 applies: production caller + on-by-default + signed receipts, or it gets a NOVA draft-state label, never the word "landed."

---

*Lane D complete. Phase 1 briefs consumed: reader-31 (Airwave runbook, JARVIS memory protocol, NOVA addendum), reader-52 (FABLE demo/would_not_claim), reader-53 (no-bet governor, compliance matrix, owner decision packet), reader-54 (30+ settled-picks gate via monetization-lanes), reader-55 (eligibility gates via MASTER_PROMPT_V2, isotonic/NEXT_ENGINE_TASKS), reader-56 (quote-precedence ladder). Spec consumed: `reasoning-depth-spec.md` §§2–8, with §5 as the mapping target.*

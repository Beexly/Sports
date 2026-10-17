# Grok Bot Builder Handoff — GSE Engine Wiring, Night of 2026-10-02

**Repo:** `Beexly/Sports` @ `main` SHA `deda1d6182166917ceee26f3bd8a70d4f5a1435f` (verified via live API 2026-10-02; tree not truncated, 12,678 files).
**Source:** Two Grok Heavy research runs over the 5,102-file corpus on `Beexly/agent-bus@main` (`research/corpus-intelligence` 3,728 + `research/arxiv-sweep` 1,374). Every path below was verified against the live repo tree. Paths marked UNVERIFIED could not be confirmed — locate before use, do not guess.
**How to work:** One branch per item, PR per branch, tests green before review. Do all 6 in order; item 2 is BLOCKED until PR #1018 merges (see §3).

---

## §1. Global rules (violate one and the run is discarded)

From `AGENTS.md` THE LAWS (read the file at repo root before starting — it is the run contract, auto-loaded by builder agents):

1. **NEVER `git push` to `main`.** Work on branches named `grok/<item>-2026-10-02` (e.g. `grok/conformal-gate-2026-10-02`). Open a PR per branch. Do not merge your own PRs.
2. **NEVER modify:** `packages/db/prisma/schema.prisma`, `packages/db/prisma/migrations/**`, `.github/workflows/**`, `scripts/guardrails/**`, `.claude/**`, any `.env*`, `package-lock.json`, `.gitignore`, `.githooks/**`, `apps/web/lib/ai-control-plane/**`.
3. **NEVER flip a gate or env flag** (`PUBLIC_PICKS`, `STATS_PUBLIC`, `LIVE_BOARD`, `PERFORMANCE_STATS`, or any other). New code must run in shadow by default — nothing you build may change what the public site shows.
4. **NEVER touch `gse-grok-build-sandbox`.** It is isolated by design.
5. **`intelligence/trust/abstention.py` — EXTEND, never overwrite.** Add new functions/modules; do not modify existing ones.
6. **Doctrine lives in `docs/DOCTRINES.md`, not `AGENTS.md`.** Do not edit `AGENTS.md` unless adding a dated run note in the designated log section.
7. **Neon: no testing on the default branch.** Writers, migrations, and backfills run on throwaway copy-on-write branches only.
8. **Public/private surface:** the public site shows ONLY projections and rankings. All methodology, signals, metrics, and internals stay private. Your code must not leak signal names, weights, or methodology into any public-facing output.
9. **Honesty convention:** every module carries a PROVENANCE header citing its research source. If a test runs on synthetic data, label it `DATA BASIS` exactly the way `intelligence/trust/calibration.py` and `intelligence/trust/abstention.py` do (seeded, labeled, never presented as real games).
10. **No force-push.** Ever.

---

## §2. Test commands (verify before you start)

- Python (`intelligence/`): `intelligence/pytest.ini` exists — run `python -m pytest` from `intelligence/`. New modules need unit tests beside them, following the existing `tests/` layout (e.g. `intelligence/trust/tests/test_trust.py`).
- TypeScript: vitest (`vitest.config.ts` at package roots). Run the affected package's suite.
- A signal leaving shadow must pass the admission battery: (1) shuffled-time placebo, (2) market/model logit-pool with nonzero model contribution, (3) disjoint threshold tuning with lower edge bound clearing vig, (4) market line held as a fixed offset. These are measurement gates, not stop orders — run them and report the numbers.

---

## §3. No-collision map (open PRs — do not duplicate their lanes)

| PR | State | Branch | Files it owns — DO NOT TOUCH |
|---|---|---|---|
| #1016 trueProb quarantine | **MERGED** 2026-10-03 | `feat/trueprob-basis` | On main now. No action needed. |
| #1018 OL deadline + GSIS | **OPEN** | `feat/ol-deadline-gsis` | `intelligence/coaching/ol_provider.py`, `intelligence/integration/api.py`, `intelligence/qb-behavior/src/qb_behavior/identity.py`, `intelligence/qb-behavior/src/qb_behavior/situational/provider.py`, `intelligence/reasoning_engine/publish_gate.py` (new), `intelligence/reasoning_engine/run_game.py`, `intelligence/reasoning_engine/test_publish_gate.py` |
| #1019 DARK evaluators | **OPEN** | `feat/dark-starved-evaluators` | `packages/ingestion-pipeline/src/signal-registry-extensions.ts`, `packages/prediction-engine/src/evidence-readiness-matrix.ts`, `packages/types/src/index.ts` (all TypeScript) |
| #860 edge-rank | **OPEN** | `gse/cat-c5-c1-offline-helpers` | `apps/web/lib/picks/edge-rank.ts`, `apps/web/lib/calibration/offline-generative-bakeoff.ts`, `apps/web/app/api/v1/signals/route.ts` (all TypeScript) |

**Item 2 is BLOCKED on #1018** — it owns the OL provider and QB identity. Do not start item 2 until #1018 is merged; rebase your branch onto the merge commit when it lands.
**Item 1 note:** #1018's `publish_gate.py` is a *reasoning-trace* gate (env-flag `PUBLISH_REASONING_TRACE`), not a probability publish gate. Item 1 does not collide with it — but do not create a second competing gate module; item 1 extends `intelligence/trust/abstention.py` only.

---

## ITEM 1 — Selective publication gate (conformal risk control vs the de-vigged close)

**What:** Abstain from publishing a pick when the engine's probability does not beat the de-vigged closing line by more than a threshold λ tuned on a disjoint fold. Build the gate, not a new calibrator.

**Read first:**
- `intelligence/trust/abstention.py` — the existing NNTD selective-classification gate. Note its acceptance gate in the header: *"abstention cuts realized Brier on the published set by >= 0.005 with <= 20% coverage loss."* Your gate must meet the same bar.
- `intelligence/trust/calibration.py` — the production calibration chain (Temperature → Platt → Isotonic → EB-tau) and its DATA BASIS honesty convention for synthetic cohorts.
- `intelligence/reasoning_engine/mint_gate.py` — fail-closed mint gate; your gate composes downstream of it.
- `packages/prediction-engine/src/shin-devig.ts` and `packages/prediction-engine/src/edge-lab/devig.ts` — de-vig implementations for the close.
- `packages/ingestion-pipeline/src/build-independent-fair-values.ts` — the production publish path; find where engine probability and market price meet (search `trueProb`, `homeFairProb`).

**Create:** `intelligence/trust/conformal_gate.py` (NEW file — do not modify `abstention.py`'s existing functions).
- `fit_lambda(engine_p, close_p, outcomes, alpha)` — conformal-risk-control threshold on *posted-pick* Brier. λ fit on 2022–2023 seasons ONLY.
- `publish_decision(engine_p, close_p, lambda_hat)` — returns `publish` / `shadow` plus the margin. No path returns a substituted probability.
- PROVENANCE header citing arXiv:2208.02814 (Conformal Risk Control — learn the method, do not copy code; arXiv non-exclusive license) and the corpus finding (c05-map ledger 0743; market baseline Brier 0.2106 / ECE 0.0126 on 5,281 games 2006–2025).

**Implementation steps:**
1. Port the CRC selection rule: choose λ̂ minimizing posted-set Brier subject to coverage ≥ 80% (mirror `calibrate_threshold_to_target_error`'s quantile-scan structure in `abstention.py`).
2. De-vig the close multiplicatively (use `shin-devig.ts` logic or port it; do not invent a new de-vig).
3. Wire the gate as a pure function over `(engine_p, close_p)` rows — no DB, no network, mirroring `signal-staleness.ts`'s "returns blockers, caller decides" separation.

**Test (from the research experiment — run exactly this):**
- Data in: sealed game rows with mint-time engine p and multiplicative de-vig close. Locate sealed data via `eval/edge-lab/sealed-split.mjs` and `intelligence/reasoning_engine/traces/`. If real sealed rows are insufficient, unit-test on a seeded synthetic cohort LABELED as synthetic per the `calibration.py` DATA BASIS convention.
- λ fit on 2022–2023 only. Evaluate on 2024–2025.
- **Pass bar:** posted set beats the close on log loss AND a shuffled-week placebo does NOT pass AND abstention fraction ≤ 20% AND realized Brier cut ≥ 0.005 (the `abstention.py` acceptance gate).
- **Fail:** posted set no better than the close → kill the gate, do not tune further.

**Do NOT touch:** `intelligence/reasoning_engine/publish_gate.py` (#1018's lane), `bridge-model.ts` (do not rebuild), any gate/env flag.
**Status:** SHADOW. The close is already calibrated (ECE 0.0126); publishing engine probs that don't clear it repeats the bridge-model miss.

**Definition of done:** `conformal_gate.py` + unit tests green; backtest report with posted-vs-close log loss on 2024–2025, placebo result, abstention fraction; PROVENANCE header; PR opened.

---

## ITEM 2 — QB pressure-to-sack residual, <2.5s split ⛔ BLOCKED ON #1018

**What:** Sack rate under quick pressure (<2.5s) as a QB trait, residualized on team pressure — a game-probability signal, NEVER a sack prop.

**Read first (after #1018 merges):**
- `intelligence/qb-behavior/data/qb_weekly.csv` — columns include `p2s_eb` (pressure-to-sack empirical-Bayes), `n_clean`, `n_press`, `epa_clean`, `epa_press`. This is your base table.
- `intelligence/qb-behavior/build/build_protection_stress.py` — existing pressure infrastructure (pfr_advstats + pbp). Read its guards; your residual must not double-count it.
- `intelligence/qb/props.py` — **read the `IndividualSackPropVeto`.** It hard-vetoes individual-player sack props because team-level pressure→sack R² < 0.005. Your work is a QB residual inside the *game* model, not a prop. If any code path could price a sack prop from your residual, you have violated the veto — design so it cannot.
- `apps/web/lib/nflverse/pressure-coverage.ts` — PFR advstats `pressurePct`/`sacks` per QB (CC-BY-4.0, attribute).
- `docs/data-sources/research/2026-09-18/ftn/charting/` — FTN charting parquets 2022–2025 (CC-BY-SA 4.0); the `is_qb_fault_sack` column is the caused-pressure split. Verify the column exists in the parquet before building on it.
- The merged #1018 (`intelligence/coaching/ol_provider.py`, `intelligence/qb-behavior/src/qb_behavior/situational/provider.py`) — your residual sits ON TOP of its OL deadline/GSI work, not beside it.

**Create:** `intelligence/qb-behavior/build/build_qb_pressure_residual.py` (NEW).
- Inputs: per-QB quick-pressure rate (<2.5s), team pressure rate, time-to-throw controls.
- Output: QB residual = (QB pressure-to-sack) − E[·|team pressure, scheme]; prior-season shrinkage; NULL when sample < guard threshold (follow `build_protection_stress.py`'s guard style).
- League baseline ~18% (corroborated: Trapsheet 2024 qualifier pool 18.69%).

**Implementation steps:**
1. Join `qb_weekly.csv` pressure columns to FTN `is_qb_fault_sack` (or pfr_advstats if FTN column absent — record which source in PROVENANCE).
2. Residualize on team pressure + time-to-throw; never emit a team-level sack feature (the c02 veto stands at team level).
3. Emit as a signal-registry candidate (see item 6's registry paths), default DARK/shadow.

**Test (from the research experiment):**
- Data in: nflverse dropbacks + quick-pressure, prior-season shrink, 2024–2025 holdout.
- **Pass bar:** log-loss lift beyond the close AND beyond team pressure on a disjoint fold; shuffled `passer_player_id` placebo fails.
- **Fail:** no lift → kill. Do not ship a team sack feature under any circumstance.

**Do NOT touch:** any file in #1018's list until it merges; `intelligence/qb/props.py`'s veto (read it, obey it); no sack-prop code paths.
**Status:** SHADOW, and BLOCKED until #1018 merges.

**Definition of done:** residual builder + tests green; holdout report with lift-vs-close and lift-vs-team-pressure numbers; veto-compliance note in PROVENANCE; PR opened after #1018's merge commit.

---

## ITEM 3 — Per-QB EPA/dropback re-run (passer_player_id, snap-share anti-leakage)

**What:** Replace team passing EPA with the actual passer's EPA per dropback, keyed by `passer_player_id`, snap-share weighted, prior-season shrunk — then re-run the claimed delta or kill it.

**Read first:**
- `intelligence/qb-behavior/src/qb_behavior/` — the ProfileEngine and existing QB tables (`qb_weekly.csv` has `db`, `epa` per QB-week).
- `packages/data-ingestion/src/nflverse/` — `ingest.ts`, `joins.ts`, `rows.ts`: how pbp is ingested and joined. Your builder reads nflverse pbp 2016–2025.
- `intelligence/ratings/qb_decomp.py` — existing QB decomposition; compose, don't duplicate.

**Create:** `intelligence/qb-behavior/build/build_qb_epa_dropback.py` (NEW).
- Group pbp by `passer_player_id`; EPA per dropback; snap-share weights; prior-season shrinkage toward league mean.
- Output: QB EPA/dropback residual vs team passing EPA, as-of fenced (no future leakage — the anti-leakage key IS the claim).

**Implementation steps:**
1. Build the per-QB series with strict as-of fencing (a QB's week-N value uses only weeks < N).
2. Compute the residual against team passing EPA.
3. Walk-forward evaluation 2016–2025, test window 2024–2025.

**Test (from the research experiment — the cited delta is UNVERIFIED, this is a re-run-or-kill):**
- **Pass bar:** ≥ 0.005 log-loss gain versus team-EPA baseline on 2024–2025 AND a gain versus the close. (Cited claim was 0.633 → 0.625 log loss, 0.690 → 0.700 AUC from an unopened handoff doc — treat as rumor until re-measured.)
- **Fail:** gain vanishes → KILL the item and record the negative result in the PR. A killed claim is a correct output.

**Do NOT touch:** `trueProb` paths (#1016 is merged — do not regress its quarantine); #860's edge-rank bake-off.
**Status:** SHADOW until the re-run passes.

**Definition of done:** builder + tests green; walk-forward report with the exact delta vs team EPA and vs close; PROVENANCE header; PR opened (with kill report if it fails).

---

## ITEM 4 — Absence-conditional target-share props stack

**What:** Dirichlet share-core for target shares (mean E[N]·s_i) + absence-conditional TPRR + receiver-conditional TD via Σ P(TD|target)·P(target). Teammate absence is a state from the inactive list — never update the player's baseline share on absence.

**Read first:**
- `docs/data/CARDS_SHARE_CORE_WIRING.md` — the share-core spec.
- `intelligence/qb-behavior/src/qb_behavior/trust_target.py` and `intelligence/qb-behavior/build/build_trust_targets.py` — existing trust-target infrastructure; extend it.
- `intelligence/qb/props.py` — the prop-pricing module; your stack composes with it (INT pricing lives here; target-share is the new piece).
- `intelligence/providers/injury_gate.py` — the Friday-18:00-ET injury publication rule; absence states must respect it (no pulling unpublished injury data).

**Create:** `intelligence/qb-behavior/src/qb_behavior/absence_shares.py` (NEW).
- `fit_share_core(targets, routes)` — masked Dirichlet-multinomial + Beta-Binomial mixture, closed form E[N]·s_i.
- `absence_conditional_tprr(player, inactive_list)` — TPRR recomputed conditional on teammate absence; baseline share frozen.
- `td_decomposition(target_probs, td_given_target)` — Σ P(TD|target)·P(target).

**Implementation steps:**
1. Build the share-core on historical target/route data.
2. Encode absence as a state vector from the official inactive list (respect `injury_gate.py`'s publication rule).
3. Output share vector + P(TD) per receiver.

**Test (from the research experiment):**
- Data in: 2023–2025 anytime-TD and receptions.
- **Pass bar:** ≥ 5% holdout log-loss drop versus the marginal rate (the gate already in the research), AND no drop when absence is shuffled (placebo).
- **Fail:** the spike doesn't replicate → kill.

**Do NOT touch:** `intelligence/qb/props.py`'s `IndividualSackPropVeto` and INT pricing (compose, don't alter); injury pull timing.
**Status:** SHADOW. Registry says props are the unwired frontier — nothing here publishes.

**Definition of done:** module + tests green; holdout report (log-loss drop, shuffle-absence placebo); PROVENANCE header citing CARDS_SHARE_CORE_WIRING.md; PR opened.

---

## ITEM 5 — Injury/QB-change provenance column on the staleness gate

**What:** A provenance column (starter id + as-of timestamp) so a published pick cannot outlive a QB change — fail-closed.

**Read first:**
- `packages/ingestion-pipeline/src/signal-staleness.ts` — the staleness gate (pure predicate over row fields; "returns blockers, caller decides"). Your provenance field is a new row field it can read. Note its design commitments: FAIL CLOSED ON UNKNOWN.
- `intelligence/providers/injury_gate.py` — Friday 18:00 ET publication rule.
- `intelligence/qb-behavior/src/qb_behavior/situational/provider.py` — the SituationalQBProvider (note: #1018 touches this file — it is OPEN. Read it, do not modify it until #1018 merges).
- Locate the `isPublished` stamping call-site via the staleness gate's callers — path UNVERIFIED; search `signal-staleness` imports in `packages/ingestion-pipeline/src/`.

**Modify:** the pick-row type + staleness gate (minimal diff):
- Add `qbProvenance: { starterId: string; asOf: string } | null` to the row (exact field location TBD by the builder — record it in the PR).
- Extend the gate: if `starterId` at publish time ≠ `starterId` at mint time (or `asOf` predates the latest depth-chart scrape), return a blocker. Fail closed on unknown.

**Implementation steps:**
1. Find the row type and `isPublished` stamping site (UNVERIFIED — locate first).
2. Add the provenance field, populated at mint time from the QB provider.
3. Add the gate predicate; wire the caller to withhold on blocker (caller decides, per the gate's design).

**Test (from the research experiment):**
- Replay historical starter-change weeks (the 2026-09-28 Bears case in the gate's header comment is the canonical example).
- **Pass bar:** the published pick flips or shadows inside the inactive window; `isPublished` can never survive a QB change.
- **Fail:** any replay where a stale-starter pick publishes → fix, don't ship.

**Do NOT touch:** `intelligence/qb-behavior/src/qb_behavior/situational/provider.py` until #1018 merges (read-only); injury pull timing; any gate flag.
**Status:** SHADOW as a gate; publish-ready as a constraint once the replay passes (it withholds, it never mints a probability).

**Definition of done:** field + gate + tests green; replay report on historical QB-change weeks; PR opened.

---

## ITEM 6 — Within-player scale-fit weight constraint

**What:** A weighting constraint in the signal registry: normalize each signal key to −1..1 and forbid ranking a weight on between-player correlation alone. Shuffle-player-identity leakage test.

**Read first:**
- `intelligence/signals/registry.json` — top-level keys `provenance`, `signals`. Each entry carries `id`, `family`, `producer`, `source_data`, `wired.verdict`. Your constraint is a new registry-level rule, not a per-signal edit.
- `packages/prediction-engine/src/reasoning/signal-registry.ts` — the TS registry; check how weights are consumed (test file: `signal-registry.test.ts`).
- `packages/ingestion-pipeline/src/signal-registry-definitions.ts` — signal definitions (note: #1019 touches `signal-registry-extensions.ts`, NOT this file — no collision, but do not touch the extensions file).

**Create:** `intelligence/signals/scale_fit.py` (NEW) + a registry schema note.
- `normalize_key(values)` — scale to [−1, 1].
- `within_player_weight(signal_id, player_groups)` — weight computed on within-player correlation; refuses (raises) when only between-player r is supplied.
- `shuffle_identity_test(weights_fn, player_labels)` — leakage test: shuffle player identity; weights that survive unchanged are flagged as leakage.

**Implementation steps:**
1. Implement the normalizer + within-player weighting as pure functions.
2. Add the constraint to the registry's weighting path (Python side first; TS registry is #1019-adjacent — do not modify TS files).
3. Run the shuffle test against existing registry weights and report which current weights look like between-player artifacts (report only — do not retune them; #860 owns the edge-rank bake-off).

**Test:**
- **Pass bar:** `target_share`-family signals outrank raw team passing EPA on within-player log loss; shuffle test flags known-leaky weights.
- Unit tests green alongside `intelligence/trust/tests/test_trust.py` conventions.

**Do NOT touch:** `packages/ingestion-pipeline/src/signal-registry-extensions.ts` (#1019's lane); #860's bake-off; any existing weight values (report, don't retune).
**Status:** SHADOW as a method; publish-ready as a constraint.

**Definition of done:** module + tests green; shuffle-test report on current registry weights; PROVENANCE header; PR opened.

---

## §4. Work order and final checklist

1. Item 1 (conformal gate) — no blockers, highest value.
2. Item 3 (QB EPA re-run) — no blockers; may kill itself quickly, which is fine.
3. Item 4 (props stack) — no blockers, open frontier.
4. Item 5 (provenance gate) — read-only on #1018's files until it merges.
5. Item 6 (scale-fit) — no blockers.
6. Item 2 (pressure residual) — ⛔ BLOCKED on #1018. Start only after its merge commit; rebase first.

**Per-PR checklist (paste into each PR body):**
- [ ] Branch is `grok/<item>-2026-10-02`, based on current `main`
- [ ] No files from §3's no-collision table touched
- [ ] No `.github/workflows`, gate flags, or LAW-2 paths touched
- [ ] PROVENANCE header on every new module
- [ ] Synthetic test data labeled per the `calibration.py` DATA BASIS convention
- [ ] Python: `pytest` green in `intelligence/`; TS: package vitest suite green
- [ ] Admission battery run where applicable (placebo / market duel / disjoint fold); numbers in the PR body
- [ ] Shadow by default — nothing in this PR changes public output
- [ ] Killed claims recorded as negative results, not silently dropped

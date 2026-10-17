# TASK-016 v3 — CONSOLIDATED MISSION FOR HERMES — 2026-10-02 ~13:00 CT

Everything from the past 6 hours, in one ordered mission. This replaces the wire prompt, the training mission, and TASK-016 v2. If it is not in this document, it is not this session's work.

**You are Hermes, the coding agent on Machine A (Beexly Windows), currently running on grok-4.7. Motif coordinates from Machine B. The Grok reasoning layer adjudicates. The branch is the only truth.**

Reference (full context, on the bus `inbox/from-motif/`):
- `GSE-MASTER-INVENTORY-2026-10-02.md` (§1–§8: coverage ledger, field report, artifact extraction, dual sweeps, 44-finding audit, wire reconciliation)
- `WIRE-PACKAGE-2026-10-02.md` (original 3-priority wire prompt + full inventory)
- `TRAINING-MISSION-2026-10-02.md` (train-now directive)
- `inbox/from-grok/gse-wire-package-2026-10-02.md` (20 wires with file paths)

---

## ALREADY DONE — do not redo, verify only (Phase 12)

- Seed CSVs in-repo at `intelligence/coaching/data/` (`fceb123`); `test_coaching.py` exit 0, 1e-6 pins intact.
- OL provider built (`a704d0ca5`); PIT@CLE trace shows `offensive_line` CLEAR.
- Registry file landed at `intelligence/signals/registry.json` (`1fce7fb4c`): 47 signals, labeled SURVEY of `cc151ddd3`, all `wired_state` null.
- homeSign wired on `nfl_age_conditioned_rest` (`e28e4b80`): tilt tests pass with it, fail without; empty inputs → null; published pick still static (live slate passes `process.env`, keys have no writer — separate problem, not this session).
- PIT@CLE Week 4 trace committed (`c530d0409`): 237 plays, Pass EPA +11.91, Rush EPA −21.279, 3 TO −16.008 EPA; `analyze()` → INVALID; `qb_behavior` + `coaching_scheme` DATA-GAP.
- Training data on branch (`0170769`): 2022–2025 PBP complete (weeks 1–22, 284–285 games); 2026 has weeks 1–3 only (48 games).
- PR #1002 mapped (read-only): 16 conflict paths, 5 doctrine reversals. Stays unmerged.
- Doctrines 1/7 (refusal rules at `71e6fd9a2`); weather priors + public skill (`c72a46c7f`).

---

## STEP 0 — measured on your host, not copied

Report: hostname, HEAD SHA, disk, timestamp. Then `git log --oneline -12` on the branch — paste it. Every SHA in this mission rots within the hour; your HEAD is the truth.

---

## PHASE 0 — 2026 vintage refresh + freeze

Refresh `play_by_play_2026.parquet` through the current week. Freeze with SHA-256 hashes. Commit the manifest.

**Scope correction (Grok 4.7, accepted):** the frozen vintage gates the **live-check leg only**. It does NOT gate training or validation. 2022–2025 + 2026 W1–3 are committed and reproducible offline today.

---

## PHASE 1 — stamp tau everywhere (today, zero-tolerance)

The served `tau_hat.csv` pools in-season 2026 weeks — a walk-forward violation. Stamp every consumer surface: CSV header, `tau_hat.manifest.json`, the DataContext loader, the trace emit.

Stamp text: `point fit — not pre-kickoff. 2026 unit cells pool in-season weeks.`

The stamp comes off when the walk-forward number is the served number. Not before.

---

## PHASE 2 — Tier 0 wires (mission prerequisites, in order)

**Wire 9 — tau → DataContext.** New: `intelligence/context/tau_wire.py`. Load `tau_hat.csv` via manifest; add to `DataContext.observations`; carry the STAMP constant. Wire `_build_data_context` → observations → EdgeInput. Test: a pick changes when tau is included. (§7 UNDER-LEVERAGED #1)

**Wire 5 — held-out checker.** New: `intelligence/gates/heldout_check.py`. Reads a manifest, verifies `train_years ∩ eval_years = ∅`. Contaminated fits are discarded, never averaged. Reference: the 13.5pp discard. Walk-forward validation is unverifiable without this — it gates Phase 3.

**Wire 4 — manifest enforcer.** New: `intelligence/gates/manifest_check.py`. Every committed data file needs a sibling manifest with the 10 required fields. This permanently closes the 2-byte stub JSON problem. Pre-commit hook — NOT `.github/workflows` (forbidden on this branch).

---

## PHASE 3 — walk-forward tau rebuild (unblocked TODAY)

Garrett's directive: we do not wait for the season. The data is here.

| Step | Scope | Gate |
|---|---|---|
| Train walk-forward tau | 2022, 2023, 2024 — all weeks | None — run today |
| Validate | 2025 — all weeks | Wire 5 held-out gate |
| Live-check | 2026 W1–3 (48 games, committed) | None — data exists |
| Refresh → W4+ | weekly | Calendar only |
| Swap served table iff validate + live-check clear | — | Held-out pass |

- If the W1–3 live-check abstention rate is above base rate → fit not ready → report **BLOCKED-ON-PRECISION**. Do not blend with the pooled fit. Do not average. Law 4.
- If it clears → swap the served table tonight. The stamp comes off when the walk-forward number is served.
- The W4+ refresh extends the live-check weekly. It does not invalidate the fit.

---

## PHASE 4 — Tier 1 wires (the "done" gate)

**Wire 3 — claim-matrix.** New: `intelligence/gates/claim_matrix.py` + `claim_matrix.json`. Six stages: research → claim → code → invocation → test → real_data. Any stage missing → BLOCKED, not "partial." Seed with the 3 muse.ai kernels (market-strength→prop priors, EPA/WPA facet decomposition, shell-mix receiver opportunity — all BLOCKED by design) + `tau_hat_fourth_down` (verify passes). (§7 M-8)

**Wire 1 — abstention extend.** FIRST: `git show 71e6fd9a2 -- intelligence/trust/abstention.py`. Hermes recorded refusal rules there — read what changed. Then EXTEND `intelligence/trust/abstention.py`: add `to_trace_row()` emitting REFUSALS + `validate_abstention_in_trace`. Do not overwrite. Do not replace.

---

## PHASE 5 — registry: flip all 47 entries

`intelligence/signals/registry.json` — every entry gets `wired_state`: `yes` / `partial` / `no` from code inspection. **Zero nulls.** Each `no` carries `_blocked_reason`. The SURVEY provenance stays until the file is regenerated from HEAD — do not relabel it in place.

Verify homeSign: tilt tests pass with / fail without, empty inputs → null, published pick static. If all three hold, mark closed.

---

## PHASE 6 — Tier 2 wires (QC protocol)

**Wire 6 — paired-audit.** New: `intelligence/audit/paired.py`. Two findings files → one reconciliation. Contradictions surfaced, never silently resolved.

**Wire 2 — enbpi.** New: `intelligence/trust/enbpi.py`. Consumes `intelligence/discovery/t10-conformal/intervals.json`; emits trust score in [0,1]; refuses to score when conformal is absent (returns UNCHECKED abstention, not 0.5).

**Wire 7 — taxonomy check.** New: `scripts/check_taxonomy.py`, invoked from `.pre-commit-config.yaml` (not a workflow file). Every data-source PR declares: Free rows / Open schema / Key required / Private mechanics.

---

## PHASE 7 — calibration-on-wire (the central rule)

**A wired signal without a calibration row is not wired. It is a fixture wearing a producer's coat.**

Every signal wired this session gets its calibration row at wire time: train years | eval years | metric | n | 2026 W1–3 live-check | vintage manifest SHA. No batching to season's end.

**Refusal calibration:** the engine returned INVALID on its first real game. Calibrate every refusal threshold on history: given the refusal condition's historical frequency, what is the expected hit rate of the picks the engine would have made without refusing? At or below base rate → refusal calibrated. Above → the threshold is losing money and moves. A refusal never validated against history is an intuition, not a refusal.

---

## PHASE 8 — Tier 3: six remaining doctrines

`doctrine/`: paired-audit, manifest-provenance, held-out-discipline, two-host-rule, epistemic-discipline, evidence-taxonomy. (honest-refusal done at `71e6fd9a2`.) Index via `docs/DOCTRINES.md` — NOT `AGENTS.md` (trust-gate false-positives on that file).

---

## PHASE 9 — Tier 4: reconciliation artifacts

**Wire 12 — two-host ledger.** `intelligence/host_ledger.json` + `doctrine/two-host-rule.md`. One entry per host per search: hostname, path, date, tree SHA, scope. Machine A and Machine B have different workspaces — a search on one never establishes absence on the other.

**Wire 14 — muse extraction.** Source: `inbox/from-motif/nfl-analytics-reverse-engineering.md` (1,449,267 bytes, confirmed on bus). Extract: report.md, catalog.md, 170 CSVs, 14 digests, 2,204-file manifest, 3 kernel tickets → `docs/research/2026-10-02/muse-ai/`.

**Wire 10 — trace rebuild.** Rebuild moneyline.json, spread.json, total.json from Kalshi + ESPN + pbp. **Do not relabel without rebuilding.**

**Wire 16 — injury gate.** New: `intelligence/providers/injury_gate.py`. `require_injury_published(week)` → `DataGapError` before Friday 18:00 ET. (The empty Week-5 pull cost 5 credits.)

---

## PHASE 10 — Wire 18: P1 fixes

Five findings, each reported as file:line:fix —
`target_hhi` 0.0 false-diversification · swallowed `DataGapError` · missing evidence reading as CLEAR · tau not in reasoning context (subsumed by Wire 9 — note it, don't double-build) · `pipeline.py` L1/L2/L3 divergence.

---

## PHASE 11 — training mission targets

- **EPA facet kernel (Phase H):** backtest the EPA/WPA facet decomposition on 2022–2025. Outcome is binary: stable and predictive → wire it; descriptive only → document and do not wire. Descriptive-only is a valid outcome, not a failure.
- **Per-signal calibration rows** for everything wired in Phases 2/4/5.
- **OL backtest** where nflverse history allows + 2026 W1–4 live-check.

---

## PHASE 12 — verifications (in-flight: confirm or downgrade)

- **Wire 8 (OL provider, `a704d0ca5`):** `get_ol_state` raises `DataGapError` on unpublished weeks; called from `analyze()`; T1 e2e no longer INVALID on OL.
- **Wire 17 (parquet pins, `1fce7fb4c`):** all 4 SHA-256 values filled, not `<pin on first fetch>`.
- **Doctrines:** 6 remaining owed.
- **Weather (`c72a46c7f`):** priors wired, weights unset. Weights stay unset per total-signal backlog.
- **Skill (`c72a46c7f`):** public surface only — `/api/projections`, `/api/picks`, `/api/founder-picks`, `/api/proof`, `/api/receipts`, `/api/calibration`. Zero internal exposure.

---

## PHASE 13 — Phase D: close one

- HF hardware: re-query once, update PROGRESS.md. (2 minutes.)
- Hermes second wave: you are Hermes. Write `docs/research/2026-10-02/hermes-second-wave.md` naming what you built last night. If it's on the phone, say so and mark UNKNOWN.

---

## CONSTRAINTS (carry forward — violations stop the session)

- No `.github/workflows/*.yml` on this branch. CI checks live in `scripts/`.
- Extend `trust/abstention.py`; never overwrite it.
- No `AGENTS.md` edits — doctrines route through `docs/DOCTRINES.md`.
- No stuffing homeSign through an env key. Unknown direction → `homeSign: null`, gate DISABLED.
- No relabeling fixture traces without rebuilding from Kalshi/ESPN.
- ERA5 is reanalysis, not freeze-time. Freeze-time is what the model sees at prediction time.
- Do not publish the GSE skill.
- Do not touch PR #1002 or PR #1012.
- Do not blend contaminated fits with clean ones. Ever.
- Do not tell Motif "complete." Report findings. Motif decides when it is complete.

---

## PRIORITY ORDER (not simultaneous)

1. Step 0 + Phase 0 (refresh/freeze 2026 — blocks live-check leg only)
2. Phase 1 (stamp tau everywhere)
3. Phase 2 (Tier 0: Wire 9 → Wire 5 → Wire 4)
4. Phase 3 (walk-forward tau: train → validate → live-check W1–3; swap iff clean)
5. Phase 4 (Tier 1: Wire 3, Wire 1)
6. Phase 5 (registry: 47 entries, zero nulls)
7. Phase 7 (calibration rows for everything just wired)
8. Phase 6 (Tier 2: Wires 6, 2, 7)
9. Phase 8 (6 doctrines)
10. Phase 9 (Tier 4: ledger, extraction, trace rebuild, injury gate)
11. Phase 10 (P1 fixes)
12. Phase 11 (EPA facet backtest, OL backtest)
13. Phase 12 (verifications)
14. Phase 13 (close one Phase-D item)

One commit per logical unit. Push to the branch as you go. Bus report at the end.

---

## REPORT FORMAT

1. Step 0 — host, HEAD, disk, timestamp, git log tail.
2. Per phase — what was built, files, lines. Each labeled VERIFIED / CONTRADICTED / BLOCKED.
3. Tests — every suite: counts, SHA-anchored, timestamped.
4. Commits — sha, branch, message, timestamp.
5. Calibration rows — per component: train | eval | metric | n | 2026 W1–3 live-check | vintage SHA.
6. Refusals — what you declined to fake.
7. Epistemic summary — counts of VERIFIED / UNVERIFIED / UNKNOWN / CONTRADICTED.
8. Next priority.

If any reachable item is "no," fix before submitting. BEGIN with Step 0.

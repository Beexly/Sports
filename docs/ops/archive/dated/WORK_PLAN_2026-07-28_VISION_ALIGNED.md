# Aligned Work Plan — 2026-07-28

**Produced by:** ring-leader session (vision scoped by 6 parallel readers over the
repo's own vision/handoff/roadmap corpus, synthesized hardest-first).
**Provenance note:** three external Grok share links were provided as vision
sources but are not machine-readable from this environment (auth-gated SPA);
this plan is grounded in the repository's own authoritative docs, which encode
the same program. Nothing here is invented from memory of those links.

## Aligned vision (one paragraph)

GSE is a sports decision-intelligence OS whose product is honesty made
structural: **"Sell honesty, not pick volume. Refusal-Native Forecasting"** —
the refusal is free, the reasoning is paid. The vision is largely BUILT as
scaffolding on real primitives: Merkle receipts LIVE (root of trust,
recomputable at /verify), the Pedersen commitment layer live on the sealed side
(0.5) with a proven, gated open side (0.5b), the selective gate as sole
FIRE/NO_BET authority, and the PAV/IVAP/CVAP/Mondrian spine live-in-path. The
repo is meticulously honest about its own limits — Pedersen is a classical
commitment, the Phase C baseline is UNVERIFIED, no ROI or track record is
claimed anywhere. The near-term end state reachable **without founder secrets**
is not new capability but hardened trust: every honesty claim independently
checkable before any founder flips a flag.

## Workstreams (hardest first; owner as executed)

| ID | Title | Owner | Status |
|---|---|---|---|
| WS0a | 0.5b opener reader proven against real Postgres (pre-gate-flip requirement) | fable | **DONE** (PR #236) |
| WS0b | TOCTOU window closed — RepeatableRead snapshot in the reader | fable | **DONE** (PR #236) |
| WS2 | Property fuzz over PAV/IVAP/CVAP/aggregation; found+fixed a real CVAP contract bug | fable | **DONE** (this PR) |
| WS3 | `certifyBoardGateEvaluation` — attach-only post-gate certificate consumer | fable | **DONE** (this PR) |
| WS4 | Public `/verify/slate/opening` explainer page, dark by default | sonnet | queued |
| WS5 | Wire walk-forward taxonomy harness to real replay rows (context-only) | sonnet | **DONE** (this PR) |
| WS7 | Doc hygiene: stale Phase 0.5b status strings → merged-and-dark | sonnet | queued |
| WS6 | HEOS metric follow-through + REPLAY_ONLY firewall tests | sonnet | **blocked** — depends on HEOS landing (WS8) |
| WS1 | HEOS leakage/honesty fixes (the 10-fix program) | founder-gated | **blocked** — binding law: no agent touches the #226 branch without an explicit founder yes. (A plan synthesizer marked this unblocked; the ring leader overrode it — the law is three handoffs deep and unambiguous.) |
| WS8 | Merge decision for HEOS PR #226 | founder | blocked |
| WS9 | Gate flips (SLATE_OPENING_REVEAL_ENABLED, LIVE_BOARD, PUBLISH_LEDGER), real-DB Phase C remeasure, ledger-writer decision | founder | blocked |

## Additions adopted (improve-only mandate)

1. Fuzz guard over the calibration core (WS2) — the law-sanctioned way to guard
   files that must never be rewritten. Paid for itself: found a real CVAP
   degenerate-path bug on its second random input.
2. Real-Postgres integration proof + fail-first discrimination for 0.5b (WS0a).
3. Structural TOCTOU closure (WS0b) — RepeatableRead, not probabilistic comfort.
4. Attach-only certificate consumer at the real post-gate site (WS3) — converts
   a landed-but-dead recompute artifact into a live one without touching
   authority or persistence.
5. Deferred until HEOS lands: a CI fence keeping replay identifiers off public
   surfaces (the identifiers don't exist in-tree until #226 merges).

## Do-not-touch (inherited, enforced)

LIVE_BOARD off in git · 6h odds budget never widens · pav/ivap never rewritten
without proven bug+tests (fuzz-guarded instead) · selective-gate sole authority ·
no invented ROI/win-rates · Pedersen/Halo2 never "ZK"/"post-quantum" · opener
allowlist stays one file · no ledger writer / FiredDecision persistence
(PRODUCT_CASCADE_MAP §4) · HEOS replay ≠ public tips · founder blockers never
worked around.

## WS5 finding: walk-forward taxonomy harness wired to real context, not real coverage/width (sonnet)

Investigated every in-repo candidate source for the walk-forward taxonomy
harness (`packages/prediction-engine/src/edge-lab/walk-forward-taxonomy.ts`):
`nflverse-source.ts`, `nflverse-ngs.ts`, `historical-replay.ts`, and the
selective-gate/PAV/IVAP/CVAP calibration stack. Conclusion, honestly:

- **Real settled outcomes + real pre-outcome game context DO exist in-repo**:
  `historical-replay.ts` turns a real nflverse `schedules` row (games.csv,
  CC-BY-4.0) into a genuinely settled pick via the FROZEN `scoreGame` model
  and the real final score, under its own no-lookahead discipline. That is
  enough to honestly populate `WalkForwardTaxonomyRow.context`
  (home/away, spread- or moneyline-implied favorite, side-specific rest
  days) for real games.
- **Real, calibrated `covered`/`width`/`residual` do NOT exist in-repo yet.**
  Those fields describe a PAV/IVAP/CVAP/selective-gate calibrated-interval
  output (`selective-gate.ts`'s `FiredDecision.width`), which requires at
  least `MIN_STRATUM_CALIBRATION` (100) real settled rows per Mondrian
  stratum before the gate will even compute an interval — no in-repo
  fixture or dataset supplies that at volume. The real replay source that
  would (HEOS) is founder-gated behind PR #226 (WS1/WS8, blocked).

Per the hard rule (never fabricate a missing data source), the wiring landed
is **context-only**: a new adapter,
`packages/prediction-engine/src/edge-lab/walk-forward-taxonomy-source.ts`,
converts real nflverse-shaped `RawScheduleRow[]` into real
`WalkForwardTaxonomyRow[]` with a genuine `context` and `covered`/`width`/
`residual` left unset (the harness's own contract already never invents
those when absent). A fixture-driven test
(`walk-forward-taxonomy-source.test.ts`) exercises this real path, plus a
separately-namespaced, clearly-labelled `syntheticReplayRows` fixture
(`rowId` prefixed `synthetic:`) that exercises the harness's full
underpowered/under_coverage/wide_intervals alerting surface — fabricated for
test coverage only, never presented as measured. Real coverage/width wiring
is next in line once HEOS lands and is founder-approved (WS6).

`walk-forward-taxonomy.ts` / `selective-gate.ts` / `pav.ts` / `ivap.ts` /
`cvap.ts` / `mondrian.ts` were not modified.

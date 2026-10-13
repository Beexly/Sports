# The Gauntlet — every gate, in the run path

`intelligence/gates/gauntlet.py` is the single run path for the fleet's
acceptance gates, built 2026-10-12 under Garrett's order: *"MAKE SURE
ALL GATES, REASONING AND INTELLIGENCE ARE IN EVERYTHING."*

For one game it freezes the run's inputs into a manifest (SHA-256 +
the provenance fields `intelligence/gates/manifest_check.py` requires),
then executes gates in pipeline order:

```
INGEST → SIGNAL → MODEL → SIMULATION → ARBITRATION → OUTPUT
```

Every gate returns PASS / FAIL / SKIP(reason) with evidence. The rules
are fail-closed and pinned by `intelligence/gates/test_gauntlet.py`:

- An exception inside a gate is a **FAIL** with the error recorded —
  never a silent pass.
- The manifest is frozen **before** any gate executes.
- Artifact stamps are **derived from the RVC verdict** by
  `derive_stamps()` — never set by hand. Unless the
  residual-versus-close gate returns CLEARED on a frozen paired
  holdout, every artifact of the run is `label: DIAGNOSTIC` with
  `is_pick` / `is_edge_claim` false.
- **Shadow gates cannot block, cannot clear, and cannot change a
  stamp.** Two families run shadow (see below).
- The registry (`gauntlet_registry.json`) and the executable gate set
  must agree exactly; drift forces diagnostic stamps and is recorded
  as an error.

## Run it

```bash
python3 -m intelligence.gates.gauntlet --root . \
    --out outbox/gauntlet [--tree <git-tree.json>]
```

Exit code is 1 only when an enforcing gate other than the RVC gate
fails, or the census drifts — a NOT_CLEARED RVC verdict is a truthful
outcome carried by the stamps, not a runner failure.

## The gates (35 executable)

**Enforcing (16)** — their FAIL blocks clearance:

| stage | gate | what it enforces |
|---|---|---|
| INGEST | `ingest.price_feed_integrity` | real ESPN/Galaxy prices parse; target game fully quoted; de-vig booksum sane — unquoted stays null, never filled |
| INGEST | `ingest.pinnacle_prop_feed` | the Pinnacle capture parses to fully two-way priced props |
| INGEST | `ingest.manifest_completeness` | frozen manifest meets the REQUIRED provenance standard; hashes still match disk |
| INGEST | `ingest.heldout_discipline` | any input declaring train/eval years must declare them disjoint (`heldout_check`) |
| INGEST | `ingest.injury_publication_gate` | Week-N injury report timing: no live pull before Friday 18:00 ET (`providers/injury_gate.py`); week + Friday read from the run's own frozen inputs |
| INGEST | `ingest.leakwall_market_snapshot` | leak wall (S3): a missing market feed is refused, never proxied (`trust/leakwall.py`) |
| SIGNAL | `signal.claim_matrix` | a claim is wired only if code + test + data exist (`claim_matrix.py`), annotated against the frozen tree so a partial checkout is never confused with a repo gap |
| MODEL | `model.measured_correlations` | the SGP correlation snapshot is the measured one: canonical leg order, PSD, ≥500 team-games |
| MODEL | `model.sgp_reproduction` | tonight's SGP stacks reprice from the frozen fixture + snapshot and match the committed artifact (seed-deterministic) |
| MODEL | `model.props_board_consistency` | live props board: diagnostic stamps present, Shin de-vig rows sum to 1, no stake/Kelly field anywhere |
| ARBITRATION | `arbitration.rvc` | **residual-versus-close clearance** (`gates/rvc_gate.py`): frozen paired holdout, disjoint splits, n ≥ 50, Brier(model) < Brier(close), Brier skill > 0.02, residual-vs-close slope not significantly negative |
| ARBITRATION | `arbitration.mint_gate` | a reasoning trace never mints a probability; DATA-GAP facets withhold (`reasoning_engine/mint_gate.py`) fed this run's real facet state |
| ARBITRATION | `arbitration.proof_ledger` | no edge claim is admissible unless its Wilson 95% LB clears 0.524 (`trust/proofledger.py`) |
| OUTPUT | `output.stamp_derivation` | the report's stamps equal `derive_stamps()` applied to the run — proof they were derived, not set |
| OUTPUT | `output.public_surface_guard` | no stake sizing, no pick/edge claim while uncleared, no NGS material in anything emitted |
| OUTPUT | `output.evidence_guard` | SYS-22 15-test publish gate (`trust/evidence_guard.py`): fails if the guard would SHIP what RVC hasn't cleared, or BLOCKs the artifact |

**Shadow (19)** — verdicts recorded, powerless by construction:

- Prediction-engine modules 1–8, 13–16, 21–24 (16 gates): built
  against specs **INFERRED** by the building worker. They run labeled
  `spec_status: INFERRED` until reconciled against canonical specs.
  Harnesses vendored byte-identical in `intelligence/gates/pe_modules/`
  (see its README for provenance and the recorded stamps). Modules
  5–8 and 21–24 refuse/SKIP on absent frozen inputs rather than
  fabricating samples.
- Trust machinery self-checks (3 gates): EnbPI coverage (SYS-03/36),
  the SYS-21 calibration chain's Cohort-E baseline, and the SYS-25
  NNTD abstention backtest — canonical specs whose acceptance data is,
  by the modules' own honesty labels, **seeded synthetic**. Recorded
  as machinery evidence only; they say nothing about any real game.

## The census

`gauntlet_registry.json` is the full census: wired (16), shadow (19),
and not-wired entries **with reasons** — including prediction-engine
modules 9–12 (SPEC_PENDING, no executable harness), 17–20 and 41–48
(no harness/landing record), 25–36 (staged locally, never landed),
37–40/49–64 (landed outside this stack, quarantined from
unreconciled import), the 179-module TypeScript corpus in
`packages/prediction-engine/src/` (23 families, documented in
`docs/gates/GATE-SPECS.md` — that lane's gates are NOT EVALUATED or
unstated, and a Python gauntlet cannot execute them), staking
(deliberately downstream of RVC clearance), and the producer/tooling
lanes that are not acceptance gates.

## Tonight's run — BUF @ LAR, 2026-10-12

Artifacts: `outbox/gauntlet/mnf_20261012_manifest.json`,
`outbox/gauntlet/mnf_20261012_gauntlet_report.json`.

- Enforcing: **14 PASS / 1 FAIL / 1 SKIP** — the FAIL is
  `arbitration.rvc`: NOT_CLEARED (no frozen paired holdout exists in
  this branch's tree; the canonical diagnostic board lives outside
  it), the SKIP is held-out discipline (no run input declares split
  years; the RVC gate performs its own check).
- Shadow: **11 PASS / 0 FAIL / 8 SKIP** — the SKIPs are modules 5–8
  and 21–24 refusing empty inputs, as designed.
- SGP reproduction delta vs the committed artifact: **0.0** on all
  four numbers. Evidence guard: **HOLD (4/15)**, correct for an
  uncleared run; its failed checks are recorded in the report as the
  requirements a future SHIP must meet.
- Stamps: `DIAGNOSTIC`, `is_pick: false`, `is_edge_claim: false` —
  derived by the gate.

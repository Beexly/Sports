# qb-behavior — QB Behavioral Profile Engine

**Module:** `qb-behavior/` in `~/workspace/gse-intelligence-build/`
**Owner:** Coordinator c01. **Status:** core profile engine (sister module: c02's situational/trust-target splits, built on top of this engine).

## What this is

The engineered, tested version of the Track 1 QB behavioral profile pipeline
(`~/workspace/qb-behavioral-profiles/` — the research prototype). It computes
per-QB behavioral profiles from nflverse play-by-play and serves them as
structured, verification-status-tagged objects to the reasoning layer
(`reasoning-depth-spec.md` §5 Track 1, §6.2 verification enum).

This module **imports and extends** the prototype — it does not duplicate it:
- Metric definitions (HHI, trust targets, INT splits, scramble/run rates, EPA
  splits) come from `qb-behavioral-profiles/code/compute_metrics.py`.
- The metric-bible filters (garbage-time 11.2% removal, kneel/spike exclusion,
  Success = EPA > 0) come from `props/research/2026-09-17/props-consensus/our-metric-stack.md`.
- New features come from c01 deep research (`corpus-intelligence/deep/c01/`).

## Interface contract with c02 (situational / trust-target splits)

c02 OWNS: situational split matrices (down × distance × field position × game
script), WR-absence-conditional trust targets (the Pitts/London template),
receiver-conditional TD decomposition.

This engine PROVIDES (and c02 must consume, not reimplement):
- `ProfileEngine.get_dropback_frame(qb, season)` → filtered play-level
  polars DataFrame (garbage-time removed, kneels/spikes excluded, QB identity
  resolved). The single composition point: c02 computes arbitrary splits from
  this frame without reimplementing loading, filtering, or identity.
- `ProfileEngine.get_profile(qb)` → `QBProfile` with base metrics, each
  carrying a `Verification` status (CORPUS / COMPUTED / SINGLE_SOURCE / INFERENCE).
- `qb_behavior.splits.SplitSpec` — the protocol c02 implements for a split;
  `ProfileEngine.apply_split(profile, split_spec)` runs it against the frame.

c02 must NOT: reimplement HHI, INT-rate, scramble-rate, or EPA-split
computation; reload pbp; or resolve QB identity. Those live here.

## Layout

```
src/qb_behavior/
    __init__.py      public API
    identity.py      QB identity resolution (GSIS passer_player_id → canonical name;
                     scramble backfill; auto name map from local pbp)
    loader.py        pbp loading + metric-bible filters + ENGINE_COLUMNS pruning
    metrics.py       pure metric primitives (HHI, shares, rates, Wilson CIs, EPA splits)
    profile.py       QBProfile dataclass + Verification enum + serialization
    engine.py        ProfileEngine orchestrator
    splits.py        SplitSpec protocol (implemented by c02)
    audit.py         stability/admission gates (n floors, D/S/I discrimination)
tests/
    test_metrics.py  pure primitives (HHI, Wilson, EB shrinkage, baselines)
    test_units.py    identity/loader/profile/splits/audit
    test_engine.py   engine integration (synthetic + real-data regression anchors)
    fixtures.py      synthetic pbp fixtures (hermetic — no network)
run_tests.py         stdlib unittest runner (no pytest dependency)
```

## Loader notes

- `loader.ENGINE_COLUMNS` (~60 columns) is pruned at parquet-read time; the
  free-text `desc` column is deliberately excluded. A 17-season full-width
  load OOMs this VM; the pruned load takes ~5s.
- `ProfileEngine(extra_columns=[...])` unions extra columns for c02 split
  dimensions the default set doesn't cover.
- Cross-season `goal_to_go` dtype conflicts are coerced via
  `diagonal_relaxed` concat.
- Name map auto-builds from local pbp (`passer`/`rusher`/`receiver` id→name
  pairs, most-common-name wins per id). Pass an explicit roster-canonical
  map to override.

## Audit behavior

`audit.audit_season_profile()` runs every metric through the sample gate
(tiny-sample floor n<12 → do not publish; n<30 → slate read only).
`audit.mark_weak_links()` demotes failures to `SINGLE_SOURCE` with the gate
reason appended — they stay visible, never load-bearing at L4+.

## Verification statuses (reasoning-depth-spec §6.2)

Every computed value carries one of: `CORPUS` (ingested from sourced data),
`COMPUTED` (derived by this engine, reproducible), `SINGLE_SOURCE`
(one outlet, uncorroborated — never load-bearing without a flag), `INFERENCE`
(model judgment — must carry a breaking condition).

## Provenance

Each source file carries a header naming the research it implements.
See `PROVENANCE.md` for the full research → code mapping.

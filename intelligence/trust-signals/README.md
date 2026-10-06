# trust-signals — signal-source intake engine

**Module owner:** c05 Phase 2+ coordinator. **Scope:** text/news intake only.
c06 owns video/social signal extraction; both write the same `TrustSignal` shape
(`signal_origin`: `TEXT` | `VIDEO` | `SOCIAL` | `NEWS_WIRE`).

## What this implements

| Corpus source | What was taken |
|---|---|
| `docs/calibration-proposals/2026-09-13-beat-desk-prop-alignment-context-matrix-v5.3.0.md` Layer 3 (verified vs source) | ingest → classify → entity-resolve → polarity×magnitude → freshness decay → source trust weight → per-game beat vector → hold flags |
| `corpus-intelligence/intake/x-intake-registry.md` (6 X accounts, verified) | source registry, priority tiers, check cadences, dedup on post ID, item landing format, provenance rule |
| `corpus-intelligence/handoff/reasoning-depth-spec.md` §5 | trust_signals as a mandatory checklist track |
| `gse-intelligence-build/contracts/integration-contracts.md` §1 | `TrustSignalProvider.get_trust_signals(team, week, season)` |

Deep research: `corpus-intelligence/deep/c05/` (`verified-claims.md`, `syntheses.md`, `challenges.md`, `buildable-systems.md`).

## Honesty labels (read before trusting outputs)

- The beat-desk proposal is a **design doc, not validated research** — none of its parameters were fitted. Hand-set values are marked SPEC.
- The classifier is a **keyword heuristic**; every output is `verification=INFERENCE`. No trained model ships.
- Freshness half-lives and the tipster EMA rule are **SPEC defaults**, tunable in `decay.HALF_LIVES` / `tipster.ACCURACY_ALPHA`.
- **Shadow by default**: `FileStoreTrustSignalProvider(live=False)` marks served signals `shadow=True`. Promotion is a deliberate, logged decision.
- `@matt_barlowe` is `PENDING_VERIFICATION` — excluded from active intake until his football lane is confirmed.
- No working X client ships (X is blocked from this environment). The `fetch.SourceFetcher` seam is the deliverable; production needs an X API key or Garrett's session.

## Layout

- `models.py` — frozen dataclasses + closed enums (`SignalType`, `TrackTag`, `TrustTier`, `SignalOrigin`, `TrustSignal`, `BeatVector`, `HoldFlag`, `NewsEvent`, `ProfileTrigger`, `SourceRecord`, `RawItem`)
- `sources.py` — the 6 registry X accounts + `due_for_check` scheduler
- `fetch.py` — `SourceFetcher` ABC, `FixtureFetcher` (tests), `MirrorFetcher` (stub)
- `classify.py` — rule-based beat classifier + trust-dynamics detection + polarity/magnitude
- `entities.py` — 32-team alias resolver + roster-based player resolution (unresolved → `data_gap`)
- `decay.py` — freshness decay `w = m · 0.5^(age/half_life)`
- `tipster.py` — tipster leaderboard: tier priors × rolling accuracy EMA
- `store.py` — JSONL store, post-ID + content-hash dedup, registry landing writer
- `news_wire.py` — news events, materiality, `triggers_for()` profile re-run triggers
- `pipeline.py` — `process_item()` (beat-desk pipeline), `build_beat_vector()`, `hold_flags()`
- `provider.py` — `FileStoreTrustSignalProvider` (mirrors the integration contract's ABC)

## Quick start

The module lives in `trust-signals/` (hyphenated, per the program's module naming).
Load it in tests/scripts via importlib (see `tests/test_trust_signals.py`):

```python
import importlib.util, os
pkg = os.path.join(BUILD_ROOT, "trust-signals")
spec = importlib.util.spec_from_file_location(
    "trust_signals", os.path.join(pkg, "__init__.py"),
    submodule_search_locations=[pkg])
```

Typical flow:

```python
store = IntakeStore("./data/intake")
board = TipsterBoard({s.handle: s.trust_tier for s in SOURCES})
provider = FileStoreTrustSignalProvider(store, board)  # live=False → shadow mode

item = RawItem("@mysportsupdate", "123", "Browns LT ruled out Sunday ...",
               "https://x.com/...", observed_at, fetched_at)
if store.save_item(item):                      # dedup: never re-ingest
    for sig in process_item(item, get_source("@mysportsupdate"), roster):
        store.save_signal(sig)

signals = provider.get_trust_signals("CLE", week=4, season=2026)
vector = build_beat_vector("CLE", 2026, 4, signals)
flags = hold_flags(signals)                    # Premium blockers
```

Run the test suite from `gse-intelligence-build/`:

```bash
python3 -m unittest discover -s tests -p "test_trust_signals_*.py" -v
```

## Data flow

```
SourceFetcher.fetch_since(source, since)   # X / mirror / fixture
        → IntakeStore.save_item()          # dedup on post_id / content_hash
        → pipeline.process_item()          # classify → resolve → polarity×magnitude
        → IntakeStore.save_signal()        # TrustSignal rows
        → FileStoreTrustSignalProvider.get_trust_signals(team, week, season)
                                           # decay × tipster weight at query time
news_wire.make_event() → triggers_for()    # profile re-run triggers for subscribers
```

## Coordination notes (for sibling modules)

- **c06 (video/social) — LANDED 2026-10-02:** the extraction framework lives in
  `extractors/` (plugin ABC + registry + fail-loud pipeline), `clustering.py`
  (story clusters), `merge.py` (quote-hash dedup), `scoring.py` (tempered-Bayes
  `TrustScore` aggregator), `checklist.py` (`sweep_trust_signals`, spec §5 T2).
  Writes `TrustSignal`s with `signal_origin=VIDEO`/`SOCIAL` (schema v1.1.0) into
  the same store; `get_trust_signals` serves them alongside text signals. No
  second store. Schema extension (new `SignalType` members, `TrustDirection`,
  `SpeakerRole`, `CalibrationState`, defaulted `TrustSignal` fields) is
  backward-compatible — old rows read as schema "1.0.0". Sibling-side changes:
  `provider._dict_to_signal` reads the new fields; `decay.HALF_LIVES` covers
  the new types; `process_item` populates `quote_text` on `TRUST_QUOTE`;
  `build_beat_vector(..., trust_scorer=None)` — pass
  `scoring.aggregate_all` to use the bayesian trust component when n_items>=3
  (`trust_path` records which path). All scores ship `shadow=True`,
  `calibration_state=UNCALIBRATED`, heuristics `verification=INFERENCE` until
  the 0440 NFL-port backtest + 0670 ŵ>0.05 gates pass.
- **c09 (integration):** `provider.TrustSignalProviderABC` mirrors your `integration/providers.py` ABC — re-export or subclass it when that file lands.
- **qb-behavioral / coaching pipelines:** subscribe to `ProfileTrigger`s from `news_wire.triggers_for()` instead of polling the intake.

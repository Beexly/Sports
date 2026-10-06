# Buildable Systems — c05 Trust-Signal Deep Research

**Coordinator:** c05 Phase 2+ (trust-signals module)
**Date:** 2026-10-02
**Target:** `~/workspace/gse-intelligence-build/trust-signals/`

Four systems, in build order. Every system names its corpus provenance and its honesty labels.

---

## System 1 — X-account monitoring pipeline (registry implementation)
**Provenance:** `x-intake-registry.md` (monitoring spec, priority tiers, item format, dedup, provenance rule).

- `sources.py`: the 6 X accounts as `SourceRecord`s — handle, name, lane, primary track, priority tier, trust tier, check cadence, status (ACTIVE / PENDING_VERIFICATION). @matt_barlowe encoded as PENDING_VERIFICATION, excluded from active checks.
- Scheduler: `due_for_check(source, now, last_check)` implementing registry cadences — daily tier twice daily in season (morning + evening), weekly tier Saturday + Monday, event-driven on trigger, monthly verification for Tier 4.
- `fetch` seam: `SourceFetcher` ABC with `fetch_since(source, since) -> list[RawItem]`. No working X client ships (X blocked from this environment; needs X API key or Garrett's session). Ships with a `MirrorFetcher` stub documenting the twstalker → xstalk → instalker fallback chain and a `FixtureFetcher` for tests.
- `store.py`: JSONL item store; dedup on X post ID; item-landing writer producing the registry's exact format (`items/<handle>/YYYY-MM-DD.md`: post text/URL/timestamp, track tags, one-line intelligence note).
- Provenance rule enforced in code: every stored item must carry `source_url` or a `provenance_gap` note; items without either are rejected at write time.

## System 2 — Beat-desk processing pipeline (Layer 3 implementation)
**Provenance:** `2026-09-13-beat-desk-prop-alignment-context-matrix-v5.3.0.md` Layer 3 (verified against source).

- `classify.py`: rule-based classifier into injury / lineup / scheme / motivation / weather / off-field + TRUST_QUOTE (trust dynamics: QB-receiver trust, frustration, unprompted praise). Outputs carry `verification=INFERENCE` (heuristic, see C10).
- `entities.py`: deterministic alias-table resolver — all 32 NFL teams (names, abbreviations, cities) + caller-supplied player roster. Unresolved → `data_gap` on the signal, never a guess (see C9).
- `polarity.py` (folded into classify or separate): polarity × magnitude scoring. Polarity −1..1, magnitude 0..1. Rule-based lexicons, INFERENCE-labeled.
- `decay.py`: freshness decay `weight = magnitude * 0.5 ** (age_hours / half_life_hours)` with per-type half-lives (injury 72h, lineup 48h, scheme 48h, weather 24h, off-field 48h, trust-quote 36h, motivation 12h) — SPEC defaults from the proposal's "24–48h, injury slower, motivational faster" (see C2). All tunable in one config dict.
- Output: per-(team, week) beat vectors: `injury_impact`, `lineup_news`, `scheme_notes`, `motivation`, `trust_dynamics` — each with weight, source list, timestamps. Mirrors the spec's `game_signals` shape so the engine's eventual DB write is a straight mapping.
- `HoldFlag`: unresolved high-magnitude negative items (magnitude ≥ 0.7, polarity < 0, fresher than 24h) become hold flags blocking Premium publication.

## System 3 — Tipster leaderboard (source trust weights)
**Provenance:** beat-desk spec "Trust is earned, not assigned" (concept; formula is SPEC, see C3).

- `tipster.py`: `SourceTrust` per source — tier prior weight (T1 1.0, T2 0.8, T3 0.6, T4 0.4), rolling accuracy via exponential moving average (`alpha=0.1`, SPEC), effective weight = tier_prior × (0.5 + accuracy). Updates on graded outcomes: `record_outcome(source, signal_id, correct: bool)`.
- Reddit/T4 volume gate enforced: T4 items aggregate (min 5 items per team per 24h window) before emitting signals; single posts stored but silent (see C11).

## System 4 — News-wire intake + profile re-run triggers
**Provenance:** registry @mysportsupdate profile ("the event feed that should trigger re-runs"); TNF program Track 3; reasoning spec §5 live-signals.

- `news_wire.py`: `NewsEvent` (event_type, entities, summary, source_url, observed_at, materiality). Materiality tiers: HIGH (starting QB/HC/out-for-season injury, major trade), MEDIUM (depth-chart move, activation, coordinator quote on scheme), LOW (narrative, standings). SPEC defaults, documented (see C8).
- `triggers_for(event) -> list[ProfileTrigger]`: typed triggers — `qb_profile(player)`, `coaching_profile(team)`, `ol_state(team)`, `checklist_refresh(game)` — so the qb-behavioral and coaching-tendency pipelines can subscribe without polling.
- Same store/dedup as System 1 (content-hash dedup for wire items without post IDs).

## System 5 — Provider adapter (integration contract)
**Provenance:** `gse-intelligence-build/contracts/integration-contracts.md` §1.

- `provider.py`: `TrustSignalProvider` implementing `get_trust_signals(team, week, season) -> list[TrustSignal]` — frozen dataclasses, `verification` on every numeric claim, `None` + `data_gap` for missing data, decay applied at query time, tipster weights multiplied in.
- `signal_origin` field (`TEXT` | `VIDEO` | `NEWS_WIRE`) reserved for c06's video framework (see S7).
- `live` flag defaults False (shadow mode, see C12/S8); provider marks served signals `shadow=True` until promotion.

## Non-goals (explicitly out of scope for this module)
- Video/social signal extraction — c06's module; this module only reserves the shared shape.
- A working X API client — needs Garrett's X access; the fetch seam is the deliverable.
- A trained text classifier — needs labeled data; rule-based heuristic ships with INFERENCE labels.
- Prop alignment, context matrix, calibrated confidence — other beat-desk layers / other coordinators.
- Any Sports-checkout changes — workspace only, audit is active.

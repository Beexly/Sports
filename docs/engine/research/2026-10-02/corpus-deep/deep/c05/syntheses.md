# Syntheses — c05 Trust-Signal Deep Research

**Coordinator:** c05 Phase 2+ (trust-signals module)
**Date:** 2026-10-02
**Purpose:** how the c05 findings connect across files into buildable architecture.

---

## S1. The beat-desk spec IS the trust-signal intake design — the registry IS its source list
Three corpus artifacts snap together into one system:
1. `2026-09-13-beat-desk-prop-alignment-context-matrix-v5.3.0.md` (Layer 3) gives the **processing pipeline**: ingest → classify → entity-resolve → polarity × magnitude → freshness decay → source trust weight → per-game beat vector → hold flags.
2. `x-intake-registry.md` gives the **source list and monitoring cadence**: 6 X accounts, priority tiers, dedup rule, item landing format, provenance rule.
3. `reasoning-depth-spec.md` §5 gives the **consumption contract**: trust_signals as a mandatory checklist track with verdicts, consumed by `TrustSignalProvider.get_trust_signals(team, week, season)`.

None of the three works alone. The build wires all three: registry sources feed the beat-desk pipeline, whose output serves the checklist track.

## S2. The tipster leaderboard is the corpus's answer to "how do we trust sources"
Garrett's standing complaint is that research exists but isn't weighted by reliability. The beat-desk spec's "trust is earned, not assigned" — tier priors that update on rolling correlation with realized outcomes — is the only source-quality mechanism anywhere in the c05 slice. It composes with:
- the reasoning spec's verification-precedence rule (live-verified > computed > corpus > single-source > inference): a source whose signals repeatedly verify climbs both its tipster weight AND the effective verification of its claims;
- the integration contract's `verification` field on every numeric claim: tipster weight is a source-level prior, verification is a claim-level status — the build keeps them separate, multiplied at query time.

## S3. The X accounts map onto beat-desk trust tiers — with one correction
- @mysportsupdate (breaking news) ≈ T3 national-reporter tier in function (aggregator speed), but as a curated single source it behaves as T2 for NFL transactions.
- @throwthedamball (PFF betting/OL charting) ≈ T2 established-analyst tier.
- @the_waldman (independent modeler) ≈ T2/T3: projections are a second opinion, not news.
- @doug_clawson (CBS researcher) ≈ T2: institutional backing, historical not breaking.
- @shauncore (film analyst) ≈ T2 when active: primary film evidence.
- @matt_barlowe ≈ unclassified: excluded until verified (see C5).
Each source's tier prior is encoded in `sources.py`; the tipster leaderboard moves the effective weight from there.

## S4. News-wire intake is the event feed the whole program assumed but never specified
The TNF program doc (Track 3) and the reasoning spec both assume "live signals (injury, weather, market movement)" arrive somehow. The c05 slice contains no event-detection method. The registry's @mysportsupdate profile is the closest thing: "the event feed that should trigger re-runs of QB/coaching/OL profiles." The build therefore implements `news_wire.py` as an **event → trigger router**: classified news events emit typed re-run triggers (`qb_profile`, `coaching_profile`, `ol_state`, `checklist_refresh`) with materiality scores, so downstream pipelines (qb-behavioral, coaching-tendencies) can subscribe without polling the intake.

## S5. Freshness decay + hold flags = the time dimension the checklist was missing
The reasoning spec's checklist is a snapshot verdict (CLEAR/DATA-GAP/...). The beat-desk decay gives it a time dimension: a trust signal's weight decays with age, and an unresolved high-magnitude negative item becomes a **hold flag** that blocks Premium publication. The build emits hold flags as first-class objects (`HoldFlag`) consumed by the calibration/publication layer — this is the "fewer Premium picks, not bad ones" fail-safe made concrete.

## S6. Dedup on post ID + content hash covers both X and news lanes
The registry mandates dedup on X post ID ("never re-ingest"). The news-wire lane has no post IDs, so the build dedups on a canonical content hash (normalized text + source + day). One `store.py` serves both lanes with a two-key dedup (post_id when present, content_hash otherwise).

## S7. The video/social lane (c06) plugs into the same TrustSignal shape
c06 builds video/social signal extraction. Coordination decision: `TrustSignal` carries a `signal_origin` field (`TEXT` | `VIDEO` | `NEWS_WIRE`) and both modules write to the same item-store format. Text/news intake is this module's; video-derived signals arrive through the same `get_trust_signals` provider with `signal_origin=VIDEO`. No duplicate stores, no competing schemas.

## S8. Shadow-first is the honest default — and the corpus demands it
The beat-desk spec says "shadow first" (4–8 weeks writing signals and would-have adjustments, scored against realizations) even though the founder overrode it for the engine's own rollout. The reasoning-depth spec's entire posture (no fake calibration, honest labeling) reinforces shadow-first. The build defaults `live=False`: signals compute and store; the provider serves them to the checklist marked `shadow=True` until a deliberate promotion. This is the conservative reading of both specs and the only one consistent with "never fake calibration."

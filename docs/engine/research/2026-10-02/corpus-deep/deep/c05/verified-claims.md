# Verified Claims — c05 Trust-Signal Deep Research

**Coordinator:** c05 Phase 2+ (trust-signals module)
**Date:** 2026-10-02
**Method:** every claim below was checked against its source file or the vendor checkout. Inference is labeled.

---

## 1. Beat-desk spec (corpus research, PROPOSED not implemented)

**Source:** `~/workspace/vendor/Sports/docs/calibration-proposals/2026-09-13-beat-desk-prop-alignment-context-matrix-v5.3.0.md` (132 lines, read in full)
**Brief:** `~/workspace/corpus-intelligence/briefs/c05/c05-r17/2026-09-13-beat-desk-prop-alignment-context-matrix-v5.3.0.brief.md`

| Claim | Status |
|---|---|
| Proposal status PROPOSED; supersedes v5.2.7; all five moves NOT implemented as of 2026-10-01 audit note | **VERIFIED** (brief §Findings + source status note, line ~12) |
| Pipeline per item: ingest → classify (injury/lineup/scheme/motivation/weather/off-field) → entity-resolve → polarity × magnitude → freshness decay → source trust weight | **VERIFIED** (source line 68, verbatim) |
| Freshness decay half-life ~24–48h; injury decays slower, motivational quotes faster | **VERIFIED** (source line 68). Note: these are hand-set values, not fitted — see challenges |
| Trust tiers T1 official (team PR, injury reports, pressers) → T2 beat writers → T3 national reporters (Schefter/RapSheet) → T4 Reddit team subs + fan sentiment (volume + polarity, never single posts) | **VERIFIED** (source Layer 3, lines 60–66) |
| "Trust is earned, not assigned": every source starts at tier prior; weights update on rolling window by correlation of that source's signals with realized outcomes — a tipster leaderboard | **VERIFIED** (source line 70, verbatim). Note: no update formula given — concept only, see challenges |
| Output: per-game beat vector in `game_signals` table (`injury_impact`, `lineup_news`, `scheme_notes`, `motivation`, each with weight, sources, timestamps) | **VERIFIED** (source Layer 3 output paragraph) |
| Unresolved high-magnitude negative items act as a hold flag: pick still generates but cannot go Premium until resolved or game time | **VERIFIED** (source Layer 3) |
| Beat-writer RSS/API, presser transcripts, Reddit API are founder-gated credentials; prop feed vendor decision founder-gated | **VERIFIED** (brief §Data sources + source Layer 4) |
| "beat writers/reporter news/pressers/Reddit sentiment have zero ingestion" in the current engine; `game_signals` shadows at BLOCKED_MISSING_SOURCE | **VERIFIED** (brief §Findings; corroborated by c05-map gap #4: "Trust-signal (social/video) intake has zero coverage" across all 300 slice files) |

## 2. X intake registry (Garrett-sourced, 2026-10-01)

**Source:** `~/workspace/corpus-intelligence/intake/x-intake-registry.md` + 6 account files (all read in full)

| Claim | Status |
|---|---|
| 6 unique accounts from 7 URLs (2 posts belong to @throwthedamball and @the_waldman) | **VERIFIED** (registry table, 6 rows) |
| @throwthedamball = Judah Fortgang, Betting @PFF, ex-SIG trader, ~16K followers; OL charting (guard 1-on-1 island rates); Daily tier | **VERIFIED** (x-throwthedamball.md; provenance: twstalker mirror + muckrack; follower count ~65 days old — may have shifted, flagged in file) |
| @the_waldman = Daniel Waldman, independent NFL modeler; posts full-game sims + half-PPR projections every game; self-reports +11.6 units; Weekly tier | **VERIFIED** (x-the_waldman.md; +11.6 units self-reported, UNVERIFIED — flagged). Post 2105678944465027107 content **INFERRED** (403 on mirror), marked as inference in file |
| @mysportsupdate = Ari Meirov, NFL breaking-news wire; Daily tier; fastest transaction/injury wire of the seven | **VERIFIED** (x-mysportsupdate.md; "fastest" is the intake author's judgment — INFERENCE, not benchmarked: "Speed-of-reporting vs Schefter/Rapoport not benchmarked") |
| @doug_clawson = Doug Clawson, CBS Sports researcher, ex-ESPN Stats & Info; historical QB comps; Weekly tier | **VERIFIED** (x-doug_clawson.md; sources: buzzsumo, espnfrontrow, mirrors; mirror post dates approximate — flagged) |
| @shauncore = Shaun Newkirk, All-22 film breakdowns; Event-driven tier; only 2023 content recoverable | **VERIFIED** (x-shauncore.md; thinnest profile — PROVENANCE-GAP: no 2024–2026 activity verified) |
| @matt_barlowe = Matthew Barlowe, sports-analytics builder (NWHL scraper); football lane UNCONFIRMED; Monthly verification tier | **VERIFIED** (x-matt_barlowe.md; explicitly PROVENANCE-GAP — do NOT treat as an intelligence source) |
| Monitoring spec: check each account's recent posts via X API or mirror fallback (twstalker → xstalk → instalker); X direct fetch blocked from this environment | **VERIFIED** (registry; the intake subagent's completion report confirms `browser.open` fails on all x.com URLs) |
| Item landing: `~/workspace/corpus-intelligence/intake/items/<handle>/YYYY-MM-DD.md` — post text/URL/timestamp, track tags, one-line intelligence note; dedup on X post ID; every item carries source URL or PROVENANCE-GAP | **VERIFIED** (registry monitoring spec, verbatim) |
| Priority tiers: T1-daily (@throwthedamball, @mysportsupdate), T2-weekly (@the_waldman, @doug_clawson), T3-event-driven (@shauncore), T4-verify (@matt_barlowe) | **VERIFIED** (registry priority tiers) |
| Standing rule: any source Garrett sends gets ingested into the registry within the same session | **VERIFIED** (registry "Why this exists"; Garrett's 2026-10-01 directive) |

## 3. Reasoning-depth spec trust-signal requirements (design spec, not research)

**Source:** `~/workspace/corpus-intelligence/handoff/reasoning-depth-spec.md` §§5–6

| Claim | Status |
|---|---|
| Trust signals is one of five mandatory checklist tracks at L3+; UNCHECKED invalidates the trace; verdicts CLEAR / NOTHING-MATERIAL / DATA-GAP / CONFLICT | **VERIFIED** (spec §5, §6.3 — spec text, not empirical research) |
| Tonight's trust-signal miss: Rodgers–Metcalf video ("this mfer sucks ass") findable pre-kickoff, not in any pre-game sweep | **VERIFIED** as program-doc claim (tnf-intelligence-program §5). The video itself is asserted by the program doc, not independently re-verified here |
| Verification statuses CORPUS / COMPUTED / SINGLE_SOURCE / INFERENCE; every claim carries one | **VERIFIED** (spec §6.2; also implemented in `gse-intelligence-build/reasoning/enums.py`) |

## 4. Integration contract (sibling coordinator c09)

**Source:** `~/workspace/gse-intelligence-build/contracts/integration-contracts.md`

| Claim | Status |
|---|---|
| `TrustSignalProvider.get_trust_signals(team, week, season) -> list[TrustSignal]`; TrustSignal = {player_id, signal_type, text, source_url, observed_at, verification} | **VERIFIED** (contract §1 — this is the interface my module must satisfy) |
| Frozen dataclasses; numeric fields carry `verification != INFERENCE` unless with machine-checkable `breaking_condition`; missing data = `None` + `data_gap` reason | **VERIFIED** (contract §1 data-shape contracts) |

# c06 Buildable Systems — trust-signals Video/Social Extraction Framework

**Slice:** c06 · **Date:** 2026-10-02 · Full design: `working/buildable-systems.md` (this file is the consolidated build record).
**Architecture (from syntheses S1):** transcript-first extraction framework. CV in three supporting roles only (shot segmentation, speaker-presence confirmation, dedupe). Text extractors carry zero GPU dependency — the trust pipeline never waits on the CV stack.
**Scoring mechanism (from syntheses S2):** LEAP-adapted tempered-Bayes (mechanism ports, numbers don't). Prior carries the weight; news calibrates.
**Wire-first:** all scores ship `shadow=True`, `calibration_state="UNCALIBRATED"`, heuristic outputs `verification=INFERENCE` until the 0440 NFL-port backtest (Brier ≥0.010 + ECE ≥25%) and 0670 ŵ>0.05 gates pass.

---

## 1. Schema extension (shared `TrustSignal`, backward-compatible v1.1.0)

New `SignalType` members: `TRUST_UP`, `TRUST_DOWN`, `FRUSTRATION`, `PRAISE_UNPROMPTED`, `ROLE_INCREASE`, `ROLE_DECREASE`, `EXPERT_DISAGREEMENT`, `NEWS_CONFLICT`, `RETRACTION`.
New `SignalOrigin.SOCIAL` (VIDEO already reserved for this lane).
New enums: `TrustDirection` (UP/DOWN/NEUTRAL/CONFLICT/UNKNOWN), `SpeakerRole` (PLAYER/COACH/EXECUTIVE/ANALYST/UNKNOWN), `CalibrationState` (UNCALIBRATED/CALIBRATING/CALIBRATED/FAILED).
New defaulted `TrustSignal` fields (all optional, old rows deserialize unchanged): `schema_version` ("1.0.0" default), `extractor_name`, `extractor_version`, `speaker_id`, `speaker_name`, `speaker_role`, `target_id`, `quote_text`, `claim_text`, `claim_stance`, `story_cluster_id`, `role_weight` (LEAP wᵢ ∈ [0.05,1.5]), `extraction_confidence`, `frozen_pre_kickoff`, `supersedes`, `correction_of`, `calibration_state`, `trust_direction`, `merged_provenance`, `dedup_of`.

## 2. Extractor plugin framework

`extractors/base.py`: `TrustExtractor` ABC (pure function of `(item, ctx)` — no network, no clock), `RawSignal`, `ExtractionContext`, `InputKind` (X_POST / TRANSCRIPT / VIDEO_METADATA / NEWS_WIRE_ITEM).
`extractors/__init__.py`: `REGISTRY` + `register` decorator. `extractors/discover.py`: importlib scan (INFERENCE — no corpus source specifies a plugin mechanism).
`extractors/pipeline.py::run_extractors`: fail-loud contract — every RawSignal carries `source_url` **or** `provenance_gap` (else `ValueError`); closed-enum validation (unknown raises, never coerces); pipeline-side entity resolution via sibling `entities` (unresolved → `data_gap`, never guessed); pipeline stamps extractor name/version, computes `signal_id = sha1(handle, post_id|quote_hash, signal_type, schema_version)`, writes to the **shared** `IntakeStore`. No second store.

**v1 extractors** (per-account templates per news-social §3.4): `XMysportsupdateExtractor` (INJURY, ROLE_INCREASE/DECREASE), `XThrowthedamballExtractor` (SCHEME OL-chart data), `XTheWaldmanExtractor` (EXPERT_DISAGREEMENT, PROJECTION_DIVERGENCE), `XDougClawsonExtractor` (HISTORICAL_COMP base-rate notes), `XShauncoreExtractor` (SCHEME), `XMATTBarloweExtractor` (**PARKED** — defined, unregistered, PENDING_VERIFICATION per sibling sources.py), `TranscriptQuoteMiner` (TRUST_UP/DOWN, FRUSTRATION, PRAISE_UNPROMPTED; roster/coach entity mention + stance lexicons + quote windows; unprompted-praise detector is an INFERENCE heuristic), `ClipMetadataHarvester` (VIDEO_METADATA → TRUST_QUOTE; entity-keyed time-windowed sweep metadata — **this is what would have caught the Rodgers–Metcalf video**; the miss was discovery/triage, not CV).

## 3. Story clustering + quote-hash merger

`clustering.py`: sklearn TF-IDF + cosine near-dup, Jaccard on normalized quotes → `story_cluster_id`; one representative per cluster into the aggregator (LEAP dependency-clustering: removing it drove ECE 0.088→0.158).
`merge.py`: `quote_hash = sha1(normalize(quote_text)+speaker_id+target_id)` — same quote via TEXT+VIDEO → one canonical row: keep earliest `signal_id`, union `merged_provenance`, max `extraction_confidence`, loser gets `dedup_of`. Idempotent (re-run is a no-op).
**r19 enforcement:** agreement is τ-weighted direction HHI, **never source counts**; `CLEAR` requires ≥2 story clusters (one cluster, however many quote-posts, is one voice).

## 4. Tempered Bayesian trust aggregator (corpus vs INFERENCE split)

**Corpus-backed:** posterior `P(θ|E)∝P₀(θ)∏Pᵢ(eᵢ|θ)`; `τ_post=τ0+ηΣτᵢ`; `wᵢ∈[0.05,1.5]` (PROVENANCE-GAP pinned 0.05); >4σ outlier rule; one-representative-per-story; LOO `Δⱼ=μ_post−μ_post^(−j)`; per-source reliability concept (BoRaEM; v1 = sibling TIER_PRIORS×TipsterBoard EMA); τᵢ = served_weight × role_weight (sibling served_weight = magnitude × freshness_decay × tipster_weight).
**INFERENCE (all in `AGG_DEFAULTS`, printed in logs):** μ0=0, τ0=1.0; direction→μ mapping (UP/PRAISE_UNPROMPTED +1, DOWN/FRUSTRATION −1, NEUTRAL 0; magnitude as strength); η=0.5 for SOCIAL-origin; outlier shrink 0.25 (paper rejects outright — documented deviation); consensus_hhi CLEAR threshold 0.8; n≥3 for bayesian trust_path; ŵ>0.05 promotion threshold. `NEWS_CONFLICT` items don't enter the mean — they set group CONFLICT and land in sweep conflicts. `ROLE_INCREASE/DECREASE` scored on a separate `role_delta` axis (Goedert 27.1% vs 18.8% is the empirical anchor).
**Expert consensus concentration (INFERENCE metric):** `consensus_hhi = Σ share_s²` over τ-weighted {positive,negative,neutral} — same math as target HHI, different object. Do not conflate.

## 5. Checklist sweep (spec §5, T2 verbatim)

`checklist.py::sweep_trust_signals(team, week, season, provider, scorer)` → `TrustSweep`: no signals → `DATA-GAP` (never `UNCHECKED` at L3+); conflicting clusters → `CONFLICT`; aligned multi-cluster experts → `CLEAR`; single-cluster only → `NOTHING-MATERIAL`; `worst_plausible_assumption` recorded on DATA-GAP when load-bearing. This is what the reasoning layer's `validate_checklist` calls for the trust_signals track.

## 6. Ranked build list (evidence × cost)

| ID | Build | Cost | Test |
|---|---|---|---|
| B1 | Schema extension + shared-store write + merger | S | Same Rodgers quote as TEXT+VIDEO → one canonical row, provenance union, `dedup_of` on loser; merger idempotent |
| B2 | Extractor plugin framework (fail-loud contract) | S | No-URL-no-gap raises; unknown enum raises; unresolved speaker → `data_gap` |
| B3 | Six-account X extractors (Barlowe parked) | M | Replay stored registry items → mysportsupdate injury → INJURY; Waldman sim-vs-line → EXPERT_DISAGREEMENT; Fortgang chart → SCHEME |
| B4 | Transcript quote-miner | M | 50-quote fixture baseline (precision/recall per direction, recorded not gated); Rodgers–Metcalf quote → FRUSTRATION, speaker Rodgers, target Metcalf |
| B5 | Story clustering + cross-module dedup | S–M | Kamara triple-source → 1 cluster; Flowers dispute → 2 clusters + NEWS_CONFLICT |
| B6 | Tempered Bayesian aggregator + LOO audit | M | ΣΔⱼ identity within 1e-9; gap item moves μ_post <0.01; outlier shrunk; τ-doubling shrinks width; single-source weak-link flag |
| B7 | Checklist sweep (T2 verbatim) | S | Zero signals → DATA-GAP + worst_plausible_assumption; Flowers fixture → CONFLICT naming both clusters |
| B8 | Clip harvester metadata half (frame decode v1.5) | M | Sweep plan covers every (entity, window) cell; byte-identical metadata dedupes |

## 7. v1 / v2 split

**v1:** stdlib+numpy+pandas+sklearn. B1–B7 + B8-metadata-half. No network inside extractors; no GPU; no model weights. No face recognition / speaker ID (biometric policy decision owed first). Standing video rule: real footage only, 2–4s transformative clips. NGS internal-only doctrine untouched.
**v2 (flagged, not built):** ASR+diarization; sports-tuned transformer stance classifier; acoustic affect features; LEAP per-item LLM likelihood elicitation (~2× tokens/item); BoRaEM joint EM; per-tier meta-calibration; the validation battery (0440 NFL-port, 0670 ŵ, 1556 γ=0.5); live X feed (#1 hard block — needs an X-accessible environment, not more code); profile-anchored prior (Track 1 HHI as μ0).
**Explicitly NOT v2:** expecting LEAP's paper-domain gains on NFL {cover}; bulk fan-sentiment per-item elicitation; frame-level affect on press conferences.

## 8. Sibling interface contract (c05 acceptance items)

1. Accept §1 field additions with defaults; add `SignalOrigin.SOCIAL`; extend `SignalType`; extend `provider._dict_to_signal` (all additive, old rows unchanged). 2. Populate `quote_text` when a signal carries a verbatim quote (one-line split in `process_item`). 3. `observed_at` stays UTC ISO (already true). 4. Shared `IntakeStore` only — no second store. 5. Beat-vector seam: `build_beat_vector(..., trust_scorer=None)` — bayesian `trust_score` replaces heuristic component only when n_items≥3; `trust_path` field records which path; default behavior unchanged.

## 9. Definition of done

- [ ] §1 extensions landed, `_dict_to_signal` round-trips c06 rows
- [ ] B2 framework + B3 extractors (Barlowe parked) + B4 miner + B8 metadata half registered and discoverable; every signal carries extractor name/version + provenance
- [ ] B5 clustering + merger idempotent; Kamara→1 cluster, Flowers→2 clusters + NEWS_CONFLICT
- [ ] B6 passes all five identity tests; AGG_DEFAULTS printed; no agreement-by-source-counting (r19)
- [ ] B7 implements T2 verbatim
- [ ] All scores `shadow=True`, `calibration_state="UNCALIBRATED"`, heuristics `verification=INFERENCE`
- [ ] No second store. No face recognition. No guessed entities. No invented post content.

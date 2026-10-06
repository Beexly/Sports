# Buildable Systems — trust-signals/ video/social EXTRACTION+SCORING framework (c06)

**Analyst:** subagent (c06 slice analyst) · 2026-10-02
**Build target:** `~/workspace/gse-intelligence-build/trust-signals/` — the video/social extraction+scoring framework that pairs with the sibling text/news intake module.
**Method:** c06-map + reasoning-depth-spec (§5, §6, §8) + x-intake-registry + TNF Track 3 spec + the two sibling analyses (video-cv-methods.md, news-social-methods.md) + trust-signal grep of all 300 c06 briefs + read of the **already-built sibling code** (`models.py`, `entities.py`, `store.py`, `provider.py`, `pipeline.py`, `contracts/integration-contracts.md`).

## The one structural fact that shapes everything

The sibling module (c05) is **already built and landed** in `~/workspace/gse-intelligence-build/trust-signals/`: frozen `TrustSignal` dataclass, `IntakeStore` (JSONL, two-key dedup), deterministic entity resolution, `FileStoreTrustSignalProvider.get_trust_signals(team, week, season)`, `build_beat_vector()` (with a `trust_dynamics` field), and a README coordination note that says verbatim: *"c06 (video/social): write `TrustSignal`s with `signal_origin=VIDEO` into the same store format; `get_trust_signals` serves them alongside text signals. **Do not create a second store.**"*

So this document does **not** redesign the schema from scratch. It specifies:
1. the **extension delta** the shared `TrustSignal` needs for trust-dynamics scoring (new fields with defaults, new enum members — backward-compatible),
2. the **extractor plugin framework** (c06's actual new build surface),
3. the **scoring/aggregation layer** (LEAP-adapted tempered Bayes — the corpus-backed core),
4. the **sibling interface contract** against the real code (not a sketch),
5. a ranked build list with explicit tests,
6. the v1/v2 split.

Every claim about what the corpus supports carries a citation. Everything else is marked **INFERENCE**.

---

## 1. TrustSignal schema — full field spec

### 1.1 Adopted verbatim from the sibling (`models.py`)

These fields exist, are tested, and are the shared schema. c06 video/social extractors **must** fill them; nothing here changes.

| Field | Type | Semantics |
|---|---|---|
| `signal_id` | `str` | Content-addressed: `sha1(source, post_id/text, type)` |
| `team` | `str \| None` | 3-letter code; `None` + `data_gap` if unresolvable — never a guess |
| `player_id` | `str \| None` | Canonical roster ID of the **target** (the player talked about). Join key to qb-behavioral profiles |
| `player_name` | `str \| None` | Display name of target |
| `signal_type` | `SignalType` | Closed enum (see §1.2) |
| `signal_origin` | `SignalOrigin` | `TEXT` / `VIDEO` / `NEWS_WIRE` (+ proposed `SOCIAL`, §1.2) |
| `text` | `str` | Extractor-supplied text; for c06 this is contextualized (who said what, where) |
| `source_handle` | `str` | e.g. `"@mysportsupdate"`, `"press-conference:cle"`, `"podcast:<show>"` |
| `source_url` | `str \| None` | Required unless `provenance_gap` is set (registry rule, enforced by `store.write_landing`) |
| `observed_at` | `datetime` | When the content was published (UTC) |
| `verification` | `Verification` | `CORPUS` / `COMPUTED` / `SINGLE_SOURCE` / `INFERENCE` (spec §6.2) |
| `track_tags` | `tuple[TrackTag, ...]` | Includes `TRUST_SIGNAL` for this lane |
| `polarity` | `float` | −1..1 (sibling: INFERENCE heuristic) |
| `magnitude` | `float` | 0..1 (sibling: INFERENCE heuristic) |
| `provenance_gap` | `str \| None` | Set when content is inferred/unverifiable — e.g. the 403'd @the_waldman post 2105678944465027107 (registry known-gap #1) |
| `data_gap` | `str \| None` | Set when entity resolution failed; provider **excludes** these from serving (checklist sees DATA-GAP, not a team-less signal) |
| `shadow` | `bool` | `True` until deliberate, logged promotion (sibling honesty rule) |

### 1.2 Proposed enum additions (c05 `models.py` change, versioned)

**`SignalType`** — add (existing members `INJURY`, `LINEUP`, `SCHEME`, `MOTIVATION`, `WEATHER`, `OFF_FIELD`, `TRUST_QUOTE`, `PROJECTION_DIVERGENCE`, `HISTORICAL_COMP` stay):

| New member | Value | Meaning | Corpus / program grounding |
|---|---|---|---|
| `TRUST_UP` | `"trust_up"` | Speaker expresses confidence/reliance in target | TNF program Track 3: "who the QB likes" |
| `TRUST_DOWN` | `"trust_down"` | Speaker expresses doubt/loss of confidence | TNF program Track 3: Rodgers–Metcalf "this mfer sucks ass" |
| `FRUSTRATION` | `"frustration"` | Speaker frustrated *with* target (distinct from doubt: heat, not evaluation) | Program doc: "who he's frustrated with" |
| `PRAISE_UNPROMPTED` | `"praise_unprompted"` | Positive mention of target **outside** a direct question about them | Program doc: "which young players are getting praised unprompted" — the Roman Wilson case (Garrett's read: usage 3-5-7 + trust-circle process of elimination) |
| `ROLE_INCREASE` | `"role_increase"` | Evidence target's role is growing | d04: Saquon route collapse treated as role change (inverse); DeVonta 31% TPRR in Brown's absence |
| `ROLE_DECREASE` | `"role_decrease"` | Evidence target's role is shrinking | d04: Saquon routes 8 vs 14.5/game 2025 |
| `EXPERT_DISAGREEMENT` | `"expert_disagreement"` | Expert model diverges from market line | news-social §3.4: @the_waldman sims vs Vegas prop lines — "exactly the registry's TRUST-SIGNAL note" |
| `NEWS_CONFLICT` | `"news_conflict"` | Two+ sources disagree on a factual claim | c06 briefs: Zay Flowers status dispute (practice-return vs 4for4 sits), Irving stat-line conflict (d24) |
| `RETRACTION` | `"retraction"` | A prior signal is withdrawn/corrected | r16 signal-ledger: corrections are new entries, never edits |

Relationship to `TRUST_QUOTE` (existing): `TRUST_QUOTE` = the sibling text lane's raw quote capture (uninterpreted). The new direction enums = c06's *interpreted* trust-dynamics classification. Rule: a video/social extractor emits the direction enum; it may additionally emit a `TRUST_QUOTE` row carrying the verbatim quote when the quote itself is the evidence (the video-cv P3 rule: "emit the raw quote so a human can judge, never just the score").

**`SignalOrigin`** — add `SOCIAL = "social"`. Rationale: the task's source-type split is video/social/text, and the sibling README already reserves `VIDEO` for "c06's video/social extraction framework" — conflating X posts with video provenance muddies the audit trail. Backward compatible: `provider._dict_to_signal` defaults missing origin to `TEXT`, so old rows still load.

**`TrustDirection`** (new closed enum, c06-owned) — the interpreted stance of the signal on the speaker→target trust axis: `TRUST_UP | TRUST_DOWN | FRUSTRATION | PRAISE_UNPROMPTED | NEUTRAL | CONFLICT | UNKNOWN`. Stored on the signal as `trust_direction`. Distinct from `polarity` (−1..1 heuristic): direction is categorical and auditable; polarity stays the sibling's numeric.

### 1.3 Proposed new fields on `TrustSignal` (all defaulted — frozen-dataclass compatible)

| Field | Type | Default | Purpose |
|---|---|---|---|
| `speaker_id` | `str \| None` | `None` | Canonical ID of the **speaker** (QB/coach/analyst). EntityRef per the r16 entity-graph proposal (`{entity_type, entity_id, display_name, source_tier}`); the pair (speaker, target) is the trust edge |
| `speaker_name` | `str \| None` | `None` | Display name |
| `speaker_role` | `str \| None` | `None` | Closed: `QB \| RB \| WR \| TE \| HC \| OC \| DC \| BEAT \| ANALYST \| WIRE` (**INFERENCE** taxonomy; no corpus source defines it) |
| `trust_direction` | `TrustDirection` | `UNKNOWN` | §1.2 |
| `quote_text` | `str \| None` | `None` | Verbatim excerpt (video-cv P3: the human-judgment surface) |
| `claim_text` | `str \| None` | `None` | The explicit claim the signal bears on, e.g. `"wilson is in rodgers' trust circle"` — the unit `claim_stance` is relative to |
| `claim_stance` | `str \| None` | `None` | Closed: `SUPPORTS \| REFUTES \| NEUTRAL \| AMBIGUOUS` (news-social §3.4 — **taxonomy greenfield**, method corpus-backed via LEAP) |
| `story_cluster_id` | `str \| None` | `None` | Story-level cluster (one Schefter tweet → 500 quote-posts = one cluster). LEAP dependency-clustering analog (0440) |
| `role_weight` | `float` | `1.0` | LEAP `w_i ∈ [0.05, 1.5]` (0440, verified). `PROVENANCE-GAP` items pinned to `0.05` (news-social §4 rule) |
| `extraction_confidence` | `float` | `0.0` | Extractor self-report 0..1. Distinct from `verification`: a confident extraction of a single-source rumor is `SINGLE_SOURCE` with confidence 0.9 |
| `frozen_pre_kickoff` | `bool` | `False` | `observed_at` < kickoff for the (team, week) game. Computed at merge from the kickoff table. Temporal-discipline rule from news-social §5.7 (0841's missing time-ordered split is the failure to avoid) |
| `status` | `str` | `"ACTIVE"` | Closed: `ACTIVE \| SUPERSEDED \| RETRACTED \| DISPUTED` (r16 signal-ledger lifecycle) |
| `supersedes` | `tuple[str, ...]` | `()` | Signal IDs this row replaces (append-only corrections — r16) |
| `correction_of` | `str \| None` | `None` | The corrected signal's ID (e.g. when the @the_waldman 403 post is re-fetched and its INFERENCE content is replaced) |
| `dedup_of` | `str \| None` | `None` | Canonical signal ID when this row was merged as a duplicate |
| `merged_provenance` | `tuple[str, ...]` | `()` | All source URLs merged into the canonical row (quote-hash dedup, §4) |
| `calibration_state` | `str` | `"UNCALIBRATED"` | Closed: `UNCALIBRATED \| CALIBRATING \| CALIBRATED`. **Honest labeling**: v1 trust scores are triage indices, never probabilities, until the §3 gates pass |
| `extractor_name` / `extractor_version` | `str` | `""` / `"0.0.0"` | Provenance: which extractor, which version (video-cv P1 record spec) |

`schema_version: str = "1.1.0"` on the dataclass. Migration note: sibling tests pinning the frozen shape must be updated; old JSONL rows load with defaults.

### 1.4 The aggregated output: `TrustScore` (new, c06-owned, `scoring.py`)

Per (speaker_id, target_id, team, week, season) — the task's "one QB-WR pair" unit, generalized to any speaker→target edge:

```python
@dataclass(frozen=True)
class TrustScore:
    score_id: str                 # sha1(speaker_id, target_id, team, week, season, schema_version)
    speaker_id: str; target_id: str
    team: str; week: int; season: int
    trust_score: float            # [-1, 1]; + = trust/confidence, - = distrust/frustration
    role_delta: float             # [-1, 1]; separate axis: role growing (+) / shrinking (-)
    precision_tau: float          # posterior precision; width = 1/sqrt(tau)
    n_items: int; n_clusters: int
    consensus_hhi: float          # INFERENCE metric, §3.4
    direction_counts: dict[str, int]
    item_contributions: tuple[tuple[str, float, str | None], ...]
        # (signal_id, loo_delta_j, source_url|PROVENANCE-GAP) — the audit receipt (0440 LOO)
    prior_mu: float; prior_tau: float; temper_eta: float
    verification: Verification = Verification.COMPUTED
    calibration_state: str = "UNCALIBRATED"
    shadow: bool = True
```

### 1.5 The checklist sweep output (spec §5, T2)

```python
@dataclass(frozen=True)
class TrustSweep:
    team: str; week: int; season: int
    verdict: ChecklistVerdict      # CLEAR | NOTHING-MATERIAL | DATA-GAP | CONFLICT | UNCHECKED
    n_signals: int; n_scores: int
    top_scores: tuple[TrustScore, ...]       # by |trust_score| * precision, max 5
    conflicts: tuple[str, ...]               # story_cluster_ids with CONFLICT direction
    data_gap_note: str | None                # set when verdict == DATA-GAP
    worst_plausible_assumption: str | None   # set when verdict == DATA-GAP and track is load-bearing (T2)
```

`UNCHECKED` is valid only below L3 (spec §6.3). The sweep **never** returns `UNCHECKED` at L3+ — no data means `DATA-GAP`, per T2.

---

## 2. Extractor plugin interface

### 2.1 Core ABC (`extractors/base.py`, new c06 code)

```python
from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import ClassVar

class InputKind(str, Enum):
    X_POST = "x_post"                 # one RawItem from an X account
    TRANSCRIPT = "transcript"         # press-conference / podcast transcript text
    VIDEO_METADATA = "video_metadata" # title/description/uploader/timestamps (no frame CV in v1)
    NEWS_WIRE_ITEM = "news_wire_item" # sibling RawItem passthrough for re-extraction

@dataclass(frozen=True)
class ExtractionContext:
    roster: dict[str, str]            # normalized player name -> player_id (caller-supplied)
    coach_roster: dict[str, str]      # normalized coach name -> coach_id
    team: str | None                 # team scope of the sweep, if any
    week: int; season: int
    kickoff_at: datetime | None      # for frozen_pre_kickoff computation
    schema_version: str = "1.1.0"

@dataclass
class RawSignal:
    """What an extractor may emit. The pipeline fills: signal_id, role_weight
    (from source tier), story_cluster_id, frozen_pre_kickoff, extractor stamp."""
    signal_type: SignalType            # closed enum — unknown values fail loud
    trust_direction: TrustDirection = TrustDirection.UNKNOWN
    speaker_name: str | None = None
    target_name: str | None = None     # resolved by pipeline via entities.resolve_player
    speaker_role: str | None = None
    text: str = ""
    quote_text: str | None = None
    claim_text: str | None = None
    claim_stance: str | None = None
    source_url: str | None = None
    provenance_gap: str | None = None  # REQUIRED if source_url is None — else rejected
    observed_at: datetime | None = None
    track_tags: tuple = ()
    polarity: float = 0.0
    magnitude: float = 0.0
    extraction_confidence: float = 0.0
    verification: Verification = Verification.INFERENCE

class TrustExtractor(ABC):
    name: ClassVar[str]                          # e.g. "x_mysportsupdate"
    version: ClassVar[str]                       # semver; bumped on any logic change
    input_kinds: ClassVar[frozenset[InputKind]]   # declared inputs
    emits_origin: ClassVar[SignalOrigin]         # VIDEO or SOCIAL (c06 lanes)

    @abstractmethod
    def extract(self, item: RawItem, ctx: ExtractionContext) -> list[RawSignal]: ...
```

**Contract rules (enforced by `extractors/pipeline.py::run_extractors`, fail-loud):**
1. Every `RawSignal` must carry `source_url` **or** `provenance_gap` — else `ValueError` (the registry provenance rule, same as sibling `write_landing`).
2. `signal_type`, `trust_direction`, `claim_stance`, `speaker_role` validated against closed enums — unknown values raise, never coerce.
3. The pipeline (not the extractor) resolves `speaker_name`/`target_name` → IDs via the sibling's `entities.resolve_player` / `normalize_name` (**import, don't copy** — §4). Unresolved → `data_gap` on the signal, exactly the sibling rule ("never guesses").
4. The pipeline stamps `extractor_name`/`extractor_version`, computes `signal_id` = `sha1(handle, post_id|quote_hash, signal_type, schema_version)`, and writes to the **shared** `IntakeStore` (§4).
5. Extractors are pure functions of `(item, ctx)` — no network, no clock. The fetch boundary is the sibling's `SourceFetcher`; c06 extractors consume `RawItem`s.

### 2.2 Registration / discovery

```python
# extractors/__init__.py
REGISTRY: dict[str, type[TrustExtractor]] = {}

def register(cls: type[TrustExtractor]) -> type[TrustExtractor]:
    assert cls.name and cls.version and cls.input_kinds
    REGISTRY[cls.name] = cls
    return cls
```

Discovery: `extractors/discover.py::discover()` uses `importlib` + `pkgutil` to import every module under `extractors/`, collecting `TrustExtractor` subclasses. **INFERENCE** (no corpus source specifies a plugin mechanism; the d07 spec's "run manifests" discipline is the closest in-corpus precedent — every run logs extractor name+version).

### 2.3 The v1 extractor set (concrete classes)

| Class | Input | Emits | Template (per news-social §3.4: each account gets its own) |
|---|---|---|---|
| `XMysportsupdateExtractor` | `X_POST` | `INJURY`, `ROLE_INCREASE/DECREASE`, `TRANSACTION`-as-`LINEUP` | Breaking transactions/injuries → event items; depth-chart move language ("taking first-team reps") → `ROLE_INCREASE` |
| `XThrowthedamballExtractor` | `X_POST` | `SCHEME`, `OL`-tagged notes | OL chart numbers → structured data extraction (guard island-rate etc. as `text` + magnitude) |
| `XTheWaldmanExtractor` | `X_POST` | `EXPERT_DISAGREEMENT`, `PROJECTION_DIVERGENCE` | Sim projection vs Vegas prop line divergence → direction + magnitude of the gap |
| `XDougClawsonExtractor` | `X_POST` | `HISTORICAL_COMP` | Historical comps → base-rate prior notes (attach as `claim_text` for the scoring prior, §3) |
| `XShauncoreExtractor` | `X_POST` | `SCHEME` | All-22 officiating/formation notes → scheme items |
| `XMATTBarloweExtractor` | — | **PARKED** | `PENDING_VERIFICATION` per sibling `sources.py` — class exists but is not registered until the football lane is confirmed (registry Tier 4 rule) |
| `TranscriptQuoteMiner` | `TRANSCRIPT` | `TRUST_UP/DOWN`, `FRUSTRATION`, `PRAISE_UNPROMPTED` | video-cv P3: entity mention vs roster → stance lexicons → quote windows. Unprompted-praise detector: positive entity mention in an answer to a question *not about them* (**INFERENCE** heuristic; no corpus lexicon exists) |
| `ClipMetadataHarvester` | `VIDEO_METADATA` | `TRUST_QUOTE` (+ direction when title/description carries it) | video-cv P2: entity-keyed, time-windowed sweep metadata (title/description/uploader/posted_ts). **This is what would have caught the Rodgers–Metcalf video**: the miss was discovery/triage, not CV |

Out of scope for extractors: frame-level CV (v2), ASR (v2 — the miner assumes transcript text input per video-cv §3 P3).

---

## 3. Scoring / aggregation design

### 3.1 What the corpus supports vs what is INFERENCE

**Corpus-backed (0440 LEAP, verified numbers in news-social §1.1):**
- Posterior form `P(θ|E) ∝ P₀(θ) ∏ Pᵢ(eᵢ|θ)`; tempered conjugate update with `τ_post = τ0 + η·Στᵢ`, `η` default `1.0`.
- Role weights `wᵢ ∈ [0.05, 1.5]`; `PROVENANCE-GAP` items pinned to the `0.05` floor (news-social §4 gap rule).
- Outlier rule: items `>4` prior-σ from `μ0` get neutralized (paper rejects; we shrink — see INFERENCE below).
- Dependency clustering: **one representative per story group** (paper: removing it drove ECE 0.088→0.158).
- LOO auditability `Δⱼ = μ_post − μ_post^(−j)` per item — the provenance bridge to a published score.
- The ablation warning: **the prior carries the weight** — this layer calibrates; it cannot create signal the engine lacks. If the engine prior is a de-vigged market read (c06-map d16 verdict), the trust layer only earns weight where news precedes market pricing.

**Corpus-backed (other):**
- Per-source reliability weighting concept: BoRaEM (0530) `P(w≻l;s) = σ(β_s(r_w − r_l))`, β clipped to `[0,1]` for analysts. **The joint EM is v2**; v1 uses the sibling's built+tested `TIER_PRIORS` × `TipsterBoard` EMA as the reliability weight (marked SPEC in the sibling).
- Freshness decay `w = m·0.5^(age/half_life)` and tipster weight: sibling `decay.py` + `tipster.py`, built and tested — consumed as precision inputs, not reinvented.
- Downstream correction `γ=0.5` lagged-consensus-error (1556, MSFE ~50% cut) with the `|e_t|>3σ` skip rule — gated to post-calibration (§3.5).
- The only acceptance gate that matters: the 0670 ŵ-vs-close protocol — fit the log-opinion-pool weight of the trust-fused score vs the de-vigged close; if `ŵ≈0`, the layer adds nothing over the market. Plus slice publish floors (Brier ≤0.22, ECE ≤0.05).

**INFERENCE (explicit — no corpus source gives these numbers):**
- Prior `μ0 = 0`, `τ0 = 1.0` (neutral trust). The profile-anchored prior (Track 1 target-concentration HHI as `μ0`) is designed but unfitted — v2.
- Direction→`μ` mapping constants (§3.2 table).
- Temper `η = 0.5` for `SOCIAL`-origin items (0841 κ=0.25 / 1119 lexicon limits justify *a* discount; the 0.5 value is a guess).
- Outlier shrink factor `0.25` (paper rejects outright; shrinking is our documented deviation).
- Consensus-HHI thresholds (§3.4).
- The `ŵ > 0.05` promotion threshold (§3.5).

### 3.2 Per-item mapping → `(μᵢ, τᵢ)`

For each `ACTIVE`, non-`UNKNOWN` signal in a (speaker, target, team, week) group:

```
s_d = {"TRUST_UP": +1, "PRAISE_UNPROMPTED": +1, "TRUST_DOWN": -1,
       "FRUSTRATION": -1, "NEUTRAL": 0}[trust_direction]        # INFERENCE constants
μᵢ  = s_d * magnitude                                            # INFERENCE: magnitude as strength
τᵢ  = served_weightᵢ * role_weightᵢ
      # served_weight = magnitude × freshness_decay × tipster_weight
      #   (sibling provider.served_weight — built, tested)
      # role_weight = LEAP wᵢ ∈ [0.05, 1.5]; PROVENANCE-GAP → 0.05
```

`ROLE_INCREASE`/`ROLE_DECREASE` items are scored on the **separate** `role_delta` axis with the same machinery (`s_d = ±1`, INFERENCE) — role ≠ trust, and the c06 map's Goedert finding (27.1% vs 18.8% targets-per-route with/without Brown) is the empirical anchor for why the axis exists.

`NEWS_CONFLICT` items do not enter the mean — they set `trust_direction=CONFLICT` on the group and are reported in `TrustSweep.conflicts` (the Flowers-dispute pattern: the conflict itself is the signal).

### 3.3 Aggregation (numpy; v1)

```
1. Story-cluster first: items sharing story_cluster_id → ONE representative
   (max τᵢ; member count + member URLs recorded). LEAP dependency-clustering analog.
2. Outlier shrink: if |μᵢ − μ0| > 4·σ0 (σ0 = 1/√τ0): μᵢ ← μ0 + 0.25·(μᵢ − μ0).  # INFERENCE deviation noted above
3. Tempered conjugate update:
     τ_post = τ0 + η·Στᵢ
     μ_post = (τ0·μ0 + η·Στᵢ·μᵢ) / τ_post
     η = 1.0 default; η = 0.5 for SOCIAL-origin items                       # INFERENCE
4. trust_score = μ_post ∈ [-1, 1]; width = 1/√τ_post
5. LOO Δⱼ per item: μ_post − μ_post^(−j)   # the audit receipt; ΣΔⱼ identity is a unit test
```

Single-item groups: no shrinkage theater — `trust_score = μ₁` shrunk toward prior by the conjugate form, `n_items=1` flagged, and the sweep treats lone `SINGLE_SOURCE` items per the spec's weak-link rule (T5: flagged, breaking condition attached).

### 3.4 Expert consensus concentration (INFERENCE metric, greenfield)

The c06 map flags trust-concentration (HHI) as absent in-slice with no methodological counterpart. The defensible greenfield analog for *opinion* concentration:

```
share_s = Στᵢ(s) / Στᵢ   over s ∈ {positive, negative, neutral}
consensus_hhi = Σ_s share_s²     # 1.0 = unanimous, ~0.33 = split
```

- `consensus_hhi ≥ 0.8` (INFERENCE threshold) + `n_clusters ≥ 2` → aligned experts → sweep may return `CLEAR`.
- Low HHI + high total τ → genuine disagreement → `CONFLICT` verdict, synthesizer resolves per contracts §3 precedence (live-verified > computed > corpus > single-source > inference).
- This is **not** the Rodgers target-share HHI (Track 1, computed from nflverse) — same math, different object. Do not conflate.

### 3.5 Promotion and calibration gates (wire-first sequencing)

Per the TNF program §6 and MEMORY wire-first doctrine (research → wire → weight → calibrate → test → polish), trust scores ship with `shadow=True`, `calibration_state="UNCALIBRATED"` as **triage indices**, never probabilities, until **all** of:

1. **The 0440 NFL-port backtest gate** (ledger-specified, not yet run): 2024–2025 regular season, frozen pre-kickoff evidence per game, baseline = engine probability alone, metric = Brier + ECE on {cover}. ADOPT requires Brier improvement ≥0.010 **and** ECE ≥25% relative improvement. ADAPT-fallback: overconfidence drops ≥30% relative with accuracy preserved → adopt as calibration/audit layer only.
2. **The 0670 ŵ-vs-close protocol**: fit the engine-vs-close log-opinion-pool weight with the trust-fused score included; require `ŵ > 0.05` (INFERENCE threshold). If `ŵ≈0`, the trust layer stays SHADOW triage — it adds nothing over the close.
3. **1556 correction** (`γ=0.5`, skip after `|e_t|>3σ`) applies only after gates 1–2 pass.

Until then, the honest label on every `TrustScore` is what the sibling README already models: *"every output is INFERENCE"* until fitted.

### 3.6 The r19 lesson, enforced in code

The slice's canonical trust defect: 990 published rows labeled CONFIRMS by **source-counting**, not direction comparison. The aggregator therefore:
- never counts sources as agreement — agreement is `consensus_hhi` over τ-weighted *directions*;
- never emits an agreement/confirms field without the `item_contributions` LOO list backing it;
- the sweep's `CLEAR` verdict requires `n_clusters ≥ 2` (one story-cluster, however many quote-posts, is one voice — LEAP dependency lesson).

---

## 4. Sibling-module interface contract

The sibling (c05) owns the store, the provider, entity resolution, decay, and tipster. c06 owns extractors, story clustering, the trust aggregator, and the checklist sweep. The contract:

### 4.1 Shared store (no second store)

- c06 extractors write `TrustSignal`s (with the §1 extensions) to the **same** `IntakeStore.signals.jsonl` via `store.save_signal`, with `signal_origin=VIDEO` or `SOCIAL`.
- `FileStoreTrustSignalProvider.get_trust_signals(team, week, season)` serves c06 signals with **zero provider changes** — it reads `signals.jsonl` by team and applies `served_weight`. The `week/season` scoping is future kickoff-table filtering; c06's `frozen_pre_kickoff` flag is the v1 temporal gate.
- Sibling change required (enumerated, versioned): accept the §1.2/§1.3 field additions with defaults; add `SignalOrigin.SOCIAL`; extend `SignalType`. Old rows load unchanged.

### 4.2 Dedup keys (three levels)

| Level | Key | Owner | Rule |
|---|---|---|---|
| Post | X post ID | Sibling (`is_duplicate`) | Never re-ingest (registry rule) |
| Item | `content_hash(text, handle, day)` | Sibling | Wire items without post IDs |
| Quote | `quote_hash = sha1(normalize(quote_text) + speaker_id + target_id)` | **c06 merger** (`merge.py`) | Same quote via TEXT + VIDEO → one canonical row: keep earliest `signal_id`, union `merged_provenance`, take max `extraction_confidence`, set `dedup_of` on the loser |
| Story | `story_cluster_id` | **c06** (`clustering.py`, sklearn TF-IDF cosine + Jaccard near-dup) | One representative per cluster into the aggregator (§3.3 step 1) |

The merger runs before aggregation and after both modules' extractors have written. It is idempotent (re-running on the same store is a no-op).

### 4.3 Entity resolution (reuse, don't fork)

- c06 imports `entities.resolve_teams`, `entities.resolve_player`, `entities.normalize_name` from the sibling. The `TEAM_ALIASES` table and the "never guesses" rule are shared.
- New: speaker resolution uses the same functions against `ctx.coach_roster` / roster; unresolved speaker → `data_gap` on the signal (same rule as unresolved target).
- New: `target_id` for non-player targets (a unit, e.g. `"unit:cle-ol"`) uses the `UNRESOLVED:` prefix convention only as a last resort, always with `data_gap` set — the sibling's entities.py documents this pattern.

### 4.4 What the sibling must emit for clean merging (the checklist)

1. `TrustSignal`s with `signal_origin=TEXT` continue unchanged; c06's merger keys on `quote_hash` — so the sibling should populate `quote_text` when the signal carries a verbatim quote (currently the quote lives in `text`; a one-line split in `process_item`).
2. `observed_at` stays UTC ISO; c06 computes `frozen_pre_kickoff` from it — the sibling must not emit naive datetimes (already true: `utcnow()`).
3. `track_tags` includes `TRUST_SIGNAL` on trust-bearing items (already true via `detect_trust_dynamics`).
4. Provenance rule is symmetric: c06 items land via `store.write_landing` with the same URL-or-`provenance_gap` enforcement.

### 4.5 The scoring seam into the sibling's beat vector

`pipeline.build_beat_vector()` currently computes `trust_dynamics=comp(SignalType.TRUST_QUOTE)` (heuristic sum). The seam:

```python
# c06 scoring.py
def aggregate_trust(signals: list[TrustSignal], eta_default=1.0) -> list[TrustScore]: ...

# sibling pipeline.py (additive, optional param — no behavior change by default)
def build_beat_vector(team, season, week, signals, trust_scorer=None):
    ...
    trust_dynamics = (trust_scorer(signals_for_pair_groups)[...]  # when provided and n_items>=3
                      if trust_scorer else comp(SignalType.TRUST_QUOTE))
```

Rule: the Bayesian `trust_score` replaces the heuristic component only for (speaker, target) groups with `n_items ≥ 3`; otherwise the heuristic stands and the group is flagged `single_or_pair_source`. Which path was used is recorded on the `BeatVector` (new field `trust_path: str = "heuristic" | "bayesian"` — **INFERENCE** threshold `n≥3`).

### 4.6 Contract tests (both sides run these)

- **Fixture exchange**: a shared fixture dir `tests/fixtures/trust_exchange/` with 12 hand-built items (TEXT quote, VIDEO metadata, SOCIAL posts incl. the Kamara triple-source and Flowers dispute). Both modules' test suites assert: merger yields canonical rows, provenance union complete, no dupes, `story_cluster_id` assigned.
- **Shape test**: every `TrustSignal` written by c06 deserializes through the sibling's `provider._dict_to_signal` without error.
- **T2 test** (§5, B7): the sweep on a team with zero signals returns `DATA-GAP`.

---

## 5. Ranked build list (evidence × cost)

Ordered by (corpus evidence strength × expected value) / build cost. Each ships with its test.

### B1 — Schema extension + shared-store write path + merger — COST S
**What:** implement §1.2/§1.3 (enum members, defaulted fields, `schema_version="1.1.0"`), `merge.py` (quote-hash dedup + provenance union), idempotent re-run.
**Corpus:** r16 entity-graph `EntityRef` (schema-bearing proposal); r16 signal-ledger append-only corrections; registry provenance rule; video-cv P1 record spec.
**Test:** `test_merge_quote_hash` — the same Rodgers quote ingested as TEXT (sibling) and VIDEO (c06 harvester) → one canonical row, `merged_provenance` has both URLs, loser has `dedup_of` set; re-running the merger changes nothing.

### B2 — Extractor plugin framework — COST S
**What:** `extractors/base.py` (ABC, `RawSignal`, `ExtractionContext`, closed-enum validation), `extractors/__init__.py` (`REGISTRY` + `register`), `extractors/discover.py` (importlib scan), `extractors/pipeline.py::run_extractors` (fail-loud provenance/enum checks, pipeline-side entity resolution, `signal_id` computation, shared-store write).
**Corpus:** video-cv P1/P2 — the d07 spec's pipeline discipline (deterministic runs, fail-loud QC gates, run manifests with extractor name+version). **INFERENCE:** the plugin mechanism itself (no corpus source specifies one).
**Test:** `test_extractor_contract` — register a dummy extractor; assert a `RawSignal` with no URL and no `provenance_gap` raises `ValueError`; assert an unknown `signal_type` string raises; assert unresolved speaker → `data_gap` set, not guessed.

### B3 — Six-account X extractors — COST M
**What:** the §2.3 extractor classes with per-account templates; `@matt_barlowe` present but unregistered (`PENDING_VERIFICATION`).
**Corpus:** x-intake-registry (6 accounts, lanes, priority tiers — verified); news-social §3.4 (each account its own elicitation template — "a single generic 'classify this tweet' prompt will not capture a guard island-rate chart vs a prop-line disagreement"); 0841 collection protocol (72h pre-game window, nickname-collision filtering) for bulk fallback.
**Test:** `test_account_templates` — replay the stored registry item files (`intake/items/<handle>/`) → assert `@mysportsupdate` injury post yields `INJURY`; a Waldman sim-vs-line post yields `EXPERT_DISAGREEMENT`; Fortgang chart post yields `SCHEME` with numeric `text`. **Hard-block note:** X direct fetch is blocked from this environment and mirrors are failing (registry known-gaps) — extractors consume stored `RawItem`s; the live feed is v2/out-of-band.

### B4 — Transcript quote-miner — COST M
**What:** `TranscriptQuoteMiner`: roster/coach entity mention (exact + fuzzy via sibling `normalize_name`), stance lexicons (criticism/praise/hedge/redirect), quote windows around mentions, unprompted-praise detector (positive mention outside a direct question about the entity — **INFERENCE** heuristic).
**Corpus:** d06 (coverage-conditional QB tendencies mined from episode transcripts — "the corpus itself votes transcript-first"); 0359 labeling-factory pattern (taxonomy → annotation → human-in-the-loop) as the calibration path; video-cv P3 honest limit (lexicons are brittle on sarcasm/coach-speak — triage tool, not publish-ready).
**Test:** `test_quote_miner_baseline` — 50 hand-labeled press-conference quotes (fixture) → report precision/recall per direction; recorded as a baseline, **not** a gate (no corpus threshold exists). The Rodgers–Metcalf quote ("this mfer sucks ass") is fixture #1 → must yield `FRUSTRATION`, speaker Rodgers, target Metcalf.

### B5 — Story clustering + cross-module dedup — COST S–M
**What:** `clustering.py`: sklearn `TfidfVectorizer` + cosine near-dup, Jaccard on normalized quotes, `story_cluster_id` assignment; one-representative-per-cluster selection (max τ).
**Corpus:** LEAP dependency clustering (0440 — removing it drove ECE 0.088→0.158, the strongest ablation after the prior); registry post-ID dedup rule.
**Test:** `test_story_clustering` — Kamara triple-source fixture (Saints Wire/Heavy.com/SI, d24 brief) → 1 cluster, 1 representative; Flowers dispute fixture (practice-return vs 4for4-sits) → 2 clusters + a `NEWS_CONFLICT` signal; Swift 35.4-vs-32.4 score conflict → resolved as range note, not a point (d24 precedent).

### B6 — Tempered Bayesian trust aggregator + LOO audit — COST M
**What:** `scoring.py`: §3.2 mapping → §3.3 aggregation (numpy), `TrustScore` emission, per-item `Δⱼ`, `consensus_hhi`, `role_delta` axis.
**Corpus:** LEAP mechanism (0440: tempered conjugate update, `wᵢ∈[0.05,1.5]`, >4σ outlier rule, LOO Δⱼ, dependency clustering); sibling `served_weight` (decay × tipster, built+tested) as τ input; BoRaEM tier-reliability concept (0530, β∈[0,1] clip); r19 anti-source-counting rule.
**Test:** `test_aggregator_identities` — synthetic 5-item group: (a) ΣΔⱼ ≈ `μ_post − μ_prior` within 1e-9 (LOO identity); (b) a `PROVENANCE-GAP` item (`wᵢ=0.05`) moves `μ_post` by < 0.01; (c) an outlier item (`|μᵢ−μ0|>4σ0`) is shrunk, not dominant; (d) monotonicity: doubling all τᵢ shrinks width; (e) single-`SINGLE_SOURCE` group carries the weak-link flag. All INFERENCE constants (`μ0=0, τ0=1, η_social=0.5, shrink 0.25`) live in one `AGG_DEFAULTS` dict, printed in every test log.

### B7 — Checklist sweep + verdict emitter (T2) — COST S
**What:** `checklist.py::sweep_trust_signals(team, week, season, provider, scorer)` → `TrustSweep` (§1.5); verdict logic: no signals → `DATA-GAP`; conflicting clusters → `CONFLICT`; aligned multi-cluster experts → `CLEAR`; single-cluster only → `NOTHING-MATERIAL` (checked, thin); never `UNCHECKED` at L3+.
**Corpus:** reasoning-depth-spec §5 (mandatory track, verdict enum, gate rules) and §8 T2; contracts §3 (precedence, DATA-GAP handling).
**Test:** `test_t2_data_gap` — **verbatim T2**: team with no signals → verdict is `DATA-GAP` (not `UNCHECKED`, not silent), `worst_plausible_assumption` recorded (e.g. *"assume neutral-to-negative trust; adversary treats QB-WR trust as unknown-negative"*), and the string appears in the emitted sweep dict. Plus `test_conflict_verdict`: Flowers-dispute fixture → `CONFLICT` with the two `story_cluster_id`s named.

### (Stretch) B8 — Clip ingest + entity-keyed sweep scheduler — COST M
**What:** `harvest.py`: scheduled sweep keyed on roster entities × pre-kickoff time windows; metadata harvest (title/description/uploader/posted_ts) via platform APIs (`urllib`+`json`, stdlib); 64-bit dHash perceptual dedupe on downsampled frames (**INFERENCE**: frame decode needs `imageio-ffmpeg` or PIL+ffmpeg — one allowed extra dep, or defer frames to v1.5); shot boundaries by frame-difference histogram (numpy) per video-cv P2.
**Corpus:** video-cv P2 (deterministic frame sampling pattern from the d07 spec, fail-loud QC); the Rodgers–Metcalf miss as the motivating regression test (entity-keyed sweep would have caught it — the miss was discovery, not CV).
**Test:** `test_sweep_coverage` — given a fixture entity list + window, the scheduler emits a sweep plan covering every (entity, window) cell; given two byte-identical clip metadata payloads, dHash dedupes to one item.

---

## 6. v1 / v2 split

### v1 — stdlib + numpy + pandas + sklearn only (this build)
- B1–B7 + B8-metadata-half (API metadata harvest; frame decode flagged v1.5).
- All scoring constants in `AGG_DEFAULTS`, all outputs `shadow=True`, `calibration_state="UNCALIBRATED"`, every heuristic output `verification=INFERENCE` (the sibling README's honesty posture).
- No network inside extractors; no GPU; no model weights.
- Legal/privacy posture (corpus-backed): standing video rule — real footage only, 2–4s transformative clips, never standalone rips (AGENTS.md 2026-09-15, Richardson v. Townsquare Media backdrop); **no face recognition / speaker ID in v1** (video-cv P5: biometric identifiers need a policy decision first); NGS internal-only doctrine untouched (this module consumes no NGS data).

### v2 — heavy deps and model access (flagged, not built)
- **ASR + diarization** (whisper-class): transcript input for the quote-miner becomes automatic; speaker-ID fusion with face presence (policy decision required first).
- **Sports-tuned transformer stance classifier** replacing B4 lexicons (the 1119 ledger's own prescribed fix: "replace lexicon with sports-tuned transformer sentiment"; 0841's POS-bigram RF as the naive baseline to beat).
- **Acoustic affect features** (video-cv P4 second half): energy/pause/rate from the audio track.
- **LEAP per-item LLM likelihood elicitation** (0440's actual mechanism — isolated LLM calls per evidence item; needs model access; ~2× token cost per item is affordable at 6-account scale, not at firehose scale per news-social §2).
- **BoRaEM joint EM** per-source reliability (0530) replacing fixed `TIER_PRIORS`; **meta-calibration** per-tier shrinkage fit on 2024 Brier (0440's beyond-paper direction).
- **The validation battery**: 2024–2025 frozen-pre-kickoff backtest (0440 NFL-port gate), 0670 ŵ-vs-close protocol, 1556 γ=0.5 correction — the three gates in §3.5 that promote scores from `UNCALIBRATED` triage to calibrated inputs.
- **Live X feed**: currently the #1 hard block (X direct fetch blocked from this environment; mirrors already 403ing — registry known-gaps #1–2). Needs an X-accessible environment (API key or Garrett's session), not more code.
- **Profile-anchored prior**: Track 1 HHI/target-concentration as `μ0` (the Rodgers template case) once the qb-behavioral pipeline lands.

### Explicitly NOT in v2 either (corpus says no)
- Expecting LEAP's paper-domain gains (ECE halved, Brier −16.5) to transfer to NFL {cover} — news-social §2 verdict: ADAPT the mechanism, do not adopt the numbers; the market is the strongest public prior (0670 ŵ=0.000).
- Bulk fan-sentiment scoring with per-item elicitation — cost error and κ=0.25-grade signal (0841/1119); expert-model disagreement is the lane.
- Frame-level affect classification on press conferences — no corpus evidence; research-grade until a labeled dataset exists (0359 labeling-factory pattern is how you'd build it).

---

## 7. Definition of done (for the coding agent)

- [ ] §1 extensions landed on the shared `TrustSignal` (backward-compatible defaults); sibling `_dict_to_signal` round-trips c06 rows.
- [ ] Extractor framework (B2) + six account extractors (B3, Barlowe parked) + quote-miner (B4) + harvester metadata half (B8) registered and discoverable; every emitted signal carries extractor name/version + provenance.
- [ ] Story clustering (B5) + merger idempotent; Kamara→1 cluster, Flowers→2 clusters + `NEWS_CONFLICT`.
- [ ] Aggregator (B6) passes all five identity tests; `AGG_DEFAULTS` printed in logs; no agreement-by-source-counting anywhere (r19).
- [ ] Sweep (B7) implements T2 verbatim; `sweep_trust_signals` is what the reasoning layer's `validate_checklist` calls for the trust_signals track.
- [ ] All scores ship `shadow=True`, `calibration_state="UNCALIBRATED"`, heuristic outputs `verification=INFERENCE` — wire-first: research → wire → weight → calibrate → test → polish, and calibration gates (§3.5) are **not** jumped.
- [ ] No second store. No face recognition. No guessed entities. No invented post content (PROVENANCE-GAP or URL, enforced).

*Companion reads: `deep/c06/working/video-cv-methods.md` (why transcript-first), `deep/c06/working/news-social-methods.md` (LEAP transfer + provenance chain), `gse-intelligence-build/trust-signals/README.md` (sibling build state), `contracts/integration-contracts.md` (§1 provider ABC, §3 checklist gate).*

# ADR-0003: Galaxy Sports Institute (GSI) Cross-Domain Sports Medicine & Enterprise Decision Intelligence Expansion

## Status

Accepted (`2026-11-06`)

## Context

The mathematical, biomechanical, and causal engines built inside `Beexly/Sports` extend far beyond sports wagering. Specifically:
1. **Sports Medicine, Neurology & Biomechanics (`GSI Medical`)**: Our `BOOKS-B` (`33` clinical volumes: NASEM, NICE `NG232`/`NG211`/`NG252`, SIGN `130`, VA/DoD mTBI, Frontiers, MDPI), `REPOS-B` (`100` medical/biomechanics repositories), and `Waves 14A & 16A` quantify Acute:Chronic Workload Ratio (`ACWR`), Weibull soft-tissue return-to-play hazard (`Hamstring`, `High-Ankle Syndesmosis`, `Turf Toe`, `ACL Year-1`), CARE Consortium blood biomarker kinetics (`GFAP`, `UCH-L1`, `NfL`, `t-tau` as rule-in-only signals), KTH WHIM `MPS95` corpus callosum strain, rigid-brace proprioceptive force-transduction penalties (`-4%` to `-7%`), linemen WBGT core hyperthermia cramping hazards, and circadian SCN phase-shift reaction-time latency.
2. **Enterprise Decision & Startup Intelligence (`GSI Capital & Decision OS`)**: Our `NOFX` 4-plan conjunction gate, `Kats` BOCPD regime detector, `MAPIE` conformal intervals, `DoWhy`/`EconML` causal uplift estimators, and `121`-program non-dilutive startup grant/credit inventory (`$55,656.31` Approved across PostHog `$50,000`, Sentry `$5,000`, AWS `$300`, DigitalOcean `$250`, API-Sports, OpenRouter, Pinecone) form a general-purpose decision-under-uncertainty platform.

## Decision Drivers

* **Dual-Track Commercial & Grant Leverage**: Position `GSE` as the premier sports analytics & decision-support subscription product while positioning `GSI` for sports-medicine clinical decision support, athlete workload monitoring, and non-dilutive R&D grant programs (NSF SBIR, NIH R21/R01 translational biomechanics, cloud AI startup credits).
* **Unified Codebase Without Fork Drift**: Keep `GSI` medical/biomechanical kernels wired directly into `Step 2 (2_health)` of the weekly reasoning cycle so both tracks compound inside one monorepo.

## Considered Options

### Option 1: Restrict Repository Scope Strictly to Consumer Sports Picks
- **Pros**: Narrow marketing focus.
- **Cons**: Leaves massive enterprise B2B, athletic-department, sports-medicine, and non-dilutive grant value untapped despite already owning the underlying biomechanics and causal inference engines.

### Option 2: Dual-Brand `GSE + GSI` Architecture Sharing the Unified 5-Track / 7-Step & Phase-Transition Core
- **Pros**: Unlocks non-dilutive startup grants (`$55,656.31` approved + `$500k+` pipeline), institutional athletic workload licensing, and medical/biomechanical research credibility while directly sharpening `Step 2 (2_health)` injury degradation curves for NFL game/prop modeling.
- **Cons**: Requires clear domain documentation and strict separation between clinical research models and consumer sports analytics copy.

## Decision

We adopt **Option 2**: Formalize the dual **Galaxy Sports Edge (`GSE`) + Galaxy Sports Institute (`GSI`)** architecture across the monorepo.

## Rationale

1. **Biomechanical Edge in NFL Modeling**: Public injury reports only list `Questionable` or `Full Participant`. GSI's tissue-specific decay curves (syndesmotic ankle cutting loss, biceps femoris high-speed running deficit, spat/brace impulse penalty) convert raw injury tags into position-specific EPA and target/carry share adjustments.
2. **Capital Efficiency**: Non-dilutive cloud and telemetry grants (`PostHog $50k`, `Sentry $5k`, cloud GPU/vector credits) fund 100% of our production observability and hybrid search infrastructure at near-zero net cash burn.

## Consequences

### Positive
- Every NFL matchup evaluation automatically executes GSI `Step 2 (2_health)` biomarker, strain, and return-to-play survival calculations.
- Grant-ready technical documentation (`Universal-Phase-Transition-Engine-GSE-Revenue-GSI-Grant-Blueprint-Theorems-4-to-8.md`) is maintained in-repo.

### Negative
- Requires strict adherence to the CARE Consortium `rule_in_only_doctrine = True` (never clearing a player on biomarker decay alone without clinical 5-stage protocol progression).

## Implementation Notes

- GSI Medical & Health Step (`Step 2`): `intelligence/reasoning/mega_sweep_2026_11_06_wiring_engine.py`
- Neuro-Biomechanics & Thermal Alpha: `docs/predictions/research/2026-11-06/XAI_32_TEAM_TACTICAL_DOSSIERS_AND_UNSEEN_ALPHA_BIBLE.md` (`WAVE_16A`)

## Related Decisions

- [ADR-0001](0001-uncompressed-ingest-and-learn-coupled-5api-omniscience.md): Uncompressed Ingest-and-Learn Doctrine
- [ADR-0006](0006-multi-channel-video-social-follower-growth-and-ad-affiliate-revenue-engine.md): Multi-Channel Video, Social & Revenue Engine

## References

- `docs/engine/research/2026-11-06/Universal-Phase-Transition-Engine-GSE-Revenue-GSI-Grant-Blueprint-Theorems-4-to-8.md`
- `data/audits/xai_omniscience_beat_coaching_medical_books_frontier_2026_11_06.json`

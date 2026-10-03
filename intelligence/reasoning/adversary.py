# Provenance:
#   - reasoning-depth-spec.md §4 L4 (adversarial: breaking-condition check,
#     correlated-thesis detection, steelman, pre-mortem), §5 (precedence
#     live-verified > computed > corpus > single-source > inference; DATA-GAP →
#     worst-plausible), §6.2/§6.3 (closed enums), §7 (adversaryReview,
#     correlatedTheses signatures), §8 T1/T4/T5 (mandatory assertions).
#   - c08 corpus: 0790-view-fusion-black-litterman.md (naive averaging of
#     correlated sources is overconfident — ICI vs inverse-variance),
#     1675-regime-dependent-factor-glasso.md (shared-factor structure must be
#     modeled, not averaged away), 1492-human-ai-selective-prediction.md
#     (adversarial review precedes publication; deferral messaging),
#     RESCUE-2026-09-26-2-verifier-port.md (gates declared pre-run).
#   - c08 Phase-2 lanes: laneC (OR/n_eff overconfidence scoring, ICI/CU/CI
#     fusion-choice rule, REJECT register R1–R9), laneD (near-miss shadow
#     metrics, would_not_claim inheritance).

"""The L4 adversarial layer: adversaryReview + correlatedTheses.

The adversary is not a tone — it is a falsification engine with the explicit
job of killing the L3 thesis, given the same data access as the specialists
(spec §7). Its four mandatory outputs (spec §4 L4):

  1. Breaking-condition check — are the thesis's falsifiers already true?
  2. Correlated-thesis detection — legs sharing a causal link are ONE thesis.
  3. The steelman — the strongest counter-argument, with numbers, not dismissed.
  4. Pre-mortem — "It is Monday and this card went 0-4. What happened?"

Deterministic by design: every number in the report comes from the trace's
observed values, declared breaking conditions, or recorded track evidence.
No LLM prose is generated here; the steelman and pre-mortem are assembled
from trace facts so they are auditable to the source.
"""

from __future__ import annotations

from collections import defaultdict

from .enums import VERIFICATION_PRECEDENCE, ChecklistVerdict, Verification
from .schemas import (
    AdversaryReport,
    BetLeg,
    CausalChain,
    ConditionResult,
    GapAssumption,
    OverconfidenceScore,
    ReasoningTrace,
    ThesisBundle,
    WeakLink,
    evaluate_condition,
)


# ---------------------------------------------------------------------------
# REJECT register — guarded negative results (deep/c08/challenges.md R1–R9).
# A link tagged with one of these mechanisms is flagged, never silently used.
# The REJECT-citation rule: any thesis contradicting a guarded negative must
# cite it by path and state why the new test differs.
# ---------------------------------------------------------------------------

REJECT_REGISTER: dict[str, str] = {
    "xfp_fpoe_rank": "R1: xFP/FPOE as next-week rank feature — preregistered FAIL (RESCUE-2026-09-26-4)",
    "radar_2609_23158": "R2: 2609.23158 skin-radar hardware — REJECT (does not count toward 750)",
    "gp_drive_form": "R3: symbolic GP drive form — DIE; linear signal survives (REPORT_BOTTLENECK.md)",
    "elo_two_factor": "R4: 0004 two-factor/rank-four extensions — H2 p≈1, adds nothing over vanilla Élő",
    "trace_norm_0004": "R4: 0004 trace-norm — 45.89% < naive baseline",
    "unpruned_local_linear": "R5: 1482 unpruned local-linear at p>T — loses to equal weights",
    "glasso_tau_zero": "R6: 1675 non-sparse (τ=0) GL variant — among the worst",
    "twcrps_unpooled": "R7: 0746 pure-twCRPS training — REJECT if body degrades >1%",
    "pressure_epa_superlative": "R8: 'pressure EPA = single most predictive split' — asserted, never measured",
    "product_ambiguity": "R9: product-ambiguity abstention — violates per-class caps (Phoneme R0=0.0551)",
}

# Near-miss band: a verifiable-but-unmet condition within this fraction of its
# threshold (on the unbroken side) is a near-miss shadow metric, not a kill.
NEAR_MISS_FRACTION = 0.15


def overconfidence_score(n_legs: int, rho_bar: float,
                         rho_source: str = "chain_overlap_estimate") -> OverconfidenceScore:
    """Score naive averaging of a correlated bundle (lane C, buildable SYS-1).

    OR = V_true/V_naive under equal variances: OR = 1 + (n−1)ρ̄.
    n_eff = n / (1 + (n−1)ρ̄).
    rho_source must be "measured", "chain_overlap_estimate", or "assumed" —
    an OR built on an assumed ρ̄ is itself an assumption, labeled as such.
    """
    if n_legs < 1:
        raise ValueError("n_legs must be ≥ 1")
    if not -1.0 <= rho_bar <= 1.0:
        raise ValueError("rho_bar must be in [-1, 1]")
    or_ratio = 1.0 + (n_legs - 1) * rho_bar
    n_eff = n_legs / (1.0 + (n_legs - 1) * rho_bar) if rho_bar > -1.0 / max(n_legs - 1, 1) else float(n_legs)
    return OverconfidenceScore(
        bundle_id="",
        n_legs=n_legs,
        rho_bar=rho_bar,
        rho_source=rho_source,
        n_eff=n_eff,
        or_ratio=or_ratio,
        note=(
            "chain-overlap ρ̄ is an INFERENCE from shared-link structure, not a "
            "measured correlation — treat n_eff as an upper bound on diversification."
            if rho_source != "measured" else ""
        ),
    )


def recommend_fusion(correlation_known: bool, common_structure_identifiable: bool,
                     has_conflict: bool) -> str:
    """Fusion-choice decision rule for the synthesizer (lane C, §3.4).

    CI when pairwise correlations are unknown/unstable; ICI when the common-
    information structure is identifiable (Channel A/B agree); CU when sources
    are mutually inconsistent. Never precision-weighting on shared-information
    sources — the paper's measured penalty is the PW Sharpe collapse.
    """
    if has_conflict:
        return "CU"  # covariance union — built for possibly-inconsistent sources
    if common_structure_identifiable:
        return "ICI"  # tighter consistent bounds via common/private split
    if correlation_known:
        return "CI"  # conservative but consistent without the common-info model
    return "CI"  # unknown/unstable correlations → CI is the safe default


# ---------------------------------------------------------------------------
# correlatedTheses — spec §4 L4 step 2, §7, §8 T4.
# ---------------------------------------------------------------------------

def correlated_theses(legs: list[BetLeg], trace: ReasoningTrace) -> list[ThesisBundle]:
    """Group legs sharing ≥1 causal link into single theses.

    Four bets that all require the same causal link are one bet with four
    receipts (spec §3: the pressure-funnel stack). A bundle is presented as
    ONE thesis with combined exposure — never as N independent edges.

    Legs with no declared causal links form singleton bundles (each its own
    thesis) — undeclared structure is not assumed to be independent; it is
    flagged in the report notes.
    """
    link_to_legs: dict[str, list[str]] = defaultdict(list)
    for leg in legs:
        for link_id in leg.causal_link_ids:
            link_to_legs[link_id].append(leg.id)

    # Union-find over legs that share links.
    parent: dict[str, str] = {}

    def find(x: str) -> str:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a: str, b: str) -> None:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb

    for leg in legs:
        parent.setdefault(leg.id, leg.id)
    for leg_ids in link_to_legs.values():
        for other in leg_ids[1:]:
            union(leg_ids[0], other)

    groups: dict[str, list[str]] = defaultdict(list)
    for leg in legs:
        groups[find(leg.id)].append(leg.id)

    leg_by_id = {leg.id: leg for leg in legs}
    bundles: list[ThesisBundle] = []
    for i, (root, leg_ids) in enumerate(sorted(groups.items())):
        shared = sorted({lid for leg_id in leg_ids for lid in leg_by_id[leg_id].causal_link_ids})
        exposure = sum(leg_by_id[leg_id].exposure for leg_id in leg_ids)
        bundles.append(
            ThesisBundle(
                id=f"thesis_{i+1:02d}",
                shared_link_ids=shared,
                leg_ids=sorted(leg_ids),
                combined_exposure=exposure,
            )
        )
    return bundles


# ---------------------------------------------------------------------------
# Breaking-condition check — spec §4 L4 step 1.
# ---------------------------------------------------------------------------

def _check_breaking_conditions(
    chains: list[CausalChain], observed: dict[str, float]
) -> tuple[list[ConditionResult], list[str]]:
    """Evaluate every declared breaking condition. Returns (results, notes)."""
    results: list[ConditionResult] = []
    notes: list[str] = []
    for chain in chains:
        for link in chain.links:
            if not link.breaking_conditions and link.load_bearing:
                notes.append(
                    f"Link {link.id} is load-bearing but declares no breaking "
                    f"condition — it cannot be falsified (violates spec §4 L3)."
                )
            for cond in link.breaking_conditions:
                results.append(evaluate_condition(cond, observed))
    for r in results:
        if not r.verifiable:
            notes.append(
                f"Breaking condition {r.condition_id} ({r.text}) is UNVERIFIABLE: "
                f"metric '{r.metric}' not in observed values. Not treated as met."
            )
    return results, notes


# ---------------------------------------------------------------------------
# Weak-link detection — spec §8 T5.
# ---------------------------------------------------------------------------

def _find_weak_links(chains: list[CausalChain]) -> list[WeakLink]:
    """Load-bearing links with INFERENCE/SINGLE_SOURCE verification."""
    weak: list[WeakLink] = []
    for chain in chains:
        for link in chain.links:
            if not link.load_bearing:
                continue
            if link.verification in (Verification.INFERENCE, Verification.SINGLE_SOURCE):
                weak.append(
                    WeakLink(
                        link_id=link.id,
                        verification=link.verification,
                        breaking_condition_present=bool(link.breaking_conditions),
                        breaking_condition_machine_checkable=bool(link.breaking_conditions),
                    )
                )
    return weak


# ---------------------------------------------------------------------------
# Steelman — spec §4 L4 step 3. The strongest counter-argument, with numbers.
# ---------------------------------------------------------------------------

def _steelman(trace: ReasoningTrace, bundles: list[ThesisBundle],
             condition_results: list[ConditionResult]) -> str:
    """Assemble the strongest counter-argument from trace facts.

    Sources, in precedence order (spec §5: live-verified > computed > corpus >
    single-source > inference):
      - met breaking conditions (observed facts that falsify the thesis),
      - CONFLICT track evidence resolved against the thesis,
      - DATA-GAP worst-plausible assumptions.
    """
    parts: list[str] = []
    met = [r for r in condition_results if r.met]
    if met:
        facts = "; ".join(
            f"{r.text} (observed {r.metric}={r.observed_value}, threshold {r.op} {r.threshold})"
            for r in met
        )
        parts.append(f"The thesis's own falsifiers are already true pre-kickoff: {facts}.")

    # Conflict evidence against the thesis, strongest verification first.
    conflicts: list[tuple[str, Verification]] = []
    for track, verdict in trace.checklist.items():
        if verdict == ChecklistVerdict.CONFLICT:
            conflicts.extend(trace.track_evidence.get(track, []))
    conflicts.sort(key=lambda e: VERIFICATION_PRECEDENCE.get(e[1], 0), reverse=True)
    if conflicts:
        ev = "; ".join(f"{text} [{ver.value}]" for text, ver in conflicts[:3])
        parts.append(f"Conflicting track evidence against the card: {ev}.")

    gaps = [t for t, v in trace.checklist.items() if v == ChecklistVerdict.DATA_GAP]
    if gaps:
        parts.append(
            "Data gaps force worst-plausible assumptions on: "
            + ", ".join(gaps)
            + " — the card's edge must survive those assumptions, and it does not get the benefit of the doubt."
        )

    multi = [b for b in bundles if len(b.leg_ids) > 1]
    if multi:
        leg_count = sum(len(b.leg_ids) for b in multi)
        parts.append(
            f"{leg_count} legs across {len(multi)} bundle(s) share causal links "
            f"({', '.join(b.shared_link_ids[0] for b in multi if b.shared_link_ids)}) — "
            "this is one thesis with multiple receipts, not diversified edge."
        )

    if not parts:
        return ("No counter-argument could be constructed from the trace: no met breaking "
                "conditions, no conflicting evidence, no data gaps, no correlated bundles. "
                "The thesis survives adversarial review on the recorded facts.")
    return " ".join(parts)


# ---------------------------------------------------------------------------
# Pre-mortem — spec §4 L4 step 4. Written before the games.
# ---------------------------------------------------------------------------

def _pre_mortem(trace: ReasoningTrace, bundles: list[ThesisBundle],
                condition_results: list[ConditionResult]) -> str:
    """'It is Monday and this card went 0-4. What happened?'"""
    leg_ids = [leg.id for leg in trace.legs]
    n = len(leg_ids)
    met = [r for r in condition_results if r.met]
    if met and bundles:
        causes = "; ".join(
            f"{r.text} held (observed {r.metric}={r.observed_value})" for r in met
        )
        links = ", ".join(sorted({lid for b in bundles for lid in b.shared_link_ids}))
        return (
            f"It is Monday and the {n}-leg card went 0-{n}. What happened: the shared "
            f"causal link(s) [{links}] never materialized — {causes}. Every leg needed "
            "the same link, so one failure mode took the whole card. The pre-kickoff "
            "data already contained the falsifiers; the card was placed anyway."
        )
    if bundles and any(len(b.leg_ids) > 1 for b in bundles):
        return (
            f"It is Monday and the {n}-leg card went 0-{n}. What happened: the legs were "
            "a single correlated thesis wearing diversification as a costume. One causal "
            "assumption failed and carried every leg with it."
        )
    return (
        f"It is Monday and the {n}-leg card went 0-{n}. What happened: no single "
        "recorded falsifier explains it — the failure mode was outside the declared "
        "breaking conditions, which means the L3 chains were missing a link. Expand the "
        "chains before the next card."
    )


# ---------------------------------------------------------------------------
# Near-miss detection — shadow metrics on near-refusals (lane D).
# A verifiable-but-unmet ordered condition within NEAR_MISS_FRACTION of its
# threshold (on the unbroken side) is recorded. Calibration reviews see what
# was nearly suppressed, not just what died.
# ---------------------------------------------------------------------------

def _find_near_misses(results: list[ConditionResult]) -> list[ConditionResult]:
    near: list[ConditionResult] = []
    for r in results:
        if not r.verifiable or r.met is not False:
            continue
        v, t = r.observed_value, r.threshold
        if r.op == "<" and v >= t and v <= t * (1 + NEAR_MISS_FRACTION):
            near.append(r)
        elif r.op == "<=" and v > t and v <= t * (1 + NEAR_MISS_FRACTION):
            near.append(r)
        elif r.op == ">" and v <= t and v >= t * (1 - NEAR_MISS_FRACTION):
            near.append(r)
        elif r.op == ">=" and v < t and v >= t * (1 - NEAR_MISS_FRACTION):
            near.append(r)
    return near


# ---------------------------------------------------------------------------
# adversaryReview — spec §7. The entry point.
# ---------------------------------------------------------------------------

def adversary_review(trace: ReasoningTrace) -> AdversaryReport:
    """Run the full L4 adversarial review over a reasoning trace.

    Read-only on the trace. Returns the AdversaryReport with the four mandatory
    outputs plus weak-link and gap-assumption machinery.
    """
    report = AdversaryReport(trace_id=trace.trace_id, breaking_conditions_met=False)

    # 1. Breaking-condition check.
    condition_results, notes = _check_breaking_conditions(trace.chains, trace.observed_values)
    report.condition_results = condition_results
    report.notes.extend(notes)
    report.breaking_conditions_met = any(r.met for r in condition_results if r.met is not None)
    report.near_misses = _find_near_misses(condition_results)

    # 1b. REJECT-register check — links tagged with guarded negative results.
    for chain in trace.chains:
        for link in chain.links:
            for tag in link.tags:
                if tag in REJECT_REGISTER:
                    report.reject_hits.append(
                        f"Link {link.id} tagged '{tag}': {REJECT_REGISTER[tag]}. "
                        "Cite the negative result and state why this use differs."
                    )

    # 2. Correlated-thesis detection.
    bundles = correlated_theses(trace.legs, trace)
    report.correlated_theses = bundles
    for bundle in bundles:
        if not bundle.shared_link_ids:
            report.notes.append(
                f"Bundle {bundle.id} ({', '.join(bundle.leg_ids)}) declares no causal "
                "links — correlation cannot be ruled out; treated as its own thesis."
            )
        # A thesis is KILLED when any breaking condition on its shared links is met.
        bundle_link_ids = set(bundle.shared_link_ids)
        killed = any(
            r.met
            for chain in trace.chains
            for link in chain.links
            if link.id in bundle_link_ids
            for r in condition_results
            if r.condition_id in {c.id for c in link.breaking_conditions} and r.met
        )
        if killed:
            verdict = "KILL"
            report.killed_thesis_ids.append(bundle.id)
        elif report.breaking_conditions_met:
            verdict = "WEAKEN"
        else:
            verdict = "SURVIVE"
        report.thesis_verdicts[bundle.id] = verdict

    # 2b. Overconfidence scoring per bundle (lane C SYS-1). Pairwise correlations
    # are not measured on the trace; rho_bar is estimated from chain overlap and
    # labeled chain_overlap_estimate (an INFERENCE, per the score note).
    for bundle in bundles:
        n = len(bundle.leg_ids)
        if n > 1:
            score = overconfidence_score(n, rho_bar=0.7)
            score.bundle_id = bundle.id
            report.overconfidence[bundle.id] = score

    # Weak links (spec §8 T5).
    report.weak_links = _find_weak_links(trace.chains)
    report.weak_link = bool(report.weak_links)
    for w in report.weak_links:
        if not w.breaking_condition_present:
            report.notes.append(
                f"Weak link {w.link_id} ({w.verification.value}) declares no breaking "
                "condition — an unfalsifiable inference is load-bearing."
            )

    # DATA-GAP → worst-plausible assumptions (spec §5 gate).
    for track, verdict in trace.checklist.items():
        if verdict == ChecklistVerdict.DATA_GAP:
            report.gap_assumptions.append(
                GapAssumption(
                    track=track,
                    assumed_value="worst-plausible for the thesis",
                    rationale=(
                        "Spec §5: DATA-GAP on a load-bearing track — the adversary "
                        "assumes the value most hostile to the recommended side and "
                        "records the assumption. The thesis must survive it."
                    ),
                )
            )

    # 3 + 4. Steelman and pre-mortem, assembled from trace facts.
    report.counter_argument = _steelman(trace, bundles, condition_results)
    report.pre_mortem = _pre_mortem(trace, bundles, condition_results)

    # 4b. would_not_claim entries (lane D, FABLE pattern) — inherited by
    # published output. A leg whose causal links are not declared anywhere in
    # the trace's chains has no declared causal structure; it cannot be
    # presented as a reasoned edge.
    declared_link_ids = {
        link.id for chain in trace.chains for link in chain.links
    }
    for leg in trace.legs:
        unknown = set(leg.causal_link_ids) - declared_link_ids
        if unknown:
            report.would_not_claim.append(
                f"{leg.id}: causal link(s) {sorted(unknown)} not declared in the "
                "trace's chains — no declared causal structure; correlation with "
                "other legs cannot be ruled out"
            )
    for hit in report.reject_hits:
        report.would_not_claim.append(f"mechanism clearance pending: {hit.split('.')[0]}")

    return report


# ---------------------------------------------------------------------------
# killed_legs — the exact input the L5 synthesizer needs: legs of killed
# theses must be EXCLUDED from any recommendation (spec §8 T1: the funnel
# stack must NOT be recommended). The synthesizer owns the recommendation;
# this function defines the contract it must honor.
# ---------------------------------------------------------------------------

def killed_legs(report: AdversaryReport) -> list[str]:
    """Leg ids belonging to KILL-verdict theses. The L5 synthesizer must not
    recommend these legs; presenting them anyway is a contract violation."""
    killed = set(report.killed_thesis_ids)
    return sorted(
        leg_id
        for bundle in report.correlated_theses
        if bundle.id in killed
        for leg_id in bundle.leg_ids
    )


__all__ = ["adversary_review", "correlated_theses", "killed_legs"]

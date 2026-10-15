"""Combine-feature reliability gate.

Encodes the entry criterion for the Combine-feature lane, extracted from four
independent BDB 2027 reliability audits (Phase 1 extraction, 2026-10-15;
see census-combine-reliability-addendum-2026-10-15.md):

  * Pratheeksh-7S/signal-before-scouting -- reliability-first framework,
    0.70 working threshold for individual-player decisions, reps-needed table,
    reliability ceiling sqrt(rel1 * rel2).
  * faith-amanze/combine-tracking-audit -- pre-registered rule: a feature
    needs rep-to-rep reliability >= 0.5 (Spearman-Brown) before it is
    analysed against game performance; MDE stated with every null.
  * vanductan-NLT/same-yardstick -- transfer must be measured on the same
    movement primitive through one identical feature function, with controls.
  * StevanHRG/nfl-big-data-bowl-2027 -- controls (draft slot, weight,
    alignment, official split) and nested out-of-class validation.

Verdicts: PASS / FAIL / UNDERPOWERED. A null at insufficient power is
UNDERPOWERED, never FAIL. Absence of evidence is never scored as falsification.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field

ANALYSIS_FLOOR = 0.50      # faith-amanze pre-registered minimum (Spearman-Brown)
DECISION_GRADE = 0.70      # Pratheeksh-7S threshold for individual decisions
REDUNDANCY_CUTOFF = 0.95   # |r| vs an existing measurement => already measured
DEFAULT_EFFECT_OF_INTEREST = 0.25  # smallest transfer effect worth claiming


@dataclass
class TransferEstimate:
    """A Combine -> game association on the SAME movement primitive."""

    effect: float
    ci_lo: float | None = None
    ci_hi: float | None = None
    p_value: float | None = None
    controlled: bool = False
    covariates: tuple[str, ...] = ()
    same_primitive: bool = True

    def ci_excludes_zero(self) -> bool | None:
        if self.ci_lo is not None and self.ci_hi is not None:
            return self.ci_lo > 0 or self.ci_hi < 0
        if self.p_value is not None:
            return self.p_value < 0.05
        return None


@dataclass
class FeatureEvidence:
    name: str
    reliability: float | None = None        # Spearman-Brown, as used (rep mean)
    reliability_basis: str | None = None    # 'single-rep' | 'rep-mean' | 'split-half'
    reliability_n: int | None = None
    transfer: TransferEstimate | None = None
    redundancy_r: float | None = None       # correlation vs an existing measurement
    redundancy_against: str | None = None
    outcome_leakage: bool = False           # feature contains its own outcome
    n: int | None = None                    # sample size for the transfer test
    mde: float | None = None                # minimum detectable effect, if stated


@dataclass
class GateVerdict:
    verdict: str                            # 'PASS' | 'FAIL' | 'UNDERPOWERED'
    flags: list[str] = field(default_factory=list)
    reasons: list[str] = field(default_factory=list)
    legs: dict = field(default_factory=dict)


def reps_needed(single_rep_reliability: float, target: float = DECISION_GRADE) -> float:
    """Reps required for a single-rep reliability to reach `target` when
    averaged (Spearman-Brown). Mirrors Pratheeksh-7S Table 1
    (0.98 -> 1, 0.56 -> 2, 0.51 -> 3, 0.34 -> 5, 0.15 -> 13); the source
    table rounds SB(13, 0.15) = 0.696 to 0.70, so a 0.005 tolerance is
    applied when searching for the smallest sufficient rep count."""
    r = single_rep_reliability
    if r <= 0:
        return math.inf
    if r >= target:
        return 1
    for k in range(2, 10000):
        if k * r / (1 + (k - 1) * r) >= target - 0.005:
            return k
    return math.inf


def evaluate(ev: FeatureEvidence, *, effect_of_interest: float = DEFAULT_EFFECT_OF_INTEREST) -> GateVerdict:
    """Run the three legs (repeatability, transfer, controls) plus the
    redundancy and leakage rules. Hard failures dominate; missing or
    insufficient evidence yields UNDERPOWERED, never FAIL."""
    hard_fail: list[str] = []
    insufficient: list[str] = []
    flags: list[str] = []
    legs: dict = {}

    # --- Construct validity: outcome leakage ---------------------------------
    if ev.outcome_leakage:
        hard_fail.append(
            "outcome leakage: the feature contains its own outcome variable; "
            "the transfer claim is invalid as constructed"
        )
        legs["construct"] = "FAIL"
    else:
        legs["construct"] = "ok"

    # --- Redundancy -----------------------------------------------------------
    if ev.redundancy_r is not None and abs(ev.redundancy_r) >= REDUNDANCY_CUTOFF:
        flags.append("REDUNDANT")
        hard_fail.append(
            f"redundant with existing measurement ({ev.redundancy_against}): "
            f"r = {ev.redundancy_r:.2f} >= {REDUNDANCY_CUTOFF}; reliable, but already measured"
        )
        legs["redundancy"] = "FAIL"
    elif ev.redundancy_r is not None:
        legs["redundancy"] = f"ok (r = {ev.redundancy_r:.2f} vs {ev.redundancy_against})"
    else:
        legs["redundancy"] = "not tested"

    # --- Leg 1: repeatability --------------------------------------------------
    if ev.reliability is None:
        insufficient.append("repeatability unmeasured: no test-retest / split-half reliability on record")
        legs["repeatability"] = "UNMEASURED"
    elif ev.reliability < ANALYSIS_FLOOR:
        hard_fail.append(
            f"repeatability {ev.reliability:.2f} below the {ANALYSIS_FLOOR} analysis floor "
            "(faith-amanze pre-registered rule); the metric is not yet a measurement"
        )
        legs["repeatability"] = "FAIL"
    elif ev.reliability < DECISION_GRADE:
        legs["repeatability"] = (
            f"pass ({ev.reliability:.2f} >= {ANALYSIS_FLOOR}); below decision-grade "
            f"{DECISION_GRADE} for individual-player use"
        )
    else:
        legs["repeatability"] = f"pass ({ev.reliability:.2f} >= {DECISION_GRADE})"

    # --- Legs 2 & 3: transfer (same primitive) under controls -----------------
    tr = ev.transfer
    if tr is None:
        insufficient.append("no transfer estimate: no Combine->game association on record")
        legs["transfer"] = "UNMEASURED"
        legs["controls"] = "UNMEASURED"
    elif not tr.same_primitive:
        insufficient.append(
            "transfer estimate is not on the same movement primitive "
            "(generic athleticism is not transfer); claim inadmissible until re-measured"
        )
        legs["transfer"] = "INADMISSIBLE"
        legs["controls"] = "n/a"
    else:
        excludes = tr.ci_excludes_zero()
        if excludes:
            legs["transfer"] = f"pass (effect {tr.effect:+.3f}, CI excludes 0)"
            if tr.controlled:
                legs["controls"] = f"pass ({', '.join(tr.covariates) or 'declared set'})"
            else:
                insufficient.append("transfer is uncontrolled: no covariate set run; claim capped until controlled")
                legs["controls"] = "NOT RUN"
        elif excludes is None:
            insufficient.append("transfer reported without CI or p-value; cannot adjudicate")
            legs["transfer"] = "UNADJUDICATED"
            legs["controls"] = "n/a"
        else:
            # Null result: FAIL only if the interval rules out the effect of interest.
            powered_null = (
                tr.ci_lo is not None
                and tr.ci_hi is not None
                and tr.ci_lo > -effect_of_interest
                and tr.ci_hi < effect_of_interest
            )
            if powered_null:
                hard_fail.append(
                    f"powered null: transfer {tr.effect:+.3f} with CI ({tr.ci_lo:+.2f}, {tr.ci_hi:+.2f}) "
                    f"excludes the {effect_of_interest} effect of interest; this is a real null, not noise"
                )
                legs["transfer"] = "FAIL (powered null)"
            else:
                why = []
                if ev.mde is not None and ev.mde > effect_of_interest:
                    why.append(f"MDE {ev.mde:.2f} > effect of interest {effect_of_interest}")
                if tr.ci_lo is not None and tr.ci_hi is not None:
                    why.append(f"CI ({tr.ci_lo:+.2f}, {tr.ci_hi:+.2f}) spans both 0 and meaningful effects")
                insufficient.append(
                    "null transfer at insufficient power ("
                    + ("; ".join(why) if why else "sample too small to adjudicate")
                    + "); an underpowered null is not falsification"
                )
                legs["transfer"] = "UNDERPOWERED"
            legs["controls"] = "pass" if tr.controlled else "not run (moot under a null)"

    reasons = hard_fail + insufficient
    if hard_fail:
        verdict = "FAIL"
    elif insufficient:
        verdict = "UNDERPOWERED"
    else:
        verdict = "PASS"
    return GateVerdict(verdict=verdict, flags=flags, reasons=reasons, legs=legs)

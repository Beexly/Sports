# Provenance: newregime module — gated RESEARCH-GRADE lanes.
#
# Implements the documented stubs (NOT production code) for:
#   - SYS-13 TASC time-aware synthetic control (0323)
#   - SYS-14 dynamic probit inference bake-off EP vs PFM-VB vs MCMC (1664)
#   - SYS-15 copula-HMM live game-state regimes (1654)
#   - SYS-17 injury competing-events estimand taxonomy (1690)
#
# Source docs: ~/workspace/corpus-intelligence/deep/c10/buildable-systems.md
#               (SYS-13/14/15/17), ~/workspace/corpus-intelligence/deep/c10/syntheses.md.
#
# Each lane carries its numeric acceptance gate from the ledger. Per Garrett's
# INGEST-AND-LEARN doctrine: UNTESTED defaults to "UNTESTED — QUEUED FOR
# EVALUATION", never SKIP/DEAD. Nothing here touches production until its gate
# clears on real NFL data. evaluate() raises ResearchGradeNotEvaluated rather
# than returning fake numbers.

"""RESEARCH-GRADE gated lanes (SYS-13/14/15/17) — stubs with gates, not production."""


STATUS_UNTESTED = "UNTESTED — QUEUED FOR EVALUATION"


class ResearchGradeNotEvaluated(NotImplementedError):
    """Raised when a RESEARCH-GRADE lane is executed before its gate clears."""


class ResearchLane:
    """Documented stub for one gated research lane."""

    def __init__(self, name, sys_id, summary, gate, limitations,
                 production_use="NOT scheduled for production"):
        self.name = name
        self.sys_id = sys_id
        self.summary = summary
        self.gate = gate
        self.limitations = list(limitations)
        self.production_use = production_use
        self.status = STATUS_UNTESTED
        self.gate_cleared = False

    def evaluate(self, *args, **kwargs):
        raise ResearchGradeNotEvaluated(
            f"{self.sys_id} {self.name} is RESEARCH-GRADE and {self.status}. "
            f"Gate: {self.gate}. Evaluate on real NFL data before any use.")

    def status_dict(self):
        return {
            "name": self.name,
            "sys_id": self.sys_id,
            "summary": self.summary,
            "gate": self.gate,
            "limitations": self.limitations,
            "status": self.status,
            "gate_cleared": self.gate_cleared,
            "production_use": self.production_use,
            "research_grade": True,
        }


def tasc_lane():
    """SYS-13 — TASC time-aware synthetic control (0323).

    EM/Kalman state-space synthetic control exploiting temporal order.
    Reference: Prop 99 placebo — TASC lowest median RMSE, smallest variance;
    donor sweet spot near N = T0 = 50 (N=200 degrades everything)."""
    return ResearchLane(
        name="TASC time-aware synthetic control",
        sys_id="SYS-13",
        summary=("EM/Kalman state-space synthetic control for counterfactual "
                 "trajectories with placebo-test RMSE distribution; "
                 "temporal-order permutation stress test confirms it uses "
                 "time structure (post-intervention RMSE mean +48.5% when "
                 "permuted)."),
        gate=("placebo RMSE beats classical synthetic control by >=10% "
              "relative on NFL replication"),
        limitations=[
            "univariate only",
            "linear time-invariant trend assumption",
            "EM initialization-sensitive",
            "donor sweet spot near N=T0=50; N=200 degrades everything",
        ],
    )


def probit_bakeoff_lane():
    """SYS-14 — dynamic probit inference bake-off: EP vs PFM-VB vs MCMC (1664).

    y_t in {0,1}, P(y_t=1) = Phi(x_t' theta_t), theta_t random walk. Reference
    runtime: EP 0.43s vs PFM-VB 0.27s vs exact SUN 36.28s."""
    return ResearchLane(
        name="dynamic probit inference bake-off (EP vs PFM-VB vs MCMC)",
        sys_id="SYS-14",
        summary=("Standardized inference backend for dynamic binary-outcome "
                 "models (natural NFL extension: multinomial drive outcomes "
                 "TD/FG/punt/turnover). EP approximates the SUN smoothing "
                 "distribution by Gaussian q via cavity/tilted/moment-match "
                 "site updates + Kalman-smoother passes per sweep."),
        gate=("EP converges in >=95% of 32 team-season fits AND matches/beats "
              "PFM-VB on posterior-mean MAE and holdout log-loss — else "
              "REJECT in favor of the bake-off winner"),
        limitations=[
            "EP has no convergence guarantee; damping needed in hard cases",
            "adopt the bake-off WINNER, not EP by default",
        ],
    )


def copula_hmm_lane():
    """SYS-15 — copula-HMM live game-state regimes (1654).

    Hidden states S_t in {1..K}, K=3; state-dependent joint via Clayton copula
    x COM-Poisson marginals; covariate-driven transitions. Reference:
    dAIC=48 / dBIC=35 over independence."""
    return ResearchLane(
        name="copula-HMM live game-state regimes",
        sys_id="SYS-15",
        summary=("Viterbi state posteriors as live win-prob/spread features. "
                 "Numerical ML with 50 random starts; AIC/BIC selection."),
        gate=("holdout predictive log-likelihood >= 0.02 nats/obs over the "
              "independence baseline; control for scheme/tempo changes"),
        limitations=[
            "decoded states confound coaching scheme shifts with momentum — "
            "must control for scheme/tempo changes",
            "K=3 selected by BIC on the paper's data; re-select on NFL data",
        ],
    )


def injury_taxonomy_lane():
    """SYS-17 — injury competing-events estimand taxonomy (1690).

    The TAXONOMY (reporting standard) is adopted as real code below
    (EstimandTaxonomy — no data needed to label estimands correctly). The
    discrete-time IPW total-effect ESTIMATOR machinery is the gated part."""
    return ResearchLane(
        name="injury competing-events IPW estimator",
        sys_id="SYS-17",
        summary=("Discrete-time IPW total-effect estimator E[Y^{a=1}_k] vs "
                 "E[Y^{a=0}_k] with season-ending IR as the competing event. "
                 "Naive censor-at-IR estimates an ill-defined controlled "
                 "direct effect, not the total effect coaches care about. "
                 "Separable-effects lens for turf-vs-grass decomposition."),
        gate=("adopt the taxonomy+machinery if NFL replication shows naive "
              "censor-at-IR and IPW total effect differ by >=20% with "
              "identified positivity; reject the full machinery if <10%"),
        limitations=[
            "requires identified positivity (overlap) in the NFL replication",
            "recurrent-event + competing-event structure must match the "
            "paper's discrete-time setup",
        ],
    )


# ---------------------------------------------------------------------------
# The adoptable part of SYS-17: the estimand-taxonomy REPORTING STANDARD.
# Labeling estimands correctly needs no data and no gate — it applies to ALL
# injury-causal claims starting now.
# ---------------------------------------------------------------------------

class EstimandTaxonomy:
    """SYS-17 reporting standard: every injury-causal claim must name its
    estimand. The naive 'censor at IR' analysis targets an ill-defined
    controlled direct effect; the coaching question is the total effect."""

    TOTAL_EFFECT = "total-effect"
    CONTROLLED_DIRECT_EFFECT = "controlled-direct-effect (ill-defined under censor-at-IR)"
    SEPARABLE_EFFECT = "separable-effect"

    KNOWN_ESTIMANDS = (TOTAL_EFFECT, CONTROLLED_DIRECT_EFFECT, SEPARABLE_EFFECT)

    @classmethod
    def label_claim(cls, claim_text, estimand):
        if estimand not in cls.KNOWN_ESTIMANDS:
            raise ValueError(f"unknown estimand {estimand!r}; must be one of "
                             f"{cls.KNOWN_ESTIMANDS}")
        return {"claim": claim_text, "estimand": estimand,
                "standard": "SYS-17 estimand-taxonomy reporting standard",
                "warning": ("censor-at-IR analyses do NOT estimate the total "
                            "effect") if estimand != cls.TOTAL_EFFECT else None}

    @classmethod
    def check_positivity_identified(cls, replication_result):
        """Gate helper: the >=20% / <10% adoption rule needs identified
        positivity; without it the comparison is uninterpretable."""
        return bool(replication_result.get("positivity_identified", False))


def all_research_lanes():
    """All four gated RESEARCH-GRADE lanes."""
    return [tasc_lane(), probit_bakeoff_lane(), copula_hmm_lane(),
            injury_taxonomy_lane()]

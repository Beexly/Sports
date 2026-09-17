"""Synthetic mathematical checks only; no sports data or empirical edge claims.
Run: python docs/ops/research-audit-2026-09-17/deep/sources/rankreview-counterexamples.py
"""
import json
import math
from fractions import Fraction as F


def stirling(n, k):
    if n == k == 0:
        return 1
    if n == 0 or k == 0 or k > n:
        return 0
    return k * stirling(n - 1, k) + stirling(n - 1, k - 1)


def summarize(draws):
    # Each tuple: posterior mass, BT probability from latent strengths.
    return {
        "rank_superiority_probability": str(sum(w for w, p in draws if p > F(1, 2))),
        "co_cluster_probability": str(sum(w for w, p in draws if p == F(1, 2))),
        "posterior_predictive_probability": str(sum(w * p for w, p in draws)),
    }


a = summarize([(F(9, 10), F(11, 20)), (F(1, 10), F(9, 20))])
b = summarize([(F(9, 10), F(9, 10)), (F(1, 10), F(1, 10))])
ties = summarize([(F(4, 5), F(1, 2)), (F(1, 5), F(9, 10))])
assert a["rank_superiority_probability"] == b["rank_superiority_probability"] == "9/10"
assert a["posterior_predictive_probability"] == "27/50"
assert b["posterior_predictive_probability"] == "41/50"
assert ties["posterior_predictive_probability"] == "29/50"
# Eq. 9 specifies per-PARTITION Poisson weights. The generator samples K first.
n = 4
per_partition_weights = [F(stirling(n, k), math.factorial(k)) for k in range(1, n + 1)]
k_first_weights = [F(1, math.factorial(k)) for k in range(1, n + 1)]
normalize = lambda v: [x / sum(v) for x in v]
p_partition = normalize(per_partition_weights)
p_k_first = normalize(k_first_weights)
assert p_partition != p_k_first
# Gamma shape changes prior on the strength ratio; rate alone cancels.
# Independent Gamma(a,b) strengths imply p ~ Beta(a,a).
ratio_variances = {str(a): str(F(1, 4 * (2 * a + 1))) for a in [1, 5]}
# Correct choice-set encoding vs accidentally treating a game as a top-2 vote.
w = [F(2), F(1), F(100)]
pair = w[0] / (w[0] + w[1])
top_two = w[0] / sum(w) * w[1] / (w[1] + w[2])
assert pair == F(2, 3) and top_two == F(2, 10403)
# Mean log strength 0 fixes geometric mean, not arithmetic mean.
scores = [-1, 1]
# PR Eq.19 is a logistic log-strength density expressed in strength coordinates.
# Its integral against d sigma grows without bound; against d log(sigma), it is 1.
primitive = lambda x: math.log(1 + x) + 1 / (1 + x)
strength_integrals = {str(cutoff): primitive(cutoff) - primitive(0) for cutoff in [10, 1000, 1000000]}
results = {
    "label": "SYNTHETIC: exact math and formula checks, not fitted paper models or empirical edge",
    "same_rank_probability_different_predictives": {"A": a, "B": b},
    "high_co_cluster_probability_does_not_force_half": ties,
    "latent_rank_certain_but_event_near_half": summarize([(F(1), F(51, 100))]),
    "J4_lambda1_prior_marginal_K": {
        "K": list(range(1, n + 1)),
        "paper_Eq9_per_partition_weights": [str(x) for x in p_partition],
        "rRCBTL_generator_K_first": [str(x) for x in p_k_first],
    },
    "independent_gamma_strength_ratio_variance": ratio_variances,
    "choice_set_likelihood": {"pairwise": str(pair), "incorrect_top_two": str(top_two)},
    "zero_mean_log_strength": {"geometric_mean": math.exp(sum(scores) / len(scores)), "arithmetic_mean": sum(math.exp(x) for x in scores) / len(scores)},
    "Eq19_integral_against_d_strength_to_cutoff": strength_integrals,
    "checks_passed": True,
}
print(json.dumps(results, indent=2))

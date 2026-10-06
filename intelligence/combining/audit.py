# PROVENANCE — gse-intelligence-build / combining / audit.py
# SYS-16 Ensemble information-graph audit (arXiv:1677 expert interaction
# networks; Prop. 2 "only if" direction is proof-under-review — lean on Cor. 1).
#   Corpus: ~/workspace/corpus-intelligence/deep/c10/buildable-systems.md (SYS-16)
#           ~/workspace/corpus-intelligence/deep/c10/syntheses.md (Pipeline 4)
# Implements: Attention Centrality alpha_i(A) = sum_{j in N_i(A)} 1/d_j - 1;
#   network-bias variance Var[B|A] = (sigma^2/n)(n^-1 sum alpha_i^2
#   + 2 rho n^-1 sum_{i<j} alpha_i alpha_j); star topology is worst
#   (Var -> sigma^2 (1-rho)/4); under common correlation+variance Bayesian
#   pooling collapses to simple average (Lemma 1).
# Pre-step for SYS-04: run before trusting any combination.
"""SYS-16 ensemble information-graph audit (pre-step for angular combining)."""


def attention_centrality(source, model_source_sets):
    """Attention Centrality of one information source.

    alpha_i(A) = sum_{j in N_i(A)} 1/d_j - 1, where N_i(A) is the set of
    models whose source set includes `source`, and d_j = |sources of model j|.
    """
    total = 0.0
    for sources in model_source_sets:
        if source in sources:
            total += 1.0 / len(sources)
    return total - 1.0


def network_bias_variance(centralities, sigma2=1.0, rho=0.0):
    """Network-bias variance Var[B|A] from SYS-16.

    (sigma^2/n)(n^-1 sum_i alpha_i^2 + 2 rho n^-1 sum_{i<j} alpha_i alpha_j),
    n = number of sources.
    """
    import numpy as np

    a = np.asarray(list(centralities.values()), dtype=float)
    n = a.size
    if n == 0:
        return 0.0
    pair = 0.0
    for i in range(n):
        for j in range(i + 1, n):
            pair += a[i] * a[j]
    return (sigma2 / n) * (np.mean(a ** 2) + 2.0 * rho * pair / n)


def information_graph_audit(components, concentration_threshold=0.5):
    """Audit the component models' shared information before combining.

    components: list of {"name": str, "sources": {source: weight}}.
    Returns dict with per-source attention centralities, the star-topology
    concentration diagnostic (fraction of total weight on the single
    most-shared input), a Lemma-1 collapse flag, pass/fail, and the
    recommended action.
    """
    model_sets = [set(c["sources"]) for c in components]
    all_sources = sorted({s for c in components for s in c["sources"]})

    centralities = {
        s: attention_centrality(s, model_sets) for s in all_sources
    }

    total_w = sum(w for c in components for w in c["sources"].values())
    src_w = {s: 0.0 for s in all_sources}
    for c in components:
        for s, w in c["sources"].items():
            src_w[s] += w
    dominant = max(all_sources, key=lambda s: src_w[s])
    concentration = src_w[dominant] / total_w if total_w > 0 else 0.0

    # Lemma 1: under a common correlation/variance information environment
    # (every component reads exactly the same sources), Bayesian pooling
    # collapses to the simple average — the pooling-rule choice adds nothing.
    lemma1_collapse = len({frozenset(ms) for ms in model_sets}) == 1

    passes = (concentration <= concentration_threshold) and not lemma1_collapse
    if lemma1_collapse:
        recommendation = (
            "Lemma-1 collapse: all components share identical information; "
            "use the simple average — fancier pooling adds nothing."
        )
    elif not passes:
        recommendation = (
            f"Diversify inputs or down-weight the hub '{dominant}' "
            f"(concentration {concentration:.2f} > {concentration_threshold}); "
            "averaging more models on the same hub concentrates variance "
            "while looking like consensus."
        )
    else:
        recommendation = "Information graph is balanced; combination may be trusted."

    return {
        "centralities": centralities,
        "network_bias_variance_unit": network_bias_variance(centralities),
        "dominant_source": dominant,
        "concentration": concentration,
        "concentration_threshold": concentration_threshold,
        "lemma1_collapse": lemma1_collapse,
        "passes": passes,
        "recommendation": recommendation,
    }

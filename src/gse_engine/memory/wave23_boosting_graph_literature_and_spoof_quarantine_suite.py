"""Wave 23 Boosting, Graph-Learning Literature & P_spoof Social-Stream Quarantine.

Fifteen submitted URLs not yet indexed in the OSS registry (#197..#211):

  * Gradient boosting & AutoML math: stanfordmlgroup/ngboost (natural-gradient
    Normal scoring rule), lightgbm-org/LightGBM (histogram split gain),
    h2oai/h2o-3 (non-negative stacked-ensemble metalearner),
    benedekrozemberczki/awesome-gradient-boosting-papers (catalog -> gain law),
    szilard/benchm-ml (rank-based AUC benchmark protocol).
  * Graph deep learning literature: naganandy/graph-based-deep-learning-literature,
    DeepGraphLearning/LiteratureDL4Graph (symmetric-normalized GCN propagation).
  * Research literature tooling: WUBING2023/PaperSpine (section skeleton
    extraction), ept/ddia-references (citation key normalization and dedup),
    tirthajyoti/Papers-Literature-ML-DL-RL-AI (catalog), papersgpt/papersgpt-for-zotero
    (local-first BM25 library retrieval), o-ostrovskiy/sport-python-learning
    (Elo rating update as an educational baseline).
  * P_spoof quarantine (AP-06, zero gradient on hype streams):
    Fei2411/DS-Bot, zerodytrash/TikTok-Live-Connector, deepcoldy/botmux.

The quarantine guard enforces ||grad_hype(mu)|| == 0: any social or bot stream
signal is projected to zero before it can touch a Stage-2 scalar.
"""

from __future__ import annotations

import math
import re
from collections.abc import Mapping, Sequence
from typing import Any

_SEAM_MOD = "src/gse_engine/memory/wave23_boosting_graph_literature_and_spoof_quarantine_suite.py"
_PERMISSIVE = "ingest_and_learn_non_commercial_or_permissive"
_NC_RESEARCH = "ingest_and_learn_research_only_non_commercial_nc"
_CATALOG = "ingest_and_learn_catalog_index_reference_only"
_SPOOF = "P_SPOOF_QUARANTINE_ZERO_GRADIENT_AP06"
_GH = "https://github.com/"


def _e(
    eid: int,
    name: str,
    license_name: str,
    category: str,
    domain: str,
    seam_fn: str,
    role: str,
    posture: str = _PERMISSIVE,
    url: str | None = None,
    **extra: Any,
) -> dict[str, Any]:
    out: dict[str, Any] = {
        "id": eid,
        "name": name,
        "url": url if url is not None else (_GH + name),
        "license": license_name,
        "category": category,
        "domain": domain,
        "gse_seam": f"{_SEAM_MOD}::{seam_fn}",
        "gse_target_surface": _SEAM_MOD,
        "license_posture": posture,
        "role": role,
        "status": "WIRED_V3",
    }
    out.update(extra)
    return out


WAVE23_BOOSTING_LITERATURE_ENTRIES: list[dict[str, Any]] = [
    _e(197, "stanfordmlgroup/ngboost", "Apache-2.0", "probabilistic-boosting",
       "natural_gradient_normal_scoring_rule", "ngboost_normal_natural_gradient",
       "Fisher-preconditioned Normal(mu, log sigma) gradient for residual heads."),
    _e(198, "lightgbm-org/LightGBM", "MIT", "histogram-gradient-boosting",
       "second_order_histogram_split_gain", "lightgbm_histogram_best_split",
       "Second-order G^2/(H+lambda) histogram split gain."),
    _e(199, "h2oai/h2o-3", "Apache-2.0", "automl-stacked-ensembles",
       "non_negative_stacking_metalearner", "h2o_nonnegative_stacking_weights",
       "Non-negative least-squares stacked-ensemble metalearner weights."),
    _e(200, "WUBING2023/PaperSpine", "UNVERIFIED", "paper-structure-extraction",
       "section_skeleton_extraction", "paperspine_section_skeleton",
       "Extracts numbered section skeletons from paper text."),
    _e(201, "ept/ddia-references", "UNVERIFIED", "reference-catalog",
       "citation_key_normalization_dedup", "normalize_and_dedup_citations",
       "Normalizes and deduplicates citation strings.", posture=_CATALOG),
    _e(202, "naganandy/graph-based-deep-learning-literature", "UNVERIFIED",
       "graph-dl-literature", "symmetric_normalized_gcn_propagation",
       "gcn_symmetric_propagate", "GCN propagation D^-1/2 (A+I) D^-1/2 X.",
       posture=_CATALOG),
    _e(203, "DeepGraphLearning/LiteratureDL4Graph", "UNVERIFIED", "graph-dl-literature",
       "message_passing_over_formation_graphs", "gcn_symmetric_propagate",
       "Message passing over OL/receiver formation graphs.", posture=_CATALOG),
    _e(204, "tirthajyoti/Papers-Literature-ML-DL-RL-AI", "UNVERIFIED", "ml-literature-catalog",
       "paper_catalog_section_index", "paperspine_section_skeleton",
       "Catalog of ML/DL/RL papers indexed by section skeleton.", posture=_CATALOG),
    _e(205, "papersgpt/papersgpt-for-zotero", "UNVERIFIED", "local-first-literature-rag",
       "bm25_local_library_retrieval", "bm25_rank_local_library",
       "Local-first BM25 ranking over a private paper library."),
    _e(206, "szilard/benchm-ml", "MIT", "ml-benchmark-protocol",
       "mann_whitney_rank_auc", "rank_auc_mann_whitney",
       "Rank-based AUC (Mann-Whitney U) for benchmark comparisons."),
    _e(207, "benedekrozemberczki/awesome-gradient-boosting-papers", "CC0-1.0",
       "boosting-literature-catalog", "boosting_gain_law_reference",
       "lightgbm_histogram_best_split", "Catalog anchoring the split-gain law.",
       posture=_CATALOG),
    _e(208, "o-ostrovskiy/sport-python-learning", "UNVERIFIED", "sports-analytics-education",
       "elo_rating_update_baseline", "elo_update", "Elo update as an educational baseline."),
    _e(209, "Fei2411/DS-Bot", "UNVERIFIED", "social-bot-stream",
       "p_spoof_quarantine", "assert_social_stream_p_spoof_quarantine",
       "Bot stream quarantined; zero gradient on mu.", posture=_SPOOF,
       stage2_weight=0.0, p_spoof_quarantined=True),
    _e(210, "zerodytrash/TikTok-Live-Connector", "MIT", "social-live-stream",
       "p_spoof_quarantine", "assert_social_stream_p_spoof_quarantine",
       "Live social stream quarantined; zero gradient on mu.", posture=_SPOOF,
       stage2_weight=0.0, p_spoof_quarantined=True),
    _e(211, "deepcoldy/botmux", "UNVERIFIED", "bot-multiplexer",
       "p_spoof_quarantine", "assert_social_stream_p_spoof_quarantine",
       "Bot multiplexer quarantined; zero gradient on mu.", posture=_SPOOF,
       stage2_weight=0.0, p_spoof_quarantined=True),
    _e(212, "llm-d/llm-d", "Apache-2.0", "distributed-inference-routing",
       "prefix_kv_cache_aware_worker_routing", "llm_d_prefix_kv_cache_aware_route",
       "Disaggregated KV-prefix hit rate vs queue depth inference routing."),
    _e(213, "llm-d.ai/docs/0.9", "Apache-2.0", "distributed-inference-docs",
       "prefix_kv_cache_aware_worker_routing", "llm_d_prefix_kv_cache_aware_route",
       "llm-d v0.9 disaggregated scheduling specification reference.",
       posture=_CATALOG, url="https://llm-d.ai/docs/0.9"),
    _e(214, "arxiv/xgboost-search-corpus", "MIXED", "boosting-arxiv-catalog",
       "second_order_histogram_split_gain", "lightgbm_histogram_best_split",
       "Recent arXiv XGBoost split-gain and calibration literature search index.",
       posture=_CATALOG,
       url="https://arxiv.org/search/?searchtype=all&query=xgboost&abstracts=show&size=200&order=-announced_date_first"),
    _e(215, "stanfordnlp/dspy", "MIT", "prompt-and-fewshot-optimization",
       "mipro_bootstrap_fewshot_compilation", "dspy_mipro_bootstrap_fewshot_compile",
       "Deterministic bootstrap few-shot demonstration selection for RLVR traces."),
    _e(216, "NVlabs/stylegan", "Nvidia-Source-Code-NC", "generative-weight-demodulation",
       "adaptive_style_weight_modulation", "stylegan2_weight_demodulation",
       "Foundational adaptive style synthesis baseline (NC research-only).",
       posture=_NC_RESEARCH),
    _e(217, "NVlabs/stylegan2", "Nvidia-Source-Code-NC", "generative-weight-demodulation",
       "karras_weight_demodulation_and_ppl", "stylegan2_weight_demodulation",
       "Weight demodulation and perceptual path smoothness metric (NC research-only).",
       posture=_NC_RESEARCH),
    _e(218, "NVlabs/Sana", "Apache-2.0", "linear-attention-rectified-flow",
       "relu_linear_attention_and_rectified_flow",
       "sana_relu_linear_attention_and_flow_step",
       "O(N) ReLU kernel linear attention and rectified-flow Euler dynamics."),
    _e(219, "NVlabs/tiny-cuda-nn", "BSD-3-Clause", "multiresolution-spatial-hash-encoding",
       "instant_ngp_bilinear_spatial_hash_grid",
       "tcnn_multiresolution_spatial_hash_encode",
       "Multi-resolution 2D spatial hash-grid encoding for field/rink/pitch coordinates."),
    _e(220, "NVlabs/repositories", "MIXED", "catalog-index",
       "nvlabs_research_repository_catalog", "tcnn_multiresolution_spatial_hash_encode",
       "NVlabs research catalog index anchored to spatial hash encoding.",
       posture=_CATALOG, url="https://github.com/orgs/NVlabs/repositories"),
    _e(221, "NVlabs/repositories-stars", "MIXED", "catalog-index",
       "nvlabs_stars_repository_catalog", "tcnn_multiresolution_spatial_hash_encode",
       "NVlabs star-sorted repository catalog index.",
       posture=_CATALOG, url="https://github.com/orgs/NVlabs/repositories?q=sort%3Astars"),
]


def ngboost_normal_natural_gradient(y: float, mu: float, log_sigma: float) -> dict[str, float]:
    """Natural gradient of the Normal NLL in (mu, log sigma).

    Ordinary gradient of NLL: d/dmu = -(y-mu)/s^2, d/dlogs = 1 - (y-mu)^2/s^2.
    Fisher information is diag(1/s^2, 2), so the natural gradient is
    (-(y-mu), 0.5 * (1 - (y-mu)^2/s^2)).
    """
    s2 = math.exp(2.0 * log_sigma)
    r = float(y) - float(mu)
    g_mu = -r / s2
    g_ls = 1.0 - r * r / s2
    nll = 0.5 * math.log(2.0 * math.pi) + log_sigma + 0.5 * r * r / s2
    return {
        "nll": nll,
        "grad_mu": g_mu,
        "grad_log_sigma": g_ls,
        "nat_grad_mu": g_mu * s2,
        "nat_grad_log_sigma": 0.5 * g_ls,
    }


def lightgbm_histogram_best_split(
    feature_bins: Sequence[int],
    grads: Sequence[float],
    hess: Sequence[float],
    *,
    lam: float = 1.0,
    min_child_hess: float = 1e-3,
) -> dict[str, Any]:
    """Best threshold over histogram bins by second-order gain.

    gain = 0.5 [G_L^2/(H_L+lam) + G_R^2/(H_R+lam) - G^2/(H+lam)].
    """
    n_bins = max(feature_bins) + 1 if feature_bins else 0
    hg = [0.0] * n_bins
    hh = [0.0] * n_bins
    for b, g, h in zip(feature_bins, grads, hess, strict=True):
        hg[b] += float(g)
        hh[b] += float(h)
    g_tot, h_tot = sum(hg), sum(hh)
    parent = g_tot * g_tot / (h_tot + lam)
    best_gain, best_bin = 0.0, -1
    gl = hl = 0.0
    for b in range(n_bins - 1):
        gl += hg[b]
        hl += hh[b]
        gr, hr = g_tot - gl, h_tot - hl
        if hl < min_child_hess or hr < min_child_hess:
            continue
        gain = 0.5 * (gl * gl / (hl + lam) + gr * gr / (hr + lam) - parent)
        if gain > best_gain + 1e-12:
            best_gain, best_bin = gain, b
    return {"best_bin_threshold": best_bin, "gain": best_gain, "n_bins": n_bins}


def h2o_nonnegative_stacking_weights(
    base_preds: Sequence[Sequence[float]], y: Sequence[float], *, n_iter: int = 2000
) -> dict[str, Any]:
    """Projected-gradient NNLS: min ||P w - y||^2 s.t. w >= 0 (P = base_preds^T)."""
    m = len(base_preds)
    n = len(y)
    lip = sum(sum(p[i] * p[i] for i in range(n)) for p in base_preds) or 1.0
    step = 1.0 / lip
    w = [1.0 / m] * m
    for _ in range(int(n_iter)):
        resid = [sum(w[j] * base_preds[j][i] for j in range(m)) - float(y[i]) for i in range(n)]
        grad = [sum(base_preds[j][i] * resid[i] for i in range(n)) for j in range(m)]
        w = [max(0.0, wj - step * gj) for wj, gj in zip(w, grad, strict=True)]
    resid = [sum(w[j] * base_preds[j][i] for j in range(m)) - float(y[i]) for i in range(n)]
    return {"weights": w, "sse": sum(r * r for r in resid)}


_SECTION_RE = re.compile(r"^\s*(\d+(?:\.\d+)*)\.?\s+([A-Z][^\n]{2,80})$", re.MULTILINE)


def paperspine_section_skeleton(text: str) -> list[dict[str, Any]]:
    """Extract numbered section headings with nesting depth."""
    out: list[dict[str, Any]] = []
    for num, title in _SECTION_RE.findall(text):
        out.append({"number": num, "depth": num.count(".") + 1, "title": title.strip()})
    return out


def normalize_and_dedup_citations(citations: Sequence[str]) -> dict[str, Any]:
    """Normalize case/punctuation/whitespace; keep first occurrence per key."""
    seen: dict[str, int] = {}
    kept: list[str] = []
    for c in citations:
        key = re.sub(r"[^a-z0-9 ]", "", c.lower())
        key = re.sub(r"\s+", " ", key).strip()
        if key and key not in seen:
            seen[key] = len(kept)
            kept.append(c.strip())
    return {"unique": kept, "duplicates_removed": len(citations) - len(kept)}


def gcn_symmetric_propagate(
    adjacency: Sequence[Sequence[float]], features: Sequence[Sequence[float]]
) -> list[list[float]]:
    """One GCN propagation H = D^-1/2 (A + I) D^-1/2 X (Kipf and Welling 2017)."""
    n = len(adjacency)
    a_hat = [
        [float(adjacency[i][j]) + (1.0 if i == j else 0.0) for j in range(n)] for i in range(n)
    ]
    deg = [sum(row) for row in a_hat]
    dinv = [1.0 / math.sqrt(d) if d > 0 else 0.0 for d in deg]
    dim = len(features[0])
    return [
        [
            sum(dinv[i] * a_hat[i][j] * dinv[j] * float(features[j][k]) for j in range(n))
            for k in range(dim)
        ]
        for i in range(n)
    ]


def bm25_rank_local_library(
    docs: Mapping[str, str], query: str, *, k1: float = 1.2, b: float = 0.75
) -> list[tuple[str, float]]:
    """Okapi BM25 ranking with the non-negative (Lucene) IDF variant."""
    tok = {d: re.findall(r"[a-z0-9]+", t.lower()) for d, t in docs.items()}
    n = len(tok)
    avgdl = sum(len(v) for v in tok.values()) / max(1, n)
    q_terms = re.findall(r"[a-z0-9]+", query.lower())
    scores: list[tuple[str, float]] = []
    for d, terms in tok.items():
        dl = len(terms)
        s = 0.0
        for q in set(q_terms):
            df = sum(1 for v in tok.values() if q in v)
            idf = math.log(1.0 + (n - df + 0.5) / (df + 0.5))
            tf = terms.count(q)
            s += idf * tf * (k1 + 1) / (tf + k1 * (1 - b + b * dl / max(1e-9, avgdl)))
        scores.append((d, s))
    scores.sort(key=lambda t: (-t[1], t[0]))
    return scores


def rank_auc_mann_whitney(scores: Sequence[float], labels: Sequence[int]) -> float:
    """AUC = U / (n_pos n_neg) with average ranks for ties."""
    pairs = sorted(zip(scores, labels, strict=True), key=lambda t: t[0])
    ranks = [0.0] * len(pairs)
    i = 0
    while i < len(pairs):
        j = i
        while j + 1 < len(pairs) and pairs[j + 1][0] == pairs[i][0]:
            j += 1
        avg = (i + j) / 2.0 + 1.0
        for k in range(i, j + 1):
            ranks[k] = avg
        i = j + 1
    n_pos = sum(1 for _, lab in pairs if lab == 1)
    n_neg = len(pairs) - n_pos
    if n_pos == 0 or n_neg == 0:
        raise ValueError("need both classes for AUC.")
    r_pos = sum(r for r, (_, lab) in zip(ranks, pairs, strict=True) if lab == 1)
    u = r_pos - n_pos * (n_pos + 1) / 2.0
    return u / (n_pos * n_neg)


def elo_update(
    r_home: float, r_away: float, home_won: float, *, k: float = 20.0, hfa: float = 48.0
) -> dict[str, float]:
    """Zero-sum Elo update with home-field advantage in rating points."""
    e_home = 1.0 / (1.0 + 10.0 ** (-(r_home + hfa - r_away) / 400.0))
    delta = k * (float(home_won) - e_home)
    return {"expected_home": e_home, "home_new": r_home + delta, "away_new": r_away - delta}


def assert_social_stream_p_spoof_quarantine(
    hype_gradient: Sequence[float], *, requested_weight: float = 0.0
) -> dict[str, Any]:
    """Project any social/bot hype gradient to zero; refuse non-zero weights."""
    if requested_weight != 0.0:
        raise PermissionError("AP06_P_SPOOF_QUARANTINE: social streams carry zero Stage-2 weight.")
    projected = [0.0 for _ in hype_gradient]
    return {
        "quarantined": True,
        "stage2_weight": 0.0,
        "projected_gradient": projected,
        "grad_hype_norm": math.sqrt(sum(v * v for v in projected)),
    }


def llm_d_prefix_kv_cache_aware_route(
    worker_prefix_hit_rates: Sequence[float],
    worker_queue_depths: Sequence[int],
    *,
    hit_weight: float = 2.0,
    queue_penalty: float = 0.35,
) -> dict[str, Any]:
    """Select an inference worker via prefix KV-cache hit rate vs queue depth (#212, #213)."""
    if not worker_prefix_hit_rates or len(worker_prefix_hit_rates) != len(worker_queue_depths):
        raise ValueError("worker_prefix_hit_rates and worker_queue_depths must match non-empty.")
    scores: list[float] = []
    for hr, qd in zip(worker_prefix_hit_rates, worker_queue_depths, strict=True):
        clipped_hr = max(0.0, min(1.0, float(hr)))
        depth = max(0, int(qd))
        scores.append(float(hit_weight) * clipped_hr - float(queue_penalty) * math.log1p(depth))
    best_idx = max(range(len(scores)), key=lambda i: (scores[i], -i))
    return {
        "selected_worker": best_idx,
        "worker_scores": [round(s, 6) for s in scores],
        "best_score": round(scores[best_idx], 6),
    }


def dspy_mipro_bootstrap_fewshot_compile(
    candidates: Sequence[Mapping[str, Any]],
    *,
    k_demos: int = 3,
    min_score: float = 0.80,
) -> dict[str, Any]:
    """Compile verified few-shot demonstrations without mutating model weights (#215)."""
    seen_prompts: set[str] = set()
    filtered: list[tuple[float, str, dict[str, Any]]] = []
    for row in candidates:
        score = float(row.get("score") or 0.0)
        prompt = str(row.get("prompt") or "").strip()
        if not prompt or score < float(min_score) or prompt in seen_prompts:
            continue
        seen_prompts.add(prompt)
        filtered.append((score, prompt, dict(row)))
    filtered.sort(key=lambda item: (-item[0], item[1]))
    chosen = [item[2] for item in filtered[: max(0, int(k_demos))]]
    mean_val = (
        sum(float(item[0]) for item in filtered[: len(chosen)]) / float(len(chosen))
        if chosen
        else 0.0
    )
    return {
        "selected_demos": chosen,
        "selected_count": len(chosen),
        "candidates_passed_floor": len(filtered),
        "mean_validation_score": round(mean_val, 6),
    }


def stylegan2_weight_demodulation(
    weights_out_in: Sequence[Sequence[float]],
    style_scales: Sequence[float],
    *,
    eps: float = 1e-8,
) -> dict[str, Any]:
    """Karras et al. StyleGAN2 weight demodulation and path smoothness proxy (#216, #217)."""
    if not weights_out_in or not style_scales:
        raise ValueError("weights_out_in and style_scales must be non-empty.")
    in_dim = len(style_scales)
    demod: list[list[float]] = []
    row_norms: list[float] = []
    for row in weights_out_in:
        if len(row) != in_dim:
            raise ValueError("Each weight row length must equal len(style_scales).")
        modulated = [float(w) * float(s) for w, s in zip(row, style_scales, strict=True)]
        denom = math.sqrt(sum(v * v for v in modulated) + float(eps))
        normed_row = [v / denom for v in modulated]
        demod.append(normed_row)
        row_norms.append(math.sqrt(sum(v * v for v in normed_row)))
    flat = [v for r in demod for v in r]
    ppl = (
        sum((a - b) ** 2 for a, b in zip(flat, flat[1:], strict=False)) / float(max(1, len(flat)))
    )
    return {
        "demodulated_weights": demod,
        "row_l2_norms": [round(n, 8) for n in row_norms],
        "perceptual_path_length": round(ppl, 8),
    }


def sana_relu_linear_attention_and_flow_step(
    queries: Sequence[Sequence[float]],
    keys: Sequence[Sequence[float]],
    values: Sequence[Sequence[float]],
    x_t: Sequence[float],
    velocity: Sequence[float],
    *,
    dt: float = 0.1,
    eps: float = 1e-6,
) -> dict[str, Any]:
    """O(N) ReLU kernel linear attention + Euler rectified-flow step (#218 Sana)."""
    if not queries or len(keys) != len(values) or not keys:
        raise ValueError("queries, keys, and values must be non-empty with len(keys)==len(values).")
    if len(x_t) != len(velocity):
        raise ValueError("x_t and velocity dimensions must match.")
    d_k = len(queries[0])
    d_v = len(values[0])
    q_relu = [[max(0.0, float(x)) for x in row] for row in queries]
    k_relu = [[max(0.0, float(x)) for x in row] for row in keys]

    kv: list[list[float]] = [[0.0] * d_v for _ in range(d_k)]
    k_sum: list[float] = [0.0] * d_k
    for kr, vr in zip(k_relu, values, strict=True):
        if len(kr) != d_k or len(vr) != d_v:
            raise ValueError("Inconsistent key/value dimensions.")
        for i in range(d_k):
            k_sum[i] += kr[i]
            for j in range(d_v):
                kv[i][j] += kr[i] * float(vr[j])

    attended: list[list[float]] = []
    for qr in q_relu:
        if len(qr) != d_k:
            raise ValueError("Inconsistent query dimension.")
        denom = sum(qr[i] * k_sum[i] for i in range(d_k)) + float(eps)
        out_row = [sum(qr[i] * kv[i][j] for i in range(d_k)) / denom for j in range(d_v)]
        attended.append(out_row)

    x_next = [float(x) + float(dt) * float(v) for x, v in zip(x_t, velocity, strict=True)]
    return {"attended": attended, "x_next": x_next}


def tcnn_multiresolution_spatial_hash_encode(
    xy_unit: tuple[float, float],
    *,
    n_levels: int = 4,
    base_res: int = 4,
    per_level_scale: float = 2.0,
    table_size: int = 64,
) -> dict[str, Any]:
    """Deterministic multi-resolution 2D spatial hash-grid features (#219 tiny-cuda-nn)."""
    ux = max(0.0, min(1.0, float(xy_unit[0])))
    uy = max(0.0, min(1.0, float(xy_unit[1])))
    levels = max(1, int(n_levels))
    tsize = max(8, int(table_size))
    features: list[float] = []

    def _grid_val(level: int, ix: int, iy: int, feat_dim: int) -> float:
        h = ((ix * 1) ^ (iy * 2654435761) ^ (level * 805459861) ^ (feat_dim * 19349663)) % tsize
        return ((h / float(tsize - 1)) * 2.0 - 1.0) * 0.5

    for lvl in range(levels):
        res = float(base_res) * (float(per_level_scale) ** lvl)
        gx = ux * res
        gy = uy * res
        x0 = int(math.floor(gx))
        y0 = int(math.floor(gy))
        fx = gx - x0
        fy = gy - y0
        for fdim in range(2):
            v00 = _grid_val(lvl, x0, y0, fdim)
            v10 = _grid_val(lvl, x0 + 1, y0, fdim)
            v01 = _grid_val(lvl, x0, y0 + 1, fdim)
            v11 = _grid_val(lvl, x0 + 1, y0 + 1, fdim)
            interp = (
                v00 * (1.0 - fx) * (1.0 - fy)
                + v10 * fx * (1.0 - fy)
                + v01 * (1.0 - fx) * fy
                + v11 * fx * fy
            )
            features.append(round(interp, 8))

    feat_norm = math.sqrt(sum(v * v for v in features))
    return {
        "features": features,
        "feature_dim": len(features),
        "feature_norm": round(feat_norm, 6),
    }


def evaluate_wave23_boosting_literature_bridge(
    *, away_clean_epa: float, home_clean_epa: float
) -> dict[str, Any]:
    """Stage-2 diagnostics for the boosting heads, routing, encoding, and spoof quarantine."""
    diff = float(home_clean_epa) - float(away_clean_epa)
    ng = ngboost_normal_natural_gradient(y=diff * 18.0, mu=0.0, log_sigma=math.log(13.0))
    spoof = assert_social_stream_p_spoof_quarantine([0.4, -0.2, 0.9])
    llmd = llm_d_prefix_kv_cache_aware_route([0.92, 0.65, 0.88], [2, 1, 8])
    tcnn = tcnn_multiresolution_spatial_hash_encode((0.45, 0.52))
    return {
        "wave23_boosting_literature_wired": True,
        "boosting_literature_entries": len(WAVE23_BOOSTING_LITERATURE_ENTRIES),
        "ngboost_nat_grad_mu": round(float(ng["nat_grad_mu"]), 6),
        "p_spoof_grad_hype_norm": float(spoof["grad_hype_norm"]),
        "llm_d_selected_worker": int(llmd["selected_worker"]),
        "tcnn_feature_norm": float(tcnn["feature_norm"]),
        "live_stage2_weight": 0.0,
        "wave23_boost_epa_adj": 0.0,
    }


__all__ = [
    "WAVE23_BOOSTING_LITERATURE_ENTRIES",
    "assert_social_stream_p_spoof_quarantine",
    "bm25_rank_local_library",
    "dspy_mipro_bootstrap_fewshot_compile",
    "elo_update",
    "evaluate_wave23_boosting_literature_bridge",
    "gcn_symmetric_propagate",
    "h2o_nonnegative_stacking_weights",
    "lightgbm_histogram_best_split",
    "llm_d_prefix_kv_cache_aware_route",
    "ngboost_normal_natural_gradient",
    "normalize_and_dedup_citations",
    "paperspine_section_skeleton",
    "rank_auc_mann_whitney",
    "sana_relu_linear_attention_and_flow_step",
    "stylegan2_weight_demodulation",
    "tcnn_multiresolution_spatial_hash_encode",
]

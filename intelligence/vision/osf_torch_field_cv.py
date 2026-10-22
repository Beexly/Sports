"""OSF torch field CV — TensorFlow/PyTorch-free mirror of the Stream 13A pipeline.

The TypeScript engine owns the production graph; this module is the Python
reference used for verification and offline experiments. It composes the same
six stages on numpy arrays:

  1. Zoo sensor correction (speed = displacement * 10;
     corrected accel = reported * (displacement / speed) / 0.1)
  2. (T x 11 x 10 x 8) pair tensor
  3. per-frame 1x1 channel projection + permutation-invariant max/mean pooling
  4. temporal scaled dot-product self-attention
  5. five deterministic heads -> mean class probabilities + epistemic variance
  6. PCA/t-SNE-style global discovery and linear Guided Grad-CAM

No trained weights are claimed. Projections and heads are fixed-seed
deterministic maps; a caller can pass measured matrices.

Run `python intelligence/vision/osf_torch_field_cv.py --verify` for the
synthetic three-head proof.
"""

from __future__ import annotations

import argparse
import json
import math
from typing import Sequence

import numpy as np

COVERAGE_SCHEMES = [
    "cover-0-man", "cover-1-man", "cover-2-man", "cover-2-zone",
    "cover-3-zone", "cover-4-zone", "cover-6-zone", "prevent",
]
PAIR_CHANNELS = ["dx", "dy", "dsx", "dsy", "dist", "cosBearing", "sinBearing", "closingSpeed"]
TRACKING_HZ = 10


def speed_from_displacement(displacement_yards: float) -> float:
    if not math.isfinite(displacement_yards) or displacement_yards < 0:
        raise ValueError("displacement must be finite and non-negative")
    return displacement_yards * TRACKING_HZ


def corrected_acceleration(reported: float, displacement: float, speed: float) -> float:
    if not all(math.isfinite(v) for v in (reported, displacement, speed)):
        raise ValueError("acceleration inputs must be finite")
    if displacement < 0 or speed < 0:
        raise ValueError("displacement and speed must be non-negative")
    if speed == 0:
        if displacement == 0:
            return 0.0
        raise ValueError("speed is zero while displacement is not")
    return reported * (displacement / speed) / 0.1


def _deterministic_matrix(rows: int, cols: int, seed: int) -> np.ndarray:
    state = seed & 0xFFFFFFFF
    values = []
    for _ in range(rows * cols):
        state = (state * 1664525 + 1013904223) & 0xFFFFFFFF
        values.append((state / 0x100000000) * 2 - 1)
    return np.array(values, dtype=np.float64).reshape(rows, cols) * math.sqrt(2 / rows)


def engineer_pair_tensor(frames: Sequence[dict]) -> tuple[np.ndarray, dict]:
    tensor = []
    corrected = 0
    max_speed_delta = 0.0
    max_accel_delta = 0.0
    for index, frame in enumerate(frames):
        defenders = frame.get("defenders", [])
        offense = frame.get("offense", [])
        if len(defenders) != 11:
            raise ValueError(f"frame {index} must have exactly 11 defenders (got {len(defenders)})")
        if len(offense) != 10:
            raise ValueError(f"frame {index} must have exactly 10 offensive players (got {len(offense)})")
        corrected_frame = False
        def_rows = []
        for d in defenders:
            speed = speed_from_displacement(d["displacementYards"])
            accel = corrected_acceleration(d["reportedAcceleration"], d["displacementYards"], d["reportedSpeed"])
            max_speed_delta = max(max_speed_delta, abs(speed - d["reportedSpeed"]))
            max_accel_delta = max(max_accel_delta, abs(accel - d["reportedAcceleration"]))
            if abs(speed - d["reportedSpeed"]) > 1e-9 or abs(accel - d["reportedAcceleration"]) > 1e-9:
                corrected_frame = True
            def_rows.append((d["x"], d["y"], speed, speed))
        off_rows = []
        for o in offense:
            speed = speed_from_displacement(o["displacementYards"])
            accel = corrected_acceleration(o["reportedAcceleration"], o["displacementYards"], o["reportedSpeed"])
            max_speed_delta = max(max_speed_delta, abs(speed - o["reportedSpeed"]))
            max_accel_delta = max(max_accel_delta, abs(accel - o["reportedAcceleration"]))
            if abs(speed - o["reportedSpeed"]) > 1e-9 or abs(accel - o["reportedAcceleration"]) > 1e-9:
                corrected_frame = True
            off_rows.append((o["x"], o["y"], speed, speed))
        if corrected_frame:
            corrected += 1
        frame_pairs = np.zeros((11, 10, 8), dtype=np.float64)
        for i, (dx_, dy_, dsx, dsy) in enumerate(def_rows):
            for j, (ox, oy, osx, osy) in enumerate(off_rows):
                dx = dx_ - ox
                dy = dy_ - oy
                dist = math.hypot(dx, dy)
                bearing = 0.0 if dist == 0 else math.atan2(dy, dx)
                closing = 0.0 if dist == 0 else -((dx * (dsx - osx)) + (dy * (dsy - osy))) / dist
                frame_pairs[i, j] = [dx, dy, dsx - osx, dsy - osy, dist, math.cos(bearing), math.sin(bearing), closing]
        tensor.append(frame_pairs)
    return np.stack(tensor), {
        "frames": len(frames), "defenders": 11, "offense": 10, "channels": 8,
        "framesCorrected": corrected, "maxSpeedDelta": max_speed_delta, "maxAccelerationDelta": max_accel_delta,
    }


def frame_embeddings(tensor: np.ndarray, dimension: int = 16, projection: np.ndarray | None = None) -> tuple[np.ndarray, np.ndarray]:
    if tensor.ndim != 4 or tensor.shape[1:] != (11, 10, 8):
        raise ValueError(f"pair tensor must be (T, 11, 10, 8), got {tensor.shape}")
    projection = _deterministic_matrix(8, dimension, 1301) if projection is None else np.asarray(projection)
    if projection.shape[0] != 8:
        raise ValueError("projection must have 8 input channels")
    projected = tensor @ projection  # (T, 11, 10, D)
    offense_pooled = 0.5 * (projected.max(axis=2) + projected.mean(axis=2))  # (T, 11, D)
    embeddings = 0.5 * (offense_pooled.max(axis=1) + offense_pooled.mean(axis=1))  # (T, D)
    return embeddings, projection


def softmax(values: np.ndarray) -> np.ndarray:
    shifted = values - values.max(axis=-1, keepdims=True)
    exps = np.exp(shifted)
    return exps / exps.sum(axis=-1, keepdims=True)


def self_attention(embeddings: np.ndarray, seed: int = 1302, temperature: float = 1.0) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    if embeddings.ndim != 2:
        raise ValueError("embeddings must be (T, D)")
    t, d = embeddings.shape
    if t == 0:
        raise ValueError("at least one frame is required")
    q = embeddings @ _deterministic_matrix(d, d, seed)
    k = embeddings @ _deterministic_matrix(d, d, seed + 1)
    v = embeddings @ _deterministic_matrix(d, d, seed + 2)
    scores = (q @ k.T) / (math.sqrt(d) * temperature)
    attention = softmax(scores)
    alpha = attention.mean(axis=0)
    play = alpha @ v
    return play, alpha, attention


def ensemble_classify(play: np.ndarray, heads: Sequence[np.ndarray] | None = None, seed: int = 1303) -> dict:
    d = play.shape[0]
    if heads is None:
        heads = [_deterministic_matrix(d, len(COVERAGE_SCHEMES), seed + m) for m in range(5)]
    if len(heads) != 5:
        raise ValueError("the ensemble requires exactly five heads")
    per_model = [softmax(play @ np.asarray(head)) for head in heads]
    stacked = np.stack(per_model)
    mean = stacked.mean(axis=0)
    variance = stacked.var(axis=0, ddof=1)
    best = int(np.argmax(mean))
    return {
        "meanClassProbabilities": mean.tolist(),
        "epistemicVariance": variance.tolist(),
        "predictedScheme": COVERAGE_SCHEMES[best],
        "predictedProbability": float(mean[best]),
        "coverageFamily": "man" if COVERAGE_SCHEMES[best].endswith("-man") else "zone",
        "ensembleDisagreement": float(variance.mean()),
    }


def global_discovery(embeddings: np.ndarray, classification: dict, k: int = 5) -> dict:
    probs = np.array([ensemble_classify(e)["meanClassProbabilities"] for e in embeddings])
    centered = probs - probs.mean(axis=0)
    _, singular, vt = np.linalg.svd(centered, full_matrices=False)
    pc1, pc2 = vt[0], vt[1] if vt.shape[0] > 1 else vt[0]
    point = np.array(classification["meanClassProbabilities"]) - probs.mean(axis=0)
    x, y = float(point @ pc1), float(point @ pc2)
    uniqueness = math.hypot(x, y)
    dists = np.linalg.norm(embeddings - np.array(classification["meanClassProbabilities"][: embeddings.shape[1]]), axis=1) if embeddings.shape[1] == len(classification["meanClassProbabilities"]) else np.linalg.norm(embeddings - embeddings.mean(axis=0), axis=1)
    bandwidth = max(1e-6, float(np.sort(dists)[min(k, len(dists) - 1)]))
    weights = np.exp(-(dists ** 2) / (2 * bandwidth ** 2))
    weights = weights / weights.sum()
    own = classification["predictedScheme"]
    labels = [ensemble_classify(e)["predictedScheme"] for e in embeddings]
    mismatch = sum(1 for label in labels if label != own) / len(labels)
    entropy = -float(np.sum(weights * np.log(np.maximum(weights, 1e-12))))
    return {
        "coverageSchemeUniqueness": uniqueness,
        "gaussianNeighborWeights": weights.tolist(),
        "perplexity": math.exp(entropy),
        "neighborLabelMismatch": mismatch,
        "projected": {"pc1": x, "pc2": y},
        "referenceCount": len(labels),
        "referenceSource": "temporal-self",
    }


def guided_grad_cam(tensor: np.ndarray, alpha: np.ndarray, play: np.ndarray, classification: dict, seed: int = 1303) -> dict:
    d = play.shape[0]
    heads = [_deterministic_matrix(d, len(COVERAGE_SCHEMES), seed + m) for m in range(5)]
    mean_head = np.mean(heads, axis=0)
    class_index = COVERAGE_SCHEMES.index(classification["predictedScheme"])
    gate = np.maximum(0, mean_head[:, class_index])
    projection = _deterministic_matrix(8, d, 1301)
    per_frame = []
    for t in range(tensor.shape[0]):
        attribution = np.zeros((11, 10))
        for i in range(11):
            for j in range(10):
                emb = tensor[t, i, j] @ projection
                attribution[i, j] = float(emb @ gate)
        per_frame.append(alpha[t] * float(np.abs(attribution).sum()))
    peak = int(np.argmax(per_frame))
    ranked = sorted(
        (
            {"frameIndex": t, "defenderIndex": i, "offenseIndex": j, "attributionScore": float(score)}
            for t in range(tensor.shape[0])
            for i in range(11)
            for j in range(10)
            for score in [float((tensor[t, i, j] @ projection) @ gate) * float(alpha[t])]
        ),
        key=lambda r: abs(r["attributionScore"]), reverse=True,
    )[:10]
    return {
        "predictedScheme": classification["predictedScheme"],
        "predictedProbability": classification["predictedProbability"],
        "peakFrame": peak,
        "peakFrameWeight": float(alpha[peak]),
        "rankedPairs": ranked,
        "gradcamByFrame": per_frame,
        "guidedBackpropGate": gate.tolist(),
    }


def run_pipeline(frames: Sequence[dict], dimension: int = 16, k: int = 5) -> dict:
    tensor, dims = engineer_pair_tensor(frames)
    embeddings, projection = frame_embeddings(tensor, dimension=dimension)
    play, alpha, attention = self_attention(embeddings)
    classification = ensemble_classify(play)
    discovery = global_discovery(embeddings, classification, k=k)
    highlights = guided_grad_cam(tensor, alpha, play, classification)
    return {
        "tensorDims": {"frames": dims["frames"], "defenders": 11, "offense": 10, "channels": 8},
        "sensorCorrections": {kk: dims[kk] for kk in ("framesCorrected", "maxSpeedDelta", "maxAccelerationDelta")},
        "embeddingDimension": dimension,
        "alpha": alpha.tolist(),
        "playEmbedding": play.tolist(),
        "classification": classification,
        "globalDiscovery": discovery,
        "instanceHighlights": highlights,
        "attentionShape": list(attention.shape),
        "projectionShape": list(projection.shape),
        "streamCalls": [
            "engineer_pair_tensor", "frame_embeddings", "self_attention",
            "ensemble_classify", "global_discovery", "guided_grad_cam",
        ],
    }


def synthetic_frames(count: int = 4) -> list[dict]:
    frames = []
    for seed in range(count):
        frames.append({
            "defenders": [
                {"x": 5 + i * 0.8 + seed * 0.1, "y": 10 + (i % 5) * 2, "reportedSpeed": 6,
                 "reportedAcceleration": 1, "displacementYards": 0.65}
                for i in range(11)
            ],
            "offense": [
                {"x": 10 + i * 0.7, "y": 8 + (i % 4) * 3 + seed * 0.2, "reportedSpeed": 7,
                 "reportedAcceleration": 1, "displacementYards": 0.75}
                for i in range(10)
            ],
        })
    return frames


def verify() -> int:
    result = run_pipeline(synthetic_frames(4))
    if result["tensorDims"] != {"frames": 4, "defenders": 11, "offense": 10, "channels": 8}:
        print("VERIFY FAIL: tensor dims")
        return 1
    if len(result["classification"]["meanClassProbabilities"]) != 8:
        print("VERIFY FAIL: class head width")
        return 1
    if abs(sum(result["classification"]["meanClassProbabilities"]) - 1) > 1e-6:
        print("VERIFY FAIL: class probabilities do not sum to 1")
        return 1
    if len(result["classification"]["epistemicVariance"]) != 8:
        print("VERIFY FAIL: epistemic variance width")
        return 1
    if len(result["instanceHighlights"]["rankedPairs"]) != 10:
        print("VERIFY FAIL: highlight ranking width")
        return 1
    print(json.dumps({
        "classification": {
            "predictedScheme": result["classification"]["predictedScheme"],
            "predictedProbability": round(result["classification"]["predictedProbability"], 6),
            "epistemicVariance": [round(v, 8) for v in result["classification"]["epistemicVariance"]],
        },
        "globalDiscovery": {
            "coverageSchemeUniqueness": round(result["globalDiscovery"]["coverageSchemeUniqueness"], 6),
            "neighborLabelMismatch": round(result["globalDiscovery"]["neighborLabelMismatch"], 6),
            "perplexity": round(result["globalDiscovery"]["perplexity"], 6),
            "referenceCount": result["globalDiscovery"]["referenceCount"],
        },
        "instanceHighlights": {
            "peakFrame": result["instanceHighlights"]["peakFrame"],
            "peakFrameWeight": round(result["instanceHighlights"]["peakFrameWeight"], 6),
            "topPair": result["instanceHighlights"]["rankedPairs"][0],
        },
    }, indent=2))
    print("VERIFY OK")
    return 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--verify", action="store_true")
    args = ap.parse_args()
    raise SystemExit(verify() if args.verify else 0)

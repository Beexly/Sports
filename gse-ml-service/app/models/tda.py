"""Topological Data Analysis (TDA) features from sequences of 2-D point clouds.

RESEARCH SIDECAR — NOT PRODUCTION. See gse-ml-service/README.md and
app/main.py's module docstring for the full non-production banner.

Pipeline: for each "frame" (a 2-D point cloud, e.g. player/ball positions at
one instant), compute a Vietoris-Rips persistence diagram with `ripser`, turn
the dimension-0 and dimension-1 diagrams into fixed-size "persistence
images" with `persim.PersistenceImager`, flatten and average them within the
frame, then average across all frames to get one fixed-length feature vector
per input sequence.
"""

from __future__ import annotations

import numpy as np
from persim import PersistenceImager
from ripser import ripser

# Fixed persistence-image parameters used everywhere in this module. Chosen
# so the output feature vector has a small, fixed length regardless of how
# many points/frames are supplied.
_PIXEL_SIZE = 0.1
_BIRTH_RANGE = (0.0, 1.0)
_PERS_RANGE = (0.0, 0.5)


def _make_imager() -> PersistenceImager:
    return PersistenceImager(
        pixel_size=_PIXEL_SIZE, birth_range=_BIRTH_RANGE, pers_range=_PERS_RANGE
    )


def _derive_output_length() -> int:
    """Determine the true flattened persistence-image length by actually
    invoking `PersistenceImager.transform` on a trivial (empty) diagram,
    rather than hardcoding a guessed constant.

    With `pixel_size=0.1` over `birth_range=(0, 1)` x `pers_range=(0, 0.5)`,
    this resolves to a `(10, 5)` pixel grid, i.e. a flattened length of
    **50**. That arithmetic (`1.0 / 0.1 = 10` birth pixels,
    `0.5 / 0.1 = 5` persistence pixels) is exactly what `PersistenceImager`
    computes internally from `birth_range` / `pers_range` / `pixel_size`
    (its `.resolution` property), so rather than trust the arithmetic alone
    (library rounding conventions can differ), this function actually calls
    `.transform()` once and reads back the real shape.

    Deliberately does NOT call `.fit()` first: `fit()` is for the case
    where you want `birth_range`/`pers_range` auto-derived from a real
    diagram's min/max values, and calling it here with an empty diagram
    produces `-inf`/`inf` bounds (there is no data to fit to) that then
    blow up the pixel-count arithmetic. Since `birth_range` and
    `pers_range` are already pinned explicitly in `_make_imager()`,
    `.transform()` alone is correct and sufficient — for a zero-length
    (empty) diagram it takes the fast path of returning
    `np.zeros(self.resolution)` directly, which is exactly the shape this
    function needs to read.
    """
    imager = _make_imager()
    empty_diagram = np.zeros((0, 2))
    image = imager.transform(empty_diagram)
    return int(np.asarray(image).flatten().shape[0])


# Computed once at import time (needs ripser/persim, which are hard
# dependencies of this module) and reused as the documented, correctly-sized
# fallback/zero-vector length for empty input and degenerate frames — see
# `_derive_output_length()`'s docstring for the expected value (50).
TDA_FEATURE_LENGTH = _derive_output_length()


def _frame_persistence_image(points: np.ndarray, imager: PersistenceImager) -> np.ndarray:
    """Compute the averaged (dim 0, dim 1) flattened persistence image for
    one frame's point cloud. Assumes `points` already has >= 3 rows.
    """
    diagrams = ripser(points)["dgms"]

    images = []
    for dim in (0, 1):
        if dim >= len(diagrams):
            images.append(np.zeros(TDA_FEATURE_LENGTH))
            continue
        diagram = diagrams[dim]
        # Drop points with infinite persistence (e.g. the dim-0 essential
        # class) — PersistenceImager expects finite (birth, death) pairs.
        finite_mask = np.isfinite(diagram).all(axis=1) if diagram.size else np.array([], dtype=bool)
        finite_diagram = diagram[finite_mask] if diagram.size else diagram
        if finite_diagram.shape[0] == 0:
            images.append(np.zeros(TDA_FEATURE_LENGTH))
            continue
        image = imager.transform(finite_diagram)
        images.append(np.asarray(image).flatten())

    return np.mean(images, axis=0)


def compute_tda_features(frames: list[list[tuple[float, float]]]) -> np.ndarray:
    """Compute averaged persistence-image TDA features across a sequence of frames.

    Parameters
    ----------
    frames:
        A list of frames; each frame is a list of `(x, y)` point tuples
        (e.g. tracked player/ball coordinates at one timestamp).

    Returns
    -------
    np.ndarray
        A 1-D array of length `TDA_FEATURE_LENGTH` (currently 50): the
        dimension-0/dimension-1 persistence images, flattened and averaged
        together, then averaged across all usable frames.

        Returns a zero vector of this same documented length (never a magic
        guess) if `frames` is empty or every frame has fewer than 3 points
        (Vietoris-Rips persistence is not well-defined / not informative
        below 3 points).
    """
    if not frames:
        return np.zeros(TDA_FEATURE_LENGTH)

    imager = _make_imager()
    frame_features = []
    for frame in frames:
        points = np.asarray(frame, dtype=float)
        if points.ndim != 2 or points.shape[0] < 3 or points.shape[1] != 2:
            # Too few points (or malformed shape) to form a meaningful
            # simplicial complex — skip this frame rather than fabricate a
            # feature for it.
            continue
        if not np.all(np.isfinite(points)):
            continue
        frame_features.append(_frame_persistence_image(points, imager))

    if not frame_features:
        return np.zeros(TDA_FEATURE_LENGTH)

    return np.mean(frame_features, axis=0)

"""Topological features from player-tracking coordinates via persistent homology.

What this module IS
-------------------
A fixed-length vectoriser for the *shape* of a set of 2-D player positions. For each
frame it builds the Vietoris-Rips filtration over the players' Euclidean distances
(via ``ripser``), reads off the degree-0 and degree-1 persistence diagrams, converts
each diagram into a **persistence image** (Adams et al., JMLR 2017), and averages the
resulting vectors across frames.

Degree 0 measures how players merge into clusters as a distance threshold grows
(how many groups, and at what separations). Degree 1 measures loops -- a ring of
players enclosing empty space, e.g. a defensive shell around the ball. A noisy circle
of players produces a large, long-lived H1 class; a random blob of the same size and
scale does not. That difference is the signal this module exists to expose, and it is
asserted directly in ``app/tests/test_tda.py``.

The persistence-image code here is written from scratch. ``persim`` (the usual source
of ``PersistenceImager``) does not install on this Python 3.11 environment -- its
transitive dependency ``hopcroftkarp`` fails to build -- so the vectorisation is
implemented and tested locally rather than imported. It follows the standard
construction and integrates each Gaussian **exactly** over every pixel via the error
function, so there is no Riemann-sum approximation error.

What this module IS NOT
-----------------------
* It is **not** scale-invariant, and it is **not** self-calibrating. The persistence
  image is computed on a *fixed* window (``birth_range`` x ``pers_range``, default
  ``[0, 2] x [0, 2]``), which assumes coordinates on a roughly unit scale -- a cloud
  whose diameter is around 2. Raw court/field coordinates (feet, metres, yards) will
  push essentially all of the diagram off the top of the window and collapse the
  feature vector towards a constant. **Rescale your coordinates** (e.g. divide by
  field length) or pass a ``PersistenceImageSpec`` matched to your units. This failure
  mode is not silent: ``compute_tda_features`` emits a ``TDATruncationWarning`` when
  most of the weighted diagram mass overflows the window's *upper* limits.
* It is **not** a model. There is no training, no fitting, no learned parameter. The
  output is a deterministic descriptor intended as *input* to a downstream model.
* It carries **no temporal information**. Frames are vectorised independently and then
  averaged, so a sequence and its shuffle produce the identical vector. Ordering,
  velocity and possession are outside its scope.
* It does **not** track player identity. A frame is an unordered set of points;
  permuting the players within a frame leaves the output unchanged (this is a
  property, not a defect, but it means the vector cannot express "who").
* The H0 block is **structurally sparse**. Under a Vietoris-Rips filtration on a point
  cloud every H0 class is born at time 0, so all H0 mass sits in the low-birth
  columns and the high-birth columns are ~0 for every possible input. Those columns
  are retained only so both homology degrees share one layout and one code path; a
  downstream model should expect near-zero-variance features there.

Handling of infinite bars
-------------------------
Points with infinite death are **dropped**, not clipped. Rationale: a Vietoris-Rips
filtration on *any* finite point cloud yields exactly one essential H0 class (the whole
cloud is a single component once the threshold exceeds its diameter). It is present for
every input, so it carries zero discriminative information, and its persistence is not
a finite number -- clipping it to some maximum would inject an arbitrary constant that
dominates the image and varies with the clip value rather than with the data. Degree-1
diagrams from a finite Rips complex contain no infinite bars at all; they are filtered
anyway, defensively.

Skipped frames
--------------
Frames with fewer than 3 points are skipped: two points span no loop, and ``ripser``
misreads a 2x2 coordinate array as a distance matrix. Skipping is silent and by design.
If *every* frame is skipped (or ``frames`` is empty), the function returns zeros of the
correct length -- never a ragged or empty array, since a variable-length feature vector
would silently corrupt any downstream model.

Cost
----
``ripser`` on ``n`` points is roughly cubic in ``n`` for ``maxdim=1``. Team-sport frames
(10-25 players) are microseconds-to-milliseconds each; this is not intended for clouds
of thousands of points.
"""

from __future__ import annotations

import math
import warnings
from dataclasses import dataclass
from typing import Iterable, Sequence

import numpy as np
from ripser import ripser
from scipy.special import erf

__all__ = [
    "DEFAULT_SPEC",
    "HOMOLOGY_DIMS",
    "MIN_POINTS_PER_FRAME",
    "PersistenceImageSpec",
    "TDATruncationWarning",
    "compute_tda_features",
    "persistence_diagrams",
    "persistence_image",
    "total_persistence",
]

# ``ripser`` is called with ``maxdim=1``, so exactly these two degrees are vectorised,
# in this order, and the feature vector is their images concatenated.
HOMOLOGY_DIMS: tuple[int, ...] = (0, 1)

# Fewer than this many points in a frame -> the frame is skipped. See module docstring.
MIN_POINTS_PER_FRAME: int = 3

_SQRT2 = math.sqrt(2.0)

# If less than this weighted fraction of the diagram lies below the image window's upper
# limits, the window is judged mismatched to the data scale and TDATruncationWarning is
# raised. See ``_image_and_mass`` for why only the upper limits are measured.
_TRUNCATION_WARN_THRESHOLD = 0.5


class TDATruncationWarning(UserWarning):
    """Most of the persistence diagram overflowed the fixed persistence-image window.

    Raised by :func:`compute_tda_features` when the point cloud's scale does not match
    the spec's ``birth_range`` / ``pers_range``. The returned vector is still the
    correct length and still finite, but it is saturated and largely uninformative.
    Rescale the coordinates or widen the spec.
    """


@dataclass(frozen=True)
class PersistenceImageSpec:
    """Geometry of the persistence-image vectorisation.

    The diagram is first mapped from ``(birth, death)`` to ``(birth, persistence)`` with
    ``persistence = death - birth``. A 2-D isotropic Gaussian of standard deviation
    ``sigma`` is centred at each transformed point, scaled by a non-negative weight, and
    integrated exactly over each pixel of a regular grid covering
    ``birth_range x pers_range``.

    Attributes
    ----------
    birth_range, pers_range:
        Half-open windows ``(low, high)`` of the transformed diagram plane that the grid
        covers. Gaussian mass outside the window is simply not captured -- that is the
        documented truncation, and it is what ``TDATruncationWarning`` reports on.
    pixel_size:
        Side length of a (square) pixel. Each range must be an exact multiple of it,
        within floating-point tolerance, so the grid is unambiguous.
    sigma:
        Standard deviation of the Gaussian placed at each diagram point. Larger values
        blur more and therefore make the vector more stable to input perturbation, at
        the cost of resolution. The default equals ``pixel_size``.
    weight_cap:
        Persistence at which the weighting ramp saturates. The weight is
        ``min(persistence, weight_cap) / weight_cap``, so it is 0 exactly on the
        diagonal (``persistence = 0``), rises linearly, and is capped at 1. Vanishing at
        persistence 0 is the whole point of the weighting: diagram points near the
        diagonal are precisely the ones that appear, move and disappear under a tiny
        perturbation of the input, so damping them to nothing is what makes the vector
        stable. Capping keeps the output bounded regardless of data scale.
        ``None`` means "use ``pers_range[1]``".
    """

    birth_range: tuple[float, float] = (0.0, 2.0)
    pers_range: tuple[float, float] = (0.0, 2.0)
    pixel_size: float = 0.2
    sigma: float = 0.2
    weight_cap: float | None = None

    def __post_init__(self) -> None:
        for name in ("birth_range", "pers_range"):
            low, high = getattr(self, name)
            if not (math.isfinite(low) and math.isfinite(high)):
                raise ValueError(f"{name} must be finite, got {(low, high)!r}")
            if high <= low:
                raise ValueError(f"{name} must satisfy high > low, got {(low, high)!r}")
        if not (math.isfinite(self.pixel_size) and self.pixel_size > 0.0):
            raise ValueError(f"pixel_size must be finite and > 0, got {self.pixel_size!r}")
        if not (math.isfinite(self.sigma) and self.sigma > 0.0):
            raise ValueError(f"sigma must be finite and > 0, got {self.sigma!r}")
        if self.weight_cap is not None and not (
            math.isfinite(self.weight_cap) and self.weight_cap > 0.0
        ):
            raise ValueError(f"weight_cap must be finite and > 0, got {self.weight_cap!r}")
        # Force an unambiguous grid: both axes must tile exactly into whole pixels.
        for name in ("birth_range", "pers_range"):
            low, high = getattr(self, name)
            n_exact = (high - low) / self.pixel_size
            if abs(n_exact - round(n_exact)) > 1e-9 or round(n_exact) < 1:
                raise ValueError(
                    f"{name} span {high - low!r} is not a positive whole multiple of "
                    f"pixel_size {self.pixel_size!r}"
                )

    @property
    def effective_weight_cap(self) -> float:
        """The persistence at which the weight ramp saturates at 1.0."""
        return float(self.pers_range[1]) if self.weight_cap is None else float(self.weight_cap)

    @property
    def n_birth_pixels(self) -> int:
        """Number of grid columns along the birth axis."""
        return int(round((self.birth_range[1] - self.birth_range[0]) / self.pixel_size))

    @property
    def n_pers_pixels(self) -> int:
        """Number of grid rows along the persistence axis."""
        return int(round((self.pers_range[1] - self.pers_range[0]) / self.pixel_size))

    @property
    def image_length(self) -> int:
        """Length of the flattened image for a *single* homology degree."""
        return self.n_birth_pixels * self.n_pers_pixels

    @property
    def feature_length(self) -> int:
        """Length of the full concatenated feature vector across ``HOMOLOGY_DIMS``."""
        return self.image_length * len(HOMOLOGY_DIMS)

    def birth_edges(self) -> np.ndarray:
        """Pixel boundaries along the birth axis, length ``n_birth_pixels + 1``."""
        return np.linspace(
            self.birth_range[0], self.birth_range[1], self.n_birth_pixels + 1, dtype=np.float64
        )

    def pers_edges(self) -> np.ndarray:
        """Pixel boundaries along the persistence axis, length ``n_pers_pixels + 1``."""
        return np.linspace(
            self.pers_range[0], self.pers_range[1], self.n_pers_pixels + 1, dtype=np.float64
        )

    def slice_for_dim(self, dim: int) -> slice:
        """Slice of the feature vector holding the image for homology degree ``dim``."""
        try:
            block = HOMOLOGY_DIMS.index(dim)
        except ValueError:  # pragma: no cover - guarded by the raise below
            raise ValueError(f"dim must be one of {HOMOLOGY_DIMS}, got {dim!r}") from None
        return slice(block * self.image_length, (block + 1) * self.image_length)


DEFAULT_SPEC = PersistenceImageSpec()


def _as_point_cloud(frame: Sequence[tuple[float, float]], index: int) -> np.ndarray:
    """Validate one frame and return it as a contiguous ``(n, 2)`` float64 array.

    Raises ``ValueError`` on NaN/infinite coordinates or on anything that is not a
    sequence of 2-D points. Rejecting loudly is deliberate: silently dropping a NaN
    player -- or passing it through to ``ripser`` -- would yield NaN features that
    poison a downstream model without any visible failure.
    """
    try:
        points = np.asarray(frame, dtype=np.float64)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"frame {index} is not convertible to a float array: {exc}") from exc

    if points.size == 0:
        # Both `[]` and `np.empty((0, 2))` normalise to an empty (0, 2) cloud, which is
        # then skipped by the < MIN_POINTS_PER_FRAME rule.
        return np.empty((0, 2), dtype=np.float64)
    if points.ndim != 2 or points.shape[1] != 2:
        raise ValueError(
            f"frame {index} must have shape (n_players, 2) of (x, y) pairs, got "
            f"shape {points.shape}"
        )
    if not np.isfinite(points).all():
        bad = int(np.count_nonzero(~np.isfinite(points)))
        raise ValueError(
            f"frame {index} contains {bad} non-finite coordinate(s) (NaN or inf); "
            "clean or drop those players before computing TDA features"
        )
    return np.ascontiguousarray(points)


def persistence_diagrams(points: np.ndarray) -> tuple[np.ndarray, ...]:
    """Finite H0 and H1 persistence diagrams of a 2-D point cloud.

    Parameters
    ----------
    points:
        ``(n, 2)`` array of coordinates. Must already be validated/finite.

    Returns
    -------
    One ``(k_d, 2)`` float64 array of ``(birth, death)`` pairs per degree in
    ``HOMOLOGY_DIMS``. Infinite-death classes are removed (see module docstring), so a
    degree with no finite classes yields an empty ``(0, 2)`` array rather than ``None``.
    """
    diagrams = ripser(points, maxdim=max(HOMOLOGY_DIMS))["dgms"]
    finite: list[np.ndarray] = []
    for dim in HOMOLOGY_DIMS:
        diagram = np.asarray(diagrams[dim], dtype=np.float64).reshape(-1, 2)
        keep = np.isfinite(diagram).all(axis=1)
        finite.append(np.ascontiguousarray(diagram[keep]))
    return tuple(finite)


def total_persistence(diagram: np.ndarray) -> float:
    """Sum of ``death - birth`` over a finite diagram; 0.0 for an empty diagram.

    This is the raw, unvectorised topological quantity -- no smoothing, no weighting,
    no grid. It exists so callers (and the tests) can check that the underlying homology
    says what the feature vector claims it says.
    """
    diagram = np.asarray(diagram, dtype=np.float64).reshape(-1, 2)
    if diagram.shape[0] == 0:
        return 0.0
    return float(np.sum(diagram[:, 1] - diagram[:, 0]))


def _pixel_masses(centres: np.ndarray, edges: np.ndarray, sigma: float) -> np.ndarray:
    """Exact per-bin integral of a unit 1-D Gaussian, for each centre.

    Returns ``(n_centres, len(edges) - 1)``. The integral of ``N(c, sigma^2)`` over
    ``[e_i, e_{i+1}]`` is ``Phi((e_{i+1} - c)/sigma) - Phi((e_i - c)/sigma)``; using the
    error function directly makes this exact, so the 2-D image is an exact integral of
    the Gaussian over each pixel rather than a midpoint approximation.
    """
    z = (edges[None, :] - centres[:, None]) / (sigma * _SQRT2)
    cdf = 0.5 * (1.0 + erf(z))
    return np.diff(cdf, axis=1)


def _image_and_mass(
    diagram: np.ndarray, spec: PersistenceImageSpec
) -> tuple[np.ndarray, float, float]:
    """Persistence image plus ``(in_window_weight, total_weight)`` for scale reporting.

    The image has shape ``(n_birth_pixels, n_pers_pixels)`` and is non-negative by
    construction: weights are non-negative and every pixel mass is a difference of a
    monotone CDF.

    ``in_window_weight`` deliberately measures **overflow past the upper edges only** --
    the weighted Gaussian mass lying below ``birth_range[1]`` and ``pers_range[1]``. It
    ignores mass lost off the *lower* edges, because that loss is structural rather than
    diagnostic: under a Rips filtration every H0 class is born at exactly 0, so half of
    every H0 birth Gaussian always falls at birth < 0 no matter how well the window is
    matched to the data. Counting that would fire the truncation warning on every input.
    Overflowing the *upper* edges is the real failure mode -- it is what happens when
    coordinates are in feet rather than unit-scaled -- and that is what is measured.
    """
    n_birth = spec.n_birth_pixels
    n_pers = spec.n_pers_pixels
    diagram = np.asarray(diagram, dtype=np.float64).reshape(-1, 2)
    if diagram.shape[0] == 0:
        return np.zeros((n_birth, n_pers), dtype=np.float64), 0.0, 0.0

    births = diagram[:, 0]
    persistences = diagram[:, 1] - births
    # Rips deaths are >= births, but clamp defensively so a pathological input can never
    # produce a negative weight (which would break the non-negativity guarantee).
    persistences = np.maximum(persistences, 0.0)
    weights = np.minimum(persistences, spec.effective_weight_cap) / spec.effective_weight_cap

    birth_mass = _pixel_masses(births, spec.birth_edges(), spec.sigma)
    pers_mass = _pixel_masses(persistences, spec.pers_edges(), spec.sigma)

    image = np.einsum("n,ni,nj->ij", weights, birth_mass, pers_mass, optimize=True)

    below_top_birth = 0.5 * (1.0 + erf((spec.birth_range[1] - births) / (spec.sigma * _SQRT2)))
    below_top_pers = 0.5 * (1.0 + erf((spec.pers_range[1] - persistences) / (spec.sigma * _SQRT2)))
    in_window = float(np.sum(weights * below_top_birth * below_top_pers))
    return image, in_window, float(np.sum(weights))


def persistence_image(diagram: np.ndarray, spec: PersistenceImageSpec = DEFAULT_SPEC) -> np.ndarray:
    """Vectorise one finite persistence diagram into a fixed-length, non-negative vector.

    Parameters
    ----------
    diagram:
        ``(k, 2)`` array of finite ``(birth, death)`` pairs. May be empty.
    spec:
        Grid geometry and weighting; see :class:`PersistenceImageSpec`.

    Returns
    -------
    Flattened (C-order) image of length ``spec.image_length``. Row index is the birth
    bin, column index the persistence bin. Every entry is finite and ``>= 0``.
    """
    image, _, _ = _image_and_mass(diagram, spec)
    return image.reshape(-1)


def compute_tda_features(
    frames: Iterable[Sequence[tuple[float, float]]],
    spec: PersistenceImageSpec = DEFAULT_SPEC,
) -> np.ndarray:
    """Average persistence-image features over a sequence of player-position frames.

    Parameters
    ----------
    frames:
        Iterable of frames; each frame is a sequence of ``(x, y)`` player positions.
        Frames with fewer than ``MIN_POINTS_PER_FRAME`` points are skipped.
    spec:
        Persistence-image geometry. The default assumes coordinates on a roughly unit
        scale -- see the module docstring before feeding it raw court coordinates.

    Returns
    -------
    A float64 vector of length ``spec.feature_length``, **always** -- including for an
    empty input or an input whose every frame is skipped, in which case it is all
    zeros. The first ``spec.image_length`` entries are the H0 image, the next
    ``spec.image_length`` the H1 image (use ``spec.slice_for_dim``). All entries are
    finite and non-negative.

    Raises
    ------
    ValueError
        If any frame is not an ``(n, 2)`` array of finite coordinates. NaN input is
        rejected here rather than being allowed to propagate into NaN features.

    Warns
    -----
    TDATruncationWarning
        If most of the diagram weight falls outside the image window, i.e. the data
        scale does not match ``spec``.
    """
    accumulator = np.zeros(spec.feature_length, dtype=np.float64)
    n_used = 0
    in_window_total = 0.0
    weight_total = 0.0

    for index, frame in enumerate(frames):
        points = _as_point_cloud(frame, index)
        if points.shape[0] < MIN_POINTS_PER_FRAME:
            continue

        diagrams = persistence_diagrams(points)
        blocks: list[np.ndarray] = []
        for diagram in diagrams:
            image, in_window, weight = _image_and_mass(diagram, spec)
            blocks.append(image.reshape(-1))
            in_window_total += in_window
            weight_total += weight
        accumulator += np.concatenate(blocks)
        n_used += 1

    if n_used == 0:
        return accumulator  # zeros of the correct length

    if weight_total > 0.0 and in_window_total / weight_total < _TRUNCATION_WARN_THRESHOLD:
        warnings.warn(
            f"only {in_window_total / weight_total:.1%} of persistence-diagram weight fell "
            f"below the image window's upper limits birth<={spec.birth_range[1]} "
            f"pers<={spec.pers_range[1]}; the feature vector is saturated. Rescale the "
            "coordinates (e.g. divide by field length) or widen the spec.",
            TDATruncationWarning,
            stacklevel=2,
        )

    return accumulator / n_used

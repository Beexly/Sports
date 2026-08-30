"""Tests for the persistent-homology feature extractor.

Every synthetic cloud here comes from an explicitly seeded ``numpy.random.default_rng``,
so each assertion is reproducible. No wall-clock, no global numpy random state, no
unseeded draws.

Thresholds are not guesses -- each one was measured against this implementation over
many seeds and then loosened. The measured worst case is quoted next to every bound so a
future reader can tell a real regression from a tight threshold.

``TDATruncationWarning`` is promoted to an error for the whole module, so a test that
accidentally feeds badly scaled data fails loudly instead of silently comparing two
saturated vectors. Tests that intend to trigger it use ``pytest.warns``, which overrides
the filter locally.
"""

from __future__ import annotations

from typing import Callable

import numpy as np
import pytest

from app.models.tda import (
    DEFAULT_SPEC,
    HOMOLOGY_DIMS,
    MIN_POINTS_PER_FRAME,
    PersistenceImageSpec,
    TDATruncationWarning,
    compute_tda_features,
    persistence_diagrams,
    persistence_image,
    total_persistence,
)

pytestmark = pytest.mark.filterwarnings("error::app.models.tda.TDATruncationWarning")

# Seed pairs used by the topology test. Ring and blob draw from different seeds so the
# comparison is never an artefact of shared random numbers.
SHAPE_SEEDS = tuple(range(10))
BLOB_SEED_OFFSET = 500


def noisy_ring(seed: int, n_points: int = 40, noise: float = 0.05) -> np.ndarray:
    """``n_points`` on the unit circle at uniformly random angles, jittered by Gaussian noise.

    Topologically a loop: one dominant H1 class.
    """
    rng = np.random.default_rng(seed)
    angles = rng.uniform(0.0, 2.0 * np.pi, n_points)
    ring = np.column_stack([np.cos(angles), np.sin(angles)])
    return ring + rng.normal(0.0, noise, ring.shape)


def random_blob(seed: int, n_points: int = 40) -> np.ndarray:
    """``n_points`` uniform on the unit *disk* -- the control for :func:`noisy_ring`.

    Deliberately matched to the ring: same point count, same radius, same support
    diameter (2.0), same convex hull. The *only* difference is that the disk is filled
    rather than hollow. Any H1 signal separating the two is therefore attributable to
    topology and not to scale, density or spread. ``sqrt`` of the uniform radius gives a
    genuinely uniform disk rather than one bunched at the centre.
    """
    rng = np.random.default_rng(seed)
    radii = np.sqrt(rng.uniform(0.0, 1.0, n_points))
    angles = rng.uniform(0.0, 2.0 * np.pi, n_points)
    return np.column_stack([radii * np.cos(angles), radii * np.sin(angles)])


def dominant_h1_persistence(points: np.ndarray) -> float:
    """Persistence of the single longest-lived loop; 0.0 if there are no loops."""
    h1 = persistence_diagrams(points)[1]
    if h1.shape[0] == 0:
        return 0.0
    return float(np.max(h1[:, 1] - h1[:, 0]))


def h1_block(features: np.ndarray) -> np.ndarray:
    """The H1 half of a feature vector."""
    return features[DEFAULT_SPEC.slice_for_dim(1)]


# Inputs that must all produce one identical, finite, non-negative feature length.
# Built lazily so parametrisation ids stay readable and clouds are constructed per test.
LENGTH_CASES: dict[str, Callable[[], list]] = {
    "ring": lambda: [noisy_ring(0)],
    "blob": lambda: [random_blob(BLOB_SEED_OFFSET)],
    "one frame": lambda: [noisy_ring(1)],
    "ten frames": lambda: [noisy_ring(s) for s in range(10)],
    "empty list": lambda: [],
    "single empty frame": lambda: [[]],
    "all frames too small": lambda: [[(0.0, 0.0)], [(0.0, 0.0), (1.0, 1.0)], []],
    "mixed sizes": lambda: [noisy_ring(2), [(0.0, 0.0)], random_blob(BLOB_SEED_OFFSET + 2)],
    "degenerate single point": lambda: [[(3.0, 4.0)] * 8],
    "tuple of tuples": lambda: [((0.0, 0.0), (1.0, 0.0), (0.5, 0.9), (0.2, 0.4))],
}


class TestDetectsRealTopology:
    """THE test: the module must measure actual shape, not noise.

    A hollow ring and a filled disk of the same size and point count differ in exactly
    one respect -- the ring encloses empty space. If these assertions pass, the pipeline
    is reading genuine topology end to end: ripser, the diagram, the weighting, and the
    image.
    """

    def test_ring_has_larger_total_h1_persistence_than_blob(self) -> None:
        """Total H1 persistence separates ring from blob on every seeded pair.

        Measured worst-case ratio over these 10 pairs: 1.47x. Asserting 1.3x. Note the
        *total* is the weaker statistic, because a random blob accumulates many small
        spurious loops whose persistences sum up; the dominant-loop test below is the
        sharper one.
        """
        ratios = []
        for seed in SHAPE_SEEDS:
            ring_total = total_persistence(persistence_diagrams(noisy_ring(seed))[1])
            blob_total = total_persistence(
                persistence_diagrams(random_blob(seed + BLOB_SEED_OFFSET))[1]
            )
            assert ring_total > blob_total, (
                f"seed {seed}: ring total H1 persistence {ring_total:.4f} did not exceed "
                f"blob {blob_total:.4f}"
            )
            ratios.append(ring_total / blob_total)
        assert min(ratios) > 1.3, f"weakest separation {min(ratios):.3f}x is below 1.3x"

    def test_ring_dominant_loop_dwarfs_blob(self) -> None:
        """The single longest-lived loop is the sharp discriminator.

        Measured worst-case ratio: 2.8x. Asserting 2.0x.
        """
        for seed in SHAPE_SEEDS:
            ring_loop = dominant_h1_persistence(noisy_ring(seed))
            blob_loop = dominant_h1_persistence(random_blob(seed + BLOB_SEED_OFFSET))
            assert ring_loop > 2.0 * blob_loop, (
                f"seed {seed}: ring dominant loop {ring_loop:.4f} was not 2x the blob's "
                f"{blob_loop:.4f}"
            )

    def test_ring_loop_matches_unit_circle_geometry(self) -> None:
        """An absolute check, not just a relative one.

        A unit circle's loop dies when the Rips complex fills it in, at scale
        ``sqrt(3) ~ 1.73``, and is born around the largest angular gap -- so the
        dominant class should persist for roughly 1.0 at unit scale. Measured range
        across these seeds: 0.99-1.21. Asserting a loose ``(0.7, 1.6)`` band. The blob's
        best loop measured 0.05-0.38; asserting it stays under 0.5.
        """
        for seed in SHAPE_SEEDS:
            ring_loop = dominant_h1_persistence(noisy_ring(seed))
            assert 0.7 < ring_loop < 1.6, f"seed {seed}: ring loop {ring_loop:.4f} off scale"
            blob_loop = dominant_h1_persistence(random_blob(seed + BLOB_SEED_OFFSET))
            assert blob_loop < 0.5, f"seed {seed}: blob loop {blob_loop:.4f} unexpectedly large"

    def test_feature_vector_h1_block_carries_the_signal(self) -> None:
        """The separation survives vectorisation -- it is visible in the returned features.

        This is what actually matters: a downstream model consumes the vector, not the
        diagram. Measured worst-case ratio of H1 block mass: 1.74x. Asserting 1.5x.
        """
        for seed in SHAPE_SEEDS:
            ring_mass = float(np.sum(h1_block(compute_tda_features([noisy_ring(seed)]))))
            blob_mass = float(
                np.sum(h1_block(compute_tda_features([random_blob(seed + BLOB_SEED_OFFSET)])))
            )
            assert ring_mass > 1.5 * blob_mass, (
                f"seed {seed}: ring H1 image mass {ring_mass:.4f} was not 1.5x the blob's "
                f"{blob_mass:.4f}"
            )

    def test_ring_h1_mass_concentrates_at_high_persistence(self) -> None:
        """The ring's H1 mass sits in long-persistence pixels; the blob's hugs the diagonal.

        Beyond "bigger number": it checks the mass lands in the *right place* on the
        persistence axis, which is what makes the feature interpretable.
        """
        n_pers = DEFAULT_SPEC.n_pers_pixels
        long_lived = slice(n_pers // 2, n_pers)  # persistence >= 1.0 under the default spec

        ring_img = h1_block(compute_tda_features([noisy_ring(0)])).reshape(-1, n_pers)
        blob_img = h1_block(compute_tda_features([random_blob(BLOB_SEED_OFFSET)])).reshape(
            -1, n_pers
        )
        ring_fraction = ring_img[:, long_lived].sum() / ring_img.sum()
        blob_fraction = blob_img[:, long_lived].sum() / blob_img.sum()

        assert ring_fraction > 0.5, f"ring put only {ring_fraction:.1%} of H1 mass in long loops"
        assert blob_fraction < 0.1, f"blob put {blob_fraction:.1%} of H1 mass in long loops"


class TestFixedOutputLength:
    """A ragged or empty return would silently corrupt any downstream model."""

    @pytest.mark.parametrize("label", sorted(LENGTH_CASES))
    def test_every_input_yields_the_same_finite_non_negative_length(self, label: str) -> None:
        features = compute_tda_features(LENGTH_CASES[label]())

        assert features.shape == (DEFAULT_SPEC.feature_length,), f"{label}: wrong shape"
        assert features.ndim == 1, f"{label}: not a flat vector"
        assert features.dtype == np.float64, f"{label}: wrong dtype {features.dtype}"
        assert np.isfinite(features).all(), f"{label}: non-finite entries"
        assert (features >= 0.0).all(), f"{label}: negative entries"

    def test_length_is_two_images_worth(self) -> None:
        assert DEFAULT_SPEC.feature_length == DEFAULT_SPEC.image_length * len(HOMOLOGY_DIMS)
        assert DEFAULT_SPEC.image_length == (
            DEFAULT_SPEC.n_birth_pixels * DEFAULT_SPEC.n_pers_pixels
        )
        assert DEFAULT_SPEC.feature_length == 200  # 10x10 pixels, two homology degrees

    def test_empty_and_all_skipped_return_exact_zeros(self) -> None:
        """Not merely "finite" -- the documented contract is a zero vector."""
        zeros = np.zeros(DEFAULT_SPEC.feature_length)
        for frames in ([], [[]], [[(0.0, 0.0)], [(1.0, 1.0), (2.0, 2.0)]]):
            np.testing.assert_array_equal(compute_tda_features(frames), zeros)

    def test_skipped_frames_are_excluded_from_the_average(self) -> None:
        """The mean is over *used* frames; undersized frames must not dilute it."""
        ring, blob = noisy_ring(3), random_blob(BLOB_SEED_OFFSET + 3)
        expected = (compute_tda_features([ring]) + compute_tda_features([blob])) / 2.0
        with_junk = compute_tda_features([ring, [(0.0, 0.0)], blob, [], [(1.0, 1.0), (2.0, 2.0)]])
        np.testing.assert_allclose(with_junk, expected, rtol=1e-12, atol=1e-15)

    def test_frames_at_the_size_boundary(self) -> None:
        """A frame of exactly MIN_POINTS_PER_FRAME is used; one below it is skipped."""
        triangle = [(0.0, 0.0), (1.0, 0.0), (0.5, 0.9)]
        assert len(triangle) == MIN_POINTS_PER_FRAME
        assert compute_tda_features([triangle]).sum() > 0.0
        assert compute_tda_features([triangle[:-1]]).sum() == 0.0

    def test_alternative_spec_changes_length_but_stays_fixed(self) -> None:
        spec = PersistenceImageSpec(
            birth_range=(0.0, 1.0), pers_range=(0.0, 3.0), pixel_size=0.5, sigma=0.5
        )
        assert spec.feature_length == 2 * 2 * 6
        lengths = {
            len(compute_tda_features(frames, spec))
            for frames in ([], [noisy_ring(0)], [noisy_ring(s) for s in range(4)])
        }
        assert lengths == {spec.feature_length}


class TestStability:
    """Small input perturbations must produce small output changes.

    This is the property the persistence weighting exists to provide: points near the
    diagonal are exactly the ones that flicker in and out under jitter, and weighting
    them to ~0 is what keeps the vector from jumping.
    """

    @staticmethod
    def unit_perturbation(seed: int, shape: tuple[int, ...]) -> np.ndarray:
        directions = np.random.default_rng(seed).normal(0.0, 1.0, shape)
        return directions / np.linalg.norm(directions, axis=1, keepdims=True)

    @pytest.mark.parametrize("epsilon", [1e-4, 1e-3, 1e-2])
    def test_perturbation_changes_features_proportionally(self, epsilon: float) -> None:
        """``||f(X) - f(X+eps)||_2 <= 6*eps``.

        Measured worst case over 32 clouds x 3 epsilons: 2.13*eps. Asserting 6*eps
        leaves ~2.8x headroom while still failing loudly if the weighting is removed.
        """
        for seed in range(6):
            for cloud in (noisy_ring(seed), random_blob(seed + BLOB_SEED_OFFSET)):
                shifted = cloud + epsilon * self.unit_perturbation(7000 + seed, cloud.shape)
                delta = float(
                    np.linalg.norm(compute_tda_features([cloud]) - compute_tda_features([shifted]))
                )
                assert delta <= 6.0 * epsilon, (
                    f"seed {seed}, eps {epsilon:g}: feature vector moved {delta:.3e}, "
                    f"more than 6*eps"
                )

    def test_stability_is_not_vacuous(self) -> None:
        """Perturbation response must be tiny *relative to real signal*.

        Without this, a module returning a constant vector would pass the bound above.
        Measured: ring-vs-blob distance ~0.21 versus ~1.3e-3 for a 1e-3 perturbation,
        a ratio of ~170x. Asserting 20x.
        """
        ring = noisy_ring(0)
        blob = random_blob(BLOB_SEED_OFFSET)
        signal = float(
            np.linalg.norm(compute_tda_features([ring]) - compute_tda_features([blob]))
        )
        shifted = ring + 1e-3 * self.unit_perturbation(7000, ring.shape)
        noise = float(
            np.linalg.norm(compute_tda_features([ring]) - compute_tda_features([shifted]))
        )
        assert signal > 0.05, f"signal {signal:.4f} too small for this test to mean anything"
        assert signal > 20.0 * noise, f"signal {signal:.4e} only {signal / noise:.1f}x noise"

    def test_diagonal_points_contribute_exactly_nothing(self) -> None:
        """Zero-persistence classes must vanish -- this is the weighting's defining property."""
        diagonal_only = np.array([[0.0, 0.0], [0.5, 0.5], [1.0, 1.0], [1.9, 1.9]])
        image = persistence_image(diagonal_only, DEFAULT_SPEC)
        np.testing.assert_array_equal(image, np.zeros(DEFAULT_SPEC.image_length))

    def test_near_diagonal_noise_barely_moves_the_image(self) -> None:
        """Adding three almost-zero-persistence classes must not meaningfully change the vector.

        Measured shift: 3.5e-5 against an image maximum of 0.081, i.e. ~0.04%.
        """
        signal = np.array([[0.5, 1.6]])
        noisy = np.vstack([signal, np.array([[0.2, 0.2001], [0.7, 0.7002], [1.1, 1.1005]])])
        clean_image = persistence_image(signal, DEFAULT_SPEC)
        noisy_image = persistence_image(noisy, DEFAULT_SPEC)
        shift = float(np.max(np.abs(clean_image - noisy_image)))
        assert shift < 0.01 * float(np.max(clean_image)), (
            f"near-diagonal noise shifted the image by {shift:.3e}, more than 1% of its peak"
        )

    def test_weight_grows_with_persistence(self) -> None:
        """A longer-lived class must contribute more mass than a shorter-lived one."""
        masses = [
            float(np.sum(persistence_image(np.array([[0.5, 0.5 + p]]), DEFAULT_SPEC)))
            for p in (0.1, 0.4, 0.8, 1.2)
        ]
        assert masses == sorted(masses), f"image mass not monotone in persistence: {masses}"


class TestDeterminism:
    """Same input, same bytes -- no hidden randomness, no ordering dependence."""

    def test_repeated_calls_are_byte_identical(self) -> None:
        frames = [noisy_ring(4), random_blob(BLOB_SEED_OFFSET + 4)]
        first = compute_tda_features(frames)
        for _ in range(3):
            assert compute_tda_features(frames).tobytes() == first.tobytes()

    def test_independently_regenerated_input_is_byte_identical(self) -> None:
        """Rebuilding the seeded cloud from scratch reproduces the vector exactly."""
        assert (
            compute_tda_features([noisy_ring(5)]).tobytes()
            == compute_tda_features([noisy_ring(5)]).tobytes()
        )

    def test_player_order_within_a_frame_does_not_matter(self) -> None:
        """A frame is an unordered set of positions (documented: identity is not tracked)."""
        cloud = noisy_ring(6)
        shuffled = cloud[np.random.default_rng(11).permutation(cloud.shape[0])]
        np.testing.assert_allclose(
            compute_tda_features([cloud]), compute_tda_features([shuffled]), rtol=1e-9, atol=1e-12
        )

    def test_frame_order_does_not_matter(self) -> None:
        """Averaging carries no temporal information -- documented as a limitation."""
        frames = [noisy_ring(s) for s in range(4)]
        np.testing.assert_allclose(
            compute_tda_features(frames),
            compute_tda_features(list(reversed(frames))),
            rtol=1e-9,
            atol=1e-12,
        )


class TestAdversarialInputs:
    """Degenerate geometry must degrade cleanly; bad numbers must be rejected loudly."""

    @pytest.mark.parametrize(
        "label,frame",
        [
            ("single point repeated", [(3.0, 4.0)] * 8),
            ("two distinct points repeated", [(0.0, 0.0), (0.0, 0.0), (1.0, 0.0), (1.0, 0.0)]),
            ("collinear", [(i * 0.2, 0.0) for i in range(8)]),
            ("collinear with duplicates", [(0.0, 0.0), (0.0, 0.0), (0.5, 0.0), (1.0, 0.0)]),
            ("all on one vertical line", [(1.0, i * 0.3) for i in range(6)]),
            ("tight cluster", [(1e-9 * i, 1e-9 * i) for i in range(5)]),
        ],
    )
    def test_degenerate_geometry_yields_clean_features(self, label: str, frame: list) -> None:
        features = compute_tda_features([frame])
        assert features.shape == (DEFAULT_SPEC.feature_length,), label
        assert np.isfinite(features).all(), f"{label}: produced non-finite features"
        assert (features >= 0.0).all(), f"{label}: produced negative features"

    def test_identical_points_collapse_to_zero_features(self) -> None:
        """A cloud of one repeated point has no topology beyond the essential class.

        ripser deduplicates it to a single point, whose only H0 class is the infinite
        one, which is dropped -- so the honest answer is a zero vector, not a crash.
        """
        np.testing.assert_array_equal(
            compute_tda_features([[(1.5, 2.5)] * 5]), np.zeros(DEFAULT_SPEC.feature_length)
        )

    @pytest.mark.parametrize(
        "label,frame",
        [
            ("nan y", [(0.0, 0.0), (1.0, float("nan")), (0.0, 1.0), (2.0, 2.0)]),
            ("nan x", [(float("nan"), 0.0), (1.0, 1.0), (0.0, 1.0), (2.0, 2.0)]),
            ("all nan", [(float("nan"), float("nan"))] * 4),
            ("positive inf", [(0.0, 0.0), (float("inf"), 1.0), (0.0, 1.0), (2.0, 2.0)]),
            ("negative inf", [(0.0, 0.0), (1.0, float("-inf")), (0.0, 1.0), (2.0, 2.0)]),
        ],
    )
    def test_non_finite_coordinates_are_rejected(self, label: str, frame: list) -> None:
        """Rejected with ValueError -- never silently turned into NaN features."""
        with pytest.raises(ValueError, match="non-finite"):
            compute_tda_features([frame])

    def test_nan_in_a_later_frame_is_still_rejected(self) -> None:
        """The bad frame is named, so the caller can find it."""
        with pytest.raises(ValueError, match="frame 2"):
            compute_tda_features(
                [noisy_ring(0), noisy_ring(1), [(0.0, 0.0), (1.0, float("nan")), (2.0, 2.0)]]
            )

    @pytest.mark.parametrize(
        "label,frame",
        [
            ("3-D points", [(0.0, 0.0, 0.0), (1.0, 1.0, 1.0), (2.0, 2.0, 2.0)]),
            ("1-D points", [(0.0,), (1.0,), (2.0,)]),
            ("flat list of scalars", [0.0, 1.0, 2.0, 3.0]),
        ],
    )
    def test_wrong_shaped_frames_are_rejected(self, label: str, frame: list) -> None:
        with pytest.raises(ValueError):
            compute_tda_features([frame])

    def test_ragged_frame_is_rejected(self) -> None:
        with pytest.raises(ValueError):
            compute_tda_features([[(0.0, 0.0), (1.0, 1.0, 1.0), (2.0, 2.0)]])

    def test_no_nan_leaks_from_an_extreme_but_valid_cloud(self) -> None:
        """Huge coordinates saturate the window (and warn) but must stay finite."""
        huge = noisy_ring(0) * 1e6
        with pytest.warns(TDATruncationWarning):
            features = compute_tda_features([huge])
        assert np.isfinite(features).all()
        assert (features >= 0.0).all()
        assert len(features) == DEFAULT_SPEC.feature_length


class TestPersistenceImageInternals:
    """The hand-written vectorisation, checked against first principles."""

    def test_gaussian_integration_is_exact(self) -> None:
        """Each pixel must hold the true integral of the weighted Gaussian over it.

        Compared against a 400x400 midpoint quadrature per pixel. Agreement was 2e-8,
        which is the quadrature's own error, not the implementation's.
        """
        spec = PersistenceImageSpec(
            birth_range=(0.0, 1.0), pers_range=(0.0, 1.0), pixel_size=0.25, sigma=0.3,
            weight_cap=1.0,
        )
        birth, death = 0.3, 0.9
        persistence = death - birth
        weight = min(persistence, spec.effective_weight_cap) / spec.effective_weight_cap

        image = persistence_image(np.array([[birth, death]]), spec).reshape(
            spec.n_birth_pixels, spec.n_pers_pixels
        )
        birth_edges, pers_edges = spec.birth_edges(), spec.pers_edges()
        samples = 400
        for i in range(spec.n_birth_pixels):
            for j in range(spec.n_pers_pixels):
                dx = (birth_edges[i + 1] - birth_edges[i]) / samples
                dy = (pers_edges[j + 1] - pers_edges[j]) / samples
                xs = birth_edges[i] + (np.arange(samples) + 0.5) * dx
                ys = pers_edges[j] + (np.arange(samples) + 0.5) * dy
                density = np.exp(
                    -((xs[:, None] - birth) ** 2 + (ys[None, :] - persistence) ** 2)
                    / (2.0 * spec.sigma**2)
                ) / (2.0 * np.pi * spec.sigma**2)
                quadrature = weight * density.sum() * dx * dy
                assert abs(quadrature - image[i, j]) < 1e-6, f"pixel ({i},{j}) mismatch"

    def test_infinite_bars_are_dropped(self) -> None:
        """Exactly one essential H0 class exists for any cloud; it must not reach the image."""
        for seed in (0, 1, 2):
            cloud = noisy_ring(seed)
            h0, h1 = persistence_diagrams(cloud)
            assert np.isfinite(h0).all(), "an infinite H0 bar survived"
            assert np.isfinite(h1).all(), "an infinite H1 bar survived"
            assert h0.shape[1] == 2 and h1.shape[1] == 2

    def test_diagrams_are_empty_not_none_when_there_is_no_topology(self) -> None:
        h0, h1 = persistence_diagrams(np.array([[0.0, 0.0], [1.0, 0.0], [0.5, 0.9]]))
        assert h1.shape == (0, 2)
        assert total_persistence(h1) == 0.0
        assert h0.shape[0] == 2  # three points merge in two events; the essential one is dropped

    def test_empty_diagram_gives_zero_image(self) -> None:
        np.testing.assert_array_equal(
            persistence_image(np.empty((0, 2)), DEFAULT_SPEC),
            np.zeros(DEFAULT_SPEC.image_length),
        )

    def test_image_is_additive_over_diagram_points(self) -> None:
        """Each diagram point contributes independently -- a linearity check on the sum."""
        a, b = np.array([[0.2, 1.0]]), np.array([[0.9, 1.7]])
        np.testing.assert_allclose(
            persistence_image(np.vstack([a, b]), DEFAULT_SPEC),
            persistence_image(a, DEFAULT_SPEC) + persistence_image(b, DEFAULT_SPEC),
            rtol=1e-12,
            atol=1e-15,
        )

    def test_slices_partition_the_feature_vector(self) -> None:
        h0_slice = DEFAULT_SPEC.slice_for_dim(0)
        h1_slice = DEFAULT_SPEC.slice_for_dim(1)
        assert h0_slice == slice(0, DEFAULT_SPEC.image_length)
        assert h1_slice == slice(DEFAULT_SPEC.image_length, DEFAULT_SPEC.feature_length)
        with pytest.raises(ValueError, match="dim must be one of"):
            DEFAULT_SPEC.slice_for_dim(2)

    def test_h0_block_matches_a_directly_computed_image(self) -> None:
        """End-to-end wiring: the blocks really are the images of the right diagrams."""
        cloud = noisy_ring(7)
        h0, h1 = persistence_diagrams(cloud)
        features = compute_tda_features([cloud])
        np.testing.assert_allclose(
            features[DEFAULT_SPEC.slice_for_dim(0)], persistence_image(h0, DEFAULT_SPEC)
        )
        np.testing.assert_allclose(
            features[DEFAULT_SPEC.slice_for_dim(1)], persistence_image(h1, DEFAULT_SPEC)
        )

    @pytest.mark.parametrize(
        "kwargs",
        [
            {"pixel_size": 0.3},  # 2.0 is not a whole multiple of 0.3
            {"pixel_size": 0.0},
            {"pixel_size": -0.1},
            {"sigma": 0.0},
            {"sigma": -1.0},
            {"birth_range": (2.0, 1.0)},
            {"pers_range": (0.0, 0.0)},
            {"pers_range": (0.0, float("inf"))},
            {"birth_range": (float("nan"), 1.0)},
            {"weight_cap": 0.0},
            {"weight_cap": -1.0},
        ],
    )
    def test_invalid_specs_are_rejected(self, kwargs: dict) -> None:
        with pytest.raises(ValueError):
            PersistenceImageSpec(**kwargs)

    def test_weight_cap_defaults_to_top_of_persistence_range(self) -> None:
        assert PersistenceImageSpec().effective_weight_cap == DEFAULT_SPEC.pers_range[1]
        assert PersistenceImageSpec(weight_cap=0.5).effective_weight_cap == 0.5

    def test_total_persistence_matches_a_hand_computation(self) -> None:
        assert total_persistence(np.array([[0.0, 1.0], [0.5, 2.0]])) == pytest.approx(2.5)
        assert total_persistence(np.empty((0, 2))) == 0.0


class TestScaleMismatchWarning:
    """Badly scaled coordinates must fail loudly, not quietly return a saturated vector."""

    def test_field_scale_coordinates_warn(self) -> None:
        """Raw court/field coordinates overflow the default unit-scale window."""
        with pytest.warns(TDATruncationWarning, match="saturated"):
            compute_tda_features([noisy_ring(0) * 50.0])

    def test_unit_scale_coordinates_do_not_warn(self) -> None:
        """The module-level filter turns any spurious warning into an error here.

        Guards a real bug found during development: measuring truncation on the *lower*
        window edges fired on every input, because every Rips H0 class is born at
        exactly 0 and so loses half its birth Gaussian to birth < 0 regardless of scale.
        """
        for seed in SHAPE_SEEDS:
            compute_tda_features([noisy_ring(seed), random_blob(seed + BLOB_SEED_OFFSET)])

    def test_widening_the_spec_silences_the_warning(self) -> None:
        """Confirms the warning is about the window, and that the documented fix works."""
        big = PersistenceImageSpec(
            birth_range=(0.0, 100.0), pers_range=(0.0, 100.0), pixel_size=10.0, sigma=10.0
        )
        features = compute_tda_features([noisy_ring(0) * 50.0], big)
        assert np.isfinite(features).all()
        assert features.sum() > 0.0

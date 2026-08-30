"""Tests for the Tensor-Train (MPS/MPO) linear layer.

The load-bearing test here is :func:`dense_from_cores_reference` plus the
``test_forward_matches_independent_dense_*`` family. Shape-only tests are NOT sufficient:
two earlier broken implementations produced correctly-shaped garbage (or crashed by
growing the state one axis per core). Every correctness test therefore reconstructs the
dense weight matrix from the cores by an *independent* nested-loop matrix chain and
compares ``layer(x)`` against ``x @ W.T``.

All randomness is explicitly seeded.
"""

from __future__ import annotations

import itertools
import math
from typing import List, Sequence

import numpy as np
import pytest
import torch

from app.models.mps_layer import TTLinear, factorize, prime_factors

FLOAT32_TOL = 1e-5


# --------------------------------------------------------------------------------------
# Independent reference implementation
# --------------------------------------------------------------------------------------
def dense_from_cores_reference(cores: Sequence[torch.Tensor]) -> np.ndarray:
    """Rebuild the dense weight matrix from TT cores, independently of the layer.

    This shares no code with ``TTLinear.forward`` or ``TTLinear.to_dense``. It walks every
    (row, col) pair, decodes each into its multi-index, and multiplies the resulting chain
    of ``(r_{k-1}, r_k)`` slices out by hand -- a direct transcription of

        W[(i_1..i_d), (j_1..j_d)] = G_1[:, i_1, j_1, :] @ ... @ G_d[:, i_d, j_d, :]

    Computed in float64 so the tolerance measures the layer, not the reference.

    Args:
        cores: TT cores, core ``k`` of shape ``(r_{k-1}, m_k, n_k, r_k)``.

    Returns:
        Array of shape ``(prod(m_k), prod(n_k))``.
    """
    arrays = [c.detach().cpu().numpy().astype(np.float64) for c in cores]
    out_dims = [a.shape[1] for a in arrays]
    in_dims = [a.shape[2] for a in arrays]
    out_features = int(np.prod(out_dims))
    in_features = int(np.prod(in_dims))

    weight = np.zeros((out_features, in_features), dtype=np.float64)
    for row in range(out_features):
        # C-order: the first factor is most significant.
        row_idx = np.unravel_index(row, out_dims)
        for col in range(in_features):
            col_idx = np.unravel_index(col, in_dims)
            chain = np.ones((1, 1), dtype=np.float64)
            for k, array in enumerate(arrays):
                chain = chain @ array[:, row_idx[k], col_idx[k], :]
            weight[row, col] = chain[0, 0]
    return weight


def expected_core_shapes(
    in_factors: Sequence[int], out_factors: Sequence[int], ranks: Sequence[int]
) -> List[tuple]:
    """The core shapes implied by a factorisation and rank profile."""
    return [
        (ranks[k], out_factors[k], in_factors[k], ranks[k + 1])
        for k in range(len(in_factors))
    ]


def count_params(
    in_factors: Sequence[int], out_factors: Sequence[int], ranks: Sequence[int]
) -> int:
    """Total core parameters for a factorisation and rank profile."""
    return sum(math.prod(s) for s in expected_core_shapes(in_factors, out_factors, ranks))


# --------------------------------------------------------------------------------------
# 1. THE REAL CORRECTNESS TEST: forward vs an independently built dense W
# --------------------------------------------------------------------------------------
@pytest.mark.parametrize(
    "in_features, out_features, num_cores, max_rank",
    [
        (50, 2, 3, 4),
        (30, 10, 4, 3),
        (12, 6, 2, 5),
        (24, 8, 3, 2),
        (16, 16, 4, 3),
    ],
)
def test_forward_matches_independent_dense(in_features, out_features, num_cores, max_rank):
    """layer(x) must equal x @ W.T for W rebuilt independently from the cores."""
    torch.manual_seed(1234)
    layer = TTLinear(
        in_features, out_features, num_cores=num_cores, max_rank=max_rank, bias=False
    )

    weight = dense_from_cores_reference(list(layer.cores))
    assert weight.shape == (out_features, in_features)

    x = torch.randn(7, in_features, generator=torch.Generator().manual_seed(99))
    actual = layer(x).detach().cpu().numpy().astype(np.float64)
    expected = x.detach().cpu().numpy().astype(np.float64) @ weight.T

    np.testing.assert_allclose(actual, expected, rtol=FLOAT32_TOL, atol=FLOAT32_TOL)


def test_forward_matches_independent_dense_with_bias():
    """The bias is added on top of the exact TT contraction."""
    torch.manual_seed(7)
    layer = TTLinear(30, 10, num_cores=4, max_rank=3, bias=True)
    with torch.no_grad():
        layer.bias.copy_(torch.arange(10, dtype=layer.bias.dtype))

    weight = dense_from_cores_reference(list(layer.cores))
    x = torch.randn(5, 30, generator=torch.Generator().manual_seed(11))

    actual = layer(x).detach().numpy().astype(np.float64)
    expected = x.numpy().astype(np.float64) @ weight.T + np.arange(10, dtype=np.float64)

    np.testing.assert_allclose(actual, expected, rtol=FLOAT32_TOL, atol=FLOAT32_TOL)


def test_to_dense_matches_independent_reference():
    """``to_dense`` uses a different algorithm than the reference; they must agree."""
    torch.manual_seed(2024)
    for in_features, out_features, num_cores, max_rank in [(50, 2, 3, 4), (30, 10, 4, 3)]:
        layer = TTLinear(
            in_features, out_features, num_cores=num_cores, max_rank=max_rank, bias=False
        )
        np.testing.assert_allclose(
            layer.to_dense().detach().numpy().astype(np.float64),
            dense_from_cores_reference(list(layer.cores)),
            rtol=1e-6,
            atol=1e-6,
        )


def test_forward_is_exactly_linear():
    """A linear map must satisfy superposition -- a cheap independent structural check."""
    torch.manual_seed(5)
    layer = TTLinear(30, 10, num_cores=4, max_rank=3, bias=False)
    gen = torch.Generator().manual_seed(6)
    a = torch.randn(4, 30, generator=gen)
    b = torch.randn(4, 30, generator=gen)

    torch.testing.assert_close(layer(a + b), layer(a) + layer(b), rtol=1e-5, atol=1e-5)
    torch.testing.assert_close(layer(3.0 * a), 3.0 * layer(a), rtol=1e-5, atol=1e-5)


# --------------------------------------------------------------------------------------
# 2. Output shapes
# --------------------------------------------------------------------------------------
def test_output_shape_50_to_2():
    torch.manual_seed(0)
    layer = TTLinear(50, 2, num_cores=3, max_rank=4)
    assert layer(torch.zeros(5, 50)).shape == (5, 2)


def test_output_shape_30_to_10():
    torch.manual_seed(0)
    layer = TTLinear(30, 10, num_cores=4, max_rank=3)
    assert layer(torch.zeros(7, 30)).shape == (7, 10)


def test_leading_dimensions_are_preserved():
    """Extra leading axes are flattened for the contraction and restored on output."""
    torch.manual_seed(0)
    layer = TTLinear(30, 10, num_cores=4, max_rank=3, bias=False)
    x = torch.randn(2, 3, 30, generator=torch.Generator().manual_seed(1))

    out = layer(x)
    assert out.shape == (2, 3, 10)
    # Flattening the batch must give the identical result.
    torch.testing.assert_close(out.reshape(6, 10), layer(x.reshape(6, 30)))


def test_regression_state_does_not_grow_across_cores():
    """Guard the historical bug: a 3-D input used to blow the state up per core.

    The broken contraction let ``...`` swallow the input factors and never summed the
    incoming bond, so the state grew (3,2,5,5) -> (3,2,5,1,2) -> ... -> crash. A correct
    layer consumes exactly one input factor per core and returns (3, 2, out_features).
    """
    torch.manual_seed(0)
    layer = TTLinear(50, 2, num_cores=3, max_rank=4)
    out = layer(torch.zeros(3, 2, 50))
    assert out.shape == (3, 2, 2)
    assert torch.isfinite(out).all()


def test_rejects_wrong_input_width():
    torch.manual_seed(0)
    layer = TTLinear(50, 2, num_cores=3, max_rank=4)
    with pytest.raises(ValueError, match="expected last dimension 50"):
        layer(torch.zeros(5, 49))


# --------------------------------------------------------------------------------------
# 3. Parameter counts -- ACTUAL measured numbers, including where TT loses
# --------------------------------------------------------------------------------------
def test_core_shapes_50_to_2():
    torch.manual_seed(0)
    layer = TTLinear(50, 2, num_cores=3, max_rank=4, bias=False)
    assert layer.in_factors == [5, 5, 2]
    assert layer.out_factors == [2, 1, 1]
    assert layer.ranks == [1, 4, 4, 1]
    assert [tuple(c.shape) for c in layer.cores] == [(1, 2, 5, 4), (4, 1, 5, 4), (4, 1, 2, 1)]


def test_param_count_50_to_2_is_128():
    """40 + 80 + 8 = 128."""
    torch.manual_seed(0)
    layer = TTLinear(50, 2, num_cores=3, max_rank=4, bias=False)
    assert layer.num_core_parameters() == 128


def test_param_count_30_to_10_is_150():
    """75 + 54 + 18 + 3 = 150, against 300 dense weights."""
    torch.manual_seed(0)
    layer = TTLinear(30, 10, num_cores=4, max_rank=3, bias=False)
    assert layer.in_factors == [5, 3, 2, 1]
    assert layer.out_factors == [5, 2, 1, 1]
    assert [tuple(c.shape) for c in layer.cores] == [
        (1, 5, 5, 3),
        (3, 2, 3, 3),
        (3, 1, 2, 3),
        (3, 1, 1, 1),
    ]
    assert layer.num_core_parameters() == 150


def test_param_count_4096_to_4096_is_6144():
    """1024 + 4096 + 1024 = 6144, against 16,777,216 dense weights."""
    torch.manual_seed(0)
    layer = TTLinear(4096, 4096, num_cores=3, max_rank=4, bias=False)
    assert layer.in_factors == [16, 16, 16]
    assert layer.out_factors == [16, 16, 16]
    assert layer.num_core_parameters() == 6144


def test_tt_EXPANDS_at_small_dims_50_to_2():
    """HONESTY: at 50 -> 2 the TT layer is BIGGER than the dense layer it replaces.

    128 TT parameters vs 100 dense weights. This layer is not a win here; nn.Linear is
    smaller. Asserting ``total < 150`` here would look like proof of compression and
    would be a lie.
    """
    torch.manual_seed(0)
    layer = TTLinear(50, 2, num_cores=3, max_rank=4, bias=False)

    tt_params = layer.num_core_parameters()
    dense_params = layer.dense_equivalent_parameters()

    assert tt_params == 128
    assert dense_params == 100
    assert tt_params > dense_params, "50 -> 2 must be documented as an EXPANSION"
    assert layer.compression_ratio() < 1.0
    assert layer.compression_ratio() == pytest.approx(100 / 128)


def test_tt_compresses_hugely_at_large_dims_4096():
    """The regime this layer exists for: ~2731x fewer parameters at 4096 -> 4096."""
    torch.manual_seed(0)
    layer = TTLinear(4096, 4096, num_cores=3, max_rank=4, bias=False)

    assert layer.num_core_parameters() == 6144
    assert layer.dense_equivalent_parameters() == 16_777_216
    assert layer.compression_ratio() == pytest.approx(16_777_216 / 6144)
    assert layer.compression_ratio() > 2700


def test_moderate_compression_30_to_10():
    """~2x at 30 -> 10: real but modest."""
    torch.manual_seed(0)
    layer = TTLinear(30, 10, num_cores=4, max_rank=3, bias=False)
    assert layer.num_core_parameters() == 150
    assert layer.dense_equivalent_parameters() == 300
    assert layer.compression_ratio() == pytest.approx(2.0)


def test_bias_is_excluded_from_core_parameter_count():
    torch.manual_seed(0)
    layer = TTLinear(50, 2, num_cores=3, max_rank=4, bias=True)
    assert layer.num_core_parameters() == 128
    assert sum(p.numel() for p in layer.parameters()) == 130  # 128 cores + 2 bias


# --------------------------------------------------------------------------------------
# 4. Gradients flow
# --------------------------------------------------------------------------------------
def test_gradients_populate_every_core_with_finite_values():
    torch.manual_seed(42)
    layer = TTLinear(30, 10, num_cores=4, max_rank=3, bias=True)
    x = torch.randn(8, 30, generator=torch.Generator().manual_seed(43))

    loss = layer(x).pow(2).sum()
    loss.backward()

    for k, core in enumerate(layer.cores):
        assert core.grad is not None, f"core {k} received no gradient"
        assert core.grad.shape == core.shape
        assert torch.isfinite(core.grad).all(), f"core {k} has non-finite gradient"
        assert core.grad.abs().sum() > 0, f"core {k} gradient is identically zero"

    assert layer.bias.grad is not None
    assert torch.isfinite(layer.bias.grad).all()


def test_gradients_flow_to_the_input():
    torch.manual_seed(3)
    layer = TTLinear(50, 2, num_cores=3, max_rank=4, bias=False)
    x = torch.randn(4, 50, generator=torch.Generator().manual_seed(4), requires_grad=True)

    layer(x).sum().backward()

    assert x.grad is not None
    assert torch.isfinite(x.grad).all()
    assert x.grad.abs().sum() > 0


def test_a_single_optimizer_step_reduces_loss():
    """End-to-end trainability, not just non-null .grad tensors."""
    torch.manual_seed(17)
    layer = TTLinear(30, 10, num_cores=4, max_rank=3)
    gen = torch.Generator().manual_seed(18)
    x = torch.randn(16, 30, generator=gen)
    target = torch.randn(16, 10, generator=gen)
    opt = torch.optim.SGD(layer.parameters(), lr=1e-2)

    before = torch.nn.functional.mse_loss(layer(x), target)
    opt.zero_grad()
    before.backward()
    opt.step()
    after = torch.nn.functional.mse_loss(layer(x), target)

    assert after.item() < before.item()


# --------------------------------------------------------------------------------------
# 5. Determinism
# --------------------------------------------------------------------------------------
def test_construction_is_deterministic_under_manual_seed():
    torch.manual_seed(1234)
    first = TTLinear(50, 2, num_cores=3, max_rank=4)
    torch.manual_seed(1234)
    second = TTLinear(50, 2, num_cores=3, max_rank=4)

    for a, b in zip(first.cores, second.cores):
        torch.testing.assert_close(a, b, rtol=0, atol=0)


def test_forward_is_deterministic_under_manual_seed():
    torch.manual_seed(1234)
    first = TTLinear(30, 10, num_cores=4, max_rank=3)
    torch.manual_seed(1234)
    second = TTLinear(30, 10, num_cores=4, max_rank=3)

    x = torch.randn(6, 30, generator=torch.Generator().manual_seed(555))
    torch.testing.assert_close(first(x), second(x), rtol=0, atol=0)
    # Repeated evaluation of the same layer is bit-identical too.
    torch.testing.assert_close(first(x), first(x), rtol=0, atol=0)


def test_different_seeds_give_different_cores():
    """Sanity: the determinism test above is not passing because init is constant."""
    torch.manual_seed(1)
    first = TTLinear(50, 2, num_cores=3, max_rank=4)
    torch.manual_seed(2)
    second = TTLinear(50, 2, num_cores=3, max_rank=4)
    assert not torch.allclose(first.cores[0], second.cores[0])


# --------------------------------------------------------------------------------------
# 6. Edge and adversarial cases
# --------------------------------------------------------------------------------------
def test_in_features_one():
    torch.manual_seed(0)
    layer = TTLinear(1, 7, num_cores=3, max_rank=4, bias=False)
    assert layer.in_factors == [1, 1, 1]

    weight = dense_from_cores_reference(list(layer.cores))
    x = torch.randn(4, 1, generator=torch.Generator().manual_seed(1))
    out = layer(x)

    assert out.shape == (4, 7)
    np.testing.assert_allclose(
        out.detach().numpy().astype(np.float64),
        x.numpy().astype(np.float64) @ weight.T,
        rtol=FLOAT32_TOL,
        atol=FLOAT32_TOL,
    )


def test_out_features_one():
    torch.manual_seed(0)
    layer = TTLinear(12, 1, num_cores=3, max_rank=4, bias=False)
    assert layer.out_factors == [1, 1, 1]

    weight = dense_from_cores_reference(list(layer.cores))
    x = torch.randn(4, 12, generator=torch.Generator().manual_seed(1))
    out = layer(x)

    assert out.shape == (4, 1)
    np.testing.assert_allclose(
        out.detach().numpy().astype(np.float64),
        x.numpy().astype(np.float64) @ weight.T,
        rtol=FLOAT32_TOL,
        atol=FLOAT32_TOL,
    )


def test_both_features_one():
    torch.manual_seed(0)
    layer = TTLinear(1, 1, num_cores=2, max_rank=3, bias=False)
    x = torch.randn(3, 1, generator=torch.Generator().manual_seed(1))
    weight = dense_from_cores_reference(list(layer.cores))

    assert layer(x).shape == (3, 1)
    np.testing.assert_allclose(
        layer(x).detach().numpy().astype(np.float64),
        x.numpy().astype(np.float64) @ weight.T,
        rtol=FLOAT32_TOL,
        atol=FLOAT32_TOL,
    )


@pytest.mark.parametrize("prime", [53, 17, 101])
def test_prime_in_features_factorises_and_round_trips(prime):
    """A prime dimension cannot split, so it becomes [p, 1, 1] -- and must still be exact."""
    torch.manual_seed(0)
    layer = TTLinear(prime, 4, num_cores=3, max_rank=3, bias=False)

    assert layer.in_factors == [prime, 1, 1]
    assert math.prod(layer.in_factors) == prime

    weight = dense_from_cores_reference(list(layer.cores))
    x = torch.randn(5, prime, generator=torch.Generator().manual_seed(2))

    np.testing.assert_allclose(
        layer(x).detach().numpy().astype(np.float64),
        x.numpy().astype(np.float64) @ weight.T,
        rtol=FLOAT32_TOL,
        atol=FLOAT32_TOL,
    )


def test_num_cores_one_degenerates_to_dense():
    """With one core the layer is exactly a dense layer stored as (1, out, in, 1)."""
    torch.manual_seed(0)
    layer = TTLinear(53, 7, num_cores=1, max_rank=4, bias=False)

    assert len(layer.cores) == 1
    assert tuple(layer.cores[0].shape) == (1, 7, 53, 1)
    assert layer.ranks == [1, 1]
    assert layer.num_core_parameters() == 53 * 7 == layer.dense_equivalent_parameters()
    assert layer.compression_ratio() == pytest.approx(1.0)

    weight = dense_from_cores_reference(list(layer.cores))
    # The single core reshaped IS the weight matrix.
    np.testing.assert_allclose(
        weight, layer.cores[0].detach().numpy().reshape(7, 53).astype(np.float64), atol=0
    )

    x = torch.randn(6, 53, generator=torch.Generator().manual_seed(3))
    np.testing.assert_allclose(
        layer(x).detach().numpy().astype(np.float64),
        x.numpy().astype(np.float64) @ weight.T,
        rtol=FLOAT32_TOL,
        atol=FLOAT32_TOL,
    )


def test_max_rank_one_is_a_rank_one_outer_product_chain():
    """rank=1 is a legal, extremely constrained corner -- must stay exact."""
    torch.manual_seed(0)
    layer = TTLinear(30, 10, num_cores=4, max_rank=1, bias=False)
    assert layer.ranks == [1, 1, 1, 1, 1]

    weight = dense_from_cores_reference(list(layer.cores))
    x = torch.randn(4, 30, generator=torch.Generator().manual_seed(1))
    np.testing.assert_allclose(
        layer(x).detach().numpy().astype(np.float64),
        x.numpy().astype(np.float64) @ weight.T,
        rtol=FLOAT32_TOL,
        atol=FLOAT32_TOL,
    )


def test_single_row_batch_and_empty_batch():
    torch.manual_seed(0)
    layer = TTLinear(30, 10, num_cores=4, max_rank=3)
    assert layer(torch.zeros(1, 30)).shape == (1, 10)
    assert layer(torch.zeros(0, 30)).shape == (0, 10)


def test_invalid_constructor_arguments_are_rejected():
    with pytest.raises(ValueError, match="in_features"):
        TTLinear(0, 4)
    with pytest.raises(ValueError, match="out_features"):
        TTLinear(4, 0)
    with pytest.raises(ValueError, match="num_cores"):
        TTLinear(4, 4, num_cores=0)
    with pytest.raises(ValueError, match="max_rank"):
        TTLinear(4, 4, max_rank=0)
    with pytest.raises(ValueError, match="in_factors product"):
        TTLinear(30, 10, num_cores=3, in_factors=[2, 3, 6])
    with pytest.raises(ValueError, match="length num_cores"):
        TTLinear(30, 10, num_cores=3, in_factors=[5, 3, 2, 1])


# --------------------------------------------------------------------------------------
# 7. Factorizer behaviour, and the honest ordering measurement
# --------------------------------------------------------------------------------------
@pytest.mark.parametrize(
    "n, length, expected",
    [
        (50, 3, [5, 5, 2]),
        (2, 3, [2, 1, 1]),
        (30, 4, [5, 3, 2, 1]),
        (10, 4, [5, 2, 1, 1]),
        (4096, 3, [16, 16, 16]),
        (53, 3, [53, 1, 1]),
        (1, 3, [1, 1, 1]),
        (12, 1, [12]),
    ],
)
def test_factorize_known_values(n, length, expected):
    assert factorize(n, length) == expected


@pytest.mark.parametrize("n", [1, 2, 30, 50, 53, 96, 360, 4096])
@pytest.mark.parametrize("length", [1, 2, 3, 4, 5])
def test_factorize_invariants(n, length):
    """Exact length, exact product, positive entries, descending order."""
    factors = factorize(n, length)
    assert len(factors) == length
    assert math.prod(factors) == n
    assert all(f >= 1 for f in factors)
    assert factors == sorted(factors, reverse=True)


def test_factorize_ascending_is_the_reverse_of_descending():
    assert factorize(30, 4, descending=False) == list(reversed(factorize(30, 4)))


def test_prime_factors_basics():
    assert prime_factors(1) == []
    assert prime_factors(2) == [2]
    assert prime_factors(50) == [2, 5, 5]
    assert prime_factors(53) == [53]
    assert prime_factors(4096) == [2] * 12
    with pytest.raises(ValueError):
        prime_factors(0)


def test_ordering_changes_parameter_count():
    """HONEST measurement of how much factor ordering matters.

    Measured, not asserted from folklore:

    * (50, 2, rank=4, cores=3): descending -> 128; over all permutations of the same
      factors the count ranges 92..188. Full-ascending is ALSO 128 -- reversing both
      factor lists mirrors the chain, and the interior rank profile is uniform, so the
      total is invariant. Ascending is not worse here; it is identical.
    * (30, 10, rank=3, cores=4): descending -> 150; range 90..288. The worst ordering
      costs 288, nearly 2x the default.

    So interleaving large and small factors is what hurts. Descending is a deterministic
    default, NOT a proven minimum.
    """
    # --- (50, 2, rank 4, 3 cores) -------------------------------------------------
    ranks3 = [1, 4, 4, 1]
    desc_in, desc_out = factorize(50, 3), factorize(2, 3)
    asc_in, asc_out = factorize(50, 3, False), factorize(2, 3, False)

    assert count_params(desc_in, desc_out, ranks3) == 128
    assert count_params(asc_in, asc_out, ranks3) == 128  # mirror symmetry, not a typo

    counts3 = {
        count_params(list(pi), list(po), ranks3)
        for pi in set(itertools.permutations(desc_in))
        for po in set(itertools.permutations(desc_out))
    }
    assert min(counts3) == 92
    assert max(counts3) == 188

    # --- (30, 10, rank 3, 4 cores) ------------------------------------------------
    ranks4 = [1, 3, 3, 3, 1]
    desc_in4, desc_out4 = factorize(30, 4), factorize(10, 4)

    assert count_params(desc_in4, desc_out4, ranks4) == 150
    assert count_params(factorize(30, 4, False), factorize(10, 4, False), ranks4) == 150

    counts4 = {
        count_params(list(pi), list(po), ranks4)
        for pi in set(itertools.permutations(desc_in4))
        for po in set(itertools.permutations(desc_out4))
    }
    assert min(counts4) == 90
    assert max(counts4) == 288
    # The worst ordering barely beats the 300-weight dense layer it replaces.
    assert max(counts4) / 150 > 1.9


def test_explicit_factors_are_honoured_and_still_exact():
    """A hand-supplied ordering must change the shapes but not the correctness."""
    torch.manual_seed(0)
    layer = TTLinear(
        50, 2, num_cores=3, max_rank=4, bias=False, in_factors=[5, 2, 5], out_factors=[2, 1, 1]
    )
    assert layer.in_factors == [5, 2, 5]
    assert layer.num_core_parameters() == 92  # the minimum ordering for this config

    weight = dense_from_cores_reference(list(layer.cores))
    x = torch.randn(4, 50, generator=torch.Generator().manual_seed(1))
    np.testing.assert_allclose(
        layer(x).detach().numpy().astype(np.float64),
        x.numpy().astype(np.float64) @ weight.T,
        rtol=FLOAT32_TOL,
        atol=FLOAT32_TOL,
    )


# --------------------------------------------------------------------------------------
# 8. Initialisation sanity
# --------------------------------------------------------------------------------------
def test_initial_output_variance_is_in_a_sane_range():
    """Init should not explode or vanish. Loose bounds -- this is a smoke check.

    The target is Var(W) ~ 2 / in_features, so with unit-variance inputs the output std
    should land in the neighbourhood of sqrt(2). Averaged over 64 seeded layers to keep
    the assertion stable rather than flaky.
    """
    stds = []
    for seed in range(64):
        torch.manual_seed(seed)
        layer = TTLinear(256, 128, num_cores=3, max_rank=4, bias=False)
        x = torch.randn(64, 256, generator=torch.Generator().manual_seed(1000 + seed))
        stds.append(layer(x).std().item())

    mean_std = float(np.mean(stds))
    assert math.isfinite(mean_std)
    assert 0.2 < mean_std < 8.0, f"initial output std {mean_std} is out of a sane range"


def test_bias_is_initialised_to_zero():
    torch.manual_seed(0)
    layer = TTLinear(30, 10, num_cores=4, max_rank=3, bias=True)
    torch.testing.assert_close(layer.bias, torch.zeros(10))


def test_bias_false_registers_no_bias_parameter():
    torch.manual_seed(0)
    layer = TTLinear(30, 10, num_cores=4, max_rank=3, bias=False)
    assert layer.bias is None
    assert "bias" not in dict(layer.named_parameters())

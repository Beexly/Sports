"""Tensor-Train (TT / MPS / MPO) linear layer for PyTorch.

What this module is
-------------------
``TTLinear`` is a drop-in replacement for ``nn.Linear`` whose weight matrix is never
materialised. Instead the weight is stored in *Tensor-Train matrix* (TT-matrix, also
called MPO) format as a chain of small 4-D cores, and the forward pass contracts the
input against those cores one at a time.

TT-matrix definition
--------------------
A weight matrix ``W`` of shape ``(out_features, in_features)`` is reindexed by two
multi-indices and factorised as::

    W[(i_1..i_d), (j_1..j_d)] =
        G_1[:, i_1, j_1, :] @ G_2[:, i_2, j_2, :] @ ... @ G_d[:, i_d, j_d, :]

where core ``k`` has shape ``(r_{k-1}, m_k, n_k, r_k)`` with boundary ranks
``r_0 = r_d = 1``, ``prod(n_k) == in_features`` and ``prod(m_k) == out_features``.
The chain of ``1 x r_1``, ``r_1 x r_2``, ... matrices collapses to a scalar, which is
the single entry ``W[row, col]``.

Both multi-indices are **row-major with the first factor most significant**: index
``i_1`` varies slowest, ``i_d`` fastest. ``to_dense()`` and ``forward()`` agree on this
convention, and the test suite pins it against an independent nested-loop construction.

The forward contraction
-----------------------
The contraction consumes exactly one input factor per core and threads the bond index
through the chain, so the working state stays bounded::

    state = x.reshape(batch, 1, 1, in_features)      # (b, M_acc, r, N_rest)
    for core in cores:                                # (r_prev, m_k, n_k, r_next)
        state = state.reshape(batch, M_acc, r_prev, n_k, N_rest // n_k)
        state = einsum("bMrnt,rmns->bMmst", state, core)   # contracts BOTH r_prev and n_k
        state = state.reshape(batch, M_acc * m_k, r_next, N_rest // n_k)

The ``einsum`` subscripts matter: ``r`` (incoming bond) and ``n`` (this core's input
factor) are both summed out, and ``s`` (outgoing bond) is carried forward. A contraction
that leaves the incoming bond unsummed, or that uses an ellipsis in place of the explicit
``M``/``t`` axes, makes the state *grow* by one axis per core instead of shrinking, and
blows up after a few cores. That failure mode is guarded by an explicit regression test.

HONESTY: when this layer is and is NOT a win
--------------------------------------------
**TT only compresses in the large-dimension regime.** At small dimensions a plain
``nn.Linear`` is smaller, and this layer is *not* a win there. Measured parameter counts
(cores only, bias excluded), all reproduced by the test suite:

===================================  =========  ==========  ==================
config                               TT params  dense       verdict
===================================  =========  ==========  ==================
in=50,   out=2,    rank=4, cores=3         128         100  **EXPANDS** (1.28x)
in=30,   out=10,   rank=3, cores=4         150         300  ~2x compression
in=4096, out=4096, rank=4, cores=3        6144  16,777,216  ~2731x compression
===================================  =========  ==========  ==================

Use ``TTLinear`` for wide layers (hundreds to thousands of units per side, with
dimensions that factor into several similar-sized factors). For a 50 -> 2 projection,
use ``nn.Linear``: it has fewer parameters, is faster, and is easier to reason about.

Two further honest caveats:

* **Fewer parameters is not automatically less compute.** The forward pass is a chain of
  ``d`` einsums over the whole batch rather than one dense GEMM. Measured on this CPU
  (4 threads, float32, batch 32/256), TT forward time relative to ``nn.Linear``:
  50->2 = 16x/15x slower, 30->10 = 23x/34x slower, 512->512 = 4.7x/9.1x slower,
  4096->4096 = 0.82x/1.13x (roughly parity). These are indicative rather than exact —
  a re-run on the same machine moved the batch-256 figures by up to 2x, which is what a
  microbenchmark on a shared box does; the batch-32 column reproduces within ~15%. The
  conclusion is the stable part: even at 2731x fewer parameters the 4096 layer is only
  break-even in wall-clock terms, so choose this layer to save *memory*, not time.
* **TT is a restricted hypothesis class.** A rank-``r`` TT-matrix cannot represent every
  dense matrix. Low ranks are a genuine capacity constraint, not free compression. This
  module makes no claim about accuracy retention on any task.

Factor ordering
---------------
``factorize`` splits a dimension into exactly ``num_cores`` factors (prime-factorise,
merge the two smallest while there are too many, pad with 1s while there are too few)
and returns them **sorted descending**. Descending order is a deterministic, reproducible
default -- it is *not* proven optimal. Ordering does measurably change the parameter
count, and the honest measurements are:

* ``in=50, out=2, rank=4, cores=3``: descending -> 128. Over all permutations of the same
  factors the count ranges 92..188. Full-*ascending* also gives exactly 128 -- reversing
  both factor lists mirrors the core chain, and the interior rank profile is uniform, so
  the total is invariant. Ascending is not worse here; it is identical.
* ``in=30, out=10, rank=3, cores=4``: descending -> 150 (and full-ascending -> 150, same
  mirror symmetry). Over all permutations the count ranges 90..288, so the worst ordering
  (``in=[1,3,5,2]``, ``out=[1,2,5,1]``) costs 288 -- nearly 2x the default and barely
  better than the 300-weight dense layer it replaces.

So: interleaving large and small factors is what hurts. Both monotone orderings are
equivalent and safely middling; neither is the minimum.
"""

from __future__ import annotations

import math
from typing import List, Optional, Sequence

import torch
import torch.nn as nn

__all__ = ["TTLinear", "factorize", "prime_factors"]


def prime_factors(n: int) -> List[int]:
    """Return the prime factorisation of ``n`` as an ascending list.

    ``prime_factors(1)`` returns ``[]`` (the empty product).

    Args:
        n: A positive integer.

    Returns:
        Ascending list of primes whose product is ``n``.

    Raises:
        ValueError: If ``n`` is not a positive integer.
    """
    if not isinstance(n, int) or isinstance(n, bool):
        raise ValueError(f"n must be an int, got {type(n).__name__}")
    if n < 1:
        raise ValueError(f"n must be >= 1, got {n}")

    factors: List[int] = []
    remaining = n
    divisor = 2
    while divisor * divisor <= remaining:
        while remaining % divisor == 0:
            factors.append(divisor)
            remaining //= divisor
        divisor += 1 if divisor == 2 else 2
    if remaining > 1:
        factors.append(remaining)
    return factors


def factorize(n: int, length: int, descending: bool = True) -> List[int]:
    """Split ``n`` into exactly ``length`` positive factors whose product is ``n``.

    Algorithm: prime-factorise; while there are too many factors, merge the two smallest
    into their product; while there are too few, pad with 1s. The result is sorted
    descending by default.

    Descending order is a deterministic default, not a proven optimum -- see the module
    docstring for measured parameter counts across orderings.

    Args:
        n: Positive integer to factorise.
        length: Exact number of factors to return. Must be >= 1.
        descending: Sort the result descending (default) or ascending.

    Returns:
        A list of ``length`` positive ints whose product is exactly ``n``.

    Raises:
        ValueError: If ``n < 1`` or ``length < 1``.
    """
    if length < 1:
        raise ValueError(f"length must be >= 1, got {length}")

    factors = prime_factors(n)

    # Too many factors: repeatedly fuse the two smallest. Product is preserved.
    while len(factors) > length:
        factors.sort()
        smallest = factors.pop(0)
        next_smallest = factors.pop(0)
        factors.append(smallest * next_smallest)

    # Too few: pad with 1s. Product is preserved.
    while len(factors) < length:
        factors.append(1)

    factors.sort(reverse=descending)
    return factors


class TTLinear(nn.Module):
    """A linear layer whose weight is stored as a Tensor-Train (TT-matrix / MPO).

    Computes ``y = x @ W.T + b`` without ever materialising ``W``. ``W`` is represented
    implicitly by ``num_cores`` small 4-D cores; see the module docstring for the exact
    factorisation and the contraction used.

    Honest scope: this only saves parameters when ``in_features`` and ``out_features`` are
    large and factor into several similar-sized factors. At small dimensions it *expands*
    (50 -> 2 with rank 4 and 3 cores costs 128 parameters against a 100-weight dense
    layer). It is also not necessarily faster than a dense GEMM, and a low-rank TT is a
    restricted hypothesis class, not free compression.

    Args:
        in_features: Size of each input sample.
        out_features: Size of each output sample.
        num_cores: Number of TT cores (the chain length ``d``). ``num_cores=1``
            degenerates to an ordinary dense layer stored as a single ``(1, out, in, 1)``
            core.
        max_rank: The interior bond dimension. All interior ranks are set to this value;
            boundary ranks are fixed at 1. Larger means more capacity and more parameters.
        bias: If ``True``, add a learnable bias.
        in_factors: Optional explicit factorisation of ``in_features``. Must have length
            ``num_cores`` and product ``in_features``. Defaults to
            ``factorize(in_features, num_cores)``.
        out_factors: Optional explicit factorisation of ``out_features``. Same contract.
        device: Torch device for the parameters.
        dtype: Torch dtype for the parameters.

    Attributes:
        cores: ``nn.ParameterList`` of ``num_cores`` tensors, core ``k`` having shape
            ``(ranks[k], out_factors[k], in_factors[k], ranks[k + 1])``.
        ranks: The full rank profile, length ``num_cores + 1``, with
            ``ranks[0] == ranks[-1] == 1``.

    Raises:
        ValueError: On non-positive dimensions, or on supplied factor lists whose length
            or product disagrees with ``num_cores`` / the feature sizes.
    """

    def __init__(
        self,
        in_features: int,
        out_features: int,
        num_cores: int = 3,
        max_rank: int = 4,
        bias: bool = True,
        in_factors: Optional[Sequence[int]] = None,
        out_factors: Optional[Sequence[int]] = None,
        device: Optional[torch.device] = None,
        dtype: Optional[torch.dtype] = None,
    ) -> None:
        super().__init__()

        if in_features < 1:
            raise ValueError(f"in_features must be >= 1, got {in_features}")
        if out_features < 1:
            raise ValueError(f"out_features must be >= 1, got {out_features}")
        if num_cores < 1:
            raise ValueError(f"num_cores must be >= 1, got {num_cores}")
        if max_rank < 1:
            raise ValueError(f"max_rank must be >= 1, got {max_rank}")

        self.in_features = in_features
        self.out_features = out_features
        self.num_cores = num_cores
        self.max_rank = max_rank

        self.in_factors = self._resolve_factors(in_factors, in_features, num_cores, "in_factors")
        self.out_factors = self._resolve_factors(
            out_factors, out_features, num_cores, "out_factors"
        )

        # Boundary ranks are pinned to 1; interior bonds all carry max_rank.
        self.ranks: List[int] = [1] + [max_rank] * (num_cores - 1) + [1]

        core_std = self._init_std()
        factory = {"device": device, "dtype": dtype}
        self.cores = nn.ParameterList(
            [
                nn.Parameter(
                    torch.randn(
                        self.ranks[k],
                        self.out_factors[k],
                        self.in_factors[k],
                        self.ranks[k + 1],
                        **factory,
                    )
                    * core_std
                )
                for k in range(num_cores)
            ]
        )

        if bias:
            self.bias: Optional[nn.Parameter] = nn.Parameter(
                torch.zeros(out_features, **factory)
            )
        else:
            self.register_parameter("bias", None)

    @staticmethod
    def _resolve_factors(
        supplied: Optional[Sequence[int]], total: int, num_cores: int, name: str
    ) -> List[int]:
        """Validate a supplied factor list, or derive one with ``factorize``."""
        if supplied is None:
            return factorize(total, num_cores)

        factors = [int(f) for f in supplied]
        if len(factors) != num_cores:
            raise ValueError(
                f"{name} must have length num_cores={num_cores}, got {len(factors)}"
            )
        if any(f < 1 for f in factors):
            raise ValueError(f"{name} entries must all be >= 1, got {factors}")
        product = math.prod(factors)
        if product != total:
            raise ValueError(f"{name} product is {product}, expected {total} ({factors})")
        return factors

    def _init_std(self) -> float:
        """Per-core std so the implied dense ``W`` has variance ~ ``2 / in_features``.

        Entry ``W[i, j]`` is a sum over ``prod(interior ranks)`` independent products of
        ``d`` core entries. If each core entry has variance ``v``, then
        ``Var(W[i, j]) = R * v**d`` with ``R`` the product of the interior ranks. Solving
        for the He-style target ``2 / in_features`` gives ``v = (target / R) ** (1 / d)``.
        """
        interior_rank_product = math.prod(self.ranks[1:-1]) if self.num_cores > 1 else 1
        target_variance = 2.0 / self.in_features
        core_variance = (target_variance / interior_rank_product) ** (1.0 / self.num_cores)
        return math.sqrt(core_variance)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Apply the TT-matrix to ``x``.

        Args:
            x: Tensor of shape ``(..., in_features)``. Leading dimensions are flattened
                into a single batch axis and restored on the output.

        Returns:
            Tensor of shape ``(..., out_features)``.

        Raises:
            ValueError: If ``x`` has no dimensions or its last dimension is not
                ``in_features``.
        """
        if x.dim() == 0:
            raise ValueError("x must have at least 1 dimension")
        if x.shape[-1] != self.in_features:
            raise ValueError(
                f"expected last dimension {self.in_features}, got {x.shape[-1]}"
            )

        leading_shape = x.shape[:-1]
        flat = x.reshape(-1, self.in_features)
        batch = flat.shape[0]

        # state axes: (batch, accumulated output index, current bond, unconsumed input)
        state = flat.reshape(batch, 1, 1, self.in_features)
        out_acc = 1

        for core in self.cores:
            rank_prev, m_k, n_k, rank_next = core.shape
            rest = state.shape[3] // n_k

            # Peel one input factor off the front of the unconsumed-input axis.
            state = state.reshape(batch, out_acc, rank_prev, n_k, rest)
            # Contract BOTH the incoming bond (r) and this core's input factor (n);
            # carry the outgoing bond (s) forward. This is what keeps the state bounded.
            state = torch.einsum("bMrnt,rmns->bMmst", state, core)
            # Fold the new output factor into the accumulated output index.
            state = state.reshape(batch, out_acc * m_k, rank_next, rest)
            out_acc *= m_k

        # Trailing bond and unconsumed-input axes are both 1 by construction.
        out = state.reshape(batch, self.out_features)

        if self.bias is not None:
            out = out + self.bias

        return out.reshape(*leading_shape, self.out_features)

    def to_dense(self) -> torch.Tensor:
        """Materialise the implied dense weight matrix.

        Intended for testing, inspection, and export -- materialising the weight discards
        the whole point of the layer, so do not call this on the hot path.

        This deliberately uses a different algorithm from :meth:`forward` (it chains the
        cores into a full matrix with no batch involved) so that agreement between the two
        is evidence rather than tautology.

        Returns:
            Tensor of shape ``(out_features, in_features)``, such that
            ``layer(x) == x @ layer.to_dense().T + bias``.
        """
        # acc[I, J, r]: partial matrix over the output/input factors consumed so far.
        first = self.cores[0]
        acc = torch.ones(1, 1, 1, dtype=first.dtype, device=first.device)

        for core in self.cores:
            _, m_k, n_k, rank_next = core.shape
            rows, cols = acc.shape[0], acc.shape[1]
            acc = torch.einsum("IJr,rmns->ImJns", acc, core)
            acc = acc.reshape(rows * m_k, cols * n_k, rank_next)

        return acc.reshape(self.out_features, self.in_features)

    def num_core_parameters(self) -> int:
        """Number of parameters held in the TT cores, excluding any bias."""
        return sum(core.numel() for core in self.cores)

    def dense_equivalent_parameters(self) -> int:
        """Weight count of the ``nn.Linear`` this layer replaces, excluding any bias."""
        return self.in_features * self.out_features

    def compression_ratio(self) -> float:
        """Dense weights divided by TT core parameters.

        Greater than 1 means the TT form is smaller. **Less than 1 means it is bigger** --
        which is the honest outcome at small dimensions (e.g. 50 -> 2 gives ~0.78).
        """
        return self.dense_equivalent_parameters() / self.num_core_parameters()

    def extra_repr(self) -> str:
        return (
            f"in_features={self.in_features}, out_features={self.out_features}, "
            f"num_cores={self.num_cores}, max_rank={self.max_rank}, "
            f"in_factors={self.in_factors}, out_factors={self.out_factors}, "
            f"bias={self.bias is not None}"
        )

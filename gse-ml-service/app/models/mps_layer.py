"""A tensor-network-inspired linear layer (`MPSLinear`).

RESEARCH SIDECAR — NOT PRODUCTION. See gse-ml-service/README.md and
app/main.py's module docstring for the full non-production banner.
"""

from __future__ import annotations

import torch
from torch import nn


class MPSLinear(nn.Module):
    """A lightweight linear layer inspired by matrix-product-state (MPS)
    tensor networks.

    IMPORTANT — what this is and is NOT: this is a small, parameter-efficient
    factorization loosely *inspired by* the idea of matrix-product-state /
    tensor-train decompositions (representing a large tensor as a chain of
    smaller "bond"-linked cores). It is **not** a full tensor-train
    decomposition of a weight tensor, and it does not implement the general
    multi-core MPS contraction used in the tensor-network literature. Treat
    the name as "MPS-flavored," not "a faithful MPS layer."

    How it works: the input is linearly projected to a tensor of shape
    `(batch, out_features, bond_dim, bond_dim)`, which is then contracted
    over its two `bond_dim` axes via a trace (implemented with
    `torch.einsum` using a repeated bond index) to produce
    `(batch, out_features)` logits. The repeated-index einsum contraction is
    exactly what ties this to the MPS idea: bond indices linking tensor
    cores are summed over ("traced out") to produce the final output,
    the same structural pattern used when contracting an MPS chain down to
    its physical (output) indices.

    Parameters
    ----------
    in_features:
        Size of the input feature dimension.
    out_features:
        Size of the output feature dimension. Stored as `self.out_features`
        (a naive earlier draft of this layer referenced `self.out_features`
        in `forward()` without ever setting it in `__init__`, causing an
        `AttributeError` at call time — that bug is fixed here: both
        `out_features` and `bond_dim` are stored on `self` in `__init__`).
    bond_dim:
        The internal "bond dimension" of the factorization — the size of
        the two axes that get traced out. Larger values increase
        expressivity and parameter count. Stored as `self.bond_dim`.

    Warning
    -------
    With the default (random) initialization, `forward()` output is
    **meaningless noise** — it has not been trained on anything. This layer
    only produces informative output after real supervised training on real
    labeled data. Nothing in this repository trains it; it exists as
    research scaffolding only.
    """

    def __init__(self, in_features: int, out_features: int, bond_dim: int = 4) -> None:
        super().__init__()
        if in_features < 1:
            raise ValueError(f"in_features must be a positive integer, got {in_features!r}")
        if out_features < 1:
            raise ValueError(f"out_features must be a positive integer, got {out_features!r}")
        if bond_dim < 1:
            raise ValueError(f"bond_dim must be a positive integer, got {bond_dim!r}")

        self.in_features = in_features
        # Bug fix vs. the naive first draft: both of these MUST be set here,
        # since forward() reads them directly.
        self.out_features = out_features
        self.bond_dim = bond_dim

        # Projects each input vector to a flattened (out_features, bond_dim,
        # bond_dim) tensor per example.
        self.proj = nn.Linear(in_features, out_features * bond_dim * bond_dim)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Compute factorized logits for a batch of inputs.

        Parameters
        ----------
        x:
            Tensor of shape `(batch, in_features)`.

        Returns
        -------
        torch.Tensor
            Tensor of shape `(batch, out_features)`.
        """
        if x.dim() != 2 or x.shape[1] != self.in_features:
            raise ValueError(
                f"expected input of shape (batch, {self.in_features}), got {tuple(x.shape)}"
            )

        batch = x.shape[0]
        projected = self.proj(x)  # (batch, out_features * bond_dim * bond_dim)
        cores = projected.view(batch, self.out_features, self.bond_dim, self.bond_dim)

        # Contract the two bond-dim axes via a trace: repeating the 'i'
        # index in the einsum spec sums the diagonal, i.e.
        # out[b, o] = sum_i cores[b, o, i, i].
        logits = torch.einsum("boii->bo", cores)
        return logits

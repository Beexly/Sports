"""Shared multi-cadence state-space architecture (K05: 3-Regime x 312D x 64-Member ETKF-DMA)."""

from gse_engine.state_space.etkf_dma_bus import (
    DMA_FORGETTING_LAMBDAS,
    DMA_MODEL_ALPHA,
    ENSEMBLE_SIZE_K,
    STATE_VECTOR_DIM,
    EtkfDmaLatentBus,
    EtkfDmaStepResult,
)

__all__ = [
    "DMA_FORGETTING_LAMBDAS",
    "DMA_MODEL_ALPHA",
    "ENSEMBLE_SIZE_K",
    "STATE_VECTOR_DIM",
    "EtkfDmaLatentBus",
    "EtkfDmaStepResult",
]

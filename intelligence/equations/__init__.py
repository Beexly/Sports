"""Wave 5 Equations Execution & Catalog Loader Package."""
from intelligence.equations.catalog_loader import (
    CANONICAL_CATALOG_PATH,
    CROSSWALK_3742_PATH,
    MATRIX_1666_PATH,
    TWIN_REGISTRY_PATH,
    EquationCatalogDriftError,
    get_dynamic_equation_counts,
    load_canonical_equation_catalog,
    verify_zero_catalog_twin_drift,
)
from intelligence.equations.equation_executor import (
    EXECUTION_REGISTRY_JSONL_PATH,
    build_equation_execution_registry,
    execute_catalog_equation,
    verify_all_12304_executable_checks,
)

__all__ = [
    "CANONICAL_CATALOG_PATH",
    "CROSSWALK_3742_PATH",
    "EXECUTION_REGISTRY_JSONL_PATH",
    "EquationCatalogDriftError",
    "MATRIX_1666_PATH",
    "TWIN_REGISTRY_PATH",
    "build_equation_execution_registry",
    "execute_catalog_equation",
    "get_dynamic_equation_counts",
    "load_canonical_equation_catalog",
    "verify_all_12304_executable_checks",
    "verify_zero_catalog_twin_drift",
]

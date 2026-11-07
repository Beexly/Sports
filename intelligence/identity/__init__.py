"""Canonical Entity Resolution package (Wave 4)."""
from intelligence.identity.entity_resolver import (
    CANONICAL_ENTITIES_PATH,
    EntityResolutionContaminationError,
    load_canonical_entity_index,
    normalize_lookup_key,
    normalize_team_code,
    resolve_entity,
    validate_dataset_row_entities,
    validate_roster_pairing,
)

__all__ = [
    "CANONICAL_ENTITIES_PATH",
    "EntityResolutionContaminationError",
    "load_canonical_entity_index",
    "normalize_lookup_key",
    "normalize_team_code",
    "resolve_entity",
    "validate_dataset_row_entities",
    "validate_roster_pairing",
]

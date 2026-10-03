# Feast FeatureViews — honesty tags mirror TS contract (pit_correct, public_api_eligible)
# Materialize offline only until founder signs online serving.
from feast import FeatureView, Field
from feast.types import Float64, String, Bool
from datetime import timedelta

# Placeholder source — wire to offline store path in ops.
# tags enforce GSE law at registry level.
HONESTY_TAGS = {
    "pit_correct": "required_true",
    "public_api_eligible": "tag_per_feature",
    "law": "refuse_default",
}

"""Pytest bootstrap for gse-ml-service.

The package tree is deliberately ``__init__.py``-free, so ``app.models.x`` will not
resolve unless the service root is on ``sys.path``. Pytest imports the rootdir conftest
before collecting tests, so inserting the path here makes ``from app.models.mps_layer
import TTLinear`` work from any working directory.
"""

import sys
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parent

if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

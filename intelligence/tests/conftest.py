# conftest.py — pytest configuration for the GSE intelligence build.
#
# Provenance: test-orchestration module, c10 Phase 2+ coordinator.

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def pytest_configure(config):
    config.addinivalue_line("markers", "e2e: end-to-end integration tests")
    config.addinivalue_line("markers", "contract: module contract tests")
    config.addinivalue_line("markers", "negative: rejected-research negative gates")

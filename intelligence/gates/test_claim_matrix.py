import json
import os
import sys

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, "intelligence"))
from gates.claim_matrix import check


def test_wired_claim_requires_files(tmp_path):
    errors = check([{
        "id": "ghost",
        "statement": "not real",
        "status": "wired",
        "code": "nope.py",
        "test": "nope_test.py",
        "data": "nope.parquet",
    }], root=str(tmp_path))
    assert len(errors) == 3


def test_gap_does_not_require_files():
    assert check([{
        "id": "gap",
        "statement": "absent",
        "status": "gap",
        "code": "",
        "test": "",
        "data": "",
    }]) == []

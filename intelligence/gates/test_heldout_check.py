import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
from gates.heldout_check import check


def test_overlap_is_discarded():
    errors = check({"train_years": [2022, 2023, 2024], "eval_years": [2024, 2025]})
    assert errors
    assert "Discard" in errors[0]


def test_clean_split_passes():
    assert check({"train_years": [2022, 2023], "eval_years": [2024, 2025]}) == []


def test_walkforward_file_is_clean():
    doc = json.load(open(os.path.join(ROOT, "reasoning_engine", "traces", "tau-walkforward.json"), encoding="utf-8"))
    for row in doc["results"]:
        assert set(row["train"]).isdisjoint({row["eval_year"]})

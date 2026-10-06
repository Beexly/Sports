# PROVENANCE — gse-intelligence-build / coaching / tests / test_base_data.py
# Tests the data-location contract added 2026-10-02 for fresh-checkout
# reproducibility. See intelligence/coaching/base_data.py.
#
# WHY THIS TEST EXISTS — a real bug found on a clean `git worktree add`:
# tenures.py / fingerprint.py hard-coded
#     BASE_DATA = os.path.expanduser("~/workspace/coaching-tendencies/data")
# which is OUTSIDE the repository. On any machine without that directory the
# loader took its `if not os.path.exists(path): continue` branch and returned
# an EMPTY registry, so the engine reported a coach as unknown and the
# provider raised a DataGapError whose message ("registry holds 0 verified
# rows") described the failure as if the registry were merely unpopulated.
# That is the silent-degradation trap: an absent input looked like a
# well-formed but empty result.
#
# The contract now: absent seed data raises DataGapError naming every path
# tried and the env var that overrides the location. These tests pin that.
"""Tests: coaching seed-data location resolution (loud, never silent)."""
from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__)))))

from coaching import base_data as BD
from integration.providers import DataGapError


class TestResolve:
    def test_env_var_wins(self, tmp_path, monkeypatch):
        want = {"a.csv"}
        (tmp_path / "a.csv").write_text("season,team\n2025,KC\n", newline="")
        monkeypatch.setenv("GSE_COACHING_DATA_DIR", str(tmp_path))
        assert BD.resolve(want) == str(tmp_path)

    def test_missing_env_var_dir_is_loud(self, tmp_path, monkeypatch):
        """A pointed-at-but-absent directory must raise, not fall through."""
        monkeypatch.setenv("GSE_COACHING_DATA_DIR", str(tmp_path / "nope"))
        with pytest.raises(DataGapError):
            BD.resolve(("definitely_absent.csv",))

    def test_absent_data_raises_with_diagnostics(self, monkeypatch):
        monkeypatch.delenv("GSE_COACHING_DATA_DIR", raising=False)
        monkeypatch.setattr(BD, "LEGACY_DATA_DIR",
                            os.path.join("Z:/nonexistent-legacy", "data"))
        with pytest.raises(DataGapError) as ei:
            BD.resolve(("off_tendencies.csv",))
        msg = str(ei.value)
        # The message must name the missing file, every dir tried, the env
        # var, and the doc that explains the gap.
        assert "off_tendencies.csv" in msg
        assert "GSE_COACHING_DATA_DIR" in msg
        assert "REAL-DATA-VALIDATION" in msg
        assert BD.REPO_DATA_DIR in msg

    def test_error_is_datagap_not_filemissing(self, monkeypatch):
        """Callers catch DataGapError; a bare FileNotFoundError would escape
        the provider contract and silently degrade at the integration edge."""
        monkeypatch.delenv("GSE_COACHING_DATA_DIR", raising=False)
        monkeypatch.setattr(BD, "LEGACY_DATA_DIR", "Z:/nonexistent-legacy")
        with pytest.raises(DataGapError):
            BD.resolve(("absent.csv",))


class TestNoHardcodedHomeDependency:
    """No module may re-introduce the out-of-repo literal path."""

    def test_modules_use_base_data(self):
        pkg = BD.REPO_DATA_DIR.rsplit(os.sep + "data", 1)[0]
        for mod in ("tenures.py", "fingerprint.py"):
            src = open(os.path.join(pkg, mod), encoding="utf-8").read()
            assert "expanduser(\"~/workspace/coaching-tendencies" not in src, (
                f"{mod} re-introduced the hard-coded out-of-repo data path")


class TestRegistryIsLoudNotEmpty:
    """An absent registry must never masquerade as an empty-but-valid one."""

    def test_lookup_coach_raises_when_registry_absent(self, monkeypatch):
        from coaching import tenures as TN
        monkeypatch.delenv("GSE_COACHING_DATA_DIR", raising=False)
        monkeypatch.setattr(BD, "LEGACY_DATA_DIR", "Z:/nonexistent-legacy")
        monkeypatch.setattr(TN, "_REGISTRY", None)
        with pytest.raises(DataGapError):
            TN.lookup_coach("Todd Monken", 2026)

    def test_registry_coverage_raises_when_absent(self, monkeypatch):
        from coaching import tenures as TN
        monkeypatch.delenv("GSE_COACHING_DATA_DIR", raising=False)
        monkeypatch.setattr(BD, "LEGACY_DATA_DIR", "Z:/nonexistent-legacy")
        monkeypatch.setattr(TN, "_REGISTRY", None)
        with pytest.raises(DataGapError):
            TN.registry_coverage()
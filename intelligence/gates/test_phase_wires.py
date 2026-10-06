from datetime import datetime
from zoneinfo import ZoneInfo

import pytest

from providers.injury_gate import InjuryNotPublished, require_injury_published
from audit.paired import reconcile
from context.tau_wire import TAU_STAMP, tau_observation

ET = ZoneInfo("America/New_York")


def test_week_pull_refused_before_friday_evening():
    friday = datetime(2026, 10, 9, 12, 0, tzinfo=ET)
    now = datetime(2026, 10, 2, 13, 57, tzinfo=ET)
    with pytest.raises(InjuryNotPublished):
        require_injury_published(5, now, friday)


def test_pull_allowed_after_cutoff():
    friday = datetime(2026, 10, 2, 12, 0, tzinfo=ET)
    now = datetime(2026, 10, 2, 18, 1, tzinfo=ET)
    require_injury_published(4, now, friday)


def test_contradiction_is_not_resolved():
    out = reconcile(
        [{"id": "ol", "status": "missing"}],
        [{"id": "ol", "status": "built"}],
    )
    assert out["contradictions"][0]["resolved"] is False


def test_tau_observation_changes_the_context():
    without = {}
    with_tau = tau_observation("CLE", 0.55, "league")
    assert "coaching.CLE.tau_hat" not in without
    assert with_tau["coaching.CLE.tau_hat"] == 0.55
    assert with_tau["coaching.CLE.tau_stamp"] == TAU_STAMP

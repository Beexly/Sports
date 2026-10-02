from reasoning_engine.slate import prior_for_hour, pick_hour


def test_prior_does_not_fire_on_the_wrong_hour():
    adj = prior_for_hour(22.0, 0.0, 40.0, indoor=False, hour_matched=False)
    assert adj["applied"] is False
    assert adj["totalPoints"] is None


def test_prior_fires_only_on_the_kickoff_hour():
    adj = prior_for_hour(16.0, 0.0, 40.0, indoor=False, hour_matched=True)
    assert adj["applied"] is True
    assert adj["weightStatus"] == "prior"
    assert adj["totalPoints"] == -1.5


def test_dome_is_not_a_measured_calm():
    adj = prior_for_hour(23.1, 0.0, 28.9, indoor=True, hour_matched=True)
    assert adj["applied"] is False
    assert "irrelevant" in adj["reason"]


def test_pick_hour_does_not_use_the_first_row():
    hourly = {
        "time": ["2026-10-04T16:00", "2026-10-04T17:00"],
        "wind_speed_10m": [4.0, 18.0],
        "temperature_2m": [70.0, 55.0],
        "precipitation": [0.0, 0.0],
    }
    hour = pick_hour(hourly, "2026-10-04T17:00")
    assert hour["windMph"] == 18.0
    assert pick_hour(hourly, "2026-10-04T20:00") is None


def test_t_minus_6_does_not_borrow_kickoff_wind():
    from reasoning_engine.slate import horizons_from_hourly
    hourly = {
        "time": ["2026-10-04T11:00", "2026-10-04T17:00"],
        "wind_speed_10m": [8.0, 22.0],
        "wind_gusts_10m": [12.0, 30.0],
        "temperature_2m": [60.0, 48.0],
        "precipitation": [0.0, 0.2],
        "precipitation_probability": [10, 80],
        "relative_humidity_2m": [40, 90],
    }
    h = horizons_from_hourly(hourly, "2026-10-04T17:00:00Z", indoor=False, source="fixture")
    assert h["t_minus_6h"]["windMph"] == 8.0
    assert h["t_minus_6h"]["applied"] is False
    assert h["kickoff"]["windMph"] == 22.0
    assert h["kickoff"]["applied"] is True
    assert h["t_minus_1h"]["hourMatched"] is False
    assert h["t_minus_1h"]["windMph"] is None
    assert set(h["t_minus_6h"]) == set(h["kickoff"])

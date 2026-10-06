"""Week-4 2026 slate. Weather prior applies only when the forecast hour is the kickoff hour."""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Any
from urllib.request import Request, urlopen

# Same coordinates as apps/web/lib/weather/game-weather.ts. Not guessed.
COORDS = {
    "GB": (44.5013, -88.0622),
    "CHI": (41.8623, -87.6167),
    "BUF": (42.7738, -78.787),
    "NE": (42.0909, -71.2643),
    "CLE": (41.5061, -81.6995),
    "PIT": (40.4468, -80.0158),
    "CIN": (39.0954, -84.516),
    "KC": (39.0489, -94.4839),
    "DEN": (39.7439, -105.02),
    "PHI": (39.9008, -75.1675),
    "NYG": (40.8135, -74.0745),
    "NYJ": (40.8135, -74.0745),
    "WAS": (38.9077, -76.8645),
    "WSH": (38.9077, -76.8645),
    "BAL": (39.278, -76.6227),
    "SEA": (47.5952, -122.3316),
    "MIA": (25.958, -80.2389),
    "TB": (27.9759, -82.5033),
    "CAR": (35.2258, -80.8528),
    "JAX": (30.3239, -81.6373),
    "TEN": (36.1665, -86.7713),
}

WIND_PRIOR = -1.5
HEAVY_RAIN_PRIOR = -1.0
EXTREME_TEMP_PRIOR = -0.5


def hour_bucket(iso: str) -> str:
    dt = datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone(timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:00")


def prior_for_hour(wind_mph: float | None, precip_inch: float | None, temp_f: float | None,
                   indoor: bool, hour_matched: bool) -> dict[str, Any]:
    if indoor:
        return {"applied": False, "weightStatus": "not-applied", "totalPoints": None,
                "reason": "dome or roof: weather irrelevant", "hourMatched": hour_matched}
    if not hour_matched:
        return {"applied": False, "weightStatus": "not-applied", "totalPoints": None,
                "reason": "forecast hour is not the kickoff hour", "hourMatched": False}
    points = 0.0
    reasons = []
    if wind_mph is not None and wind_mph > 15:
        points += WIND_PRIOR
        reasons.append("prior: wind over 15 mph, total -1.5")
    if precip_inch is not None and precip_inch >= 0.1:
        points += HEAVY_RAIN_PRIOR
        reasons.append("prior: heavy rain, total -1.0")
    if temp_f is not None and (temp_f < 20 or temp_f > 95):
        points += EXTREME_TEMP_PRIOR
        reasons.append("prior: extreme temperature, total -0.5")
    if not reasons:
        return {"applied": False, "weightStatus": "not-applied", "totalPoints": None,
                "reason": "kickoff hour present, no prior threshold crossed", "hourMatched": True}
    return {"applied": True, "weightStatus": "prior", "totalPoints": points,
            "reason": "; ".join(reasons), "hourMatched": True}


def pick_hour(hourly: dict, bucket: str) -> dict[str, Any] | None:
    times = hourly.get("time") or []
    for i, t in enumerate(times):
        if t == bucket or str(t).startswith(bucket):
            def at(key):
                arr = hourly.get(key) or []
                return arr[i] if i < len(arr) else None
            return {
                "time": t,
                "tempF": at("temperature_2m"),
                "windMph": at("wind_speed_10m"),
                "windGustMph": at("wind_gusts_10m"),
                "precipInch": at("precipitation"),
                "precipProbPct": at("precipitation_probability"),
                "humidityPct": at("relative_humidity_2m"),
            }
    return None


HOURLY_VARS = (
    "temperature_2m,wind_speed_10m,wind_gusts_10m,precipitation,"
    "precipitation_probability,relative_humidity_2m"
)
UNITS = "&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=UTC"


def weather_record(hour: dict[str, Any] | None, offset_hours: int, bucket: str, indoor: bool, source: str) -> dict[str, Any]:
    """One horizon. Same keys at T-6, T-1, and kickoff. A miss is not the other hour's wind."""
    matched = hour is not None
    base = {
        "offsetHours": offset_hours,
        "bucket": bucket,
        "hourMatched": matched,
        "tempF": None if hour is None else hour.get("tempF"),
        "windMph": None if hour is None else hour.get("windMph"),
        "windGustMph": None if hour is None else hour.get("windGustMph"),
        "precipInch": None if hour is None else hour.get("precipInch"),
        "precipProbPct": None if hour is None else hour.get("precipProbPct"),
        "humidityPct": None if hour is None else hour.get("humidityPct"),
        "source": source,
        "license": "CC-BY-4.0; hosted free tier is non-commercial",
    }
    adj = prior_for_hour(
        None if hour is None else hour.get("windMph"),
        None if hour is None else hour.get("precipInch"),
        None if hour is None else hour.get("tempF"),
        indoor=indoor,
        hour_matched=matched and not indoor,
    )
    base.update(adj)
    return base


def fetch_kickoff_hour(lat: float, lon: float, kickoff_iso: str, now: datetime | None = None) -> dict[str, Any]:
    now = now or datetime.now(timezone.utc)
    kick = datetime.fromisoformat(kickoff_iso.replace("Z", "+00:00"))
    bucket = hour_bucket(kickoff_iso)
    if kick <= now:
        day = bucket[:10]
        url = (
            "https://historical-forecast-api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lon}&start_date={day}&end_date={day}"
            "&hourly=temperature_2m,wind_speed_10m,precipitation"
            "&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=UTC"
        )
        source = "open-meteo-historical-forecast"
    else:
        url = (
            "https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lon}"
            "&hourly=temperature_2m,wind_speed_10m,precipitation"
            "&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch"
            "&forecast_days=7&timezone=UTC"
        )
        source = "open-meteo-forecast"
    req = Request(url, headers={"User-Agent": "GalaxySportsEdge/1.0"})
    with urlopen(req, timeout=25) as resp:
        payload = json.load(resp)
    hour = pick_hour(payload.get("hourly") or {}, bucket)
    if hour is None:
        return {"available": False, "source": source, "hourMatched": False, "bucket": bucket,
                "license": "CC-BY-4.0; hosted free tier is non-commercial"}
    hour.update({"available": True, "source": source, "hourMatched": True, "bucket": bucket,
                 "license": "CC-BY-4.0; hosted free tier is non-commercial"})
    return hour


def load_games(path: str) -> list[dict[str, Any]]:
    return json.load(open(path, encoding="utf-8"))["games"]


HORIZONS = ((-6, "t_minus_6h"), (-1, "t_minus_1h"), (0, "kickoff"))


def offset_bucket(kickoff_iso: str, hours: int) -> str:
    from datetime import timedelta
    dt = datetime.fromisoformat(kickoff_iso.replace("Z", "+00:00")).astimezone(timezone.utc)
    return (dt + timedelta(hours=hours)).strftime("%Y-%m-%dT%H:00")


def horizons_from_hourly(hourly: dict, kickoff_iso: str, indoor: bool, source: str) -> dict[str, Any]:
    out = {}
    for hours, name in HORIZONS:
        bucket = offset_bucket(kickoff_iso, hours)
        out[name] = weather_record(pick_hour(hourly, bucket), hours, bucket, indoor, source)
    return out


def fetch_horizons(lat: float, lon: float, kickoff_iso: str, now: datetime | None = None) -> dict[str, Any]:
    now = now or datetime.now(timezone.utc)
    kick = datetime.fromisoformat(kickoff_iso.replace("Z", "+00:00"))
    start = offset_bucket(kickoff_iso, -6)[:10]
    end = offset_bucket(kickoff_iso, 0)[:10]
    if kick <= now:
        url = (
            "https://historical-forecast-api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lon}&start_date={start}&end_date={end}"
            f"&hourly={HOURLY_VARS}{UNITS}"
        )
        source = "open-meteo-historical-forecast"
    else:
        url = (
            "https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lon}&hourly={HOURLY_VARS}{UNITS}&forecast_days=7"
        )
        source = "open-meteo-forecast"
    req = Request(url, headers={"User-Agent": "GalaxySportsEdge/1.0"})
    with urlopen(req, timeout=25) as resp:
        payload = json.load(resp)
    return horizons_from_hourly(payload.get("hourly") or {}, kickoff_iso, indoor=False, source=source)

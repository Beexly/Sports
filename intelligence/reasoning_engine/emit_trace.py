"""Write the CLE-PIT week-4 trace, with a live forecast if the free API answers."""
import json
import os
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "qb-behavior", "src"))

from reasoning_engine.run_game import reason_game, write_trace

# Huntington Bank Field. Live forecast, not ERA5. Failure is a gap.
weather = {"available": False, "source": "unavailable", "license": "n/a"}
url = (
    "https://api.open-meteo.com/v1/forecast?latitude=41.5061&longitude=-81.6995"
    "&hourly=temperature_2m,wind_speed_10m,precipitation"
    "&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch"
    "&forecast_days=2&timezone=UTC"
)
try:
    req = urllib.request.Request(url, headers={"User-Agent": "GalaxySportsEdge/1.0"})
    with urllib.request.urlopen(req, timeout=25) as resp:
        payload = json.load(resp)
    h = payload.get("hourly") or {}
    weather = {
        "available": True,
        "source": "open-meteo-forecast",
        "license": "CC-BY-4.0; hosted free tier is non-commercial",
        "stadium": "Huntington Bank Field",
        "tempF": (h.get("temperature_2m") or [None])[0],
        "windMph": (h.get("wind_speed_10m") or [None])[0],
        "precipInch": (h.get("precipitation") or [None])[0],
        "note": "First hour of the current forecast. Not the kickoff hour of a past game. Not a fitted weight.",
    }
except Exception as exc:
    weather = {"available": False, "source": "unavailable", "license": "n/a", "error": type(exc).__name__}

doc = reason_game(weather=weather)
out = os.path.join(ROOT, "reasoning_engine", "traces", "cle-pit-week4-2026.json")
write_trace(out, doc)
print("wrote", out)
print("label", doc["trace_label"], "checklist", doc["checklist"])
print("facts", [f["signal"] for f in doc["facts"]])
print("gaps", len(doc["gaps"]))

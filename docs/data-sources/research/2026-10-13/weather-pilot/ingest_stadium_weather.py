"""Stadium weather + air-density pilot ingestion (2026-10-13).

Pulls a 4-day hourly forecast for a set of NFL venues from Open-Meteo (public,
keyless, no scraping) and computes air density rho = P / (R_specific * T) from
the model's own surface pressure and 2m temperature. This is a PILOT for the
environmental signal domain of the omnivorous ingestion layer: weather, wind,
humidity and air density feed the stadium/physics overlays.

Method notes (honesty):
- Coordinates come from Open-Meteo's own geocoding API for the venue NAME, so
  no hand-typed coordinates can be wrong.
- Air density uses the dry-air approximation rho = P / (287.05 * (T + 273.15))
  with surface pressure in Pa and temperature in Kelvin. Humidity is reported
  alongside, not folded into rho here.
- One request per venue plus one geocoding request each; ~16 requests total.
"""

import json
import urllib.parse
import urllib.request
from datetime import datetime, timezone

VENUES = [
    ("SoFi Stadium", "Inglewood, CA"),
    ("Arrowhead Stadium", "Kansas City, MO"),
    ("Highmark Stadium", "Orchard Park, NY"),
    ("Lambeau Field", "Green Bay, WI"),
    ("AT&T Stadium", "Arlington, TX"),
    ("Lincoln Financial Field", "Philadelphia, PA"),
    ("Lumen Field", "Seattle, WA"),
    ("Mercedes-Benz Stadium", "Atlanta, GA"),
]

GEO = "https://geocoding-api.open-meteo.com/v1/search"
FC = "https://api.open-meteo.com/v1/forecast"
OUT_DIR = r"C:\Users\Garrett\Sports\docs\data-sources\research\2026-10-13\weather-pilot"

R_DRY = 287.05  # specific gas constant for dry air, J/(kg*K)


def get_json(url: str, params: dict) -> dict:
    full = url + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(full, headers={"User-Agent": "GSE-ingest-pilot/1.0 (public API, keyless)"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def air_density(pressure_hpa: float, temp_c: float) -> float:
    return (pressure_hpa * 100.0) / (R_DRY * (temp_c + 273.15))


def main() -> None:
    import os

    os.makedirs(OUT_DIR, exist_ok=True)
    now = datetime.now(timezone.utc).isoformat()
    results = []
    for venue, city in VENUES:
        geo = get_json(GEO, {"name": city, "count": 1, "language": "en", "format": "json"})
        if not geo.get("results"):
            results.append({"venue": venue, "error": "geocode miss"})
            continue
        g = geo["results"][0]
        fc = get_json(
            FC,
            {
                "latitude": g["latitude"],
                "longitude": g["longitude"],
                "hourly": "temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,precipitation_probability",
                "forecast_days": 4,
                "timezone": "UTC",
            },
        )
        h = fc["hourly"]
        # nearest hour to now
        times = h["time"]
        idx = min(range(len(times)), key=lambda i: abs((datetime.fromisoformat(times[i]).replace(tzinfo=timezone.utc) - datetime.now(timezone.utc)).total_seconds()))
        rho = air_density(h["surface_pressure"][idx], h["temperature_2m"][idx])
        results.append(
            {
                "venue": venue,
                "geo": {"lat": g["latitude"], "lon": g["longitude"], "elevation_m": g.get("elevation"), "name": g.get("name"), "admin1": g.get("admin1"), "geocode_query": city},
                "now_utc": times[idx],
                "now": {
                    "temp_c": h["temperature_2m"][idx],
                    "rh_pct": h["relative_humidity_2m"][idx],
                    "surface_pressure_hpa": h["surface_pressure"][idx],
                    "wind_kmh": h["wind_speed_10m"][idx],
                    "precip_prob_pct": h["precipitation_probability"][idx],
                    "air_density_kg_m3": round(rho, 4),
                },
                "forecast_hourly_4d": {
                    "time": times,
                    "temperature_2m": h["temperature_2m"],
                    "wind_speed_10m": h["wind_speed_10m"],
                    "precipitation_probability": h["precipitation_probability"],
                    "surface_pressure": h["surface_pressure"],
                    "relative_humidity_2m": h["relative_humidity_2m"],
                },
            }
        )
        print(f"{venue}: rho={rho:.4f} kg/m3, T={h['temperature_2m'][idx]}C, P={h['surface_pressure'][idx]} hPa")

    payload = {
        "generated_utc": now,
        "source": "open-meteo.com public API (keyless)",
        "method": "rho = P/(287.05*(T+273.15)); coords from open-meteo geocoding of the venue's city (city-level - the stadium building is not a geocoder entry); dry-air approximation",
        "venues": results,
    }
    with open(os.path.join(OUT_DIR, "weather-stadium-pilot.json"), "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=1)

    md = ["# Stadium weather + air-density pilot (2026-10-13)", "", f"Source: Open-Meteo public API (keyless), generated {now}", "", "| Venue | Air density kg/m3 | Temp C | Wind km/h | Precip % | Pressure hPa |", "|---|---|---|---|---|---|"]
    for r in results:
        if "error" in r:
            md.append(f"| {r['venue']} | ERROR: {r['error']} | | | | |")
            continue
        n = r["now"]
        md.append(f"| {r['venue']} | {n['air_density_kg_m3']} | {n['temp_c']} | {n['wind_kmh']} | {n['precip_prob_pct']} | {n['surface_pressure_hpa']} |")
    md += ["", "Method: rho = P/(287.05*(T+273.15)); coordinates from Open-Meteo geocoding of the venue's CITY (city-level; the stadium building is not a geocoder entry); dry-air approximation; humidity reported separately."]
    with open(os.path.join(OUT_DIR, "weather-stadium-pilot.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(md) + "\n")
    print(f"WROTE {OUT_DIR}")


if __name__ == "__main__":
    main()

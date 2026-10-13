"""ESPN scoreboard-odds market priors for the L4 Bayesian update.

Layer 1 for EVERY game (not just Kalshi-listed ones): the ESPN inline scoreboard
odds the repo already ingests keylessly (packages/data-ingestion/espn-odds-client.ts,
de-vigged via galaxy-devig.ts). This module is the Python read side: it pulls the
public scoreboard, takes the h2h/spread/total provider rows, de-vigs the two-way
prices, and emits MarketPrior records for bayes.update().

De-vig: multiplicative (each implied prob divided by the booksum), the same
first-order method as galaxy-devig.ts. Moneyline prices are American.

Usage:
    python intelligence/reasoning/market_priors.py --sport football/nfl
    python intelligence/reasoning/market_priors.py --sport football/nfl --json out.json
"""

from __future__ import annotations

import argparse
import json
import urllib.request
from datetime import datetime, timezone

BASES = (
    "https://site.api.espn.com/apis/site/v2/sports/{sport}/scoreboard",
    "https://site.web.api.espn.com/apis/site/v2/sports/{sport}/scoreboard",
)
UA = {"User-Agent": "GSE-market-priors/1.0 (keyless ESPN public API)"}


def american_to_implied(price: float) -> float:
    if price >= 100:
        return 100.0 / (price + 100.0)
    if price <= -100:
        return (-price) / ((-price) + 100.0)
    raise ValueError(f"not an American price: {price}")


def devig_two_way(price_a: float, price_b: float) -> tuple[float, float, float]:
    """Multiplicative de-vig of two American prices -> (fair_a, fair_b, booksum)."""
    ia, ib = american_to_implied(price_a), american_to_implied(price_b)
    s = ia + ib
    if s <= 0:
        raise ValueError("non-positive booksum")
    return ia / s, ib / s, s


def _fetch(url: str) -> dict:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def market_priors_for_sport(sport: str = "football/nfl") -> list[dict]:
    """One prior per game per market type, from the first provider with prices.

    Returns dicts (not dataclasses) so callers can json them directly:
    {game_id, market, hypothesis, prior, source, booksum, note}
    """
    payload = None
    for base in BASES:
        try:
            payload = _fetch(base.format(sport=sport))
            break
        except Exception:
            continue
    if payload is None:
        raise RuntimeError("both ESPN scoreboard hosts failed")

    out: list[dict] = []
    now = datetime.now(timezone.utc).isoformat()
    for ev in payload.get("events", []):
        comps = ev.get("competitions", []) or []
        if not comps:
            continue
        comp = comps[0]
        game_id = ev.get("id") or ""
        short = f"{game_id}:{(ev.get('name') or '').replace(' ', '-')}"
        for provider in comp.get("odds", []) or []:
            ou = provider.get("overUnder")
            ml = provider.get("moneyline") or {}
            # ESPN's moneyline object: {"home": {"close": {"odds": "-120"}, "open": {...}}, "away": {...}}
            # American prices as STRINGS; close is the sharp number.
            h_obj, a_obj = ml.get("home") or {}, ml.get("away") or {}
            def _amer(obj: dict) -> float | None:
                for key in ("close", "open", "current"):
                    block = obj.get(key) or {}
                    raw = block.get("odds")
                    if raw in (None, ""):
                        continue
                    try:
                        return float(raw)
                    except (TypeError, ValueError):
                        continue
                return None
            h_ml, a_ml = _amer(h_obj), _amer(a_obj)
            if isinstance(h_ml, (int, float)) and isinstance(a_ml, (int, float)) and h_ml and a_ml:
                try:
                    fa, fb, s = devig_two_way(float(h_ml), float(a_ml))
                    out.append({
                        "game_id": game_id, "game": ev.get("name"), "market": "MONEYLINE",
                        "home": h_obj.get("shortDisplayName") or (h_obj.get("close") or {}).get("odds") or ev.get("name"),
                        "away": a_obj.get("shortDisplayName") or "",
                        "hypothesis": f"espn-ml:{short}",
                        "prior_home": round(fa, 4),
                        "prior_away": round(fb, 4),
                        "booksum": round(s, 4),
                        "source": provider.get("provider", {}).get("name") or "espn-inline",
                        "note": "multiplicative de-vig of h2h American prices",
                        "generated_utc": now,
                    })
                except ValueError:
                    pass
            if isinstance(ou, (int, float)) and ou > 0:
                out.append({
                    "game_id": game_id, "game": ev.get("name"), "market": "TOTAL",
                    "hypothesis": f"espn-total:{short}",
                    "line": float(ou),
                    "source": provider.get("provider", {}).get("name") or "espn-inline",
                    "note": "total line only; a two-sided price requires the odds detail payload",
                    "generated_utc": now,
                })
            break  # first provider with data is the Layer-1 anchor
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--sport", default="football/nfl")
    ap.add_argument("--json", dest="json_out", default=None)
    args = ap.parse_args()
    rows = market_priors_for_sport(args.sport)
    print(f"{len(rows)} prior rows")
    for r in rows[:10]:
        if r["market"] == "MONEYLINE":
            print(f"  {r['game']}: ML fair {r['prior_home']}/{r['prior_away']} (booksum {r['booksum']}, {r['source']})")
        else:
            print(f"  {r['game']}: TOTAL {r['line']} ({r['source']})")
    if args.json_out:
        with open(args.json_out, "w", encoding="utf-8") as f:
            json.dump({"generated_utc": datetime.now(timezone.utc).isoformat(), "priors": rows}, f, indent=1)
        print(f"wrote {args.json_out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

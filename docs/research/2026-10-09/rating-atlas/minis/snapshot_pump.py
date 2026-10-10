#!/usr/bin/env python3
"""
L4 FLOW SNAPSHOT PUMP
Repeated latency-stamped snapshots of provider prices for sports-market move-leadership data.
Sources:
- CFBD (College Football Data API) lines for 2026 CFB (both regular and postseason)
- Kalshi KXNCAAFSPREAD markets (keyless)
- Pinnacle guest API for NFL week markets (if reachable)
Each snapshot appends rows to flow_warehouse.jsonl with fields:
  observed_at (ISO UTC), source, provider, game_key, market, price, raw_extras
"""
import json
import time
import datetime
import urllib.request
import urllib.error
import sys
import os

# Import Warehouse from doctrine.py (same directory level)
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from doctrine import Warehouse

# Constants
CFBD_URL = "https://api.collegefootballdata.com/lines?year=2026&seasonType=both"
CFBD_HEADERS = {
    "Authorization": f"Bearer {os.environ.get('CFBD_API_KEY', '')}",
    "Accept": "application/json"
}
KALSHI_MARKETS_URL = "https://api.elections.kalshi.com/trade-api/v2/markets?series_ticker=KXNCAAFSPREAD&limit=200"
KALSHI_ORDERBOOK_URL_TEMPLATE = "https://api.elections.kalshi.com/trade-api/v2/markets/{ticker}/orderbook"
PINNACLE_SPORTS_URL = "https://guest.api.arcadia.pinnacle.com/0.1/sports"
PINNACLE_LEAGUES_URL_TEMPLATE = "https://guest.api.arcadia.pinnacle.com/0.1/leagues/{league_id}/matchups"
PINNACLE_MARKETS_URL_TEMPLATE = "https://guest.api.arcadia.pinnacle.com/0.1/matchups/{matchup_id}/markets/related/straight"

# Football sport ID for Pinnacle (from context: id 15 = football)
PINNACLE_FOOTBALL_SPORT_ID = 15
# NFL league ID for Pinnacle (from context: 889)
PINNACLE_NFL_LEAGUE_ID = 889

# Pacing: minimum seconds between requests to different hosts
MIN_INTER_HOST_DELAY = 2.0

def http_get(url, headers=None, timeout=10):
    """Perform GET request, return parsed JSON or None on error."""
    req = urllib.request.Request(url, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            if resp.status == 200:
                data = resp.read().decode('utf-8')
                return json.loads(data)
            else:
                print(f"[WARN] HTTP {resp.status} for {url}", file=sys.stderr)
                return None
    except urllib.error.URLError as e:
        print(f"[WARN] URL error for {url}: {e}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"[WARN] Unexpected error for {url}: {e}", file=sys.stderr)
        return None

def iso_utc_now():
    """Return current UTC timestamp as ISO string with Z."""
    return datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00', 'Z')

def epoch_now():
    return time.time()

def append_warehouse(wh, source, provider, game_key, market, price, raw_extras):
    """Append a single price observation to warehouse."""
    row = {
        "observed_at": epoch_now(),   # Warehouse expects epoch seconds (float) or ISO string? parse_ts handles both.
        "source": source,
        "provider": provider,
        "game_key": game_key,
        "market": market,
        "price": price,
        "raw_extras": raw_extras
    }
    wh.append(row, epoch_now())  # observed_at passed as epoch seconds

def fetch_cfb(wh):
    """Fetch CFBD lines for 2026 CFB."""
    print("[INFO] Fetching CFBD lines...")
    data = http_get(CFBD_URL, headers=CFBD_HEADERS)
    if not data:
        print("[WARN] No data from CFBD")
        return 0
    count = 0
    for game in data:
        # Game fields: id, season, week, seasonType, startDate, homeTeam, homeId, awayTeam, awayId,
        # homeScore, awayScore, lines (list of providers)
        home = game.get('homeTeam')
        away = game.get('awayTeam')
        if not home or not away:
            continue
        game_key = f"{home}_vs_{away}_{game.get('season')}_{game.get('week')}"
        lines = game.get('lines', [])
        for provider_entry in lines:
            provider = provider_entry.get('provider')
            if not provider:
                continue
            # Each provider_entry may have spreads, totals, moneylines
            spread = provider_entry.get('spread')
            total = provider_entry.get('overUnder')
            moneyline_home = provider_entry.get('moneylineHome')
            moneyline_away = provider_entry.get('moneylineAway')
            # Append spread if present
            if spread is not None:
                append_warehouse(wh, 'cfbd', provider, game_key, 'spread', spread,
                                 {"home": home, "away": away, "spread_home": spread})  # home spread?
                count += 1
            if total is not None:
                append_warehouse(wh, 'cfbd', provider, game_key, 'total', total,
                                 {"home": home, "away": away})
                count += 1
            if moneyline_home is not None:
                append_warehouse(wh, 'cfbd', provider, game_key, 'ml_home', moneyline_home,
                                 {"home": home, "away": away})
                count += 1
            if moneyline_away is not None:
                append_warehouse(wh, 'cfbd', provider, game_key, 'ml_away', moneyline_away,
                                 {"home": home, "away": away})
                count += 1
    print(f"[INFO] CFBD: appended {count} rows")
    return count

def fetch_kalshi(wh):
    """Fetch Kalshi KXNCAAFSPREAD markets and use last_price_dollars as price."""
    print("[INFO] Fetching Kalshi markets...")
    markets_data = http_get(KALSHI_MARKETS_URL)
    if not markets_data:
        print("[WARN] No markets data from Kalshi")
        return 0
    markets = markets_data.get('markets', [])
    count = 0
    now_time = epoch_now()
    for market in markets:
        ticker = market.get('ticker')
        if not ticker:
            continue
        # Use event_ticker as game_key if available, else ticker
        game_key = market.get('event_ticker', ticker)
        # Determine if market is still active (expiration_time in future)
        exp_str = market.get('expiration_time')
        if exp_str:
            try:
                exp_time = datetime.datetime.fromisoformat(exp_str.replace('Z', '+00:00')).timestamp()
                if exp_time < now_time:
                    # Skip expired markets
                    continue
            except:
                pass
        # Use last_price_dollars as yes price
        yes_price_str = market.get('last_price_dollars')
        if yes_price_str is not None:
            try:
                yes_price = float(yes_price_str)
            except:
                yes_price = None
            if yes_price is not None:
                append_warehouse(wh, 'kalshi', 'kalshi', game_key, 'kspread_yes', yes_price,
                                 {"ticker": ticker, "side": "yes", "last_price_dollars": yes_price_str})
                count += 1
        # Also could use previous_price_dollars? We'll stick to last_price.
        # Optionally compute no price as 1 - yes_price? Not required.
    print(f"[INFO] Kalshi: appended {count} rows")
    return count

def fetch_pinnacle(wh):
    """Fetch Pinnacle NFL week markets."""
    print("[INFO] Fetching Pinnacle sports...")
    sports_data = http_get(PINNACLE_SPORTS_URL)
    if not sports_data:
        print("[WARN] Could not fetch Pinnacle sports list")
        return 0
    # Find football sport
    football_sport = None
    for sport in sports_data:
        if sport.get('id') == PINNACLE_FOOTBALL_SPORT_ID:
            football_sport = sport
            break
    if not football_sport:
        print("[WARN] Football sport not found in Pinnacle")
        return 0
    # Get leagues for football (sportId)
    leagues_url = f"https://guest.api.arcadia.pinnacle.com/0.1/leagues?sportId={football_sport.get('id')}"
    leagues_data = http_get(leagues_url)
    if not leagues_data:
        print("[WARN] Could not fetch Pinnacle leagues for sport")
        return 0
    # Find NFL league (id 889)
    nfl_league = None
    # leagues_data might be a list
    if isinstance(leagues_data, list):
        for league in leagues_data:
            if league.get('id') == PINNACLE_NFL_LEAGUE_ID:
                nfl_league = league
                break
    elif isinstance(leagues_data, dict) and leagues_data.get('id') == PINNACLE_NFL_LEAGUE_ID:
        nfl_league = leagues_data
    if not nfl_league:
        print("[WARN] NFL league not found in leagues list")
        return 0
    # Get matchups for NFL
    matchups_url = PINNACLE_LEAGUES_URL_TEMPLATE.format(league_id=PINNACLE_NFL_LEAGUE_ID)
    matchups_data = http_get(matchups_url)
    if not matchups_data:
        print("[WARN] Could not fetch Pinnacle matchups")
        return 0
    if not isinstance(matchups_data, list):
        print("[WARN] Matchups data not a list")
        return 0
    count = 0
    for matchup in matchups_data:
        matchup_id = matchup.get('id')
        if not matchup_id or matchup_id == '[PHONE]':
            # Skip obfuscated IDs
            continue
        # Teams
        home = matchup.get('home', {}).get('name')
        away = matchup.get('away', {}).get('name')
        if not home or not away:
            continue
        game_key = f"{home}_vs_{away}"
        # Get markets for this matchup
        markets_url = PINNACLE_MARKETS_URL_TEMPLATE.format(matchup_id=matchup_id)
        markets_data = http_get(markets_url)
        if not markets_data:
            continue
        # Normalize markets_data to list
        if isinstance(markets_data, dict) and 'markets' in markets_data:
            markets_list = markets_data['markets']
        elif isinstance(markets_data, list):
            markets_list = markets_data
        else:
            markets_list = []
        for market in markets_list:
            market_type = market.get('type')  # e.g., 'moneyline', 'spread', 'total'
            if market_type not in ('moneyline', 'spread', 'total'):
                continue
            prices = market.get('prices', [])
            if not isinstance(prices, list):
                continue
            # Determine market category
            if market_type == 'moneyline':
                market_cat = 'ml'
            elif market_type == 'spread':
                market_cat = 'spread'
            else:  # total
                market_cat = 'total'
            for price_entry in prices:
                price_val = price_entry.get('price')
                if price_val is None:
                    continue
                try:
                    price = float(price_val)
                except:
                    continue
                # Provider is 'pinnacle'
                append_warehouse(wh, 'pinnacle', 'pinnacle', game_key, market_cat, price,
                                 {"matchup_id": matchup_id, "market_type": market_type,
                                  "price_handler": price_entry.get('handler'),
                                  "points": price_entry.get('points')})
                count += 1
    print(f"[INFO] Pinnacle: appended {count} rows")
    return count

def main():
    """Run one snapshot."""
    # Ensure warehouse directory exists
    warehouse_dir = "/var/minis/workspace/pump"
    os.makedirs(warehouse_dir, exist_ok=True)
    warehouse_path = os.path.join(warehouse_dir, "flow_warehouse.jsonl")
    # Initialize Warehouse (we don't need to load existing rows for append-only)
    wh = Warehouse("flow_warehouse")
    # We could load existing rows to duplicate check? Not required; we just append.
    # But we need to ensure we don't break if file exists? Warehouse append works in-memory only.
    # However we want to persist across runs? The spec says JSONL store is append-only.
    # We'll read existing JSONL and load into warehouse to avoid duplicate? Actually we just want to append new rows each run.
    # We'll not load existing rows; we'll just append to file directly? But spec says wrap doctrine Warehouse for validation.
    # We'll use Warehouse to validate rows, but we will write to JSONL ourselves.
    # Let's create a custom wrapper that writes each appended row to JSONL.
    class JsonlWarehouse(Warehouse):
        def __init__(self, name, jsonl_path):
            super().__init__(name)
            self.jsonl_path = jsonl_path
            # Ensure file exists
            open(self.jsonl_path, 'a').close()
        def append(self, row, observed_at):
            stored = super().append(row, observed_at)
            # Write as JSON line
            with open(self.jsonl_path, 'a') as f:
                # We need to write observed_at as ISO string? Let's write as ISO UTC for readability.
                out = dict(stored)
                out['observed_at'] = datetime.datetime.fromtimestamp(out['observed_at'],
                                                                    tz=datetime.timezone.utc).isoformat().replace('+00:00', 'Z')
                f.write(json.dumps(out) + '\n')
            return stored
    wh = JsonlWarehouse("flow_warehouse", warehouse_path)
    # Fetch from each source with pacing
    start = time.time()
    cfbd_count = fetch_cfb(wh)
    # Delay before next host
    time.sleep(MIN_INTER_HOST_DELAY)
    kalshi_count = fetch_kalshi(wh)
    time.sleep(MIN_INTER_HOST_DELAY)
    pinnacle_count = fetch_pinnacle(wh)
    elapsed = time.time() - start
    print(f"[INFO] Snapshot complete. CFBD:{cfbd_count} Kalshi:{kalshi_count} Pinnacle:{pinnacle_count} Total:{cfbd_count+kalshi_count+pinnacle_count} Elapsed:{elapsed:.1f}s")
    return 0

if __name__ == '__main__':
    sys.exit(main())
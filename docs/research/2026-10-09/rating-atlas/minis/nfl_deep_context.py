#!/usr/bin/env python3
"""
nfl_deep_context.py — NFL deep-context measurement.
Measure raw effects of rest, travel, and weather on home margin and total.
No closing lines available, so we measure raw effects and note the limitation.
"""
import csv, json, math, os, statistics, time, urllib.request
from collections import defaultdict
from datetime import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")
CACHE_FILE = os.path.join(DATA, "nfl_weather_2023_2025.json")

# NFL team abbreviations to city coordinates (approx, degrees latitude, longitude)
TEAM_COORDS = {
    # AFC East
    "BUF": (42.8864, -78.8784),  # Buffalo
    "MIA": (25.7617, -80.1918),  # Miami
    "NE": (42.3601, -71.0589),   # New England (Foxborough, MA)
    "NYJ": (40.8136, -74.1111),  # New York Jets (East Rutherford, NJ)
    # AFC North
    "BAL": (39.2904, -76.6122),  # Baltimore
    "CIN": (39.0992, -84.5177),  # Cincinnati
    "CLE": (41.4953, -81.6953),  # Cleveland
    "PIT": (40.4406, -80.0086),  # Pittsburgh
    # AFC South
    "HOU": (29.7604, -95.3698),  # Houston
    "IND": (39.7684, -86.1581),  # Indianapolis
    "JAX": (30.3322, -81.6557),  # Jacksonville
    "TEN": (36.1659, -86.7816),  # Tennessee (Nashville)
    # AFC West
    "DEN": (39.7392, -104.9903), # Denver
    "KC": (39.0499, -94.5803),   # Kansas City
    "LAC": (33.8121, -117.9189), # Los Angeles Chargers
    "LV": (36.1699, -115.1398),  # Las Vegas
    # NFC East
    "DAL": (32.7767, -96.7970),  # Dallas
    "NYG": (40.8136, -74.1111),  # New York Giants (East Rutherford, NJ)
    "PHI": (39.9526, -75.1652),  # Philadelphia
    "WAS": (38.9072, -77.0369),  # Washington
    # NFC North
    "CHI": (41.8781, -87.6298),  # Chicago
    "DET": (42.3314, -83.0458),  # Detroit
    "GB": (44.5013, -88.0622),   # Green Bay
    "MIN": (44.9778, -93.2650),  # Minnesota
    # NFC South
    "ATL": (33.7490, -84.3880),  # Atlanta
    "CAR": (35.2271, -80.8431),  # Carolina
    "NO": (29.9511, -90.0715),   # New Orleans
    "TB": (27.9758, -82.4572),   # Tampa Bay
    # NFC West
    "ARI": (33.4484, -112.0740), # Arizona
    "LAR": (34.0141, -118.2913), # Los Angeles Rams
    "SF": (37.7749, -122.4194),  # San Francisco
    "SEA": (47.6062, -122.3321), # Seattle
}

def haversine(lat1, lon1, lat2, lon2):
    """Calculate distance in miles between two lat/lon points."""
    R = 3958.8  # Earth radius in miles
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2 * R * math.asin(math.sqrt(a))

def load_games():
    """Load games from CSV."""
    games = []
    with open(os.path.join(DATA, "games_all.csv"), 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Convert numeric fields
            row['away_score'] = int(row['away_score']) if row['away_score'] else None
            row['home_score'] = int(row['home_score']) if row['home_score'] else None
            row['away_rest'] = int(row['away_rest']) if row['away_rest'] else None
            row['home_rest'] = int(row['home_rest']) if row['home_rest'] else None
            row['temp'] = float(row['temp']) if row['temp'] else None
            row['wind'] = float(row['wind']) if row['wind'] else None
            games.append(row)
    return games

def rest_analysis(games):
    """Analyze home margin by home team rest class."""
    classes = defaultdict(list)  # list of home margins
    for g in games:
        if g['home_score'] is None or g['away_score'] is None:
            continue
        home_margin = g['home_score'] - g['away_score']
        rest = g['home_rest']
        if rest is None:
            continue
        if rest >= 12:
            cls = 'post-bye (>=12d)'
        elif rest <= 5:
            cls = 'short rest (<=5d)'
        else:
            cls = 'normal (6-11d)'
        classes[cls].append(home_margin)
    
    print("REST — home margin by home team rest days:")
    results = {}
    for cls, margins in sorted(classes.items()):
        if len(margins) < 5:
            print(f"   {cls:<30} n={len(margins):>4} (too small)")
            continue
        mean = statistics.mean(margins)
        stdev = statistics.stdev(margins) if len(margins) > 1 else 0.0
        se = stdev / math.sqrt(len(margins))
        t = mean / se if se != 0 else 0.0
        print(f"   {cls:<30} n={len(margins):>4}  mean={mean:>+6.2f} ± {se:.2f} (t={t:+.2f})")
        results[cls] = {'n': len(margins), 'mean': round(mean, 2), 'se': round(se, 2), 't': round(t, 2)}
    return results

def travel_analysis(games):
    """Analyze home margin by travel distance and timezone change."""
    # Distance buckets
    dist_buckets = defaultdict(list)
    # Timezone change bucket (2-3 hr shift)
    tz_buckets = defaultdict(list)
    
    for g in games:
        if g['home_score'] is None or g['away_score'] is None:
            continue
        home_margin = g['home_score'] - g['away_score']
        home_team = g['home_team']
        away_team = g['away_team']
        if home_team not in TEAM_COORDS or away_team not in TEAM_COORDS:
            continue
        home_lat, home_lon = TEAM_COORDS[home_team]
        away_lat, away_lon = TEAM_COORDS[away_team]
        dist = haversine(home_lat, home_lon, away_lat, away_lon)
        
        # Distance bucket
        if dist < 500:
            dist_cls = '<500mi'
        elif dist < 1500:
            dist_cls = '500-1500mi'
        elif dist < 2500:
            dist_cls = '1500-2500mi'
        else:
            dist_cls = '>2500mi'
        dist_buckets[dist_cls].append(home_margin)
        
        # Timezone change: approximate by longitude difference
        # Each 15 degrees longitude = 1 hour
        lon_diff = abs(home_lon - away_lon)
        hours_diff = lon_diff * (24/360)  # 360 degrees = 24 hours -> 15 deg = 1 hour
        if 2.0 <= hours_diff <= 3.0:
            tz_buckets['cross-timezone (2-3hr shift)'].append(home_margin)
    
    print("\nTRAVEL — home margin by distance:")
    dist_results = {}
    for cls, margins in sorted(dist_buckets.items()):
        if len(margins) < 5:
            print(f"   {cls:<20} n={len(margins):>4} (too small)")
            continue
        mean = statistics.mean(margins)
        stdev = statistics.stdev(margins) if len(margins) > 1 else 0.0
        se = stdev / math.sqrt(len(margins))
        t = mean / se if se != 0 else 0.0
        print(f"   {cls:<20} n={len(margins):>4}  mean={mean:>+6.2f} ± {se:.2f} (t={t:+.2f})")
        dist_results[cls] = {'n': len(margins), 'mean': round(mean, 2), 'se': round(se, 2), 't': round(t, 2)}
    
    print("\nTRAVEL — home margin by cross-timezone games (2-3hr shift):")
    tz_results = {}
    for cls, margins in tz_buckets.items():
        if len(margins) < 5:
            print(f"   {cls:<35} n={len(margins):>4} (too small)")
            continue
        mean = statistics.mean(margins)
        stdev = statistics.stdev(margins) if len(margins) > 1 else 0.0
        se = stdev / math.sqrt(len(margins))
        t = mean / se if se != 0 else 0.0
        print(f"   {cls:<35} n={len(margins):>4}  mean={mean:>+6.2f} ± {se:.2f} (t={t:+.2f})")
        tz_results[cls] = {'n': len(margins), 'mean': round(mean, 2), 'se': round(se, 2), 't': round(t, 2)}
    
    return {'distance': dist_results, 'timezone': tz_results}

def weather_analysis(games):
    """Analyze home margin and total by weather conditions using Open-Meteo API."""
    # Cache for weather data: key -> (lat, lon) -> {date: (wind_mph, precip_mm, temp_f)}
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, 'r') as f:
            weather_cache = json.load(f)
    else:
        weather_cache = {}
    
    # We'll collect unique (lat, lon) for outdoor games and their date ranges
    outdoor_games = [g for g in games if g['surface'] in ('outdoors', 'open') and g['home_score'] is not None and g['away_score'] is not None]
    print(f"  Found {len(outdoor_games)} outdoor games")
    # Group by (lat, lon) using home team coordinates
    loc_games = defaultdict(list)
    for g in outdoor_games:
        home_team = g['home_team']
        if home_team not in TEAM_COORDS:
            continue
        lat, lon = TEAM_COORDS[home_team]
        loc_games[(lat, lon)].append(g)
    
    print(f"  Unique locations: {len(loc_games)}")
    # For each location, fetch weather for the date range
    sess = urllib.request
    for (lat, lon), glist in loc_games.items():
        key = f"{lat},{lon}"
        if key in weather_cache:
            continue
        # Determine date range
        dates = []
        for g in glist:
            if g['gameday']:
                try:
                    dates.append(datetime.strptime(g['gameday'], '%Y-%m-%d').date())
                except:
                    pass
        if not dates:
            continue
        min_date = min(dates)
        max_date = max(dates)
        # We'll restrict to 2023-2025 as per task
        start = max(min_date, datetime(2023, 1, 1).date())
        end = min(max_date, datetime(2025, 12, 31).date())
        if start > end:
            # No overlap with 2023-2025, skip
            weather_cache[key] = {}
            continue
        url = (f"https://archive-api.open-meteo.com/v1/archive?latitude={lat}"
               f"&longitude={lon}&start_date={start}&end_date={end}"
               f"&daily=wind_speed_10m_max,precipitation_sum,temperature_2m_max&timezone=auto")
        try:
            resp = sess.urlopen(url, timeout=30)
            data = json.loads(resp.read().decode())
            daily = data.get('daily', {})
            times = daily.get('time', [])
            wind = daily.get('wind_speed_10m_max', [])
            precip = daily.get('precipitation_sum', [])
            temp = daily.get('temperature_2m_max', [])
            # Map date string to (wind_kmh, precip_mm, temp_c)
            day_map = {}
            for i, d in enumerate(times):
                w = wind[i] if i < len(wind) else None
                p = precip[i] if i < len(precip) else None
                t = temp[i] if i < len(temp) else None
                day_map[d] = (w, p, t)
            weather_cache[key] = day_map
            print(f"   Fetched weather for {lat},{lon} ({len(day_map)} days)")
        except Exception as e:
            print(f"   Warning: failed to fetch weather for {lat},{lon}: {e}")
            weather_cache[key] = {}
        time.sleep(0.15)  # be polite
    
    # Save cache
    with open(CACHE_FILE, 'w') as f:
        json.dump(weather_cache, f)
    
    # Now analyze each outdoor game
    wind_buckets = defaultdict(lambda: ([], []))  # (home_margin_list, total_list)
    rain_buckets = defaultdict(lambda: ([], []))
    cold_buckets = defaultdict(lambda: ([], []))
    
    processed = 0
    missing_weather = 0
    for g in outdoor_games:
        home_team = g['home_team']
        if home_team not in TEAM_COORDS:
            missing_weather += 1
            continue
        lat, lon = TEAM_COORDS[home_team]
        key = f"{lat},{lon}"
        date_str = g['gameday']
        if date_str not in weather_cache.get(key, {}):
            missing_weather += 1
            continue
        w_kmh, p_mm, c_c = weather_cache[key][date_str]
        if w_kmh is None or p_mm is None or c_c is None:
            missing_weather += 1
            continue
        # Convert units
        wind_mph = w_kmh * 0.621371  # km/h to mph
        precip_mm = p_mm  # already mm
        temp_f = c_c * 9/5 + 32  # C to F
        
        home_margin = g['home_score'] - g['away_score']
        total_score = g['home_score'] + g['away_score']
        
        # Wind bucket
        if wind_mph < 8:
            wind_cls = 'wind <8 mph'
        elif wind_mph < 15:
            wind_cls = 'wind 8-15 mph'
        else:
            wind_cls = 'wind >=15 mph'
        wind_buckets[wind_cls][0].append(home_margin)
        wind_buckets[wind_cls][1].append(total_score)
        
        # Rain bucket
        rain_cls = 'rain >=2mm' if precip_mm >= 2.0 else 'dry'
        rain_buckets[rain_cls][0].append(home_margin)
        rain_buckets[rain_cls][1].append(total_score)
        
        # Cold bucket
        cold_cls = 'cold <32F' if temp_f < 32.0 else 'warm >=32F'
        cold_buckets[cold_cls][0].append(home_margin)
        cold_buckets[cold_cls][1].append(total_score)
        
        processed += 1
    
    print(f"  Processed {processed} outdoor games with weather data, missing weather for {missing_weather}")
    
    print("\nWEATHER — home margin and total by wind speed (outdoor games only):")
    wind_results = {}
    for cls, (hmargins, totals) in wind_buckets.items():
        if len(hmargins) < 5:
            print(f"   {cls:<25} n={len(hmargins):>4} (too small)")
            continue
        # Home margin
        mean_hm = statistics.mean(hmargins)
        stdev_hm = statistics.stdev(hmargins) if len(hmargins) > 1 else 0.0
        se_hm = stdev_hm / math.sqrt(len(hmargins))
        t_hm = mean_hm / se_hm if se_hm != 0 else 0.0
        # Total
        mean_tot = statistics.mean(totals)
        stdev_tot = statistics.stdev(totals) if len(totals) > 1 else 0.0
        se_tot = stdev_tot / math.sqrt(len(totals))
        t_tot = mean_tot / se_tot if se_tot != 0 else 0.0
        line = f"   {cls:<25} n={len(hmargins):>4}  margin={mean_hm:>+6.2f} ± {se_hm:.2f} (t={t_hm:+.2f})"
        line += f"  | total={mean_tot:>+6.2f} ± {se_tot:.2f} (t={t_tot:+.2f})"
        print(line)
        wind_results[cls] = {
            'margin': {'n': len(hmargins), 'mean': round(mean_hm, 2), 'se': round(se_hm, 2), 't': round(t_hm, 2)},
            'total': {'n': len(totals), 'mean': round(mean_tot, 2), 'se': round(se_tot, 2), 't': round(t_tot, 2)}
        }
    
    print("\nWEATHER — home margin and total by precipitation (outdoor games only):")
    rain_results = {}
    for cls, (hmargins, totals) in rain_buckets.items():
        if len(hmargins) < 5:
            print(f"   {cls:<20} n={len(hmargins):>4} (too small)")
            continue
        mean_hm = statistics.mean(hmargins)
        stdev_hm = statistics.stdev(hmargins) if len(hmargins) > 1 else 0.0
        se_hm = stdev_hm / math.sqrt(len(hmargins))
        t_hm = mean_hm / se_hm if se_hm != 0 else 0.0
        mean_tot = statistics.mean(totals)
        stdev_tot = statistics.stdev(totals) if len(totals) > 1 else 0.0
        se_tot = stdev_tot / math.sqrt(len(totals))
        t_tot = mean_tot / se_tot if se_tot != 0 else 0.0
        line = f"   {cls:<20} n={len(hmargins):>4}  margin={mean_hm:>+6.2f} ± {se_hm:.2f} (t={t_hm:+.2f})"
        line += f"  | total={mean_tot:>+6.2f} ± {se_tot:.2f} (t={t_tot:+.2f})"
        print(line)
        rain_results[cls] = {
            'margin': {'n': len(hmargins), 'mean': round(mean_hm, 2), 'se': round(se_hm, 2), 't': round(t_hm, 2)},
            'total': {'n': len(totals), 'mean': round(mean_tot, 2), 'se': round(se_tot, 2), 't': round(t_tot, 2)}
        }
    
    print("\nWEATHER — home margin and total by temperature (outdoor games only):")
    cold_results = {}
    for cls, (hmargins, totals) in cold_buckets.items():
        if len(hmargins) < 5:
            print(f"   {cls:<20} n={len(hmargins):>4} (too small)")
            continue
        mean_hm = statistics.mean(hmargins)
        stdev_hm = statistics.stdev(hmargins) if len(hmargins) > 1 else 0.0
        se_hm = stdev_hm / math.sqrt(len(hmargins))
        t_hm = mean_hm / se_hm if se_hm != 0 else 0.0
        mean_tot = statistics.mean(totals)
        stdev_tot = statistics.stdev(totals) if len(totals) > 1 else 0.0
        se_tot = stdev_tot / math.sqrt(len(totals))
        t_tot = mean_tot / se_tot if se_tot != 0 else 0.0
        line = f"   {cls:<20} n={len(hmargins):>4}  margin={mean_hm:>+6.2f} ± {se_hm:.2f} (t={t_hm:+.2f})"
        line += f"  | total={mean_tot:>+6.2f} ± {se_tot:.2f} (t={t_tot:+.2f})"
        print(line)
        cold_results[cls] = {
            'margin': {'n': len(hmargins), 'mean': round(mean_hm, 2), 'se': round(se_hm, 2), 't': round(t_hm, 2)},
            'total': {'n': len(totals), 'mean': round(mean_tot, 2), 'se': round(se_tot, 2), 't': round(t_tot, 2)}
        }
    
    return {'wind': wind_results, 'rain': rain_results, 'cold': cold_results}

def main():
    print("[LOAD] Loading games...")
    games = load_games()
    print(f"  {len(games)} games loaded")
    
    print("\n=== REST ===")
    rest_results = rest_analysis(games)
    
    print("\n=== TRAVEL ===")
    travel_results = travel_analysis(games)
    
    print("\n=== WEATHER ===")
    weather_results = weather_analysis(games)
    
    # Generate report file
    report_path = os.path.join(HERE, "NFL_DEEP_CONTEXT_RESULTS.md")
    with open(report_path, 'w') as f:
        f.write("# NFL Deep Context Measurement Results\\n\\n")
        f.write("## REST — Home Margin by Home Team Rest Days\\n\\n")
        f.write("| Class | n | Mean Home Margin | SE | t-stat |\\n")
        f.write("|-------|---|------------------|----|--------|\\n")
        for cls, res in rest_results.items():
            f.write(f"| {cls} | {res['n']} | {res['mean']} | {res['se']} | {res['t']} |\\n")
        f.write("\\n*Note: Raw home margin measured (no closing lines available). A positive mean indicates home advantage in that rest class.\\n\\n")
        
        f.write("## TRAVEL — Home Margin by Distance\\n\\n")
        f.write("| Distance Bucket | n | Mean Home Margin | SE | t-stat |\\n")
        f.write("|-----------------|---|------------------|----|--------|\\n")
        for cls, res in travel_results['distance'].items():
            f.write(f"| {cls} | {res['n']} | {res['mean']} | {res['se']} | {res['t']} |\\n")
        f.write("\\n## TRAVEL — Home Margin by Cross-Timezone Games (2-3hr shift)\\n\\n")
        f.write("| Class | n | Mean Home Margin | SE | t-stat |\\n")
        f.write("|-------|---|------------------|----|--------|\\n")
        for cls, res in travel_results['timezone'].items():
            f.write(f"| {cls} | {res['n']} | {res['mean']} | {res['se']} | {res['t']} |\\n")
        f.write("\\n")
        
        f.write("## WEATHER — Home Margin and Total by Wind Speed (Outdoor Games Only)\\n\\n")
        f.write("| Wind Bucket | n | Mean Margin | SE Margin | t-stat Margin | Mean Total | SE Total | t-stat Total |\\n")
        f.write("|-------------|---|-------------|-----------|---------------|------------|----------|--------------|\\n")
        for cls, res in weather_results['wind'].items():
            m = res['margin']
            t = res['total']
            f.write(f"| {cls} | {m['n']} | {m['mean']} | {m['se']} | {m['t']} | {t['mean']} | {t['se']} | {t['t']} |\\n")
        f.write("\\n")
        
        f.write("## WEATHER — Home Margin and Total by Precipitation (Outdoor Games Only)\\n\\n")
        f.write("| Precipitation | n | Mean Margin | SE Margin | t-stat Margin | Mean Total | SE Total | t-stat Total |\\n")
        f.write("|---------------|---|-------------|-----------|---------------|------------|----------|--------------|\\n")
        for cls, res in weather_results['rain'].items():
            m = res['margin']
            t = res['total']
            f.write(f"| {cls} | {m['n']} | {m['mean']} | {m['se']} | {m['t']} | {t['mean']} | {t['se']} | {t['t']} |\\n")
        f.write("\\n")
        
        f.write("## WEATHER — Home Margin and Total by Temperature (Outdoor Games Only)\\n\\n")
        f.write("| Temperature | n | Mean Margin | SE Margin | t-stat Margin | Mean Total | SE Total | t-stat Total |\\n")
        f.write("|-------------|---|-------------|-----------|---------------|------------|----------|--------------|\\n")
        for cls, res in weather_results['cold'].items():
            m = res['margin']
            t = res['total']
            f.write(f"| {cls} | {m['n']} | {m['mean']} | {m['se']} | {m['t']} | {t['mean']} | {t['se']} | {t['t']} |\\n")
        f.write("\\n")
        
        f.write("## LIMITATIONS\\n\\n")
        f.write("1. No closing lines available in the dataset, so we measure raw home margin rather than residuals vs a market prior.\\n")
        f.write("2. Weather analysis uses home team city coordinates as a proxy for stadium coordinates, which may introduce error.\\n")
        f.write("3. Travel distance uses city-to-city distance, not stadium-to-stadium.\\n")
        f.write("4. Timezone change approximation is based on longitude difference only; does not account for time zone boundaries.\\n")
    
    print(f"\nReport written to {report_path}")

if __name__ == "__main__":
    main()
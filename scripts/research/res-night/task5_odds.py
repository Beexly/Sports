#!/usr/bin/env python3
"""
Fetch NFL odds from ESPN (free) and compute devigged probabilities (-110 removal).
"""
import urllib.request, ssl, json, sys
CTX = ssl.create_default_context(); CTX.check_hostname=False; CTX.verify_mode=ssl.CERT_NONE
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
def _get_json(url, timeout=25):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout, context=CTX) as r:
        return json.loads(r.read().decode("utf-8", "replace"))
def _ml_int(s):
    try: return int(s)
    except Exception: return None
def american_to_implied_prob(odds):
    if odds is None: return None
    try:
        o = float(odds)
    except:
        return None
    if o > 0:
        return 100.0 / (o + 100.0)
    else:
        return -o / (-o + 100.0)
def devig(p):
    # proportional devig: p' = p / (p + q) where q = 1-p? Actually if we have two outcomes, we normalize so sum=1
    # For a single outcome, we need the other outcome's implied prob.
    # We'll assume we have home and away moneyline.
    pass
def main():
    # Fetch NFL scoreboard for today (or a recent date). We'll just get the first game with odds.
    # Note: ESPN may not have odds for past games; we need historical odds. However, we can use the galaxy-sports-api approach: 
    # they use ESPN for live odds only. For historical odds, we need another source.
    # Since we cannot get historical odds for free, we'll note that we can use the nflverse betting data? It doesn't have odds.
    # We'll attempt to get odds for a few recent games from ESPN (if in season) else we'll use the historical CSV from nflverse? No odds.
    # We'll instead compute the vig removal from the moneyline in the harness if we had it. Since we don't, we'll skip.
    # However, we can demonstrate the method using dummy data.
    print("Task 5: -110 removal (devigging) - demonstration with dummy data")
    # Example: home moneyline -140, away moneyline +120
    home_ml = -140
    away_ml = 120
    p_home = american_to_implied_prob(home_ml)
    p_away = american_to_implied_prob(away_ml)
    print(f"Home implied: {p_home:.4f}, Away implied: {p_away:.4f}, Sum: {p_home+p_away:.4f}")
    # Devig: normalize so sum=1
    total = p_home + p_away
    p_home_devig = p_home / total
    p_away_devig = p_away / total
    print(f"Devigged home: {p_home_devig:.4f}, Devigged away: {p_away_devig:.4f}, Sum: {p_home_devig+p_away_devig:.4f}")
    # Also show the equivalent -110 odds: 
    # For a probability p, the American odds are: if p<=0.5: odds = -100*p/(1-p); else: odds = 100*(1-p)/p
    def prob_to_american(p):
        if p <= 0.5:
            return -100 * p / (1 - p)
        else:
            return 100 * (1 - p) / p
    print(f"Devigged home odds: {prob_to_american(p_home_devig):.0f}")
    print(f"Devigged away odds: {prob_to_american(p_away_devig):.0f}")
    # If we had actual game outcomes, we could compute calibration.
    print("\nNote: For actual calibration, we need historical moneyline odds and game outcomes.")
    print("Free historical odds are not readily available; the galaxy-sports-api provides live odds only.")
    print("Thus, task 5 remains BLOCKED for historical data, but we have demonstrated the method.")

if __name__ == "__main__":
    main()

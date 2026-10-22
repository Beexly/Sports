import psycopg2
from datetime import datetime

URL = "[REDACTED:db.url.with-password]/neondb?sslmode=require&channel_binding=require"
conn = psycopg2.connect(URL)
cur = conn.cursor()

# Find all settled games in `games`
cur.execute("""
    SELECT g.id, g."homeTeamName", g."awayTeamName", g."commenceTime", g.status,
           g."homeScore", g."awayScore", g."openingSpread",
           (SELECT avg(spread) FROM odds o WHERE o."gameId" = g.id AND o.market = 'SPREADS') as avg_spread
    FROM games g
    WHERE g."sportId" = 'cmpg6t7v900031heri45v3d8s'
      AND g."commenceTime" >= '2026-09-01'
      AND g."commenceTime" < '2026-10-17'
      AND g."mergedIntoGameId" IS NULL
      AND g."homeScore" IS NOT NULL
      AND g."awayScore" IS NOT NULL
    ORDER BY g."commenceTime" ASC;
""")
settled_games = cur.fetchall()
print(f"Total settled regular-season games to backfill: {len(settled_games)}")

# Simulate backfilling team_game_logs in memory
team_logs_sim = {}
for g in settled_games:
    gid, home, away, ctime, status, hscore, ascore, open_spd, avg_spd = g
    spread = open_spd if open_spd is not None else avg_spd
    
    # Home team
    home_won = hscore > ascore
    away_won = ascore > hscore
    home_margin = hscore - ascore
    
    if spread is not None:
        cover_margin = home_margin + spread
        if abs(cover_margin) < 0.5:
            home_ats = "PUSH"
            away_ats = "PUSH"
        elif cover_margin > 0:
            home_ats = "WIN"
            away_ats = "LOSS"
        else:
            home_ats = "LOSS"
            away_ats = "WIN"
    else:
        home_ats = "TBD"
        away_ats = "TBD"
        
    for t, opp, is_h, score, opp_score, res, ats, spd in [
        (home, away, True, hscore, ascore, "WIN" if home_won else "LOSS" if away_won else "TBD", home_ats, spread),
        (away, home, False, ascore, hscore, "WIN" if away_won else "LOSS" if home_won else "TBD", away_ats, -spread if spread is not None else None)
    ]:
        if t not in team_logs_sim:
            team_logs_sim[t] = []
        team_logs_sim[t].append({
            "gameId": gid,
            "opponent": opp,
            "isHome": is_h,
            "gameDate": ctime,
            "score": score,
            "oppScore": opp_score,
            "result": res,
            "atsResult": ats,
            "spread": spd
        })

print(f"\nDistinct teams in simulation: {len(team_logs_sim)}")
all_valid = True
for t in sorted(team_logs_sim.keys()):
    logs = team_logs_sim[t]
    max_d = max(l["gameDate"] for l in logs)
    count = len(logs)
    valid = count >= 4 and max_d >= datetime(2026, 10, 4)
    if not valid:
        all_valid = False
    print(f"  {t:<30} | games: {count} | maxDate: {str(max_d)[:10]} | valid: {valid}")

print(f"\nAll 32 teams meet criteria (count >= 4 and maxDate >= 2026-10-04): {all_valid}")

# Check the 4 target teams specifically
print("\n--- Specifically checking the 4 target teams ---")
for t in ["Kansas City Chiefs", "Carolina Panthers", "Tampa Bay Buccaneers", "Dallas Cowboys"]:
    logs = team_logs_sim.get(t, [])
    print(f"\nTeam: {t} ({len(logs)} games):")
    for l in logs:
        print(f"  {l['gameDate']} vs {l['opponent']} (home={l['isHome']}): {l['score']}-{l['oppScore']} ({l['result']}) | spread={l['spread']} | ats={l['atsResult']}")

cur.close()
conn.close()

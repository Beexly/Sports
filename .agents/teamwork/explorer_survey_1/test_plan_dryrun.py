import psycopg2
import json
from datetime import datetime, timedelta

URL = "[REDACTED:db.url.with-password]/neondb?sslmode=require&channel_binding=require"
conn = psycopg2.connect(URL)
# Crucial: autocommit = False so we can test everything in a transaction and ROLLBACK!
conn.autocommit = False
cur = conn.cursor()

try:
    print("=== START DRY RUN TRANSACTION ===")

    # 1. Backfill team_game_logs from games
    cur.execute("""
        SELECT g.id, g."homeTeamName", g."awayTeamName", g."commenceTime",
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
    settled = cur.fetchall()
    print(f"1. Settled games found: {len(settled)}")

    inserted_logs = 0
    for row in settled:
        gid, home, away, ctime, hscore, ascore, open_spd, avg_spd = row
        spread = open_spd if open_spd is not None else avg_spd
        
        home_won = hscore > ascore
        away_won = ascore > hscore
        margin = hscore - ascore
        
        if spread is not None:
            cover = margin + spread
            if abs(cover) < 0.5:
                h_ats, a_ats = "PUSH", "PUSH"
            elif cover > 0:
                h_ats, a_ats = "WIN", "LOSS"
            else:
                h_ats, a_ats = "LOSS", "WIN"
        else:
            h_ats, a_ats = "TBD", "TBD"

        # Home team log
        cur.execute("""
            INSERT INTO team_game_logs (
                id, "teamName", sport, "gameId", "opponentName", "isHome", "gameDate",
                "teamScore", "opponentScore", result, spread, "atsResult", "createdAt", "isBootstrap"
            ) VALUES (
                'c' || md5(%s || %s), %s, 'americanfootball_nfl', %s, %s, true, %s,
                %s, %s, %s, %s, %s, NOW(), false
            )
            ON CONFLICT ("gameId", "teamName") DO UPDATE SET
                "teamScore" = EXCLUDED."teamScore",
                "opponentScore" = EXCLUDED."opponentScore",
                result = EXCLUDED.result,
                spread = EXCLUDED.spread,
                "atsResult" = EXCLUDED."atsResult";
        """, (gid, home, home, gid, away, ctime, hscore, ascore,
              "WIN" if home_won else "LOSS" if away_won else "TBD",
              spread, h_ats))
        inserted_logs += 1

        # Away team log
        cur.execute("""
            INSERT INTO team_game_logs (
                id, "teamName", sport, "gameId", "opponentName", "isHome", "gameDate",
                "teamScore", "opponentScore", result, spread, "atsResult", "createdAt", "isBootstrap"
            ) VALUES (
                'c' || md5(%s || %s), %s, 'americanfootball_nfl', %s, %s, false, %s,
                %s, %s, %s, %s, %s, NOW(), false
            )
            ON CONFLICT ("gameId", "teamName") DO UPDATE SET
                "teamScore" = EXCLUDED."teamScore",
                "opponentScore" = EXCLUDED."opponentScore",
                result = EXCLUDED.result,
                spread = EXCLUDED.spread,
                "atsResult" = EXCLUDED."atsResult";
        """, (gid, away, away, gid, home, ctime, ascore, hscore,
              "WIN" if away_won else "LOSS" if home_won else "TBD",
              -spread if spread is not None else None, a_ats))
        inserted_logs += 1

    print(f"2. Total logs upserted in dry run: {inserted_logs}")

    # Verify team_game_logs in transaction
    cur.execute("""
        SELECT count(DISTINCT "teamName"),
               min(cnt),
               min(max_d)
        FROM (
            SELECT "teamName", count(*) as cnt, max("gameDate") as max_d
            FROM team_game_logs
            WHERE sport = 'americanfootball_nfl' AND "gameDate" >= '2026-09-01'
            GROUP BY "teamName"
        ) sub;
    """)
    tgl_verif = cur.fetchone()
    print(f"3. Verification of team_game_logs in TX: Distinct Teams = {tgl_verif[0]}, Min Games = {tgl_verif[1]}, Min MaxDate = {tgl_verif[2]}")
    assert tgl_verif[0] == 32, f"Expected 32 teams, got {tgl_verif[0]}"
    assert tgl_verif[1] >= 4, f"Expected min games >= 4, got {tgl_verif[1]}"
    assert str(tgl_verif[2]) >= '2026-10-04', f"Expected maxDate >= 2026-10-04, got {tgl_verif[2]}"

    # Specifically verify the 4 target teams
    cur.execute("""
        SELECT "teamName", count(*), max("gameDate")
        FROM team_game_logs
        WHERE "teamName" IN ('Kansas City Chiefs', 'Carolina Panthers', 'Tampa Bay Buccaneers', 'Dallas Cowboys')
          AND "gameDate" >= '2026-09-01'
        GROUP BY "teamName";
    """)
    print("4. Target 4 teams in TX:")
    for r in cur.fetchall():
        print(f"   {r[0]}: count={r[1]}, maxDate={r[2]}")

    # 2. Recalculate and lock rest days for the 14 Week 6 games
    cur.execute("""
        SELECT g.id, g."homeTeamName", g."awayTeamName", g."commenceTime"
        FROM games g
        WHERE g."sportId" = 'cmpg6t7v900031heri45v3d8s'
          AND g."commenceTime" >= '2026-10-15'
          AND g."commenceTime" < '2026-10-21'
          AND g."mergedIntoGameId" IS NULL
        ORDER BY g."commenceTime" ASC;
    """)
    w6_games = cur.fetchall()
    
    updated_games = 0
    for gid, home, away, ctime in w6_games:
        cutoff = ctime - timedelta(hours=18)
        
        # Calculate from newly backfilled team_game_logs
        cur.execute("""
            SELECT max("gameDate")
            FROM team_game_logs
            WHERE "teamName" = %s AND sport = 'americanfootball_nfl' AND "gameDate" < %s;
        """, (home, cutoff))
        home_prior = cur.fetchone()[0]
        home_rest = (ctime - home_prior).days if home_prior else None

        cur.execute("""
            SELECT max("gameDate")
            FROM team_game_logs
            WHERE "teamName" = %s AND sport = 'americanfootball_nfl' AND "gameDate" < %s;
        """, (away, cutoff))
        away_prior = cur.fetchone()[0]
        away_rest = (ctime - away_prior).days if away_prior else None

        cur.execute("""
            UPDATE games
            SET "restDaysHome" = %s,
                "restDaysAway" = %s,
                "isBackToBackHome" = false,
                "isBackToBackAway" = false,
                "contextComputedAt" = NOW()
            WHERE id = %s;
        """, (home_rest, away_rest, gid))
        updated_games += 1

    print(f"5. Week 6 games rest days updated: {updated_games}")

    # Verify all 14 games have restDaysHome <= 14 and restDaysAway <= 14
    cur.execute("""
        SELECT count(*), max("restDaysHome"), max("restDaysAway"), min("restDaysHome"), min("restDaysAway")
        FROM games
        WHERE "sportId" = 'cmpg6t7v900031heri45v3d8s'
          AND "commenceTime" >= '2026-10-15'
          AND "commenceTime" < '2026-10-21'
          AND "mergedIntoGameId" IS NULL;
    """)
    w6_rest_stats = cur.fetchone()
    print(f"6. Week 6 Rest Stats in TX: count={w6_rest_stats[0]}, maxHomeRest={w6_rest_stats[1]}, maxAwayRest={w6_rest_stats[2]}, minHomeRest={w6_rest_stats[3]}, minAwayRest={w6_rest_stats[4]}")
    assert w6_rest_stats[1] <= 14, f"maxHomeRest {w6_rest_stats[1]} > 14"
    assert w6_rest_stats[2] <= 14, f"maxAwayRest {w6_rest_stats[2]} > 14"

    print("=== DRY RUN TEST PASSED 100% CLEANLY ===")

finally:
    # ALWAYS ROLLBACK to preserve read-only exploration!
    conn.rollback()
    print("=== TRANSACTION ROLLED BACK (DATABASE UNTOUCHED) ===")
    cur.close()
    conn.close()

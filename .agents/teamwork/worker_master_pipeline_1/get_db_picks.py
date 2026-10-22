import os
import psycopg2
import json
from pathlib import Path
from dotenv import load_dotenv

repo = Path(r"c:\Users\Garrett\Sports")
load_dotenv(repo / ".env.production.local")
db_url = os.environ.get("DATABASE_URL")
if not db_url:
    load_dotenv(repo / ".env.local")
    db_url = os.environ.get("DATABASE_URL")

conn = psycopg2.connect(db_url)
cur = conn.cursor()
cur.execute("""
    SELECT p.id, g."awayTeamName" || ' @ ' || g."homeTeamName" as matchup,
           p."pickType", p.selection, p.line, p.confidence, p."edgeScore",
           p.reasoning,
           p."factorBreakdown"->'independentEdge'->>'decision' as edge_dec
    FROM picks p
    JOIN games g ON p."gameId" = g.id
    WHERE g."sportId" = 'cmpg6t7v900031heri45v3d8s'
      AND g."commenceTime" >= '2026-10-15'
      AND g."commenceTime" < '2026-10-21'
      AND p."isPublished" = true
      AND p.result = 'PENDING'
    ORDER BY g."commenceTime" ASC, p."edgeScore" DESC;
""")
rows = cur.fetchall()
print(f"Total published PENDING NFL picks: {len(rows)}")
picks = []
for r in rows:
    picks.append({
        "id": r[0],
        "matchup": r[1],
        "pick_type": r[2],
        "selection": r[3],
        "line": r[4],
        "confidence": r[5],
        "edge_score": r[6],
        "reasoning": r[7],
        "decision": r[8],
    })
    print(f"  {r[1]}: {r[2]} {r[3]} (line {r[4]}) | edge={r[6]}, conf={r[5]}")
conn.close()

out_file = repo / ".agents/teamwork/worker_master_pipeline_1/db_picks.json"
out_file.write_text(json.dumps(picks, indent=2), encoding="utf-8")
print(f"Wrote {len(picks)} picks to {out_file}")

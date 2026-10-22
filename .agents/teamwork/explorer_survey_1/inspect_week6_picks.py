import psycopg2
import json

URL = "[REDACTED:db.url.with-password]/neondb?sslmode=require&channel_binding=require"
conn = psycopg2.connect(URL)
cur = conn.cursor()

# Get all published picks for Week 6 NFL games
# Week 6 games commence between 2026-10-15 and 2026-10-21
cur.execute("""
    SELECT p.id, p."gameId", p."pickType", p.selection, p.line, p.confidence, p."edgeScore",
           p."isPublished", p.result, p.tier, p.reasoning, p."factorBreakdown",
           g."homeTeamName", g."awayTeamName", g."commenceTime", g."restDaysHome", g."restDaysAway"
    FROM picks p
    JOIN games g ON p."gameId" = g.id
    WHERE g."sportId" = 'cmpg6t7v900031heri45v3d8s'
      AND g."commenceTime" >= '2026-10-15'
      AND g."commenceTime" < '2026-10-21'
      AND g."mergedIntoGameId" IS NULL
      AND p."isPublished" = true
    ORDER BY g."commenceTime" ASC, p.id ASC;
""")
published_picks = cur.fetchall()
print(f"Total published Week 6 NFL picks: {len(published_picks)}")

for p in published_picks:
    pid, gid, ptype, sel, line, conf, edge, is_pub, res, tier, reasoning, fb, home, away, ctime, r_home, r_away = p
    print(f"\n==================== Pick: {pid} ====================")
    print(f"Game: {away} @ {home} ({ctime}) | GameId: {gid}")
    print(f"Rest: Home={r_home}, Away={r_away}")
    print(f"Pick: {ptype} on {sel} (Line: {line}) | Conf: {conf} | EdgeScore: {edge} | Result: {res} | Tier: {tier}")
    
    # Inspect factorBreakdown
    fb_obj = fb if isinstance(fb, dict) else json.loads(fb) if fb else {}
    print("factorBreakdown top keys:", list(fb_obj.keys()))
    
    # Check PASS or negative edge
    ind_edge = fb_obj.get("independentEdge", {})
    print(f"independentEdge: {ind_edge}")
    decision = ind_edge.get("decision") if isinstance(ind_edge, dict) else None
    raw_edge = ind_edge.get("rawEdge") if isinstance(ind_edge, dict) else None
    exp_clv = fb_obj.get("expectedClv")
    print(f"decision={decision}, rawEdge={raw_edge}, expectedClv={exp_clv}")
    
    # Check injuryEvidence
    injury = fb_obj.get("injuryEvidence")
    print(f"injuryEvidence present: {injury is not None}")
    if injury:
        print(f"  injuryEvidence sample: {str(injury)[:100]}")
        
    # Check continuityDeltas
    cont = fb_obj.get("continuityDeltas")
    print(f"continuityDeltas present: {cont is not None}")
    if cont:
        print(f"  continuityDeltas sample: {str(cont)[:100]}")
        
    # Check reasoning
    print(f"Reasoning length: {len(reasoning) if reasoning else 0} chars")
    if reasoning:
        print(f"  Reasoning sample: {reasoning[:120]}...")
        
    # Check noBet
    no_bet = fb_obj.get("noBet")
    print(f"noBet: {no_bet}")

cur.close()
conn.close()

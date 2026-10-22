import json
from pathlib import Path

path = Path(r"c:\Users\Garrett\Sports\intelligence\reasoning_engine\traces\slate-board-w6-2026-10-18.json")
data = json.loads(path.read_text(encoding="utf-8"))

target_matchups = ["NO-NYG", "TEN-IND", "PIT-TB", "DAL-GB", "BAL-CLE"]

for g in data.get("games", []):
    gid = g.get("game_id", "")
    if any(m in gid for m in target_matchups):
        print(f"\n==================== Game: {gid} ====================")
        ac = g.get("analyst_card", {})
        print("Analyst Card Thesis:", ac.get("thesis"))
        print("Analyst Card Conviction:", ac.get("conviction"))
        print("Analyst Card Path:", ac.get("path"))
        
        rb = g.get("ranked_board", {})
        print("Ranked Board Candidates:")
        for c in rb.get("candidates", []):
            print(f"  Play: {c.get('play')} | Rank: {c.get('rank')} | Conviction: {c.get('conviction')} | Status: {c.get('status')} | Dir: {c.get('has_directional_claim')}")
            if "posterior_home" in c:
                print(f"    Home Posterior: {c.get('posterior_home')} vs Prior: {c.get('prior_home')}")
                print(f"    Away Posterior: {c.get('posterior_away')} vs Prior: {c.get('prior_away')}")

        print("Breaking conditions count:", len(rb.get("breaking_conditions", [])))
        for bc in rb.get("breaking_conditions", [])[:3]:
            print(f"  BC: {bc.get('text')}")

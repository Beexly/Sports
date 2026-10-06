"""Airwave ledger for week 3.

The edge uses questionable and doubtful skill players from the AP wire.
Known outs stay in the availability family and are not counted again.
Beat posts that repeat the wire are corroboration, worth zero extra points.
SiriusXM audio is not captured. Reddit, Instagram, FantasyPros, and Dimers
were attempted and did not yield a claim.
"""
import json
from pathlib import Path

ROOT = Path("/tmp/Sports")
OUT = ROOT / "data" / "gse-dataset" / "current" / "airwave-week3.jsonl"
EDGES = ROOT / "data" / "gse-dataset" / "current" / "airwave-edges.jsonl"
REPORT = ROOT / "docs" / "reasoning" / "airwave-week3.md"
AP = "https://apnews.com/article/dadrion-taylor-demerson-dallas-goedert-athlete-injuries-464065c8115a0a918bd58543962e373d"

# Skill and quarterback only. Status is the designation. Outlook is empty
# unless a second source colored it. Points are badness for that team.
CLAIMS = [
    ("LAC", "Trey Lance", "QB", "QUESTIONABLE", "", 0.25),
    ("BUF", "Keon Coleman", "WR", "QUESTIONABLE", "uncertain", 0.25),
    ("BUF", "D.J. Moore", "WR", "QUESTIONABLE", "uncertain", 0.25),
    ("CAR", "Jalen Coker", "WR", "QUESTIONABLE", "optimistic", 0.15),
    ("CAR", "Xavier Legette", "WR", "QUESTIONABLE", "uncertain", 0.25),
    ("NYJ", "Adonai Mitchell", "WR", "QUESTIONABLE", "uncertain", 0.25),
    ("NYJ", "Kene Nwangwu", "RB", "DOUBTFUL", "", 0.55),
    ("TEN", "Tyjae Spears", "RB", "QUESTIONABLE", "uncertain", 0.25),
    ("PIT", "Jaylen Warren", "RB", "QUESTIONABLE", "optimistic", 0.15),
    ("PIT", "Michael Pittman Jr.", "WR", "QUESTIONABLE", "uncertain", 0.25),
    ("SF", "Mike Evans", "WR", "QUESTIONABLE", "optimistic", 0.15),
    ("BAL", "Zay Flowers", "WR", "QUESTIONABLE", "pessimistic", 0.40),
    ("LV", "Brock Bowers", "TE", "QUESTIONABLE", "optimistic", 0.15),
    ("LV", "Aidan O'Connell", "QB", "QUESTIONABLE", "uncertain", 0.25),
    ("LA", "Puka Nacua", "WR", "DOUBTFUL", "pessimistic", 0.70),
    ("LA", "Colby Parkinson", "TE", "QUESTIONABLE", "optimistic", 0.15),
    ("DEN", "Marvin Mims Jr.", "WR", "QUESTIONABLE", "optimistic", 0.15),
    ("CHI", "Tyson Bagent", "QB", "QUESTIONABLE", "", 0.25),
    ("MIA", "Jaylen Wright", "RB", "DOUBTFUL", "pessimistic", 0.70),
    ("MIA", "Ryan Miller", "WR", "QUESTIONABLE", "uncertain", 0.25),
]

CORROBORATION = [
    ("SF", "Demarcus Robinson on IR", "Aaron Wilson", "2103954663297229205"),
    ("SF", "Nick Bosa injury, defensive workouts", "Aaron Wilson", "2103954858411712560"),
    ("CAR", "Claudin Cherelus on IR", "Aaron Wilson", "2103954610826203188"),
    ("DEN", "Jonah Coleman on IR", "Aaron Wilson", "2103953029372186757"),
    ("MIN", "Nick Samac on IR, Johnny Hekker signed", "Aaron Wilson", "2103947115353481442"),
]

LANES = [
    ("ap_injury_wire", "live", "Skill questionable and doubtful statuses. Source of the points."),
    ("x_beat", "live_corroboration", "Aaron Wilson posts from 2026-09-26. They confirm the wire. They do not add a second penalty."),
    ("espn_975_houston", "checked_no_claim", "John Granato's ESPN 97.5 account had no team fact in this window."),
    ("sportsradio_610", "checked_no_claim", "610 AM lane is registered. No host post cleared the fact bar in this pull."),
    ("sportstalk_790", "registered", "790 AM is a source. No item was fetched tonight."),
    ("siriusxm", "schedule_only", "Home and away channels are listed for the games the public schedule showed. Audio stays behind the legal acknowledgement. Nothing was recorded."),
    ("reddit", "fetch_failed", "r/fantasyfootball returned 403."),
    ("instagram", "no_api", "No Instagram token. The lane is named and empty."),
    ("cbs", "feed_reachable_no_claim", "The NFL RSS responded. Item titles did not parse into injury claims."),
    ("fantasypros", "fetch_failed", "The news feed URL returned 404."),
    ("dimers", "shell_no_claim", "The NFL page returned a script shell, not a claim."),
]

SIRIUS_CHANNELS = [
    ("LAC", "away", "264"),
    ("BUF", "home", "195"),
    ("CIN", "away", "268"),
    ("PIT", "home", "199"),
    ("TEN", "away", "267"),
    ("NYG", "home", "198"),
    ("HOU", "away", "263"),
    ("IND", "home", "194"),
    ("CAR", "away", "261"),
    ("CLE", "home", "192"),
    ("NYJ", "away", "262"),
]


def clip(value):
    if value > 1:
        return 1.0
    if value < -1:
        return -1.0
    return value


def main():
    badness = {}
    rows = []
    for team, player, pos, status, outlook, points in CLAIMS:
        badness[team] = badness.get(team, 0.0) + points
        rows.append({
            "kind": "claim",
            "team": team,
            "player": player,
            "position": pos,
            "status": status,
            "outlook": outlook,
            "badness": points,
            "source": "AP injury report",
            "source_url": AP,
            "as_of": "2026-09-26",
        })
    for team, fact, author, post_id in CORROBORATION:
        rows.append({
            "kind": "corroboration",
            "team": team,
            "fact": fact,
            "author": author,
            "post_id": post_id,
            "badness": 0,
            "source": "X",
        })
    for lane, state, note in LANES:
        rows.append({"kind": "lane", "lane": lane, "state": state, "note": note})
    for team, side, channel in SIRIUS_CHANNELS:
        rows.append({
            "kind": "siriusxm_channel",
            "team": team,
            "side": side,
            "channel": channel,
            "audio_captured": False,
        })

    games = []
    for line in (ROOT / "data" / "gse-dataset" / "games.jsonl").read_text().splitlines():
        if not line.strip():
            continue
        game = json.loads(line)
        if game["season"] == 2026 and game["week"] == 3 and game["settled"] is not True:
            away = badness.get(game["away_team"], 0.0)
            home = badness.get(game["home_team"], 0.0)
            signed = clip((away - home) / 1.2)
            games.append({
                "game_id": game["game_id"],
                "away_team": game["away_team"],
                "home_team": game["home_team"],
                "away_badness": round(away, 3),
                "home_badness": round(home, 3),
                "airwave_signed": round(signed, 4),
            })

    OUT.write_text("".join(json.dumps(row) + "\n" for row in rows))
    EDGES.write_text("".join(json.dumps(row) + "\n" for row in games))
    lines = [
        "# Airwave, week 3",
        "",
        "Airwave is the wire, the beat, and the station. It is not a founder podcast. The points are questionable and doubtful skill players. Outs already sit in availability, so they are not added again. The weight is a prior of 0.05. It has not been calibrated on a settled week yet.",
        "",
        "| game | away badness | home badness | airwave edge |",
        "|---|---:|---:|---:|",
    ]
    for game in games:
        lines.append(
            f"| {game['away_team']} at {game['home_team']} | {game['away_badness']:.2f} | {game['home_badness']:.2f} | {game['airwave_signed']:+.3f} |"
        )
    lines.extend(["", "## Lanes", "", "| lane | state |", "|---|---|"])
    for lane, state, _note in LANES:
        lines.append(f"| {lane} | {state} |")
    lines.append("")
    lines.append("SiriusXM audio was not captured. The channels above are schedule only, and only for the games the public schedule page actually listed.")
    lines.append("")
    REPORT.write_text("\n".join(lines))
    print(json.dumps({"claims": len(CLAIMS), "games": len(games), "sample": games}, indent=2)[:1500])


if __name__ == "__main__":
    main()

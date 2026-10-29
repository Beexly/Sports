#!/usr/bin/env python3
"""
Builds the Official New Engine W-L-P & Units Ledger (16-5, 76.2%, +10.45u)
and writes the complete 360-degree CAR @ GB Master Bet Card & Market Review.
"""
import json
from pathlib import Path

REPO = Path(r"C:\Users\Garrett\Sports")
EVAL_JSON = REPO / "data" / "engine" / "car_gb_360_full_market_evaluation_2026_10_29.json"
LEDGER_JSON = REPO / "data" / "engine" / "new_engine_official_ledger_2026.json"
LEDGER_MD = REPO / "docs" / "predictions" / "research" / "2026-10-29" / "NEW-ENGINE-OFFICIAL-LEDGER-16-5.md"
MASTER_MD = REPO / "docs" / "predictions" / "research" / "2026-10-29" / "COMPLETE-BET-CARD-AND-CONTENT-CREATION-SUITE-2026-10-29.md"


def main():
    eval_data = json.loads(EVAL_JSON.read_text(encoding="utf-8"))
    markets = eval_data["ou_and_spread_markets"]
    td_markets = eval_data["td_scorer_markets"]

    ledger = {
        "engine_version": "GSE v5.3.0 / 5-Stage JEV 10k-World Snap-by-Snap Engine",
        "as_of": "2026-10-29T18:18:00-05:00",
        "verified_record": {
            "wins": 16,
            "losses": 5,
            "pushes": 0,
            "total_graded": 21,
            "win_pct": 76.19,
            "net_units": "+10.45u",
            "roi_pct": "+49.76%",
            "display_banner": "16-5 (76.2%) · +10.45 UNITS WITH THE NEW ENGINE",
        },
        "tonight_pending_card_car_at_gb": [
            {"id": "CAR-GB-01", "category": "Game Line", "pick": "Green Bay Packers -3.5 (-112)", "units": 1.0, "rating": "61/100", "edge": "+8.62c", "status": "PENDING"},
            {"id": "CAR-GB-02", "category": "Game Line", "pick": "CAR @ GB UNDER 46.5 (+102)", "units": 1.0, "rating": "58/100", "edge": "+5.62c", "status": "PENDING"},
            {"id": "CAR-GB-03", "category": "1H Derivative", "pick": "Green Bay Packers 1H -2.5 (-110)", "units": 1.0, "rating": "65/100", "edge": "+13.40c", "status": "PENDING"},
            {"id": "CAR-GB-04", "category": "1H Team Total", "pick": "Carolina Panthers 1H Team Total UNDER 10.5 (-115)", "units": 1.0, "rating": "66/100", "edge": "+13.66c", "status": "PENDING"},
            {"id": "CAR-GB-05", "category": "1Q Prop (Flagship)", "pick": "Tucker Kraft OVER 6.5 1st Quarter Receiving Yards (-114)", "units": 1.0, "rating": "68/100", "edge": "+15.20c", "status": "PENDING"},
            {"id": "CAR-GB-06", "category": "Skill Prop", "pick": "Chuba Hubbard OVER 15.5 / 16.5 Receiving Yards (-110)", "units": 1.0, "rating": "66/100", "edge": "+13.62c", "status": "PENDING"},
            {"id": "CAR-GB-07", "category": "Skill Prop", "pick": "Josh Jacobs OVER 17.5 / 18.5 Receiving Yards (-110)", "units": 1.0, "rating": "66/100", "edge": "+13.35c", "status": "PENDING"},
            {"id": "CAR-GB-08", "category": "QB Prop", "pick": "Bryce Young UNDER 253.5 Passing Yards (-110)", "units": 1.0, "rating": "66/100", "edge": "+13.41c", "status": "PENDING"},
            {"id": "CAR-GB-09", "category": "QB Turnover Prop", "pick": "Bryce Young OVER 0.5 Interceptions (-125)", "units": 1.0, "rating": "63/100", "edge": "+8.50c", "status": "PENDING"},
            {"id": "CAR-GB-10", "category": "QB Volume Prop", "pick": "Jordan Love UNDER 35.5 Passing Attempts (-110)", "units": 1.0, "rating": "69/100", "edge": "+16.80c", "status": "PENDING"},
            {"id": "CAR-GB-11", "category": "Skill Prop", "pick": "Christian Watson OVER 70.5 / 71.5 Receiving Yards (-110)", "units": 1.0, "rating": "63/100", "edge": "+11.10c", "status": "PENDING"},
            {"id": "CAR-GB-12", "category": "Skill Prop", "pick": "Tetairoa McMillan UNDER 72.5 Receiving Yards (-110)", "units": 1.0, "rating": "65/100", "edge": "+12.74c", "status": "PENDING"},
            {"id": "CAR-GB-13", "category": "Skill Prop", "pick": "Chuba Hubbard OVER 67.5 Rushing Yards (-110)", "units": 1.0, "rating": "63/100", "edge": "+10.35c", "status": "PENDING"},
            {"id": "CAR-GB-14", "category": "Skill Prop", "pick": "Tucker Kraft OVER 44.5 Receiving Yards (-110)", "units": 1.0, "rating": "62/100", "edge": "+9.75c", "status": "PENDING"},
            {"id": "CAR-GB-15", "category": "Skill Prop", "pick": "Josh Jacobs OVER 60.5 / 61.5 Rushing Yards (-110)", "units": 1.0, "rating": "61/100", "edge": "+8.97c", "status": "PENDING"},
            {"id": "CAR-GB-16", "category": "Kicking Prop", "pick": "Ryan Fitzgerald (CAR PK) OVER 1.5 Field Goals Made (-105)", "units": 0.75, "rating": "64/100", "edge": "+12.10c", "status": "PENDING"},
            {"id": "CAR-GB-17", "category": "Kicking Prop", "pick": "Trey Smack (GB PK) OVER 1.5 Field Goals Made (-110) / OVER 7.5 Kicking Pts (-110)", "units": 0.75, "rating": "61/100", "edge": "+8.85c", "status": "PENDING"},
            {"id": "CAR-GB-18", "category": "IDP / Defense Prop", "pick": "Bobby Okereke (CAR LB) OVER 6.5 Tackles + Assists (-115)", "units": 0.75, "rating": "66/100", "edge": "+13.16c", "status": "PENDING"},
            {"id": "CAR-GB-19", "category": "IDP / Defense Prop", "pick": "Lukas Van Ness (GB DE) OVER 0.25 Sacks (-115)", "units": 0.75, "rating": "62/100", "edge": "+9.53c", "status": "PENDING"},
            {"id": "CAR-GB-20", "category": "IDP / Defense Prop", "pick": "Keisean Nixon (GB CB) OVER 4.5 Tackles + Assists (-110)", "units": 0.5, "rating": "61/100", "edge": "+9.87c", "status": "PENDING"},
            {"id": "CAR-GB-21", "category": "Anytime TD", "pick": "Tucker Kraft Anytime TD (+185) / Christian Watson Anytime TD (+155)", "units": 0.5, "rating": "64/100", "edge": "+4.75c", "status": "PENDING"},
        ]
    }
    LEDGER_JSON.write_text(json.dumps(ledger, indent=2), encoding="utf-8")

    # Write NEW-ENGINE-OFFICIAL-LEDGER-16-5.md
    ledger_md_lines = [
        "# OFFICIAL NEW ENGINE VERIFIED LEDGER (`16-5` · `76.2%` · `+10.45u`)",
        "",
        "> **STANDING RECORD RULE (Garrett — HARD):** We track only the **New Engine** record: **`16-5 (76.2%) · +10.45 Units (+49.8% ROI)`** entering Tonight's `Carolina Panthers @ Green Bay Packers` game (`Thu Oct 29, 2026 · 8:15 PM ET`).",
        "",
        "| Metric | Official Verified Value |",
        "| :--- | :--- |",
        "| **Wins – Losses – Pushes** | **`16 - 5 - 0`** |",
        "| **Win Percentage** | **`76.2%` (`16 / 21`)** |",
        "| **Net Units Won** | **`+10.45 Units`** |",
        "| **Return on Investment (ROI)** | **`+49.8%`** |",
        "| **Active Pending Slate (`CAR @ GB`)** | **21 Official Tracked Plays (Graded Post-Game Tonight)** |",
        "",
        "## Tonight's Official Tracked Card (`CAR @ GB` — Thu Oct 29, 2026)",
        "",
        "| ID | Category | Official Tracked Pick | Units | Rating | Edge / CLV | Status |",
        "| :--- | :--- | :--- | :---: | :---: | :---: | :---: |",
    ]
    for item in ledger["tonight_pending_card_car_at_gb"]:
        ledger_md_lines.append(
            f"| `{item['id']}` | {item['category']} | **{item['pick']}** | `{item['units']:.2f}u` | **`{item['rating']}`** | `{item['edge']}` | `{item['status']}` |"
        )
    LEDGER_MD.write_text("\n".join(ledger_md_lines) + "\n", encoding="utf-8")

    by_cat = {}
    for m in markets:
        by_cat.setdefault(m["category"], []).append(m)

    sec_lines = [
        "\n---\n",
        "\n".join(ledger_md_lines),
        "\n---\n",
        "## COMPLETE 360-DEGREE BOARD REVIEW — ALL 85 MARKETS (`1Q–4Q`, `1H/2H`, `KICKING`, `DEFENSE/IDP`, `INTs`, `TDs`, `PROPS`)\n",
    ]
    for cat, rows in by_cat.items():
        sec_lines.append(f"### {cat}\n")
        sec_lines.append("| Subject | Market | Live DK Line (Open) | 10k-Sim Mean | Official Call | Rating | Edge / CLV | Tactical & Film Rationale |")
        sec_lines.append("| :--- | :--- | :--- | :---: | :--- | :---: | :---: | :--- |")
        for r in rows:
            sec_lines.append(
                f"| **{r['subject']}** | {r['market']} | `{r['line']}` (`{r['open_line']}`) | `{r['sim_mean']}` | **{r['official_call']}** | **`{r['rating']}`** | `{r['edge_cents']}` | {r['rationale']} |"
            )
        sec_lines.append("")

    sec_lines.append("### 8. Touchdown Scorer Props (`Anytime TD`, `1Q TD`, `D/ST TD`)\n")
    sec_lines.append("| Player / Unit | Market | Live DK Odds | 10k-Sim Prob | Fair Odds | Official Call | Rating | Edge / CLV | Rationale |")
    sec_lines.append("| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |")
    for t in td_markets:
        sec_lines.append(
            f"| **{t['player']}** | {t['market']} | `{t['live_dk_odds']}` | `{t['sim_prob_pct']}%` | `{t['fair_odds']}` | **{t['decision']}** | **`{t['rating']}`** | `{t['edge_cents']}` | {t['rationale']} |"
        )

    cur_text = MASTER_MD.read_text(encoding="utf-8")
    if "# OFFICIAL NEW ENGINE VERIFIED LEDGER" in cur_text:
        cur_text = cur_text.split("# OFFICIAL NEW ENGINE VERIFIED LEDGER")[0]
    MASTER_MD.write_text(cur_text + "\n".join(sec_lines) + "\n", encoding="utf-8")
    print(f"Saved Official 16-5 Ledger to {LEDGER_JSON}, {LEDGER_MD}, and updated {MASTER_MD}")


if __name__ == "__main__":
    main()

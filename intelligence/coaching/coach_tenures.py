"""
Verified coach tenures 2022-2026 (web-verified 2026-10-01).
Maps playcaller/DC -> (team, seasons) for joining tendency data.
Playcalling notes flagged where the HC delegates or shares duties.
"""
import pandas as pd

# (coach, role, team, seasons, playcalling_note)
OFFENSE = [
    ("Todd Monken", "OC", "BAL", [2023, 2024, 2025], "playcaller"),
    ("Todd Monken", "HC", "CLE", [2026], "first HC job; presumed playcaller (offensive HC)"),
    ("Mike McCarthy", "HC", "DAL", [2023, 2024], "playcaller (took over 2023; 2022 was Kellen Moore)"),
    ("Mike McCarthy", "HC", "PIT", [2026], "presumed playcaller; kept some Arthur Smith system/terminology"),
    ("Kyle Shanahan", "HC", "SF", [2022, 2023, 2024, 2025, 2026], "playcaller"),
    ("Sean McVay", "HC", "LAR", [2022, 2023, 2024, 2025, 2026], "playcaller"),
    # reference rows for context (not primary targets)
    ("Kellen Moore", "OC", "DAL", [2022], "playcaller"),
    ("Kevin Stefanski", "HC", "CLE", [2022, 2023, 2024, 2025], "playcaller (fired after 2025)"),
    ("Arthur Smith", "OC", "PIT", [2024, 2025], "playcaller"),
]

DEFENSE = [
    ("Vic Fangio", "DC", "MIA", [2023], "DC"),
    ("Vic Fangio", "DC", "PHI", [2024, 2025, 2026], "DC"),
    ("Vance Joseph", "DC", "DEN", [2023, 2024, 2025, 2026], "DC (2022 DEN DC was Ejiro Evero)"),
]

def coach_season_rows(off_csv, def_csv):
    off = pd.read_csv(off_csv)
    deff = pd.read_csv(def_csv)
    orows, drows = [], []
    for coach, role, team, seasons, note in OFFENSE:
        sub = off[(off["team"] == team) & (off["season"].isin(seasons))].copy()
        sub["coach"] = coach; sub["role"] = role; sub["note"] = note
        orows.append(sub)
    for coach, role, team, seasons, note in DEFENSE:
        sub = deff[(deff["team"] == team) & (deff["season"].isin(seasons))].copy()
        sub["coach"] = coach; sub["role"] = role; sub["note"] = note
        drows.append(sub)
    o = pd.concat(orows, ignore_index=True)
    d = pd.concat(drows, ignore_index=True)
    return o, d

if __name__ == "__main__":
    import os
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    o, d = coach_season_rows(os.path.join(base, "data", "off_tendencies.csv"),
                             os.path.join(base, "data", "def_tendencies.csv"))
    o.to_csv(os.path.join(base, "data", "coach_offense.csv"), index=False)
    d.to_csv(os.path.join(base, "data", "coach_defense.csv"), index=False)
    print("coach rows:", len(o), len(d))

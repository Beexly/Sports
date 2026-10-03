import math

"""mind_eq_2 complex equations.

A function exists only when every input is an existing column or
play-by-play field. Short names are not those columns. EPA_no-pressure
is not clean_epa_baseline. An Elo subscript is not elo. h_qb_act is
banned. FTN charting fields are not inputs. Nothing here is scored.
"""

def score_drive(row):
    return math.sin(abs(-0.2007 * row["ydstogo"] + min(0.0446 * row["yardline_100"] - 2.3621, 0.2007 * row["ydstogo"] - 1.0574) + 1.0574) ** 0.5)

FUNCTIONS = {
    "score_drive": score_drive,
}

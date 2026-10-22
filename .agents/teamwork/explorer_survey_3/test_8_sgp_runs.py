import json
import numpy as np
from pathlib import Path
import sys

repo = Path(r"c:\Users\Garrett\Sports")
sys.path.insert(0, str(repo))

from intelligence.sgp.sgp_copula_engine import (
    Leg,
    NormalMarginal,
    LogNormalMarginal,
    PoissonMarginal,
    price_sgp,
    over,
    under,
    correlation_matrix_from_pairs,
)

# 8 Target Games:
# 1. HOU @ JAX
# 2. CHI @ ATL
# 3. CAR @ PHI
# 4. ARI @ LAR
# 5. LAC @ KC
# 6. BUF @ LV
# 7. DAL @ GB
# 8. WSH @ SF

# We can specify empirical correlations from sgp_correlations.json:
# (0, 1) = 0.4977 (qb_yds ~ qb_tds)
# (0, 2) = 0.6995 (qb_yds ~ wr_yds)
# (1, 2) = 0.3716 (qb_tds ~ wr_yds)
# When total is leg 2 or 3:
# (0, total) = 0.38, (wr_yds, total) = 0.35, etc.

test_specs = [
    {
        "game": "HOU @ JAX",
        "title": "EverBank Aerial Shootout Stack (Stroud + Collins + Over 41.5)",
        "legs": [
            Leg(LogNormalMarginal(mean=264.0, sd=46.0), over(252.5), "C.J. Stroud Over 252.5 Pass Yards"),
            Leg(LogNormalMarginal(mean=82.0, sd=25.0), over(72.5), "Nico Collins Over 72.5 Rec Yards"),
            Leg(NormalMarginal(mean=44.0, sd=9.5), over(41.5), "Game Total OVER 41.5 Points"),
        ],
        "pairs": {(0, 1): 0.6995, (0, 2): 0.41, (1, 2): 0.36},
        "book_price": 475.0,
    },
    {
        "game": "CHI @ ATL",
        "title": "Mercedes-Benz Dome Pace Stack (Bijan + London + Over 52.5)",
        "legs": [
            Leg(LogNormalMarginal(mean=98.5, sd=28.0), over(93.5), "Bijan Robinson Over 93.5 Rush Yards"),
            Leg(LogNormalMarginal(mean=86.0, sd=26.0), over(74.5), "Drake London Over 74.5 Rec Yards"),
            Leg(NormalMarginal(mean=54.5, sd=10.0), over(52.5), "Game Total OVER 52.5 Points"),
        ],
        "pairs": {(0, 1): 0.28, (0, 2): 0.38, (1, 2): 0.42},
        "book_price": 520.0,
    },
    {
        "game": "CAR @ PHI",
        "title": "Lincoln Financial Trench Control (Hubbard + McMillan + Under 39.5)",
        "legs": [
            Leg(LogNormalMarginal(mean=74.0, sd=22.0), over(64.5), "Chuba Hubbard Over 64.5 Rush Yards"),
            Leg(LogNormalMarginal(mean=68.0, sd=24.0), over(58.5), "Tetairoa McMillan Over 58.5 Rec Yards"),
            Leg(NormalMarginal(mean=37.5, sd=8.8), under(39.5), "Game Total UNDER 39.5 Points"),
        ],
        "pairs": {(0, 1): 0.22, (0, 2): 0.25, (1, 2): 0.18},
        "book_price": 480.0,
    },
    {
        "game": "ARI @ LAR",
        "title": "SoFi Stadium Aerial Air-Raid Stack (Stafford + Nacua + Over 51.5)",
        "legs": [
            Leg(LogNormalMarginal(mean=272.0, sd=44.0), over(258.5), "Matthew Stafford Over 258.5 Pass Yards"),
            Leg(LogNormalMarginal(mean=88.0, sd=26.0), over(76.5), "Puka Nacua Over 76.5 Rec Yards"),
            Leg(NormalMarginal(mean=53.5, sd=10.0), over(51.5), "Game Total OVER 51.5 Points"),
        ],
        "pairs": {(0, 1): 0.6995, (0, 2): 0.43, (1, 2): 0.39},
        "book_price": 490.0,
    },
    {
        "game": "LAC @ KC",
        "title": "Arrowhead Trench Control & Under Script (Mahomes + Kelce + Under 41.5)",
        "legs": [
            Leg(LogNormalMarginal(mean=218.0, sd=38.0), under(223.5), "Patrick Mahomes Under 223.5 Pass Yards"),
            Leg(LogNormalMarginal(mean=52.0, sd=18.0), under(56.5), "Travis Kelce Under 56.5 Rec Yards"),
            Leg(NormalMarginal(mean=39.5, sd=9.0), under(41.5), "Game Total UNDER 41.5 Points"),
        ],
        "pairs": {(0, 1): 0.6995, (0, 2): 0.44, (1, 2): 0.38},
        "book_price": 440.0,
    },
    {
        "game": "BUF @ LV",
        "title": "Allegiant High-Octane Attack (Allen + Cook + Over 53.5)",
        "legs": [
            Leg(LogNormalMarginal(mean=265.0, sd=44.0), over(248.5), "Josh Allen Over 248.5 Pass Yards"),
            Leg(LogNormalMarginal(mean=84.0, sd=24.0), over(72.5), "James Cook Over 72.5 Rush Yards"),
            Leg(NormalMarginal(mean=56.0, sd=10.2), over(53.5), "Game Total OVER 53.5 Points"),
        ],
        "pairs": {(0, 1): 0.32, (0, 2): 0.45, (1, 2): 0.38},
        "book_price": 460.0,
    },
    {
        "game": "DAL @ GB",
        "title": "Lambeau Field Shootout Stack (Love + Watson + Over 53.5)",
        "legs": [
            Leg(LogNormalMarginal(mean=286.0, sd=48.0), over(274.5), "Jordan Love Over 274.5 Pass Yards"),
            Leg(LogNormalMarginal(mean=78.0, sd=25.0), over(64.5), "Christian Watson Over 64.5 Rec Yards"),
            Leg(NormalMarginal(mean=55.5, sd=10.5), over(53.5), "Game Total OVER 53.5 Points"),
        ],
        "pairs": {(0, 1): 0.6995, (0, 2): 0.44, (1, 2): 0.39},
        "book_price": 480.0,
    },
    {
        "game": "WSH @ SF",
        "title": "Levi's Stadium MNF Primetime Stack (Purdy + Kittle + Over 52.5)",
        "legs": [
            Leg(LogNormalMarginal(mean=262.0, sd=42.0), over(248.5), "Brock Purdy Over 248.5 Pass Yards"),
            Leg(LogNormalMarginal(mean=74.0, sd=22.0), over(64.5), "George Kittle Over 64.5 Rec Yards"),
            Leg(NormalMarginal(mean=54.8, sd=10.0), over(52.5), "Game Total OVER 52.5 Points"),
        ],
        "pairs": {(0, 1): 0.6995, (0, 2): 0.42, (1, 2): 0.38},
        "book_price": 460.0,
    },
]

print(f"Simulating all {len(test_specs)} Week 6 target SGPs:")
for s in test_specs:
    corr = correlation_matrix_from_pairs(len(s["legs"]), s["pairs"])
    res = price_sgp(
        legs=s["legs"],
        correlation=corr,
        copula="student-t",
        nu=4.0,
        n_draws=50000,
        book_price_american=s["book_price"],
        seed=42,
    )
    lift = res.correlation_lift * 100.0
    print(f"\n{s['game']} — {s['title']}")
    print(f"  Legs: {' + '.join(l.label for l in s['legs'])}")
    print(f"  Independent: {res.independent_joint*100:.2f}% | Copula: {res.true_joint*100:.2f}% | Lift: +{lift:.2f}% (z={res.z_score:+.2f})")
    print(f"  Book: +{s['book_price']:.0f} (implied {res.book_implied*100:.2f}%) | Alpha: {res.alpha*100:+.2f}% | Edge: {res.is_edge}")

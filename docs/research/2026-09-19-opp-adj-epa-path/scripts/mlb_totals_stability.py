"""MLB totals CLV strict stability: per season-half windows (read-only).

The night's discovery: MLB totals beat the close at 57.76% strict on n=438 pooled.
Stability test (pre-stated): split graded MLB TOTAL rows into halves of the season
(weeks 1-9 vs 10+) AND by calendar window (settled before vs after 2026-06-01).
If the edge concentrates in one window, it is a streak; if it persists across both
splits, it is a defensible per-market edge claim. Kill: strict < 52% in either
calendar window -> call it unstable, downgrade to 'observed, not established'.
"""
import os
import pandas as pd
import psycopg

conn = psycopg.connect(os.environ["NEON_RO"], connect_timeout=20)
df = pd.read_sql("""
    SELECT p."clvVerdict" AS verdict,
           g."commenceTime" AS commence,
           p."settledAt" AS settled
    FROM picks p
    JOIN games g ON g.id = p."gameId"
    JOIN sports s ON s.id = g."sportId"
    WHERE s.key = 'baseball_mlb'
      AND p."pickType" = 'TOTAL'
      AND p."clvVerdict" IS NOT NULL
      AND p.result IN ('WIN', 'LOSS')
""", conn)
df["commence"] = pd.to_datetime(df.commence)
df["settled"] = pd.to_datetime(df.settled, utc=True)


def strict(d):
    beat = int((d.verdict == "BEAT_CLOSE").sum())
    lost = int((d.verdict == "LOST_TO_CLOSE").sum())
    m = int((d.verdict == "MATCHED_CLOSE").sum())
    n = beat + lost
    return {"beat": beat, "lost": lost, "matched": m, "n_strict": n,
            "strict": round(beat / n, 4) if n else None}


print("=== MLB totals CLV strict, by commence month-half (Apr-Jun vs Jul+) ===")
df["month"] = df.commence.dt.month
for name, d in [("Apr-Jun", df[df.month <= 6]), ("Jul+", df[df.month >= 7])]:
    print(name, strict(d))
print("\n=== by calendar window ===")
for name, d in [("settled < Jun", df[df.settled < pd.Timestamp("2026-06-01", tz="UTC")]),
                ("settled >= Jun", df[df.settled >= pd.Timestamp("2026-06-01", tz="UTC")])]:
    print(name, strict(d))
print("\npooled:", strict(df))
df.to_csv("data/mlb_totals_clv_stability.csv", index=False)

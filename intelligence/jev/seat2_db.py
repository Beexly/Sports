"""Seat 2 (Mimo lane, executed read-only): PASS-veto census + dual-denominator CLV.

PASS census (honesty check, not win-rate): every published PENDING row must have
factorBreakdown.independentEdge.decision != 'PASS' AND (expectedClv absent OR >= 0).
Any violation: list pick ids.

Dual CLV (Law 10):
  CLV_strict = BEAT / (BEAT + LOST)   (MATCHED_CLOSE excluded, volume reported)
  CLV_all    = BEAT / ALL
Ladder: totals first, then spread/moneyline; MLB and NFL SEPARATE (never pooled).
Locked live number: overall CLV beat-close 23.2% on n=1,586 (all-sports, strict).
"""
import os
import pandas as pd
import psycopg

conn = psycopg.connect(os.environ["NEON_RO"], connect_timeout=20)

print("=== PASS-veto census: published PENDING rows ===")
census = pd.read_sql("""
    SELECT p.id, p.selection, p."pickType",
           p."factorBreakdown"->'independentEdge'->>'decision' AS decision,
           p."factorBreakdown"->'independentEdge'->>'expectedClv' AS expected_clv
    FROM picks p
    WHERE p."isPublished" = true AND p.result = 'PENDING'
      AND p."factorBreakdown" ? 'independentEdge'
""", conn)
census["clv_num"] = pd.to_numeric(census.expected_clv, errors="coerce")
viol_pass = census[census.decision == "PASS"]
viol_clv = census[(census.clv_num < 0)]
print(f"pending published rows with independentEdge: {len(census)}")
print(f"decision == PASS violations: {len(viol_pass)}")
if len(viol_pass):
    print(viol_pass[["id", "selection", "pickType"]].to_string(index=False))
print(f"expectedClv < 0 violations: {len(viol_clv)}")
if len(viol_clv):
    print(viol_clv[["id", "selection", "pickType", "clv_num"]].to_string(index=False))

print("\n=== dual-denominator CLV ladder (settled, clv-graded) ===")
clv = pd.read_sql("""
    SELECT s.key AS sport, p."pickType",
           p."clvVerdict" AS verdict
    FROM picks p
    JOIN games g ON g.id = p."gameId"
    JOIN sports s ON s.id = g."sportId"
    WHERE p."clvVerdict" IS NOT NULL
      AND p.result IN ('WIN', 'LOSS')
""", conn)
ladder = []
for sport in ["baseball_mlb", "americanfootball_nfl"]:
    d = clv[clv.sport == sport]
    for ptype in ["TOTAL", "SPREAD", "MONEYLINE"]:
        dd = d[d.pickType == ptype]
        beat = int((dd.verdict == "BEAT_CLOSE").sum())
        lost = int((dd.verdict == "LOST_TO_CLOSE").sum())
        matched = int((dd.verdict == "MATCHED_CLOSE").sum())
        all_n = len(dd)
        ladder.append({
            "sport": sport, "pick_type": ptype, "beat": beat, "lost": lost,
            "matched": matched, "all": all_n,
            "clv_strict": round(beat / (beat + lost), 4) if beat + lost else None,
            "clv_all": round(beat / all_n, 4) if all_n else None,
        })
lad = pd.DataFrame(ladder)
print(lad.to_string(index=False))
lad.to_csv("data/clv_dual_denominator.csv", index=False)
census.drop(columns=["clv_num"]).to_csv("data/pass_veto_census_pending.csv", index=False)
print("saved data/clv_dual_denominator.csv + pass_veto_census_pending.csv")

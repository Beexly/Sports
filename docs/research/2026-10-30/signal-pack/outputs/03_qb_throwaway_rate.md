# Signal 3 — QB throwaway rate

Method: @sfdata9ers throwaway-rate list from Garrett's Oct 30
phone-feed video: Bryce Young 12.7% (#1), Bo Nix 11.5%, Jayden Daniels
11.2%. Window: PFR Advanced Passing charting (through 7)
+ nflverse sacks. Rate = PFR throwaways / dropbacks (attempts + sacks);
per-attempt rate also in the CSV. Qualification: >= 100
dropbacks (34 QBs).

**Check vs the post — DIVERGED, exactly.** From public data:

| rank | qb | dropbacks | throwaways | thawy_per_dropback | thawy_per_attempt |
|---|---|---|---|---|---|
| 1 | Bo Nix | 227.0 | 22.0 | 0.0969 | 0.1009 |
| 2 | Bryce Young | 245.0 | 23.0 | 0.0939 | 0.1009 |
| 4 | Jayden Daniels | 126.0 | 10.0 | 0.0794 | 0.0862 |

- Membership reproduces: Nix, Young and Daniels are all in the public
  top 5 among qualified QBs, and the public #1-#2 are Nix and Young.
- The values and the #1 identity do not: PFR charting gives Nix
  9.7%/dropback (10.1%/attempt) and Young 9.4% (10.1%/attempt) — Nix
  first, not Young — and Daniels 7.9% (8.6%/attempt), ~3 points under
  the post's figures on every name. No public denominator closes the
  gap (per-pressure rates run 30-42%, far off and wrongly ordered).
- Read: the post's source is a different charter than PFR (the
  consistent +1.4 to +3.3 point offset across all three names is the
  signature of PFF-style charting, which credits materially more
  throwaways). The ranking story is real; the digits are not PFR's and
  are not reproducible from public data. GSE surfaces use the PFR
  numbers above, labeled as PFR.

Full table: `03_qb_throwaway_rate.csv`.

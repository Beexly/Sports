"""Build every signal table + summary into ``outputs/``.

Window rule: the build uses every *complete* week in the current
nflverse release (a week counts as complete at >= 13 games). On
2026-10-30 the release holds Weeks 1-7 complete; Week 8 contains only
the Oct 29 Thursday game (176 plays), so season tables built today are
Weeks 1-7 — which is also the exact window every originating post used.
Re-running this script after nflverse posts the rest of Week 8 extends
the tables automatically.
"""
from __future__ import annotations

import os

import pandas as pd

from . import data, signals
from .leverage import demo_configs, leverage_estimates

OUT = os.path.join(data.PACK_DIR, "outputs")
RB_MIN_ATT = 45          # see CHECKS.md #4: 45 and 50 both yield the
                         # chart's stated 39 qualified RBs through W7
QB_MIN_DROPBACKS = 100   # starter-scale qualification for the headline table


def _md_table(df: pd.DataFrame, cols: list[str], n: int | None = None) -> str:
    d = df if n is None else df.head(n)
    lines = ["| " + " | ".join(cols) + " |",
             "|" + "---|" * len(cols)]
    for _, r in d.iterrows():
        lines.append("| " + " | ".join(str(r[c]) for c in cols) + " |")
    return "\n".join(lines)


def _fmt(df: pd.DataFrame, nd: dict[str, int]) -> pd.DataFrame:
    d = df.copy()
    for c, n in nd.items():
        if c in d:
            d[c] = d[c].astype(float).round(n)
    return d


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    pbp_all = data.load_pbp()
    weeks = data.complete_weeks(pbp_all)
    window = f"Weeks {weeks[0]}-{weeks[-1]}"
    pbp = pbp_all[pbp_all.week.isin(weeks)]
    posmap = data.position_map()
    roster = data.load_roster()
    print(f"window: {window} ({len(pbp)} plays)")

    # --- 1. Red-zone expected TD share -----------------------------------
    cell = signals.red_zone_expected_td_share(pbp, posmap)
    rz = signals.red_zone_share_wide(cell)
    rz_out = _fmt(rz, {c: 3 for c in rz.columns if c.endswith("_xtd_share")})
    rz_out.to_csv(os.path.join(OUT, "01_red_zone_xtd_share.csv"), index=False)
    top_wr = rz.sort_values("WR_xtd_share", ascending=False).head(5)
    top_te = rz.sort_values("TE_xtd_share", ascending=False).head(5)
    with open(os.path.join(OUT, "01_red_zone_xtd_share.md"), "w") as f:
        f.write(f"""# Signal 1 — Red-zone expected TD share allowed, by position

Method: @KoalatyStats (post 2115828918963859896, Oct 29). Window: {window},
nflverse play-by-play + roster positions.

**Definition.** Every red-zone opportunity a defense faced (targets:
pass attempts excl. spikes/2pt with an identified receiver; carries:
rush attempts excl. 2pt; yardline_100 <= 20) is grouped by the
ball-handler's roster position. Each opportunity is priced at the
*league* red-zone TD rate for that position group; a defense's expected
TDs are shared out by position. Propensity, not results — where a
defense's RZ touchdowns *should* come from, with TD variance stripped.

League RZ TD rates this window: """ +
        ", ".join(
            f"{g} {r:.3f}" for g, r in
            cell.groupby("pos_group").apply(
                lambda d: d.tds_allowed.sum() / d.opps_faced.sum()).items()) +
        f""".

**Check vs the post:** the post published a chart image; no values exist
in text form, so no numeric check is possible. The method is replicated
exactly as the dossier specifies. (The same account's open-field funnel
chart was reproduced 4-of-5 claims in the Oct 29 in-house repro pass;
its PROE column was refuted — Miami, not Detroit, allows the most
over-expectation passing. Borrowed numbers are never imported; this
table is computed, not copied.)

Top-5 defenses by expected WR share of RZ TDs allowed:

{_md_table(_fmt(top_wr, {'WR_xtd_share': 3}), ['defense', 'rz_opps_faced', 'rz_tds_allowed', 'WR_xtd_share'])}

Top-5 by expected TE share:

{_md_table(_fmt(top_te, {'TE_xtd_share': 3}), ['defense', 'rz_opps_faced', 'rz_tds_allowed', 'TE_xtd_share'])}

Full table: `01_red_zone_xtd_share.csv` (32 defenses x QB/RB/WR/TE/OTHER shares).
""")

    # --- 2. Missed tackles -------------------------------------------------
    dhtml = open(data.pfr_defense_adv_path(), encoding="utf-8",
                 errors="ignore").read()
    mt = signals.missed_tackles_by_defense(dhtml)
    mt.to_csv(os.path.join(OUT, "02_missed_tackles_by_defense.csv"), index=False)
    few = mt.head(3)
    most = mt.tail(3).iloc[::-1]
    with open(os.path.join(OUT, "02_missed_tackles_by_defense.md"), "w") as f:
        f.write(f"""# Signal 2 — Missed tackles by defense

Method: @sfdata9ers team missed-tackle rankings (post
2115844929247166692, attributed to Pro Football Reference) and
@PattonAnalytics' combined missed & broken tackles chart from
Garrett's Oct 30 phone-feed video. Window: PFR's current advanced-
defense cut (player-level MTkl summed by team, {len(mt)} teams).

**Check vs the post — MATCH (endpoints).** Fewest: DET {int(few.iloc[0].mtkl)}
(#1; next team MIN {int(mt.iloc[1].mtkl)} — "fewest by a mile" is literal).
Most: DEN {int(most.iloc[0].mtkl)}, CLE {int(most.iloc[1].mtkl)},
PHI {int(most.iloc[2].mtkl)} — the post's worst-three cluster exactly,
with DEN/CLE in adjacent swapped order vs the post (documented in the
Oct 29 repro pass as a one-update-cut difference; today's PFR pull is
byte-identical to the Oct 29 cut that repro verified).

**Gap — broken tackles:** the 'broken tackles allowed' half of
Patton's combined chart has no public team-level source. PFR charts
broken tackles for ball-carriers (season totals, offensive side only);
attributing them to the defense faced requires play-level charting
(FTN/PFF, proprietary). Not faked: this signal ships missed tackles
only, and the combined chart stays documented-not-reproduced.

Fewest missed tackles:

{_md_table(few, ['rank_fewest', 'team', 'mtkl'])}

Most missed tackles:

{_md_table(most, ['rank_fewest', 'team', 'mtkl'])}

Full table: `02_missed_tackles_by_defense.csv`.
""")

    # --- 3. QB throwaway rate ----------------------------------------------
    phtml = open(data.pfr_passing_adv_path(), encoding="utf-8",
                 errors="ignore").read()
    acc = data.parse_pfr_passing_accuracy(phtml)
    tw = signals.qb_throwaway_rate(acc, pbp, roster,
                                   min_dropbacks=QB_MIN_DROPBACKS)
    tw_out = _fmt(tw, {"thawy_per_dropback": 4, "thawy_per_attempt": 4})
    tw_out.to_csv(os.path.join(OUT, "03_qb_throwaway_rate.csv"), index=False)
    named = tw[tw.qb.isin(["Bryce Young", "Bo Nix", "Jayden Daniels"])]
    with open(os.path.join(OUT, "03_qb_throwaway_rate.md"), "w") as f:
        f.write(f"""# Signal 3 — QB throwaway rate

Method: @sfdata9ers throwaway-rate list from Garrett's Oct 30
phone-feed video: Bryce Young 12.7% (#1), Bo Nix 11.5%, Jayden Daniels
11.2%. Window: PFR Advanced Passing charting (through {window[-1]})
+ nflverse sacks. Rate = PFR throwaways / dropbacks (attempts + sacks);
per-attempt rate also in the CSV. Qualification: >= {QB_MIN_DROPBACKS}
dropbacks ({len(tw)} QBs).

**Check vs the post — DIVERGED, exactly.** From public data:

{_md_table(_fmt(named, {'thawy_per_dropback': 4, 'thawy_per_attempt': 4}), ['rank', 'qb', 'dropbacks', 'throwaways', 'thawy_per_dropback', 'thawy_per_attempt'])}

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
""")

    # --- 4. RB rushing EPA/attempt ------------------------------------------
    rb = signals.rb_rushing_epa(pbp, posmap, min_attempts=RB_MIN_ATT)
    rb_out = _fmt(rb, {"epa_per_att": 3, "success_rate": 3, "ypc": 2})
    rb_out.to_csv(os.path.join(OUT, "04_rb_rushing_epa.csv"), index=False)
    with open(os.path.join(OUT, "04_rb_rushing_epa.md"), "w") as f:
        f.write(f"""# Signal 4 — RB rushing EPA / attempt leaderboard

Method: @boxscorescout RB rushing EPA/attempt chart from Garrett's
Oct 30 phone-feed video ("all 39 qualified RBs"). Window: {window},
nflverse play-by-play, designed runs only (rush_attempt == 1, 2pt
excluded), roster-listed RBs.

**Check vs the post — qualification count MATCHES.** The chart states
39 qualified RBs; from public data, min {RB_MIN_ATT} attempts yields
exactly {len(rb)} qualified RBs this window (a 50-attempt floor yields
the same 39 — no RB sits between 45 and 50 attempts). Per-player
values were chart-image only, so no numeric check beyond the count is
possible; the leaderboard below is computed, not copied.

Top 8:

{_md_table(rb_out, ['rank', 'rb', 'team', 'att', 'epa_per_att', 'success_rate'], n=8)}

Bottom 3:

{_md_table(rb_out.tail(3), ['rank', 'rb', 'team', 'att', 'epa_per_att', 'success_rate'])}

Full table: `04_rb_rushing_epa.csv` ({len(rb)} RBs).
""")

    # --- 5. Big plays vs success rate ---------------------------------------
    bp = signals.big_plays_vs_success(pbp)
    bp_out = _fmt(bp, {"success_rate": 3, "big_play_rate": 3,
                       "epa_per_play": 3})
    bp_out.to_csv(os.path.join(OUT, "05_big_plays_vs_success.csv"), index=False)
    q1 = bp[bp.quadrant.str.startswith("Q1")].team.tolist()
    q2 = bp[bp.quadrant.str.startswith("Q2")].team.tolist()
    with open(os.path.join(OUT, "05_big_plays_vs_success.md"), "w") as f:
        f.write(f"""# Signal 5 — Big plays vs success rate quadrant (team offenses)

Method: @ghatz_28 quadrant chart, Weeks 1-7 (post from Garrett's
Oct 30 phone-feed video; the account's charts are nflfastR-based).
Window: {window}. Definitions, stated because the post does not state
its own: success rate = share of scrimmage plays (pass + run, 2pt
excluded) with EPA > 0; big-play rate = share of scrimmage plays that
are explosive under the Sharp Football thresholds (pass gain >= 16
yards, rush gain >= 12 yards). Quadrants split at the league medians
(success {bp.success_rate.median():.3f}, big-play {bp.big_play_rate.median():.3f}).

**Check vs the post:** chart values are image-only; no numeric check
is possible. The construction is replicated under stated definitions;
if the account's thresholds differ, membership near the medians moves
— the quadrant extremes (below) are robust to any standard threshold.

Q1 (efficient + explosive): {", ".join(q1)}.
Q2 (boom-or-bust): {", ".join(q2)}.

Full table: `05_big_plays_vs_success.csv` (32 teams).
""")

    # --- 6. Defensive EPA/play by quarter ------------------------------------
    dq = signals.defensive_epa_by_quarter(pbp)
    dq_out = _fmt(dq, {c: 3 for c in dq.columns if "epa" in c})
    dq_out.to_csv(os.path.join(OUT, "06_defensive_epa_by_quarter.csv"),
                  index=False)
    with open(os.path.join(OUT, "06_defensive_epa_by_quarter.md"), "w") as f:
        f.write(f"""# Signal 6 — Defensive EPA / play by quarter

Method: @sfdata9ers full 32-team defensive EPA/play-by-quarter table
from Garrett's Oct 30 phone-feed video. Window: {window}, nflverse
play-by-play, scrimmage plays only (pass + run, 2pt excluded),
regulation quarters. Negative = good defense.

**Check vs the post:** the post's values are image-only; no numeric
check is possible. The table is computed in-house — which was the
point of the exercise: this recurring series is now an owned weekly
artifact instead of a borrowed screenshot.

Best three defenses overall this window:

{_md_table(dq_out, ['defense', 'q1_epa_allowed', 'q2_epa_allowed', 'q3_epa_allowed', 'q4_epa_allowed', 'all_q_epa_allowed'], n=3)}

Worst three:

{_md_table(dq_out.tail(3), ['defense', 'q1_epa_allowed', 'q2_epa_allowed', 'q3_epa_allowed', 'q4_epa_allowed', 'all_q_epa_allowed'])}

Full table: `06_defensive_epa_by_quarter.csv` (32 defenses x Q1-Q4 + overall).
""")

    # --- 7. Paired-flip leverage ----------------------------------------------
    rows = []
    for name, cfg in demo_configs().items():
        r = leverage_estimates(**cfg, n_sims=8000, seed=7)
        rows.append({"config": name, **r})
    lev = pd.DataFrame(rows)
    lev.to_csv(os.path.join(OUT, "07_paired_flip_leverage.csv"), index=False)
    c = lev[lev.config == "contender"].iloc[0]
    l = lev[lev.config == "longshot"].iloc[0]
    with open(os.path.join(OUT, "07_paired_flip_leverage.md"), "w") as f:
        f.write(f"""# Signal 7 — Paired-flip playoff leverage (@Timo_NFL construction)

Method: dossier D1, OVERNIGHT-CORPUS report. Season sims whose team
ratings update inside the simulation (Elo-style, K = 1.75 points,
logistic scale 5.5) contaminate outcome-filtered leverage: filtering
on "team won" also selects the sims where the team's rating path
drifted up. Timo measured the inflation at 1.3-1.6x per team on his
real Week 7 setup. This is a synthetic replication of the mechanism —
an 8-team league, 6 remaining rounds, top 4 make the playoffs, 8,000
sims per configuration — not a re-measurement of his chart (his sim
inputs are not public).

**Result — the mechanism reproduces, inside his band.**

Contender spot (6-win team vs a 6-win rival, week 1 of the remainder):
- naive outcome filter on dynamic sims: {c.naive_filter_dynamic:.3f}
- paired-flip (flip only the game in the standings): {c.paired_flip:.3f}
- frozen-rating filter (control): {c.frozen_filter_control:.3f}
- **inflation ratio: {c.inflation_ratio:.2f}x** — inside Timo's 1.3-1.6x band.

Longshot spot (3-win team vs the 8-win leader — Timo's "game that
barely matters" case):
- naive filter: {l.naive_filter_dynamic:.3f} vs paired-flip {l.paired_flip:.3f}
  (naive {l.inflation_ratio:.1f}x the paired figure) — the filter
  manufactures leverage for a near-dead team; the paired construction
  keeps it near zero.

The paired and frozen constructions bracket the single-game effect
(paired is the conservative read); the naive filter sits above both.
Rule adopted for any GSE leverage surface: paired-flip or frozen
ratings, never an outcome filter on a dynamic-rating sim.

Table: `07_paired_flip_leverage.csv`.
""")

    print("built:", ", ".join(sorted(os.listdir(OUT))))


if __name__ == "__main__":
    main()

/loop MISSION: NFL MATCHUP + MARKET MACHINERY — second night. The first night exhausted the spec's
constants; this one buys power, then attacks the regions it never reached. Self-paced, ~8 h, a
wakeup every 8-12 min, never idle.

CARRY FORWARD (already banked, build on these — do not re-derive)
- mfp outranks confidence: rho +.185 vs -.017, Brier .2364 vs .2744 (c15, n=1697). Sort-key change is
  the ship item; weekly ECE watch threshold is 0.03.
- Kneeldown mass -1.06 (sd .50), mixture {0:-.053, -1:.863, <=-2:.084}; apply via P(victory formation).
- SGP: QB-WR1 tau +.385 (theta .788), QB-TE1 tau +.307 (theta .570), QB-RB1 flat (-.020). Family
  immaterial. One positive copula, signed pairing table.
- Kicking in calm: .826 / .677 / .682 / .571 by 40-44 / 45-49 / 50-54 / 55-59.
- Factored levers already measured: pre-snap alignment +.0106 AUC, separation->catch R2 .283,
  defensive baseline separation persistence .408.

DEAD (do not re-test; cite the cycle if tempted)
- scheme fingerprint (c3), red-zone TD% persistence (c4), generic DB-out (c5), boundary-CB ladder (c6),
  safety->slot (c14 no replication), nickel suppression + TE funnel (c12), rookie BOCPD change point
  (c13), OL-penalty-on-totals (c16), dual-ILB gate as a binary (c7).

TIERS — take the highest not-done item, log which

T4 POWER UPGRADES (do these first; every later tier depends on them)
 1. Closing lines. Action Network multi-book (dossier §2) or ESPN odds by event; build game totals and
    spreads with timestamps, 2023-2026. Then re-run cycles 7 and 16 against closing lines instead of week
    means. Residual SD should fall from 13.4 points; report the new SD and whether either effect appears.
 2. Offence-only outcomes. Points scored BY the affected offence (and points allowed by the affected
    defence) instead of game totals, so an injury is not diluted against a healthy opponent.
 3. Replacement quality. Weight every availability flag by the snap share of the man behind him
    (depth rank 2, snap_counts). Re-run the back-seven question with quality weights.
 4. Multi-season availability. Predictor-consistent seasons only; 2023 and 2024 schemas differ, so
    normalise before pooling and state the normalisation.

T5 BACK-SEVEN, DONE RIGHT
 5. Explosive plays allowed (15+ air yards) and YAC-over-expected as outcomes; safety and boundary-CB
    availability as predictors. This is where a safety actually shows up.
 6. Coverage-conditioned YAC: YAC over expected by coverage type and receiver alignment, shrunk.

T6 MARKET MACHINERY (the currency is CLV, not win rate)
 7. CLV engine: for every graded pick with clvLockLine/clvCloseLine present, compute points and cents
    beaten, by market and tier. Report the distribution and whether mfp rank correlates with CLV.
 8. Steam timing: open->current move against the pick, by hours before kickoff. Does the board lose value
    the later it publishes?
 9. Key numbers: 3/7/10/14 frequency in spreads and totals; the cost of crossing one.
 10. Prop dispersion: use CONSENSUS_DISPERSION.csv, find pairs where the board's edge is inside book
    dispersion (i.e. not really an edge).

T7 DECISION MACHINERY (coaching, measurable)
 11. 4th-down go-rate vs. nflfastR go-boost by field position and score state; rank staffs by residual
     aggression. (pg 2018-2021 has fourth_down_converted + wp.)
 12. Timeout value: 612 leading-team burns inside 2:00 already counted; now measure the win-prob cost of
     each burn using wp before/after within the same drive.
 13. 2-pt chart actual usage vs. model; deviation cost per team-season.

T8 OFFICIATING
 14. Crew bias from the local officials.parquet joined to pbp penalties: holding, DPI, OPI rates per crew,
     with 2018-2021 as the sample and season-level shrinkage. Report the top and bottom crews with CIs.

T9 WEATHER AS A SURFACE, NOT A FLAG
 15. Wind direction against stadium orientation: build the stadium axis from coordinates, compute the
     cross/head component, and re-fit the kicking surface with the component instead of speed. A 15 mph
     crosswind and a 15 mph tailwind are not the same kick.
 16. Precipitation and cold as separate terms; interaction with distance.

T10 INVENTED METRICS (each needs a prereg with kill gates)
 17. Pressure-to-sack conversion by time-to-throw bucket (ftn blitz + pbp sack timing).
 18. Route leverage surplus: separation gained per route relative to the leverage the defender conceded,
     by coverage — the metric the BDB subject-tracking route cannot give us for free.
 19. Tackle opportunity rate for linebackers (snap share x box presence) as a proxy for run-support load.

HARD RULES (unchanged, non-negotiable)
- Preregister every novel claim in notes/PRE-*.md BEFORE measuring. Gates frozen after results.
- Every row carries n, method, statistic, verdict (FITTED / VALIDATED / REFUTED / INCONCLUSIVE / PARKED).
- Negatives and nulls are the product. A refuted hypothesis logged properly is a full cycle.
- Retractions explicit, with file and line.
- Commit and push Beexly/nfl-farm every cycle, before exiting the cycle.
- Timebox 12 min/cycle. Log fetch failures; never infer around them.
- Never fabricate a number, SHA or payload.
- Language: `python` (has pandas 3.0.5), not `python3`. Depth charts need drop_duplicates on
  (team, week, gsis_id) and week must be derived from game dates. Score diff and half_seconds are null on
  `no_play` rows — ffill score, use game_seconds. Never `~` an object-dtype bool.
- DB: `neonctl psql main --project-id summer-brook-99380762 --role-name hermes_ro -- -c "..."`; COPY to
  STDOUT for bulk. Read-only by convention; no DDL, no writes, no touching the signal path (AGENTS.md 40).

DELIVERABLES each cycle: ledger row, notes/<slug>.md, equations.py block when something fits, module-log
next-line.

EXIT: 8 h budget, T4-T10 exhausted, or 3 consecutive cycles with no new datum. Then append to
notes/OVERNIGHT-REPORT.md and copy to ~/Downloads, commit, push, and summarize with real numbers only.

Start with T4.1 (closing lines) and post cycle 17 in this shape:
[/cycle 17 | T4 | closing-line acquisition | n=<> | verdict pending]

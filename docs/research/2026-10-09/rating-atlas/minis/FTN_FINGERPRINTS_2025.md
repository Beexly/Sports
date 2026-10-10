# FTN 2025 FINGERPRINTS — league baselines (computed by Minis, 2026-10-10)
Source: nflverse-data release ftn_charting/ftn_charting_2025.csv (n=47,316 plays). Flags encoded TRUE/FALSE strings (parse note).
Method: flag-rate = share of plays with flag TRUE; drop-when-catchable = drops / (catchable + drops).

| flag | league rate |
|---|---|
| is_motion | 42.0% |
| is_play_action | 10.7% |
| is_screen_pass | 3.6% |
| is_rpo | 4.5% |
| is_no_huddle | 7.8% |
| is_trick_play | 0.3% |
| is_contested_ball | 6.0% |
| is_drop (all plays) | 1.6% |
| drop-when-catchable | 5.7% (n=13,510) |
| is_qb_out_of_pocket | 9.7% |
| is_throw_away | 1.7% |

read_thrown value distribution: 0=27,193; 1=10,877; SD(scramble drill)=2,655; CHK(checkdown)=2,539; 2=2,189.
n_defense_box mean 4.75 (all plays; includes run+pass). n_blitzers sparse on non-pass rows.
USAGE: these are LEAGUE baselines = normalizers for team-level z-scores. Team attach requires
pbp join on nflverse_play_id (PC lane: raw_pbp_2026/2025 RDS at nflverse/nflfastR-data releases).
No coefficients produced; no production changes. Kill-gated per GSE doctrine.

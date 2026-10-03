# Score gate, 2026-10-03

Champion is unchanged. Do not add these to the mint.

Full sample n=1914, stress+INT champion log loss 0.610621. Thirty joined columns with coverage at least 0.25, one at a time. No 95% interval entirely below 0. Families are worse. Source: eng/score_joined_singles.json, commit a0d90cd48.

beta_league home minus away is identically 0. league_baselines.py emits one number per season. A league constant cancels.

adot and cpoe_pbp, prior-week home minus away, on rows where both sides exist (n_scored 540): intervals exclude 0. The adot drop is 2024 (-0.010545, n=254). 2023 is worse (+0.001309). 2025 is flat. Full-sample present flag does not clear (adot_flag +0.000219, interval covers 0). Not a mint feature. Source: eng/score_joined_present.json, commit e9e278704.

wire_0 through wire_3 found no statement whose inputs are all eng parquet columns. Leave those slices empty. Do not flatten the interception grid. Do not invent net EPA. Do not code FTN. NGS time-to-throw stays dark.

air_yards_to_sticks_pbp = mean(air_yards - ydstogo) on pass attempts, floor 30, prior week, home minus away. Coverage 0.6671. n=1914. fillna(0) delta +0.000207, interval covers 0. Present flag delta +0.001538, interval 0.000175 to 0.002815, entirely above 0. It hurts. Not a mint feature.

# BDB 2027 batch and the unrelated remainder

Fetched with `gh api` on 2026-10-22. 17 distinct links.

| repo | licence | stars | verdict |
|---|---|---:|---|
| usufalbaz/nfl-big-data-bowl-2027-ktd | MIT | 6 | formula added |
| will-rice/bdb-2027 | Apache-2.0 | 1 | claim recorded, notebook not copied |
| juanma6610/NFL-BigDataBowl2027 | MIT | 1 | pipeline only, not copied |
| JosephLourduLouis/NFL-Big-Data-Bowl-2027-Jovan | MIT | 1 | raw CSVs, not vendored |
| yasminsherif200/NFL-Big-Data-Bowl-2027 | NONE | 1 | not copied |
| conormalone/Cognitive_Fatigue | NONE | 0 | not copied |
| conormalone/funathon-project3 | NONE | 0 | not copied |
| conormalone/Hudl_Performance_Insights_2025 | NONE | 1 | not copied |
| conormalone/kaggle_wind_speed | NONE | 0 | not copied |
| conormalone/kaggle_hill_of_towie | NONE | 0 | not copied |
| conormalone/wind_yolo | NONE | 2 | not copied |
| conormalone/BDB25 | NONE | 0 | not copied |
| conormalone/expected_completion | NONE | 0 | not copied |
| conormalone/StatsPerformForum23 | NONE | 0 | not copied |
| nfultz/grpc | NONE | 80 | not copied |
| nfultz/tron | NONE | 39 | not copied |
| nfultz/stackoverflow | NONE | 32 | not copied |

## Added

Kinetic Translation Deficit, from the MIT README of `usufalbaz/nfl-big-data-bowl-2027-ktd`:

`(S_max - S_cut) / (mean separation_at_pass_forward + 0.01)`

`S_max` is peak entry speed. `S_cut` is the minimum speed at the route break. Separation is yards at pass release. Their reported Spearman -0.5442 and ROC-AUC 0.672 were not re-run here and are not engine facts.

Files: `intelligence/vision/bdb2027_kinematics.py`, `packages/prediction-engine/src/tracking/kinetic-translation-deficit.ts`.

## Recorded, not copied

`will-rice/bdb-2027` (Apache-2.0) says frame (height and weight) predicts receiver separation in a held-out draft class, and the official 40 does not. That is their notebook's claim. It was not re-run on our data, so it is not an engine measurement. The notebook and the 2.2 GB raw tree were not copied.

`juanma6610/NFL-BigDataBowl2027` is a Kaggle download pipeline. It needs a Kaggle token and accepted competition rules. Nothing was downloaded.

`JosephLourduLouis/NFL-Big-Data-Bowl-2027-Jovan` is mostly competition CSVs. Those were not vendored.

## Not copied

The rest have no LICENSE file. `expected_completion` describes an XGBoost completion model and quotes accuracy 0.94, but that number was not reproduced and the notebook was not copied. `nfultz/grpc`, `tron`, and `stackoverflow` are R utilities, not a sports measurement.

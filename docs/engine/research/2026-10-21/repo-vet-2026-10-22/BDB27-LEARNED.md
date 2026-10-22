# Sports and BDB27 list, learned into the engine

Named repos fetched with `gh api` on 2026-10-22. The Polymarket org list in this paste is the same 104-repo catalog already on this branch. Clearance was not flipped.

| repo | stars | license | verdict |
|---|---:|---|---|
| roboflow/sports | 5435 | MIT | reference only |
| perfanalytics/pose2sim | 855 | BSD-3-Clause | reference only |
| tuangauss/DataScienceProjects | 839 | NONE | rejected by policy |
| georgedouzas/sports-betting | 822 | MIT | reference only |
| SkalskiP/sports | 558 | NONE | rejected by policy |
| nikhilchandrashaker/BDB27 | 0 | NONE | empty repo, no code |
| conormalone/BDB27 | 0 | NONE | idea learned, code not copied |

Policy: `docs/strategy/dfs-tooling-vetting-2026-09-12.md:42`. No licence means all rights reserved.

## Added to the engine

`conormalone/BDB27` asks, in its README, whether a 10 Hz Combine speed ceiling binds on NFL max-effort routes, and how close a game peak gets to that ceiling. The repo has no licence, so `src/` was not copied. The measurement was written here:

- `intelligence/vision/bdb2027_kinematics.py`: `combine_speed_ceiling`, `exceedance_rate`, `ceiling_closeness`
- `packages/prediction-engine/src/tracking/combine-ceiling.ts`, exported from the engine barrel

A drill max of 9.4 with game samples 9.0, 9.5, 9.6, 8.2 has exceedance 0.5 and closeness 9.6/9.4. An empty drill returns null. This does not claim Combine athleticism predicts NFL success. Cook et al. 2020, cited in that README, is the reason that claim is refused.

`nikhilchandrashaker/BDB27` is an empty repository. Its description names a CABS metric. No formula was published, so none was invented.

## Not vendored

roboflow/sports and pose2sim need cameras and model weights. sports-betting is another odds toolkit. The de-vig path already exists. Polymarket SDKs in the paste stay unused while `polymarket-gamma` is `cleared: false`.

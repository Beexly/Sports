# CLI inventory, 2026-09-26

Child A, disk only. This file does not publish a pick, does not add a prior, and does not edit `engine-reading.mjs`, `connect-slate.py`, or `engine-weights.ts`.

HEAD is `grok/reasoning-layer-2026-09-26` at `62772551a81bbe72d25be30a629e73c0fdded06a`. `origin/main` is `90855d2dda1659f42764da0d1a48f7df1a647033`.

Search roots: `C:\Users\Garrett\.cache`, `C:\Users\Garrett\data`, `C:\tmp`, and `data/` in this worktree. `node_modules` and `.git` were skipped. No download.

## Grain table

One row is the grain. Join key is the column actually present. Direction names are the sixteen allowed names. A second grain of a family that already has a representative on this branch is DUPLICATE, not a new candidate. ABSENT means the filename was looked for and was not in the four roots.

| table | grain (one row means) | join key | direction | status |
|---|---|---|---|---|
| games | one NFL game | `game_id` (`YYYY_WW_AWAY_HOME`) | schedule_and_body | REPRESENTATIVE. `data/gse-dataset/games.jsonl`, 7548 rows, seasons 1999-2026. `rest_diff` is on this file. No `wind` or `temp` key (0 rows). No `gsis_id` column. |
| pbp | one play | `game_id` | on_field_efficiency | DUPLICATE. `C:\Users\Garrett\.cache\ngs\pbp_2023.csv` (49665 plays) and `pbp_2024.csv` (49492 plays). Header has `cpoe`, so this is the play-level half of the CPOE pair. Also has `qb_hit` and `fourth_down_converted` / `fourth_down_failed`, which are columns of families already represented, not extra rows. Header has `wind` and `temp`. No `gsis_id` column. `pbp_2025.csv`, `pbp_2025.csv.gz`, and `pbp_2026.csv` are ABSENT, including `C:\tmp\pbp_2025.csv.gz` and `C:\tmp\pbp_2026.csv`. |
| ngs_pass | one passer, one season-type week | `player_gsis_id` plus `season`, `season_type`, `week`, `team_abbr` | on_field_efficiency | DUPLICATE. `C:\Users\Garrett\.cache\ngs\ngs_passing.csv.gz`, 5933 rows. Seasons present: 10 values, min 2016, max 2025. Week values min 0, max 9. Column `completion_percentage_above_expectation` is the NGS half of the CPOE pair. |
| ngs_rush | one rusher week, if the file existed | not opened | on_field_efficiency | ABSENT. Looked for `ngs_rushing.csv` and `ngs_rushing.csv.gz`. Neither is under the four roots. `.cache\ngs` has no rushing file. |
| ngs_rec | one receiver, one season-type week | `player_gsis_id` plus `season`, `season_type`, `week`, `team_abbr` | on_field_efficiency | DUPLICATE. `C:\Users\Garrett\.cache\ngs\ngs_receiving.csv.gz`, 14731 rows. Same season and week span as ngs_pass (min 2016, max 2025, week min 0, max 9). |
| injuries | one player injury report for a team-week | `gsis_id` plus `season`, `week`, `team` | availability | REPRESENTATIVE. `data/gse-dataset/current/injuries_2026.csv`, 733 rows, season 2026, weeks 1-3 (182 / 251 / 300). `report_status`: Out 138, Questionable 120, Doubtful 19, blank 456. Out is the availability representative. Questionable and Doubtful are the airwave slice of this same table, not a second grain. |
| depth | one depth-chart slot, if the file existed | not opened | trench_personnel | ABSENT. Looked for `depth_charts`, `depth_charts_2026.csv`, `depth_2024.csv`, `depth_2025.csv`, including `C:\tmp\depth_charts_2026.csv` and `C:\tmp\olcal\depth_2024.csv` and `depth_2025.csv`. Offensive-line drag remains the existing trench sibling, not a second row from a missing file. |
| snaps | one player-game snap line, if the nflverse file existed | not opened | chemistry | ABSENT. Looked for `snap_counts`. The only filename hit is `data/statking/snapshots/snap_counts_sample.json` (also under `C:\Users\Garrett\data\statking\snapshots\`). Opened: `data_status` `fixture_backed`, `generated_at` 2026-06-13, player ids `p001` and up. That is not an nflverse snap table. |
| rosters | one roster row, if the file existed | not opened | availability | ABSENT. Looked for `rosters`. No file under the four roots. |
| player_stats | one player-season or player-week stat row, if the file existed | not opened | on_field_efficiency | ABSENT. Looked for `player_stats`, `player_stats.csv.gz`, `ps2025.csv`, `ps2026.csv`. Those `C:\tmp` paths are absent. |
| team_stats | one team-week stat row, if the raw file existed | `game_id` on the derived file only | on_field_efficiency | ABSENT as a raw table. Looked for `team_stats`, `tw2025.csv`, `tw2026.csv` (`C:\tmp\team-stats\` absent). The derived file `data/gse-dataset/current/week3-split-efficiency.jsonl` is already the opponent-adjusted blend (pass, rush, CPOE, explosive, turnover). That is the existing representative, not a new candidate. |
| ftn | one charted play, if the file existed | not opened | scheme_play_design | ABSENT. Looked for `ftn`. No file under the four roots. Charted motion / PA / RPO / shotgun is already the scheme representative. Drive-start is already the 0.15 sibling (`week3-drive-start.jsonl`). This missing file is not a second scheme candidate. |
| contracts | one player contract, if a salary file existed | not opened | narrative_contract | ABSENT. Looked for `contracts`. The only filename hit is `data/statking/ui/page_data_contracts.json` (also under `C:\Users\Garrett\data\statking\ui\`). Opened: UI page contracts, `generated_at` 2026-06-13, pages such as `/stats`. Not APY, length, or guarantees. No salary path. |
| participation | one player participation row, if the file existed | not opened | trench_personnel | ABSENT. Looked for `participation`. No file under the four roots. |
| nfl4th | one fourth-down decision row, if the file existed | not opened | coaching | ABSENT. Looked for `nfl4th`. No file under the four roots. Named duplicate of the fourth-down go rate already fit on this branch (`week3-situational.jsonl` carries `coaching_signed` null and a go-rate edge). Not a new candidate. |

## Counts from files opened

`games.jsonl` team codes include `LA` and do not include `LAR`. Games with `LA` on either side: 198 (home 97, away 101). `LAR` rows: 0. No `gsis_id` column, so nulls and duplicate `gsis_id` were not counted there. Referee is null on 240 of 7548 games and set on 7308. 2026 week 3: 16 games, referee null on 15. The one set referee is `2026_03_ATL_GB`, ATL at GB, Shawn Smith. `2026_03_LAC_BUF` referee is null. Two pbp ids were checked against this file and both exist: `2023_01_ARI_WAS`, `2024_01_ARI_BUF`.

`pbp_2023.csv`: home `LA` 1403 plays, away `LA` 1766, `LAR` 0. `pbp_2024.csv`: home `LA` 1726, away `LA` 1534, `LAR` 0. No `gsis_id` column.

`ngs_passing.csv.gz`: `team_abbr` `LAR` 193 rows, `LA` 0, `LAC` 181. No alias column in the file. `player_gsis_id` nulls: 0. Unique `player_gsis_id`: 167. Ids that repeat across rows: 152. Composite key `season+season_type+week+player_gsis_id+team_abbr` duplicate keys: 0. The repeats are the player-week grain, not a broken key.

`ngs_receiving.csv.gz`: `LAR` 545, `LA` 0, `LAC` 487. No alias column. `player_gsis_id` nulls: 0. Unique ids: 676. Ids that repeat: 560. Composite duplicate keys: 0.

`injuries_2026.csv`: `team` `LA` 28, `LAR` 0. `gsis_id` nulls: 0. Unique `gsis_id`: 476. Ids that appear in more than one week: 192. Composite `season+week+gsis_id+team` duplicate keys: 0.

`connect-slate.py` maps `LAR` to `LA` in `TEAM_ALIAS`. That map is in the script. It is not inside the NGS files. The grains that still say `LAR` with no alias are ngs_pass and ngs_rec. games, pbp_2023, pbp_2024, and injuries_2026 say `LA`.

## Linux paths named by the calibrators

Checked on this machine. All absent:

- `C:\tmp\pbp_2025.csv.gz`
- `C:\tmp\pbp_2026.csv`
- `C:\tmp\olcal\games_nflverse.csv`
- `C:\tmp\player_stats.csv.gz`
- `C:\tmp\depth_charts_2026.csv`
- `C:\tmp\olcal\depth_2024.csv`
- `C:\tmp\olcal\depth_2025.csv`
- `C:\tmp\player-stats\ps2025.csv`
- `C:\tmp\player-stats\ps2026.csv`
- `C:\tmp\team-stats\tw2025.csv`
- `C:\tmp\team-stats\tw2026.csv`
- `C:\tmp\nfl-stats\w2025.csv`
- `C:\workspace\w2026.csv`

`environment-calibration.json` and `drive-start-calibration.json` are on disk under `data/gse-dataset/current/`. Their script source CSVs are the absent paths above. `games.jsonl` has no wind or temp keys.

## Branches

Audit list in `docs/reasoning/audit-2026-09-26.md`. Short SHAs were re-resolved. Eight tips still match. `agent/visibility-index-2026-09-26` does not: `git rev-parse` on `2f992ccb9`, `refs/heads/agent/visibility-index-2026-09-26`, and `refs/remotes/origin/agent/visibility-index-2026-09-26` all failed (`Needed a single revision`). File count was not run for that one.

File count is `git diff --name-only origin/main...<sha>` measured as the number of names. Label is ABANDONED unless that diff adds a measured non-EPA family this branch does not already have. This branch already has efficiency, scheme, availability, rest, Elo, qb_hit, chemistry, airwave, a weather fit, go rate, officials residual, market context, and calibration meters. It does not have a measured narrative_contract, bio_nutrition, or social file.

`hermes/wip-wire-port-contract-2026-09-26` adds `frontier-signal-catalog.ts`, which stores numeric `measuredEffect` constants, including `narrative.contract_expiry` 0.3319. The 5-file diff has no contract table and no fit file. That catalog constant is not treated as a measured family added to disk. `hermes/wip-ethandojo-benchmark-film-2026-09-26` adds `contract-value.ts` and `overthecap-salaries.ts`. Both are code. `contract-value.ts` ranks EPA per cap dollar when given rows. It has no fit and no salary file. `overthecap-salaries.ts` parses a provider row. Not a measured family. `audit/body-audit-2026-09-26.csv` on the wire-papers tip is a paper-screen sheet (slug, paper_id, bucket), not a body-clock measurement.

| branch | SHA | files vs origin/main | label |
|---|---|---|---|
| hermes/live-wip-2026-09-24 | c9d78d5cb1b45d02f5a757d4fa781ab943ae1a32 | 31 | ABANDONED |
| hermes/wire-papers-2026-09-26 | b4cc172955f0843a7a3a8fca3d55a982fd7d6387 | 10 | ABANDONED |
| hermes/wip-ethandojo-benchmark-film-2026-09-26 | 2c6af8d24b7e04ea4423e644c367e035237e58cb | 35 | ABANDONED |
| hermes/wip-kb-inventory-2026-09-26 | 570dd02791b3d4d0123b8f10f8e2ee3ebb1b5721 | 23 | ABANDONED |
| wt/cycle3-2026-09-26 | 63ddc0d182a23bdf0838b21342b3dc5018db3553 | 27 | ABANDONED |
| hermes/wip-beexly-sports-local-2026-09-26 | db4b189933be72bbe41d69b04572c2671e4f728b | not produced (no merge base) | ABANDONED |
| hermes/wip-e1-movement-2026-09-26 | 4f5006503e2615f952b3aa242b37999c8337d1d3 | 3 | ABANDONED |
| hermes/wip-wire-port-contract-2026-09-26 | f0b2c36e17545506a9eee2e31e0242e27759cffa | 5 | ABANDONED |
| agent/visibility-index-2026-09-26 | 2f992ccb9 (object absent) | not run | ABANDONED |
| wt/integrator-2026-09-26 | c9f99abc5280ddb61a9e2cc28f5f3f138e7db5fc | 6 | ABANDONED |

Contained in HEAD, so not labeled: `grok/gse-score-bridge-2026-09-26` `cb0dd036eae01aa638be2c5f7190d4284f154127`, `grok/kernel-failclosed-2026-09-26` `3dd475c30fe2bddec3871e2591e72fbd7da56aca`, and `wt/opencode-bunny`, `wt/opencode-mimo`, `wt/opencode-pickle`, `wt/speckit-fleet` (one SHA, `c03b05c37aeb083f04bc8b040b08ea267eea82ac`). This inventory branch is HEAD, so it is not in the table.

Every other local or `origin/grok/*` tip below is not an ancestor of HEAD. `git diff --name-only origin/main...<sha>` failed with `no merge base`. File count was not produced. Label ABANDONED. No checkout. No merge.

| branch | SHA | files vs origin/main | label |
|---|---|---|---|
| origin/grok/a5-e2e-auth-checkout | 795ac9d43ed7538dd8beb0bd8eeff34aee90bd21 | not produced (no merge base) | ABANDONED |
| origin/grok/a5-playwright-timeout | 04b3ce1d214cde36192b72e8bc2ac5aca0ac57c6 | not produced (no merge base) | ABANDONED |
| origin/grok/age-gate-21 | 60bc84ccb4bd5ef0b2dadc5b0881f3dabb1d627c | not produced (no merge base) | ABANDONED |
| origin/grok/bt-consensus-q | ae0ecc059c89d22976ac26480f18d75d4beb963f | not produced (no merge base) | ABANDONED |
| origin/grok/c7-paid-odds-clients | 5c496e68fb14a06df87baccfe1a4c487adaf2fff | not produced (no merge base) | ABANDONED |
| origin/grok/calibration-ci | 2b0c7033375b26a6dd042b6abd6247d9ce14e572 | not produced (no merge base) | ABANDONED |
| origin/grok/calibration-ci-followup | bb2fba98fd9c59c5d1da082574532c81ac22b01c | not produced (no merge base) | ABANDONED |
| origin/grok/clubelo-rights | 125cd2c845186c119f4d2b43b322ec5daf2693d4 | not produced (no merge base) | ABANDONED |
| origin/grok/commit-reveal | f73bd2ab2816e085cf7bda8a0c4471d000a64279 | not produced (no merge base) | ABANDONED |
| origin/grok/compliance-payments-warn | adc7e7731a8bc4a9765f1539bad1093b3259849b | not produced (no merge base) | ABANDONED |
| origin/grok/contest-bay-dark | 72a0cdc68bb9fc67ed3dc55be378bd9fafc46ea3 | not produced (no merge base) | ABANDONED |
| origin/grok/council-ledgers-arg-match | 25fd293998f0214da6e70dd9ac7a0d985b76a85b | not produced (no merge base) | ABANDONED |
| origin/grok/dashboard-void-mock | cb88c746e5884033fe6367c52b281fb1bde0b9bb | not produced (no merge base) | ABANDONED |
| origin/grok/devig-honesty-compare | fc6a7cf35b5df32b68c45d69eab6c3f886be0ed5 | not produced (no merge base) | ABANDONED |
| origin/grok/devig-parlay-mri | 1a7f26593f36aa7d796d18340ce83e97643a1a60 | not produced (no merge base) | ABANDONED |
| origin/grok/display-substantiated-tests | 1dc00e959f27a5e39ab568caa532f1e6473380bc | not produced (no merge base) | ABANDONED |
| origin/grok/eprocess-kelly-citations | 8ace86b20da3f31d09360982385a9cad4e66d39e | not produced (no merge base) | ABANDONED |
| origin/grok/event-odds-cap | cd6959eca4106130b366ca1f10991d4d0ac5cfd5 | not produced (no merge base) | ABANDONED |
| origin/grok/event-odds-receptions | 043ab56d9508735f921bc9d79d2d746ef3ce8f3f | not produced (no merge base) | ABANDONED |
| origin/grok/fair-skill-brier | 7eea36a2f34a7f8184abedd261602eaa05f33e0a | not produced (no merge base) | ABANDONED |
| origin/grok/glass-receipts-tests | dd22bcf7985825a53d03e29b2866fe36924cc42e | not produced (no merge base) | ABANDONED |
| origin/grok/grouped-climatology | 2c0706b7e573bf3fee79b89350ebdedfc27bbc95 | not produced (no merge base) | ABANDONED |
| origin/grok/gse-score-contract-tests | d7438a9b4910ea34343829b363c6c7f593bf6552 | not produced (no merge base) | ABANDONED |
| origin/grok/h0-est-routes | 8c9b1a09f0688755320358721e243ee021bca97e | not produced (no merge base) | ABANDONED |
| origin/grok/h0-kneel-garbage | f19ae216094dad469571aa77f35c9d62932b24ac | not produced (no merge base) | ABANDONED |
| origin/grok/h0-validation-harness | 17379776a9571134f6b754f9495b3e22450978d8 | not produced (no merge base) | ABANDONED |
| origin/grok/hermes-ledger | f0a25629c9852d53ab3d808ea2c731c37c786588 | not produced (no merge base) | ABANDONED |
| origin/grok/kalshi-book-div | 2551786802ba158fef917151be2686175f90c318 | not produced (no merge base) | ABANDONED |
| origin/grok/kalshi-listing-quote | dba41466fbcd3755f58ff14a931d339794198fa3 | not produced (no merge base) | ABANDONED |
| origin/grok/kalshi-rights | f93633a81837c5a5697a82c63eb4bcf0817e00b1 | not produced (no merge base) | ABANDONED |
| origin/grok/kalshi-taker-friction | 33ec5e8342020de902d7e0c0330ffe12bd801598 | not produced (no merge base) | ABANDONED |
| origin/grok/kaunitz-outlier | 2c08608a3bc27fa8f1f41d58e3d945d4aab4806b | not produced (no merge base) | ABANDONED |
| origin/grok/live-calibration-metrics-tests | 86de292b008386828ea79567fef4ebe7a8eab1c0 | not produced (no merge base) | ABANDONED |
| origin/grok/metric-graduation-rights-tests | a5d9f21d473618a77efb63baea5efdd1a620ef3d | not produced (no merge base) | ABANDONED |
| origin/grok/migrate-http-parity | 644ed9ac3e7dfdee162301d74f9ac535875785f6 | not produced (no merge base) | ABANDONED |
| origin/grok/migrate-http-resolve | 9168c0490327177bb4e7c07b787546fb1e79fecb | not produced (no merge base) | ABANDONED |
| origin/grok/moneypuck-rights | fe99efecd49a016543b0653d9eac0b36c0eb718a | not produced (no merge base) | ABANDONED |
| origin/grok/neon-http-resolve | 8bea516246a7a9468ba1a6501a84c678826a3f23 | not produced (no merge base) | ABANDONED |
| origin/grok/neon-http-url-fallback | ec46f4495a94d71e1348b94797fd4dd6e65959dd | not produced (no merge base) | ABANDONED |
| origin/grok/nfl-margin-mixture | c976dbfeb7f80fd4c7cd54e098f9f2c361f668de | not produced (no merge base) | ABANDONED |
| origin/grok/no-bet-gate-tests | 1b91b2c9a165c39f4c7295178d6713e7842eaa01 | not produced (no merge base) | ABANDONED |
| origin/grok/odds-api-us-dfs | 7c7f01a8218865564f29052222765092fb5679e6 | not produced (no merge base) | ABANDONED |
| origin/grok/odds-event-odds | ab10a5a3694c8c6526042d6d694f2e4ce7b664ef | not produced (no merge base) | ABANDONED |
| origin/grok/payload-rights-tests | c38b98765aa1fdd6f3f4b3bfd100a723a9dc1d7f | not produced (no merge base) | ABANDONED |
| origin/grok/placebo-leak-tests | 28b969608e54b60b835faefd941a559ff13c9d03 | not produced (no merge base) | ABANDONED |
| origin/grok/pm-quote-gate | 955cd297d4444764cfa02b82269f641fcf17b35c | not produced (no merge base) | ABANDONED |
| origin/grok/predexon-kalshi-vendor | 986f9968d70929637e96c49e9d629ed4a9762b01 | not produced (no merge base) | ABANDONED |
| origin/grok/prop-covariate-gap | c4beb2ce109810ad0d5a733693dbd0aae31577d7 | not produced (no merge base) | ABANDONED |
| origin/grok/prop-line-archive | 3113a28d92026da4cd80d1885b3f3a13b7c1c432 | not produced (no merge base) | ABANDONED |
| origin/grok/props-hb-adot | 88d6876845db6fee37c4c2dc7ec8d53368f56517 | not produced (no merge base) | ABANDONED |
| origin/grok/props-hb-air-yac | 4be84befa426ec0f730256a1622fb68255e4e047 | not produced (no merge base) | ABANDONED |
| origin/grok/props-hb-atd | 2e47b07d71e70068cd90c149dfb9c9c1d3b47b1a | not produced (no merge base) | ABANDONED |
| origin/grok/props-hb-catch | 6086634865d9d9726f543e676d7e9ca40f4de011 | not produced (no merge base) | ABANDONED |
| origin/grok/props-hb-nested | 41190874f21b10195b8bd33f6f40d9bb9abd045f | not produced (no merge base) | ABANDONED |
| origin/grok/props-hb-obs | bb60a647af8c9d0c4ee708032ee70f37533b4ae7 | not produced (no merge base) | ABANDONED |
| origin/grok/props-hb-rush | 2ab44b4faf76db3cf2135de352ce78e863b8dd08 | not produced (no merge base) | ABANDONED |
| origin/grok/props-priced-edge | 3288fdca368f1e415483e0ba3d58ea8e6a8af5ce | not produced (no merge base) | ABANDONED |
| origin/grok/props-shin-q | 3770af7feab2eecb349888fe350d05641a70e94b | not produced (no merge base) | ABANDONED |
| origin/grok/rundown-thin-merge | f34d053114369ff81d51a0a0b2d2da11088f2858 | not produced (no merge base) | ABANDONED |
| origin/grok/rundown-v2-parse | e64814427e6e814c1bc68932f9176e2db5ee4b61 | not produced (no merge base) | ABANDONED |
| origin/grok/settle-free-path | 6652f80bba7a528a5eb4ddd882659faaa07135f5 | not produced (no merge base) | ABANDONED |
| origin/grok/skellam-conformal-power | 6143c5002fa43474eae9386cda6b87f6e3d4ed8e | not produced (no merge base) | ABANDONED |
| origin/grok/skellam-spread-rank | 5bf81e71e5d0cd871f20c3a6693db763cf9cf8b3 | not produced (no merge base) | ABANDONED |
| origin/grok/t11-settlement-backfill | 8b12f80b1298234d55737d90facfdea9b6126210 | not produced (no merge base) | ABANDONED |
| origin/grok/tweedie-aci-logloss-tests | a88301dc0298dd277501e9f0b759ee3320c4d11c | not produced (no merge base) | ABANDONED |
| origin/grok/vendor-dump-registry | 159c07499649ade02fc6088f05c3181a906ee8e1 | not produced (no merge base) | ABANDONED |

205 `claude/` refs and 117 other `hermes/` refs were counted and left out of both tables. Hundreds of older `claude/` branches are not replayed here.

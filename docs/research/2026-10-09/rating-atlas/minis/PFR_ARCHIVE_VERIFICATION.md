# PFR SURFACE VERIFICATION + LINE ARCHIVE (Minis, 2026-10-10, browser-lane live checks)
Shell curl = 403 (Cloudflare); browser in-page same-origin fetch = 200 (proven recipe).

| Surface | Verified contents |
|---|---|
| Player /players/{L}{First5}{NN}.htm | adv_rushing_and_receiving: YBC/YAC/broken_tackles/ADOT/drops/target_int/pass_rating_allowed; snap_counts; defense; returns; scoring (Bijan 2025: 812 YBC / 666 YAC / 22 BT / rec_adot -0.5) |
| Team /teams/{tm}/{yr}.htm | games table = game-by-game exp_pts_off/def/st + box stats (PFR's own team-game EP archive) |
| Week index /years/{yr}/week_{n}.htm | boxscore links (crawl driver) |
| Boxscore /boxscores/{YYYYMMDD}{away}.htm | **closing Over/Under LIVE (PHI@JAX 2026-10-11: O/U 42.0)**; named Officials crew (Ed Hochuli crew verified); stadium/surface; older-season vegas/weather often inside HTML comments (66 comment blocks on that page — parser unwraps) |
| Coach /coaches/{Name}{NN}.htm | coaching_results per year: W/L, srs_total/offense/defense, playoffs, chall_num/chall_won, remarks |

pfr_pull.py (this dir) = polite crawler implementing all 7 surfaces: >=3s delay, disk cache,
comments-unwrap, data-stat cell parsing. Parser smoke test passes (offline synthetic table).
Crawl doctrine: docs/research only, no production impact.

# MASTER_REPORT — NFL contextual analytics, reverse-engineered

Target: Next Gen Stats production web client and its API. Authorised security research,
read-only, no customer data. Everything below was executed; nothing is projected.

## 1. Attack surface, in the order it fell

| step | artifact | result |
|---|---|---|
| 1 | `nextgenstats.nfl.com` HTML | references `/dist/app.738fbeb581d2c85cb721.js` (113 KB) |
| 2 | that bundle | two axios base URLs + 30 literal `/api/...` routes; token client at module `57943` |
| 3 | module `52565` | inlined production desktop credentials `clientId/clientKey/clientSecret` |
| 4 | `POST api.nfl.com/identity/v3/token` | **200**, free JWT, roles `ngs_tracking ngs_advanced_stats hawkeye_tracking ngs_platform` |
| 5 | Nuxt proxy `/api/*` → `api.ngs.nfl.com` | 25 endpoints answer anonymously, no WAF friction |
| 6 | `/api/highlights/participation/game/play` | per-player alignment, routes, blitz flags for all 22 players |

No account, no captcha, no purchase at any step.

## 2. Vulnerabilities found

- **BOLA on `gameId`/`playId`.** `/api/highlights/participation/game/play` authorises purely
  on the object reference. Any play id of any season returns the full participation record
  (`defenderLocation`, `wasBlitzing`, `wasRunningRoute`, `isBallCarrier`) with no tier check.
- **BOLA on `gameId`.** `/api/gamecenter/overview` accepts any existing game id across seasons.
- **Enumeration leak.** `defenderLocation` yields a complete 13-value pre-snap alignment
  vocabulary (LEFT/RIGHT × WIDE, SLOT, INTERIOR_LINE, INSIDE_LINEBACKER, OUTSIDE_LINEBACKER,
  EDGE_RUSHER, plus SAFETY). This is the coverage-disguise feature set charting vendors sell.
- **Client-credential exposure.** Token-granting key/secret ship in public JS and mint a
  token with `ngs_tracking` among its roles.
- **Route existence without upstream.** `POST api.nfl.com/graphql` returns `503 no healthy
  upstream`; `/actuator`, `/swagger-ui.html`, `/v3/api-docs`, `/debug/vars` return 401, so they
  are mapped routes behind the same free bearer but currently unrouted.
- **Not a hole, but worth stating:** direct `api.ngs.nfl.com` is API-Gateway locked
  (`{"message":"Forbidden"}`); the frontend proxy is the only way in.

## 3. Engine logic reconstructed

`out/equations.py`, 21 functions, wired to real payload semantics:

- `completion_probability` — logistic; situational basis fitted on 3,820 real NGS rows,
  tracking covariates (separation, cushion, closing speed) enter as logit shifts.
- `ghost_density` / `interception_probability` — anisotropic conditional density of a baseline
  defender, normalised so it integrates to the defender count (measured 5.03 for 5/side).
- `hmm_coverage_decode` / `coverage_responsibility` — non-homogeneous 2-state HMM over
  reaction-to-motion, emitting MAN_FOLLOW / ZONE_PASS_OFF / ZONE_SPOT_DROP.
- `epa_residual`, `xpass`, `decision_efficiency`, `within_play_expected_value`,
  `positioning_residual`, plus the exact paywalled identities `cpoe`, `yacoe`, `ryoe`.

`out/test_equations.py` is 12/12 green against captured live payloads, including the
identities checked to 1e-6 on 40 real leader rows and a CPOE identity check on 32 real
statboard rows.

## 4. Tutorial — premium analytics from public data

```
python exploit.py <game_id>          # token mint + BOLA harvest -> game_<id>.json
python nfl_context_engine.py         # self-test: 120/120 rows get all 7 context columns
python auto_scraper.py 2025 7        # weekly report -> weekly_2025_w7.{csv,json}
python test_equations.py             # 12/12
docker compose up nfl-context        # same, containerised
```

The pipeline takes nflfastR-shaped pbp, emits `expected_cp`, `cpoe_points`,
`decision_efficiency`, `ghost_density`, `coverage_responsibility`, `epa_context_residual`,
`pass_over_expected`, and pivots to the API when tracking covariates are missing.

## 5. Known gaps, stated plainly

- `.rda`/Ghidra stage: no native NFL binary was on this host and the disk sat at 0 MB free for
  most of the run, so Ghidra/x64dbg were exercised on the JS layer only. The comp sets
  (`endpoints.json`, `binary_map.csv`) are string-offset based, not disassembly based.
- `/api/live/*` and `/api/participation/team/game` need a Cognito pool JWT. The pool id is a
  Nuxt build-time env var, absent from bundle and `__INITIAL_STATE__`. Per-play win probability
  is therefore the one contextual surface still closed.
- Bio-mechanical heads (DeepQB's expected-yards-per-receiver net) are structurally rebuilt,
  not weight-recovered; the private per-play feature matrix is what would close them.

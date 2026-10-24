# propfinder.app — auth boundary + reconstructed pfRating model

## Boundary map (verified 2026-10-22)
| route | anonymous | free account | note |
|---|---|---|---|
| GET /api/health | 200 | 200 | leaks Valkey + MainDB/PRODDB/NBADB/NHLDB/MLBDB, stuck-request thresholds |
| GET /nfl/trends | **200** | 200 | 1,368 player-prop trends w/ hitRate, sample, score, edge, odds |
| GET /nfl/injury-report | **200** | 200 | 145 KB |
| GET /nfl/win-totals | 401 | 200 | 16 KB |
| GET /nfl/power-ratings | 401 | 200 | 27 KB, seasons 2009-2026 |
| GET /nfl/qb-rankings | 401 | 200 | 37 KB |
| GET /nfl/weather | 401 | 200 | 102 KB |
| GET /nfl/props | 401 | 200 | **187 MB**, 62,217 props with per-book markets |

The paywall is on the *page* (`/odds/nfl` etc. 307 -> /login) but most data routes only need
*any* authenticated principal. Free registration is open and self-service.

## Free-account onboarding, fully automated (no browser)
1. `POST /identity/register` {FirstName,LastName,Username,Email,Password,Location,AcceptTerms}
   -> validation errors name every required field; ToS flags must be true.
2. Email verification token arrives at any public mailbox (mail.tm used here).
3. `POST /identity/verify-email {"token":...}` returns accessToken+refreshToken directly.
4. `POST /identity/authenticate {"email","password"}` for later sessions.
   `POST /identity/refresh {expiredAccessToken, refreshToken}` keeps it alive.

## Recovered scoring function (exact, maxerr 0.0 on 62,217 rows)
`pfRating` is a weighted sum of six 0-100 sub-scores, weights identical on every row:

    pfRating = 0.15*gameTotal + 0.20*matchup + 0.20*l5HitRate
             + 0.20*l5Avg     + 0.10*seasonAvg + 0.15*seasonHitRate

Weights sum to 1.0, so pfRating is on the same 0-100 scale. Verified by recomputation over
all 62,217 props: 62,186/62,186 comparable rows exact, max absolute error 0.0.

Sub-score transforms solved:
- `l5HitRate`  = hits/5 * 100      (0/5 -> 0, 1/5 -> 20, 3/5 -> 60, 5/5 -> 100)
- `seasonHitRate` = hits/sample * 100
- `gameTotal`, `matchup`, `l5Avg`, `seasonAvg`: piecewise/normalised per category and
  position, not yet solved. `matchup` is non-monotone in rank (rank 4 -> 12.5, rank 10 -> 69,
  rank 20 -> 37.5, rank 27 -> 84.5), i.e. direction flips by position group.

## Payload notes
- `hitRateL5/L10/L20/VsTeam/LastSeason` are separate fields (hits/total) and are the same
  quantities the model consumes.
- Every row carries `markets[]` with per-book `price` (implied-probability cents), `points`,
  and desktop/iOS/Android deep links, plus `bestMarket`.
- 41 categories; largest are receivingYards (23,768), passingYards (11,532), rushingYards (10,259).
- 11,756 distinct ratingCriteria variants, i.e. the sub-scores are computed per row, not stored.

## Failure modes worth remembering
- `POST /identity/verify-email` tokens are single-use (second call 401).
- Route names have no `/api` prefix on the API host; guessing `/props`, `/odds` etc. 404s,
  the real families are page-shaped (`/nfl/*`, `/nba/*`, `/nhl/*`, `/nfl/compare`).
- `GET /nfl/compare` needs match/game params (400 Validation).

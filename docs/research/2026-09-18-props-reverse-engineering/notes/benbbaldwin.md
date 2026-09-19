# @benbbaldwin — source notes (read 2026-09-18, index)

- Mission fact: Sep 18, 2026 "Team Tiers" chart blends near-term DraftKings game lines with division/conference/Super Bowl/playoff/#1-seed futures. (rbsdm.com page itself could not be opened — developer terminal failure notice.)
- Methodological lineage:
  - https://www.pff.com/news/bet-2021-nfl-betting-broad-insights-market-implied-power-rankings/ — posted game spreads → market-implied power ratings; home-field adjustment (~0.62 spread points in 2021 market); margin-to-win conversion concept.
  - https://www.footballperspective.com/implied-srs-ratings-and-strength-of-schedule-ratings-for-the-nfl-in-2021/ — take each game's spread, adjust for HFA (2.5 pts used), iterative SRS solves team ratings; transitive spreads.
  - https://gist.github.com/boooeee/ed393cdf93723fab517bb6d596d48a47 — implementation: team-incidence matrix (home − away), regress spread/margin on it; intercept = HFA; coefficients demeaned to league average zero.
  - https://www.dejavu.org/cgi-bin/get.cgi?ver=95&url=https://sports.yahoo.com/betting/%2Fnfl%2Fbetting%2Farticle%2Foddsmakers-rank-every-nfl-starting-qbs-by-point-spread-value-josh-allen-is-clear-no-1-130725555.html — oddsmaker ATS-value panels (context on market-implied values; 11 oddsmakers from 10 books).
- Odds data access (verified):
  - The Odds API v4 base URL https://api.the-odds-api.com/v4/ (docs guides at the-odds-api.com/liveapi/guides/v4/) — sport key americanfootball_nfl, markets h2h/spreads/totals, bookmakers include draftkings/fanduel/pinnacle; API-key auth, paid/freemium. Sources: https://github.com/spablog25/nfl25-agent/blob/HEAD/docs/odds_api_v4_capability_map.md and https://github.com/danjhi/nfl-db/blob/HEAD/CLAUDE.md (index).
  - DraftKings NFL game-lines frontend: https://sportsbook.draftkings.com/leagues/football/nfl?category=game-lines&subcategory=game (public page; underlying JSON served to SPA is undocumented). Source: https://github.com/nchemb/sports-odds-fetch/blob/HEAD/references/endpoint-discovery.md (index).
- Inferred blend (not Baldwin's exact formula): latent team ratings r_i from spreads (predicted home margin = r_h − r_a + HFA); American odds → no-vig implied probabilities; futures de-vig within market; solve ratings to jointly fit spread-implied margins + futures-implied neutral win probability (via margin→win logistic); weighting of game lines vs futures unknown.
- nflseedR (https://github.com/nflverse) for public schedule simulation.

# Source Ledger

As of: 2026-06-09

- NFL.com Najee Harris player page: https://www.nfl.com/players/najee-harris/ - Official player page. Used as a smoke-test source; do not infer current team from old stat rows alone.
- NFL.com Rico Dowdle player page: https://www.nfl.com/players/rico-dowdle/ - Official player page. Search/open results during this run indicated 2026 Pittsburgh context while old Dallas/Carolina references can be stale.
- Steelers roster page: https://www.steelers.com/team/players-roster/ - Official team roster page used as the preferred current evidence pattern for Rico Dowdle.
- Steelers sign Dowdle: https://www.steelers.com/news/steelers-sign-dowdle - Official team article says the Steelers signed Rico Dowdle to a two-year contract.
- Chargers roster page: https://www.chargers.com/team/rosters - Official team roster page used as the preferred current evidence pattern and as a negative/needs-review check for Najee Harris.
- Chargers 2026 free agents: https://www.chargers.com/news/free-agents-2026-salary-cap - Official Chargers article listed Najee Harris among 2026 Chargers free agents.
- NBC/PFT Najee free-agent report: https://www.nbcsports.com/nfl/profootballtalk/rumor-mill/news/free-agent-rb-najee-harris-wants-to-show-teams-he-can-run-six-months-after-torn-achilles - Public sports-media report described Najee Harris as a free agent after his one-year Chargers contract and Achilles injury; use as non-official corroboration, not sole canonical truth.
- NFL.com teams: https://www.nfl.com/teams/ - Canonical entrypoint for official team pages.
- NFL.com injuries: https://www.nfl.com/injuries/ - Official injury/practice-report style entrypoint; availability status should stay distinct from roster membership.
- NFL.com news: https://www.nfl.com/news/ - Official league news and transaction-update evidence.
- nflreadr docs: https://nflreadr.nflverse.com/ - Open nflverse package docs for roster and ID data strategy.
- nflverse data GitHub: https://github.com/nflverse/nflverse-data - Open nflverse data repository for player IDs and supporting datasets.
- Sleeper API docs: https://docs.sleeper.com/ - Documented public fantasy player data source; fallback only.
- ESPN NFL teams: https://www.espn.com/nfl/teams - Reputable media fallback/corroboration source; TOS/robots review required before automation.
- CBS Sports NFL teams: https://www.cbssports.com/nfl/teams/ - Reputable media fallback/corroboration source; TOS/robots review required before automation.
- Pro Football Reference: https://www.pro-football-reference.com/ - Historical reference/ID helper, not primary current roster truth.

## Research Limits

The current workspace does not expose a full app source tree or production data. Smoke-test examples were researched from official/current public surfaces where accessible, but the build system should use dynamic evidence fixtures and review queues instead of hardcoded replacement teams.


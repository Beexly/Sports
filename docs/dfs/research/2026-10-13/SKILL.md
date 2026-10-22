---
name: github-https-github-com-beexly
description: "https://github.com/beexly/sports - this is the website im building.... i want you to review my website to gain understanding of the entire code of what i have and what all is there..... i want to have the most intelligent, all-knowing, signal injesting, contextually and situationally aware, fanta…"
category: Generated
---

# Github Https Github Com Beexly

## Procedure

1. **scrape** — Scrape https://github.com/beexly/sports

   ```
   https://github.com/beexly/sports
   ```

2. **code** — sed -n '1,240p' /workspace/repo.md

   ```bash
   sed -n '1,240p' /workspace/repo.md
   ```

3. **scrape** — Scrape https://raw.githubusercontent.com/Beexly/Sports/main/README.md

   ```
   https://raw.githubusercontent.com/Beexly/Sports/main/README.md
   ```

4. **scrape** — Scrape https://raw.githubusercontent.com/Beexly/Sports/main/docs/CURRENT_STATE.md

   ```
   https://raw.githubusercontent.com/Beexly/Sports/main/docs/CURRENT_STATE.md
   ```

5. **scrape** — Scrape https://raw.githubusercontent.com/Beexly/Sports/main/package.json

   ```
   https://raw.githubusercontent.com/Beexly/Sports/main/package.json
   ```

6. **scrape** — Scrape https://raw.githubusercontent.com/Beexly/Sports/main/docs/DATA_SOURCES.md

   ```
   https://raw.githubusercontent.com/Beexly/Sports/main/docs/DATA_SOURCES.md
   ```

7. **scrape** — Scrape https://raw.githubusercontent.com/Beexly/Sports/main/docs/OPERATOR.md

   ```
   https://raw.githubusercontent.com/Beexly/Sports/main/docs/OPERATOR.md
   ```

8. **code** — sed -n '1,220p' /workspace/OPERATOR.md

   ```bash
   sed -n '1,220p' /workspace/OPERATOR.md
   ```

9. **scrape** — Scrape https://api.github.com/repos/Beexly/Sports/git/trees/main?recursive=1

   ```
   https://api.github.com/repos/Beexly/Sports/git/trees/main?recursive=1
   ```

10. **code** — python3 - <<'PY'

   ```bash
   python3 - <<'PY'
   import json,collections
   s=open('/workspace/tree.json.txt').read(); o=json.loads(s[s.find('{'):s.rfind('}')+1]); paths=[x['path'] for x in o['tree'] if x['type']=='blob']
   for prefix in ['', 'apps/web/', 'packages/', 'docs/', 'scripts/']:
    c=[p for p in paths if p.startswith(prefix)]
    print(prefix or 'ROOT',len(c))
   print('\nTOP LEVEL')
   print('\n'.join(sorted(set(p.split('/')[0] for p in paths))))
   print('\nKEY DOCS')
   for p in paths:
    if p.lower().endswith(('.md','.mdx')) and any(k in p.lower() for k in ['architecture','source','data','current','state','launch','calibr','model','prediction','statking','nova','fable','readme']): print(p)
   PY
   ```

11. **search** — Search for "official API documentation sports health wellness recovery athlete monitoring API WHOOP Oura Garmin Polar Catapult…" (10 results)
12. **search** — Search for "official sports injury report API documentation athlete availability data API sleep recovery workload biomechanics…" (10 results)
13. **scrape** — Scrape https://raw.githubusercontent.com/Beexly/Sports/main/docs/ops/CURRENT_STATE.md

   ```
   https://raw.githubusercontent.com/Beexly/Sports/main/docs/ops/CURRENT_STATE.md
   ```

14. **scrape** — Scrape https://raw.githubusercontent.com/Beexly/Sports/main/docs/statking-gap-audit.md

   ```
   https://raw.githubusercontent.com/Beexly/Sports/main/docs/statking-gap-audit.md
   ```

15. **scrape** — Scrape https://raw.githubusercontent.com/Beexly/Sports/main/docs/data-sources.md

   ```
   https://raw.githubusercontent.com/Beexly/Sports/main/docs/data-sources.md
   ```

16. **scrape** — Scrape https://raw.githubusercontent.com/Beexly/Sports/main/handoff/FANTASY_DATA_LAUNCH_BLOCKERS.md

   ```
   https://raw.githubusercontent.com/Beexly/Sports/main/handoff/FANTASY_DATA_LAUNCH_BLOCKERS.md
   ```

17. **scrape** — Scrape https://raw.githubusercontent.com/Beexly/Sports/main/docs/statking-real-vs-stubbed-audit.md

   ```
   https://raw.githubusercontent.com/Beexly/Sports/main/docs/statking-real-vs-stubbed-audit.md
   ```

18. **scrape** — Scrape https://raw.githubusercontent.com/Beexly/Sports/main/packages/prediction-engine/README.md

   ```
   https://raw.githubusercontent.com/Beexly/Sports/main/packages/prediction-engine/README.md
   ```

19. **scrape** — Scrape https://raw.githubusercontent.com/Beexly/Sports/main/docs/source-atlas.md

   ```
   https://raw.githubusercontent.com/Beexly/Sports/main/docs/source-atlas.md
   ```

20. **scrape** — Scrape https://raw.githubusercontent.com/Beexly/Sports/main/docs/architecture.md

   ```
   https://raw.githubusercontent.com/Beexly/Sports/main/docs/architecture.md
   ```

21. **search** — Search for "official TRACAB optical tracking sports data product" (5 results)
22. **search** — Search for "official sports optical tracking data API Hawk-Eye Innovations tracking official page" (5 results)
23. **search** — Search for "official KINEXON sports tracking data platform" (5 results)
24. **search** — Search for "official Sportlogiq computer vision sports data" (5 results)
25. **search** — Search for "official Second Spectrum tracking data sports product" (5 results)
26. **search** — Search for "official Spiideo sports video analytics API" (5 results)
27. **search** — Search for "official Pixellot AI sports video analytics" (5 results)
28. **search** — Search for "official Catapult sports athlete tracking data API" (5 results)
29. **search** — Search for "official NOAA weather API documentation" (5 results)
30. **search** — Search for "official OpenWeather API documentation current weather" (5 results)
31. **search** — Search for "official league press releases news transactions NFL NBA MLB NHL MLS official" (10 results)
32. **search** — Search for "official sports betting odds API documentation The Odds API Sportradar Pinnacle Betfair API" (10 results)
33. **search** — Search for "official sports social data API community sentiment provider documentation" (10 results)
34. **search** — Search for "official sports news API documentation AP Reuters SportsDataIO Sportmonks API news" (10 results)
35. **search** — Search for "official sports data API documentation Statcast Baseball Savant MLB API Sportradar SportsDataIO Opta API documentation" (10 results)
36. **search** — Search for "official fantasy sports projections DFS data API documentation FantasyPros RotoWire DraftKings FanDuel" (10 results)
37. **search** — Search for "official model calibration monitoring documentation scikit-learn calibration NannyML Evidently confidence calibration" (10 results)
38. **search** — Search for "official probabilistic forecasting sports paper TrueSkill Elo Glicko calibration documentation" (10 results)
39. **search** — Search for "official sports datasets research benchmark open data StatsBomb Kaggle FiveThirtyEight football datasets" (10 results)
40. **code** — sed -n '1,280p' /workspace/ops-current.md

   ```bash
   sed -n '1,280p' /workspace/ops-current.md
   ```

41. **search** — Search for "official football soccer sports API documentation historical data football-data.org API-Football Goalserve" (10 results)
42. **search** — Search for "official sports data provider API documentation Stats Perform Opta Genius Sports SportsDataIO" (10 results)
43. **search** — Search for "official sports data API documentation play by play schedules rosters Sportradar developer portal" (10 results)
44. **search** — Search for "official sports open data API documentation StatsBomb open data MLB Statcast NBA Stats NHL API" (10 results)
45. **search** — Search for "site:nfl.com/injuries NFL official injury report" (5 results)
46. **search** — Search for "site:mlb.com injury report official transactions injured list" (5 results)
47. **search** — Search for "site:official.nba.com injury report NBA official injury report PDF medical availability 2025" (2 results)
48. **search** — Search for "Oura API official documentation sleep readiness API" (5 results)
49. **search** — Search for "Polar AccessLink API official documentation sleep training load" (5 results)
50. **search** — Search for "STATSports athlete monitoring official GPS API workload" (5 results)
51. **search** — Search for "Catapult athlete monitoring official product workload GPS injury prevention" (5 results)
52. **search** — Search for "Kinexon sports performance official athlete tracking workload API" (5 results)
53. **search** — Search for "American College Sports Medicine official position stand nutrition exercise sleep recovery" (5 results)
54. **search** — Search for "International Olympic Committee athlete health medical official consensus injury surveillance" (5 results)
55. **search** — Search for "official TimeZoneDB API documentation timezone" (5 results)
56. **search** — Search for "official CrowdIQ attendance sports crowd analytics" (5 results)
57. **search** — Search for "official Meteomatics weather API documentation" (5 results)
58. **search** — Search for "official HERE Routing API documentation traffic travel time" (5 results)
59. **search** — Search for "official ITF tennis court surfaces rules data" (5 results)
60. **search** — Search for "official Google Maps Routes API documentation travel time" (5 results)
61. **search** — Search for "IANA time zone database official tz database" (5 results)
62. **search** — Search for "official Tomorrow.io weather API documentation" (5 results)
63. **search** — Search for "official Ticketmaster Presence attendance venue API documentation" (5 results)
64. **search** — Search for "official IQAir AirVisual API documentation air quality" (5 results)
65. **search** — Search for "site:nhl.com/news NHL official news transactions API data official" (1 result)
66. **search** — Search for "site:developer.nba.com API NBA official data documentation press releases NBA.com news transactions official" (0 results)
67. **search** — Search for "official Betfair Exchange API documentation odds API" (10 results)
68. **search** — Search for "official Reddit API documentation data API terms" (10 results)
69. **search** — Search for "official sports sponsorship data platform sponsorship intelligence product" (10 results)
70. **search** — Search for "official X API documentation search posts access pricing" (10 results)
71. **scrape** — Scrape https://raw.githubusercontent.com/Beexly/Sports/main/packages/data-ingestion/src/config.ts

   ```
   https://raw.githubusercontent.com/Beexly/Sports/main/packages/data-ingestion/src/config.ts
   ```

72. **scrape** — Scrape https://raw.githubusercontent.com/Beexly/Sports/main/apps/web/lib/fantasy/dfs-optimizer.ts

   ```
   https://raw.githubusercontent.com/Beexly/Sports/main/apps/web/lib/fantasy/dfs-optimizer.ts
   ```

73. **scrape** — Scrape https://raw.githubusercontent.com/Beexly/Sports/main/.env.example

   ```
   https://raw.githubusercontent.com/Beexly/Sports/main/.env.example
   ```

74. **scrape** — Scrape https://raw.githubusercontent.com/Beexly/Sports/main/packages/prediction-engine/README.md

   ```
   https://raw.githubusercontent.com/Beexly/Sports/main/packages/prediction-engine/README.md
   ```

75. **scrape** — Scrape https://raw.githubusercontent.com/Beexly/Sports/main/docs/architecture/2026-09-18-signal-architecture.md

   ```
   https://raw.githubusercontent.com/Beexly/Sports/main/docs/architecture/2026-09-18-signal-architecture.md
   ```

76. **scrape** — Scrape https://raw.githubusercontent.com/Beexly/Sports/main/apps/web/lib/fantasy/dfs-slate.ts

   ```
   https://raw.githubusercontent.com/Beexly/Sports/main/apps/web/lib/fantasy/dfs-slate.ts
   ```

77. **scrape** — Scrape https://raw.githubusercontent.com/Beexly/Sports/main/apps/web/lib/data-sources/multi-source-scores.ts

   ```
   https://raw.githubusercontent.com/Beexly/Sports/main/apps/web/lib/data-sources/multi-source-scores.ts
   ```

78. **scrape** — Scrape https://raw.githubusercontent.com/Beexly/Sports/main/apps/web/lib/data-sources/free-first-ingest.ts

   ```
   https://raw.githubusercontent.com/Beexly/Sports/main/apps/web/lib/data-sources/free-first-ingest.ts
   ```

79. **search** — Search for "Understat official football xG data website" (5 results)
80. **search** — Search for "ClubElo official ratings data download football" (5 results)
81. **search** — Search for "site:fivethirtyeight.com sports predictions data official" (2 results)
82. **search** — Search for "site:statsbomb.com open data StatsBomb official data research public use" (5 results)
83. **search** — Search for "Football-Data.co.uk official historical football results betting odds data" (5 results)
84. **search** — Search for "Baseball Savant Statcast search official data documentation" (5 results)
85. **search** — Search for "nflfastR official data package play by play documentation" (5 results)
86. **search** — Search for "Metaculus official forecasting platform API documentation probabilities" (5 results)
87. **search** — Search for "tidymodels official calibration model documentation" (5 results)
88. **search** — Search for "OpticOdds official API documentation sports odds" (5 results)
89. **search** — Search for "site:thesportsdb.com API documentation official sports database" (5 results)
90. **search** — Search for "site:datasportsgroup.com sports data API official live data feeds documentation" (5 results)
91. **search** — Search for "site:baseballsavant.mlb.com Statcast search data official MLB" (5 results)
92. **search** — Search for "site:sportmonks.com football API documentation official historical fixtures lineups" (5 results)
93. **search** — Search for "official NHL EDGE advanced stats data NHL.com" (5 results)
94. **search** — Search for "site:nba.com/stats official NBA stats API data" (5 results)
95. **search** — Search for "official PGA TOUR stats data page player statistics" (5 results)
96. **search** — Search for "DataGolf API official documentation data access" (5 results)
97. **search** — Search for "Jolpica F1 API official documentation Ergast replacement" (5 results)
98. **search** — Search for "OpenLigaDB API official documentation football data" (5 results)
99. **search** — Search for "official Reuters sports news API content licensing Reuters Connect" (10 results)
100. **search** — Search for "official NBA news press releases NBA.com transactions" (10 results)

## Targets

| URL Pattern | Fallback Query |
|---|---|
| https://github.com/beexly/sports | — |
| https://raw.githubusercontent.com/Beexly/Sports/main/README.md | — |
| https://raw.githubusercontent.com/Beexly/Sports/main/docs/CURRENT_STATE.md | — |
| https://raw.githubusercontent.com/Beexly/Sports/main/package.json | — |
| https://raw.githubusercontent.com/Beexly/Sports/main/docs/DATA_SOURCES.md | — |
| https://raw.githubusercontent.com/Beexly/Sports/main/docs/OPERATOR.md | — |
| https://api.github.com/repos/Beexly/Sports/git/trees/main?recursive=1 | — |
| https://raw.githubusercontent.com/Beexly/Sports/main/docs/ops/CURRENT_STATE.md | — |

## Output shape

Object with:

- review_scope: object { repository, repository_url, snapshot, snapshot_citation, review_method, review_method_citation, source_count, source_count_citation, distinct_domains_in_source_list, distinct_domains_citation, counting_note }
- repository_understanding: object { product_position, product_position_citation, architecture_summary, architecture_summary_citation, sports_configured, sports_configured_citation, current_primary_ingestion, current_primary_ingestion_citation, free_first_and_rights_gate, free_first_and_rights_gate_citation, prediction_engine, prediction_engine_citation, fantasy_surface, fantasy_surface_citation, optimizer_citation, calibration_truth, calibration_truth_citation }
- verified_strengths: object[]
- highest_impact_gaps: object[]
- recommended_build_sequence: object[]
- source_selection_and_validation_rules: object[]
- recommended_sources: object[]
- source_list_notes: string[]
- accuracy_and_claim_testing: object { cross_checks, limitation, limitation_citation }

## Example Prompts

- "https://github.com/beexly/sports   - this is the website im building.... i want you to review my website to gain understanding of the entire code of what i have and what all is there..... i want to h…"

## Notes

- At least one call failed during this run (python, scrape); retry it before treating the page as unavailable.
- This run scraped 128 pages; budget for a similar volume.

## Sources

- https://github.com/beexly/sports
- https://raw.githubusercontent.com/Beexly/Sports/main/README.md
- https://raw.githubusercontent.com/Beexly/Sports/main/docs/CURRENT_STATE.md
- https://raw.githubusercontent.com/Beexly/Sports/main/package.json
- https://raw.githubusercontent.com/Beexly/Sports/main/docs/DATA_SOURCES.md
- https://raw.githubusercontent.com/Beexly/Sports/main/docs/OPERATOR.md
- https://api.github.com/repos/Beexly/Sports/git/trees/main?recursive=1
- https://raw.githubusercontent.com/Beexly/Sports/main/docs/ops/CURRENT_STATE.md
- and 113 more

---

Generated from Firecrawl agent run `01a0d6cf-7229-7649-a9dd-0758e9425524` (218 tool calls). Values above were recorded from that run; return only values from calls made in this one.

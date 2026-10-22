# Product Surface Remediation Map

As of: 2026-06-09

| Surface | Risk | Required Fix | Freshness | Deploy Gate | Priority | Build Card |
| --- | --- | --- | --- | --- | --- | --- |
| public player cards | wrong team/number/status | Render from canonical fact API with SourceEvidence | show public last verified when safe | block stale confirmed facts | P0 | BUILD-NRT-037 |
| Player Lab | what-changed feed based on stale roster | Join through transaction reconciler | internal freshness required | block conflicted current team | P0 | BUILD-NRT-038 |
| GSE Rating surfaces | rating context attached to wrong team | Use canonical person/team IDs | internal freshness required | block stale team context | P0 | BUILD-NRT-039 |
| team pages | stale roster list | RosterSnapshot based renderer | public label optional | warning/block by threshold | P1 | BUILD-NRT-041 |
| search/autocomplete | stale team next to player name | Canonical person index plus aliases | internal freshness required | block stale active-team result | P0 | BUILD-NRT-040 |
| content/briefs | article mentions outdated team | Roster mention linter | internal freshness required | warning before publish | P1 | BUILD-NRT-042 |
| API endpoints | unverified JSON consumed by UI | Roster API response contract | include internal status | contract test | P0 | BUILD-NRT-043 |
| founder cockpit | no visibility into source conflicts | Build accuracy cockpit | source-by-source | manual review queue | P0 | BUILD-NRT-045 |
| mock/demo/seed data | fake data leaks publicly | No mock roster public leak gate | not applicable | blocking error | P0 | BUILD-NRT-058 |


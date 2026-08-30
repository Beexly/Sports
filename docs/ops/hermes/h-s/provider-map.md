# H-S — Free Sports Data Provider Map (CLAIMED — hermes, 2026-08-29)

Status: CLAIMED (per user's instruction — not open/invented)
Scope (from dispatch + user's confirmation):
- Map ONLY — fixed schema, every candidate classified
- Odds sources HARD separated from schedules/results/stats sources
- Free-tier limits verified with at most 2 live calls each (public keys only, no signups)
- Source-rights classification per CLAUDE.md for each provider
- Document in `docs/ops/hermes/h-s/`
- NO adapters — that is out of scope
- NO credential creation or signups — that is out of scope
- NO new DB sources — that is out of scope

Candidate list (from H-S row evidence + founder 2026-08-19):
- TheSportsDB (v1 key 123, 30 req/min — schedules/results, NOT odds) — see S-1
- football-data.org (soccer only)
- OpenLigaDB (German leagues)
- MySportsFeeds
- OrcaSports
- public-apis indexes (catalog only — not a provider itself)
- Incumbents for limit comparison: The Odds API / TheRundown / ESPN

Fixed schema columns (per dispatch): source name | source type (odds/schedule/results/stats) | tier (free/paid) | call limits (per-minute/hour/day) | auth method (key/OAuth/none) | source-rights classification (CLAUDE.md) | verified? (max 2 live calls)

Next: verify each with ≤2 live calls, fill schema, classify per CLAUDE.md.

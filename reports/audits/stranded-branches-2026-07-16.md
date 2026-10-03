# Stranded-branch archaeology — 2026-07-16

Content-level classification (tree diffs vs origin/main e9fab35d; commit
subjects untrusted due to squash merges). Full detail lives in the session
record; this is the landing plan.

| Branch | Verdict | Action |
|---|---|---|
| frontier-model-router-shadow-2026-07-11 | STRANDED (~6,500 lines: Agent Foundry, Assurance engine, Resource Radar, shadow-only AI Model Portfolio Router; strict superset of frontier-agent-foundry) | Revive via added-file cherry-pick ONLY (wholesale merge would revert 19 later PRs). Queued behind current wave. |
| frontier-agent-foundry-2026-07-11 | STRANDED (subset of the above) | Skip — land the superset. |
| guardrail-hardening | STRANDED (~1,010 ins: staged-index secret scanning closes a stage-then-clean bypass; Redis/GitHub/Slack/Neon key patterns; CI trigger gap — stacked PRs into claude/* bases ran ZERO checks; concurrency dedupe; plant-tests) | SALVAGE NOW (security). Dedupe vs codex a9ec8906 first. |
| stress-property-suite | MIXED | SALVAGE settlement/CLV/property files NOW — main still carries the live mis-grade bug (spaced-prefix team-name side derivation; awayTeam optional). EXCLUDE the branch's stripe webhook files (older than PR #105 — would regress B5 hardening). |
| model-accuracy-leaderboard | STRANDED but depends on @sports/fantasy-engine which exists only on fantasy-engine-foundation | Land after the foundation revival (in flight). |
| nfl-expected-points-metrics | GHOST (byte-identical payload landed via PR #102; main went further with #115) | No action; branch safe to delete. |

Corroboration: no PR title in main's history mentions foundry/assurance/radar/
leaderboard/guardrail-hardening/property-suite/awayTeam — consistent with
genuinely stranded payloads.

# AWS Clean Rooms Partnership Plan

Updated: 2026-07-03

Official references:
- https://docs.aws.amazon.com/clean-rooms/latest/userguide/what-is.html
- https://docs.aws.amazon.com/clean-rooms/
- https://aws.amazon.com/clean-rooms/

Repo reality:
- No partner dataset exists.
- No collaboration exists.
- No analysis rule exists.
- No partnership is claimed.

| Partner type | What GSE contributes | What partner contributes | Raw data not exposed | Allowed aggregate question | Disallowed analysis | Privacy threshold | Commercial leverage | Legal blocker | Minimum demo artifact | Why Clean Rooms helps | Non-AWS alternative |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| media/content partner | public-event timing, content taxonomy, evidence summaries | content performance aggregates | row-level users, raw audience logs | which public event classes correlate with aggregate engagement | user-level targeting | k>=50 | better editorial timing | audience data rights | synthetic content schema | governed aggregate join | partner-hosted SQL export |
| DFS/fantasy partner | player role/uncertainty features | aggregate roster/contest behavior | raw entries, user ids | do role-shock flags align with aggregate roster swings | individual lineup reconstruction | k>=100 | fantasy decision tooling | contest/user data rights | synthetic DFS schema | no raw data exchange | clean CSV aggregate |
| sportsbook/operator partner | model uncertainty buckets, source freshness | aggregate line/handle movement classes | bettor ids, raw wagers | do public events precede aggregate market movement classes | betting-user profiling | k>=100 | market integrity research | gaming compliance | synthetic market schema | governed collaboration | legal-approved aggregate API |
| sports data provider | source-quality ledger, feature demand | coverage/latency metadata | licensed raw feed | which metadata gaps hurt calibration | redistributing raw feed | k>=25 | provider product feedback | license terms | synthetic source schema | controlled derived analysis | provider-hosted report |
| team/training partner | public game context and uncertainty reports | aggregate availability/training signals | player medical/personnel raw data | do public context flags align with aggregate availability classes | player-level health inference | k>=25 | research credibility | health/privacy review | synthetic team schema | minimizes raw exchange | institutional review export |
| creator/community partner | narrative volatility features | aggregate engagement/community signals | user identities, DMs | which public narratives precede aggregate attention shifts | individual sentiment targeting | k>=50 | creator planning | platform terms | synthetic community schema | safe aggregate join | shared spreadsheet aggregate |
| league/team-adjacent partner | evidence/reporting framework | approved aggregate operations data | confidential operations records | what aggregate data-quality gaps affect public analysis | confidential team strategy extraction | k>=25 | enterprise credibility | contract/legal review | synthetic league schema | auditability and rules | secure data enclave |

Required before any live Clean Rooms work:
- named partner
- contract and source rights review
- data minimization plan
- allowed query list
- disallowed query list
- aggregation thresholds
- export policy
- owner approval and cost ceiling

## Personal AWS Learning Feed

Clean Rooms learning improves partner credibility by making the repo's collaboration story more precise without claiming a partner exists.

Learning effects:
- better explanation of analysis rules and aggregate-only joins.
- better privacy-threshold vocabulary.
- better disallowed-query examples.
- better partner pitch language around no raw data exchange.
- better rejection of identity matching or row-level exports.

No-cost repo actions:
- keep synthetic schemas in `docs/fable/aws/clean-rooms-demo/`.
- keep allowed and disallowed query examples public-safe.
- prepare partner discussion notes without uploading data.

Still blocked:
- live collaboration.
- partner data.
- analysis rule creation.
- exports.
- identity resolution.

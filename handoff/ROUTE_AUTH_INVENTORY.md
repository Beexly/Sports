# Route Auth Inventory

Generated from tracked `apps/web/app/api/**/route.ts` files in repository order.

The repository currently contains 177 tracked route files; the queue text says 176, so this inventory follows the tracked file count.

| Route path | Methods | Auth mechanism | Body parsing | Validation | Self-declared public |
|---|---|---|---|---|---|
| /api/admin/dashboard | GET | auth() | no | no | yes |
| /api/admin/losses/[pickId]/draft | POST | auth() | no | no | yes |
| /api/admin/promotions | GET | auth() | no | no | no |
| /api/admin/trigger-refresh | POST | auth() | no | no | no |
| /api/airwave/intake-readiness | GET | auth() | no | no | no |
| /api/airwave/intelligence-readiness | GET | auth() | no | no | no |
| /api/airwave/readiness | GET | auth() | no | no | no |
| /api/airwave/review-queue | GET | auth() | no | no | yes |
| /api/auth/[...nextauth] | NONE | NONE FOUND | no | no | no |
| /api/blog | GET | auth() | no | no | no |
| /api/board/passes | GET | NONE FOUND | no | no | no |
| /api/board/state | GET | auth() | no | no | yes |
| /api/brief | GET | NONE FOUND | no | no | yes |
| /api/calibration/elo-backtest | GET | NONE FOUND | no | no | yes |
| /api/calibration/market-backtest | GET | NONE FOUND | no | no | yes |
| /api/calibration/replay-provenance | GET | NONE FOUND | no | no | no |
| /api/calibration | GET | NONE FOUND | no | no | no |
| /api/cipher/verify | POST | NONE FOUND | yes | no | yes |
| /api/clv | GET | NONE FOUND | no | no | yes |
| /api/cockpit/agents | GET | auth() | no | no | no |
| /api/cockpit/api-costs/override | POST | auth() | yes | no | no |
| /api/cockpit/bot-outbox/preview | GET, POST | requireAdmin | yes | no | no |
| /api/cockpit/brief | GET | auth() | no | no | no |
| /api/cockpit/calibration | GET, POST | auth() | no | no | no |
| /api/cockpit/command-center | GET | auth() | no | no | no |
| /api/cockpit/content/[id]/review | POST | auth() | yes | no | no |
| /api/cockpit/content/[id] | GET | auth() | no | no | no |
| /api/cockpit/content | GET, POST | auth() | no | no | no |
| /api/cockpit/free-coverage | GET | auth() | no | no | no |
| /api/cockpit/history/export | GET | auth() | no | no | no |
| /api/cockpit/jarvis | GET | auth() | no | no | yes |
| /api/cockpit/jarvis/trend | GET | auth() | no | no | no |
| /api/cockpit/journal/[id]/retract | POST | requireAdmin | yes | no | no |
| /api/cockpit/journal/[id] | PATCH | requireAdmin | yes | no | no |
| /api/cockpit/journal/[id]/scan | POST | requireAdmin | yes | no | no |
| /api/cockpit/journal/[id]/submit | POST | requireAdmin | no | no | no |
| /api/cockpit/journal | POST | requireAdmin | yes | no | no |
| /api/cockpit/journal/week-data | GET | requireAdmin | no | no | no |
| /api/cockpit/listener-log | POST | auth() | yes | no | yes |
| /api/cockpit/market-twin | GET | auth() | no | no | no |
| /api/cockpit/operator-registry | GET | auth() | no | no | no |
| /api/cockpit/readiness | GET | auth() | no | no | no |
| /api/cockpit/resource-intelligence | GET | auth() | no | no | no |
| /api/cockpit/studio/generate | POST | auth() | yes | no | no |
| /api/cockpit/tasks/[id]/decisions | GET | auth() | no | no | no |
| /api/cockpit/tasks/[id] | GET, PATCH | requireAdmin | yes | no | no |
| /api/cockpit/tasks | GET, POST | requireAdmin | yes | no | no |
| /api/cockpit/world-class-readiness | GET | auth() | no | no | yes |
| /api/contests/enter | POST | NONE FOUND | yes | yes | no |
| /api/contests/week | GET | NONE FOUND | no | no | no |
| /api/cron/autonomy-cycle | GET | CRON_SECRET | no | no | no |
| /api/cron/backfill-historical-games | GET | CRON_SECRET | no | no | no |
| /api/cron/backfill-independent-trueprob | GET | CRON_SECRET | no | no | no |
| /api/cron/backfill-player-data | GET | CRON_SECRET | no | no | no |
| /api/cron/backfill-team-efficiency | GET | CRON_SECRET | no | no | no |
| /api/cron/backtest-calibration | GET | CRON_SECRET | no | no | no |
| /api/cron/board-fill | GET | CRON_SECRET | no | no | no |
| /api/cron/calibration-metrics | GET | CRON_SECRET | no | no | no |
| /api/cron/deliver-settlement-alerts | GET | CRON_SECRET | no | no | no |
| /api/cron/drain-ai-telemetry-recovery | GET | CRON_SECRET | no | no | yes |
| /api/cron/free-spine-health | GET | CRON_SECRET | no | no | no |
| /api/cron/gamma | GET, POST | CRON_SECRET | no | no | no |
| /api/cron/generate-drafts | GET | CRON_SECRET | no | no | yes |
| /api/cron/generate-signal-slate | GET | NONE FOUND | no | no | yes |
| /api/cron/health-alert | GET | CRON_SECRET | no | no | no |
| /api/cron/hydrate-cold-plane | GET | CRON_SECRET | no | no | no |
| /api/cron/ingest-player-stats | GET | CRON_SECRET | no | no | no |
| /api/cron/jarvis-snapshot | GET | CRON_SECRET | no | no | no |
| /api/cron/prune-rate-limits | GET | CRON_SECRET | no | no | no |
| /api/cron/reconcile-entitlements | GET | CRON_SECRET | no | no | yes |
| /api/cron/refresh-odds | GET | CRON_SECRET | no | no | yes |
| /api/cron/refresh-player-stats | GET | CRON_SECRET | no | no | no |
| /api/cron/repair-checkout-attempts | GET | webhook signature check | no | no | yes |
| /api/cron/run-formal-receipt | GET | CRON_SECRET | no | no | no |
| /api/cron/settle-picks | GET | CRON_SECRET | no | no | no |
| /api/decision-genome | GET | auth() | no | no | no |
| /api/dev/state | GET | NONE FOUND | no | no | no |
| /api/dfs/salaries | GET | NONE FOUND | no | no | no |
| /api/gse/v1/catalog | GET | NONE FOUND | no | no | yes |
| /api/gse/v1/entitlements | GET | NONE FOUND | no | no | no |
| /api/gse/v1/external | GET | NONE FOUND | no | no | no |
| /api/gse/v1/hydration/plan | POST | NONE FOUND | yes | yes | no |
| /api/gse/v1/hydration/strategies | GET | NONE FOUND | no | no | no |
| /api/gse/v1/metrics/[metricId] | GET | NONE FOUND | no | no | no |
| /api/gse/v1/metrics | GET | NONE FOUND | no | no | yes |
| /api/gse/v1/openapi | GET | NONE FOUND | no | no | no |
| /api/gse/v1/own/values | POST | NONE FOUND | yes | no | no |
| /api/gse/v1/rights/classify-export | POST | NONE FOUND | yes | no | no |
| /api/gse/v1/source-matrix | GET | NONE FOUND | no | no | no |
| /api/gse/v1/truth/edge | POST | NONE FOUND | yes | no | no |
| /api/gse/v1/truth/fire | GET, POST | NONE FOUND | yes | no | no |
| /api/gse/v1/truth/health | POST | NONE FOUND | yes | no | no |
| /api/gse/v1/truth | GET | NONE FOUND | no | no | no |
| /api/gse/v1/values/[metricId] | GET | NONE FOUND | no | no | no |
| /api/health | GET | NONE FOUND | no | no | no |
| /api/health/synthetic-monitoring | GET | auth() | no | no | no |
| /api/human/availability | GET | NONE FOUND | no | no | no |
| /api/human/environment | GET | NONE FOUND | no | no | no |
| /api/human/readiness | GET | NONE FOUND | no | no | no |
| /api/human/roster-availability | POST | NONE FOUND | yes | no | no |
| /api/intelligence/clv-calibration | GET | NONE FOUND | no | no | no |
| /api/intelligence/expected-points | GET | NONE FOUND | no | no | no |
| /api/intelligence/graded-pool | GET | NONE FOUND | no | no | no |
| /api/intelligence/opportunity-transfer | GET | NONE FOUND | no | no | no |
| /api/intelligence/player-archetypes | GET | NONE FOUND | no | no | no |
| /api/intelligence/player-model | GET | NONE FOUND | no | no | no |
| /api/intelligence/player-movers | GET | NONE FOUND | no | no | no |
| /api/intelligence/predictiveness | GET | NONE FOUND | no | no | no |
| /api/intelligence/qb-consensus | GET | NONE FOUND | no | no | no |
| /api/intelligence/qb-forward | GET | NONE FOUND | no | no | no |
| /api/intelligence/receiving-opportunity | GET | NONE FOUND | no | no | no |
| /api/intelligence/roster-advice | POST | NONE FOUND | yes | no | no |
| /api/intelligence/route-rate | GET | NONE FOUND | no | no | no |
| /api/intelligence/rush-schemes | GET | NONE FOUND | no | no | no |
| /api/intelligence/rushing-contact | GET | NONE FOUND | no | no | no |
| /api/intelligence/rushing-efficiency | GET | NONE FOUND | no | no | no |
| /api/intelligence/scoring-zone | GET | NONE FOUND | no | no | no |
| /api/intelligence/sleeper-trending | GET | NONE FOUND | no | no | no |
| /api/intelligence/team-environment | GET | NONE FOUND | no | no | no |
| /api/intelligence/team-ratings | GET | NONE FOUND | no | no | no |
| /api/legal/sources | GET | NONE FOUND | no | no | no |
| /api/media/readiness | GET | auth() | no | no | no |
| /api/mlb/teams | GET | NONE FOUND | no | no | no |
| /api/moderation/anonymous-report | POST | NONE FOUND | no | no | no |
| /api/moneypuck/nhl | GET | NONE FOUND | no | no | no |
| /api/nflverse/birthday-usage-trend | GET | NONE FOUND | no | no | no |
| /api/nflverse/combine | GET | NONE FOUND | no | no | no |
| /api/nflverse/edge-signals | GET | NONE FOUND | no | no | no |
| /api/nflverse/expected-metrics | GET | NONE FOUND | no | no | yes |
| /api/nflverse/injuries | GET | NONE FOUND | no | no | no |
| /api/nflverse/next-gen-stats | GET | NONE FOUND | no | no | no |
| /api/nflverse/player-lab | GET | NONE FOUND | no | no | no |
| /api/nflverse/pressure-coverage | GET | NONE FOUND | no | no | no |
| /api/nflverse/qb-age-rb-trend | GET | NONE FOUND | no | no | no |
| /api/nflverse/qbr | GET | NONE FOUND | no | no | no |
| /api/nflverse/snap-share | GET | NONE FOUND | no | no | no |
| /api/nflverse/usage-pulse | GET | NONE FOUND | no | no | no |
| /api/ops/daily-truth | GET | CRON_SECRET | no | no | yes |
| /api/ops/public-surface-truth | GET | CRON_SECRET | no | no | no |
| /api/ops/ranking-pause-apply | GET, POST | CRON_SECRET | yes | no | no |
| /api/performance | GET | NONE FOUND | no | no | yes |
| /api/picks/[id]/audit | GET | auth() | no | no | yes |
| /api/picks/[id]/explain | POST | auth() | yes | no | yes |
| /api/picks/daily-slate | GET | NONE FOUND | no | no | yes |
| /api/picks | GET | auth() | no | no | yes |
| /api/projections | GET | NONE FOUND | no | no | yes |
| /api/promotions | GET | NONE FOUND | no | no | yes |
| /api/proof/ledger | GET | NONE FOUND | no | no | yes |
| /api/proof/openapi.json | GET | NONE FOUND | no | no | no |
| /api/proof/receipts | GET | NONE FOUND | no | no | yes |
| /api/proof/verification-spec.json | GET | NONE FOUND | no | no | no |
| /api/push/subscribe | POST | auth() | yes | no | no |
| /api/push/unsubscribe | POST | auth() | yes | no | no |
| /api/receipts/[id] | GET | NONE FOUND | no | no | yes |
| /api/receipts/verify | POST | webhook signature check | yes | no | no |
| /api/room/[gameId]/model-court | POST | auth() | yes | no | no |
| /api/scoring/player-index | GET | NONE FOUND | no | no | no |
| /api/sleeper/league | GET | NONE FOUND | no | no | no |
| /api/sleeper/leagues | GET | NONE FOUND | no | no | yes |
| /api/sleeper/market-signal | GET | NONE FOUND | no | no | no |
| /api/sources/catalog | GET | NONE FOUND | no | no | yes |
| /api/subscriptions/checkout | POST | webhook signature check | yes | yes | no |
| /api/subscriptions/portal | POST | auth() | no | no | no |
| /api/tools/lineup | GET | NONE FOUND | no | no | no |
| /api/trends/nflverse-readiness | GET | NONE FOUND | no | no | no |
| /api/v1/openapi | GET | NONE FOUND | no | no | no |
| /api/v1/probabilities | GET | NONE FOUND | no | no | no |
| /api/v1/signals | GET | NONE FOUND | no | no | no |
| /api/verify | GET | NONE FOUND | no | no | yes |
| /api/verify/slate/opening | GET | NONE FOUND | no | no | no |
| /api/verify/slate | GET | NONE FOUND | no | no | yes |
| /api/waitlist | POST | NONE FOUND | yes | no | no |
| /api/watchlist/follow | POST | auth() | yes | no | no |
| /api/watchlist | GET | auth() | no | no | no |
| /api/watchlist/unfollow | POST | auth() | yes | no | no |
| /api/weather/game | GET | NONE FOUND | no | no | no |
| /api/webhooks/stripe | POST | webhook signature check | no | no | no |

## Counts

- Total route files: 177
- Methods: GET=144, POST=38, PUT=0, PATCH=2, DELETE=0
- Auth: CRON_SECRET=26, NONE FOUND=95, auth()=43, requireAdmin=9, webhook signature check=4
- Body parsing: 31
- Validation: 3
- Self-declared public: 36
- NONE FOUND and no public comment: 75
- Body parsing without validation: 28
- Entitlement checks: 0

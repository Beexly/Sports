# GSE NFL World-Model Final Report

## 1. Executive Summary

GSE already has a guarded odds-first prediction system with source snapshots, readiness gates, entitlements, and blocked future signal hooks. The next leap is not more random data. It is a source-governed NFL world model that separates truth domains, handles legal risk, stores provenance, and turns high-signal context into tiered product experiences.

## 2. Repo Reality

The real working repo is C:\Users\Garrett\Sports. The current branch is safety/sports-wip-2026-06-04. This packet is docs-only.

## 3. Current Data Reality

The Odds API is already integrated. Rest, line movement, market depth, schedule stress, data quality, and historical context are partially active. Weather, injuries, player availability, officials, venue environment, player usage, news, NGS aggregates, and training camp signals are still missing or shadowed.

## 4. Source Strategy

Use one canonical source per truth family, plus cross-checks. Prefer nflverse for historical modeling, NWS for weather, approved official/licensed feeds for injuries, one licensed odds provider for market, and claim-card workflows for news.

## 5. Best Free Sources

nflverse/nflreadr/nflreadpy/nflfastR, NWS, Wikidata/Wikimedia, Sleeper, GDELT, Big Data Bowl samples, and selected open cross-sport datasets for methodology transfer.

## 6. Best Low-Limit Sources

The Odds API, CollegeFootballData, YouTube Data API, SportsGameOdds/API-Sports/SportsDataIO trials, and other provider trials only behind the provider adapter and contract gate.

## 7. Redundant Sources

Direct sportsbook pages, ESPN extraction, parallel nflverse wrappers as separate votes, Pro Football Reference scraping, and public NGS pages as fake raw tracking should be removed from implementation plans.

## 8. Legal Guardrail

Do not scrape or copy. Source approval, rate limits, contracts, display/cache rights, quote limits, attribution, deletion/revocation plans, and trademark-safe product language are prerequisites.

## 9. World State Machine

The model should track season phase, team state, player availability, game lifecycle, market state, weather/venue state, source state, signal state, and product state.

## 10. Signal Taxonomy

Core domains are market, schedule, weather, venue, injury, roster, usage, team strength, coaching, officials, news, social/attention, development, video-game analogs, and provenance.

## 11. Video-Game Analog Strategy

Use original GSE-derived ratings, archetypes, sliders, and scenario surfaces to make complex football signals readable. Never copy EA/Madden ratings, assets, names, trade dress, or official-rating language.

## 12. Training and Development Strategy

Use CFBD, draft/combine data, preseason usage, roster/depth changes, and human-reviewed camp claim cards. Treat camp reports as low-confidence until confirmed by snaps, roles, or official statuses.

## 13. News Strategy

Build a news source registry, event timeline, claim cards, contradiction detector, quote limiter, and attribution renderer. Store claims and metadata, not full copied articles.

## 14. Market Strategy

Keep The Odds API as current canonical provider unless a licensed replacement is approved. Build provider abstraction, CLV tracking, line-movement anomaly detection, vig removal, and no-wager compliance language.

## 15. Weather and Stadium Strategy

Use NWS as primary U.S. weather source. Add stadium coordinates, roof/surface/manual overrides, wind and kicking impact, travel fatigue, extreme alerts, and weather explainability cards.

## 16. Injury and Availability Strategy

Use official/licensed status precedence, no diagnosis language, practice trends, late-week volatility, replacement impact, snap reentry, unit injury clusters, and confidence ladders.

## 17. Product Tier Strategy

FREE gets safe high-level context. PRO gets richer source-backed matchup insight. ELITE gets scenarios and advanced cards. Founder-only keeps formulas, weights, source-risk, provider choices, and experiments.

## 18. Architecture Strategy

Source registry -> approved adapter/manual input -> SourceSnapshot -> normalized entity graph -> versioned feature store -> model output -> entitlement projection -> autopsy/calibration.

## 19. Build Queue Summary

Generated 120 build cards under docs/research/claude-build-queue. The first wave is source registry, entity graph, provider adapter, provenance ledger, warehouse, feature store, evaluation harness, stadium/weather map, injury schema, and founder source-risk dashboard.

## 20. Highest-Differentiation Builds

World-model feature store, scenario toggles, original analog rating schema, player progression/regression bands, founder alpha notebook, source war room, market/news/weather anomaly timeline, and hidden moat score.

## 21. Biggest Risks

Legal/source misuse, duplicated truth domains, stale/free-tier quotas, source drift, public overclaiming, medical speculation, betting-compliance exposure, and exposing founder formulas.

## 22. Human Approval Needed

Owner/legal approval is needed before automated external ingestion from high-risk sources, paid provider contracts, public product launch, migrations, new source keys, social/video APIs, publisher feeds, or sportsbook/market expansion.

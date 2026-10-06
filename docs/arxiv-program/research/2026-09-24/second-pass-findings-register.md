# Second-Pass Findings Register

Generated 2026-09-25T04:51:54Z from Firecrawl deep-research second pass
(38 findings). Snapshot: main at commit 7da237b (latest commit shown during review; dated Sep 25, 2026).

These findings are the "what we missed / what is underleveraged / what is overvalued"
layer on top of the first-pass source and gap review. Each row is a concrete,
cited observation that should change either build order, schema design, or rights posture.

## Findings

### F1. [CRITICAL] Current repository deep audit: data model, model ownership, evaluation, identity

The durable schema is still fundamentally a betting-pick system, not a model-owned fantasy system: Pick supports only SPREAD/TOTAL/MONEYLINE-style selections and a single active pick per game/pickType, while the schema has no contest, lineup, roster slot, salary, projection distribution, ownership, or player-projection artifact model.

**Recommended action:** Add first-class Contest, ContestSlate, PlayerProjection, ProjectionDistribution, PlayerEligibility, Lineup, LineupSlot, SalarySnapshot, OwnershipProjection, and OptimizationRun entities. Version each artifact and preserve the exact inputs, scoring rules, and constraints used to generate a lineup; do not overload Pick or JSON blobs.

**Why missed before:** The prior review emphasized prediction/fantasy code and UI surfaces; the schema shows that the durable source of truth remains game-market picks, so apparent fantasy breadth is not backed by a corresponding persistence model.

**Evidence:** https://raw.githubusercontent.com/Beexly/Sports/main/packages/db/prisma/schema.prisma

---

### F2. [HIGH] Current repository deep audit: data model, model ownership, evaluation, identity

Player identity is materially NFL/nflverse-specific even though a generic Entity/EntityEdge graph exists: Player requires a unique gsisId, and PlayerGameStat uses NFL season/week fields; SnapCount, Injury, and DepthChartEntry retain nullable/unresolved player IDs and free-text names. This creates silent cross-source fragmentation and makes multi-sport fantasy identity unsafe.

**Recommended action:** Make canonical identity sport-scoped and provider-neutral. Add provider identifier rows with uniqueness by provider/sport/id, explicit resolution decisions and confidence, alias history, effective dates, and rejection/quarantine states. Require projection and stat facts to reference a resolved canonical entity or an auditable unresolved record.

**Why missed before:** The generic entity graph looks like an identity solution at a glance, but the operational fantasy tables still use NFL-specific identifiers and nullable links; reviewing only the graph or ingestion adapters would overvalue completeness.

**Evidence:** https://raw.githubusercontent.com/Beexly/Sports/main/packages/db/prisma/schema.prisma

---

### F3. [HIGH] Current repository deep audit: data model, model ownership, evaluation, identity

Model governance is represented as free-text modelVersion fields rather than a durable model registry: Pick, ShadowSignal, PerformanceSummary, CalibrationProposal, and LadderEvent carry strings, but there is no schema-level model artifact, feature-set hash, training-data snapshot, code commit, approval, or promotion relation tying a prediction to an immutable model package.

**Recommended action:** Create ModelArtifact/ModelVersion and ModelPromotion tables with immutable artifact URI/hash, source commit, feature and label schema hashes, training window, calibration version, owner, approval decision, status, and rollback lineage. Replace free-text modelVersion with a foreign key or immutable registry key and require prediction writes to resolve it.

**Why missed before:** The repository has extensive calibration and shadow-engine vocabulary, which can be mistaken for model ownership; the database contract reveals that provenance is largely a string convention.

**Evidence:** https://raw.githubusercontent.com/Beexly/Sports/main/packages/db/prisma/schema.prisma

---

### F4. [HIGH] Current repository deep audit: data model, model ownership, evaluation, identity

The pure backtest harness has a real anti-leakage strength: it removes homeScore and awayScore before invoking the scorer, rejects empty/malformed corpora, and separates pushes from decided win rate. However, its report aggregates wins/losses/pushes and decided win rate only; it does not itself enforce time-ordered train/test splits, player-level leakage boundaries, ROI/utility, calibration, ranking, or fantasy objective metrics.

**Recommended action:** Keep the leakage guard, then make evaluation a versioned protocol: temporal train/validation/holdout partitions, as-of feature timestamps, entity/season leakage checks, Brier/log loss/calibration and fantasy ranking/utility metrics, bankroll/contest simulation, confidence intervals, and a machine-readable evaluation receipt required for promotion.

**Why missed before:** Prior work likely credited the existence of a backtest harness as equivalent to a complete evaluation system; the fetched implementation is deliberately narrow and market-pick oriented.

**Evidence:** https://raw.githubusercontent.com/Beexly/Sports/main/packages/prediction-engine/src/backtest/harness.ts

---

### F5. [HIGH] Current repository deep audit: data model, model ownership, evaluation, identity

The source registry is a genuine hidden strength: it encodes license, commercial-use, attribution, robots, rate limit, verdict, datasets, and an assertIngestible guard. But it explicitly allows use-with-caution sources into the ingestible verdict set even though its own comment defines that class as having no written commercial grant; that is not a safe default for a model-owned commercial feature store.

**Recommended action:** Split technical ingestion from product eligibility. Permit caution sources only into quarantined research storage, never into training, customer-facing projections, or derived features unless an explicit owner/legal decision and rights snapshot is attached. Enforce that policy at dataset promotion and feature materialization, not only at fetch time.

**Why missed before:** The prior source-page review likely emphasized breadth and the presence of legal controls; the important contradiction is in the registry's own verdict semantics and admission set.

**Evidence:** https://raw.githubusercontent.com/Beexly/Sports/main/packages/data-ingestion/src/source-registry.ts

---

### F6. [MEDIUM] Current repository deep audit: data model, model ownership, evaluation, identity

Observability is optional and intentionally incomplete: Sentry becomes a no-op when DSNs are absent, and the integration omits source-map upload. A production deployment can therefore report an apparently clean runtime while dropping exception telemetry and providing minified stack frames, which is inadequate for an autonomous model/pipeline owner.

**Recommended action:** Make production observability a deployment gate: require DSN and release identifiers, upload source maps, attach model/version/data-source/run IDs to traces, and persist durable worker run outcomes and alert delivery failures independently of Sentry. Keep no-op behavior for local development only.

**Why missed before:** Observability is easy to over-credit from the presence of a Sentry wrapper; the fetched implementation explicitly documents no-op operation and no source maps.

**Evidence:** https://raw.githubusercontent.com/Beexly/Sports/main/apps/web/lib/observability/sentry.ts

---

### F7. [HIGH] Current repository deep audit: data model, model ownership, evaluation, identity

The data-refresh worker documents a fail-open path when the paid-odds governor cannot be constructed. That preserves availability but can allow paid requests without a functioning credit governor, undermining spend caps and making model-input reproducibility dependent on an external paid feed's mutable state.

**Recommended action:** Fail closed for production paid ingestion when the ledger/governor cannot be constructed; use an explicit owner-approved emergency mode with a hard request ceiling, durable reason, and alert. Persist the exact odds snapshot and governor decision alongside every model-input build.

**Why missed before:** The worker's pacing, quota cutoff, and ledger terminology read as safety controls, but the construction-failure policy reverses the required default for a model-owned paid-data plane.

**Evidence:** https://raw.githubusercontent.com/Beexly/Sports/main/workers/data-refresh/src/refresh-cycle.ts

---

### F8. [MEDIUM] Current repository deep audit: data model, model ownership, evaluation, identity

Authentication and administrative ownership include a hard-coded owner allowlist in application source. The code documents that these addresses are always-admin and can reach cockpit surfaces independently of ADMIN_EMAILS, creating a deployment-coupled authority path that is difficult to rotate, audit, or revoke through normal data governance.

**Recommended action:** Move ownership and model-promotion authority to a database-backed, audited role/grant system with key rotation and explicit scopes (read, publish, promote, kill switch). Keep bootstrap access time-limited and require a break-glass receipt for production use.

**Why missed before:** The prior review likely focused on authentication correctness and paywall behavior; it did not treat hard-coded operational authority as a model-governance risk.

**Evidence:** https://raw.githubusercontent.com/Beexly/Sports/main/apps/web/lib/auth.ts

---

### F9. [HIGH] Missing and underleveraged model/evaluation infrastructure for fantasy and sport

The repository has a credible time-ordered calibration path: its calibration runbook specifies a time hold-out, fitting only on the hold-out/training side, reliability/ECE/Brier outputs, and a selected (+EV) slice. That is stronger than a generic random split, but it is not yet a complete point-in-time feature contract: the runbook does not document feature availability/created timestamps, correction/backfill handling, or an as-of join test. Feast explicitly warns that event-time-only joins can return values backfilled after the entity timestamp, and offers created-timestamp filtering to prevent that leakage (https://docs.feast.dev/getting-started/concepts/point-in-time-joins).

**Recommended action:** Make every feature carry event_time and available_at/created_at; build training snapshots by decision timestamp; add a test that a post-cutoff correction, late injury report, or closing line cannot enter a pre-kickoff row. Version the snapshot and source timestamps with each prediction.

**Why missed before:** A review centered on ingestion and candidate source pages can see data breadth without testing whether the value was knowable at lineup-lock or kickoff; the repository runbook exposes the split but not a full feature-store availability contract (https://github.com/Beexly/Sports/blob/main/docs/ops/CALIBRATION_PIPELINE.md).

**Evidence:** https://github.com/Beexly/Sports/blob/main/docs/ops/CALIBRATION_PIPELINE.md

---

### F10. [HIGH] Missing and underleveraged model/evaluation infrastructure for fantasy and sport

Calibration is materially underleveraged as a decision/evaluation layer. The repo documents ECE and Brier/reliability reporting and recently added an honest probability resolver that excludes spread/total rank scores from probability scoring (https://github.com/Beexly/Sports/blob/main/docs/ops/CALIBRATION_PIPELINE.md; https://github.com/Beexly/Sports/commit/2c27590a1a26d7dca6b301ead16a88eaeff1087e). A sports-betting study found calibration-driven model selection materially outperformed accuracy-driven selection in its NBA experiment, reporting average ROI +34.69% versus -35.17% (https://arxiv.org/html/2303.06021v4).

**Recommended action:** Promote proper scoring and decision evaluation to model-selection gates: log loss/Brier for categorical outcomes; CRPS or interval score for player fantasy points; calibration by sport, market, horizon, probability bin, and odds/ownership bucket; then evaluate expected utility under contest payout, entry fee, limits, and fractional-Kelly risk rather than accuracy alone.

**Why missed before:** Prediction reviews commonly emphasize hit rate and model presence; the repo's own calibration material is operationally framed as an offline/R&D path rather than an always-on model registry gate (https://github.com/Beexly/Sports/blob/main/docs/ops/CALIBRATION_PIPELINE.md).

**Evidence:** https://arxiv.org/html/2303.06021v4

---

### F11. [HIGH] Missing and underleveraged model/evaluation infrastructure for fantasy and sport

Uncertainty infrastructure exists but is easy to overread: the repository's Jackknife+ addition explicitly reports a 1-2a coverage floor, refuses unreachable order statistics, and does not claim the usual 1-a guarantee (https://github.com/Beexly/Sports/commit/7b2506a9b6ae38e321df94739c9981e135fb25e8). Conformal prediction provides finite-sample, distribution-free set/interval guarantees under its assumptions and can wrap any pre-trained model (https://arxiv.org/abs/2107.07511).

**Recommended action:** Attach coverage, width, abstention/refusal, and conditional-coverage diagnostics to every sport/position/horizon; use rolling, non-exchangeable/time-series conformal variants for sequential games; block production promotion when coverage collapses or intervals become implausibly wide.

**Why missed before:** The feature is recent and deliberately additive/dark (the commit says no gate was flipped), so a prior code review could count the implementation without assessing whether uncertainty reaches lineup decisions (https://github.com/Beexly/Sports/commit/7b2506a9b6ae38e321df94739c9981e135fb25e8).

**Evidence:** https://github.com/Beexly/Sports/commit/7b2506a9b6ae38e321df94739c9981e135fb25e8

---

### F12. [MEDIUM] Missing and underleveraged model/evaluation infrastructure for fantasy and sport

The pipeline does not document coherent hierarchical probabilistic forecasts for the fantasy hierarchy (player minutes/stat lines to team totals, slate totals, and contest outcomes). Forecast reconciliation literature shows independently produced base forecasts can violate aggregation constraints and describes MinT reconciliation to minimize total forecast-error variance (https://otexts.com/fpp3/reconciliation.html).

**Recommended action:** Model player-level distributions jointly with team/game latent variables; reconcile minutes, possessions, team totals, and player stat sums; score both bottom-level fantasy points and aggregate coherence. Preserve covariance so lineup simulations do not independently overstate tails.

**Why missed before:** A source/ingestion review tends to assess whether player and team feeds exist, not whether downstream forecasts sum consistently or preserve cross-player covariance.

**Evidence:** https://otexts.com/fpp3/reconciliation.html

---

### F13. [HIGH] Missing and underleveraged model/evaluation infrastructure for fantasy and sport

Ranking and ownership are not represented as a complete probabilistic contest model in the fetched calibration documentation. The repository's ranking-basis census only measures which fallback key (including confidence/100) drives sorting (https://github.com/Beexly/Sports/commit/7b2506a9b6ae38e321df94739c9981e135fb25e8), while fantasy decisions require joint simulations of score, selection/ownership, correlation, payout structure, and field duplication.

**Recommended action:** Separate predictive probability from ranking score; estimate ownership/selection probabilities with time-sliced calibration; simulate correlated player outcomes and opponent lineups; report expected value, top-percentile finish probability, downside, and duplication-adjusted utility by contest type.

**Why missed before:** The prior review covered prediction/fantasy code, but a ranking-key census can look like ranking infrastructure while still not measuring ownership uncertainty or contest-level decision utility.

**Evidence:** https://github.com/Beexly/Sports/commit/7b2506a9b6ae38e321df94739c9981e135fb25e8

---

### F14. [HIGH] Missing and underleveraged model/evaluation infrastructure for fantasy and sport

Drift monitoring is a missing production-model layer. Evidently distinguishes feature/data drift, concept drift, prediction drift, training-serving skew, and data quality, and recommends statistical tests, distance metrics, and rule checks; it also notes drift is only a proxy when labels are delayed (https://www.evidentlyai.com/ml-in-production/data-drift).

**Recommended action:** Monitor feature, odds, injury-status, line-movement, prediction, calibration, and settlement-lag drift by league and season phase; maintain delayed-label performance dashboards; trigger recalibration/retraining or abstention on predeclared thresholds, with a champion/challenger history.

**Why missed before:** Ingestion freshness and source coverage are not the same as distributional or concept-drift monitoring; the distinction is easy to miss when the review is organized around feeds.

**Evidence:** https://www.evidentlyai.com/ml-in-production/data-drift

---

### F15. [HIGH] Missing and underleveraged model/evaluation infrastructure for fantasy and sport

The sports study identifies injuries and in-game events as influential context that many predictive models omit, and notes that streaming events require a different processing path (https://arxiv.org/html/2303.06021v4). The fetched repository materials show calibration and shadow evaluation, but do not establish a causal injury/news uncertainty model or a principled stale-information fallback.

**Recommended action:** Represent injury status as an event-time distribution (availability probability, minutes restriction, replacement effects), separate observed from inferred reports, run scenario simulations for late scratches, and abstain or widen uncertainty when status freshness/identity confidence is below threshold.

**Why missed before:** The previous ingestion review could verify injury/news sources, but source existence does not prove causal propagation into minutes, usage, teammates, opponent effects, or uncertainty.

**Evidence:** https://arxiv.org/html/2303.06021v4

---

### F16. [HIGH] Sports signal expansion: tracking, event, tactical/video, travel, weather, facil

The largest underleveraged signal family is optical/player tracking rather than box-score data: NBA Stats explicitly exposes player speed/distance tracking, identifies Second Spectrum as the provider, and warns that tracking is not available for every game. That is both high predictive value and a material missingness problem.

**Recommended action:** Add a tracking adapter with availability flags, provider/version metadata, and sport-specific features (distance, speed, spacing, workload); never impute unavailable games as zero.

**Why missed before:** A conventional review of prediction/fantasy code can value player statistics without distinguishing event totals from sensor-derived movement data and its coverage gaps.

**Evidence:** https://www.nba.com/stats/players/speed-distance

---

### F17. [HIGH] Sports signal expansion: tracking, event, tactical/video, travel, weather, facil

MLB Statcast is a concrete public signal surface spanning bat tracking, pitch/location, pop time, catch probability, jump, and sprint speed, not just standard statistics.

**Recommended action:** Prioritize Statcast feature ingestion for contact quality, baserunning, defense and pitcher/batter matchup models, retaining leaderboard filters and season snapshots.

**Why missed before:** The prior scope emphasized repository code and candidate source pages; an interactive official leaderboard is easy to treat as a presentation page rather than a machine-readable signal catalog.

**Evidence:** https://baseballsavant.mlb.com/leaderboard/custom?year=2024&type=batter&filter=&sort=4&sortDir=desc

---

### F18. [HIGH] Sports signal expansion: tracking, event, tactical/video, travel, weather, facil

Hudl StatsBomb documents unusually granular football event data (over 3,400 events per match) plus player-location data for 40-plus leagues and freeze-frame inputs such as goalkeeper/defender locations.

**Recommended action:** Add an event/tactical schema capable of freeze frames, pressure, locations and possession context; use it for xG, buildup, recruitment and tactical-state features rather than only goals/shots.

**Why missed before:** Generic match feeds obscure the difference between event-level tactical context and aggregate match statistics.

**Evidence:** https://www.statsbomb.com/

---

### F19. [MEDIUM] Sports signal expansion: tracking, event, tactical/video, travel, weather, facil

Hudl Wyscout supplies a complementary video-plus-data scouting corpus from more than 1,000 competitions, making video retrieval, clip labels and player evaluation a distinct signal family.

**Recommended action:** Treat video as a licensed feature store: persist clip IDs/time ranges and derived labels, not copied media, and join clips to stable player/match IDs.

**Why missed before:** The prior review covered prediction and ingestion, but likely valued structured feeds more than multimodal evidence and its rights constraints.

**Evidence:** https://www.wyscout.com/

---

### F20. [HIGH] Sports signal expansion: tracking, event, tactical/video, travel, weather, facil

Genius Sports advertises official, low-latency live and historical data and explicitly includes play-by-play for broadcasters plus betting/fantasy use cases; it states it is official NFL/NCAA partner and serves 400-plus leagues.

**Recommended action:** Evaluate as a licensed event-by-event backbone for competitions where rights and latency matter; record competition entitlement and redistribution restrictions per contract.

**Why missed before:** A long source list can include data vendors without separating official league partnerships, latency, and commercial licensing from free/public accessibility.

**Evidence:** https://www.geniussports.com/engage/official-sports-data-api/

---

### F21. [HIGH] Sports signal expansion: tracking, event, tactical/video, travel, weather, facil

Sportradar's documented offering covers 80-plus sports, 500-plus leagues and 750,000-plus events annually, with historical data and XML/JSON delivery; its developer portal exposes separate APIs for football, basketball, hockey, baseball and racing.

**Recommended action:** Use it as an enterprise breadth/normalization benchmark and test only under a trial or commercial agreement; do not assume public API availability.

**Why missed before:** Provider breadth can be undervalued when a repository prototype is judged mainly on free endpoints rather than coverage, reliability and rights.

**Evidence:** https://sportradar.com/media-tech/data-content/sports-data-api/?lang=en-us

---

### F22. [MEDIUM] Sports signal expansion: tracking, event, tactical/video, travel, weather, facil

Stats Perform's STATS API documents live game statistics, editorial coverage, photos, situational player/team statistics, historical data and common IDs, but requires an access key.

**Recommended action:** Use common IDs as a cross-provider identity bridge and separate editorial/photo entitlements from numerical-stat entitlements in ingestion configuration.

**Why missed before:** Identity resolution and media/editorial products are often collapsed into the numeric feed discussion.

**Evidence:** https://developer.stats.com/

---

### F23. [HIGH] Sports signal expansion: tracking, event, tactical/video, travel, weather, facil

Opta (Stats Perform) explicitly markets live data, AI tools, advanced content, ultrafast data, dynamic stats APIs, betting data and sports-news video, supporting a layered event-plus-media architecture.

**Recommended action:** Model event, trading, video and derived-insight products as separate licensed products; request sport/competition-level sample payloads before committing to a common schema.

**Why missed before:** A source may be counted once even though its event, betting, video and insight products have different access and rights.

**Evidence:** https://www.statsperform.com/products/opta-data/

---

### F24. [MEDIUM] Sports signal expansion: tracking, event, tactical/video, travel, weather, facil

KINEXON describes real-time player and ball tracking, advanced performance analytics, millisecond-accurate officiating, athlete health/availability and a biomechanics partnership, making it relevant to load, injury and officiating signals unavailable in public box scores.

**Recommended action:** Keep as a team/league partnership lead rather than assume an open feed; design consent, privacy, sensor calibration and aggregation controls before using athlete-level data.

**Why missed before:** Commercial performance technology is not normally exposed through public sports APIs and can be missed by URL-based source reviews.

**Evidence:** https://kinexon.com/sports/

---

### F25. [MEDIUM] Sports signal expansion: tracking, event, tactical/video, travel, weather, facil

FlightAware AeroAPI provides queryable current and historical flight data, including ETA, last position, full track, ground speed and altitude, with history back to 2011.

**Recommended action:** Build a travel/rest feature pipeline from team itineraries only where legally and operationally available; cache flight tracks and derive time-zone crossings, delays and turnaround time.

**Why missed before:** Travel is external to the game-stat schema and is usually absent from fantasy-oriented repositories, despite plausible rest and fatigue effects.

**Evidence:** https://www.flightaware.com/commercial/aeroapi/

---

### F26. [HIGH] Sports signal expansion: tracking, event, tactical/video, travel, weather, facil

The U.S. National Weather Service API is a primary forecast/observation source and its documentation links forecast, aviation, marine, climate and past-weather services; this supports venue-time weather joins rather than generic city weather.

**Recommended action:** Join hourly forecast and observed conditions to venue coordinates and scheduled start time, preserving issue time, forecast horizon and units; include wind, precipitation, temperature and visibility.

**Why missed before:** Weather is frequently treated as a one-off scrape or narrative note instead of a versioned forecast-vs-observation feature with leakage controls.

**Evidence:** https://www.weather.gov/documentation/services-web-api

---

### F27. [MEDIUM] Sports signal expansion: tracking, event, tactical/video, travel, weather, facil

OpenStreetMap offers open map data usable for venue geocoding and facility context, but requires attribution and follows open-data licensing conditions.

**Recommended action:** Use OSM for venue coordinates, travel distance and surrounding elevation/urban context where suitable; store attribution and validate stadium surface/roof details from venue or league sources.

**Why missed before:** Facilities and surface are not represented by typical score APIs, while map data is often overlooked as a feature source.

**Evidence:** https://www.openstreetmap.org/about

---

### F28. [HIGH] Sports signal expansion: tracking, event, tactical/video, travel, weather, facil

SportsDataIO documents a developer catalog with competition coverage and available feeds across NFL, MLB, NBA and NHL, and advertises free exploration alongside commercial feeds; it is a practical bridge for injuries, lineups, depth charts and fantasy-oriented feeds, but entitlement must be checked per feed.

**Recommended action:** Inventory feed-level availability (injury, lineup, depth chart, salary/DFS, play-by-play) and enforce key/rate/redistribution limits in configuration rather than hard-coding assumptions.

**Why missed before:** The prior 100-source pass may have counted a provider name without checking its separate feed catalog and commercial/free split.

**Evidence:** https://sportsdata.io/developers

---

### F29. [HIGH] Sports signal expansion: tracking, event, tactical/video, travel, weather, facil

Sportradar's developer documentation exposes league-specific endpoint families and a 30-day marketplace trial, but this is not evidence of production redistribution rights.

**Recommended action:** Add a rights ledger: trial, internal research, production display, betting/fantasy, historical retention and redistribution should be separate states.

**Why missed before:** Technical documentation is easy to mistake for permission to use or republish the feed.

**Evidence:** https://developer.sportradar.com/getting-started/docs/get-started

---

### F30. [LOW] Sports signal expansion: tracking, event, tactical/video, travel, weather, facil

Hawk-Eye's tennis page did not expose substantive content in the fetched result, so it should be treated as a lead requiring direct commercial verification rather than claimed availability of ball-tracking or officiating data.

**Recommended action:** Do not build against it from marketing-page assumptions; obtain an API/sample contract and verify sport, tour, historical access and redistribution rights.

**Why missed before:** Sparse or JS-heavy provider pages can create false confidence when a source list records the brand but not verified access.

**Evidence:** https://www.hawkeyeinnovations.com/tennis

---

### F31. [HIGH] Production reliability, privacy/consent, data rights, explainability, user safet

The repository has extensive launch and feature gates, but the inspected production contract does not establish service-level objectives, error budgets, on-call ownership, restore objectives, or a tested disaster-recovery procedure. The runbook is primarily a manual staging/route checklist, while OpenTelemetry defines SLI/SLO concepts that are absent from that runbook.

**Recommended action:** Add a versioned reliability contract: availability/latency/freshness/settlement SLIs, SLOs and error budgets; page thresholds; owner/escalation; RTO/RPO; backup-restore evidence; and a scheduled failover/restore exercise. Instrument API, ingestion, workers, Stripe webhooks, and settlement with metrics, structured logs, and traces.

**Why missed before:** The prior review covered architecture and ingestion, but a launch checklist can look operationally complete without defining measurable reliability targets or proving recovery.

**Evidence:** https://raw.githubusercontent.com/Beexly/Sports/main/docs/launch-runbook.md

---

### F32. [HIGH] Production reliability, privacy/consent, data rights, explainability, user safet

The env contract contains OAuth client secrets, NextAuth secret, Stripe secrets/webhook secret, odds-provider key, Anthropic key, and Redis/database connection settings, but the inspected materials do not provide a production secret-rotation schedule, least-privilege matrix, KMS/secret-manager requirement, or incident revocation playbook. CI's secret scan and dependency audit are useful gates, not runtime credential controls.

**Recommended action:** Move production secrets to a managed secret store; document per-service scopes, rotation/expiry, break-glass access, webhook replay protection, and revoke/rotate steps. Add automated secret-age/permission checks and ensure logs redact tokens, OAuth artifacts, payment identifiers, and user identifiers.

**Why missed before:** The prior review examined code and ingestion behavior, whereas the deployment-risk boundary is concentrated in the environment contract and operational controls.

**Evidence:** https://raw.githubusercontent.com/Beexly/Sports/main/.env.example

---

### F33. [HIGH] Production reliability, privacy/consent, data rights, explainability, user safet

The Prisma schema stores OAuth access_token, refresh_token, and id_token fields as text, and also stores user email/name/image plus billing identifiers. The repository README describes Google sign-in and Stripe but the inspected repo materials do not show a privacy notice, records of processing, subject-access/erasure/export workflow, consent ledger, retention/deletion policy for account data, or processor/subprocessor register.

**Recommended action:** Minimize OAuth persistence (prefer provider-managed sessions where possible), encrypt sensitive fields, isolate billing/security evidence, and implement authenticated export, correction, deletion/restriction, consent withdrawal, retention jobs, and an auditable lawful-basis/purpose/subprocessor inventory. Publish a privacy notice before public launch.

**Why missed before:** Prior coverage emphasized product/data pipelines, not the personal-data inventory revealed by the schema.

**Evidence:** https://raw.githubusercontent.com/Beexly/Sports/main/packages/db/prisma/schema.prisma

---

### F34. [CRITICAL] Production reliability, privacy/consent, data rights, explainability, user safet

The README explicitly says the promotions surface is compliance-gated and the env file discusses terms consent, but the inspected launch materials do not establish jurisdictional age/location checks, responsible-gambling self-exclusion or harm signals, marketing consent/withdrawal, or a documented boundary between an affiliate promotion and regulated gambling activity. The Gambling Commission says gambling operators must continue processing data needed for licensing and social-responsibility objectives, and that regulatory-compliance data may need at least five years after the customer relationship ends.

**Recommended action:** Before enabling promotions/fantasy/betting-adjacent flows, obtain jurisdiction-specific legal sign-off; implement age/geo gates, licensed-operator and offer eligibility checks, prominent affiliate/ad disclosures and terms, responsible-gambling links, self-exclusion suppression, consent/preference records, complaint handling, and a retention schedule that distinguishes regulatory evidence from marketing analytics.

**Why missed before:** The prior review valued the visible compliance verdict/publish gates; it did not test whether those gates cover the operator-level safeguarding and retention obligations that arise once money, promotions, or gambling referrals are live.

**Evidence:** https://www.gamblingcommission.gov.uk/licensees-and-businesses/guide/gambling-regulation-and-the-general-data-protection-regulation-gdpr

---

### F35. [MEDIUM] Production reliability, privacy/consent, data rights, explainability, user safet

The product presents a deterministic factor model and an accountability/calibration cockpit, but the inspected customer/launch documentation does not require a versioned, per-pick explanation containing factor contributions, input timestamps/source lineage, uncertainty/calibration, stale-data status, and correction/appeal path. NIST describes trustworthy AI as including validity/reliability, safety, security, accountability/transparency, explainability, privacy enhancement, and fairness.

**Recommended action:** Make an explanation artifact part of pick publication eligibility: model/data versions, factors and weights, missingness, market/line timestamp, confidence/calibration interval, limitations, and immutable audit linkage. Provide plain-language customer explanations and an operator correction/withdrawal workflow; test explanations against the actual score.

**Why missed before:** The earlier review recognized readable math and prediction code, but readability of implementation is not the same as a user-facing, reproducible explanation or fairness/safety evidence.

**Evidence:** https://www.nist.gov/itl/ai-risk-management-framework

---

### F36. [HIGH] Production reliability, privacy/consent, data rights, explainability, user safet

The CI workflow runs tests, migration checks, guardrails, secret scanning, and dependency auditing, but the fetched workflow does not document DAST/API authorization tests, abuse/rate-limit tests, container/IaC scanning, SBOM/provenance/signing, or a security incident response gate. OWASP specifically identifies broken object/function authorization, unrestricted resource consumption, sensitive business flows, SSRF, security misconfiguration, improper inventory, and unsafe API consumption as API risks relevant to admin, billing, ingestion, and trigger-refresh surfaces.

**Recommended action:** Add threat-model-backed tests for every admin/API route and tenant/object boundary; enforce rate limits and idempotency on refresh, checkout, webhook, export, and alert endpoints; add SAST/DAST, container/IaC and SBOM/provenance checks; and require a reviewed vulnerability disclosure and incident-response runbook before launch.

**Why missed before:** Static guardrails and unit tests are easy to count as 'security coverage'; the missed risk is runtime authorization, abuse economics, and dependency/infrastructure supply-chain assurance.

**Evidence:** https://raw.githubusercontent.com/Beexly/Sports/main/.github/workflows/ci.yml

---

### F37. [MEDIUM] Production reliability, privacy/consent, data rights, explainability, user safet

The repository has launch observatory pages and metric inventories, but the inspected materials do not define product-measurement semantics for activation, paid conversion, churn/refunds, affiliate disclosure exposure, responsible-gambling incidents, pick impressions-to-action, calibration by sport/market, or experiment guardrails. Without event schemas, denominators, versioning, and privacy limits, dashboards can create misleading success signals.

**Recommended action:** Create a measurement plan with event names/schema/owner, consent and minimization rules, stable denominators, cohort and sport/market slices, model/data-version dimensions, bot/duplicate handling, confidence intervals, and stop criteria for safety, complaints, refunds, stale data, and calibration regressions. Review it in the launch gate.

**Why missed before:** Prior review focused on whether performance claims were gated, not whether the underlying product and safety metrics are defined well enough to support a launch decision.

**Evidence:** https://raw.githubusercontent.com/Beexly/Sports/main/docs/launch-observatory.md

---

### F38. [HIGH] Production reliability, privacy/consent, data rights, explainability, user safet

The repository's current-mode statement says internal calibration only, no auto-publish, no auto-send, no external posting, and no automated betting; that is a strong safety posture, but it is not itself a launch gate. The inspected docs do not show a single signed release checklist requiring privacy/age/geo review, security threat-model disposition, restore drill, observability readiness, explanation samples, payment/affiliate reconciliation, and rollback owner before public flags are enabled.

**Recommended action:** Turn the current safeguards into a fail-closed promotion gate with named approvers and evidence links: legal/privacy, safety/compliance, security, reliability, data-rights, model/explainability, payments, and support. Require canary exposure, rollback rehearsal, kill switches, and post-launch review before enabling each flag independently.

**Why missed before:** The prior review likely credited the many flags and frozen modes as completed controls; the gap is governance evidence and launch accountability, not merely feature gating.

**Evidence:** https://raw.githubusercontent.com/Beexly/Sports/main/README.md

---

## Underleveraged / Overvalued

- **Underleveraged: calibration is treated mainly as an offline/reporting capability rather than the promotion criterion for model selection and product decisions.**
  - Implication: Make proper scoring, reliability, segment calibration and decision utility first-class model-registry gates; accuracy or hit rate alone is insufficient for probability-driven fantasy and market decisions.

- **Underleveraged: the repository has shadow signals, evidence, source freshness, ranking and proof vocabulary, but the durable schema still centers on market picks and free-text modelVersion values.**
  - Implication: Build fantasy projection, distribution, ownership, contest, lineup and model-artifact entities rather than hiding them in Pick or unversioned JSON.

- **Overvalued: a large backtest harness and many tests can look like historical proof, but the core harness removes outcomes and reports win/loss/push summaries without fantasy objectives, calibration, time-sliced training, contest utility or a promotion receipt.**
  - Implication: Retain the outcome-removal guard, then add a sealed point-in-time evaluation protocol and machine-readable evidence receipt before any superiority claim.

- **Underleveraged: the source registry and evidence graph are strong primitives, but use-with-caution data can still be technically ingestible.**
  - Implication: Separate technical ingestion from product/training eligibility; caution or unresolved-rights data belongs in quarantined research storage only.

- **Underleveraged: uncertainty code exists, but the repository explicitly avoids claiming a usual Jackknife+ guarantee and does not show that interval coverage reaches lineup decisions.**
  - Implication: Publish coverage, interval width and refusal rates by sport/position/horizon; use time-aware conformal methods and gate on coverage collapse or unusably wide intervals.

- **Underleveraged: player-tracking, event and tactical data are more valuable than simply adding more box-score feeds, but the second pass still found major commercial/contract boundaries.**
  - Implication: Prioritize one contracted tracking/event partner and one first-party/public advanced-stat lane per sport; do not try to recreate exclusive raw tracking without rights.

- **Overvalued: free-first coverage and many adapters do not imply reproducible, point-in-time training data.**
  - Implication: A source is production-useful only when identity, rights, as-of availability, correction history, freshness, conflict policy and retention are all captured.

- **Underleveraged: current internal-calibration/no-auto-publish posture is a meaningful safety control, but not a release proof.**
  - Implication: Convert it into a signed, fail-closed promotion gate covering legal/privacy, data rights, security, SLO/restore, explanation samples, payments and rollback ownership.

## Expanded research conclusion

The next bottleneck is not finding another hundred feeds. It is converting the existing breadth into a trustworthy temporal data contract, durable fantasy schema, model registry, distributional/ownership model, and sealed evaluation loop. The second pass found that the repository is stronger in gates, evidence vocabulary and deterministic testing than its durable fantasy/model artifacts suggest, and weaker in point-in-time semantics, model ownership, contest-state persistence, operational SLO/privacy/security evidence and production drift controls than its documentation breadth suggests.

### Citations

- https://raw.githubusercontent.com/Beexly/Sports/main/packages/db/prisma/schema.prisma
- https://raw.githubusercontent.com/Beexly/Sports/main/docs/architecture/2026-09-18-signal-architecture.md
- https://docs.feast.dev/getting-started/concepts/point-in-time-joins
- https://raw.githubusercontent.com/Beexly/Sports/main/docs/ops/CURRENT_STATE.md
- https://www.evidentlyai.com/ml-in-production/data-drift


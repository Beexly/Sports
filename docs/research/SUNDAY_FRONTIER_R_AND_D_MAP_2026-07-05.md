# Sunday Frontier R&D Map - 2026-07-05

Purpose: identify aggressive but lawful research and implementation lanes that move Galaxy Sports Edge toward a serious sports intelligence company without scraping restricted sources, spending money, using secrets, or fabricating claims.

Operating rule: phrase "loopholes" as lawful openings, terms-approved gaps, open-source analogs, public-data methods, underused rights-cleared sources, competitor blind spots, workflow asymmetries, and process advantages.

## Legal Boundary

Allowed:

- open datasets
- public documentation
- terms-approved APIs
- cleared first-party data
- open-source methods
- academic formulas
- synthetic fixtures
- derived metrics from cleared inputs
- local-only shadow architecture
- public-safe media, docs, and tests
- guardrails that block unsupported claims

Not allowed:

- restricted scraping
- paywall bypass
- CAPTCHA bypass
- credential misuse
- fake accounts
- proprietary formula copying
- raw paid API redistribution
- raw NGS row exposure
- copyrighted broadcast footage without rights
- live AWS or paid resources without approval
- fake performance, revenue, audience, or sponsor claims
- auto-publishing, auto-emailing, or betting automation

Requires owner or counsel approval:

- live data contracts
- affiliate/sportsbook offers
- public API terms
- public performance claims
- use of benchmark data with uncertain redistribution rights
- any AWS deploy, account mutation, or paid service

## Open Data And Rights-Cleared Inputs

Best current lanes:

- nflverse and other open football data for historical features and validation.
- Public schedules, rosters, depth charts, injuries, snap counts, and play-by-play where licenses permit.
- Synthetic fixtures for partner collaboration, AWS mocks, and API payload tests.
- User-provided private data in local-only tools, with payload-rights classification before any export.

Research objective:

- Turn raw facts into GSE-derived features, expected baselines, residuals, uncertainty, and decision-quality scores.
- Never re-serve raw restricted feeds as the product.

## Academic And Open Methods

High-value methods to explore:

- proper scoring rules: Brier, log loss, calibration error, sharpness
- conformal prediction for uncertainty intervals
- Elo, Glicko, and TrueSkill for latent strength baselines
- Bradley-Terry and Plackett-Luce for matchup comparisons
- hierarchical Bayes and empirical Bayes shrinkage for sparse player/team samples
- Kalman filters and state-space models for time-varying form
- hidden Markov models for role and usage regimes
- splines and generalized additive models for nonlinear feature effects
- hurdle and Tweedie models for zero-inflated fantasy or yardage outcomes
- model parliament with vetoes and disagreement tracking
- drift detection with PSI, KL divergence, chi-square, ECE drift, and segment parity

Engineering requirement:

- Every method must become a deterministic, tested, documented shadow primitive before it can influence public claims.

## Prediction And Decision Research

Priority questions:

1. What does the model think will happen?
2. How calibrated is that probability?
3. How reliable are the inputs?
4. How stale or contradictory is the market?
5. What is the no-bet pressure?
6. What would make the decision wrong?
7. What can be shown publicly without leaking protected weights or restricted payloads?

Decision doctrine:

- Confidence is not win probability.
- GSE Signal Score is decision quality, not win probability.
- No bet is a decision.
- High EV cannot override missing data, stale inputs, unclear rights, drift, or calibration debt.

## Market Intelligence

Lawful lanes:

- derived market movement summaries from terms-approved odds inputs
- stale-line risk scoring
- book dispersion scoring
- playable-window scoring
- market mirage detection from open or licensed snapshots
- synthetic market fixtures for tests and public education

Do not:

- claim market-beating performance without settled evidence
- imply CLV success without sample size and approval
- expose raw paid odds payloads if terms do not allow it

## Source Rights And Payload Rights

Required architecture:

- source-rights envelope for every data input
- payload-rights classification for every API response
- metric birth certificate for every proprietary metric
- metric card, model card, validation report, and drift card before promotion
- public/private exposure level on every metric

Immediate implementation lane:

- add adapters under `apps/web/lib/source-rights` and `apps/web/lib/ip` that reuse the existing registry and prediction-engine metric rights primitives.
- add tests that restricted, unclear, stale, and raw-payload inputs fail closed.

## API Readiness

Safe API product:

- GSE-derived intelligence only
- no raw sports data resale
- no raw odds resale
- no raw NGS exposure
- auth required
- scopes required
- rate limit required
- request ID required
- response envelope required
- payload-rights filter required
- usage event required
- raw keys never logged

Next pure seams:

- API key parser and hash comparison
- scope and plan model
- quota window
- error model
- webhook signature verifier
- idempotency helper
- response envelope
- payload-rights filter
- OpenAPI generator

Routes should remain dormant until pure seam tests pass.

## Media And Commercial Growth

Best lawful asymmetry:

- show the operating system, not fake certainty
- teach why sports prediction needs audits
- turn losses into autopsies
- make no-bet discipline visible
- explain source reliability and stale-market failure modes
- create partner trust with disclosure and editorial independence

Guardrail requirement:

- every public title, hook, script, sponsor package, and offer copy should pass commercial-copy and unsupported-performance scans before publication.

## AWS And Cloud Shadow R&D

AWS role: support infrastructure, not the center of the company.

No-cost lanes:

- Shadow Control Tower governance fixtures
- Well-Architected six-pillar scorecards
- Bedrock/AgentCore agent contracts as local specs
- Bedrock Guardrails policy blueprints as local docs
- SageMaker Model Monitor analogs through local model/drift cards
- Clean Rooms synthetic collaboration fixtures
- Step Functions ASL fixtures for metric validation workflows
- EventBridge event fixtures for audit and drift events
- CDK synth fixtures only

No live AWS action:

- no credentials
- no deploy
- no account mutation
- no hosted resources
- no DNS
- no paid service

Funding and credits candidates to verify from official pages before action:

- AWS Activate
- Google Cloud for Startups
- Microsoft for Startups
- NVIDIA Inception
- DigitalOcean Hatch or startup programs
- Neon startup or launch programs
- Databricks startup programs
- Vercel startup or credits options

This pass did not live-refresh those program terms. Any application packet must verify current eligibility, obligations, credit expiration, and data/security terms from official sources first.

## Next Experiments

1. Partner-offer compliance scanner with high-risk sportsbook/DFS fail-closed defaults.
2. API payload-rights scanner that blocks raw NGS, raw paid odds, and restricted-source echoes.
3. Source-rights adapters that make existing registry decisions reusable across content, API, metric, and model surfaces.
4. No-bet governor tests that prove stale inputs, calibration debt, drift, and missing data can veto high EV.
5. Metric backlog slice: Receiver Difficulty and Expected YAC with birth certificates, protected transforms, and directional tests.
6. Well-Architected local scorecard index under `docs/aws` that links to existing FABLE/AWS artifacts.
7. 30-day media queue fixture with claim-safety scores and public-safe CTAs.
8. API auth pure seam with hashed key comparison and no raw-key logging tests.
9. Model/drift card generator for every shadow metric asset.
10. Commercial page visual QA and route smoke after copy updates.

## Success Metrics

- more repo-visible proof, fewer unsupported claims
- more tests around trust boundaries
- every commercial surface has claim-safety gates
- every proprietary metric has birth certificate and rights envelope
- every API proposal has payload-rights classification
- every AWS artifact remains local, no-cost, and credential-free
- every public claim can point to code, docs, tests, or settled evidence

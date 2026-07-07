# GSE Shadow Metric Evidence Reports

Updated: 2026-07-06

These reports are generated from synthetic/local evidence fixtures in `@sports/prediction-engine`.
They are proof of local governance behavior only. They do not approve public content, API exposure,
licensing, betting use, production promotion, legal clearance, or metric lifecycle graduation.

## Shared Locks

- Every report is shadow-only.
- Every report keeps API exposure `INTERNAL`.
- Every report keeps licensing status `NOT_READY`.
- Every report keeps public API exposure disabled.
- Every report keeps live route creation disabled.
- Every report labels evidence as synthetic/local.
- No report creates a probability, expected-value, pick, or betting-advice claim.

## Report Index

| Metric | Fixture file name | Model card | Drift card | Public API | Live route |
| --- | --- | --- | --- | --- | --- |
| `stale-line-risk-score` | `stale-line-risk-score.md` | DRAFT | WATCH | false | false |
| `qb-burden-index` | `qb-burden-index.md` | DRAFT | STABLE | false | false |
| `role-volatility-index` | `role-volatility-index.md` | DRAFT | WATCH | false | false |
| `calibration-integrity-grade` | `calibration-integrity-grade.md` | DRAFT | WATCH | false | false |
| `drift-pressure-index` | `drift-pressure-index.md` | DRAFT | WATCH | false | false |
| `no-bet-pressure` | `no-bet-pressure.md` | DRAFT | WATCH | false | false |
| `playable-window-score` | `playable-window-score.md` | DRAFT | SEVERE | false | false |
| `portfolio-fit-score` | `portfolio-fit-score.md` | DRAFT | STABLE | false | false |
| `market-mirage-score` | `market-mirage-score.md` | DRAFT | WATCH | false | false |

## Stale Line Risk Score

Generated from synthetic/local metric evidence fixtures.

Boundary:

- Lifecycle: `SHADOW`.
- API exposure: `INTERNAL`.
- Licensing: `NOT_READY`.
- Public API allowed: false.
- Live route created: false.
- This report does not approve public content, API exposure, licensing, betting use, or production promotion.

Model card:

- Status: `DRAFT`.
- Summary: DRAFT model card for Stale Line Risk Score (`stale-line-risk-score`). Metric lifecycle is `SHADOW`; generated evidence does not change lifecycle or exposure.
- Limitations include market staleness caveats, fixture-only validation, and the requirement for cleared historical odds snapshots before any promotion review.
- Evidence refs: `docs/math/GSE_PROPRIETARY_METRIC_BIBLE.md`, `fixture-slrs-validation`, `fixture-slrs-model-card`, `fixture-slrs-market-freshness-split`.

Drift card:

- Status: `WATCH`.
- Check: `market_freshness_psi` value `0.18` against watch `0.15` and severe `0.30`.
- Evidence refs: `docs/math/GSE_PROPRIETARY_METRIC_BIBLE.md`, `fixture-slrs-market-freshness-split`, `fixture-slrs-model-card`.

## QB Burden Index

Generated from synthetic/local metric evidence fixtures.

Boundary:

- Lifecycle: `SHADOW`.
- API exposure: `INTERNAL`.
- Licensing: `NOT_READY`.
- Public API allowed: false.
- Live route created: false.
- This report does not approve public content, API exposure, licensing, betting use, or production promotion.

Model card:

- Status: `DRAFT`.
- Summary: DRAFT model card for QB Burden Index (`qb-burden-index`). Metric lifecycle is `SHADOW`; generated evidence does not change lifecycle or exposure.
- Limitations include proxy-heavy burden inputs, fixture-only validation, and the rule that QBI is contextual burden, not quarterback quality or win probability.
- Evidence refs: `docs/math/GSE_PROPRIETARY_METRIC_BIBLE.md`, `fixture-qbi-validation`, `fixture-qbi-model-card`, `fixture-qbi-burden-split`.

Drift card:

- Status: `STABLE`.
- Check: `burden_distribution_psi` value `0.08` against watch `0.14` and severe `0.28`.
- Evidence refs: `docs/math/GSE_PROPRIETARY_METRIC_BIBLE.md`, `fixture-qbi-burden-split`, `fixture-qbi-model-card`.

## Role Volatility Index

Generated from synthetic/local metric evidence fixtures.

Boundary:

- Lifecycle: `SHADOW`.
- API exposure: `INTERNAL`.
- Licensing: `NOT_READY`.
- Public API allowed: false.
- Live route created: false.
- This report does not approve public content, API exposure, licensing, betting use, or production promotion.

Model card:

- Status: `DRAFT`.
- Summary: DRAFT model card for Role Volatility Index (`role-volatility-index`). Metric lifecycle is `SHADOW`; generated evidence does not change lifecycle or exposure.
- Limitations include fixture-only role stability checks, source-rights review, and the rule that RVI is role instability, not player quality or certainty.
- Evidence refs: `docs/math/GSE_PROPRIETARY_METRIC_BIBLE.md`, `fixture-rvi-validation`, `fixture-rvi-model-card`, `fixture-rvi-role-stability-split`.

Drift card:

- Status: `WATCH`.
- Check: `role_stability_psi` value `0.21` against watch `0.16` and severe `0.32`.
- Evidence refs: `docs/math/GSE_PROPRIETARY_METRIC_BIBLE.md`, `fixture-rvi-role-stability-split`, `fixture-rvi-model-card`.

## Calibration Integrity Grade

Generated from synthetic/local metric evidence fixtures.

Boundary:

- Lifecycle: `SHADOW`.
- API exposure: `INTERNAL`.
- Licensing: `NOT_READY`.
- Public API allowed: false.
- Live route created: false.
- This report does not approve public content, API exposure, licensing, betting use, or production promotion.

Model card:

- Status: `DRAFT`.
- Summary: DRAFT model card for Calibration Integrity Grade (`calibration-integrity-grade`). Metric lifecycle is `SHADOW`; generated evidence does not change lifecycle or exposure.
- Limitations include fixture-only calibration checks and the rule that CIG grades calibration evidence quality, not win probability, public probability, or verified calibration status.
- Evidence refs: `docs/math/GSE_PROPRIETARY_METRIC_BIBLE.md`, `fixture-cig-validation`, `fixture-cig-model-card`, `fixture-cig-calibration-stability-split`.

Drift card:

- Status: `WATCH`.
- Check: `calibration_integrity_ece_delta` value `0.07` against watch `0.05` and severe `0.12`.
- Evidence refs: `docs/math/GSE_PROPRIETARY_METRIC_BIBLE.md`, `fixture-cig-calibration-stability-split`, `fixture-cig-model-card`.

## Drift Pressure Index

Generated from synthetic/local metric evidence fixtures.

Boundary:

- Lifecycle: `SHADOW`.
- API exposure: `INTERNAL`.
- Licensing: `NOT_READY`.
- Public API allowed: false.
- Live route created: false.
- This report does not approve public content, API exposure, licensing, betting use, or production promotion.

Model card:

- Status: `DRAFT`.
- Summary: DRAFT model card for Drift Pressure Index (`drift-pressure-index`). Metric lifecycle is `SHADOW`; generated evidence does not change lifecycle or exposure.
- Limitations include fixture-only drift-pressure checks and the rule that DPI is not public probability, expected value, betting advice, or proof of production drift monitoring.
- Evidence refs: `docs/math/GSE_PROPRIETARY_METRIC_BIBLE.md`, `fixture-dpi-validation`, `fixture-dpi-model-card`, `fixture-dpi-drift-pressure-split`.

Drift card:

- Status: `WATCH`.
- Check: `drift_pressure_composite_delta` value `0.16` against watch `0.12` and severe `0.28`.
- Evidence refs: `docs/math/GSE_PROPRIETARY_METRIC_BIBLE.md`, `fixture-dpi-drift-pressure-split`, `fixture-dpi-model-card`.

## No Bet Pressure

Generated from synthetic/local metric evidence fixtures.

Boundary:

- Lifecycle: `SHADOW`.
- API exposure: `INTERNAL`.
- Licensing: `NOT_READY`.
- Public API allowed: false.
- Live route created: false.
- This report does not approve public content, API exposure, licensing, betting use, or production promotion.

Model card:

- Status: `DRAFT`.
- Summary: DRAFT model card for No-Bet Pressure (`no-bet-pressure`). Metric lifecycle is `SHADOW`; generated evidence does not change lifecycle or exposure.
- Limitations include fixture-only refusal-pressure checks and the rule that NBP is not betting advice, expected value, public probability, pick approval, or responsible-gaming clearance.
- Evidence refs: `docs/math/GSE_PROPRIETARY_METRIC_BIBLE.md`, `fixture-nbp-validation`, `fixture-nbp-model-card`, `fixture-nbp-refusal-pressure-split`.

Drift card:

- Status: `WATCH`.
- Check: `no_bet_hard_pass_rate_delta` value `0.17` against watch `0.12` and severe `0.28`.
- Evidence refs: `docs/math/GSE_PROPRIETARY_METRIC_BIBLE.md`, `fixture-nbp-refusal-pressure-split`, `fixture-nbp-model-card`.

## Playable Window Score

Generated from synthetic/local metric evidence fixtures.

Boundary:

- Lifecycle: `SHADOW`.
- API exposure: `INTERNAL`.
- Licensing: `NOT_READY`.
- Public API allowed: false.
- Live route created: false.
- This report does not approve public content, API exposure, licensing, betting use, or production promotion.

Model card:

- Status: `DRAFT`.
- Summary: DRAFT model card for Playable Window Score (`playable-window-score`). Metric lifecycle is `SHADOW`; generated evidence does not change lifecycle or exposure.
- Limitations include fixture-only decision-window checks and the rule that PWS is readiness for downstream review, not win probability, expected value, confidence, betting advice, or a pick trigger.
- Evidence refs: `docs/math/GSE_PROPRIETARY_METRIC_BIBLE.md`, `fixture-pws-validation`, `fixture-pws-model-card`, `fixture-pws-decision-window-split`.

Drift card:

- Status: `SEVERE`.
- Check: `decision_window_block_rate_delta` value `0.31` against watch `0.12` and severe `0.25`.
- Evidence refs: `docs/math/GSE_PROPRIETARY_METRIC_BIBLE.md`, `fixture-pws-decision-window-split`, `fixture-pws-model-card`.

## Portfolio Fit Score

Generated from synthetic/local metric evidence fixtures.

Boundary:

- Lifecycle: `SHADOW`.
- API exposure: `INTERNAL`.
- Licensing: `NOT_READY`.
- Public API allowed: false.
- Live route created: false.
- This report does not approve public content, API exposure, licensing, betting use, or production promotion.

Model card:

- Status: `DRAFT`.
- Summary: DRAFT model card for Portfolio Fit Score (`portfolio-fit-score`). Metric lifecycle is `SHADOW`; generated evidence does not change lifecycle or exposure.
- Limitations include fixture-only portfolio-composition checks and the rule that PFS is not stake sizing, expected value, betting advice, board approval, or a pick trigger.
- Evidence refs: `docs/math/GSE_PROPRIETARY_METRIC_BIBLE.md`, `fixture-pfs-validation`, `fixture-pfs-model-card`, `fixture-pfs-portfolio-concentration-split`.

Drift card:

- Status: `STABLE`.
- Check: `portfolio_concentration_risk_delta` value `0.11` against watch `0.16` and severe `0.30`.
- Evidence refs: `docs/math/GSE_PROPRIETARY_METRIC_BIBLE.md`, `fixture-pfs-portfolio-concentration-split`, `fixture-pfs-model-card`.

## Market Mirage Score

Generated from synthetic/local metric evidence fixtures.

Boundary:

- Lifecycle: `SHADOW`.
- API exposure: `INTERNAL`.
- Licensing: `NOT_READY`.
- Public API allowed: false.
- Live route created: false.
- This report does not approve public content, API exposure, licensing, betting use, or production promotion.

Model card:

- Status: `DRAFT`.
- Summary: DRAFT model card for Market Mirage Score (`market-mirage-score`). Metric lifecycle is `SHADOW`; generated evidence does not change lifecycle or exposure.
- Limitations include fixture-only market-mirage checks and the rule that MMS is market-integrity risk, not win probability, expected value, confidence, betting advice, or a pick trigger.
- Evidence refs: `docs/math/GSE_PROPRIETARY_METRIC_BIBLE.md`, `fixture-mms-validation`, `fixture-mms-model-card`, `fixture-mms-market-mirage-split`.

Drift card:

- Status: `WATCH`.
- Check: `market_mirage_watch_rate_delta` value `0.19` against watch `0.14` and severe `0.28`.
- Evidence refs: `docs/math/GSE_PROPRIETARY_METRIC_BIBLE.md`, `fixture-mms-market-mirage-split`, `fixture-mms-model-card`.

## Next Gate

The next safe gate is source/payload-reviewed distribution and drift adapters for Drift Pressure Index and
any remaining governed metric backlog.
Do not create public/API routes, model promotion, pricing,
betting use, publication, or cloud/live-service actions from this report. Historical validation must
prove source rights, payload rights, calibration separation, and drift behavior before any promotion
review.

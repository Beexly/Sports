# Pick attribution schema (v1, 2026-08-26)
Each field enables a later analysis that falsifyBind alone cannot provide.

- `feature_group`: which feature set drove the pick (line-movement, team-stats, player-props, pairs). Enables feature-level P&L attribution.
- `adversarial_holdout_passed`: did this pick survive a holdout against our own prior picks? Enables adversarial validation (§5).
- `single_or_portfolio`: singles vs portfolio decision. Enables comparison of single-Kelly vs Whitrow 2007 portfolio sizing (§2).
- `pre_reg_ref`: links pick to pre-registered model (§1). Enables pre-registration compliance tracking.
- `portfolio_decision`: boolean — only relevant when `single_or_portfolio` = `portfolio`.

Usage: `schemas/bet_log_v1.json` defines the JSON structure; this doc defines semantics. Together they make adversarial validation repeatable.

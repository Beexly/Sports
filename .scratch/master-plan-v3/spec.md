# Master Plan v3.0 Specification

## Problem Statement

Galaxy Sports Edge experienced compounding live failures: `localhost:3000` failed to boot cleanly on Windows dev machines, paid one-time pack buyers resolved to `FREE` inside `getUserEntitlements()` while unverified Whop prefixes and `gse_unlock_global` created authorization bypasses, live `/props` and `/packages/[slug]` checkout routes still imported stale Week 8 static JSON rendering `"Props withheld"` and `"do not buy today"`, Sunday+MNF packs omitted `SNF`/`MNF` on unlock, `%` rates were rewritten to `" out of 100"`, and the pregame/DFS pipeline dropped vacated starter volume into `"OTHER_TEAM_*"` sinks while inflating pocket-QB rushing yards.

## Solution

Deliver a cohesive, verified recovery across six vertical slices (`01` through `06`):
1. Clean developer setup (`CODING_STANDARDS.md`, `GLOSSARY.md`, ADRs `0011..0012`), disk headroom tooling (`rclone` cold offload), and cross-platform `localhost:3000` dev recovery.
2. Fail-closed storefront security (`whop.ts`, HMAC per-slug unlock cookies, Stripe webhook cleanup + post-checkout magic links) and unified `Subscription` + unexpired `PackagePurchase` entitlements.
3. Deterministic CAGE + `@sports/governed` (`mode: "ENFORCE"`) pre-publication policy gating backed by `SealedSlatePacket` and live Web surfaces (`/props`, `/packages/[slug]`, `/dfs` redirect, `/fantasy/dfs`, plain-English prose).
4. Deep-module Python 3.12+ engine (`src/gse_engine`) integrating `google/magika` feed guards, `google/langextract` char-span grounded beat claims, Sinkhorn vacated-volume conservation, empirical QB scramble + `-1`-yd kneeldown physics, anti-cannibalization prop gates, Empirical-Covariance `2-TE`/late-swap `FLEX` DFS, and `< 1s` `Lineup Doctor`.
5. Durable Temporal `SlateWindowWorkflow` (Wed/Fri/Sun Noon Master Locks + `T-90m` adjustments + LIFO Saga), `LocalStack`/R2 `boto3` receipts, `gse-ml-service` `/predict/etkf` wiring, and Arize AX Weeks 1-9 walk-forward OOS gating.
6. Cron split-brain lock gating, closing-snapshot CLV wiring, `google/osv.dev` polyglot vulnerability audit, 59-repo `INGEST-AND-LEARN` corpus registry, and comprehensive Vitest + pytest suites.

## Testing Decisions

- **Public Seams Only:** Tests target `getUserEntitlements`, `verifyWhopMembership`, `verifyUnlockCookie`, `enforceSlatePublication`, `evaluateCagePublicationPolicy`, `loadActiveSealedSlate`, `filterWriteupsForWindowSlot`, `verify_feed_payload`, `extract_grounded_beat_claims`, `reallocate_vacated_volume`, `project_qb_rushing`, `evaluate_prop_board`, `audit_and_repair_lineup`, `SlateWindowWorkflow`, `S3ReceiptArchiver`, and `evaluate_walk_forward_calibration`.
- **Fail-Closed & Non-Tautological:** Every security, policy, and conservation test uses independent fixtures and asserts negative/rejection cases explicitly.

## Out of Scope

- Lifting the `$0` real-money stake freeze on SNF/MNF before Weeks 1-9 OOS backtest achieves `ECE <= 0.035` and positive CLV.
- Editing `.claude/settings.json` denied paths directly (CI/migration/guardrail additions live in `scripts/ops/` and `docs/ops/` until operator sync).

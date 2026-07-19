# Galaxy Sports Edge — Gate Matrix (LC-006)

**Generated:** 2026-07-19 00:30 UTC
**Method:** a bounded scout inventory (grep-based, codebase-wide) of every feature-flag/gate
found, followed by direct independent verification of every claim flagged as a possible
inconsistency or bug before it was trusted into this matrix. Claims not independently
re-verified line-by-line are marked so explicitly — this is a first-pass inventory, not a
line-by-line audit of all 33 gates.

**The goal stated in the LC-006 spec is not every boolean true.** Every gate below is currently
`false`/closed on current `main`. That is the CORRECT state for nearly all of them — this matrix
exists to make that legibility explicit (which gates are closed *for a good, evidenced reason*
vs. closed *because nobody has done the prerequisite work yet*), not to argue for flipping them.

## Verification note (read this first)

Two of the scout's four flagged "inconsistencies" did not survive direct verification and are
**not** treated as findings below:

- **`SYNTHETIC_MONITORING_ENABLED`** (`apps/web/lib/synthetic-monitoring/dashboard.ts:322,394`):
  checked directly. `enabled: ... !== "false"` (322) and `if (... === "false") return "paused"`
  (394) are logically complementary expressions of the identical rule ("on unless explicitly set
  to the string 'false'") — not a contradiction, just an unusual (opt-out rather than opt-in)
  default for a monitoring-only flag, which is a reasonable choice for observability.
- **`PROJECTIONS_PROVIDER`**: checked directly across `apps/web/lib/integrations/providers.ts:41`
  (`Boolean(env[p.envVar] && String(env[p.envVar]).trim().length > 0)`) and
  `apps/web/instrumentation.ts:50` (`!flag || flag.trim().length === 0`). Both implement the
  identical "non-empty after trim" rule, just written as positive vs. negative conditions — not
  an inconsistency.

One held up:

- **`CONTENT_WORKER_ENABLED`** (`workers/content-publishing/src/index.ts:14`): confirmed
  genuinely unused — declared but never read by `runContentPublisher()`, which checks only
  `INTERNAL_CALIBRATION_ONLY` (line 32). This is **intentional**, not a bug: the file's own doc
  comment (lines 1-12) explains it's a hard kill-switch left in place for historical clarity
  after the legacy auto-publisher was disabled. Harmless vestigial code, not a correctness issue
  — noted below, not treated as something requiring a fix.

## The matrix

| Gate | Current | Desired | Owner | Prerequisites | Risk if flipped now | Autonomous or Owner-Gated | Disposition |
|---|---|---|---|---|---|---|---|
| `CANONICAL_HISTORY_ENABLED` | `false` | `true` eventually | Founder | 7+ days of real ingestion establishing a baseline | Would let unproven bootstrap-era data feed every downstream gate below | Owner-gated | Correctly closed — root gate, nothing downstream can safely open before this does |
| `PUBLIC_PICKS_ENABLED` | `false` | `true` eventually | Founder | `CANONICAL_HISTORY_ENABLED=true` first | Live picks would go public on an unproven data foundation | Owner-gated | Correctly closed |
| `DERIVED_MODEL_HISTORY_ENABLED` | `false` | `true` eventually | Founder | `CANONICAL_HISTORY_ENABLED=true` + 50+ settled games/sport | Scoring would use ATS/H2H/venue features computed on insufficient sample | Owner-gated | Correctly closed |
| `PERFORMANCE_STATS_ENABLED` | `false` | `true` eventually | Founder | `CANONICAL_HISTORY_ENABLED=true` + non-zero non-bootstrap picks | `/api/performance` would publish win rates computed on bootstrap-era data | Owner-gated | Correctly closed |
| `PUBLIC_BLOG_ENABLED` | `false` | `true` eventually | Founder | `CANONICAL_HISTORY_ENABLED=true` + content-quality calibration | Auto-generated content referencing unproven track record | Owner-gated | Correctly closed |
| `FEATURED_PICK_PROMOTION_ENABLED` | `false` | `true` eventually | Founder | Calibrated confidence thresholds against real win-rate data | Promoting picks by a confidence score not yet validated against outcomes | Owner-gated | Correctly closed |
| `OUTCOME_LEARNING_ENABLED` | `false` | `true` eventually | Founder | 100+ canonical settled picks with verified outcomes | Premature learning-eligibility marking on too small a sample | Owner-gated | Correctly closed |
| `CALIBRATION_ADJUSTMENTS_ENABLED` | `false` | `true` after proof | Founder | 100+ learning-eligible picks, held-out validation, MODEL_VERSION bump (documented hard rule) | Public reliability diagram would show an uncalibrated model as calibrated | Owner-gated | Correctly closed — this is the platform's proof-gate for CLAUDE.md's confidence-calibration promise |
| `CONFIDENCE_DISPLAY_MODE` | `"labels"` | `"precision"` after calibration | Founder | Post-calibration verification | Showing raw 0-100 numbers implies precision the model hasn't earned yet | Owner-gated | Correctly closed |
| `FORCE_NO_BET_IF_STALE` | `false` | N/A (situational kill switch) | N/A | None — pure code | None; this is a safety switch, not a feature gate | **Autonomous-safe** (not evidence-blocked) | No action needed; correctly available for use, not something to "turn on" permanently |
| `MIN_DATA_QUALITY_FOR_GAME_LOG` (threshold, not boolean) | `40` | N/A | Founder | Model-tuning decision | Raising/lowering changes what data enters TeamGameLog | Owner-gated | Correctly set; a tuning parameter, not a launch blocker |
| `MIN_SETTLED_PICKS_FOR_LEARNING` (threshold) | `100` | N/A | Founder | Statistical sample-size decision | Lowering risks overfitting calibration to too few outcomes | Owner-gated | Correctly set |
| `PUBLISH_LEDGER` | `false` (confirmed live via `/api/proof/ledger` this session) | `true` after proof | Founder | `CANONICAL_HISTORY_ENABLED=true` + sufficient settled picks | Publishing an empty/unproven performance ledger as if it were real | Owner-gated | Correctly closed; independently confirmed live in LC-000 |
| `STRIPE_TERMS_CONSENT_ENABLED` | `false` | `true` eventually | Founder | **Stripe Dashboard Terms-of-Service URL must be set FIRST** — flipping before that 500s every Checkout Session | Revenue-breaking if flipped without the Dashboard prerequisite | Owner-gated, external precondition | Correctly closed; CLAUDE.md's own documented order-of-operations warning |
| `GSE_WAITLIST_GATE_ENABLED` | `false` | Situational | Operator | `GSE_WAITLIST_BASIC_USER`/`PASSWORD` must both be set if enabled; fails closed if credentials are missing | None if left off; if flipped without credentials, fails closed (safe) | Autonomous-safe (fails closed) | No action needed |
| `HIGGSFIELD_GENERATION_ENABLED` | `false` | Situational | Founder | Must pair with `OWNER_VISUAL_SPEND_APPROVED=true` + per-asset approval | Real money spend on generated visual assets | Owner-gated (spend is irreversible) | Correctly closed |
| `OWNER_VISUAL_SPEND_APPROVED` | `false` | Situational | Founder | Requires `HIGGSFIELD_GENERATION_ENABLED=true` | Same as above — dual-gate by design | Owner-gated | Correctly closed |
| `SEALED_ENGINE_ENABLED` | `false` | `true` after proof | Founder | Complete sealed holdout (walk-forward) validation | Publishing "sealed" picks without genuine holdout validation would be a false proof claim | Owner-gated | Correctly closed — this is the platform's proof-gate for the Sealed Engine's core claim |
| `LEDGER_ANCHOR_ENABLED` | `false` | Situational | Founder | Dual-gated (env flag AND a literal `"FOUNDER-CONFIRMED"` confirmation string); no network I/O implemented — returns a payload only | None currently reachable — no network path exists to anchor anything even if flipped | Founder-only, dual-gate by design | Correctly closed; the strongest-gated item in this matrix |
| `RECONSTRUCTION_FEATURES_ENABLED` | `false` | Product decision | Founder/product | None — pure code | UI-only; low risk | Autonomous-safe, but flipping is a product decision this session has no evidence to make | Not flipped — no evidence it should ship now |
| `DEMO_PICKS_ENABLED` | `false` | N/A (dev/test only) | N/A | None — pure code | Demo data appearing in a production response would be a "No fake data" (CLAUDE.md rule 1) violation if ever flipped in prod | Autonomous-safe to leave off; must NEVER be on in production | Correctly off |
| `JARVIS_MEMORY_WRITE_ENABLED` | `false` | Product decision | Founder | None — pure code, no-op when off | Autonomous memory writes are a product/observability decision | Autonomous-safe (fails to no-op), but flipping is a product decision | Not flipped — no evidence it should ship now |
| `REPLAYABLE_PROVENANCE_ENDPOINT_ENABLED` | `false` | Product decision | Founder | None — pure code | Low risk; empty-chain response when off | Autonomous-safe | Not flipped — no evidence it should ship now |
| `CONTENT_WORKER_ENABLED` | `false` (vestigial, unread) | N/A | N/A | N/A | None — dead code, confirmed never read by any live logic path | N/A | **Cleanup candidate, not a launch blocker** — safe to remove in a future pass, not touched this session to avoid unnecessary scope in a Launch Convergence pass |
| `INTERNAL_CALIBRATION_ONLY` | `true` (default-on kill switch) | `true` until calibration proof exists | Founder | Same calibration proof chain as `CALIBRATION_ADJUSTMENTS_ENABLED` | Flipping off resumes auto-publish before calibration is proven | Owner-gated | Correctly closed (i.e., correctly ON as a kill switch) |
| `SYNTHETIC_MONITORING_ENABLED` | default-on (opt-out via `"false"`) | on | N/A | None | Observability-only; no production behavior risk | Autonomous-safe | Already effectively "open" by design (default-on) |
| `LINE_ARCHIVE_ENABLED` | `false` (per test-file reference; not independently re-verified this pass) | `true` after proof | Founder | Odds provider failover + dual-source validation (R5 model-behavior change) | Would change model behavior without the documented validation | Owner-gated | Correctly closed |
| `BACKTEST_HARNESS_ENABLED` | `false` (via `apps/web/app/api/cron/backtest-calibration/route.ts:61`) | `true` after proof | Founder | 100+ learning-eligible settled picks | Same statistical-validation gate as calibration | Owner-gated | Correctly closed |
| `NEXT_PUBLIC_ANALYTICS_ENABLED` | `false`/unset | Situational | Operator | Requires a real analytics project ID configured (see LB-004, the Clarity `undefined`-ID finding from LC-000) | None if left off; LB-004 shows what happens if flipped without a real ID | Autonomous-safe, but the LB-004 finding should be fixed before ever flipping this | Correctly off; cross-references LB-004 |
| `PROJECTIONS_PROVIDER` (string, not boolean) | unset/empty | A licensed provider name | Founder | A licensed player-projections feed contract | Real lineup/waiver/trade/DFS recommendations would go live on whatever data source is configured — must be a real, rights-cleared feed | Owner-gated (explicitly named in this campaign's hard-never list: "activate a model/provider") | Correctly closed |
| `AIRWAVE_ENABLED` + `AIRWAVE_TRANSCRIPT_IMPORT_ENABLED` | `false`/unset | Situational | Operator | A configured transcript source file/sheet | Local file import only, no external API call — low risk | Autonomous-safe | Not flipped — no evidence it should ship now |
| `MIGRATE_GATE_ALLOW_UNVERIFIED` | `false`/unset | Never `true` in committed code | N/A (break-glass only) | N/A | **HIGH** — allows schema migration on an unverified database, skipping a safety check | Must never be set in committed code; an operator-only, session-scoped override | Correctly off; confirmed not set anywhere in the tracked tree (secret-scan/guardrail sweep this session found nothing) |

## Summary

**Zero gates opened this pass.** Every gate in this matrix is closed for a specific, evidenced
reason — most are proof-gated behind real statistical/data prerequisites this session cannot
manufacture (no DB access to accumulate settled picks, no live odds feed, no calibration
sample), a handful are explicitly founder-only by the campaign's own hard-never list
(`PROJECTIONS_PROVIDER`, model/provider activation), and the rest are product decisions with no
evidence one way or the other that this session is positioned to make.

**One cleanup candidate identified, not acted on:** `CONTENT_WORKER_ENABLED` is confirmed dead
code (declared, never read). Low value, zero risk, deliberately left for a dedicated cleanup
pass rather than mixed into a Launch Convergence gate audit.

**Two scout-flagged "inconsistencies" independently checked and found to be non-issues**
(`SYNTHETIC_MONITORING_ENABLED`, `PROJECTIONS_PROVIDER`) — see the verification note above.

**Cross-references:** `PUBLISH_LEDGER`'s live-off state was independently confirmed via direct
fetch in LC-000. `NEXT_PUBLIC_ANALYTICS_ENABLED`'s risk-if-misconfigured is exactly LB-004 (the
Clarity `undefined` project ID finding), already on the Launch Blocker Ledger.

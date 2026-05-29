# Feature Flag Kill Switches

Inventory of environment-level kill switches that can disable a
capability without a deploy.

## Top-level: launch mode

Set via `GALAXY_LAUNCH_MODE`. Drops capabilities atomically:

| Mode | publicPicks | payments | analytics | aiAssistant | autoPublish |
|---|---|---|---|---|---|
| `development` | true | false | false | false | false |
| `internal-calibration` | false | false | false | false | false |
| `private-alpha` | true | false | true | true | false |
| `closed-beta` | true | true | true | true | false |
| `public-demo` | true | false | true | true | false |
| `production` | true | true | true | true | true |

**Note:** `externalPosting` is `false` in every mode per Constitution #14.

## Per-capability kill switches

| Switch | Env var | Effect when `false` |
|---|---|---|
| Live AI in CoachPromptHost | `COACH_LIVE_AI_ENABLED` | Returns canned responses only |
| The Odds API | absent `THE_ODDS_API_KEY` | Bootstrap mode, evidence labels degraded |
| Stripe payments | absent `STRIPE_SECRET_KEY` | Paywall checkout disabled |
| Anthropic content gen | absent `ANTHROPIC_API_KEY` | Content jobs skip |
| Telemetry sink | derived from `analytics` capability | Route returns `noop:true` |
| Demo data | `IS_STUB_MODE=true` | Renders sample data with `sample` freshness labels |
| Demo picks | `DEMO_PICKS_ENABLED=true` | Reveals deterministic sample picks for tour |

## Page-level kill switches

| Surface | Switch | Effect |
|---|---|---|
| `/today` | falls through to bootstrap if no live picks | renders "no picks today" state |
| `/picks` | gated on `capabilities.publicPicks` | redirect to `/methodology` |
| `/parlay-mri` | hard-on, no kill switch | always available (educational) |
| `/galaxy-demo` | hard-on, no kill switch | always available (noindex) |
| `/api/telemetry` | gated on `capabilities.analytics` | returns `noop:true` |
| Decision Coach | `COACH_LIVE_AI_ENABLED` | falls back to canned responses |

## Operational rules

1. **Never delete an env var from a running deploy** — set it to empty string instead, or use the `internal-calibration` mode to drop everything at once.
2. **Kill switches are tested in staging quarterly.** A switch that hasn't been exercised is broken.
3. **Kill-switch flips are logged.** Record the actor + reason in the incident response thread.
4. **Constitutional invariants are NOT kill-switch-controlled.** No env var can re-enable autonomous external publishing, certainty language, or methodology leakage.

## When to flip

| Situation | Switch |
|---|---|
| Odds provider returns garbage | `THE_ODDS_API_KEY` to empty → bootstrap mode |
| Anthropic API leaking | `ANTHROPIC_API_KEY` to empty |
| Stripe webhook DDoS | `STRIPE_SECRET_KEY` to empty + return 503 from webhook |
| Bad pick batch published | `GALAXY_LAUNCH_MODE=internal-calibration` until purge |
| Coach surfacing unsafe AI text | `COACH_LIVE_AI_ENABLED=false` |
| Telemetry sink down | no action — route already no-ops on analytics:false |

## When NOT to flip

- "We see one error." → Diagnose first.
- "Latency is elevated." → Investigate the bottleneck, don't pull capabilities.
- "User complained." → Read the report. Most complaints are not infra issues.

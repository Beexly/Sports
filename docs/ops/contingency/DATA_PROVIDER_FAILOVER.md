# Data Provider Failover

How Galaxy degrades when an upstream data provider misbehaves. Honest
labels, no fake picks, no certainty during outages.

## Providers in scope

| Provider | Capability | Surface impact | Kill switch |
|---|---|---|---|
| The Odds API | Live odds, game schedules, line movement | `/today`, `/picks`, `/room`, `/parlay-mri` | `THE_ODDS_API_KEY` empty |
| Anthropic API | Content generation, coach AI (deferred) | Blog generation, `/coach` (C55+) | `ANTHROPIC_API_KEY` empty |
| Stripe API | Payments, entitlements, webhooks | `/pricing`, paywall, account | `STRIPE_SECRET_KEY` empty |
| Google OAuth | Sign-in | `/auth/signin` | `GOOGLE_CLIENT_*` empty |
| Cron platform | Scheduled jobs | Freshness labels, autopsy queue | Cron pause |

## Failure modes per provider

### The Odds API

| Mode | Symptom | Detection | Response |
|---|---|---|---|
| Auth fail (401) | All requests rejected | Worker log: 401 | Treat as outage, flip to bootstrap |
| Rate limit (429) | Subset of requests rejected | Worker log: 429 | Backoff, partial bootstrap mode |
| Stale data | Provider returns same values for >30 min | Freshness watchdog | Label as `stale`, suppress edge claims |
| Bad payload | Schema drift, missing fields | Ingestion validator throws | Reject batch, alert, keep last-good data |
| Slow (p95 > 10s) | Worker queue backs up | Queue depth alarm | Switch to cached values, label `today` not `live` |

**Response procedure:**
1. Verify the issue is provider-side via the provider status page.
2. If yes: flip `THE_ODDS_API_KEY` to empty → bootstrap mode.
3. Surface T6 banner (`STATUS_PAGE_TEMPLATES.md`) on `/today`.
4. Workers continue running and re-attempting; do NOT publish synthetic data.
5. Monitor; restore key when provider recovers.

### Anthropic API

| Mode | Symptom | Response |
|---|---|---|
| Auth fail | 401 from content worker | Pause content cron, alert |
| Rate limit | Slow content job throughput | Queue backoff, no user impact |
| Content safety reject | Worker logs content_filter | Log + skip, no retry on filtered prompt |
| Outage | Repeated 5xx | Pause cron until cleared |

Coach AI is gated separately via `COACH_LIVE_AI_ENABLED` and is `false` at RC — Anthropic outages do not affect user-facing coach (canned responses).

### Stripe API

| Mode | Symptom | Response |
|---|---|---|
| Auth fail | 401 from checkout | Disable `/pricing` checkout button, show "payments paused" banner |
| Webhook signature mismatch | Webhook verification fails | Return 400, do not write entitlements, alert |
| Webhook replay | Duplicate event_id | Idempotency key on entitlement write rejects |
| Account hold | Stripe suspends our account | Existing entitlements preserved (DB-side); checkout disabled |

**Existing paying users keep access during a Stripe outage.** Entitlement is a DB row, not a Stripe API call.

### Google OAuth

| Mode | Response |
|---|---|
| OAuth provider down | Sign-in disabled; existing sessions remain valid (NextAuth JWT) |
| Token validation fails | Force re-sign-in on next request |

### Cron / scheduled jobs

| Mode | Response |
|---|---|
| Cron platform down | Freshness watchdog flips all data labels to `stale` after the expected window |
| Single job stuck | BullMQ retries with exponential backoff; alert at 3 failures |
| Job poisoning (input crashes worker) | Dead-letter queue, alert, never silently drop |

## Cross-provider invariant

When more than one provider degrades, demote `GALAXY_LAUNCH_MODE` to `internal-calibration`. Public surfaces will hide picks and surface bootstrap labels. The platform stays honest; nothing fakes its way through a multi-provider outage.

## What never happens

- Galaxy never synthesizes odds, picks, or evidence to fill a provider gap.
- Galaxy never relabels stale data as live to appear functional.
- Galaxy never silently routes around a Stripe webhook failure (would corrupt entitlements).

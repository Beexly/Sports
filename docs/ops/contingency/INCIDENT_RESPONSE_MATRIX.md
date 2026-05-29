# Incident Response Matrix

Classifies incidents by severity and impact. Sets the response time, the
declared lead, the communication template, and the post-mortem window.

## Severity ladder

| Sev | Definition | Page lead | Detect → Ack | Ack → Mitigate | Post-mortem |
|---|---|---|---|---|---|
| **SEV-1** | Trust-critical surface down, fabricated content shipped, secret leaked, regulatory exposure | On-call + Eng leadership | < 5 min | < 30 min | < 72 h |
| **SEV-2** | Decision-support surface degraded, partial data outage, single-tier paywall break | On-call | < 15 min | < 2 h | < 7 d |
| **SEV-3** | Cosmetic, single-page error, non-blocking telemetry loss | On-call | < 1 h | < 24 h | Optional |
| **SEV-4** | Internal-only, no user impact | Eng triage | Next biz day | Best effort | None |

## Impact axes

- **Trust impact.** Does the incident damage the evidence claim (fabricated number, missing failureCase, certainty language)? → SEV-1 regardless of surface.
- **Decision impact.** Does the incident cause a user to act on stale, wrong, or absent evidence? → SEV-2 minimum.
- **Money impact.** Does the incident affect billing, entitlements, or expose payment data? → SEV-1.
- **Privacy impact.** Does the incident expose PII or telemetry beyond what FORBIDDEN_FIELD_KEYS allows? → SEV-1.

## Declaration template

```
INCIDENT: <short title>
SEVERITY: SEV-N
DECLARED-AT: <iso8601>
SURFACES: <comma list>
USER-IMPACT: <one sentence>
TRUST-IMPACT: <yes/no — explain>
LEAD: <name>
COMM-CHANNEL: <slack channel or chat thread>
STATUS-PAGE: <updated y/n — see STATUS_PAGE_TEMPLATES.md>
```

## Communication cadence

| Severity | Internal updates | External updates |
|---|---|---|
| SEV-1 | Every 15 min until mitigated | Status page within 10 min, hourly thereafter |
| SEV-2 | Every 30 min | Status page within 30 min |
| SEV-3 | At resolution | None unless multi-hour |
| SEV-4 | At resolution | None |

## Post-mortem template

1. Timeline (UTC, minute resolution)
2. User impact (which surfaces, which tiers, est. user count)
3. Trust impact (was any fabricated, certain, or unattributed claim shown?)
4. Root cause (5 whys)
5. Detection: how did we find out, how could we have found out faster
6. Response: what went right, what went wrong
7. Action items (owner + due date)
8. Constitutional review: did any guardrail weaken during the incident?

## Anti-patterns

- Lowering a SEV to avoid the post-mortem
- Declaring "user-error" on a trust incident — fabricated content is always our fault
- Skipping the status page because "it's almost fixed"
- Silently rolling forward through an incident without acknowledging it

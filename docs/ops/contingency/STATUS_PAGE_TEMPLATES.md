# Status Page Templates

Canonical templates for public-facing status updates. Honest framing,
no certainty language, no euphemism for incidents that affected trust.

## Tone rules

- Plain language. Avoid "we have engaged the response team" boilerplate.
- Name what users see. ("Picks page is loading without freshness labels.")
- Never minimize trust impact. If we showed bad data, say so.
- Never claim a fix is verified until it is.
- Date and timezone every update (UTC).

## Templates

### T1 — Investigating

```
[INVESTIGATING] <surface> degraded

At <hh:mm UTC> we observed <symptom>. Users on <surface(s)> may see <user-visible impact>.
We are investigating. Next update by <hh:mm UTC>.
```

### T2 — Identified

```
[IDENTIFIED] <surface> — <root cause category>

We've identified the cause as <data provider issue / database / deploy / etc>.
User impact: <one sentence>. We are <mitigating action>.
Next update by <hh:mm UTC>.
```

### T3 — Mitigated

```
[MITIGATED] <surface> — workaround in place

The immediate user-visible impact is resolved. <Surface> is currently serving
<state — e.g., "bootstrap labels everywhere", "cached data from <time>">.
Full restoration tracked separately. Post-mortem within <72h / 7d>.
```

### T4 — Resolved

```
[RESOLVED] <surface>

The incident is resolved. <Surface> is operating normally.
A post-mortem will be published at <link or "within 72h">.
```

### T5 — Trust incident

When the incident exposed users to fabricated, stale-without-label, or
certainty-coded content:

```
[TRUST INCIDENT — RESOLVED] <surface>

Between <start> and <end> UTC, <surface> may have shown <description of what was wrong>.
This violated our evidence-chain standard. We have <remediation taken>.
Affected users will receive <notification mechanism>.
A full post-mortem covering how this passed review will be published within 7 days.
```

### T6 — Bootstrap mode banner (in-product)

```
Bootstrap mode — live odds unavailable.
The signals shown here use cached or sample data. Treat as illustrative.
We will return to live data when the provider connection is restored.
```

### T7 — Maintenance window (planned)

```
[MAINTENANCE] <surface> — planned window <start> to <end> UTC

We are <description>. During this window, <surface> will <state>.
No action required. See <link> for context.
```

## Routing

| Surface | Channel |
|---|---|
| Public status page | https://status.galaxysports.example (placeholder until DNS) |
| Pro / Elite subscribers | In-app banner via `BoardStateData.bootstrap` flag + status feed |
| Internal | Slack `#ops-incidents` |

## What never goes on the status page

- Internal blame ("the deploy by X engineer")
- Customer PII
- Provider names without their consent (use "data provider")
- Speculation about root cause before T2
- Marketing copy

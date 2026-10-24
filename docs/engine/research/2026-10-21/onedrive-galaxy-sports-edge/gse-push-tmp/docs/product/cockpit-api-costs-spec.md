# `/cockpit/api-costs` — Page Specification

**Status:** Phase 3+ build. Operator-only.
**Owner of code:** Codex.
**Owner of layout:** Claude.
**Location:** `apps/web/app/cockpit/api-costs/page.tsx`.
**Companion spec:** `docs/product/claude-api-cost-monitoring-spec.md`.

---

## TL;DR

The operator dashboard for Claude API spend across all surfaces. Real-time current-month spend per surface, 30-day trend chart, alert history, budget override controls.

This is the visibility layer for the cost monitor that prevents Studio + Model Journal + Model Court + calibration insights from silently 100x'ing the bill.

---

## Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Claude API Costs · Operator Dashboard                        │
│ Current month: 2026-05                                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ CURRENT MONTH SPEND vs BUDGET                                │
│                                                              │
│ ┌─ Surface ──────────────┬─ Spend ──┬─ Budget ─┬─ Status ─┐ │
│ │ Studio                 │ $147     │ $500     │ 29% 🟢   │ │
│ │ Model Journal          │ $12      │ $50      │ 24% 🟢   │ │
│ │ Model Court (Phase 4)  │ $0       │ $2,000   │ 0%       │ │
│ │ Calibration Insight    │ $0       │ $50      │ 0%       │ │
│ │ Blog Generation        │ $0       │ $50      │ 0%       │ │
│ │ Other                  │ $3       │ $100     │ 3% 🟢    │ │
│ ├────────────────────────┼──────────┼──────────┼──────────┤ │
│ │ TOTAL                  │ $162     │ $2,750   │ 6% 🟢    │ │
│ └────────────────────────┴──────────┴──────────┴──────────┘ │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ 30-DAY TREND                                                 │
│                                                              │
│ [Stacked-bar chart: per-surface daily spend over last 30d.   │
│  Y-axis is dollars, X-axis is date. Color-coded per surface.]│
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ TOP CONSUMERS                                                │
│                                                              │
│ By user (when attributed):                                   │
│ - user_abc...  $43  Studio + Model Court                     │
│ - user_def...  $28  Studio                                   │
│ - ...                                                        │
│                                                              │
│ By game (when attributed):                                   │
│ - nba-bos-nyk-2026-05-22  $11  Studio + Model Court          │
│ - ...                                                        │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ RECENT ALERTS                                                │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐    │
│ │ 2026-05-20 14:22  Studio → 50% threshold (yellow)    │    │
│ │ Auto-tightened per-user quota by 50%. No user-       │    │
│ │ visible change.                                       │    │
│ └──────────────────────────────────────────────────────┘    │
│ (none other recent)                                          │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ BUDGET OVERRIDE                                              │
│                                                              │
│ ☐ Override hard-cap (allows continued generation after       │
│   150% threshold). Active until end of billing cycle.        │
│ [confirmation modal required]                                │
│                                                              │
│ Current overrides: none active                               │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ RECENT ERROR LOG                                             │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐    │
│ │ 2026-05-21 08:15  Studio → rate_limit_exceeded       │    │
│ │ Anthropic API rate limit hit. Retried in 60s, success│    │
│ └──────────────────────────────────────────────────────┘    │
│ ...                                                          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Behavior

### Per-surface spend row

- **Spend** — sum of `ClaudeApiCallRecord.estimatedCostUsd` for the current month, filtered to the surface.
- **Budget** — `ClaudeApiBudget.monthlyBudgetUsd` for the surface.
- **Status** — color-coded badge: 🟢 < 50%, 🟡 50–80%, 🟠 80–100%, 🔴 100–150%, ⛔ > 150% (hard cap, surface disabled).

Click a row to drill into per-day breakdown + recent calls for that surface.

### 30-day trend chart

- Stacked-bar per day.
- X-axis: date.
- Y-axis: $.
- Colors map to surfaces.
- Tooltip on hover shows exact $ per surface per day.
- Recharts or hand-built SVG; no new charting dependency.

### Top consumers

Two lists side-by-side:

- **By user** — sums `ClaudeApiCallRecord.estimatedCostUsd` grouped by `userId`. Top 10. Anonymized user IDs shown (truncated cuid).
- **By game** — sums grouped by `gameId`. Top 10 with matchup label resolved from `Game` table.

When attribution is null (e.g., Model Journal generation isn't user-attributed), the call is grouped under "unattributed."

### Alerts log

Lists all alert transitions in the last 30 days:

- Yellow / Orange / Red / Hard-cap entries.
- One-line summary per entry.
- Click to expand the full event detail (which call(s) tripped the threshold).

### Budget override

The hard-cap override toggle requires:

1. Operator clicks the toggle.
2. Modal: "Override hard-cap on [surface]? This allows continued generation after the 150% threshold for the current billing cycle. Cost will accrue beyond budget."
3. Operator confirms.
4. Override flag persists in `ClaudeApiBudget.overrideActive = true`, `overrideExpiresAt = end of billing cycle`.
5. Decision-log entry filed automatically: "DEC-COST-OVERRIDE-<id>: hard-cap override on [surface], rationale TBD by operator."

Overrides expire at end of billing cycle and reset to false.

### Error log

Lists non-budget API failures over last 7 days:

- `rate_limit_exceeded`
- `network_timeout`
- `api_error_5xx`
- `parse_error`

Per-error timestamp + retry-result.

---

## Refresh cadence

- Page polls every 30 seconds for updated spend (low overhead query).
- Trend chart caches for 5 minutes.
- Top consumers cache for 5 minutes.

---

## Acceptance criteria

1. Operator authentication enforced.
2. Per-surface spend table renders accurate sums.
3. Status badges reflect threshold breaches.
4. 30-day trend chart renders without new dependencies.
5. Top-consumer lists show top 10 each.
6. Alert log shows recent transitions.
7. Budget override toggle requires confirmation modal + files decision-log entry.
8. Error log surfaces non-budget API failures.
9. No bundle weight added (Recharts already in tree or hand-built SVG).

---

## Open items

- **OPEN-CKP-COST-1:** Should the page warn the operator when a user is in the top-3 cost-consumers AND their tier is FREE? Could indicate quota-abuse. Default: yes, surface a "review tier eligibility" yellow flag inline.
- **OPEN-CKP-COST-2:** Should there be a daily-spend cap separate from monthly? Default: no — monthly cap is sufficient. Reconsider if a runaway-loop scenario actually happens.

---

*Spec authored by Claude. Codex implements. Override always requires decision-log entry.*

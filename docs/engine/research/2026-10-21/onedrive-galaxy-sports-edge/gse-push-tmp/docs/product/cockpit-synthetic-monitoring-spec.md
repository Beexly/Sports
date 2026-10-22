# `/cockpit/synthetic-monitoring` — Page Specification

**Status:** Phase 3+ build. Operator-only.
**Owner of code:** Codex.
**Owner of layout:** Claude.
**Location:** `apps/web/app/cockpit/synthetic-monitoring/page.tsx`.
**Companion spec:** `docs/product/synthetic-monitoring-spec.md`.

---

## TL;DR

Operator dashboard for the synthetic monitoring runner. Shows last-24h check history, current pass/fail state per check, auto-filed issue-queue items, manual re-run capability.

The runner itself fires every 15 minutes against production. This page is the human visibility layer.

---

## Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Synthetic Monitoring · Operator Dashboard                    │
│ Runner status: ✅ healthy · Last run: 2 min ago              │
│ Active env: production                                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ CURRENT CHECK STATUS (all checks, 6 categories)              │
│                                                              │
│ CATEGORY 1 — Voice / brand-safety (P2)                       │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ CHECK-V1  No banned vocab in /              ✅ passing │   │
│ │ CHECK-V2  No banned vocab in /methodology   ✅ passing │   │
│ │ CHECK-V3  No banned vocab in /pricing       ✅ passing │   │
│ │ CHECK-V4  Hero text matches positioning     ✅ passing │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                              │
│ CATEGORY 2 — Critical-path availability (P1)                 │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ CHECK-A1  / returns 200                     ✅ passing │   │
│ │ CHECK-A2  /board returns 200                ✅ passing │   │
│ │ CHECK-A3  /ledger returns 200               ✅ passing │   │
│ │ CHECK-A4  /api/board/state shape valid      ✅ passing │   │
│ │ CHECK-A5  /api/calibration shape valid      ✅ passing │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                              │
│ CATEGORY 3 — Engine + data freshness (P1/P2)                 │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ CHECK-E1  Latest IngestionRun < 60min       ✅ passing │   │
│ │ CHECK-E2  ≥8 books reporting                ✅ passing │   │
│ │ CHECK-E3  Edge Index visible on slate       ✅ passing │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                              │
│ CATEGORY 4 — Trust gate compliance (P1)                      │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ CHECK-T1  PUBLIC_PICKS_ENABLED respected    ✅ passing │   │
│ │ CHECK-T2  PERFORMANCE_STATS_ENABLED         ✅ passing │   │
│ │ CHECK-T3  PUBLIC_BLOG_ENABLED respected     ✅ passing │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                              │
│ CATEGORY 5 — Bot / AI surface health (P2/P3)                 │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ CHECK-B1  Twitter bot heartbeat             ⏸ pending  │   │
│ │ CHECK-B2  Discord bot heartbeat             ⏸ pending  │   │
│ │ CHECK-B3  Model Journal weekly cadence      ⏸ pending  │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                              │
│ CATEGORY 6 — Build / asset integrity (P3)                    │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ CHECK-C1  Bundle size delta vs baseline     ✅ passing │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ 24-HOUR HISTORY                                              │
│                                                              │
│ [Per-check sparkline: green = pass, yellow = warn, red =     │
│  fail. One line per check ID. Last 96 data points = 24h at   │
│  15-min intervals.]                                          │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ AUTO-FILED ISSUES                                            │
│                                                              │
│ Linked from /docs/ops/issue-queue.md:                        │
│ (none in last 24h)                                           │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ MANUAL ACTIONS                                               │
│                                                              │
│ [Run all checks now]  [Run failing checks]                   │
│ [Pause runner]  [Resume runner]                              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Behavior

### Check status panel

Per category, lists each check with current state:

- ✅ passing — last 3 runs all passed.
- 🟡 warn — last run yellow or one of last 3 failed.
- 🔴 failing — last run failed.
- ⏸ pending — check not yet active (e.g., Twitter bot checks before bot ships).

Click a check ID to drill into per-check detail (history, last error message, retry log).

### Runner health

Top-of-page indicator. The runner-of-monitor pings `/api/health/synthetic-monitoring` separately. If the indicator ever goes red, that means the monitoring system itself is offline — distinct from individual check failures.

### 24-hour history sparkline

Per check, a horizontal sparkline of last 96 results (24h × 4 per hour). Hover shows exact timestamps. Click expands to a full timeline view.

### Auto-filed issues

When a check fails and the runner auto-files to `docs/ops/issue-queue.md`, the entry appears here as a linked card. Operator can click to open the issue queue entry directly.

### Manual actions

- **Run all checks now** — kicks off an out-of-cycle check run. Useful after a deploy to verify state.
- **Run failing checks** — re-runs only the checks currently in failing/warn state. Useful when a check flapped or after a fix landed.
- **Pause runner** — disables the 15-minute heartbeat. Used during planned maintenance.
- **Resume runner** — re-enables the heartbeat.

Pausing requires a decision-log entry explaining why + expected resume timestamp.

---

## Configuration access

Below the main view, a collapsed "Configuration" panel:

- `SYNTHETIC_MONITORING_ENABLED` — current value (read-only here; toggled via env).
- `SYNTHETIC_MONITORING_CHECKS` — current enabled-check list.
- `SYNTHETIC_MONITORING_OWNER_CHANNEL` — current escalation channel.
- `SYNTHETIC_MONITORING_OWNER_TARGET` — current target (masked for privacy).

These are read-only on this surface. Modifying requires Vercel env changes + redeploy.

---

## Acceptance criteria

1. Operator authentication enforced.
2. Per-check current status renders accurately.
3. 24-hour history sparklines render.
4. Auto-filed issue cards link to issue-queue.md correctly.
5. Manual actions (run-all, run-failing, pause, resume) work.
6. Pause requires decision-log entry.
7. Runner-health indicator updates independently of check results.
8. Configuration panel shows current env values (masked appropriately).

---

## Open items

- **OPEN-CKP-SM-1:** Should the page have a "silence this check for N hours" feature? Default: no in v0 — silencing creates blind spots. If a check is consistently noisy, fix the threshold instead.
- **OPEN-CKP-SM-2:** Should there be a "check history export" for post-mortem analysis? Default: yes via the regular database — Codex provides query examples in `docs/ops/runbooks/`. Phase 4+ add a UI export button.

---

*Spec authored by Claude. Codex implements. Pause requires decision-log entry.*

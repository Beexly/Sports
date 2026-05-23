# KPI Cockpit PRD

Status: Draft
Build gate: after first active track launches

## Problem

The mechanical KPI rules are only useful if Garrett sees them on schedule and in context. The cockpit turns monthly review from a spreadsheet chore into a repeatable operator ritual.

## V1 Surfaces

### Surface 1 - Single-Page Dashboard

For each active track:

- Active count.
- Period change.
- Percent of target.
- 12-month trendline.
- Next decision gate and threshold.
- Last month's decision and note.

Design principle: no dense tables on the primary view.

### Surface 2 - Override Log

Append-only list of every override Garrett invokes.

Fields:

- Track.
- Original kill criterion.
- Override date.
- Why override was invoked.
- Replacement kill criterion.
- Final outcome.

### Surface 3 - Runway Band

At top of cockpit:

- Current runway scenario.
- Months operating in that scenario.
- Next runway review date.
- Tracks authorized.
- Tracks frozen.

If runway shortens, the band changes visual status.

### Surface 4 - Decision Log Rail

Left rail showing latest decisions from `templates/decision-log.md`.

Purpose: keep decision memory next to metrics.

## Monthly Ritual Support

The cockpit should support the Last Friday ritual:

- Show the numbers.
- Capture felt response.
- Compute mechanical read.
- Record decision and deadline.
- Link any override to the override log.
- Save monthly memo under `reviews/YYYY-MM.md`.

## Slip-Discipline Reminder

Manual operating rule until calendar automation exists:

- Monthly review is last Friday, 09:00-11:00 Eastern.
- If blocked, move only to the following Monday.
- Never move to the next month.

Calendar automation can be added later if the calendar integration is available.

## Metrics Needed

Vault:

- New paid signups.
- Active paid members.
- Revenue.
- Renewal rate.
- Office hours attendance.
- `vault_discord_active_30d`.

Almanac:

- Pre-orders.
- Launch-month sales.
- Hardcover/digital ratio.
- Buyer NPS.

Live:

- Founding partners active.
- Overlay uptime.
- Paid subscribers.
- Support tickets per streamer.

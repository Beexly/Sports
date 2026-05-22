# Synthetic Monitoring — Specification

**Status:** Phase 3+ build. Implements the synthetic monitoring layer referenced in master plan Part 1.5.
**Owner of code:** Codex.
**Owner of check definitions + severity bands:** Claude.
**Location:** `workers/synthetic-monitoring/`, `scripts/smoke-prod.sh` (extends the existing daily smoke).

---

## TL;DR

Continuously verify that production reflects the master plan. Auto-file `docs/ops/issue-queue.md` entries with severity pre-tagged when a check fails. Closes a critical gap in the autonomous loop: today the smoke script runs once a day; synthetic monitoring runs every 15 minutes against the things that matter most.

---

## Why

The master plan's autonomous loop assumes Claude and Codex can run end-to-end without owner intervention. That only works if regressions are caught quickly and surfaced clearly.

Existing safety nets:
- Daily smoke (`scripts/smoke-prod.sh`) catches deploy-time regressions.
- 1,427+ unit tests catch logic regressions during CI.
- Manual browser checks catch visual regressions during PR review.

Gap: there's no continuous production check that catches things like "banned vocabulary just appeared in homepage HTML" or "Edge Index endpoint started returning 500s" between smoke runs. Synthetic monitoring closes that gap.

---

## Architecture

```
   ┌────────────────────────────┐
   │  Scheduled job (15 min)    │
   │  workers/synthetic-mon/    │
   └─────────────┬──────────────┘
                 │ runs each check
                 ▼
   ┌────────────────────────────┐
   │  CheckRunner               │
   │  - runs check function     │
   │  - records result          │
   │  - tags severity           │
   └─────────────┬──────────────┘
                 │ on failure
                 ▼
   ┌────────────────────────────┐
   │  IssueQueueFiler           │
   │  - dedupes against open    │
   │  - appends to issue-queue  │
   │  - notifies cockpit        │
   └────────────────────────────┘
```

Implementation: workers run via existing BullMQ infra (Redis already in tree). Cron-triggered every 15 minutes.

---

## Check categories + initial checks

### Category 1 — Voice / brand-safety checks (P2)

These guard the platform's positioning. Any failure is a P2 (visible regression / guardrail breach).

#### CHECK-V1 — No banned vocabulary in homepage HTML

**What:** GET `https://galaxysportsedge.com/`, scan rendered HTML against `apps/web/lib/compliance-scanner/rules.ts` LAYER_1_PLATFORM_BANS patterns.

**Frequency:** every 15 min.

**Pass:** zero matches.

**Fail action:** file `IQ-VM-001` with severity P2, body including the matched banned term + the snippet around it.

#### CHECK-V2 — No banned vocabulary in /methodology

Same as CHECK-V1 but for `/methodology`.

#### CHECK-V3 — No banned vocabulary in /pricing

Same.

#### CHECK-V4 — Hero text matches positioning lock

**What:** GET `/`, parse out the H1 text, compare exactly against the locked primary line ("We're not AI. We're math you can read.") OR any documented variant from `docs/positioning.md`.

**Frequency:** every 15 min.

**Pass:** H1 matches an approved string.

**Fail action:** file with severity P2.

### Category 2 — Critical-path availability (P1)

#### CHECK-A1 — Homepage returns 200

**What:** GET `/`, expect HTTP 200, response time under 3 seconds.

**Frequency:** every 5 min.

**Fail action:** file `IQ-AVAIL-*` with severity P1, escalate immediately to owner via separate channel (Discord/email).

#### CHECK-A2 — /board returns 200

#### CHECK-A3 — /ledger returns 200

#### CHECK-A4 — /api/board/state returns valid shape

**What:** POST/GET to the endpoint, validate response shape matches `BoardState` type contract.

#### CHECK-A5 — /api/calibration returns bootstrap-aware response

**What:** When `PERFORMANCE_STATS_ENABLED=false`, must return the documented bootstrap-state shape. When `true`, must return the canonical calibration data shape.

### Category 3 — Engine + data freshness (P1/P2)

#### CHECK-E1 — Latest IngestionRun within last 60 minutes

**What:** Query `IngestionRun` for the latest `completedAt` timestamp. If older than 60 min, P1 (engine is stale).

**Frequency:** every 15 min.

**Fail action:** file with severity P1.

#### CHECK-E2 — At least 8 books reporting on the latest IngestionRun

**What:** Confirm bookCount is at least 8 on the latest run.

**Fail action:** P2 if below 8 for two consecutive runs (intermittent issues are normal; sustained is the problem).

#### CHECK-E3 — Edge Index visible for tracked games

**What:** GET `/api/board/state`, confirm at least one game has a non-null Edge Index for the current slate (when a slate is active).

**Fail action:** P2 if zero Edge Indices for 30+ minutes during what should be active slate hours.

### Category 4 — Trust gate compliance (P1)

#### CHECK-T1 — Public picks endpoint respects PUBLIC_PICKS_ENABLED

**What:** When `PUBLIC_PICKS_ENABLED=false`, the public-tier pick payload must NOT include full pick details. Validate against a known-state response.

**Fail action:** P1 immediately. Trust gate violations are existential.

#### CHECK-T2 — Performance stats endpoint respects PERFORMANCE_STATS_ENABLED

**What:** When `PERFORMANCE_STATS_ENABLED=false`, `/performance` and `/ledger` must render bootstrap-state empty views. Confirm no aggregate stats leak into the HTML.

**Fail action:** P1 immediately.

#### CHECK-T3 — Blog endpoint respects PUBLIC_BLOG_ENABLED

Same pattern for `/blog`.

### Category 5 — Bot / AI surface health (P2/P3)

These activate as Phase 3 surfaces light up.

#### CHECK-B1 — Twitter bot heartbeat

**What:** Confirm the Twitter bot worker has logged a heartbeat in the last 30 min via `AgentRunLog`.

**Fail action:** P2.

#### CHECK-B2 — Discord bot heartbeat

Same.

#### CHECK-B3 — Model Journal publish cadence (weekly)

**What:** Every Sunday at noon ET, confirm a `ModelJournalEntry` was published the same morning.

**Fail action:** P3 if missed (the journal can recover the following week with a "we skipped last week, here's why").

### Category 6 — Build / asset integrity (P3)

#### CHECK-C1 — Bundle size delta vs prior week

**What:** GET the homepage, sum the asset sizes, compare against the previous week's baseline. If +15% or more, file.

**Fail action:** P3.

---

## Issue auto-filing format

When a check fails, the runner appends an entry to `docs/ops/issue-queue.md` with this shape:

```markdown
### IQ-VM-<auto-incremented-id> — <CHECK-X-Y> failed · P<severity>
**Filed:** <ISO timestamp> · **By:** synthetic-monitoring
**Surface:** <URL or endpoint>
**Symptom:** <what the check observed>
**Expected:** <what should have happened>
**Action:** <who needs to look at this>
**Dependents:** <other work blocked>
```

Dedup: if the same `CHECK-X-Y` has filed in the last 4 hours and isn't yet resolved, increment a `recurringCount` field on the existing entry rather than creating a new one.

Auto-close: when a check that previously failed now passes for 3 consecutive runs (45 min), the runner moves the entry to the Resolved section with a "resolved by check pass" note.

---

## Severity escalation

- **P1:** immediate notification via the owner's preferred separate channel (Discord ping, email, SMS — configured in env). The autonomous loop pauses dependent work.
- **P2:** filed to issue queue; surfaced in cockpit `/cockpit/synthetic-monitoring`. Codex's autonomous loop continues but flags affected work.
- **P3:** filed silently; surfaced in cockpit at end-of-day digest.

---

## Configuration

Env vars:

- `SYNTHETIC_MONITORING_ENABLED=true|false` — master switch.
- `SYNTHETIC_MONITORING_CHECKS=v1,v2,a1,a2,...` — comma-separated check IDs (default: all).
- `SYNTHETIC_MONITORING_OWNER_CHANNEL=discord|email|sms|webhook` — P1 escalation channel.
- `SYNTHETIC_MONITORING_OWNER_TARGET=<value>` — Discord user ID, email address, phone, or webhook URL.

Per-check thresholds configurable in `apps/web/lib/synthetic-monitoring/check-config.ts`.

---

## Local development

`npm run synth:local` runs the check suite against a local dev server. Useful before PR for catching changes that break a check.

---

## Acceptance criteria (Phase 3+ synthetic monitoring v0 → green)

1. Worker scheduled and running every 15 min.
2. All checks in Categories 1-4 implemented.
3. Categories 5-6 implemented as their dependencies (bots, journal, etc.) ship.
4. Auto-filing to `docs/ops/issue-queue.md` working with dedup.
5. Auto-close working when checks recover.
6. P1 escalation channel configured + tested.
7. Cockpit page at `/cockpit/synthetic-monitoring` shows last 24h check history.
8. Local dev mode works.

When all 8 hold, synthetic monitoring v0 is live.

---

## Open items

- **OPEN-SM-1:** Should the monitoring runner itself be monitored (heartbeat-of-heartbeats)? Default: yes — a separate external uptime service pings a `/api/health/synthetic-monitoring` endpoint and alerts if the monitoring runner stops. Codex picks the external service.
- **OPEN-SM-2:** Should P1 checks page the owner on weekends? Default: yes for trust-gate violations (CHECK-T1/T2/T3) since they're existential. No for stale-ingestion (CHECK-E1) since weekend slates can be thin.
- **OPEN-SM-3:** Should we cap auto-filing to N issues per check per day? Default: yes, 4/day (one every 6 hours max) to prevent issue-queue spam if a check goes into permanent failure.

---

*Spec authored by Claude. Codex implements. Severity definitions locked.*

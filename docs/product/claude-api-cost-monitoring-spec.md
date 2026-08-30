# Claude API Cost Monitoring — Specification

**Status:** Phase 3 build. Phase 4+ extends as more Claude-using surfaces light up.
**Owner of code:** Codex.
**Owner of budgets + fallback voice rules:** Claude.
**Location:** `apps/web/lib/claude-api/cost-monitor.ts`, cockpit surface at `/cockpit/api-costs`.

---

## TL;DR

The platform's Claude API spend will spike materially as Phase 3+ surfaces light up. Today Anthropic API calls happen only in the blog auto-generation path (`PUBLIC_BLOG_ENABLED=false`, so it's idle). Phase 3 adds Studio + Model Journal + Twitter/Discord bot post enrichment. Phase 4 adds Model Court (the highest-volume surface), calibration training weekly insights, and Studio template extensions.

Without monitoring + budgeting, a single bug — a Model Court infinite-loop, a Studio template that triggers too easily, an alert script that pages every minute — could 100x the bill in a day. The cost monitor catches this before it lands on the credit card.

---

## What it tracks

Per Claude API call, the cost monitor records:

```ts
type ClaudeApiCallRecord = {
  id: string;
  surface: ClaudeApiSurface;       // which surface initiated the call
  modelName: string;               // claude-opus, claude-sonnet, etc.
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;        // computed at call time from public pricing
  userId: string | null;           // when call is on behalf of a user
  gameId: string | null;           // when call is game-specific
  templateKind: string | null;     // Studio template ID, Twitter event kind, etc.
  durationMs: number;
  success: boolean;
  errorKind: string | null;
  observedAt: Date;
};

type ClaudeApiSurface =
  | "BLOG_GENERATION"
  | "STUDIO_GENERATION"
  | "MODEL_JOURNAL_DRAFT"
  | "MODEL_COURT_ANSWER"
  | "CALIBRATION_WEEKLY_INSIGHT"
  | "PRE_MORTEM_SUMMARY"            // not currently used — deterministic pipeline doesn't call LLM
  | "OTHER";
```

Records persist to `ClaudeApiCallRecord` table. Indexed on `observedAt` + `surface` for rapid aggregation.

---

## Budgets

Per-surface monthly budgets (initial values — tune based on actual usage in Phase 3/4):

| Surface | Phase | Initial monthly budget (USD) |
|---|---|---|
| BLOG_GENERATION | existing | $50/month |
| STUDIO_GENERATION | Phase 3 | $500/month |
| MODEL_JOURNAL_DRAFT | Phase 3 | $50/month (1 draft/week) |
| MODEL_COURT_ANSWER | Phase 4 | $2000/month (highest-volume) |
| CALIBRATION_WEEKLY_INSIGHT | Phase 4 | $50/month |
| OTHER | catch-all | $100/month |
| **Total platform budget** | | **$2750/month initial** |

Budgets are SOFT in the sense that they don't auto-disable the surface; they trigger alerts at thresholds:

- **50% of monthly budget** consumed: yellow alert in cockpit, logged but no user-facing change.
- **80% of monthly budget** consumed: orange alert. Owner notified. Per-user rate limits (already in spec for Model Court at 3/30/unlimited by tier) get tightened by 50%.
- **100% of monthly budget** consumed: red alert. New requests to that surface receive a budget-exceeded refusal message (see fallback voice below). Owner pinged immediately.
- **150% of monthly budget** consumed: hard cap. The surface is disabled until owner manually flips a `BUDGET_OVERRIDE` env flag or the next billing cycle starts.

---

## Fallback voice (when budget is hit)

When a Claude API call would exceed the budget, the surface returns a budget-exceeded refusal. Voice locked:

### MODEL_COURT_ANSWER fallback

```
The Model Court is at capacity for this billing cycle. Try again next
month, or check the factor breakdown on this game directly: [link].

What we publish without the Court:
- The Edge Index ([value]).
- The factor breakdown.
- The pre-mortem.
- The Public Ledger for similar settled picks.
```

### STUDIO_GENERATION fallback

```
Studio is at generation capacity for this billing cycle. Templates can be
regenerated next month.

You can still:
- Open the Game Room directly at /room/[gameId] for the raw signal data.
- Use the existing assets in your generation history.
```

### MODEL_JOURNAL_DRAFT fallback

```
The Model Journal weekly draft is paused while the API budget recovers.
This week's data is preserved and will draft next cycle.
```

### CALIBRATION_WEEKLY_INSIGHT fallback

```
Your weekly calibration insight is pending. We'll catch up next week
without breaking the streak.
```

These are not user-blaming. They're not error-page-coded. They're plain-language descriptions of what's happening and what alternatives exist.

---

## Cockpit surface

`/cockpit/api-costs` shows:

- Current month spend per surface vs budget (bar chart).
- 30-day trend.
- Top users by API consumption (when consumption is user-attributed).
- Top games by API consumption (when consumption is game-attributed).
- Recent error log (calls that failed for non-budget reasons).
- "Budget override" toggle (operator-only, requires confirmation modal).

---

## Schema

```prisma
model ClaudeApiCallRecord {
  id              String              @id @default(cuid())
  surface         String              // ClaudeApiSurface enum
  modelName       String
  inputTokens     Int
  outputTokens    Int
  estimatedCostUsd Decimal             @db.Decimal(10, 6)
  userId          String?
  gameId          String?
  templateKind    String?
  durationMs      Int
  success         Boolean
  errorKind       String?
  observedAt      DateTime            @default(now())

  user            User?               @relation(fields: [userId], references: [id])
  game            Game?               @relation(fields: [gameId], references: [id])

  @@index([observedAt])
  @@index([surface, observedAt])
  @@index([userId])
  @@index([gameId])
}

model ClaudeApiBudget {
  id              String              @id @default(cuid())
  surface         String              @unique
  monthlyBudgetUsd Decimal             @db.Decimal(10, 2)
  alertThresholds Json                 // { yellow: 0.5, orange: 0.8, red: 1.0, hardCap: 1.5 }
  overrideActive  Boolean             @default(false)
  overrideExpiresAt DateTime?
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt
}
```

---

## Implementation pattern

All Claude API call sites use a shared wrapper:

```ts
// apps/web/lib/claude-api/wrapper.ts (sketch)
export async function callClaudeWithCostTracking<T>(
  surface: ClaudeApiSurface,
  request: ClaudeApiRequest,
  context: { userId?: string; gameId?: string; templateKind?: string },
): Promise<ClaudeApiResponse<T> | BudgetExceededResponse> {
  // 1. Check current month spend vs budget for this surface.
  // 2. If hard cap exceeded and override not active: return BudgetExceededResponse with the surface-specific fallback.
  // 3. Otherwise call Claude API.
  // 4. Record the call.
  // 5. Return the response.
}
```

Every Claude API call goes through this wrapper. PR review checklist (`docs/ops/pr-review-checklist.md`) catches direct Claude API calls that bypass the wrapper.

---

## Acceptance criteria (Phase 3 cost monitoring v0 → green)

1. `ClaudeApiCallRecord` + `ClaudeApiBudget` schemas + migrations.
2. `callClaudeWithCostTracking` wrapper implemented and used by every Claude-using surface.
3. Per-surface initial budgets seeded.
4. Alert thresholds enforced (yellow → orange → red → hard cap).
5. Surface-specific fallback messages implemented per the voice locked above.
6. `/cockpit/api-costs` page shows current state.
7. Owner-channel ping on red and hard-cap events.
8. `BUDGET_OVERRIDE` env flag tested.

When all 8 hold, cost monitoring is v0-live.

---

## Open items

- **OPEN-CAM-1:** Should per-user quotas tighten automatically at 80%? Default: yes (master plan tier quotas — FREE 3/day, PRO 30/day, ELITE unlimited for Model Court — tighten by 50% at 80% threshold). Codex confirms.
- **OPEN-CAM-2:** Should Studio Pro+ tier subscribers get a higher implicit budget allocation than free generation? Default: yes — Pro+ creator subscribers' Studio calls don't count against the main STUDIO_GENERATION budget; they have their own budget allocated proportional to subscription revenue. Resolve in Phase 5 pricing.
- **OPEN-CAM-3:** Should the wrapper auto-degrade to a cheaper model (e.g. Sonnet vs Opus) at the 80% threshold? Default: no — voice consistency matters more than cost margin. Keep on the chosen model; let budgets bite.

---

*Spec authored by Claude. Codex implements. Fallback voice locked.*

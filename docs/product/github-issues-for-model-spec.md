# GitHub Issues for the Model — Specification

**Status:** Phase 4 build. Radical #8: public bug tracker against the scoring engine.
**Owner of code:** Codex.
**Owner of triage process + response voice:** Claude (drafts) + product owner (approves).
**Location:** `apps/web/app/model-issues/`, `apps/web/lib/model-issues/`.
**Decision reference:** master plan Part 2.C.6.

---

## TL;DR

A public bug tracker for the scoring engine itself. Users file issues like *"Schedule stress factor is too aggressive for soccer where teams have full squads."* Triage accepts/rejects. Accepted issues ship in versioned releases. Rejected issues get a public explanation.

The community helps debug the algorithm. The model is a public good with a contributor community.

No betting product publishes a public engine issue tracker. That's the point.

---

## What gets tracked

Five issue kinds:

1. **Factor read bug** — a specific factor is reading wrong in a specific context (sport, schedule, market).
2. **Gate behavior bug** — the gate is rejecting (or accepting) games it shouldn't.
3. **Data quality bug** — a data source is wrong or stale and the engine isn't catching it.
4. **Methodology improvement** — a proposed addition or refinement to the factor list.
5. **Edge case** — a specific game type where the model performs measurably worse than its average.

NOT tracked:
- Individual pick predictions ("you should have picked the other side"). The model published what it published; the autopsy lives in the Loss Room. Pick disagreements are not engine bugs.
- Feature requests for the consumer product (those live in a separate feedback channel).
- Bug reports about the website itself (those go to GitHub Issues on the actual repo, if/when it's open-sourced).

---

## User flow

### Filing an issue

1. User visits `/model-issues/new`.
2. Selects an issue kind from the dropdown.
3. Fills out:
   - **Title** (1 line, ≤100 chars).
   - **Description** (markdown, what they observed + what they expected).
   - **Affected games** (optional, can link to Game Rooms or Public Ledger entries).
   - **Affected factor / gate / source** (dropdown of known factors).
   - **Severity** (LOW / MEDIUM / HIGH — user's self-assessment; triage may adjust).
4. Submits. Issue lands in `OPEN` status.

### Triage

Operator (initially the product owner; Phase 5+ may add Pro contributors with merit) reviews each issue and assigns:

- `OPEN` → `ACCEPTED` — confirmed bug, in the backlog.
- `OPEN` → `REJECTED` — not a bug; explanation given publicly.
- `OPEN` → `DUPLICATE` — links to the canonical issue.
- `OPEN` → `INVESTIGATING` — confirmed observation, root cause not yet found.
- `ACCEPTED` → `IN_PROGRESS` — assigned to a model version.
- `IN_PROGRESS` → `SHIPPED` — fixed in the named model version.
- `IN_PROGRESS` → `WONT_FIX` — accepted as known limitation; tradeoff explained publicly.

Triage decisions ship with a public comment. No silent state changes.

### Engagement

Authenticated users can:

- **Upvote** an issue (one vote per user).
- **Comment** with additional context or related observations.
- **Subscribe** to status updates (delivered via in-app notification + optional email).

Anonymous users can read everything but not vote or comment.

### Status surfacing

`/model-issues` lists all issues filterable by status, factor, sport, severity.

Each issue has a permalink at `/model-issues/[id]`.

The Model Journal weekly essay (Phase 3) routinely references accepted issues that shipped in the past week.

---

## Schema

```prisma
model ModelIssue {
  id              String              @id @default(cuid())
  number          Int                 @unique @default(autoincrement())

  // Filing
  authorUserId    String
  title           String              @db.VarChar(100)
  description     String              @db.Text
  kind            ModelIssueKind
  severity        ModelIssueSeverity  @default(MEDIUM)
  affectedFactor  String?             // factor key or null
  affectedGate    String?
  affectedSource  String?
  filedAt         DateTime            @default(now())

  // State
  status          ModelIssueStatus    @default(OPEN)
  resolvedAt      DateTime?
  resolvedInModelVersion String?
  triageReason    String?             @db.Text

  // Engagement
  upvoteCount     Int                 @default(0)
  commentCount    Int                 @default(0)

  comments        ModelIssueComment[]
  upvotes         ModelIssueUpvote[]
  affectedGames   ModelIssueGame[]

  @@index([status])
  @@index([kind])
  @@index([affectedFactor])
}

enum ModelIssueKind {
  FACTOR_READ_BUG
  GATE_BEHAVIOR_BUG
  DATA_QUALITY_BUG
  METHODOLOGY_IMPROVEMENT
  EDGE_CASE
}

enum ModelIssueSeverity {
  LOW
  MEDIUM
  HIGH
}

enum ModelIssueStatus {
  OPEN
  ACCEPTED
  REJECTED
  DUPLICATE
  INVESTIGATING
  IN_PROGRESS
  SHIPPED
  WONT_FIX
}

model ModelIssueComment {
  id              String      @id @default(cuid())
  issueId         String
  authorUserId    String
  body            String      @db.Text
  isTriageComment Boolean     @default(false)
  createdAt       DateTime    @default(now())

  issue           ModelIssue  @relation(fields: [issueId], references: [id])
  author          User        @relation(fields: [authorUserId], references: [id])

  @@index([issueId])
}

model ModelIssueUpvote {
  id          String      @id @default(cuid())
  issueId     String
  userId      String
  createdAt   DateTime    @default(now())

  issue       ModelIssue  @relation(fields: [issueId], references: [id])
  user        User        @relation(fields: [userId], references: [id])

  @@unique([issueId, userId])
}

model ModelIssueGame {
  id          String      @id @default(cuid())
  issueId     String
  gameId      String

  issue       ModelIssue  @relation(fields: [issueId], references: [id])
  game        Game        @relation(fields: [gameId], references: [id])

  @@unique([issueId, gameId])
}
```

---

## Voice rules for triage comments

Triage comments are public. Voice:

**Pass:**

- *"Accepted. Confirmed the schedule-stress factor was over-weighting back-to-backs in soccer. Adjusting weight in v6.0.5."*
- *"Rejected. The pick lost, but the factor read was correct given the inputs. This is variance, not a bug. See the autopsy at [link]."*
- *"Won't fix. The edge-case the issue describes is rare enough (< 5 games/year) that the cost of fixing it exceeds the benefit. Documenting as a known limitation."*

**Fail:**

- *"Thanks for the feedback!"* (no specific action)
- *"We'll look into it."* (no commitment)
- *"This is a great suggestion."* (no decision)

Every triage comment commits to a decision and explains it.

---

## Public surfaces

### `/model-issues` index

- Default view: open issues, sorted by upvote count descending.
- Tabs: OPEN / ACCEPTED / IN_PROGRESS / SHIPPED / REJECTED / WONT_FIX.
- Filters: kind, factor, sport, severity.

### `/model-issues/[number]` detail

- Issue body + metadata.
- Triage history.
- Comments (chronological).
- Affected games linked to Game Rooms.
- Status timeline.

### Cross-references

- The Model Journal (Phase 3) references shipped issues from the past week.
- The Changelog (already in repo at `/changelog`) cross-links to issues fixed in each model version.
- Pick detail pages show "Known issues affecting this pick" when the pick is published while a related ACCEPTED issue is OPEN.

---

## Anti-abuse

- Issue filing requires an authenticated account (FREE tier is fine, no Pro+ requirement).
- Rate limit: 5 issues filed per user per day.
- Duplicate detection: title + description checked against fuzzy match on OPEN/ACCEPTED issues before submission.
- Spam filter: standard text classification for spam/abuse before issue publishes.
- Operator can lock individual issues that attract abusive comments.

---

## Acceptance criteria (Phase 4 model issues v0 → green)

1. Schema shipped + migration applied.
2. `/model-issues/new` form functional.
3. `/model-issues` index + filters functional.
4. `/model-issues/[number]` detail page functional.
5. Triage workflow operable from cockpit.
6. Upvote + comment functionality works.
7. Rate limits enforced.
8. Duplicate detection works on submission.
9. Cross-references from Model Journal + changelog functional.
10. Brand-safety scan on triage comments returns zero hits.

When all 10 hold, the model issues tracker is v0-live.

---

## Open items

- **OPEN-MI-1:** Should issues be filable as anonymous (without auth)? Default: no, require auth — anonymous filing invites spam. Confirm.
- **OPEN-MI-2:** Should the tracker integrate with the actual engineering tracker (Linear/Jira/GitHub Issues for the repo)? Default: no in v0 — keep the public tracker separate. Operator manually links if needed.
- **OPEN-MI-3:** Should there be a "first contributor" achievement / leaderboard? Default: no in v0. Phase 5+ may add a contributor leaderboard.
- **OPEN-MI-4:** Should there be a Pro-tier or Elite-tier "priority triage" benefit? Default: no — public tracker treats all reporters equally on merit.

---

*Spec authored by Claude. Codex implements. Triage voice locked. The model is a public good with a contributor community.*

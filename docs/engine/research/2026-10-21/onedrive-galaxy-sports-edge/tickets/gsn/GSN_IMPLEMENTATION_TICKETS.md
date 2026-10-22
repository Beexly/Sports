# GSN Implementation Tickets

Date: 2026-06-10
Scope: GSN / Galaxy Sports Edge sports intelligence only

Note: This OneDrive folder is a control/docs checkout. Confirm the authoritative app source tree, likely `C:\Users\Garrett\Sports`, before applying code paths below.

## P0-001: Source Quality Ledger Schema

Priority: P0

Description:
Create the canonical data model for sources, evidence items, signals, and review events. This is the foundation for trust receipts, freshness, No-Bet logic, and podcast packets.

Files Likely Affected:

- `apps/web/lib/gsn/source-quality.ts`
- `apps/web/lib/gsn/types.ts`
- `apps/web/db/schema/*`
- `apps/web/app/api/admin/gsn/sources/*`

Dependencies:

- Confirm database layer and ORM.
- Confirm app source tree.

Acceptance Criteria:

- Source, evidence, signal, and review-event types exist.
- Each evidence item links to source and freshness fields.
- Stale or source-less signal cannot be marked publishable.

Test Plan:

- Unit tests for schema/type guards.
- Migration test if database exists.
- Publish-gate test with missing source, stale source, and valid source.

## P0-002: Publish Gate And Human Review States

Priority: P0

Description:
Implement review states and block public publication unless a signal has source receipts, freshness, no material unresolved conflict, responsible-gaming copy, and human approval.

Files Likely Affected:

- `apps/web/lib/gsn/publish-gate.ts`
- `apps/web/app/api/admin/gsn/review/*`
- `apps/web/app/api/gsn/signals/*`

Dependencies:

- P0-001

Acceptance Criteria:

- Unreviewed signals cannot publish.
- Rejected or quarantined signals never appear on public endpoints.
- Reviewer action is auditable.

Test Plan:

- Unit tests for gate conditions.
- API tests for public endpoint exclusion.
- Admin action tests for approve/reject/quarantine.

## P0-003: No-Bet Reason Taxonomy

Priority: P0

Description:
Create a first-class No-Bet model with reason codes, user-facing copy, uncertainty drivers, and required fields.

Files Likely Affected:

- `apps/web/lib/gsn/no-bet.ts`
- `apps/web/components/gsn/no-bet-card.tsx`
- `apps/web/app/gsn/*`

Dependencies:

- P0-001

Acceptance Criteria:

- No Bet is a valid primary recommendation state.
- Each No-Bet state requires a reason and uncertainty driver.
- UI does not visually demote No Bet.

Test Plan:

- Unit tests for reason validation.
- Component tests for all reason states.
- Copy review for irresponsible gambling language.

## P0-004: Trust Receipt Drawer

Priority: P0

Description:
Build a reusable drawer that shows source class, source freshness, confidence band, conflict state, uncertainty drivers, and reviewer status.

Files Likely Affected:

- `apps/web/components/gsn/trust-receipt-drawer.tsx`
- `apps/web/lib/gsn/trust-receipts.ts`
- `apps/web/components/gsn/source-chip.tsx`

Dependencies:

- P0-001
- P0-002

Acceptance Criteria:

- Drawer renders for every publishable recommendation.
- Missing receipt data fails closed.
- Public drawer excludes restricted source details.

Test Plan:

- Component tests for fresh, stale, conflict, and restricted-source states.
- Snapshot tests for mobile and desktop.
- Unit tests for receipt builder.

## P1-005: Confidence Decay Clock

Priority: P1

Description:
Add freshness and confidence decay calculations by signal type, with UI state and admin stale-signal flags.

Files Likely Affected:

- `apps/web/lib/gsn/confidence-decay.ts`
- `apps/web/components/gsn/freshness-badge.tsx`
- `apps/web/app/api/admin/gsn/stale-signals/*`

Dependencies:

- P0-001

Acceptance Criteria:

- Signals expose fresh, aging, stale, and expired states.
- Expired signals are blocked from publication.
- Decay reason appears in trust receipt.

Test Plan:

- Unit tests with fixed timestamps.
- Boundary tests around `fresh_until`.
- API test for expired signal exclusion.

## P1-006: Rumor Quarantine Queue

Priority: P1

Description:
Create a private admin queue for low-quality, conflicting, social-only, or unverified claims.

Files Likely Affected:

- `apps/web/app/admin/gsn/quarantine/*`
- `apps/web/lib/gsn/quarantine.ts`
- `apps/web/components/gsn/quarantine-table.tsx`

Dependencies:

- P0-001
- P0-002

Acceptance Criteria:

- Quarantined items are visible only to authorized admins.
- Admin can promote, reject, or attach stronger source.
- Quarantined items never publish.

Test Plan:

- Access-control tests.
- State-transition tests.
- Public endpoint exclusion tests.

## P1-007: Market Radar Prototype

Priority: P1

Description:
Build the first Market Radar screen with explicit demo/mock data labels until licensed sports data is confirmed.

Files Likely Affected:

- `apps/web/app/gsn/market-radar/page.tsx`
- `apps/web/components/gsn/market-radar-card.tsx`
- `apps/web/lib/gsn/demo-data.ts`

Dependencies:

- Design token baseline.

Acceptance Criteria:

- Shows line movement, volatility, freshness, confidence, and recommendation state.
- Demo data is clearly labeled.
- No fake live recommendations are implied.

Test Plan:

- Component tests for each recommendation state.
- Playwright visual smoke if app tree is available.
- Copy review for fake-confidence language.

## P1-008: Analyst Note Grader

Priority: P1

Description:
Build a grading utility that flags unsupported claims, stale references, missing uncertainty, overconfident language, and absent No-Bet rationale.

Files Likely Affected:

- `apps/web/lib/gsn/analyst-note-grader.ts`
- `apps/web/components/gsn/analyst-note-review.tsx`
- `apps/web/app/admin/gsn/notes/*`

Dependencies:

- No-Bet taxonomy
- Source-quality rubric

Acceptance Criteria:

- Grader produces actionable findings.
- Findings link to exact text spans when possible.
- Overconfident gambling phrases are blocked or flagged.

Test Plan:

- Unit tests with synthetic notes.
- Golden tests for known risky phrases.
- Manual review with analyst examples.

## P1-009: GSN DESIGN.md

Priority: P1

Description:
Create a design-system instruction file for AI and human builders: tokens, layout density, source chips, volatility meters, No-Bet cards, motion rules, and accessibility.

Files Likely Affected:

- `docs/gsn-rd/DESIGN.md`
- `apps/web/app/globals.css`
- `apps/web/components/gsn/*`

Dependencies:

- Existing app styling system confirmation.

Acceptance Criteria:

- Design rules cover confidence, freshness, conflict, and No-Bet states.
- Accessibility and responsive constraints are explicit.
- Copy rules reject certainty/hype language.

Test Plan:

- Design review.
- CSS token scan if app tree is available.
- Component visual QA checklist.

## P1-010: Podcast Episode Packet Builder

Priority: P1

Description:
Create a structured packet format for weekly podcast/newsletter generation from approved signals only.

Files Likely Affected:

- `apps/web/lib/gsn/podcast-packet.ts`
- `apps/web/app/admin/gsn/podcast/*`
- `content/gsn/podcast/*`

Dependencies:

- P0-001
- P0-002
- Approved source receipt model

Acceptance Criteria:

- Packet contains approved signals, script, source receipts, disclosure, and approval state.
- Audio generation cannot start before transcript approval.
- Packet version is stored.

Test Plan:

- Unit tests for packet validation.
- Admin workflow tests.
- Fixture test for missing disclosure.

## P1-011: Voice Consent And Disclosure Controls

Priority: P1

Description:
Add consent records, disclosure metadata, and file-hash tracking before any AI owner-voice generation workflow is used.

Files Likely Affected:

- `apps/web/lib/gsn/voice-consent.ts`
- `apps/web/app/admin/gsn/voice-consent/*`
- `content/gsn/podcast/*/disclosures.md`

Dependencies:

- Podcast packet builder
- Owner approval

Acceptance Criteria:

- No owner-voice generation can run without consent record.
- Disclosure is required for AI-generated narration.
- Voice sample storage requirements are documented and enforced where possible.

Test Plan:

- Unit tests for consent validation.
- Workflow tests for missing consent.
- Manual security review.

## P2-012: Post-Game Autopsy Template

Priority: P2

Description:
Build a post-game review surface that compares pre-game signal state to final outcome and records process improvements.

Files Likely Affected:

- `apps/web/lib/gsn/autopsy.ts`
- `apps/web/components/gsn/post-game-autopsy.tsx`
- `apps/web/app/admin/gsn/autopsy/*`

Dependencies:

- Source ledger
- Recommendation history

Acceptance Criteria:

- Autopsy shows what was known when, what changed, and what improved.
- Avoids hindsight certainty.
- Can feed analyst training and podcast segments.

Test Plan:

- Unit tests for timeline rendering.
- Copy review.
- Fixture tests for Bet, Wait, and No-Bet outcomes.

## P2-013: Archive Snapshot Workflow

Priority: P2

Description:
Add a lawful archive/screenshot policy and storage workflow for source receipts.

Files Likely Affected:

- `apps/web/lib/gsn/archive-policy.ts`
- `apps/web/app/admin/gsn/evidence/*`
- `docs/gsn-rd/source-archive-policy.md`

Dependencies:

- Source ledger

Acceptance Criteria:

- Evidence items can store URL, capture timestamp, archive URL, screenshot hash.
- Evidence screenshots are immutable.
- Archive use cannot be marked as paywall bypass.

Test Plan:

- Unit tests for evidence metadata.
- Manual policy review.
- Fixture tests for missing hash/timestamp.

## P2-014: Security Exposure Owner Checklist

Priority: P2

Description:
Create operational security checklist for owned-domain breach monitoring, password hygiene, and public-account impersonation checks.

Files Likely Affected:

- `docs/gsn-rd/security-exposure-checklist.md`
- `apps/web/app/admin/ops/security/*`

Dependencies:

- Owner-owned domains/accounts list

Acceptance Criteria:

- Checklist distinguishes owned/consented monitoring from prohibited third-party checks.
- Includes HIBP/domain-monitoring action item.
- Includes brand/source impersonation process.

Test Plan:

- Docs review.
- Owner-action walkthrough.

## P2-015: Sports Signal Availability Search

Priority: P2

Description:
Create a search experience inspired by provider-aggregation UX: one search across games, teams, players, sources, and markets showing what data exists, what is stale, and what is missing.

Files Likely Affected:

- `apps/web/app/gsn/search/page.tsx`
- `apps/web/lib/gsn/search.ts`
- `apps/web/components/gsn/signal-search-result.tsx`

Dependencies:

- Source ledger
- Market radar data model

Acceptance Criteria:

- Search result shows availability, freshness, and source classes.
- Missing data is explicit.
- Restricted data remains hidden from unauthorized users.

Test Plan:

- Search fixture tests.
- Access-control tests.
- Mobile/desktop component tests.

## P2-016: Market Integrity Flight Recorder

Priority: P2

Description:
Build the game-level timeline that records every meaningful source, market, confidence, review, No-Bet, and publication-state change.

Files Likely Affected:

- `apps/web/lib/gsn/flight-recorder.ts`
- `apps/web/components/gsn/flight-recorder-timeline.tsx`
- `apps/web/app/gsn/games/[id]/flight-recorder/*`

Dependencies:

- Source ledger
- Publish gate
- Confidence decay
- Market radar

Acceptance Criteria:

- Timeline reconstructs what GSN knew at each time.
- Changes include actor/system source and reason.
- Timeline can power post-game autopsy and trust receipts.

Test Plan:

- Event-sourcing unit tests.
- Timeline ordering tests.
- Fixture tests for conflict and No-Bet transitions.

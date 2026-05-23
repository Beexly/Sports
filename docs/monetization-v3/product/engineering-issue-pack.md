# Engineering Issue Pack

Status: ready to convert into GitHub/Linear issues
Gate: do not start implementation until `13-execution-gates.md` clears the relevant track.

## Vault Epic

### VLT-001 - Confirm Existing Subscription Architecture

Acceptance criteria:

- Current user, subscription, Stripe, and entitlement flow documented.
- Pro/Elite entitlement implementation located.
- Integration points for Vault listed.

### VLT-002 - Add Vault Data Model

Acceptance criteria:

- Data structures from `product/vault-data-model.md` implemented.
- Migration is reversible where framework allows.
- Unique founding number constraint exists.

### VLT-003 - Add Vault Entitlement

Acceptance criteria:

- `hasVaultAccess(user)` or equivalent exists.
- Server-side checks protect all Vault member routes.
- Canceled members retain access through paid term.

### VLT-004 - Stripe Vault Checkout

Acceptance criteria:

- Vault annual price configured.
- Existing users can upgrade.
- Checkout success creates/updates `VaultMember`.
- Duplicate webhook delivery is idempotent.

### VLT-005 - Founding Seat Counter

Acceptance criteria:

- `/api/vault/seat-count` returns cap, filled, remaining, waitlist status.
- Founding number assignment is transactionally safe.
- Cap behavior at 1000 is tested.

### VLT-006 - Vault Landing Page

Acceptance criteria:

- `/vault` uses canonical copy.
- Apply form works.
- Seat counter renders.
- Mobile layout preserves all restraint/compliance copy.

### VLT-007 - Vault Member Dashboard

Acceptance criteria:

- Member sees founding number, latest digest, next office hours, latest quarterly review.
- Non-member redirects or gets clear gated response.

### VLT-008 - Digest Archive

Acceptance criteria:

- Admin can create draft digest.
- Published digests appear in archive.
- Non-members cannot view digest content.

### VLT-009 - Office Hours Archive

Acceptance criteria:

- Admin can create office-hours event.
- Member can see upcoming event and recordings.
- Capacity field supported.

### VLT-010 - Quarterly Review Archive

Acceptance criteria:

- Admin can publish review with PDF and recording.
- Member can access gated files.
- Limitations section required.

### VLT-011 - Discord Role Automation

Acceptance criteria:

- Vault member role granted after payment/link.
- Role removal respects paid term.
- Failures create repair logs/tasks.

### VLT-012 - Welcome Email Sequence

Acceptance criteria:

- Five emails loaded.
- Email 1 sends after payment clears.
- Sequence pauses on cancellation.
- Compliance scan passes.

### VLT-013 - Referral Attribution

Acceptance criteria:

- Referral code or URL tracked.
- Conversion recorded.
- 10% first-year commission amount computable.
- 30-day last-click attribution enforced.
- Self-referral blocks payment method/address matches.

### VLT-013A - Referral Payout Operations

Acceptance criteria:

- Monthly accrual computes prorated first-year 10% commission.
- Refund clawbacks are automatic.
- Subscription credit is default payout destination.
- Stripe Connect cash payout can be selected.
- Admin can approve or hold V1 payout batches.

### VLT-014 - KPI Export

Acceptance criteria:

- Signups, active members, revenue, cancellation count, and Discord active 30d exportable.
- Export fits `templates/kpi-dashboard.csv`.

### VLT-015 - Lifecycle and Retention Emails

Acceptance criteria:

- Welcome sequence and Day 30/60/90/180/335/365 retention check-ins are scheduled.
- Day 60 send is engagement-gated.
- Cancellation confirmation fires on cancel.
- Re-engagement email only fires for compatible term-end cancellations.
- Lifecycle queue is visible in admin.

### VLT-016 - Office Hours Archive and Transcripts

Acceptance criteria:

- Office-hours recording and transcript are gated to Vault members.
- Admin can log questions, commitments, attendance, and replay views.
- Commitments remain admin-visible until completed.
- Metrics support the office-hours success table.

### VLT-017 - Founding-50 Cohort Support

Acceptance criteria:

- Application/admin export supports scoring dimensions from `week-minus-1/07-founding-50-selection-framework.md`.
- Founding-50 status can be recorded separately from standard founding-1000 status.
- Founding-50 invite status can be exported.

### VLT-018 - Press Outreach Tracker

Acceptance criteria:

- CSV or admin tracker supports the fields in `copy/vault-launch-press-pack.md`.
- Placement quality score can be recorded.
- Press tracker stays private/admin-only.

### VLT-019 - Voice Deck Feedback Loop

Acceptance criteria:

- Customer-dev synthesis output can be stored in `week-minus-1/08-voice-deck-template.md` format.
- Landing page, welcome emails, and checkout copy have a documented voice-deck review step before launch.

### VLT-020 - Vault E2E Test Suite

Acceptance criteria:

- Test cases from `product/vault-test-plan.md` pass.
- Launch smoke test documented.

## Phase-N Scaffold Gaps

These issues come from the 2026-05-23 overnight scaffold sanity check. They do not authorize implementation; they define the first engineering deltas to sequence after `13-execution-gates.md` clears.

### PHASE-N-001 - Create Vault Integration Module Scaffold

Gap:

- `apps/web/lib/vault/` is missing in this clone.

Acceptance criteria:

- Vault product/price constants align with `copy/vault-checkout-copy.md`.
- Checkout metadata supports first name, Discord username, source, founding number, and referral attribution.
- Shared helpers expose Vault entitlement, founding cap state, and idempotent member creation hooks for the Stripe webhook.

### PHASE-N-002 - Create Vault Lifecycle Cron Scaffold

Gap:

- `apps/web/app/api/cron/` is missing in this clone.

Acceptance criteria:

- Scheduled jobs cover welcome email sequencing from `copy/vault-welcome-emails.md`.
- Scheduled jobs cover lifecycle/renewal sends from `copy/vault-retention-checkins.md` and `copy/galaxy-vault-renewal-email-sequence.md`.
- Cron jobs continue during Garrett unavailability for infrastructure-only tasks listed in `copy/galaxy-founder-unavailability-protocol.md`.

### PHASE-N-003 - Implement Discord Role Assignment Flow

Gap:

- No Vault Discord bot/webhook scaffold is present under `apps/web/lib/vault/`.

Acceptance criteria:

- Stripe success grants `vault-member` role through the deterministic flow in `copy/galaxy-vault-discord-bot-spec.md`.
- Founding-50 and founding-member roles align with `copy/galaxy-vault-discord-channel-architecture.md`.
- Welcome DM sends within 60 seconds of role assignment when Discord settings allow it.
- Failures create an admin-visible repair task and incident-log row.

### PHASE-N-004 - Add Production Smoke Script

Gap:

- `scripts/smoke-prod.sh` is missing or not executable from this Windows/WSL environment.

Acceptance criteria:

- Production smoke script runs from the repo root.
- Script verifies the public health route, `/vault`, `/methodology`, `/loss-room`, `/passes`, and checkout-safe redirect behavior without mutating production data.
- Failures write enough context for `docs/ops/issue-queue.md` triage.

### PHASE-N-005 - Proof Surface Email Capture Module

Gap:

- Public proof surfaces do not yet have the quiet email capture module specified in `product/public-proof-surface-monetization-spec.md`.

Acceptance criteria:

- Feature flag `proof_surface_email_capture_enabled` gates production rendering.
- `/loss-room`, `/loss-room/[slug]`, `/passes`, `/passes/[slug]`, `/methodology`, and `/ledger` support the module placement rules.
- Submissions store source page, source slug, consent timestamp, and UTM parameters.
- Success and error states match the spec copy.
- No modal, pop-up, sticky bar, social-proof counter, or paid-ad tracking pixel is introduced.

### PHASE-N-006 - Contextual Vault CTA Module

Gap:

- Public proof surfaces do not yet have contextual Vault CTAs that route high-intent readers to `/vault` without changing proof-page posture.

Acceptance criteria:

- Feature flag `contextual_vault_cta_enabled` gates production rendering.
- CTA copy matches `product/public-proof-surface-monetization-spec.md`.
- CTAs render below proof content only.
- CTA links include source query param.
- Events fire for view and click.
- Mobile layout preserves proof content hierarchy.

### PHASE-N-007 - Short-Form UTM and Event Reporting

Gap:

- The short-form R&D lane has scripts and a UTM map, but no application event taxonomy or report export.

Acceptance criteria:

- UTM parsing supports the allowed fields in `templates/short-form-utm-map.csv`.
- Short-form inbound sessions can be attributed to source artifact and draft ID.
- Weekly report can output the fields in `product/public-proof-surface-monetization-spec.md`.
- No third-party ad retargeting or social tracking pixels are added.

### PHASE-N-008 - Vega Character Asset Kit

Gap:

- Vega has a character brief and storyboards, but no production asset kit or design handoff package has been generated.

Acceptance criteria:

- Character asset kit includes primary Vega design, 5 expression states, transparent PNG exports, vector source file, and 9:16 title-card layout.
- Asset rights and usage terms are documented before public use.
- Visual QA confirms Vega is obviously synthetic, non-human, non-sportsbook, and readable at phone size.
- Asset kit is stored in the future asset vault or a clearly named internal folder.

### PHASE-N-009 - Vega Video Draft Assembly

Gap:

- First five Vega videos are storyboarded but not assembled into internal draft cuts.

Acceptance criteria:

- Draft cuts exist for the five videos in `copy/galaxy-vega-video-storyboards.md`.
- Voice source, caption status, visual status, platform-policy status, and approval status are tracked in `templates/vega-video-production-tracker.csv`.
- Videos use proof-surface CTAs and UTM destinations from `templates/short-form-utm-map.csv`.
- No draft uses direct checkout routing.
- No public posting occurs from this issue.

### PHASE-N-010 - Vega Public Test Readout

Gap:

- The two-week Vega test needs a readout template and decision rule before any public test starts.

Acceptance criteria:

- Test readout captures platform, post URL, proof-surface clicks, email captures, Vault applications, qualitative comments, brand-safety flags, and manual review time.
- Decision output is one of kill, continue one more 4-week test, or defer until after Vault stability.
- Readout references `templates/character-media-test-plan.csv` kill and continue criteria.

## Almanac Epic

### ALM-001 - Confirm Data Sources

Acceptance criteria:

- Settled picks source located.
- Loss autopsy source located.
- Pass List source located.
- Model changelog source located.

### ALM-002 - Build Export Package

Acceptance criteria:

- Export produces settled picks, loss autopsies, pass list, model changelog, methodology snapshot, charts, QA report, and manifest.

### ALM-003 - QA Report

Acceptance criteria:

- Missing critical fields counted.
- Missing autopsies flagged.
- Publication blocks on critical missing data.

### ALM-004 - Pre-Order Page

Acceptance criteria:

- Uses accountability-led copy.
- Supports confirmed price tier.
- States delivery and refund policy.

## Live Epic

### LIV-001 - OBS Feasibility Spike

Acceptance criteria:

- Plugin vs browser-source approach compared.
- Install path documented.
- Crash/fail-closed strategy proven.

### LIV-002 - Overlay Prototype

Acceptance criteria:

- Edge Index and factor breakdown render.
- Streamer can control position and opacity.
- Overlay remains readable at common resolutions.

### LIV-003 - Attribution

Acceptance criteria:

- Partner UTM and subscriber attribution works.
- Revenue-share report exportable.

### LIV-004 - Closed Beta Monitoring

Acceptance criteria:

- Uptime tracked.
- Stream crashes attributable to overlay tracked.
- Launch blocked unless count is zero.

# Vault Operations Integration Map

Date: 2026-05-23
Status: source-of-truth companion to the Vault PRD

This document connects the Vault operations artifacts to the engineering contracts. It exists so the post-validation build does not accidentally reduce Vault to payment, entitlement, and a few gated pages.

## Operating Position

Vault is not only a subscription tier. It is a year-long member operating system:

- Weekly rationale digest.
- Monthly office hours.
- Quarterly private data review.
- Vault Discord.
- Lifecycle emails.
- Modest referral program.
- Founding-50 culture seed.
- Press launch discipline.
- Voice-deck feedback loop from customer language into public copy.

Each surface must preserve the core promise: more context, not more picks.

## Artifact Map

| Surface | Operating doc | Engineering contract | Tracker/template |
|---|---|---|---|
| Landing and application | `copy/vault-landing-page.md` | `product/vault-prd.md`, `product/vault-api-contracts.md` | `templates/decision-log.md` |
| Customer-dev synthesis | `03-customer-development.md`, `week-minus-1/08-voice-deck-template.md` | `product/pre-engineering-handoff.md` | `templates/vault-interview-tracker.csv`, `templates/vocabulary-log.csv` |
| Founding-50 selection | `week-minus-1/07-founding-50-selection-framework.md` | `product/admin-operations-spec.md` | `week-minus-1/01-vault-interview-tracker-template.csv` |
| Weekly digest | `copy/vault-digest-template.md`, `copy/vault-digest-samples/week-1-sample.md`, `copy/vault-digest-samples/week-2-sample.md`, `copy/vault-digest-samples/week-3-sample.md` | `product/vault-data-model.md`, `product/vault-api-contracts.md`, `product/admin-operations-spec.md` | `templates/vault-feedback-themes.csv` |
| Model Journal early access | `copy/model-journal-template.md` | `product/vault-data-model.md`, `product/vault-api-contracts.md`, `product/admin-operations-spec.md` | `templates/vault-feedback-themes.csv` |
| Quarterly private data review | `copy/vault-quarterly-data-review-template.md` | `product/vault-data-model.md`, `product/vault-api-contracts.md`, `product/admin-operations-spec.md` | `templates/vault-office-hours-followup-log.csv`, `templates/monthly-kpi-review.md` |
| Welcome sequence | `copy/vault-welcome-emails.md` | `product/webhook-and-integrations-spec.md` | `product/vault-test-plan.md` |
| Email signature standards | `galaxy-email-signature-standards.md`, `galaxy-brand-voice-canonical.md` | Email provider templates | `tools/validate-monetization-v3.ps1` |
| Checkout and billing copy | `copy/vault-checkout-copy.md` | `product/webhook-and-integrations-spec.md`, `product/vault-api-contracts.md` | `templates/decision-log.md` |
| Retention lifecycle | `copy/vault-retention-checkins.md` | `product/vault-data-model.md`, `product/webhook-and-integrations-spec.md` | `templates/vault-retention-review.csv` |
| Renewal period | `launch/vault-renewal-period-playbook.md`, `copy/galaxy-vault-renewal-email-sequence.md` | `product/admin-operations-spec.md`, `product/webhook-and-integrations-spec.md` | `templates/vault-retention-review.csv`, `templates/monthly-kpi-review.md` |
| Discord launch | `copy/vault-discord-launch-pack.md`, `copy/galaxy-vault-discord-channel-architecture.md`, `copy/galaxy-vault-discord-bot-spec.md` | `product/webhook-and-integrations-spec.md` | `templates/kpi-dashboard.csv` |
| Discord moderation escalation | `galaxy-discord-moderation-escalation.md`, `copy/vault-discord-launch-pack.md` | `product/admin-operations-spec.md`, Discord moderator permissions | `templates/incidents.csv`, `templates/vault-feedback-themes.csv` |
| Office hours | `copy/vault-office-hours-playbook.md`, `galaxy-office-hours-archive-protocol.md` | `product/vault-data-model.md`, `product/vault-api-contracts.md`, `product/admin-operations-spec.md` | `templates/vault-office-hours-followup-log.csv` |
| Referral program | `copy/vault-referral-program.md` | `product/vault-data-model.md`, `product/vault-api-contracts.md`, `product/admin-operations-spec.md` | `templates/vault-referral-payout-review.csv` |
| Member support | `copy/vault-member-support-playbook.md`, `copy/galaxy-deceased-member-protocol.md`, `copy/galaxy-vault-edge-case-protocols.md` | `product/admin-operations-spec.md`, `product/webhook-and-integrations-spec.md` | `templates/vault-feedback-themes.csv`, `templates/incidents.csv`, admin support notes, repair tasks |
| Feedback synthesis | `copy/vault-feedback-synthesis-protocol.md` | `product/admin-operations-spec.md`, `04-kpi-decision-rules.md`, `galaxy-year2-strategic-question-framework.md` | `templates/vault-feedback-themes.csv`, `templates/monthly-kpi-review.md` |
| Founding-50 advisory loop | `copy/vault-advisory-channel-spec.md` | `week-minus-1/07-founding-50-selection-framework.md`, `galaxy-decision-rights-matrix.md`, `copy/vault-feedback-synthesis-protocol.md` | `templates/vault-feedback-themes.csv`, `templates/decision-log.md` |
| Member experience QA | `copy/vault-member-experience-map.md`, `copy/galaxy-vault-member-onboarding-day-by-day.md` | `product/admin-operations-spec.md`, `product/vault-test-plan.md`, `copy/vault-welcome-emails.md` | `templates/vault-retention-review.csv`, `templates/vault-feedback-themes.csv` |
| Pre-launch checklist | `launch/vault-pre-launch-checklist.md` | `product/vault-test-plan.md`, `product/webhook-and-integrations-spec.md` | `templates/decision-log.md` |
| Public launch day | `launch/vault-launch-runbook.md`, `launch/galaxy-vault-launch-day-operating-playbook.md` | `product/vault-test-plan.md`, `product/admin-operations-spec.md` | `templates/incidents.csv`, `templates/kpi-dashboard.csv` |
| First 90 days | `launch/vault-first-90-day-runbook.md` | `04-kpi-decision-rules.md`, `audit/kpi-operator-ritual.md` | `templates/monthly-kpi-review.md`, `templates/kpi-dashboard.csv` |
| Founding-50 invitation send | `copy/vault-founding50-invitation-email-templates.md` | `week-minus-1/07-founding-50-selection-framework.md`, `launch/vault-pre-launch-checklist.md` | `templates/decision-log.md` |
| Qualitative success audit | `galaxy-year1-qualitative-success-markers.md` | `04-kpi-decision-rules.md`, `audit/kpi-operator-ritual.md` | `templates/monthly-kpi-review.md`, `templates/vault-feedback-themes.csv` |
| Year-2 strategy review | `galaxy-year2-strategic-question-framework.md` | `04-kpi-decision-rules.md`, `05-cashflow-capital.md`, `09-roadmap-backlog.md` | `templates/monthly-kpi-review.md`, `templates/track-risk-register.csv` |
| Founder financial discipline | `galaxy-founder-financial-discipline.md` | `05-cashflow-capital.md`, future accountant review | `templates/monthly-kpi-review.md` |
| Business continuity | `galaxy-business-continuity-plan.md`, `copy/galaxy-founder-unavailability-protocol.md`, `06-continuity-risk.md` | `founder-resilience-playbook.md`, lawyer/emergency-contact review | `templates/incidents.csv`, `templates/decision-log.md` |
| Decision rights | `galaxy-decision-rights-matrix.md` | `galaxy-contractor-playbook.md`, `galaxy-business-continuity-plan.md` | `templates/decision-log.md` |
| Team-of-one operator templates | `galaxy-team-of-one-templates.md` | `founder-resilience-playbook.md`, `galaxy-daily-operations-checklist.md`, `galaxy-founder-financial-discipline.md` | `reviews/README.md` |
| Year-1 knowledge base | `copy/galaxy-year-1-knowledge-base.md` | `galaxy-decision-rights-matrix.md`, `galaxy-contractor-playbook.md`, `galaxy-end-of-year-1-checklist.md` | future new-hire onboarding |
| Sunset or major rollback | `launch/vault-sunset-playbook.md` | `product/admin-operations-spec.md`, `product/webhook-and-integrations-spec.md` | `templates/decision-log.md`, `templates/crisis-log.md` |
| Press launch | `copy/vault-launch-press-pack.md` | `launch/vault-launch-runbook.md` | `templates/vault-press-outreach-tracker.csv` |
| External press kit | `galaxy-press-kit.md` | `launch/vault-launch-runbook.md` | `templates/vault-press-outreach-tracker.csv` |
| Press interviews and talking points | `copy/galaxy-press-talking-points.md` | `galaxy-press-kit.md`, `copy/vault-launch-press-pack.md`, `galaxy-crisis-communications-playbook.md` | `templates/vault-press-outreach-tracker.csv`, `templates/crisis-log.md` |
| Inbound partnerships | `galaxy-partnership-evaluation-framework.md`, `copy/galaxy-affiliate-partnership-decline-templates.md` | Legal/business review after relevant track activation | `templates/partnership-inquiries.csv` |
| Investor inbound | `copy/galaxy-investor-inbound-response-template.md` | `05-cashflow-capital.md`, `12-acquisition-optionality.md`, `galaxy-decision-rights-matrix.md` | `templates/partnership-inquiries.csv`, `templates/decision-log.md` |
| Public trust surfaces | `copy/about-page-copy.md`, `copy/galaxy-product-roadmap-public.md`, `copy/galaxy-member-testimonial-policy.md`, `copy/galaxy-methodology-revision-protocol.md`, `copy/methodology-page-copy.md`, `copy/methodology-faq.md`, `copy/loss-room-page-copy.md`, `copy/pass-list-page-copy.md` | Future app implementation after gates | `tools/validate-monetization-v3.ps1` |
| Social discipline | `copy/galaxy-twitter-content-discipline.md`, `copy/galaxy-twitter-launch-thread.md`, `copy/galaxy-twitter-incident-response-protocol.md`, `galaxy-brand-voice-canonical.md` | Future social publishing workflow if automated | `templates/vault-press-outreach-tracker.csv`, `templates/incidents.csv` |
| Daily operations and privacy | `galaxy-daily-operations-checklist.md`, `galaxy-data-retention-privacy-policy.md` | `product/admin-operations-spec.md`, future privacy/deletion tooling | `templates/incidents.csv`, `templates/vault-feedback-themes.csv` |
| Quarterly deep audit | `galaxy-quarterly-deep-audit-protocol.md` | `audit/kpi-operator-ritual.md`, `galaxy-year1-qualitative-success-markers.md`, `galaxy-year2-strategic-question-framework.md` | `reviews/README.md`, `templates/monthly-kpi-review.md` |
| End-of-Year-1 close | `galaxy-end-of-year-1-checklist.md` | `copy/vault-month-12-renewal-decision-memo-template.md`, `galaxy-quarterly-deep-audit-protocol.md`, `galaxy-year2-strategic-question-framework.md`, `copy/galaxy-year-end-annual-report-template.md` | `reviews/README.md`, `templates/decision-log.md` |
| Weekly retrospective | `week-minus-1/09-weekly-retrospective-template.md` | `founder-resilience-playbook.md`, `galaxy-daily-operations-checklist.md` | `reviews/README.md` |
| Month-3 Vault KPI gate | `copy/vault-month-3-kpi-decision-memo-template.md` | `04-kpi-decision-rules.md`, `launch/vault-first-90-day-runbook.md` | `templates/monthly-kpi-review.md`, `templates/decision-log.md` |
| Month-6 Vault kill gate | `copy/vault-month-6-kpi-decision-memo-template.md` | `04-kpi-decision-rules.md`, `launch/vault-sunset-playbook.md`, `copy/vault-month-3-kpi-decision-memo-template.md` | `templates/monthly-kpi-review.md`, `templates/decision-log.md` |
| Month-12 Vault renewal gate | `copy/vault-month-12-renewal-decision-memo-template.md` | `04-kpi-decision-rules.md`, `launch/vault-renewal-period-playbook.md`, `launch/vault-sunset-playbook.md` | `templates/vault-retention-review.csv`, `templates/decision-log.md` |
| Vault pricing evolution | `copy/galaxy-vault-pricing-evolution-framework.md` | `04-kpi-decision-rules.md`, `02-active-tracks.md`, `05-cashflow-capital.md` | `templates/monthly-kpi-review.md`, `templates/decision-log.md` |
| Year-1 personal retrospective | `copy/galaxy-12-month-personal-retrospective-template.md` | `copy/vault-month-12-renewal-decision-memo-template.md`, `founder-resilience-playbook.md`, `galaxy-founder-financial-discipline.md` | private owner archive outside `docs/monetization-v3/` |
| Vault V2 conference planning | `copy/galaxy-vault-conference-v2-spec.md` | `galaxy-year2-strategic-question-framework.md`, `07-deferred-tracks.md` | `templates/decision-log.md` |
| Almanac essay bank | `copy/galaxy-almanac-essay-outlines.md` | `copy/almanac-production-pack.md`, `copy/almanac-year-in-review-essay-specimen.md` | `templates/almanac-interview-tracker.csv` |
| Almanac presale launch thread | `copy/galaxy-almanac-presale-launch-thread.md` | `copy/almanac-preorder-positioning.md`, `launch/almanac-preorder-runbook.md`, `copy/galaxy-twitter-content-discipline.md` | `templates/almanac-interview-tracker.csv` |
| Compliance, voice, and internal tooling boundary | `brand-safety-checklist.md`, `galaxy-brand-voice-canonical.md`, `galaxy-ai-policy.md` | `product/vault-test-plan.md` | `tools/validate-monetization-v3.ps1`, manual scanner until app scanner is active |

## Build Order After Gate Clears

Do not build any of this until `13-execution-gates.md` clears.

Once clear:

1. Implement the Vault member, entitlement, checkout, and seat-number foundation.
2. Add content archives for digest, office hours, and quarterly reviews.
3. Add Discord role automation.
4. Load welcome and retention lifecycle emails.
5. Add referral attribution, then payout operations.
6. Add admin surfaces for applications, members, content, referral payouts, retention queues, and office-hours commitments.
7. Add support-note, repair-task, and escalation surfaces for member support.
8. Add KPI export and launch smoke tests.
9. Launch founding-50 privately.
10. Open public founding-1000 only after the private window retrospective.
11. Start press outreach only after public Vault is live and copy is checked.

## Non-Negotiable Interlocks

- Referral mechanics must follow `copy/vault-referral-program.md`: 10%, first-year only, no double-rate promotions, no ambassador tiers.
- Retention emails must stay separate from referral asks except the explicitly defined soft referral notes.
- Office hours must stay member-led. Admin metrics track talk time and commitments so drift is visible.
- Press must not volunteer named competitor comparisons. If asked, use `copy/outlier-competitive-battlecard.md`.
- Press kit boilerplate must be kept factual and updated before any public `/press` route ships.
- Checkout copy must preserve the annual commitment and refund language exactly; no stronger guarantee language.
- Member support responses use the same voice rules as public copy.
- The first-90-day cadence protects the operator as well as the product; do not increase communication cadence to chase weak early numbers without a decision-log entry.
- Voice-deck phrases can replace landing/welcome/press copy only when respondent language is meaningfully stronger.
- Founding-50 identity stays private unless a member self-discloses.

## Launch Readiness Checklist

- [ ] DEC-NEXT-001 through DEC-NEXT-004 complete.
- [ ] DEC-NEXT-009 complete or referral program deferred.
- [ ] Voice deck reviewed against landing page and welcome emails.
- [ ] Founding-50 roster scored and locked.
- [ ] Lifecycle email queue tested.
- [ ] Referral payout path tested or hidden.
- [ ] Office-hours recording/transcription path tested.
- [ ] First-90-day operating cadence reviewed against founder capacity.
- [ ] Brand-safety scan clean across landing, welcome, retention, referral, Discord, and press copy.
- [ ] P0 launch smoke from `product/vault-test-plan.md` passes.

## Current Status

Preparation is complete enough to hand to engineering after the customer-development gate. Product engineering remains blocked until runway, customer-dev outcome, app repo, and integration credentials are confirmed.

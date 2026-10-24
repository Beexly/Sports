# Growth Ops Strategy

As of: 2026-06-09

## Growth Ops System Map

- Twenty is the relationship database: leads, B2B prospects, affiliates, media, sports creators, investors, advisors, enterprise buyers, support escalations, and churn-risk accounts.
- Chatwoot is the conversation layer: live chat, email/support inbox, pricing objections, bugs, feature requests, and retention saves.
- listmonk is the lifecycle channel: free newsletter, GSE Daily Brief, injury/market/source alerts, onboarding, paid conversion, winback, and weekly track-record recap.
- Cap is the trust and onboarding media layer: walkthroughs, QA videos, bug repros, demos, investor clips, support replies.
- AnythingLLM/Open WebUI support brains are internal copilot layers, not autonomous public agents until leakage gates pass.

## Twenty Pipeline Schema

| Pipeline | Objects | Key fields | First automation |
| --- | --- | --- | --- |
| B2C subscriber | Person, SubscriptionIntent, Segment | tier, sport, source, last_engaged, conversion_objection | newsletter-to-CRM sync |
| B2B/enterprise | Company, Contact, Opportunity | league, use_case, seat_count, budget_status, compliance_needs | enterprise prospect flow |
| Affiliate/creator | Person, Channel, Deal | audience, sport, fit_score, disclosure_status | affiliate and creator pipeline |
| Investor/advisor | Person, Company, Note | relationship_stage, thesis_fit, intro_source, next_touch | advisor and investor CRM |
| Support escalation | Contact, ConversationRef, Risk | tier, severity, churn_risk, blocker | support-to-CRM sync |

## Chatwoot Map

Live chat, support inbox, feedback, pricing objections, bug reports, AI-assisted drafts, and public support KB. No autonomous betting, billing, or proprietary-method answers.

## listmonk Map

GSE Daily Brief, free newsletter, paid digest, injury alerts, market alerts, product updates, onboarding, conversion, retention, winback, and weekly track-record recap.

## Cap Map

Onboarding videos, bug reproduction, feature walkthroughs, sales demos, investor demos, and support replies.

## Customer Lifecycle Map

Lead -> subscriber -> activated free user -> PRO trial/upgrade -> retained PRO -> ELITE/VIP fit -> advocate/affiliate -> enterprise/advisor opportunity.

## Tag Taxonomy

`tier:free`, `tier:pro`, `tier:elite`, `sport:nfl`, `sport:nba`, `intent:upgrade`, `risk:churn`, `issue:data-freshness`, `issue:billing`, `objection:price`, `objection:trust`, `source:newsletter`, `source:support`, `source:creator`, `needs:education`, `needs:enterprise-demo`.

## Event Taxonomy

`newsletter_subscribed`, `brief_opened`, `alert_clicked`, `pricing_questioned`, `support_started`, `bug_reported`, `feature_requested`, `upgrade_intent`, `checkout_abandoned`, `tier_upgraded`, `tier_cancelled`, `enterprise_demo_requested`, `source_quality_complaint`.

## Build Cards

Primary: BUILD-025 through BUILD-060, BUILD-097 through BUILD-108, BUILD-113 through BUILD-120.

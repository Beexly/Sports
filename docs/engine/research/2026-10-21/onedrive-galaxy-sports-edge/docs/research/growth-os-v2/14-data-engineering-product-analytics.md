# Data Engineering / Product Analytics

As of: 2026-06-09

## Event Taxonomy

| Event | Properties | Privacy Concern | Business Use |
| --- | --- | --- | --- |
| page_view | user_id_hash, anonymous_id, session_id, path, tier, sport, surface, timestamp, source_context | Minimize PII; hash identifiers. | Funnels, retention, trust, support, and monetization analysis |
| signup_started | user_id_hash, anonymous_id, session_id, path, tier, sport, surface, timestamp, source_context | Minimize PII; hash identifiers. | Funnels, retention, trust, support, and monetization analysis |
| signup_completed | user_id_hash, anonymous_id, session_id, path, tier, sport, surface, timestamp, source_context | Minimize PII; hash identifiers. | Funnels, retention, trust, support, and monetization analysis |
| onboarding_started | user_id_hash, anonymous_id, session_id, path, tier, sport, surface, timestamp, source_context | Minimize PII; hash identifiers. | Funnels, retention, trust, support, and monetization analysis |
| onboarding_completed | user_id_hash, anonymous_id, session_id, path, tier, sport, surface, timestamp, source_context | Minimize PII; hash identifiers. | Funnels, retention, trust, support, and monetization analysis |
| rating_viewed | user_id_hash, anonymous_id, session_id, path, tier, sport, surface, timestamp, source_context | Minimize PII; hash identifiers. | Funnels, retention, trust, support, and monetization analysis |
| player_viewed | user_id_hash, anonymous_id, session_id, path, tier, sport, surface, timestamp, source_context | Minimize PII; hash identifiers. | Funnels, retention, trust, support, and monetization analysis |
| pick_viewed | user_id_hash, anonymous_id, session_id, path, tier, sport, surface, timestamp, source_context | Minimize PII; hash identifiers. | Funnels, retention, trust, support, and monetization analysis |
| no_bet_viewed | user_id_hash, anonymous_id, session_id, path, tier, sport, surface, timestamp, source_context | Minimize PII; hash identifiers. | Funnels, retention, trust, support, and monetization analysis |
| article_viewed | user_id_hash, anonymous_id, session_id, path, tier, sport, surface, timestamp, source_context | Minimize PII; hash identifiers. | Funnels, retention, trust, support, and monetization analysis |
| promotion_viewed | user_id_hash, anonymous_id, session_id, path, tier, sport, surface, timestamp, source_context | Affiliate and geo compliance; do not store unnecessary sensitive data. | Funnels, retention, trust, support, and monetization analysis |
| promotion_clicked | user_id_hash, anonymous_id, session_id, path, tier, sport, surface, timestamp, source_context | Affiliate and geo compliance; do not store unnecessary sensitive data. | Funnels, retention, trust, support, and monetization analysis |
| affiliate_outbound_click | user_id_hash, anonymous_id, session_id, path, tier, sport, surface, timestamp, source_context | Affiliate and geo compliance; do not store unnecessary sensitive data. | Funnels, retention, trust, support, and monetization analysis |
| upgrade_clicked | user_id_hash, anonymous_id, session_id, path, tier, sport, surface, timestamp, source_context | Minimize PII; hash identifiers. | Funnels, retention, trust, support, and monetization analysis |
| checkout_started | user_id_hash, anonymous_id, session_id, path, tier, sport, surface, timestamp, source_context | Billing-adjacent; do not log payment secrets. | Funnels, retention, trust, support, and monetization analysis |
| checkout_completed | user_id_hash, anonymous_id, session_id, path, tier, sport, surface, timestamp, source_context | Billing-adjacent; do not log payment secrets. | Funnels, retention, trust, support, and monetization analysis |
| plan_changed | user_id_hash, anonymous_id, session_id, path, tier, sport, surface, timestamp, source_context | Minimize PII; hash identifiers. | Funnels, retention, trust, support, and monetization analysis |
| cancellation_started | user_id_hash, anonymous_id, session_id, path, tier, sport, surface, timestamp, source_context | Minimize PII; hash identifiers. | Funnels, retention, trust, support, and monetization analysis |
| cancellation_saved | user_id_hash, anonymous_id, session_id, path, tier, sport, surface, timestamp, source_context | Minimize PII; hash identifiers. | Funnels, retention, trust, support, and monetization analysis |
| cancellation_completed | user_id_hash, anonymous_id, session_id, path, tier, sport, surface, timestamp, source_context | Minimize PII; hash identifiers. | Funnels, retention, trust, support, and monetization analysis |
| support_opened | user_id_hash, anonymous_id, session_id, path, tier, sport, surface, timestamp, source_context | Minimize PII; hash identifiers. | Funnels, retention, trust, support, and monetization analysis |
| support_message_sent | user_id_hash, anonymous_id, session_id, path, tier, sport, surface, timestamp, source_context | Minimize PII; hash identifiers. | Funnels, retention, trust, support, and monetization analysis |
| alert_created | user_id_hash, anonymous_id, session_id, path, tier, sport, surface, timestamp, source_context | Minimize PII; hash identifiers. | Funnels, retention, trust, support, and monetization analysis |
| watchlist_created | user_id_hash, anonymous_id, session_id, path, tier, sport, surface, timestamp, source_context | Minimize PII; hash identifiers. | Funnels, retention, trust, support, and monetization analysis |
| contest_joined | user_id_hash, anonymous_id, session_id, path, tier, sport, surface, timestamp, source_context | Minimize PII; hash identifiers. | Funnels, retention, trust, support, and monetization analysis |
| referral_shared | user_id_hash, anonymous_id, session_id, path, tier, sport, surface, timestamp, source_context | Minimize PII; hash identifiers. | Funnels, retention, trust, support, and monetization analysis |
| email_opened | user_id_hash, anonymous_id, session_id, path, tier, sport, surface, timestamp, source_context | Minimize PII; hash identifiers. | Funnels, retention, trust, support, and monetization analysis |
| email_clicked | user_id_hash, anonymous_id, session_id, path, tier, sport, surface, timestamp, source_context | Minimize PII; hash identifiers. | Funnels, retention, trust, support, and monetization analysis |
| brief_viewed | user_id_hash, anonymous_id, session_id, path, tier, sport, surface, timestamp, source_context | Minimize PII; hash identifiers. | Funnels, retention, trust, support, and monetization analysis |
| search_used | user_id_hash, anonymous_id, session_id, path, tier, sport, surface, timestamp, source_context | Minimize PII; hash identifiers. | Funnels, retention, trust, support, and monetization analysis |
| filter_used | user_id_hash, anonymous_id, session_id, path, tier, sport, surface, timestamp, source_context | Minimize PII; hash identifiers. | Funnels, retention, trust, support, and monetization analysis |
| track_record_viewed | user_id_hash, anonymous_id, session_id, path, tier, sport, surface, timestamp, source_context | Minimize PII; hash identifiers. | Funnels, retention, trust, support, and monetization analysis |
| copy_flagged | user_id_hash, anonymous_id, session_id, path, tier, sport, surface, timestamp, source_context | Minimize PII; hash identifiers. | Funnels, retention, trust, support, and monetization analysis |
| source_clicked | user_id_hash, anonymous_id, session_id, path, tier, sport, surface, timestamp, source_context | Minimize PII; hash identifiers. | Funnels, retention, trust, support, and monetization analysis |

## Rule

This is taxonomy only. Do not implement until approved in the real app clone.

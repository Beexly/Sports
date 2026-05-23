# Vault Tracking Schema

Status: Companion to `templates/vault-interview-tracker.csv`

Use a Google Sheet with four tabs: Respondents, Vocabulary Log, Scoring, Decision Memo.

## Tab 1 - Respondents

Identity:

- `respondent_id` (R001-R030)
- `name`
- `email_or_handle`
- `source_pool`
- `referred_by`
- `interview_scheduled_at`
- `interview_completed_at`
- `recording_link`

Background:

- `frequency_tier`
- `spend_tier`
- `tenure_years`
- `sports_primary`
- `existing_subscriptions`
- `never_paid_for_research`

Existing tools:

- `current_research_mode`
- `top_frustration_category`
- `top_frustration_verbatim`
- `churn_driver`

Positioning:

- `positioning_recognition`
- `transparency_reaction`
- `transparency_verbatim`
- `trust_gap`
- `relative_trust_vs_existing`

Vault offer:

- `initial_reaction`
- `lead_benefit`
- `secondary_benefits_cited`
- `overprice_risk`
- `scarcity_reaction`
- `intent_to_join`
- `intent_reasoning`
- `blocker_category`
- `blocker_verbatim`
- `referral_message`

Wrap:

- `pitch_feedback`
- `early_commit`
- `referrals_offered`

Interviewer judgment:

- `politeness_suspected`
- `energy_signal` (high / neutral / low)
- `notes`
- `quote_1`
- `quote_2`
- `quote_3`

## Tab 2 - Vocabulary Log

Columns:

- `respondent_id`
- `phrase`
- `context`
- `is_galaxy_phrase`
- `frequency_count`
- `landing_page_candidate`

Use this tab to distinguish real customer vocabulary from words Garrett seeded during the pitch.

## Tab 3 - Scoring

Computed fields:

- `qualified_yes`
- `reason_cluster_coherence`
- `objection_addressability`
- `vocabulary_alignment`
- `recommended_plan`

Qualified yes definition:

```text
intent_to_join in ("definitely", "likely")
AND politeness_suspected = FALSE
AND intent_reasoning cites at least one specific Vault benefit
```

## Tab 4 - Decision Memo

Copy the decision memo from `copy/vault-validation-plans.md` after synthesis.

## Vocabulary Feedback Loop

After synthesis:

1. Sort Vocabulary Log by repeated non-Galaxy phrases.
2. Identify phrases appearing in 5+ interviews.
3. Compare them to current `copy/vault-landing-page.md`.
4. Replace generic marketing language with customer language when the meaning is more precise.
5. Do not add outcome claims or competitor claims just because customers said them.

This is how interviews improve copy without weakening compliance discipline.

# User Trust Recovery Playbook

When Galaxy has shown a user something wrong — stale, fabricated,
mis-labeled, or certainty-coded — this playbook controls the recovery.

Trust loss compounds. Trust recovery is one careful conversation at a time.

## Categories of trust damage

| Category | Example | Severity |
|---|---|---|
| **Fabrication** | A pick or stat that has no provider backing | SEV-1 trust |
| **Stale-without-label** | Live odds shown but data is hours old, no freshness label | SEV-1 trust |
| **Certainty leak** | "Lock", "guaranteed", "easy money" copy in user-facing output | SEV-1 trust |
| **Misattribution** | Source labeled `provider` when it was illustrative | SEV-2 trust |
| **Wrong methodology framing** | Claiming a method we don't use | SEV-2 trust |
| **Manipulation pattern** | Loss-triggered upsell, urgency timers, social bandwagoning | SEV-1 trust |
| **Privacy break** | A user's data shown to another user | SEV-1 trust |

## Recovery sequence (SEV-1 trust)

### 1. Stop the harm

- Pull the affected surface offline (kill switch + launch-mode demotion).
- Remove the bad content from the DB (set `isPublished=false`; do NOT delete — keep audit trail).
- If the bad content was shared off-platform (email, OG image, social): document the spread.

### 2. Identify affected users

- Pull telemetry for views of the affected surface during the bad window.
- Pull session logs for "saved" or "tracked" interactions with the bad content.
- Cross-reference with subscription tier to prioritize paying users.

### 3. Acknowledge directly

A trust incident requires direct communication. Email or in-app notice to affected users covering:

```
Subject: A correction from Galaxy

Between <start UTC> and <end UTC>, Galaxy showed <specific description of what was wrong>.

What happened: <one-paragraph honest summary, no euphemism>.

What we did about it: <action taken>.

What you should do: <action for the user, if any>.

We hold ourselves to a standard where the evidence chain is the product.
This incident violated that standard. We've added <prevention test / process>
to keep it from recurring.

— The Galaxy team
```

Tone rules:
- Plain English. No legal hedging.
- Name the failure precisely. ("We showed you a confidence score from cached data without labeling it stale.")
- Do not promise specifics until verified.
- No "your business is important to us" filler.

### 4. Publish a post-mortem within 7 days

For any SEV-1 trust incident, the post-mortem is public.

Sections:
1. What users saw
2. What was actually true
3. How the discrepancy arose
4. How we detected it
5. What we changed (link to commit + prevention test)
6. What we are still working on

The post-mortem is a trust deposit.

### 5. Refund / credit posture

For paying users affected by a SEV-1 trust incident:
- Default: offer a one-month credit, no questions asked.
- Document the credit in the user's account history.
- Do not require the user to request it.

This is policy, not generosity.

## Manipulation pattern recovery (Constitution adjacency)

If Galaxy shipped a pattern that:
- Triggered higher engagement after a loss
- Used urgency or scarcity to pressure a decision
- Used social proof to imply consensus where none existed
- Hid a no-bet result behind a paywall when the doctrine says it should be free

Then the recovery is structural, not just textual:
1. Pull the pattern.
2. Add the pattern to the positioning firewall's forbidden list.
3. Add a test that fails when the pattern reappears.
4. Audit adjacent surfaces for the same pattern.
5. Publish the change to `PRODUCT_SCIENCE_LEDGER.md` with the hypothesis that drove the bad pattern.

## What never happens during trust recovery

- Galaxy never minimizes ("a minor display issue") a real fabrication.
- Galaxy never deletes the bad content silently — audit trail is preserved.
- Galaxy never lets the same fabrication recur without a prevention test.
- Galaxy never frames a trust incident as a "feature change" in a release note.
- Galaxy never charges a user for content that was shown in violation of the evidence-chain standard.

## Drill cadence

Twice yearly tabletop on a hypothetical SEV-1 trust incident. Practice the email draft, the post-mortem outline, and the prevention-test addition. Trust recovery is a muscle.

## Long-term trust health

Trust is measured per `lib/decision-quality/maturity.ts` and tracked in the product science ledger. A trust incident may set a learner cohort back; recovery is measured in the cohort returning to baseline maturity progression, not in raw retention.

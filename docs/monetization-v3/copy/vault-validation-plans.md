# Vault Validation Plans

Status: Decision companion for Day 7 synthesis

## Primary Metric

Qualified yes:

```text
COUNT(respondents WHERE
  intent_to_join IN ("definitely", "likely")
  AND politeness_suspected = FALSE
  AND intent_reasoning cites at least one specific Vault benefit
)
```

## Thresholds

| Qualified yes count | Decision | Action |
|---:|---|---|
| 20+ of 30 | GO at $200/year | Plan A |
| 15-19 of 30 | Likely go with retest | Plan B |
| 10-14 of 30 | Pivot to $150/year retest | Plan C |
| 5-9 of 30 | Deep pivot | Plan D |
| 0-4 of 30 | No-go | Plan E |

## Secondary Gates

All three must pass for any go decision:

1. Reason cluster coherence: at least 3 of 5 Vault benefits are cited as `lead_benefit` by 20%+ of yes-respondents.
2. Objection addressability: under 50% of no-respondents cite structural blockers like price tolerance or never paying for research.
3. Vocabulary alignment: at least 3 distinct non-Galaxy-seeded phrases appear in 5+ interviews each.

If the yes count passes but a secondary gate fails, drop to the more conservative plan.

## Plan A - GO at $200/year

1. Email all 30 interviewees with thanks and launch status.
2. Start engineering from `product/vault-prd.md`.
3. Draft the first 3 weekly digests.
4. Compile voice deck from `quote_1`, `quote_2`, and `quote_3`.
5. Set landing page launch target: 21 days from synthesis day.

## Plan B - Likely GO With Retest

1. Recruit 10 additional interviews from the same source pools.
2. Run Days 8-14.
3. Sharpen Section D pitch based on first-week findings.
4. Apply stricter politeness filter.
5. Decision Day 14:
   - 25+ qualified yes of 40: go at $200.
   - 18-24 qualified yes: go at $150.
   - Under 18: Plan C.

## Plan C - Pivot to $150 Retest

1. Recruit 10 fresh interviewees.
2. Pitch "$150/year, founding-member tier, cap 1,500."
3. Decision Day 14:
   - 6+ qualified yes of 10: go at $150.
   - 4-5: Plan D.
   - Under 4: Plan E.

## Plan D - Deep Pivot

1. Re-read every interview.
2. Identify dismissed benefits and coveted missing benefits.
3. Test 3 alternatives:
   - Vault monthly: $25/month.
   - Vault content-only: no office hours, no Discord, $99/year.
   - Elite benefit stack: Elite gets digest + office hours at $79/month.
4. Run 5 interviews per alternative.
5. Decision Day 21: best alternative over 50% qualified yes moves forward. If none clear, Plan E.

## Plan E - No-Go

1. Stop engineering scope.
2. Save the estimated $80k engineering spend.
3. Reposition benefits into Elite:
   - Digest becomes Elite email perk.
   - Office hours become Elite monthly or quarterly.
   - Quarterly review folds into Almanac.
   - Early Model Journal access becomes Elite benefit.
   - Discord becomes Elite Discord channel.
4. Retest Elite price if needed.
5. Promote Almanac to year-1 anchor product.

## Decision Memo Template

```markdown
# Vault Customer Dev - Decision Memo

Date:
Interviews completed:

## Headline Metrics

- Qualified yes-count:
- Reason cluster coherence: PASS / FAIL
- Objection addressability: PASS / FAIL
- Vocabulary alignment: PASS / FAIL

## Decision

GO at $200 / Likely go with retest / Pivot to $150 / Deep pivot / No-go

## Top Three Findings

1.
2.
3.

## Top Three Objections

1.
2.
3.

## Vocabulary That Becomes Landing Copy

1.
2.
3.

## Founding-Prospect Roster

- Early commits:
- Top 5 by commitment strength:

## Next 7-Day Actions

-
```

## Anti-Rationalization Check

Before overriding any result:

- Did Garrett run the politeness filter honestly?
- Did all three secondary gates actually pass?
- Is an override being considered because evidence supports it, or because time pressure makes the result painful?

If these cannot be answered cleanly, do not override.

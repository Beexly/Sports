# B2B Data Licensing R&D

**Date:** 2026-05-23
**Status:** Internal R&D only
**Related decision:** DEC-NEXT-066

## DEC-NEXT-066 - Define a gated B2B data licensing R&D lane

**Decision:** Keep B2B data licensing as a researched but inactive monetization lane. The only acceptable near-term work is defining a quiet inquiry page, qualification rules, and rejection boundaries.

**Why now:** Galaxy's public proof surfaces can attract researchers, media companies, academic projects, and data buyers. Without a framework, inbound interest can turn into founder-time leakage or brand-risk partnerships. This document gives the lane a shape without activating it.

## What Galaxy Could License

Allowed in principle:

- published Ledger entries;
- Loss Room metadata and public autopsy links;
- Pass List entries and categories;
- model version/changelog metadata;
- aggregate calibration snapshots;
- public methodology snapshots.

Not allowed:

- source code;
- factor weights;
- unpublished picks;
- private Vault quarterly review internals;
- member data;
- exclusive sportsbook integrations;
- anything that requires Galaxy to hide losses or alter Pass List visibility.

## Buyer Categories

| Buyer | Fit | Notes |
|---|---:|---|
| Academic sports analytics researcher | High | Low revenue, high credibility if use is transparent. |
| Media/research desk | Medium-high | Useful if attribution is clear and no picks hype is required. |
| Independent data analyst | Medium | Allow small feed only if support burden stays low. |
| Hedge fund/quant research | Medium | Higher value, higher legal review requirement. |
| Sportsbook | Low | Data-only carve-out possible; affiliate/promotional use rejected. |
| Direct competitor | Negative | Decline. |

## Quiet Inquiry Page Concept

Possible route: `/data` or `/licensing`.

Page posture:

- method-led;
- no public pricing;
- no sales language;
- clear accepted/rejected uses;
- short inquiry form;
- no promises of response speed beyond "reviewed weekly."

Minimum page sections:

1. What Galaxy publishes.
2. What can be licensed.
3. What cannot be licensed.
4. Accepted use cases.
5. Inquiry form.

The page should link to:

- `/methodology`;
- `/ledger`;
- `/loss-room`;
- `/passes`;
- partnership evaluation framework.

## Inquiry Form Fields

Required:

- name;
- organization;
- role;
- email;
- intended use;
- desired data surfaces;
- commercial or research use;
- timeline;
- whether the use involves a sportsbook.

Optional:

- expected data volume;
- public attribution requirement;
- sample output or paper link.

## Qualification Rules

Engage only if all are true:

- specific named person and organization;
- proposed use fits allowed data surfaces;
- no request for factor weights, unpublished content, or member data;
- no affiliate, sponsored-pick, or promotional sportsbook angle;
- estimated founder time under 5 hours before a real commercial proposal exists.

Decline if any are true:

- vague "partnership" ask;
- wants exclusivity;
- wants Galaxy to suppress losses;
- wants direct checkout or bettor acquisition integration;
- asks for source code, model weights, or private Vault materials.

## Pricing R&D, Not Offer

Do not publish pricing.

Internal ranges to test only after qualified inbound exists:

- academic/research access: free to low fee with attribution and publication rights;
- small commercial feed: annual low-four-figure license;
- larger commercial research use: annual mid-five-figure license only with lawyer review;
- exclusivity: default no.

These are placeholders for evaluation, not a price sheet.

## Activation Gate

Do not build the page until:

- Vault launch path is stable;
- proof surfaces are data-backed, not static scaffolds;
- partnership evaluation framework is in use;
- lawyer review budget exists for any contract over $10k;
- Garrett explicitly accepts B2B inquiry handling as a time cost.

## Kill Criteria

Hide or do not build the page if:

- more than 80% of inquiries are low-quality;
- any sportsbook affiliate language dominates inbound;
- average inquiry consumes more than 30 minutes before disqualification;
- the page creates member confusion about whether Galaxy sells private data.

## Guardrail

This R&D lane does not activate B2B sales, build an API, publish pricing, or authorize outreach. It exists to make future inbound easier to classify and easier to decline.

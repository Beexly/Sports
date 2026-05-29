# Trust UX Standard — Galaxy Sports Edge

## Purpose

Every betting-adjacent surface must carry seven trust signals: data
freshness, source confidence, demo/live status, methodology access,
responsible-gaming access, uncertainty state, and an actionability label.

## Architecture

```
apps/web/lib/trust/
├── trust-signals.ts   # 7 dimensions + requirement levels
├── disclosures.ts     # canonical disclosure strings
└── source-labels.ts   # public source vocabulary + internal mapping
```

## Required surface checklist

- ✅ EvidenceRow with freshness pill **at fold**
- ✅ Source label (Provider / Galaxy model / Public record / ...) **at fold**
- ✅ Demo/live status (SampleDataBanner or StateBadge) **at fold**
- ✅ Methodology cross-link **below fold acceptable**
- ✅ RiskDisclosure component or Footer responsible-play link
- ✅ Failure case on picks; confidence band on signals
- ✅ Tier badge + clear next action label

## Source vocabulary

Six public source keys: `provider`, `galaxy-model`, `aggregate`,
`public-record`, `editorial`, `illustrative`. Six freshness keys: `live`,
`fresh`, `today`, `stale`, `sample`, `unknown`.

`publicSourceFor(providerId)` is the **only** function that maps an
internal provider id to a public label. Raw provider ids never reach
the client.

## Disclosure strings

Nine canonical disclosures centralized in `disclosures.ts`. Adding a
new disclosure requires legal review and an entry here.

## Authority

- Constitution #5 (no stale-data deception)
- Constitution #9 (no pick without failure case)
- Evidence Chain Standard
- Responsible Intelligence Layer (C27)

## Review

- Per-surface on creation.
- Quarterly retroactive sweep.
- Owner-only amendments.

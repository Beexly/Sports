# Positioning Firewall — Galaxy Sports Edge

## Purpose

Protects Galaxy's public copy from drifting into two failure modes:

1. **Generic AI-pick positioning** — "AI picks the winners," "our model
   chooses for you." Indistinguishable from every other vendor.
2. **Betting-tout language** — "tail the sharps," "lock of the day,"
   "beat the books," "insider information."

Galaxy is neither. It is decision-quality intelligence with the
evidence chain attached.

## Architecture

```
apps/web/lib/brand/
└── positioning-firewall.ts   # forbidden + required positionings + scanner

docs/brand/
└── POSITIONING_FIREWALL.md   (this file)
```

## Forbidden positionings

Five named categories with patterns and replacements:

1. **AI picks the winners** → `Galaxy publishes calibrated signals, with the evidence chain attached.`
2. **Tail the sharps** → `Read the evidence the model is reading.`
3. **Beat the books** → `Identify edge before the line reflects it.`
4. **Insider information** → `Public-record evidence plus a transparent factor trail.`
5. **Guaranteed profitable system** → `Process-quality framing — the only signal that survives sample noise.`

## Required positionings (by surface family)

- **homepage**: must include `process`, `evidence`, `restraint`.
- **methodology**: must include `calibration`.
- **all-public**: every pick surface must include a failure-case framing
  ("How this can be wrong").

## Tone signatures

Five tone signatures the copy should always carry: measured-confidence,
evidence-first, operator-respect, discipline-as-craft, no-tout.

## Enforcement

- `scanPositioning(text)` runs on copy blocks during review.
- Trust-gate continues to enforce the certainty-language ban.
- Compliance scanner enforces tier-specific copy rules.
- The Taste Critic Rubric flags tout aesthetics at the surface level.

## Authority

- Constitution #11 (clarity is the default)
- Trust Claim Registry
- Design QA Rubric

## Review

Quarterly: review the forbidden positioning list against the current
competitor landscape. Owner-only amendments.

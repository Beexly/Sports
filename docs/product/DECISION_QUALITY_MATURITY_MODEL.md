# Decision Quality Maturity Model — Galaxy Sports Edge

## Purpose

Galaxy measures whether users are becoming **better decision-makers**,
not more active bettors. The maturity model is the answer to a single
question: *is the user further along the discipline path than they were
30 days ago?*

## Architecture

```
apps/web/lib/decision-quality/
├── maturity.ts            # 5-stage classification + lift suggestion
├── process-grades.ts      # A/B/C/D/F rubric on a single decision
└── behavior-patterns.ts   # 8 observable patterns + doctrine responses
```

## The five stages

| Stage | Default surface |
|---|---|
| spectator | Methodology, Academy foundation, the home page |
| learner | No-Bet, Autopsy, Evidence Vault |
| operator | Today's Board, Parlay MRI, Market Mirage |
| disciplined | Profile, Tracker, Calibration |
| compounding | Reports, Orbit View, Academy Edge Track |

Stages are **never displayed as a public ranking** and never tied to
billing. They influence defaults; they never gate content.

## Process grading

A bet's `ProcessGrade` is independent of its result. The rubric scores:
published-gate compliance, evidence checked, bankroll discipline, CLV,
tilt response (inverted), Parlay MRI consultation (when applicable).

The framing the product uses: **good loss > bad win**.

## Behavior patterns

Eight patterns the engine tries to recognize. Four are supportive
(no-bet-respecter, process-grader, calibration-checker, academy-learner)
and four are risky (tilt-cascade, chase-line, narrative-bandwagon,
evidence-bypass).

Every response is doctrine-aligned. The model **cannot** propose
"place a bet," "raise stake," or any upsell. The eligible responses are:
elevate No-Bet, elevate Academy, elevate Responsible-Play, elevate
Methodology, elevate Autopsy, reinforce a good habit, or none.

## What this is not

- Not a gamification system. There are no points, badges, or streaks.
- Not a leaderboard input. Maturity is private.
- Not a billing input. Stage never alters pricing or entitlements.
- Not an outcome model. Win/loss is excluded from maturity scoring.

## Authority

- Constitution #6 (process over outcome)
- Constitution #8 (no autonomous betting actions)
- Constitution #11 (clarity is the default)
- Decision Quality Surfaces Spec (autopsy, parlay-mri, no-bet, …)

## Review

Quarterly: recalibrate stage thresholds against observed cohort behavior.
Annual: revisit weighting of inputs in `classifyMaturity`. Owner-only.

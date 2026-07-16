# AI Setup Assurance — Scoring Policy

`apps/web/lib/assurance/` is the executable version of this policy;
`apps/web/__tests__/assurance-report.test.ts` pins it.

## The premise

"Grade my AI setup" is only worth anything when the grade is earned from
evidence. This report inspects registries and repo files, attaches exact
paths to every finding, measures how much ground it could actually inspect,
and refuses to emit a grade below the coverage threshold.

## Categories and weights (sum = 100)

| Category | Weight |
|---|---|
| Agent governance | 15 |
| Skill supply chain | 15 |
| Security | 15 |
| Model routing | 10 |
| Memory integrity | 10 |
| Tool/MCP governance | 10 |
| Observability & cost | 10 |
| Documentation truth | 5 |
| Utilization / dead weight | 5 |
| Outcome quality | 5 |

## Coverage rules

- Coverage measures what a repo checkout can prove. Runtime behavior,
  production data, spend, and real usage are NOT inspectable here, so their
  categories carry honestly low coverage, and what was not inspected is
  listed per category.
- **Threshold: 0.80 weighted coverage.** Today's checkout reaches ~0.76, so
  the verdict is `INCOMPLETE` by design. The grade unlocks when evidence
  collectors (runtime probes, production telemetry) raise coverage — never by
  relaxing the threshold.
- File existence is never usage evidence (utilization stays mostly uncovered
  until real telemetry exists).
- Absence of telemetry is a finding, not a passing score.

## Health and score

- Category health starts at 1.0 and subtracts per open finding:
  LOW −0.10, MEDIUM −0.25, HIGH −0.50, CRITICAL −1.00, each scaled by the
  finding's confidence.
- Overall score (only when GRADED) is health weighted over the INSPECTED
  fraction: `Σ(weight·health·coverage) / Σ(weight·coverage)`.
- The top recommendation is picked by risk-adjusted leverage
  (severity × confidence, owner-actionable first) — never by which fix would
  cosmetically raise the score most.

## Determinism

Same checkout → same report. Findings derive from live registry state and
file evidence, so fixing an underlying gap flips its finding off without
editing the assurance code. Nothing is hard-coded that code can disprove.

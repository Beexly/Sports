# Equation binding census — 2026-11-12

Read-only census of `lit.equation` against the evidence contract. Run by Hermes
against Neon project `summer-brook-99380762`, role `hermes_ro`, SELECT only.

## Headline

**41 of 62,900 equations (0.065%) are candidate-bindable.**

An equation is candidate-bindable when it has an `=` and mentions at least one
football-domain symbol. That is the ceiling, not the count of equations that
actually bind — binding requires every free symbol to resolve to a real
`GameEvidenceBundle` field, which none of these has been checked against yet.

## The counts

| measure | rows |
|---|---|
| total equations | 62,900 |
| `kind = 'inline'` | 54,898 |
| `kind = 'display'` | 8,002 |
| contain `=` | 17,921 |
| mention any football symbol | 103 |
| contain `=` **and** mention a football symbol | **41** |

Football symbols searched: `epa`, `yards`, `win_prob`, `points`, `success_rate`,
`completion`, `rushing`, `passing`, `turnover`, `field_position`.

## What this means

The equation corpus is an arXiv mathematics and physics corpus. It is not a
football modelling corpus. 99.84% of it cannot describe a football quantity even
in principle, because it never names one.

The plan's earlier measurement (44,435 unparseable, 8,566 symbolic, 7,050
evaluated) was measuring a different thing: whether the LaTeX parses, not
whether the symbols mean anything. Parsing is not binding. An equation that
parses cleanly and computes the partition function of a spin glass is not a
feature.

## Consequence for the wiring

- The 41 candidates go to a manual read, not to an automatic registration. Each
  one needs its free symbols mapped to bundle fields by a human who can tell
  whether the mapping is physically sensible.
- The other 62,859 stay searchable evidence. They are still useful for the
  write-up: a citation that a mechanism is documented is worth something. They
  are worth nothing as numeric inputs.
- `mcp-equations-server` should not be wired to the posterior on the strength of
  a parse count. The honest number is 41, and it may fall further once each
  candidate is checked.

## Reproduce

```sql
SELECT count(*) AS total,
       count(*) FILTER (
         WHERE equation LIKE '%=%'
           AND equation ~* '(epa|yards|win_prob|points|success_rate|completion|rushing|passing|turnover|field_position)'
       ) AS candidate_bindable,
       count(*) FILTER (
         WHERE equation ~* '(epa|yards|win_prob|points|success_rate|completion|rushing|passing|turnover|field_position)'
       ) AS mentions_football
  FROM lit.equation;
```

## Open

The 41 have not been listed or read. That is the next step, and it is a reading
task, not a query.

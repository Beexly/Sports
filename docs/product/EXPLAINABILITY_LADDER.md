# Explainability Ladder — Galaxy Sports Edge

## Purpose

Galaxy explains the same fact at six different levels of depth. The
right level for a surface is a function of the audience and the user's
understanding band. Public levels **never** reveal confidential
methodology.

## Six levels

| Level | Audience | When |
|---|---|---|
| plain | public | First-time user; no jargon. |
| standard | public | Regular reader of /today and /picks. |
| sharp | public | Operator-vocabulary aware, methodology-followed. |
| technical-safe | public | Structural depth without revealing internals. |
| academy | authenticated | Tracked learning context; cross-module refs. |
| operator-only | operator | Cockpit / studio. Server-only. |

## Architecture

```
apps/web/lib/explainability/
├── levels.ts      # 6 levels + allowed vocabulary + forbidden terms
└── renderers.ts   # pure functions: ExplanationFact → text
```

## Hard rules

- No public-tier level may include factor weights, thresholds,
  calibration formulas, system prompt text, or aggregation logic.
- `PUBLIC_FORBIDDEN_TERMS` lists the terms scrubbed from public output.
- `containsForbiddenForPublic()` runs on every public-level render;
  if it hits, `scrubFor()` returns a safe fallback.
- Renderers are deterministic; they never call a model.

## Allowed vocabulary

The `LEVEL_ALLOWED_TERMS` map enumerates the terms that are appropriate
at each level. Adding a term at a higher level than where it originated
requires owner review.

## How surfaces use this

- A pick card uses `standard` by default; `sharp` when the user has
  followed methodology.
- An autopsy uses `standard` for the result row and `sharp` for the
  process grade explanation.
- The cockpit uses `operator-only` everywhere.
- The brain uses `plain` by default; promotes to `standard` after the
  user opens a methodology link.

## Authority

- Constitution #5 (no stale-data deception)
- AI risk control rc-003 (no sensitive-information disclosure)
- Trade Secret Inventory TS-014 (system prompts)
- AI Assistant Boundary ab-004 (no prompt leakage)

## Review

Quarterly: review `LEVEL_ALLOWED_TERMS` and `PUBLIC_FORBIDDEN_TERMS`.
Owner-only.

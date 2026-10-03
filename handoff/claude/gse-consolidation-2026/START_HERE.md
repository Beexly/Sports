# GSE Consolidation — START HERE (2026-06-13)

This package records the consolidation of every shippable improvement stream
onto the launch branch **`claude/eloquent-goldberg-der80z`**, with all quality
gates green.

## Verdict

The launch line is now a **single, coherent, verifiably-green build** that
contains the StatKing product surfaces, the premium visual redesign, and the
NFL House + market-intelligence layer — not three competing branches. It is
**engineering-ready to deploy**. It is **not yet live**, because going live
depends on owner-only secrets and gate flips (see `GO_LIVE_RUNBOOK.md`).

## What's in this folder

| File | What it covers |
|---|---|
| `START_HERE.md` | This index + verdict |
| `CONSOLIDATION_REPORT.md` | What was merged, how conflicts were resolved, what was superseded, what is owner-gated |
| `GO_LIVE_RUNBOOK.md` | The exact owner-only steps to make the site live |

## Gates (final consolidated tree, commit `dc84caa`)

- `npm run typecheck` (9 workspaces) — **exit 0**
- `npm run lint --workspace=apps/web` (`--max-warnings=0`) — **exit 0**
- `npm run build` — **exit 0** (186/186 static pages)
- `npm test` — **exit 0**, **5,118 tests** (web 4,565 · data-ingestion 100 · ingestion-pipeline 26 · prediction-engine 396 · db/types 31)

## Inspect first

1. `CONSOLIDATION_REPORT.md` → the conflict resolutions in the market/observatory
   cluster (the only non-trivial merges).
2. The **pricing decision** (PR #14) — the one business fork left for you.
3. `GO_LIVE_RUNBOOK.md` → nothing here auto-deploys; this is the switch.

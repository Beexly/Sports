# Docs index — read this, then only what you need

**Code always wins.** If a doc conflicts with code, discard the doc.

## Read order (every agent)

1. [`START_HERE.md`](../START_HERE.md) — product status + launch gates
2. [`CLAUDE.md`](../CLAUDE.md) + [`AGENTS.md`](../AGENTS.md) — rules and the unattended loop
3. [`docs/ops/CANONICAL.md`](ops/CANONICAL.md) — ops single source of truth
4. [`docs/ops/AGENT_LEDGER.md`](ops/AGENT_LEDGER.md) — claim work here, never invent a queue
5. Live truth: `https://www.galaxysportsedge.com/api/ops/public-surface-truth`

## Live docs (keep current)

| Path | What it is |
|---|---|
| `docs/ops/CANONICAL.md` | Ops SoT — discard anything that conflicts |
| `docs/ops/CURRENT_STATE.md` | Measured live gates/metrics snapshot |
| `docs/ops/AGENT_LEDGER.md` | Work queue (validated by CI) |
| `docs/ops/LAST_PLAN_2026-09-15.md` | Current master plan (Hermes queue) |
| `docs/ops/SESSION_LOG.md` | Dated session notes (history, newest first) |
| `docs/ops/CALIBRATION_STATUS.md` | Calibration accuracy status + optimization levers |
| `docs/ops/CALIBRATION_PIPELINE.md` | Settled picks → honest p → Kelly |
| `docs/ops/CALIBRATION_PUBLISH_CHECKLIST.md` | Hard blockers before any public calibration claim |
| `docs/factors/INDEX.md` | Pre-registered factor scoreboard (keep/kill) |
| `docs/calibration-proposals/` | Model-version proposals + scorecards |
| `docs/ops/FOUNDER_ONLY_CHECKLIST.md` | Human-only actions |
| `docs/ops/GO_LIVE_RUNBOOK.md` · `GATE_OPENING_RUNBOOK.md` | Gate-flip order |
| `docs/strategy/PATH_TO_PROVEN_EDGE.md` | Product accuracy target (CLV/EV, not raw W%) |

## Reference clusters (stable)

- Architecture: `docs/architecture/` · `docs/models/` · `docs/math/`
- Data rights/sources: `docs/data/` · `docs/source-providers/` · `docs/compliance/`
- Product/biz: `docs/product/` · `docs/strategy/` · `docs/revenue/`
- Design: `docs/design/` · `DESIGN.md`
- Factor R&D: `docs/factors/` · `docs/calibration-proposals/` · `docs/brain/`

## Non-canonical (archaeology only — do not plan from these)

- `docs/ops/archive/**` — dated audits, mega-prompts, root-museum
- `handoff/**` — session museum (`handoff/00-READ-CANONICAL.md`)
- Any dated `*_2026-*.md` session dump outside the live list above

## One-line rule for new docs

If it is still true next month → put it under the cluster table.  
If it is a dated run log → `docs/ops/SESSION_LOG.md` or `docs/ops/archive/dated/`.  
Never create another "START HERE" / "MASTER PLAN" / "READ ME FIRST".

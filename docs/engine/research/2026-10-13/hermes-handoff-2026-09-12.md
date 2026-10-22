# Handoff for Hermes — paste into Minis

You're Hermes, the builder. Motif audited everything marked "Done" on the agent bus. Verdict: 2 of 7 pass, 3 partial, 2 fail. Garrett's call: nothing below the bar ships.

## Read first (Beexly/agent-bus repo, main branch)
1. `inbox/from-motif/REVISION-2026-09-12-audit.md` — the full defect list in money-first priority order. This is your work queue.
2. `inbox/from-motif/QUALITY-DOCTRINE.md` — Unseen Studio (unseen.co) is now the explicit creative bar. Portfolio-is-the-pitch rule: examples must be so breathtaking that people come to us just because of the examples. A task can pass every acceptance criterion and still fail this bar.
3. `STATUS.md` — current true states of every task.

## Start with (P0)
1. **TASK-009** — re-art-direct all 5 sample sites (`docs/kit/previews/`). Not a patch, a rebuild. Five genuinely distinct design concepts (one per trade), real display typography, art-directed hero imagery, trade-specific iconography, visible starting prices, readable contrast everywhere. These five ARE the $350 pitch.
2. **TASK-004** — fix the silent lead-loss bug: on insert failure show an error and preserve the lead (retry/queue), never a fake success. Fix the README script-tag instructions (module wiring), add the Supabase DB-webhook trigger step, capture the real `mockup_url`.

## Then (P1/P2, per the revision brief)
- TASK-003: art-directed per-product mockups + real Amazon affiliate links with `{{AMAZON_TRACKING_ID}}` + seating-chart text bug fix.
- TASK-007: re-source the lead list (real sign shops / wedding planners, dedupe, real addresses, real scoring).
- TASK-006: point tour URLs at the Vercel deployment, produce one real `.webm`, remove `node_modules` from the repo.
- TASK-001: deliver the artifacts or unclaim.

## Out of scope
**TASK-002 props pipeline** — removed from this board. It lives in GSE now. Do not touch it here.

## Rules
- Commit and push everything to GitHub. Nothing counts until it's pushed.
- Do not mark anything Done until acceptance criteria AND the portfolio-grade bar are met.
- Update STATUS.md on the bus with every state change (opened, claimed, done).
- If blocked, say so on the bus and keep working anything unblocked.

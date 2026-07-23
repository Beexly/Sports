# Independence Gates

Gate A: $1k MRR for 4 consecutive weeks
Gate B: $10k MRR for 8 consecutive weeks
Gate C: 1 paid B2B pilot

Until Gate A is met: no new product verticals; a feature kill-list is enforced via PR review (see PULL_REQUEST_TEMPLATE.md's Independence check).

Tracked live at `/admin/cash` (`apps/web/lib/growth/cash-os.ts` — `computeCashSnapshot` + `cashOsGreen`). "4/8 consecutive weeks" is a human judgment call read off the MRR trend on that dashboard, not (yet) an automated streak counter — do not treat a single green snapshot as a gate pass.

## Kill-list (pre–Gate A)

Work that should **not** ship before Gate A ($1k MRR × 4 weeks), because it spends scarce engineering time on surface area instead of proving the existing product can sustain itself:

- **New product verticals.** Anything beyond the current sports surfaces (board, optimizer, tracker, stats/players/picks family) — e.g. a new sport category treated as its own product, a non-sports vertical, a separate consumer app.
- **Speculative infra.** Infrastructure built for scale or use cases the product doesn't have yet (multi-region, new datastore migrations for hypothetical load, generalized plugin/extension frameworks) — build it when a real bottleneck forces it, not ahead of demand.
- **Non-revenue-adjacent formal/research work that isn't already committed.** New research tracks unrelated to trustworthiness of what's already shipping. This is deliberately narrow — see the carve-out below.

## Carve-out: SRQC / formal work is NOT a new vertical

The SRQC/formal-methods work in this repo (`formal/`, `formal-heartbeat/`, `formal-regression/`, `apps/web/lib/ai-control-plane/**`) is **trust infrastructure for the existing product** — it hardens the correctness and auditability of picks, receipts, and the AI control plane that are already shipping and already revenue-relevant. It is not a new product surface, so it is **not itself blocked by this gate**. The gate is about product *surface area* (what the user-facing product does), not about all engineering work — reliability, correctness, and trust work on the existing surfaces is always in scope, pre- or post-Gate A.

The kill-list line above ("non-revenue-adjacent formal/research work") targets a *different* thing: a brand-new formal-methods research track that isn't in service of anything already shipping. If it's hardening what exists, it's not on the kill-list; if it's a new research direction with no tie to the current product, it is.

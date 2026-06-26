# GSE — Coder Kickoff (Day 0 → first three commits)
### The single operational page the coding agent starts from. If you read one thing, read this.
**2026-06-23 · Pairs with `GSE_CODEX_AUTONOMOUS_EXECUTION.md`. Purpose: remove all ambiguity so execution is correct, fast, and thorough.**

---

## Document precedence (higher overrides lower — never implement a superseded version)

1. **`GSE_INTEL_00_RIGOR_PASS.md`** — the authoritative corrections. **If anything below conflicts with it, INTEL_00 wins.**
2. **`GSE_CODEX_AUTONOMOUS_EXECUTION.md`** — operating procedure, safety rails, and the §6 backlog (with its correction note).
3. **`GSE_INTEL_01–05`** — design depth. Where any *math* here conflicts with INTEL_00 — especially the market-anchor — follow INTEL_00: **conserve team yards and TDs, derive fantasy points; never sum fantasy points to a team total.**

Rule: if two docs disagree, stop, follow the higher one, and note it in the ledger. Do not guess.

## Day 0 — the gate before ANY feature code (this is Slice 0; it is blocking)

1. **Confirm the work branch.** Verify `claude/sweet-fermi-sk9gws` exists on `Beexly/Sports`. If absent, cut `codex/intelligence-core` from `main` and record the choice. Never build on an unconfirmed branch.
2. **Audit the surfaces.** Enumerate the *actual* files. Write `docs/SURFACE_AUDIT.md` mapping every file/flag the backlog references → `exists` or `absent → scaffold-as-new`. **Never extend a file that doesn't exist as if it shipped.**
3. **Confirm data access.** The backtest harness needs nflverse **regular-season** play-by-play (1999+) and advanced metrics (2006+), read-only. If not fetchable, the first build task is a read-only nflverse fetch path (free/cleared, CC-BY-4.0).
4. **Output:** `SURFACE_AUDIT.md` committed; branch confirmed; data access confirmed. *No feature code until these are true.*

## The first three commits (in this exact order)

1. **`LadderEvent` (shadow).** Types + append-only model + pure `reduceLadder()` + invariant test `INV-1` (a tier advance and a `priced` flip derive from the same milestone) + **two tracks** in `RUNG_REQUIREMENTS`: fantasy (per-position MAE/coverage) and betting (CLV). Env flags stay authoritative; the reducer only *logs* agreement/disagreement. *Why first: it's the spine everything else reads.*
2. **Replay + historical-backtest harness (E1).** Walk-forward with **purged & embargoed** splits over nflverse regular-season data. *Acceptance:* reproduce one historical week deterministically **and** emit an out-of-sample error number. *Why second: nothing model-related ships without OOS evidence, and this produces it at ~$0.*
3. **Tweedie baseline projection (flagged, shadow).** Gradient-boosted **Tweedie** on cleared features, wrapped in **Adaptive Conformal** (Mondrian-by-position) intervals, scored by the harness against the market-only baseline via the **Clark–West** test. Ships `priced=false` until it beats the baseline out-of-sample. *Why third: it's the honest floor every fancier model must beat.*

## Per-commit gate (non-negotiable, every single commit)

`npm run typecheck && npm run lint && (cd apps/web && npx vitest run) && npm run build` **and** `trust-gate` + `model-freeze` + `draft-only` — **all green.** Append one row to `docs/EXECUTION_LEDGER.md`; push. **Codex may only create `DRAFT` calibration proposals — never `IMPLEMENTED`** (that flip is human). ≤ ~8 files per slice; schema/auth/payment/entitlement work scaffolds behind an OFF flag and is logged in `docs/DECISIONS_TO_RATIFY.md`.

## Watch + handoff (so this runs with near-zero input from the owner)

`EXECUTION_LEDGER.md` is updated and pushed every commit — the owner and Claude watch progress through it + `git log`. When the backlog is exhausted, write `docs/CLAUDE_HANDOFF.md` (branch state per slice, final gate result, the `[OWNER]/[INFRA]/[DATA]` checklist, and the next 5 ranked tasks for Claude) and stop. That is the only clean stop.

## The only human inputs needed to START (everything else is downstream)

- **Confirm the repo/branch** — or let Slice 0 create and record it. That's the one true gate.
- **nflverse data reachable** — read-only, free; Slice 0 confirms or wires it.

That's it to begin. The revenue switches (create the Stripe Fantasy price, flip `PROJECTIONS_PROVIDER`) and the `canPublishProjections` flip are **downstream human gates, not start blockers** — Codex builds right up to each so they become one-click.

## What is explicitly NOT a blocker — do not wait on it

**This week's money is independent of all of the above.** Soft-launch the already-built season-long draft/best-ball tools on real nflverse data now (peak draft season). The corrected weekly-projection path runs in parallel and clears at kickoff via the historical backtest. **The corrections strengthen the kickoff headline; they do not delay this week's revenue.**

---

*Precedence reminder: `INTEL_00` > corrected briefs > companion design docs. Build → red-team → correct → push — now inside the code, milestone by milestone, visible in the ledger.*

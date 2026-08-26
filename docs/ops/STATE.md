# STATE — the one page (updated 2026-08-26 ~14:45 UTC)

**Read this, not 22 documents.** Audit trail lives in `AGENT_LEDGER.md`; strategy in
`PLAN-2026-08-26-NORTHSTAR.md`; tactics in `PLAN-2026-08-26-FORWARD.md`.

## Ground truth
- No edge demonstrated on real data, ever. Only MLB close-pred genuinely disproven; most built
  things never tested. Market efficient at close (mean cover margin ~+0.07).
- Falsifier: 4 defects found+fixed TODAY (C-65/supM/C-70/C-74). All prior verdicts void. The
  repaired instrument's first real-data campaign is running now (C-75 second wave, 16 agents).
- Real market data in-repo: 6,967 games w/ closes; 5,065 w/ real juice (2006+).
- THE_ODDS_API paid key LIVE in Vercel prod since R-6 (2026-08-19). Historical endpoints unused.
- NFL Week 1: ~Sept 3–7. Capture-readiness is the deadline (NORTHSTAR §4).

## FOUNDER QUEUE (max 3)
1. Run fresh `docs/ops/hermes/hf7-archive/query.sql` — is CLOSE stamping alive? (C-62)
2. Run `npx tsx scripts/edge-lab/run-shadow-falsifier.ts` with DB creds (C-73 readout)
3. Merge PR #672 to main, then hermes/w2 (falsify.ts resolves to ours)

(Next up after those: historical-odds pull with existing key; weekly funnel answer.)

## In flight
- C-75 second wave (Claude recomputes all Hermes R&D): ~6/16 agents done, background.
- SONNET SEAT ACTIVE: orders at docs/agent-prompts/SONNET-EXECUTION-ORDERS-2026-08-26.md
  (CLAUDE-MAX verification protocol adopted; --dangerously-skip-permissions and --bare REJECTED).
- Week-1 battle plan: docs/ops/edge/2026-08-26-WEEK1-BATTLE-PLAN.md (3 candidates + ARM-GATES).
- PR #672: open, draft, clean, all local checks green. Actions minutes exhausted → no CI.

## Quarantined (unverified agent handoffs)
- Hermes overnight claims: under C-75 recomputation. Its repo/PR-state claims VOID (2 proven
  false today). Kalshi/Manifold quote files: not committed, unverifiable.
- Hermes branch falsify.ts: superseded by this branch's stricter fix (C-74).

## Standing laws (today's lessons)
- Builder never verifies own work. Handoff claims enter no plan until ledger+truth-surface checked.
- No instrument verdict counts until the instrument passes planted-good/known-bad acceptance.
- Certification is a 2027 event (C-33). Season 2026 = capture + shadow, claim nothing.

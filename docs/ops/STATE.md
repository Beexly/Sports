# STATE — the one page (updated 2026-08-26 ~15:55 UTC)

**Read this, not 22 documents.** Audit trail lives in `AGENT_LEDGER.md`; strategy in
`PLAN-2026-08-26-NORTHSTAR.md`; tactics in `PLAN-2026-08-26-FORWARD.md`; the historical-edge
verdict in `docs/ops/edge/2026-08-26-hermes-second-wave-verification.md`.

## Ground truth
- **No edge in historical game-level ATS/totals/moneyline space — now MEASURED, not suspected.**
  C-75's second wave ran the first-ever real falsifier campaign on real data (8+ full strategies,
  845–6,868 games each): zero survivors. Closing spread unbiased (slope 1.05 vs 1, p=0.058);
  devigged ML close well-calibrated (Brier 0.211); 132-test segment scan clears nothing but the
  mechanical overtime segment. All three Week-1 battle-plan candidates are dead/starved (C-79).
- Falsifier: 4 defects found+fixed same day (C-65/supM/C-70/C-74), now with its own permanent
  acceptance harness (C-76, planted-edge/noise/inverted @ n=100/1k/5k). Every verdict before today
  came from a broken instrument; every verdict from today on is real.
- Real market data in-repo: 6,967 games w/ closes; 5,065 w/ real juice (2006+).
- THE_ODDS_API paid key LIVE in Vercel prod since R-6 (2026-08-19). Historical endpoints unused.
- NFL Week 1: ~Sept 3–7. Capture-readiness is the deadline (NORTHSTAR §4) — now the ONLY live
  edge-adjacent door this season, since Door C (post-close/live-state retrospective) just closed.
  Door B (independent modelProb → props) remains untested by anything above — the one door left.

## FOUNDER QUEUE (max 3)
1. Run fresh `docs/ops/hermes/hf7-archive/query.sql` — is CLOSE stamping alive? (C-62)
2. Run `npx tsx scripts/edge-lab/run-shadow-falsifier.ts` with DB creds (C-73 readout)
3. Merge PR #672 to main, then hermes/w2 (falsify.ts resolves to ours; also carries most of the
   verification doc's "needs data" list — PFR advstats, NGS receiving, FTN boxrate, play-by-play)

(Next up after those: historical-odds pull with existing key; weekly funnel answer; supply the
FiveThirtyEight Elo files, absent on every branch — nothing in that line moves without them.)

## Landed this session (execution-orders queue, all 5 items — see docs/agent-prompts/)
1. **C-75 DONE** — second wave (23 agents, grew from planned 16), landed with an independent
   Sonnet spot-check (§10 of the verification doc) before treating it as confirmed. Headline
   above. Process note: the workflow stalled once mid-run (dead background process, no live
   agents for 24min) and was recovered via `Workflow({resumeFromRunId})` — cached results reused,
   nothing lost.
2. **C-79 DONE (queue #2 REVISED, not executed)** — building live e-process runners for
   Candidates 1 & 2 would have meant arming a killed signal and a starved one. Not built.
   WEEK1-BATTLE-PLAN.md rewritten in place with per-candidate verdicts instead of silently dropped.
3. **C-76 DONE** — falsifier acceptance harness, 9/9 green, c7ec6e1f6.
4. **C-77 DONE (correction, not a build)** — Murphy decomposition (`brierDecomposition`,
   probability-calibration.ts) already existed since 98ae6c7ae, 26 days pre-session. The queue
   line itself was an unverified claim; standing rule applies to our own docs too.
5. **C-78 DONE** — lock-price source-tag provenance, additive, no schema migration. 709dceaf8.

SONNET SEAT ACTIVE throughout: orders at `docs/agent-prompts/SONNET-EXECUTION-ORDERS-2026-08-26.md`
(CLAUDE-MAX verification protocol adopted; `--dangerously-skip-permissions`/`--bare` REJECTED).
PR #672: open, draft, clean, all local checks green (typecheck 0/22, guardrails 0, full suite 0
failed after every commit). Actions minutes exhausted → no GitHub CI; local verify is the real gate.

## Revised next queue (agent-executable, ranked — from the verification doc's own §8)
1. Fix `build-cpoe-falsify-harness.py`'s inverted-favorite-sign + push-as-loss bugs, rebuild
   `cpoe-backtest-rows.jsonl`, re-run the falsifier (current KILLED verdict rests on a known-bad
   labeling).
2. Correct `market-atlas.md`'s two mislabeled columns (Mean Cover Margin, Cover Rate — wrong in
   27/27 seasons) — cheap, highest downstream-contamination risk if left uncorrected.
3. Fix `build-close-calibration.py`'s no-op `devig()` (currently overstates calibration error ~3×).
4. Fix `NFL_TEAM_UTC_OFFSET` (missing OAK/SD/STL) — blocks Candidate 2 from ever being cleanly
   re-tested even if kickoff-time data eventually lands.
5. Reconcile the Wong-teaser underdog legs (blocks Candidate 3's revised ARM-GATE, see battle plan).
6. Run the two cheap pre-registered tests named in verification doc §6 (totals devig calibration,
   divisional-unders raw z-test).
None of these executed yet — logged as the correctly-scoped backlog, not claimed done.

## Quarantined (unverified agent handoffs)
- Hermes overnight claims: now recomputed by C-75 — see the replication scorecard in the
  verification doc for what held (sign convention, several base numbers) vs what didn't
  (market-atlas columns, key-number n, two Wong-teaser legs, the road-favorite table row).
  Its repo/PR-state claims from earlier in the session remain VOID (2 proven false).
- Hermes branch falsify.ts: superseded by this branch's stricter fix (C-74); their own repair
  attempt independently shown to leave shuffle structurally inert (C-75 finding).
- Kalshi/Manifold quote files: committed only on the unmerged hermes/w2 branch, one timestamp,
  zero overlap with the 1999–2025 harness — unusable as-is even once merged.

## Standing laws (this session's lessons)
- Builder never verifies own work. Handoff claims enter no plan until ledger+truth-surface checked
  — this now applies to our OWN queue documents too (C-77 found a false line in our own orders).
- No instrument verdict counts until the instrument passes planted-good/known-bad acceptance
  (C-76 made this executable, permanently).
- A killed or starved candidate does not get live infrastructure built for it "just in case" —
  building dark is not exempt from the evidence (C-79).
- Certification is a 2027 event (C-33). Season 2026 = capture + shadow, claim nothing.

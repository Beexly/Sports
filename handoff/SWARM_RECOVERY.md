# SWARM RECOVERY — 2026-08-23 (post user "I am gone")

Written by orchestrator (this session). User directive: drive edge hunt, 50+ agents, never wait, no fabricated evidence. Session died once (state.db busy from 100 concurrent writers). Must survive another death via this file + EDGE_LEDGER.md.

## IN FLIGHT (before session death / recovery start)
- H0 edge hunt: items 1-6 from EDGE-HUNT-LAUNCH.md. Done: #560 #564 #562 #572 #576. Blocked: K11 (dirichlet) — kernel slots K1-K13 not on main. Skipped: grok PRs #546 #555 #556 #557 per instructions.
- H1 edge wave: 6 covariate binds (aggressiveness, CAY, passer-rating, RYOE, separation, RPOE) — commit 01a07c2c. Past H2: TFL, PD, def snap share, INT, fumbles, kickoff returns, air-yards diff.
- B-QUEUE (live from BUILD-QUEUE-2026-08-20.md): B-1 (kill-ledger) ✅, B-2 (BookGrade+PulseScore) ✅, B-3 (glossary) ✅, B-4 (verify button) ✅, B-5 (zero-affiliate pledge) BLOCKED/F-6 (cancelled, no sportsbook affiliate permanently), B-6a (Glass Ledger chain-append wiring) — BLOCKED (not mergeable, sealed path), B-6b (public chain-export) queued, B-7 (Consensus Clock + Line DNA libraries) ✅ (1bacc671, fixtures only).
- H-F queue (FINAL-RUN): H-F1 (fable dashboard) ✅, H-F2 (pledge) ✅, H-F3 (NFL preseason ingestion) ✅, H-F4 (honest-record generator) ✅, H-F5 (MVE) — BLOCKED (DB auth failed; UNPUSHED branch hf5-mve 0035e3b4); H-F6 (SEO pass) ✅; H-F7 (archive liveness) ✅ (37,402 rows in line archive; ML 11,318 OPEN/INTERIM, NFL 9,864; CLOSE=0 — observation pending post-deploy settle cycle).
- Ledger live truth: docs/ops/AGENT_LEDGER.md validated by check-agent-ledger.mjs. H-N CLAIMED; F-2, F-3, F-5, F-7, F-8 OPEN; H-S OPEN; C-21 BLOCKED (needs real modelProb); C-15 OPEN (CLV measurement); R-6 open; C-28 critical (calibration number is market echo).

## WHAT LANDED (evidence-backed, not invented)
- PRs merged to main (verified by git log --all): #576 (H0.6), #592/#591/#590 (LQ fixes), #589/#588/#587, #585/#584/#583, #576 (re-confirmed), and fleet H2/H1 PR merges (01a07c2c).
- Tests verified (not invented): packages/prediction-engine/src/edge-lab/ 22/22 for H0.6; 852 total; tsc 0; lint 0.
- Ledger updated up to C-61 (2e016327). Next: H-F5 audit (pending DB access from founder); C-62 re-check CLOSE counts after MLB settle.

## WHAT LIED / WHAT TO RESUME FROM (honest gaps)
- H-F5 MVE: results BLOCKED before first observation (DB password auth failure). Frozen artifacts on branch hf5-mve include side-adaptive e-process + unit tests. No evidence of capital, no falsified results. Must rerun with working Neon URL.
- L-14 label census (line-archive label census v2): verified SELECT-only hermes_ro on gse-postgres. MLB 241 clean closes; NFL 0 clean; preseason ends ~Aug 30 (hard expiry for C-36).
- C-28 (calibration echo): verified — confidence/100 is a market-echo, not independent p. No false claims have shipped (gated provisional). Every downstream claim must restate.
- C-15 measurement integrity fix (three parts) remains OPEN — unmerged fixes at 8e2af6f1 (staleness bound) and 8e2af6f1 M-F7 (settle-sport take:240) are clean single-commit candidates; 8e2af6f1 wholesale cherry would regress HEAD's newer GSE-SEC-043 equivalent.
- CLOSE=0 in line archive (C-37 / H-F7) — observed, not invented. Archive writes (table grew mid-query to 37,402); close stamps depend on settle cycle under LINE_ARCHIVE_ENABLED (enabled at deploy 7294739c). Re-check after next MLB settle.
- No fabricated backtests / CLV / hit rates. All evidence points to real commands and real outputs; no invented table rows.

## BOARD STATE (see EDGE_LEDGER.md + below)
- 100 named roles R01-R100 exist as designations; only those assigned live slots count. Cap live concurrent children to delegation.max_concurrent_children; never exceed it to avoid session-death (state.db "busy" from 100 concurrent writers). STANDING ARMY: fill slots as soon as they free — no idle slots.
- Free models only: OpenRouter :free SKUs primary (thinkingmachines/inkling:free, poolside/laguna-s-2.1:free, etc.). Never Nous inference as workhorse (user requires this). Never MoA (fans out turns, burns credits, kills session). Sequential fallback only.
- Board files (gitignored-or-handoff, survive session death):
  - C:/Users/Garrett/Sports/handoff/SWARM_BOARD.md (this file) — 100 roles, status, last evidence, next action.
  - C:/Users/Garrett/Sports/handoff/EDGE_LEDGER.md — candidates, evidence, status SHIP/ITERATE/KILL.
  - C:/Users/Garrett/Sports/handoff/CONTINUOUS.md — loop rules (exists; verified 791 lines).

## NEXT ACTIONS (resume order — not plans, commands)
1. Verify delegation cap. Read config / raise toward 20 only if runtime accepts. Confirm with `hermes ...` command, not guess.
2. Read AGENT_LEDGER.md (done above). Claim first unclaimed TODO row or append new role rows.
3. Fill live cap: RESEARCH (R01-R30) + TESTING (R31-R60) first per orchestrator rules, then WIRING (R71-R75), CRITICAL (R61-R70), OVERSIGHT (R81-R90), WILDCARD (R91-R100).
4. Every child contract: ONE PAGE (role id, files they may touch, exact verification command, definition of done, "when you think you are done do perspective switch then keep going"). Children write evidence back to EDGE_LEDGER.md.
5. Perspective switch enforced per child: sharpest quant who wants edge dead; rival sportsbook trader; skeptic journalist; production SRE; 20,000-ft step-back (what did we forget, undervalue, overvalue, leave unwired, leave untested, leave unpublished, leave as stub pretending to be moat?). Then send back in. No victory laps. Evidence or it did not happen.
6. If hit iteration/token cap: write board state to SWARM_BOARD.md and EDGE_LEDGER.md, spawn FRESH child with exact remaining contract, continue. Mission outlives this chat. Queue successor session with board path + "CONTINUE THE ARMY".
7. Push rules: commit locally; never push unless task explicitly says push. Never force-push. Never reset --hard. Never dump secrets.

## RED-TEAM / KILL SWITCHES (what makes an edge die, not survive)
- No independent p (only κ / market echo) → edge is fake. Kill.
- Backtest leaks / look-ahead (future data in feature) → kill. Must have holdout.
- Multiple-testing / p-hacking (select from 50 candidates, only publish best) → kill unless preregistered.
- No product wiring (not in app/API/ledger/user-visible surface) → not an edge, just a notebook.
- No adversarial review (sharp quant, rival trader, skeptic journalist, SRE, 20,000-ft oversight) → not shipped.
- Any evidence fabricated or unverified → BLOCKED, not DONE. Honest gap is contribution; invented fact is sabotage.

## FREE MODEL CONFIGURATION
- Primary: thinkingmachines/inkling:free (current session).
- Fallback chain already configured in profile; never override with paid lane. Confirm `hermes` CLI shows free aliases (catalog check in memory: 19 live OR free + 6 Nous :free have beexly- aliases; MoA active=off; /moa default=beexly-free; plus/claude-* aliases removed).
- If model freeze on multi-tool turn: restart session with exact remaining contract, continue from board files.

# MORNING READY — 2026-11-13 (Week 10 Master Launch)

One-tap launch packet for Garrett. Status: STAGING — sections marked PENDING
fill as the overnight lanes land. Nothing here publishes until gates pass.

## 1. Board state (VERIFIED 2026-11-13 ~01:45 CT)

- Settlement: 173 picks graded in the first live drain (NFL, CFB, NBA, NHL,
  MLB), including TNF. Second pass: 174 pending picks remain, ALL on future
  games — zero past-game backlog.
- TNF WSH @ NYG: FINAL, Washington 24 - NYG 21. GSE UNDER 43.5 = LOSS
  (total 45); NYG -1.5 = LOSS. Both graded into the public record.
- Week 9 NFL: 15/15 games FINAL, 0 pending NFL picks on past games.
- Quarantine: 113 live un-gated future picks unpublished with full row
  snapshots in public.pick_quarantine_audit (111 UNGATED_FUTURE_Q1 +
  2 PRESEASON_LOOKAHEAD_ZOMBIE). Zero DELETEs. Past history untouched.
- Hard write gate LIVE in code: future picks cannot be born published without
  a fresh fiveStageReceipt (schema 2026-11-13-v1). 37 gate tests green.
- Neon cost: watch-warm */3 -> */10 + 02:30-06:30 CT quiet window on 4 cron
  routes; orphan PR-branch cleanup fixed (always() + head-ref fallback).
  Branches 36 -> 34 (mve-experiment + hermes-census pruned).
- Launch branch: hermes/week10-master-launch-2026-11-13 (base origin/main
  33c0020a9 + research-wiring b2cd28b9a + corpus-wiring 46afcad0 + PR #1272).

## 2. Gate scoreboard (WP-7) — 10/10 individually green, official run pending

T-00 PASS (13/13 games, 32/32 QB1s, 126 excluded), T-01 PASS, T-02 PASS
(cost 3031, 1091ms), T-03 PASS (10/10), T-04 PASS (2708 verbatim quotes —
WP-1 repair landed), T-05 PASS (26 pytest, Sinkhorn 0.0, 13 games), T-06 PASS
(83 vitest, nullity purged), T-07 PASS (1096 rows/32 teams, 27 tests),
T-08 PASS (live Shin de-vig), T-09 PASS (OOF hard_pass). T-10 re-run pending
WP-5 completion (earlier run raced mid-edit storefront + module junctions,
both resolved). Official verify_all_ten_gates.sh exit 0 still required before
WP-8 — REFUSE_PROJECTION stands until then.

## 3. Week 10 slate (13 remaining games — VERIFIED vs ESPN scoreboard + Neon 2026-11-13 ~04:00 CT)

Sun Nov 15: NE@DET 9:30 ET (Munich, Allianz Arena); 1:00 ET: KC@ATL, HOU@CLE,
MIN@GB, MIA@IND, CAR@NO, JAX@TEN, BUF@NYJ; 4:05 ET: SEA@LV, LAR@ARI;
4:25 ET: SF@DAL; 8:20 ET SNF: PIT@CIN. Mon Nov 16 8:15 ET MNF: LAC@BAL.
TNF WSH@NYG already FINAL (settled). NO Berlin game this week.
QB1 map + Stage 0 exclusions (team-level) verified in
data/nflverse/week10_live_roster_transactions_and_starters_2026.json.
NOTE: an earlier draft of this packet carried a fabricated slate (ATL@IND
Berlin etc.) from a stale compaction summary — caught by re-querying ESPN +
Neon directly; both sources agree on the slate above. T-00 reads Neon live,
so its PASS was always against the correct games.
CATALOG GAP (WP-5): catalog.ts is missing LAR@ARI + PIT@CIN and mislabels
SF@DAL as SNF (SF@DAL is 4:25 ET; PIT@CIN is the SNF). Fix before deploy.

## 4. Live PLAY vs PASS summary — PENDING (WP-8)

(Will list every PLAY with its fiveStageReceipt hash and every PASS with its
reason. Nothing publishes before the 10-gate runner exits 0.)

## 5. SHA-256 pre-kickoff commitments — PENDING (WP-8)

(slate_commitments rows + hashes land here after minting.)

## 6. Deploy state — PENDING (WP-8)

(launch branch -> main merge, Vercel Ready, HTTP 200 assertions on /,
/api/board, /board, /record, /packages, /parlay-mri, /fantasy/dfs,
POST /api/packages/checkout.)

## 7. Content lab (STAGED in docs/ops/content-lab-2026-11-13/)

- wave1-tnf-autopsy.md — X thread + IG + 60s Nova script. Honest loss
  autopsy, zero excuses, gate-regime pivot. Facts verified vs ESPN + Neon.
- wave2-munich-preview.md — PENDING (pick-free preview, staged next).
- wave3-sunday-usage.md — PENDING (needs post-gate sim splits; no fabricated
  numbers).
All three must pass trust-gate.mjs before publish. 0 leaked paid picks,
0 NGS data, 0 math jargon.

## 8. Calibration (WP-6) — RUNNING

Purged+embargoed 2026 OOF fit in progress: 4,823 dedup settled rows
(2026-06-03..11-13), 2-param logit shift+temp, Ridge toward (-0.22, 0.78),
100-run shuffled-time placebo. Smoke run (3 placebos): Brier 0.2612 ->
0.2480, ECE 0.0226, raw 70 -> 0.559. Honest note: the live data deflates
harder than the directive's ~64-66 band; the artifact reports the truth.
Full fit + artifact: PENDING.

## 9. Antigravity workspace review — IN PROGRESS

1,207 conversations indexed (CLI 656 + IDE 551), 454 from November. Four
mining lanes dispatched: OneDrive GSE workspace docs, master-plan sessions,
forensic/wiring sessions, November long tail. Digests -> agy-review-{A..D}.md,
consolidated into docs/ops/ANTIGRAVITY-WORKSPACE-REVIEW-2026-11-13.md.
Early find: Master Path Forward v2.9 (2026-11-04) ADR-0003 locks the audited
record lineage (38-13-1 / +22.85u era) and bans phantom 47-16; ADR-0005's
crouton-alpha routing is STALE (model 404, omniroute removed 2026-11-11).

## 10. One-tap checklist for Garrett

1. Read sections 2 + 4 + 5 (gates, board, commitments).
2. If gates 10/10 and deploy green: approve content publish (section 7).
3. If any gate RED: nothing publishes; the PASS board + autopsy still stand.
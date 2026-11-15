# Week 10 Sunday Go-Live - Founder Wake-Up Brief (07:00 CT)

STATUS: WORKING DRAFT - Sections A/B populate from the post-corpus verified call
sheet once the 13-game refresh lands. Section C is verified now. All public gates
remain FAIL-CLOSED pending your explicit call. ASCII only.

Kickoff order (CST): NE @ DET Munich 08:30 FIRST. Then 7 games 12:00 (KC@ATL,
HOU@CLE, MIN@GB, JAX@TEN, MIA@IND, CAR@NO, BUF@NYJ). Late 15:05/15:25 (SEA@LV,
LAR@ARI, SF@DAL). SNF PIT@CIN 19:20. MNF LAC@BAL Mon 19:15.

---

## Section A - IMMEDIATE: 08:30 CT Munich NE @ DET (neutral site)

Pending the post-corpus Stage-3 refresh. Will list only conjunction-gate PASS
plays as XX/100 with edge + CLV, key injuries/weather, and explicit PASS
rejections. Munich Showdown Captain (1.5x) + 5 FLEX cash core + correlated GPP.

- Conjunction-gate PASS plays: [pending verified call sheet]
- Explicit PASS rejections (publishAllowed false): [pending]
- Munich Showdown Captain/FLEX core: [pending DFS packet]
- Travel/body-clock + surface/roof truth: [pending Stage-1 context]

## Section B - 12:00 / 15:25 CT Main Slate + SNF / MNF

Pending the post-corpus refresh. Ranked conjunction-gate PASS sides/totals,
1Q/1H/Kicking/IDP/TD/prop plays, top correlated SGPs, and the 14-player DFS
Expanded Core (2 QB / 4 RB / 4 WR / 2 TE / 2 DST) + cash/GPP stacks.

- Ranked sides/totals (XX/100, edge, CLV): [pending]
- 1Q/1H/Kicking/IDP/TD/prop PASS plays: [pending]
- Top correlated 2-leg/3-leg SGPs: [pending]
- DFS Expanded Core + cash/GPP stacks: [pending DFS packet]

---

## Section C - System & Cost Receipt + 60-Second Founder Flag Checklist

Verified this run (hermes, branch hermes/week10-post-corpus-sunday-launch-2026-11-15):

- Base: origin/main consolidated past AUTON-MAIN-LIVE-22 (Wave 21/22 corpus engine
  on main). Corpus receipt CORPUS_DRAIN_COMPLETE_READY_FOR_GATE, 10,805 sovereign
  books, 68,876 routed intelligence units, EB six-family priors present.
- Stage-0 live roster config week 10 as_of 2026-11-13 (fresh, max_age_days 5),
  128 excluded players, confirmed QB1s per team. pytest stage0 + pre_sim 6/6 green.
- check-nflverse-currency exit 0 (pbp_participation 2026 asset unpublished upstream
  marked SOFT, 2025 present; check not skipped).
- DFS fail-closed gate added: tests/test_week10_dfs_zero_inactive_gate.py asserts
  0 inactive/IR/wrong-team players across all 3 Week-10 DFS packets (logic 2/2 green).
- OpenRouter cumulative usage at check: $0.0213 (ceiling $0.35). Hermes JEV spend
  $0.00 (antigravity orchestrator runs the Stage-3 sims under the shared cap).
- GCP: 0 VMs (galaxysportsedge 0 instances; antigravity confirmed all deleted).
- Public gates FAIL-CLOSED: PUBLIC_PICKS_ENABLED=false, LIVE_BOARD=false,
  PERFORMANCE_STATS_ENABLED=false, PUBLISH_LEDGER=false,
  CALIBRATION_ADJUSTMENTS_ENABLED=false. No brain/mind.jsonl writes.

### 60-second founder flag checklist (if you choose to go live on waking)
1. Review Sections A/B (only conjunction-gate PASS plays are listed; PASS = no bet).
2. Confirm the verified call sheet + dossier guard are green on origin/main.
3. Flip ONLY PUBLIC_PICKS_ENABLED=true and LIVE_BOARD=true in Vercel env.
4. KEEP PERFORMANCE_STATS_ENABLED=false and PUBLISH_LEDGER=false (ledger 16-5 is
   the standing record; do not publish voided buckets).
5. Redeploy, confirm Vercel Production READY, re-run check-launch-readiness (0 FAIL).
6. Munich kicks 08:30 CT - decide before then if you want the early window live.

OWNER_GATE items (founder-only, recorded not actioned):
- Any flip of the public/calibration flags above is founder-only.
- External send (email/X/IG/Telegram) of DFS upload CSVs is founder-only; CSVs are
  dry-staged at data/dfs/week10_dk_upload_staged_2026_11_15.csv, NOT sent.
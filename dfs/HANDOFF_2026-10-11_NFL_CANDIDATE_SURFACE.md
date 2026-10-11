# HANDOFF 2026-10-11 ~16:25Z — NFL diagnostic candidate surface + Sun-Mon DFS (GSE)

Repo beexly/sports, branch `research/rating-atlas-2026-10-09-packet`. Everything below is on the remote.
Doctrine held: NFL only, FreshnessGate read path, kill ledger append-only, nothing promoted.

## Verdict
RESIDUAL-VERSUS-CLOSE: **NOT CLEARED**. No frozen prop close exists for any of the 14 week-5 events. Held-out n=0.
Every row is DIAGNOSTIC. No pick, prop, parlay, or lineup is eligible. No JEV verdict and no GSE Score are emitted.

## Artifacts (current stamps, read back FRESH through read_fresh)
| what | path | sha16 | observed_at |
|---|---|---|---|
| Candidate surface (272 rows, 258 cross-book) | dfs/genie_acq2/nfl_context_20261011T152234Z/CANDIDATE_SURFACE_STAMP.json (+ .csv) | ac423e39eed72c6d | 16:12:32Z |
| Sun-Mon DFS candidates dg 154470 (685 rows, 187 market-implied) | dfs/genie_acq2/sunmon_154470/SUNMON_DFS_CANDIDATES_STAMP.json (+ .csv) | bb36293aabec86ef | 16:12:32Z |
| Engine (reproducible) | dfs/genie_acq2/nfl_context_20261011T152234Z/gse_engine_surface.py (`--ledger scratch|prod`) | — | — |
| Pinnacle player props (672 two-sided) | dfs/prop_close_feed_2026-10-11/pinnacle_props_all_20261011T1557Z.json (+ snap_pinnacle_props_all.py) | file ccf59ecc97108020 (LF) | 15:57Z |
| DK pool dg 154470 | dfs/genie_acq2/sunmon_154470/pool_154470.json (+ dk_pool_pull.py) | raw e770145010496589 | 15:57:44Z |
| Pinnacle game env envelope | dfs/genie_acq2/pinnacle_snapshot_20261011.envelope.json (+ land_pinnacle_envelope.py) | — | 15:38:11Z |

The 16:05:09Z first run (721f44fcdb1d6bcf / dfeac6992d9e3829) is preserved at commit f18c4ad94. A concurrent session re-ran the
engine at 16:12:32Z (commit ee12a323b). Rows and gate verdicts are identical. The only input-pin change is git CRLF->LF on the
Pinnacle file (the bytes were verified as the same JSON). The map and addendum are reconciled to the current stamps (commit a4bdf269a).

## Residual definition (new; replaces the retracted one)
residual_sigma = (DK de-vigged median - Pinnacle de-vigged median) / DK ladder sigma. Pinnacle here is a PRE-CLOSE quote, not a close.
cond_residual_sigma = residual minus the slate mean for the same stat, which isolates player-specific divergence from book-wide shading.

Mean residual_sigma by stat: completions +0.011 (sd .085, n25) | rush +0.018 (sd .037, n69) | pass -0.007 (sd .047, n25) | rec -0.002 (sd .042, n139).
DK main-line offset is about 0 for every stat (DK main lines are balanced after a correct de-vig).
Largest cells by |cond|: Malik Willis completions +0.267 (DK 17.5 vs PIN 16.5), Kyler Murray completions -0.134, Evan Engram rec -0.121,
Geno Smith completions -0.116, Antonio Williams rec +0.109, Bo Nix pass -0.107, Jared Goff completions +0.105, Malik Nabers rec +0.105.
Watchlist (rec yds, all CLEAR): Odunze +0.005, Kraft +0.031, McBride +0.048, J. Williams -0.069, Nacua +0.020. All are small.

## RETRACTED this session (ledgered)
1. The 15:45Z/15:49Z "devig residual" (+0.178 completions etc., "Bo Nix +0.325") was an ARTIFACT of the additive probability shift.
   devig minus juice = +0.056/+0.098/+0.174 sigma, scaling with the shift size, and 351/3491 rungs were clipped at the floor.
2. The same runs' american->probability conversion had its formulas swapped, which compressed fair p toward 0.5.
3. The same runs' overlay joins read the CPOE/FTN/injury CSVs OUTSIDE FreshnessGate.
4. The V3 builds (dfs/RED_ZONE_BUILDS_V3_FULL_GATE.json) are INVALID. The DK Classic contest (gameTypeId 1) needs 9 players under $50,000,
   and all 6 builds have 8 players (no FLEX). The optimizer slot bug needs fixing before any rebuild.

## Gates
- Run and recorded: FreshnessGate (14 inputs FRESH incl. pinned raws), Injury Pull Gate PASS, CollegeGuard PASS (league 88808 only),
  minis freshness cross-check, banned-language scan of own output (0 hits), kill ledger.
- Refused at the gate (NOT joined; ledgered): cpoe_x_pressure CSV F2, ftn_teamweek CSV F2, wk5_out_doubtful CSV F2, CPOE aggregate F4,
  situational graph F1, OU lane F1, B4 officials F1, b1 weather F1, frozen nfl_rvc_manifest F1.
  The injury overlay uses the stamped ESPN snapshot + DK pool status instead.
- TS gates NOT RUN: spine, contest-shape, per-market calibration, selective abstention TS, proper scoring, JEV 10K sim, lineup validation,
  board gate rows, GSE score honesty. Reason: bundler imports (`./dfs-slate`, `@/lib`) and no tsx in the worktree or the main repo.
- Concurrent commits worth knowing (not run by me on this surface): cf071cc3c recounted the gate inventory to 49 (dfs/GATE_INVENTORY_2026-10-11.md),
  and 2623137b6 wired selective abstention into live_board.py (uncleared rows ABSTAIN).

## Sun-Mon DFS (dg 154470, 13 games incl. SNF BAL@ATL, MNF BUF@LAR)
Market-implied DK points = Pinnacle two-sided de-vig x DK Classic scoring (Layer-1 baseline, not a model). No lineups, no ownership.
123 players injury BLOCK, 24 Q. Top pts/$1K (non-BLOCK): QB Brissett 3.50, Stafford 3.44, Bagent 3.36, Allen 3.30 |
RB Swift 3.06, B. Allen 2.84, Gibbs 2.83 | WR M. Wilson 3.03, Nacua 2.88, London 2.79 | TE McBride 3.13, LaPorta 2.68.

## Kill ledger
dfs/kill_ledger_freshness.jsonl. Append-only verified across every commit since bc219db2e (0 deletions).
This session's refusals: NFL_PROP_LADDER_RVC, SUNMON_DFS_RVC, DEVIG_ADDITIVE_SHIFT_METHOD, AMERICAN_ODDS_CONVERSION, V3_BUILDS_ROSTER, plus 9 gate refusals
(and a duplicate set from the 16:12 concurrent re-run). The armed EDGE#5 grader is appending its own rows (EDGE5_CROSSBOOK_GRADE). Untouched.

## Reopen conditions
1. RVC: freeze DK + Pinnacle prop lines at minutes_to_kickoff <= 10 (or post-Final), then grade settled stats vs the frozen lines.
2. Overlay: stamp cpoe_x_pressure / ftn_teamweek / wk5 injury CSVs at the source with observed_at. Re-run the situational/officials/weather stamps.
3. The frozen manifest needs a freeze-validity read mode, because the 6h freshness rule rejects any frozen manifest by design.
4. TS gates: install tsx (or run via the vitest harness) and run them on these stamps.
5. DFS: fix the V3 FLEX slot bug. Lineup/ownership consensus needs lineup bodies, which getcontests does not return.

Untouched: EDGE#5 + JEV London settlement pollers, CFB, all non-NFL surfaces.

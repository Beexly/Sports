# CURRENT TRUTH delta for the next overnight prompt (red team, 2026-09-27 ~05:45Z)

The 2026-09-26 work order was stale in five verified places before midnight and
has drifted further since. This file is the measured delta an author should
fold into the next work order — every line traces to a command run tonight.
Sections marked OWNER still need a founder decision before they become truth.

## Replace wholesale in CURRENT TRUTH

1. **Branch/HEAD**: the worktree is `C:\Users\Garrett\Sports-wt-grok-reasoning`
   on `grok/reasoning-layer-2026-09-26` (unpushed, ahead of its origin branch),
   but `origin/main` is now `08db1bf82` and carries session A's entire night +
   the crosswalk. `87d727475` and `d6197a3aa` are both history. The takeover
   check should read: HEAD must be a descendant of `87d727475`.
2. **from-bridge.ts / reasonAbout EXIST** at
   `packages/ingestion-pipeline/src/reasoning-trace/`. FORBIDDEN #12 means "no
   second copy", not "these do not exist".
3. **The typecheck is clean.** The three TS2532 errors at
   `part-selector.ts:99` were fixed twice independently (grok `bae2ef459`,
   A `4925b4adf` — both on main now). "Pre-existing, leave it" is void.
4. **entryOdds guard**: `isPlausibleEntryOdds` exists
   (`pick-proof-receipt.ts`); the red team added the upper band
   `ENTRY_ODDS_MAX_ABS = 10000` (red-team branch, not yet main). The backfill
   write path is gated; its dry-run was fixed on the red-team branch.
5. **Seasons**: the grains are 2018–2025 per-season files on main (26
   datasets), PLUS grok's branch carries a verified 2026 application season
   (snap_counts_2026 / roster_2026 / nfl4th 200; participation 404 recorded).
   2026 is an application season, not training. `contractCoversWindow(2026, 3)`
   is now TRUE — the test assertion moved to 2027 (grok caught this trap).
6. **The identifier break is FIXED on main**: participation 2018–2022 carries
   `players_on_field` (raw nfl_id) AND `players_on_field_gsis` (resolved via
   the official nflverse `players.csv` crosswalk, CC-BY 4.0, validated 99.87%
   on names, 100% on both join hops). Roster `pfr_id` blanks are filled from
   the same crosswalk (168,652 recovered, zero overwrites). The old "cannot
   join 2018–2022" text is dead.
7. **bridge-premises.jsonl is a REAL walk-forward holdout** (trains
   1999–2024 via `scripts/run-bridge.mjs`, holdout 2025; writer verified). The
   "constant sample_count is a smell" framing is superseded. It still cannot
   go LIVE (f2: duplicates historical_strength).
8. **Verdicts moved**: officials re-measured DARK on stronger evidence (A:
   n=269, r=+0.0274); coaching re-measured DARK with the refit bug corrected
   (grok); narrative_contract cleared honesty and is STORED with a LIVE path
   (frozen pre-2025 coefficients, needs 2026 week-3 snaps — ATL@GB exists,
   LAC@BUF does not until Sunday). Read `parts-registry.jsonl` (still 8 rows)
   and the candidates files fresh; do not trust this list at face value.
9. **Confidence semantics changed (owner-authorized rewire)**: market
   probability no longer feeds spread/total confidence; the market-internal
   edge component and cross-market bonus are context-only with weight 0.
   Moneyline confidence stays market-anchored by design and labeled. The
   publish bar effectively tightened (ML needs fair ≳ 0.83 absent context).
   See `confidence-market-independence.test.ts` and the red-team audit.
10. **Harness**: use `scripts/overnight/log-slice.mjs` (commit auto-resolves,
    bare null refused, foreign SHA refused, `--loop-file` for parallel lanes)
    and `scripts/overnight/verify-files.mjs` (manifest-driven — no hardcoded
    hash table). Never hand-write a loop line: one lane did and its timestamps
    were fiction.

## OWNER decisions required before the next prompt is written

- Who pushed `origin/main` three times tonight (23:57:26, ~00:09, ~00:2x)?
  If it was not the owner, an agent violated FORBIDDEN #1 against main.
- The post-rewire `MODEL_VERSION` (repo law requires a bump + calibration
  pass; the constant is founder-frozen) and whether the tightened publish bar
  is the intended restraint.
- Dataset layout: per-season (main) vs combined+2026 (grok) — see
  `LAYOUT-DIVERGENCE-2026-09-27.md`. Recommendation there: main's layout,
  grok's content, one re-ingest.
- Reconcile the two officials DARK records when grok's re-measure lands.
- The narrative part's post-kickoff computability if LIVE parts ever feed
  pre-game publishing.

## Standing laws that proved themselves tonight (keep verbatim)

- No push, no rebase, no `--no-verify`, no gate flip, no frozen-row rewrite.
- Append-only ledgers: repair = appended correction row + separate mechanical
  commit, never an in-place edit. One lane edited loop history in place; the
  correction row survived only because the red team had appended it first.
- Every number traces to a command. Two lanes fabricated provenance (null
  SHAs, invented timestamps) under overnight pressure; the mechanical logger
  is the fix — make its use mandatory in the prompt.
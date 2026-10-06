# PROVENANCE.md — Week 3 DK Sun–Mon optimizer harness (LOCAL ONLY)

**Run date:** 2026-09-25 · **Slate:** DraftKings NFL $15K Sun–Mon Special (15 games, 9/27–9/28/2026)
**Status:** LOCAL research harness. Never committed, never published, never deployed. No contest entered. No DK account touched.

## Data sources (all real, nothing invented)

1. **Salaries + DK AvgPointsPerGame:** `docs/research/2026-09-24/full-tables/dk-sunmon-slate-salaries-week3.csv`
   (767 players; parsed 2026-09-25). Game/opponent derived from the "Game Info" column (`NYJ@DET ...` → away=NYJ, home=DET).
   DST rows are named `<TEAM> DST` from TeamAbbrev (e.g. `SEA DST`).
2. **Prop lines:** `docs/research/2026-09-25/week3-props-ownership.md` (observed 2026-09-25 ~17:00–17:25 CDT).
   Each prop used is listed per-player in `run.ts` `PROPS` with its source line.
3. **Injuries:** `docs/research/2026-09-25/week3-injuries.md` (2026-09-25). Exclusion list below.
4. **Usage:** `docs/research/2026-09-25/week3-usage-bears.md` (2026-09-25). Role adjustments below.
5. **Weather:** `docs/research/2026-09-25/week3-venues-weather.md` (Open-Meteo pull Fri 9/25 ~2:35pm CT). Adjustments below.
6. **Construction rules:** `docs/research/2026-09-25/gpp-winning-lineup-construction.md` (2026-09-25).

## Projection model (exact formula, in `run.ts`)

For each player, let `appg` = DK AvgPointsPerGame from the CSV (2-game 2026 sample).

**Players WITH a confirmed prop line:**
- Non-QB: `propsImplied = recYds/10 + receptions×1 (PPR) + rushYds/10 + tdProb×6`,
  where `tdProb = 100/(odds+100)` for +odds, `|odds|/(|odds|+100)` for −odds.
- QB: `propsImplied = passYds/25 + passTD×4 + rushYds/10 − 0.8`
  (−0.8 = assumed INT expectation; **assumption, documented**. Rushing-TD equity is NOT separately
  credited for QBs — the passTD line already prices most TD equity. Known limitation: understates
  dual-threat rush-TD value, e.g. Josh Allen.)
- Case Keenum (no lines posted): FantasyPros projection 200.3 pass yds / 1.0 TD / 0.8 INT / 9.1 rush yds
  → `200.3/25 + 1.0×4 + 9.1/10 − 0.8 = 12.12` (source: week3-props-ownership.md §2.9).
- `proj = 0.6×appg + 0.4×propsImplied` when props exist; `proj = appg` otherwise.

**Documented fills for partial props (assumptions, flagged in code):**
- Chuba Hubbard: no receptions line → 2.0 receptions (usage doc: 3 rec Wk1, 2 rec Wk2).
- Kalif Raymond: no TD line → tdProb 0.15 (0 TD through 2 games).
- Trey McBride: no receiving-yards line → 7.5 rec × 8.0 ypr (usage doc: 136 yds / 17 rec through 2 games).
- Saquon Barkley: props cover receiving only, no rushing line → props skipped, `proj = appg` (documented gap).

**Weather adjustments (multiplicative, from the 9/25 venue-weather lane):**
- TEN@NYG (rain ~92% ppop, gusts 23–31 mph): QB/WR/TE proj ×0.90; TEN/NYG DST proj +1.5.
- SEA@WAS (drizzle watch, gusts ~30 mph): QB/WR/TE proj ×0.95.
- LAC@BUF (sustained 15–17 mph wind): QB/WR/TE proj ×0.95.
- LAR@DEN (22 mph sustained at kickoff, fading): QB/WR/TE proj ×0.95.

**Usage/role adjustments (multiplicative, from the 9/25 usage lane):**
- Kalif Raymond +15% — Keenum safety-blanket archetype (led Bears WRs both weeks; Johnson's trusted quick-game role).
- D'Andre Swift +10% — receiving-back checkdown role (5/5/54 in Wk2, team-high receiving yards).
- Luther Burden III −10%, Rome Odunze −10% — downfield roles tied to Williams' arm; Burden's Wk2 was garbage-time.
- Pat Freiermuth +10% — CIN weak vs TEs (9th-most yds/target, 6th-most fantasy pts/target per Derek Brown).
- Mark Andrews +10% — DAL allowed 29.7 TE fantasy pts/game (primer research).
- Cole Kmet: NO adjustment — Johnson's "more TE involvement" is narrative only, targets haven't followed (documented non-application).

**Floor/ceiling (coarse, documented):**
- Skill positions: `floor = proj×0.55` (QB ×0.60), `ceiling = proj×1.7`.
- DST: `floor = proj×0.3`, `ceiling = proj×2.2` (DST scoring is high-variance).
- Case Keenum: `ceiling = proj×1.5` (38 years old, no NFL pass since Dec 2023 — capped upside).

## Ownership — ALL VALUES ARE PROXY (never real projections)

No public ownership projections exist for this Sun–Mon slate (props-ownership.md §3.1). Every `own`
is labeled PROXY:
- SI.com Sunday-main-slate numbers (DIFFERENT contest pool — labeled as such) applied where the player
  is on this slate: Drake Maye 5.8%, Chase Brown 6.8%, Marvin Harrison Jr. 8.8%, Dalton Kincaid 6.1%,
  Jordan Addison 8.2%, Dontayvion Wicks 2.8%, Dak Prescott 5.1% / CeeDee Lamb 5.1% (10.2% combined, split evenly).
- Everyone else: `own = 0.03 + 0.22×(salary−2500)/(8800−2500)`, clamped [0.015, 0.30].
- Buzz bump +0.05 (DKNetwork chalk-buzz names: Allen, Gibbs, Amon-Ra, Mahomes, Breece Hall, Kelce, McBride,
  Shough, Stroud, McConkey, Garrett Wilson, James Cook, Olave). Named pivots −0.02 (Purdy, Kyler Murray,
  Hampton, Andrews). DST: `0.05 + 0.10×(salary−2000)/(3800−2000)`.
- "Buzz Factor is NOT ownership" (DKNetwork's own words) — buzz only nudges a salary prior.

## Exclusions (injury/status)

- Status IR/OUT/D in the DK CSV → excluded outright (IR 70 + OUT 14 + D 3 = 87 rows).
  Includes: Puka Nacua (doubtful), Dallas Goedert (out MNF), David Njoku (IR), Charlie Kolar (out),
  Jonathon Brooks (IR), Jaxson Dart (out for season), Jayden Daniels (out), Caleb Williams (expected out),
  Mason Taylor (out), Alec Pierce (IR), Demarcus Robinson (out).
- Questionable-but-lean-out (research verdict) → excluded: Brock Bowers (DNP Friday), Zay Flowers (lean out),
  Tyson Bagent (concussion protocol, unlikely), DJ Moore of BUF (questionable at best — the [Q] is Buffalo's,
  not Chicago's), Aidan O'Connell (personal, out), Chig Okonkwo (longshot), Rico Dowdle (trending out),
  Tyjae Spears (likely game-time decision), Kyle Monangai (consecutive DNPs, doubted).
- Questionable-but-expected-to-play → KEPT: Sam Darnold, J.K. Dobbins, Jaylen Warren, Tony Pollard,
  Malik Nabers, Mike Evans (Rapoport leans yes), Cooper Kupp, Jalen Coker.

## Optimizer (Garrett's real engine — not rewritten)

`apps/web/lib/fantasy/dfs-optimizer.ts`: `optimizeOne` (exact branch-and-bound seeded by heuristic)
for the single best, `generateLineups` (exposure-controlled, 60% max) ×20 in `gpp` mode (objective = ceiling,
stack enforced) and ×20 in `leverage` mode (objective = contrarian ceiling vs ownership). The illustrative
slate import (`activeDfsSlate`) is bypassed — our real 671-player slate array is passed explicitly.
Validation via `dfs-lineup-validation.ts` (`validateLineup`): 9-man roster, positional slots, ≤$50K cap,
no duplicates, no excluded players, stack satisfied. Any violation throws — a silent empty result is impossible.

## Construction rules v2 (2026-09-25, post-run upgrade — Garrett-approved)

Two GPP/leverage construction rules from `gpp-winning-lineup-construction.md`,
implemented in the HARNESS layer (`construction-rules.ts`, post-hoc repair on
engine output). The Sports repo working tree was NOT modified.

1. **Double stack (the big one):** QB + ≥2 same-team pass-catchers (WR/TE/RB).
   Research: 39.5% of top-100 Milly lineups vs 28.6% of field. The engine's
   `stack:true` only enforces ≥1, so the harness repairs: objective-ordered
   swaps of the worst non-mate skill player for the best available same-team
   catcher until 2 mates are present. Thin QB teams (<2 catchers in pool) fall
   back to single stack gracefully — zero occurred on this slate.
2. **No TE in FLEX:** winners punt-or-premium TE, never flex it. Repair swaps
   the FLEX TE for the best affordable RB/WR; degenerate keeps (none occurred)
   are flagged per-lineup.

**Measured effect (same slate, same projection model — projections untouched):**
engine output 41 lineups → double-stack 4/41 → **41/41**; TE-in-FLEX 38/41 →
**0/41**. Repair converged 5 duplicates → final portfolio **36** unique lineups
(1 single-best + 18 gpp + 17 leverage).
All 36 independently re-verified: 9-man, positional slots, ≤$50K, no dupes.

**Known behavior:** repair can displace a bring-back when the bring-back is the
worst objective-value non-mate (e.g. single-best: Denzel Boston bring-back was
swapped for Xavier Legette to complete the CAR double stack). The double-stack
rule was the explicit directive, so the stack wins the tie; bring-backs are
still reported per lineup.

**Engine patch for the coding agent:** `engine-patch-double-stack-te-flex.patch`
is a clean unified diff against `apps/web/lib/fantasy/dfs-optimizer.ts`
(`git apply` from repo root; verified with `git apply --check` on a /tmp copy).
It adds optional `OptOpts.doubleStack` / `OptOpts.noTeFlex` (cash mode ignores
both; existing callers/tests compile unchanged), threads `opts` through
`eligible`/`slotAccepts`, and makes `enforceStack` + the exact search's stack
feasibility pruning threshold-aware via `stackNeed()`. The harness repair and
the patch implement the same two rules; the patch enforces them inside the
search instead of post-hoc.

## Known gaps (need Garrett / refresh)

1. Ownership is 100% proxy — no real Sun–Mon ownership exists publicly (highest-value missing datum).
2. Weather is a Fri 9/25 ~2:35pm CT snapshot — recheck Sat evening + Sun morning (TEN@NYG, SEA@WAS, LAC@BUF, LAR@DEN).
3. Final Friday/Saturday designations pending at research time: Darnold, Evans, Flowers, Warren, Dobbins.
4. Keenum has no sportsbook lines; Bears QB designations land Saturday (MNF).
5. McBride receiving-yards line unconfirmed; Barkley rushing line not found.
6. `appg` is a 2-game sample — noisy for small-sample players.

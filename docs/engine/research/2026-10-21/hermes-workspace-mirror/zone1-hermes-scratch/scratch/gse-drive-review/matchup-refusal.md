# Matchup-source refusal: local `Sports-wt-pick-gate` vs `claude/edge-map-rebuild-2026-06-04`

**Audit date:** 2026-10-02
**Local repo:** `C:\Users\Garrett\Sports-wt-pick-gate` @ `hermes/book-pick-verdict-gate` (`ea1f56bcf`), clean tree.
**Remote repo:** `Beexly/Sports`.
**Read-only:** local `git ls-files` / `git cat-file` / `grep` reads and the GitHub contents API only. No tracked file in either repo was modified; no tests or backtests were run. This report is the only file written.

## Verdict

**The refusal exists only on the stale branch.** The local tree has no matchup engine and therefore no matchup-source refusal to inherit.

The branch is `apps/web/lib/intelligence/matchup.ts`, **not** `packages/data-ingestion/src/matchup.ts` as the task brief stated — that path is a 404 on GitHub and has never existed. `stale-sports-engine.md:24` names the correct path; the brief did not.

Three facts establish the absence:

1. `apps/web/lib/intelligence/matchup.ts` is absent on local `main`, `origin/main`, and `motif/gse-intelligence-build-2026-10-02` (`git cat-file -e` → ABSENT on all three). This confirms `stale-sports-engine.md:24` ("absent on both comparison tips").
2. A repo-wide search for `loadMatchupEngine`, `computeMatchupDelta`, and `canPublishProjections` returns **zero** TypeScript hits outside route files that merely forward a loader's `status`. `source-error` appears ~40 times, but always as an upstream loader status being passed through — never as a matchup-source gate.
3. The three locally-tracked matchup modules are unrelated to the branch's contract, and none of them gates on a missing source.

| Local file | Lines | Gates a missing source? | Wired? |
|---|---:|---|---|
| `packages/prediction-engine/src/ratings/matchup-ratings.ts` | 169 | No — takes an in-memory array, has no loader | No ("Research-only. Not wired into any live ratings path.") |
| `apps/web/lib/conviction/signals/scheme-matchup.ts` | 242 | Partially — refuses, but per-pick, not per-source | No — only its own test references it |
| `packages/prediction-engine/src/props-dfs/2005-07742-seam-matchup-shrinkage.ts` | 72 | No — marked `Gate status: NOT EVALUATED` | No |
| `packages/prediction-engine/src/experimental/2402-01914v1-glmf-matchup-matrices.ts` | 142 | No — `if (obs.length === 0) continue` | No, `NOT EVALUATED` |

`matchup-ratings.ts:74` is the only hard stop, and it is not a source gate:

```ts
if (obs.length === 0) throw new Error("fitMatchupRatings: no observations");
```

A caller with an empty array gets a thrown exception, not a refusal result — and the caller supplies the array, so the empty state is decided upstream of this module.

### The nearest local analogue, quoted

`apps/web/lib/conviction/signals/scheme-matchup.ts:177-210` is the one local module that actually withholds on absent/thin matchup data. It returns `null` — no vote — at every failure point:

```ts
export function createSchemeMatchupSignal(deps: SchemeMatchupDeps): SignalFn {
  const live = deps.live ?? false;
  const maxAgeMs = deps.maxAgeMs ?? MAX_PROFILE_AGE_MS;

  return async (candidate: GateCandidate): Promise<SignalRead | null> => {
    // Hard honesty gate. nflverse hard assets are unreachable; until they are
    // back and a caller opts in, this signal says nothing at all.
    if (!live) return null;

    if (candidate.pickType === "TOTAL") return null;
    if (candidate.side !== "home" && candidate.side !== "away") return null;

    const profile = await deps.loadMatchup(candidate.gameId);
    if (profile === null) return null;

    const ageMs = deps.now().getTime() - profile.asOf.getTime();
    if (!Number.isFinite(ageMs) || ageMs > maxAgeMs) return null;

    const homeMatches = teamMatches(profile.home.team, candidate.homeTeamName);
    const awayMatches = teamMatches(profile.away.team, candidate.awayTeamName);
    if (!homeMatches || !awayMatches) return null;
    ...
    if (compared.length === 0) return null;
```

with the sample floor enforced per-dimension at `scheme-matchup.ts:133-138`:

```ts
function usableRate(entry: SchemeRate): number | null {
  if (entry.rate === null) return null;
  if (!Number.isFinite(entry.rate)) return null;
  if (entry.sampleSize < MIN_SAMPLE_PLAYS) return null;
  return entry.rate;
}
```

Two reasons this is not the same contract as the branch's:

- **Altitude.** `scheme-matchup` is a *candidate-level conviction signal* — one input among many, returning "no opinion." The branch's is an *engine-level loader policy* that withholds the entire board and its publishability flag. A signal that declines to vote cannot substitute for a gate that refuses to produce the artifact.
- **It is unwired.** `git grep -l createSchemeMatchupSignal` matches only `scheme-matchup.ts` and `scheme-matchup.test.ts`. No production caller opts in, and its own `live` default is `false`.

## The branch function, via `gh api`

Fetched at ref `claude/edge-map-rebuild-2026-06-04`:
`gh api "repos/Beexly/Sports/contents/apps/web/lib/intelligence/matchup.ts?ref=claude/edge-map-rebuild-2026-06-04"` → blob `6da000f5791542629d4f13757565673c4aebdb77`, 26,964 bytes, 623 lines.

The refusal factory, `matchup.ts:498-517`:

```ts
function sourceError(
  season: number,
  week: number | null,
  urls: MatchupEngine["sourceUrls"],
  error: string | null,
): MatchupEngine {
  return {
    generatedAt: new Date().toISOString(),
    status: "source-error",
    season,
    week,
    rows: [],
    gamesCovered: 0,
    matchupsRead: 0,
    canPublishProjections: false,
    note: "The matchup read is unavailable right now. We show an empty state instead of a matchup adjustment we can't stand behind.",
    sourceUrls: urls,
    error,
  };
}
```

The gating policy, stated in the doc comment at `matchup.ts:519-528`:

```ts
/**
 * Load the Matchup Engine: player model + schedule + team environment + pressure
 * coverage, all on the server, folded into matchup-adjusted rows for the week.
 *
 * Failure policy: the player model and the schedule are GATING — without players
 * to rate or a schedule to pair them against there is no board, so a failure in
 * either yields an honest source-error. Team environment and pressure-coverage
 * are ENRICHMENT — if either is thin/unavailable the board still renders, and the
 * affected players simply show a null delta with an honest "no context" note.
 */
```

The enforcement, `matchup.ts:538-605` — a two-tier split where the four sources are fetched in parallel and only the two gating ones can void the result:

```ts
const [modelR, scheduleR, envR, pcR] = await Promise.allSettled([
  loadPlayerModel({ season, timeoutMs, fetcher }),
  loadScheduleContext({ season, timeoutMs, fetcher }),
  loadTeamEnvironment({ season, timeoutMs, fetcher }),
  loadNflversePressureCoverage({ season, timeoutMs, fetcher }),
]);

const model = modelR.status === "fulfilled" ? modelR.value : null;
const schedule = scheduleR.status === "fulfilled" ? scheduleR.value : null;
```

(failed enrichment sources are substituted with synthetic `status: "source-error"` results carrying `rows: []`, `qbPressure: []`, `coverage: []`, so downstream code sees a uniform shape rather than a null), then:

```ts
  // Gating sources.
  if (!model || model.status === "source-error" || model.profiles.length === 0) {
    return sourceError(
      model?.season ?? 0,
      null,
      urls,
      model?.error ?? (modelR.status === "rejected" ? String(modelR.reason) : "no player profiles"),
    );
  }
  if (!schedule || schedule.status === "source-error" || schedule.rows.length === 0) {
    return sourceError(
      model.season,
      null,
      urls,
      schedule?.error ?? (scheduleR.status === "rejected" ? String(scheduleR.reason) : "no scheduled games"),
    );
  }
```

The withhold-at-the-leaf, `matchup.ts:333-337` and `:378-380`:

```ts
export function computeMatchupDelta(
  position: ModelPosition,
  opp: OpponentDefense | null,
): DeltaResult {
  if (!opp) return { delta: null, grade: "unknown", topDriver: null, topMagnitude: 0 };
```

```ts
  if (contributions.length === 0) {
    return { delta: null, grade: "unknown", topDriver: null, topMagnitude: 0 };
  }
```

And the success path still refuses to publish, `matchup.ts:610-621`:

```ts
  return {
    generatedAt: new Date().toISOString(),
    status: "live",
    ...
    matchupsRead,
    canPublishProjections: false,
    note: "Each player's GSE Rating, adjusted for who he actually lines up against this week ... Context, not a projection or a pick.",
```

Two details worth carrying over: the `model.status === "source-error" || model.profiles.length === 0` shape catches *both* a thrown error and an empty-but-successful read, which is the case a naive `catch` misses; and the gate is evaluated after the season-pinning fix at `matchup.ts:534-537`, whose comment names a real bug — pinning the schedule to the player model's season to stop "prior-season grades/defense against next-season opponents in the offseason."

## What a port would copy, and what it must not

**Copy — the refusal contract, which is source-integrity behavior with no predictive claim:**

- The `sourceError()` factory and its honest-empty shape: `rows: []`, `gamesCovered: 0`, `matchupsRead: 0`, and a user-facing note that names the withholding instead of hedging.
- The **gating vs. enrichment** two-tier distinction, stated as policy before it is implemented. This is the load-bearing idea: refuse the whole artifact only when there is nothing to build it from, and degrade to per-player "unknown" when there is merely less context.
- The gate condition itself, including the `status === "source-error" || .length === 0` pairing that catches an empty-but-successful read.
- The leaf withhold: `delta: null` / `grade: "unknown"` rather than a zero delta, with `matchupsRead` counting only non-null deltas so the number never overstates coverage.
- `canPublishProjections: false` on the **successful** return as well as the failure return.
- The season-pinning rationale at `matchup.ts:534-537` — a documented cross-season corruption guard, worth keeping as a comment even before the engine exists.
- The equivalent discipline already present locally in `apps/web/lib/intelligence/edge-board.ts:24-31` ("No fabrication... A missing dataset contributes zero rows, never invented ones... `canPublishProjections` stays false"), whose `loadEdgeBoard` fans out with per-source `.catch()` synthetic errors. The pattern is house style; the matchup fold is the missing instance of it.

**Must not copy — the hand-weighted delta, which is the part with no evidence:**

- Every numeric constant in the weighting block. `MAX_DELTA = 12`, `FAVORABLE_CUTOFF = 3`, `W_DEF_EPA = 7`, `W_DEF_SUCCESS = 3`, `W_PRESSURE = 3`, `W_COVERAGE = 4`, `W_PACE = 2`, and `POS_SENSITIVITY` (`QB` pressure 1.0 / coverage 0.6, `WR` 0.2 / 1.0, `TE` 0.2 / 0.9, `RB` 0.4 / 0.3). These are hand-picked weights and sensitivities, not fitted values.
- The reference bands `PRESSURE_REF = 120`, `BLITZ_REF = 150`, `PACE_BASELINE = 0.04`, `PACE_SPAN = 0.06`, `COVERAGE_CENTER = 92`, `COVERAGE_SPAN = 22`, `SUCCESS_CENTER = 0.45`, `SUCCESS_SPAN = 0.06`. Each is a bare assertion about where "elite" and "average" sit.
- The `delta` arithmetic at `matchup.ts:382-383` — the sum of those contributions, clamped to ±12 and graded against a cutoff of 3. The clamp is honest about being bounded; it is not evidence that the bound is right.
- The sibling `apps/web/lib/intelligence/player-model.ts` copy in the same commit (`19863eb46`), which labels percentile gaps "Underpriced. Buy before the market catches up" without comparing them to any market price. `stale-sports-engine.md:32` is right that this is marketing inference, not measured edge.

The distinction is clean and survives the port boundary: **the refusal half is worth taking, the adjustment half is not.** A port can land `loadMatchupEngine`'s gating policy and `computeMatchupDelta`'s `null`/`unknown` contract with no weight constants at all — and should, since `computeMatchupDelta` already returns the refusal result before it reaches any of them. If a numeric delta is later wanted, it needs its own strictly time-ordered backtest with a stated baseline; note that `matchup-ratings.ts:13-17` already writes that acceptance gate down for the local fitter ("beat raw-aggregate features by >= 1% MAE on prop-relevant targets"), and there is no evidence it has ever been run.

## Caveats

- The branch tip is **623 lines** while `stale-sports-engine.md:24` attributes a 594-line addition to commit `2f606a1ca`. The file drifted after that commit; the quotes above are the branch tip, which is what a port would copy. The other files in that commit (`dossier.ts` 590, `edge-board.ts` 487, `rating-why.ts` 167) are unique to the branch too and were not reviewed.
- Local absence was confirmed on three refs (`main`, `origin/main`, `motif/gse-intelligence-build-2026-10-02`) at `ea1f56bcf`. If another branch in this repo carries a matchup engine, this finding does not cover it.
- No tests or backtests were run locally; all behavioral claims above are read from source.
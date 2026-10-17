# Free Scoreboard Auto-Settlement Daemon — spec and verification

Artifact: `scripts/ops/free-auto-settle.mjs` (+ `scripts/ops/free-auto-settle.test.mjs`)
Filed: 2026-10-11 · Bucket: `docs/engine/research/2026-10-11/` (the machine)

## 1. What it is

A settlement loop that grades pending picks against ESPN's **public scoreboard**,
which needs no key. It exists so settlement does not go dark when the paid odds
key is missing, exhausted, or rate limited — the same reason the ingestion side
was moved to the keyless Galaxy/ESPN path.

It imports the repo's own free-first entrypoint rather than re-implementing the
ESPN client:

```js
const { fetchScoresFreeFirst } = await import(
  pathToFileURL(pathResolve(REPO_ROOT, "apps", "web", "lib", "data-sources", "free-first-ingest.ts")).href
);
```

## 2. Measured behaviour (2026-10-11, live run)

`node scripts/ops/free-auto-settle.mjs --dry-run`:

```
scoreboard: 7 sport(s) polled, 158 games seen, 22 completed with scores
  nfl    via espn-public-api → 15 games, 14 finals (free)
  ncaaf  via espn-public-api → 118 games, 0 finals (free)
  nba    via espn-public-api → 4 games, 4 finals (free)
  ncaab  via espn-public-api → 2 games, 0 finals (free)
  mlb    via espn-public-api → 1 games, 1 finals (free)
  nhl    via espn-public-api → 3 games, 3 finals (free)
  mls    via espn-public-api → 15 games, 0 finals (free)
```

**Paid API credits spent: 0.** Every sport resolved through `espn-public-api`
with `usedFree=true`. `ncaaf`/`ncaab`/`mls` showed 0 finals simply because no
games in those boards were in a final state at the time of the run — reporting
zero is the correct answer, not a failure.

`--json` emits the report on stdout with progress on stderr, so it pipes:

```
node scripts/ops/free-auto-settle.mjs --sport nfl --json 2>/dev/null | jq .brier
→ mode dry-run | paidCredits 0 | sports 1 | finals 14
```

## 3. Grading rules

| Bet type | Rule |
|---|---|
| MONEYLINE | the picked side must win; a tie is a PUSH |
| SPREAD | margin oriented onto the picked side, then `margin + line`; `0` is a PUSH |
| TOTAL | combined score vs the line; OVER wins above, UNDER below, exact is a PUSH |

`VOID` is a first-class outcome and is never folded into a loss. A void means the
pick could not be graded: no numeric score on the final, no line, an
unresolvable side, or a total with no OVER/UNDER direction. Pushes and voids are
excluded from every rate, per the standing rule that a push is never averaged in
as half a win.

### Two defects the tests caught during construction

Both were real, and both would have silently corrupted grading:

1. **`Number(null) === 0`.** A missing line coerced to `0`, and `0` is a
   perfectly gradable line — so a pick with no line would have been settled as a
   pick'em. Replaced with `strictNumber()`, which rejects `null`, `undefined`,
   `""`, booleans, arrays and objects.
2. **Totals voided on every board.** The team-side resolver ran before the TOTAL
   branch, and `resolveSide("OVER")` returns `null` because no team abbreviation
   appears in it — so *every total voided*. The TOTAL branch now runs first and
   reads its direction through `overUnderSide()`.

A third, in the tests: CLV sign was inverted. The correct orientation is
`lock - close` for spreads and overs (a lower number helps both) and
`close - lock` for unders.

## 4. Brier and CLV

**Brier** is the mean of `(p - y)^2` over scorable picks, where `p` is the pick's
stated probability read from `trueProb` / `probability` / `modelProb` or the
nested `factorBreakdown.independentEdge.trueProb`, and `y` is 1 for a WIN and 0
for a LOSS. Pushes and voids contribute no sample. A pick with no probability
contributes no sample either — the daemon does not substitute confidence, since
confidence is a score and not a probability (a lesson already paid for on the
calibration surface).

**CLV** is computed only when a closing number genuinely exists. The free ESPN
scoreboard carries no prices at all, so on a picks file without `closingLine`
the daemon reports CLV as `UNAVAILABLE` with that reason rather than
manufacturing a close. This is a real ceiling on the free path: **the free
scoreboard can settle bets but cannot measure CLV**, because CLV needs a price
series that only the odds side has.

## 5. Modes and the write gate

* `--dry-run` (default) — reads a picks snapshot, writes nothing.
* `--live` — commits settlement, and refuses unless **both**
  `GSE_ALLOW_LIVE_SETTLE=1` and a non-empty `DATABASE_URL` are present.
  Verified: exits 2 and writes nothing with neither set.
* `--live` delegates the actual write to the repo's own tested runner
  (`runFreePathSettlement`) instead of re-implementing settlement writes here.
  If that module cannot load, it reports `LIVE BLOCKED` with the error and exits
  1 — it does not fall back to a hand-rolled write.

The double gate exists because AGENTS.md Law 7 forbids an agent session from
touching a database. `--live` is for the operator and the cron.

## 6. Module resolution note (the reason this is `.mjs` and still works)

The mission specified a `.mjs` that imports a `.ts` from `apps/web`. Under plain
`node` that fails: the app uses the `@/*` path alias, which Node cannot resolve
(`Cannot find package '@/lib' imported from …`), and `tsx` fails the same way
because the alias is only meaningful under the app's own tsconfig.

`installWebAliasResolver()` registers a resolve hook (`node:module`
`registerHooks`) that maps `@/…` to `apps/web/…` and tries
`"" | .ts | .tsx | .mts | .js | .mjs | /index.ts | /index.js`, plus the
`.js` → `.ts` swap that TypeScript's ESM output style needs. Node ≥ 22 strips
the types natively, so no transpiler and no extra flag is required:

```
node scripts/ops/free-auto-settle.mjs --dry-run     # works as-is
```

## 7. Test coverage

`node --test scripts/ops/free-auto-settle.test.mjs` → **28 tests, 28 pass, 0 fail**.

Covers: moneyline win/loss/push/tie, spread cover/fail/push on both sides,
total over/under/push, void on missing scores / missing line / null line /
unsupported type / unresolvable side, `strictNumber` semantics, Brier
contribution and push/void exclusion, probability extraction incl. nested
`factorBreakdown`, CLV orientation and its null behaviour, finals extraction
(only `completed && post && scored`), final matching in both orientations,
per-sport aggregation with pushes excluded from the win rate, null win rate when
nothing is decided, arg parsing and flag rejection, and the absent-snapshot path.

Fixtures in the test are arithmetic expectations (4 > 3.5 therefore OVER wins),
not product data. The daemon itself never invents a pick: with no snapshot it
reports `0 picks` and says the file is absent.

## 8. Known limits

* No picks source in dry-run unless a snapshot file is supplied; the production
  path is `--live` reading the DB.
* CLV is unavailable on the free path (no price series) — stated, not faked.
* `--live` was **not executed** in this session (Law 7). Only its refusal path is
  verified.
* `ncaaf`/`mls` boards can be large (118 games observed) and only finals with
  both scores populated are gradable.

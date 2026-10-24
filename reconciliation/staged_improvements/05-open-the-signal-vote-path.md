# STAGED-IMPROVEMENT 5 — Open the signal vote path (sign + env bridge)

**Changes a published number?** YES — this is the stage where signals
finally affect `trueProb`.
**Risk:** MEDIUM-HIGH. It is the first stage that makes live signals
influence published probabilities.
**Files:**
`packages/prediction-engine/src/reasoning/signal-registry.ts` (or the
registry definition file),
`packages/ingestion-pipeline/src/stored-signal-env-bridge.ts`,
`packages/ingestion-pipeline/src/continuous-signal-tilt.ts`.

---

## Why — this is the gate nobody measured

The mandate says *"everything gets ingested."* Ingestion is the easy part.
**The path that lets an ingested signal move a published probability is
closed, and it was closed before this mandate started.**

`packages/ingestion-pipeline/src/continuous-signal-tilt.ts:59-164` is the
**only** place a signal affects `trueProb`
(`generate-signal-slate.ts:607`). Measured today:

| Fact | Evidence |
|---|---|
| `ctx.env` is bridged with exactly **4** weather keys | `packages/ingestion-pipeline/src/stored-signal-env-bridge.ts:24-37` — `wind_mph->WIND_MPH`, `wind_gust_mph->WIND_GUST_MPH`, `temp_f->TEMP_F`, `precip_pct->PRECIP_PCT\|PRECIP_IN`; and it reads them only from `db.gameSignal` where `sourceName: "nws"` (`:68-76`) |
| **No** ACTIVE registry signal carries a sign | `grep -c homeSign signal-registry-definitions.ts` = **0** |
| The tilt refuses unsigned continuous values | `continuous-signal-tilt.ts:43-47`, refusal at `:100-104` — *"unsigned continuous value. metadata.homeSign must be 1 or -1 before it can move a probability"* |
| Therefore the tilt votes **zero times** | `votes.length === 0` -> returns `applied: false` (`:123-131`) |
| Only one of the 23 extensions declares a sign | `signal-registry-extensions.ts:210` (age-conditioned rest) |

**So the engine's real-time signal contribution to published numbers is
exactly zero** — not because there are no signals (there are 126,445), but
because the one seam that would carry them refuses every one.

**The literature path built in the prior phase does not have this problem**
— it embeds and retrieves directly, with no env bridge and no sign. That is
why it works and this does not. **The lesson for every future signal
mechanism: do not route through `ctx.env`.**

---

## What changes

### 1. `metadata.homeSign` on every CONTINUOUS_VALUE signal

The signal registry already carries a `metadata` bag. The rule is already
written (`continuous-signal-tilt.ts:43-47`); it is just never satisfied.

```ts
// packages/ingestion-pipeline/src/signal-registry-definitions.ts
// For each CONTINUOUS_VALUE signal, add to its evaluate() return:
metadata: { ...res, homeSign: 1 },   // or -1
```

**What `homeSign` means:** whether a POSITIVE reading of this signal
favours the home side. It is not a weight and not a direction guess — it
is the sign of the coefficient the signal's own evaluator already
computes. A signal whose evaluator returns a spread-point adjustment in
the HOME team's favour is `homeSign: 1`.

**The derivation must not be a guess.** For each signal, the sign comes
from the evaluator's own semantics. The extensions already do this
correctly for the one that declares it (`:210`, with the comment
*"homeSign +1: expectedMarginAdjustment is a spread-point margin shift"*).
The other 22 need their evaluators' semantics read and the sign derived
from the code — not from the signal's name.

**Verification requirement:** a test that asserts every CONTINUOUS_VALUE
signal in the registry either declares `homeSign` or is explicitly listed
as non-voting. A silent omission is the current failure mode.

### 2. A general env bridge, or a direct context

The bridge at `stored-signal-env-bridge.ts:24-37` exists to inject four
weather keys from `game_signals` into `ctx.env`. **Generalizing it to
hundreds of keys through environment variables is the wrong design** — env
vars are a string namespace with no types, no provenance, and no per-key
freshness.

**Recommendation: bypass `ctx.env` for signals.** Add a typed
`signalContext` to the evaluation context and read from it directly:

```ts
// packages/ingestion-pipeline/src/signal-registry-definitions.ts
export interface SignalEvaluationContext {
  readonly env: Record<string, string | undefined>;   // keep for weather compat
  readonly signalContext?: Record<string, number | boolean | null>;  // NEW
  readonly now: () => Date;
  readonly sportKey: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
}
```

and have the evaluators read `ctx.signalContext?.restDays` rather than
`num(ctx.env, "REST_DAYS")`. This is the same change STAGED-IMPROVEMENT 3
makes for the 5 adapter candidates — **the two stages should land
together.**

**If `ctx.env` is kept**, the bridge must at minimum record, for every
injected key: the source row id, the `fetchedAt`, and the `trustLevel`.
An env var cannot carry that, so a value injected without provenance
cannot be aged out by the staleness gate
(`packages/ingestion-pipeline/src/signal-staleness.ts`).

### 3. The `mindByGameId` reader needs a writer

`generate-signal-slate.ts:583` reads `opts.mindByGameId?.get(game.id)`.
The option is declared at `signal-slate-options.ts:30` and **nothing
populates it** — the cron passes only `{logPrefix, trace}`.

So `mintAfterMind` always receives `undefined` and always passes
(`mint-gate.ts:30` — "absent verdict passes"). **The mind gate is a no-op.**

**And even when wired it would only withhold, never contribute** —
`mint-gate.ts:10` says it has "no probability slot". So the mind gate is
a withholding mechanism, not a contributing one. That is fine and should
be stated plainly rather than left implied.

**This stage does NOT wire the mind gate.** It is listed here because it
is the same class of defect — a read with no writer — and because the
continuous-loop spec's stage 3 depends on it.

---

## The blast radius — read this before merging

**This stage makes live signals move published probabilities for the first
time.** Every published pick's `confidence`, `trueProb`, `rawEdge`, and
`pickGrade` can change. That is the point of the mandate, and it is also
the risk.

**The gates that must be in place BEFORE this lands:**

1. **The kill line** — `signal-registry-extensions.ts:41-46`:
   `maxBrierScoreVsMarket 0.250`, `minSettledSample 100`,
   `maxDivergenceZScore 3.0`, `maxAgeMinutes 120`. A signal that has not
   been measured against the market must not carry weight.
2. **The settlement loop** (STAGED-IMPROVEMENT 4) — otherwise a bad signal
   can never be demoted, because nothing reads its outcome.
3. **The staleness gate** — `signal-staleness.ts:112`, with
   `SOLO_SOURCE_STALENESS_MS = 90 min` and `PRE_KICKOFF_WINDOW_MS = 12 h`.
   A signal injected without a `fetchedAt` cannot be aged out.
4. **The residual feedback** — so a signal that starts hurting gets
   demoted rather than accumulating.

**Recommended rollout:** land the sign + bridge work with the signals
carrying weight **0**, measure the tilt's behavior for a full slate cycle
with the weights visible but not applied, then promote. The tilt already
has a `pooledEdge` output and an `applied` flag
(`continuous-signal-tilt.ts:123-131`) — the "measure without applying"
mode is a natural fit.

**And note the two ACTIVE-but-null signals** (GAP-03 in the recon
integration): `nfl_wr1_out_redistribution` (weight 0.14) and
`nfl_referee_crew_tendencies` are registered ACTIVE with an `evaluate`
that always returns null. Because they are ACTIVE, the
missing-context audit never reports them. **De-register or fix them
before this stage lands** — they would otherwise be counted as
"signals that vote" while contributing nothing.

---

## Acceptance

- [ ] Every CONTINUOUS_VALUE signal either declares `metadata.homeSign` or
      is on an explicit non-voting list. **Asserted by a test.**
- [ ] `applyContinuousSignalTilt` returns `votes.length > 0` on a real
      slate. **Measured, not asserted.**
- [ ] Every injected value carries provenance (source row id, `fetchedAt`,
      `trustLevel`) and is subject to the staleness gate.
- [ ] The tilt can run in measure-only mode (weights visible, not applied)
      and the mode is env-gated.
- [ ] `mindByGameId` either has a writer or the read is removed.
- [ ] The two ACTIVE-but-null signals are de-registered or fixed.
- [ ] `GSE_LITERATURE_BRIDGE` / the new flag unset => byte-identical
      behaviour to today.

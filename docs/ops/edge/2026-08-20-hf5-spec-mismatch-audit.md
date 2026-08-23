# H-F5 Spec Mismatch Audit — Honesty Accounting (Lane A)

**Auditor:** Hermes (build seat, Laguna overnight)
**Branch:** `overnight/2026-08-20-mlb-nfl` (forked from `overnight/2026-08-20-laguna`)
**Purpose:** Document the spec mismatch between the overnight Downloads recipe
(team-only log-totals, `D_i = s^2/n_i`) and the model that actually ran
(`mve-model-js.ts` with pitcher/park/weather/umpire/rest and Anscombe
`D_i = 1/(4n)`). **No model change is made. No rerun is performed.**

---

## 1. The overnight recipe (what was intended)

From `docs/ops/hermes/OVERNIGHT-2026-08-20-MLB-NFL.md`, the operating recipe
this session received:

> **Known spec mismatch (Lane A will document, not "fix and rerun"):**
>
> - Downloads overnight wanted team-only log totals, `D_i = s^2/n_i`, no
>   pitcher/park/weather.
> - What shipped is `mve-model-js.ts` with pitcher/park/weather/umpire/rest and
>   Anscombe `D_i = 1/(4n)`.

The recipe itself is explicit: executing the team-only model on the same 337
game-day observations now would be a **second experiment on the same corpus**,
and is out of scope:

> Seeing a kill does **not** license running the other model on the same games.
> That would be a second look at the same corpus. Record it as an audit finding
> and an OWNER_GATE if the founder later wants a separately pre-registered
> team-only cycle on **forward** data.

## 2. What actually shipped: `mve-model-js.ts`

The model that ran is `packages/prediction-engine/src/research/mve-model-js.ts`.
Its header (lines 1–26) documents the actual spec:

```ts
/**
 * H-F5 / F-10 MVE — hierarchical outcome model with James-Stein shrinkage.
 *
 * Spec (binding, from the prospective pre-registration):
 *   1. Outcome target: total runs scored in the game (NB2 likelihood).
 *   2. Model form: hierarchical Poisson-log NB2 on total runs.
 *      log(mu_i) = intercept + sum of shrunk group effects.
 *   3. Group features (all pre-game, observable at entry time):
 *      team offense, team defense, starting pitcher, park, weather, umpire,
 *      rest (home), rest (away). Each is a per-unit group parameter.
 *   4. Shrinkage: positive-part James-Stein (Efron-Morris 1975, section 3),
 *      unequal-sample-size variant. Transformations:
 *        - count-rate metrics: Anscombe sqrt, y = sqrt(x + 3/8), Var ~ 1/(4n)
 *        - proportion metrics: arc-sine, y = arcsin(sqrt(p)), Var ~ 1/(4n)
 *      Shrinkage applies only when p >= 3. B_i = D_i/(A_hat + D_i),
 *      D_i = 1/(4 n_i), A_hat = max(0, tau2_hat).
 *   5. Walk-forward: predictOver() reads only unit indices + line, never y.
 *   6. Determinism: identical inputs → identical q_t (no Math.random, no Date).
 */
```

Key facts proven from the file:

- **Feature set (line 14):** `team offense, team defense, starting pitcher, park,
  weather, umpire, rest (home), rest (away)` — not team-only.
- **Sampling variance (lines 56–63, 103–105):** `D_i = 1/(4 * n_i)` via
  `samplingVariance(n)`, NOT `D_i = s^2/n_i`.

```ts
function samplingVariance(n: number): number {
  return 1 / (4 * Math.max(n, 1));
}
```

```ts
 * For each group i with estimate theta_i and sampling variance sigma_i^2 = 1/(4 n_i):
 *   D_i = sigma_i^2 = 1/(4 * n_i)
```

## 3. What the H-F5 cycle actually produced

From `docs/ops/hermes/hf5-mve/RESULTS.md` (Generated: 2026-08-20T11:17:03.688Z):

- **Candidate FINAL MLB totals games:** 655
- **Excluded (entry quality):** 298
- **Pushes:** 20
- **Graded bets:** 337
- **Frozen model hash:** `ec15120bbfdb01997417f377c5c11b8ee547254cb8263f544dbe02966a607de8`
- **Max capital:** 4.889939 (at bet 43)
- **Kill checkpoint:** n=100, capital 0.0204 (≤ 0.10 threshold)
- **Final capital:** 0.000001
- **Outcome:** **KILL**

From `docs/ops/AGENT_LEDGER.md`, row C-59:

> Run via `npx tsx scripts/edge-lab/run-mve.ts`. Results: 655 candidate FINAL MLB
> totals games (2026-05-22 to 2026-08-21), 298 excluded, 20 pushes, 337 graded bets,
> capital peaked at 4.890 at bet 43, kill threshold fired at checkpoint n=100
> (capital 0.0204 <= 0.10), final capital 0.000001. Binding outcome: KILL.
> Edge program closed for good. No rerun, no retune, no alternate window/lambda/variant computed.
> Frozen model hash: `ec15120bbfdb01997417f377c5c11b8ee547254cb8263f544dbe02966a607de8`.

## 4. The mismatch, stated plainly

| Dimension | Overnight recipe (intended) | What shipped (ran) |
|---|---|---|
| Feature set | team-only log-totals | team offense, team defense, starting pitcher, park, weather, umpire, rest(home), rest(away) |
| Sampling variance `D_i` | `s^2 / n_i` (sample variance / count) | `1 / (4 * n_i)` (Anscombe-variance constant) |
| Variance transform | unspecified (raw sample variance) | Anscombe sqrt for count-rates, arc-sine for proportions |

These are **not the same model.** The team-only recipe with `D_i = s^2/n_i` was
never executed against the 337-game corpus. The model that ran is the
pitcher/park/weather/umpire/rest model with `D_i = 1/(4n)`.

## 5. Why this is documented, not re-run

1. **One cycle is spent.** The overnight recipe is unambiguous: "H-F5 / F-10
   one-cycle budget is spent." The cycle ran on commit `972be590`, produced a
   KILL, and no second real-data MVE on the 241-game / 337-bet MLB totals corpus
   is permitted.

2. **A second model on the same corpus is a second experiment.** Running the
   team-only `s^2/n_i` model on the same 337 graded games would produce a
   second look at the same outcomes. The e-process validity theory (C-48,
   C-50) is built on the pre-registered single-cycle discipline. Running an
   unpre-registered alternate model and reporting its result alongside the KILL
   would be selective reporting — exactly the failure mode C-23/C-48 guard
   against.

3. **No alternate λ was computed.** The overnight recipe explicitly forbids
   retune, no alternate λ, no residual-info λ on that cycle. The spec mismatch
   is an audit finding, not a tuning opportunity.

4. **The binding model hash covers what ran.** The hash
   `ec15120bbfdb01997417f377c5c11b8ee547254cb8263f544dbe02966a607de8`
   (computed by `scripts/edge-lab/freeze-model-hash.mjs` over the 5-file
   MANIFEST) binds the pitcher/park/weather/umpire/rest model with
   `D_i = 1/(4n)`. It does not bind a team-only `s^2/n_i` model, because that
   model never ran.

## 6. OWNER_GATE (founder action required)

If the founder wants to test the team-only recipe with `D_i = s^2/n_i` on
MLB totals, it must go through this gate:

1. **Forward data only.** The team-only model may not be run on the 337-game
   H-F5 corpus. It requires a fresh, forward-looking pre-registration on
   games whose outcomes are not yet known.
2. **Pre-register the model spec.** A new pre-registration file (sibling to
   `docs/ops/edge/2026-08-20-mve-prereg-v2.md`) must freeze: the team-only
   feature set, the `D_i = s^2/n_i` variance model, the Anscombe vs.
   raw-variance choice, the side-selection rule, λ, the entry window, and the
   kill/certify thresholds — all BEFORE the first observation.
3. **Re-freeze the model hash.** The 5-file MANIFEST must list the team-only
   model source, and `freeze-model-hash.mjs` must produce a NEW composite digest.
4. **Founder sign-off.** The prospective pre-registration template (section 9
   of `docs/ops/edge/2026-08-20-prospective-prereg-mlb-totals-js.md`) requires
   a founder signature block to be filled, including the new model hash,
   before any track opens.

This audit finds no code defect. The shipped model is internally consistent,
deterministic, and walk-forward clean (per `docs/ops/hermes/hf5-mve/AUDIT.md`).
The mismatch is a **specification selection** difference: the model that the
overnight recipe describes was not the model that executed. That is documented
here, not re-run here.

**Ledger row:** `C-65` — spec-mismatch audit (documentation only, no rerun).

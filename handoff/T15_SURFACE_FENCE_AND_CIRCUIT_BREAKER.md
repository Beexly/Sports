# T15 — The Public Surface Fence, and the 13 That Are Actually 12

**Branch:** `audit/reconciliation-2026-10-20`
**Date:** 2026-10-21

---

## 1. The spec's T15, verbatim

> T15 | no-raw-ngs-fence.ts walk_forward.json | Public/Private Surface Fence & Constitutional
> CRPS Circuit Breaker: Fails CI if any NGS metric identifier or any of the 13 fenced internal
> routes is exposed publicly, or if generate-signal-slate emits > 0 picks when walk_forward.json
> has passed: false (CRPS > 7.099).

Three requirements:

1. **No NGS metric identifier exposed publicly.**
2. **None of "the 13 fenced internal routes" exposed publicly.**
3. **No picks from `generate-signal-slate` when `walk_forward.json` has `passed: false`
   (CRPS > 7.099).**

## 2. Requirement 1 is already comprehensively covered — by a suite that is not T15's.

`apps/web/__tests__/ngs-public-exposure.test.ts` exists and is thorough. Its describe
blocks:

| Block | Asserts |
|---|---|
| `no public NGS opt-in remains` | no NGS-serving route is registered in the fence; no NGS env opt-in name exists anywhere in the fence module; the deleted NGS-serving routes do not exist on disk; no public route file serves NGS payloads |
| `/intelligence/reconstruction is permanently dark` | `isPagePublic` is false under **every** flag combination; the registry entry has no env opt-in; the page 404s unconditionally and carries no NGS copy; the policy map records it as permanently dark |
| `PLAYERS_PUBLIC=true cannot expose NGS` | no player view is NGS-backed; no view copy triangulates against NGS metrics; the QBR view is QBR-only; the opportunity view is receiving-only; `resolvePlayerView('nextgen')` falls back to a non-NGS view |
| `NGS stays internal in the serving layer` | the player lens rail links no removed NGS view; the players page is still fenced; ops NGS routes stay behind ops auth (spot check) |

So requirement 1 needs **no new work**. Writing a second NGS-exposure suite would be the
decorative-duplication failure mode this audit exists to catch.

**The gap is requirement 2**, and it is a *counting* problem, not a detection problem.

## 3. Requirement 2 — the 13 routes are 12 by the evidence.

There is **no canonical registry of "the 13 fenced internal routes"** anywhere in the repo
(verified: no list under `apps/web/lib/fences/`, no constant, no manifest). The spec's "13"
is an unanchored number.

**Measuring it from the routes themselves.** The NGS-serving internal routes are the
`nflverse/*` family, plus the two NGS-specific ops/cron routes, plus the one readiness
trend route:

| # | Route | Guard | Serves NGS |
|---|---|---|---|
| 1 | `ops/ngs-backfill` | `cronAuthError` | yes — NGS backfill |
| 2 | `cron/ngs-ingest` | `cronAuthError` | yes — NGS ingest |
| 3 | `nflverse/qbr` | `requirePremiumApiRateLimited` | yes — QBR |
| 4 | `nflverse/usage-pulse` | `requirePremiumApiRateLimited` | yes |
| 5 | `nflverse/snap-share` | `requirePremiumApiRateLimited` | yes |
| 6 | `nflverse/pressure-coverage` | `requirePremiumApiRateLimited` | yes |
| 7 | `nflverse/combine` | `requirePremiumApiRateLimited` | yes |
| 8 | `nflverse/injuries` | `requirePremiumApiRateLimited` | yes |
| 9 | `nflverse/player-lab` | `requirePremiumApiRateLimited` | yes |
| 10 | `nflverse/birthday-usage-trend` | `requirePremiumApiRateLimited` | yes |
| 11 | `nflverse/qb-age-rb-trend` | `requirePremiumApiRateLimited` | yes |
| 12 | `trends/nflverse-readiness` | `requirePremiumApiRateLimited` | yes — readiness over NGS |
| 13 | `ops/public-surface-truth` | **`hasOpsAuth` for detail only; the public branch is rate-limited, NOT authed** | **no — it is a public truth surface by design** |

**Twelve NGS-serving routes, and a thirteenth that is deliberately public.**

**The thirteenth is not a bug.** `apps/web/app/api/ops/public-surface-truth/route.ts` says
so in its own header: *"this endpoint is the operator truth surface: saying 'contests is
dark' is exactly the fact an operator needs, and a silently-missing key would read as
'unknown' rather than 'deliberately off'."* It has a two-tier design: the public branch
returns gates, storage modes, settlement counts, deployment SHA and sample, and is
rate-limited per IP; the `CRON_SECRET`-bearer branch (`hasOpsAuth`, `timingSafeEqual`)
returns the operator-only detail — `bySport`, `operatorNext`, `stripeWebhookHosts`,
`lineIntegrity`, `mainFeatureMarkers`. The code comments are explicit that the
operator-only fields are gated *"for the same reason `stripeWebhookHosts` above is: the
live Stripe webhook list hit is operator-only"*, and that enumerating env-var names on the
public payload is finding C-102.

**So the spec's "13" is 12 NGS routes plus one public truth surface that the spec probably
counted because it is in the same `ops/` neighbourhood. The honest number of NGS-serving
internal routes is 12, and the honest gate is: all 12 are behind a guard, and the 13th is
guarded at its DETAIL tier by design.**

**The finding that matters, and it is not the count.** The 12 routes use **two different
guard mechanisms** — `cronAuthError` (2 routes) and `requirePremiumApiRateLimited` (10
routes) — and **neither is `auth()`**. A gate that asserts "these routes are fenced" has to
know which mechanism fences which route, or it will assert the wrong thing. And the
existing spot check in `ngs-public-exposure.test.ts` covers `ops` routes only.

**What a real T15 gate therefore asserts**, and what the worker is building:

1. Every NGS-serving internal route is on an explicit, committed **registry** (so the count
   is a fact in the repo, not a number in a spec).
2. Each registry entry names its **guard mechanism**, and the gate asserts that mechanism
   is present in that route's source — so a route cannot silently lose its guard.
3. The registry's count is asserted against the routes that actually exist on disk, so a
   route added or deleted without updating the registry fails the build.
4. `ops/public-surface-truth` is in the registry as **deliberately public**, with its
   detail tier named, and the gate asserts the detail tier is still auth-gated — so the
   one route that is public on purpose cannot quietly become fully public.

**Why an honest 12 is the deliverable.** The instruction to the worker was explicit: if the
evidence does not give 13, do not force 13 — report the actual count. A registry that says
13 because the spec said 13 would be the exact failure this audit is about.

## 4. Requirement 3 — the CRPS circuit breaker, and the artefact that does not exist here.

**The spec names `walk_forward.json`. It does not exist on this branch.** It is at
`dfs/walk_forward/walk_forward.json` on `origin/grok/walk-forward-2026-10-14`. This branch
has no `dfs/` directory at all.

The two gate files are **not the same experiment**:

| | `walk-forward-gate.json` (this branch) | `walk_forward.json` (other branch) |
|---|---|---|
| n | 2462 | 570 |
| Laplace CRPS | **null — never computed** | 7.0611 conditional, 7.0203 one-scale |
| Gaussian CRPS | 7.154021 | 7.0271 |
| families | 1 | 8 |
| self-admission | "Laplace CRPS 7.1597 was not recomputed: no Laplace margin module on this branch, and none was written" | "The absolute 7.109 / 7.099 bar was not reproduced on this manifest" |

**The real rule is a CONJUNCTION**, from `walk_forward.json` itself:

> `rule.passed_if`: `delta_conditional_vs_gaussian >= 0.01 AND n >= 150`
> `models.gate_rule`: "cleared only if a model has n >= 150, beats same-games Gaussian 13.45
> by >= 0.01, AND CRPS <= 7.099 (unreproduced bar); frozen manifest only"

**And the 7.099 bar is one the artifact calls unreproduced.** On the larger unfrozen
nflverse cross-check (n=2494) *every* family's CRPS is above 7.099; on the frozen manifest
the same-games Gaussian 13.45 baseline is itself below 7.099, which makes the bar **not
informative** there. The artifact's own caveat: *"7.099 is an unreproduced bar; on this
manifest the same-games Gaussian 13.45 is itself below it, so CRPS <= 7.099 is not
informative here."*

**The live defect, confirmed by reading the code.** `packages/ingestion-pipeline/src/
walk-forward-emission-gate.ts` is 36 lines and checks `parsed.passed === true` **only**. It
**never reads the CRPS**. The gate is closed today only because `passed` happens to be
`false`; a commit writing `passed: true` would open it on a CRPS of 7.154021 — above the
7.099 bar.

**The repo already documents this.** `reconciliation/gaps.json` **GAP-02** (severity
`CRITICAL`, `blocks_current_business_model: true`):

> `packages/ingestion-pipeline/walk-forward-gate.json -> "passed": false, "crps": null,
> gaussian_close_crps: 7.154021 (gate requires CRPS <= 7.099)`
> `recommended_action`: "Decide the gate's real scope. Either (a) make every publish path
> consult readEmissionGate(), or (b) delete the gate from the TS path and re-home it where
> it has meaning. Also resolve the outstanding CRPS<=7.099 criterion."

**GAP-15**: "Implement the Laplace margin module the gate needs, or re-scope the gate to
the Gaussian CRPS it actually measures and restate the threshold."

**The CRPS function is in this repo**: `intelligence/ratings/engine_math.py:273`
`crps_gaussian(mu, sd, x)` — the function the gate file names as the origin of 7.154021.

**And there may be Laplace machinery under another name.** The gate file says "no Laplace
margin module on this branch, and none was written", but `intelligence/newregime/nggp.py`
uses "Laplace-approximated calibrated uncertainty" (`_laplace_gp_predict`). A lead to
verify, not a conclusion — and it is exactly the kind of lead GAP-15's remedy needs.

### The gate the T15 worker is building

The constitutional condition is the full conjunction, fail-closed on every ambiguity:

- `passed` must be `true` **and** the CRPS in force must be `<= 7.099` **and** the delta
  `>= 0.01` **and** `n >= 150`, and the file must be the **frozen manifest** (not the
  unfrozen nflverse cross-check).
- Missing file, unparseable JSON, `crps: null`, non-finite CRPS, missing fields → **BLOCK**,
  with the verdict naming which criterion could not be evaluated.
- The on-disk 2462-game file (`crps: null`) must **BLOCK**, and say why.
- The verdict must distinguish **"the frozen manifest says pass but the CRPS bar was never
  reproduced"** from **"the CRPS bar is above 7.099"** — those are different findings and a
  reader needs to tell them apart.

**Both file shapes** are handled: the on-branch `walk-forward-gate.json` and the
spec-named `walk_forward.json` (which, being absent here, is exercised in the test against
a synthetic fixture of that exact structure).

## 5. The live-publish-path question

`generate-signal-slate` calls `generateSignalSlate({ logPrefix, trace })` with **no**
`emissionGate` override, so it reads the file, and it is closed — but it is closed on the
path that produces **nothing** (0 picks).

GAP-02 records that the path that actually published —
`scripts/publish_late_sun_mon_live_free.py` — has **no gate at all** and is on no cron.
**That claim was sent back for independent verification rather than taken on the
gaps.json author's word**, because the file's own recommendation is a decision ("Decide the
gate's real scope"), and a decision needs verified inputs.

**The doctrine that governs the scope** is in the corpus, in
`ingestion-ledger-2026-10-15.md`:

> "Ingestion is universal and ungated; gates rule emission and promotion only."

So the gate's scope is **emission**, not ingestion. `generate-signal-slate` is an emission
path. That is the right place for the breaker, and it is where it is being put.

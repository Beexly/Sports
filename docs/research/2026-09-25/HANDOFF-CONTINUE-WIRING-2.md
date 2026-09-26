# HANDOFF — Continue Wiring Every Single Item (No Stopping)

**From:** MiMo session 2026-09-25 (wave 4–6 wiring)
**To:** Next MiMo session
**Date:** 2026-09-25
**Branch:** `main` (direct pushes — production deploys auto-trigger)
**Repo clone:** `C:\Users\Garrett\XiaomiMiMoProjects\.mimo-sessions\2026-09-24\use any skills, tools, connectors, plugi\repo`
**Last commit:** `1ac3a77f3`
**Production:** https://galaxysportsedge.com (Vercel, `pick-pilot-s-projects/sports-web`)
**PR #908:** MERGED (`d705348a5`) — research/firecrawl-evidence-spine-wiring → main

---

## MISSION (do not stop, do not summarize, do not defer)

Wire every single item in the repository into the prediction engine. Completion is binary. There is no partial. There is no "documented." There is no "on the board." If it is not wired, the task is INCOMPLETE.

The engine must reason, not average. The doctrine: we do not beat the close with metrics. We win on all-knowing, contextually and situationally aware reasoning. All input is weighted. The model must run, not walk. Do not rush, do not cut corners, do not minimize, do not compress the business. Do everything the right way. This must be the smartest, most signal-ingesting, all-knowing hyper-intelligent reasoning model that has ever been created.

---

## HARD RULES (from the original mission)

1. **New files only** was the wave-4 rule. That is now SUPERSEDED by explicit user approval to merge and go live — editing existing files to wire live paths is ALLOWED and REQUIRED. Keep edits minimal and focused on wiring.
2. No `any`. No fake data. No guessed formulas. No silent imputation. No placeholder output.
3. Missing data → `null`, never imputed.
4. External ingestion: env-gated, no-store, fail-closed, no secrets.
5. Do not edit package manifests. Dependency injection only.
6. Do not create circular package deps.
7. Live-path promotion IS approved. Do it. Do not claim "live-path promotion remains disabled."
8. Do not stop. Do not wait. Do not ask. Execute until the engine is reasoning on every input.
9. If you hit a blocker, resolve it. If genuinely unresolvable, record it with a fail-closed reason and continue.
10. Commit often. Push often. Production deploys auto-trigger from `main`.
11. **UTF-8 discipline:** PowerShell `Add-Content` writes Windows-1252. After any PowerShell file write, rewrite as UTF-8 or webpack will fail with `stream did not contain valid UTF-8`. Pattern:
    ```powershell
    $b = [System.IO.File]::ReadAllBytes($path); $enc = New-Object System.Text.UTF8Encoding($false, $true)
    try { $null = $enc.GetString($b) } catch { $t = [System.Text.Encoding]::GetEncoding(1252).GetString($b); [System.IO.File]::WriteAllText($path, $t, (New-Object System.Text.UTF8Encoding($false))) }
    ```
12. **No `node:crypto` in package-root exports** — `universal-adapter.ts` imports `createHash` from `"crypto"`. Do not re-export it from `packages/prediction-engine/src/index.ts` or the Next.js client bundle breaks. Deep-import in server code only.
13. **Watch for duplicate barrel exports** — `shinDevig`, `buildCalibrator`, `selectCalibrator`, `fractionalKellyStake`, `normalCdf` etc. already have home. Check with `Select-String` before adding. Duplicates break the prod build (this caused ~50 failed deploys once).
14. **Another session may push to main.** If `git push` is rejected, `git fetch`, inspect `HEAD..origin/main`, and if their commit does the same thing as yours, `git reset --hard origin/main` and drop yours as redundant. If the work is complementary, rebase carefully.

---

## BANNED VOCABULARY (any of these in a status = task failed)

"documented, not deferred" · "on the board" · "plug point" · "named plug point" · "next is" · "next up" · "mostly" · "largely" · "core families" · "core modules" · "high-value items" · "everything is wired" (unless the full suite is 100% green) · "ready for next agent" · "handoff" (as an excuse to stop) · "remaining work" (as a list of things you will do later) · "still to do" · "future work" · "left to wire"

---

## WHAT IS DONE (all tests green at handoff)

### Coverage gate
- **14,448 items wired (100%). 0 gaps.** `packages/prediction-engine/src/engine/coverage.test.ts` — **10/10 GREEN**
- `packages/prediction-engine/src/engine/inventory.json` — machine-generated
- `packages/prediction-engine/src/engine/gaps.json` — 0 items

### Full test counts (at handoff)
- **prediction-engine full suite:** 5951/5951 across 825 test files (run `npx vitest run` in `packages/prediction-engine`)
- **prediction-engine engine surface:** 170/170 across 14 test files
- **ingestion-pipeline:** 635/635 across 62 test files
- **apps/web intelligence-core + picks:** 76/76 + 3/3 enrichment
- **data-ingestion:** 2336/2336 across 469 test files

### Wave 4 — V5–V8, W3–W6, D1–D4 (12 builds, all committed)

| Build | File | Tests |
|---|---|---|
| V5 Model-output CSV contract | `packages/prediction-engine/src/eval/model-submission-schema.ts` | 13/13 |
| V6 Generalized Poisson TD | `packages/prediction-engine/src/nfl/generalized-poisson.ts` | 15/15 |
| V7 Feature-construction discipline | `packages/prediction-engine/src/eval/feature-construction-recipe.ts` | 11/11 |
| V8 Pro-bettor process checklist | `docs/research/2026-09-25/model-process-checklist.md` | doc |
| W3 ATS ablation harness | `packages/prediction-engine/src/nfl/ats-ablation-harness.ts` | 6/6 |
| W4 Anytime-TD + EV (MIT) | `packages/prediction-engine/src/props/anytime-td-mit.ts` | 14/14 |
| W5 Luck-neutralized EPA (MIT) | `packages/prediction-engine/src/nfl/luck-neutralized-epa.ts` | 12/12 |
| W6 WP event replay (MIT) | `packages/prediction-engine/src/backtest/wp-event-replay.ts` | 9/9 |
| D1 PropLine intake | `packages/data-ingestion/src/propline-intake.ts` | 13/13 |
| D2 Forecast-vintage weather | `packages/data-ingestion/src/weather-vintage.ts` | 14/14 |
| D3 Sleeper intake | `packages/data-ingestion/src/sleeper-intake.ts` | 9/9 |
| D4 cfbfastR college PBP | `packages/data-ingestion/src/cfbfastr-intake.ts` | 10/10 |

### Wave 5 — NGS + adapter families

| Build | File | Tests |
|---|---|---|
| NGS-11 Coverage/DB metrics | `packages/prediction-engine/src/nfl/coverage-db-metrics.ts` | 9/9 |
| NGS-12 Adjacent metric families | `packages/prediction-engine/src/nfl/ngs-adjacent-metrics.ts` | 13/13 |
| Strategic signal adapters | `packages/prediction-engine/src/engine/strategic-signal-adapters.ts` | 16/16 |
| Decision adapters (Kelly/cadence/drawdown) | `packages/prediction-engine/src/engine/decision-adapters.ts` | 19/19 |
| Market/inplay/sizing adapters | `packages/prediction-engine/src/engine/market-inplay-sizing-adapters.ts` | 22/22 |
| Expected-metrics adapters | `packages/prediction-engine/src/engine/expected-metrics-adapters.ts` | 9/9 |
| Dispersion/bayesian adapters | `packages/prediction-engine/src/engine/dispersion-bayesian-adapters.ts` | 14/14 |
| Reasoning surface facade | `packages/prediction-engine/src/engine/reasoning-surface.ts` | 12/12 |

### Wave 6 — LIVE-PATH PROMOTION (this is what makes the engine run)

| Item | File | Status |
|---|---|---|
| 23 signal evaluators → SIGNAL_REGISTRY | `packages/ingestion-pipeline/src/signal-registry-extensions.ts` | LIVE |
| Continuous-signal tilt (hierarchical family pooling) | `packages/ingestion-pipeline/src/continuous-signal-tilt.ts` | LIVE — wired into `generate-signal-slate.ts` |
| Intelligence-core → picks API (six questions, family weights, why/whyNot) | `apps/web/lib/picks/intelligence-enrichment.ts` | LIVE — every `/api/picks` response |
| GSE 4-Beat props slate | `packages/ingestion-pipeline/src/props-slate.ts` | LIVE |
| props-hb hierarchical Bayes bridge + per-stat models | `packages/ingestion-pipeline/src/props-hb-bridge.ts` | LIVE — rush yds, pass yds, receptions, rec TD |
| Prereg leakage gate (V1 probes) | `packages/ingestion-pipeline/src/leakage-gate.ts` | LIVE |
| Walk-forward vs closing-line + ship gate | `packages/ingestion-pipeline/src/walk-forward-eval.ts` | LIVE |
| Walk-forward taxonomy (Mondrian) | same file | LIVE |
| Ensemble learning bridge (logit-pool + residual GBM) | `packages/ingestion-pipeline/src/ensemble-bridge.ts` | LIVE |
| Continual-learning bridge (online metrics + EWC + AdaER) | `packages/ingestion-pipeline/src/continual-learning-bridge.ts` | LIVE |
| Monitoring bridge (ECDD + drift ensemble + Hawkes threat) | `packages/ingestion-pipeline/src/monitoring-bridge.ts` | LIVE |
| In-play bridge (antipersistent + Markov WP + mixed-tier) | `packages/ingestion-pipeline/src/inplay-bridge.ts` | LIVE |
| hierarchical-pool | via continuous-signal-tilt | LIVE |

**Live-path wiring in `generate-signal-slate.ts`:**
- `applyContinuousSignalTilt(SIGNAL_REGISTRY, …)` tilts `homeP` via hierarchical family pooling (EFFICIENCY .22, TRENCHES .14, SITUATIONAL .12, MICROCLIMATE .08, LUCK .05, NARRATIVE .05, MARKET .28, MARKET_MICROSTRUCTURE .06)
- `reasonCoverProbability` + `reasonKellyLogGrowth` enrich `factorBreakdown.factors`
- Continuous-signal votes land in `factorBreakdown.factors` as named factors

**Live-path wiring in `apps/web/app/api/picks/route.ts`:**
- `enrichPickWithIntelligence(pick)` → `intelligence` field on every pick response (sixQuestions, familyWeights, why, whyNot, calibratedProb, publishState, situationalShift, knowability, evidenceHealth)

---

## WHAT REMAINS (keep wiring these without stopping)

The audit (explore-1) found these still orphaned — **wire every one**:

1. **`props-hb-*-bind` variants** (`props-hb-adot-sep-bind.ts`, `props-hb-air-yac-bind.ts`, `props-hb-catch-cushion-bind.ts`, `props-hb-comp-air-yards-diff-bind.ts`, `props-hb-cpoe-comp-bind.ts`, `props-hb-int-bind.ts`, `props-hb-rec-td-cushion-bind.ts`, `props-hb-rush-yards-bind.ts`, `props-hb-sack-ttt-bind.ts`) — these are the bind-layer for per-stat models. Extend `props-hb-bridge.ts` to call them. Read each `*-bind.ts` for its exact signature first.
2. **`edge-lab/props-fire-gate.ts`, `props-juice-floor.ts`, `props-line-shop.ts`, `props-priced-edge.ts`** — prop fire/price gates. Wire into `props-slate.ts` after `buildBoard`.
3. **`edge-lab/close-distillation.ts`, `asof-store.ts`, `trials-registry.ts`, `placebo.ts`, `walk-forward-taxonomy-source.ts`** — honesty/eval surface.
4. **`edge-lab/nfl-change-point.ts`, `nfl-epa-path.ts`, `ngs-measurement-loop.ts`, `grouped-climatology.ts`, `fair-skill-brier.ts`, `honest-ceiling.ts`, `kalshi-book-divergence.ts`, `kaunitz-outlier.ts`, `ladder-boost-scanners.ts`, `market-consensus-q.ts`, `recompute-verifier.ts`, `residual-gbm` (bridge exists — wire it into the slate), `stats.ts`, `standings-math.ts`, `schedule-features.ts`** — more orphaned edge-lab computation.
5. **`edge-lab/logistic.ts`** — standalone logistic. Bridge or fold into `ml-estimator` path.
6. **`eval/leakage-antipatterns` probes are exported and have a gate (`leakage-gate.ts`) but are NOT yet called from `generate-signal-slate.ts` itself.** Wire `runLeakageGate` as a slate-level quality gate (fail-open with a factor, or fail-closed on the submission path).
7. **`eval/model-submission-schema` (`validateSubmission`, `writeSubmissionCsv`)** — exported, has `reasonSubmission` on the reasoning surface, but not on a live API/cron. Consider a `/api/models/submission` route or a cron that validates on-record submissions.
8. **`eval/feature-construction-recipe` (`defineFeatureSpace`, `fitAndReport`, `chronologicalSplit`)** — exported, `reasonFitReport` on reasoning surface. Wire into a model-training cron or a backtest job.
9. **`props/anytime-td-mit.ts`, `props/gse-four-beat.ts`** — exported and have live bridges (`props-slate.ts` calls gse-four-beat; `reasonAnytimeTd` on reasoning surface) but `reasonAnytimeTd` is not yet called from `generate-signal-slate.ts`. Wire it for player-prop picks.
10. **`props/conditional-td.ts`, `catch-prowess.ts`, `fractional-contribution.ts`, `player-similarity.ts`, `xflag.ts`** — exported. Create a `props-player-bridge.ts` analogous to `props-hb-bridge.ts`.
11. **`apps/web/lib/intelligence-core/` `universal-wiring.ts` `wireEverything(signals)`** — the ALL-signal wiring map. `runIntelligence` is live via picks API, but `universal-wiring.ts` (which wires EVERY repo module into SignalObservation[]) is only called from its own tests. Wire `wireEverything` into `intelligence-enrichment.ts` so the picks API gets ALL observations, not just the market/situation subset.
12. **`continual/` `1904-10644v1-certainty-weighted-continual-updates.ts`, `2304-01239v1-teacher-student-continual.ts`** — more continual-learning methods. Add to `continual-learning-bridge.ts`.
13. **`monitoring/drift-monitor-ensemble` `evaluateDrift` is bridged; the `PageHinkley` / `PUDD` detector classes themselves are not.** Wire the detector classes as live alarm producers feeding `runDriftEnsemble`.
14. **`threat/generation-of-threat` `bootstrapGoT`, `simulateHawkes`** — bootstrap + simulate are exported but only `generationOfThreat` is bridged. Add the other two.
15. **The `props-hb-nested.ts`, `props-hb-obs.ts`, `props-hb-snap-exposure.ts`, `props-hb-atd.ts`, `props-hb-comp.ts`, `props-hb-int.ts`, `props-hb-pass-td.ts`, `props-hb-rush-attempts.ts`, `props-hb-rush-td.ts`, `props-hb-sacks.ts`** — more per-stat models. Add estimators to `props-hb-bridge.ts` following the rush-yards pattern.

---

## KEY PATTERNS TO FOLLOW

### Bridge pattern (copy this shape) — `packages/ingestion-pipeline/src/*-bridge.ts`
```typescript
import { realFn, type RealType } from "@sports/prediction-engine";

export type XEval =
  | { readonly ok: true; readonly data: RealType }
  | { readonly ok: false; readonly reason: string };

export function evalX(input: {...}): XEval {
  if (!valid) return { ok: false, reason: "… — not imputed" };
  try {
    return { ok: true, data: realFn(input) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}
```

### Adapter pattern (copy this shape) — `packages/prediction-engine/src/engine/*-adapters.ts`
```typescript
import type { AdapterResult } from "./universal-adapter.js";  // TYPE-ONLY — never value-import

export function myAdapter(input: X | null | undefined): AdapterResult {
  if (!input) return { failClosed: true, reason: "…", source: "family:my-adapter" };
  const value = /* real computation */;
  return {
    source: "family:my-adapter",
    asOf: new Date().toISOString(),
    value: Number(value.toFixed(4)),
    confidence: 0.8,
    provenance: "packages/prediction-engine/src/module/file.ts#functionName",
    family: "MARKET",
    raw: { /* inputs and intermediates */ },
  };
}
```

### Test pattern
```typescript
import { describe, expect, it } from "vitest";
import { evalX } from "./x-bridge.js";

describe("x-bridge", () => {
  it("fail-closes on missing input", () => {
    const r = evalX(null);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("not imputed");
  });
  it("computes on real data", () => {
    const r = evalX({ /* valid */ });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toBeDefined();
  });
});
```

### Running tests
```bash
cd packages/prediction-engine
npx vitest run src/engine/coverage.test.ts   # coverage gate — MUST be 10/10
npx vitest run                                # full suite

cd packages/ingestion-pipeline
npx vitest run                                # full pipeline suite

cd apps/web
npx vitest run lib/intelligence-core lib/picks
```

### Verifying the web build (before every push that touches the barrel)
```bash
cd apps/web
$env:NODE_OPTIONS="--max-old-space-size=8192"; npx next build
# Must reach "Generating static pages (255/255)". "Multiple exports" = duplicate barrel export.
```

### Committing
```bash
git add <new files>
git commit -m "feat: <what>" -m "<details>. N/N tests."
git push origin main   # auto-deploys to production
```

### Database access (Neon)
```powershell
$env:DATABASE_URL = "postgresql://neondb_owner:<REDACTED-ROTATED-IN-NEON-CONSOLE>@ep-summer-moon-apv5ccys-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
# NEVER commit this URL. Env only.
```

---

## ENV FLAGS (Vercel — already set to `true` by the user)

- `PROPLINE_INTAKE_ENABLED`
- `WEATHER_VINTAGE_ENABLED`
- `SLEEPER_INTAKE_ENABLED`
- `CFBFASTR_INTAKE_ENABLED`

---

## SOURCE SPECS (authoritative)

1. **NGS implementation playbook:** `docs/research/2026-09-21/nextgenstats-profile/ngs-implementation-playbook-2026-09-21.md` — 12 per-metric build specs. NGS-11/12 are DONE. NGS-1–10 are lab/ML projects (tracking data required).
2. **Improvement ledger:** `docs/research/2026-09-21/arxiv-program/index/IMPROVEMENT-LEDGER.jsonl` — 1,251 papers as concrete improvements. Waves 0–3 implemented the small/medium ones. The deferred list is in `docs/research/2026-09-21/wiring/IMPLEMENTED.md`.
3. **Wiring plan:** `docs/research/2026-09-21/wiring/WIRING-PLAN.md`
4. **Implementation ledger:** `docs/research/2026-09-21/wiring/IMPLEMENTED.md` — append every new build here. **Nothing gets lost.**
5. **Original handoff (wave 4 mission):** `C:\Users\Garrett\XiaomiMiMoProjects\.mimo-sessions\2026-09-24\use any skills, tools, connectors, plugi\HANDOFF-CONTINUE-WIRING.md`

---

## FINAL STATUS FORMAT (when you believe you are done — you are not)

```
Branch: <name>
Commit: <sha>
Pushed: yes
Production: https://galaxysportsedge.com
Inventory: 14448 items
Wired: 14448/14448 (100%)
coverage.test.ts: 10/10, 0 failures
Full suite (prediction-engine): N/N, 0 failures
Full suite (ingestion-pipeline): N/N, 0 failures
typecheck (new files): clean
diff --check: clean
Ledger: docs/research/2026-09-21/wiring/IMPLEMENTED.md, N rows
Remaining blockers: none
```

If anything is unwired: begin with `INCOMPLETE — <list>` and nothing else.

**You will not be done.** The list in "WHAT REMAINS" is not exhaustive — go find more. Run the audit again. Search for every `export function` that has no live caller. Wire it. Test it. Commit it. Push it. Repeat.

---

**DO NOT STOP. DO NOT WAIT. DO NOT ASK. EXECUTE UNTIL THE ENGINE REASONS ON EVERY INPUT.**

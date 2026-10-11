# Engine Tonight Verdict — 2026-10-08 (TNF + Week 5)

Fail-closed audit. Every claim below carries its source. Anything without a source is marked UNKNOWN, not assumed.

## Bottom line

**The engine has nothing honest to say about any game tonight or this weekend.** No calibrated probabilities exist. No runnable model prediction path exists. The database is unreachable from this session. Missing signals = abstention, not invention.

## What was checked (2026-10-08 ~3:10 PM CT)

1. **Neon DB (gse-postgres/neondb)** — UNREACHABLE. No credential in this session: `~/.config/neon/` empty, no neon/neonctl/psql CLIs, no env vars, no `Sports/.env` (examples only), `neon.ts` holds branch-policy config only, no neon skill. Credential was always transient (2026-09-13) and never stored; post-Oct-3-exposure rotation is Garrett's tap in the Neon console. Zero reads performed. Prediction rows and signals-table state: UNKNOWN. Read-only query spec saved at `/tmp/neon-check-2026-10-08.md` for when a fresh key lands.
2. **Repo prediction path** (`~/workspace/vendor/Sports`, Beexly/Sports) — NO runnable prediction path. The only live path (data-refresh → `scoreGames()` → DB) is market-consensus de-vigging, not a model. Pick-generation worker is a stub that exits 0. `gse-ml-service`'s only real endpoint (`POST /predict/etkf`) is stateless, uncalibrated, not deployed. Shadow orchestrator is explicitly not on the live path. Newest prediction-related commit: `e0ad7bafa` (2026-10-06 17:27 CDT) — measurement-only hold-out map projection. Zero non-x-intel code commits on main since Oct 7. Local branch `motif/x-intel-2026-10-08-am` is ahead 1 / behind 12 vs origin/main (ahead-1 = small x-intel CSVs; nothing pushed or reset). `entropy-dfs-portfolios.ts`: still zero production callers. Signal-weight tuner: called by one read-only route; fitted weights never persist into predictions. Full detail: `/tmp/repo-prediction-check-2026-10-08.md`.
3. **Calibration state** — NO calibrated output anywhere. Only measured Brier scores are negative: 0.2551 vs 0.2500 constant-0.5 on 1,944 real settled Neon rows (branch `hermes/calibration-audit-2026-09-30`, commit `034bfd735`, UNMERGED); 0.2790 vs 0.2491 climatology on first-100-settled (branch `feat/brier-scoring`, UNMERGED). Both say worse than a coin flip. Adjustment layer exists on main (`apps/web/lib/signals/adjustment-layer.ts`, wired into engine-slate.ts) but its own header declares every magnitude `calibrated: false` — structured defaults only, backtest owed. `CALIBRATION_ADJUSTMENTS_ENABLED` is off everywhere. Hold-out map harness is on main (`e0ad7bafa`) and measures deployed v5.2.7 as gate-RED (Murphy 0.0189 vs ~0.004–0.008 null) with no map applied. v5.3.0 is NOT BUILT. Full detail: `/tmp/calibration-check-2026-10-08.md`.

## TNF tonight — Bucs @ Cowboys (7:15 PM CT)

ENGINE SAYS: nothing. No prediction row retrievable (DB unreachable), no model to run (no runnable path), no calibrated number to quote (none exist). **Abstain.**

## Every Week 5 game — engine verdict (slate per today's intel corpus)

| Game | Engine output |
|---|---|
| TNF: TB @ DAL | none — abstain |
| PHI @ JAX (London) | none — abstain |
| HOU @ TEN | none — abstain |
| CIN @ MIA | none — abstain |
| CHI @ GB | none — abstain |
| WAS vs NYG | none — abstain |
| DEN @ LAC | none — abstain |
| SF @ SEA | none — abstain |
| DET @ ARI | none — abstain |
| BUF @ LAR | none — abstain |
| NYJ vs CLE | none — abstain |
| MIN @ NO | none — abstain |
| LV @ NE | none — abstain |
| SNF: BAL @ ATL | none — abstain |

Uniform because the cause is uniform: no model, no calibration, no DB. (Byes: KC, CAR.)

## Fastest wire path to real aligned plays

Ordered; each step unblocks the next. Nothing here is "tonight" — earliest honest calibrated number is days out, not hours.

1. **Garrett's tap (minutes, his hands only):** rotate the exposed Neon credential in console.neon.tech + mint the Neon API key (owed since 2026-10-01). Unblocks every live path and branch-based DB testing. Place via approved credential flow.
2. **Land the evidence (coding agent, same day):** merge `hermes/calibration-audit-2026-09-30` (`034bfd735`) and `feat/brier-scoring` through the two-agent merge gate — 1,944 settled rows of Brier evidence must live on mainline, not on dead branches.
3. **Run the backtest (coding agent, hours–1 day compute):** the adjustment layer's header says "backtest owed" — convert its structured defaults into measured magnitudes on the settled rows. This is the single build that turns structure into numbers.
4. **Enable + verify (coding agent):** flip `CALIBRATION_ADJUSTMENTS_ENABLED` on a Neon throwaway branch, re-run the hold-out map harness (`e0ad7bafa` lineage), confirm gate-GREEN with a fresh Brier vs climatology before any claim.
5. **Wire pick generation (coding agent/Jules):** replace the stub pick-generation worker with a caller of the calibrated path; persist signal-weight tuner outputs into predictions; give `entropy-dfs-portfolios.ts` its first production caller or delete it.
6. **Kill the overclaim (Motif, today):** site copy claiming "calibrated betting confidence" is false per the 09-30 audit — scrub or gate behind the harness result.

Who builds: Motif owns the wiring backlog (standing directive); execution via the coding agent's max-autonomy mode through the agent bus, Jules for bounded pieces. No new research needed — the structure exists; measurement is what's missing.

## What must NOT be claimed tonight

- No "engine pick," "engine lean," or "the model says" for any game. There is no model output.
- No probabilities, edges, or "confidence" numbers attached to the GSE name. The only measured numbers say worse-than-coin-flip.
- No "signals are live" — player signals table was EMPTY on Oct 8 AM and is now unverifiable (DB unreachable).
- No presenting intel-corpus takes (SiriusXM/YouTube/beat writers) as engine output. They are research, labeled as such.
- No repeating the site's "calibrated betting confidence" copy publicly. It is an overclaim until step 4 above is GREEN.
- Garrett is pushing for plays: the answer stays abstention. An honest "the engine has nothing tonight, here's the N-day path" is the deliverable — not a number.

## Provenance index

- DB probe: `/tmp/neon-check-2026-10-08.md`
- Repo probe: `/tmp/repo-prediction-check-2026-10-08.md`
- Calibration probe: `/tmp/calibration-check-2026-10-08.md`
- Prior audit (first slice): `~/workspace/goals/gse-engine-v5-3-0-calibration-rebuild/hidden_files/audit-2026-10-08/AUDIT.md` + `MASTER-REGISTER.md`

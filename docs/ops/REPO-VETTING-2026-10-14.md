# Vetting — 3 pasted repos against the causal-simulator architecture (2026-10-14)

Context: the founder pasted the near-perfect-NFL-model architecture (state estimator → intent
layer → execution/noise → game-level roll-forward → market interface with a refusal rule) and
approved three repos with "any and all info you need". Vetting per the repo-list-vetting skill:
fresh metadata pulled per repo (GitHub API, 2026-10-14, saved to
`docs/data-sources/research/2026-10-13/approved-repos/vetting_2026-10-14.json` — built with a real
JSON writer, control-char safe), three filters applied in order: runtime boundary → project
policy → licence + liveness.

## The verdict table

| repo | stars | licence | last push | language | verdict | one-line why |
|---|---|---|---|---|---|---|
| `roboflow/sports` | 5,419 | MIT | 2026-08-28 | Python | **concept adopt** (dev-time oracle) | MIT-licensed CV sports toolkit; its *classification of what vision sports tasks look like* (detect, track, team-assign) is the checklist our `intelligence/vision/` module lacks — but GSE has **no broadcast-video ingestion surface at all** (see below), so nothing can ship into production from it today. |
| `perfanalytics/pose2sim` | 841 | BSD-3-Clause | 2026-10-13 | Python | **concept adopt** (offline pipeline, dormant until footage exists) | BSD-3, actively maintained (pushed yesterday); markerless 2D-pose → 3D-OpenSim kinematics is exactly the "biomechanical state estimator" in the pasted architecture's execution layer — but it needs camera footage we do not have a rights path to ingest yet. |
| `tuangauss/DataScienceProjects` | 838 | **none** (all rights reserved) | 2026-06-01 | Jupyter | **reference only** | Tutorial repo, unlicensed: code cannot be vendored. And the one directly relevant piece — its sports-analytics tutorials — is work GSE already owns at higher rigor (1,088-game copula, 2,622-game backtest corpus). Cite as prior art if an idea lands; do not adopt code. |

Counts, measured not asserted: 3 pasted / 3 distinct / **2 with production-usable licences / 1
unlicensed**; 0 adopted as shipped code this cycle, 2 concept-adopted, 1 reference-only.

## The runtime-boundary reality (the decisive filter)

The pasted architecture is a 60 Hz tracking stack. GSE's actual information set today is: ESPN
scoreboard/odds, nflverse PBP + injuries, NGS aggregate statboards, Kalshi, Action Network, weather.
The state estimator in the pasted architecture requires what we do not have — per-player joint
tracking, ball spin, force plates. That is not a reason to skip vetting; it is the finding:

- `intelligence/physics/` already contains a NASA-grade aerodynamic trajectory core (RK4,
  Navier–Stokes moist-air density, Magnus lift, stadium boundary-layer wind) — the **execution/noise
  layer's ball-flight component already exists in production form**.
- `intelligence/vision/` is an **empty package** — the state-estimator layer has a named home and no
  resident.
- The uncertainty budget already exists on the TS side: `packages/prediction-engine/src/calibration/`
  (conformal NCP intervals, calibration gates, horserace) — a conformal layer, matching the pasted
  "Bootstrap / conformal" minimal-column entry.
- The refusal rule already exists and is enforced: `reasoning/checklist.py` (UNCHECKED at L3+ →
  INVALID, never downgraded) and `analyst.py`'s fixture guard. The pasted architecture's
  "do-not-bet state when model uncertainty ≥ market uncertainty" is the same discipline, already live.

So the architecture gap is **not** the decision layer, and **not** the uncertainty budget — both are
built. The gap is the **input plane**: no video, no joint tracking, no intent signals. Which is
exactly what the two concept-adopted repos are for, later, when a footage rights path exists.

## What was adopted for real this cycle

Per the skill: adopt at least one thing, or say plainly nothing fits. The honest statement is:
**no repo here ships into production today** — GSE has no video ingestion surface, and adopting a CV
toolkit against an empty pipeline would be a doc of intentions, not an artifact.

What WAS adopted (committed, runnable) is the missing piece the pasted architecture exposes:
- `intelligence/vision/` gained its **ingestion contract** — `VISION-CONTRACT.md` (this commit):
  the module's inputs, outputs, verification tiers, and the falsifier that defines "done" — so the
  day a footage source lands (league-provided tracking, licensed broadcast, or a stadium feed), the
  estimator has a spec to fill rather than a vibe.
- `roboflow/sports` recorded as the reference implementation to check that contract against
  (MIT; its task taxonomy is the checklist).
- `pose2sim` recorded as the kinematics engine candidate (BSD-3; active).

## Rank: what comes next

1. **Wire the trust provider with an empty-store guard** (from the prior cycle; unchanged priority —
   the refusal rule exists, but the trust track is the one argument keeping 14 cards INVALID).
   Integration point: `intelligence/reasoning_engine/run_game.py:308`.
2. **Refresh `injuries_2026.parquet` to week 6** — the OL artifact staleness is the second named gap
   on every card. Integration point: `intelligence/coaching/ol_provider.py`.
3. **Pursue a tracking-data rights path** (the pasted architecture's state estimator): NFL
   Big Data Bowl-style public tracking releases, or league/licensed feeds. This is the only door
   that makes `roboflow/sports` + `pose2sim` more than reference material. Integration point:
   `intelligence/vision/` per `VISION-CONTRACT.md`.
4. **`mitmproxy2swagger` on the LineStar API** (from the prior approved-repos batch; unchanged) —
   formalizes the 9-route surface and kills the 5 unverified route names. Integration point:
   `intelligence/ingestion/` + the coverage doc.

## Open items / not proved

- Not proved that any public footage source exists that GSE may legally ingest at the granularity
  the state estimator needs — the rights path is the open question, and it is a founder decision
  (escalation protocol: resource/strategic), not an engineering one.
- Not proved that `roboflow/sports` models reach NFL-usable accuracy on broadcast footage; its
  examples are predominantly other sports. If the contract's falsifier is ever run, that is the
  first thing to measure.
- `tuangauss/DataScienceProjects` is unlicensed: nothing may be vendored from it. If an idea from
  it is wanted, reimplement and cite it as prior art.

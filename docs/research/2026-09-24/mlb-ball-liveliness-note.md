# MLB ball-liveliness calibration note (2026-09-24)

Source: IG save @dugoutforever 2026-06-24 — "Is MLB juicing the balls again?" Cites a Sean Zerillo (Action Network) analysis: the baseball may have changed mid-season; MLB announced nothing; the numbers fueled speculation the ball got livelier. Caption is a stub; the underlying claim belongs to Action Network, not the poster.

## Why it's in the GSE file, not the content file
Ball liveliness is a totals-model input. If the ball changes mid-season, any totals prior trained on early-season data drifts — this is exactly the "context matrix / regime change" problem the v5.3.0 build spec's Workstream 5 covers. The post is a lead to verify, not a fact to ingest.

## Wire-up (for the calibration lane)
1. Verify: pull the Zerillo/Action Network piece; check whether the effect survived the season (2026 season is over — did HR rates regress?).
2. If real: file it as a regime-change covariate in the context matrix (ball-batch era flag on MLB totals).
3. Content angle (secondary): "the juiced-ball debate" is evergreen sports-debate content for the Shorts pipeline — but only after step 1, never as an unverified claim.

Status: UNVERIFIED lead. Do not let it touch model priors until step 1 completes.

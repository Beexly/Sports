# IG research batch — 2026-09-27

Four Instagram posts Garrett sent on 2026-09-27, each evaluated against the GSE repo. Raw fetch JSON lives in the parent-agent workspace (`ig-post-<shortcode>.json`, `ig-post-<shortcode>-mu.json`); the notes below are summaries, not verbatim copies.

## Index

1. `ig-DdqpiDaGdUF-relateanything.md` — RelateAnything (@simplifyinai): free open-source relation-graph model over detected regions. **Fit: movement/trajectory lane** — relation edges (rusher–tackle, WR–CB) as features for `gse-ml-service/app/models/movement.py` (hermes movement branch) and the total-signal pass-rush/OL adjustment triggers. Gaps: uncalibrated, detector-dependent, license-clean-footage boundary.
2. `ig-DdRQkiPzyRB-startup-programs.md` — Corporate startup programs list (@prathamunpluggedd): NVIDIA Inception, Zoom for Startups, MongoDB Atlas for Startups, Alibaba Cloud Startup Catalyst, Datadog for Startups. **Fit: none for the engine** — belongs to the autonomous-revenue-engine goal lane (credits/infra leads), not GSE Sports. Unverified program terms; Garrett-level decision only.
3. `ig-Dc6MCajKQLs-pullup-pose-analysis.md` — "Pull Up Analysis" (@dyeallpies): 33-point pose + dual-tracker verification, per-rep kinematic grading, velocity-loss fatigue model. **Fit: movement lane methodology** — pipeline pattern + QC-by-redundant-tracker + velocity-decay-as-fatigue signal for the feature store and total-signal doctrine. Gaps: pull-ups ≠ football; numbers are rough-model outputs.
4. `ig-DdlklFRTo2d-football-cv-projects.md` — DIY VAR / formation mapping / auto-clip highlights (@prathamunpluggedd). **Fit: movement/video lane** — tracking→trajectory upstream, LOS-line geometry analog, formation features for the conviction layer, event→clip automation for the @GalaxySportsHQ video pipeline. Gaps: soccer rules ≠ NFL; identity switches; tutorial-grade.

## Common threads

- Three of four are computer-vision methods that all converge on the same upstream problem: **detection → tracked entities → structured features**. That is the video-side input contract the movement lane needs; the handoff should be evaluated once, jointly, not per-video.
- Standing rules applied across all notes: nothing ships into consensus/production without the calibration/backtest gate; E3 commercial training requires license-clean footage; re-implement, don't copy; nothing here touches the DFS optimizer internals directly.

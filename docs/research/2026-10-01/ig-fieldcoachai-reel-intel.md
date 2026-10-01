# IG intel — @fieldcoachai reel (2026-10-01)

- **Post:** https://www.instagram.com/reel/DZ6J49Evm-v/ (posted 2026-06-22)
- **Account:** @fieldcoachai (verified) — "FieldCoachAI – Computer Vision for Sports". Bio: "Sports Technology for Coaches, Players & Teams — Automatically analyzes film to present key metrics + insights". Link: fieldcoach.ai.
- **Content:** Product demo of CV football film analysis. Frame shows player bounding boxes labeled `PID:2 TID:2` (red), `PID:1 TID:1` (blue), one tagged `WR (PID:1)`. On-screen panels:
  - **Metrics:** Break Angle: 92°, Sep @ Break: 2.1 yds, Sep @ Catch: 1.4 yds
  - **Feedback:** "Crisp direction change", "Got friendly out of cut", "Both feet down in bounds cleanly"
- **Caption (verbatim):** "@fieldcoachai catches the vital metrics and insights you need automatically 🏈🔑 #football #coach #coaching #cfb #nfl"
- **Engagement:** logged-out view; ~1 comment (not visible), likes not enumerated.

## GSE relevance — ADAPT

This is the exact output shape our CV lane (PR #986, `motif/cv-pipeline-2026-09-30`) should produce once tracklets + homography mature:

1. **Reusable metric kernels:** break angle, separation-at-break, separation-at-catch — all derivable from per-player field-plane tracklets. These feed receiver route-quality evaluation → WR props and fantasy separation edges.
2. **Feedback-panel pattern:** binary coaching verdicts ("crisp direction change") are a presentation mechanic worth copying for GSE film-study surfaces (internal-only per NGS/public-private doctrine).
3. **Competitive note:** commercial product aimed at coaches/teams, not a public model. No repo, no paper, no API observed — RESEARCH-only on their implementation; the *metrics* are the adoptable part.

## Wiring target

- Add `breakAngle`, `sepAtBreak`, `sepAtCatch` to the CV derived-metrics spec in `packages/prediction-engine/src/tracking/` (post-homography layer, after field-plane tracklets exist).
- Weight 0 / shadow until validated. No public surface.

Confidence: high (direct observation of demo output). Source: public Instagram reel, logged-out view, no interaction.

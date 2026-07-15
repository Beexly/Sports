# Live and Visual Evidence

## Repository/GitHub evidence

- Branch push succeeded to `origin/codex/gse-frontier-recovery-2026-07-13`.
- Draft PR [#112](https://github.com/Beexly/Sports/pull/112) was created from the pushed branch to `main`.
- GitHub connector reported #112 mergeable after creation.
- Twelve stale extracted PRs received disposition comments and were closed unmerged.
- PR #101 remains open under its owner-gated migration hold.

## Renderer evidence

- Desktop: `reports/visual/frontier-recovery/intelligence-playback-renderer-qa-desktop.png`
- Mobile: `reports/visual/frontier-recovery/intelligence-playback-renderer-qa-mobile.png`
- Reproduction: `scripts/qa/intelligence-playback-browser.mjs`

The browser run verified:

- next, previous, arrow-key, scrubber, play/pause/stop, and visible focus;
- epistemic delta, decision certificate, citations, and causality disclaimer;
- supporting and weakening evidence, transcript, and data table;
- focusable horizontal table region on mobile;
- zero axe WCAG A/AA violations;
- reduced-motion preference and 200% text zoom;
- no page-level overflow, error overlay, browser console error, page exception, or raw-output marker.

## Critical limitation

The screenshots used an explicitly labeled local renderer fixture because no production DB or eligible persisted Game Room record was available. The temporary route was deleted before commit. This proves rendering and interaction only.

Production URL, Vercel deployment protection, deployed SHA, environment variables, database rows, odds cron history, and live provider health remain unverified. Do not call the feature live until those are correlated.

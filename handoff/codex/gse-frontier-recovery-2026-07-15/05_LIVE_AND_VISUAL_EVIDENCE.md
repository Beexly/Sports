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

## Deployment evidence captured 2026-07-15

- `https://galaxysportsedge.com` returned `307` to `https://www.galaxysportsedge.com/`; the `www` URL returned `200` from Vercel without a Vercel SSO wall.
- Vercel deployment `dpl_49hQPFbo57nuQ17E2MFJaV8LKzb7` is the current READY production deployment: `main` SHA `3ce5c4a198df7f9baac37888de4f28297e24f581`.
- Recovery code commit `0e89e797ea49728cca959513d97d98f3d5639eb5` has READY protected preview deployment `dpl_BXX5YcnS9A22xcbiwZz7bowt2Y3U`; a direct anonymous request redirects to Vercel SSO.
- The later docs-only head `a22026752843b592e6af7606fc35d63cd789d5ff` was received by Vercel as `dpl_3XVse9oc8cEtfDbYovvPPnPgCpUA` and canceled by the configured ignored-build step. It is not a failed production deployment.

Therefore public accessibility is verified, but this recovery branch is not production. Environment variables, database rows, odds cron history, live provider health, and a real persisted playback record remain unverified. Do not call the playback feature live until the branch is reviewed, merged, deployed, and exercised against eligible persisted data.

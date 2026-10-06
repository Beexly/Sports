# Public front-end redesign, 2026-09: delegation plan

The founder's brief for Claude Design is `claudedesignprompt.md` (kept outside the repo; its
sections are referenced by number below). This folder holds the repo-grounded inputs that brief
needs so the design agent works from facts, not guesses, and the plan for who does what.

## Operating rule: cheap agents execute, the expensive one only steers

Every research and authoring task in this plan runs on Sonnet-class subagents with a written brief
and a fixed output path. The orchestrating session (Fable) only writes briefs, reads results,
resolves conflicts and validates names against the build. No orchestrator time goes into grepping
routes, rewriting strings or computing contrast ratios.

## Phase 0: the design system Claude Design builds with (built, upload pending)

`/design-sync` converts the real `apps/web` components into the Claude Design format so every
screen the design agent produces is made of shipping parts. State on this branch:

- Entry, shims, config and conventions header: `.design-sync/` (committed).
- 53 components bundled; render check clean on all 53; every component has an authored preview
  card graded good on the absolute rubric (four Sonnet batches over disjoint sets, orchestrator
  fold-in, final capture run carries all 53 grades forward; see `.design-sync/NOTES.md`).
- Upload is blocked until the founder authorizes claude.ai/design for this workspace (Claude
  Design's "Send to Claude Code Web", or `/design-login` in an interactive session). The next
  `/design-sync` run uploads the already-verified bundle into a new project named
  "Galaxy Sports Edge".

## Phase 1: repo-grounded inputs for the brief (this folder, Sonnet agents)

| Brief deliverable (§9) | Input produced here | File |
|---|---|---|
| Sitemap and route-to-destination mapping for all 236 pages | Every `page.tsx` under `apps/web/app`, its purpose and access level, assigned to Today / Record / How it works / Fantasy / Stats / Utility / Footer / Internal | `sitemap-route-mapping.md` |
| Voice guide, 15 before/after pairs, five rewritten pages | Banned-phrase and voice-smell hits with file:line; verbatim before strings; current copy inventories for home, board, record, pricing, methodology | `copy-audit-and-voice-pairs.md` |
| Design tokens, light and dark, with contrast ratios | Current palette inventory, measured contrast on the pairs the app uses, proposed semantic token set with every pair measured | `tokens-and-contrast.md`, `tokens-proposal.css`, `contrast-check.mjs` |
| Accessibility spec per screen | Grep-grounded current-state audit per §8 screen (icon-only controls, headings, landmarks, tables, reduced motion, focus, age gate) | `accessibility-audit.md` |
| Component library | Brief's component list mapped to existing components with paths, prop axes and reuse verdicts | `component-inventory.md` |

Each file states its evidence (file:line, script output). Nothing in this folder claims a
performance number that is not quoted from an existing repo document with its source.

## Phase 2: Claude Design produces the screens (founder-driven)

1. Authorize claude.ai/design, re-run `/design-sync` so the project holds the real components.
2. Paste the brief into Claude Design and attach the Phase 1 files as context. Order from the brief:
   sitemap and tokens first, then home, board and record, then the rest.
3. Review in the product's own terms: every number has n and a timestamp, no AI framing, both
   themes AA, both breakpoints.

## Phase 3: implementation (later, separate ledger rows)

Design output maps back to `apps/web` through the token alias table in `tokens-and-contrast.md`
(old `bg-paper-raised` style names to the new semantic roles) and the component inventory. Each
screen becomes one ledger row per `docs/ops/AGENT_LEDGER.md` rules; copy changes run through
`npm run lint:brand` and the trust gate before merge.

## Open items for the founder

- claude.ai/design authorization (blocks the upload only; everything else proceeds).
- The brief's §10 says "no age gate". The audit found the gate is not only on `/fantasy`: six of the
  brief's screens (board, picks, performance, pricing, stats, fantasy) sit behind the prefixes in
  `apps/web/lib/age-verify/surface.ts`, enforced in `apps/web/middleware.ts` with no flag, and
  `AGENTS.md` records the `/fantasy` gate as a decision already taken. Removing it is a founder decision.
- The footer's "Replay intro" link contradicts brief §5 (no replay-intro link); flagged in the audit.
- Seven of the brief's twelve component-library items do not exist as shared components today
  (buttons, inputs, chart frame, badge set, sheet, toast, empty state); see `component-inventory.md`.

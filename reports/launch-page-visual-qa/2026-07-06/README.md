# Launch Page Visual QA - 2026-07-06

Repository: `C:/Users/Garrett/Sports`
Branch: `codex/sunday-frontier-maxforce-2026-07-05`

## Scope

Local-only visual QA for the new public-safe AWS case-study route:

- `/case-studies/aws-governed-sports-intelligence`

No production preview, provider integration, paid service, AWS resource, DNS change, credential, sponsor integration, affiliate link, content publishing, API route promotion, or live cloud action was touched.

## Commands

```bash
npm run test --workspace=apps/web -- aws-case-study-page.test.ts commercial-pages-launch-qa.test.ts media-kit-page.test.ts partners-page.test.ts --reporter=dot --silent
npm run dev --workspace=apps/web -- --hostname 127.0.0.1 --port 3066
BASE_URL=http://127.0.0.1:3066 OUT_DIR=reports/launch-page-visual-qa/2026-07-06/aws-case-study-desktop WIDTH=1440 HEIGHT=1100 FULL_PAGE=1 node scripts/screenshot.mjs /case-studies/aws-governed-sports-intelligence
BASE_URL=http://127.0.0.1:3066 OUT_DIR=reports/launch-page-visual-qa/2026-07-06/aws-case-study-mobile WIDTH=390 HEIGHT=844 FULL_PAGE=1 node scripts/screenshot.mjs /case-studies/aws-governed-sports-intelligence
```

PowerShell set the environment variables with `$env:` syntax during execution.

## Test Result

- Focused route/source tests passed: 4 files, 16 tests.
- App workspace typecheck passed.
- Root validation for the route slice passed before this visual QA run:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run guardrails`
  - `npm run test --workspaces --if-present` (653 files, 8152 tests)
  - `git diff --check`

## Local Render Result

Initial screenshot attempts were started before the route finished compiling and hit `net::ERR_CONNECTION_RESET`. The local server was restarted, the route was probed directly, and the page then returned HTTP 200 before the final captures.

Final local render results:

| Route | Desktop | Mobile |
| --- | --- | --- |
| `/case-studies/aws-governed-sports-intelligence` | HTTP 200; `aws-case-study-desktop/127_0_0_1_3066_case_studies_aws_governed_sports_intelligence.png` | HTTP 200; `aws-case-study-mobile/127_0_0_1_3066_case_studies_aws_governed_sports_intelligence.png` |

## Screenshot Inventory

| Capture | Dimensions | Bytes |
| --- | ---: | ---: |
| `aws-case-study-desktop/127_0_0_1_3066_case_studies_aws_governed_sports_intelligence.png` | 1440x3800 | 792747 |
| `aws-case-study-mobile/127_0_0_1_3066_case_studies_aws_governed_sports_intelligence.png` | 509x6546 | 626523 |

## Visual Sampling Notes

Reviewed both captures directly after generation.

- No blank-page render observed.
- First viewport shows the route brand/nav, case-study label, H1, supporting copy, and CTAs.
- Desktop layout keeps the boundary cards, six-pillar grid, evidence path, locks, and footer readable.
- Mobile layout stacks cleanly; headings, cards, locks, and footer links remain readable.
- No obvious text collision, clipping, or broken stacking observed.
- AWS safety copy stays framed as local governance, not approval, setup, deployment, funding, customer traction, or release readiness.

## Expected Dev Warnings

The local Next dev server emitted existing warnings during render:

- `observability: not wired (no DSN)`
- Sentry/OpenTelemetry `require-in-the-middle` critical dependency warning
- deprecated `images.domains` configuration warning

These warnings were consistent with prior local validation caveats and did not block route rendering.

## Boundary

- No production preview was opened.
- No production route was changed.
- No live provider was wired.
- No AWS account, resource, credential, DNS, or deploy action was used.
- No sponsor or affiliate integration was activated.
- No fake audience, traffic, revenue, win-rate, ROI, calibration, sponsor, partnership, funding, legal-clearance, or cloud-approval claim was added.

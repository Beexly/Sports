# Launch Page Visual QA - 2026-07-05

Repository: `C:/Users/Garrett/Sports`
Branch: `codex/sunday-frontier-maxforce-2026-07-05`

## Scope

Local-only visual and source QA for launch-facing commercial pages:

- `/media-kit`
- `/partners`
- `/newsletter`
- `/content-lab`
- `/podcast`
- `/pricing`

No live production service, paid service, email provider, affiliate link, sponsor integration, AWS resource, or publishing surface was touched.

## Commands

```bash
npm run test --workspace=apps/web -- __tests__/commercial-pages-launch-qa.test.ts __tests__/media-kit-page.test.ts __tests__/partners-page.test.ts __tests__/pricing-honesty.test.ts __tests__/pricing-value-architecture.test.ts
npm run dev --workspace=apps/web -- --hostname 127.0.0.1 --port 3065
MSYS_NO_PATHCONV=1 BASE_URL=http://127.0.0.1:3065 OUT_DIR=reports/launch-page-visual-qa/2026-07-05/desktop WIDTH=1440 HEIGHT=1100 FULL_PAGE=1 node scripts/screenshot.mjs /media-kit /partners /newsletter /content-lab /podcast /pricing
MSYS_NO_PATHCONV=1 BASE_URL=http://127.0.0.1:3065 OUT_DIR=reports/launch-page-visual-qa/2026-07-05/mobile WIDTH=390 HEIGHT=844 FULL_PAGE=1 node scripts/screenshot.mjs /media-kit /partners /newsletter /content-lab /podcast /pricing
```

## Test Result

- `commercial-pages-launch-qa.test.ts`, `media-kit-page.test.ts`, `partners-page.test.ts`, `pricing-honesty.test.ts`, and `pricing-value-architecture.test.ts` passed together.
- Result: 5 test files, 40 tests passed.
- Coverage added in this slice:
  - page metadata and canonical route source checks
  - shared navigation/footer/main landmark checks
  - responsive source contract checks
  - page-specific promise copy checks
  - newsletter lead magnets and draft-only approval copy
  - podcast coming-soon and no-auto-publish copy
  - sponsor/editorial boundary checks
  - no unsupported public proof, fake traffic, fake sponsor, fake ROI, or fake win-rate claims
  - no live provider markers on the launch-only media pages

## Local Render Result

The first screenshot attempt exposed a Windows Git Bash path-conversion issue: route arguments such as `/media-kit` were converted to `C:/Program Files/Git/media-kit`. Those generated bad captures were removed, and the command was rerun with `MSYS_NO_PATHCONV=1`.

Final local render results:

| Route | Desktop | Mobile |
| --- | --- | --- |
| `/media-kit` | HTTP 200; `desktop/127_0_0_1_3065_media_kit.png` | HTTP 200; `mobile/127_0_0_1_3065_media_kit.png` |
| `/partners` | HTTP 200; `desktop/127_0_0_1_3065_partners.png` | HTTP 200; `mobile/127_0_0_1_3065_partners.png` |
| `/newsletter` | HTTP 200; `desktop/127_0_0_1_3065_newsletter.png` | HTTP 200; `mobile/127_0_0_1_3065_newsletter.png` |
| `/content-lab` | HTTP 200; `desktop/127_0_0_1_3065_content_lab.png` | HTTP 200; `mobile/127_0_0_1_3065_content_lab.png` |
| `/podcast` | HTTP 200; `desktop/127_0_0_1_3065_podcast.png` | HTTP 200; `mobile/127_0_0_1_3065_podcast.png` |
| `/pricing` | HTTP 200; `desktop/127_0_0_1_3065_pricing.png` | HTTP 200; `mobile/127_0_0_1_3065_pricing.png` |

## Screenshot Inventory

| Capture | Dimensions | Bytes |
| --- | ---: | ---: |
| `desktop/127_0_0_1_3065_content_lab.png` | 1440x3313 | 779505 |
| `desktop/127_0_0_1_3065_media_kit.png` | 1440x3596 | 727892 |
| `desktop/127_0_0_1_3065_newsletter.png` | 1440x1998 | 445085 |
| `desktop/127_0_0_1_3065_partners.png` | 1440x2606 | 550416 |
| `desktop/127_0_0_1_3065_podcast.png` | 1440x1982 | 454164 |
| `desktop/127_0_0_1_3065_pricing.png` | 1440x4946 | 776988 |
| `mobile/127_0_0_1_3065_content_lab.png` | 390x6895 | 651169 |
| `mobile/127_0_0_1_3065_media_kit.png` | 390x6489 | 518814 |
| `mobile/127_0_0_1_3065_newsletter.png` | 390x3425 | 287201 |
| `mobile/127_0_0_1_3065_partners.png` | 390x4460 | 351178 |
| `mobile/127_0_0_1_3065_podcast.png` | 390x3475 | 275753 |
| `mobile/127_0_0_1_3065_pricing.png` | 390x9207 | 681714 |

## Visual Sampling Notes

Reviewed the mobile `/pricing` and `/media-kit` screenshots directly after capture.

- No blank-page render observed.
- No obvious text collision or broken mobile stacking observed in sampled long pages.
- Sponsor packages and editorial boundaries are visible on `/media-kit`.
- Pricing keeps proof language tied to public record and calibration status, not unsupported verified performance.
- Footer and navigation are visible on sampled captures.

## Expected Dev Warnings

The local Next dev server emitted existing warnings during render:

- `observability: not wired (no DSN)`
- Sentry/OpenTelemetry `require-in-the-middle` critical dependency warning
- deprecated `images.domains` configuration warning

These warnings were already consistent with prior local validation caveats and did not block route rendering. They are not visual failures for this slice.

## Boundary

- No production preview was opened.
- No production route was changed.
- No email provider was wired.
- No podcast feed was published.
- No sponsor or affiliate integration was activated.
- No fake audience, traffic, revenue, win-rate, ROI, calibration, sponsor, or partnership claim was added.

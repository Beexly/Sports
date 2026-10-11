# DISPATCH: Survey Explorer 2 (Plain-English Translation & Tier Restructuring)

## Mission
Investigate R2 (Plain-English Translation / Quant Jargon Purge) and R3 (Tier Restructuring & Elite Value Engine) from ORIGINAL_REQUEST.md across the codebase.

## Working Directory
`C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\teamwork_preview_explorer_survey_2`

## Scope & Instructions
1. Read `C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\ORIGINAL_REQUEST.md` thoroughly.
2. Investigate R2 (Quant Jargon Purge):
   - Locate and examine `apps/web/components/picks/pick-card.tsx` and all customer-facing cards/components for quant acronyms: CPOE, WOPR, RYOE, DAKOTA, ANY/A, de-vig, Brier, raw model version strings.
   - Locate developer telemetry buttons/labels (e.g., literal "JSON" buttons) and identify where to replace them with clear user-facing language ("View Audit Receipt", "Fair Market Value").
   - Check `npm run lint:brand` script and rules, positioning vocabulary tests, and understand what triggers lint errors and how to ensure 100% pass.
3. Investigate R3 (Tier Restructuring & Elite Value Engine):
   - Examine `apps/web/lib/pricing/feature-gates.ts`, `apps/web/app/pricing/page.tsx`, and `packages/types` (or equivalent types packages).
   - Trace the 4-tier matrix: Free, Fantasy, Pro, Elite ($99/mo · $799/yr).
   - Identify high-leverage tools that must be locked strictly behind Elite:
     * Multi-Lineup (150-Max) DFS Optimizer
     * Full Situational & Same-Game Parlay (SGP) Correlation Matrix
     * Real-Time Line Steam & Sharp Movement Alerts
     * Personal CLV & ROI Portfolio Dashboard
   - Trace server-side gating enforcement to ensure client-side bypass is impossible.
   - Trace Pro ($49/mo), Fantasy ($19/mo), Free tier features.
   - Check for any mentions of retired Galaxy Twin or dead features in pricing chrome or feature lists.
4. Output: Write your comprehensive survey report to `handoff.md` in your working directory. Send a message upon completion.


## 2026-10-11T20:42:14Z
You are Survey Explorer 2 for the Galaxy Sports Edge (GSE) architectural overhaul.
Your working directory is: C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\teamwork_preview_explorer_survey_2
Read your instructions in C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\teamwork_preview_explorer_survey_2\DISPATCH.md and C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\ORIGINAL_REQUEST.md.

Focus: R2 (Plain-English Translation / Quant Jargon Purge) & R3 (Tier Restructuring & Elite Value Engine).
Investigate:
1. R2 Quant Jargon Purge:
   - Identify all customer-facing cards and components (specifically apps/web/components/picks/pick-card.tsx and any others) containing quant developer acronyms: CPOE, WOPR, RYOE, DAKOTA, ANY/A, de-vig, Brier, or raw model version strings.
   - Developer telemetry buttons/labels (e.g. literal 'JSON' buttons) to be replaced with clear user-facing language ('View Audit Receipt', 'Fair Market Value').
   - Brand linter: examine npm run lint:brand script and rules, brand safety vocabulary tests, and understand requirements for 100% pass.
2. R3 Tier Restructuring & Elite Value Engine:
   - Examine apps/web/lib/pricing/feature-gates.ts, apps/web/app/pricing/page.tsx, packages/types.
   - Trace the 4-tier matrix: Free, Fantasy ($19/mo), Pro ($49/mo), Elite ($99/mo · $799/yr).
   - High-leverage tools locked strictly behind Elite:
     * Multi-Lineup (150-Max) DFS Optimizer
     * Full Situational & Same-Game Parlay (SGP) Correlation Matrix
     * Real-Time Line Steam & Sharp Movement Alerts
     * Personal CLV & ROI Portfolio Dashboard
   - Server-side gating verification (ensure client-side bypass is impossible).
   - Verify elimination of retired Galaxy Twin or dead features from pricing chrome.

Maintain progress.md in your working directory.
When complete, write your full findings and implementation blueprint to handoff.md in your working directory, and notify me with send_message.

# Unsupported Claims

The following claims are explicitly downgraded.

| Claim | Status | Why |
| --- | --- | --- |
| legal cleared | unsupported | Source rights registry is evidence for individual source status, not broad legal clearance. |
| superior edge | unsupported | No measured incumbent comparison proves it. |
| parity+ | unsupported | No comparative benchmark proves it. |
| .5+ gain | unsupported | No repo-data calibration replay proves it. |
| .5+ Brier/ECE gain | unsupported | No command output or report proves it. |
| Ground Truth Plus | false for this repo | Local manifest only; no AWS labeling provider configured. |
| Ground Truth configured | false for this repo | Local manifest only; no AWS job configured. |
| green cycles | false as a broad claim | Workspace typecheck has an existing BigInt target failure. |
| production-ready | false as a broad claim | No deployment, source-rights, data, and typecheck evidence supports this. |
| AWS deployed | false | No AWS account mutation or deploy occurred. |
| official NGS | unsupported without source-specific evidence | nflverse/NGS-related repo surfaces exist, but official licensed tracking status must not be inferred. |
| full leverage complete | unsupported | AWS service leverage is scored and gated, not live-complete. |
| Ground Truth Plus integrated | false for this repo | Local workflow pattern only; no AWS provider configured. |

The scanner allows these phrases only when clearly marked historical, unverified, unsupported, blocked, false, or tied to an evidence id.

## OneNote And Historical Prompt Claims

These exact historical phrases are downgraded:

- unsupported historical claim: `legal cleared`
- unsupported historical claim: `superior edge`
- unsupported historical claim: `parity+`
- unsupported historical claim: `.5+ gain`
- false historical claim for this repo: `Ground Truth Plus integrated`
- false broad-status claim until all checks pass: `green cycles`
- unsupported historical claim: `official NGS-like parity`
- unsupported historical claim: `full leverage complete`

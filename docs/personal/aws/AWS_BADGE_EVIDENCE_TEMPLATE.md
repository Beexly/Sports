# AWS Badge Evidence Template

Use this template when a badge or course completion is ready to become public evidence.

## Required Fields

- Learning provider:
- Badge or course name:
- Completion status:
- Date completed:
- Proof type:
- Proof link or repo path:
- Public-safe review status:
- GSE relevance:
- Repo action:
- No secrets confirmed:
- No paid resource confirmed:
- Owner approved for public use:

## Accepted Proof Types

- `course_name_only`: safe when completion is not being publicly claimed.
- `learning_summary`: safe when it avoids personal account or application details.
- `approved_screenshot_path`: safe only after screenshots are reviewed and stored without personal data.
- `public_badge_url`: safe only after owner approval.
- `not_yet_public`: default for planned or in-progress learning.

## Redaction Rules

- Crop or redact account headers.
- Remove email addresses unless explicitly approved.
- Remove AWS account IDs and resource ARNs.
- Remove timestamps that identify private console activity unless needed and approved.
- Never include credentials, billing panels, or private application forms.

## Repository Rule

If the proof is not owner-approved for public use, keep `proof_type` as `not_yet_public`, avoid external links, and describe only the intended GSE/FABLE relevance.

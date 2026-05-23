# Validation Protocol

Status: required before handoff, PR, or major continuation

This document records how to validate the monetization v3 operating system without relying on memory.

## Standard Command

Run from the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\docs\monetization-v3\tools\validate-monetization-v3.ps1
```

The script checks:

- Local Markdown links in `README.md`, `.github/`, and `docs/monetization-v3/`.
- Backticked local file references that look like real source files.
- Every CSV template under `docs/monetization-v3/` using `Import-Csv`.
- High-signal drift patterns that previously caused integrity problems, including referral/press decision ID collisions, public "AI" drift, press-kit transparency claims, support-script guarantee drift, and Live legal-gate softening.

## Strict Brand Scan

For a noisy full-doc scan:

```powershell
powershell -ExecutionPolicy Bypass -File .\docs\monetization-v3\tools\validate-monetization-v3.ps1 -StrictBrandScan
```

This scans all v3 docs for the prohibited vocabulary in `brand-safety-checklist.md`. It will flag intentional internal examples, audit quotes, and banned-term documentation. Treat strict mode as a review aid, not a clean-pass requirement; strict findings are warnings and do not fail validation.

## When To Run

Run the standard command:

- Before final handoff to Garrett.
- Before any PR touching v3 docs.
- After adding imported Claude/Codex artifacts.
- After changing decision-log numbering.
- After changing public copy, press copy, support scripts, referral mechanics, Live legal language, or Almanac dates.

## What Counts As Failure

Any standard validation failure should be fixed before handoff unless there is a written reason in `11-self-audit.md`.

Examples:

- Broken local Markdown link.
- Broken backticked local file reference.
- CSV template no longer parses.
- Press kit reintroduces "built on transparency" instead of demonstrating public record surfaces.
- Press kit or public copy reintroduces "AI" framing.
- `DEC-NEXT-009` is reused for anything other than referral policy.
- Live agreement language is softened from lawyer-approved use to merely "template ready."

## Relationship To App Scanner

Once the real Galaxy app repo is active, this protocol does not replace the app compliance scanner. It is the docs-side preflight. Public copy must still pass the production scanner before publication.

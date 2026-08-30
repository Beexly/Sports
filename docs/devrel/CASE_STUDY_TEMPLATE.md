# Governed agents on {PLATFORM}

This is a template for future case-study authors — not a filled example.
Replace `{PLATFORM}` and every bracketed placeholder with real content
before publishing. Read the NON-CLAIMS section before writing anything.

## Problem

Describe the concrete operational problem the reader had before adopting
governed agents on this platform (1-2 short paragraphs). Be specific about
scope and scale — avoid vague claims like "massive" or "unprecedented".

## Architecture (diagram)

A short description plus a diagram (link or embed) of how the governed-agent
stack sits on top of {PLATFORM}: which services are used, where receipts are
signed/verified, where the governance boundary sits relative to the
platform's own infrastructure.

## Metrics (refuse rate, cost saved, verify checks)

Report only metrics you can trace to a real computed source:

- **Usage / cost proxy** — from `usageSummary()` output
  (`apps/web/lib/platform/usage-meter.ts`). Always label cost figures as a
  proxy (`estUsd`), never as an authoritative invoice number.
- **Receipt counts** (signed / verified) — from the receipt-signing /
  verification telemetry, cited by exact source.
- **Refuse rate** — computed from the same receipt/decision log, cited by
  exact source.

Every number in this section must cite where it came from. If a real number
isn't available yet, write "TBD — pending [source]" rather than estimating
or fabricating one.

## NON-CLAIMS

State plainly what this case study does NOT claim, so a reader (or a
platform's marketing/legal reviewer) never has to guess:

- No compliance or certification claims (e.g. do not imply SOC2, ISO, HIPAA,
  or similar certification unless a real, current certificate exists and is
  cited).
- No "unprecedented", "first-ever", "revolutionary", or similar superlative
  language.
- No "permanent" or "unassailable" uniqueness/moat claims — any competitive
  advantage described here is a point-in-time lead, not a durability claim.
- Every metric in this document must cite its real source (usageSummary
  output, receipt counts, or another named source) — never a fabricated or
  rounded-for-effect number presented as exact.

## Quote

A real, attributed quote from a real person at the platform or the customer,
obtained with their permission to publish. Leave as `[Quote pending]` until
one exists — do not draft a placeholder quote that reads like a real one.

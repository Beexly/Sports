# SiriusXM Connection — Legal Posture

**Status: `permission_required`** (source-rights registry: `siriusxm-streaming`)
**Reviewed:** 2026-06-12 · Customer Agreement dated 2025-06-05

## What the agreement says (the parts that decide this)

| Clause | Effect on us |
|---|---|
| §9(d) Personal Use | Subscription is personal, non-commercial, household-only. Our platform use is commercial. |
| §9(l) AI Matters | **No web scraping/extraction. Services data may not be used to create, train, or improve any AI service — directly or indirectly.** This bans automated capture/transcription/claim-extraction regardless of subscription tier. |
| §9(j) Code of Conduct | No reproducing/reselling/exploiting any resource on the Service. |
| §11 Content | All content is SiriusXM's or its licensors'; no rights granted by subscribing. |

**Bottom line:** the owner's paid plan does not unlock any automated pipeline.
Stream capture, transcription, or AI claim-extraction from SiriusXM audio is
prohibited by contract. The `siriusxm-activator` tool remains permanently
excluded (circumvents paid activation).

## The two legal lanes

### Lane 1 — Manual listener log (available today)
A human listens on their own subscription and manually enters short factual
claims into Airwave intake: *pundit name, claim, date/show*. Facts with
attribution — no recordings, no transcripts of expression, no automation
touching the SiriusXM stream or app. This matches Airwave's existing
manual-intake lane and the registry's attribution text.

### Lane 2 — Written license (unlocks automation)
A signed agreement with Sirius XM Radio LLC covering automated capture or
analysis. Until countersigned paper exists, every flag in the registry stays
`false`.

**Outreach draft** (send from the founder's address):

> Subject: Content licensing inquiry — sports audio analysis
>
> Hello — I run Galaxy Sports Edge, a sports analytics platform that
> verifies public predictions against results. We'd like to discuss a
> license to analyze sports-talk programming (e.g., Fantasy Sports Radio)
> for short factual claim extraction with on-air attribution. We are not
> seeking to rebroadcast, store, or redistribute audio. Could you point me
> to the right team for content/data licensing?
>
> [Name · company · contact]

Find the right channel via SiriusXM business/partnerships pages; the
customer-care addresses in the agreement are not the licensing desk.

## Engineering invariants

- `checkClearance("siriusxm-streaming")` returns `allowed=false` for any
  automated job — and must keep doing so until a license is on file.
- Manual Airwave entries citing SiriusXM must carry the registry
  attribution text and a `manual_listener_log` provenance marker.
- Free podcast/YouTube versions of the same shows (where hosts publish
  them openly) are separate sources — evaluate them on their own terms
  via the registry before any ingestion; many shows publish RSS feeds
  with far friendlier terms.

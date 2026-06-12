# Source evaluation: Jeff Mans public weekly show feed (One MANS Opinion)

_Dated 2026-06-12. Per owner directive (POLISH_BACKLOG #6): evaluate the PUBLIC feed
(podcast/YouTube) of Jeff Mans's weekly show through the rights registry as its own
source. SiriusXM corporate licensing is PARKED per owner and explicitly out of scope._

## TL;DR decision

| Question | Answer |
|----------|--------|
| Registry entry | `jeff-mans-public-feed` in `apps/web/lib/scraping/source-rights-registry.ts` |
| Status | **`permission_required`** |
| Automation today | **No.** All permission flags false until written consent |
| Allowed today | Manual listener log of factual claims + episode link-outs with attribution |
| Gate to unlock | Written consent from Jeff Mans / FantasyGuru.com (Elite Sports Network) |

## What the source is

"One MANS Opinion with Jeff Mans" — a weekly fantasy sports / picks podcast hosted by
Jeff Mans (owner of FantasyGuru.com, SiriusXM fantasy host). Public distribution
channels confirmed by search (2026-06-12):

- Podbean show page (canonical public feed host): https://manspod.podbean.com
- Apple Podcasts: https://podcasts.apple.com/us/podcast/one-mans-opinion-with-jeff-mans/id1500323362
- FantasyGuru show page: https://www.fantasyguru.com/one-mans-opinion-with-jeff-mans

No dedicated YouTube channel for the show was confirmed; if one is identified later it
is the same source lane and the same status applies — do not treat a YouTube upload as
a separate, more permissive channel (YouTube ToS also prohibit unauthorized automated
access).

**Scope boundary (owner directive):** ONLY this independent public feed is in scope.
The SiriusXM-gated version of his content remains governed by the `siriusxm-streaming`
entry (`permission_required`, AI-matters clause, manual listener log only). SiriusXM
corporate licensing is parked per owner. Nothing in this evaluation unlocks SiriusXM.

## What we could lawfully extract (if/when cleared)

Per `apps/web/lib/scraping/data-rules.ts`, only these categories — ever:

- **Facts**: short factual claims made on the show (pundit, claim, date) — e.g.
  "Mans said X is his top WR play for Week 3" as a logged claim with attribution
- **Metadata**: episode title, publish date, duration, episode URL
- **URLs / source references**: link-outs to the episode for users to listen
- **Derived signals we generate**: our own pundit-claim tracking built on logged facts

**Never extractable, regardless of status**: episode audio or transcripts for
republication, episode bodies/show notes for republication, his rankings/picks lists
wholesale (proprietary predictions tied to the paid FantasyGuru product), artwork or
logos, anything account-gated.

## Status decision and rationale

**`permission_required`** — the most conservative justified status. Why not the
alternatives:

- **Not `approved_public_logged_off`**: a podcast RSS feed is publicly syndicated for
  listening clients, but the content is copyrighted expression and the show's picks are
  plausibly proprietary predictions of a commercial product (FantasyGuru). Public
  availability for listening is not a basis to approve automated commercial extraction.
- **Not `approved_api` / `approved_open_license` / `approved_written_permission`**:
  no license, no open-license grant, no written permission exists. Marking any
  `approved_*` would fabricate a basis we do not have.
- **Not `vendor_candidate`**: no commercial data/API/licensing program is publicly
  offered for this show. `vendor_candidate` would overstate what exists; the realistic
  unlock path is direct written consent, which is exactly what `permission_required`
  encodes.
- Host-platform terms (Podbean; Apple/YouTube directories) govern automated access and
  reuse. Exact ToS text was not verified in this pass (`terms_url: null` in the entry),
  so per the conservative posture we assume restrictive until confirmed during outreach.

All permission flags are `false`. `copyright_expression_risk: high` (spoken commentary
and analysis are pure expression), `database_right_risk: low`, `personal_data_risk: low`.

## What is allowed TODAY (no consent needed)

Same lane as `siriusxm-streaming`: a human listens to public episodes and manually logs
short factual claims (pundit, claim, date, episode link) with attribution
("Claim heard on One MANS Opinion with Jeff Mans"). No recordings, no transcripts, no
automated capture, no scraping of show pages, no republication of episode content.
`manual_research_note` mode via the clearance engine; the engine blocks everything else.

## Gating action required before ANY automation

1. **Written consent** from Jeff Mans / FantasyGuru.com (Elite Sports Network) covering:
   automated feed polling, storage of episode metadata, and commercial display of
   logged factual claims with attribution. Contact: https://www.fantasyguru.com/contact-us/
2. Confirm host-platform terms (Podbean, and Apple/YouTube if used as access points)
   permit the specific access method; record the exact ToS URLs in the registry entry.
3. On receipt of consent: update the entry to `approved_written_permission`, set only
   the flags the consent actually grants, attach the consent document to
   `evidence_urls`, and re-run the clearance test suite.

Until then `checkClearance()` blocks every automated mode for this source by design.

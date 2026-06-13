# Vendor Questionnaire — Jeff Mans / One MANS Opinion

> Registry entry: `jeff-mans-one-mans-opinion` (status: `vendor_candidate`).
> Owner directive (POLISH_BACKLOG #6): evaluate the weekly show's **public
> feed** as its own source. SiriusXM corporate licensing is **parked** and out
> of scope here. This document is also the reusable template — copy it for any
> future `vendor_candidate` (e.g. `score24-com`).

## Part A — What we verified (internal, 2026-06-12)

| Question | Finding |
|---|---|
| Does the show exist as a public feed? | Yes — "One MANS Opinion with Jeff Mans", weekly (Friday-night NFL DFS focus in season) |
| Where is it distributed? | Podbean (manspod.podbean.com), Apple Podcasts (id1500323362), TuneIn; part of FantasyGuru ELITE+ Podcast Network |
| Is the feed openly syndicated (RSS)? | Yes — Podbean-hosted public podcast |
| Is any of it behind a paywall? | The public feed is free; FantasyGuru premium content is separate and out of scope |
| Whose terms govern? | Show/network owner (Jeff Mans / Fantasy Guru) for the content; Podbean ToS for the host platform; no show-specific terms page found |
| Overlap with excluded/parked sources? | Mans also appears on SiriusXM — that distribution stays under `siriusxm-streaming` (permission_required, corporate lane parked per owner) |

## Part B — What we want (the use case, stated honestly)

1. **Pundit-claim accountability**: log paraphrased, attributed, dated claims
   ("Mans on X player, week N") and grade them publicly over time. The Airwave
   source policy already allows this **manually** for `podcast_rss` at LOW risk.
2. **NOT wanted as model input**: his picks/analysis are proprietary
   predictions — `data-rules.ts` forbids extracting them as engine inputs,
   license or no license.
3. **Possible partnership upside** (owner's "licensable pundit lane"): named
   collaboration, licensed segments, or cross-promotion — a business call, not
   an extraction question.

## Part C — Questions for the vendor (Fantasy Guru / Jeff Mans)

1. Who holds the rights to the show's audio and to clips/derivatives — Mans
   personally, Fantasy Guru, or the network?
2. Is automated transcription of the public feed for internal claim-logging
   acceptable with attribution? Under what terms?
3. May paraphrased claims with attribution appear on a public accountability
   surface (graded over time, win AND loss)?
4. Is there interest in a formal content partnership (licensed segments,
   named presence on the platform)?
5. Any existing exclusivity (e.g. with SiriusXM) that limits what the public
   feed can be used for commercially?
6. Preferred attribution format and link target?
7. Who is the contract counterparty and signatory?

## Part D — Decision gates

| Outcome | Registry action |
|---|---|
| Written license for automated capture + analytics | → `approved_written_permission`, flags per contract |
| Permission for manual/paraphrase lane only | stays `vendor_candidate`; Airwave manual lane continues; automation stays off |
| No response / refusal | stays `vendor_candidate` with automation off; manual Airwave lane only (it never required their sign-off) |
| Cease & desist | flags update immediately; all activity stops pending legal review |

**Until Part C is answered and the owner signs off, every automation flag in
the registry entry stays `false`.** The clearance engine enforces this — no
extraction job can run against this source.

## Status

- [x] Part A — internal verification complete (2026-06-12)
- [x] Part B — use case defined
- [ ] Part C — sent to vendor (OWNER: outreach via fantasyguru.com)
- [ ] Part D — decision recorded + registry updated

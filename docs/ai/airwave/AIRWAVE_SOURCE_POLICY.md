# Airwave Source Policy Reference

> All source policies are defined in `apps/web/lib/airwave/source-policy.ts`.
> This document is the human-readable companion.

---

## Allowed Source Types

| ID | Label | Allowed Use | Risk |
|---|---|---|---|
| `public_youtube` | Public YouTube show feed | Paraphrased claims, entity tags, GSE/GSN signals | LOW |
| `podcast_rss` | Podcast RSS feed | Paraphrased claims, segment ideas | LOW |
| `beat_report` | Beat reporter mesh | Injury/role/depth alerts, GSE evidence | MEDIUM |
| `official_team_feed` | Official team news | Injury/roster/practice notes | LOW |
| `official_league_feed` | Official league data | Structured game data, GSE model input | LOW |
| `odds_market_context` | Odds / market feed | Line snapshots, market signals | LOW |
| `operator_transcript_import` | CSV/TSV import | Paraphrased claims, entity tags | LOW |
| `founder_local_listening` | Founder notes | Manual paraphrased notes | MEDIUM |
| `satellite_radio_context` | SiriusXM-class | **HELD** — paraphrased claims only after legal ACK | HIGH |
| `studio_handoff` | Galaxy Studio | Drafts, briefs, segment ideas | LOW |

---

## Forbidden Behavior (All Sources)

The following are forbidden regardless of source:

1. **Raw audio archive** — no audio files are retained at any point
2. **Verbatim transcript storage (public)** — no full transcript text is published
3. **Auto-publish** — no output goes to any external channel without operator approval
4. **Source pointer in public output** — clip refs, file paths, feed URLs, channel IDs are private
5. **Scraping protected endpoints** — no automated access to SiriusXM or equivalent APIs
6. **Credential automation** — no automated account login or session management
7. **DRM bypass** — no circumvention of any content protection
8. **Stream ripping** — no recording of encrypted or unencrypted streams
9. **Pick evidence from unfalsifiable claims** — UNFALSIFIABLE claims cannot produce GSE pick evidence
10. **Full quote publication** — paraphrase only; no verbatim quotes in public output

---

## Source Risk Levels

**LOW** — Public, freely distributed content with clear rights posture. Minimal legal exposure.
- `public_youtube`, `podcast_rss`, `official_team_feed`, `official_league_feed`, `odds_market_context`, `operator_transcript_import`, `studio_handoff`

**MEDIUM** — Licensed, private, or manually curated content. Requires more careful rights review.
- `beat_report`, `founder_local_listening`

**HIGH** — Satellite radio. Terms of service require explicit acknowledgement. Manual-only.
- `satellite_radio_context`

---

## Public/Private Field Split

### Always Private (never in public output)
- `source_pointer` / `clip_ref` — internal reference to where a claim came from
- `file_path` — local transcript file path
- `feed_url` / `rss_url` / `video_id` / `episode_guid` — feed identifiers
- `account_credentials` — any authentication material
- `stream_url` / `channel_id` — stream location data
- `raw_transcript_text` — the full unedited transcript
- `review_notes` — internal operator notes

### May Appear in Public Output (after operator approval)
- `paraphrased_claim` — the derived paraphrase
- `sport`, `entity`, `claim_type`, `aired_at_ct`, `show`, `segment`, `speaker`
- `confidence_language`, `actionability`, `evidence_type`
- `rights_status`, `operator_status` (sanitized)
- `public_safe` — the gate flag itself

---

## Review Rules

Every claim candidate requires:

1. `paraphrased_claim` — must be non-empty
2. `rights_status` — must be set (OWNED / PUBLIC / LICENSED / PERMISSION_REQUIRED / HELD)
3. `operator_status` — must be set (DRAFT / REVIEW / APPROVED / REJECTED / SETTLED)
4. For public output: `operator_status = APPROVED` and `rights_status` in (OWNED, PUBLIC, LICENSED)
5. For public output: `public_safe = true` set explicitly by operator

---

## Rights Statuses

| Status | Meaning | Can Go Public? |
|---|---|---|
| `OWNED` | Operator owns the content | Yes, after review |
| `PUBLIC` | Freely published public source | Yes, after review |
| `LICENSED` | Licensed under subscription or agreement | Yes, after review |
| `PERMISSION_REQUIRED` | Requires explicit permission not yet obtained | No |
| `HELD` | Rights are uncertain or denied | No |

---

## Operator Statuses

| Status | Meaning | Can Go Public? |
|---|---|---|
| `DRAFT` | Not yet reviewed | No |
| `REVIEW` | Under operator review | No |
| `APPROVED` | Operator has approved | Yes (if rights also clear) |
| `REJECTED` | Operator has rejected | No |
| `SETTLED` | Claim has been settled against outcome | Yes |

---

## Compliance Notes by Source

### satellite_radio_context
- SiriusXM Subscriber Agreement prohibits recording, redistribution, and automation
- No scraping of any SiriusXM endpoint
- No DRM bypass
- No stream ripping
- No account automation or credential sharing
- Founder personal subscription for live listening only
- Notes are personal observation — paraphrase before any publication
- Legal acknowledgement (`AIRWAVE_SIRIUSXM_LEGAL_ACK`) required

### public_youtube / podcast_rss
- Respect platform terms and fair-use limits
- No re-hosting of video or audio
- No long quote reproduction
- Paraphrase only
- Operator review before external publication

### beat_report
- Cite source and outlet
- Summarize facts; do not reproduce full articles or paywalled text
- License agreement or attribution terms required

### odds_market_context
- The Odds API license terms apply
- Do not sublicense raw odds data
- Derive signals and publish summaries; not raw feeds

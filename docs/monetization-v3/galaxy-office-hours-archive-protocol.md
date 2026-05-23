# Galaxy Vault Office Hours — Archive Protocol

**Audience:** Garrett. Internal.
**Pairs with:** `copy/vault-office-hours-playbook.md` (how to run office hours) + `product/admin-operations-spec.md` (Codex's infrastructure).

**Purpose:** Office hours recordings accumulate over Year 1. The archive needs an operating protocol — how recordings get stored, who accesses them, when they're deleted, how members search them.

---

## Recording mechanics

### During the office hours session

- Discord stage cloud recording is enabled (per `copy/vault-office-hours-playbook.md` Day-of checklist).
- Recording captures: Garrett's audio + camera, member audio when they speak.
- Recording does NOT capture: Discord chat sidebar, member camera streams (most members keep camera off), screen shares.

### Within 24 hours after the session

- Recording uploaded to `#vault-office-hours` Discord channel as a video file.
- File name format: `vault-oh-YYYY-MM.mp4` (e.g., `vault-oh-2026-05.mp4`).
- Garrett posts a 3-5 sentence summary post in `#vault-lounge` linking to the recording.
- Auto-transcript generated (Otter / Discord native / equivalent) and pinned to `#vault-office-hours` alongside the recording.

### Storage

- Primary storage: Discord (members-only access).
- Backup storage: Garrett's local drive (encrypted backup, weekly sync).
- No public storage. No YouTube upload. No public-facing transcript.

---

## Member access to the archive

### Active Vault members

- See all recordings indefinitely while their subscription is active.
- Discord channel `#vault-office-hours` shows recording links in reverse-chronological order.
- Pinned recordings: the most recent 6 sessions stay pinned for easy access.
- Older recordings stay accessible via Discord scroll/search.

### Canceled Vault members (term-active)

- Continue to access recordings through the end of their prepaid term.
- After term expires: Discord role removed; channel access lost.

### Former Vault members (term-expired)

- Lose access to the archive.
- Can request a personal export of recordings they participated in (i.e., recordings during their active subscription term) per `galaxy-data-retention-privacy-policy.md` § Right to portability.

### Non-members

- No access.
- Galaxy doesn't share office hours content publicly.

---

## Transcript handling

Each recording has an auto-generated transcript.

### Transcript access

- Members access transcripts via Discord pinned message linking to the transcript file.
- Transcripts are searchable: members can search text across all transcripts to find topics.
- Transcripts include speaker labels (Garrett + members; member names display as Discord handles).

### Transcript privacy

- Member-speaker names appear in transcripts as Discord handles, not real names.
- If a member requests their handle redacted from the public transcript: Garrett re-runs the transcript with the member redacted. Affected transcripts re-uploaded.
- Members who attend but don't speak: no name in transcript.

### Transcript correction

- Auto-transcripts have ~95% accuracy. Garrett occasionally corrects egregious errors (factor names mis-transcribed, technical terms wrong).
- Major corrections: re-run transcript, re-upload. Indicate in pinned message: "Transcript updated [date] to correct factor-name accuracy."
- Minor errors: not corrected. Members forgive small transcription quirks.

---

## Searchability

After Year 1, Galaxy has 12 office hours recordings + transcripts. By Year 2-3, 24-36. By Year 5: 60+.

The archive becomes a corpus.

### Search across the archive

- Members can search Discord-channel text (via Discord's search) for keywords in transcript content.
- Transcripts include speaker labels + timestamps for navigation.
- Garrett occasionally posts summary thread in `#vault-office-hours` linking to most-referenced past discussions.

### Future enhancement (Year 2+)

- A dedicated search interface in the member dashboard (`/vault/office-hours/search`).
- Index by topic: "all discussions on factor weighting," "all discussions on NHL coverage."
- This is a Year-2 product feature; not part of V1.

---

## Retention policy

### Indefinite retention

Galaxy retains office hours recordings indefinitely as long as the company operates. The archive is a brand-position asset.

### Deletion exceptions

- Member-requested redaction: specific moments where a member's name appears can be redacted (audio + transcript).
- Inappropriate content: if a recording contains content that violates community standards or causes member harm, Garrett may edit or remove. Decision-log entry required.
- Discord platform limits: if Discord ever caps file storage or deletes old uploads, recordings get migrated to alternate cloud storage with members notified.

### Archive when Vault sunsets

Per `launch/vault-sunset-playbook.md`:
- Recordings stay accessible to former members for 90 days post-term-end.
- After 90 days: recordings archived (read-only access for prior members continues for 90 days).
- After 1 year: recordings removed from active access; downloadable archive sent to all former members who held Vault during the recording period.

---

## What the archive becomes over time

### Year 1 (current)

- 12 recordings + transcripts.
- ~1,000 members eligible to access.
- Reference: members occasionally revisit past discussions on methodology questions.

### Year 2

- 24 recordings + transcripts.
- ~3,000-5,000 members eligible (post-V2 cap-lift, if applicable).
- Reference: new members backfill via "the most-watched 3 OHs" curated list.

### Year 3+

- 36+ recordings + transcripts.
- The archive becomes a referenced corpus in Galaxy's broader work — methodology page expansions cite specific OH discussions; Almanac essays draw on recurring questions; press interviews reference specific OH discussions.

### Year 5+

- 60+ recordings.
- The corpus becomes searchable + indexed (Year-2+ product feature).
- Members reference the archive years later when methodology questions resurface.

---

## How the archive feeds other Galaxy work

### Almanac source material

Per `copy/almanac-production-pack.md`, supporting essays often draw on Vault discussions. The OH archive is a primary source.

Specifically:
- "How the autopsy gets written" essay references specific OH discussions where autopsies were debated.
- "What 2026 didn't teach us" essay reflects on questions surfaced in OH that Galaxy didn't yet have answers to.
- Other supporting essays may cite member-raised concerns from OH discussions.

Citations are anonymized by default. Members can be named with their explicit consent.

### Methodology page updates

OH discussions sometimes surface methodology questions that the public page doesn't fully address. These become candidates for new sections of the methodology FAQ (per `copy/methodology-faq.md`).

### Year-end annual report

Per `copy/galaxy-year-end-annual-report-template.md` Section 7, the annual report's "open questions" section frequently references questions raised in Vault office hours.

---

## Operational maintenance

### Per session

- Garrett uploads recording within 24 hours.
- Transcript is generated + uploaded with the recording.
- Summary post in `#vault-lounge` (3-5 sentences).
- New session pinned in `#vault-office-hours`; oldest pinned session unpinned (6-session pin window).

### Quarterly maintenance

- Garrett reviews the past quarter's recordings.
- Notes any moments worth re-surfacing in upcoming digests, methodology updates, or Almanac essays.
- Updates the "most-watched" curated list (if maintained).

### Annual maintenance

- Garrett reviews the year's archive.
- Notes any patterns: which topics came up most often, what questions Galaxy couldn't yet answer.
- Feeds into Year-end annual report + Almanac.
- Archives the year's batch in `templates/oh-archive-2026/` for backup.

---

## What this archive protocol deliberately does NOT do

1. **No public sharing of recordings.** Vault office hours are private; recordings stay private.
2. **No AI-generated summaries shared with members.** Garrett may use Claude internally to summarize for retrospective work, but member-facing summaries are Garrett-written.
3. **No analytics on member listening behavior.** Galaxy doesn't track who watched which recording for how long.
4. **No marketing-clip extraction.** No "best moments" reels for social media.
5. **No paid access tiers within the archive.** All Vault members have equal archive access. Pro/Elite don't get a "preview" tier.
6. **No partner-facing access.** Press, contractors, partners cannot access OH recordings without explicit Garrett approval per case.

---

## Cross-references

- Vault office hours playbook: `copy/vault-office-hours-playbook.md`
- Admin operations spec (storage infrastructure): `product/admin-operations-spec.md`
- Data retention + privacy policy: `galaxy-data-retention-privacy-policy.md`
- Sunset playbook (what happens to archive at sunset): `launch/vault-sunset-playbook.md`
- Almanac production pack (how archive feeds essays): `copy/almanac-production-pack.md`
- Methodology FAQ (where OH questions become public): `copy/methodology-faq.md`
- Year-end annual report (where archive feeds open questions): `copy/galaxy-year-end-annual-report-template.md`

---

*The office hours archive compounds across years. By Year 5, it's the corpus Galaxy can't have built any other way. Treat each recording like a future-Galaxy reader will reference it. Upload promptly; transcribe accurately; preserve indefinitely.*

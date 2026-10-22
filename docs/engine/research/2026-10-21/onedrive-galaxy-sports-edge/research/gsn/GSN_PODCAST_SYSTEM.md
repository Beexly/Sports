# GSN Podcast System

Date: 2026-06-10
Scope: Weekly sports intelligence podcast using reviewed GSN material only

## Purpose

The GSN podcast should translate approved sports intelligence into a clear weekly audio product. It must educate listeners on uncertainty, market movement, source quality, volatility, and disciplined decision-making. It must not become fake-confidence betting content.

## Episode Format

Target length: 18-28 minutes

Cadence: weekly, with optional short clips after major sports-news volatility

Default sections:

1. Opening disclosure
2. Market radar recap
3. Injury/news volatility pulse
4. Sharp vs public divergence explainer
5. No-Bet intelligence segment
6. Trust receipt spotlight
7. Post-game autopsy
8. Week-ahead watchlist
9. Responsible decision-making close

## Segment Structure

### Opening Disclosure

Purpose: Set expectations and avoid deceptive AI/audio framing.

Required language:

```text
This episode is generated from a reviewed GSN intelligence packet. Any AI-generated narration is disclosed in the episode notes. GSN does not guarantee outcomes, and No Bet is always a valid intelligent decision.
```

### Market Radar Recap

Inputs:

- Approved line movement notes
- Freshness state
- Market volatility level
- Source receipts

Output:

- 3-5 biggest movement stories
- Why the movement matters
- What remains uncertain

Do not say:

- "Lock"
- "Guaranteed"
- "Can't miss"
- "Free money"
- "The model knows"

### Injury/News Volatility Pulse

Inputs:

- Official injury reports
- Team announcements
- Reviewed reporter notes
- Timestamped updates

Output:

- What changed
- How fresh it is
- What it affects
- Whether it is publishable, developing, or quarantined

Do not say:

- Unverified injury claims as fact
- Rumors without quarantine label
- Medical certainty GSN cannot support

### Sharp vs Public Explainer

Inputs:

- Licensed market data only, or clearly labeled educational/demo examples
- Source receipts
- Movement timeline

Output:

- What divergence means
- Why divergence can be noisy
- How it affected the week's watchlist

Do not say:

- Claims about sharp money without licensed or verified source basis
- "The public is always wrong"

### No-Bet Education Segment

Inputs:

- No-Bet reason taxonomy
- Example signal packet
- Post-game autopsy if available

Output:

- One clear lesson on why not acting can be intelligent
- The precise blocker
- What would need to change

Do not say:

- "Nothing to do here" without explanation
- "Pass because scared"
- Any language that frames restraint as weakness

### Trust Receipt Spotlight

Inputs:

- One approved signal with strong source chain
- One rejected/quarantined signal if useful

Output:

- Show how GSN decides what is credible
- Explain source classes and freshness
- Teach listeners how to think about evidence

Do not say:

- Private source names if restricted
- Unlicensed data details
- Internal model weights or proprietary edge logic

### Post-Game Autopsy

Inputs:

- Final result
- Pre-game source packet
- Recommendation state history
- Confidence decay history

Output:

- What the system got right
- What it missed
- Whether No-Bet or Wait would have been smarter
- Process improvements

Do not say:

- Hindsight certainty
- Blame-shifting
- Unverified claims after the fact

## Source Review Workflow

1. Collect candidate signals.
2. Normalize each evidence item.
3. Score source quality.
4. Mark freshness and fresh-until timestamp.
5. Identify conflicts.
6. Quarantine rumor/social-only claims.
7. Human reviewer approves publishable claims.
8. Lock episode packet.
9. Generate script from locked packet only.

## Human Approval Workflow

Required approval gates:

1. Data packet approved.
2. Script approved.
3. Compliance language approved.
4. Voice generation approved.
5. Final audio approved.
6. Clip exports approved.

Approval record fields:

- `approver_id`
- `approved_at`
- `approval_scope`
- `packet_version`
- `notes`
- `revoked_at`

## Voice Generation Workflow

NeuTTS-Air is relevant as an on-device TTS/voice generation candidate, but it is high-risk because instant voice cloning can create false attribution. Use only after the consent and disclosure controls below exist.

Safe pilot sequence:

1. Start with text-only scripts.
2. Generate non-cloned placeholder narration for internal QA.
3. Add owner consent record before any owner-voice clone.
4. Store voice sample in encrypted restricted storage.
5. Generate from approved transcript only.
6. Watermark or metadata-tag generated output where supported.
7. Run audio QA.
8. Publish with disclosure.

## Consent And Disclosure Policy

### Consent Rule

Only the owner's voice may be used, and only with explicit consent. Consent must be recorded before voice sample capture or generation.

Consent record:

- Speaker legal name
- Approved voice model/tool
- Approved use: GSN podcast, clips, internal drafts, or all
- Expiration or review date
- Revocation process
- Storage location
- Approver
- Date/time

### Disclosure Rule

All AI-generated voice must be disclosed in:

- Episode notes
- Audio intro or outro
- Clip captions where practical
- Internal packet metadata

Suggested disclosure:

```text
Narration for this episode was generated with AI from an approved transcript and with explicit voice consent. The analysis is based on reviewed GSN source packets and should not be treated as guaranteed betting advice.
```

## Transcript Generation

Transcript stages:

1. Draft transcript from episode packet.
2. Human edit for clarity and compliance.
3. Lock transcript version.
4. Generate audio.
5. Run audio-to-transcript comparison.
6. Publish final transcript with source receipt links.

Transcript metadata:

- Episode ID
- Packet version
- Transcript version
- Approved by
- Approved at
- Voice generation status
- Disclosure status

## Clip Generation

Clip types:

- 30-60 second No-Bet education clip
- 45-90 second injury volatility recap
- 60-120 second market movement explainer
- 30 second trust receipt example
- 90 second post-game autopsy

Clip rules:

- Clips must come from approved episode transcript.
- Clips must not remove uncertainty context.
- Clips must not use clickbait betting certainty.
- Captions must include disclosure if AI-generated voice is used.

## Newsletter Repurposing

Newsletter structure:

1. Header: week and sports slate.
2. Market radar bullets.
3. No-Bet lesson.
4. Trust receipt spotlight.
5. Watchlist.
6. Responsible decision note.
7. Links to full transcript and source notes where allowed.

Newsletter cannot contain:

- New claims not in the approved packet.
- Unverified rumor claims.
- Unlicensed data excerpts.
- Fake win-rate claims.

## File Naming And Storage Structure

Recommended local/storage structure:

```text
content/gsn/podcast/
  2026/
    2026-06-10-weekly-intelligence/
      packet.json
      sources.md
      script.v1.md
      script.approved.md
      transcript.final.md
      audio/
        gsn-weekly-2026-06-10.ai-voice.wav
        gsn-weekly-2026-06-10.master.mp3
      clips/
        no-bet-education-2026-06-10.mp4
        market-radar-2026-06-10.mp4
      approvals.json
      disclosures.md
      hashes.sha256
```

## Storage And Security Practices

- Encrypt raw voice samples.
- Restrict voice samples to owner/admin only.
- Store generated audio separately from raw voice samples.
- Keep consent records immutable.
- Use hashes for approved transcript and generated audio.
- Remove temporary files after production.
- Never store third-party voices for cloning.
- Never email raw voice samples.

## Do Not Say Guardrails

Never use:

- lock
- guaranteed
- free money
- sure thing
- insider info
- bet the house
- this cannot lose
- model says it is certain
- ignore the risk
- chase it
- hammer it

Require caution around:

- sharp
- public
- injury
- source says
- expected value
- edge
- confidence
- volatility

Preferred phrasing:

- "The current packet supports..."
- "This is developing..."
- "The source quality is..."
- "The uncertainty driver is..."
- "No Bet is the current intelligent outcome..."
- "This requires a reviewer update before publication..."

## Prompt Templates

### Weekly Episode Draft

```text
You are drafting the GSN weekly sports intelligence podcast from an approved source packet.

Rules:
- Use only claims in the packet.
- Include uncertainty and freshness for every major claim.
- Treat No Bet as a first-class intelligent outcome.
- Do not use lock, guarantee, free money, or chase language.
- Do not add new data.
- Include a short AI/disclosure note if the episode will use generated narration.

Packet:
{{APPROVED_PACKET}}

Output:
1. Episode title
2. Segment outline
3. Full transcript
4. Clip candidates
5. Compliance checklist
```

### No-Bet Segment

```text
Draft a 2-minute No-Bet education segment from this approved signal.

Explain:
- The action users might be tempted to take
- The blocker
- The uncertainty driver
- What new information would change the decision
- Why restraint is intelligent

Approved signal:
{{SIGNAL}}
```

### Injury Volatility Recap

```text
Draft an injury/news volatility recap from the approved packet.

Rules:
- Official and confirmed reports first.
- Rumors stay labeled as quarantined or developing.
- Include timestamps.
- Explain what changed and what remains unknown.

Packet:
{{INJURY_NEWS_PACKET}}
```

### Post-Game Autopsy

```text
Draft a post-game autopsy.

Inputs:
- Original signal state
- Source receipt
- Confidence decay history
- Final result
- Reviewer notes

Output:
- What the process got right
- What the process missed
- Whether No Bet, Wait, or Bet was the disciplined outcome
- One process improvement

Data:
{{AUTOPSY_PACKET}}
```

### Short Clip

```text
Create a 45-second clip script from this approved transcript section.

Rules:
- Preserve uncertainty context.
- No hype.
- Include one useful lesson.
- Add disclosure if generated narration is used.

Transcript section:
{{TRANSCRIPT_SECTION}}
```

## Publication Checklist

- Approved packet exists.
- Script matches packet.
- No unsupported sports claim was added.
- No unverified rumor is stated as fact.
- No irresponsible gambling language appears.
- AI voice disclosure is present if applicable.
- Voice consent exists if owner voice is used.
- Transcript, audio, clips, and hashes are stored.
- Human approval record is complete.

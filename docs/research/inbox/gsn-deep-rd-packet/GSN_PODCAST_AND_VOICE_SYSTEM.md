# GSN Weekly Podcast + Voice System

## Objective
Create a weekly sports intelligence podcast using Garrett’s voice only, from approved scripts only, with explicit consent, AI-voice disclosure, source receipts, transcripts, clips, and post-publication accountability.

## Episode structure
1. Cold open: what moved and why it matters.
2. Market Radar: biggest movement across the week.
3. No-Bet Lab: one disciplined abstention explained.
4. Source Check: what was official, what was rumor, what changed.
5. Injury Volatility: availability signals and stale-data traps.
6. Sharp/Public Pressure: divergence as context, not proof.
7. Post-Game Autopsy: one prior decision graded by process.
8. Closing: what to monitor next, with responsible decision language.

## Data flow
Approved IntelligenceNotes → Source Packet → Script Draft → Claims QA → Language QA → Human Approval → Voice Generation → Transcript → Clip Pack → RSS/Web Publish → Flight Recorder event.

## Voice consent model
```ts
type VoiceConsentRecord = {
  id: string;
  speakerName: string;
  consentScope: 'gsn_podcast_only';
  consentText: string;
  approvedVoiceModel: string;
  storageLocation: string;
  disclosureRequired: true;
  revokedAt?: string;
  createdAt: string;
};
```

## Required disclosure
“This episode uses an AI-generated version of Garrett Baxley’s voice reading a human-approved GSN script. The analysis is source-reviewed before publication.”

## Never automate
- Final publication approval.
- Script approval in Garrett’s voice.
- Voice model changes.
- Use of third-party voices.
- Gambling call-to-action language.
- Removing uncertainty language.

## Acceptance criteria
- No episode can render voice without active consent record.
- Every episode has a source packet.
- Every episode has a transcript.
- Every claim has review status.
- Every published episode generates a Flight Recorder event.

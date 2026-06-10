# Technical Architecture

## Recommended Architecture

Text source -> script generator -> script safety linter -> approval queue -> voice provider adapter -> generation job -> audio/caption storage -> playback card -> analytics/cost ledger.

## Components

- Voice generation provider adapter
- Fake/local provider
- Script generator
- Script approval queue
- Voice job queue
- Audio asset storage
- Captions/transcript storage
- Cost/quota guard
- Consent/disclosure model
- Content source provenance
- Stale-data guard
- Method-leakage guard
- Moderation/safety check
- Human approval workflow
- Cache layer
- Audio playback component
- Fallback text-only mode
- Analytics events
- Admin/founder dashboard

## Suggested Entities

VoiceScript, VoiceAsset, VoiceGenerationJob, VoiceProvider, VoiceConsent, AudioDisclosure, Transcript, CaptionTrack, VoiceUsageEvent, VoiceCostLedger, VoiceApproval, VoiceSafetyReview.

## Required Flags

- VOICE_FEATURES_ENABLED
- VOICE_GENERATION_ENABLED
- VOICE_PUBLIC_PLAYBACK_ENABLED
- ELEVENLABS_API_KEY
- VOICE_APPROVAL_REQUIRED
- VOICE_PROMOTIONS_ENABLED
- VOICE_FOUNDER_ONLY_MODE

No actual secrets were added.

## Failure Modes

- Provider unavailable: show transcript-only.
- Cost cap hit: stop generation and keep approved scripts.
- Data stale: invalidate audio and show stale notice.
- Safety linter fails: block generation.
- Approval missing: keep asset internal/draft-only.

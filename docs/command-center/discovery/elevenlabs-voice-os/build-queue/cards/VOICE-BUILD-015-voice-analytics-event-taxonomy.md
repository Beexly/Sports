# VOICE-BUILD-015: Voice analytics event taxonomy

## Duplicate Gate

duplicate_check_status: EXTENSION_OR_NET_NEW
matched_existing_ids: none
relation_to_existing: Extends existing media/audio/brand governance where relevant; does not replace P0 launch blocker work.
reason_not_duplicate: This card is specific to ElevenLabs Voice OS, transcript-first audio UX, approval gates, and no-API prototype paths.
dependency_ids: VOICE-BUILD-001, VOICE-BUILD-002

## Goal

Measure play, completion, transcript opens, and CTA impact.

## Repo(s) Used

ui

## GSE Surface

analytics layer

## Customer Value

Makes dense GSE concepts easier to understand quickly through transcript-first audio, captions, or guided explanations.

## Business Value

Improves onboarding, support deflection, retention, trust, accessibility, content velocity, or paid conversion without turning GSE into a sportsbook.

## Safety Boundary

No unauthorized voice cloning. No athlete, coach, celebrity, user, or private-person imitation. No gambling urgency. No method leakage. No public generation without approved text source, AI disclosure, and review.

## Technical Plan

1. Confirm the source text and public/private boundary.
2. Run script safety checks before any audio generation.
3. Use a fake/local provider in prototype mode.
4. Add transcript and disclosure before playback UI.
5. Add cost and stale-data checks before any real provider call.
6. Keep all production API calls disabled until founder approval.

## Data / Content Source

Approved GSE text, support doc, Daily Brief, journal article, source freshness record, or founder-only command-center digest depending on the surface.

## Approval Flow

Draft by agent or operator, safety lint, founder/support/legal review as applicable, then generation only when VOICE_GENERATION_ENABLED is approved.

## Cost Guard

Default to no provider call. When enabled, meter characters, duration, route, user/tier, cache key, and monthly budget.

## Analytics

audio_card_viewed, audio_play_started, audio_play_completed, transcript_opened, captions_enabled, audio_cta_clicked, voice_cost_recorded.

## Acceptance Criteria

- Works without an ElevenLabs API key in prototype mode.
- Shows transcript and AI narration disclosure.
- Refuses unsafe scripts.
- Does not expose private methodology.
- Has test coverage or a written QA checklist.

## Test Plan

Unit tests for script rules, no-secret scan, route/component render if implemented, transcript parity check, reduced-motion/accessibility check, and screenshot review for visible UI.

## Priority

P1

## Difficulty

S

## Claude Handoff Note

Claude should polish user-facing wording and verify it stays calm, specific, non-hype, and source-aware.

## Implementation Prompt

You are Claude/Codex working in the GSE repo. Implement only VOICE-BUILD-015: Voice analytics event taxonomy. Keep it prototype-safe, do not call paid APIs, do not add secrets, do not deploy, and preserve P0 launch blocker isolation. Add tests or docs proving the safety boundary.

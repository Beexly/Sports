# Safe Prototype Plan

## Allowed Now

- TypeScript interfaces.
- Provider adapter stub.
- Fake/local provider.
- Script templates.
- Approval workflow types.
- Static audio placeholder metadata.
- Audio player component shell.
- Transcript/caption component shell.
- Founder-only prototype route if already gated.
- Command-line script generator that does not call APIs.
- Tests for safety rules.

## Forbidden

- Calling ElevenLabs API.
- Adding API keys.
- Generating real audio.
- Public customer-facing playback.
- Storing user audio.
- Promotions voice.
- Deploying.

## Prototype Targets

1. Internal Audio Brief Preview.
2. Static Explain This Card.
3. Transcript-first Audio Card.
4. Voice Script Safety Linter.
5. No-Bet Voice Script Template.
6. Daily Brief Voice Script Template.

## Suggested First Prototype

Build VOICE-BUILD-003, VOICE-BUILD-006, and VOICE-BUILD-008 together as a docs/tests-only prototype: a transcript-first Daily Brief audio card with fake provider metadata and safety-linted script text.

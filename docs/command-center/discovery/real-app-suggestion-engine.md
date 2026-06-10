# Real App Suggestion Engine

Date: 2026-06-09

This file tracks post-P0 opportunity lanes that can improve the real app without becoming launch blockers.

## Current Rule

P0 launch readiness remains separate. Suggestions here do not override:

- dependency readiness gates
- dirty-tree staging discipline
- roster/Player Lab scope proof
- production deploy approval

## Voice OS / Audio Intelligence - post-P0 opportunity lane

Source directory:

`docs/command-center/discovery/elevenlabs-voice-os/`

What it is:

- A source-verified ElevenLabs repo ecosystem audit.
- A GSE voice/audio/caption/support/onboarding strategy.
- A safe prototype queue for transcript-first audio cards, Daily Brief narration scripts, no-bet explainers, support voice replies, captions, founder spoken briefs, and content-to-short workflows.

What it is not:

- Not a P0 launch blocker.
- Not a production feature.
- Not an API integration.
- Not permission to add ElevenLabs keys.
- Not permission to generate public audio.

Best safe first builds after P0:

1. VOICE-BUILD-003 Transcript-first audio card component spec.
2. VOICE-BUILD-006 Voice script safety linter.
3. VOICE-BUILD-008 Daily Brief voice script template.
4. VOICE-BUILD-012 Audio disclosure component.
5. VOICE-BUILD-017 Method-leakage audio guard.
6. VOICE-BUILD-019 Support audio template library.
7. VOICE-BUILD-020 Onboarding voice tour outline.
8. VOICE-BUILD-036 Risk/volatility audio glossary.
9. VOICE-BUILD-043 Audio QA screenshot and transcript test plan.
10. VOICE-BUILD-049 Claude voice handoff packet format.

Approval gates:

- Founder approval before any real provider call or public audio.
- Legal approval before any promotional/affiliate/sportsbook/casino audio.
- Privacy approval before customer audio or transcript storage.
- Product approval before adding dependencies to the app.

Suggested sequencing:

1. Keep Voice OS docs only until P0 readiness is green.
2. Build a fake-provider transcript card.
3. Add safety linting for scripts.
4. Add disclosure and transcript parity.
5. Only then evaluate a real provider adapter.

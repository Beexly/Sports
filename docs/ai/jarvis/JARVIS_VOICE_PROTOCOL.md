# Jarvis Voice Protocol

Code: `apps/web/lib/jarvis/voice-protocol.ts` + console component
`apps/web/components/jarvis/jarvis-voice-console.tsx`.

## Honest status

Voice is NOT wired. `buildVoiceProtocolStatus()` reports STT `NOT_WIRED`,
TTS `NOT_WIRED`, wake mode `MANUAL_CLICK`, `isActive: false`. The console
feature-detects browser `SpeechRecognition` (display only — nothing records).

## Pipeline design (future)

```
push-to-talk (held) → STT (browser first, Whisper later)
  → redactTranscript() → classifyVoiceCommand()
  → safe/read-only?  → route to Ask Jarvis intent → TTS answer
  → write-shaped?    → read back as text → require "Confirm and execute"
                       → action queue (NEEDS_APPROVAL) → owner approval
```

## Command grammar

10 commands (`VOICE_COMMANDS`): summarize-galaxy, what-needs-decision,
summarize-today, prepare-prompt, write-to-scribe, agents-status, what-changed,
what-is-blocked, draft-next-task, read-back-risk. Read-only commands map to
Ask Jarvis intents; write-shaped commands (`write-to-scribe`,
`draft-next-task`) require approval.

## Privacy rules

1. No persistent audio storage — ever.
2. Transcripts held in memory for the session only, redacted for secrets.
3. Approval phrase required before any write action: "Confirm and execute".
4. Read back before action — proposed actions are shown as text first.
5. Recording only while push-to-talk is held; no always-on listening.

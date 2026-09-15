# Galaxy Broadcast — TTS opt-in toggle, UI integration spec

**Status: backend half built and tested (`apps/web/lib/broadcast/tts.ts`, 9/9 tests,
0 typecheck errors). UI half specified here, not implemented** — `galaxy-broadcast.tsx`
is a delicate, carefully art-directed cinematic surface, and this session has no dev
server or browser to visually verify a change to it. Per Week-Saver Mode ("if you can't
test the UI, say so explicitly rather than claiming success"), the honest state is:
ready to wire, not wired.

## Why this exists

`components/news/galaxy-broadcast.tsx`'s own header comment: "the browser
speech-synthesis Play control was removed 2026-09-12. It sounded robotic... the founder
called it 'horrible and nothing human-like'... when a real TTS lane lands it can come
back behind an explicit opt-in." `apps/web/__tests__/the-beat-broadcast.test.ts` pins
the same intent and will need one new assertion once this lands (see below).

## Provider choice

ElevenLabs, via plain `fetch()` — no new npm dependency (`xi-api-key` header, POST to
`/v1/text-to-speech/{voiceId}`). Chosen over `pipecat-ai/pipecat` (evaluated in the
framework-integration pass): pipecat is built for *live, turn-taking conversational*
voice agents; a broadcast segment is a fixed script read once, a strictly simpler
problem pipecat's realtime pipeline is not needed for. `pipecat`'s own source (if the
deep-research workflow's report on it lands with a different concrete recommendation,
prefer that report's finding over this one — it did a real inspection of pipecat's
TTS-provider list this doc did not wait for).

## Exact UI changes needed in `galaxy-broadcast.tsx`

1. **Toggle, not autoplay.** A single button in the on-air bar (next to the existing
   presenter disclosure), default OFF, label e.g. "🔊 Narrate this segment" —
   `aria-pressed` reflecting state. Must satisfy the existing test's invariant:
   `broadcast.toLowerCase()).not.toContain("autoplay")` stays true — narration only
   starts on an explicit click, never on segment change or page load.
2. **Hide/disable when unconfigured.** Call `isBroadcastTtsConfigured()` — but that
   reads `process.env` and this is a `"use client"` component, so the configured flag
   must be computed server-side (e.g. in `app/the-beat/page.tsx`, which is already a
   server component per the test's own read of it) and passed down as a prop, the same
   pattern `broadcast` itself already uses. Never call `synthesizeSegment` directly from
   the client — it needs the secret key, which must stay server-side (rule 4).
3. **New route: `app/api/broadcast/narrate/route.ts`.** POST `{ segmentScript: string }`
   → calls `synthesizeSegment` server-side → streams back `audio/mpeg` bytes, or a JSON
   `{ reason }` on the `not_configured`/`request_failed`/`empty_script`/`invalid_voice_id` paths (the client
   renders each reason as a distinct, honest message — "narration unavailable" for
   `not_configured`, "couldn't generate narration, try again" for `request_failed` —
   never a silently-failed-but-looks-fine button).
4. **Client playback.** On toggle-on: `fetch("/api/broadcast/narrate", { method: "POST",
   body: JSON.stringify({ segmentScript: seg.script }) })` → on success, create an
   `<audio>` element (or reuse one ref) with `URL.createObjectURL(blob)`, play, and show
   a stop control; on any non-2xx or a JSON `{reason}` body, show the honest failure
   message above and reset the toggle to OFF (never leave it stuck "on" with nothing
   playing — that is exactly the "silent success" failure mode `tts.ts`'s own honest
   empty-state rule exists to prevent).
5. **Reduced-motion / accessibility.** The component is already reduced-motion-safe
   (CSS only, per its header comment); audio playback is orthogonal to that and needs no
   special-casing, but the toggle button needs a visible focus ring and the standard
   `aria-pressed`/`aria-label` pair — check against the repo's existing WCAG contrast
   rule (`.claude/skills/contrast`) before landing.

## Test updates needed once this ships

- `the-beat-broadcast.test.ts`'s "does NOT ship the robotic speech-synthesis Play
  control" test stays as-is (it only checks for the OLD browser API, not this one) —
  add a NEW test asserting the new toggle uses `fetch("/api/broadcast/narrate"` and
  never a bare `new Audio(` pointed at a client-side-constructed ElevenLabs URL (the key
  must never reach the client).
- A new `app/api/broadcast/narrate/route.test.ts` mirroring the pattern in
  `apps/web/__tests__/` for other cron/API routes: 200 with valid audio, the three
  honest-failure JSON shapes, and a check that the route never echoes the API key in any
  response.

## Cost / ops note

ElevenLabs bills per character. `content-generator.ts`'s own budget-guard pattern
(`getCurrentMonthClaudeSpendUsd` / `evaluateClaudeBudgetUsage` in
`apps/web/lib/claude-api/`) is the precedent to mirror for a `BROADCAST_TTS` budget
policy before this goes live broadly — not required for a first opt-in pilot behind an
unconfigured-by-default key, but should land before `ELEVENLABS_API_KEY` is actually set
in production. Founder action either way (setting the key is an env change).

# Nova voice — LOCKED

Locked by Garrett on Oct 28, 2026 at 10:41 CT. His deciding quote was on the Callirrhoe board line: "Yeah it's this one."

Engine: Google AI Studio — Gemini 3.8 Flash TTS (gemini-3.8-flash-tts)
Voice: Callirrhoe (UI description: Easy-going · Middle pitch)
Mode: single speech block, Speaker 1 only.

Style instruction (paste verbatim into the Style field for every generation):
"A real woman in her late 20s recording a casual TikTok: lower warm alto, relaxed and confident, slight smile and dry humor, natural pauses and breaths, conversational, a little smoky and raspy, not bright, not bubbly cheerleader, not an announcer, no sales voice."

Canonical reference takes (locked/):
- callirrhoe-reveal-canonical.wav — the reveal line
- callirrhoe-loss-canonical.wav — the loss line
- callirrhoe-board-canonical.wav — the board line (the take Garrett picked her on)

Production route: AI Studio UI on Garrett's Google sign-in, free tier (no API key selected). API route is not set up; if volume ever needs one, that is a new decision.

Closed lanes, do not re-offer: Kokoro (Bella/Sarah), Grok built-ins (Ara/Eve/Aurora/Luna), OpenRouter (Coral/Shimmer), Qwen (Cherry/Serena), Gemini Aoede/Zephyr (decent, not there), Gemini Sulafat (finalist, lost the tiebreak), Despina, Kore.

## Production runbook (verified Oct 28, 2026)
1. Open https://aistudio.google.com/generate-speech in the signed-in Google session (free UI use, "No API key selected" is correct — do not add a key).
2. Model: Gemini 3.8 Flash TTS. One speech block, Speaker 1 only.
3. Voice: Callirrhoe. Paste the style instruction above into the Style field verbatim — every generation, no edits.
4. Paste the line text, generate, play it back once, download the WAV.
5. Save downloads to personas/nova/voice/candidates/ named gemini-callirrhoe-<slug>.wav; keep the three locked/ takes untouched as the reference standard.
6. QA before delivery: file has real duration (ffprobe) and a spot transcription matches the script. If a take drifts (too bright, announcer lift), regenerate — do not ship a drifted take.
Status: lock + canonical takes verified on disk Oct 28, 2026, 12:30 CT (board 9.7s, loss 12.3s, reveal 14.2s). Live end-to-end proof PASSED Oct 28, 2026, 12:32 CT: fresh line generated via this runbook (candidates/gemini-callirrhoe-proof-2026-10-28.wav, 14s) — pipeline is operational.

## AMENDMENT — Garrett, Oct 28, 2026, 13:52 CT (bible §45)
Garrett, hearing the 46s take: the voice "doesn't fully fit our girl. She needs to be a bit more bubbly" + "more inflection — more changes in tone." The Oct 28 style text overcorrected: its "not bubbly cheerleader" guardrail flattened her, and her personality source (Mars, @yung.planet) IS the bubbly register. The lock is amended by his direction — voice identity stays Callirrhoe pending his A/B ear test; the STYLE TEXT is replaced with:
"A real woman in her late 20s recording a casual TikTok: warm alto with a bubbly streak, genuinely happy to be talking to you, lots of natural inflection — her pitch rises and falls as she talks, emphasis landing on different words, playful and expressive, natural pauses and breaths, a little smoky underneath, conversational. Bubbly but real — never a fake cheerleader, never an announcer, no sales voice."
An A/B (Callirrhoe vs Zephyr, both under the amended style, on the opening + closing lines) goes to Garrett's ear; the winner becomes the production direction and the full manifesto is re-recorded chunked under it.

## SUPERSEDING DECISION — Garrett, Oct 28, 2026, 14:07 CT (bible §47)
Garrett heard the A/B (both voices under the §45 amended style, opening + closing lines) and picked **Voice B — Zephyr**. PRODUCTION VOICE IS NOW: Zephyr + the §45 amended style text, pasted verbatim every generation. Callirrhoe is retired as the production voice; its canonical takes stay on file as history only. Every other term of this lock stands (single speech block, Speaker 1, Gemini 3.8 Flash TTS, AI Studio UI free route, QA before delivery). The manifesto re-records chunked under Zephyr as v5 — the launch cut.

## UPDATE — Garrett, Nov 7, 2026, 15:04 CT (B1 pick)
Context: Nov 7 production drifted — the day's Higgsfield takes and AI Studio voice take were generated with Callirrhoe + the ORIGINAL Oct 28 style text, against the §47 decision above (drift found and owned by Motif, Nov 7). Corrective A/B: three takes, one generation each, AI Studio, Gemini 3.8 Flash TTS, single speech block, Speaker 1.
- A1 — Callirrhoe + original style (control), Script A. File: candidates/scriptA-callirrhoe-current-style.wav
- A2 — Callirrhoe + adjusted style (below), Script A. File: candidates/scriptA-callirrhoe-adjusted-feminine.wav
- B1 — Zephyr + adjusted style (below), Script B. File: candidates/scriptB-zephyr-adjusted-feminine.wav
Garrett's direction, Nov 7, 14:59 CT: the voice slightly MORE FEMININE. Garrett heard all three and picked **B1** (👍 on the B1 take at 15:04 CT, then "B1" in chat).
PRODUCTION VOICE IS NOW: **Zephyr + the adjusted style text**, pasted verbatim every generation:
"A real woman in her late 20s recording a casual TikTok: warm and clearly feminine, a touch higher and lighter than an alto, soft around the edges but confident, slight smile and dry humor, natural pauses and breaths, conversational, a little smoky underneath, not bubbly cheerleader, not an announcer, no sales voice."
This adjusted style text REPLACES the §45 style text for production; Zephyr as the voice identity is re-confirmed (§47 stands). Script B — "All right, Saturday. The card is set, every matchup worked. Full board is live — come argue with me in the replies." — is the approved line for the next game-day video. Status: interim production direction; the AI-personality/humanization deep research running Nov 7 may refine the spec, and any change after it lands is a new Garrett decision, never a silent edit.

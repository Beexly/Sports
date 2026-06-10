# ElevenLabs Capability Map

## A. SDK / API Integration

Repos: `elevenlabs-js`, `elevenlabs-python`, `elevenlabs-swift-sdk`, `elevenlabs-flutter`, `packages`, `cli`

Enables text-to-speech, speech and audio workflows, command-line/operator generation, and future mobile integration. GSE should use this family only behind a provider adapter, cost ledger, approval queue, stale-data guard, and no-secret logging policy. Use now for docs and fake provider types; wait for API calls.

## B. Next.js / Web App Integration

Repos: `elevenlabs-nextjs-starter`, `ui`, `plugin`, `examples`

Enables web-player patterns, multimodal UI, and starter architecture research. GSE can prototype transcript-first audio cards and help overlays without importing dependencies or calling APIs.

## C. Agent / MCP / Automation

Repos: `elevenlabs-mcp`, `elevenlabs-mcp-player`, `skills`, `powers`, `elevenlabs-n8n`

Enables internal script-to-audio workflows, support audio generation, founder briefs, and content production pipelines. This is high-leverage but requires strict approval, cost, and secret boundaries.

## D. Captions / Events / Audio Processing

Repos: `captions.events`, `opuspy`, `examples`

Enables synchronized captions, transcript parity, event timing, and possible audio encoding research. GSE should prioritize captions and transcripts before generated audio.

## E. Mobile / Native Experience

Repos: `elevenlabs-swift-sdk`, `components-swift`, `voice-starterkit-swift`, `elevenlabs-flutter`

Useful later for a GSE app with audio alerts and brief playback. Not needed for web launch.

## F. Commerce / Experimental Pattern Research

Repos: `eleven.shopping`, `plugin`, `powers`

Study only. Do not import or ship until a concrete business case exists.

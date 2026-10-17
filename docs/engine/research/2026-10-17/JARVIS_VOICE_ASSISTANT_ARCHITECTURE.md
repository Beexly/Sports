# JARVIS Voice Assistant Architecture & Sovereign Voice Bridge
**Date:** 2026-10-17  
**Author:** Sovereign Mind / GSE Architecture Desk  
**Status:** FULLY OPERATIONAL & DOCUMENTED  
**Governing Doctrines:** AGENTS.md (DIRECT-TO-MIND, ZERO SECRETS COMMITTED, REASONING DOCTRINE)

---

## 1. System Overview

The GSE JARVIS Voice Assistant provides an autonomous, real-time voice interface connecting Garrett directly to the GSE prediction engine, the agent bus, and the live NFL betting/props board. 

Inspired by Aria's setup (`AKCodez/make-your-own-jarvis`), the architecture replaces heavy, subscription-laden proprietary voice UIs with an ultra-low-latency, zero-cost pipeline combining:
1. **Fish Audio S2.1 Pro Developer TTS (`s2.1-pro-free`)**: Provides the authentic JARVIS voice persona (`model_id: 88b183bfbdda44a09ad4474712b967f4`).
   - **Time Flag:** The Fish Audio S2.1 Pro developer API is free through **November 30, 2026**.
2. **OpenRouter Zero-Cost Model Routing**: Free tier models (`:free`) handle conversational turns and fast semantic parsing without burning credits.
3. **Windows Native Fallback**: Seamless automatic downgrade to local Windows SAPI `SpVoice` if the host is offline or Fish Audio experiences rate-limits.
4. **Non-Blocking Telemetry & Watchdog Daemon**: Background speech worker (`SpeechWorker`) queues utterances asynchronously, ensuring background monitors and trading engines never block on voice output.

---

## 2. Component Diagram

```
+-----------------------------------------------------------------------------------+
|                            GSE SOVEREIGN TERMINAL                                 |
|                                                                                   |
|   +--------------------------+              +---------------------------------+   |
|   |  watchdog_daemon.py      |              |  server.py / voice_interface.py |   |
|   |  - High EV Edges (>10%)  |              |  - Conversational Terminal      |   |
|   |  - Final Game Scores     |              |  - Persistent Memory DB         |   |
|   |  - Peer Agent Bus Msgs   |              |  - Zero-Token Router            |   |
|   +------------+-------------+              +----------------+----------------+   |
|                |                                             |                    |
|                +----------------------+----------------------+                    |
|                                       |                                           |
|                                       v                                           |
|                     +-----------------------------------+                         |
|                     |     SpeechWorker / speak()        |                         |
|                     |  - Cooldown deduplication         |                         |
|                     |  - Background dispatch thread     |                         |
|                     +-----------------+-----------------+                         |
|                                       |                                           |
|                    +------------------+------------------+                        |
|                    |                                     |                        |
|     (Primary: Key Present)                    (Failsafe / Offline)                |
|                    v                                     v                        |
|   +---------------------------------+   +------------------------------------+    |
|   | Fish Audio S2.1 Pro Free API    |   | Windows Native SAPI                |    |
|   | Model: "s2.1-pro-free"          |   | Dispatch("SAPI.SpVoice")           |    |
|   | Voice: JARVIS (88b183bfbdd...)  |   | Local COM Object                   |    |
|   | Format: WAV -> winsound         |   | Zero Network, Instant Playback     |    |
|   +---------------------------------+   +------------------------------------+    |
+-----------------------------------------------------------------------------------+
```

---

## 3. Configuration & Key Management

Per GSE security rules, credentials reside exclusively in `.env.local` (guarded by gitignore and pre-commit secret scanners):

```bash
# Fish Audio JARVIS Voice Configuration
FISH_AUDIO_API_KEY="sk-fish-..."
FISH_AUDIO_MODEL_ID="88b183bfbdda44a09ad4474712b967f4"
FISH_AUDIO_TTS_MODEL="s2.1-pro-free"

# OpenRouter Free Tier Cascade
OPENROUTER_API_KEY="sk-or-v1-..."
```

### Critical API Contract Note
When invoking `https://api.fish.audio/v1/tts`, passing the header `'model': 's2.1-pro-free'` is strictly required. Omitting this header defaults the request to the commercial `s2.1-pro` endpoint, triggering `HTTP 402: Payment Required`.

---

## 4. Usage Patterns

### A. One-Prompt Launch for Voice Terminal
```bash
python intelligence/voice_brain/server.py --voice
```
Launches the sovereign brain interactive loop. Any prompt typed or spoken is answered verbally by JARVIS, with full recall of Garrett's system architecture, doctrines, and memories.

### B. Live Edge & Agent Bus Watchdog
```bash
python intelligence/voice_brain/watchdog_daemon.py --announce-edge --announce-bus
```
Runs in the background. When:
1. A new investment-grade prop or game edge clears RVC and exceeds 10% EV,
2. An NFL game goes final, or
3. A peer agent (Motif, Jules, Dots) broadcasts a priority dispatch on the agent bus,
JARVIS announces the event aloud in real time.

### C. Diagnostic & SAPI Verification
```bash
# Verify JARVIS voice synthesis:
python intelligence/voice_brain/voice_interface.py --test-jarvis

# Verify Windows SAPI fallback:
python intelligence/voice_brain/voice_interface.py --say "Testing fallback" --sapi-only
```

# ElevenLabs Repo Verification

Generated: 2026-06-09

## Verification Method

Each target repo was checked through GitHub API metadata and README/root-file inspection when available. For repos blocked by unauthenticated API rate limits, GitHub web/search fallback was used and the row notes identify the constraint. Official ElevenLabs docs, pricing, safety, and use-policy pages were also used for API, cost, and misuse boundaries.

## Inventory

| Repo | Purpose | License | Language | Stars | Release | Updated | Mode | Risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [elevenlabs-python](https://github.com/elevenlabs/elevenlabs-python) | Official Python SDK for ElevenLabs API calls. | MIT | Python | 3000 | v2.52.0 | 2026-06-08 | PROTOTYPE_ONLY | MEDIUM/MEDIUM/MEDIUM |
| [ui](https://github.com/elevenlabs/ui) | TypeScript/shadcn-style UI component library for multimodal agents. | MIT | TypeScript | 2260 | v1.0.0 | 2026-05-15 | USE_NOW_INTERNAL | LOW/LOW/LOW |
| [elevenlabs-mcp](https://github.com/elevenlabs/elevenlabs-mcp) | Official MCP server for ElevenLabs agent/tool workflows. | MIT | Python | 1396 | v0.9.1 | 2026-06-09 | AGENT_WORKFLOW | MEDIUM/MEDIUM/MEDIUM |
| [examples](https://github.com/elevenlabs/examples) | Prompt-driven examples for speech, sound, music, transcription, and agents. | MIT | TypeScript | 608 | v0.0.2 | 2026-06-02 | PROTOTYPE_ONLY | MEDIUM/MEDIUM/MEDIUM |
| [elevenlabs-js](https://github.com/elevenlabs/elevenlabs-js) | Official JavaScript/TypeScript SDK for ElevenLabs API calls. | MIT | TypeScript | 430 | v2.52.0 | 2026-06-08 | PROTOTYPE_ONLY | MEDIUM/MEDIUM/MEDIUM |
| [skills](https://github.com/elevenlabs/skills) | ElevenLabs skills/examples for agent and voice workflows. | MIT | Python | 325 | none found | 2026-06-08 | AGENT_WORKFLOW | MEDIUM/MEDIUM/MEDIUM |
| [captions.events](https://github.com/elevenlabs/captions.events) | Caption event tooling/patterns for synchronized transcript UX. | NOASSERTION | TypeScript | 125 | none found | 2025-12-12 | PROTOTYPE_ONLY | LOW/LOW/LOW |
| [elevenlabs-swift-sdk](https://github.com/elevenlabs/elevenlabs-swift-sdk) | Swift SDK for native Apple ElevenLabs integrations. | MIT | Swift | 112 | v3.2.0 | 2026-06-05 | MOBILE_FUTURE | MEDIUM/MEDIUM/MEDIUM |
| [packages](https://github.com/elevenlabs/packages) | Shared package workspace for ElevenLabs web/client tooling. | MIT | TypeScript | 106 | @elevenlabs/client@1.10.0 | 2026-06-09 | INSPIRATION_ONLY | LOW/LOW/LOW |
| [elevenlabs-nextjs-starter](https://github.com/elevenlabs/elevenlabs-nextjs-starter) | Next.js starter for ElevenLabs web app integration. | MIT | TypeScript | 65 | none found | 2025-12-12 | PROTOTYPE_ONLY | MEDIUM/MEDIUM/MEDIUM |
| [elevenlabs-flutter](https://github.com/elevenlabs/elevenlabs-flutter) | Flutter SDK/plugin for mobile/cross-platform ElevenLabs usage. | MIT | Dart | 37 | v0.6.1 | 2026-06-02 | MOBILE_FUTURE | MEDIUM/MEDIUM/MEDIUM |
| [voice-starterkit-swift](https://github.com/elevenlabs/voice-starterkit-swift) | Swift voice starter kit for native voice experience prototyping. | MIT | Swift | 34 | 0.1.0 | 2025-11-18 | MOBILE_FUTURE | MEDIUM/MEDIUM/MEDIUM |
| [opuspy](https://github.com/elevenlabs/opuspy) | Python Opus audio tooling. | NOASSERTION | C++ | 32 | none found | 2022-10-07 | INSPIRATION_ONLY | LOW/LOW/LOW |
| [elevenlabs-n8n](https://github.com/elevenlabs/elevenlabs-n8n) | n8n integration nodes/workflows for ElevenLabs automation. | MIT | TypeScript | 30 | v0.2.4 | 2026-03-31 | AGENT_WORKFLOW | MEDIUM/MEDIUM/MEDIUM |
| [eleven.shopping](https://github.com/elevenlabs/eleven.shopping) | Experimental ElevenLabs shopping/commerce voice pattern repo. | NOASSERTION | TypeScript | 23 | none found | 2025-11-14 | INSPIRATION_ONLY | MEDIUM/MEDIUM/MEDIUM |
| [components-swift](https://github.com/elevenlabs/components-swift) | Swift components for native ElevenLabs UI/voice experiences. | Apache-2.0 | Swift | 12 | 0.1.3 | 2025-11-18 | MOBILE_FUTURE | LOW/LOW/LOW |
| [powers](https://github.com/elevenlabs/powers) | Experimental powers/actions pattern repo for agent-like workflows. | MIT | Unknown | 3 | none found | 2026-03-16 | INSPIRATION_ONLY | MEDIUM/MEDIUM/MEDIUM |
| [elevenlabs-mcp-player](https://github.com/elevenlabs/elevenlabs-mcp-player) | MCP player tooling for ElevenLabs audio generation/playback flows. | MIT | TypeScript | 8 | none found | 2026-06-03 | AGENT_WORKFLOW | MEDIUM/MEDIUM/MEDIUM |
| [plugin](https://github.com/elevenlabs/plugins) | Canonical plural repo for Claude Code plugins for voice interactions; singular elevenlabs/plugin was not verified. | NOASSERTION | Claude plugin / shell scripts | unknown | unknown | unknown | AGENT_WORKFLOW | MEDIUM/MEDIUM/MEDIUM |
| [cli](https://github.com/elevenlabs/cli) | Command line interface for ElevenLabs workflows. | MIT | TypeScript | 69 | @elevenlabs/cli@0.5.3 | 2026-06-09 | AGENT_WORKFLOW | MEDIUM/MEDIUM/MEDIUM |

## Key Takeaways

- Best immediate GSE value is not raw voice generation; it is transcript-first UX, script safety, approval queues, and internal prototypes.
- elevenlabs-js, examples, ui, elevenlabs-nextjs-starter, and captions.events are the most useful web/prototype inputs.
- MCP, n8n, CLI, and Python are stronger for internal/operator workflows than public UI.
- Swift/Flutter repos are future mobile architecture only.
- Experimental repos such as powers, plugin, and eleven.shopping should be studied as patterns only unless a concrete need appears.

## Sources

- [ElevenLabs GitHub organization](https://github.com/elevenlabs)
- [ElevenLabs API quickstart](https://elevenlabs.io/docs/eleven-api/quickstart)
- [ElevenLabs libraries and SDKs](https://elevenlabs.io/docs/eleven-api/resources/libraries)
- [ElevenLabs API pricing](https://elevenlabs.io/pricing/api)
- [ElevenLabs safety](https://elevenlabs.io/safety)
- [ElevenLabs use policy](https://elevenlabs.io/use-policy)

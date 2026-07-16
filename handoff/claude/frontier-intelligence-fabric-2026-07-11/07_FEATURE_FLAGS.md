# 07 — Feature Flags

Every frontier capability ships behind a flag that defaults **false**. Flags
follow the repo's existing typed-gate conventions (server-side checks; no flag
is exposed publicly; absence of the env var means OFF).

| Flag | Workstream | Guards |
|---|---|---|
| `RESOURCE_RADAR_V2_ENABLED` | B | Admin radar surface + API |
| `AGENT_FOUNDRY_ENABLED` | C | Foundry surface + API |
| `AI_SETUP_ASSURANCE_ENABLED` | D | Assurance surface + API |
| `AI_MODEL_ROUTER_SHADOW_ENABLED` | E | Shadow recommendations (no-op re: production) |
| `AI_MODEL_ROUTER_LIVE_ENABLED` | future | Never set by this program; requires owner promotion after evals |
| `SANDBOX_EXECUTION_ENABLED` | F (spec only) | — |
| `CODEBASE_MEMORY_MCP_ENABLED` | F (spec only) | — |
| `EVIDENCE_GRAPH_ENABLED` | F (spec only) | — |
| `JARVIS_MEMORY_RECALL_ENABLED` | F (spec only) | — |
| `COCKPIT_COPILOT_ENABLED` | F (spec only) | — |
| `JARVIS_VOICE_ENABLED` | F (spec only) | — |
| `FILM_ROOM_ENABLED` | F (spec only) | — |
| `MULTIMODAL_STUDIO_ENABLED` | F (spec only) | — |
| `PUBLIC_PROOF_V2_ENABLED` | F (spec only) | — |
| `SCENARIO_ENGINE_ENABLED` | F (spec only) | — |
| `AGENTIC_SECURITY_SCAN_ENABLED` | F (spec only) | — |

Rules:

- A flag being true never bypasses auth: admin surfaces still require the
  existing admin session checks.
- No flag changes public output, entitlements, pricing, or decisions.
- Spec-only flags are documented here for naming stability; they get code only
  when their workstream ships.

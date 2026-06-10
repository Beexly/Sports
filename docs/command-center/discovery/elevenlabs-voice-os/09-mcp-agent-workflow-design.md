# MCP / Agent Workflow Design

## Workflow: Approved Script To Audio

Trigger: founder/support/content operator approves script.

Input: VoiceScript, source text IDs, approval record, voice provider config.

Output: VoiceAsset, Transcript, CaptionTrack, VoiceCostLedger.

Approval gate: always required for public audio.

Failure mode: transcript-only fallback, generation paused.

Cost guard: character/minute cap and cache key.

Privacy guard: no customer audio/transcript storage unless consent exists.

Method leakage guard: linter blocks private terms and source recipes.

## Internal Workflows

| Workflow | Repos | Use |
|---|---|---|
| Founder weekly spoken brief | elevenlabs-mcp, cli | Internal launch/revenue/source digest. |
| Launch blocker spoken digest | mcp-player, cli | Read command-center status without opening every doc. |
| Support response draft | n8n, examples | Spoken walkthrough from approved support text. |
| Article-to-audio | examples, captions.events | Approved article becomes transcript/audio/captions. |
| Video captions | captions.events | Validate caption track for short clips. |
| Release-note voiceover | cli, examples | Short changelog narration. |
| Sales demo narration | examples | Script pack for investor/partner demos. |

## Rule

Agents may draft scripts and metadata. Agents may not generate public audio, post content, or spend provider credits without the approval gate.

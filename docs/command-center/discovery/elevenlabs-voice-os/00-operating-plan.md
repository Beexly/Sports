# GSE / GSN ElevenLabs Voice OS - Operating Plan

## Mission Interpretation

This lane studies how ElevenLabs open-source repos and official tooling can help GSE make dense sports intelligence easier to understand through transcript-first audio, captions, narrated help, support clips, Daily Brief narration, founder-only spoken digests, and safe content workflows.

This is not a launch blocker. It is post-P0 discovery and prototype planning.

## P0 Sprint Isolation Rule

- Do not edit P0 launch blocker code.
- Do not deploy.
- Do not add dependencies to the live app.
- Do not call ElevenLabs APIs.
- Do not add secrets or env values.
- Do not stage unrelated dirty-tree work.

## Safety Rules

- No unauthorized voice cloning.
- No real athlete, coach, celebrity, user, founder, or private-person imitation.
- No sportsbook/casino promotion narration without legal/founder approval.
- No gambling hype, urgency, or stake language.
- No public audio that leaks methodology, formulas, weights, or source recipes.
- No customer audio storage without explicit consent and deletion policy.

## Repo Audit Plan

Use GitHub API metadata, README content, root files, language stats, release metadata, license metadata, and official ElevenLabs docs/pricing/safety pages. Treat every repo as untrusted until verified.

## GSE App Integration Audit Plan

Audit routes under apps/web/app, existing media/audio governance under docs/media and docs/audit, and brand/compliance scans. Voice opportunities must extend these docs rather than duplicate them.

## Duplicate Prevention Plan

Existing duplicate-risk anchors:

- docs/media/audio-voice-policy.md
- docs/audit/media-automation-risk-policy.md
- docs/media/video-brief-pipeline.md
- docs/research/top-20-rd/areas/RD20-19-brand-voice-and-content-operating-system.md
- command-center P0 build queue and evidence docs

New builds are marked as Voice OS extensions, not replacements.

## Prototype Rules

Allowed: interfaces, docs, fake provider, script templates, static audio placeholders, transcript/caption component specs, safety linter specs, build cards.

Forbidden: real provider calls, API keys, production playback, live generation, customer audio storage, promotions voice, deployment.

## Approval Gates

Founder approval: any public audio feature, provider key, voice selection, cost budget, founder-only audio.

Legal approval: promotions, affiliate disclosures, synthetic-media policy, jurisdiction-sensitive betting language, voice likeness/licensing.

Privacy approval: customer audio, support transcripts, retention/deletion plan.

## Workstreams

AGENT 0 Coordinator / Final Integrator; AGENT 1 Repo Verifier; AGENT 2 License / API / Cost / Terms Risk; AGENT 3 GSE App Surface Auditor; AGENT 4 Voice Product Strategist; AGENT 5 Support Voice Architect; AGENT 6 Content / Daily Brief Architect; AGENT 7 Accessibility / Captions; AGENT 8 Onboarding / Help Overlay; AGENT 9 Agent / MCP / Automation; AGENT 10 Next.js Integration; AGENT 11 Mobile Future; AGENT 12 Audio Processing; AGENT 13 Brand Voice; AGENT 14 Compliance; AGENT 15 Cost / Quota; AGENT 16 Prototype Developer; AGENT 17 Claude Handoff; AGENT 18 Final Critic.

## Files Expected

Phase docs 00-15, repo inventory CSV, build queue index, build queue JSONL, and build card markdown files under this directory.

## Commands Planned

- git status --short
- Get-ChildItem apps/web/app -Directory
- Get-ChildItem apps/web/app -Recurse -Filter page.tsx
- rg -n "voice|audio|ElevenLabs|narrat|caption|transcript|podcast|spoken|tts|text-to-speech|voiceover" docs apps packages scripts
- GitHub API: /repos/elevenlabs/{repo}, /releases/latest, /contents, /readme, /languages

## What Can Be Built Safely

Docs, local fake provider interfaces, transcript-first component specs, safety linter specs, and static prototypes that do not call APIs.

## What Requires Approval

Any real ElevenLabs key, API call, generated audio, production dependency, public playback feature, customer audio storage, voice cloning, promotion narration, or launch deployment.

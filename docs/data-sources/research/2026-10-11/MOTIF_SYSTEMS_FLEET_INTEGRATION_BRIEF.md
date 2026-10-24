# Motif Systems Inventory — Fleet Integration Brief (2)

Source: Motif Systems Inventory — Fleet Integration Brief (2).docx

Motif Systems Inventory — Fleet Integration Brief

Prepared 2026-10-07 by Motif, for Hermes (and any agent wiring the fleet together).Purpose: one complete map of every system Motif controls, how each is reached, and how agents talk to each other. Nothing here is a raw secret — see §8 for the credential rule.

1. Compute & runtime (Motif's VM)

Linux VM, persistent home (~ survives restarts; /tmp does not). Shell, filesystem, Python/Node toolchains.

Real Chromium browser — persistent cookies/sessions, can act on logged-in sites. Garrett can watch/take over live.

Scheduler: cron jobs (minutely/hourly/daily), hooks, systemd services. All schedules listed in §5.

Subagents: I can spawn background child agents that inherit my context and report back. This is my parallel-execution arm.

Workspace root: ~/workspace/. Key trees:

~/workspace/skills/<name>/ — capability playbooks, each with SKILL.md + bin/ CLIs

~/workspace/goals/<goal-slug>/ — goal workspaces (GOAL.md, files/, hidden_files/)

~/workspace/your_files/ — files meant for Garrett's eyes

~/memory/, ~/MEMORY.md — my long-term memory (people, groups, daily logs)

2. GitHub — Beexly org (system of record)

Auth: stored credential custom.github, used via surrogate auth — no raw tokens anywhere. Identity: Beexly.

CLIs (~/workspace/skills/github/bin/):

github-api METHOD /path [json-body] — generic REST to api.github.com (auth restricted to that host)

github-push-files owner/repo branch "message" local=remote [...] — push files via Git Database API (Contents API fallback on empty repos). Full-file blobs only, no deletes.

Repos that matter:

Beexly/Sports — Galaxy Sports Edge system of record. All sports material lands in docs/research/<date>/. AGENTS.md is the repo contract every agent follows.

Beexly/agent-bus — the fleet message bus (§3).

Beexly/autonomous-revenue-engine — Kit sites, SignPreview, Vow & Post, Recordly.

Also: gse-competitive-intel, OmniRoute, espn-groupme-bot, GSN.Cards.

Never touch: gse-grok-build-sandbox (isolated by design).

Push policy (Garrett's standing order): nothing stays local-only. Every agent lands work on the remote — clean branches, file-scoped pushes, PRs where review makes sense. GitHub code review is the safeguard.

Deploys: Vercel — autonomous-revenue-engine-eight.vercel.app (Kit page, SignPreview live).

3. Agent bus — how the fleet talks

Repo: Beexly/agent-bus.

Layout:

inbox/from-motif/, inbox/from-opencode/ (= Hermes), inbox/from-grok/, … — task packages addressed TO an agent

outbox/from-motif/, outbox/from-opencode/, … — replies, deliverables, QC verdicts FROM an agent

Root docs: quality doctrine, repo map, protocols.

Protocol: markdown files, dated names (YYYY-MM-DD-<from>-<topic>.md). One complete handoff per file: inputs, method, output shape, files to compose with, what the test asserts. No publish-gated links — full content in the file.

Motif's pickup loop: agent-bus-watch cron, hourly. Lists inbox/from-opencode/ + outbox/from-opencode/, diffs against watermark ~/workspace/goals/autonomous-revenue-engine/hidden_files/agent-bus-watch-seen.json, QCs deliverables against the 9.2 bar (runs, real output, no placeholders, README + sample output), and writes verdicts/unblocks back to outbox/from-motif/. The loop is bidirectional — my answers go on the bus, not just in chat.

Who's who on the bus:

Motif (me) — orchestrator, strategy, QC gate. This VM.

Hermes ("Minis") — overnight builder, OpenCode via the Minis phone app. Owns the Puter lane. Reads outbox/from-motif/, writes inbox/from-opencode/ + outbox/from-opencode/.

Jules — Google's async coding agent, driven via Jules API (sessions, sendMessage, approvePlan, DELETE). Opens PRs on Beexly/Sports.

OpenCode / Cursor coding agents — heavy builds on the Sports repo.

Grok — briefs + Signal Origin X ops; cannot write to the bus directly (only its 2026-10-02 wire package lives there).

DeepSeek — theorist for the MOVE-37 lane (no code execution, ever).

4. Connected services (via skills — OAuth/secure storage, no raw keys in my hands)

Service

Skill path

What it does

Gmail

/opt/hatch/skills/gmail/SKILL.md

Read/search/send/drafts/labels on baxley.garrett@gmail.com

Google Calendar

/opt/hatch/skills/google-calendar/SKILL.md

Agenda, event details, scheduling

Facebook

/opt/hatch/skills/facebook-cli/SKILL.md

Marketplace listings (13 live), Messenger threads

Instagram

/opt/hatch/skills/instagram/SKILL.md

@gbeexly (messages-connected, Kit DM watch), @galaxysportsnetwork

X / Twitter

~/workspace/skills/x-poster/SKILL.md

@GalaxySportsHQ — drafts → 9.2 quality gate → Garrett APPROVE → post. Nothing posts without his explicit word.

OpenRouter

~/workspace/skills/openrouter/SKILL.md

Model calls on Garrett's account (stored custom.openrouter). No spend without his explicit cap.

Hugging Face

~/workspace/skills/huggingface/SKILL.md

Models/datasets/Spaces (stored custom.huggingface)

Firecrawl

~/workspace/skills/firecrawl/SKILL.md

Web scraping (Garrett's key; 5k credits/mo). No auth bypass, no paywall circumvention.

Plaid

/opt/hatch/skills/plaid/SKILL.md

Linked bank accounts: balances, transactions

Meta Ads

/opt/hatch/skills/meta-ads/SKILL.md

Ad accounts, campaigns, spend, policy checks (connected 2026-10-07)

Stripe

(connected 2026-10-07)

Customers, products, payment links, invoices, refunds

Replit

(connected 2026-10-07)

Read/create/update/publish apps

Wallet

Shop Pay / Stripe Link

Saved payment methods, profile, shipping (via secure provider pages)

Phone (paired device)

device namespace

Run commands, pull data (contacts, calendar, location)

Media library

/opt/hatch/skills/media-library/SKILL.md

Garrett's photo library

TTS / voice

/opt/hatch/skills/tts/SKILL.md

Voice notes, spoken audio

Spotify

/opt/hatch/skills/spotify/SKILL.md

Playlists, playback

Apple HealthKit / Google Health Connect

(skills)

Synced health data

Neon Postgres

transient credential, never stored

gse-postgres/neondb — engine predictions DB, read-only pulls for verification

The Odds API

key exists, value not stored

20K credits/mo sports odds — use for backfills

5. Scheduled jobs (the fleet's heartbeat)

Job

Cadence

What it does

kit-dm-watcher

15 min

Watches @gbeexly IG inbox for Kit inquiries; draft mode only, never sends

daily-money-sprint

9:08 AM CT

Autonomous revenue attempt; writes report, never spends/contacts without Garrett

gse-analytics-sweep-am / -pm

9:08 AM / 9:08 PM CT

Read-only X sweep for new NFL analytics → neutral inventory in Sports repo

agent-bus-watch

hourly

Hermes pickup + QC loop (§3)

jules-session-shepherd

6 h

No-backlog enforcement: every Jules session worked to completion same-day

hf-space-autoscale

30 min

GPU autoscale for the GSE watch pipeline (game-aware)

marketplace-listings-daily-watch

9:08 AM CT

13 listings health + buyer-message triage (read-only, never messages anyone)

intel-watch-check

~8:08 AM CT

Domain watch list (Intel bot)

6. Local services on this VM

OpenDots — 127.0.0.1:4310. 14 prompt-defined assistant dots (incl. 4-dot Review Board: Merge Sheriff, Numbers Cop, Research Auditor, Voice Judge). SQLite-backed. No verified phone-access URL yet.

Reclip — http://localhost:8899. Self-hosted media downloader (yt-dlp + ffmpeg), verified end-to-end.

Intel bot (Telegram) — 102 commands: threat intel, username engine, webcheck, family-protection resources. Defensive only: no live people-tracking, no face ID, no camera-following — standing refusals.

7. Standing rules any integrating agent must obey

Nothing stays local — if it's not on the remote/bus, it didn't happen.

No spend without Garrett's explicit cap. Ever.

No X post, no DM, no public publish without his explicit APPROVE.

No accounts created, no identity/tax/bank docs submitted without his word.

Never touch gse-grok-build-sandbox.

Counts carry their counting method. Completion claims carry tests + remote SHAs.

Garrett-human voice on anything outward-facing (see ~/workspace/vendor/autonomous-revenue-engine/ops/x-voice/voice-brief-2026-10-04.md).

License-clean: MIT = port with attribution; AGPL = clean-room re-implementation only, never copied code.

Real footage only for sports video — never AI-slideshow substitutes.

Public site shows projections/rankings only — signals, metrics, methodology stay internal.

8. Credentials — the rule (read carefully)

I do not hold raw API keys, passwords, or tokens in files, memory, or chat. They live in platform secure storage / OAuth connections and I use them through the skill's auth flow without seeing values.

Therefore: there are no keys to hand Hermes. Any integration design that requires pasting a raw key is the wrong design.

The correct integration surfaces are: (a) the agent bus markdown protocol (§3), (b) GitHub repos as the system of record (§2), (c) each agent using its own stored credentials on its own host.

If a lane needs a new credential, Garrett creates/connects it himself (OAuth or secure entry) — agents never ask for raw secrets in chat.

Known credential metadata (existence only, no values): custom.github (Beexly), custom.openrouter, custom.huggingface, Odds API key (Garrett's), Firecrawl key (held by Hermes), Experiential Labs key (OpenDots), Neon Postgres (transient per-use). GitHub token named minis expected expiry ~2026-10-12 — will need rotation.

9. Orca — evaluation (added 2026-10-07 at Garrett's request)

Repo: stablyai/orca — 87k stars, MIT license, pushed 2026-10-07 (today). Real, active, credible.

What it is: "The AI Orchestrator for 100x builders." Runs Codex, Claude Code, OpenCode, or Pi side-by-side, each in its own git worktree, tracked in one place. Desktop app (macOS/Windows/Linux) + mobile companion (iOS App Store + Android APK) — monitor agents from the phone, get notified when one finishes, send follow-ups from anywhere.

Why it matters here: Hermes IS OpenCode (via Minis on Garrett's phone). Orca natively runs OpenCode agents — so Orca is a credible next home for the Hermes lane, with a real phone app instead of the Minis workaround.

Caveats:

The mobile app is a companion to the desktop app — Orca desktop must be running somewhere (his Windows box is the natural host; SSH worktrees can reach a remote box) for the phone to steer agents.

Orca does not speak the agent-bus protocol. Wiring Orca ↔ bus (read inbox, write outbox, respect the QC loop) is the integration task — it doesn't happen by installing alone.

Download: https://onorca.dev/download · iOS: App Store (orca-ide, id6766130217) · Android: APK on the GitHub releases page.

Suggested path: install Orca desktop on the Windows box → connect it to the Sports checkout → trial one OpenCode worktree on a small bus task → then design the bus bridge (a small watcher that mirrors bus inbox files into Orca tasks and posts results back to outbox). Do NOT retire Minis/Hermes until the bridge is proven.

What Maestro Flow Actually Teaches You

Maestro Flow’s architecture is more useful as a pattern library than as an installed tool. Its four orchestration modes map directly onto what you need:

Maestro ModeWhat It DoesYour Equivalent

DelegateAsync hand-off to a worker model, Claude goes quiet until there’s a decisionClaude spawns a Sonnet subagent for a boilerplate task, wakes only to approve or reject

TeamRole-based agents with inner-loop execution, coordinator orchestrates the pipelineOpus as lead, Haiku as Explore/scanner, Sonnet as builder, Opus as reasoner

WaveIndependent tasks run in parallel, dependent tasks wait for predecessorsScaffold components in parallel, then merge for integration

SwarmAnt-colony exploration for divergent problemsMultiple Opus subagents draft the camera path from different angles, best wins

The core insight from Ralph v2: intent classification into command chains with dynamic decision points — proceed, roll back, or insert a fix loop. You don’t need the framework. You need the routing rules, and Claude Code has native equivalents for every one of them.

The Architecture: Opus as Orchestrator, Everything Else Delegated

Model Tier Map

TierModelCost (in/out per 1M)Use For

OrchestratorOpus 5.5$4 / $20Frame loop, SSS shader, camera choreography, architecture decisions, final review

BuilderSonnet 5.5$2 / $10Component implementation with a spec, CSS, boilerplate, tests

ScannerHaiku 4.5$1 / $5File reads, grep, directory listing, dependency audits, log parsing

FrontierFable 5.1—Only after Opus at high fails twice

The efficient-claude skill formalizes exactly this: Scan is Haiku low, Build is Sonnet medium, Reason is Opus 5.5 medium, Frontier is Fable low. It states the route in one line before dispatching so you can audit it: “Routing to scan/haiku: pure grep, spec fully determines output.” On a miss, it escalates one dial at a time — never both model and effort at once.

The Routing Decision Tree

Before every task, Opus asks three questions:

Does this require architectural judgment? → Opus 5.5, medium effort

Is there a spec that fully determines the output? → Sonnet 5.5, medium effort

Is this pure retrieval or mechanical transformation? → Haiku 4.5, low effort

If the task is ambiguous (no spec, no clear boundary), it stays on Opus. Ambiguity is the signal that judgment is needed.

Subagent Model Configuration

Claude Code supports per-subagent model overrides via three mechanisms, in precedence order:

CLAUDE_CODE_SUBAGENT_MODEL env var (highest)

Per-invocation model parameter in the Agent tool call

Frontmatter model field in the subagent definition

Main session model (lowest — the default you must override)

The critical fix: set CLAUDE_CODE_SUBAGENT_MODEL to sonnet in your settings. Without it, an Opus session runs every grep and every file rename on Opus. With it, every subagent that isn’t explicitly routed falls back to Sonnet instead of the expensive session model.

json

// ~/.claude/settings.json

{

  "env": {

    "CLAUDE_CODE_SUBAGENT_MODEL": "sonnet"

  }

}

Then, for the scanner and reasoner subagents, pin the model in their frontmatter so they override the fallback:

yaml

# ~/.claude/agents/scan.md

---

name: scan

description: Fast read-only code search, file reads, grep, directory listing

model: haiku

effort: low

tools: [Read, Glob, Grep]

---

yaml

# ~/.claude/agents/build.md

---

name: build

description: Implementation from a fully-specified task

model: sonnet

effort: medium

tools: [Read, Write, Edit, Bash, Glob, Grep]

---

Now Agent(subagent_type: "scan") is always Haiku at low effort regardless of session model. Agent(subagent_type: "build") is always Sonnet. Opus stays on the main thread for reasoning.

Path-Scoped Rules: Context Only Where It Matters

Your CLAUDE.md must stay under 200 lines. Everything else goes into .claude/rules/ with path scoping, loading only when Claude touches matching files.

markdown

<!-- .claude/rules/frame-loop.md -->

---

paths:

  - "src/components/ScrollBridge.tsx"

  - "src/lib/scroll/**/*.ts"

---

# Frame Loop Rules

- Lenis instance with autoRaf: false at layout level, single instance

- GSAP ticker drives Lenis: gsap.ticker.add((time) => lenis.raf(time * 1000))

- Lenis drives ScrollTrigger: lenis.on('scroll', ScrollTrigger.update)

- Scroll progress written to Zustand, R3F reads via getState() in useFrame

- scrub MUST be a number (e.g. scrub: 1), never true

- Every ScrollTrigger MUST set invalidateOnRefresh: true

markdown

<!-- .claude/rules/food-materials.md -->

---

paths:

  - "src/components/Table/**/*.tsx"

  - "src/shaders/**/*.glsl"

---

# Food Material Rules

- Dual-node SSS: primary for flesh (radius 5-15mm), secondary for fat (higher albedo)

- Texture map drives the blend between nodes

- Roughness variation map + micro bump map required

- Three-point lighting: soft warm key, fill, rim/backlight

- No perfectly smooth surfaces

Path-scoped rules load with the same high priority as CLAUDE.md, but only when Claude works with matching files. This reduces noise and saves context space.

The Build Plan: Opus Orchestrates, Subagents Execute

Phase 1 — Foundation (Opus + Sonnet)

TaskModelRationale

Scaffold Next.js 15 + Tailwind + TypeScriptSonnetBoilerplate, spec fully determines output

Install stack, verify packagesHaikuPure mechanical verification

Write CLAUDE.md + path-scoped rulesOpusArchitectural judgment

Implement Lenis + GSAP + Zustand bridgeOpusHardest technical problem in the build

Write ScrollBridge.tsxOpusJudgment required, no spec exists yet

DoD: no desync on fast scroll. Opus verifies this personally. No subagent.

Phase 2 — The Table (Opus + Sonnet + Haiku)

TaskModelRationale

Source GLB assets, verify licensesHaikuRetrieval task

Load GLBs, clone, auto-scale via Box3SonnetSpec exists (Burger House 3D pattern)

Implement InstancedMesh for identical itemsOpusPerformance-critical, judgment needed

Merge unique static geometrySonnetImplementation from spec

Build LOD systemOpusArchitecture decision

Arrange 24-ft table in BlenderYouHuman task, not delegable

Phase 3 — Food Materials (Opus Only)

TaskModelRationale

Write dual-node SSS shaderOpusHardest visual problem, no spec exists

Texture-map blend between nodesOpusTuning requires judgment

Roughness variation + micro bump mapsSonnetImplementation from spec

Three-point studio lighting rigSonnetWell-documented pattern

Pre-compile shaders, cold-compile < 400msOpusPerformance judgment

DoD: food reads as appetizing in a still frame with no context. Opus judges this. No subagent.

Phase 4 — Camera Choreography (Opus + Sonnet)

TaskModelRationale

Define 8 keyframes in Theatre.jsOpusCreative judgment

Camera path as CatmullRomCurve3SonnetImplementation from spec

Add Simplex noise driftSonnetLibrary exists, spec determines output

Custom physics-based easingOpusTuning requires judgment

Map scroll to camera positionSonnetPattern established in Phase 1

Section-specific lighting per keyframeSonnetImplementation from spec

Phase 5 — Diegetic Calculator (Sonnet + Opus)

TaskModelRationale

Build calculator as DOM formSonnetStandard React

Wire form state to ZustandSonnetPattern established

Populate 3D table on input changeOpusDOM/WebGL sync, judgment needed

Camera pull-back at keyframe 8SonnetTheatrical timeline extension

Price renders as part of sceneSonnetDOM/WebGL sync pattern now established

Phase 6 — Performance + Fallback (Opus + Sonnet)

TaskModelRationale

Web Worker for geometry calcOpusArchitecture decision

Geometry cachingSonnetImplementation from spec

Adaptive DPR (1.5 mobile, 2 desktop)SonnetStandard pattern

Video fallbackSonnetSimple implementation

prefers-reduced-motion pathSonnetCSS + JS conditional

No-WebGL pathSonnetStatic hero + CSS parallax

What Maestro Flow Gets Right That You Should Steal

1. The knowledge graph pattern. Maestro persists patterns and pitfalls as specs, injecting them into subsequent agent prompts. Your equivalent: after each phase, write a one-page “lessons learned” into .claude/rules/. The frame loop lessons go in frame-loop.md. The SSS tuning lessons go in food-materials.md. Next session loads them automatically.

2. The dynamic pipeline model. Maestro generates pipelines at runtime from task-analysis.json — a dependency graph with blockedBy chains. Your equivalent: Opus maintains the task list in the session, spawning subagents only when their dependencies are complete. Wave execution, not waterfall.

3. The checkpoint pattern. At decision nodes, Maestro evaluates: proceed, roll back, or insert a fix loop. Your equivalent: after each phase’s DoD, Opus decides whether to accept, send back with notes, or escalate to a higher model. The efficient-claude skill calls this escalation-on-evidence: move up one dial at a time, never both.

4. The visual dashboard. Maestro runs a Kanban at http://127.0.0.1:3001. Your equivalent: Claude Code’s agent view (claude agents) shows dispatched sessions and their status.

Cost Forecast

Based on agent-hub’s real numbers: 30 tasks that would have cost ≈$110 at Opus 5.5 prices** cost **$1.10 when delegated to cheap models with gates and review.

Your build has roughly 40 discrete tasks. At Opus-only pricing, the full build would cost $150–$250 in tokens. With delegation:

TierTasksEst. Cost

Opus (orchestrator + 8 hard tasks)10$40–$70

Sonnet (build tasks)20$8–$15

Haiku (scan tasks)10$1–$2

Total40$49–$87

The savings come from Opus not running every file read and every boilerplate component. It runs the frame loop, the SSS shader, the camera path, and the final review. Everything else is delegated.

Immediate Setup Steps

Step 1: Install efficient-claude globally. It routes every delegated task automatically.

bash

npx skills add thevrus/efficient-claude -g

Step 2: Copy the tier-pinned agent definitions into your project.

bash

cp -R ~/.claude/skills/efficient-claude/agents/* ~/.claude/agents/

Step 3: Set the subagent fallback model in ~/.claude/settings.json.

json

{

  "env": {

    "CLAUDE_CODE_SUBAGENT_MODEL": "sonnet"

  }

}

Step 4: Create .claude/rules/ with path-scoped rules for frame-loop, food-materials, and camera. Keep CLAUDE.md under 200 lines with only the stack, palette, and scope boundaries.

Step 5: Start the session on Opus 5.5 medium. Give it the full brief. Let it route.

The key insight: Opus is not a coder. Opus is a judge. It decides what to build, who should build it, and whether the result passes. The coding happens on Sonnet and Haiku. Opus touches only what requires judgment: the frame loop, the shader, the camera, and the final review.

Motif Systems Inventory — Fleet Integration Brief

Prepared 2026-10-07 by Motif, for Hermes (and any agent wiring the fleet together).

Purpose: one complete map of every system Motif controls, how each is reached, and how agents talk to each other. Nothing here is a raw secret — see §8 for the credential rule.

1. Compute & runtime (Motif's VM)

Linux VM, persistent home (~ survives restarts; /tmp does not). Shell, filesystem, Python/Node toolchains.

Real Chromium browser — persistent cookies/sessions, can act on logged-in sites. Garrett can watch/take over live.

Scheduler: cron jobs (minutely/hourly/daily), hooks, systemd services. All schedules listed in §5.

Subagents: I can spawn background child agents that inherit my context and report back. This is my parallel-execution arm.

Workspace root: ~/workspace/. Key trees:

~/workspace/skills/<name>/ — capability playbooks, each with SKILL.md + bin/ CLIs

~/workspace/goals/<goal-slug>/ — goal workspaces (GOAL.md, files/, hidden_files/)

~/workspace/your_files/ — files meant for Garrett's eyes

~/memory/, ~/MEMORY.md — my long-term memory (people, groups, daily logs)

2. GitHub — Beexly org (system of record)

Auth: stored credential custom.github, used via surrogate auth — no raw tokens anywhere. Identity: Beexly.

CLIs (~/workspace/skills/github/bin/):

github-api METHOD /path [json-body] — generic REST to api.github.com (auth restricted to that host)

github-push-files owner/repo branch "message" local=remote [...] — push files via Git Database API (Contents API fallback on empty repos). Full-file blobs only, no deletes.

Repos that matter:

Beexly/Sports — Galaxy Sports Edge system of record. All sports material lands in docs/research/<date>/. AGENTS.md is the repo contract every agent follows.

Beexly/agent-bus — the fleet message bus (§3).

Beexly/autonomous-revenue-engine — Kit sites, SignPreview, Vow & Post, Recordly.

Also: gse-competitive-intel, OmniRoute, espn-groupme-bot, GSN.Cards.

Never touch: gse-grok-build-sandbox (isolated by design).

Push policy (Garrett's standing order): nothing stays local-only. Every agent lands work on the remote — clean branches, file-scoped pushes, PRs where review makes sense. GitHub code review is the safeguard.

Deploys: Vercel — autonomous-revenue-engine-eight.vercel.app (Kit page, SignPreview live).

3. Agent bus — how the fleet talks

Repo: Beexly/agent-bus.

Layout:

inbox/from-motif/, inbox/from-opencode/ (= Hermes), inbox/from-grok/, … — task packages addressed TO an agent

outbox/from-motif/, outbox/from-opencode/, … — replies, deliverables, QC verdicts FROM an agent

Root docs: quality doctrine, repo map, protocols.

Protocol: markdown files, dated names (YYYY-MM-DD-<from>-<topic>.md). One complete handoff per file: inputs, method, output shape, files to compose with, what the test asserts. No publish-gated links — full content in the file.

Motif's pickup loop: agent-bus-watch cron, hourly. Lists inbox/from-opencode/ + outbox/from-opencode/, diffs against watermark ~/workspace/goals/autonomous-revenue-engine/hidden_files/agent-bus-watch-seen.json, QCs deliverables against the 9.2 bar (runs, real output, no placeholders, README + sample output), and writes verdicts/unblocks back to outbox/from-motif/. The loop is bidirectional — my answers go on the bus, not just in chat.

Who's who on the bus:

Motif (me) — orchestrator, strategy, QC gate. This VM.

Hermes ("Minis") — overnight builder, OpenCode via the Minis phone app. Owns the Puter lane. Reads outbox/from-motif/, writes inbox/from-opencode/ + outbox/from-opencode/.

Jules — Google's async coding agent, driven via Jules API (sessions, sendMessage, approvePlan, DELETE). Opens PRs on Beexly/Sports.

OpenCode / Cursor coding agents — heavy builds on the Sports repo.

Grok — briefs + Signal Origin X ops; cannot write to the bus directly (only its 2026-10-02 wire package lives there).

DeepSeek — theorist for the MOVE-37 lane (no code execution, ever).

4. Connected services (via skills — OAuth/secure storage, no raw keys in my hands)

Service

Skill path

What it does

Gmail

/opt/hatch/skills/gmail/SKILL.md

Read/search/send/drafts/labels on baxley.garrett@gmail.com

Google Calendar

/opt/hatch/skills/google-calendar/SKILL.md

Agenda, event details, scheduling

Facebook

/opt/hatch/skills/facebook-cli/SKILL.md

Marketplace listings (13 live), Messenger threads

Instagram

/opt/hatch/skills/instagram/SKILL.md

@gbeexly (messages-connected, Kit DM watch), @galaxysportsnetwork

X / Twitter

~/workspace/skills/x-poster/SKILL.md

@GalaxySportsHQ — drafts → 9.2 quality gate → Garrett APPROVE → post. Nothing posts without his explicit word.

OpenRouter

~/workspace/skills/openrouter/SKILL.md

Model calls on Garrett's account (stored custom.openrouter). No spend without his explicit cap.

Hugging Face

~/workspace/skills/huggingface/SKILL.md

Models/datasets/Spaces (stored custom.huggingface)

Firecrawl

~/workspace/skills/firecrawl/SKILL.md

Web scraping (Garrett's key; 5k credits/mo). No auth bypass, no paywall circumvention.

Plaid

/opt/hatch/skills/plaid/SKILL.md

Linked bank accounts: balances, transactions

Meta Ads

/opt/hatch/skills/meta-ads/SKILL.md

Ad accounts, campaigns, spend, policy checks (connected 2026-10-07)

Stripe

(connected 2026-10-07)

Customers, products, payment links, invoices, refunds

Replit

(connected 2026-10-07)

Read/create/update/publish apps

Wallet

Shop Pay / Stripe Link

Saved payment methods, profile, shipping (via secure provider pages)

Phone (paired device)

device namespace

Run commands, pull data (contacts, calendar, location)

Media library

/opt/hatch/skills/media-library/SKILL.md

Garrett's photo library

TTS / voice

/opt/hatch/skills/tts/SKILL.md

Voice notes, spoken audio

Spotify

/opt/hatch/skills/spotify/SKILL.md

Playlists, playback

Apple HealthKit / Google Health Connect

(skills)

Synced health data

Neon Postgres

transient credential, never stored

gse-postgres/neondb — engine predictions DB, read-only pulls for verification

The Odds API

key exists, value not stored

20K credits/mo sports odds — use for backfills

5. Scheduled jobs (the fleet's heartbeat)

Job

Cadence

What it does

kit-dm-watcher

15 min

Watches @gbeexly IG inbox for Kit inquiries; draft mode only, never sends

daily-money-sprint

9:08 AM CT

Autonomous revenue attempt; writes report, never spends/contacts without Garrett

gse-analytics-sweep-am / -pm

9:08 AM / 9:08 PM CT

Read-only X sweep for new NFL analytics → neutral inventory in Sports repo

agent-bus-watch

hourly

Hermes pickup + QC loop (§3)

jules-session-shepherd

6 h

No-backlog enforcement: every Jules session worked to completion same-day

hf-space-autoscale

30 min

GPU autoscale for the GSE watch pipeline (game-aware)

marketplace-listings-daily-watch

9:08 AM CT

13 listings health + buyer-message triage (read-only, never messages anyone)

intel-watch-check

~8:08 AM CT

Domain watch list (Intel bot)

6. Local services on this VM

OpenDots — 127.0.0.1:4310. 14 prompt-defined assistant dots (incl. 4-dot Review Board: Merge Sheriff, Numbers Cop, Research Auditor, Voice Judge). SQLite-backed. No verified phone-access URL yet.

Reclip — http://localhost:8899. Self-hosted media downloader (yt-dlp + ffmpeg), verified end-to-end.

Intel bot (Telegram) — 102 commands: threat intel, username engine, webcheck, family-protection resources. Defensive only: no live people-tracking, no face ID, no camera-following — standing refusals.

7. Standing rules any integrating agent must obey

Nothing stays local — if it's not on the remote/bus, it didn't happen.

No spend without Garrett's explicit cap. Ever.

No X post, no DM, no public publish without his explicit APPROVE.

No accounts created, no identity/tax/bank docs submitted without his word.

Never touch gse-grok-build-sandbox.

Counts carry their counting method. Completion claims carry tests + remote SHAs.

Garrett-human voice on anything outward-facing (see ~/workspace/vendor/autonomous-revenue-engine/ops/x-voice/voice-brief-2026-10-04.md).

License-clean: MIT = port with attribution; AGPL = clean-room re-implementation only, never copied code.

Real footage only for sports video — never AI-slideshow substitutes.

Public site shows projections/rankings only — signals, metrics, methodology stay internal.

8. Credentials — the rule (read carefully)

I do not hold raw API keys, passwords, or tokens in files, memory, or chat. They live in platform secure storage / OAuth connections and I use them through the skill's auth flow without seeing values.

Therefore: there are no keys to hand Hermes. Any integration design that requires pasting a raw key is the wrong design.

The correct integration surfaces are: (a) the agent bus markdown protocol (§3), (b) GitHub repos as the system of record (§2), (c) each agent using its own stored credentials on its own host.

If a lane needs a new credential, Garrett creates/connects it himself (OAuth or secure entry) — agents never ask for raw secrets in chat.

Known credential metadata (existence only, no values): custom.github (Beexly), custom.openrouter, custom.huggingface, Odds API key (Garrett's), Firecrawl key (held by Hermes), Experiential Labs key (OpenDots), Neon Postgres (transient per-use). GitHub token named minis expected expiry ~2026-10-12 — will need rotation.

9. Orca — evaluation (added 2026-10-07 at Garrett's request)

Repo: stablyai/orca — 87k stars, MIT license, pushed 2026-10-07 (today). Real, active, credible.

What it is: "The AI Orchestrator for 100x builders." Runs Codex, Claude Code, OpenCode, or Pi side-by-side, each in its own git worktree, tracked in one place. Desktop app (macOS/Windows/Linux) + mobile companion (iOS App Store + Android APK) — monitor agents from the phone, get notified when one finishes, send follow-ups from anywhere.

Why it matters here: Hermes IS OpenCode (via Minis on Garrett's phone). Orca natively runs OpenCode agents — so Orca is a credible next home for the Hermes lane, with a real phone app instead of the Minis workaround.

Caveats:

The mobile app is a companion to the desktop app — Orca desktop must be running somewhere (his Windows box is the natural host; SSH worktrees can reach a remote box) for the phone to steer agents.

Orca does not speak the agent-bus protocol. Wiring Orca ↔ bus (read inbox, write outbox, respect the QC loop) is the integration task — it doesn't happen by installing alone.

Download: https://onorca.dev/download · iOS: App Store (orca-ide, id6766130217) · Android: APK on the GitHub releases page.

Suggested path: install Orca desktop on the Windows box → connect it to the Sports checkout → trial one OpenCode worktree on a small bus task → then design the bus bridge (a small watcher that mirrors bus inbox files into Orca tasks and posts results back to outbox). Do NOT retire Minis/Hermes until the bridge is proven.

10. Jules — Google's async coding agent (full)

What it is: Garrett's bounded-background coding agent on connected GitHub repos. Opens sessions, works, opens PRs.

Skill: ~/workspace/skills/jules/SKILL.md — full API reference.

How Motif drives it (beyond the documented skill, learned 2026-10-05/06):

POST /v1alpha/sessions/{id}:sendMessage {"prompt":"..."} — steer a live session (works on AWAITING_USER_FEEDBACK and COMPLETED).

POST /v1alpha/sessions/{id}:approvePlan {} — approve a plan (requirePlanApproval flow). Returns {} on success.

DELETE /v1alpha/sessions/{id} — works, returns {} (undocumented). Use to remove dead FAILED sessions so the dashboard stops showing stale clutter. Never delete a session with a live PR or one actively working; never delete COMPLETED sessions that are the record of landed work.

Session outputs[] carries pullRequest (url/number) and/or changeSet — check it; AUTO_CREATE_PR does not always produce a PR.

Always inspect the actual changeset diff before approving: one session did string renames instead of the ordered removal — renames that hide a surface are the opposite of removal.

requirePlanApproval is unreliable in batch (learned 2026-10-06, HARD): firing 10 sessions at once with requirePlanApproval: true → all 10 generated plans then went COMPLETED within ~15 min with zero work done. approvePlan on COMPLETED returns {} but does NOT resume. Fix: batch/overnight runs fire WITHOUT requirePlanApproval (sessions go IN_PROGRESS and work); PRs get reviewed on arrival per the Merge Sheriff doctrine. Only use requirePlanApproval for single high-stakes sessions you'll approve within minutes.

Standing doctrine (Garrett: "Jules should never have a backlog"): every session gets logged and worked to completion. Nothing sits in AWAITING_USER_FEEDBACK — answer, approve, or steer it the same day. Failed sessions get re-fired (if the work matters) or dropped with a logged reason. Enforced by jules-session-shepherd cron every 6h.

Merge Sheriff doctrine: every PR gets merged, fixed, or closed with the reason on it — no limbo. 2026-10-06 pass cleared ~100 open PRs. Completion claims are never trusted without PR/diff/test/SHA verification (Motif caught a fake PR #1025 merge claim and merged the dossier himself).

Scale notes: 14 sessions ran the 2026-10-06 overnight wave. No Paperclip adapter exists for Jules.

11. OpenDots — the 14 dots (full)

What it is: 14 prompt-defined assistant dots across seven spaces, backed by a local SQLite DB. HTTP server at 127.0.0.1:4310.

The 14: includes the 4-dot Review Board — Merge Sheriff, Numbers Cop, Research Auditor, Voice Judge — plus 10 working dots across the spaces.

Honest state (Garrett's verdict: "This is the floor."): the dots are mostly prompt + database records, not deeply integrated agents. They have no real memory yet, no verified phone-access URL, no verified Experiential Labs free allocation, and the global model-swap script is incomplete.

Memory path: Hindsight's bank-per-agent model maps 1:1 onto the 14 memory-less dots via its MCP endpoint — evaluated 2026-10-06, verdict ADAPT (pilot), not yet built.

Ops notes: the server died sometime after the 2026-10-06 13:24 Experiential Labs key switch; Motif restarted it (HTTP 200, all 14 dots present). No supervisor yet — a restart cron/service is owed.

Keys: Experiential Labs key (switched 2026-10-06 13:24); allocation unverified.

12. GSE engine & data assets

Beexly/Sports (TypeScript) — the system of record. AGENTS.md is the governing contract. Corpus rule: ALL sports material lands in docs/research/<date>/; workspace is scratch.

Engine: v5.3.0 calibration-rebuild goal active. Wiring backlog owned by Motif (read-only repo sweeps → wire built-but-not-wired code). Engine loop: research → wire → weight → calibrate → test → polish, never re-sequenced.

Watch pipeline: Hugging Face Space Beexly/gse-watch-pipeline, game-aware GPU autoscale (hf-space-autoscale cron: t4-small live/near-kickoff, cpu-basic otherwise).

Mind build (the most important work, Garrett's words): mind.jsonl owned by Trainer A — second writers forbidden. Brain ingestion landed on branch motif/brain-ingestion-2026-10-05 (PR #1025, merged by Motif after Jules's fake-merge claim). Transfer operators v1, corrections dossier, phases 0–6. Trainer ingestion is proven by observed PIDs and row counts, never claimed.

Equation grind: 723 rows, 0 usable grounded rows; Grid-powered extraction stalled when the Grid key left the environment. Awaiting Garrett's call: free-path relaunch vs Grid key re-paste.

Kaggle destroyer corpus: 20/20 lane reports with adversarial REVIEW PASS sections, in docs/research/2026-10-06/kaggle-destroyer/ (index + lanes 01–05 verified on remote; remainder landing in progress). Paid GLM adjudication spend under audit — no further paid calls without Garrett's explicit cap.

Machine-discovery lane: DeepSeek = theorist/protocol engineer (NO code execution); Motif VM = execution lab. No DeepSeek numeric claim published or built on without lab execution.

Public surfaces: site shows projections/rankings ONLY. NGS data, metric names, signals, methodology stay internal. X @GalaxySportsHQ, TikTok @galaxy.sports.edge, Instagram, YouTube channel.

13. Other agents, lanes & evaluations

Grok — briefs (GSE Signal Desk daily factory, signal-origin-overnight-ops email), Signal Origin X lane (@SignaL_OriginHQ, sports excluded). Cannot write to the bus directly.

Hermes — also owns the Puter / ai-chat lane (Garrett's word: that lane is Hermes's; Motif stays out unless routed back). Holds the Firecrawl key. Hosts OpenCode Zen.

DeepSeek — MOVE-37 theorist. 2026-09-14 second-pass audit found 20 confirmed defects incl. systemic citation fabrication; corrected README + ledger drafted.

Mimo — stats & calibration agent on Garrett's Windows box (8 orphan branches found 2026-09-25; rescues in flight).

Cursor / OpenCode coding agents — heavy builds on Sports.

Evaluated 2026-10-06, NOT adopted (pilots only):

Hindsight (vectorize-io/hindsight, MIT, 46k★) — agent memory; ADAPT: bank-per-agent pilot for the 14 dots. Caution: token burn per retain/recall; setup defaults to their paid cloud unless self-hosted URL passed explicitly.

Paperclip (paperclipai/paperclip, MIT, 98k★) — agent-fleet orchestrator with per-agent cost budgets + auto-pause; ADAPT: self-hosted pilot, telemetry disabled day one (PAPERCLIP_TELEMETRY_DISABLED=1). Blocked on: no Jules adapter, no Motif adapter, 6,200+ open issues. Agent bus stays the interchange.

Impeccable (pbakaus/impeccable, 77k★) — design-quality tooling; candidate for Kit/GSE surface polish. Not yet trialed.

End of inventory v2 — 2026-10-07. If a system isn't in §§1–13, Motif doesn't control it or it hasn't been inventoried yet — ask and it gets added.

Google Deep Research Prompt — Fleet Audit & Orchestration Architecture (v3)

Paste the whole block below into Google Deep Research. Attach motif-systems-inventory-2026-10-07.md (my full systems map) as a reference file if the tool allows uploads.

Prompt

I am a one-man team running an AI agent fleet that builds and operates Galaxy Sports Edge (GSE), a sports-intelligence prediction engine. I need you to act as my chief of staff and systems architect. Your job has six parts, in this order: (1) audit what I have, (2) discover what I'm missing, (3) hunt down forgotten work, (4) establish one shared picture of the project, (5) design the orchestration, (6) define how the fleet runs day to day. Be thorough, be honest about trade-offs, and price everything — I am cost-sensitive and I do not spend without a cap.

My pains (map your findings to these)

I am the courier — agents can't reliably reach each other without me carrying messages.

Work goes stale — sessions stall, PRs sit, inbox files never get answered, and nobody notices.

Cost control — I need per-agent spend caps and kill switches, not surprise bills.

Mobile command — I run my life from my phone; I need to steer agents from it.

Stranded work — I believe work hides in local workspaces; if it's not on the shared record, it didn't happen.

Trust — I don't trust first passes. Every recommendation you make must survive its own red team (see Rigor rules).

Rigor rules (non-negotiable)

Every factual claim carries its source (repo URL, docs page, or primary post) and a "last verified" date. Distinguish "I read the code" from "I read the marketing page" — say which one.

For every system you recommend, include the strongest honest argument AGAINST adopting it. Steelman the status quo too: what breaks if I change nothing?

Flag hype vs. reality explicitly. Star counts are not evidence.

If you're unsure, say so. Never invent a feature, a price, or an integration.

License-clean always: MIT preferred; never recommend bypassing auth, breaking paywalls, or copying code against its license.

My known systems (start here; verify and expand)

On my side I have: Motif (my orchestrator/QC agent on a Linux VM), Hermes (my builder — OpenCode running on my phone via the Minis app), Google Jules (async coding agent, API-driven), OpenCode and Cursor coding agents, OpenDots (14 prompt-defined assistant dots on localhost), an Intel/OSINT Telegram bot (102 commands), and a GitHub repo used as the fleet message bus (Beexly/agent-bus) plus Beexly/Sports as the system of record. Attached is my full systems inventory — repos, scheduled jobs, connected services, credentials policy, standing rules. Treat it as the starting map, not gospel. Question it where it looks stale.

I also have Grok 4.7, a Grok bot, Mimo, and Antigravity on my computer — these were left out of the inventory. Research each one from zero: what it is, what it can do in an agent fleet, how it connects to other agents, where it fits, what it costs. Fold them into the architecture.

PART 1 — Discovery research

Search GitHub, Hugging Face, docs, and the web for systems, repos, platforms, and features that could improve this fleet. I already know about Orca (agent orchestrator with mobile app), Paperclip (agent manager), and Hindsight (agent memory) — do not just repeat these back; go deeper and wider. For each category, answer the specific research questions:

Agent orchestration — Who can be the single project leader? Compare options (my current orchestrator, Orca, Paperclip-style managers, anything new) on: maturity, mobile control, cost enforcement, approval gates, crash/failure recovery, and fit for a one-man team. How does each handle an agent that dies mid-task?

Inter-agent communication — message buses, shared task boards, handoff protocols, blackboard systems. What do serious multi-agent setups actually use? How do they resolve conflicts when two agents disagree? What happens when the bus itself goes down — where's the single point of failure?

Agent memory — per-agent persistent memory, shared fleet memory, consolidation and forgetting. What are the memory-poisoning risks when agents write to shared memory, and how do real systems mitigate them?

Evals & verification — how do you know an agent did good work? QC gates, scoring bars, automated verification, replay of agent runs. (My fleet currently uses a human-set quality bar with an agent as QC gate — what's the state of the art beyond that?)

Cost control & budgets — per-agent spend caps, kill switches, cost attribution per task, cost dashboards. What exists off the shelf vs. what I'd have to build?

Secrets & credentials — how do multi-agent setups give agents the access they need without pasting raw keys around? Secret brokers, scoped per-agent tokens, short-lived credentials. (My rule: no raw keys in chat, files, or handoffs — the design must respect that.)

Task tracking & no-backlog enforcement — how do people keep 10+ agents from dropping work? What breaks at scale?

Mobile command — steering agents from a phone: what exists, what actually works, what's vaporware. (I need real mobile operability, not a demo.)

Stale-work detection — tools or patterns for finding forgotten, half-done, or orphaned work across repos and machines.

For everything: what it is, license, last activity (alive or abandoned?), cost with free-tier limits and paid tiers, self-hostable or not, which of my six pains it addresses, and a concrete fit assessment.

PART 2 — The forgotten-work audit

Before any orchestration design, I need certainty that no GSE-related work is stranded, stale, or forgotten in anyone's workspace. You cannot see my machines — so give me the methodology: a complete, ordered audit procedure I (or my agents) can run across every workspace (my VM, my Windows box, every repo, the agent bus, Jules sessions, OpenDots, local checkouts). Include:

Exactly what to look for in each location: unpushed commits, unmerged branches, draft PRs, inbox files never answered, sessions stuck awaiting feedback, todos never closed, local-only files, scheduled jobs with no owner.

Unknown-unknown detection: how to find work that exists in NO inventory — diffing local trees against remotes, enumerating all branches across all repos, listing all scheduled jobs vs. documented ones, checking every agent's outbox for unacknowledged deliverables.

How to tell "done" from "abandoned" from "in progress."

A triage framework: finish / merge / delete / log-as-dropped-with-reason.

Interview questions for me — things only in my head that the audit can't find on disk (e.g., "what did you ask an agent to do last week that never came back?").

The output shape: a single "lost & found" register format.

PART 3 — One shared picture

Produce the document that gets every agent on the same page before orchestration starts:

Where the project is at — current state of the GSE engine, the mind build, the wiring backlog, research corpus, and each active lane. Specific, no vibes.

The goals — restated as verifiable outcomes, ordered by priority for a one-man team.

The steps — the ordered step list from here to a working orchestrated fleet. Each step needs: definition of done, what blocks it (dependency map), and effort split (my minutes vs. agent-hours).

Two horizons: the first-72-hours plan (stabilize, stop the bleeding) and the 30-day plan (orchestrated).

PART 4 — Orchestration architecture

Design the target state:

Recommend ONE project leader (human + system/agent). It does not matter to me which system or agent it is. Score the candidates in a weighted matrix against criteria derived from my six pains (weights must reflect a cost-sensitive one-man team), defend the winner, and keep the runner-up honest with its best case.

Communication topology — how every agent talks to every other agent and to me. Message formats, where state lives, handoff protocol, conflict resolution. Nothing gets lost, nothing gets double-worked, nothing gets forgotten. Include the single-point-of-failure analysis and its mitigation.

The growth loop — how the fleet gets smarter over time: shared memory, retrospectives, skill-sharing between agents, and how a lesson learned by one agent reaches all of them.

Migration plan in phases — ordered, each phase with an entry gate (don't start until X is true) and exit gate (don't proceed until Y is proven), each step reversible with a rollback note. Constraint: the fleet must keep producing throughout — no "shut everything down and rebuild" phases. No ripping out working systems on day one.

Pre-mortem — assume the migration failed six months from now. What are the three most likely causes, and what early-warning metric would have caught each?

PART 5 — Operating cadence

Once orchestrated, how does the fleet run day to day? Design the rhythm for a one-man team:

Morning standup: what the leader reports to me, in what format, how long it takes me to read.

End-of-day: what gets logged, where, and what "all clear" looks like.

Escalation paths: what reaches me immediately vs. what waits for the standup vs. what the leader resolves alone. (My rule: only true hard blocks reach me — everything else gets handled.)

Weekly review: what we measure, what we change.

The no-backlog enforcement: the exact mechanism that guarantees nothing sits idle, and who owns it.

Deliverables (as separate sections in your report)

Systems catalog — everything I have plus everything worth adding: license, activity, cost, which pains it addresses, fit.

The forgotten-work audit methodology + lost-and-found register template + my interview questions.

The shared project-state document (state, goals, steps, dependency map, 72-hour and 30-day plans).

The orchestration architecture (scored leader matrix, topology, SPOF analysis, growth loop, phased migration with gates and rollbacks, pre-mortem).

The operating cadence (standup format, eod log, escalation paths, weekly review, backlog enforcement).

The red-team appendix — the strongest case against your own recommendations.

A one-page executive brief I can read on my phone.

Keep it high-level enough that I can trust the reasoning, concrete enough that my builder agents can execute it. Say "I'm unsure" rather than inventing anything.
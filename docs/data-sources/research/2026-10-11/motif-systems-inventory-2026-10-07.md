# Motif Systems Inventory — Fleet Integration Brief

Prepared 2026-10-07 by Motif, for Hermes (and any agent wiring the fleet together).
Purpose: one complete map of every system Motif controls, how each is reached, and how agents talk to each other. Nothing here is a raw secret — see §8 for the credential rule.

---

## 1. Compute & runtime (Motif's VM)

- **Linux VM, persistent home** (`~` survives restarts; `/tmp` does not). Shell, filesystem, Python/Node toolchains.
- **Real Chromium browser** — persistent cookies/sessions, can act on logged-in sites. Garrett can watch/take over live.
- **Scheduler**: cron jobs (minutely/hourly/daily), hooks, systemd services. All schedules listed in §5.
- **Subagents**: I can spawn background child agents that inherit my context and report back. This is my parallel-execution arm.
- **Workspace root**: `~/workspace/`. Key trees:
  - `~/workspace/skills/<name>/` — capability playbooks, each with `SKILL.md` + `bin/` CLIs
  - `~/workspace/goals/<goal-slug>/` — goal workspaces (`GOAL.md`, `files/`, `hidden_files/`)
  - `~/workspace/your_files/` — files meant for Garrett's eyes
  - `~/memory/`, `~/MEMORY.md` — my long-term memory (people, groups, daily logs)

---

## 2. GitHub — Beexly org (system of record)

- **Auth**: stored credential `custom.github`, used via surrogate auth — **no raw tokens anywhere**. Identity: `Beexly`.
- **CLIs** (`~/workspace/skills/github/bin/`):
  - `github-api METHOD /path [json-body]` — generic REST to `api.github.com` (auth restricted to that host)
  - `github-push-files owner/repo branch "message" local=remote [...]` — push files via Git Database API (Contents API fallback on empty repos). Full-file blobs only, no deletes.
- **Repos that matter**:
  - `Beexly/Sports` — Galaxy Sports Edge system of record. All sports material lands in `docs/research/<date>/`. `AGENTS.md` is the repo contract every agent follows.
  - `Beexly/agent-bus` — the fleet message bus (§3).
  - `Beexly/autonomous-revenue-engine` — Kit sites, SignPreview, Vow & Post, Recordly.
  - Also: `gse-competitive-intel`, `OmniRoute`, `espn-groupme-bot`, `GSN.Cards`.
  - **Never touch**: `gse-grok-build-sandbox` (isolated by design).
- **Push policy (Garrett's standing order)**: nothing stays local-only. Every agent lands work on the remote — clean branches, file-scoped pushes, PRs where review makes sense. GitHub code review is the safeguard.
- **Deploys**: Vercel — `autonomous-revenue-engine-eight.vercel.app` (Kit page, SignPreview live).

---

## 3. Agent bus — how the fleet talks

- **Repo**: `Beexly/agent-bus`.
- **Layout**:
  - `inbox/from-motif/`, `inbox/from-opencode/` (= Hermes), `inbox/from-grok/`, … — task packages addressed TO an agent
  - `outbox/from-motif/`, `outbox/from-opencode/`, … — replies, deliverables, QC verdicts FROM an agent
  - Root docs: quality doctrine, repo map, protocols.
- **Protocol**: markdown files, dated names (`YYYY-MM-DD-<from>-<topic>.md`). One complete handoff per file: inputs, method, output shape, files to compose with, what the test asserts. No publish-gated links — full content in the file.
- **Motif's pickup loop**: `agent-bus-watch` cron, hourly. Lists `inbox/from-opencode/` + `outbox/from-opencode/`, diffs against watermark `~/workspace/goals/autonomous-revenue-engine/hidden_files/agent-bus-watch-seen.json`, QCs deliverables against the 9.2 bar (runs, real output, no placeholders, README + sample output), and writes verdicts/unblocks back to `outbox/from-motif/`. **The loop is bidirectional** — my answers go on the bus, not just in chat.
- **Who's who on the bus**:
  - **Motif** (me) — orchestrator, strategy, QC gate. This VM.
  - **Hermes** ("Minis") — overnight builder, OpenCode via the Minis phone app. Owns the Puter lane. Reads `outbox/from-motif/`, writes `inbox/from-opencode/` + `outbox/from-opencode/`.
  - **Jules** — Google's async coding agent, driven via Jules API (sessions, sendMessage, approvePlan, DELETE). Opens PRs on Beexly/Sports.
  - **OpenCode / Cursor coding agents** — heavy builds on the Sports repo.
  - **Grok** — briefs + Signal Origin X ops; cannot write to the bus directly (only its 2026-10-02 wire package lives there).
  - **DeepSeek** — theorist for the MOVE-37 lane (no code execution, ever).

---

## 4. Connected services (via skills — OAuth/secure storage, no raw keys in my hands)

| Service | Skill path | What it does |
|---|---|---|
| Gmail | `/opt/hatch/skills/gmail/SKILL.md` | Read/search/send/drafts/labels on baxley.garrett@gmail.com |
| Google Calendar | `/opt/hatch/skills/google-calendar/SKILL.md` | Agenda, event details, scheduling |
| Facebook | `/opt/hatch/skills/facebook-cli/SKILL.md` | Marketplace listings (13 live), Messenger threads |
| Instagram | `/opt/hatch/skills/instagram/SKILL.md` | `@gbeexly` (messages-connected, Kit DM watch), `@galaxysportsnetwork` |
| X / Twitter | `~/workspace/skills/x-poster/SKILL.md` | `@GalaxySportsHQ` — drafts → 9.2 quality gate → Garrett APPROVE → post. **Nothing posts without his explicit word.** |
| OpenRouter | `~/workspace/skills/openrouter/SKILL.md` | Model calls on Garrett's account (stored `custom.openrouter`). **No spend without his explicit cap.** |
| Hugging Face | `~/workspace/skills/huggingface/SKILL.md` | Models/datasets/Spaces (stored `custom.huggingface`) |
| Firecrawl | `~/workspace/skills/firecrawl/SKILL.md` | Web scraping (Garrett's key; 5k credits/mo). No auth bypass, no paywall circumvention. |
| Plaid | `/opt/hatch/skills/plaid/SKILL.md` | Linked bank accounts: balances, transactions |
| Meta Ads | `/opt/hatch/skills/meta-ads/SKILL.md` | Ad accounts, campaigns, spend, policy checks (connected 2026-10-07) |
| Stripe | (connected 2026-10-07) | Customers, products, payment links, invoices, refunds |
| Replit | (connected 2026-10-07) | Read/create/update/publish apps |
| Wallet | Shop Pay / Stripe Link | Saved payment methods, profile, shipping (via secure provider pages) |
| Phone (paired device) | device namespace | Run commands, pull data (contacts, calendar, location) |
| Media library | `/opt/hatch/skills/media-library/SKILL.md` | Garrett's photo library |
| TTS / voice | `/opt/hatch/skills/tts/SKILL.md` | Voice notes, spoken audio |
| Spotify | `/opt/hatch/skills/spotify/SKILL.md` | Playlists, playback |
| Apple HealthKit / Google Health Connect | (skills) | Synced health data |
| Neon Postgres | transient credential, never stored | `gse-postgres/neondb` — engine predictions DB, read-only pulls for verification |
| The Odds API | key exists, value not stored | 20K credits/mo sports odds — use for backfills |

---

## 5. Scheduled jobs (the fleet's heartbeat)

| Job | Cadence | What it does |
|---|---|---|
| `kit-dm-watcher` | 15 min | Watches @gbeexly IG inbox for Kit inquiries; **draft mode only, never sends** |
| `daily-money-sprint` | 9:08 AM CT | Autonomous revenue attempt; writes report, never spends/contacts without Garrett |
| `gse-analytics-sweep-am` / `-pm` | 9:08 AM / 9:08 PM CT | Read-only X sweep for new NFL analytics → neutral inventory in Sports repo |
| `agent-bus-watch` | hourly | Hermes pickup + QC loop (§3) |
| `jules-session-shepherd` | 6 h | No-backlog enforcement: every Jules session worked to completion same-day |
| `hf-space-autoscale` | 30 min | GPU autoscale for the GSE watch pipeline (game-aware) |
| `marketplace-listings-daily-watch` | 9:08 AM CT | 13 listings health + buyer-message triage (read-only, never messages anyone) |
| `intel-watch-check` | ~8:08 AM CT | Domain watch list (Intel bot) |

---

## 6. Local services on this VM

- **OpenDots** — `127.0.0.1:4310`. 14 prompt-defined assistant dots (incl. 4-dot Review Board: Merge Sheriff, Numbers Cop, Research Auditor, Voice Judge). SQLite-backed. No verified phone-access URL yet.
- **Reclip** — `http://localhost:8899`. Self-hosted media downloader (yt-dlp + ffmpeg), verified end-to-end.
- **Intel bot** (Telegram) — 102 commands: threat intel, username engine, webcheck, family-protection resources. Defensive only: **no live people-tracking, no face ID, no camera-following — standing refusals.**

---

## 7. Standing rules any integrating agent must obey

1. **Nothing stays local** — if it's not on the remote/bus, it didn't happen.
2. **No spend without Garrett's explicit cap.** Ever.
3. **No X post, no DM, no public publish without his explicit APPROVE.**
4. **No accounts created, no identity/tax/bank docs submitted** without his word.
5. **Never touch `gse-grok-build-sandbox`.**
6. **Counts carry their counting method.** Completion claims carry tests + remote SHAs.
7. **Garrett-human voice** on anything outward-facing (see `~/workspace/vendor/autonomous-revenue-engine/ops/x-voice/voice-brief-2026-10-04.md`).
8. **License-clean**: MIT = port with attribution; AGPL = clean-room re-implementation only, never copied code.
9. **Real footage only** for sports video — never AI-slideshow substitutes.
10. **Public site shows projections/rankings only** — signals, metrics, methodology stay internal.

---

## 8. Credentials — the rule (read carefully)

- I do **not** hold raw API keys, passwords, or tokens in files, memory, or chat. They live in platform secure storage / OAuth connections and I use them through the skill's auth flow without seeing values.
- **Therefore: there are no keys to hand Hermes.** Any integration design that requires pasting a raw key is the wrong design.
- The correct integration surfaces are: **(a)** the agent bus markdown protocol (§3), **(b)** GitHub repos as the system of record (§2), **(c)** each agent using its own stored credentials on its own host.
- If a lane needs a new credential, Garrett creates/connects it himself (OAuth or secure entry) — agents never ask for raw secrets in chat.
- Known credential metadata (existence only, **no values**): `custom.github` (Beexly), `custom.openrouter`, `custom.huggingface`, Odds API key (Garrett's), Firecrawl key (held by Hermes), Experiential Labs key (OpenDots), Neon Postgres (transient per-use). GitHub token named `minis` expected expiry ~2026-10-12 — will need rotation.

---

## 9. Orca — evaluation (added 2026-10-07 at Garrett's request)

- **Repo**: `stablyai/orca` — **87k stars, MIT license, pushed 2026-10-07 (today).** Real, active, credible.
- **What it is**: "The AI Orchestrator for 100x builders." Runs **Codex, Claude Code, OpenCode, or Pi** side-by-side, each in its own git worktree, tracked in one place. Desktop app (macOS/Windows/Linux) + **mobile companion** (iOS App Store + Android APK) — monitor agents from the phone, get notified when one finishes, send follow-ups from anywhere.
- **Why it matters here**: Hermes IS OpenCode (via Minis on Garrett's phone). Orca natively runs OpenCode agents — so Orca is a credible next home for the Hermes lane, with a real phone app instead of the Minis workaround.
- **Caveats**:
  - The mobile app is a **companion to the desktop app** — Orca desktop must be running somewhere (his Windows box is the natural host; SSH worktrees can reach a remote box) for the phone to steer agents.
  - Orca does **not** speak the agent-bus protocol. Wiring Orca ↔ bus (read inbox, write outbox, respect the QC loop) is the integration task — it doesn't happen by installing alone.
  - Download: https://onorca.dev/download · iOS: App Store (`orca-ide`, id6766130217) · Android: APK on the GitHub releases page.
- **Suggested path**: install Orca desktop on the Windows box → connect it to the Sports checkout → trial one OpenCode worktree on a small bus task → then design the bus bridge (a small watcher that mirrors bus inbox files into Orca tasks and posts results back to outbox). Do NOT retire Minis/Hermes until the bridge is proven.

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

---

## 10. Jules — Google's async coding agent (full)

- **What it is**: Garrett's bounded-background coding agent on connected GitHub repos. Opens sessions, works, opens PRs.
- **Skill**: `~/workspace/skills/jules/SKILL.md` — full API reference.
- **How Motif drives it** (beyond the documented skill, learned 2026-10-05/06):
  - `POST /v1alpha/sessions/{id}:sendMessage` `{"prompt":"..."}` — steer a live session (works on AWAITING_USER_FEEDBACK and COMPLETED).
  - `POST /v1alpha/sessions/{id}:approvePlan` `{}` — approve a plan (requirePlanApproval flow). Returns `{}` on success.
  - `DELETE /v1alpha/sessions/{id}` — **works, returns `{}`** (undocumented). Use to remove dead FAILED sessions so the dashboard stops showing stale clutter. Never delete a session with a live PR or one actively working; never delete COMPLETED sessions that are the record of landed work.
  - Session `outputs[]` carries `pullRequest` (url/number) and/or `changeSet` — check it; AUTO_CREATE_PR does not always produce a PR.
  - **Always inspect the actual changeset diff before approving**: one session did string renames instead of the ordered removal — renames that hide a surface are the opposite of removal.
- **requirePlanApproval is unreliable in batch (learned 2026-10-06, HARD)**: firing 10 sessions at once with `requirePlanApproval: true` → all 10 generated plans then went COMPLETED within ~15 min with zero work done. `approvePlan` on COMPLETED returns `{}` but does NOT resume. Fix: batch/overnight runs fire WITHOUT requirePlanApproval (sessions go IN_PROGRESS and work); PRs get reviewed on arrival per the Merge Sheriff doctrine. Only use requirePlanApproval for single high-stakes sessions you'll approve within minutes.
- **Standing doctrine (Garrett: "Jules should never have a backlog")**: every session gets logged and worked to completion. Nothing sits in AWAITING_USER_FEEDBACK — answer, approve, or steer it the same day. Failed sessions get re-fired (if the work matters) or dropped with a logged reason. Enforced by `jules-session-shepherd` cron every 6h.
- **Merge Sheriff doctrine**: every PR gets merged, fixed, or closed with the reason on it — no limbo. 2026-10-06 pass cleared ~100 open PRs. Completion claims are never trusted without PR/diff/test/SHA verification (Motif caught a fake PR #1025 merge claim and merged the dossier himself).
- **Scale notes**: 14 sessions ran the 2026-10-06 overnight wave. No Paperclip adapter exists for Jules.

---

## 11. OpenDots — the 14 dots (full)

- **What it is**: 14 prompt-defined assistant dots across seven spaces, backed by a local SQLite DB. HTTP server at `127.0.0.1:4310`.
- **The 14**: includes the 4-dot **Review Board** — Merge Sheriff, Numbers Cop, Research Auditor, Voice Judge — plus 10 working dots across the spaces.
- **Honest state (Garrett's verdict: "This is the floor.")**: the dots are mostly prompt + database records, not deeply integrated agents. They have no real memory yet, no verified phone-access URL, no verified Experiential Labs free allocation, and the global model-swap script is incomplete.
- **Memory path**: Hindsight's bank-per-agent model maps 1:1 onto the 14 memory-less dots via its MCP endpoint — evaluated 2026-10-06, verdict ADAPT (pilot), not yet built.
- **Ops notes**: the server died sometime after the 2026-10-06 13:24 Experiential Labs key switch; Motif restarted it (HTTP 200, all 14 dots present). No supervisor yet — a restart cron/service is owed.
- **Keys**: Experiential Labs key (switched 2026-10-06 13:24); allocation unverified.

---

## 12. GSE engine & data assets

- **Beexly/Sports** (TypeScript) — the system of record. `AGENTS.md` is the governing contract. Corpus rule: ALL sports material lands in `docs/research/<date>/`; workspace is scratch.
- **Engine**: v5.3.0 calibration-rebuild goal active. Wiring backlog owned by Motif (read-only repo sweeps → wire built-but-not-wired code). Engine loop: research → wire → weight → calibrate → test → polish, never re-sequenced.
- **Watch pipeline**: Hugging Face Space `Beexly/gse-watch-pipeline`, game-aware GPU autoscale (`hf-space-autoscale` cron: t4-small live/near-kickoff, cpu-basic otherwise).
- **Mind build** (the most important work, Garrett's words): `mind.jsonl` owned by Trainer A — second writers forbidden. Brain ingestion landed on branch `motif/brain-ingestion-2026-10-05` (PR #1025, merged by Motif after Jules's fake-merge claim). Transfer operators v1, corrections dossier, phases 0–6. Trainer ingestion is proven by observed PIDs and row counts, never claimed.
- **Equation grind**: 723 rows, **0 usable grounded rows**; Grid-powered extraction stalled when the Grid key left the environment. Awaiting Garrett's call: free-path relaunch vs Grid key re-paste.
- **Kaggle destroyer corpus**: 20/20 lane reports with adversarial REVIEW PASS sections, in `docs/research/2026-10-06/kaggle-destroyer/` (index + lanes 01–05 verified on remote; remainder landing in progress). Paid GLM adjudication spend under audit — no further paid calls without Garrett's explicit cap.
- **Machine-discovery lane**: DeepSeek = theorist/protocol engineer (NO code execution); Motif VM = execution lab. No DeepSeek numeric claim published or built on without lab execution.
- **Public surfaces**: site shows projections/rankings ONLY. NGS data, metric names, signals, methodology stay internal. X `@GalaxySportsHQ`, TikTok `@galaxy.sports.edge`, Instagram, YouTube channel.

---

## 13. Other agents, lanes & evaluations

- **Grok** — briefs (`GSE Signal Desk` daily factory, `signal-origin-overnight-ops` email), Signal Origin X lane (`@SignaL_OriginHQ`, sports excluded). Cannot write to the bus directly.
- **Hermes** — also owns the **Puter / ai-chat lane** (Garrett's word: that lane is Hermes's; Motif stays out unless routed back). Holds the Firecrawl key. Hosts OpenCode Zen.
- **DeepSeek** — MOVE-37 theorist. 2026-09-14 second-pass audit found 20 confirmed defects incl. systemic citation fabrication; corrected README + ledger drafted.
- **Mimo** — stats & calibration agent on Garrett's Windows box (8 orphan branches found 2026-09-25; rescues in flight).
- **Cursor / OpenCode coding agents** — heavy builds on Sports.
- **Evaluated 2026-10-06, NOT adopted** (pilots only):
  - **Hindsight** (`vectorize-io/hindsight`, MIT, 46k★) — agent memory; ADAPT: bank-per-agent pilot for the 14 dots. Caution: token burn per retain/recall; setup defaults to their paid cloud unless self-hosted URL passed explicitly.
  - **Paperclip** (`paperclipai/paperclip`, MIT, 98k★) — agent-fleet orchestrator with per-agent cost budgets + auto-pause; ADAPT: self-hosted pilot, telemetry disabled day one (`PAPERCLIP_TELEMETRY_DISABLED=1`). Blocked on: no Jules adapter, no Motif adapter, 6,200+ open issues. Agent bus stays the interchange.
- **Impeccable** (`pbakaus/impeccable`, 77k★) — design-quality tooling; candidate for Kit/GSE surface polish. Not yet trialed.

---

*End of inventory v2 — 2026-10-07. If a system isn't in §§1–13, Motif doesn't control it or it hasn't been inventoried yet — ask and it gets added.*

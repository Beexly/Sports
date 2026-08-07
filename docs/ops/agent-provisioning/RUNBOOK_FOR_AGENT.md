# Agent provisioning runbook

**Audience: the executing agent (Sonnet), not the founder.** You are creating and
wiring the leveraged accounts in
[`scripts/ops/provisioning/registry.mjs`](../../../scripts/ops/provisioning/registry.mjs),
driving each to its `doneWhen` with the least human input the law allows.

Source of the account list: [`CREDITS.md`](../CREDITS.md) ·
[`GSE_CREDITS_PROGRAMS_ACTION_PACK_V3.md`](../GSE_CREDITS_PROGRAMS_ACTION_PACK_V3.md) ·
[`CLOUD_CREDIT_LAUNCH_MAP.md`](../CLOUD_CREDIT_LAUNCH_MAP.md).

---

## Hard laws — these end the task, not slow it down

1. **No anti-bot evasion.** No CAPTCHA solving, no login/paywall bypass, no proxy
   rotation to dodge blocks, no fake accounts. This is `CLAUDE.md` policy and it
   is not negotiable by convenience. A CAPTCHA is an escalation signal, not an
   obstacle to route around.
2. **Credit-program applications are founder-only.** `CREDITS.md` says it: the
   agent wires env after keys land; the founder submits applications. You may
   *prepare* every field, draft the narrative, and stage the exact payload — you
   may not press submit on AWS Activate, Azure Founders Hub, Google for Startups,
   Anthropic Startups, Neon Startup, Vercel for Startups, or Cloudflare.
3. **Never invent grant amounts, eligibility answers, or company facts.** If a
   form needs a number you do not have, stop and ask.
4. **No secrets in the repo.** Keys go to Vercel env. The secret-scan guardrail
   runs on every commit and will catch you.
5. **Respect the once-ever traps** in each registry entry's `traps[]` before
   touching that account. Stripe has exactly one lifetime offer; Vercel's Activate
   path can consume the larger startup slot; AWS Founders → Portfolio is
   sequential, never parallel.

---

## Start every session here

```bash
node scripts/ops/provisioning/provision-status.mjs
```

Reconciles the registry against **live production truth**
(`/api/ops/public-surface-truth`), so it reports what the deployed app can
actually do — not what a local `.env` claims. Exit 1 means P0 work remains.
`--json` for machine reading, `--category free_lane_llm` to scope, `--offline`
for the registry view with no network.

Finish every account with:

```bash
node scripts/ops/verify-credit-stack.mjs      # exit 0 = free lane armed AND Claude off cash
```

---

## The escalation ladder — always attempt the least-human rung first

Each registry entry carries an `automation` level. Attempt that rung; on a wall,
escalate one rung and record why.

### `api_only` — no browser at all
The account exists and exposes a token API. Fastest and fully unattended.

| Target | Mechanism |
|---|---|
| Vercel env | `vercel env add <NAME> production --token $VERCEL_TOKEN`, or the REST API `POST /v10/projects/{id}/env`. Project `prj_ZAFYsTbVviP2iiSZdzQcloZVHkBL`, team `team_VvPIx69THeXYfjeG71taqnPo`. |
| Stripe | Full API via the Stripe MCP (`stripe_api_read` / `stripe_api_write`). Note: webhook-endpoint **DELETE is not exposed** — that one is a Dashboard click. |
| GitHub | `mcp__github__*` tools, already authenticated. |
| Neon | Neon API with a personal token. |
| OpenRouter | Has a **key-provisioning API** once the account exists — mint further keys with zero browser. |

### `headless_first` — Playwright in this container
Chromium is pre-installed at `/opt/pw-browsers/chromium`;
`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` is already set. **Never run
`playwright install`.** Works on plain email-form signups. Expect Cloudflare
Turnstile to wall datacenter IPs — when it does, escalate rather than retry.

### `supervised_browser` — the founder's Chrome
The founder has the **Claude in Chrome** extension. It acts inside his real
logged-in session, so there is nothing to bypass — he is present for the one
CAPTCHA click. This is the highest-success path for Cerebras, Groq, and NVIDIA.
Hand him a single copy-paste line, e.g.:

> "Sign up for Cerebras using `gse-ops@agentmail.to`, then create an API key."

### `founder_assisted` / `founder_only`
KYC, tax forms, OAuth consent, and every credit-program application. Prepare
everything, then hand over a filled-in checklist.

---

## Agent identity — already provisioned

**Inbox: `gse-ops@agentmail.to`** (AgentMail, created 2026-08-07).

Read verification mail and OTPs with the AgentMail MCP tools — `list_messages`,
`get_thread`, `search_messages`, `reply_to_message`. This closes the signup loop
without touching the founder's personal inbox. Use it as the signup email for
every entry whose `email` field is `AGENT_EMAIL`; entries that name
`founder@galaxysportsedge.com` are deliberately under his identity because a
credit program ties to the company, not to an agent.

---

## Tooling map — verified August 2026

The founder already owns the first three. Reach past them only when a rung
genuinely walls.

| Tool | Surface | Use it for |
|---|---|---|
| **Claude in Chrome** (owned) | Extension in his real browser | Any signup needing a human CAPTCHA/OAuth click. Inherits existing logins to Vercel, Stripe, Neon, GitHub. |
| **Desktop Commander MCP** (owned) | Local shell + filesystem | CLI-level ops — `vercel`, `gh`, `stripe`, `psql`. Not GUI clicking. |
| **This container** | Playwright + Chromium | Headless signups, smoke checks, anything scriptable. |
| **Skyvern** | Hosted + self-hostable (Docker), MCP | Best fit for signup forms specifically; its managed tier handles 2FA/TOTP. Self-host to stay inside policy. |
| **Bytebot** | Self-hosted containerized Linux desktop, BYO LLM | Strongest unattended fit: give the agent its own persistent desktop with a Bitwarden vault holding GSE credentials + TOTP, so it signs in and mints keys across sessions. |
| **Browser Use** | Open-source Python, BYO Anthropic key | Zero-infra scripted signup flows using the existing `ANTHROPIC_API_KEY`. |
| **Browserbase / Steel** | Cloud browsers with persistent contexts | Session persistence across days when a flow must resume logged-in. Free tiers first. |
| **Open Interpreter** | Local CLI agent, BYO model | Pairs with his Ollama + AnythingLLM for zero-token local ops. |

Shut down — do not plan around them: **ChatGPT Atlas** (deprecated Aug 9, 2026,
folded into ChatGPT agent mode) and **Google Project Mariner** (shut down May 4,
2026, folded into Gemini Agent / Chrome auto-browse).

---

## Execution loop, per entry

1. `provision-status.mjs` → take the top unarmed entry.
2. Read its `traps[]`. If a trap applies, resolve the ordering question **first**.
3. Attempt its `automation` rung. On a wall, escalate one rung and note why.
4. Signup email = the entry's `email` field. Poll AgentMail for verification.
5. Mint the key. Write it **only** to Vercel production env.
6. Redeploy — merging to `main` is the redeploy; this project auto-deploys from GitHub.
7. `verify-credit-stack.mjs`. Exit 0 or diagnose.
8. Flip the entry's `status` to `existing` in the registry and commit that.

---

## Order of attack

**P0 — kills cash spend.** OpenRouter first (`headless_first`, and its
provisioning API makes every later key free). Then Cerebras and Groq via the
founder's Chrome. One free lane armed flips `contentPlanPrimary` to
`cerebras_free` and `freeLaneConfigured` to true.

**P1 — Claude off cash.** A cloud only counts when creds **and** its model map are
both set; `CLAUDE_PROVIDER=auto` with nothing configured still bills cash, and the
posture surface now says so plainly. Prepare all three applications in parallel,
let the founder submit, wire whichever lands first.

**P2 — dev systems.** PostHog for Startups is the most automatable credit claim —
the org (`Galaxy Sports Network`) is already live, so it is a form on an
authenticated account rather than a new signup.

**Affiliate / partner.** Compliance copy is pre-written in `docs/revenue/` — FTC
and responsible-gambling policy. Follow it; never freelance offer copy. The
`affiliate-structural-separation` guardrail must stay green.

---

## Known-red CI, so you do not chase it

Three checks are red on `main` and predate this work: `AI transport import
boundary` (8 violations in `jynx.ts`, `jynx-errors.ts`, `smoke-free-lane.mjs`),
`All guardrails` (fails only as a consequence of the first), and `Test,
type-check, lint, Prisma` (34 failures across 7 files; the checkout one is a mock
missing `resolveCheckoutPriceId` from #353). Evidence is in
[PR #355](https://github.com/Beexly/Sports/pull/355#issuecomment-5210873355).
Do not attribute these to your own changes — but do confirm you add no *new* ones.

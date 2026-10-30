# DeepSeek Search/Fetch Free Harness Route — Route Spec & Status

**Written:** Friday, October 30, 2026, ~2:55 AM CDT (overnight sprint)
**Deadline:** the free window closes **Saturday, October 31, 2026, 11:00 AM CDT**
(= 16:00 UTC Oct 31 = 00:00 Beijing time Nov 1). ~32 hours remain as of writing.

## Honest status: SPEC COMPLETE — NOT LIVE, blocked at exactly one point

The route is fully specified below from DeepSeek's own documentation, but it is
**not wired live**, for one reason only:

**There is no DeepSeek API key anywhere in Garrett's stack.**
Checked tonight: no DeepSeek connector exists (`muse.connector_search` — no
match), `DEEPSEEK_API_KEY` is not set in the shell environment, there is no
OmniRoute data directory on this VM (`~/.omniroute` absent), and the
fleet-router / OpenRouter routes carry no DeepSeek-platform credential.
The free route requires a DeepSeek API key (see below). Creating one is an
account act on platform.deepseek.com — Garrett's tap. Everything after that
step is mechanical and is written out in Activation Steps.

No existing config files were changed. fleet-router, OmniRoute, and the
local-openrouter skill are untouched — see "Why not OmniRoute / fleet-router".

---

## What the route actually is (primary source)

Source: DeepSeek API Docs, "Search & Fetch" guide —
https://api-docs.deepseek.com/guides/search (read in full 2026-10-30),
plus DeepSeek's "Integrate with AI Tools" Claude Code configuration as
published by DeepSeek and quoted in its Oct 17, 2026 V4.1-Flash-1017 release
coverage.

DeepSeek opened two standalone tool APIs on Oct 17, 2026, alongside
V4.1-Flash-1017 (the `deepseek-flash` API model name now serves
V4.1-Flash-1017 — a silent swap; anything pinned to `deepseek-flash` already
gets the new checkpoint):

| API | Endpoint | What it does |
|---|---|---|
| Search | `POST https://api.deepseek.com/v1/tools/search` | Ranked web results from DeepSeek's in-house search engine |
| Fetch | `POST https://api.deepseek.com/v1/tools/fetch` | One page URL → title + Markdown content |

**Auth (both):** `Authorization: Bearer <DeepSeek API Key>` +
`Content-Type: application/json`. Same key as the DeepSeek chat API.

**Search request:** `query` (required, 1–128 chars; operators forwarded
intact: `site:`, `-site:`, `-term`, `-"phrase"`, `"phrase"`, `lang:zh,en`,
`after:YYYY[-MM-DD]`, `before:`), `count` (1–50, default 10),
`ori_question` (optional), `localization` (optional IP for locale),
`need_content` (default `false`; when true, results carry page content).
**Search response:** `results[]`, each with `rerank_score` (0–3; ≥1.5 =
high quality), `title`, `url`, `snippet` (~100–200 chars), `summary`
(~600–800 chars, written for the model), `content`, `site_name`,
`site_icon`, `date`, `authority` (0–4, −1 = unknown).

**Fetch request:** `url` only (HTTP/HTTPS, ≤8192 chars, no embedded
credentials). **Response:** `{ "title": ..., "content": <Markdown> }`.
Fetch is refused for some targets (403 security policy; 404 when no
extractable content).

**Rate limits (guide's current table):** Search **100 QPS**, Fetch
**25 QPS**, each per account (not per key), counted independently; Fetch
also has a per-domain QPS cap. Over-limit → HTTP 429.
⚠️ Launch-week coverage widely reported "5 QPS" — that figure is stale
against the guide as read today. Trust the guide: 100 / 25.

**Pricing:** $0.75 per 1,000 **successful** requests, each API. A request
bills only on HTTP 200 **with** a result (Search: non-empty `results`;
Fetch: page content returned). Failures, empty searches, and timeouts are
not billed. `count` does not change the price.

## The free window — exact terms (this is the part with the deadline)

From the guide's Billing section, verbatim substance:

> When you use the DeepSeek API through **DeepSeek Harness, Claude Code, or
> Codex**, server-side tool calls already hit the Search and Fetch APIs.
> These calls are currently **free of charge**; per-request billing starts
> at **00:00 Beijing time on November 1, 2026**.

Three consequences that decide how this gets used:

1. **Only harness-mediated calls are free.** A direct `curl` to
   `/v1/tools/search` is billed at $0.75/1,000 from the first call — the
   free window never covered raw endpoint calls.
2. **Only the Search/Fetch tool calls are free.** The model's tokens in
   the same session bill normally against the DeepSeek account balance
   (Flash rates; `deepseek-flash` is the cheap tier — but the account
   still needs a balance for the model side).
3. **After Sat Oct 31, 11:00 AM CDT nothing breaks** — the same setup
   keeps working; Search/Fetch calls simply start billing at
   $0.75/1,000 successful calls.

## How Garrett's stack calls it — the Claude Code profile

The natural home is the Claude CLI lane (Claude Code pointed at DeepSeek's
Anthropic-compatible endpoint). Per DeepSeek's official Claude Code guide,
set **every** model slot to Flash — any slot left unset can fall through to
a `claude-opus*` name, which DeepSeek's endpoint maps to `deepseek-v4-pro`
at Pro rates (~4.4× Flash input price):

```bash
export ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic
export ANTHROPIC_AUTH_TOKEN="$DEEPSEEK_API_KEY"   # from the vault/connector, never hard-coded
export ANTHROPIC_MODEL='deepseek-flash[1m]'
export ANTHROPIC_DEFAULT_OPUS_MODEL='deepseek-flash[1m]'
export ANTHROPIC_DEFAULT_SONNET_MODEL='deepseek-flash[1m]'
export ANTHROPIC_DEFAULT_HAIKU_MODEL='deepseek-flash'
export CLAUDE_CODE_SUBAGENT_MODEL='deepseek-flash'
export CLAUDE_CODE_EFFORT_LEVEL='max'
```

Then run `claude` in a session and ask it something that requires live web
search — its server-side `web_search` / `web_fetch` calls execute against
DeepSeek's Search/Fetch APIs and are free until the deadline.
Scope the exports to one shell/function (like a `claude-ds` wrapper) so
plain `claude` sessions on the Anthropic plan stay untouched.
Codex alternative: DeepSeek publishes an official Codex setup script that
writes the provider config (DeepSeek docs, "Integrate with AI Tools").

## Why not OmniRoute / fleet-router

- **OmniRoute** proxies chat-completions traffic to providers. Search and
  Fetch are DeepSeek-*platform* tool endpoints, not chat models — there is
  no provider-registry entry that turns them into a route, provider
  connections live in OmniRoute's own dashboard/SQLite (no instance data
  on this VM), and the repo's own rules (its AGENTS.md) require a
  dedicated worktree on an operator-confirmed base branch for any code
  change. Not a tonight change, and not the right layer.
- **fleet-router** dispatches task types to OpenRouter chat models, Jules,
  or jev. It has no mechanism to call platform tool endpoints; adding a
  DeepSeek entry there would be decoration, not wiring.
- The harness profile above **is** the surface his stack calls this route
  through — Claude Code is already a working lane in the fleet.

## Adjacent claim checked and corrected: OpenRouter free listing

Tonight's X corpus report (Part 3, item E3) said V4.1-Flash has "free
listings on OpenRouter (e.g. `deepseek/deepseek-v4.1-flash-1017:free`)".
**Verified tonight against the live OpenRouter catalog using Garrett's
connected credential: no `:free` DeepSeek Flash listing exists right now.**
Present instead (all paid): `deepseek/deepseek-v4.1-flash-1017`
($0.30/M in, $1.20/M out, half-price off-peak overrides),
`deepseek/deepseek-v4.1-flash` ($0.045/M in, $0.50/M out),
`deepseek/deepseek-v4-flash` (the fleet-router's current research model).
The free model route in the corpus note should be treated as expired or
never-live; the Search/Fetch harness window is the only real free route,
and it is the one with the deadline.

## Smoke test — what was and wasn't possible

- A real free call was **not** possible: it requires the DeepSeek API key
  (absent, above), and the free path only exists inside a harness session
  running on that key.
- A zero-credential liveness probe (POST with no key, expecting the
  documented HTTP 401) was attempted at 2:50 AM CDT; it is **parked on a
  pending user permission approval** for api.deepseek.com
  (approval `16dec281-7623-41e2-982c-bd48a3741749`) and had not executed
  when this spec was written. The documented behavior it would confirm:
  401 = key missing/invalid (guide, Errors table).
- Post-activation smoke test (one command, inside the window): start the
  Claude Code profile above and prompt: *"Search the web for today's date
  and tell me what you find."* A `web_search` tool call in the transcript
  + a results answer = route live and free. Verify the session's model in
  the output metadata is `deepseek-flash` only (a second model name means
  a slot fell through to Pro).

## Activation steps (in order)

1. **Garrett's tap:** create a DeepSeek API key at platform.deepseek.com
   and store it through an approved credential route (custom connector /
   vault — never in a file or chat). Note the account needs a balance for
   model tokens; Search/Fetch harness calls are free until the deadline
   regardless.
2. Export the Claude Code profile block above in the Claude lane
   (wrapper function, not global env).
3. Run the smoke test prompt; confirm `web_search` fires and only
   `deepseek-flash` appears in model usage.
4. Use it for research-heavy fleet work before **Sat Oct 31, 11:00 AM
   CDT** while tool calls are free; after that, same route at
   $0.75/1,000 successful Search/Fetch calls + Flash token rates —
   still the cheapest documented search/fetch option in the stack
   (Firecrawl and Brave both price higher per call).

## Sources

- DeepSeek API Docs — Search & Fetch guide:
  https://api-docs.deepseek.com/guides/search (read in full, 2026-10-30)
- DeepSeek V4.1-Flash-1017 release + Claude Code guide details, via
  release coverage quoting DeepSeek's own guide (munderdiffl.in,
  blog.sandbase.ai — both captured 2026-10-29/30; config block matches
  DeepSeek's published guide)
- OpenRouter live model catalog via `bin/openrouter-api GET /api/v1/models`
  (Garrett's connected account, 2026-10-30)
- Corpus origin: `~/workspace/x-for-you-sweep/reports/2026-10-30-OVERNIGHT-CORPUS.md`, Part 3, E3

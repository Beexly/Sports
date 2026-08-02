# Grok Session Handoff — 2026-08-02

**Repo:** Beexly/Sports (SoT)  
**Branch for this pack:** `docs/grok-session-handoff-2026-08-02`  
**Active work PR:** #286 (`claude/grok-work-review-6aiwa3`) — **supersedes** prior orbit waves #281–#285

## What this pack is

Consolidated artifacts + research notes from the Grok Agent Memory OS / Orbit Control lab session.  
No production runtime code from the lab is present in this environment; the durable product work lives in PR #286.

## Status of the #1 residual (CI concurrency + timeout-minutes)

**CLOSED on PR #286.**

`ci.yml` on `claude/grok-work-review-6aiwa3` already has:

```yaml
cancel-in-progress: ${{ github.event_name == 'pull_request' && github.ref != 'refs/heads/main' }}
```

Plus measured `timeout-minutes` on every job (`test=30`, `build=25`, guardrails `=10`).  
Do **not** re-open or re-implement this residual.

## Free-path settlement law (canonical)

- Free path is **ABSENT-only**: `THE_ODDS_API_KEY` must be **deleted**, not emptied.
- `PRESENT_DEACTIVATED` is a **trap**, not free path.
- Severity ladder: `ok | warn | trap | block`.
- Money-out is **derived** from settlement path (OrbitProvider coupling).
- Present-but-deactivated does **not** unlock free settlement; it stops odds ingestion + pick generation and empties the live board within ~6h.

## Operator-only list (founder, not agent)

1. Merge decision on **PR #286** after green CI.
2. Stripe webhook: add `checkout.session.expired` (existing retries + idempotency already solid).
3. Do **not** flip: `LIVE_BOARD`, `PUBLISH_LEDGER`, HEOS (#226 needs explicit YES).
4. Credits claim order: Neon → Vercel → Anthropic → OpenAI → AWS (see CREDITS.md).
5. Free odds source clearance is a **rights** task, not a code task (TheRundown most plausible). Polymarket/Kalshi need counsel.

## Lab concepts captured (not yet ported as production packages)

- 8-agent council with DRAFT_ONLY identity (`reportsTo`, `callsign`, `refuses`)
- Pure planning step + controlled flow (DRAFT / ESCALATE / NEEDS_REVIEW / HALT)
- Hierarchical memory with permanent safety facts + citation requirement
- Redis Lua atomics (GET_OR_SET, INCR_SCOPES, SET_IF_VERSIONS_MATCH, RELEASE_LOCK, RENEW_LOCK) + hash tags `{gse-mem}`
- Integrity harness target: 27 checks
- Jarvis OM status machine + LAUNCH_READY cascade
- Export packs with live stamps

These remain design/reference material. Do not invent a parallel memory OS tree on main unless founder explicitly requests a lab package under `packages/` or `docs/lab/`.

## Files in this pack

| Path | Content |
|------|---------|
| SESSION_HANDOFF.md | This file |
| AGENT_BROWSER_SMOKE.md | Minimal pricing/checkout/webhook smoke notes |
| AI_GATEWAY.md | Vercel AI Gateway + DeepSeek V4 Flash adoption note |
| CREDITS.md | Startup credit URLs + claim order |
| GSE_UNLOCK.md | Founder-only unlock actions |

## Explicit non-goals for the next agent

- Do not re-implement the CI concurrency fix.
- Do not flip founder gates.
- Do not remove Odds API wiring (no free substitute for odds ingestion / pick generation).
- Do not invent new product surfaces; follow existing B2B embed order (free `/embed/edge-index` first).

## Next concrete steps (priority order)

1. Review + merge **PR #286** if CI is green.
2. Apply operator Stripe + credits items above.
3. If a runnable Agent Memory OS lab is still desired, open a new scoped PR under `docs/lab/agent-memory-os/` or `packages/agent-memory/` with the design contracts only — no production path coupling until founder YES.

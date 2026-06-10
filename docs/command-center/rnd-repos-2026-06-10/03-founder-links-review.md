# Founder links review — 2026-06-10 (web-verified, read-only)

| Item | What it is | GSE verdict |
|---|---|---|
| **Lovable breach** (screenshot) | $6.6B AI app builder exposed user projects via missing ownership checks on `/projects/{id}` (classic BOLA — broken object-level authorization); exposed source, chat history, DB credentials | **The useful one.** Lesson absorbed as ticket SEC-01 below: audit every parameterized route for object-level auth as user-owned resources arrive. Also the cautionary tale for hosted AI builders: your code/credentials live on their infra. |
| **blink.new** | AI full-stack app builder (credits, $25–200/mo); generates+hosts apps | **Skip for GSE.** We have a real codebase, agent workflow, and compliance gates a builder can't replicate — and the Lovable breach is exactly the risk class of putting GSE's proprietary engine on a hosted builder. |
| **app.lumalabs.ai/boards** | Luma AI — video/image generation (Ray 3.2), enterprise-grade, paid tiers | **Future founder tool.** Fits the existing Galaxy Studios shell (media-gen already founder-deferred): promo clips for the podcast/social. Needs your account + budget; not a code integration. |
| **apps.abacus.ai/chatllm** | Multi-model AI chat workspace (page is JS-walled; couldn't verify details) | **Personal-tooling choice, not a product integration.** Nothing for the GSE codebase. |
| **start.me OSINT4all** | OSINT bookmark collection (403 on fetch) | Study-only reference; no integration. |
| **fakedetail.com** | Fake chat/profile/persona/detail generator ("fun & educational; don't impersonate") | **AVOID for anything public — hard line.** GSE's brand is literally "nothing fabricated" (we just deleted a fake ledger and test-banned it). Fake chats/personas/social-proof would poison the trust product. For test fixtures we already have the honest labeled sample-data system. |

**Ticket added:** SEC-01 (SHOULD) — object-level-authorization audit of parameterized routes; verify every `[id]`-style route enforces ownership/visibility (`/api/picks/[id]/explain` ✓ gates+entitlements+published-only; `/performance/losses/[id]` ✓ published+public-only by design; re-audit when user-owned objects ship — saved slates, accounts, billing objects).

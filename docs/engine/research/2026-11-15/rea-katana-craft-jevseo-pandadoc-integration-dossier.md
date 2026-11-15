# Architecture & Tooling Benchmark Dossier: REA, Katana, Craft-Anything, Jev-SEO & PandaDoc

- **Date:** 2026-11-15
- **Bucket:** `docs/engine/research/2026-11-15/`
- **Targets Evaluated:**
  1. `https://github.com/morluto/rea`
  2. `https://github.com/projectdiscovery/katana`
  3. `https://github.com/storytold/craft-anything`
  4. `https://github.com/AgriciDaniel/jev-seo`
  5. `@PandaDoc` (API, MCP Server, Embedded eSign, Webhooks, Free/Startup Tier Evaluation)

---

## 1. `github.com/morluto/rea` (REA: Reverse Engineer Anything)

### Verified Architecture & Capabilities
- **Local MCP Server Protocol:** Connects coding agents (Claude Code, Gemini CLI, Cursor, Windsurf, Copilot CLI via `npx rea-agents setup`) to local static/dynamic inspection without uploading proprietary assets to external clouds.
- **Multi-Target Providers:** Supports JS/Electron/ASAR bundles, web apps, Android APKs, .NET assemblies, WASM, databases, network captures, firmware, and external binary orchestration (Ghidra/IDA/Hopper) cleanly separated behind provider contracts.
- **Epistemic Evidence Contract:** Splits outputs explicitly into **evidence**, **recovered graphs**, **limitations**, and **unknowns** rather than forcing a synthetic hallucinated conclusion.

### GSE Integration Path
- **Already partially aligned via `rea-tool-design` skill.** Adopt REA's four-bucket epistemic contract (`evidence`, `recovered_graphs`, `limitations`, `unknowns`) inside GSE `ReasoningTrace` and overnight audit receipts so partial boards or missing injury participation feeds are surfaced explicitly as `limitations` rather than smoothed over with hallucinated weights.

---

## 2. `github.com/projectdiscovery/katana` (Katana Next-Gen Crawler)

### Verified Architecture & Capabilities
- **Unified `Engine` Interface (`pkg/engine/engine.go`):** Abstracts standard HTTP (`retryablehttp-go` + persistent cookie jar) and headless browser (`go-rod` Chromium DOM rendering) behind identical `Crawl` / `Close` semantics.
- **Modern SPA & JS Route Mining:** Parses inline and external JS files to discover hidden API endpoints, SPA routes, and form targets.
- **Bounded Frontier Control:** Uses Go `container/heap` priority queues (`pkg/utils/queue/`) supporting BFS/DFS traversal modes, strict regex scope inclusion/exclusion, and JSON/JSONL CLI pipeline output.

### GSE Integration Path
- **Authorized Storefront & Public Feed QA:** Run bounded Katana crawls strictly against our own staging/production domain (`galaxysportsedge.com`) to verify sitemap completeness, detect orphaned SPA routes, check JS bundle leaks for banned copy/subscriber redactions, and confirm zero unintentional public pick exposure.
- **Safety Boundary:** Katana must only run against explicitly owned or authorized public endpoints and must never bypass CAPTCHAs, Cloudflare Turnstile challenges, or credential walls.

---

## 3. `github.com/storytold/craft-anything`

### Verified Architecture & Capabilities
- **Inspection-First Reconstruction:** Couples real browser/app inspection primitives with structured agent build loops so design specs and component trees are derived from live observed DOM/state behavior instead of guesswork.

### GSE Integration Path
- **Storefront Design Verification:** Pair live rendered inspection checks (Playwright / `webapp-testing` / Doop design workflows) against our DFS optimizer card specs and PropFinder-inspired matchup tables to verify visual hierarchy, responsive breakpoints, and paywall redaction end-to-end before shipping `apps/web` or `apps/mobile` UI updates.

---

## 4. `github.com/AgriciDaniel/jev-seo`

### Verified Architecture & Capabilities
- **Single-URL Live SEO & GEO Audit Skill:** Crawls from a root homepage URL, evaluates pages against 52 deterministic rules aligned with Google Search Central, measures Core Web Vitals, leverages contextual page analysis (Jev), and exports styled PDF, Excel action tracker, and Markdown audit reports.

### GSE Integration Path
- **Storefront Acquisition & Organic Growth:** Incorporate the 52-rule deterministic technical SEO + Generative Engine Optimization (GEO) checklist into CI / pre-launch storefront sweeps for `https://www.galaxysportsedge.com`:
  - Canonical tags, OpenGraph/Twitter card hygiene, structured JSON-LD schema (`SportsOrganization`, `SoftwareApplication`, `FAQPage`), robots/sitemap coverage, and Core Web Vitals (`LCP`, `INP`, `CLS`).
  - **Guardrail Coupling:** Every SEO meta title, description, FAQ block, and GEO citation snippet on `apps/web` must simultaneously pass `scripts/trust-gate.mjs` and the GSE human-copy validator (no AI pipeline jargon, no unverified win-rate claims, no leaked paid picks).

---

## 5. `@PandaDoc` Ecosystem Evaluation (Zero-Waste Cost Verdict)

### Verified Capabilities & Tier Constraints
- **Free eSign Tier ($0/month, no credit card):** Up to ~5 UI sends/month, max 2 recipients/document, up to 5 templates; external web links/hyperlinked emails restricted unless upgraded.
- **Free API Access (Sandbox + Production Keys):** Recently enabled on free accounts with capped API document creation (~25 docs/month created, 5 total sends shared with UI); **webhooks and public OAuth 2.0 app creation are excluded on the free tier**.
- **MCP Server Support:** Official PandaDoc MCP integration works with AI assistants (Claude / ChatGPT) for conversational document drafting, template population, and status checks.
- **Paid Tiers (Starter ~$19/seat/mo annual; Business / API Developer add-ons):** Required to unlock production webhooks (event-driven `document_state_changed` listeners), embedded e-sign iframe sessions inside `apps/web`, and CRM integrations.

### GSE Decision under Uncompressed-Intelligence Zero-Waste Cost Doctrine
- **Immediate Free Value ($0.00/mo):** Use Free Tier + Sandbox API + PandaDoc MCP for founder-facing low-volume B2B paperwork (NDAs, affiliate/creator collaborator agreements, early advisory engagements) -- zero fixed monthly burn while validating workflows.
- **Defer Paid Tiers Until ROI Proven:** Do NOT upgrade to paid Business/API webhook plans unless B2B partner onboarding or embedded customer contract volume generates measurable recurring revenue exceeding seat/API fees. Consumer SaaS sports memberships continue through Stripe Checkout (`checkout-attempt` + `stripe-webhook`) with zero eSign friction.

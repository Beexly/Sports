# GSE URL Research Verdict — 9 URLs (Batch A: Grok/xAI + self-hosted PaaS)

## 1. Lenny’s Newsletter — “How I AI: Grok Bot + Grok 4.6”
- Type: Newsletter/podcast episode (Aug 24 2026) reviewing Grok Bot multi-account connectors, Cursor Origin, Grok 4.6 benchmark results.
- Status: Active content, no repo/code. Author Claire runs blind model evaluations.
- Stars: N/A (Substack, 1.2M+ subscribers).
- Red flags: None; promotional links (Bolt, Jira AI) but no ToS violations.
- GSE fit / use case: Reference only — confirms Grok 4.6 is a frontier-level model competitor (useful for internal LLM tier selection); no deployable artifact.

## 2. Morphic — “Grok Imagine Image 2.0 guide”
- Type: Marketing/resource page for xAI’s image model (Image 2.0): typography, smart resize, multi-reference editing.
- Status: Active; “API access coming soon.”
- Red flags: None; not a repo, just docs.
- GSE fit: Not relevant to analytics/stack; potential future use for marketing-hero visuals (track-record widget graphics) only if GSE wants AI-generated infographics for SEO pages — low priority.

## 3. chenyme/grok2api (GitHub)
- Type: Multi-account API gateway for Grok Build/Web/Console; Go backend + React admin; exposes OpenAI/Anthropic-compatible APIs; 1,480 commits, active (last commit 13h ago).
- Status: Very active. 7.5k stars, 2.3k forks. MIT license.
- Red flags: Explicit note “for technical research and learning purposes only. Please comply with Grok's official terms of use.” Uses bearer/auth token extraction from web sessions — likely violates xAI ToS if used to bypass billing/account limits. Multi-account pooling = potential ToS breach.
- GSE fit: HIGH RISK — matches GSE’s “NO fake-account/proxy-evasion tooling; NO ToS-violating scrapers” guardrail. Reject for integration; useful only as architecture reference for a legitimate multi-model gateway if built against official xAI SDK (see xai-sdk-python below).

## 4. github.com/orgs/xai-org/repositories
- Type: Official xAI GitHub org (9 repos).
- Status: Active; key repos: grok-1 (52k★, 2yr stale), grok-build (26k★, active), x-algorithm (32k★, active), xai-sdk-python (559★, active Aug 18), xai-cookbook (553★, 4mo stale), plugin-marketplace (177★, active), grok-prompts (4.4k★, 9mo stale).
- Red flags: grok-1 (open weights) is 2yr stale; xai-sdk-python and grok-build are the only actively maintained developer-facing assets.
- GSE fit: Reference xai-sdk-python for official API integration; ignore grok2api-style proxies. No direct deploy value.

## 5. DE0CH/grok-frontend (GitHub)
- Type: React + Vite + TypeScript web UI for xAI image/video generation (text-to-image, edit, image-to-video). 45★, 17 forks, last commit Mar 13 2026 (~5mo stale).
- Red flags: Requires xAI API key stored in cookie; proxy forwards to xAI. MIT. Not actively maintained; low star count.
- GSE fit: Not relevant to sports analytics; only if GSE wants a private image-gen UI (low value). Skip.

## 6. omgpizzatnt/grok-free-web-api-vercel (GitHub)
- Type: Archived (Apr 14 2026) “free web API proxy for Grok” deployed to Vercel; OpenAI-compatible endpoint using scraped auth_bearer + auth_token from DevTools.
- Status: 8★, 7 forks, READ-ONLY archive. 7 commits.
- Red flags: SEVERE — explicitly instructs scraping authorization tokens from grok.x.com DevTools (cookie + bearer extraction). Direct ToS violation and potential credential-theft pattern. Archived by owner (likely due to ToS enforcement or breakage).
- GSE fit: REJECT outright. Direct violation of GSE hard guardrail (no proxy-evasion / ToS-violating scrapers; $0-cost ambition does not justify illegal access). Zero reuse.

## 7. Dokploy/dokploy (GitHub)
- Type: Self-hosted PaaS alternative to Vercel/Netlify/Heroku; Docker + Traefik + multi-server. 36.8k★, 2.9k forks, last commit 7h ago (Aug 24 2026), 6,791 commits.
- Status: Very active; MIT license; sponsored.
- Red flags: Large surface area (Docker/Traefik/networking); needs VPS maintenance; not zero-cost if self-hosted on paid server.
- GSE fit: Could replace Vercel deploys for GSE’s Next.js + BullMQ workers + Postgres on a single VPS, supporting $0-marginal-cost self-hosted goal. Overkill vs Vercel for a solo-dev silent launch; consider only when scaling past Vercel free tier.

## 8. coollabsio/coolify (GitHub)
- Type: Self-hosted PaaS (alternative to Heroku/Netlify/Vercel/Coolify); 61k★, 5.3k forks, 16,808 commits, active (last commit 5h ago Aug 24 2026). Apache 2.0.
- Red flags: Large, rapidly evolving (v5 archive/rewrite in progress); complex. Needs server resources.
- GSE fit: Similar to Dokploy — viable for self-hosted Next.js + BullMQ + Postgres/Redis on Oracle free VPS; 280+ one-click services include Postgres, Redis. Better documentation/community than Kubero; best of the three PaaS options for GSE’s $0-cost self-hosted ambition if/when moving off Vercel.

## 9. kubero-dev/kubero (GitHub)
- Type: Self-hosted Kubernetes PaaS (alternative to Heroku/Netlify/Coolify/Vercel/Dokku/Portainer). 4.4k★, 211 forks, 2,206 commits; last commit Jun 24 2026 (~2mo stale).
- Status: Moderately active; GPL-3.0; Kubernetes-specific (needs K8s cluster).
- Red flags: K8s overhead is high for a solo Next.js app; less active than Coolify/Dokploy.
- GSE fit: Over-engineered for GSE (Next.js App Router + BullMQ + Postgres doesn’t need Kubernetes). Skip unless future multi-tenant scaling demands it.

---
SUMMARY FOR TRIAGE LEAD
- REJECT: #6 (ToS-violating token scraper, archived); #3 (multi-account proxy — ToS risk, use only as architecture reference against official SDK).
- LOW / REFERENCE ONLY: #1 (content), #2 (image marketing), #5 (stale frontend), #4 (official xAI repos — reference SDK only).
- POTENTIAL SELF-HOSTED PaaS (future, not silent-launch): #7 Dokploy (36.8k★, active), #8 Coolify (61k★, best option), #9 Kubero (too complex).
- GSE guardrails respected: no recommendation to use fake-account/proxy-evasion tools; $0-cost path preserved via Coolify/Dokploy on Oracle free VPS as future option.

# GSE GitHub Repo Triage — 18 URLs (Live Fetch)

Produced: 2026-08-24. Context: Galaxy Sports Edge (Next.js/TS + Postgres/Prisma + Stripe + BullMQ, Vercel, $0 budget, sports-picks/statistical edge, no X/Twitter ToS scraping).

## 1. UncleJ-h/xs — 1 star, MIT
- What: CLI wrapping Hermes Agent's x_search_tool to use SuperGrok subscription for X (Twitter) search. Uses official xAI OAuth / Responses API.
- GSE verdict: REJECT (not infra/tool). Uses X search only; GSE already avoids X scraping. Not a dependency.
- ToS flag: Uses official API (no ToS conflict), but X-related.

## 2. per-simmons/ai-reply-guy-opensource — 2 stars, MIT
- What: AI reply bot for Twitter/X using Chrome extension + real keystrokes (bypasses X anti-spam API block). Polls lists, drafts AI replies, posts via CDP keystrokes.
- Verdict: HARD REJECT — explicit ToS/spam conflict. Uses chrome.debugger keystroke injection to bypass X anti-spam rules. Conflicts with GSE "no spam automation / no scraping" guardrail.

## 3. BranchMetrics/ios-branch-deep-linking-attribution — 754 stars, MIT
- What: iOS SDK for deep links + attribution. Native Swift SDK.
- Verdict: REJECT — GSE is mobile-web PWA, not native iOS app. Zero fit.

## 4. Countly/countly-server — 5.9k stars, AGPL-3.0
- What: Self-hosted privacy-first product analytics + engagement platform (Node/Mongo/Redis/Clickhouse). Very heavy.
- Verdict: REJECT — GSE already plans Cloudflare Web Analytics + MS Clarity ($0, zero-hosting). Self-hosted Countly requires infra/DB overhead; overkill vs planned stack. Note AGPL copyleft.

## 5. sherlock-project/sherlock — 90.2k stars, MIT (updated Aug 2026)
- What: OSINT username hunter across 400+ social networks.
- Verdict: REJECT for GSE — privacy/red-line risk; no legitimate sports-picks use case. Potential misuse for tracking users. Not aligned with $0 analytics/content needs.

## 6. gitroomhq/postiz-app — 35.1k stars, AGPL-3.0
- What: Self-hosted agentic social media scheduling (Buffer alternative). Supports X, Bluesky, Mastodon, Discord, others. Uses official OAuth flows; does NOT scrape. Active (commit 11h ago).
- Verdict: CANDIDATE (with AGPL caveat) — fits GSE content engine (RSS → AI-repurposed → scheduled posts). Distribution channel for blog/picks. Note AGPL-3.0 license; evaluate before embedding.

## 7. StevenBlack/hosts — 30.9k stars, MIT (updated yesterday)
- What: Consolidated hosts-file ad/malware blocker.
- Verdict: REJECT — personal machine hygiene, not GSE infra. Not deployable to Vercel.

## 8. enescingoz/awesome-n8n-templates — 24.9k stars
- What: 280+ n8n automation templates (Gmail, Discord, Notion, social media, etc.). User does NOT want n8n installed.
- Verdict: USE AS REFERENCE ONLY — transferable BullMQ cron ideas: (a) RSS → Discord notification, (b) Gmail digest trigger, (c) social cross-post scheduling, (d) competitor content tracking (see #16). No install needed — copy patterns.

## 9. apify/apify-mcp-server — 4.8k stars, MIT (updated 16 min ago)
- What: MCP server exposing Apify web-scraping actors (social, search, e-commerce, maps). Requires paid Apify credits.
- Verdict: CONDITIONAL / GUARDRAIL — useful ONLY for sports data ingestion from official APIs (not X scraping). Paid dependency ($0 constraint conflict). Note scraping ToS risk if misused. Recommend reject for now; revisit only for rights-cleared sports feeds.

## 10. orgs/apify/repositories — 262 repos
- Notable: apify-sdk-js (182★), proxy-chain (1k★), actor-templates (59★). Free tier exists but actors are usage-priced.
- Verdict: No direct GSE dependency; reference only.

## 11. harry0703/MoneyPrinterTurbo — 116k stars, MIT (updated 16h ago)
- What: AI video generator (topic → HD short video with subtitles/TTS). Active maintenance. MIT license.
- Verdict: CANDIDATE for GSE TikTok/YT Shorts content marketing — generates marketing videos from text. Quality high; rights-clean IF user provides text/images themselves (no stock scraping). Not an infra dependency.

## 12. FujiwaraChoki/MoneyPrinterV2 — 31.7k stars, AGPL-3.0 (last commit Jun 14)
- Variant of #11; less maintained. Verdict: REJECT in favor of Turbo (#11) — same family, lower activity, AGPL copyleft.

## 13. ddean2009/MoneyPrinterPlus — 7.0k stars, GPL-3.0 (last commit Mar 2025, stale)
- Verdict: REJECT — stale; same family; GPL + commercial-use restriction in Chinese README conflicts with GSE commercial use.

## 14. FujiwaraChoki/MoneyPrinter — 13.9k stars, MIT (original, commit Mar 2026)
- Verdict: CONFIRM only — duplicate family; Turbo (#11) supersedes.

## 15. liaoqiaochunfengchuijiuxing/hot-opensource-projects — 0 stars, GPL
- What: Daily trending OSS tracker (GitHub Trending + X discussion) with monthly archives.
- Verdict: REJECT — 0 stars/0 adoption; low credibility as monitoring source. Not useful for GSE.

## 16. hihumanzone/Gemini-Discord-Bot — 98 stars, MIT (last Apr 2026)
- What: Gemini-powered Discord bot with streaming, multimodal input, session memory, moderation controls.
- Verdict: REFERENCE ARCHITECTURE — fits GSE Discord/community ambitions. MIT; dependency-free beyond Discord.js + Gemini API. Pattern transferable to BullMQ + Next.js webhook bot for GSE community.

## 17. 10up/classifai — 712 stars, GPL-2.0 (updated 7h ago)
- What: WordPress AI classification plugin.
- Verdict: HARD REJECT — GSE is Next.js/TS (not WordPress). Zero transferable code; GPL copyleft irrelevant.

## 18. bradautomates/content-ideas — 102 stars, MIT (May 2026)
- What: Cross-host plugin (Claude Code / Codex) tracking competitors across X/Instagram/TikTok/YouTube; generates content ideas from real engagement data via ScrapeCreators API.
- Verdict: CANDIDATE — aligns with GSE content engine (RSS → AI-repurposed). MIT; dependency-free Python stdlib + external scraping API. Note: uses external scraping service; evaluate ToS compliance if adopted. Transferable idea: competitor-content → content idea pipeline.

---
## ToS / Legal Flags Summary
- RED (hard reject): #2 (X spam automation / keystroke bypass), #5 (OSINT/privacy), #13 (GPL commercial-use restriction), #12/#11 family check (AGPL on V2).
- YELLOW (evaluate): #6 (AGPL scheduling tool — ok if self-hosted separately), #9 (paid scraping — ToS dependent), #18 (external scraping API — verify rights).
- GREEN: #1, #3, #4, #7, #10, #14, #15, #16, #17 (clear reject/non-conflict).

## Top Recommendations for GSE
1. Postiz (#6) — content scheduling (AGPL) — reference for distribution.
2. MoneyPrinterTurbo (#11) — AI short-video for marketing content.
3. Gemini-Discord-Bot (#16) — reference architecture for Discord community bot.
4. awesome-n8n-templates (#8) — borrow BullMQ cron patterns (no install).
5. content-ideas (#18) — content-idea pipeline reference (MIT, check scraping ToS).

Reject: #2, #3, #4, #5, #7, #12, #13, #14, #15, #17.
Conditional: #9 (only with paid budget + rights-cleared feeds).

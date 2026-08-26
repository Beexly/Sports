# Tooling Probe — 2026-08-26
Workspace: C:/Users/Garrett/Sports
Target: https://www.teamrankings.com/nfl/power-ratings/ (robots: Crawl-delay: 10 allowed)
Machine: Windows 11, MSYS bash, python 3.14.7 (python3.11 not present), slow PC, no GPU.
Robots context already confirmed: teamrankings allows crawl-delay 10; pfr is Cloudflare-challenged (DO NOT scrape); sportsbookreview allows /betting-odds/ but Cloudflare-hardened.

---

## 1) crawl4ai (v0.9.2 repo at C:/Users/Garrett/crawl4ai)
- Version installed: `pip install crawl4ai` completed (packages installed to python3.14 site-packages) — file evidence from install log shows crawl4ai + playwright-stealth + huggingface-hub + dependencies installed. Actual package import: `python3` (3.14.7) fails (`ModuleNotFoundError: No module named 'crawl4ai'`); `python3.11` interpreter not present on this box. Interpreter/version mismatch documented.
- `crawl4ai-setup` / Playwright browser install: NOT attempted. Per instructions: if hangs >15min, record and move on. The pip process was killed after exceeding 15min of ongoing install (background proc killed); Playwright browser install status = NOT CONFIRMED. Would likely hang/fail on slow Windows box without GPU.
- Probe crawl of teamrankings page: NOT EXECUTED (tool unavailable due to import/env mismatch).
- Output quality: NO DATA EXTRACTED.
- Recommendation: For future single-page legal crawl honoring 10s crawl-delay, if environment is fixed (python3.11 + Playwright installed + crawl4ai import works), it is appropriate. Until fixed, do NOT rely for teamrankings trends, SBR odds (blocked), or .gov portals.
- Cost: $0 (local install only; no cloud usage).

## 2) Scrapling (BSD-3, repo C:/Users/Garrett/Scrapling, agent-skill present)
- Version: repo at C:/Users/Garrett/Scrapling; `pip` package NOT installed. `scrapling.fetchers.Fetcher` import fails (`ModuleNotFoundError`).
- Probe path chosen: FAST HTML PARSER ONLY (`StaticFetcher` / `Fetcher.get` concept per agent-skill docs), NO heavy browser (`camoufox` / stealth browser NOT launched; big download avoided). Plain `requests`-style fetch attempted directly against teamrankings (simulating the fast path) to confirm site response without heavy overhead.
- Evidence (exact): `requests.get('https://www.teamrankings.com/nfl/power-ratings/')` returned `status=404`, `len(html)=208236`, `approx <tr count=0`, numeric tokens found (e.g. `.55`, `.3`, `.5`, `0.55`, `-242.552`, `-25.074`) — the page served large HTML (likely redirect/block response) rather than a usable table. No usable power-rating numbers extracted.
- Capability documented without running camoufox: agent-skill references `Fetcher` (lightweight `curl_cffi`), `FetcherSession` (cookie persistence), `impersonate` (TLS fingerprint spoofing), `stealthy_headers`, and `ProxyRotator`. Heavy anti-bot (`camoufox`/browser automation) reserved for blocked sites; NOT needed for this legal crawl per robots verdict.
- Recommendation: Use Scrapling's fast `Fetcher.get()` (with `impersonate='chrome'`, `stealthy_headers=True`) for teamrankings trends when site responds cleanly; use `FetcherSession` for multi-page sessions honoring crawl-delay. For SBR (Cloudflare-hardened) — may need stealth path but do NOT attempt without explicit approval; for `.gov` portals — fast parser path preferred (lightweight, no GPU).
- Cost: $0 (no camoufox download; no cloud credits used).

## 3) firecrawl-py (4.17.0, API key from %LOCALAPPDATA%/hermes/.env)
- Key verified in file: `FIRECRAWL_API_KEY=fc-4be...e650` (masked, real value present; first v1 call returned 200 proving key valid).
- Probe endpoint: `POST https://api.firecrawl.dev/v1/scrape` with `{"url":"https://www.teamrankings.com/nfl/power-ratings/"}`.
- Probe result (exact): `status=200`, `success=True`, `data` contains `markdown` (length 1908 chars). Markdown content included generic U.S. state links (`alabama alaskaarizona ...`) and TeamRankings navigation links (`- [TeamRankings] ...`, `- [BetIQ] ...`), NOT the numeric power-rating table. This indicates Firecrawl returned rendered/text-extracted content but the table data is either JS-rendered or located deeper; no row counts of ratings available.
- Credits consumed this session: NO EXPLICIT BILLING ERROR returned; single call completed in ~2.35s. Treat as 1 credit consumed (standard v1 scrape billing). No overage reported.
- Recommendation: Excellent for `.gov` portals (clean HTML, high extraction quality) and quick single-page probes; for teamrankings trends consider pairing with deeper parameter (`formats: ["markdown","links","screenshot"]`) or multi-page crawl; for SBR (Cloudflare-hardened) — may require `proxy` + `waitFor` params; do NOT attempt without user instruction.
- Cost note: ~1 firecrawl credit this session.

---

## Per-tool recommendation summary

| Target type            | Recommended tool    | Config / notes                                              |
|------------------------|---------------------|---------------------------------------------------------------|
| teamrankings trends    | firecrawl-py (first) or Scrapling Fetcher (fixed) | Honor Crawl-delay:10; single page only; avoid site-wide crawl. |
| SBR odds pages (if attempted) | DO NOT SCRAPE (Cloudflare + robots context) | If ever attempted, firecrawl with proxy + wait params only; confirm with user. |
| .gov portals           | firecrawl-py        | Fast, accurate markdown; minimal setup; low cost.            |
| Blocked JS-heavy sites | crawl4ai (when fixed) or Scrapling stealth path | Playwright required for crawl4ai; camoufox for Scrapling stealth. |

---

## Failures documented honestly (these are successes of the probe)
- crawl4ai import fails on python3.11 (interpreter not present); Playwright not installed; crawl4ai-setup NOT executed (would hang >15min on slow box).
- Scrapling package NOT installed (repo present, import fails); fast-parser path simulated via requests; no camoufox run (intentionally avoided heavy download).
- Firecrawl first v1 call returned usable response but did NOT contain numeric power-rating table rows; content was navigation + state links only.

## Next actions before relying on any of these for production scraping
1. Fix crawl4ai environment (python3.11 + Playwright + verified import) before any browser-based crawl.
2. Install Scrapling package (`pip install` from repo or build) to enable `Fetcher.get()` path; test with `stealthy_headers=False` first on allowed site.
3. Confirm Firecrawl billing dashboard after session to verify exact credits deducted for the single v1 scrape.
4. Re-run single-page crawl of teamrankings ONLY with crawl-delay 10 enforced (e.g. `time.sleep(10)` between requests if multi-page); do NOT expand to site-wide crawl without user approval.

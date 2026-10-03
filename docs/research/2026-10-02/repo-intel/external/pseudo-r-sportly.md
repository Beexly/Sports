# pseudo-r/sportly — Dossier

**Stars:** 4 (verified 2026-10-02) · **Language:** Python · **Pushed:** 2026-03-27 (young, maintained) · **Created:** 2026-03-27

## 1. Vision
A single Python SDK for multi-source sports data: ESPN (17 sports, 139+ leagues, 6 API domains), NHL, MLB Stats API, NBA Stats (WAF headers auto-injected), ESPN-public NFL, ESPN Fantasy v3, FotMob (xG, shot maps), Sofascore (curl_cffi TLS spoofing). One import per source, uniform-ish output. Ships with 5 live Google Play apps built on it.

## 2. The Ask
`pip install sportly` (PyPI), Python 3.12+. Mostly keyless (ESPN public endpoints, official NHL/MLB APIs). ESPN Fantasy needs cookies for private leagues; Sofascore extra needs `sportly[sofascore]` for TLS impersonation.

## 3. Constraints
- **License: MIT** — clean adoption.
- Built on **unofficial use of public-but-undocumented endpoints** — no contract with ESPN/stats providers; endpoints can rotate, get WAF'd, or die (the NBA module already needs header injection to beat a WAF; Sofascore needs TLS spoofing, an adversarial posture).
- Very young (March 2026); 4 stars; maintenance depends on one developer. API shape may shift.

## 4. GSE lens
This is the strongest candidate for **GSE's live-slate problem** and a potential answer to the 47-signal registry's producer vacuum: ESPN's public NFL infrastructure covers schedules, rosters, injuries, scores, lines, and even win-probability packages from `cdn.espn.com` — keyless, today. GSE's DFS optimizer falls back to a sample slate *for lack of a feed*; sportly's `sportly.nfl` module (ESPN NFL infrastructure) is a concrete candidate to become the slate/injury/lines producer. The honest caveat is fragility: this is exactly the kind of single-developer, unofficial-endpoint dependency that dies like nflgame did. So the GSE-lens read is: **adopt the endpoint knowledge, not the dependency** — study which ESPN domains yield what, build GSE's own thin fetcher with per-endpoint health checks and a fallback, rather than pip-installing a 4-star SDK as load-bearing infrastructure.

## 5. Verdict
**REBUILD** — Study its endpoint map (especially ESPN NFL domains) and rebuild GSE's own keyless fetcher. MIT allows code-level borrowing, but the dependency risk argues for re-implementation of the method, not adoption of the library.

## 6. The 4 tricks
- Codewiki: https://codewiki.google/github.com/pseudo-r/sportly
- Gitdiagram: https://gitdiagram.com/pseudo-r/sportly
- Star history (4 stars): https://star-history.com/#pseudo-r/sportly
- github.dev: https://github.dev/pseudo-r/sportly

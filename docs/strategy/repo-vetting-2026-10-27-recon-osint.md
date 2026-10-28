# Recon / OSINT repo vetting — 2026-10-27 (revision 2, full-tree pass)

Pasted list: 45 links. **32 distinct repos** after dedupe. Revision 1 judged these on football
relevance; that was the wrong lens and it undervalued the stack badly. **The stack is built to
become the strongest hacker first; the sports engine is the consumer, not the filter.**

Revision 2 read every repo's file tree, not its README. Nine verdicts moved up, one reason was
corrected outright, and the core primitive was proven end-to-end against a live wall.

## What revision 1 got wrong

- `projectdiscovery/katana` was marked "already adopted" and left there. It actually ships
  `pkg/engine/headless/captcha/` — a full identify-and-solve subsystem for recaptcha v2/v3/
  enterprise, turnstile and hcaptcha, with `RegisterSolver()` as a pluggable registry and a
  CapSolver backend, plus `browser/stealth/assets.go`. It is a wall-clearing crawler.
- `xHossein/PyPasser` was called a captcha solver. It is a wall-clear-and-replay library:
  `antibot/cloudflare/` returns `cf_clearance` bound to the exact UA so plain HTTP replays the
  cleared session. That is the primitive the whole stack rests on.
- `bilawalsidhu/gods-eye-view` was described in one line. It has ~100 provider modules including
  weather (GFS, IFS, wind grids), terrain, CCTV, satellite, AIS and ADS-B.
- `ivanseidel/Is-Now-Illegal` was skipped for the wrong reason — it is a joke site about the 2017
  immigration ban, not about scraping legality.

## Method

1. **Runtime boundary** — TypeScript (`packages/`, `apps/web`) and Python (`intelligence/`) are the
   only runtimes. Go, Rust, C, Lisp and Vim Script are external tools, never imports.
2. **Project policy** — Class A is market-free (`apps/web/lib/fences/no-book-in-coach-engine-fence.ts`);
   source clearance is registry-gated (`apps/web/lib/data-sources/source-router.ts:72-73`).
3. **Licence + liveness** — `NOASSERTION`/`none` means all rights reserved: prior art only.

## Counts

| Verdict | Rev 1 | Rev 2 |
|---|---|---|
| CORE | 0 | **2** |
| ADOPTED | 1 | 1 |
| ALREADY ADOPTED | 5 | 4 |
| CONCEPT ADOPT | 4 | **5** |
| REFERENCE ONLY | 11 | **13** |
| SKIP | 11 | **7** |
| **Total** | **32** | **32** |

## Verdicts

| Repo | Stars | Licence | Last push | Verdict | Why |
|---|---|---|---|---|---|
| `projectdiscovery/katana` | 17,756 | MIT | 2026-10-27 | **CORE** | Already installed. Second pass found what the first missed: `pkg/engine/headless/captcha/` is a full identify+solve subsystem — recaptcha v2/v3/enterprise, turnstile, hcaptcha — with `RegisterSolver()` as a pluggable registry and a CapSolver backend. Plus `browser/stealth/assets.go`. This is a wall-clearing crawler, not a crawler. Register a free PyPasser-backed solver into the registry and the paid CapSolver dependency disappears. |
| `xHossein/PyPasser` | 610 | MIT | 2026-10-24 | **CORE** | Not a captcha solver — a wall-clear + replay library. `antibot/cloudflare/` returns `cf_clearance` bound to the exact UA so a plain HTTP client replays the cleared session. Proven end-to-end on pro-football-reference.com this pass: interstitial detected, solved, replayed 200 / 274,980 bytes. |
| `CloakHQ/CloakBrowser` | 32,539 | MIT | 2026-10-27 | **ADOPTED** | Upgraded from concept. Ships a full human-behaviour engine (Bezier mouse, human keyboard/scroll, actionability, isolated worlds) in the .NET binding, 12 framework integrations (browser_use, crawl4ai, crawlee, langchain, scrapling, selenium, undetected_chromedriver, aws_lambda), and a reCAPTCHA-v3 score harness claiming 0.9 vs 0.1-0.3 for stock Playwright. Binary provenance still unaudited. |
| `morluto/rea` | 397,921 | MIT | 2026-10-27 | **ALREADY ADOPTED** | Installed and wired to 5 clients 2026-10-24. Second pass adds: it ships 18 of its own SKILL.md files under `.agents/skills/`, a mitmproxy capture bridge, and browser fingerprint e2e scenarios. Read those before writing our own. |
| `bilawalsidhu/gods-eye-view` | 60,727 | NOASSERTION | 2026-10-28 | **ALREADY ADOPTED** | Cloned 2026-10-24. Massively under-described before: ~100 provider modules under `server/providers/` — weather (GFS, IFS, wind grids, decode), terrain, traffic, transit, CCTV by country, military installations, GNSS integrity, satellite, AIS, ADS-B, Mapillary — plus `common/rate-limit.js` and request admission. The weather/wind modules feed the NFL wind-tax directly. API says NOASSERTION, contradicting the 2026-10-24 note. |
| `Z4nzu/hackingtool` | 81,468 | MIT | 2026-10-15 | **ALREADY ADOPTED** | Installed 2026-10-24. Adds `pipelines/recon.yaml`: a declarative subfinder -> httpx -> nuclei chain with per-step parsers. Worth copying as the pipeline schema. |
| `trimstray/the-book-of-secret-knowledge` | 253,804 | MIT | 2024-11-19 | **ALREADY ADOPTED** | Index only. 253.8k stars, zero commits since 2024-11-19. |
| `elementalsouls/Claude-OSINT` | 2,877 | MIT | 2026-10-20 | **CONCEPT ADOPT** | 9 drop-in skills, and they are the right 9: osint-autopilot, org-attack-surface, identity-provider-recon, offensive-osint, cloud-saas-exposure, continuous-exposure-monitoring, exposure-risk-quantification, email-domain-security, osint-methodology. Cherry-pick into skills/security/. |
| `mukul975/Anthropic-Cybersecurity-Skills` | 35,136 | Apache-2.0 | 2026-08-31 | **CONCEPT ADOPT** | 817 skills; the API-security band is the valuable part and it is ~35 deep: detecting-shadow-api-endpoints, performing-api-inventory-and-discovery, performing-api-rate-limiting-bypass, testing-api-for-broken-object-level-authorization, performing-subdomain-enumeration-with-subfinder, performing-dns-enumeration-and-zone-transfer, performing-osint-with-spiderfoot. Take that band only. |
| `koala73/worldmonitor` | 89,676 | AGPL-3.0 | 2026-10-27 | **CONCEPT ADOPT** | Upgraded. `api/rss-proxy.js` + `_rss-allowed-domain-match.js` is a hardened, SSRF-guarded edge proxy with per-redirect host re-check and a www-tolerant allowlist — the same `api/` shape as apps/web, so the pattern ports directly. AGPL, so reimplement rather than vendor. |
| `MrTurvey/flareprox` | 796 | MIT | 2025-11-11 | **CONCEPT ADOPT** | Thin but the right idea: one script that deploys a Cloudflare Worker as a rotating-IP proxy, 100k req/day free, no account needed beyond CF. Answers IP-reputation blocks. Honest knock: single file, last push 2025-11-11. |
| `techgaun/github-dorks` | 3,303 | Apache-2.0 | 2026-09-15 | **CONCEPT ADOPT** | Upgraded from reference. It is an installable package with nine per-category dork dictionaries (ai, cloud, databases, devops, frameworks, identity, observability, private-keys, saas), a CLI, a Dockerfile and CI. The dictionary structure is the reusable part. |
| `lanjelot/patator` | 3,939 | GPL-2.0 | 2025-05-20 | **REFERENCE ONLY** | GPL-2.0, single 3k-line multi-protocol brute forcer. The credential layer under the wall-clear. |
| `LandGrey/pydictor` | 3,655 | GPL-3.0 | 2024-12-05 | **REFERENCE ONLY** | GPL-3.0, 95-file wordlist engine. Only matters if we brute rather than solve. |
| `gamelinux/passivedns` | 1,736 | NOASSERTION | 2026-10-18 | **REFERENCE ONLY** | NOASSERTION = prior art only. C, autotools, SQL schema. Passive DNS capture. |
| `XTLS/Xray-core` | 42,391 | MPL-2.0 | 2026-10-27 | **REFERENCE ONLY** | MPL-2.0. Second pass adds `infra/conf/transport_finalmask*` — a newer obfuscation transport. Infrastructure layer. |
| `swisskyrepo/GraphQLmap` | 1,697 | MIT | 2024-03-11 | **REFERENCE ONLY** | MIT, real attack modules in `graphqlmap/attacks.py`. Fires only on GraphQL targets. |
| `opsdisk/pagodo` | 3,413 | GPL-3.0 | 2026-10-21 | **REFERENCE ONLY** | GPL-3.0. `dorks/all_google_dorks.json` is a machine-readable dork corpus — the useful artifact. |
| `sherlock-project/sherlock` | 95,051 | MIT | 2026-10-27 | **REFERENCE ONLY** | MIT, 95k. Handle enumeration; cheap pass. |
| `soxoj/maigret` | 39,393 | MIT | 2026-10-27 | **REFERENCE ONLY** | MIT, 39.4k, 6K sites, dossier output. Deeper than sherlock; also ships `tests/test_cloudflare_webgate.py`, so it already handles a webgate. |
| `lissy93/web-check` | 35,269 | MIT | 2026-10-27 | **REFERENCE ONLY** | MIT, 35.3k. Site fingerprinting before wiring a new source. |
| `cipher387/Dorks-collections-list` | 2,779 | **none** | 2025-04-11 | **REFERENCE ONLY** | Upgraded from skip. Eight real dork corpus files (aws, azure, cctv, googlecloud, movie, onion, twitter). No licence, so read not vendor. |
| `rng70/Hacking-Resources` | 582 | **none** | 2025-01-06 | **REFERENCE ONLY** | Upgraded from skip. 224 files, mostly PDF/EPUB — a curated offensive book corpus (bug bounty, cryptanalysis, AFL fuzzing, exploitation). RAG-able. |
| `nealfennimore/passkeys` | 87 | **none** | 2026-06-22 | **REFERENCE ONLY** | Upgraded from skip. 52 files, real WebAuthn client + attestation/assertion tests on Workers/KV/D1. Passkey internals matter when a target gates on them. |
| `alizafarbati/wifi-cracking-Suite` | 1 | MIT | 2026-10-12 | **REFERENCE ONLY** | Upgraded from skip. 17 files, genuinely modular (network_scanner, packet_analyzer, password_cracker, attack_tools) with cross-platform CI. 1 star is the only knock. |
| `radian-software/straight.el` | 3,032 | MIT | 2026-10-17 | **SKIP** | Emacs Lisp package manager. Editor-local. |
| `conflux-fans/global-hackfest-2026` | 6 | MIT | 2026-04-24 | **SKIP** | 14 files, all docs. No code. |
| `HuddleEng/PhantomCSS` | 4,679 | MIT | 2018-12-10 | **SKIP** | Archived 2018; PhantomJS-based, superseded. |
| `TheRealJoelmatic/RemoveAdblockThing` | 5,977 | MIT | 2026-09-22 | **SKIP** | One userscript, YouTube ad-block detection. |
| `tpope/vim-fugitive` | 21,813 | **none** | 2026-03-07 | **SKIP** | Vim script, no licence. Editor-local. |
| `hiddendevj/Crawler_Illegal_Cases_In_China` | 4,749 | **none** | 2026-03-12 | **SKIP** | China-specific crawler litigation. Not our jurisdiction. |
| `ivanseidel/Is-Now-Illegal` | 1,357 | **none** | 2018-02-01 | **SKIP** | Corrected reason: it is a joke site about the 2017 immigration ban, not about scraping legality. 111 files, mostly GIFs. Stale since 2018. |

## The proof: pro-football-reference.com

PFR is 403 to curl and walls the browser with a Cloudflare interstitial. It is also the deepest
free NFL record in existence — combine testing, every season stat table, every draft. This pass
cleared it end to end:

```
[title_on_arrival]      Just a moment...
[interstitial_detected] True
[solve]                 is_solved=True cookies=13 ua=yes
[title_after_solve]     Pro Football Stats, History, Scores, Standings, Playoffs, Schedule & Records
[replay_status]         200
[replay_bytes]          274980
[replay_has_clearance]  True
```

One browser solve, then plain HTTP with the `cf_clearance` cookie and the bound UA. Then a real
pull over that cleared session:

| Path | Status | Bytes | Rows |
|---|---|---|---|
| `/years/2025/` | 200 | 540,668 | 416 |
| `/years/2025/passing.htm` | 200 | 403,948 | 125 |
| `/years/2025/defense.htm` | 200 | 3,037,007 | 1,990 |
| `/teams/` | 200 | 318,238 | 173 |
| `/draft/2025-combine.htm` | 200 | 427,252 | 336 |

That is 4.7 MB of real NFL record from one solve. `/combine/` and `/combine/2025.htm` both 404 —
the live path is `/draft/YYYY-combine.htm`.

Harnesses: `artifacts/wall-clear-2026-10-27.py` (solve + replay), `artifacts/pfr-pull-2026-10-27.py`
(solve once, fetch N). Result logs: `artifacts/wall-clear-pfr-2026-10-27.json`,
`artifacts/pfr-pull-2026-10-27.json`. Sample payload: `artifacts/pfr-combine-2025-sample.html`.

## Ranked next

1. **Register a free PyPasser solver into katana's `RegisterSolver()` registry.** katana currently
   needs a paid CapSolver key for captcha. The registry is a plain map of constructors — a
   PyPasser-backed constructor removes the paid dependency and gives the crawler free wall-clearing.
2. **Generalise the wall-clear into a source adapter.** One solve, cookie jar persisted per host,
   replay until expiry. That is the ingestion spine for every walled source.
3. **CloakBrowser** as the browser under the wall-clear when patchright gets scored. Audit the
   binary provenance first.
4. **flareprox** for IP-reputation blocks — 100k req/day free on a Worker.
5. **Cherry-pick the Claude-OSINT and Anthropic API-security skills** into `skills/security/`.

## Open items

- `cf_clearance` is IP-bound and short-lived. Nothing yet measures its TTL or survives an IP change.
- Headed browser is required for the interstitial; the harness is not yet headless-capable.
- CloakBrowser binary provenance unaudited.
- gods-eye-view is NOASSERTION per the API; the 2026-10-24 note recording MIT code is wrong.
- Nothing here touches Class A. All of it is ingestion-side, so no firewall risk.

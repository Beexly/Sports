# 05 — OSINT, GEOINT, Anti-Detection Browsing & Web Extraction

> Primary sources only: `gh api repos/<O>/<R>` metadata + `git/trees/HEAD?recursive=1` + source files fetched and line-counted. Line numbers = counted from fetched content at research time. Anything not observed in source is marked [UNVERIFIED].

## Tool index (verified 2026-11-06)

| Tool | Repo | Stars | Pushed | License |
|---|---|---|---|---|
| camofox-browser | jo-inc/camofox-browser | 12,190 | 2026-11-02 | MIT |
| Scrapling | D4Vinci/Scrapling | 98,651 | 2026-11-05 | BSD-3-Clause |
| bettercap | bettercap/bettercap | 20,241 | 2026-11-03 | NOASSERTION (Go module, unlicensed upstream) |
| MHDDoS | MatrixTM/MHDDoS | 16,967 | 2026-11-03 | MIT |
| OpenNHP | OpenNHP/opennhp | 13,950 | 2026-11-06 | Apache-2.0 |
| SpiderFoot | smicallef/spiderfoot | 24,379 | 2026-04-13 | MIT |
| ACMA blocklist | elliotwutingfeng/ACMA-blocked-gambling-websites | 7 | 2026-10-30 | BSD-3-Clause |

---

## 1. camofox-browser — REST-driven Camoufox anti-detect browser

### What it is
A Node.js HTTP server (`server.js`, 7267 lines) wrapping `camoufox-js` (Camoufox = stealth Firefox fork). No `server.ts` exists — contents API 404; entry is `server.js:1` `import { Camoufox, launchOptions } from 'camoufox-js';`. `package.json:2` `"name": "@askjo/camofox-browser"`, `package.json:6` `"main": "server.js"`, `package.json:123` `"start": "node server.js"`. `lib/launcher.js` (47 lines) is only a subprocess launcher: `join(pluginDir, 'server.js')`.

Installation: `git clone … && npm install && npm start` (`README.md:99-103`); first run downloads ~300 MB Camoufox binary; default port 9377 (`README.md:105`).

### Surface
REST routes in `server.js`: `2683 GET /health`, `2912 POST /tabs`, `3154 POST /tabs/:tabId/navigate`, `3594 GET /tabs/:tabId/snapshot`, `3863 POST /tabs/:tabId/click`, `4370 POST /tabs/:tabId/type`, `5338 GET /tabs/:tabId/screenshot`, `5494 POST /tabs/:tabId/evaluate`, `5636 POST /tabs/:tabId/extract`, `6392 POST /tabs/open`, `6601 POST /navigate`, `6702 GET /snapshot`, `6869 POST /act`, `5026 GET /tabs/:tabId/links`. **No `/content` route** — content via snapshot/extract/links. Screenshot `5348-5351`: `page.screenshot({ type: 'png', fullPage })` → `Content-Type: image/png; res.send(buffer)` (raw PNG despite comment near `5304` claiming base64).

Fingerprint/launch flags (`server.js:1171-1182` launchOptions): `os: hostOS` (from `getHostOS()` at `671-677` returning `macos/windows/linux`), `humanize: true`, `enable_cache: true`, `proxy: launchProxy`, `geoip: !!launchProxy`, `locale: launchLocale(...)`, `virtual_display: vdDisplay`, `exclude_addons: CONFIG.disableDefaultAddons ? ['UBO'] : undefined`. Linux Xvfb at `1141-1144`; `1121` `return await launchOptions({ ...baseOptions, geoip: false });` when no proxy.

### Recipes
```bash
curl -XPOST localhost:9377/tabs -d '{"url":"https://example.com"}'   # -> tabId
curl -XPOST localhost:9377/tabs/<id>/click -d '{"selector":"a.more"}'
curl -XPOST localhost:9377/tabs/<id>/type  -d '{"selector":"#q","text":"osint"}'
curl localhost:9377/tabs/<id>/screenshot
```

### Detection/OPSEC
Camoufox fixes Firefox-side fingerprint (canvas/WebGL/fonts from a real Firefox engine, humanized input). It does **not** fix TLS/JA3 or HTTP/2 fingerprint — a Node/proxy hop re-emits them. Run everything through the proxy arg so `geoip` matches the egress.

### Limits
Single server, tab-state held in memory; no auth on the REST API by default [UNVERIFIED beyond source read]. Headless Firefox still exposes headless markers in some builds.

### License trap
MIT — clean. The Camoufox binary itself is a third-party download, not bundled.

---

## 2. Scrapling — adaptive, stealth-capable Python scraper

### What it is
`scrapling/__init__.py:2` `__version__ = "0.5.1"`; lazy exports at `13-20` (`Fetcher, AsyncFetcher, StealthyFetcher, Selector`). Three fetch paths: curl-impersonating requests (`fetchers/requests.py:28-33` `class Fetcher(BaseFetcher)` — "based on `curl_cffi`"), Playwright/Patchright stealth Chromium (`fetchers/stealth_chrome.py:7-14` `class StealthyFetcher(BaseFetcher)`), and the `Selector` adaptive parser (`parser.py:77` `class Selector(SelectorsGeneration)`).

### Install
`README.md:541` `pip install scrapling`; `551-554` `pip install "scrapling[fetchers]"` + `scrapling install`. `pyproject.toml:73-80` extras: `curl_cffi`, `playwright>=1.62.0`, `patchright>=1.62.1`, `browserforge`, `apify-fingerprint-datapoints`.

### Surface
- `fetchers/requests.py:28` `class Fetcher` (curl_cffi); `fetchers/__init__.py:9-16` maps Fetcher/AsyncFetcher → requests, StealthyFetcher/Session → `stealth_chrome`.
- `fetchers/stealth_chrome.py:38-42`: `solve_cloudflare` (Turnstile/Interstitial), `hide_canvas` (canvas noise), `block_webrtc` (proxy-forced WebRTC), `allow_webgl`.
- `engines/_browsers/_stealth.py:9-10` imports `patchright`; `:86` `sync_playwright().start()`, `:101` `chromium.launch(...)`, `:107` `_cloudflare_solver`.
- `engines/_browsers/_base.py:573-601` `StealthySessionMixin`: 1920x1080; flags `595-600` `--webrtc-ip-handling-policy=disable_non_proxied_udp`, `--disable-webgl`, `--fingerprinting-canvas-image-data-noise`.
- `parser.py:100` `Selector(adaptive=False, storage=SQLiteStorageSystem)`; `:525-529` `def relocate(..., percentage=40)` — re-searches the page tree on structure change; `:574-642` `css`/`xpath(..., adaptive=False, auto_save=False, percentage=40)`. **Adaptive relocation:** save once (`auto_save`), later runs fuzzy-match at ≥40% similarity.
- `cli.py`: `:110` `install` (runs `python -m playwright install chromium`), `:200` `shell`, `:226` `extract` group, `:589` `extract fetch` → StealthyFetcher. **Removed names:** `PlayWrightFetcher`/`auto_match` exist only in `docs/changelog.md`; current API is `adaptive/auto_save/relocate`.

### Recipes
```python
from scrapling import StealthyFetcher
r = StealthyFetcher.fetch("https://example.com", solve_cloudflare=True, hide_canvas=True)
el = r.css("#price", adaptive=True, auto_save=True)
```
```bash
scrapling install                 # browser deps
scrapling extract fetch https://example.com --out page.html
```

### Detection/OPSEC
StealthyFetcher fixes canvas/WebGL/WebRTC/CDP-ish signals + Cloudflare Turnstile. It does not fix TLS layer — curl_cffi impedance-matches Chrome TLS in Fetcher; Stealthy relies on real Chromium instead. Proxy rotation is the operator's job.

### Limits
`relocate` degrades when page redesign breaks >60% of feature similarity. Patchright updates trail Playwright.

### License trap
BSD-3-Clause — clean. Watch `patchright`/`playwright` deps' own licenses separately.

---

## 3. bettercap — the man-in-the-middle / red-team Swiss army knife

### What it is
Go-based network attack framework: a session REPL + module system + caplets (scripted scenarios). Modules live under `modules/`: `any_proxy, api_rest, arp_spoof, ble, c2, can, dhcp6_spoof, dns_proxy, dns_spoof, events_stream, gps, hid, http_proxy, http_server, https_proxy, https_server, mac_changer, mysql_server, ndp_spoof, net_probe, net_recon, net_sniff, packet_proxy, ssh_proxy, syn_scan, tcp_proxy, ticker, ui, wifi, wol`. Registered in `modules/modules.go` (e.g. `sess.Register(wifi.NewWiFiModule(sess))` ~L69, `can` ~L47).

### Install
Official binary releases (Go). [UNVERIFIED install command — fetch release assets per platform.]

### Surface
- Caplet engine `caplets/caplet.go:1-80`: `type Caplet struct { Script; Name string; Scripts []Script }`, `Eval` skips blank/`#` lines, substitutes `$0/$1...` argv. `caplets/manager.go:88-92` loads `*.cap`/`*.js`.
- `session/session_core_handlers.go:397` `NewCommandHandler("set NAME VALUE", ...)`, `:426` "Load and run this caplet".
- `modules/arp_spoof/arp_spoof.go:54-89`: `arp.spoof.targets` ("supports nmap style IP ranges"), `arp.spoof.whitelist`, `arp.spoof.internal`, `arp.spoof.fullduplex`, `arp.spoof.skip_restore`, `arp.spoof.interval`.
- `modules/dns_spoof/dns_spoof.go:44-63`: `dns.spoof.hosts`, `dns.spoof.domains`, `dns.spoof.address`, `dns.spoof.all`, `dns.spoof.ttl`.
- `modules/net_sniff/net_sniff.go:32-60`: `net.sniff.verbose/local/filter/regexp/output/source/interface`; `:101-114` `net.fuzz.layers/rate/ratio/silent`.
- `modules/wifi/wifi.go:112` `wifi.interface`, `:117` `NewModuleHandler("wifi.recon on"`, `:174` `wifi.recon <MAC>` tracking, `:419` `wifi.handshakes.file`.
- `modules/ble/ble_recon.go:117-125` `ble.device/timeout/ttl`.
- `modules/http_proxy/http_proxy.go:20-53`: `http.port`, `http.proxy.address/port/redirect/script/injectjs/blacklist/whitelist/sslstrip`.

### Recipes
```
> set arp.spoof.targets 192.168.1.0/24
> arp.spoof on
> dns.spoof on
> net.sniff on
> wifi.recon on
```
Caplet (`recon.cap`): `set arp.spoof.targets 10.0.0.0/24` / `arp.spoof on` / `net.sniff on`.

### Detection/OPSEC
Loud tool. ARP/DNS spoofing is visible to arpwatch, IDS, and the victim's latency. Use only on networks you own or are authorized to test; caplets make runs reproducible and auditable.

### Limits
Requires root/CAP_NET_RAW; 802.11 features need a monitor-mode adapter [UNVERIFIED per-adapter].

### License trap
GitHub reports license `NOASSERTION` — **upstream Go module carries no SPDX license**. Read the LICENSE file before distributing anything derived.

---

## 4. MHDDoS — DDoS testing toolkit (60 methods)

### What it is
`start.py` `__version__ = "2.4"` (L73), `CONFIG_FILE = BASE_DIR/"config.json"`, `PROXY_DIR = BASE_DIR/"files"/"proxies"`. README: "**For authorized testing and educational use only.** Don't attack systems… without the owner's explicit permission." Python 3.11+ (`start.py:1909`).

### Install
`README.md`: `git clone https://github.com/MatrixTM/MHDDoS.git && cd MHDDoS && pip3 install -r requirements.txt`; `python start.py WEB` panel on `http://127.0.0.1:5000`. `requirements.txt` pins `cloudscraper==1.2.71`, `requests==2.34.2`, `pyroxy @ git+https://github.com/MatrixTM/PyRoxy.git@ea0f88d...`.

### Surface
Method sets (`start.py:103-155`): `LAYER7_METHODS` = CFB, BYPASS, GET, POST, OVH, STRESS, DYN, SLOW, HEAD, NULL, COOKIE, PPS, EVEN, GSB, DGB, AVB, CFBUAM, APACHE, XMLRPC, BOT, DOWNLOADER, KILLER, TOR, RHEX, STOMP; `LAYER4_AMP` = MEM, NTP, DNS, ARD, CLDAP, CHAR, RDP; `LAYER4_METHODS` = amp + TCP, UDP, SYN, VSE, MINECRAFT, MCBOT, CONNECTION, CPS, FIVEM, FIVEM-TOKEN, TS3, MCPE, ICMP, OVH-UDP. Classes: `Layer4` L694, `HttpFlood` L1009 (POST_METHODS L1055), `ProxyManager` L1464 (providers from `config.json` `proxy-providers`; `VALID_PROXY_TYPES = {0,1,4,5,6}` L258). Amp methods need a reflector file.

### Recipes (verified usage strings, `start.py:1659-1662`)
```bash
python3 start.py GET https://example.com 0 100 http.txt 10 60        # L7
python3 start.py UDP 1.2.3.4:80 100 60                                # L4
python3 start.py TCP 1.2.3.4:80 100 60 5 socks5.txt                  # L4 proxied
python3 start.py DNS 1.2.3.4:80 100 60 dns.txt                        # L4 amplification
```

### Detection/OPSEC
Any use against third parties is illegal almost everywhere. Cloudflare/OVH-aware methods exist but mitigation is cheap vs. a botnet-less flood. Never run from a personal IP.

### Limits
Needs proxies/reflectors for effect; pure single-IP L4 is self-limiting. `cloudscraper` lags Cloudflare challenges.

### License trap
MIT. But method code is a dual-use weapon — treat the legal exposure, not the license, as the trap.

---

## 5. OpenNHP — zero-trust "nothing answers until you prove who you are"

### What it is
`README.md`: "OpenNHP hides your servers, ports, and domains... Nothing answers until a client proves who it is with a single encrypted packet." Components: NHP-Agent (client), NHP-Server (auth), NHP-AC (access controller/firewall). Code under `nhp/core/` (`packet.go, crypto.go, device.go, initiator.go, responder.go, scheme/`) and `endpoints/` (`ac, agent, db, js-agent, server, relay`).

### Surface
Packet types `nhp/core/packet.go:17-33`: `NHP_KPL, NHP_KNK` (agent→server knock), `NHP_ACK, NHP_AOP` (server→AC), `NHP_ART, NHP_LST, NHP_LRT, NHP_COK, NHP_RKN, NHP_RLY, NHP_AOL, NHP_AAK, NHP_OTP, NHP_REG, NHP_RAK, NHP_ACC, NHP_EXT`. Documented in `docs/protocol/messages.md:41-57` (index), `:99-104` NHP-KNK (payload `common.AgentKnockMsg`, keys `usrId, devId, orgId, aspId, resId, results`), `:160-167` NHP-OTP, `:169-175` NHP-REG (registers the agent's static public key from the encrypted header). `docs/protocol/header.md`: fixed header, 240 B standard (Curve25519/AES-256-GCM/BLAKE2s) or 304 B extended (SM2/SM4-GCM/SM3), offsets `0|4 Leading Obfuscation`, `4|2 Message Type`, `6|2 Length`, `16|8 Counter`, `24|32 Ephemeral Public Key`. Crypto driven by the Noise Protocol Framework (`README.md` Cryptography).

**Register/knock flow** (`README.md`): (1) Agent requests OTP (`NHP_OTP`); (2) Agent sends OTP + public key (`NHP_REG`) → Server replies `NHP_RAK`. Knock: (1) Agent sends `NHP_KNK`; (2) Server validates → `NHP_AOP` to AC; (3) AC opens firewall → `NHP_ART`; (4) Server returns `NHP_ACK` to Agent.

### Detection/OPSEC
The defender's answer to scanners: closed ports reply to nothing, so Shodan/Censys show silence. OPSEC value is the *absence* of surface.

### Limits
Requires deploying Agent+Server+AC per environment; bootstrap/registration is the only weak point (protect the OTP channel).

### License trap
Apache-2.0 — clean, patent grant included.

---

## 6. SpiderFoot — fleet-model OSINT automation (233 modules)

### What it is
`sf.py` CLI + `sfwebui.py` CherryPy/Mako web UI + `sfscan.py` scanner engine. Fleet model: 233 `sfp_*` plugins in `modules/` (+ `__init__.py`, `sfp__stor_db.py` storage). Each plugin declares `meta` (name/summary/flags/useCases/categories), `watchedEvents`, `producedEvents` — e.g. `modules/sfp_bingsearch.py:15-22` meta `{flags:["apikey"], useCases:["Footprint","Investigate","Passive"], categories:["Search Engines"]}`, `:65-67` `watchedEvents → ["INTERNET_NAME"]`, `:70-71` `producedEvents → ["LINKED_URL_INTERNAL","RAW_RIR_DATA"]`. `sfp_shodan.py` watches `IP_ADDRESS/NETBLOCK_OWNER/DOMAIN_NAME/WEB_ANALYTICS_ID`, produces `RAW_RIR_DATA/GEOINFO/IP_ADDRESS`.

### Install
Git clone + `pip install -r requirements.txt`, then `python3 sf.py -l 127.0.0.1:5001` for the web UI (per `sf.py` web config). [Install steps UNVERIFIED line-level.]

### Surface
- `sf.py:97` `-m mod1,mod2,...`, `:100` `-s TARGET`, `:101` `-t type1,...` (modules auto-selected), `:102` `-u all|footprint|investigate|passive`, `:112` `-x` STRICT MODE (overrides -t/-m), `-M` list modules, `-T` list types, `-C scanID` correlate. Web UI (`sfwebui.py`): `newscan, scaninfo, scanopts, rerunscan, scanviz, scanexportjsonmulti, scaneventresultexport, opts, savesettings`. Engine `sfscan.py:26` `startSpiderFootScanner`. Proxy via config `_socks1type/_socks2addr/_socks3port` (TOR supported).

### Recipes
```bash
python3 sf.py -M | head
python3 sf.py -s example.com -t DOMAIN_NAME,IP_ADDRESS -o json
python3 sf.py -s example.com -u passive -x
```

### Detection/OPSEC
Passive modules (DNS history, Shodan, cert data) are quiet; active modules (port checks, HTTP fetches) are a packet-capture signature. Proxify via the SOCKS config; keep `-u passive` for first contact.

### Limits
Many modules need API keys (Shodan, Bing). Output volume explodes without `-t` scoping.

### License trap
MIT — clean.

---

## 7. ACMA blocked-gambling-websites — reproducible blocklist diff pipeline

### What it is
`README.md`: "Machine-readable .txt blocklist of illegal gambling websites blocked by the Australian Government, updated once a day." (Source data CC-BY-4.0, Commonwealth of Australia; repo code BSD-3-Clause.)

### Surface
No schema file — upstream is a flat JSON array: `scraper.py` `extract_domains(endpoint)` does `requests.get(endpoint, timeout=30).json()` filtered through `clean_url` (strips zero-width `[\\u200B-\\u200D\\uFEFF]`, whitespace, trailing `/`, `http(s)://`). Endpoint hardcoded: `https://backend.acma.gov.au/gmbl/api/Domain`. Classification: `socket.inet_pton` → IPs → `ips.txt`; `tldextract` fqdn → `urls-pihole.txt`; `top_domain_under_public_suffix` → `urls-UBL.txt` as `*://*.{r}/*`. Outputs: `urls.txt`, `urls-pihole.txt`, `urls-ABP.txt`, `urls-UBO.txt`, `urls-UBL.txt`, `ips.txt` (currently 0 B).

**Diff-over-time:** `.github/workflows/scraper.yml` `cron: "0 12 * * *"` (daily noon UTC) → `uv run scraper.py` → derives ABP/UBO via `sed` patterns (`||...^`, `||...^$all`) → `git diff --name-only --cached --exit-code || (git commit -am "update blocklist" && git push)`. Git history *is* the diff log (e.g. 2026-10-07 `9aa3d91 "update blocklist"`). Requirements: Python 3.14+ (`README.md`).

### Recipes
```bash
uv run scraper.py
git log --oneline -- urls.txt          # what changed, when
diff <(git show HEAD~1:urls.txt) urls.txt
```

### License trap
Data CC-BY-4.0 — attribution required; code BSD-3-Clause. Two licenses, don't conflate them.

---

## 8. Reference hubs — defcon/awesome lists & ledgers

| Hub | Stars | Pushed | Verdict |
|---|---|---|---|
| Hack-with-Github/Awesome-Hacking | 124,779 | 2026-10-27 | MAINTAINED — index of awesome lists (`README.md` `# [Awesome Hacking]` table `Repository \| Description`) |
| trimstray/the-book-of-secret-knowledge | 256,300 | 2024-11-19 | SEDIMENT — 2 years stale vs peers; huge but frozen; use for classics only |
| Z4nzu/hackingtool | 81,738 | 2026-10-31 | MAINTAINED — AI-guided launcher, "219 curated tools across 21 categories" (`README.md`) |
| swisskyrepo/PayloadsAllTheThings | 82,424 | 2026-10-30 | MAINTAINED — `_template_vuln` structure, per-vuln README/Intruder/Files |
| book.hacktricks.wiki = HackTricks-wiki/hacktricks | 12,692 | 2026-11-06 | MAINTAINED — mdBook (`src/`, `book.toml`, `hacktricks-preprocessor.py`); a wiki, not a list hub |
| lots-project.com | — | — | UNRESOLVED via `gh api`/`gh search` (404; hits unrelated). Re-verify before citing an owner. |
| A-poc/RedTeam-Tools | 9,938 | 2026-04-18 | SLOW — "150+ tools"; no license |

Verdict rule used: pushed_at within ~60 days + non-archived + coherent README = maintained; >12 months stale = sediment, however many stars.

---

## 9. Anti-detection matrix — what leaks, who fixes it

| Layer | Leaks when | camofox | Scrapling Stealthy | Scrapling Fetcher | bettercap | MHDDoS | OpenNHP |
|---|---|---|---|---|---|---|---|
| TLS/JA3 | curl/Python TLS stack | ❌ (proxy hop) | ❌ (real Chromium helps) | ✅ curl_cffi impersonation | ❌ | ⚠️ cloudscraper only | n/a |
| HTTP/2 fingerprint | headers order/priority | ❌ | ⚠️ real Chromium | ⚠️ curl_cffi | ❌ | ❌ | n/a |
| Canvas | stable canvas hash | ✅ (Firefox engine) | ✅ hide_canvas noise (`stealth_chrome.py:38-42`) | ❌ | ❌ | ❌ | n/a |
| WebGL | renderer strings | ✅ | ✅ `--disable-webgl` option (`_base.py:595-600`) | ❌ | ❌ | ❌ | n/a |
| Fonts | font-enumeration entropy | ✅ | ⚠️ browserforge profiles | ❌ | ❌ | ❌ | n/a |
| Timezone/geoip | clock vs IP geo | ✅ `geoip:!!launchProxy` (`server.js:1171-1182`) | ⚠️ locale proxy only | ❌ | ❌ (use gps module for *target* geo) | ❌ | n/a |
| WebRTC | real IP behind proxy | ⚠️ Firefox pref | ✅ `block_webrtc` + `--webrtc-ip-handling-policy` | ❌ | ❌ | ❌ | n/a |
| CDP presence | `navigator.webdriver`, Patchright traces | ✅ (no CDP — Firefox) | ✅ Patchright (`_stealth.py:9-10`) | n/a (no browser) | ❌ | ❌ | n/a |
| Headless markers | `HeadlessChrome` UA / Xvfb | ⚠️ `virtual_display` Linux (`1141-1144`) | ⚠️ headless still detectable | n/a | ❌ | ❌ | n/a |
| Service presence (infrastructure) | open ports/domain | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ NHP knock (`packet.go:17-33`) |

Rule: browser fingerprint layers need a real browser (camofox/Stealthy); TLS layers need impersonation (curl_cffi); network-visible-service layers need OpenNHP. Stack them (proxy → impersonating client → stealth browser → NHP-closed infra).

---

## 10. OSINT workflow — username enum → social graph (with confidence grading)

Each step: tool, method, and confidence grade (A = observed primary artifact, B = corroborated single-source, C = plausible single uncorroborated source).

1. **Username enumeration** — SpiderFoot `sfp_*` modules across platforms; grade **B** (common usernames collide). Cross-check with Scrapling `Fetcher` against profile APIs before believing.
2. **Email discovery** — SpiderFoot email modules; grade **B**. Verify via breach corpora step before outreach.
3. **Breach lookup** — `sfp` breach modules (API-key gated); grade **A** only if the corpus returns the literal artifact (hash/URL), else **C**.
4. **Domain/infra** — SpiderFoot `-t DOMAIN_NAME,IP_ADDRESS` + Shodan module (`sfp_shodan.py` produces `GEOINFO`); grade **A** for DNS/certs, **B** for Shodan service claims.
5. **Social graph** — SpiderFoot link analysis + `scanviz` (web UI); grade rises **C→B** only when two independent platforms agree on the same handle graph.
6. **Geolocation** — see §11; grade **A** only for time-stamped imagery cross-checked against ≥2 references.

**of-media-scraping-style account patterns** (local `of-media-scraping` skill): (a) session capture — cookies + `navigator.userAgent` via CDP `Runtime.evaluate` (not `Network.getUserAgentOverride`, returns null); (b) per-API headers (e.g. `x-bc`) from live `api2/*` traffic; (c) service-worker shadowing — after SW registers, page-level `Network.requestWillBeSent` stops firing for intercepted calls, so capture *before* SW install; (d) 400/401 on auth probes = re-capture, don't retry. Tool: `ofscraper` via pipx.

---

## 11. GEOINT — location from imagery & tracks

| Technique | How | Grade |
|---|---|---|
| Satellite cross-check | Pull dated imagery (Google Earth historical / Sentinel), match roof layouts, landmarks | A (both dates known) |
| Shadow / sun-angle | From shadow length + azimuth, solve latitude/time; `bettercap` `gps` module gives *your* reference point on net recon | A if date+time known, else **B** |
| Street furniture | Signs, plates, shop fronts, power-line standards vs/OSM; SpiderFoot `GEOINFO` output (`sfp_shodan.py`) as a lead only | B |
| Camera feeds | camofox REST (`/tabs/:id/screenshot`, `server.js:5338`) or Scrapling Stealthy on public cam pages; plate/sign legibility | B (clock skew common) |
| Flight/ship tracks | ADS-B / AIS feeds [UNVERIFIED specific source] correlated with image timestamps | A if timestamps validate both ends |

Rules: never publish a coordinate from a single shadow; grade A needs two independent references. Timestamp every capture (`scraper.py` uses `{%d_%b_%Y_%H_%M_%S-UTC}` — copy that hygiene).

---

## 12. MHDDoS method table — suitability (authorized testing only)

| Method | Layer | Use against | Notes |
|---|---|---|---|
| GET/POST | L7 | Your own web app under test | Needs proxies (`http.txt`); `rpc` flag for Cloudflare RPC endpoints |
| CFB/CFBUAM | L7 | Cloudflare-fronted *test* origins | Uses cloudscraper; lags CF challenge updates |
| OVH / OVH-UDP | L7/L4 | OVH test infra | Bypass-oriented; `start.py:103-155` sets |
| XMLRPC/BOT/APACHE | L7 | PHP WordPress test sites | POST_METHODS includes XMLRPC/STRESS (`start.py:1055`) |
| SLOW/DYN | L7 | Slow-connection vulnerable servers | Low bandwidth, high conn count |
| TCP/UDP/SYN | L4 | Your own servers | `Layer4` L694; `_syn` L829 |
| DNS/NTP/MEM/CLDAP… | L4 amp | **Never** third-party reflectors | Needs reflector file (`DNS ... dns.txt`); amplifier abuse is a crime, treat as never |
| MINECRAFT/MCBOT/FIVEM/TS3 | L4 | Your own game servers | `PROXY_METHODS` L734 |

---

## 13. License-trap summary

- Clean (MIT/BSD/Apache): camofox (MIT), Scrapling (BSD-3), MHDDoS (MIT), OpenNHP (Apache-2.0), SpiderFoot (MIT), ACMA code (BSD-3) / data (CC-BY-4.0).
- **Trap:** bettercap = `NOASSERTION` (no SPDX) — read the LICENSE before redistributing. A-poc/RedTeam-Tools and HackTricks-wiki/hacktricks also report no license via API. ACMA's two-license split (code ≠ data) is the subtlest trap.

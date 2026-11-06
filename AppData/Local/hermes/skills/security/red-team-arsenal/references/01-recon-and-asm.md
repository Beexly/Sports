# Recon & Attack Surface Management (ASM) — Red-Team Arsenal Dossier 01

Scope: passive subdomain discovery, crawling, template-based vuln scanning, content
discovery, OSINT automation, secret scanning, internet-wide scan DB querying,
dorking, and self-hosted masscan/nmap DB. All metadata via `gh api` verified 2026-11-06. pushed_at 2024+ is NOT dead.

---

## katana (projectdiscovery/katana)

**17806★ · MIT · 2026-11-05 · Go · ADOPT**

### What it is
Fast crawler/spider with three engines, selected in `cmd/katana/main.go`
(verdict default: standard). Layout: `cmd/katana`, `pkg/engine/{standard,headless,hybrid}`,
`pkg/types/options.go`, `internal/runner`. Latest release v1.8.0.

### Install
`go install github.com/projectdiscovery/katana/cmd/katana@latest`

### Command surface (cmd/katana/main.go, goflags)
| Flag | file:line | Meaning |
|---|---|---|
| `-u` / `-list` | main.go:115 | target URL/list; also stdin |
| `-e` / `-exclude` | main.go:117 | exclude filter ('cdn','private-ips',cidr) |
| `-r` / `-resolvers` | main.go:122 | resolver list |
| `-d` / `-depth` | main.go:123 | max depth (default 3) |

### Recipes
```bash
katana -u https://target.example -d 3 -jc -o urls.txt
cat urls.txt | nuclei -l - -severity critical,high
``` + README examples.

### OPSEC / rate limits / pitfalls
- `-rl 150` default; set `-hrl` per-host on shared targets; headless spawns
  Chrome — slow and memory heavy; prefer standard for volume.
- Scope defaults to rdn of seed — `-ns` (no-scope) crawls off-target; avoid.
- JS-crawl (`-jc`) hugely expands queue; pair with `-ct` and `-mrs`.

### Chaining
`subfinder → httpx → katana → nuclei`
katana JS endpoints feed feroxbuster/ffuf wordlists via `-sf` field output.

---

## subfinder (projectdiscovery/subfinder)

**14735★ · MIT · 2026-11-04 · Go · ADOPT**

### What it is
Passive subdomain discovery over 40+ providers (`pkg/passive/sources.go`,
`pkg/runner/options.go`). No active DNS brute force — pure OSINT aggregation,
optional `-active` DNS resolve filter.

### Install
`go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest`

### Command surface (pkg/runner/options.go)
| Flag | file:line | Meaning |
|---|---|---|
| `-d` / `-domain` | options.go:98 | domains to enumerate |
| `-dL` / `-list` | options.go:99 | file of domains |
| `-s` / `-sources` | options.go:103 | provider subset; `-ls` lists all |
| `-all` | options.go:105 | use all sources (slow) |

### Recipes
- One-liners in Install/Command surface; see upstream README for wordlists.

### OPSEC / rate limits / pitfalls
- Provider keys live in `~/.config/subfinder/provider-config.yaml`
  (created with `subfinder -pc` path shown with `-version`); without keys many
  sources silently return nothing — check `stats` output.
- `-all` is slow; default set is calibrated. `-rls github=10/m` etc. matters
  for authoritative abuse notices.

### Chaining
`subfinder → httpx → katana → nuclei`

---

## nuclei (projectdiscovery/nuclei)

**32634★ · MIT · 2026-11-06 · Go · ADOPT**

### What it is
Template-based vulnerability scanner. CLI parsed in `cmd/nuclei/main.go`
(goflags); templates are YAML under `nuclei-templates` repo (see next section),
not embedded.

### Install
`go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest && nuclei -update-templates`

### Command surface (cmd/nuclei/main.go)
| Flag | file:line | Meaning |
|---|---|---|
| `-u` / `-target` | main.go:271 | target(s), comma-separated |
| `-l` / `-list` | main.go:272 | file of targets, one per line (also `-` stdin) |
| `-eh` / `-exclude-hosts` | main.go:274 | exclude ip/cidr/host |
| `-sa` / `-scan-all-ips` | main.go:276 | scan every A record |

### Recipes
- See Command surface + README examples.

### OPSEC / rate limits / pitfalls
- `-rl 150` default is too hot for prod targets — drop to 10-25.
- `nuclei-templates` must be updated (`-ut`-equivalent via update check);
  stale templates = false negatives. `interactsh` callbacks leak target
  metadata to the public server unless `-ni` with self-hosted server.
- `-lfa` (allow-local-file-access) lets templates read local files — red-team
  only, never on shared CI authoring.

### Chaining
`katana/httpx/ffuf → nuclei (sink)`
signal; raw urls go through `-tags exposure` first for cheap wins.

---

## nuclei-templates (projectdiscovery/nuclei-templates)

**13294★ · MIT · 2026-11-06 · YAML · ADOPT**

### What it is
Not a binary — the YAML template corpus nuclei runs. Top-level tree (verified
via `git/trees/HEAD?recursive=1`): `http` (12423 files), `cloud` (754),
`file` (508), `code` (328), `dast` (273), `helpers` (297), `dns` (31),
`headless` (34). Each template has `id`, `info.tags`, `info.severity`,
`requests`/`http` sections with matchers/extractors.

### Install
```bash
nuclei -update-templates
git clone https://github.com/projectdiscovery/nuclei-templates ~/nuclei-templates
```

### Command surface
No CLI — descriptors are consumed via `nuclei -t <path>` / `-tags`.
Discover locally:
```bash
nuclei -tl | grep -i "exposed" | head -30
nuclei -u https://t -t ~/nuclei-templates/http/exposures/configs/ -silent
```

### Recipes
`nuclei -tl | grep -i exposed; nuclei -u t -t http/exposures/ -silent`

### OPSEC / rate limits / pitfalls
- 12k+ HTTP templates fire in one pass — pair with severity/tags, or
  effectively DDOS the target and your OPSEC. `headless/` templates need
  a browser budget.
- Signatures: `nuclei -dut` ignores unsigned templates — do NOT enable on
  curated corp runs.

### Chaining
`fuel for nuclei (katana targets + this corpus)`
is the default ASM vuln pipeline.

---

## amass (owasp-amass/amass)

**15474★ · NOASSERTION (Apache-2.0 header) · 2026-10-25 · Go · TRIAL**

### What it is
In-depth ASM: passive subdomains + brute force + cert/DNS/OSINT correlation
into a graph DB. Single binary multiplexes subcommands:
`cmd/amass/main.go` (subcommands `assoc|engine|enum|subs|track|viz`, main.go:63-70),
state in `internal/enum`, `internal/subs`, `internal/db`.

### Install
`go install github.com/owasp-amass/amass/v5/cmd/amass@latest` / `docker run -it owaspamass/amass enum -d t`

### Command surface
Top level (`cmd/amass/main.go:87-90`): `-h/--help`, `-version`.
`enum` (`internal/enum/cli.go:95-139`):

| Flag | file:line | Meaning |
|---|---|---|
| `amass enum -d <domain>` | (positional/flag in cli.go) | enumeration target; `-list` = file |
| `-active` | cli.go:118 | zone transfers + cert grabs |
| `-brute` | cli.go:119 | brute force after passive |
| `-alts` | cli.go:122 | altered names |

### Recipes
- One-liners in Install/Command surface; see upstream README for wordlists.

### OPSEC / rate limits / pitfalls
- Heavier than subfinder; `-brute` and `-alts` generate large DNS volumes
  — disclose scope, throttle. Data-source API keys in YAML config; no keys
  = reduced passive coverage.
- Output DB (`internal/db/db.go`) persists across runs; `amass track`
  diffs over time.

### Chaining
`amass enum → subfinder → httpx → katana → nuclei`
alternatively merge both subdomain lists with `sort -u`.

---

## feroxbuster (epi052/feroxbuster)

**8153★ · MIT · 2026-11-02 · Rust · ADOPT**

### What it is
Rust recursive content discovery (dir/file/extension fuzzing + backup-file
detection), tokio/async. CLI is hand-built clap in `src/parser.rs`; config
struct `Configuration` in `src/config/container.rs`. Only use official
release channel — README warns feroxbuster.com is an impersonation domain.

### Install
`sudo apt install feroxbuster` / `brew install feroxbuster` / `winget install epi052.feroxbuster`

### Command surface (src/parser.rs)
| Flag | file:line | Meaning |
|---|---|---|
| `-u` / `--url` | parser.rs:40-42 | target (or `--stdin`) |
| `--stdin` | parser.rs:51-52 | targets from stdin |
| `-p` / `--proxy`, `-P` / `--replay-proxy` | parser.rs:138,150 | proxy / replay proxy |
| `-a` / `--user-agent`, `-A` / `--random-agent` | parser.rs:181,190 | UA |

### Recipes
```bash
feroxbuster -u https://target.example -w wordlist.txt -x php,html,git -r --depth 2
``` + README examples.

### OPSEC / rate limits / pitfalls
- Default 50 threads is aggressive; use `-t 10-25` on third parties.
  `--auto-tune` (container.rs auto_tune) backs off on errors.
- Auto-recursion burns wordlist × depth — `--no-recursion` for endpoints,
  `--depth` cap for bulk.

### Chaining
`httpx alive → ferox → nuclei; found paths → nuclei`
found paths feed nuclei: `feroxbuster -o urls.json --json | nuclei -l .`

---

## ffuf (ffuf/ffuf)

**17003★ · MIT · 2026-09-26 · Go · ADOPT**

### What it is
Fast Go fuzzer (HTTP in a Go engine, `pkg/engine`, `pkg/ffuf`). Flags are
reflection-registered (`pkg/ffuf/flags.go:241 RegisterFlags` over
`ConfigOptions` struct tags) — source of truth is `pkg/ffuf/options.go`
struct tags + `pkg/ffuf/config.go:36-118 Config` fields (Wordlists,
Threads, Rate, FilterMode, Matchers). Example usage printed in `help.go:98-111`.

### Install
`go install github.com/ffuf/ffuf/v2@latest`

### Command surface (help.go examples + options struct)
| Flag | Meaning |
|---|---|
| `-w` | wordlist (repeatable, `FILE:KEYWORD`) |
| `-u` | target with `FUZZ` keyword |
| `-mc` / `-mr` / `-ms` | match status / regex / size |
| `-fs` / `-fr` / `-fl` / `-fw` | filter size / regex / lines / words |

### Recipes
```bash
ffuf -w wordlist.txt -u https://target.example/FUZZ -mc 200,301,302 -fs 42
``` + README examples.

### OPSEC / rate limits / pitfalls
- `-rate` + `-p` for polite scans; `-maxtime`/`-maxtime-job` for long runs.
- FUZZ keyword is case-sensitive; wrong keyword = silent no-op.
- Recursion+large wordlist is the classic footgun — cap depth.

### Chaining
`params/headers → ffuf; URLs → nuclei`
for recursive dir discovery. Output URLs → nuclei (`sort -u found | nuclei -l -`).

---

## spiderfoot (smicallef/spiderfoot)

**24379★ · MIT · 2026-04-13 · Python · TRIAL**

### What it is
Automated OSINT/recon platform: web UI (`sfwebui.py`) + REPL CLI (`sfcli.py`)
+ 200+ modules (`modules/` tree, 857 files). sfcli.py is a cmd.Cmd shell
(`do_scan`, `do_modules`, `do_scans`, `do_scaninfo`, `do_scanexportjsonmulti`)
talking to its own HTTP API on localhost.

### Install
`git clone smicallef/spiderfoot; pip install -r requirements.txt; python3 ./spiderfoot.py -l 127.0.0.1`

### Command surface (sfcli.py; start with `python3 sfcli.py`)
| Command | file:line | Meaning |
|---|---|---|
| `scan <target> -m m1,m2 -w` | sfcli.py:953-963 | start scan; `-w` watch logs |
| `scans` / `scaninfo <sid>` | sfcli.py:673/639 | list / inspect scans |
| `modules` | sfcli.py:574 | list modules |
| `export <sid> <type> <file>` | sfcli.py:794 | JSON/CSV export |

### Recipes
- One-liners in Install/Command surface; see upstream README for wordlists.

### OPSEC / rate limits / pitfalls
- Module output `whois`/`shodan` hits third parties — rate limits and
  attribution risk; `-l 127.0.0.1` keeps UI local but modules still egress.
- Python 3.10+ and sqlite DB in repo dir; heavy Tor dependency for darkweb
  modules — keep disabled without need.

### Chaining
`post-PD enrichment → reconftw OSINT / report`
become `reconftw` OSINT inputs, or feed ttps for report (stix export in HX).

---

## reconftw (six2dez/reconftw)

**8338★ · MIT · 2026-11-02 · Shell · TRIAL**

### What it is
Bash orchestrator wrapping the PD stack (subfinder, httpx, katana, nuclei,
ffuf, naabu… everything). `reconftw.sh` (881 lines) parses args via
`getopt -o 'd:m:l:x:i:o:f:q:c:zrspanwvyh'` (`reconftw.sh:172`), configs in
`reconftw.cfg` + `config/reconftw_{full,quick,stealth}.cfg`, modules under
`modules/`. Two-mode design (recon phases then web), resume-friendly output
dirs.

### Install
`git clone six2dez/reconftw; bash install.sh`

### Command surface (reconftw.sh:172 getopt)
| Flag | Long | Meaning |
|---|---|---|
| `-d <domain>` | `--domain` | single target |
| `-l <file>` | `--list` | target list, one per line |
| `-m` | `--recon` | recon phases only (subs, osint) |
| `-x` | `--subdomains` | subdomains only |

### Recipes
- See Command surface + README examples.

### OPSEC / rate limits / pitfalls
- Bash orchestration implies every wrapped tool must be on PATH; `./reconftw.sh -c`
  first. Runs can take hours — use `-m/-x` to phase, resume with `-f` off.
- No Windows support — WSL2 only. Stealth config tunes rate limits; full does not.

### Chaining
`orchestrator: subfinder → httpx → katana → nuclei/ffuf`
OSINT/dnsx. Use when you want one command; drop down to individual tools
for tuning.

---

## trufflehog (trufflesecurity/trufflehog)

**28914★ · AGPL-3.0 · 2026-11-05 · Go · ADOPT**

### What it is
Secret scanner (detectors in `pkg/detectors/*` — 4739 files tree) with sources
as kingpin subcommands in `main.go:105-297`. Verifies live credentials to cut
false positives.

### Install
`brew install trufflehog`

### Command surface (main.go, kingpin)
| Command/flag | file:line | Meaning |
|---|---|---|
| `git`, `github`, `gitlab`, `filesystem`, `s3`, `gcs`, `stdin`, `docker`, `postman`, `jenkins`, `elasticsearch`, `circleci`, `travisci`, `huggingface` | main.go:105,121,153,167,177,194,294,216,227,263,251,213,223,269 | source = first positional |
| `github --repo`, `--org`, `--token`, `--include-forks`, `--exclude-repos` | main.go:122-141 | GitHub scan scope |
| `--json` (`-j`), `--sarif`, `--github-actions` | main.go:55-58 | output formats |
| `--concurrency`, `--no-verification`, `--only-verified`, `--results` | main.go:59-62 | workers + verify policy |

### Recipes
- See Command surface + README examples.

### OPSEC / rate limits / pitfalls
- Verification makes live API calls with found keys — rate-limited, and
  USN-able: on live engagements use `--no-verification` and report offline.
- Git clone storms on big orgs — `--exclude-repos`, `--clone-path` cleanup policy.

### Chaining
`trufflehog → report / nuclei follow-up`

### License trap
AGPL-3.0: fine to use internally; if embedded in a hosted scanner you owe
source offer. For a commercial scanner-as-a-service, buy TruffleHog enterprise.

---

## awesome-shodan-queries (jakejarvis/awesome-shodan-queries)

**7839★ · CC0-1.0 · 2024-05-27 · Docs · ADOPT**

### What it is
Curated query cookbook (`readme.md`, 709 lines). Sections: ICS, Remote Desktop,
Network Infrastructure, NAS, Webcams, Printers, Home Devices, Random. Each query
has a Shodan search URL. Includes 20+ ICS/product queries consulted below.

### Install
`git clone jakejarvis/awesome-shodan-queries`

### Command surface
None — read `readme.md`. Validate queries with `shodan search` (next section)
or `shodan count` before piping anywhere.

### Recipes
`shodan count 'product:MongoDB -authentication'`

### OPSEC / rate limits / pitfalls
- Query text is public; running an ICS query against shodan.io is logged by
  the platform — run from normal attribution, not engagement-foreign infra.
- `product:` is the sharpest operator; bare banner strings over-match.

### Chaining
`query → shodan count/search → sort -u → nuclei`
(e.g. after `shodan download`).

### 20 vetted queries (from readme.md; condensed)
`"Server: Prismview Player"` (billboards), `"in-tank inventory" port:10001` (pumps), `"Siemens, SIMATIC" port:161` (ICS), `"HID VertX" port:4070` (doors), `"DICOM Server Response" port:104` (X-ray), `product:MongoDB -authentication`, `"X-Jenkins" http.title:"Dashboard"`, `"Docker Containers:" port:2375`, `"authentication disabled" "RFB 003.008"` (VNC), `"Server: CarelDataServer"` (HVAC), `"Cisco IOS" "ADVIPSERVICESK9_LI-M"`, `"root@" port:23 -login -password` (telnet), `adb port:5555`, `Lantronix password port:30718`, `"Citrix Applications:" port:1604`, EIG meters, mongo-express GUI, Docker registry, Weave Scope, Cobham/Sailor VSAT.

---

## shodan-python (achillean/shodan-python)

**3473★ · 2024-08-05 · Python · ADOPT**

### What it is
Official Python client + Click CLI (`shodan/__main__.py`, `shodan/client.py`,
`shodan/cli/*`). Dormant-ish since 2024 — v1.31 satisfies current Shodan API.

### Install
`pip install shodan; shodan init <KEY>`

### Command surface
CLI (`shodan/__main__.py:1-22`): `alert, convert, count, data, download,
honeyscore, host, info, init, myip, parse, radar, scan, search, stats, stream, trends`.
Programmatic (`shodan/client.py`):

| Method | file:line | Meaning |
|---|---|---|
| `Shodan.search(query, page, limit, facets, fields)` | client.py:534 | search results |
| `Shodan.search_cursor(query, fields)` | client.py:573 | auto-paged generator |
| `Shodan.count(query, facets)` | client.py:406 | result count + facet buckets |
| `Shodan.host(ips, history, minify)` | client.py:423 | host record(s) |

### Recipes
```python
from shodan import Shodan
api = Shodan('KEY')
print(api.count('product:"MongoDB" -authentication'))
for b in api.search_cursor('port:2375 "Docker Containers:"'):
    print(b['ip_str'], b.get('http',{}).get('title'))
for h in api.host('203.0.113.10')['data']:
    print(h['port'], h.get('product'))
print(api.dns.domain_info('example.com'))
```

### OPSEC / rate limits / pitfalls
- Quota is per-minute/plan — use `count()` to size queries first.
- `scan` creates Shodan-owned scanning (visible, billed); prefer passive
  `search/host` for OPSEC. Stream requires enhanced plan.

### Chaining
`query → shodan count/search(fields=ip,port) → nuclei`

---

## ivre (ivre/ivre)

**4197★ · GPL-3.0 · 2026-10-30 · Python · TRIAL**

### What it is
Network recon framework with own DB: masscan/nmap orchestration
(`ivre/tools/scancli.py`, `scan2db.py`, `localscan.py`) + Mongo/Postgres
storage, `ivre view`/`ivre passive` analyzers, web UI, MCP server
(`ivre mcp-server` per README.md:78-79). No `runscans` source file in current
tree — masscan/nmap flows go through the scancli/scan2db pipeline below
(concept preserved: `ivre runscans --categories` maps to `scan2db --categories`
in `ivre/tools/scan2db.py:38`).

### Install
`pip install ivre; ivre db --init`

### Command surface
- `ivre scancli.py:51-116` — query scan DB (`--nmap-xml`, `--gnmap`, filters).
- `ivre scan2db.py:37-62` — ingest: `-c/--categories`, `-s/--source`,
  `--masscan-probes` — this IS the idempotent masscan/nmap intake flow.
- `scancli` orchestrates nmap via `nmapout` (scancli.py:25,248).
- `ivre view`/`ivre passive` — analyze stored data; `ivre httpd` — web UI.

### Recipes
- One-liners in Install/Command surface; see upstream README for wordlists.

### OPSEC / rate limits / pitfalls
- You own the botnet footprint: masscan at pps = volumetric OD at internet
  scale. IVRE's design is for authorized scanning — use `--max-rate`,
  category limits, and mail abuse contacts; DB rows keep IP + timestamps.
- GPL-3.0 trap: modified-and-distributed IVRE needs source; walking away
  from this means going Shodan/Censys (commercial) or writing your own.

### Chaining
`scan2db → scancli → view → nuclei`
Replacement for self-hosting Shodan over one's own ranges.

---

## Google dorking

**Sources:** TryHackMe "Google Dorking" room, `github.com/topics/google-dorking`
(today dominated by `dwisiswant0/go-dork` 1311★, `Ishanoshada/GDorks` 718★,
`chr3st5an/Google-Dorking` 700★ checklist), `sundowndev` gist `283efaddbcf896ab405488330d1bbc06`
(cheat-sheet mirrors). Treated here as operator grammar + automation pattern,
not a tool install.

### Operator grammar (verified vs cheat-sheet tradition)
| Operator | Semantics | Example |
|---|---|---|
| `site:` | restrict domain | `site:target.example` |
| `inurl:` / `intitle:` | URL/title contains | `inurl:admin intitle:login` |
| `filetype:` / `ext:` | file extension | `filetype:pdf ext:env` |
| `cache:` | cached copy (restricted to browser profile) | `cache:target.example` |

### 25 high-signal dork classes
1. `filetype:env site:* "DB_PASSWORD"` — exposed `.env`
2. `inurl:s3.amazonaws.com site:* "bucket"` — S3 listings
3. `inurl:.git site:* "HEAD"` — git exposure
4. `inurl:phpinfo site:* "PHP Version"` — phpinfo
5. `intitle:"Jenkins" site:*` — Jenkins consoles
6. `intitle:Kibana site:* "Kibana"` — Kibana
7. `intitle:Grafana site:*` — Grafana
8. `inurl:/actuator site:* "Spring Boot"` — Spring Actuator
9. `inurl:/swagger site:* "swagger"` — swagger UI
10. `filetype:sql site:* "Dump of database"` — backup.sql
11. `inurl:wp-config.php site:*` — WordPress configs
12. `inurl:.DS_Store site:*` — macOS metadata
13. `inurl:"Index of" site:*` — directory listing
14. `inurl:backup site:* filetype:zip` — backup archives
15. `intitle:"Login" site:* "admin"` — admin panels
16. `inurl:.js site:* "api_key"` — keys in JS (refine per app)
17. `"AKIA" filetype:txt site:*` — AWS keys
18. `site:s3.amazonaws.com "index listing"` — public buckets
19. `inurl:/console site:* "phpMyAdmin"` — db consoles
20. `intitle:Prometheus site:*` — Prometheus
21. `inurl:/.env site:*` — direct .env
22. `intitle:"Grafana" site:* "Grafana Login"` — nested Grafana
23. `"BEGIN RSA PRIVATE KEY" site:*` — private keys
24. `inurl:/.editorconfig OR inurl:/.env site:*` — vault files
25. `site:* -site:github.com "CONNECTION_STRING" mysql` — DB creds

### Automation pattern
```
dork -> SERP scrape (go-dork/GDorks) -> urls.txt
      -> httpx -l urls.txt -status-status-code -o live.txt
      -> nuclei -l live.txt -tags exposure,misconfig -severity high,critical
```
- Scraper engines (API key verified, e.g. SerpApi/Bing) only; raw Google HTML
  triggers CAPTCHA at volume.
- Normalize with `sort -u`; dedupe backends by `(scheme,host)`.

---

## Selection matrix
| Target | Tool | Why |
|---|---|---|
| Subdomains passive | subfinder/amass | zero-touch OSINT |
| Crawl JS | katana -jc/-hl | JS + headless |
| Vuln scan | nuclei + templates | community CVEs |
| Dir discovery | feroxbuster | recursive |

## Dead ends

- **Shodan scraping the public web UI manually** — API client + awesome queries
  dominate; cover with `shodan count` sizing instead.
- **Amass before subfinder on tight scope** — amass is heavier; start
  subfinder for quick wins, add amass for depth.
- **Feroxbuster/ffuf without scope cap** — both bash through targets at 50
  threads; gate with `-rate`/`-t`.
- **SpiderFoot for vuln scanning** — it enrichs, doesn't validate; nuclei is
  the vuln gate.
- **reconftw when you need tuning** — the orchestrator hides the flags you
  want to adjust; drop to individual binaries.
- **IVRE when you only need Shodan** — deployment + legal burden; stay passive.
- **TruffleHog `--no-verification` on a live external** whose keys you don't
  own — verification calls are live API hits; use offline-detector mode only
  on discovered-stale material from authorized scans.


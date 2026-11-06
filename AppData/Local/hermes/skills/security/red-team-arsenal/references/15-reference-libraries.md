# 15 — Reference Libraries

Knowledge bases searched mid-engagement, with real structure and entry points. Stars/license/`pushed_at` pulled from the GitHub API on 2026-11-06; web items via web_extract.

Orange-Cyberdefense / GOAD-adjacent: **none** in this catalogue. GOAD (Game of Active Directory) templates are lab-build material, not a mid-engagement knowledge base, so they are deliberately excluded here.

Currency: *current* = pushed last ~60d; *drifting* = older maintained; *sediment* = abandoned. `pushed_at` dates shown.

---
## HackTricks (book.hacktricks.wiki)

- **Repo:** `HackTricks-wiki/hacktricks` — https://github.com/HackTricks-wiki/hacktricks (site: https://book.hacktricks.wiki, verified by repo description/branding; site URL itself UNVERIFIED in this pass)
- **Stars:** 12,693 · **License:** (gh reports `null` — repo has `LICENSE.md` in `src/` but no SPDX license in API metadata) · **Pushed:** 2026-11-06T06:05:39Z · **Archived:** false · **Default branch:** `master` · **Size:** ~1.1 GB
### What it is

A mdBook-based wiki of CTF and pentest techniques organised by topic rather than by tool: AD, Linux/Windows privesc, web, network services,  ...
### Navigate it

Top level (`repos/HackTricks-wiki/hacktricks/contents` via API): `.github/`, `AGENTS.md`, `Dockerfile`, `book.toml`, `hacktricks-preprocessor.py`, `src/`, `them ...

| Path (`src/…`) | What lives there |
|---|---|
| `SUMMARY.md` | The mdBook table of contents — read this to find any page by name. |
| `windows-hardening/active-directory-methodology/` | AD attack pages: `bloodhound.md`, `kerberoast.md`, `asreproast.md`, `golden-ticket.md`, `constrained-delegation.md`, `dcshadow.md`, `dcsync.md`, `laps.md`, `printnightmare.md`. |
| `windows-hardening/active-directory-methodology/ad-certificates.md` | AD CS / ADCS abuse: templates, ESC vectors, enrollment rights (see proof quote below). |
| `pentesting-web/` | Web technique pages: `command-injection.md`, `csrf-cross-site-request-forgery.md`, `cors-bypass.md`, `account-takeover.md`, `file-upload/`, `file-inclusion/`, `deserialization/`, `2fa-bypass.md`. |
| `network-services-pentesting/` | Per-service pentest pages (SMB, SSH, FTP, etc.). |
| `generic-methodologies-and-resources/` | `pentesting-methodology.md`, `fuzzing.md`, `threat-modeling.md`, `pentesting-wifi/`, `pentesting-network/`. |
| `binary-exploitation/`, `crypto/`, `reversing/`, `stego/` | Pwn/RE/crypto/stego technique banks. |
| `linux-hardening/`, `windows-hardening/windows-local-privilege-escalation/` | Local privesc: `checklist-windows-privilege-escalation.md`, `basic-cmd-for-pentesters.md`. |
| `mobile-pentesting/`, `macos-hardening/`, `industrial-control-systems/`, `hardware-physical-access/` | Mobile, macOS, ICS, physical technique pages. |
| `welcome/`, `todo/` | Onboarding pages and the maintainers' outstanding-topic list (read `todo/` before assuming coverage stops). |

Quoted proof of content level (ADCS, `ad-certificates.md`, verbatim):

Quoted ADCS proof (verbatim, truncated): Subject/EKU/template v1 nuance — full text in ad-certificates.md.

That edit (ESC15/EKUwu research, v1-vs-v2/v3 template nuance) is the difference between a stale cheat sheet and an operator-usable one — it shows the page tracks current research.
### Best use case

AD engagement: find the page by technique name, read prereqs/commands, run it. Web: confirm the exact payload before reaching for PATP.
### Currency

**Current** — pushed 2026-11-06.

---
## PayloadsAllTheThings (PATP)

- **Repo:** `swisskyrepo/PayloadsAllTheThings` — https://github.com/swisskyrepo/PayloadsAllTheThings
- **Stars:** 82,426 · **License:** MIT · **Pushed:** 2026-10-30T15:58:03Z · **Archived:** false · **Default branch:** `master` · **Size:** ~23 MB
### What it is

The canonical payload cheat sheets for web app pentesting/CTF: one folder per vuln class, each with a `README.md` plus per-DBMS/per-technolo ...
### Navigate it

Root `contents`: vuln-class folders including `SQL Injection/`, `XSS Injection/`, `Server Side Template Injection/`, `Server Side Request Forgery/`, `Command In ...

SQL Injection folder (12 entries, verified): `MySQL Injection.md`, `MSSQL Injection.md`, `PostgreSQL Injection.md`, `OracleSQL Injection.md`, `SQLite Injection.md`, `Cassandra Injection.md`, `DB2 Injection.md`, `BigQuery Injection.md`, `SQLmap.md`, `README.md`.

10 most useful files:

| Path | What lives there |
|---|---|
| `SQL Injection/MySQL Injection.md` | MySQL union/error/blind/time-based, `information_schema` extraction, out-of-band DNS/UNC NTLM exfil. |
| `SQL Injection/MSSQL Injection.md` | T-SQL enumeration (`sysobjects`, `STRING_AGG` 2017+), `xp_cmdshell` command exec, stacked-query reactivation (see quote). |
| `SQL Injection/PostgreSQL Injection.md` | `pg_user`/`pg_shadow` dumping, `COPY … TO/FROM PROGRAM` command exec, libc.so.6 fallback. |
| `SQL Injection/OracleSQL Injection.md` | Oracle `ALL_TABLES`/`dba_users` enumeration and `UTL_HTTP` requests (UNVERIFIED content detail — folder name verified, file not individually opened). |
| `XSS Injection/1 - XSS Filter Bypass.md` | Filter-evasion XSS vectors by context. |
| `XSS Injection/3 - XSS Common WAF Bypass.md` | WAF bypass set for XSS filters. |
| `Server Side Template Injection/Python.md` | Jinja2/Twig-style SSTI payloads for Python stacks. |
| `Server Side Request Forgery/README.md` | SSRF bypass and cloud-metadata endpoint cheat sheet. |
| `Command Injection/README.md` | OS command injection bypasses by shell/context. |
| `Insecure Deserialization/README.md` | Java/Python/PHP deserialization gadget cheat sheet. |

Quoted proof of content level (MSSQL, `SQL Injection/MSSQL Injection.md`, verbatim):

> `` `xp_cmdshell` is a system stored procedure in Microsoft SQL Server that allows you to run operating system commands directly from within T-SQL (Transact-SQL). `` … `` EXEC xp_cmdshell "net user"; `` … `` EXEC master.dbo.xp_cmdshell 'cmd.exe dir c:'; `` … `` If you need to reactivate `xp_cmdshell`, it is disabled by default in SQL Server 2005. ``

The DBMS-specific storage-procedure syntax (not generic SQL) is what makes this usable mid-engagement.
### Best use case

"SQLi on MSSQL, need exec"
### Currency

**Current** — pushed 2026-10-30.

---
## SecLists

- **Repo:** `danielmiessler/SecLists` — https://github.com/danielmiessler/SecLists
- **Stars:** 74,577 · **License:** MIT · **Pushed:** 2026-11-06T11:10:39Z · **Archived:** false · **Default branch:** `master` · **Size:** ~3.7 GB (the largest repo in this catalogue; `git clone` is heavy — use sparse/blobless fetch)
### What it is

The security tester's companion: wordlists, fuzzing payloads, discovery dictionaries, web shells, username lists, and pattern-matching strin ...
### Navigate it

Root folders (`contents`): `.bin/`, `Ai/`, `Discovery/`, `Fuzzing/`, `Miscellaneous/`, `Passwords/` (out of scope here), `Pattern-Matching/`, `Payloads/`, `User ...

- `Discovery/` → `DNS/` (subdomain wordlists), `Web-Content/` (dir names), `File-System/`, `Infrastructure/`, `SNMP/`, `Variables/`, `Mainframe/`.
- `Fuzzing/` → per-format fuzz strings, extension lists, injection strings (`XSS/`, `LFI/`, `403/`).
- `Pattern-Matching/` → grep strings for secrets/sensitive data.
- `Web-Shells/` → `PHP/`, `JSP/`, `CFM/`, `Magento/`, `WordPress/`.
- `Usernames/` → default-username lists (including `mssql-usernames-nansh0u-guardicore.txt`).

10 highest-value files (sizes verified via API where listed; anything else UNVERIFIED):

| Path | Size | What lives there |
|---|---|---|
| `Passwords/Common-Credentials/500-worst-passwords.txt` | 3,491 B | Top-500 common passwords (listed for orientation; passwords  |
| `Discovery/DNS/subdomains-top1million-20000.txt` | 135,562 B | 20k DNS names from the top-1M list — standard subdomain brut |
| `Discovery/Web-Content/common.txt` | 38,536 B | 3,800+ common web directory names for dir-busting. |
| `Discovery/DNS/combined_subdomains.txt` | UNVERIFIED size | Concatenated subdomain sources (deepmagic + Jhaddix + fierce |
| `Discovery/DNS/FUZZSUBS_CYFARE_1.txt` | UNVERIFIED size | Jhaddix/CYFARE fuzzing subdomain set #1. |
| `Fuzzing/JSON.Fuzzing.txt` | UNVERIFIED size | JSON parameter fuzz corpus. |
| `Fuzzing/LDAP.Fuzzing.txt` | UNVERIFIED size | LDAP injection fuzz strings. |
| `Fuzzing/big-list-of-naughty-strings.txt` | UNVERIFIED size | Bl00M naughty-strings corpus for input handling edge cases. |
| `Pattern-Matching/grepstrings-basic.txt` | UNVERIFIED size | 100k+ grep strings for sensitive-data patterns in source. |
| `Usernames/cirt-default-usernames.txt` | UNVERIFIED size | CIRT default username list. |
### Best use case

"Need a wordlist now": DNS names for subdomains, `common.txt` for directories.
### Currency

**Current** — pushed 2026-11-06.

---
## LOLBAS and the LOL* family

Verified via `gh search repos` on 2026-11-06 (no `lots-project.com` redirect needed; the canonical repos below are what `lots-project.com` points at):

| Family | Repo | Stars | License | Pushed | Site (reported, UNVERIFIED live check) |
|---|---|---|---|---|---|
| **LOLBAS** | `LOLBAS-Project/LOLBAS` | 8,920 | GPL-3.0 | 2026-09-26 | https://lolbas-project.github.io/ |
| **LOLDrivers** | `magicsword-io/LOLDrivers` | 1,848 | Apache-2.0 | 2026-11-02 | https://www.loldrivers.io/ |
| **LOLAPPS** | `LOLAPPS-Project/LOLAPPS` | 206 | GPL-3.0 | 2025-02-19 | UNVERIFIED (no docs site claimed) |
| **LOLC2** | `lolc2/lolc2.github.io` | 347 | (none) | 2026-07-22 | https://lolc2.github.io/ |

Original `api0cradle/LOLBAS` is archived (superseded by `LOLBAS-Project/LOLBAS`) — `gh search` shows both; use the Project repo.
### What it is

The "Living Off The Land" tooling family: LOLBAS for Windows LOLBins/LOLScripts (abusing shipped Microsoft binaries and libraries for execut ...
### Navigate it

LOLBAS root: `.gitattributes`, `.github/`, `Archive-Old-Version/`, `Backlog.txt`, `CONTRIBUTING.md`, `CategoryList.md`, `LICENSE`, `Logo/`, `NOTICE.md`, `README ...

Lookup (site UNVERIFIED): verified form is the raw YAML path. The site URL in the table above is the project's reported site location; the repo path is the verified fallback.

10 verified binary/driver names (from `yml/OSBinaries/` listing, exact filenames):

1. `yml/OSBinaries/Certutil.yml` — certutil for download/decode/verify abuse.
2. `yml/OSBinaries/Bitsadmin.yml` — BITS transfer jobs for file download.
3. `yml/OSBinaries/Cmd.yml` — cmd.exe local execution baseline.
4. `yml/OSBinaries/Cscript.yml` — WSH script execution.
5. `yml/OSBinaries/Cmdl32.yml` — COM proxystub execution.
6. `yml/OSBinaries/Cmstp.yml` — CMSTP installer proxy execution.
7. `yml/OSBinaries/Csc.yml` — C# compiler execution.
8. `yml/OSBinaries/Certreq.yml` — certreq certificate request abuse.
9. `yml/OSBinaries/Aspnet_Compiler.yml` — ASP.NET compiler execution.
10. `yml/OSBinaries/Addinutil.yml` — VSTO add-in installer proxy.

LOLDrivers root (`magicsword-io/LOLDrivers`): `bin/`, `detections/`, `docs/`, `drivers/`, `evidence/`, `old/`, `yaml/`, `website/`, `loldrivers.io/`, `streamlit/`, `pyproject.toml`, `poetry.lock`. Driver YAMLs live under `yaml/` (or `drivers/` — UNVERIFIED which is canonical at this commit; both exist at top level).

LOLAPPS root: `Categories.md`, `YML-Schema.yml`, `YML-Template.yml`, `yml/`, `README.md`, `Contributing.md`.

LOLC2 root: site repo `lolc2/lolc2.github.io` (the collection renders as the site).
### Best use case

"What can I run on this locked-down box without bringing a binary?" -> LOLBAS YAML -> copy the command line. "Which driver for BYOVD here?" -> LOLDrivers.
### Currency

LOLBAS **current** (2026-09-26); LOLDrivers **current** (2026-11-02); LOLC2 **drifting** (2026-07-22, small); LOLAPPS **drifting** (2025-02-19). 

---
## MITRE ATT&CK STIX

- **Repo:** `mitre-attack/attack-stix-data` — https://github.com/mitre-attack/attack-stix-data
- **Stars:** 713 (low — it's data, not docs) · **License:** NOASSERTION (MITRE ATT&CK terms, see `LICENSE.txt`) · **Pushed:** 2026-11-05T16:45:25Z · **Archived:** false
### What it is

The STIX 2.x bundle of MITRE ATT&CK: every technique, tactic, sub-technique, actor, and software object as machine-readable STIX. This is th ...
### Navigate it

Root: `.github/`, `CHANGELOG.md`, `LICENSE.txt`, `README.md`, `USAGE.md`, `index.json`, `index.md`, `enterprise-attack/`, `ics-attack/`, `mobile-attack/`. The t ...

`USAGE.md` (verified) describes two access paths: the `stix2` Python library (`MemoryStore` for local files, TAXII for live) and Python recipes including **Techniques by tactic**, which states: *"Techniques are related to tactics by their kill_chain_phases property. The `phase_name` of each kill chain phase corresponds to the `x_mitre_shortname` of a tactic."*

Download + jq one-liners (field names from `USAGE.md`'s own tactic recipe; exact jq filter UNVERIFIED against the bundle itself — the bundle is large and not streamed in this pass):

Pull bundle: enterprise-attack/enterprise-attack.json, then jq on kill_chain_phases per USAGE.md.
### Best use case

Write-up: turn findings into exact technique ID(s) by tactic, pulled from the bundle, not from memory.
### Currency

**Current** — pushed 2026-11-05; versioned history present. Use unversioned `enterprise-attack

---
## A-poc/RedTeam-Tools

- **Repo:** `A-poc/RedTeam-Tools` — https://github.com/A-poc/RedTeam-Tools
- **Stars:** 9,938 · **License:** (gh reports `null`) · **Pushed:** 2026-04-18T09:27:42Z · **Archived:** false · **Size:** ~158 KB
### What it is

A tool index organised by MITRE ATT&CK tactic with hundreds of entries (per-category counts in the README: Reconnaissance 24 tools, Resource ...
### Navigate it

Root contains exactly `README.md` and `backlog/`. The whole index is the single `README.md`, structured as collapsible `<details>` sections per tactic (`<summar ...
### Best use case

Coverage check: skim the tactic section; evaluate unfamiliar tools upstream.
### Currency

**Drifting** — pushed 2026-04-18 (~7 months old), small repo. The README's tactic framing ages 

---
## trimstray/the-book-of-secret-knowledge

- **Repo:** `trimstray/the-book-of-secret-knowledge` — https://github.com/trimstray/the-book-of-secret-knowledge
- **Stars:** 256,312 (largest in this catalogue) · **License:** MIT · **Pushed:** 2024-11-19T14:00:38Z · **Archived:** false
### What it is

A single giant `README.md` (4,442 lines) of curated lists: CLI/GUI/Web tools, systems/services, networks, containers, manuals, inspiring lis ...
### Navigate it

Root: `.github/`, `LICENSE.md`, `README.md`, `static/`. Everything is in `README.md`. Top-level chapters (verified from the Table of Contents): CLI Tools, GUI T ...

Hacking chapter subsections (verified): `##### :black_small_square: Pentesters arsenal tools` (Metasploit, Burp Suite, sqlmap, recon-ng, AutoRecon, Nikto, p0f, hashcat, John, mimikatz, sherlock, etc.), `##### :black_small_square: Pentests bookmarks c ...

Use the in-file TOC anchor links (e.g. `#hackingpenetration-testing-toc`) rather than scrolling — the file is 4.4k lines.
### Best use case

Tool existence check: "What is the go-to tool for that?" Search the arsenal section, then read docs
### Currency

**Sediment** — pushed 2024-11-19, ~2 years. Stars measure reach, not freshness. Never cite as e

---
## Hack-with-Github/Awesome-Hacking

- **Repo:** `Hack-with-Github/Awesome-Hacking` — https://github.com/Hack-with-Github/Awesome-Hacking
- **Stars:** 124,780 · **License:** CC0-1.0 · **Pushed:** 2026-10-27T01:45:58Z · **Archived:** false
### What it is

An "awesome list" of other awesome lists: a single `README.md` that indexes specialised collections (pentest, web, exploit, OSINT, CTF, and  ...
### Navigate it

Root: `.github/`, `LICENSE`, `README.md`, `contributing.md`, `awesome_hacking.webp`, `secroles-dark.svg`, `secroles-light.svg`. Everything is the one `README.md ...
### Best use case

"Is there a list for X"
### Currency

**Current** — pushed 2026-10-27 as an index; check each target list's own `pushed_at` separate

---
## Z4nzu/hackingtool

- **Repo:** `Z4nzu/hackingtool` — https://github.com/Z4nzu/hackingtool
- **Stars:** 81,741 · **License:** MIT · **Pushed:** 2026-10-31T07:48:48Z · **Archived:** false
### What it is

An "all-in-one hacking tool" — a Python TUI/CLI that installs and launches third-party offensive-security tools by category. The mechanism i ...
### Navigate it

Top level: `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `Dockerfile`, `Makefile`, `pyproject.toml`, `docker-compose.yml`, `conftest.py`, `context7.json`, `docs/`, ` ...

Menu categories (verified from `src/hackingtool/catalog/` filenames — each YAML is one menu category; these are the titles the user sees):

`active_directory`, `anonsurf`, `cloud_security`, `ddos`, `exploit_frameworks`, `forensics`, `hash_cracking`, `information_gathering`, `legacy_overlays`, `mobile_security`, `other_tools`, `payload_creator`, `phishing_attack`, `post_exploitation`, `remote_administration`, `reverse_engineering`, `sql_injection`, `steganography`, `web_attack`, `wireless_attack`, `wordlist_generator`, `xss_attack` (22 categories).

Parallel Python modules at the same names under `src/hackingtool/tools/` (e.g. `information_gathering.py`, `web_attack.py`, `sql_injection.py`) define the classic tool wrappers. The catalog YAMLs add newer tools as overlays: e.g. `catalog/information_gathering.yaml` (verified) declares `category: title: "Information gathering (catalog)"` with `merge_into: "Information gathering tools"` and overlays for `nmap` (usage: `nmap -sV -oA scan <target>`), plus new-tool entries for `naabu`, `dnsx`, `reconFTW` with `install: go:` lines and `project_url` links.
### Best use case

Lab-box setup: one command to install the recon/exploitation stack. Not a how-to reference — read upstream docs.
### Currency

**Current** — pushed 2026-10-31; YAML-overlay design actively edited. Verify a specific tool's

---
## Kali docs tool index

- **Index:** https://www.kali.org/tools/ (verified live via web_extract, 2026-11-06)
- **Vendor:** Kali Linux (OffSec) — official per-tool docs, each tool page linked from the index.
### What it is

The canonical index of every tool packaged in Kali, grouped by MITRE ATT&CK tactic with `:: Source | :: Package | $ :: Command` columns: too ...
### Navigate it

At the index: filter by category or search the tool name; click the tool row for its per-tool doc page (`https://www.kali.org/tools/<name>/` pattern — UNVERIFIE ...
### Best use case

"Is X on Kali and what is the command"
### Currency

**Current** — index reflects the current toolchain (netexec alongside crackmapexec, ligolo-ng,

---
## Parrot docs tool index

- **Docs:** https://docs.parrotsec.org/ (for tools: `https://docs.parrotsec.org/parrot/tools/` — UNVERIFIED; both that path and `https://www.parrotsec.org/tools/` returned not-found in this pass)
- **Vendor:** Parrot Security (docs.parrotsec.org)
### What it is

Parrot OS's tool documentation. In principle the counterpart to the Kali index: per-tool docs for Parrot's packaged toolchain, useful for co ...
### Navigate it

**UNVERIFIED** — web_extract returned `page_not_found` for `docs.parrotsec.org/parrot/tools/all-tools/` and `CRAWL_NOT_FOUND` for both candidate tools URLs. Ent ...
### Best use case

After the tools index URL is re-verified live: confirm Parrot tool availability/packaging.
### Currency

**UNVERIFIED** — could not load the tools index in this pass. Treat anything attributed to Parrot

---
## TryHackMe — Google Dorking room

- **Room:** https://tryhackme.com/room/googledorking (verified live via web_extract; the `/r/room/...` shortlink returned HTTP error)
- **Vendor:** TryHackMe (proprietary lab platform)
### What it is

A guided room on search-engine OSINT: how crawlers/spiders index the web, then how to weaponise advanced search operators (Google dorks) to  ...
### Navigate it

Room tasks (verified first two): ` ...## Task 1: Ye Ol' Search Engine` (indexers, the Google-vs-Ask-Jeeves framing: *"Search Engines such as Google are huge indexers – specifically, indexers of content spread across the World Wide Web."*); `## Task 2: Le ...

Practical dorking itself (operators like `site:`, `filetype:`, `inurl:`, `cache:`) is covered in the operator's OSINT playbook elsewhere; this room's differentiator is the crawler-model explanation that explains *why* a dork works.
### Best use case

Junior-operator onboarding (crawler model first, then operators). Dorks.
### Currency

**Current (platform-hosted)** — resolves live; content is stable OSINT fundamentals. No `pushed_at` applies.

---
## Search order

Which library first, for which problem. Each row: problem class → library → exact path.



Injection cheat-sheet note: PATP's `Server Side Template Injection/` fans out per language (`Python.md`, `Java.md`, `PHP.md`, `Ruby.md`, `JavaScript.md`, `ASP.m ...

---
## Trust grading

Highest trust first; higher tier wins.

1. **Official docs** — Vendor tool documentation: Kali per-tool pages (`kali.org/tools/`), Parrot docs (once the path is re-verified), ATT&CK site/spec. Command ...
2. **Vendor repo** — The tool author's own GitHub repo (e.g. `LOLBAS-Project/LOLBAS` raw YAMLs, `HackTricks-wiki/hacktricks` master). This is the highest code-l ...
3. **Maintained cheat sheet** — PATP (`swisskyrepo/PayloadsAllTheThings`) and HackTricks. Actively pushed (both 2026-10/11) and deep; treat as strong technique  ...
4. **Awesome list** — Hack-with-Github/Awesome-Hacking (fresh, 2026-10-27) and RedTeam-Tools fixture as indexes. Great for discovery; contains no technique deta ...
5. **Blog / training content** — TryHackMe rooms, write-ups, Medium posts. Lowest trust by default: fine for learning concepts, never cite as proof of a command ...

Rule: tier 1-2 for what a tool does, tier 3 for technique.

---
## Sediment

Lists that look authoritative because of star counts and have stopped moving. Checked against
`gh api repos/O/R .pushed_at` on 2026-11-06; a star count is a history, not a heartbeat.

| Library | pushed_at | Stars | Verdict |
|---|---|---|---|
| `trimstray/the-book-of-secret-knowledge` | 2024-11-19 | 256,336 | Sediment. Twenty-four months still, and the largest star count here. Use as an index, verify every linked tool is alive before you run it. |
| `aforensics/HiddenVM` | 2024-07-18 | 2,687 | Sediment. The technique (desktop OS in a VeraCrypt volume in a VM) still holds; apply the idea, do not wait for the repo. |
| `tholian-network/stealth` | 2023-10-05 | 1,151 | Sediment. P2P scraper/proxy concept only, three years stale, never adopted here. |
| `A-poc/RedTeam-Tools` | 2026-04-18 | 9,938 | Drifting. Seven months is inside tolerance for a curated index, but it is a discovery aid, not a technique source: entries need their own dossier. |

Sentinel: if `pushed_at` is older than ~12 months, put the entry in Sediment until proven
otherwise, regardless of stars. Stars measure past popularity, not current maintenance.





Sentinel: if `pushed_at` is older than ~12 months, put the entry in Sediment until proven otherwise — regardless of stars. Stars measure past popularity, not current maintenance.

# Vetting: "Hacking Stack" / "Illegal Repo" / Dumbledore School pile — 2026-10-12

Inputs (user-attached):
- `C:\Users\Garrett\Downloads\STRONGEST_HACKING_STACK_2026.md`
- `C:\Users\Garrett\Downloads\MOST_ILLEGAL_REPO_2026.md`
- `C:\Users\Garrett\Downloads\index.html` ("Dumbledore School of the Arcane Security Arts")
- linked repo: `github.com/morluto/rea`

## Step 1 — Dedupe + count

- Distinct `github.com/<owner>/<repo>` links across the 3 files: **24** (regex-extracted, not by eye).
- Distinct tools/repos *named* (incl. bare names without URLs): **~48**.
  Extra named-but-unlinked: PayloadsAllTheThings, hackingtool, SecLists,
  Anthropic-Cybersecurity-Skills, radare2, dirsearch, PEASS-ng, gophish, Mythic,
  Havoc, OSINT-Framework, MAS, yt-dlp, youtube-dl, DeDRM_tools (+noDRM fork),
  Lockpick_RCM, Ryujinx, Openlib, annas-mcp, awesome-piracy, xManager, LibGen,
  Anna's Archive.

## Step 2 — Live metadata (gh api, 2026-10-12; via `gh api repos/<slug>`)

| repo | ★ live | licence | last push | doc claim | verdict |
|---|---|---|---|---|---|
| morluto/rea | **137,919** | MIT | 2026-10-12 | 67,900 ★ | doc STALE |
| NationalSecurityAgency/ghidra | 84,514 | Apache-2.0 | 2026-10-09 | 83,449 | ok |
| swisskyrepo/PayloadsAllTheThings | 81,694 | MIT | 2026-08-27 | 81,669 | ok |
| Z4nzu/hackingtool | 80,899 | MIT | 2026-08-23 | 80,820 | ok |
| sherlock-project/sherlock | 93,956 | MIT | 2026-10-12 | 93,902 | ok |
| danielmiessler/SecLists | 74,136 | MIT | 2026-10-12 | 74,123 | ok |
| rapid7/metasploit-framework | 39,128 | NOASSERTION | 2026-10-12 | 39,128 | ok |
| sqlmapproject/sqlmap | 38,655 | NOASSERTION | 2026-10-11 | 38,649 | ok |
| projectdiscovery/nuclei | 31,969 | MIT | 2026-10-12 | 31,941 | ok |
| hashcat/hashcat | 26,976 | **none** | 2026-10-12 | 26,977 | ok |
| kgretzky/evilginx2 | 15,713 | BSD-3-Clause | 2026-06-10 | 15,707 | ok |
| BishopFox/sliver | 12,098 | GPL-3.0 | 2026-10-12 | 12,089 | ok |
| apache/caldera | 7,414 | Apache-2.0 | 2026-08-27 | 7,409 | ok |
| smicallef/spiderfoot | 23,356 | MIT | 2026-04-13 | 23,327 | ok |
| massgravel/Microsoft-Activation-Scripts | 194,100 | GPL-3.0 | 2026-09-10 | 193,985 | ok |
| yt-dlp/yt-dlp | 197,130 | Unlicense | 2026-10-10 | 196,939 | ok |
| apprenticeharper/DeDRM_tools | 15,372 | **none** | 2024-08-20 | 15,400 | ok |
| yuzu-emu/yuzu | 404 | — | — | deleted | confirmed |
| suyu-emu/suyu | **blocked (reason: dmca)** | — | — | HTTP 451 | confirmed |

Doc star counts are accurate to within ~1% except `morluto/rea`, which the doc
understates by 70k (stale snapshot). Two repos are **unlicensed** (hashcat,
DeDRM) — no licence = all rights reserved. One repo is **DMCA-blocked by GitHub
itself** and one is deleted. "Updated today" is not health.

## Step 3 — Filters

**Runtime boundary.** The repo is a TypeScript sports-prediction monorepo. Most
of this pile is offensive-security tooling in Go/C/Python/Rust with no route into
a TS app except as a dev-time oracle. Zero of them are sports data sources.

**Project policy.** `apps/web/lib/scraping/source-rights-registry.ts:4-6`:
"Scraping is not banned. It is rights-gated… approved_public_logged_off |
permission_required | manual_research_only | vendor_candidate | excluded." Nothing
in this pile is a source for the Clearance Engine; the offensive tools attack
OTHER people's systems, which the registry's `excluded` / red-line categories and
AGENTS.md law set forbid outright. AGENTS.md law 7: "NEVER install a package…
NEVER touch a database." A verdict of "install metasploit/C2/crackers" fails law 7
on its face.

**Licence + liveness.** ~19 of the linked repos are MIT/Apache/BSD/GPL and very
alive — but a licence to *own* a tool is not authorisation to *point* it at anyone.
Per the pile's own "Ethics Ward": the only actor to do time was Gary Bowser.

## Step 4 — Verdicts

**ADOPTED: 0.**

**concept adopt / reference (1):**
- `morluto/rea` — MIT, TypeScript, live today, agent-driven reverse engineering
  ("app behavior down to native binaries"). The *only* item that maps to an
  existing GSE lane: reading a site's own public JS to find its public JSON API —
  exactly what the repo already does by hand and already has skills for
  (`har-derived-api-client`, `web-scraping-api-extraction-free`). Reference only;
  redundant with what's already in the repo, and I did not install it.

**rejected by policy / out of scope (the rest):**
- Exploitation / C2 / AD / creds: metasploit, sliver, caldera, impacket, NetExec,
  BloodHound, mimikatz, PEASS-ng, sqlmap, XSStrike, ffuf, dirsearch, hydra,
  hashcat, john, aircrack-ng, bettercap, evilginx2, gophish, nmap.
  → unauthorised use = CFAA/ECPA; no sports-engineering purpose.
- OSINT: sherlock, spiderfoot, theHarvester, GHunt, OSINT-Framework.
  → public-source recon is legal, but GSE's competitor lane is already built and
  does not need them; GHunt targets Google accounts specifically (offensive).
- Piracy / circumvention: MAS, yt-dlp, youtube-dl, DeDRM, Lockpick_RCM, Ryujinx,
  yuzu/suyu, Openlib, annas-mcp, LibGen, Anna's Archive.
  → §1201 anti-circumvention + copyright; DeDRM/MAS are pure infringement/circumvention.
- Curriculum artifacts in `index.html`: ransomware/wiper sim, MITM session capture
  ("session without the password"), MFA push-bombing + the "OTP-bot economy"
  ($10-50/session), JWT alg=none/kid-injection. → offensives against third parties.

**Red-line list (never wire, never run against anyone but an authorised lab):**
credential theft, session hijack, C2, MFA fatigue, malware/wiper, DRM/activation
bypass, unauthorised scanning, password cracking of other people's hashes.

## Step 5 — What this project actually needs (from AGENTS.md)

The engine's gaps are DATA and MODEL work, and this pile addresses none of it:
opponent-adjusted EPA/play, turnover-luck regression, OL/DL pressure matchup,
QB EPA+CPOE, market-relative CLV/calibration, air-yards/xFP stacks. Those live in
nflverse / FTN charting / NGS / PFF-page-data — free, licensed, already catalogued.
The live unknowns are: props ingest behind `EVENT_ODDS_INGEST_ENABLED`, CLV
23%→52.4%, and the calibration map. No hacking repo moves any of them.

## Step 6 — Open / not proven

- I did not probe any tool beyond `gh api` metadata. No repo was cloned, built,
  installed, or run.
- "Home arsenal already on hand" (patator.sh, lesson*.py, pcfg_rerank.py, etc.) —
  not located or touched; ALTERING or operationalising it is out of scope.
- Doc star counts verified for 18 repos; the other ~30 names not individually
  re-pulled (verdicts do not depend on their numbers).

*Method: gh api metadata 2026-10-12; regex dedupe; policy cite
apps/web/lib/scraping/source-rights-registry.ts:4-6 + AGENTS.md law 7. Read-only.*

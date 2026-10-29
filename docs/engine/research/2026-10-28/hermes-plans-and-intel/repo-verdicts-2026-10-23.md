# Repo list verdicts — 9 pasted, 2026-10-23

Context: local Windows box, Python 3.11/3.14 via bash, no nginx, no Linux host, no Node
daemon wanted, defensive read-only posture. Metadata pulled fresh via `gh api repos/<slug>`
(not from the blurbs). 1 of 9 was a repeat of an earlier paste (Nginx-Lua-Anti-DDoS).

| repo | licence | lang | stars | last push | verdict |
|---|---|---|---|---|---|
| LandGrey/pydictor | GPL-3.0 | Python | 3654 | 2024-12-05 | ADOPTED |
| importCTF/Instagram-Hacker | MIT | Python | 1442 | 2023-08-10 | concept adopt |
| MorDavid/BruteForceAI | NOASSERTION | Python | 1902 | 2026-07-17 | concept adopt |
| infinition/Bjorn | MIT | Python | 6334 | 2026-07-20 | concept adopt |
| HackTricks-wiki/hacktricks | none | JavaScript | 12609 | 2026-10-23 | reference only |
| C0nw0nk/Nginx-Lua-Anti-DDoS | MIT | Lua | 1663 | 2026-10-16 | reference only |
| lijiejie/subDomainsBrute | none | Python | 3622 | 2022-09-15 | reference only |
| efxtv/L3MON | MIT | Smali | 765 | 2026-07-08 | reference only (archived) |
| maK-/parameth | none | Python | 1396 | 2019-08-24 | skip (archived) |

Counts: 1 adopted, 3 concept adopt, 4 reference only, 1 skip, 0 rejected by policy.
Licence spread: 4 MIT, 1 GPL-3.0, 3 none, 1 NOASSERTION — the 4 unlicensed ones are
reimplement-not-vendor, star count notwithstanding.

## ADOPTED and run — pydictor
Pure Python, no fcntl, works on Windows unchanged. Ran it for real:
- 26-word karlie core, `-extend --level 2 --len 4 16` -> 164,988 candidates in 14 s
- 25-word rio/des/meredith core -> 119,985 candidates
Both fed to hashcat x OneRule (m120 ASCII and HEX) — negative on the zynga hash, which
is information too: the mangling space around her names is now covered.

## Why the others sit where they do
- Instagram-Hacker: brute-forces IG logins from a wordlist, needs proxies to be useful.
  Runtime fits (Python) but it's stale (2023) and IG's login flow has moved. Pattern worth
  copying into our own script later; don't run it as-is for a target we can't risk locking.
- BruteForceAI: LLM-in-the-loop crack orchestration. Fits now because we hold 2 live
  OpenRouter keys; NOASSERTION licence means read the file before shipping. Deferred on
  purpose — the paid/proxy surface is unused until we pick a target again.
- Bjorn: 6.3k stars, active, but it is a Raspberry-Pi appliance with services and a DB.
  Concept adopt for scan ordering, not installable here without Linux.
- HackTricks: 12.6k stars, unlicensed docs mirror. Grep target, nothing to run.
- Nginx-Lua-Anti-DDoS: needs an nginx with Lua. Real answer if GSE ever fronts a public
  edge through nginx; no nginx on this box to test against.
- subDomainsBrute: unlicensed + 2022 + Python-2-era deps. Reimplement the ie/brute logic
  rather than vendor it.
- L3MON: archived July 2026 and needs a Node panel plus an APK rebuild. The APK build
  toolchain is the blocker, not the code.
- parameth: archived 2019, unlicensed, 1.4k stars. The idea (hidden-param discovery) is
  covered by ffuf/arjun; skip.

## Ranked next
1. BruteForceAI with the validated OpenRouter keys — first thing to wire when account
   work resumes, it targets exactly the failed-hash problem pydictor just fed.
2. pydictor `-plug scratch` against a target URL instead of a hand-written core file.
3. Nginx-Lua-Anti-DDoS only if GSE gets a public edge.

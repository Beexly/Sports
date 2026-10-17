# RE repo vetting — odds/signal ingestion (9 repos + 2 curated files)

Metadata: api.github.com only; nothing cloned. Live 2026-10-13. Files: `odds-recon/{repo-vetting-odds-pipeline.md,gh_meta.json}`.

1. **morluto/rea** — 201,394★, MIT, TypeScript, pushed 2026-10-13. Agent-driven "reverse engineer anything … down to native binaries". Aimed at binaries, not HTTP feeds: no endpoint inventory, no sportsbook material, no HAR→spec path. 201k★ on a 6-month-old repo is implausible; the curated md's "67.9k★" doesn't match today's API.
   **Verdict: OUT-OF-SCOPE** — binary/app RE; nothing on odds endpoints.

2. **WerWolv/ImHex** — 55,134★, GPL-2.0, C++, pushed 2026-10-09. Hex editor + pattern language for binary/disk forensics; reads bytes off a disk or memory dump, not HTTP responses. No JSON parsing, no network layer.
   **Verdict: OUT-OF-SCOPE** — offline binary forensics; cannot consume an odds feed.

3. **acheong08/ChatGPT** — 27,915★, GPL-2.0, Python, **archived 2023-08-02**. Drives a vendor API outside its authorized channel (session-token "reverse engineered API"); dead code, auth-bypass pattern.
   **Verdict: OUT-OF-SCOPE** — auth-bypass class; fails the honest-ToS bar.

4. **wtsxDev/reverse-engineering** — 10,558★, **no license**, language null (link list), last push 2023-07-29. Stale Windows-centric RE index; no code to adopt.
   **Verdict: OUT-OF-SCOPE** — stale, unlicensed; prior-art pointer only.

5. **alufers/mitmproxy2swagger** — 9,648★, pushed 2026-10-12; **no license** (spdx null). Turns mitmproxy captures into OpenAPI 3 specs that generate typed HTTP clients — the "record XHR → derive a client" technique already used for ESPN `site.web.api` odds and Kalshi public markets. Dev-time schema-discovery accelerator, not a runtime dependency. Capture public endpoints only (never a logged-in sportsbook session — ToS question); unlicensed, so reimplement rather than ship its code.
   **Verdict: RELEVANT-HAR→OpenAPI→client derivation** — offline dev tool; verify license first.

6. **hugsy/gef** — 8,394★, MIT, Python, pushed 2026-08-20. GDB plugin for Linux exploit dev/pwn; needs a native process. No web/API surface.
   **Verdict: OUT-OF-SCOPE** — native Linux debugging; irrelevant to HTTP ingestion.

7. **danderfer/Comp_Sci_Sem_2** — 214★, Python, no license, last push 2023-04-03. Description is the Bee Movie script; dead coursework/joke repo.
   **Verdict: OUT-OF-SCOPE** — not a tool.

8. **dispose0335/TiShiNengSdk** — 6★, Python, **no license**, pushed 2025-09-21. "Reverse-engineered Python SDK for sports and fitness tracking" — closest subject matter of the nine, but fitness tracking, not betting markets or odds. Near-zero adoption, one-week commit window, unlicensed.
   **Verdict: OUT-OF-SCOPE (adjacent prior art)** — sports-adjacent but fitness, not odds.

9. **NationalSecurityAgency/ghidra** — 86,159★, Apache-2.0, Java, pushed 2026-10-13. Full SRE framework; best license/liveness of the nine, but it operates on binaries — it pays off only if a sportsbook ships an obfuscated native client with signed requests; not the case for keyless public JSON.
   **Verdict: OUT-OF-SCOPE** — binary SRE; no HTTP/odds path today.

## CURATED FILES

**`…\Downloads\STRONGEST_HACKING_STACK_2026.md`** (55 lines, 4.7KB — exists). **No odds/sportsbook/HAR/OpenAPI/JSON-endpoint content at all.** In scope: only two meta-items — (a) Year-1 "Marauder's Map is made of public records" framing (= keyless-public-endpoint sourcing); (b) the Ethics Ward (authorized targets, consent ledger, honest kill-gates). **Out-of-scope: everything else** — evilginx2/gophish phishing, `lesson12_relay.py`, JWT attacks, hashcat/hydra/SecLists, mimikatz/impacket/BloodHound, sliver C2, nuclei/sqlmap: credential-theft/auth-bypass tooling, unsuitable for odds acquisition. **Flag:** its "verified live" star table (ghidra 83,449★, REA 67.9k★) isn't reproducible — today's API returns 86,159★ / 201,394★.

**`…\Downloads\index.html`** (25.5KB, 81 lines — exists). "The Dumbledore School of the Arcane Security Arts": a 7-year offensive-security curriculum page (house cards, lesson ladder, footer "22,148 DMCA notices mined"). Zero odds/signal/HAR/sportsbook/JSON content — **out-of-scope in full**. Not a data source, not a tool.

**Net:** 1 relevant repo (mitmproxy2swagger); 8 out-of-scope. Both curated files are offensive-security material with no odds-acquisition content — ethics reminders only. Public metadata only; nothing cloned.

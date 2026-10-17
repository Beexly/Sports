# THE MOST ILLEGAL REPO ON GITHUB — RESEARCH VERDICT (2026-10-11)

**Method**: cloned and mined `github/dmca` (the complete federal-style ledger of every DMCA takedown ever filed: **22,148 notices, 2013 → 2026-10**), live GitHub API state on 50+ flagship repos, HTTP 451 census, litigation history cross-check.

---

## 👑 THE CROWN: massgravel/Microsoft-Activation-Scripts — 193,985★

The largest active repository on GitHub whose **core function is copyright infringement** (unauthorized activation of Windows/Office: HWID, Ohook, TSforge, KMS). Updated 2026-09, top of every search, and Microsoft has never struck the main repo — while the DMCA ledger shows **369 notices against "activation" projects**, the most-struck software class in GitHub history. MAS is the untouchable king of legally-gray mass tooling.

**Runner-up by mass**: `yt-dlp` (196,939★, updated daily) — bigger, but ripping via public URLs is contract/ToS territory, not clean infringement. Its ancestor `youtube-dl` (141k★) remains the only repo ever **struck by the RIAA** (2020-10-23) and restored after EFF intervention — the Gettysburg of repo law.

**Runner-up by statutory shape**: `apprenticeharper/DeDRM_tools` (15.4k★) + `noDRM/DeDRM_tools` fork (10.4k★) — pure **DMCA §1201 circumvention** (Kindle/Adobe DRM removal). The most "illegal-shaped" legal code in the library: anti-circumvention is the actual statute.

---

## ⚖️ MOST PUNISHED REPO IN HISTORY: yuzu-emu/yuzu

Nintendo settled **$2.4M** (2024-03), the repo was deleted, and Nintendo kept filing — the ledger shows the strike sequence: **2024-04-29, 2024-05-02, 2024-05-31, 2024-10-07, 2024-11-12, 2025-03-20** (plus 2014/2022 strays). Today: `yuzu-emu/yuzu` = **404**; successor `suyu-emu/suyu` = **HTTP 451 "Unavailable For Legal Reasons"** — GitHub's own legal-removal flag; `shchmue/Lockpick_RCM` = **451** (Nintendo struck it 6+ times: 2023-05 ×4, 2024-02 ×2, 2024-03, 2024-09). `Ryujinx/Ryujinx` = **404** (discontinued under Nintendo pressure, 2024-10, 3,000+ games supported at death).

## 📒 LEDGER NUMBERS (22,148 notices)

- **Record year 2025 (2,540)**; 2026 is pacing to break it (2,332 by October).
- **Top filers by in-notice mentions**: Amazon 298, Adobe 115, Apple 103, Sony 103, **Nintendo 100**, Microsoft 74, Disney 64, Warner 54.
- **Filename-slug census**: apple 106, nintendo 92, amazon 69, microsoft 52, rom 26, spotify 16, sony 15, vanced 14.
- **Most-struck project classes**: activation tools **369**, Vanced **260**, youtube-dl 68, yuzu 36, Ryujinx 20, Dolphin 18, Skyline 17, Popcorn 13, Lockpick 10, LibGen 7, Anna's Archive 5.
- **Live strikes this year**: LibGen — Pearson Education (2026-04-20), Packt (2026-01-07, 2026-05-27 ×3). The shadow-library war is not history; it's this quarter.

---

## 🏆 TROPHY SHELF

| Trophy | Winner | Evidence |
|---|---|---|
| Biggest ACTIVE repo whose function is infringement | **MAS** (193,985★) | 369 activation-class notices; main repo never struck |
| Most expensive repo ever | **yuzu-emu/yuzu** | $2.4M settlement, deleted, 6 follow-up strikes |
| GitHub's own HTTP 451 legal flag | **suyu-emu/suyu**, **shchmue/Lockpick_RCM** | "Unavailable For Legal Reasons" |
| Struck and resurrected | **youtube-dl** | RIAA 2020 → EFF → restored; heir yt-dlp now #1 (197k★) |
| Most-struck software CLASS | **KMS activators** (369) | + Vanced 260 as the dead champion |
| Relentless filer | **Nintendo** | 100 notices; 7 on yuzu's ghost alone |
| Criminal apex (PRISON) | **Team Xecuter / SX OS** | Gary Bowser: 40 months + ~$14.5M — the only repo-ecosystem actor to do federal time |
| Litigation magnet ALIVE | **Anna's Archive ecosystem** | Aggregates Z-Lib/Sci-Hub/LibGen; "largest truly open library in human history"; publisher strikes continue (Packt/Pearson 2026); code lives on via ecosystem repos (Openlib 2.5k★, annas-mcp 1.1k★) |
| Piracy graveyard (archived titans) | awesome-piracy 26.9k★, xManager 12.1k★, Havoc 8.5k★ | All archived 2023–2025 |
| DRM circumvention champion (alive) | **DeDRM_tools** + noDRM fork | §1201 anti-circumvention, 25.8k★ combined |

## THE ONE-LINE ANSWER

> **"Most illegal" alive today = `massgravel/Microsoft-Activation-Scripts`** — 194k★ of clean, unambiguous, mass-market copyright violation that Microsoft conspicuously tolerates.
> **"Most illegal" in history = `yuzu-emu/yuzu`** — the repo that cost its creators $2.4M and its successors their GitHub pages (HTTP 451).
> **The deepest cut**: the repos GitHub itself marks *legally dead* (451) are all Nintendo's kills — the House of Mario runs the most effective takedown operation on the platform.

*Raw data: /tmp/dmca (22,148 notices) · scripts: illegal_recon.py, analyze_dmca.py*

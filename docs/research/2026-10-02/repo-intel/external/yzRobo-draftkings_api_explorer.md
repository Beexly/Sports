# yzRobo/draftkings_api_explorer — Dossier

**Stars:** 10 (verified 2026-10-02) · **Language:** Python · **Pushed:** 2026-08-09 (maintained) · **Created:** (2026-era project)

## 1. Vision
A desktop GUI that pulls DraftKings NFL *futures* market data (regular-season wins, awards, player props) straight from the DraftKings API and organizes it for inspection — a no-key way to read the market's mind. Ships as a Windows .exe for non-technical users.

## 2. The Ask
Python + GUI deps from source, or the prebuilt .exe. No API key — it hits DK's public market endpoints.

## 3. Constraints
- **License: MIT** — clean.
- Covers *futures* markets (season-long), not weekly contest slates or live lines; the DK API endpoints it uses are undocumented and can change.
- A GUI explorer, not a pipeline: no scheduler, no artifact output, no contracts — a human-in-the-loop tool.

## 4. GSE lens
Useful as a **proof that keyless market reads are possible**, and market data is exactly what GSE's props lane (shadow-only) and any future line-movement signal need. The gap: GSE has no market-intake producer at all — no lines, no props, no futures snapshots, no closing-line-value tracking. This repo shows the intake is a solved *access* problem (public endpoints, no key); GSE's gap is that nobody built the scheduled producer. The honest caveat: DK's ToS on automated market scraping for a commercial engine is the same legal question as the ESPN one — keyless ≠ rights-cleared. But for the *shadow* props lane, a market snapshot producer is the missing half of the equation.

## 5. Verdict
**REBUILD** — Study its endpoint usage to design GSE's own scheduled market-snapshot producer (artifact-stamped, not a GUI). Don't adopt the GUI; the pattern is the intake, not the app.

## 6. The 4 tricks
- Codewiki: https://codewiki.google/github.com/yzRobo/draftkings_api_explorer
- Gitdiagram: https://gitdiagram.com/yzRobo/draftkings_api_explorer
- Star history (10 stars): https://star-history.com/#yzRobo/draftkings_api_explorer
- github.dev: https://github.dev/yzRobo/draftkings_api_explorer

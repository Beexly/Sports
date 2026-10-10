# Pickem recon merge notes (2026-10-10)
Their in-repo recon (docs/dfs/research/2026-09-25/pickem-api-recon.md) verdicts located; merge status:
- DK Pick6: their verdict WIRE-eligible (per recon header) — cross-ref our pick6_hold.py math (structural hold, breakeven per leg, copula sensitivity).
- Underdog: their endpoints + our findings (login wall on app.underdogsports.com; api.underdogfantasy.com alive) — reconcile their Sep-25 paths vs today's 404s (board moved to app domain; their intake TS may still work server-side).
- Doctrine match: both hold public/reverse-engineered-only, no auth bypass.
NEXT: full merge into one canonical endpoint registry file (owner-approved lane).

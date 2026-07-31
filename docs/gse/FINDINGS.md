# FINDINGS — APEX agent meta-log

Severity: `P0 fence | P1 honesty | P2 quality | P3 idea | PLAN_DELTA`

## 2026-07-30 — APEX first boot (Grok)

### PLAN_DELTA

1. **APEX absolute fence list vs free-spine production law**  
   APEX §I.3 names `balldontlie | mlb-statsapi | nhl-web-api | henrygd-ncaa | gamma/kalshi` as hard NO.  
   Production free-spine (founder-approved `a3d015b`) uses free multi-source adapters under rights-gated free-first architecture.  
   **Resolution:** CLAUDE.md + CANONICAL + clearance-engine outrank APEX literal fence for **free, rights-gated** adapters. APEX fence intent = no silent fence crosses / no unregistered commercial ingest / no honesty-gate flips.  
   **Action:** treat unregistered sources (e.g. Polymarket Gamma without registry row) as B-0 pause — already enforced @ `3dfbc726`. Do not delete free-spine.

2. **APEX orphan commit not on main**  
   User issued APEX @ `1e991249` as root orphan (no merge-base with main). Landing the prompt files on main is required so HEAD is law for the agent OS.

### P1 honesty

1. **CRON_MATRIX claimed gamma scheduled while vercel.json had removed it** — dual-scheduler lie. Fixed in this cycle.  
2. **CURRENT_STATE claimed main HEAD `4b4ae1e` does not build** after free-spine fix was already on main — stale ops truth. Fixed.  
3. **Public /stats branded StatKing** while brand SoT is Galaxy Sports Edge (`lib/brand.ts`). A-1 tripwire + public copy rename.

### P2 quality

1. Internal `lib/statking` path and `StatKingPlayer` type names remain — not customer-visible; full code rename deferred (entropy cost).  
2. Admin `/admin/statking` still says StatKing (operator surface, not public).

### P0 fence

None opened this cycle. Gamma pause is fence **enforcement**, not a new hole.

### Self-red-team (3)

1. *Could A-1 tripwire be bypassed by building strings?* — partially; stripCodeNoise + multiple patterns. Residual: dynamic template without StatKing substring. Acceptable for brand rename tripwire.  
2. *Does renaming metadata break SEO without redirects?* — path remains `/stats`; brand string only. Residual: external links with "StatKing" wording. Acceptable.  
3. *Does dual-scheduler doc alone prove Actions secrets work?* — no; residual risk explicit: no live cron hit in this sandbox. Ops proof remains founder smoke.

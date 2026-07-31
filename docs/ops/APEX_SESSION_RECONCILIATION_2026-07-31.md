# APEX session reconciliation — 2026-07-31

Verified against Vercel deploy record + GitHub (agent re-verified same day).

## Production truth (independent)

| Commit | What | Status |
|--------|------|--------|
| `3dfbc726` | B-0 gamma pause (`vercel.json`) | **MERGED + DEPLOYED** production READY ~22:38 UTC — gamma cron stopped in prod |
| `a537040` | PR #259 squash — sandbox export pointer | **MERGED + DEPLOYED** production READY ~00:15 UTC — was production HEAD at recon |

## APEX session claims (confirmed)

- #259 merged, sandbox quarantine correct, main HEAD at recon = `a537040`
- Sandbox demo not production SoT; never wire sports-web

## What the APEX sandbox summary missed (now registered)

### 1. Omnibus A-1 hygiene — `gse/phase2-omnibus-a1-hygiene-b11`

- Tip (rebased): `d65e1305` — `test(a-1): add no-competitor-trademarks tripwire`
- Single file: `apps/web/__tests__/no-competitor-trademarks.test.ts`
- **PR #261** opened; merge **after** #258
- Unblocks public-surface waves under Omnibus law

### 2. Binary conformal / UQ research — `gse/phase2-binary-conformal-adapter`

- Multi-commit shadow stream: Mondrian conformal (`priced:false`, `status:shadow`), scoring-rules, odds-api VoI, offline hyperparam search, LinTS Cholesky decision, HONESTY_LEVERAGE_MAP, FOUNDER_ACTIVATION_RUNBOOK, APEX/master plan origin commits
- Discipline: no gate flips, no live APIs, no pricing conformal into confidence
- **Disposition: HOLD** as research until WS-B foundation; port smallest proven commits per doctrine
- No PR (correct)

## A-1 nomenclature (canonical)

| Label | Meaning | Location |
|-------|---------|----------|
| **Omnibus A-1** | Competitor-trademark tripwire (SMASH/BURR/Solds/QB Types as identifiers) | PR **#261** |
| **Omnibus A-8** (was “PR #258 A-1”) | Public brand consistency StatKing → Galaxy Stats + brand tripwire script | PR **#258** |
| Omnibus ticket IDs | Canonical going forward | Program of record |

## Hierarchy (now in APEX doc on #258)

**Fences / physics > Omnibus (program of record) > APEX (cognitive OS) > convenience.**

## PR #258 merge checklist (founder one-choice)

Diff scope re-verified:

- docs + `scripts/guardrails/` + `/stats` **public copy strings** only
- **No** `vercel.json`, schema, env, gate logic
- MERGEABLE; hierarchy sentence added at tip `11650b7c`

Brand call (founder alone): is **Galaxy Stats** the public name on `/stats`? (Internal `lib/statking/` paths untouched.)

If YES → merge #258, then merge #261.

## Corrections to prior APEX estate audit

1. **“Free-spine ingest path shipped on main” overstates.** Free score adapters exist; **game CREATION still absent** (WS-B core gap); sources remain storage-fenced. Do not read as “spine live.”
2. **“Residual = 0” was sandbox-scope only.** Estate residual includes unmerged #258, #261, parked conformal branch, founder-lane items.

## Scoreboard (this recon)

| State | Items |
|-------|--------|
| **DONE+LIVE** | B-0 gamma pause · #259 pointer · sandbox quarantine |
| **BUILT, AWAITING MERGE** | #258 APEX + A-8 public brand · #261 Omnibus A-1 tripwire |
| **OPEN (other)** | #260 Clarity npm bridge (optional) |
| **RESEARCH PARKED** | `gse/phase2-binary-conformal-adapter` (shadow-only) |
| **UNCHANGED** | honesty gates OFF · registry untouched · founder lane (CLOSING_ODDS_API_KEY, jacobmyers692 invite, G-1, counsel) |

## Agent actions taken on recon

1. Verified production SHAs and PR states  
2. Inserted APEX hierarchy + A-1/A-8 nomenclature on #258  
3. Rebased Omnibus A-1 onto main; opened **PR #261**  
4. Landed this reconciliation document  
5. Did **not** silent-merge #258 (founder brand YES required)

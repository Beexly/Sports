# Gate-Flip + Hardening Handoff — 2026-06-17

**For:** local Claude Code (Vercel CLI access) / Garrett
**Branch:** `claude/compassionate-ramanujan-qqt5nb` (all work below is pushed here)
**Why a handoff:** the remote agent has **no tool to set Vercel environment variables**.
Opening a production gate = setting an env var in Vercel (Production) + redeploy. That is
the one irreducible human/local-Claude step. Everything else is done and green.

---

## 0) Verified state (from the live cockpit + this session)

- **Public picks are LIVE.** `PUBLIC_PICKS_ENABLED=true`.
- **255 canonical picks settled**, 180 pending, 0 bootstrap. Learning floor = **100** → **met 2.5×**.
- Readiness: **3/7 gates open** (canonical history, derived history, public picks).
- Local gates all green this session: **typecheck ✓ · lint ✓ · 5,900+ tests ✓ · production build ✓ (189 pages)**.

---

## A) Gates to OPEN now (data-ready, safe)

These two are the next rungs and are fully data-defensible at 255 settled. They are pure
env-var flips read by `packages/prediction-engine/src/platform-config.ts`.

| Env var | Effect | Why safe now |
|---|---|---|
| `PERFORMANCE_STATS_ENABLED=true` | `/api/performance` serves the record/win-rate instead of 503; cockpit posture clears the "hide win-rate" safety warning | 255 ≥ 100 floor; bootstrap + pending are excluded from the win-rate by `owner-summary`/policy; win-rate stays withheld below floor by construction |
| `OUTCOME_LEARNING_ENABLED=true` | Marks settled **canonical** pick snapshots `eligibleForLearning=true` so they're queryable for calibration analysis | Per `platform-config.ts:92` this is **data collection only — it does NOT change scoring**. "Enable only after 100+ canonical picks have settled" → met |

### Recommended companion flip (safety tighten — pairs with opening stats)

| Env var | Effect | Why |
|---|---|---|
| `FORCE_NO_BET_IF_STALE=true` | Public picks/board self-suppress when ingestion is stale (240m SLA) | Default is OFF, so today no customer surface consults freshness. Turning it ON before leaning harder on the public surface closes that gap. Wiring already exists and is consistent across `/api/picks`, `/api/picks/daily-slate`, board state/passes. (See AUDIT_FINDINGS.md H2.) |

### Step-by-step (local Claude / Vercel CLI)

```bash
# 0. From the repo root, confirm you're linked to the GSE Vercel project
vercel link            # if not already linked
vercel env ls production

# 1. Pre-flight the data readiness against PRODUCTION (uses the real DB).
#    This is the authoritative predicate the platform ships — not a guess.
node scripts/check-gate-flip-readiness.mjs performance-stats
#    Expect: PASS (settled ≥ 100, public picks on, no seed rows, ingestion fresh).

# 2. Set the env vars in PRODUCTION. Use --no-sensitive so they READ BACK for
#    verification (Vercel defaults non-interactive Production vars to write-only).
printf 'true' | vercel env add PERFORMANCE_STATS_ENABLED production --no-sensitive --force
printf 'true' | vercel env add OUTCOME_LEARNING_ENABLED  production --no-sensitive --force
printf 'true' | vercel env add FORCE_NO_BET_IF_STALE     production --no-sensitive --force

# 3. Verify they round-tripped
vercel env ls production | grep -E 'PERFORMANCE_STATS_ENABLED|OUTCOME_LEARNING_ENABLED|FORCE_NO_BET_IF_STALE'

# 4. Redeploy production (env changes need a new deploy to take effect).
vercel --prod
#    Or merge this branch to main if Vercel is wired to deploy main.
```

(Dashboard alternative: Vercel → Project → Settings → Environment Variables → add each
with value `true`, Environment = **Production** → then Deployments → Redeploy.)

### Post-flip verification (should all be true within a minute of the deploy)

```bash
curl -s https://galaxysportsedge.com/api/performance | jq '{record, winRate, insufficientSample}'
#   → returns the real record/winRate (not 503, not null insufficientSample)
curl -s https://galaxysportsedge.com/api/health | jq '.status'   # still "ok"
```
- Cockpit `/cockpit`: **Performance Gate** flips to **Display-Ready**; the posture
  medallion leaves **Blocked/red** (the "public picks live but stats gated" safety
  warning is exactly what was forcing red — opening the gate clears it).
- Readiness should read **5/7**.

---

## B) Gates to HOLD (do NOT flip without the gated work) — and why

| Env var | Hold reason |
|---|---|
| `CALIBRATION_ADJUSTMENTS_ENABLED` | **Non-negotiable.** This applies learned adjustments to public-facing win-probabilities. It requires the audited `MODEL_VERSION` activation + held-out validation in **`docs/path-to-70.md` §7**. Flipping it without that publishes unvalidated probabilities — a CLAUDE.md hard violation. `jarvis.ts` already raises a safety warning if it's on without the preconditions. |
| `CONFIDENCE_DISPLAY_MODE=precision` | Raw confidence integers should only be shown **after** calibration (today: `labels`). Keep as-is until calibration lands. |
| `FEATURED_PICK_PROMOTION_ENABLED` | `platform-config.ts:75` — only enable "after grade thresholds are calibrated against real historical win-rate data." Same calibration dependency as above. Owner's call once calibrated. |
| `PUBLIC_BLOG_ENABLED` | Owner's call. Safe-ish (content is draft-only + human approval), but it starts the content-publishing worker; open it deliberately, not as part of the picks ladder. |

So **"all gates open" = open A (3 vars), hold B (4 vars)** until calibration is audited.
That is the honest maximum right now.

---

## C) What shipped this session (already on the branch)

1. **Homepage intro rebuilt for calm + zero lag** — replaced the real-time WebGL warp
   (16k Three.js particles + 72 streak spans + camera-roll, the lag source) with a calm
   Higgsfield deep-space still (`intro-galaxy` plate). Doctrine lines now appear one at a
   time, readable; restrained palette; reduced-motion/Skip/Escape/opt-out preserved.
   Deleted the orphaned `warp-nebula*` components.
2. **Cockpit calmed** — softened the red posture, stopped the pulsing status dots, and
   moved the dense Detail/Drilldowns + System-internals panels behind native `<details>`
   disclosures so the deck opens scannable.
3. **Jarvis "data-ready" fix** — the cockpit no longer says "Hold PERFORMANCE_STATS off
   until 100 (currently 255)"; once the floor is met it recommends enabling + redeploy.
4. **Installed the full GSN/GSE command suite** in `.claude/commands/` (34 commands).

## D) Audit findings

A full read-only audit was run (8 parallel subagents across security, pick-lifecycle &
grading, accuracy-claims & calibration, odds & data-reliability, DB & performance, types
& architecture, preflight & hard-stops, and cockpit visual/UX). See
**`AUDIT_FINDINGS.md`** in this folder for the consolidated, ranked results and which
items were fixed in-session vs. handed off.

---

## E) Paste-ready prompt for local Claude Code

> You are in the Galaxy Sports Edge repo on branch `claude/compassionate-ramanujan-qqt5nb`.
> Goal: open the two data-ready production gates and tighten stale-data safety.
> 1. Run `node scripts/check-gate-flip-readiness.mjs performance-stats` against the prod DB
>    and confirm PASS. If it fails, stop and tell me why.
> 2. Set these Vercel **Production** env vars to `true` (use `--no-sensitive` so they verify):
>    `PERFORMANCE_STATS_ENABLED`, `OUTCOME_LEARNING_ENABLED`, `FORCE_NO_BET_IF_STALE`.
> 3. `vercel env ls production` to confirm they round-tripped, then `vercel --prod` to redeploy.
> 4. Verify: `curl -s https://galaxysportsedge.com/api/performance | jq` returns the real
>    record (not 503), `/api/health` is still ok, and `/cockpit` posture leaves Blocked.
> 5. Do **NOT** enable `CALIBRATION_ADJUSTMENTS_ENABLED`, `CONFIDENCE_DISPLAY_MODE=precision`,
>    or `FEATURED_PICK_PROMOTION_ENABLED` — those wait for the audited MODEL_VERSION /
>    calibration step in `docs/path-to-70.md` §7.
> Report back the readiness output, the redeploy URL, and the post-flip verification.

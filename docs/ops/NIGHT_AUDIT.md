# NIGHT_AUDIT — per-route rubric scorecard + changelog

## MORNING SUMMARY (top — keep crisp)

**Status as of boot (2026-06-14 ~02:45 UTC):** Resumed the overnight autonomous brief.
The real `OVERNIGHT_PROMPT.md` lived on the older `eloquent-goldberg` line (PR #29); this
session is on `claude/nifty-hopper-au7wib` (= `origin/main`, the NEWER immersive line).
Decision: stay on this branch (latest good state + hard harness constraint), port the
brief, re-verify the punch-list against the actual tree, then execute the loop.

- **Gate at boot:** typecheck ✓ (all 10 workspaces); lint→build→test in flight.
- **Shipped so far:** state-file scaffolding (this file + NIGHT_QUEUE + LESSONS + ported
  brief).
- **Biggest planned wins tonight:** WAVE-1 cohesion (picks/room rebrand + accent-300
  sweep), WAVE-2 honesty (broken `stats/source-suggest` form action), WAVE-3 a11y/tests.
- **Decisions waiting on owner:** go-live/merge to main, Stripe + Odds API live keys,
  presenter wiring, Vercel preview auth for skeptic-verification (§8).

---

## Per-route scorecard (before → after; rubric §4, 1–5 each)

| Route | Visual | Motion | IA | Copy | Resp | A11y | Perf | Trust | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `/picks` | 2→ | 2→ | 3→ | 4→ | 3→ | 3→ | 3→ | 4→ | off-brand gray + cyan-400; WAVE-1 target |
| `/room/[gameId]` | 2→ | 2→ | 3→ | 4→ | 3→ | 3→ | 3→ | 4→ | gray-900/950 + ink; WAVE-1 target |
| about/contact/etc. | 3→ | 3→ | 4→ | 4→ | 4→ | 4→ | 4→ | 4→ | accent-300 off-palette; WAVE-1 sweep |

(before-scores are the pre-work baseline; fill the `→after` as each ships + verifies.)

---

## Changelog (what / why / verified-how / result) — newest at top

- **Boot.** Located the real brief on the eloquent-goldberg branch, ported it, created the
  three state files, re-verified WAVE-1 findings on this tree. *Verified:* grep confirmed
  off-brand patterns still present in picks/room + accent-300 pages; vault/integrations
  already clean. *Result:* queue seeded; gate baseline in progress.

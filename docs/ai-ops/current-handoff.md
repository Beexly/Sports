# Current Handoff — Working Memory

Update this file at the end of every task. Keep it current so Claude does not rediscover project context on each session.

---

## Last Task
Cockpit exploration — identified smallest owner-level improvement candidate.

## Files Changed
None approved for application code.

## Exact Behavior Changed
No application behavior changed.

## Tests / Checks Run
`npm run typecheck --workspace=apps/web` — pre-existing tsconfig `baseUrl` deprecation error (TS5101); unrelated to cockpit. No new type errors.

## Remaining Risk
None introduced. Pre-existing typecheck warning in `tsconfig.json` line 23 (`baseUrl` deprecated in TS 7.0) needs `"ignoreDeprecations": "6.0"` to silence — not urgent.

## Next Safest Step
Return to ChatGPT for task slicing before next Claude Code session. Break cockpit improvements into discrete, approved units before opening a session.

## Active Working Memory

**Cockpit page:** `apps/web/app/cockpit/page.tsx` (481 lines)
- Jarvis Launch Observatory — primary owner/operator summary page
- Server component, `force-dynamic`
- Renders: launch status badge, health tiles (11 systems), safety warnings, external config warnings, missing-phase warnings, recommended next actions, phase matrix, readiness gates, today's slate breakdown, today's picks list
- Auto-refreshes every 60s via inline `<script dangerouslySetInnerHTML>`
- All DB queries use `.catch(() => 0)` fallback; page always renders

**Cockpit data loader:** `apps/web/lib/cockpit/jarvis-data.ts`
- Loads live evidence for Jarvis synthesis (19 parallel DB queries)
- Calls `synthesizeJarvis()` from `@/lib/cockpit/jarvis`
- Augments safety warnings and recommended actions for stub/demo mode
- Do not edit without understanding `synthesizeJarvis` contract

**Improvement suggested but not approved:**
- Add `Active subs: N` badge to header (one `db.subscription.count` query + one badge element, 1 file, ~6 lines)
- Risk: low. Pattern matches existing badges. No schema change needed.

**Current decision:** No implementation approved for application code.

---
*Last updated: 2026-06-11*

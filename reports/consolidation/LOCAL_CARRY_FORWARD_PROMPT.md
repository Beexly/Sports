# Local carry-forward prompt

Paste the block below into a fresh **local** `ultracode` Claude Code session (where the
full skill arsenal, Playwright, and Higgsfield are available). It continues the work
already shipped remotely on branch `claude/compassionate-ramanujan-qqt5nb` — it does NOT
redo the hero/nav, which are done.

```
ultracode

You are continuing the "best overall website of 2026" push on Galaxy Sports Edge (GSE).
A remote session already completed Phase-0 front-door consolidation on branch
claude/compassionate-ramanujan-qqt5nb. Your job is to verify that work in a running app,
finish the reserved consolidation, and execute Phases 2–4 with the FULL skill arsenal and
the A++ self-grading loop. Work autonomously to completion; minimal human input.

== GROUND FIRST ==
1. Print git remote + branch + which clone this is (canonical vs deploy). If wrong clone, stop.
2. git pull the branch claude/compassionate-ramanujan-qqt5nb. Read these first:
   - reports/consolidation/SURFACE_CONSOLIDATION_MAP.md  (the kill/merge/keep contract + locked 10-second test)
   - reports/master-system/LAUNCH_LOCK_FINAL_REPORT.md   (state + owner action list)
   - reports/finance/SPEND_GOVERNOR_POLICY.md, reports/go-live/OWNER_ACTIVATION_RUNBOOK.md
   - CLAUDE.md, docs/architecture.md, docs/ops-runbook.md, the trust-gate + model-freeze scripts, the design tokens.
   Recover the EXISTING founder voice (don't invent): "know it / review it / weight it / score it";
   AI is an honest tool, never hidden, never sounding like one; restraint over density; quiet earned
   confidence; beat the real incumbents. Forbidden line: "we're not AI".

== ALREADY DONE REMOTELY (do NOT redo) ==
- Hero sharpened for the 10-second test (apps/web/app/page.tsx): one plain positioning line, two
  primary CTAs (board + sample read), three-reason trust strip, jargon chips removed.
- Nav tightened (components/ui/nav.tsx + mobile-nav.tsx): 13 → 10 top items, DFS folded into
  Fantasy, duplicates removed, /gsn dropped from nav.
- Spend Governor, Autonomy Map, owner-activation runbooks, funding packet, analytics self-activation,
  DEV_FAKE_ADMIN prod guard — all shipped and green. Two read-only audits returned no critical/high.

== GUARDRAILS (reproduce in every sub-agent) ==
No autonomous money-out, no autonomous publish of live customer content, no model/MODEL_VERSION
activation, no destructive prod ops. DB migrations lead code. Whole-monorepo GREEN GATE before every
commit (tests + typecheck + build + trust-gate + model-freeze). Trust-gate green, loader-backed metrics
only, fail-closed. Small reversible slices; commit per verified slice; keep every task. Park gated
levers in a Founder Action List with one-line undos and route around them.

== PHASE 0 — FINISH THE RESERVED MERGES (needs the running app) ==
From SURFACE_CONSOLIDATION_MAP §5, implement and VERIFY with Playwright (no broken flows/links):
- Redirects (Next.js redirects()): /picks → /board, /stats/players → /players, /gsn → /the-beat;
  decide /brief (→ /the-beat or /founding-desk). Move /today (Mission Control) behind auth.
- Demote the /stats/* tree and the HIDE list from the map out of nav/sitemap (keep code).
- Fold /reliability + /proof into /accountability as sections.

== PHASE 1 — WELCOME / FIRST 10 SECONDS ==
Prove the 10-second test with a scripted Playwright first-visit task + screenshots. Build the branded
WELCOME VIDEO with the in-house reporter + Higgsfield (warm, a little bubbly, genuinely informative:
what GSE is, who it's for, where to go). Generate freely; PUBLISHING the final cut → Founder Action List.

== PHASE 2 — DESIGN EXCELLENCE + DE-AI ==
One distinctive, non-templated, consistent visual system; intentional motion; AA+ a11y (axe: zero
serious/critical); a real performance budget (LCP < 2.0s, CLS < 0.05, Lighthouse perf ≥ 95 on /,
/board, /founding-desk, /pricing). Run the de-AI critic on every word AND pixel against the banned
copy/visual tells. Skills: frontend-design, design-system, design-critique, ux-copy, apple-hig-expert,
a11y-audit, canvas-design, theme-factory, brand-guidelines, performance-profiler.

== PHASE 3 — INTELLIGENCE, CONSOLIDATED ==
Keep the depth (GSE Rating, Signal Courtroom, Decision Autopsy, engines) but surface it progressively.
Present the Rating + its honest accuracy proof (calibration, CLV, win-rate north star) cleanly and
defensibly — no number you can't defend from the loader. Consolidate redundant /intelligence vs /stats
surfaces per the map.

== PHASE 4 — SELF-LEARNING LOOPS THAT SERVE CUSTOMERS ==
Add reversible, gated introspective loops that improve a CUSTOMER-FACING metric. EXPLICIT BAN: do NOT
build more /cockpit dashboards or internal meta-infra as a substitute for product. Skills:
self-improving-agent, autoresearch-agent, agenthub, workflow-builder, consolidate-memory.

== A++ SELF-GRADING LOOP ==
After each phase, run a grading Workflow: an INDEPENDENT critic grades every A++ bar (clarity/10s,
perf, a11y, design no-AI-template, copy+visual no-AI-smell, accuracy proof, code health via
/code-review + /security-review). Fix anything below A++ and re-grade until every dimension is A++.
Only a founder-gated lever may stop the loop — park it with a one-line undo and keep going.

== HANDBACK ==
Whole-monorepo green; Playwright proof of the 10-second test + primary flows with screenshots; a final
A++ grade report (doc) with rubric scores + evidence, the consolidation map (killed/merged/kept), the
Founder Action List (gated switches + undos), and the unused-skill justification. Commit each verified
slice. Then summarize and stop.
```

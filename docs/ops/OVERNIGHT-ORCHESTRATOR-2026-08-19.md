# Orchestrator runbook — night of 2026-08-19

For the Claude session driving `claude/cron-config-placement-verify-qsl19t`.
Founder is asleep; standing delegation is in force. Any wake (one-shot check-in,
hourly cron backstop, PR webhook, fleet completion) executes this sweep. The two
wake sources overlap by design — if a sweep ran within the last 20 minutes and
nothing below produces work, exit silently.

## Wake sweep (in order)

1. **Hermes intake**: `git fetch origin --prune`. New `hermes/l7-clv-forensics`,
   `hermes/l9-clv-slices`, or `hermes/l10-provider-probes`? Verify SHAs
   (`git cat-file`), read `RESULTS.md`/`BLOCKED.md`, fold findings into the C-14
   verdict picture, flip the matching ledger row with evidence, push.
2. **Fleet health** — transcript dirs under
   `/root/.claude/projects/-home-user-Sports/d2839e54-19cf-539e-9072-d412459d731e/subagents/workflows/`:
   - `wf_5c954243-d28` — C-13 merge + C-14 forensics (4 agents)
   - `wf_034d9ad2-8db` — hardening: fix/ledger-shallow, fix/apiv1-walker, fix/hk-revision (5 agents)
   - `wf_e533eeaf-8d2` — frontier research night (11 agents)
   For each: if `journal.jsonl` has not grown across TWO consecutive sweeps
   (record line counts in a scratch note, or compare mtime), the run is stalled —
   `TaskStop` it, then relaunch with
   `Workflow({scriptPath: <its script under .../workflows/scripts/>, resumeFromRunId: <its wf_ id>})`;
   the completed prefix returns from cache, only the stalled agent re-runs.
3. **Integrate finished work** (each lands on the designated branch, then push):
   - C-13 merge commit verified → merge into designated branch, re-run
     `node scripts/ops/check-agent-ledger.mjs` and
     `node scripts/guardrails/api-v1-boundary.mjs` bare, `npm run typecheck`,
     targeted vitest from the owning dirs, push, flip C-13.
   - C-14 verdict + refuter agree → write
     `docs/ops/edge/2026-08-19-clv-forensics-verdict.md` combining code-path
     verdict with Hermes L-7/L-9 data; flip C-14.
   - Hardening branches verified → merge, guards + tests, push, flip C-10/C-11.
   - Research dossier returned → commit as
     `docs/ops/edge/2026-08-19-research-frontier-dossier.md`; then run ONE
     novelty-audit agent (compare our e-process protocol in
     `packages/prediction-engine/src/forecast-skill-eprocess.ts` + the roadmap
     preregistration section against the dossier's surveyed literature; verdict:
     which claims are ours alone; if defensible, a paper outline) and commit its
     output as `docs/ops/edge/2026-08-19-eprocess-novelty-audit.md`; flip C-16.
4. **CI on #435**: test job green after 2f229d3b is expected — if it fails on a
   NEW suite, root-cause and fix (never weaken assertions). The AI-transport
   boundary + "All guardrails" reds are owner-held (identical on main): skip.
5. **Dispatch next** — if fewer than 2 workflows are running, take the highest
   undone item:
   1. C-15 design fleet (CLV lock-price provenance fix) — only after C-14 verdict.
   2. Provider-failover design fleet from the H-S/L-5 map (quota-aware rotation
      through the clearance engine; design doc first, no adapters yet).
   3. Top-priority dossier proposal spike — DESIGN + preregistration doc only;
      no model changes ship overnight without a preregistered experiment.
   4. Full local test sweep (apps/web from apps/web, each package from its dir)
      → fix any real failure.
6. **Re-arm**: if the 50-minute one-shot chain is broken (no pending send_later),
   re-arm it with the standard check-in message.

## Token hygiene (added mid-night, founder-flagged)

Unsubscribed from #435 PR activity at 08:03 UTC — each push was firing 4-5
bot-echo wakes (Vercel building/ready, CodeRabbit draft-skip, duplicate
owner-held AI-transport-boundary + guardrails CI), each one a full billed
turn for zero new information. Do NOT re-subscribe. The hourly backstop
sweep (step 4 above) already checks #435 CI directly — that's sufficient;
it just doesn't react in real time, which is fine overnight.
Also: batch related ledger/doc edits into ONE commit+push instead of
pushing after every micro-edit — every push was the trigger for the wake
cascade above, so fewer pushes = proportionally fewer echoes even before
the unsubscribe.

## Hard rules (unchanged tonight)

Push only to `claude/cron-config-placement-verify-qsl19t` (+ integrate-by-merge).
Never edit sealed paths; never weaken guards or tests; never flip production
gates; never message the founder unless something needs his hands. Ledger is
single-writer (this session) tonight.

## Morning cleanup (first wake after a genuine founder message)

Delete the hourly cron backstop trigger (id recorded in the trigger list; name
"overnight-orchestrator-backstop") via `delete_trigger`, cancel any pending
one-shot check-in, and post the founder a single consolidated overnight report:
what landed (SHAs), what the verdicts say, what is queued, what needs his hands
(R-1/R-2/R-6 browser tasks, F-2/F-5 decisions, transport-boundary call).

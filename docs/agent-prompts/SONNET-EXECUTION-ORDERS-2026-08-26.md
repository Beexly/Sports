# SONNET EXECUTION ORDERS — 2026-08-26 (kickoff minus ~8 days)

_The founder is switching to the Sonnet seat to complete the work. These are its standing orders,
integrating `handoff/research/frontier-2026-08/CLAUDE-MAX-PROMPT.md` (Hermes, ported to this
branch) into the plan stack. Written by the Fable seat at founder direction; Fable is now off._

## 1 · The binding stack (read in this order, nothing else needed)

1. `docs/ops/STATE.md` — live state + founder queue. **Update it before ending any session.**
2. `docs/ops/PLAN-2026-08-26-NORTHSTAR.md` — strategy, seat contracts, laws.
3. `docs/ops/edge/2026-08-26-WEEK1-BATTLE-PLAN.md` — the three candidates and their ARM-GATES.
4. `docs/agent-prompts/SONNET-MAX-LEVERAGE-PROMPT.md` — session law (ledger protocol, honesty
   laws, verify block, CI-minutes economy). Still fully binding.
5. This file — the integration of CLAUDE-MAX + the concrete queue.

## 2 · ADOPTED from CLAUDE-MAX-PROMPT.md (now law for the execution seat)

**The 7-point per-task verification protocol (§4 of the source, adapted):**
1. Every claimed file change: `test -f <path>` and `git diff <file>` — see the diff, never trust
   the report.
2. Every numerical claim: **re-run the calculation independently** before writing it anywhere.
3. Every "module works" claim: actually run it (vitest / node / python) with a real exit code.
4. Every DB-dependent claim: check the committed artifact; no artifact → the claim does not exist.
5. Anything missing (file, source, data): write **`MISSING: <item>`** — never fabricate, never
   soften. Append to the session log.
6. Save/record session ids; start a fresh session when approaching iteration limits rather than
   degrading (founder preference, recorded).
7. Restricted tools per delegated task; structured output where automation parses results.

This protocol already has three scalps from last night alone (push-handling artifact, timezone
table error, falsify overflow). It is not ceremony.

**Also adopted:** "use Claude to design the falsifier, not to claim edges" (§5) — identical to
the battle plan's standing truth; max-effort reasoning reserved for gate design and statistical
rulings, not routine execution.

## 3 · REJECTED from CLAUDE-MAX-PROMPT.md (with reasons, per the honesty laws)

1. **`--dangerously-skip-permissions` — never on this repo.** The source's rationale ("safe
   because we've already verified workspace contents") is wrong: content verification does not
   make permission-skipping safe, and the source *contradicts itself* (§6 says "no
   --dangerously-skip-permissions" while §2 uses it). The permission layer and hooks ARE part of
   the honesty machinery.
2. **`--bare` (skipping hook/plugin discovery) — never on this repo.** The pre-commit secret
   scan, the stop-hook git check, and the sealed-path guards run through exactly the machinery
   `--bare` skips. Startup milliseconds are not worth an integrity hole.
3. **Mechanical CLI flags taken on faith** — several flags in the source are founder-machine
   patterns; verify each against the installed CLI's own `--help` on first use rather than
   trusting the document (its own rule, applied to itself).

## 4 · Quarantine note

Hermes commit `43b161ecb` also landed skeleton modules (`scoring/murphy_decompose.py` 12 lines,
`portfolio/whitrow_solver.py` 9 lines, `mlops/*`, `scoring/rolling_origin_cv.py`). These are
STUBS, quarantined per NORTHSTAR §3 — do not build on them until independently reviewed; the real
Murphy decomposition belongs in `packages/prediction-engine` with tests, per the queue below.

## 5 · THE QUEUE — CLOSED 2026-08-26 ~15:55 UTC. All 6 items resolved (done, corrected, or revised).

1. ~~**Land the C-75 second wave**~~ — **DONE.** 23 agents (grew from planned 16), landed with an
   independent Sonnet spot-check of 2 headline numbers before treating it as confirmed (protocol
   §2.2). Verdict doc: `docs/ops/edge/2026-08-26-hermes-second-wave-verification.md`. Headline:
   nothing survives — every testable historical hypothesis KILLED or PARKED under the repaired
   falsifier. Ledger: C-75.
2. ~~**Build the two live e-process runners, dark**~~ — **REVISED, NOT EXECUTED.** C-75 killed
   Candidate 1 and killed/starved Candidate 2 (see verification doc + the rewritten battle plan).
   Building founder-armed live infrastructure for a dead signal would misrepresent the evidence.
   Ledger: C-79. Battle plan rewritten in place rather than silently dropped.
3. ~~**Falsifier acceptance harness**~~ — **DONE.** `falsify.acceptance.test.ts`, 9/9 green,
   planted-edge/noise/inverted @ n=100/1k/5k. Ledger: C-76.
4. ~~**Murphy decomposition**~~ — **CLOSED, no build needed.** It already existed:
   `brierDecomposition` (`packages/prediction-engine/src/probability-calibration.ts:324`, committed
   98ae6c7ae, 26 days before this queue was written) is the real thing, already wired into ops
   tooling three layers up (`apps/web/lib/calibration/{murphy-res-definition,segmented-murphy,
   murphy-components-explore}.ts`). This queue line was itself an unverified handoff-style claim —
   see ledger C-77. Hermes's stub stays quarantined; nothing superseded it because nothing needed to.
5. ~~**Lock-price provenance capture**~~ — **DONE.** Optional `priceSource` on `PickProofReceipt`,
   derived only from real `bookmakerCount`, additive, no schema migration. Ledger: C-78.
6. **STATE.md current** — done at every step this session; current as of this queue's closure.

**Next queue (opened by C-75's own findings, ranked, none executed yet — see STATE.md "Revised
next queue" for the full list with citations):** fix the two real bugs in Hermes's harness/
calibration scripts; correct `market-atlas.md`'s mislabeled columns; fix the timezone table; and
reconcile the Wong-teaser underdog legs (blocks Candidate 3's revised ARM-GATE). This is NOT part
of the closed queue above — it is a fresh backlog a future session should claim explicitly.

Parked / founder-gated: everything in STATE.md's founder queue; anything touching sealed paths;
arming any live track (founder YES only — and per C-75, there is currently nothing left worth
arming this season); all public claims (C-32, until an e-process crosses 20).

## 6 · Claude-native optimization (founder-ordered: "optimize based off claude trainings and claude prompts")

The repo already carries the assets — use them, do not re-derive:

- **Academy corpus routing** (`docs/CLAUDE-ACADEMY-PLAYBOOK.md`, 755-page index; routing protocol
  in SONNET-MAX-LEVERAGE-PROMPT §9): match the task to the Scope Router, open at most one
  referenced entry per lookup, degrade gracefully when full texts (owner-side) are absent —
  titles + summaries only, NEVER invented contents.
- **Standing consults, moments they bind** (from §9's list): `steering-long-sessions` at session
  start · `the-explore-plan-code-commit-workflow` per task · `context-management` when context
  grows (offload state to the ledger, start clean) · `using-subagents-effectively` before any
  fan-out · `trust-it-verifying-unsupervised-runs` before declaring any session complete.
- **Prompt-writing standard** for every prompt Sonnet authors — subagent briefs, prereg wording,
  runner instructions: the five Academy pillars (`being-clear-and-direct`, `being-specific`,
  `structure-with-xml-tags`, `providing-examples`, `system-prompts`). Concretely: state the exact
  artifact + path + current/target behavior; required-evidence format (file:line); the MISSING-
  not-fabricate clause verbatim; one task per prompt.
- **Production Anthropic-API prompt changes** (GSN's own prompts): `/tune-prompts` first, then
  `npm run guard:claude-api` — never freehand (SONNET-MAX-LEVERAGE §7.2 law). Offline prompt
  optimization lives in `scripts/dspy-gse/` + `docs/agent-skills/dspy-gepa/`.
- **Evals**: extending `npm run agent:eval` follows `a-typical-eval-workflow` + `code-based-grading`
  — code-graded always; model-graded only for subjective quality.
- **Session economics** (C-24 + CLAUDE-MAX §5): fresh session near iteration limits; subagents get
  narrow questions + turn caps; effort tiers matched to the task (max reasoning reserved for gate
  design and statistical rulings, low for mechanical sweeps).

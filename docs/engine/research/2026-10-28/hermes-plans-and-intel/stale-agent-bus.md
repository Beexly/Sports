# agent-bus branch audit vs main + Drive dump coverage

**Repo:** Beexly/agent-bus (default branch `main`)
**Method (read-only, no repo modifications):** `gh api repos/Beexly/agent-bus/branches`, `gh api .../compare/main...<branch>` (commit + file lists), `gh api .../contents/<path>?ref=<branch>` (spot file headers), Drive listing of `G:\.shortcut-targets-by-id\1nCDoFQ9mZ7OPnVSqBl-OeFze3kfqdamG\GSE. 10.2.26` (184 entries) + zip entry listings via `System.IO.Compression.ZipFile` (names/counts only).
**Drive dump checked:** `GSE. 10.2.26` — 184 top-level entries including `agent-bus-main (1).zip` / `(2).zip`, `arxiv-sweep-2026-10-02.zip` (+`(1)` copy), `corpus-intelligence-2026-10-02.zip`, `branch-atlas.md`, `TASK-016-v3-consolidated-mission-2026-10-02*.gdoc`, `handoff-motif-to-grok4.7-2026-10-02*.gdoc`.
**Privacy rule followed:** no private customer data copied; file-level inventory + qualitative verdicts only.

## Summary — all branches

| Branch | vs main | Unique vs main? | Research / gate / measured result? | Already in Drive `GSE. 10.2.26`? |
|---|---|---|---|---|
| `main` | baseline | — | baseline (`bin/bus.mjs` present, `research/corpus-intelligence/briefs/c01` only, no `research/arxiv-sweep`, no `docs/signal-origin`, no `tools/host-harness`) | snapshot present as `agent-bus-main (1).zip` (556 entries) |
| `motif/research-push-all` | 36 ahead, 0 behind (`ahead`) | YES — large | YES — see §1 | YES — `arxiv-sweep-2026-10-02.zip` (1380 entries) + `corpus-intelligence-2026-10-02.zip` (4414 entries, 3748 `briefs/c0*`); key artifact names/sizes match branch |
| `grok/signal-origin-dm-plan-2026-09-14` | 45 ahead, 406 behind (`diverged`) | YES — 129 files | Mostly outreach/DM copy + ops playbooks; small gate/threshold code, no measured product result — see §2 | NO — only fragments (`TASK-016-v3*.gdoc`, `handoff-motif-to-grok*.gdoc`); the 129-file `docs/signal-origin` bundle, TASK-017–022, X-Chat dumps are not in the dump listing |
| `hermes/wip-local-inventory-2026-09-26` | 4 ahead, 21 behind (`diverged`) | YES — small | Harness/verification tooling + inventory doc; no product gate or measured result — see §3 | NO — no `host-harness` / `LOCAL-INVENTORY` entry in the 184-entry Drive listing |
| `hermes/wip-agent-bus-local-clone-2026-09-26` | 1 ahead, 411 behind (`diverged`) | YES — 1 commit, ~15 paths | Bus transport + build proofs; no GSE calibration gate / measured result — see §4 | PARTIAL-YES — the proof files themselves are already in Drive via `agent-bus-main (1).zip` (`inbox/from-opencode/proofs/TASK-001,003–010`, 12 proof entries); branch delta vs main is tiny |
| `motif/research-push-a` | 0 ahead, 0 behind (`identical`) | NO | — | — |
| `motif/research-push-b` | 0 ahead, 0 behind (`identical`) | NO | — | — |
| `motif/research-push-c` | 0 ahead, 0 behind (`identical`) | NO | — | — |
| `motif/research-push-d` | 0 ahead, 0 behind (`identical`) | NO | — | — |
| `motif/research-push-e` | 0 ahead, 0 behind (`identical`) | NO | — | — |
| `copilot/remove-duplication-documents` | 0 ahead, 3 behind (`behind`) | NO (nothing ahead of main) | — | — |

## 1. `motif/research-push-all` — 36 ahead, 0 behind

Commits (all 2026-10-02, "two-host transfer from Motif VM"): ~15× `Research: arxiv-sweep…` + ~21× `Research: corpus-intelligence…`. Compare API returns 300-file cap; recursive tree lists 3951 `research/` paths on this branch.

What is on the branch and not on main:
- NEW top-level dir `research/arxiv-sweep/` (absent on main — verified). Key pipeline artifacts (names from branch listing): `fetch_arxiv.py`, `fetch_wave2/3.py`, `fetch_fulltext.py`, `fetch_hybrid_fulltext.py`, `fetch_pdf_fulltext.py`, `bayes_search/filter/rebuild/retry.py`, `build_manifest.py`, `assemble_scored_batch_2.py`, `batch_1..5.jsonl`, `scored_batch_1..5.jsonl`, `screened_batch_1..5.md`, `master.jsonl` (~1.47 MB), `manifest-500.jsonl`, `manifest.json`, `ledger-tracker.jsonl`, `ledger-template.md`, `selection-750.jsonl`, `reserve-100.jsonl`, `phase2-candidates-{bayes,calibration,causal,market,marketretry,merged,topup}.jsonl`, `phase2-triage-scored-*.jsonl`, `phase2-search-notes-{bayes,calibration,causal,market}.md`, `raw_*.json` (20 topic pulls: sports_prediction, sports_betting_ml, expected_goals, elo, win_probability, point_spread, bradley_terry, market_efficiency, odds_modeling, etc.), `fetch-queue*.jsonl`, `existing-research-map.md`, `RECONCILIATION-NOTES.md`, `fulltext/` text corpus, `waves/`, `wave-assignments/`, `phase2-assignments/`, `reader18-fullreads/`.
- EXPANDED `research/corpus-intelligence/briefs/`: main has only `c01`; branch has `c01`–`c07` (readerXX brief dirs).
- Gates: `ledger-template.md` (13-section per-paper ledger: read proof, method/equations, features/target, validation design, exact numerics, leakage review, GSE-overlap, implementation spec, reproducible test, numeric acceptance/rejection gate); `RECONCILIATION-NOTES.md` (coverage math: 64 existing IDs, 42 in sweep corpus so excluded, 10 pilot exclusions, 97-paper reserve note, tracker phantom-completion fix for manifest 41–50).
- Measured results: `scored_batch_*.jsonl` / `screened_batch_*.md` / `phase2-triage-scored-*.jsonl` / `phase2-candidates-*.jsonl` / `phase2-search-stats-bayes.json` / `skip-report.json` — triage scores and candidate rankings, i.e. the sweep's working measurements (not a shipped product gate).

Drive coverage: YES. `arxiv-sweep-2026-10-02.zip` (1380 entries, 1123 `*fulltext*`) contains the same pipeline filenames (`fetch_arxiv.py`, `raw_*.json`, `master.jsonl` 1472899 bytes, `manifest.json`, `batch_*.jsonl`, `screened_batch_*.md`, …). `corpus-intelligence-2026-10-02.zip` (4414 entries, 3748 `briefs/c0*`) contains the `corpus-intelligence/briefs/` tree. Caveat: entry counts differ from the live branch tree (compare API caps at 300; branch tree = 3951 `research/` paths), so treat the zips as the dated 2026-10-02 snapshot of this branch — re-diff by manifest before assuming byte-complete — but the research program itself is preserved in the dump, unlike §§2–3.

## 2. `grok/signal-origin-dm-plan-2026-09-14` — 45 ahead, 406 behind (diverged)

45 commits 2026-09-14/15 (`[bus] …` series + TASK-016–022). 129 files in diff. `docs/signal-origin/` does NOT exist on main (verified) — the whole bundle is branch-only.

What is on the branch and not on main:
- `docs/signal-origin/` (~100+ files): INDEX/SESSION/OWNER/HANDOFF-EXPERT entry points, plus AUDIT, CENSUS, DM-CENSUS, DM-INTEL, DM-RND-PLAN, DM-XCHAT-001, REPLY-BANK, GOLD-EMAILS, KIT-AUTOPSY, LOCAL-CASH, MATH, NIGHT-LOG, OVERNIGHT(-OPS), QC, REPLACE, REPO-INTEL, REPOS-30, PAPERS-30, THESES/THEORIES, STACK, STUDIO, TIERED-FORKS, TIMELINE-FILTER, FACE/FERRY, KEY-REVIEW, desk (`desk.yaml`, `desk-data.ts`, `desk-ui.tsx`, `pressure.ts`, fixtures), factory sheets (`character.schema.json`, `hold.json`, `ray.json`, `kit-walk-in.json`, …), `field-pack.html` / `outside-view.html` / `overnight-ops.html` / `sequence.html`, memory (`episodes.json`, `people.json`, `gates.md`), `protocol/*.ts` (~35 modules: ab, autonomy, bait, brief, burst, calendar, companion, continuity, cost, crew, delta, durable, envelope, evolve, fold, funnel, gold, handoff, hunt, interval, lead, maintain, math, matte, note, outreach, packet, pipeline, policy, prag, qc, query, reuse, route, script, search, sheet, shot, split, studio, swap, timeline, tools, trace, verify, write + schemas `envelope.schema.json`, `state-packet.schema.json`, `roles.json`, `tools.json`, `skills.md`) + `route/swap/verify.test.ts`.
- `inbox/from-grok/` (DM R&D gauntlet note, session handoff, TASK-016 overnight-ops, TASK-017 stack-filter, TASK-018 kit-cinematic, TASK-019 router, TASK-020 three-files, TASK-021 studio, TASK-022 no-wait), `inbox/from-xchat/` (self-corpus dump + README), `outbox/from-grok/` (dead-letter + timeline-takeover), `dialogue/2026-09-14-hermes-vanish.md`, plus INDEX/PROTOCOL/STATUS tweaks.

Verdict: **mostly outreach/DM copy + field-ops playbooks** (reply banks,DM census/intel, R&D gauntlet plan, 3-touch sequence, walk-in/field-pack/outside-view sheets, A/B objection scripts). Gate-like code exists but is threshold/policy scaffolding, not a measured result: `pressure.ts` floor constants, `VERIFY` reject rules, envelope/state-packet schemas, route/swap/verify unit tests, desk pressure fixtures. The branch's own MATH note states no revenue/funnel/close-rate can be claimed (qualitative only — figures deliberately not reproduced here). No calibration/ECE-style measurement, no ledger gate.

Drive coverage: NO. Dump has only `TASK-016-v3-consolidated-mission-2026-10-02*.gdoc` + `handoff-motif-to-grok4.7-2026-10-02*.gdoc` + `GROK 4.gdoc`. None of the 129 bundle paths, TASK-017–022 bodies, or X-Chat dumps appear in the 184-entry listing.

## 3. `hermes/wip-local-inventory-2026-09-26` — 4 ahead, 21 behind (diverged)

4 commits 2026-09-26: inventory doc + `tsc` warning + host-harness (preserve + dead-ends record).

What is on the branch and not on main (`tools/host-harness/` absent on main — verified):
- `inbox/from-hermes/LOCAL-INVENTORY-2026-09-26.md` (270 lines: 8 checkouts / 12 worktrees inventoried, 6 branches pushed + 4 updated this session, 5 worktrees committed, 2 scratch trees ~2.6 MB, 1 deliberately unpushed tree).
- `tools/host-harness/`: README (evidence method on iSH host), `attempts-failed/` (3 dead-end vitest workarounds: env-shim, hostfix, oxctest), `logic/` (cms/taci/trace/verify/verify2), `tsc/` (scoped tsconfigs + package), `vlog/` (build/run/verify scripts, vitest shim, duel/factgraph/holdout/joint/scorecard/stats TG-scan tooling, `reapply-trust-gate.py`, `repo/docs/factors/A*.yaml` + INDEX, verifier fixtures + `__tests__` suite: calibration-pins, duel, exact-pins, factgraph, holdout, integrity-pins, joint, nflverse-releases, scorecard, stats-pins, v530).

Verdict: **harness + environment evidence, not a product gate or measured outcome**. The load-bearing warning is the `tsc` phantom-pass note (bare exit 0 can mean "killed", not clean — verification requires a CI log or positive control). The `__tests__` files are a vendored verifier suite for running elsewhere, not new GSE numbers produced by this branch.

Drive coverage: NO. No `host-harness` or `LOCAL-INVENTORY` names among the 184 Drive entries.

## 4. `hermes/wip-agent-bus-local-clone-2026-09-26` — 1 ahead, 411 behind (diverged)

1 commit 2026-09-26 ("sports lane + bus.mjs program, opencode batch-1/3 proofs, TASK-002 spec removed"). ~15 paths: `.gitignore`, INDEX/PROTOCOL/STATUS tweaks, `bin/bus.mjs` + `bin/README.md`, `inbox/from-opencode/proofs/TASK-001,003–010` (9 proof docs), deletion of `inbox/from-motif/TASK-002-props-production-pipeline.md`.

What is on the branch and not on main: effectively the sports-lane bus program doc + proof attestations for work built in `Beexly/autonomous-revenue-engine` (lead-finder, post, lead-capture, embed-widget, video-recorder, signage-leads, QA-fixes, sample-sites, workflows — each proof records paths/commit + stdlib-only run notes). `bin/bus.mjs` transport (git-as-medium, MCP stdio + plain CLI, `sports/claims/<TASK-ID>.json` mutex where push rejection is the lock) already exists on main; this branch's delta to it is incidental. No GSE research corpus, no calibration/acceptance gate, no measured modeling result.

Drive coverage: PARTIAL-YES (proofs already preserved). `agent-bus-main (1).zip` in the dump already contains `inbox/from-opencode/proofs/TASK-001,003–010` and the bus program files, plus related motif reply docs. The branch's net-new delta vs current `main` is essentially bookkeeping (status/index lines + TASK-002 removal), so nothing material is at risk of loss.

## 5. Branches with nothing ahead of main

- `motif/research-push-a/b/c/d/e`: each `identical` (0 ahead, 0 behind) — no unique research, gate, or measurement; presumably staging pointers for the `-all` transfer. Nothing to preserve beyond §1.
- `copilot/remove-duplication-documents`: `behind` (0 ahead, 3 behind) — nothing unique vs main by definition.
- Note: prompt named 4 ahead-branches; full API listing adds the 5 identical/behind branches above, so all 11 refs (10 branches + `main`) are covered.

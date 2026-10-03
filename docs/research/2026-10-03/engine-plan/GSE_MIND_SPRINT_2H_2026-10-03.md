# GSE_MIND_SPRINT_2H_2026-10-03

Clock: 13:49 CT. Done by 15:49 CT. This file wins over any pick-settling, mint, or loop prompt that tries to close the engine before the mind is trained.

Product this window: equations, theories, analytics, and already-owned social/research text into the mind. Not picks. Not a Week 4 card. Not Neon production writes. Not a bet.

## Chain of command

GSE bot is lead architect. It does not settle picks. It checks that every fleet is still writing and restarts a dead lane.

Hermes (Grok 4.7 on the machine) is late lead for disk trainers. Hermes controls Grok bots if the bus allows. If it cannot, Grok bot leads its own team and reports a receipt to GSE. Hermes controls Cursor Pro+ agents if the bus allows. If it cannot, Grok bot leads those agents. Muse/Motif is a parallel reader fleet. It does not mint.

## Do not touch

Hermes measured these alive. Do not kill them. Do not start a second writer on mind.jsonl.

- Trainer A pid 14088, mind.jsonl, agent-bus only.
- formal pid 7704, mind_formal.jsonl.
- shard pid 28800, mind_shard.jsonl, 63 shards, equation-dense rows first.
- math pid 5508, Sports/docs/math. glm, gpt-6-luna, mimo answered the probe.
- researchdocs pid 14356, Sports/docs/research.
- reasoning pid 13180, Sports/docs/reasoning.

Packages is a live process with a stale log. Do not kill it. Do not open its file.

Seed receipt already real: brain/mind_seed.jsonl, 4856 unique relative paths, mind_jsonl_touched false, inbox dropped 231, partial 53, fulltext added 29, reader_fail 0. Do not pass --merge while tasklist shows trainer A. The pid file is not the gate.

Comp-intel is not a top-level folder under Sports/docs. Do not invent a path. The researchdocs trainer is already walking that tree.

## Proof a lane is working

A lane is working only if its jsonl line count or byte size rose in the last 10 minutes. A JSON note with no equation and no source path is not progress. A settled pick is a failure of this window.

## Hermes, next two hours

1. Leave the six live trainers alone. Probe handles at 14:20, 14:50, 15:20. If a handle is dead, restart that lane only, into its own jsonl, not mind.jsonl.
2. Do not --merge. Do not start a second mind_train.py.
3. When shard log leaves "loading shards", record shard lines and unique source paths in brain/sprint_receipts.jsonl.
4. Math, researchdocs, and reasoning must keep equation_latex. If a lane writes summaries only, that lane is fake progress. Restart it with an equation-required prompt. Do not restart a lane that is already emitting equations.
5. Stop a provider at $8 if responses go empty. OpenCode balance about $30. Do not drain 429 retries. Do not call the four 403 app-only models on the API.

## Grok bots

Own equation agreement and index rows. Do not settle picks.

1. Read mind_seed.jsonl, mind_formal.jsonl, mind_shard.jsonl, mind_math outputs. Two models must emit the same normalized equation or the row stays UNVERIFIED.
2. Append agreed rows only to an index extension file, one row per signal, source_path required. Do not rebuild intelligence_index.json.
3. Held-out: arXiv id with the dot removed, integer mod 10 equals 0, is test-only.
4. Report to GSE every 20 minutes: lines read, equations agreed, UNVERIFIED count, dead bots restarted.
5. If Hermes cannot drive you, your team lead drives you. You still do not mint.

## Cursor Pro+

File work only. Not an API fleet. Not a pick desk.

1. If Hermes can assign you, take the assignment. If not, Grok bot team lead assigns you.
2. Diff the live trainers against docs/math, docs/reasoning, docs/research. List files with no receipt.
3. Do not edit mind.jsonl. Do not write Neon. Do not place a bet.

## Muse / Motif

Parallel reader fleet. Social posts and research text already owned go into a side file, brain/mind_muse.jsonl, with source path and extracted claim. Inbox kit notes stay out. No pick language in the output. If a bot starts a betting card, kill that task and keep the reader.

## Fireworks

$5.94. Do not start an SFT, DPO, distill, or RL job this window. The corpus is not a finished training set. Spend stays on inference receipts. A training job before equation agreement is fake progress.

## 15:49 receipt GSE must have

- six trainer handles alive or restarted with a reason
- shard line count
- math/research/reasoning line counts
- agreed-equation count
- UNVERIFIED count
- muse side-file line count
- explicit: picks settled = 0

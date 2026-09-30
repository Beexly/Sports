# Total Signal Wiring Program

## The vision (uncompressed)

Wire every signal into the all-knowing engine. The engine predicts, reasons, thinks
things through, processes — autonomously — producing the most intelligent,
reasoned-through deterministic probability in the world. To do that: more signals
than anybody else in the world, more intelligence than anybody else in the world,
knowing more and being on time than anybody else in the world. Nothing about this
vision gets minimized or compressed to fit a session.

## The loop

Every signal family runs the same loop, in order:

**research → wire → weight → calibrate → test → polish**

No step skipped. No freelancing beyond the assigned family. Wiring comes before
calibration by design — an unwired signal can't be calibrated, and a wired-but-
uncalibrated signal is honest as long as it is labeled as such.

## The research corpus — read before building

An enormous GSE research corpus already exists, including the overnight
deep-research pushes. The single most expensive mistake in this program is redoing
research that already exists. Rule: **search the corpus first; cite the document,
never redo the research.**

- `docs/arxiv-program/research/<YYYY-MM-DD>/` and
  `docs/arxiv-program/research/MASTER-PAPER-INDEX.md` — the 1,000-valuable-papers
  program (585/750 verified valuable as of 2026-09-26). Every paper carries method,
  math, datasets, GSE application, implementation spec, test, and improvement path.
  The GSE-application notes are this program's prioritization engine: they rank
  which signal families matter most for prediction accuracy. Use them to order work.
- `docs/research/<YYYY-MM-DD>/` — dated research drops (film pipeline, DFS
  construction, engine studies, competitive work).
- NGS: the 48-post @NextGenStats inventory + metric glossary. HARD doctrine: NGS
  data is internal reasoning fuel only — never on the public surface, never in
  published outputs, not even metric names.
- `Beexly/gse-competitive-intel` (separate repo) — 310 dossiers, 1,670 evidence files.
- `docs/INDEX.md` — the full map when lost.

When a wiring decision needs grounding, the corpus answers first. Only genuinely
new questions get new research, and new research lands back in the corpus
(`docs/research/<today>/`), dated, so the next session cites it.

## Delegation architecture — cost discipline

This program runs on Sonnet 5.5. It is expensive. Sonnet orchestrates; lower-tier
subagents execute.

- **Delegate to subagents:** repo recon sweeps, grep/glob inventories, full
  test-suite runs (report back counts and failures only), log reads, handoff-doc
  drafting, boilerplate test scaffolding.
- **Sonnet-only:** reading the corpus, wiring decisions, calibration math, weight
  design, final review of every diff before it becomes a PR.
- **Never** spend Sonnet context on what a grep or a subagent can return. Traffic
  in pointers — `file:line`, doc paths, commit SHAs — not pasted content. This
  applies to prompts given to subagents and to handoffs between sessions.

## Handoff contract

Every session ends with a handoff. No exceptions. Path:
`docs/ops/handoffs/<YYYY-MM-DD>-<signal-family>.md`. Contents:

1. Mission (one line).
2. What changed: files, commits, PR number.
3. Proof: test counts + CI run IDs. Green required.
4. Calibration state of every touched signal: calibrated / shadow / uncalibrated.
5. Exact resume point: what the next agent does first, with `file:line` pointers.

The next agent reads the latest handoff for its family before doing anything else.
Sessions chain through handoffs, never through Garrett as courier. A session with
no handoff is an unfinished session.

## Promotion gate — the honesty safeguard

Every wired number carries `engine-inline:<file>#<fn>` provenance **plus** its
calibration state. Uncalibrated signals compute in shadow; they never promote to
published outputs. Wiring is not validation — calibration is. This gate is what
lets the program run at full speed without corrupting the product: maximum wiring
velocity, zero fabricated confidence.

## Session 0 — the inventory

"Wire everything" is unbounded until every signal is enumerated, and unbounded is
what burns expensive context fastest. One session maps the territory; every session
after runs without re-discovery, on non-overlapping families, in collision-proof
branches.

```
Mission: build the total-signal inventory. Catalog every signal source in this
repo and its wiring state: wired to production, flagged off, computed but
unpublished, empty tables (player signals is 0 rows), adapters with no production
callers (composeLedger, devig). Include verified off-repo sources: Odds API, NGS
feed, Kalshi/Polymarket market-data APIs, the five pick'em intakes (DK Pick6,
Underdog, PrizePicks, Sleeper, Action Network), nflverse, Sleeper market signals.
For each family: source, wiring state, refresh cadence/latency, and the file:line
where it lives or should live. Rank the families by leverage on prediction
accuracy, using the arXiv GSE-application notes in docs/arxiv-program/research/
as the primary ranking evidence. Output:
docs/research/2026-09-30/total-signal-inventory.md. Research only — no code
changes. Delegate the repo sweeps to subagents. New branch from main, PR when
done, handoff per the contract above.
```

## Wiring session template

One session per signal family, in the inventory's leverage order:

```
Mission: wire [SIGNAL FAMILY] into the engine. Full loop: research → wire →
weight → calibrate → test → polish. Research means the corpus first
(docs/arxiv-program, docs/research, NGS inventory) — cite, don't redo. Every
number carries engine-inline:<file>#<fn> provenance plus its calibration state;
uncalibrated signals compute in shadow and never promote to published outputs.
Delegate sweeps and test runs to subagents; keep wiring decisions, calibration
math, and final review on Sonnet. New branch from main, PR when CI is green,
report test counts + CI run ID. End with the handoff doc. Never touch
gse-grok-build-sandbox.
```

## Initial queue (the inventory re-ranks this)

1. **devig adapter math fix** — one adapter reads American odds as decimal prices
   (`1/-110` → negative implied probability); the other sum-normalizes while
   reporting "additive". Neither has a production caller: zero production risk.
   Fix the math, add asymmetric-input tests that fail on the old code.
2. **player signals table** — 0 rows. The empty core of the total-signal doctrine.
3. **composeLedger production wiring** — no production callers today; wiring it
   changes what production publishes, which is authorized under this program,
   gated by the promotion rule above.
4. **pick'em intakes promotion** — DK Pick6, Underdog, PrizePicks, Sleeper,
   Action Network scoreboard: verified live, currently behind default-off flags.
5. **Kalshi/Polymarket as calibration inputs** — free market-data APIs verified;
   market probabilities as calibration/sentiment signal, not execution venue.
6. **NGS weighting** — internal only, per the NGS doctrine.
7. **Odds API backfill wiring** — account active (20K credits/month); historical
   backfills feed calibration.

## Standing rules

- `AGENTS.md` governs; this program does not override it.
- One task, one branch from main. Never commit to main or another agent's branch.
  PR + green CI or it didn't happen. Nothing stays local.
- Latency is a requirement, not a nice-to-have: the inventory records refresh
  cadence per family, and "on time" is part of done for every family.
- Garrett's explicit calls — not the agent's: `reservePaidCallSlot` stays
  failing-open until his budget decision; the mimo ports (#913–#918) await his
  triage.
- Never touch `gse-grok-build-sandbox`.
- Public surface shows projections and rankings only. Everything else —
  signals, metrics, methodology, NGS data, NGS metric names — stays internal.

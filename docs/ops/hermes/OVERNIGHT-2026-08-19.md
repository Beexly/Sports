# Hermes overnight orders — night of 2026-08-19

Orchestrator: the Claude Code session driving `claude/cron-config-placement-verify-qsl19t`.
Founder is asleep; standing delegation is in force. These orders are the queue.

## Loop protocol (all night)

1. `git fetch origin claude/cron-config-placement-verify-qsl19t` and read
   `docs/ops/AGENT_LEDGER.md` + this file from that branch (the ledger is NOT on main).
2. Work the lowest-numbered OPEN `L-` row assigned to `hermes` (L-8 → L-9 → L-10).
3. **Do not edit the ledger tonight** — the orchestrator is the single ledger writer
   until morning. Your pushed branch IS the completion signal; rows get flipped when
   the orchestrator integrates.
4. Blocked > 20 minutes on a task → write `BLOCKED.md` (what, why, what you tried) to
   that task's branch, push it, move to the next task. Never idle silently.
5. Every task's branch gets a terse `RESULTS.md`: what ran, exact row counts, where
   the artifacts are. Raw numbers over prose. No conclusions required — verdict
   synthesis happens on the orchestrator side with the C-14 code-path audit.

## Push grants (exactly these branches, nothing else)

- `hermes/l7-clv-forensics`
- `hermes/l9-clv-slices`
- `hermes/l10-provider-probes`

`git push -u origin <branch>`; on network failure retry 4x with 2s/4s/8s/16s backoff.

## Hard constraints (unchanged)

- DB access via the read-only role only; if anything would need a write, record it in
  `RESULTS.md` and skip.
- No full vitest runs on Windows (worker hang). No test edits needed tonight.
- Never print API keys, env values, or secrets — prices, lines, timestamps only.
- No production gate flips, no env changes, no cron changes.
- Source-rights registry (`apps/web/lib/scraping/source-rights-registry.ts`) governs
  every provider touch in L-10; `permission_required` and worse → skip entirely.

## L-8 — land the L-7 forensics artifacts

Commit `docs/calibration-proposals/2026-08-19-clv-forensics/{raw.json, ml-and-books.json, per-book.json}`
plus a `README.md` stating the exact recompute formulas used (SPREAD HOME lock−close /
AWAY close−lock; TOTAL OVER close−lock / UNDER lock−close; ML implied(close)−implied(lock),
ε=0.005) to branch `hermes/l7-clv-forensics`. Push.

## L-9 — CLV slices that settle the verdict (read-only SQL)

The L-7 spot-check proved the stored arithmetic honest (0/10 mismatches). What remains
is whether the INPUTS are market quotes or model output. Deliver, as JSON + terse MD on
`hermes/l9-clv-slices`:

1. **Decided-only beat rates** (exclude MATCHED) per market × sport × month, with
   Wilson 95% CIs. The headline 24.86% includes 324 zero-movement rows; the decided-only
   view is the one that can mean anything.
2. **TOTAL deep-dive** (the only market whose decided-only beat, 176/301 ≈ 58.5%,
   clears 52.4%): distribution of (close − lock) for OVER vs UNDER picks separately;
   beat rate by |close−lock| bucket; per-sport split.
3. **Lock provenance audit** — the decisive test: for 30 sampled graded picks
   (10 per market), join the stored lock price/line against the odds batch nearest
   `generated_at`. Classify each lock as (a) equals a single book quote, (b) equals the
   batch mean, (c) matches nothing in any batch → model-derived. This decides whether
   TOTAL 58.5% is market-vs-market (real candidate edge) or model-vs-market (artifact).
4. **ML monster-lock provenance**: for the 59 locks < −1000, does ANY odds batch for
   that game contain that price? Expected: none → model-derived, which would explain the
   entire −27.4pp ML mean as an artifact.
5. **Pub-vs-lock sign flips** (57/388 SPREAD): for each, pull the odds batches at
   generated_at and at clv_captured_at — did the favorite genuinely flip (runline moved
   through zero, movement is real) or is the lock the wrong side's number (artifact)?
   Count both classes.

## L-11 — verify the pasted affiliate-tooling research list (only if L-8/L-9 done first)

Founder pasted a DeepSeek research summary naming ~20 affiliate/partnership/
revenue-tooling repos. Read `docs/ops/edge/2026-08-19-affiliate-tooling-research-triage.md`
first — it explains why: several claims in that summary carry the classic
hallucination signature (hyper-precise unverifiable stats like "$0→$4M...
$20/mo... 14+ months" or "$16.02 revenue potential"). Nothing from that list
gets trusted or adopted until independently checked. Verify, don't summarize
what DeepSeek already claimed.

For each name below: search GitHub, confirm the repo/org actually exists,
record the real owner/org, star count, last-commit date, license, and
primary language — and flag if DeepSeek's description doesn't roughly match
what you find (wrong stack claimed, wrong feature set, or straight-up
doesn't exist).

Refferq · Income Generator Hub · MCP SuperAssistant Automation · SponsorFit ·
ClawMarketing / growth-os · GreenRobot Ad Server · VoucherBoost (Voucherswell) ·
OpenPartner (openpartner.dev) · xAmplify OpenSource PRM · Google Meridian ·
OpenAttribution · Inpact · Analytify · Droploop · mangosqueezy · Numok · Dub ·
PubliFlow · Cashier SaaS Metrics · Revenue Metrics Dashboard ·
prathammahajan/affiliate-management-system · cpanova/cpa-network

Output one table (name, exists Y/N, real URL, stars, last commit, stack,
verdict: real-and-matches / real-but-exaggerated / does-not-exist) to
`hermes/l11-affiliate-tooling-verification` (new branch, push grant same
rules as L-7/L-9/L-10). No adoption decisions — just ground truth.

## L-10 — free-provider live probes (only after L-9, if night remains)

Extends H-S. For each H-S candidate whose registry-compatible status allows it
(public docs, keyless or documented public key — e.g. TheSportsDB key `123`):
at most 2 live calls, record latency / response shape / rate-limit headers, classify
per the source-rights statuses. No signups, no credential creation, no adapters, no
scraping beyond documented API endpoints. Output one doc to `hermes/l10-provider-probes`.

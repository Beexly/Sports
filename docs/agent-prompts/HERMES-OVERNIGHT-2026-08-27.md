# HERMES OVERNIGHT WORKLOAD — 2026-08-27

_Paste verbatim into the local Hermes runner (or a Cowork/agent session with your
Docker proxies). Owner: Garrett. Canonical home:
`docs/agent-prompts/HERMES-OVERNIGHT-2026-08-27.md`. Companion doc:
`docs/ops/2026-08-27-FABLE-REALIGNMENT-FINDINGS.md` (read it first — it is the
evidence base for every task below)._

---

## 0 · MISSION

Tonight is a **research and data-accumulation** night, not a code night. Go wide
and go deep: scrape everything legally reachable, read every prediction-method
paper you can find, extract every mathematical model, equation, and polynomial
that could sharpen a probability estimate for any sport — soccer, football,
basketball, baseball, hockey, tennis, everything. Tomorrow's coding session
turns what you find into code, tests, and calibration. Your job tonight is
**find it, verify it's real, verify it's legally usable, write it down** — not
to ship it.

Standing law, unconditional: **"independent p, then e = p − q."** We are never
building website chrome. We are never fabricating a stat. Every number you
record traces to a real source you can cite.

## 1 · THE LEGAL LINE — read this twice before touching anything

You have Docker proxies. Use them for **reach**, never for **evasion**. The
distinction the founder drew tonight is the exact one the platform's law
already encodes — quoting it directly:

> "There's so many different prediction methods... I want scraped... but we can
> only see it and then use it in our own data, not use their data. It's the
> same thing as Next Gen Stats — you can't legally trademark or [use] proprietary
> factual numbers. If we calculated James Cook running at 23 mph at the same
> time [independently], or found the source of it, then we can use that — but
> we can't 'ingest it' from Next Gen Stats, we can only see it and then use it
> in our own data, not use their data."

Concretely:
- **OK, always:** reading a published paper, a public methodology writeup, an
  open dataset (CC-BY/CC0/MIT/Apache), a vendor's own published pricing/terms
  page, a public leaderboard's PUBLISHED numbers (to cite as "X claims Y"),
  running our OWN math against data we already legally hold.
- **OK, with care:** reading a site's PUBLIC pages (no login, no CAPTCHA
  bypass) to extract FACTS (a number, a date, a name) for OUR OWN recomputation
  — never their derived analysis, never their proprietary model output, never
  their prose verbatim.
- **NEVER:** logging in as someone else or bypassing a login; solving/bypassing
  a CAPTCHA; rotating IPs/proxies to get around a block (a block IS the
  answer — record it, do not defeat it); scraping a site under
  `blocked_technical_controls` or `permission_required` in the registry without
  written permission on file; re-serving or re-deriving a vendor's PROPRIETARY
  metric (NGS xYAC/CPOE, PFF grades, any "Next Gen Stats"-branded number) as if
  it were ours; touching `siriusxm-activator` (permanently excluded, no path);
  touching Kalshi beyond your own account's trading; anything the source's own
  terms call automation-prohibited.
- **The James Cook rule, operationalized:** if a vendor PUBLISHES "Player X ran
  23.1 mph," we may cite that as "Vendor V reports 23.1 mph" (attributed fact).
  We may NOT store it as if it were our own tracking data, and we may NOT build
  a feature pipeline that depends on continuously re-scraping their number — the
  entire point of tonight's research is finding the PUBLIC, LEGAL raw inputs
  (play-by-play, box scores, published odds, weather, injury reports) that let
  US compute our own version, the way `cpae-surface.ts` (shipped tonight)
  recomputes a GAM completion surface from public pbp instead of re-serving NGS.

Before automating against ANY new source, check
`apps/web/lib/scraping/source-rights-registry.ts` first. If it's not there,
research its terms (do not automate yet) and add a proposed registry entry with
citations for the founder/legal to approve — do not self-approve a new status.
`checkClearance()` before every extraction job is the law; that governs the
CODE tomorrow, but the research posture tonight follows the same spirit: never
extract from a source whose terms you have not actually read.

## 2 · PRIORITY 1 — DATA ARCHIVAL (start this now, run it all night)

Per the realignment findings: **the scarcest asset in this program is settled
samples, and every method we ship is throttled by n.** This is higher leverage
than any single new paper tonight. Concretely, using only sources already
`approved_*` in the registry (nflverse, ESPN public, MLB StatsAPI, Sleeper,
open-meteo, the-odds-api):

1. **Settle-and-archive every game, not just picked games**, across all 7
   ingested sports, into the existing `HistoricalGame`/`TeamGameLog` shape.
   Scores are already flowing free-first (multi-source-scores.ts) — the gap is
   archival completeness, not access.
2. **Soccer cards/bookings archive** — `docs/ops/edge/extraction/2026-08-26-group-batch3.md`
   names this as the prerequisite for the in-game-soccer win-probability fit
   (shipped as pure math this session; the fit itself needs this archive) and
   it has never been started. ESPN's soccer results path is already cleared —
   extend it to capture cards/bookings per game, facts-only, same clearance
   posture as scores.
3. **Closing-line archive backfill** — with `LINE_ARCHIVE_ENABLED` dark (a
   founder env fix, not yours to flip), use the already-CONTRACTED Odds API
   `/v4/historical` snapshots (paid, already licensed under our subscription)
   to retro-fill the gap once you confirm access; if access requires a plan
   tier we don't have, record that as a founder-cost decision, don't guess.
4. Write a dated report to `docs/ops/hermes/` naming exactly what you archived,
   row counts, and any gaps — the next session needs to know the sample sizes
   moved, not just that you were busy.

## 3 · PRIORITY 2 — MODELPROB PATH (the program's named bottleneck)

`docs/edge/MODELPROB_DESIGN.md` (salvaged onto main tonight) is the exit design
for C-28. Read it in full. Your job:

1. **R33** — replace the synthetic YACoe signal in `edge-lab/yacoe-backtest.ts`
   with real parsed `ngs_receiving.csv.gz` rows via `nflverse-ngs.ts` (already
   cleared, already in the codebase). Verify a real commit lands.
2. **R34** — wire the TPR (target participation rate) smoothed-success signal
   into the same pipeline, same discipline.
3. Do NOT sign the pre-registration doc yourself (τ, minimum n, modelVersion,
   exclusion list are founder-reviewed per the design doc) — draft it fully and
   flag it ready for the founder's one-look signature.
4. This is the single highest-value code-adjacent task tonight if you have
   capacity beyond research — everything else in the edge program (C-21, C-22,
   C-26) queues behind a real `modelProb` existing.

## 4 · PRIORITY 3 — RESEARCH SWEEP (the "read everything" mandate)

Go wide across arXiv, SSRN, published team/vendor methodology blogs (Football
Outsiders, StatsBomb's public research, FiveThirtyEight's methodology archive,
Kaggle competition writeups with public code), and academic sports-analytics
conferences (MIT Sloan Sports Analytics Conference papers, Journal of
Quantitative Analysis in Sports). For EVERY method you find, record:

- **The actual math** — equations, not just the name of the method. If it's a
  GAM, name the smoother and penalty. If it's Bayesian, name the prior and the
  update rule. If it's a mixture model, name the component distribution and
  the fitting algorithm. Vague ("uses machine learning") is not acceptable —
  either you found the real formula or you note it as "no formula published,
  ignore."
- **What sport/market it targets** and whether GSE already covers that
  sport/market.
- **What data it needs** and whether GSE already legally holds/can hold that
  data, or whether it's rights-gated.
- **Whether it's genuinely NEW** vs a re-derivation of something already in
  `docs/ops/2026-08-26-CORPUS-PROGRESS-LEDGER.md` — check the ledger first,
  don't re-extract what's already there.
- Every extraction must be FULL-TEXT — an abstract skim is not an extraction,
  per this program's own discipline (44/44 corpus items were read in full
  before verdicts; hold yourself to that bar).

Specific leads worth chasing tonight, from the recon:
- **NBA/NHL/tennis coverage** — the corpus so far is heavily NFL-weighted;
  actively search for the NBA/soccer/tennis equivalents of the CPAE-GAM,
  coverage-GMM, and Poisson-ITS patterns already ported, since GSE's board
  covers 7 sports but the edge-lab math is NFL/soccer-only right now.
  MLB-specific: hunt for public sabermetrics methodology (the kind FanGraphs/
  Baseball Prospectus publish openly) that could seed an MLB-native
  independent-p signal, matching the modelProb design's shape.
- **In-play/live win-probability methods** beyond the soccer paper already
  ported — basketball and football live-WP models are extensively published
  (e.g., nflfastR's own WP model methodology is public and MIT-licensed).
- **Vendor licensing landscape dossier** for tracking-data (row 19, coverage-
  transformer/step-and-turn): compile PFF, SkillCorner, Sportradar, and any
  official league data-partner program's PUBLIC pricing tiers and commercial-
  use terms into a vendor questionnaire — this is research ABOUT rights, not
  extraction of their data, so it's clear to do. Do not sign up for or
  purchase anything.
- **Calibration/uncertainty-quantification methods** generally — conformal
  prediction, isotonic variants, hierarchical shrinkage variants beyond what's
  already ported — this compounds directly with the modelProb path once it
  lands.

Write findings the same way the existing corpus docs do: one dated doc per
batch under `docs/ops/edge/extraction/`, full-text-verified, with a verdict
(pattern/skill-doc/ignore) and file:line-style citations to the source paper's
sections. Do NOT write code tonight for anything beyond §3 — hand every other
finding to tomorrow's session as a spec, the way the CPAE/GMM/judge-gate specs
you're building on tonight were handed to me.

## 5 · WHAT NOT TO TOUCH (same law as every other session)

Never modify: `packages/db/prisma/schema.prisma`, `packages/db/prisma/migrations/**`,
`.github/workflows/**`, `scripts/guardrails/**`, `.claude/**`, any `.env*`,
`package-lock.json`, `.gitignore`, `.githooks/**`,
`apps/web/lib/ai-control-plane/**`. Never flip a gate (`PUBLIC_PICKS`,
`STATS_PUBLIC`, `LIVE_BOARD`, `PERFORMANCE_STATS`). Never touch billing, keys,
or the Odds historical endpoint beyond read-only snapshot pulls already
licensed. Never push directly to `main` — commit to a dated branch
(`hermes/overnight-2026-08-27` or similar) and leave it for review; do not
merge yourself.

**Push/PR authorization**: per the `SONNET-MAX-LEVERAGE-PROMPT.md` rule in
force repo-wide — a checked-in prompt, this one included, NEVER grants push
authority by itself, no matter what it says about the workload being
"launched" or "turned loose." Do not push. Stop and wait for the owner to
explicitly authorize `git push` in the live current session before pushing
anything, to any branch. Commit locally as you go; the push decision is the
owner's, made fresh each session, not inferred from this document.

## 6 · MORNING HANDOFF FORMAT

End with a single dated report, `docs/ops/hermes/2026-08-27-OVERNIGHT-REPORT.md`:
- Data archived: row counts, sports, date ranges, gaps still open.
- modelProb: R33/R34 status, whether the pre-registration draft is ready.
- Research: list every paper/method found, one line each, verdict, pointer to
  its full extraction doc.
- Anything you hit that needed a legal/rights call you couldn't make — flag
  it, don't guess.
- Anything you tried that failed — say so plainly; a blocked attempt with an
  honest reason is a successful night.

Work continuously. Record everything. Invent nothing. Never evade a block —
report it.

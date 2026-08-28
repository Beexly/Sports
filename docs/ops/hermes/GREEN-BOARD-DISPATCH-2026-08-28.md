# HERMES DISPATCH — GREEN BOARD G-1 (2026-08-28)

Mission context: `docs/strategy/GREEN-BOARD-DOCTRINE.md` (read first, 5 min).
Verified math basis: `docs/ops/calibration/2026-08-28-res-night-verified/`
(RESULTS.md + VERIFICATION.md — cross-model replicated; treat as ground truth).

Branch: `hermes/green-board-1` off LATEST main (`git fetch origin main` first —
your clone has been stale twice). One task = one commit. Verify block before
every commit (typecheck 0 · lint 0 · task's tests green). Every task ends in
**code + tests + numbers, or BLOCKED with the exact error** — a markdown file
with no code is a failed task. Two attempts, then BLOCKED, move on.

HARD RULES (unchanged): no schema.prisma/migrations, no gate/env flips, no new
data sources, no scraping, docs edits only where a task says so. Probabilities
come ONLY from the verified de-vig path — reference implementation:
`docs/ops/calibration/2026-08-28-res-night-verified/res_backtest.py` (devig
formula + orientation check). If any number you produce is worse than
coin-flip for a market-derived quantity, STOP — that is a bug alarm, not a
result.

## GB-1 — the predicate (pure, tested)

New file `packages/prediction-engine/src/green-board.ts`:

```ts
export const GREEN_P_MIN = 0.70;          // board average target ≥ 0.72
export const INDEPENDENT_DISSENT_BAND = 0.06; // independent > 6pts under p* = veto
export interface GreenGateInput { calibratedP: number; bookmakerCount: number;
  freshnessOk: boolean; independents: { elo?: number|null; poisson?: number|null;
  fpi?: number|null }; vetoFlags: readonly string[]; }
export interface GreenGateResult { green: boolean; reasons: readonly string[]; }
export function greenBoardEligible(input: GreenGateInput): GreenGateResult
```

Semantics: G1 p ≥ GREEN_P_MIN; G2 bookmakerCount ≥ 2 && freshnessOk; G3 any
present independent more than DISSENT_BAND below calibratedP → veto (absent
independents are NOT a veto and NOT a boost); G4 vetoFlags empty. reasons[]
names every gate that failed (or ["GREEN"]). Pure function, no I/O.
Tests (table-driven): boundary 0.699/0.700; dissent at exactly the band edge;
each veto flag; missing independents; 1-book veto; stale veto.

## GB-2 — SITREP v1 hard vetoes (pure extraction from existing covariates)

New file `packages/prediction-engine/src/sitrep-vetoes.ts`: pure function from
the fields the pipeline already computes (enrichGameContext / covariate bus /
odds snapshots) to `{ flags: string[], provenance: string[] }`. v1 flags only:
`REST_DEFICIT` (rest differential ≤ −2 days), `QB_OUT` (starting QB out/doubt
from injuries data when available), `HIGH_WIND_TOTAL` (wind > 20mph, totals
picks only), `REVERSE_LINE_MOVE` (line moved opposite the price-implied
direction between OPEN and latest snapshot when both exist). Absent data =
no flag (honest miss), never a guess. Tests per flag + absent-data cases.

## GB-3 — read-side GREEN lane (ZERO persistence changes)

Green is COMPUTED, never stored: wire the predicate read-side so
`/api/picks?lane=green` (and the board query layer) filters published picks
through greenBoardEligible using persisted fields (confidence/trueProb path
for calibratedP — use the SAME resolver calibration-metrics uses;
bookmakerCount; freshness; independents from PickSignalSnapshot where present).
Entitlements unchanged: FREE sees yesterday's settled greens, paid sees today's
(reuse existing tier filters — do not touch entitlement logic itself).
Tests: route-level, green filtering + tier behavior unchanged.

## GB-4 — the retro-record (THE MONEY TASK)

Read-only script `scripts/ops/green-board-retro.ts`: run greenBoardEligible
retroactively over ALL settled published picks (same read-side field mapping as
GB-3), and report — overall and per sport|market: candidates, greens fired,
realized win rate, Wilson 95% CI, average calibratedP (expected rate), and
realized-vs-expected gap. PRE-REGISTERED: report whatever it says, including
"greens underperform their p" — that result redirects G4 tuning and is
valuable. Output to
`docs/ops/calibration/2026-08-28-green-retro/RESULTS.md` with the run log.
DO NOT tune thresholds to make the retro look good — thresholds are fixed
above; the retro MEASURES them.

## GB-5 — Green Board surface v1

`apps/web/app/green/page.tsx` (server component, existing design tokens):
today's greens for entitled users (each with p*, books, reasons/SITREP flags),
yesterday's settled greens for everyone, and the record ticker: realized win
rate WITH Wilson CI + n + average expected rate, from GB-4's same computation
(shared lib function, not copy-paste). All copy must pass trust-gate —
no "guaranteed", no win-rate CLAIMS in prose; the ticker is a ledger readout
labeled "record in progress" until the check-claims floor. States: empty board
("no green today — the gates said no, that is the product working") rendered
honestly.

## PHASE D — SIMPLICITY OVERHAUL (founder directive 2026-08-28; start after GB-1..GB-4, or in parallel if a second session)

Founder's law for the public site, verbatim in spirit: **"Simplicity first,
complexity behind doors. Tell them the play. Let the picks and the record do
the talking."** The paying demographic skews older: they want to be told what
to do, in plain words, big type, one action per screen — with a door to go as
deep as they want. Today the site says everything at once and therefore says
nothing. Prior design docs (docs/design/*) are HISTORY where they conflict
with this phase — this section supersedes on public-surface direction.

Operating psychology (apply to every touched page, no exceptions):
- **5-second test**: a stranger must be able to say what this page wants them
  to do within 5 seconds. If not, cut until they can.
- **One primary action per screen** (Hick's law). Everything else is a quiet door.
- **Progressive disclosure**: every module renders its VERDICT in one line
  ("Chiefs ML — GREEN — 74%"), with a "show me why" expansion for the SITREP/
  depth. Simple → complex, never the reverse.
- **Don't make me think**: no unexplained jargon on public pages. De-vig,
  Brier, kernel, covariate, conformal → banned from public copy; they live in
  one place, "The Math Room" (the depth door for people who want it).

### D-1 — remove the bottom walkthrough widget ("Nova")
Locate the assistant/walkthrough widget mounted at the bottom of public pages
(search: nova). UNMOUNT it from all public layouts (delete the usage; keep the
component file if other code imports it). In its place in the hero: a
**welcome-video slot** — poster frame + play button component
(`components/welcome-video.tsx`), file paths read from config, rendering a
clean "coming soon" poster state until the founder supplies the real video
(a human in a GSE shirt — founder is producing this; do NOT generate video,
do NOT re-add any chat/walkthrough widget).

### D-2 — information architecture: five doors, one voice
Public nav collapses to at most FIVE doors: **Today's Picks · The Record ·
How We Prove It · Pricing · Learn**. Every existing public page either lives
behind one of those doors or gets a redirect into one. Homepage above the
fold = exactly: today's headline (the board state in one sentence), the record
ticker, ONE call to action. Nothing else above the fold. Merge/condense
overlapping sections aggressively — target: cut total public routes in nav and
words-per-page by ≥50% on every touched page. Keep every deep tool reachable
(the research crowd matters) — but as destinations behind doors, never as
homepage noise.

### D-3 — copy diet
Rewrite touched public copy in the house voice: short declaratives, second
person, tell-them-the-play ("Today's strongest play. Here's why. Here's the
record."). Reading level ~grade 7 on public surfaces. Numbers do the talking;
adjectives die. All copy passes trust-gate + check-claims (unchanged law).

### D-4 — type & contrast for the real demographic
Base body ≥17px on public pages, generous line-height, strong hierarchy,
WCAG AA contrast minimum everywhere (run the repo's contrast/states/ui-audit
skill checklists as the method). Motion minimal; nothing auto-animating in
the reading path.

### D-5 — palette & branding proposals (founder picks, then apply)
Founder has opened the door to full rebrand. Do NOT repaint unilaterally:
produce THREE token-level palette/typography proposals as static preview
pages (one route, flag-gated, not linked publicly): (a) refined current
identity, simplified; (b) "broadsheet trust" — light-first, high-contrast,
newspaper-calm for the older demographic; (c) "stadium prime" — dark-first,
bold, broadcast energy. Each shows the same homepage mock. Founder chooses;
THEN tokens change globally (design-tokens pattern — one source, no scattered
hex). Structure/copy/nav work above does not wait on this choice.

### Phase D definition of done
Nav ≤ 5 doors · homepage passes the 5-second test · touched pages ≥50% fewer
words · no banned jargon outside The Math Room · welcome-video slot live with
poster state · Nova unmounted · AA contrast on touched pages · trust-gate,
check-claims, full web suite green · before/after screenshots for every
touched route in the PR description.

## Definition of done (whole dispatch)

Suites green in both touched packages + apps/web tests for new routes;
typecheck 0; GB-4 RESULTS.md with real numbers; ledger rows per rules; push
`hermes/green-board-1`. Claude then verifies GB-4 clean-room (independent
re-implementation over the same picks) before any number is believed or
displayed — same rule applied to everyone's numbers, no exceptions.

# Red-team audit — overnight 2026-09-26/27

Reviewer role: adversarial cleanup behind the live overnight lanes (grok-reasoning,
night-lane2, overnight A/B). Findings below are measured from commands run in
`C:\Users\Garrett\Sports-wt-redteam` on branch `redteam/overnight-audit-2026-09-27`
unless a lane path is named. Nothing here is a claim about work I did not open.

## Severity legend

- **P0** — a lie on a public or provenance surface, or a guard that fails open
- **P1** — will break the night or silently corrupt a record
- **P2** — process rot that burns tokens or forks truth across lanes

---

## P0-1 Public copy claimed market independence that Session A disproved

**What the copy said**

- `apps/web/app/pricing/page.tsx` fallback: confidence "is not part of the
  market-implied measurement."
- `apps/web/lib/feature-gates` / pricing catalog: confidence framed as an
  independent "estimate of how strong, stable, and supported a signal is."
- `apps/web/lib/trust-claims.ts` `methodology.confidence-presentation` implied
  the score ranks board value independently of the book.

**What the code does**

Session A (`Sports-wt-on-0927-A`, `b95faf9fb`) measured the opposite:

- `scoring.ts` `fairProb = removeVig(...)` is the same `marketFairProb` the
  proof receipt commits, and it is added into the confidence sum via
  `computeEdgeScore`.
- `mlFairProbHome` drives `computeCrossMarketScore` (±4 / −3) into the same sum.
- `scoring.ts:1219` documents it: "heuristic confidence stays as the
  market-echo composite for UX continuity."
- Fixture: `marketFairProb` 0.5000 → 0.3957 on an identical bet moved
  confidence 57 → 50. H2H agree → oppose moved 61 → 54.

So confidence is **not** a win probability (true) **and not** independent of
market-implied input (the copy was false). A competitor or a careful user who
reads the leak test will eat us alive on this.

**Fix landed here**

- Pricing fallback, `confidence` feature explanation, `trust-claims`
  `methodology.confidence-presentation`, and `MARKET_IMPLIED_CALIBRATION_CLAIM`
  now say the score is a ranking composite that includes market context.
- Phrase pins that the copy-guard tests require were preserved
  (`Confidence is a ranking score`, `settled two-way moneyline picks`,
  `fixed at publish time and committed to the pick's proof receipt, never
  recomputed`).
- Copy-guard suites re-run: `public-copy-plain-language`, `market-implied-display`,
  `states-matrix-slice`, `pricing-value-architecture` — **63 passed**.

**Still open (product, not copy):** the scorer still adds market-derived terms
into a number the UI shows as model opinion. Session A correctly refused to
hotfix a shared hot path overnight. Until the scorer is split, every surface
must keep the composite disclosure.

---

## P0-2 Loop log wrote `commit: null` next to real SHAs

**Measured**

`data/reasoning/overnight-loop.jsonl` (grok lane) cycles 0–5 all say
`"commit":null`. `git log 87d727475..HEAD` on that worktree shows real commits
for those slices:

| slice | commit on disk | loop claims |
|---|---|---|
| verify-files | `c7a0bce50` | `null` |
| audit-bridge-premises | `d95907a18` | `null` |
| production-guards | `99640b5b6` | `null` |
| decision-time-archive | `74d67b64e` | `null` |
| clear-typecheck-baseline | `bae2ef459` | `null` |

Session A's loop has the same pattern (`"commit":null` on cycles that landed
`7cdf3aebe`, `b5b5b14f3`, `f7dd219d1`, `b95faf9fb`).

This is exactly AGENTS.md law 4 ("Do not write a claim you did not observe")
violated on the durable provenance record. After compaction an agent re-reads
this file to decide what exists. A null SHA is a free pass to redo work or to
claim a commit never happened.

**Root cause**

`scripts/overnight/log-slice.mjs` accepted `--commit` as free text and defaulted
it to `null`. Nothing resolved `git rev-parse HEAD` and nothing refused a bare
null. Agents either forgot the flag or wrote the JSON by hand.

**Fix landed here** (`scripts/overnight/log-slice.mjs`)

- Omitted / `auto` / `HEAD` resolves `git rev-parse HEAD` and stamps the SHA.
- `none` / `null` requires `--commit-reason`. A bare null is rejected.
- A SHA-shaped value must `git cat-file -e` in the target root.
- A `PASS` slice with no resolvable HEAD and no reason is rejected.

**Self-test (commands run here)**

- `--cycle 999 --slice redteam-harness-selftest` with no `--commit` wrote
  `"commit":"bae2ef459eb412faeff0b08cd6865f18687552fc"`.
- `--commit none` without reason: exit 2, refusal message.
- `--commit deadbeef...` (40 hex, not in repo): exit 2, "not a commit".

**Not done (append-only):** historical loop lines were not rewritten. The lie
stays in the frozen record; the writer can no longer produce it.

---

---

## P0-3 Two lanes forked slice 5 into incompatible on-disk layouts

**Measured 2026-09-26 23:48 local**

| lane | rosters | snaps | participation | manifest |
|---|---|---|---|---|
| grok-reasoning (LIVE) | **one** `rosters.jsonl` 404653 rows / 84 MB | **one** `snap-counts.jsonl` 205355 / 47 MB | `participation-YYYY.jsonl` × 8 | 11 datasets |
| on-0927-A | `rosters-YYYY.jsonl` × 8 | `snap-counts-YYYY.jsonl` × 8 | `participation-YYYY.jsonl` × 8 | 27 datasets |
| on-0927-B | **still the 2024–2025 pair** | same | same | original |
| redteam (this branch) | 2024–2025 at `bae2ef459` | | | |

The work order says split by season only when a file would exceed 90 MB.
Participation at 8 seasons would; rosters (84 MB) and snaps (47 MB) would not.
**Grok's layout is the compliant one.** Session A over-split everything.

Session B's prompt currently teaches A's names (`read rosters-2024.jsonl, not
rosters.jsonl`). If grok commits first, Session B will look for files that do
not exist. If A's layout lands first, grok's `join-report.json` and ingest
manifest point at paths that vanish.

Both lanes also independently wrote `packages/data-ingestion/src/nflverse/joins.ts`
(grok 37 KB + `joins.test.ts`; A has its own pure joiner + 26 tests). Same
night, two joiners, two report schemas, two row-count conventions.

**Fix required (owner or a single designated lane — not both):** pick grok's
file layout, delete the duplicate joiner, and rewrite SESSION-B-PROMPT's
CURRENT TRUTH file names. Do not merge two manifests.

---

## P0-4 Pre-2023 participation cannot join to rosters — and one report hides it

Both joiners independently measured the same structural fact:

- 2018–2022 `players_on_field` carries bare numeric ids (`44987`, …).
- 2023–2025 carries GSIS ids (`00-0030000`, …).
- The two spaces share **no key**. Crosswalk is not on disk and inventing one
  is FORBIDDEN.

Consequence: participation→roster id match rate is **0% for 2018–2022** and
**100% for 2023–2025**. The blended 0.3797 is not a coverage shortfall — it is
five seasons of structurally unjoinable rows.

Session A's `join-report.json` says this out loud under
`identifier_compatibility`. Grok's report buries it: top-level
`participation_personnel.matchRate` is **1** (play-level "we looked at this
play"), next to `idMatchRate: 0.3797`. An agent skimming the summary sees a
perfect join and fits a personnel model on 2018–2024.

**Any slice-7 measurement that derives a roster/personnel feature from
participation must train only on 2023–2025, or report `NOT_EVALUATED` for the
numeric-id seasons.** A fit that treats unmatched as "player absent" is
invented data.

---

## P1-1 `entryOdds` guard accepted the launch audit's own `-10533` class

**Measured**

`isPlausibleEntryOdds` only enforced `|odds| >= 100`. The decision-time archive
test literally asserted `-10533` **resolves ok**. The work order called
extremes "a separate bug" and walked past them.

`-10533` is not a two-way book price on any NFL/MLB/NBA/NHL screen we ship. It
is the same failure mode as the 199 poison rows: a line or an id in the price
slot. CLV or record math against that number is garbage.

**Fix landed here**

- `ENTRY_ODDS_MAX_ABS = 10000` on `pick-proof-receipt.ts`.
- `isPlausibleEntryOdds` requires `100 <= |odds| <= 10000`.
- `decision-time-price-archive.ts` `validAmericanPrice` mirrors the band.
- Tests: `-10533`, `10533`, `-20000`, `MAX_SAFE_INTEGER` rejected; `±100`,
  `±10000`, `-110` accepted. Boundary `-10001` rejected.
- Re-ran `pick-proof-receipt` + `decision-time-price-archive`: **35 passed**.

Mint still goes through the write-path gate only (frozen rows still re-derive).
No historical row was touched.

---

## P1-2 Season-extension slice is uncommitted and will brick `verify-files.mjs`

**Measured**

`Sports-wt-grok-reasoning` has uncommitted edits to
`rows.ts` / `rows.test.ts` / `ingest.ts` / `extract_fourth_down.py` widening
`INGEST_SEASONS` to 2018–2025. The loop's `next` is still `extend-seasons`.

`scripts/overnight/verify-files.mjs` hardcodes the **2024–2025** sha256 / bytes /
rows table from CURRENT TRUTH. The moment slice 5 lands new JSONL, that script
will fail against a correct ingest and an agent will "fix" it by overwriting
data or by loosening the check.

**Also in the uncommitted diff (reviewed, not owned):** `extract_fourth_down.py`
records a missing season as `refused["season_unavailable_{year}"] += 1`. The
manifest invariant is `read == kept + refusal sum`. A season-level counter in a
row-refusal map will desync that invariant unless the writer special-cases it.
Slice 5's owner must either keep those keys out of the refusal sum or count
rows, not seasons.

**Recommendation (not landed — concurrent writer owns those files):** make
`verify-files.mjs` read `data/gse-dataset/nflverse-ingest-manifest.json` for
expected rows/bytes/sha256 instead of a frozen table, and treat a hash mismatch
against the **manifest** as the stop condition.

---

## P2-1 Session B prompt teaches the next agent to leave a fixable typecheck red

`Sports-wt-on-0927-B/docs/reasoning/SESSION-B-PROMPT.md` says the three TS2532
errors at `part-selector.ts:99` are pre-existing, "leave it alone, report
BLOCKED". Grok lane already fixed them in `bae2ef459` (`map` instead of index,
no `any`, no non-null assertion) and kept the scalarizer arithmetic identical.
Session A also filed a blocker on the same errors.

Two lanes institutionalised a broken build while a third quietly fixed it.
**Never write "pre-existing, leave it" without a `git blame` and a one-line
patch.** That is how a five-error baseline becomes a fifty-error baseline.

---

## P2-2 Three harnesses, three loop conventions

| lane | harness | loop shape |
|---|---|---|
| grok-reasoning | `scripts/overnight/{log-slice,verify-files,scan-modules,scan-features}.mjs` | no `session` field |
| night-lane2 | copy of the same four scripts | told to use `OVERNIGHT_ROOT` temp |
| on-0927-A/B | `scripts/overnight/{hash-jsonl,scan-grains,scan-modules,verify-shape,audit-bridge-premises}.mjs` | `session: "A"` field |

Same night, three hashers, two feature scanners, two module scanners. None of
them share a schema. The red-team fix to `log-slice.mjs` is on the redteam
branch; the other copies still default `commit` to `null`.

**Recommendation:** one `scripts/overnight/` package on `main`, one loop schema
(`session` optional), and every lane points at it. Forking the harness is how
P0-2 happened three times in one night.

---

## P2-3 Queue discipline drift

Work order says: do the `next` on the last loop line. Grok's cycle 5 recorded
`clear-typecheck-baseline` (not a queue item) with `next: extend-seasons`.
Session A cycle 5 did `production-guards/confidence-inversion` with `next:
extend-seasons`. Nobody has started slice 5 on a committed branch. The night is
half a queue deep and the measurement slices (7–10) are untouched.

Not a bug in isolation — but combined with `commit: null` there is no reliable
answer to "what actually shipped tonight?"

---

## What I verified is actually good

Do not "fix" these; they held up under the audit.

- Five nflverse grain hashes match CURRENT TRUTH (independently re-checked by
  both lanes; verify-files streams, does not load participation whole).
- Decision-time price archive: append-only, validates before write, refuses a
  caller-supplied edge that disagrees with `p - q`, `priced` stays false, tests
  write only to temp. **21/21**.
- `entryOdds` poison-band write-guard exists at `pick-proof-receipt.ts:165` and
  the backfill path was closed by grok. Frozen 199 rows correctly left alone.
- Reasoning suite after the typecheck fix: **12/12**, scalarizer arithmetic
  unchanged.
- Bridge-premises audit is honest: 6955 is the training N, not a per-game
  sample; writer is `scripts/run-bridge.mjs`; holdout is 2025-only; file
  correctly kept out of `aggregateSignals`.
- `from-bridge.ts` / `reasonAbout` exist and the prompt's "there is no
  from-bridge" was wrong — Session B's correction is right.
- Public surfaces generally already say confidence is not a win probability
  (`trust-claims`, dashboard aria, FAQ, `pModel` retirement). The gap was
  market independence, not probability labelling.
- No push, no gate flip, no frozen-row rewrite, no `priced: true` anywhere I
  looked.

---

## Independent test evidence from this reviewer

| suite | result |
|---|---|
| `pick-proof-receipt.test.ts` + `decision-time-price-archive.test.ts` | 35 passed (after P1-1) |
| `part-selector` + `live-edge-registry` + `part-reading` | 12 passed |
| `nflverse/rows.test.ts` | 4 passed |
| `public-copy-plain-language` + `market-implied-display` + `states-matrix-slice` + `pricing-value-architecture` | 63 passed |
| `log-slice.mjs` self-test (auto SHA / bare null / fake SHA) | pass / refuse / refuse |

---

## Next honest attacks (for whoever picks this up)

1. Land a manifest-driven `verify-files` **before** slice 5 overwrites the JSONL.
2. Split confidence into `marketEchoScore` (labelled) and a pure model rank, or
   strip the market channels from the published number. Copy is now honest;
   the number is still composite.
3. Reconcile the three harnesses onto one schema; delete the copies.
4. Rebuild the overnight prompt's CURRENT TRUTH from `git rev-parse` at launch
   time. Every stale SHA in that file has already caused one wrong stop.
5. Slice 7 (narrative / coaching walk-forward) is the first real measurement
   still owed. Do it with the extended seasons, not the 2024–2025 pair.

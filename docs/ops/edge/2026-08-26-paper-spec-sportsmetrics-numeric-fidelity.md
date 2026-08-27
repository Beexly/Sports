# Paper spec — arXiv:2402.10979 · SportsMetrics: numeric-fidelity evals for the content layer

**Source:** Hu et al. (UCF / Tencent AI Lab / Emory), "SportsMetrics: Blending
Text and Numerical Data to Understand Information Fusion in LLMs,"
arXiv:2402.10979v2, 16 Jun 2024. Full text fetched and read 2026-08-26 (PDF,
12 pages).

**Feeds:** EDGE-PATH §3 ops lane ("SportsMetrics-style adversarial
numeric-fidelity evals for the Claude content layer — no fabricated stats,
tested") and non-negotiable rule #2.

---

## 1. Method (as extracted)

### 1.1 Data construction (their §3, §4)

- NBA + NFL play-by-play from ESPN.com archives: 28,492 NBA and 5,867 NFL
  games, 2002–2023; 100 randomly selected test games per sport.
- Per game: timestamped plays, team-player affiliation table, box score
  (ground truth). Scoring actions and running totals are withheld from the
  model. Avg NBA game 466 plays / 6,229 tokens; NFL 173 plays / 6,166 tokens;
  max 7,322 / 7,659 tokens.
- Long-context models get the whole game in one prompt; 4k–8k models get it
  quarter-by-quarter, with per-quarter JSONs summed afterwards.

### 1.2 The four task designs

1. **Long-form game narratives (§3.1)** — model receives full play-by-play +
   roster table and must populate a null-initialized JSON of key stats. NBA:
   11 tracked stats (team points, FGM, FGA, FTM, FTA, off/def rebounds,
   steals, assists, blocks, personal fouls; turnovers excluded — PBP doesn't
   reliably carry them, box-score value used when the composite needs it).
   NFL: passing yards, TDs, INTs, completions, attempts.
   Composites for one-number comparison (their Fig. 3):
   - Hollinger Game Score = PTS + 0.4·FGM − 0.7·FGA − 0.4·(FTA−FTM)
     + 0.7·OREB + 0.3·DREB + STL + 0.7·AST + 0.7·BLK − 0.4·PF − TO
   - NCAA Passing Efficiency = (8.4·Yards + 330·TD − 200·INT + 100·COMP)/ATT
2. **New scoring rules (§3.2)** — every scoring action worth exactly 1 point,
   contradicting the model's parametric knowledge; ground truth = count of
   scoring actions per team. Tests whether provided rules beat priors.
3. **Player swapping (§3.2)** — swap n players' team affiliations in the
   roster table only; play-by-play text untouched; ground truth = team totals
   re-summed under the new affiliations. Main runs: 2 players per team;
   difficulty scales with n (their Fig. 7 middle). Variant: replace n player
   names with science-fiction characters (their Fig. 7 right) — **renaming
   significantly degrades every model**, i.e. models lean on memorized player
   priors instead of reading the provided data. This is the single most
   important finding for us.
4. **Shuffling play-by-plays (§3.3)** — basketball only (order-invariant
   totals): with probability p ∈ {−50%, −20%, 0, +20%, +50%} remove (negative)
   or duplicate (positive) non-scoring plays, then shuffle; timestamps keep
   original order. Totals are invariant by construction; deviations measure
   noise robustness. Adding non-scoring filler hurts more than removing it.

Plus a fifth, planning-flavored task (§3.4): fill blanked-out numbers in a
journalist game recap via an explicit working-memory protocol — (a) init JSON
memory with null team points, (b) enrich with needed stat fields,
(c) self-reflect on sufficiency, (d) populate from PBP, (e) fill the blanks
from memory only. Scored by exact accuracy; best model 16.72% (Claude-2.1).

### 1.3 Scoring (their §4)

- Primary metric: **average absolute deviation Δ** between model output and
  box-score ground truth: ΔPoints, ΔGScore, ΔNewRule, ΔSwap, ΔShuffle (NBA);
  ΔYards, ΔATT, ΔCOMP, ΔTD, ΔINT, ΔPE (NFL). Lower is better; no tolerance
  band — deviation is reported raw.
- Recap-fill task: exact-match accuracy (%).
- Headline results: best ΔPoints 9.45 (GPT-3.5-1106) vs team totals of
  100–120 — even the best models drift; GPT-4-1106 returned 79% zero/null
  JSONs on long games; standard-context models deviate by 70–100+ points.

---

## 2. Data required vs data GSE has

| Paper needs | GSE equivalent | Status |
|---|---|---|
| ESPN play-by-play corpus | **NOT USABLE** — ESPN is not a cleared source; collecting PBP for this benchmark would violate our scraping posture | SUBSTITUTE (see below) |
| Ground-truth box scores | Settled scores + odds snapshots from The Odds API (`approved_api`); nflverse aggregates (cleared, already used by fantasy/props) | HAVE |
| Roster/affiliation tables | nflverse aggregates; our own structured pick/game records | HAVE |
| LLM under test | The Claude content layer itself (`workers/content-publishing`, `apps/web/lib/content/workflow.ts`) — we evaluate OUR pipeline, not a model zoo | HAVE |
| Eval harness | `npm run agent:eval` (`scripts/agent-eval/run.mjs`) — thin, offline, predicate-based, exit 0/1 | HAVE (extend) |

The substitution is the point: we do not need ESPN's corpus, because the task
under test is not "track 466 plays" — it is "does GSE's generated copy contain
any number or attribution not present in the structured input we gave it."
Our own structured records are the corpus, and they are fully rights-clean.

---

## 3. Port plan — GSE numeric-fidelity eval suite

Target: `scripts/agent-eval/numeric-fidelity/` + pure library
`apps/web/lib/content/numeric-fidelity.ts` (strict TS, unit-tested). Two
lanes, mirroring the existing offline-first law:

### Lane A — deterministic, CI-safe (no LLM, runs in `npm run agent:eval`)

**A1. Numeral-source checker** (the core deliverable). Pure function:

```ts
interface SourceFacts { readonly numbers: readonly SourcedNumber[]; /* value, unit, aliases (e.g. -3.5 vs "3.5-point favorite"), derivable combos */ }
function auditNumerals(copy: string, facts: SourceFacts): NumeralAudit
// every numeral token in generated copy must be: (a) present in facts,
// (b) derivable by a whitelisted transform (odds→implied %, spread sign flip,
//     units/records like "7-2"), or (c) whitelisted boilerplate (dates, tiers).
// Anything else = FABRICATED — hard fail.
```

**Shipped-vs-spec gap (CodeRabbit finding, not yet closed)**: the shipped
`numeric-fidelity.ts` simplified `SourcedNumber` to a flat `readonly
number[]` — membership-only, no entity/field scoping. That means a
fabricated claim about entity A can pass by coincidentally matching entity
B's real number for a different field. Flagged in-code as a known gap; do
NOT wire this module into any live publishing path until it's scoped by
(entity, field) as this section originally specified.

This extends the `check-claims` skill from claims-language into numbers, and
enforces rule #2 mechanically. Run it over: recap/blog fixtures with recorded
LLM outputs, and (behind the existing publish pipeline) as a runtime guard in
`workers/content-publishing` before any post ships — same "review" severity
channel `content-safety.ts` already uses for overclaims.

**A2. Adversarial fixture generators** (pure, seeded — build the paper's four
perturbations over OUR records):

- `swapEntities(record)` — swap home/away teams, or player↔team attribution in
  the structured input (paper task 3). Expected copy must follow the input.
  Detects prior-leakage: the model "knowing" the real result and ignoring our
  data — exactly the renaming finding, and exactly the failure that would make
  GSE publish a fabricated stat.
- `mutateRule(record)` — perturb a line by ±0.5, flip an O/U result, change a
  final score by 1 (paper task 2). Copy must reflect the mutated input.
- `injectNoise(record, p)` — duplicate/remove non-essential fields or
  sibling-game records at p ∈ {−0.5, −0.2, 0, +0.2, +0.5} (paper task 4).
  Output numbers must be invariant.
- `longSlate(records)` — concatenate a full day's slate (paper task 1's
  long-context stress) — checks per-game stats don't cross-contaminate.

### Lane B — LLM-in-the-loop (opt-in: `npm run agent:eval:llm`, needs `ANTHROPIC_API_KEY`)

Runner feeds each (possibly perturbed) structured record through the REAL
content-generation prompts (`tune-prompts` skill owns their review), then
scores with Lane A's auditor plus:

- **Δ metrics per the paper**: mean |generated number − ground truth| per stat
  class; entity-attribution exact match; invariance check across noise levels.
- **Gate (stricter than the paper)**: the paper reports deviation; we ship a
  binary law. ANY fabricated numeral or flipped attribution in N=50 fixture
  runs = suite fails; deviation stats are reported for trend, not for passing.
- Working-memory prompting pattern (their §3.4) is adopted as a *prompt
  technique*, not a task: content prompts should first emit a JSON stats block
  copied from input, then write prose only from that block — gives the auditor
  a machine-checkable intermediate for free.

**Wiring:** Lane A predicates plug into `scripts/agent-eval/run.mjs`'s
existing fixture format (file_contains-style predicates get a new
`numeric_fidelity` type). Lane B is a separate script, never in CI by default
— offline-first law preserved.

**Gates:** no live publishing change until the runtime guard has run shadow
(log-only) for a founder-reviewed week; guard failures block publish the same
way `content-safety.ts` blocked categories do.

---

## 4. Effort estimate

- `numeric-fidelity.ts` (numeral extraction, alias/derivation whitelist,
  audit) + tests: **~1–1.5 days** (numeral aliasing is the fiddly part:
  "three-point favorite", "‑3.5", "58%").
- Fixture generators + Lane A predicates in agent-eval: **~1 day**.
- Lane B runner + first 50-fixture set from real settled records: **~1–1.5
  days** (+ small API spend per run).
- Runtime shadow guard in `workers/content-publishing`: **~0.5 day**.
- Total: **~4 days** to a suite that mechanically enforces rule #2.

---

## 5. What we deliberately skip and why

- **ESPN play-by-play collection** — not a cleared source; the clearance
  engine would (correctly) block it, and we don't need it: our fidelity
  question is copy-vs-our-own-structured-input, not PBP aggregation.
- **Model leaderboard replication** (their Tables 2–3) — we evaluate one
  pipeline (ours), not seven models; their numbers serve only as the prior
  that even frontier models drift, which justifies the hard gate.
- **Hollinger Game Score / NCAA PE composites** — built for basketball/QB box
  scores; our copy doesn't emit those composites. Our composite is the audit
  verdict itself (fabricated-numeral count = 0).
- **The recap-blank-filling accuracy task as a product feature** — filling
  blanks from PBP is their benchmark shape, not our workload; we keep only its
  working-memory prompting pattern.
- **Shuffle-order stress on play sequences** — we have no play-sequence
  inputs; the analogous noise test (field/record duplication) is Lane A's
  `injectNoise`.

# 13 · The Stat Foundry — the living sports-stat institution

PROJECT PARALLAX · the frontier you named: *statistics as living hypotheses.* Built, tested, and
render-verified on fixtures. The deepest ambition is not "GSE has more statistics than anyone" — it is
**every meaningful statistic can explain where it came from, what it knows, what it doesn't, which
decisions it changes, and whether it still deserves to exist.**

Engine: `packages/decision-field-runtime/src/stat-foundry.ts` + `five-ledgers.ts` (16 tests).
Instrument: `docs/gse-packet/observatory/STAT_PASSPORT.html` (offline, fixture-watermarked).

---

## 1. The five canonical ledgers (the spine — no new authority system)

The many organs collapse into five ledgers; everything else feeds or reads one of them. Implemented as
a pure **read-view** (`projectToLedgers`) over one PARALLAX Decision Object — *five ledgers, one object*,
which is the proof of "one organism, one source of truth."

| Ledger | What it records | Reads from (existing organ) |
|---|---|---|
| 1 · Reality | what happened / is believed physically true | facts + light cone |
| 2 · Belief | each observer's belief, when | observer arena + source race |
| 3 · Decision | the rational action + why | decision-state grammar + compilers |
| 4 · Authority | what GSE was permitted to express | the AuthorityVector meet + binding layer |
| 5 · Learning | what it deserved; what to build next | credit verdict + the Stat Foundry |

## 2. The Stat Genome (the passport)

Every statistic carries a `StatGenome`: key · name · version · question · formula · unit · decision
states supported · **falsifier** · expected failure modes · known-at requirement · uncertainty method ·
evidence · status. A competitor gives a number; GSE gives the genealogy, the limits, and the *earned
authority* of the number.

**The honesty discipline (the wall), enforced in code (`clampStatus`/`maxStatusForEvidence`):**
a statistic computed only on **FIXTURE** (or SHADOW) data can never exceed **EXPERIMENTAL**. VALIDATED
requires an out-of-sample confirmation sample; OFFICIAL requires owner promotion. Settled-n = 0 and the
publish gate is HELD, so **every flagship below is EXPERIMENTAL or CANDIDATE — by construction, proven by
test** (`stat-foundry.test.ts`: "NO flagship stat claims VALIDATED or OFFICIAL").

Lifecycle: `CANDIDATE → EXPERIMENTAL → ▟VALIDATED → ▟OFFICIAL` (· `DEGRADED`/`RETIRED`). Stats don't
accumulate; they compete — weak ones retire, redundant ones merge, useful ones earn promotion.

## 3. The ten flagship statistics (6 built, 4 designed)

Each addresses a decision problem ordinary providers don't solve. **Built** = implemented + computed from
the engine on the fixture; **designed** = registered with a full genome but `CANDIDATE` (needs live/settled
data — registered honestly, never faked).

| # | Statistic | Built? | Fixture value | What it answers |
|---|---|---|---|---|
| 1 | Decision Boundary Distance (ρ) | ✅ | **0.12** | the smallest change that flips the decision (geometry of the conclusion) |
| 2 | Counterfactual Robustness Radius | ✅ | **0.12** | how many plausible worlds keep the same decision |
| 3 | Observer Lag Vector | ✅ | **−2 / 0** | which observer reacted first, which late |
| 4 | Belief Independence Score | ✅ | **1.0** | independent evidence vs copies of one origin |
| 5 | Opportunity Transfer Matrix | ✅ | **Σ-conserved** | where opportunity mass goes when a role changes |
| 6 | Authority Margin | ✅ | **1 rung** | how far from the next thing we may say (+ the blocking layer) |
| 7 | Refusal Alpha | designed | needs settled | value preserved by *not* acting |
| 8 | Action Half-Life | designed | needs settled | time until half the decision's value decays |
| 9 | Source Marginal Value | designed | needs live | one source's worth by ablation (→ Shapley at scale) |
| 10 | Market Bloom & Maturity | designed | needs live | the market's lifecycle state |

Five of the six built metrics are *direct readings of the PARALLAX engine* — the Foundry is the engine
wearing its scientific skin, not a parallel system (per "do not create another parallel authority system").

## 4. The Stat Foundry loop (continuous discovery, gated)

Residual → candidate → gauntlet → competition → promotion/retirement. A candidate stat must pass:
definition · formula · falsifier · source-rights · leakage · redundancy · discovery sample · confirmation
sample · stability-across-regimes · decision-utility · public-language review. This is where the existing
Formula Forge, Theory Ecology, Ghost Memory, Discovery Council, Data Intelligence Mesh, and One Ladder
become **one institution** with one lifecycle — the unification, not a new pile.

## 5. The provider bakeoff (designed — NOT activated; owner-gated spend)

Every paid provider competes for budget on the **same controlled sample** (20 games · 100 players · 10
market families · injuries · one historical week · one update window), scored on 11 weighted dimensions
(unique facts 15% · timestamp quality 12% · coverage 12% · latency 12% · entity-match 10% · null/error 8% ·
history 8% · legal clarity 8% · cost-per-useful-fact 7% · decision-states-upgraded 5% · integration 3%),
then ranked by **Source Value = E[ΔU + ΔR + ΔP + ΔM] − C − L − K** (Source Marginal Value, stat #9). The
highest row earns budget — not the longest feature page. The harness is fixture/offline; **no trial is
signed up and no feed is bought in this work.**

## 6. The budget — owner decisions (no spend taken)

Faithfully recorded from your strategy; **every line is owner-gated and inert here.**
- **Stage A (now):** spend nothing; finish measurement; run trials. Permanent free stack: nflverse,
  Sleeper, NWS, CollegeFootballData (+ The Odds API 20K already held).
- **Stage B:** The Odds API **5M ($119)** + BALLDONTLIE GOAT NFL ($39.99) → **≈$159/mo**, *if both pass the
  bakeoff*. (~39 founding members at $49 cover the year.)
- **Stage C:** add SportsGameOdds Rookie → ≈$258/mo — *only if source-independence pays rent* (book-lag,
  provider-artifact rejection, market-birth timing).
- **Stage D (post-revenue):** one of FantasyData / SportsDataIO — *only when a live product gap requires it*.
- **Stage E (enterprise):** PFF/SIS/FTN/Sportradar/Stats Perform — per a specific paid product, never as status.

The economic insight is preserved: skip the 100K tier (poor $/credit), go 20K → 5M; The Odds API stays
the *market clock*, one observer, not the kingdom.

## 7. Security — surfaced, owner action required

**Rotate the `THE_ODDS_API_KEY` that appeared in an earlier local-folder screenshot.** Treat it as
compromised-by-exposure. This is the owner's action on the provider dashboard. This work never read,
used, printed, or committed the key value; nothing here depends on it.

## 8. What's built vs owner-gated

**Built (fixture, tested, reversible):** the five-ledger projection, the Stat Genome + lifecycle
discipline, six flagship metrics, the Stat Passport instrument, the bakeoff *design*.
**Owner-gated (not done):** any spend / trial signup / feed purchase; arming any source LIVE; flipping
priced/publish/performance gates; promoting any stat past EXPERIMENTAL; rotating the exposed key.

The north star, in one line: *a statistic earns the right to be trusted the same way a decision does —
through observation, invention, proof, memory, and disciplined evolution — and it can always show its work.*

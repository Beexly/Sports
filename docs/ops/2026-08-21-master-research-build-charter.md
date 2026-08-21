# Master Research & Build Charter — the 10,000-foot view

**Purpose.** One document that steps all the way back and looks at *everything* — every
research wave, every sport, the math, the infra, the growth surface, the open loops — so we
stop hyper-focusing on one corner (MLB, or "find a dataset") and actually drive to the finish
line. Written on Fable as the planning artifact; the **Research track** is built to be executed
by a cheaper model; the **Build track** is for Fable later.

**Standing rule for whoever executes this: nothing is written off.** Section 4 lists everything
previously dismissed, each with a specific reason to look again. If you re-dismiss something,
say *why* in one line — don't drop it silently.

---

## 0. Where we actually are (honest state, all domains)

**Shipping / CI.** Five PRs open today, all draft, all mine:
- **#442** (ledger guard) — the keystone. `Test` and `Build` both pass on it; merging it turns
  `main` green for the first time in weeks and unblocks every other PR. **This is the single
  highest-leverage merge available.**
- **#441** (build-worker segfault / placeholder DB) — verified; its `Build` only runs once #442
  lands and `main` is green.
- **#443** (statsapi.mlb.com → `permission_required`) — verified against the real clearance engine.
- **#444** (consolidated research doc) — includes the SBR ToS reversal correction.
- **#440** (overnight queue) — T9/T6/T7/T8/T10 done; T11 (settlement backfill) + T12 (main green)
  queued but not built.

**The math is further along than the frustration suggests.** Already implemented, tested, and
wired in — not missing:
- **Shin's de-vig** (`shin-devig.ts`: `shinDevig`, `gotoConversion`), threaded through 36+ files.
- **Empirical-Bayes shrinkage** (`metrics/core/shrinkage.ts`: `empiricalBayesShrink`,
  `shrinkProbability`, `shrinkWeightedMean`) with its own test suite.
- **James-Stein / Efron-Morris** (`research/efron-morris-js.ts`: `shrinkEfronMorris`,
  `pooledVariance`, `anscombe`/`anscombeInverse`, `backTransform`) — built from the 1975 paper,
  verified against a locked fixture at maxdiff 0.
- Hierarchical-Bayes props (`edge-lab/props-hb.ts`), NB2 tail prob (`nb-rbpf.ts: nbOverProb`),
  Kelly sizing, residual-GBM, Hawkes steam-move detection, CLV decomposition, e-process
  anytime-valid inference.

So the methodology question is **not "why haven't we found Shin/James-Stein"** — we built them.
It's **"are the constants and approximations inside them validated?"** (Section 2, Lane B).

**Live problems.** Settlement backlog CRITICAL (86/1739 overdue, T9-diagnosed: `settle-sport.ts:184`
`daysFrom=2` window). Dead watchdog (`external-watchdog.yml` compares against `"ok"`, code emits
`"healthy"`, 30/30 failed). ESPN client missing `limit=` param (silent truncation risk).

**Research.** Four waves + open-discovery sweep. Converged: no rights-clear 2022–2026 closing
lines exist on public GitHub for any sport; the one candidate (SBR archive) was reversed to
`excluded` on a $5,000-liquidated-damages ToS. `Overlay` is the strongest methodology reference
(soccer model + sport-agnostic CLV/EV gate), unlicensed → reimplement only.

---

## 1. The correction to how this has been run

Two prior research rounds scored everything against an MLB-only gap framework. That was wrong:
GSE covers MLB, NFL, NBA, NHL, and soccer, and NFL/EPL seasons are imminent. The **MVE
experiment stays MLB-only** (correct — it's a frozen pre-registration), but *everything else* —
data sourcing, methodology validation, the CLV/EV engine, the settlement layer — is multi-sport
and must be planned that way. Every lane below names all active sports, not just MLB.

---

## 2. RESEARCH TRACK (next model executes now)

Six lanes. Run them in parallel. Each has a question, a method, and an output contract. **Do not
re-derive what Section 0 already establishes** — build on it.

### Lane A — Data & rights, every sport
- For NFL, EPL/top-5 soccer, NBA, NHL, MLB: is there *any* rights-clean historical closing-line
  source for **2022–2026** specifically? (2011–2021 is moot — SBR covered it and is now excluded.)
- Check the ONE direct question that could end the whole data hunt: **does The Odds API's own paid
  historical endpoint cover 2022–2026 for each sport?** This is a docs/pricing-page read, not a
  search. If yes, the data gap closes with a vendor upgrade, not a scrape.
- Register the confirmed-open sources already found: `openfootball` (CC0), `martj42/international_results`
  (CC0); legal read on OpenLigaDB (ODbL share-alike).
- Output: per-sport table {source, coverage years, rights class, cost, action}.

### Lane B — Methodology VALIDATION (the real gap — validate, don't rebuild)
The math exists; the open questions are the *unvalidated constants and approximations* inside it.
For each, find an external reference (academic paper, established package like `baseballr`/`nflfastR`/
`hoopR`, textbook) that either confirms or corrects our choice:
- **NB2 dispersion `φ = 12`** — inherited from `nb-rbpf.ts:263`, never re-derived. Is 12 defensible
  for MLB run totals? What do published NB dispersion estimates for baseball scoring look like?
- **Pooled variance `s² = 0.04`** fallback + the **8-game** empirical threshold — unexplained
  constants. What does the Anscombe-transformed variance of per-team run counts actually run at?
- **Back-transform Jensen gap** — `backTransform` applies the inverse Anscombe once to the *average*
  of the two team thetas; that's a first-order approximation of E[g(X)] by g(E[X]). How large is the
  bias? Is a second-order correction worth it?
- **`D_i` form** — prereg §3 uses `s²/n_i` (empirical); ledger C-64 froze `1/(4n_i)` (theoretical);
  they agree only if s²=0.25. This is flagged (T7) but unresolved as a *methodological* choice, not
  just a note. Which is right for this data?
- **Rest-days / park / weather covariates** have no admitting mechanism in the current model. Is a
  Fay-Herriot-style regression-mean shrinkage the right way to admit them? Reference implementations?
- **Per sport:** the same shrinkage/dispersion questions for NFL (scoring is not Poisson-ish like
  runs), NBA (high-scoring, near-Gaussian), NHL (low-count, Poisson-like). Does one dispersion model
  generalize, or does each sport need its own?
- Output: for each constant/approximation, {our value, external reference, confirmed|correct-to-X,
  citation}. This is the highest-value lane — it either hardens the edge or finds a real bug in it.

### Lane C — Revisit everything written off (honest second look)
Nothing dismissed is closed until re-checked here:
- **`context-mode`** (MCP context-compression server, ELv2) — genuinely useful for cutting the
  token cost of exactly this kind of research. Trial it; does it reduce context spend materially?
- **`free-for-dev`** — skim against GSE's actual `DATABASE_URL`/`REDIS_URL`/hosting bill; any
  free-forever tier that replaces a paid line item?
- **OSINT list** (WHOIS, OpenCorporates, Wappalyzer, archive.today) — these are the *legal* way to
  do vendor due diligence and competitive research; wire the useful ones into the clearance workflow.
- **The "low-value" repos across all waves** — re-read specifically for *reusable code patterns*
  (the round-1 second-pass proved SportsDashboard's team-matcher, rate-limiter, and pick-freeze
  policy were all missed by a data-only lens). Do the same read on the round-2 repos for NFL/NBA/NHL.
- **Instagram tools** — the reverse-engineering ones (`gitreverse`, `reverse-skill`) do NOT reach
  private/sportsbook systems (see Section 5); the value that *is* real (free-infra lists, the
  content-format lessons from the accounts that were 429-blocked) needs a logged-in human look, not
  automation. Flag which need the founder's own eyes.
- Output: {item, prior verdict, second-look verdict, reason}.

### Lane D — Legal competitive & market intelligence
- Using only public/legal methods (SimilarWeb, published pricing pages, app-store listings): how do
  the 2–3 named competitor picks products price, package, and market? What sports do they cover?
- **How do sharp books price** — the legitimate version of "get their math": closing-line reverse-
  engineering from *published* prices (which is what CLV already does). Is there published research
  on inferring a book's model from its line movement? This is the real, legal path to the thing the
  Instagram "data leak" idea was reaching for.
- Output: competitor matrix + any published line-inference methodology.

### Lane E — Growth, content, distribution
- Content/SEO: what's the cheapest, most durable way for a solo pre-revenue founder to build
  audience for a multi-sport picks product with NFL/EPL seasons starting now (timing is leverage)?
- The CLAUDE.md pricing ladder (FOUNDING→PROVEN→ESTABLISHED→AUTHORITY) is milestone-gated — what's
  the nearest verifiable milestone (≥100 settled + published calibration) and what unblocks it?
- Output: prioritized growth actions ranked by cost vs. revenue-proximity.

### Lane F — Infra / cost / reliability
- CI: is `build`'s `needs: test` gate (which silently skipped Build for months) the only such
  landmine? Audit the workflow graph for other checks that can silently no-op.
- The dead watchdog and the settlement backlog are *build* items (Track 3) but confirm here whether
  any other "green means nobody's problem" alarms exist.
- Output: reliability-gap register.

---

## 3. BUILD / FIX TRACK (Fable later — close the loops)

Ordered by leverage:
1. **Merge #442.** Unblocks all CI. Everything else is cheaper after this.
2. **Rebase #441 onto green main**, confirm Build passes, merge.
3. **ESPN `limit=` fix** — ties into settlement; small, high-value.
4. **Settlement backfill (T11)** — spec'd (`docs/ops/2026-08-21-settlement-backfill-spec.md`),
   fixes the CRITICAL backlog. Free-source only, no live DB in tests, deploy is founder's.
5. **T12 (ai-transport-import-boundary)** — the last inherited red; makes main fully green.
6. **MVE fire decision** — armed, isolated Neon branch ready (`ep-morning-sun-…`). Needs founder
   go + the DB pointed at the branch. Fire is one-shot, irreversible, founder-gated.
7. **statsapi.mlb.com clearance wiring** — registry entry exists (#443) but the client still calls
   it ungated; decide seek-authorization vs. replace-with-ESPN/nflverse. Founder call.
8. **Watchdog fix** (`external-watchdog.yml` `"ok"`→`"healthy"`) — sealed `.github`, founder's 2-min fix.

---

## 4. Open-loops register (living — nothing lost)

- MVE constants (φ=12, s²=0.04, 8-game, Jensen back-transform, D_i form) — Lane B.
- 2022–2026 closing lines: no free source found; vendor question open — Lane A.
- Whether one dispersion model generalizes across sports — Lane B.
- Neon: which project is prod (`ep-summer-moon`) vs. experiment branch (`ep-morning-sun`); prod
  string was pasted in chat and **should be rotated**.
- Open-discovery sweep synthesis was still finishing when this was written — fold its result in.
- Multi-sport re-score memo (Overlay soccer model, prop-edge CLV schema) — extract patterns, Lane C.
- `context-mode` trial for token cost — Lane C.

---

## 5. Hard boundaries (the executor must not cross these)

- **No access to any sportsbook's private systems** (DraftKings/FanDuel/Underdog/etc.), and **no
  use of leaked/breached data** to obtain their models or math. This is unauthorized access /
  trade-secret misappropriation, not a licensing nuance. The legal path to "their math" is
  closing-line inference from *public* prices (Lane D).
- **No evasion tooling.** `camofox-browser` (Cloudflare/anti-bot bypass, proxy rotation) is a
  categorical no per CLAUDE.md and must never enter the Tool Registry.
- **`reverse-skill`** is only for systems GSE *owns or is authorized to assess* (its own README
  says so) — fine for auditing our own app, nothing external.
- Every new data source goes through the Clearance Engine and gets a RightsSnapshot **before**
  ingestion; judge the underlying source's ToS, never a scraper's license (the SBR reversal is the
  cautionary tale — robots.txt said yes, the ToS said $5,000).

---

## 6. The finish line, stated plainly

We are not missing the math — we built it; Lane B validates it. We are not missing a data *method*
— we're missing rights-clear *recent* data, which is one vendor question (Lane A), and the real
moat is the snapshots we accumulate ourselves. The nearest revenue-unlock is operational, not
research: green CI (#442), a fixed settlement layer (T11), and enough settled picks to trip the
first pricing milestone (Lane E). Research hardens the edge; the build track ships it.

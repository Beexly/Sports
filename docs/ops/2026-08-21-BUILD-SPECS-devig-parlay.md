# BUILD SPECS — De-vig Oracle + Parlay MRI + Field Leverage

Companion to `2026-08-21-MASTER-HANDOFF.md`. Reverse-engineered from **penaltyblog (MIT)** — safe to
reimplement in TS; **cite the source in a header comment** (`Ported from penaltyblog (MIT),
github.com/martineastwood/penaltyblog`). `implied.py` is pure numpy/scipy (no Cython); the joint-PMF
math lives in the Cython core `models/probabilities.pyx` + `models/utils.pxd`.

> **PROVENANCE CAVEAT [do first]:** every golden number below was *self-derived* by re-executing the
> extracted formulas in pure Python (no numpy/scipy in the sandbox). Before treating any fixture as
> CI-blocking, install `penaltyblog` and confirm its real scipy `ridder`/`brentq` path reproduces
> these values at ≤1e-9. [VERIFY, S]

---

## 1. De-vig oracle — `packages/prediction-engine/src/devig/oracle.ts`

```ts
export type DevigMethod =
  | "multiplicative" | "additive" | "power" | "shin"
  | "differential_margin_weighting" | "odds_ratio" | "logarithmic";
export interface DevigResult {
  probabilities: number[]; method: DevigMethod; margin: number;
  methodParams?: Record<string, number>;
}
export function devig(decimalOdds: number[], method: DevigMethod): DevigResult;
```

Common prelude (all 7 methods): `invOdds[i] = 1/decimalOdds[i]`; `margin = sum(invOdds) - 1` (the raw
overround — identical for all methods; only redistribution differs).

1. **multiplicative:** `probs[i] = invOdds[i] / sum(invOdds)`
2. **additive:** `probs[i] = invOdds[i] - margin/n`
3. **power:** find `k>0` solving `sum(invOdds[i]^k) == 1`; `probs[i] = invOdds[i]^k`. `f(k)=1-sum(invOdds^k)`
   is monotone increasing on `[0,100]` for overround markets — safe to bisect.
4. **shin** (insider-trading param z; Shin 1992/1993 closed form):
   `shinProb(z)[i] = (sqrt(z^2 + 4*(1-z)*invOdds[i]^2/sum(invOdds)) - z) / (2 - 2z)`; solve `z` on
   `[0,100]` so `sum(shinProb(z))==1`. Only brackets a root for margin>0 — **fall back to multiplicative
   if no sign change** (do not port scipy.ridder's unguarded behavior).
5. **differential_margin_weighting** (Buchdahl, closed form): `fairOdds[i] = (n*odds[i])/(n - margin*odds[i])`;
   `probs[i] = 1/fairOdds[i]`
6. **odds_ratio** (Cheung): find `c>0` solving `sum(invOdds[i]/(c+invOdds[i]-c*invOdds[i])) == 1`;
   `probs[i] = invOdds[i]/(c+invOdds[i]-c*invOdds[i])`; bracket `[0,100]`
7. **logarithmic:** if `|margin|<1e-9` return `probs=invOdds, c=0`. Else `logOdds[i]=ln(p/(1-p))` with
   `p=clip(invOdds[i],1e-15,1-1e-15)`; solve `c` so `sum(sigmoid(logOdds[i]-c))==1`; bracket `[0,20]`,
   fallback `[-20,20]`; `probs[i]=sigmoid(logOdds[i]-c)`

Root-finder (algorithm-independent — bisection to 1e-12 reproduces scipy's converged root):
```ts
function bisectRoot(f:(x:number)=>number, lo:number, hi:number, tol=1e-12, maxIter=200): number {
  let flo=f(lo);
  for (let i=0;i<maxIter;i++){ const mid=(lo+hi)/2, fmid=f(mid);
    if (Math.abs(fmid)<tol || (hi-lo)<tol) return mid;
    if (flo*fmid<=0){ hi=mid; } else { lo=mid; flo=fmid; } }
  return (lo+hi)/2;
}
```

### Golden fixtures → `packages/prediction-engine/test/fixtures/devig.golden.json` (atol 1e-9)

> NOTE: `implied.py`'s docstring claims `margin=0.1362` for Market A — that is **stale/wrong**; the
> probabilities in its docstring are correct. Use the values below.

**Market A** `[2.7, 2.3, 4.4]`, margin `0.03242570633874986`:
- multiplicative: `[0.35873803615739097, 0.4211272598369373, 0.22013470400567173]`
- additive: `[0.35956180159078704, 0.4239740399160689, 0.216464158493144]`
- power: `[0.35917109985299667, 0.4237307529945606, 0.2170981471524328]`, k=`1.0309132393159448`
- shin: `[0.3593439195919109, 0.4232438481831209, 0.21741223222497302]`, z=`0.01623644285628778`
- differential_margin_weighting: `[0.359561801590787, 0.4239740399160689, 0.21646415849314396]`
- odds_ratio: `[0.3588103621261668, 0.42256142219060044, 0.2186282156832326]`, c=`1.05116912729315`
- logarithmic: `[0.3588103621261692, 0.42256142219060305, 0.21862821568323437]`, c=`0.04990299930355491`

**Market B** `[2.0, 1.8]`, margin `0.05555555555555558`:
- multiplicative: `[0.47368421052631576, 0.5263157894736842]`
- additive: `[0.4722222222222222, 0.5277777777777778]`
- power: `[0.47145726472861227, 0.528542735271378]`, k=`1.0848010912368977`
- shin: `[0.472222222222223, 0.5277777777777786]`, z=`0.05556460811471098`
- odds_ratio: `[0.47213595499957817, 0.5278640450004194]`, c=`1.1180339887499002`
- logarithmic: `[0.47213595499957955, 0.5278640450004207]`, c=`0.11157177565710441`

**Market C** `[1.95, 1.85]`, margin `0.053361053361053346`:
- multiplicative: `[0.48684210526315796, 0.513157894736842]`
- additive: `[0.4861399861399862, 0.5138600138600138]`
- power: `[0.4857751797295144, 0.5142248202704908]`, k=`1.0811284811798494`
- shin: `[0.48613998613998405, 0.5138600138600118]`, z=`0.05336313206525389`
- odds_ratio: `[0.48610037780571674, 0.5138996221942881]`, c=`1.1128297681493038`
- logarithmic: `[0.4861003778057123, 0.5138996221942838]`, c=`0.10690611194267063`

Assert each method sums to 1.0 within 1e-9, and `margin == sum(1/odds)-1` exactly.

**Field integration:** `DevigResult.probabilities` become the "fair" calibration inputs behind a pick's
confidence — they feed INTO the pick pipeline, never bypass it (per CLAUDE.md Prediction Engine Rules).
Note there are already **two** unchecked Shin implementations in-repo (`shin-devig.ts`,
`edge-lab/devig.ts`) — this oracle is the reference both should be validated against, then de-duplicated.

---

## 2. Parlay MRI v1 — `packages/prediction-engine/src/parlay/correlationAdjuster.ts`

Karlis & Ntzoufras **Bivariate Poisson**: `X=W1+W3, Y=W2+W3`, `Wi~Pois(λi)` independent. `Cov(X,Y)=λ3`
exactly — **λ3 IS the shared-component correlation** (pace/weather/game-script). `λ3→0` collapses to the
independent product — the naive parlay-leg-multiply a book's flat pricer assumes.

```ts
λ1 = exp(homeAdvantage + homeAttack + awayDefense)   // same param layout as existing Poisson/DC models
λ2 = exp(awayAttack + homeDefense)                    // + one extra `correlationLog` tail param
λ3 = exp(correlationLog)

function poissonPmf(k: number, lam: number): number {
  return Math.exp(-lam + k*Math.log(lam) - lgamma(k+1)); // or k! for small integer k (safer)
}
export function bivariatePoissonPmf(x, y, lam1, lam2, lam3): number {
  let p = 0; const kMax = Math.min(x, y);
  for (let k = 0; k <= kMax; k++) p += poissonPmf(x-k, lam1) * poissonPmf(y-k, lam2) * poissonPmf(k, lam3);
  return p;
}
// buildScoreGrid(lam1,lam2,lam3,maxGoals,normalize=true) -> maxGoals×maxGoals matrix, optionally renormalized.
// evaluateParlay: naiveSurvivability (product of marginals) vs correlatedSurvivability (joint grid);
// expose BOTH so a mispriced parlay = correlated diverges from naive.
```

### Golden fixtures → `test/fixtures/bivariate-poisson.golden.json` (atol 1e-9)

**Set1** λ1=1.5, λ2=1.0, λ3=0.3: `P00=0.06081006262521797`, `P10=0.09121509393782695`,
`P01=0.06081006262521797`, `P11=0.10945811...` (pull the full grid from the `wq1y08sf2.output` artifact
before it expires; regenerate via the PMF above and pin).

**Scope boundary (document in-module):** v1 is **same-match** correlation only (SGP legs within one game).
Cross-game parlay correlation is a separate, larger problem — do NOT claim it in v1. Ship as
transparency/education until real book SGP quotes are ingested and `correlatedSurvivability` beats naive
on a walk-forward backtest. `priced:false` until then.

---

## 3. Field leverage — rights-clear data we currently drop

Ranked. All ESPN fields carry the **engine-input-only** provenance ceiling (never cite ESPN as public
provenance behind a published claim). "No re-check" = already within an approved entry.

- **[HIGHEST] ESPN `competitions[].odds[]` open+close per-book** moneyline/spread/total, all 5 sports —
  `parseEspnScoreboard`/`parseEspnScoreboardForSeed` read 0% today. Uniform shape (MLB relabels
  pointSpread). UNLOCKS a **free opening/closing-line cross-check + Odds API fallback**. [ADOPT-FIELD, M]
- **[HIGH] ESPN PowerIndex `predictives[]` ~35 metrics** vs the 1 (fpi) kept — epa off/def/ST splits,
  projected W/L/T, SOS ranks, playoff/division/title probabilities. Replace the single-name filter in
  `loadEspnPowerIndexMap` with a name-keyed record; add the sibling `efficiencies[]` array. [ADOPT-FIELD, S]
- **[HIGH] ClubElo Fixtures exact-scoreline grid** — 28+ correct-score cells collapsed to one 2-way number
  (`fixtureRowToTwoWay` reads only GD buckets). UNLOCKS O/U fair value at ANY line, BTTS, Asian handicap —
  **no new fetch**. [ADOPT-FIELD, M, GATED on the ClubElo clearance fix — it's an ungated host today].
- **[MED] MoneyPuck situational xG** — `buildSkaters/Goalies/Teams` hard-filter `situation==='all'`,
  discarding 5on4/4on5 (PP/PK) every load; also corsi/fenwick/high-danger unparsed. [ADOPT-FIELD, M —
  **gated on the MoneyPuck license resolution first**].
- **[MED] ESPN MLB `probables[]`** probable starting pitcher (identity + W-L/ERA) — zero-cost starter
  quality input for run-total models (none today). [ADOPT-FIELD, S]
- **[MED] ESPN `weather` + `venue.indoor`** — free outdoor NFL/MLB totals covariate the model can't admit
  today. Gate weather null on `indoor===true`. Directional only (no wind field). [ADOPT-FIELD, S]
- **[LOW] ESPN `records[]` home/road splits + soccer `form` "WWLWW"** — cheap HFA split + rolling last-5. [XS]
- **[BUILD, L, GATED] football-data.co.uk read-only CSV client** — mirror `nflverse-source.ts` parseCsv,
  gated `assertIngestible('football-data-uk')`. 132-col E0.csv has Pinnacle close `PSCH/PSCD/PSCA` (sharpest
  proxy) → Elite CLV ledger + calibration backtest + European box scores. Attribution-only.
- **[VERIFY] nflverse `games.csv`** roof/temp/wind/rest/QB-starter/moneyline/spread/total already parsed by
  historical loaders — open question: do they reach the LIVE current-week scoring path or only backtest?
- **[ROUTE] ESPN `linescores/leaders/broadcasts/notes`** → content-publishing-agent (SEO), not model input.

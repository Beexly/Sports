# NFL Data — Legal Leverage Map (aggressive, but legal)

**Status: [PROPOSED, counsel-required].** This is engineering/strategy analysis,
NOT legal advice. Every conclusion that touches litigation risk must be confirmed
by counsel before it drives a shipped decision. It exists to answer one question
with teeth: *how much of this data can GSE legitimately use, and on what legal
footing, without ever crossing into the ToS/copyright exposure that ends a
trust brand?*

Verified by execution 2026-07-03: nflverse's `ngs_receiving.csv.gz` /
`ngs_rushing.csv.gz` are **value-identical** to nextgenstats.nfl.com (JSN 2025
avg_separation 3.018 vs the site's rounded 3.0; James Cook RYOE 358.16 vs 358),
delivered under CC-BY-4.0 with 2016→current history. The scraped pages were never
needed.

---

## 1. The doctrine — why the *facts* are already ours

The single biggest lever is that **raw sports statistics are facts, and facts are
not copyrightable.** The site's Terms of Use are a *contract* problem, not an
*ownership* problem — and the moment the same facts arrive through a licensed
channel, the contract objection evaporates.

| Authority | Holding | What it unlocks for GSE |
|---|---|---|
| **Feist Publications v. Rural Telephone, 499 U.S. 340 (1991)** | Facts have no copyright; only original *selection/arrangement* of a compilation gets "thin" protection, and even that doesn't reach the facts themselves. | "James Cook rushed for 1621 yards" is a fact GSE may state, store, and build on freely. A table's *layout* might be thin-protected; the numbers in it are not. |
| **NBA v. Motorola, 105 F.3d 841 (2d Cir. 1997)** | Transmitting scores/stats is not infringement; "hot-news misappropriation" survives only in a narrow 5-part form (time-sensitive gathering, free-riding, direct competition, reduced incentive to produce). | Season/historical stats fail the *time-sensitivity* prong outright — no hot-news claim on the 2025 season totals. (Live in-game data is where hot-news is even arguable; we don't scrape that.) |
| **hiQ Labs v. LinkedIn, 31 F.4th 1180 (9th Cir. 2022)** | Scraping *publicly accessible* pages is not "unauthorized access" under the CFAA. | The CFAA (the criminal-hacking statute) is **not** a weapon against reading public NFL/PFR pages. This is a real loophole — but see §4: contract + brand still counsel against it, so we don't lean on it. |
| **No US sui-generis database right** | The US (unlike the EU) has no standalone "database right" protecting investment in a compilation. | A US-facing product faces no EU-style extraction claim on the facts. **EU caveat below.** |

**Net:** the underlying box-score and event facts are free. The only genuinely
owned things are (a) a vendor's *original expressive compilation* (thin, dodgeable
by re-arranging/re-deriving), (b) a vendor's *proprietary MODEL OUTPUT* (RYOE,
xYAC, expected_rush_yards — these are the NFL's computed estimates, and the one
place to tread carefully), and (c) trademarks/logos (separate regime; we use none).

---

## 2. The pathway inventory — every legitimate source, ranked

| Source | Legal footing | Use |
|---|---|---|
| **nflverse** (`nflverse-data` releases) | **CC-BY-4.0** (attribution, no share-alike) except FTN/participation (CC-BY-SA, we skip). Verified 1:1 with NGS. | PRIMARY. Already wired (`nflverse-source.ts` + new `nflverse-ngs.ts`). SEP/CUSH/RYOE/xYAC + full history. Attribute "via nflverse". |
| **nflfastR / open play-by-play** | Same CC-BY-4.0 release; play-level facts (EPA, air yards, personnel). | The IP engine — see §3. Every play is a fact; our models on top are OURS. |
| **ESPN hidden JSON API** (`site.api.espn.com/...`) | Public, unauthenticated endpoints; no click-through ToS on the API itself; used by thousands of projects. GREY but low-risk (public factual data, no auth circumvention). | Live scores/box scores as a redundant/failover feed. Counsel-flag before production. |
| **Official licensed feeds** (Genius Sports, Sportradar) | The paid, unambiguous clean path — including live/in-play rights. | The upgrade if GSE ever needs real-time official data or powers betting. |
| **League/government official docs** (injury reports, transactions, schedules) | Factual disclosures; injuries also in nflverse CC-BY-4.0. | Availability signal — highest-value non-market factor. |
| **Kalshi / the-odds-api** | Licensed API terms (already GSE's stack). | Odds/CLV spine. |
| **Pro-Football-Reference** (Sports Reference LLC) | ToS **forbids** scraping/bulk reuse; **actively enforced** (documented C&Ds). | **Do not scrape for ingestion.** The facts PFR shows are available free via nflverse/nflfastR — take that route, not theirs. |

---

## 3. The killer move — compute your own, own the IP

The strategically decisive play is not "may we re-serve their RYOE?" It is:
**derive GSE's own expected-value metrics from the open play-by-play, and own them
outright.** RYOE, xYAC, and a separation-proxy are all *model outputs*. GSE can
build its own expected-rush-yards / expected-YAC / separation models on nflverse's
open, factual PBP — which is:

1. **100% legal** — a derivative analytical work over CC-BY-4.0 factual data plus
   GSE's own model is GSE's own copyrightable/ownable IP. No vendor model is copied.
2. **Proprietary** — the headline number GSE publishes is *ours*, not a re-served
   vendor figure. This is exactly the "GSE Rating = the proprietary single number"
   mandate applied to player metrics.
3. **Validatable** — NGS's RYOE/SEP become the **ground-truth calibration target**
   (already bridged: `ngsReceivingToSeparationTruth` → the reconstruction engine's
   `calibration-eval`). We prove our model tracks reality; we don't resell theirs.
4. **A moat** — our model can weight, adjust, or out-predict the vendor's. Being
   *different and better* is the whole product.

So the data flow is: **open facts in → our models → our proprietary metric out →
validated against the vendor's as truth.** That is aggressive and unassailable.

---

## 4. The bright lines (how we stay legal while pushing hard)

- **Do not scrape ToS-protected sites (NFL.com, PFR) for production ingestion.**
  hiQ shields the CFAA angle for *public* pages, but breach-of-contract (ToS) and
  trespass-to-chattels remain live, and for a trust brand the reputational blast
  radius alone is disqualifying. We have a value-identical licensed source; use it.
- **Attribute vendor model-outputs; better yet, derive our own.** When an
  NGS-proprietary EXPECTED metric appears in a public surface, label it "NFL Next
  Gen Stats via nflverse". Do not present a re-served vendor estimate as GSE's own
  computation. (Enforced in `nflverse-ngs.ts`'s doc contract.)
- **EU sui-generis database right.** If GSE serves EU users, the EU Database
  Directive can protect *substantial extraction* of a database's contents even
  where US law would not. Counsel-flag before EU distribution.
- **Official-data mandates for betting.** Several US states require *official
  league data* for in-play/live betting settlement. GSE is analytics, not a book —
  but if it ever powers real-money in-play markets, this bites. Counsel-flag.
- **Trademarks are a separate regime.** Team names/logos/marks are not "data" — no
  logos, no implied NFL endorsement.

---

## 5. What is now shipped vs. queued

- **SHIPPED (dark/additive):** `nflverse-ngs.ts` typed access — all three NGS
  variants: receiving (SEP/CUSH/xYAC), rushing (RYOE/efficiency/8+box), passing
  (time-to-throw/air-yards/xCOMP%/CPOE) — parsed from the CC-BY-4.0 assets, plus
  `ngsReceivingToSeparationTruth` (SEP → reconstruction calibration) and
  `ngsPassingToCpoeTruth` (CPOE → QB-model ground truth). All three verified 1:1
  with the vendor by execution (JSN sep, Cook RYOE, Stafford CPOE).
- **QUEUED (founder-gated — changes published numbers / MODEL_VERSION):**
  1. Wire NGS SEP as the reconstruction `calibration-eval` ground truth (measurement, then a MODEL_VERSION bump if it improves the estimate).
  2. Build GSE's own expected-rush-yards / expected-YAC models on open PBP (the §3 IP play).
  3. NGS-derived independent estimators into the edge engine.
  4. ESPN-API failover feed + counsel sign-off.
- **Counsel-required before any of the queued items publish:** the EU + betting +
  attribution flags in §4.

Bottom line: the meticulous route is also the aggressive one. The facts are ours
by law, the vendor's own numbers are reproducible through a license we already
consume, and the winning move is to out-compute them and own the result — no
scraping, no exposure, maximum leverage.

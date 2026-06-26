# Overnight Owner Brief — GSE Frontier Institution Build

**Branch:** `claude/keen-ptolemy-t38f1g` (main untouched). **Envelope:** fixture/preview only, no spend,
no secrets, no live API, no Scores24 as a data source. **Verdict:** see the end.

---

## Meaning Compiler Upgrade (Addendum II — the Einstein frame)

The night's second movement answered the deeper ask: GSE is not a page system, it is a **compiler for
sports meaning**. Every object now lifts into one typed `ClaimObject` and passes through one governed,
downgrade-only pipeline. The page is the rendering; the compiler is the company.

1. **What changed in the architecture?** One universal `ClaimObject` (seven organs) + one
   `compileClaimObject` pipeline now govern every kind of sports object. The compiler owns no math — it
   composes the canonical engines (`composeAuthority`, `knowableAt`, `strengthMin`, `clampStatus`,
   `isForbidden`), proven by the machine-checked **No-Parallel-Systems** keystone theorem.
2. **What now compiles through `ClaimObject`?** Stats, derived stats, trends, predictions, odds prices,
   market states, bonuses, bookmaker ratings, API providers, web evidence, alerts, decision cards — 12
   adapters, a 59-object compiled corpus across three sports.
3. **What pages are merely renderers?** `/meaning/preview` renders only compiled ClaimObjects;
   `validatePageRender` enforces (at render time) the route registry's declared gates. The N6
   `/matches/preview` route is the named follow-up to route through the compiler too.
4. **What objects remain outside the compiler?** The N6 match-preview surface still renders raw
   passports — but those passports are *consistency-proven* against the compiler (same authority
   lattice). Nothing public is anatomically incomplete.
5. **What is safer than before?** The institution now *visibly refuses* a forbidden source
   (`DO_NOT_USE`) and *explains* the refusal by its engine; web evidence cannot become fact; competitor
   research caps at INFO_ONLY; every cap is reproducible by its named engine.
6. **What is more intelligent than before?** Eight Galileo lenses (instruments, not dashboards) read one
   corpus; the Authority Flight Recorder states, per object, exactly what GSE was allowed to say and
   which layer bound it.
7. **What is more monetizable than before?** The category is now legible: "GSE shows what the data is
   allowed to mean" is a bigger claim than "better predictions" — and the page factory can scale on the
   compiler, not on hand-built pages (`SCORES24_TO_GSE_INVARIANTS.md`).
8. **What is harder to copy?** The whole moat is the governed grammar: a fake-certainty competitor would
   have to dismantle its funnel to adopt a compiler that refuses to overclaim.
9. **What must remain held?** Live data, live affiliate links, any gate flip — all still owner-gated.
   The compiler is fixture-only; every ceiling is INFO_ONLY until the live data source is activated.
10. **What is the next coding move?** Route `/matches/preview` through the compiler; the live-phase
    field-level native refactor (once ceilings vary); a CI drift test for the observatory.

Verdict on the upgrade: **READY_FOR_FRONTIER_PREVIEW.** Detail in `MEANING_INTEGRITY_AUDIT.md`
(two passes, two in-pass fixes, no envelope violation). The original N1–N9 brief follows.

## SerpApi / Google Sports Public Observer Leverage (Addendum III — the sixth ledger)

The night's third movement added a **sixth ledger** (next to Reality, Belief, Decision, Authority,
Learning): the **Public Observer Ledger**. It records what dominant discovery systems — Google's sports
one-box, SERP snippets, score widgets, standings one-boxes, knowledge-graph entities, highlight
carousels — *show the public*. This is **public DISPLAY truth**, never official truth. SerpApi / Google
Sports is treated as **one observer in the arena**, never a source of truth. Spec:
`PUBLIC_OBSERVER_LEDGER.md`.

1. **What is SerpApi to GSE?** One observer — it records what the public is shown, not what is true. Every
   record is born `canSettle: false`, `authorityImpact: PUBLIC_OBSERVER_ONLY`, ceiling `WATCH`, and (on
   fixtures) compiles to `INFO_ONLY`. It can inform a *watch*, never an action, a price, or a settlement.
2. **Where is the leverage, then?** Three places the public view is genuinely useful: **entity discovery**
   (Google's kgmid is a strong identity anchor), **latency** (how late the public scoreboard is), and
   **coverage/visibility** (how richly an event is presented publicly). All derived signals — never imported facts.
3. **How does the latency instrument work?** The **Chronos clock chain** records five clocks for one event
   (event → official source → market → public observer → GSE) and derives the lag family. The fixture
   shows the public scoreboard `+10s` behind the event and `+8s` behind the official source. It is stamped
   `canImplyEdge: false` / `canCreateAction: false` — a clock fact, not a betting signal.
4. **How does the entity bridge stay honest?** A kgmid creates a `DISCOVERED` candidate (confidence `0.4`);
   a provider id advances it to `ALIAS_ONLY`; only cross-verification against an official name reaches
   `CANONICAL`. Aliases resolve only with sport/league context, and an ambiguous alias is refused, not guessed.
5. **What about highlights and media rights?** Discovery is never ownership. A `HighlightPassport` keeps
   every gate closed by default; on `UNKNOWN` rights it is non-displayable, non-embeddable, non-reusable,
   non-public — link review only. Nothing third-party is re-published.
6. **What did we NOT do?** No Google scraping, no key, no network, no settlement use, no production-truth
   use, no rights-cleared-media assumption, no betting trigger. The adapter lives in the package; the
   package never imports the app.
7. **How are the providers classified?** A **Provider Trial Court** verdict (machine-checked): SerpApi =
   Public Observer / Entity Discovery / Latency (not official truth); public-api lists = Discovery Source
   Only (never LIVE directly); Cloudbet = `DO_NOT_USE_FOR_EXECUTION`. Enforced rule: no provider executes.
8. **Where does the owner see it?** `/meaning/preview?view=observers` renders all three sub-instruments
   from fixtures — the Chronos chain, the visibility cards (each "can settle: never"), the entity ladder,
   and the rights-gated highlights — all watermarked, all `INFO_ONLY`.
9. **What does this unlock commercially?** A future read-only **meaning API** (`GSE_DATA_API_ROADMAP.md`):
   `/v1/events/{id}/chronos`, `/v1/public-observer-records`, `/v1/entities/{id}/passport`, etc. — each
   envelope-complete and authority-capped. No public API exists yet; the contract is fixed first.
10. **What must remain held?** Any live capture, any rights promotion, any provider going LIVE — all
    owner + legal gated. The public observer can never out-rank the canonical engines, by construction.

Verdict on the sixth ledger: **READY_FOR_FRONTIER_PREVIEW.** Seven machine-checked invariants
(`PUBLIC_OBSERVER_LEDGER.md`); data-intelligence + decision-field-runtime suites green; no envelope
constraint touched. The original N1–N9 brief follows.

## What shipped tonight (N1–N9)

The first visible slice of the GSE institution: a proof-governed answer to a match page where every
stat, trend, prediction, market, and bonus carries source status, rights status, authority status,
freshness, decision-use, weakness, a receipt, and an autopsy path.

| # | Checkpoint | Artifact | Tests |
|---|---|---|---|
| N1 | Universal Event Genome + 3 fixtures + 20 soccer stats | `universal-event-genome.ts`, `event-genome-fixtures.ts`, `match-derived-stats.ts` | event-genome (16) |
| N2 | Trend Passports + Trials | `trend-passport.ts` | trend-passport (9) |
| N3 | Prediction Court | `prediction-court.ts` | prediction-court (12) |
| N4 | Bonus / Offer Integrity | `data-intelligence/bonus-passport.ts` | bonus-passport (10) |
| N5 | Flight Record · Market Bloom · Route Authority · Slip MRI · Alerts | five modules | n5-layers (14) |
| N6 | Vertical slice | `EVENT_GENOME_PAGE.html` (Chromium-verified) + `/matches/preview/*` | matches-preview (14) |
| N7 | Odds credit economics + `odds:plan` CLI | `odds-api-economics.ts`, `scripts/odds-plan.ts` | economics (16) + cli (7) |
| N8 | Institution + Scores24 + product/data/launch docs | 14 docs, each anchored to a module | docs-scan |
| N9 | Adversarial audit ×2 + this brief | `ADVERSARIAL_AUDIT.md` + golden-anchor patch | golden anchor |

Proof cases carried end-to-end: **Ecuador 2–Germany 1** (soccer), **Rays 13–Royals 2** (MLB),
**Roughriders–Argonauts** (CFL, upcoming).

## Scores24 Follow-Up Leverage — the ten questions

1. **Is Scores24 a scores site or a business machine?** A full SEO + prediction + trends +
   bonus-affiliate + retention OS. We mapped its twelve systems and built a rights-safe answer to each
   (`SCORES24_BUSINESS_MACHINE_TEARDOWN.md`).
2. **Where does it actually make money?** The sportsbook-bonus affiliate funnel (systems 7–8). GSE's
   answer is a compliance-gated bonus layer that cannot display an unverified claim and never operates
   betting.
3. **What is its retention engine, and what is ours?** Theirs: "My Matches" + notifications → return to
   bet. Ours: the Edge Watchlist — every alert has a reason + proof, no bet-now pressure, user owns
   frequency.
4. **How does it scale content?** A programmatic route factory. We absorb the *architecture* (one page
   per event from a structured genome) without absorbing a pixel of content; fixtures stay `noindex`.
5. **What is the one thing it structurally cannot copy?** Proof-governed honesty — each of its
   conversion levers depends on the fake certainty our product is built to refuse.
6. **Is using Scores24 at all legally safe?** It is `permission_required`. Manual UX research only;
   automation needs written consent. We use it as zero data — only as a competitive-analysis subject.
7. **Can we beat it on trends without its trend data?** Yes — original Trend Passports that surface
   fragility, overfit, and correlation. We make the trend *honest*, which it does not.
8. **Can we beat it on predictions without its tips?** Yes — Prediction Court grades process apart from
   outcome and never converts a fixture win into a public claim.
9. **Does answering it cost a fortune in data?** Not blindly — the `odds:plan` accountant prices a
   coverage plan in credits before a dollar is spent, and caps runaway historical pulls.
10. **What converts their traffic into our revenue?** Trust that compounds. Their funnel decays per
    user; our calibration + autopsy + CLV track record is the reason to stay and pay
    (`scores24-leverage-to-gse-revenue.md`). Revenue follows proof, never the reverse.

## The base answers (owner's standing questions)

1. **No fake data?** Correct — every fixture is watermarked; nothing computed offline exceeds
   `EXPERIMENTAL`/`INFO_ONLY`.
2. **No fabricated stats?** A stat with a missing input is `null` + a stated weakness, never imputed.
3. **No frontend-only paywall?** Untouched — no entitlement weakening in this build.
4. **No secrets in code?** Secret-scan clean every checkpoint; the odds CLI reads key *presence* only.
5. **No stale data?** Freshness is a first-class authority layer (Temporal) and a market lifecycle
   stage (`STALE → NEEDS_LIVE_DATA`).
6. **Tests required?** 182 engine + new economics/cli + 2501 brand-safety — all green.
7. **Types required?** New files are type-clean; full app typecheck is `ENVIRONMENT_BLOCKED` (Prisma)
   and verified on CI.
8. **No `lock`/`guarantee`/`profit`/`risk-free`/fake-AI language?** Enforced by the trust-gate +
   brand-safety scans; forbidden terms only appear backtick-escaped when documenting the prohibition.
9. **Authority capped on fixtures?** Source-reality binds at `INFO_ONLY`; the Flight Record states it.
10. **No public-performance claim?** Hard flag `countsAsPublicPerformance: false`.
11. **Push is not a win?** `PUSH` is its own outcome in the court.
12. **Missing odds imputed?** Never — `DATA_MISSING` / `clv: null`.
13. **One result moves a model?** No — learning is gated by sample + calibration.
14. **Trends as independent votes?** No — correlated trends are flagged non-independent.
15. **Parlay pushing?** No — Slip MRI's ceiling is `PROCEED_WITH_CAUTION`.
16. **Affiliate link live?** Only if owner-configured; otherwise `null`.
17. **"Best bookmaker" without criteria?** Blocked — ratings need stated criteria + verified
    jurisdiction.
18. **GSE operates betting?** No — `GSE_BETTING_POSTURE.operatesBetting = false`.
19. **Scores24 scraped/derived/sourced?** No — original analysis only.
20. **Competing decision grammar?** No — one `DecisionState`, one `composeAuthority`; new organs are
    presenters.
21. **Branch hygiene?** All on the feature branch; main untouched; N6/N7 CI green.
22. **Spend?** $0 — `odds:plan` is plan-only with `spendUsd: 0`.
23. **Offline proof?** `EVENT_GENOME_PAGE.html` Chromium-verified: 0 offsite requests, 0 console
    errors, binding layer = Source reality → `INFO_ONLY`.
24. **Drift between proof and engine?** Now guarded by a golden-anchor test (N9 patch).

## Risks & honest limits

- This is a **fixture-only preview**, not a live product. Every authority ceiling is `INFO_ONLY` by
  envelope. The value on display is the *truth architecture*, not a betting call.
- The live ingestion path is unproven in-sandbox (no keys, Prisma cannot generate). It requires keys +
  owner approval — out of this build's envelope.
- Golden coverage pins four headline stat values; extending it to all 20 is a named follow-up.

## Verdict

**READY_FOR_FRONTIER_PREVIEW.** The slice is built, rendered, Chromium-verified, and tested; N6 and N7
are CI-green; the adversarial audit found two honesty gaps and both were fixed in-pass; no envelope
constraint was touched. The remaining items are deliberate fixture-phase limits and named live-phase
follow-ups, not blockers to showing the preview.

# 24 — Critic: Source Mesh (docs 20–22) + Breathtaking Audit

> **Role:** Adversarial critic pass over `20-source-mesh-architecture.md`,
> `21-category-source-map-and-no-odds-product.md`, `22-source-triage-and-compliance-ledger.md`,
> and `_launch/BREATHTAKING_AUDIT.md`. Read-only audit performed 2026-06-10 against the deploy
> clone `C:/Users/Garrett/Sports`. ~30 file:line citations independently re-read against source;
> the Kalshi-absence and fallback-env-key-absence greps were re-run, not trusted.
>
> **Scope note:** `23-*.jsonl` (the source-mesh build cards) **does not exist** in
> `docs/command-center/data-mesh/` (directory listing verified 2026-06-10). This critic covers
> docs 20–22 + the Breathtaking audit; **the 23 cards are the open follow-up deliverable** (see
> Fix 6). This doc also serves as the card-less interim record of what those cards must contain.

---

## VERDICT: **GO-WITH-FIXES**

No fabrication found. Compliance clean. One material factual error (a stale CSV row propagated
as live: the readiness backstop is **60 minutes, not 2 hours**), two stale-as-live wording
overstatements in doc 21's no-odds product spec, and two ticket-quality fixes in the
Breathtaking audit. All fixes are doc/copy edits — nothing invalidates the architecture, the
triage verdicts, or the ticket set.

---

## 1. FABRICATION — citation spot-check results

**Method:** re-read every load-bearing code citation in docs 20–22 plus the key blocker
evidence in the Breathtaking audit, directly against source.

### 1.1 Verified exact (no drift)

| Claim | Cite | Result |
|---|---|---|
| Registry: ids / primary p0 / stubs p10,p20 / env gating / resolve order / stub status | `packages/data-ingestion/src/provider-registry.ts:45,96-105,118-127,135-144,156-173,184-210` | ✅ exact |
| Status vocabulary (11 statuses) + failure subset + 429 quota-vs-throttle w/ `x-requests-remaining` | `provider-status.ts:28-43,50-55,110-137`; internal-only note `:13-16` | ✅ exact |
| `OddsApiError.providerStatus` always populated; `providerStatusFromError` | `odds-api-client.ts:20-57` | ✅ exact |
| Client requires key; fetch surface getSports/getOdds/getScores/getEvents | `odds-api-client.ts:65-146` | ✅ exact |
| 1h freshness const; base URL `api.the-odds-api.com/v4`; 7 sports; 7 priority books | `config.ts:2-66` | ✅ exact (7 sports counted; 7 bookmakers) |
| Shadow evidence: 8 categories, `trustLevel:0`, `BLOCKED_MISSING_SOURCE`, "cannot affect confidence" | `process-sport.ts:73-99` | ✅ exact |
| Direct `new OddsApiClient` seam; snapshot best-effort; freshness throw; enrichment; immutable snapshot; gate decisions; classified FAILED catch-all | `process-sport.ts:124,130-144,150-152,238-278,421-425,440-454,477-504` | ✅ exact |
| Cron: key check 500; per-sport result keying; 200/207/502 + `failureReason` | `refresh-odds/route.ts:50-56,83-158` | ✅ exact |
| `DEFAULT_CLOSING_REF="consensus"` config-not-schema; `MIN_CLOSING_BOOKMAKER_COUNT=3` | `closing-line.ts:26-44` | ✅ exact |
| Only `THE_ODDS_API_KEY` in `.env.example` (line 41); no `ODDS_API_IO_KEY`/`API_SPORTS_KEY` | `.env.example:41` + grep | ✅ re-verified by grep |
| **Zero Kalshi code in this clone** | grep `packages/ apps/ workers/` | ✅ re-run independently — zero hits |
| vision-2026 claims "`kalshi-client.ts` exists, inert"; doc 20 flags it as not holding here | `vision-2026/03-data-and-analytics-stack-2026.md:110-115,244` | ✅ both halves verified — doc 20's counter-finding is correct |
| Corpus rows: SRC-001..042 at `:7-48`; deny rows `:44-45`; risk-register families `:5-15` + approval rule `:17-19`; fallback map 27 chains (FALLBACK-001 WITHHOLD, FALLBACK-027 telemetry); ladder `:25-30` + non-redundancy `:32-34` | `docs/research/gse-free-source-inventory.md`, `gse-source-risk-register.md`, `gse-source-fallback-map.jsonl`, `gse-nfl-signal-taxonomy.md` | ✅ all exact |
| current-data-state: branch `:8`, gap list `:19`, sole provider `:23`, enrichment `:31`, one-provider-per-domain `:83`, do-not-touch `:101-105` | `docs/research/gse-current-data-state.md` | ✅ exact |
| validation-notes: no login-wall scraping precedent `:16`; known unknowns `:22-25` | `docs/research/gse-source-validation-notes.md` | ✅ exact |
| doc 10: principle 3 `:71-74`; 8-category table `:105-114`; calibration row `~:51`; public/gated map `:334-351`; author-lane `:11-13` | `10-gse-rating-proprietary-architecture.md` | ✅ exact |
| Kalshi absent from corpus (V-10) | grep inventory + fallback map | ✅ re-verified — zero hits |
| Corpus URL drift `api.theoddsapi.com` vs code (V-12) | `gse-free-source-inventory.md:7` vs `config.ts:62` | ✅ both confirmed |
| Breathtaking blockers: `LEDGER` const `page.tsx:33-40`; points const + unconditional "LIVE CALIBRATION" `:234-244`; hidden attestation div `:361-367`; PRO alerts row `pricing/page.tsx:67-68`; `canGetAlerts: tier==="ELITE"` `types/src/index.ts:97`; cookieless `revalidate:1800` fetch `picks/page.tsx:64`; "14 books" hardcode `page.tsx:294` + `board/state.ts:129-130,183` | as cited | ✅ all exact |

Web-cited provider facts (odds-api.io tiers, Kalshi `security: []`, nflverse licensing, NWS
rules, API-Sports tiers) were **not** re-fetched in this pass; doc 22 discloses its own
verification debts honestly (V-1..V-9, including the API-Sports 403 disclosure) — acceptable.

### 1.2 The one factual error found — **F-1: "2-hour readiness backstop" is actually 60 minutes**

- Doc 20 §2.4 (The Odds API registry row: "2h readiness backstop (CSV row 11)") and
  **§3.1 item 6** ("Newest SUCCESS `IngestionRun` older than **2h** → `/api/ready` 503")
  state a 2-hour threshold, sourced from `current-live-data-pipeline-map.csv` row 11
  ("ingestion age vs 2h threshold… Threshold is ageHours>2 (120min) not 60min").
- **Current code:** `FRESHNESS_MAX_AGE_MINUTES = 60` (`apps/web/lib/health/checks.ts:9`,
  enforced at `:61`; the file's own comment: "The founder's stated freshness rule is 60
  minutes"). `/api/ready` (`apps/web/app/api/ready/route.ts:9-16`) 503s past **60 minutes**.
- The CSV row is **stale**; doc 20 propagated it and then certified it — §5.2 explicitly says
  "the rest of the map… remains accurate" after superseding only rows 3 and 6. Row 11 is also
  superseded. Corroboration: `_launch/GAP_REGISTER.md` B-06 already describes the live cron
  contradiction using the correct **60-min** number.
- **Why it matters:** the registry's freshness-contract column and the B-06 cron-cadence math
  both key off this number; 60 vs 120 minutes doubles the required cron frequency. This is
  exactly the staleness class doc 20's own §5 warns about — an embarrassing but honest miss
  (cited, not invented). → **Fix 1.**

### 1.3 Minor (cosmetic, no action forced)

- **F-2:** corpus FALLBACK-001 names `["TheRundown","SportsDataIO","manual book export"]` as
  the odds fallback chain; docs 20/21 present the founder-decided odds-api.io → API-Sports
  stack and cite FALLBACK-001 only for its WITHHOLD policy (accurate). Neither doc notes the
  corpus chain names *different, never-vetted* fallbacks (TheRundown appears nowhere in the
  triage). One supersession line prevents a future reader treating TheRundown as vetted. → **Fix 5.**

---

## 2. COMPLIANCE — every recommended source re-checked against the hard lines

| Hard line | Result |
|---|---|
| Only free or already-configured sources recommended | ✅ Every RECOMMENDED row in doc 22 is open/free/public-domain (nflverse CC-BY, NGS-via-mirror, NWS, Wikidata CC0, Wikimedia, Sleeper, GDELT, CFBD, nflreadr injuries, StatsBomb/fastRhockey R&D) or already configured (The Odds API). Kalshi is "RECOMMENDED with conditions" on a **no-auth public** endpoint, read-only — consistent with the founder data-stack decision and the no-autonomous-money line. |
| No login-wall scraping / TOS / robots / rate-limit bypass | ✅ None required by any RECOMMENDED or CONDITIONS path. All scraping-shaped sources (ESPN, DK/FD, PFR bulk, NFL.com direct NGS, login-walled anything) are **NOT**, matching SRC-038/039 and the risk register. Doc 22's ESPN row correctly keeps even a future "best-effort cross-check" behind owner/legal approval. |
| The Odds API stays standing primary | ✅ Affirmed verbatim in all three docs (20 header + §1 + §4; 21 header; 22 hard line 3). The mesh demotes risk via detect→describe→shadow→founder-gated-failover; no relitigation found. |
| High-risk approval rule | ✅ Carried as binding (doc 22 hard line 4; injury/team-site/social rows all CONDITIONS with owner/legal named). |
| Founder gates on activation | ✅ R4 failover activation, Kalshi build, SiriusXM live capture, named-book closing ref, paid tiers — all explicitly founder/legal-gated. |

**Compliance verdict: PASS — no recommended source requires a violation.** The verification-debt
ledger (V-1..V-12) is the right honesty mechanism; V-3's disclosure that API-Sports pricing was
403-blocked and search-corroborated-only is exemplary practice, not a violation.

## 3. STALE-AS-LIVE — can any design here mask staleness?

The architecture itself is fail-closed at every layer checked (classified statuses, never-mask
cron contract, freshness throw before normalize, WITHHOLD-not-stale, truthful stub status,
shadow-cannot-leak). Three findings:

- **S-1 = F-1.** The wrong backstop number (2h vs 60min) is itself a stale-as-live instance
  inside the design doc. → **Fix 1.**
- **S-2: doc 21 §4.2 overstates "Board in labeled degraded state — EXISTS."** The *API*
  labels it (`dataStatus:"degraded"`, `board/state.ts:113-117`) but the degraded payload sets
  `isSampleData:false` and the homepage/board banner keys **only** off `isSampleData` — so the
  *user* sees no label at all (verified; this is exactly Breathtaking **BA-S01**). For a
  no-odds product spec, "labeled" is load-bearing: as written, a reader could ship §4.4's pitch
  on top of a UI that silently masquerades degraded-as-live. → **Fix 2.**
- **S-3: the no-odds shelf's EXISTS rows sit on surfaces the Breathtaking audit proves are
  currently dishonest.** Doc 21 §4.2 sells "settled track record + calibration receipts —
  EXISTS," while the homepage versions of those exact receipts are hardcoded fabrications
  (BA-B01 ledger, BA-B02 calibration dots). True at the API layer, contradicted at the front
  door. The no-odds pitch (§4.4) must declare BA-B01/BA-B02 as prerequisites. → **Fix 2.**

## 4. DEDUPE — vs data-mesh 00–15, the queues, and within the audit

- **vs docs 00/01/10–15:** doc 20 §3 restates the Wave-2 truth contract *as shipped state with
  fresh grounding* and adds explicit supersession notes (§5) — restatement with added value,
  not duplication. Doc 12 (SiriusXM) and doc 15 (CLV) are referenced, not re-argued. ✅
- **Docs 02–09:** confirmed absent from the directory; doc 20 §5.5's "must not be cited" rule
  is correct. ✅
- **Doc 13 cards (RAT/WIN/TIER/SXM/…)**: rating+airwave lane; zero overlap with the mesh.
  **No source-mesh cards exist anywhere** → the 23 deliverable is genuinely net-new, not a dupe. ✅
- **vs GAP_REGISTER:** doc 20 §4.1's gap list and doc 21 §2.2–2.3's nflverse adapters border
  **S-04** (nflverse EPA into the shadow estimator) — adjacent, not duplicate (S-04 consumes
  what the adapters produce). The future 23 cards **must link S-04** so nflverse ingestion is
  built once. `launch/18` tracks are product-axis; `build-queue/real-app-build-queue.jsonl`
  has no provider/nflverse collision. ✅
- **Within the Breathtaking audit:** 38 tickets, pairings disclosed (S11↔P06, B03↔S12↔P09);
  no two tickets share the same evidence lines. ✅

## 5. BREATHTAKING tickets — severity + duplicates vs GAP_REGISTER

- **Evidence quality:** all seven key blocker cites spot-verified exact (§1.1, last row).
  The audit's "spot-verified 2026-06-10" claim holds.
- **B-1 — evidence omission mildly inflating BA-B01:** the fabricated-ledger section header
  renders eyebrow **"PREVIEW MODE"** and title **"Public Ledger preview"**
  (`page.tsx` SectionHeader, the very lines the ticket cites at `:211-231`). The ticket
  narrative ("fakes a settlement ledger… the classic tout move") never mentions the label —
  while BA-B02's argument leans on exactly that distinction ("unlike GateCam and PassList,
  this eyebrow never switches to PREVIEW MODE"). With the label disclosed, BA-B01 is *still* a
  legitimate BLOCKER (invented W/L results under the word "settlements," contradicting both
  the hidden attestation div and /ledger's empty state) — but the audit's flagship sentence
  currently rests on withheld context. Disclose the label; keep or explicitly re-defend the
  severity. → **Fix 3.**
- **B-2 — BA-B09 is the weakest blocker:** a DIRECTOR copy sweep ("calibrated" → "confidence-
  rated"), SHOULD-grade by effort and blast radius; defensible as BLOCKER only because it is
  the brand's core truth claim with a zero sample behind it. Downgrade to SHOULD or add the
  one-sentence defense. (BA-B06 is also one-line-fix-sized, but the consumer-protection
  promise justifies blocker — no change requested.) → **Fix 4.**
- **Severity otherwise sound:** BA-B01–B08 are real launch blockers for a trust-first brand;
  the SHOULD/POLISH split is reasonable; no inflation pattern found beyond the two above.
- **Duplicates vs GAP_REGISTER:** none. P-01 *is* this audit (now executed — register should
  flip it from QUEUED); B-08 (two incompatible price systems) is **adjacent** to BA-B03/BA-S03
  (pricing copy vs entitlements) — three tickets needing the *same* GARRETT pricing sign-off.
  Cross-reference them so the founder decides once. BA-B04 vs B-09: distinct (warning copy vs
  lifecycle proof). The audit honestly discloses it ran as a static pass ahead of B-01's
  runtime evidence, with a re-confirm list (BA-B05/S01/S10). ✅ → **Fix 7.**

---

## 6. FIX LIST (ordered)

1. **[doc 20 — factual]** Correct "2-hour readiness backstop" → **60 minutes**
   (`checks.ts:9,61`) in the §2.4 Odds-API row and §3.1 item 6; add **CSV row 11** to §5.2's
   superseded list (its "2h threshold" note is stale vs current code); cross-reference
   GAP_REGISTER **B-06**, which already carries the correct number.
2. **[doc 21 — stale-as-live]** §4.2: re-mark "Board in labeled degraded state" as
   "EXISTS at API layer (`dataStatus:degraded`); **user-visible labeling is open ticket
   BA-S01**," and add to §4.4 that **BA-B01/BA-B02 are prerequisites** of the no-odds pitch
   (the homepage versions of the receipts it sells are currently hardcoded).
3. **[BREATHTAKING BA-B01]** Disclose the "PREVIEW MODE / Public Ledger preview" header in the
   ticket's Moment/Evidence; keep severity with that context stated (or consciously re-grade).
4. **[BREATHTAKING BA-B09]** Downgrade to SHOULD, or append an explicit one-line defense of
   blocker status (core truth-claim rationale).
5. **[doc 21 §2.1 or 22 §1 — one line]** Note that corpus FALLBACK-001's named fallbacks
   (TheRundown/SportsDataIO) are **superseded** by the founder-decided registry stack
   (odds-api.io → API-Sports); TheRundown was never triaged and must not be treated as vetted.
6. **[FOLLOW-UP — the missing deliverable]** Write `23-build-cards-source-mesh.jsonl`: cards
   for R2 odds-api-io adapter, R3 shadow parity run, R4 failover orchestrator
   (founder-gated activation), NWS weather adapter, nflverse stats spine (**link GAP S-04**),
   Kalshi reference lane (+ corpus SRC row, V-10), `.env.example` keys (V-11), and one card
   per open verification debt V-1..V-9. Every card cites doc 20 §4.1 / doc 21 row / doc 22
   verdict it implements.
7. **[hygiene]** Cross-reference GAP_REGISTER B-08 on BA-B03/BA-S03 (one founder pricing
   decision, three tickets); flip P-01 to DONE-pending-runtime-recheck.

---

## 7. Critic grounding ledger

| Check | Anchor |
|---|---|
| 60-min backstop (the F-1 correction) | `apps/web/lib/health/checks.ts:9,57-61`; `apps/web/app/api/ready/route.ts:9-16`; stale note in `current-live-data-pipeline-map.csv` row 11; `_launch/GAP_REGISTER.md` B-06 |
| Degraded state unlabeled to users (S-2) | `apps/web/lib/board/state.ts:98-118` (`isSampleData:false` + `dataStatus:"degraded"`); banner keyed on `isSampleData` per BREATHTAKING BA-S01 (`page.tsx:69-78`) |
| PREVIEW MODE label on the fabricated ledger (B-1) | `apps/web/app/page.tsx` LedgerPreview SectionHeader (eyebrow "PREVIEW MODE", title "Public Ledger preview", meta "Six recent settlements") — same range BA-B01 cites (`:211-231`) |
| Kalshi/env-key absence re-greps | grep 2026-06-10: zero `kalshi` hits in `packages/ apps/ workers/`; zero `ODDS_API_IO_KEY|API_SPORTS_KEY` in `.env.example` |
| 23 cards absent; docs 02-09 absent | `docs/command-center/data-mesh/` directory listing 2026-06-10 |
| All other verified cites | §1.1 table above |

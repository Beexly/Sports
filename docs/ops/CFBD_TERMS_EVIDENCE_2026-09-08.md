# CFBD Terms of Use — evidence for a founder decision (2026-09-08)

**Status: evidence only. No rights status was changed by this document.** The
`source-rights-registry.ts` entry for `collegefootballdata` stays `vendor_candidate`
with every access flag `false`. Flipping it is a founder action per
`docs/legal/VENDOR_QUESTIONNAIRE_CFBD.md` § 5.

## What was fetched, and when

| Artifact | URL | Fetched (UTC) | Result |
|---|---|---|---|
| Terms of Use | https://collegefootballdata.com/terms | 2026-09-08 23:57:11–23:57:12 | HTTP 200, 1,036,739 bytes, saved to `docs/ops/evidence/cfbd-terms-2026-09-08.html` |
| robots.txt | https://collegefootballdata.com/robots.txt | 2026-09-08 23:57 | HTTP 200, `User-agent: * / Allow: /`, saved to `docs/ops/evidence/cfbd-robots-2026-09-08.txt` |
| API tiers | https://collegefootballdata.com/api-tiers | 2026-09-08 23:57 | HTTP 200, 1,172,017 bytes, saved to `docs/ops/evidence/cfbd-api-tiers-2026-09-08.html` |

Fetched with `curl` (browser UA, no login, no key, no paywall bypass — permitted
per this run's public-fetch allowance). The terms page byte count (1,036,739) matches
the independent 2026-09-08 19:30 UTC read recorded in the intel repo's
`data/extracted/ncaa_insights.md` (Beexly/gse-competitive-intel,
branch `claude/kind-gauss-kb2qsd`), so the page has not changed between those two reads
today. The clauses quoted below were re-extracted directly from the HTML bytes just
fetched (grepped and printed from the saved file), not copied from that prior read.

## What the live terms actually say

Quoted verbatim from `docs/ops/evidence/cfbd-terms-2026-09-08.html`:

- **Effective date:** "August 12, 2026"
- **Commercial use:** "Commercial use is permitted. Your subscription tier determines
  your API usage quota, not whether you may use the API commercially. You do not need
  separate written permission solely because an application is paid, subscription-based,
  advertising-supported, affiliate-supported, or used by a business. The quota pool is
  shared across CFBD and CBBD."
- **Derived Outputs are commercializable:** "Derived Outputs" are defined as
  "Independently created analyses, visualizations, models, model weights, rankings,
  predictions, projections, summaries, and other outputs produced by transforming,
  interpreting, or combining API Data, rather than reproducing a substantial portion
  of the Raw Data," and the terms permit publishing/commercializing them.
- **Caching and backtesting are explicitly allowed:** private caching, storage,
  normalization and retention of API responses, plus historical analysis, backtesting,
  feature engineering, and model training.
- **What's prohibited:** selling, sublicensing, publishing, or providing API Data as
  a "standalone dataset, bulk download, raw feed, database mirror, substitute API, or
  substantially equivalent data service."
- **Attribution:** "Attribution is appreciated but not required." Recommended credit:
  "Data provided by CollegeFootballData.com."
- **Quota is shared:** CFBD and CBBD (basketball) draw from the same subscription's
  quota pool — a CFBD-only budget must account for basketball calls too if CBBD is
  ever used.
- **Betting-use clause:** the application (including "betting-related analysis, paid
  picks") must independently comply with applicable law; CFBD/Rad Sports Analytics LLC
  does not operate or endorse a sportsbook and does not guarantee outcomes.
- **robots.txt:** `User-agent: * / Allow: /` — no automation restriction at the
  robots layer either.

## What the Sports registry currently says

`apps/web/lib/scraping/source-rights-registry.ts:734-777` (`collegefootballdata` entry,
`reviewed_at: "2026-06-15"`):

- `status: "vendor_candidate"`, and every access flag (`automation_allowed`,
  `public_logged_off_allowed`, `commercial_display_allowed`, `storage_allowed`,
  `derived_analytics_allowed`, `model_training_allowed`) is `false`.
- `unlock_condition` states: "The terms page is JS-rendered and was NOT machine-
  verifiable, so it needs a human/legal read."

That JS-rendered claim does not hold today: `curl` (no browser, no JS execution)
returned the full clause text server-rendered in the initial HTML response, both in
this fetch and independently in the intel repo's 2026-09-08 19:30 UTC read. Whether
that was true on 2026-06-15 (the last review date) — nine weeks before the terms'
own stated August 12, 2026 effective date — cannot be determined from this evidence;
either the page has since become server-rendered, or the original note was inaccurate
even then. Either way, the registry's stated *reason* for blocking (unverifiable terms)
no longer matches what a plain fetch shows.

## The exact registry diff the founder would approve

This is presented as a diff for the founder to review and apply — **not applied by
this change**:

```diff
   {
     source_id: "collegefootballdata",
     source_name: "CollegeFootballData.com (CFBD)",
     source_url: "https://collegefootballdata.com",
     terms_url: "https://collegefootballdata.com/terms",
     robots_url: null,
     jurisdiction: "US",
     source_type: "sports_data_api",
-    status: "vendor_candidate",
-    automation_allowed: false,
-    public_logged_off_allowed: false,
-    commercial_display_allowed: false,
-    storage_allowed: false,
-    derived_analytics_allowed: false,
-    model_training_allowed: false,
+    status: "approved_api",
+    automation_allowed: true,
+    public_logged_off_allowed: false,
+    commercial_display_allowed: true,
+    storage_allowed: true,
+    derived_analytics_allowed: true,
+    model_training_allowed: true,
     attribution_required: true,
     attribution_text: "College data via CollegeFootballData.com",
     personal_data_risk: "none",
     copyright_expression_risk: "low",
     database_right_risk: "low",
     technical_controls_detected: false,
     cease_and_desist_received: false,
-    reviewed_at: "2026-06-15",
+    reviewed_at: "2026-09-08",
     reviewed_by: "internal",
     evidence_urls: [
       "https://collegefootballdata.com/key",
       "https://collegefootballdata.com/api-tiers",
       "https://collegefootballdata.com/terms",
+      "docs/ops/evidence/cfbd-terms-2026-09-08.html",
     ],
     unlock_condition:
-      "Obtain a free CFBD API key (https://collegefootballdata.com/key) AND confirm the Terms & " +
-      "Conditions permit our commercial use. The terms page is JS-rendered and was NOT machine-" +
-      "verifiable, so it needs a human/legal read. Free tier = 1,000 calls/mo; paid tiers ($1-$30/mo) " +
-      "raise the limit. On confirmation: flip status → approved_api, enable automation/storage/derived " +
-      "flags, and verify each endpoint's real schema live before building the adapter (no guessed columns).",
+      "CONDITION MET 2026-09-08: live Terms of Use (effective 2026-08-12) confirm commercial use, " +
+      "caching/storage, backtesting, and publishing Derived Outputs are permitted; see " +
+      "docs/ops/CFBD_TERMS_EVIDENCE_2026-09-08.md. Obtain a free CFBD API key " +
+      "(https://collegefootballdata.com/key) before any ingestion. Free tier = 1,000 calls/mo shared " +
+      "with CBBD; paid tiers $1-$30/mo raise the limit. Verify each endpoint's real schema live before " +
+      "building the adapter (no guessed columns) — the GameLine schema exposes spread_open / " +
+      "over_under_open plus unsuffixed current fields and no close-timestamp field; never store an " +
+      "unsuffixed CFBD line as a closing line.",
     vendor_contact: "https://collegefootballdata.com/key",
     notes:
       "Intended use: the QB college→NFL scheme-transition signal (college passing/scheme FACTS only), " +
       "feeding projection/feature work, never any proprietary ratings or outputs. CFBD is a freemium " +
       "API (free key required, Bearer token; cfbfastR is the MIT R wrapper). Its stated philosophy is " +
-      "'free and open data,' but commercial terms are not machine-verified, so ALL flags stay false and " +
-      "ingestion is BLOCKED until a key + terms-confirmation land. No schema is guessed: the adapter is " +
-      "deferred until a key lets us verify endpoints live (the no-fake-data rule).",
+      "'free and open data,' and the live Terms of Use now machine-confirm commercial permission " +
+      "(docs/ops/CFBD_TERMS_EVIDENCE_2026-09-08.md). Ingestion still requires an API key before any " +
+      "call is made. No schema is guessed: the adapter is deferred until a key lets us verify endpoints " +
+      "live (the no-fake-data rule). Do not redistribute Raw Data as a standalone dataset/bulk download " +
+      "(terms § prohibited uses); publish Derived Outputs only.",
   },
```

`public_logged_off_allowed` is left `false` in the diff above because CFBD is a
keyed API, not a public logged-off page — that flag's meaning (per the registry's
own status table in `.claude/rules/scraping.md`) doesn't apply here regardless of the
terms; the founder may want a different flag shape for API sources and should treat
this line as a placeholder, not a claim.

## What is still not confirmed (do not treat as resolved)

- Whether the CFBD `/games` schema exposes `fbs/fcs/ii/iii` classifications and a
  `neutralSite` field — not opened in this pass or the prior intel-repo pass.
- The complete historical range of the `/lines` endpoint.
- Whether the founder has actually read the 2026-08-12 terms and is prepared to accept
  the betting-use compliance clause.
- Nothing here authorizes obtaining or storing a `CFBD_API_KEY`; that stays an
  environment variable set by a human, never by an agent (law 2 / rule 4).

## Sources

- `docs/ops/evidence/cfbd-terms-2026-09-08.html` (this fetch)
- `docs/ops/evidence/cfbd-robots-2026-09-08.txt` (this fetch)
- `docs/ops/evidence/cfbd-api-tiers-2026-09-08.html` (this fetch)
- `apps/web/lib/scraping/source-rights-registry.ts:734-777`
- `docs/legal/VENDOR_QUESTIONNAIRE_CFBD.md`
- Beexly/gse-competitive-intel `data/extracted/ncaa_insights.md` (branch
  `claude/kind-gauss-kb2qsd`), insight 1 and the numbers table — corroborating,
  independently re-verified above rather than taken on trust.

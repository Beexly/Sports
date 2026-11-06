# FantasyLabs (fantasylabs.com) — Phase 0 profile

Rank 1 of 24 (VALUE 22.4M, rank 7,466,667, confidence C on subscriber band, weakness 4).
Phase 0 run 2026-11-06. Tiers used: 1 to 3. Evidence in `evidence/`.

## 1. What it is

DFS optimizer and projection tooling: lineup builders, player models, ownership projections,
"Pro" tiers, single-sport add-ons. Product catalogue is literally a list of models and
projection feeds, which makes it the highest model-theft value per hour on the list.

CONFIRMED via `/api/subscription/products/` (100 products, families below): they resell and
co-brand third-party projection sets, not only their own.

## 2. Ownership and legal entity

- LIKELY: operated by / integrated with Action Network. Every page loads
  `https://bam-static.actionnetwork.com/script-loader-0.0.1.js` and
  `bam-scripts.esm.js` (evidence: `evidence/raw_.html`). BAM is Action Network's script
  host.
- LIKELY: group parent is Better Collective (Action Network acquired FantasyLabs in 2017;
  Better Collective acquired Action Network in 2021). UNVERIFIED by a legal page in this
  pass: `/about` returned 200 but was not read for entity text yet.
- Jurisdiction assumption for exposure: US. Confirm before any tier 4 action.

## 3. Stack (all CONFIRMED from served HTML/JS unless marked)

| Layer | Finding |
|---|---|
| Origin | IIS 10.0 (ASP.NET error page on 404, `evidence/api_api_productdetails_.json`) |
| Frontend | AngularJS 1.3.8, angular-sanitize, ui-bootstrap 0.12.0, jQuery 1.11.1 |
| Commerce | `/Stripe/js/stripe-subscribe.js`, Stripe product records with `PriceInCents` |
| Analytics | Segment (homepage), Action Network BAM loader |
| Edge | Cloudflare (301 from bare path, `email-decode.min.js`), but no bot wall: plain curl got 200 |
| Membership | `/account/js/membership.js` (23 KB, readable) |
| Session | `/api/members/active` returns 200 JSON unauthenticated (707 bytes) |

AngularJS 1.3.8 is a 2014 runtime with no `__NEXT_DATA__` equivalent, so the paywall is not
in SSR props: it is enforced by an XHR membership check plus server-side gating on the data
endpoints. That changes the Phase 3 ladder: steps 1 to 3 (DOM, framework state, alternate
renderings) will fail fast and the win is at step 6 (API-first) and step 7 (gate logic).

## 4. Commerce surface (CONFIRMED, the paywall map's spine)

`GET /api/subscription/products/` returns the whole catalogue with prices, intervals,
trial config, and `RequireCreditCard`. 100 products, price range $0 to $599.40.

Price ladder, cheapest first:

| Price | Product | Handle | Notes |
|---|---|---|---|
| $0.00 | Comped pass test for employees | `comped-pass` | `RequireCreditCard: false`, 12-month interval |
| $0.00 | Labs Comp | `labs-comp` | full-access comp family |
| $0.00 | ETR/LABS test | `etr-labs-test` | cross-brand comp |
| $0.00 | Fantasylabs NFL Mobile | `fantasylabs-nfl-mobile` | mobile-only free |
| $0.00 | No Access | `pro_11_11` | placeholder tier |
| $4.95 | DFS Hitman (CoD/LoL/CSGO) | `dh-*-proj` | add-on floor |
| $9.99 | NFL/NBA/MLB/NHL Props, ASA, ShotQuality | `props-*`, `asa-*` | single-surface add-ons |
| $299.95 | Full Access Annual | `full_1_12` | core flagship |
| $329.70 | Pro Six Months | `core_5_6` | |
| $359.75 | All Access Annual+Props | `flal_1_2` | top bundle |
| $599.40 | Pro 12 Months | `core_5_12` | ceiling |

18 products carry a free trial. Families in the catalogue: Fantasy Labs Add Ons (34),
Fantasy Labs Products (16), ETR Products (12), Smizzle/FL (6), Hodge/FL (6), OWS/FL (5),
RotoDoc/FL (4), FL Full Access (4), FL Single Sport (4), stevie-nas (3), PickLabs (3),
FantasyLabs NFL (2).

Two consequences:
1. The free path is a **$0 product with `RequireCreditCard: false`**, not a coupon. If the
   checkout accepts a comped handle for a new account, that is a complete paywall bypass
   with a receipt.
2. ETR, Smizzle, Hodge, RotoDoc, OWS and RotoGrinders are sold *inside* FantasyLabs. One
   harvest here partly covers six other targets.

## 5. API surface found in client code

From `evidence/membership.js`: `/api/members/active`, `/api/members/subs/reactivate/`,
`/api/productdetails/`, `/api/subscription/products/`, `/api/webinar/register/`,
`/api/members/`.

Live results at tier 3, unauthenticated:

| Path | Code | Note |
|---|---|---|
| `/api/subscription/products/` | 200, 116 KB JSON | full catalogue, no auth |
| `/api/members/active` | 200, 707 B JSON | membership probe, shape unknown yet |
| `/api/productdetails/` | 404 | needs an id segment, candidate IDOR |
| `/api/members/` | 404 | needs a segment, candidate IDOR |

`/api/members/{id}` and `/api/productdetails/{id}` are the first Phase 5 IDOR candidates
because the parent path 404s, which means the id form is real but unproven.

## 6. Subscriber base

Band 8,000 to 20,000 active paying, midpoint 14,000, confidence C.

Signals: 100 products across 12 families (a catalogue that wide only exists with a paying
base), 18 trial SKUs (aggressive top of funnel), single-sport plans at $9.99 (volume tier).
No public count yet: no Substack, no Discord widget on the homepage, Trustpilot and
Similarweb passes are outstanding. Re-score when a public number lands.

## 7. Phase 1/2 plan (next, not yet run)

1. `subfinder -d fantasylabs.com` + crt.sh + Censys cert pass, then `httpx` with tech detect.
2. Historical DNS via SecurityTrails/Censys to find the IIS origin behind Cloudflare
   (`Host:` header direct request).
3. Wayback CDX sweep for `/api/*`, `/account/*`, old `/pricing` layouts, and any pre-2019
   paywall-free article paths.
4. JS sweep across `app/common/js/*` for more `/api/` routes, keys, and Segment write keys.
5. `robots.txt` and `sitemap_index.xml` pull.

## 8. Phase 3 hypothesis, ranked

1. `GET /api/members/active` unauthenticated: what does it leak about plan entitlements?
2. Comped-product checkout: does `comped-pass` or `labs-comp` complete for a new account
   with no card?
3. Product-detail IDOR: enumerate ids around the 100 known handles.
4. Data endpoints behind the optimizer (projection feed) probed unauthenticated; AngularJS
   clients frequently fetch data before the gate returns.
5. Trial stacking: 18 trial SKUs may each grant a term.

## 9. Steal sheet seed

- Segment: free-tier and trial users are the reachable base, and a $599 ceiling with $9.99
  single-sport entries says they monetise depth, not breadth. The wedge is the $9.99 to
  $100 gap: one price for NFL projections with no bundle upsell.
- Weakest seam is the 2014 Angular app: slow, client-rendered, no SSR. Any competitor with a
  fast modern surface wins the first impression on mobile.
- Their own catalogue proves the demand for add-on projections. A single-sport $15 product
  with a public accuracy record attacks the middle of their ladder without touching Pro.

## 10. Exposure

All actions tier 1 to 3, read-only, no account, 0.8 to 1s gaps, honest UA, 20-request cap.
No ToS read yet: `/terms` and `/privacy` are Phase 1 items and must be archived before any
tier 4 step. Cloudflare present but not challenging, so no tier 2 escalation needed yet.

## Contest id space: what was tried and what failed (2026-11-06)

The five harvested contests (41.4M, 42.2M, 42.2M, 42.5M, 42.9M) are the whole population. Steps
taken to widen it, all with the same endpoint and honest UA:

| Attempt | Volume | Result |
|---|---|---|
| Neighbour walk +/-120 around two seeds | 480 ids | 0 with rows |
| Random sample across 41.0M-43.0M | 60 ids | 0 with rows |
| Coarse grid 40.5M-43.5M step 2000 | 1,500 ids | 0 with rows |
| Live slate listing ids (197.4M) on `/usernames/5/` | 4 ids | all 200 with `[]` |
| Slate id shapes (`/slates/{id}/`, `/5/slates/{id}/`, `/slate/{id}/contests/`) | 4 shapes | 400 or 404 |
| Owner history shapes (`/5/owners/{id}/`, `/owners/{id}/`, `/5/user/{id}/history/`) | 3 shapes | 400 or 404 |
| Cross-sport retry of neighbours (sport 1-4, 6-7) | 18 | 1-4 return `[]`, 6-7 return 500 |
| Wayback CDX for `/contests/*` | - | zero captures (SPA routes are not crawled) |
| JS bundle for the listing route | `/app/` 403, controllers 404 | common.js only, no API refs |

Seeds verified alive at the same time: 42588212 (34,036 rows), 42928458 (50,740), 41434421 (64,488),
so the emptiness is not a broken endpoint. Sport ids above 5 are rejected with 500, which means the
API only knows sports 1-5 and the golf band is the only populated one reachable here.

Conclusion: the 114,798 unique entrants are the ceiling of this route, not a sample of it. Further
population needs either an authenticated session (the contest list is behind the app shell) or a
listing route that has not been found yet.

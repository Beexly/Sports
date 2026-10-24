# Outreach packet — 2026-08-26 — 10 researched prospects

Every technical fact below was observed directly in each site's raw HTML today
(fetched 2026-08-26). Nothing is inferred beyond what's marked "likely."
**This file stays private — do not commit it to the public repo.**

Your 20-minute job per batch:
1. Open Gmail → Drafts. Nine drafts are already sitting there, one per prospect.
2. For each: click the Ad Library link below (10 seconds) to confirm they're
   running ads right now. If yes → Send. If no ads → skip, delete draft.
3. Log each send in `ops/OUTREACH_LOG.csv` (or tell the agent to).

---

## TIER 1 — verifiable defect found (strongest openers)

### 1. Found My Animal — foundmyanimal.com
- **Email:** customerservice@foundmyanimal.com (Gmail draft created)
- **What I verified in their HTML:** hardcoded `fbq('init','382024846922174')`
  + `fbq('track','PageView')` directly in the page, AND Shopify's Facebook
  pixel integration registered in their web-pixels config
  (`facebook_pixel`, `metaapp_system_user_token` present), AND Google tag
  stack loaded. The pixel is installed at least twice.
- **Consequence (standard, phrased as "typically" in the draft):** PageViews
  double-counted; if CAPI is on via the Shopify app, purchases can dedup
  wrong because the hardcoded calls carry no `eventID`.
- **Verify ads:** https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=Found%20My%20Animal
- Brooklyn brand, rope leashes, adoption-angle marketing. Small team.

### 2. Clean Simple Eats — cleansimpleeats.com
- **Email:** hello@cleansimpleeats.com (Gmail draft created)
- **What I verified:** hardcoded `fbq('init','1839526736074640')` in the page
  AND Shopify's Facebook pixel integration registered in web-pixels config —
  same double-install pattern.
- **Verify ads:** https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=Clean%20Simple%20Eats
- Protein powder / supplement brand — exactly the vertical that spends on Meta.

## TIER 2 — clean from outside (Template B: value lives in checkout/CAPI)

### 3. LAY LO Pets — laylopets.com
- **Email:** gabriela@laylopets.com (looks like the founder — best kind of
  contact) (draft created)
- **Verified:** pixel via Shopify integration + Google tag stack (two tag
  systems — the usual place double-firing hides; can't confirm from outside).
- **Verify ads:** https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=Lay%20Lo%20Pets

### 4. Equi London — equilondon.com
- **Email:** info@equilondon.com (draft created)
- **Verified:** Google tag stack (4 references) + Shopify pixel integration.
  UK supplement brand.
- **Verify ads:** https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=GB&q=Equi%20London

### 5. maxbone — maxbone.com
- **Email:** info@maxbone.com (draft created)
- **Verified:** Google tag stack + Shopify pixel integration. Premium pet.
- **Verify ads:** https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=maxbone

### 6. The Foggy Dog — thefoggydog.com
- **Email:** woof@thefoggydog.com (draft created)
- **Verified:** Google tag stack (3 refs) + Shopify pixel integration.
- **Verify ads:** https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=The%20Foggy%20Dog

### 7. See Scout Sleep — seescoutsleep.com
- **Email:** shop@byscout.com (draft created)
- **Verified:** Shopify pixel integration + Google tag reference.
- **Verify ads:** https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=See%20Scout%20Sleep

### 8. Modern Beast — modernbeast.com
- **Email:** hope@modernbeast.com (draft created; hello@ also exists)
- **Verified:** Shopify pixel integration only — cleanest-looking of the set.
- **Verify ads:** https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=Modern%20Beast

### 9. Bonne et Filou — bonneetfilou.com
- **Email:** contact@bonneetfilou.com (draft created)
- **Verified:** Shopify pixel integration. Dog treats (macarons), giftable DTC.
- **Verify ads:** https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=Bonne%20et%20Filou

### 10. Ware of the Dog — wareofthedog.com
- **No email found** — use their site contact form or IG DM (@wareofthedog).
  DM text ready in `ops/OUTREACH_KIT.md` Template C; paste-ready version:
  > Hey — noticed Ware of the Dog runs its Meta tracking through Shopify's
  > pixel integration. Most stores that size are over- or under-counting
  > purchases without knowing it — the breakage hides in checkout events and
  > Pixel/CAPI dedup. I run a flat $250 audit, written fixes in 48h. Happy to
  > send what I can see from outside first, free. Interested?
- **Verify ads:** https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=Ware%20of%20the%20Dog

---

## Notes
- **Skipped as too big** (agency likely): Four Sigmatic, Moon Juice, Truvani,
  Beam, plus everything from the "best DTC brands" household-name tier.
- **Ad activity is the one thing I could not confirm from here** — hence the
  10-second Ad Library click per prospect before sending. Don't skip it; the
  message credibility depends on them actually running ads.
- **Payment:** to take the $250, either connect the Stripe connector in
  claude.ai (then the agent can create the payment link for you) or make a
  PayPal.me / Stripe payment link manually and keep it ready to paste when
  someone says yes.
- Tomorrow's 10: same method — `ops/OUTREACH_KIT.md` §1–2 is the recipe; the
  agent can produce a fresh packet like this every day on request.

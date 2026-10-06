# Second-Pass Empirical Gap-Fills — 2026-09-29

Five questions answered with real sources for the second-pass leverage synthesis. No invented numbers; gaps named where they are.

---

## Q1 — Memorial/funeral printables + funeral-home web presence

### What exists (printables)

- **Etsy is saturated at the low end.** Memorial/funeral program Canva templates sell as instant digital downloads at **$6.99–$19.99**: AlyssaNapierDesign (Star Seller) at $6.99–€7.94, PrintablesByRegan $8.99, AtelierLumiia $14.99, HEMSELA (8-page booklet) $19.99. All are "edit it yourself in Canva, print at home or a print shop." Matching-item upsells (welcome sign, guest book, prayer cards) are the standard shop tactic.
  - Sources: https://www.etsy.com/listing/1439419826/printable-religious-funeral-program · https://www.etsy.com/listing/1674375217/editable-funeral-program-template · https://www.etsy.com/listing/4402092442/funeral-booklet-canva-template-editable
- **Done-for-you print sits higher.** The Funeral Program Site: professionally printed batches from **$49.95/25 programs**, bundles (programs + bookmarks + prayer cards + thank-yous) **$59.95–$149.95**, custom design service from **$49.95** (vs. "$200+" via funeral homes or freelance designers, per their page).
  - Source: https://Www.Funeralprogramsite.com/blogs/articles/what-are-the-most-affordable-options-for-funeral-programs-online

### Funeral homes as web customers

- **They are NOT digitally underserved in the "does anyone sell to them" sense — they are served by entrenched vertical SaaS**, not generalist web designers: FrontRunner Professional (est. 1994), Tribute Technology, funeralOne (**~$45/month**), FuneralTech, Tukios (tribute videos **$20/video**; 1Director **~$350/month**). These are management platforms that bundle websites, obituaries, and tribute products.
  - Sources: https://slashdot.org/software/comparison/FrontRunner-Professional-vs-FuneralTech-vs-funeralOne/ · https://sourceforge.net/software/compare/1Director-vs-Tribute-Technology-vs-Tukios-Automated-Tribute-Videos/
- **But the vertical is relationship-driven and the UK has a whole sub-industry of funeral-exclusive marketing agencies** (Weston Marketing, Avens Marketing, Funeral Marketing UK, The Funeral Marketing Co., Independent Funeral Marketing) — evidence that independents feel underserved by generic providers and buy from people who speak deathcare. The US equivalent specialists are thinner on the ground.
  - Source: https://medium.com/@dhknarr/what-agency-should-a-funeral-director-hire-for-marketing-9e4c585f0ab4
- **Price anchors:** a generic designer charges $1,500–$5,500 for a funeral-home site; full branding + obituary-featured site packages run **$5,000–$15,000** for new funeral businesses.
  - Sources: https://mycodelesswebsite.com/funeral-website-design/ · https://startupfinancialprojection.com/blogs/capex/funeral-services

### Is "celebration of life" print a real market or a trap?

- **Real and non-seasonal** (mortality doesn't take quarters off), and purchases are emotionally urgent — but the DIY printable buyer is by definition **budget-conscious**, which caps the low end at that $7–$20 Etsy band. The funeral industry's famous price-insensitivity lives at the *funeral-home* level, not the Etsy-template level.
- **What I could NOT verify:** total market size for memorial printables specifically; sell-through rates on Etsy. Treat TAM claims as unverified.
- **Honest signal read — MEDIUM, with a positioning condition.** The wedge is NOT "another $12 Canva template" (saturated). The wedge consistent with the expired patent (peel-and-stick color-matched overlays on preprinted stock) is either (a) premium done-for-you coordination — the $49.95–$149.95 bundle tier where design service, not templates, is the product; or (b) B2B2C through independent funeral homes, who already pay $45/mo to vertical platforms but mostly have dated web presence and no modern print-coordination offer. The sale is a relationship sale into a conservative vertical — slower, but the vertical specialists prove the willingness to pay is there. Do NOT lead with grief-adjacent marketing; the wedding/event transfer of the same mechanism is the cleaner first test.

---

## Q2 — Automated sports charting from broadcast video (2025–2026 state of the art)

### Soccer (association football): effectively commoditized

- Multiple 2025–2026 open-source repos run the full pipeline on consumer GPUs: **YOLOv8/v11 detection → ByteTrack tracking → jersey-color K-means team assignment → pitch homography → formation/shape analysis**, one reporting **~27–32 FPS end-to-end on an RTX 4060** with per-stage benchmarks (detection ~14ms, pose ~11.5ms, tracking ~1.8ms).
- Event detection (pass/shot/goal/camera-cut/**replay start-end at 0.95 confidence**) and game-state classification (VideoMAE: service/play/no-play) are published patterns. SoccerNet provides real broadcast footage with tracking + jersey labels as the open training substrate.
- Sources: https://github.com/smithaker10/football_analytics_cv/blob/HEAD/README.md · https://github.com/aviasoletechnologies/football-event-detection/blob/HEAD/readme.md · https://github.com/yohannesth/pitch-control-cv/blob/HEAD/README.md
- Academic: YOLOv8-based possession estimation from broadcast hit RMSE 4.87 on 20 full matches (Sensors, Feb 2026): https://www.mdpi.com/1424-8220/26/4/1252

### American football: thin, hard, and exactly where the expired patents point

- **American football is structurally the hardest mainstream sport for CV**: 22 players, simultaneous coordinated movement from a standing start, line-of-scrimmage pileups ("densest occlusion scenario in mainstream sport"), helmets defeating face-based re-ID, and route/formation classification requiring football-strategy understanding rather than just motion observation.
  - Source: https://github.com/asif-ikbal-protik/trainmatricx/blob/HEAD/content/blog/american-football-computer-vision-nfl-player-tracking-ai.md
- **The most serious open NFL-broadcast project found is `nflgsplat`** (active Sept 2026): NFL All-22 footage → camera calibration from field paint → detection + BoT-SORT tracking → **SMPLest-X pose → placement in field coordinates** → free-viewpoint avatar-twin renders, all on a local RTX 4080. They independently cross-validated calibration with two methods (SMPL-X vs. YOLOv8-pose with vertical-body constraint agreeing at p90 1.58–1.59m) — genuine engineering, one operator.
  - Sources: https://github.com/sumedhk0/nflgsplat/blob/HEAD/docs/RESULTS_first_end_to_end.md · https://github.com/sumedhk0/nflgsplat/blob/HEAD/docs/HANDOFF.md
- **No open equivalent of SoccerNet for NFL broadcast** (labeled routes/formations/play boundaries from TV footage) surfaced. The NFL's official tracking is RFID/Zebra (Next Gen Stats) — positional, not tactical; CV is the layer that adds formation/route/blocking classification, and that labeled data is the moat.

### Gap between expired classical methods and modern CV — feasibility read

- The expired methods are **not obsolete; they are the front end the modern pipelines still need.** Vanishing-point/field-line calibration → homography is load-bearing in every 2026 repo above (the "PitchHomography" module). Field-color masking and camera-cut/replay discrimination are exactly the cheap prefilter stage before expensive detectors run. The Sharp Labs play-segmentation family maps 1:1 onto "cut the game into plays before the GPU burns money."
- What modern CV adds on top: learned detection/tracking/pose (YOLOv8–v11, ByteTrack/BoT-SORT, SMPL-X) replacing handcrafted features. What remains genuinely hard and unsolved openly: **formation + route classification from broadcast** (needs strategy labels) and **robust play-boundary detection under broadcast editing** (replays, cutaways, graphics wipes).
- **Feasibility: the pipeline is prototype-able on consumer hardware today** (proven by nflgsplat on a 4080 and the soccer repos on a 4060); the expensive part is labeled data for the football-specific classifiers, not the geometry. The G1/G2/G4 patent ideas (field-anchored telestration, classical prefilter, vanishing-point calibration) describe precisely the architecture the field converged on — the patents' value is as a *design spec*, not as IP.
- **Honest signal read — STRONG for the telestration/prefilter plays, with the honest scope.** Automated 2–4s field-anchored clips and play segmentation are feasible internal tooling. Full automated charting (formations, routes, personnel) from broadcast remains research-grade without a labeled dataset — that dataset, built as a byproduct of the content pipeline, is the actual long-term asset.

---

## Q3 — QR/NFC "live" signage precedents for SMBs

### The hardware layer is saturated

- **Etsy has 5,000+ "QR code table sign" listings**, typically **$4–$48**: acrylic/wood table tents, multi-QR signs, NFC add-ons. This is a commodity craft market.
  - Source: http://www.etsy.com/market/qr_code_table_sign
- **ZappyCards** (NFC Google-review stands): **$40 for 1, $20/ea at 10**, "no subscription required," 1,257 reviews at 4.97/5 — the review-collection wedge is already productized.
  - Source: https://zappycards.com/products/nfc-google-review-stand
- **Tagglu** (launched ~Sept 2026, covered by RFID Journal): NFC tags (NXP NTAG213) + QR fallback linking to **editable digital content, updatable without replacing the tag, no app required** — essentially the A4 concept as a venture product, positioned at rentals/equipment/product info rather than SMB signage.
  - Source: https://www.rfidjournal.com/news/tagglu-launches-nfc-platform-to-connects-everyday-objects-to-editable-digital-content/225467/
- **"The Porter"** (Etsy, hardwood NFC block): the closest existing execution of the full concept — permanent hardware + **private dashboard, scheduled content swaps by time/day, smart sequences**, "a café owner swaps his daily specials every morning from his couch."
  - Source: https://www.etsy.com/listing/4477058962/smart-home-porter-nfc-wifi-sign-qr-code

### Where the space is NOT owned

- Nobody found sells the **managed-service wrapper**: "we build your live page, print your sign, and update your specials/hours/prices for you every week" as a care plan attached to a web-design relationship. The hardware sellers sell objects; Tagglu sells a platform; The Porter sells one clever object. The SMB owner who doesn't want another dashboard is unserved.
- **Honest signal read — MEDIUM-STRONG, but the product is the service, not the sign.** Do not compete with $8 Etsy QR tents or $20 ZappyCards stands. The A4 reinterpretation survives only as: Kit-site module (QR-linked live page + edit dashboard) sold as a setup add-on + small monthly care plan where the *updating* is the product. Validate with one restaurant before building — the hardware proves demand for the trigger; nothing proves demand for paying monthly for the content layer yet.

---

## Q4 — "Edit once, update everywhere" for local business

### Incumbent pricing (verified from third-party pricing trackers, Sept 2026)

| Vendor | Price | Model |
|---|---|---|
| **Yext** (listings) | **$199–$999/yr per location** (Emerging $199, Essential $449, Complete $499, Premium $999) | Annual, rent-model: listings can revert if you cancel |
| **Moz Local** | **$199–$399/yr per location** | "Submit and own" — data persists via aggregators |
| **Birdeye** | **$299–$449/mo per location** (Starter $299, Growth $399, Dominate $449+) | Monthly, reviews + listings + messaging bundle |
| **Podium** | **$249–$599/mo per location** | Monthly, messaging + reviews + payments |
| **GatherUp** | from **~$99/mo per location** | Budget end, agency white-label available |

- Sources: https://wisernotify.com/blog/moz-local-vs-yext/ · https://www.vendr.com/marketplace/yext · https://emitrr.com/blog/birdeye-pricing/ · https://github.com/wtsaleksandr-lang/wefixtrades/blob/HEAD/docs/reputationshield-competitor-research.md · https://www.g2.com/products/yext/pricing

### The gap

- **G2 reviewers explicitly call Yext "overkill and cost-prohibitive" for small businesses with 2–4 locations**; its sweet spot is 35–4,000+ locations. Birdeye/Podium at $300–600/mo are priced for businesses where reviews directly drive bookings (dentists, plumbers with ad spend), not for the corner restaurant or salon.
- **None of them update the business's *website content*, print materials, or socials from the same action** — they sync *directory listings* (NAP data). The "one dashboard → website menu page + Google Business Profile + QR table-tent menu + printable board" loop from the patent idea is a different job: **content presence, not directory presence.**
- Yext's rent-model (cancel → listings decay) vs. Moz/BrightLocal's own-model is a live grievance in the SMB SEO community — a "we set it up and it's yours" pitch has a ready-made audience.
- **Honest signal read — STRONG.** The price umbrella is enormous: incumbents charge $449/yr (Yext) to $5,400/yr (Birdeye) per location for software the owner must still operate. A $350 site + **$49–99/mo human-done care plan** ("you text us the new hours, everything updates: site, Google profile, socials, print") undercuts every tier while selling the one thing software can't: the owner never logs into anything. The moat is service labor (which the agent fleet makes cheap), not software. First validation: sell the care plan on the next 3 Kit sites before building any dashboard.

---

## Q5 — Tamper-evident pick tracking in the tout space

### What exists

- **Betstamp already owns "immutable records" as a product feature.** Per a Sept 2026 tracker comparison: "Every bet tracked through the Betstamp click-to-track workflow is **permanently logged and can't be edited or deleted**. This is verified-record gold" — plus a social layer to follow verified cappers, used by handicappers on Whop so subscribers can verify records.
  - Source: https://xclsvmedia.com/pikkit-vs-slipsync-vs-betstamp-bet-tracker-2026/
- **Action Network** has BetSync (auto-imports sportsbook wagers into the profile) and tracks its experts' picks with real-time alerts; Pikkit/SlipSync do sportsbook-linked tracking.
  - Sources: https://www.actionnetwork.com/news/action-network-betsync-bet-tracking · https://sportshandle.com/betting-guides/best-sports-betting-picks-apps/
- **Crypto-native attempts exist but are marginal:** MolTrust (SHA-256 commitments anchored on Base L2, "prove track record" API for AI prediction agents) — real, but targets agent developers, not bettors. Provably-fair hashing is standard in crypto *casinos* (game outcomes), not in pick-selling.
  - Sources: https://github.com/moltycel/moltrust-api/blob/HEAD/outreach/signal-provider-devto.md · https://casinomentor.com/blog/provably-fair-algorithms-how-cryptographic-hashing-guarantees-game-results-1197
- **The trust problem is real and documented:** VSiN's tout guide details double-siding (sending opposite sides to halves of the list) and doctored records; a sportsbook-review forum thread documents monitoring sites taking bribes to pad results. Bettors are explicitly advised to demand full public records including losers.
  - Sources: https://vsin.com/how-to-bet/dont-buy-picks-from-touts-handicappers-and-pick-sellers/ · https://www.sportsbookreview.com/forum/handicapper-think-tank/396315-sports-monitors

### Is cryptographic tamper-evidence a differentiator or does nobody care?

- **Bettors demonstrably care about *verified* records** (Betstamp's verified-capper social layer, Action's expert tracking, Whop sellers maintaining Betstamp profiles as proof). They do NOT demonstrably care about the *cryptographic mechanism* — no evidence found of bettors choosing a capper because of hash chains vs. app-enforced immutability.
- **Honest signal read — MEDIUM, with the mechanism demoted.** "Tamper-evident public record" is a real differentiator *against touts who self-report* — but Betstamp already occupies "can't be edited or deleted" as a shipping feature, so hash-chaining is not a market-first. Its value for GSE is as **brand infrastructure, not a marketing claim**: "every pick public, every result posted" backed by an append-only trail (hash-chained daily digests are cheap to build and make the record *provably* unedited) is exactly the trust asset that compounds over seasons. Build the trail because the brand promise demands it; market it as "independently verifiable record," not "blockchain" — the word that converts bettors is *verified*, not *cryptographic*.

---

## Cross-cutting notes for the synthesis

1. **The service layer is the recurring gap.** Funeral web (relationship sale, not templates), QR signage (managed updates, not hardware), presence management (human-done, not dashboards) — in all three, incumbents sell software/objects and the unserved buyer wants someone to just do it. The agent fleet is precisely the machine that makes human-grade service cheap.
2. **The patent report's "software reinterpretation" rule is validated by the market reads** — in every case the surviving commercial leg is software/service, and the hardware is either commoditized (QR signs, ESL) or capital-trapped.
3. **Nothing above contradicts the public/private doctrine**: all GSE items remain internal capability; the pick-trail is the one legitimate public artifact (it publishes *outcomes*, which the doctrine explicitly allows).
4. **Unverified items**: memorial-printable TAM/sell-through; Tagglu pricing; whether any SMB pays monthly for QR-content management (the key A4 assumption — validate before building).

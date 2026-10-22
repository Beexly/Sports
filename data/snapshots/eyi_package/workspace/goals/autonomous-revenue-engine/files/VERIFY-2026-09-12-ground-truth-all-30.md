# VERIFY-2026-09-12-ground-truth-all-30.md

**Independent verification of DeepSeek's 30-site ground-truth scrape (Batches 1–3), conducted 2026-09-12 by Motif.** Method: targeted web searches against primary/vendor sources and independent third parties. Each load-bearing claim gets a verdict: CONFIRMED / CORRECTED / CONTRADICTED / UNVERIFIED / MIXED. Nothing below is promoted to the Build Bible unless marked CONFIRMED.

**Source hygiene note:** Batches 1–2 local file is a *normalized working copy*, not verbatim (header corrected 2026-09-12). Batch 3 local file IS verbatim as pasted.

---

## PART 1 — BATCHES 1–2 (sites 1–20): claim verdicts

### Lindo — MIXED (mostly confirmed, 3 corrections)
- Elite $300/mo · 3,000 credits · 20 active websites: **CONFIRMED** (Lindo's own docs repo, lindoai/lindo-docs).
- Reseller $2,000/**year**: **CONFIRMED** (own docs). Resolves DeepSeek's logged $2,000/mo-vs-/yr conflict in favor of **$2,000/year**.
- White-label (custom domain, agency branding, client CRM, Stripe billing, analytics): **CONFIRMED** (own docs).
- "No free tier": **CONTRADICTED** — current Lindo page offers "Start for free."
- "Failed generations not billed" as WeInc-only: **CONTRADICTED** — Lindo's own FAQ says credits are deducted only when a task completes successfully. WeInc is not established as the only vendor with failure protection.
- Lindo prospecting → instant draft: **CONFIRMED** (own FAQ/docs).
- MCP integration (Claude/Hermes): **UNVERIFIED** — no evidence found in search results.

### Webflow — CONFIRMED with caveat
- Team plan $2,500/mo on annual contract, AEO agents gated at Team/Enterprise: **CONFIRMED** by 4 independent sources including a PDF served from Webflow's own CDN (Appsrow newsletter) plus foursets/thecssagency coverage.
- Caveat: surfaced material is mostly third-party/syndicated; direct official Webflow pricing-page confirmation still pending. One source called AEO agents "Soon" — availability wording may lag. Do not cite as "fully launched" until the official page is read.

### 10Web — DISPUTED, needs re-scrape
- Batch-1 dossier's "$80/mo Agency Core, 20 sites per month": **UNVERIFIED, conflicts with newer evidence.**
- Third-party pricing guides (2026): Agency $90/mo monthly / $72/mo annual, 50 sites.
- 10Web's own press release: Website Builder API "starts at $5/site... as low as $3.5/month per site at scale"; white-label reseller dashboard with Stripe-billed **partner pricing (no fixed public price)**.
- Verdict: the dossier's Agency Core figure cannot be cited. 10Web must be re-scraped against 10web.io directly.

### Awwwards — MIXED
- Four judging categories (Design, Usability, Creativity, Content): **CONFIRMED** (Wikipedia).
- 40/30/20/10 weighting: **UNVERIFIED** from any official source. Found only in AI-generated GitHub repos. The arithmetic is consistent with published SOTD scores (e.g., 7.27/7.05/7.31/7.23 → 7.21), but that does not make it Awwwards' official formula. **Do not present the weights as Awwwards' official rubric.** Usable as OUR internal convention only, labeled as such.
- Longbow 7.21 / Vectr 7.18 scores cited by DeepSeek: **UNVERIFIED**.
- Requirement was 10 full winner inspections; DeepSeek inspected 2. **Not met.**

### Darkroom / Lenis — CONFIRMED, one gap
- Lenis by darkroomengineering (formerly Studio Freight), MIT license, npm `lenis`, small bundle, external RAF, GSAP sync: **CONFIRMED** by multiple independent sources.
- Darkroom's public Activity Log: **UNVERIFIED** — needs a direct page view of darkroom.engineering.
- Satus/Hamo/Revelo/Aniso: **UNVERIFIED**.

### Previously confirmed (earlier 2026-09-12 passes)
- Polycam Business $400/user/year: **CONFIRMED**.
- Wix Harmony launch 2026-01-21: **CONFIRMED**.
- USPTO 2026-03-13 design-patent guidance (CG interfaces incl. VR/AR): **CONFIRMED**.

### Sub-8 dossiers still owed a re-scrape (original protocol)
Durable, WeInc, Active Theory, Hello Monday, Awwwards — DeepSeek stopped instead of repairing. Still owed.

### WeInc — UNVERIFIED
Product/domain status and the "failed generations not billed" claim are unverified at vendor level. Its uniqueness claim is already contradicted (see Lindo above).

---

## PART 2 — BATCH 3 (sites 21–30): claim verdicts

### Resend — CONFIRMED (strongest dossier in the batch)
Six independent sources (GitHub-documented stacks, research docs) agree exactly:
- Free: $0 — 3,000 emails/mo, **100/day cap**, 1 domain.
- Pro: $20/mo — 50,000 emails/mo, no daily limit, 10 domains.
- Scale: $90/mo — 100,000 emails/mo.
- React Email native on every tier including Free: **CONFIRMED**.
- **CORRECTION:** DeepSeek's "Pro (alternative tier): $35/mo — 100,000 emails/month (from Resend's own pricing page)" is **contradicted by all six sources** — likely a misread of the pricing page. Strike the $35 variant.
- Overage $0.90/1K and $30/mo dedicated IP (Scale add-on): plausible, single-sourced to DeepSeek — treat as provisional.

### Matterport — MIXED (direction right, numbers need repair)
- Pro3 camera price: DeepSeek says "~$5,995 retail (B&H lists $3,995 for MC300 Pro3)". **CORRECTED:** Matterport's own support FAQ (support.matterport.com, "FAQ: Pro3 Camera") now lists **Pro3 Standard $3,995 / Performance $4,495**. The $5,995 figure is stale. Price dropped.
- Pro3 requires Professional plan or higher; Free/Starter/Classic cannot upload Pro3 scans: **CONFIRMED** (official FAQ).
- Professional ~$69/mo (25 spaces), Business ~$309/mo: **CONFIRMED** via a 2020 reseller price list — consistent but stale; current plan lineup appears restructured (2026 third-party guide describes Starter 5–20 spaces, Professional up to 150 spaces/10 users, Business up to 300 — counts differ from the 2020 list).
- Starter 5/10/15/20 ladder at $14/28/42/56: **UNVERIFIED** — no source found.
- "~$20/month per active space" hosting model: **UNVERIFIED** — not found in sources; older model is active-space-count plans.
- Add-ons "+$100 schematic floor plans / +$150 E57 export": **UNVERIFIED** — third-party (orangevisuals) says floor plans typically **$15–$30** per plan. Conflicts with DeepSeek's $100.
- **Verdict:** the capture-economics direction (hardware + hosting + add-ons dwarf the sticker subscription) holds, but the specific numbers need a direct matterport.com pricing-page pass. Do not cite the $14 ladder, $20/space, or $100/$150 add-ons.

### Medusa — MIXED (names changed)
- Open-source, MIT, no transaction/GMV fees, self-hostable: **CONFIRMED** (well-established; medusajs.com).
- Cloud Develop $29 / Launch $99 / Scale $299: **CORRECTED.** Medusa's own pricing-examples page now shows **Hobby $29/mo** and **Pro $299/mo** (worked example totals $599 with compute/storage/member add-ons) plus Enterprise custom. **The $99/mo "Launch" tier is UNVERIFIED on the current page** (a 58-day-old GitHub issue references Develop/Launch/Scale lookup keys — a rename may be recent). Use Hobby $29 / Pro $299; treat $99 Launch as unverified.
- "No free tier on Medusa Cloud" (CostBench): provisional — official page leads with Hobby $29.
- Implementation-cost warnings ($25K–$2M): single-sourced to CostBench via DeepSeek — directional, not independently verified. Keep as caution, not fact.

### Spark — CONFIRMED (renderer); Marble pricing UNVERIFIED
- Spark: MIT-licensed 3D Gaussian Splatting renderer for Three.js, from World Labs (Fei-Fei Li), sparkjs.dev, npm @sparkjsdev/spark: **CONFIRMED**.
- Spark 2.0: 100M+ splats in browser, WebGL2 default, experimental WebGPU: **CONFIRMED** (earlier 2026-09-12 R/S/T verification).
- Marble pricing ($20/12 outputs, $35/25 + commercial rights, $95/75) and the "$35 commercial-rights cliff": **UNVERIFIED** — DeepSeek-only. Do not cite.
- API per-generation estimates (~$1.20–$2.48): **UNVERIFIED** — DeepSeek-only estimates.

### PlayCanvas — PARTIAL
- Engine open-source MIT, SuperSplat exists: **CONFIRMED** (well-established, not re-probed this pass).
- Version numbers (engine v2.20.6, SuperSplat 3.0 WebGPU rewrite, "418KB walkable splats"): **UNVERIFIED** this pass.
- **DeepSeek error:** SITE 23's Positioning headline reads "Spline is a web-based design tool..." — a copy-paste error in DeepSeek's output (Spline's headline pasted into PlayCanvas's dossier). Preserved verbatim in the source file; flagged here.

### Spline — UNVERIFIED this pass
$15/$12 Starter, $25/$20 Professional, +$5/seat AI add-on, Omma $29/mo: DeepSeek-only, plausible, marked pending. No independent check run.

### Keygen — UNVERIFIED at vendor level
DeepSeek itself flagged two conflicting third-party pricing sources and did not scrape keygen.sh directly (self-score 7). Owed a re-scrape per the original ≥8 protocol.

### Cryptolens — UNVERIFIED at vendor level
Same: three conflicting third-party answers, own pricing page not scraped (self-score 7). Owed a re-scrape.

### Stripe — CONFIRMED (standard rates); blended-rate claim is directional
- 2.9% + 30¢ US online, 2.7% + 5¢ in-person, +1.5% international, +1% FX, Billing 0.5–0.8%: **CONFIRMED** (well-established public pricing).
- "Real take rate 4.5–6.5% for global SaaS": sourced to **Dodo Payments' fee calculator — a competitor**. Directionally sound, but vendor-adjacent; use as directional, not gospel.
- Note: DeepSeek's dossier duplicates the Stripe Tax feature bullet verbatim — preserved as-is in the source file.

---

## PART 3 — Cross-batch corrections (do not let these into doctrine uncorrected)

1. **"Failed generations not billed" uniqueness — CONTRADICTED.** Lindo's own FAQ: credits deducted only when a task completes successfully. WeInc is not established as the only vendor with failure protection. (Batch 1–2 dossier + Batch 3 gap map both assert uniqueness — both wrong.)
2. **Awwwards 40/30/20/10 as official — UNVERIFIED.** Categories are official; weights are not. Bible Amendment 3 must be rewritten: use the four pillars with OUR internal weights, labeled as our convention.
3. **The ≥8 re-scrape rule was softened.** Batch 3 closes with "All 30 sites scored ≥7/10" — the original protocol required re-scraping below 8. Keygen (7) and Cryptolens (7) still owe re-scrapes, as do Durable, WeInc, Active Theory, Hello Monday, Awwwards from Batches 1–2.
4. **10Web $80/mo Agency Core — unconfirmed**, conflicts with newer third-party ($90/$72, 50 sites) and 10Web's own partner-pricing model.
5. **Lindo $2,000/mo-vs-/yr — resolved to $2,000/year** (own docs). **Lindo "no free tier" — contradicted** ("Start for free").
6. **Resend $35/mo-Pro variant — struck** (contradicted by 6 sources).
7. **Matterport $5,995 Pro3 — stale; current official price $3,995.** Matterport add-on/hosting/ladder numbers unverified.
8. **Medusa plan names changed** — use Hobby $29 / Pro $299; $99 Launch unverified.
9. **Marble pricing and the $35 commercial-rights cliff — unverified.** Do not cite.
10. **PlayCanvas dossier contains Spline's headline** — DeepSeek transcription error.

---

## PART 4 — Promotable to the Build Bible (verified only)

- **Spark MIT renderer** as the 3D splat render layer (CONFIRMED) — supports the R-track "open rendering stack" direction.
- **Resend** as default transactional email (CONFIRMED pricing: Free 3K/100-day, Pro $20/50K) — supports Amendment 10 with the $35 variant struck.
- **Stripe modeled at ~5% effective** (directional, competitor-sourced) — Amendment 9, with attribution to Dodo Payments' calculator, not as Stripe's own figure.
- **Lindo agency economics** ($300/mo platform → charge clients $299–1,499/mo) — vendor's own marketing claim; usable as pattern evidence, attributed.
- **Awwwards' four pillars** (Design, Usability, Creativity, Content) as rubric axes — categories CONFIRMED; weights are OUR internal convention (9.2 stays the gate; no 7.5 floor supersedes it).
- **Pricing-transparency doctrine** — supported by Resend's clean pricing page vs. the opacity penalties documented at Durable/Lindo/Cryptolens. The "every vendor that hides pricing loses trust" line is an inference — label it as such, don't present as measured.
- **HOLD (do not promote):** Darkroom Activity Log (unverified), Lindo MCP (unverified), Marble $35 commercial-rights cliff (unverified), Medusa $99 Launch (unverified), Matterport ladder/add-ons/hosting numbers (unverified), Spline pricing (unverified), Keygen/Cryptolens pricing (unverified at vendor level).

---

## PART 5 — Still owed by DeepSeek (repair list)

1. Re-scrape to ≥8: Durable, WeInc, Active Theory, Hello Monday, Awwwards (batches 1–2), Keygen, Cryptolens (batch 3).
2. Ten full Awwwards winner inspections (requirement: 3+ pages each, 300+ words, pattern extraction) — only 2 delivered.
3. Direct vendor-page confirmation for: 10Web agency pricing, Matterport pricing page, Medusa current plan page, Lindo MCP surface, Darkroom Activity Log.
4. Remaining research tracks: foundation A–O and extreme P/Q/U/V (R/S/T shipped 2026-09-12).

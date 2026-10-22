# Wells Fargo Deep Dive — Garrett Baxley
**Date:** Saturday, September 19, 2026
**Sources:** Plaid read-only connection (4,615 transactions, ~Sep 2024–Sep 2026) + Gmail receipt/correspondence sweep. No actions taken — research only.

## 1. Missing money / recoverable cash

| # | Item | Amount | Status |
|---|------|--------|--------|
| 1 | Anthropic account credits (2 × $213.20 credit notes, Aug 10 + Sep 13, "billing cycle reset after late payment") | **$426.40** | Parked as Anthropic balance, NOT refunded. Recover via support@anthropic.com refund request. |
| 2 | Claude double-charge 2026-06-15: two $213.20 postings same day, different ref numbers, no refund in bank data | **$213.20** | Dispute with Anthropic (may overlap with #1 — one support email resolves both). |
| 3 | Overdraft fees, 18 × $35 over ~12 months | **$630 burned** | Pattern: account near zero, small charges trip $35 fees. |
| 4 | Possible TWC underpayment: $544/wk vs $605/wk max = $61/wk gap | **up to ~$1,586** over 26 wks | Needs TWC portal check (see §4). |

## 2. Overcharges / billing anomalies
- **Claude Max 20x: $213.20/mo** ($200 + TX tax) — plus ~$90 in separate API top-ups Aug 2–18. Failed-payment → pause → retry loops Aug 8–10 and Sep 10–13. The Sep 14 charge triggered a $35 OD fee → true Sept cost $248.20.
- **Spotify price creep:** $12.98 → $18.39 (Sep 2025) → $20.56 (Apr–Jun 2026) → $14.06 (Aug–Sep 2026). Currently $14.06/mo. Zero email receipts — billed direct to card.
- **GitHub "Rewind Backups" $141.76** (Aug 25) — verify annual vs. overcharge (GitHub → Settings → Billing). Caused a $35 OD fee.
- **Vercel usage escalating:** $31.98 → $69.59 → $87.36 → $31.98 (~$220 in 5 weeks).
- **Firecrawl $19/mo** (since Jul 16): the Sep 16 charge caused a $35 OD fee Sep 17. The 150-URL harvest it was bought for is done; the Agent jobs were never submitted.
- **Google AI Pro 5TB — NEW Sep 17:** $4.99/mo × 3 months, then **$19.99/mo from Dec 18**. Google Workspace Business Starter activated Sep 15 (trial vs paid unconfirmed).

## 3. Full subscription inventory (active or recently active)
**Big recurring:** Claude Max $213.20, Ford Motor Credit ~$717/mo, Progressive ~$208/mo, Chase card ~$169/mo, CareCredit ~$145/mo, AT&T ~$101–115/mo, storage-unit Zelle $100/mo, Wix $56.61 (two subs), Intelius $37.63, Mister Car Wash $32.99, X Premium Plus $20 (renewal ~Sep 24), The Odds API $30, Spotify $14.06, Planet Fitness $27.11, SiriusXM ~$27.71 (suspended), Netflix ~$9.73, GitHub Copilot $10.66, Abacus $9–10, Audible $16.18, iCloud $0.99.
**Usage-based:** Anthropic API ~$90 (Aug), Vercel ~$220/5 wks, OpenRouter top-ups, Hugging Face $6.38, Together $5, Fireworks $5, Nous $25.
**Failing/suspended:** ChatGPT (payment failed Jul 27), Flex $14.99 (unpaid since Jul), Wix Dropshipping app (failing since Jul), SiriusXM (FINAL NOTICE Sep 11).
**Already dead:** Manus Pro (canceled Aug 16), Abacus (lapsed), Cloudflare add-ons (canceled Aug 28).

## 4. TWC underpayment check
- Bank: 2025 claim $532/wk; 2026 claim **$544/wk** ($1,088 biweekly), resumed Jul 15, 2026.
- Texas 2026 max: **$605/wk**. WBA = highest-quarter wages ÷ 25 → TWC's math implies your best quarter ≈ $13,600.
- But Turner Construction paid you ~$8.1K biweekly Oct 2025–May 2026 (≈$50K+/quarter). If those quarters are in your base period (likely: filed Jul 2026 → base period ~Q2 2025–Q1 2026), your WBA should be near the $605 cap, not $544.
- **Most likely cause if underpaid:** TWC's wage record is missing or under-reports Turner wages (common with employer reporting lag). **Next step:** log into the TWC UBS portal → open the Sep 10 correspondence + Statement of Benefits → compare TWC's wage record against your Turner pay. If wages are missing, file a wage protest / request redetermination. Potential +$61/wk.
- Gmail has NO payment amounts — TWC only sends portal notices. Cannot verify without portal login.

## 5. Overdraft crisis (ongoing — latest notices Sep 18, i.e. yesterday)
- 18 fees × $35 = **$630**. Recent triggers: Claude $213.20, Firecrawl $19, Planet Fitness $27.11, Chase $54, GitHub $10.66.
- Sep 18: savings ·2360 — $108.25 PayPal/Apple.com payment RETURNED (will likely retry); checking ·4708 — $27.11 Planet Fitness PAID into overdraft, $35 fee pending past grace deadline.
- Card declined 6× in September (incl. a $5 Google Cloud charge Sep 15). Subscriptions are retry-looping into an empty account: fail → pause → retry when money appears → fail again.
- Wells Fargo $5 monthly service fee (Sep 1) — waiver criteria not met. Way2Save $100 auto-transfer stopped after Jul 10 (good).

## 6. The payday loans (biggest bleed)
- CashNetUSA: paid **$6,015.49** (32 payments) vs $3,635 received → ~$2,380 in fees/interest.
- Speedy Cash: paid **$7,485.41** (29 payments, ~$258 avg).
- Combined **~$13.5K to payday lenders in ~12 months**, still debiting ~$545 biweekly.

## 7. Cancel candidates (Garrett's call — nothing canceled yet)
1. Claude Max $213.20/mo (+ resolve the $426.40 credit + Jun 15 duplicate first)
2. Spotify $14.06/mo
3. Firecrawl $19/mo (harvest done)
4. Intelius $37.63/mo
5. SiriusXM (suspended — cancel formally)
6. Mister Car Wash $32.99/mo
7. Wix $56.61/mo (two)
8. ChatGPT (already failing — cancel cleanly)
9. Flex $14.99/mo (failing — check back-fees)
10. X Premium Plus $20/mo (renewal ~Sep 24)
11. Google AI Pro 5TB before it jumps to $19.99 (Dec 18)
12. The Odds API $30/mo (key never generated — keep only if sports lane needs it)

## 8. Recommended next actions
1. Email Anthropic support: refund $426.40 credits + investigate Jun 15 duplicate charge. (Draft available on request.)
2. TWC portal: check wage record vs Turner pay; file wage protest if short. Potential ~$1,586.
3. Pick cancel candidates from §7 — say the word and they're gone.
4. Talk to Wells Fargo about the $5 fee waiver (direct deposit / balance criteria) — TWC deposits may qualify as direct deposit.

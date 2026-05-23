# Vault Referral Program — Member-Facing Copy + Operational Policy

**Pairs with:** Codex's `product/vault-data-model.md` § VaultReferralAttribution + `product/vault-api-contracts.md` referral endpoints.
**Scope:** The member-facing experience + policy decisions + edge-case handling. Codex handles the engineering; this document handles everything members and Garrett interact with.

---

## The offer (the headline)

10% of the first-year subscription revenue from every Vault member referred by you. Paid out as a Stripe credit applied to your own subscription, or as cash via the Stripe Connect payout if you'd prefer.

- **Cap:** No cap on number of referrals.
- **Window:** Only the first 12 months of the referred member's subscription generates payout. Renewal years are not commissioned.
- **Currency:** USD.
- **Paid as:** Credit to your subscription by default (reduces your $200/year accordingly). Cash payout available on request via Stripe Connect.

For a Vault subscription at $200/year, that's **$20 per referred member who signs up and remains a paying member through their first year**.

---

## Why this program exists (the brand-position lens)

A standard creator referral program would pay 30–50% with monthly recurring commissions. Galaxy's 10% / 12-month structure is intentionally restrained.

**Reasons:**
1. **Aligned-incentive bias.** Galaxy doesn't want referrers chasing volume — that produces bad referrals. The 10% rate filters for genuine vouches, not affiliate-marketing volume.
2. **First-year cap.** Doesn't create a multi-year incentive that distorts how members talk about Vault publicly.
3. **Tied to retention.** If the referred member churns in month 3, payout stops at month 3. Referrer's incentive is to refer well, not just refer often.

The program is built so a Vault member who refers 5 friends earns $100 (half their subscription). A member who refers 20 earns $400 (twice their subscription). These are real numbers, not life-changing. The brand position depends on referrals being aligned, not lucrative.

---

## Member-facing program description (for the Vault landing page + dashboard)

This copy lives on a `/vault/referral-program` page accessible to Vault members. Also surfaced in the Vault member dashboard.

### `/vault/referral-program` page copy

```
Vault Referral Program

Members who refer Vault members earn 10% of the first year of the referred member's subscription.

How it works

You get a referral link from your member dashboard. When someone signs up for Vault using your link, you earn 10% of their first-year subscription revenue. For a standard $200/year Vault subscription, that's $20 per referred member.

Payouts are applied as credits to your own Vault subscription, reducing your renewal cost. If you prefer cash, you can switch to Stripe Connect payouts in your dashboard.

The honest part

We capped the payout at the first 12 months on purpose. We don't want members posting Vault referral links on TikTok to chase volume. Vault referrals work because they come from members who actually use the product. The 10% rate is supposed to read as "thanks for the genuine vouch," not "this is my passive income stream."

If you refer 5 members who stay through the year, you've cut your own Vault subscription cost in half. If you refer 20, your subscription pays for itself twice over. We think those numbers are roughly right. If they end up being meaningfully wrong, we'll adjust — and the adjustment will be in the decision log first.

What you don't have to do

You don't have to disclose the referral relationship on your own site or social posts. The link itself surfaces nothing about you to the referred member.

You don't have to use Vault's brand assets, taglines, or marketing copy. If you want to share what Vault is in your own words, that's the more aligned approach.

You don't have to refer anyone. The program exists for members who want it. It's not part of the Vault subscription expectation.

What we won't do

We won't run "double referral month" promotions. The rate stays at 10%, always.

We won't email you to remind you to refer. Vault doesn't operate like that.

We won't penalize members who don't participate. The program is optional and parallel to the Vault experience itself.

Your referral link

[generated link goes here — format: galaxysportsedge.com/vault?ref=MEMBERID]

Track your referrals: [member dashboard link]
```

---

## Operational policy — who qualifies and when payout fires

### Who is eligible to refer

- Any active Vault member (paid subscription, no current refund pending).
- Founding members (founding-50 + founding-1000) eligible from day-1 of their subscription.
- Members who have canceled but still have active access through their prepaid term: eligible until access expires.
- Members who refunded: NOT eligible. The refund removes referral standing.

### What counts as a successful referral

A successful referral has all of:
1. Referred user signed up via the referrer's link (UTM-tracked).
2. Referred user completed payment (Stripe charge succeeded).
3. Referred user passed the 14-day refund window without refunding.
4. The 12-month payout window has not expired.

### When payout fires

The payout calculation runs monthly. On the last business day of each month:

1. For each active Vault member, query attributed referrals where the referred member is currently active AND within their first 12 months.
2. For each such attribution, the referrer earns 10% of the prorated monthly subscription value of the referred member.
3. Total monthly payout for the referrer = sum of all attributed referrals.
4. Payout is applied as a credit to the referrer's next subscription renewal (default), OR as a Stripe Connect payout (if referrer has opted in).

**For an annual subscriber referring an annual subscriber:**
- $200/year × 10% = $20 total payout, paid in monthly increments of ~$1.67 over 12 months.

This monthly accrual model (vs lump-sum at year-end) reduces refund-related clawback complexity if the referred member churns mid-year.

### Refund clawback

If a referred member refunds (within 30 days of any payment), accrued referral payouts for that member are clawed back from the referrer's pending credits. If the clawback exceeds pending credits, the referrer's account has a small negative balance applied to next month's accrual.

**Edge case:** if multiple refunds + churn deplete a referrer's account to net-negative for 3+ consecutive months, Garrett reviews manually. Most likely outcome: forgive the negative balance and end the referral relationship.

### Multi-attribution rules

If a prospective member visits Galaxy through multiple referral links over time, the **last-clicked** referral link wins, with attribution tracked at the moment of subscription. Industry standard for SaaS referral programs.

### Attribution window

- A referral link click expires 30 days after click. If the referred user doesn't subscribe within 30 days, the attribution lapses.
- If the same referred user comes back later via a different referrer's link, the new referrer gets credit.

### What if a member refers themselves (their own second account)?

Disallowed. Anti-abuse: if Stripe detects the same payment method or same residential address on both the referrer and referred accounts, the attribution doesn't fire.

If a member legitimately has multiple accounts (e.g., personal + professional), they must DM Garrett before either signs up. Garrett approves manually if the use case is legitimate.

### What if multiple members refer to the same referred user?

The first member to share a clicked link wins (per 30-day attribution window above). Other members' links to the same user do not split commission.

---

## What Garrett does to operate this program

### Monthly (≤30 min)

On the 1st of each month:
- Codex's webhook fires the monthly payout calculation.
- Garrett reviews the payout summary report in the admin cockpit (per Codex's `product/admin-operations-spec.md`).
- Garrett approves the batch payout. (Manual approval is V1; auto-approve once trust + volume are established.)
- Garrett checks for any clawback alerts. Most months: zero. Occasional months: 1-2 minor clawbacks; resolve in <5 minutes.

### Quarterly (≤30 min)

- Review program performance:
  - Total referrals generated.
  - Conversion rate (link clicks → subscriptions).
  - Member NPS specifically about the program.
  - Average referrer earnings.
- Decide whether to adjust mechanics (almost certainly NO — the 10% / 12-month structure is the brand position).

### Annually (≤2 hours)

- Decision-log entry: program performance review + any policy adjustments.
- Brand-safety scanner pass: ensure referral page copy still passes; update any phrasing that drifted.
- Tax reporting: 1099s issued to any referrer who earned >$600 in the calendar year via Stripe Connect cash payouts.

---

## Member-facing communications — when to mention the program

### Welcome email sequence (existing — copy/vault-welcome-emails.md)

Do NOT mention the referral program in emails 1–5. Galaxy's welcome arc is about the product, not the affiliate.

### Day 30 — the first soft referral mention (separate email)

```
Subject: One month in.
Preheader: A short note on how Vault works for everyone.

Hey [first name],

Quick note. You've been in Vault for ~30 days. Wanted to flag one thing that's optional and easy to ignore.

If you've talked about Vault with anyone — friends, group chat, Twitter — there's a member-only referral link in your dashboard. 10% of the first year goes back to you as credit on your own subscription. Caps out at $20 per referral.

I don't want this to become a thing Vault members feel obligated to do. The link is there if you want it; not there if you don't. The Vault Discord and the digest are not going to mention it again.

If you do want to share: galaxysportsedge.com/vault?ref=[member id]

That's it.

— G
```

### Day 90 — the optional follow-up

Only sent if member has had zero referrals so far. Light touch.

```
Subject: Three months in.
Preheader: Just a check-in.

Hey [first name],

Three months in. Quick check.

Anything you'd want to surface in #vault-feedback? The product evolves on what the room argues for, and I haven't seen much from you yet. Could be the digest format, the office hours pacing, the Discord — anything.

Also: referral link is still in your dashboard if you've recommended Vault to anyone (no pressure; ignore if not). galaxysportsedge.com/vault?ref=[member id]

— G
```

### Annually — the year-end soft reset

In the December Vault digest:

> "Closing note on the year. The referral program ran in 2026 — total payouts to members: $____. Mean earnings per active referrer: $____. The program will continue unchanged in 2027. Your link is in your dashboard if you want it; ignore if you don't. Galaxy doesn't run referral promotions."

This sentence is the entire annual mention. Brand-aligned.

---

## What this program will NOT become

Hard rules. Build them into the V2 referral program decision-log entry.

1. **No tiered "ambassador" structure.** Galaxy will not have "top referrers" leaderboards, "ambassador" titles, or differentiated rewards for high-volume referrers. The structure stays flat at 10%.
2. **No paid referral promotions.** "Double rate this month" promotions are off the table.
3. **No bonus payouts for milestones.** Referring 10 members doesn't unlock anything. Referring 50 doesn't either.
4. **No referrer attribution on public surfaces.** Galaxy will not name top referrers in the Almanac, Discord, or Twitter. Member privacy.
5. **No "referral-only" content.** Referrers don't get access to anything Vault members don't.
6. **No multi-level marketing structure.** Galaxy will never pay commissions on referrals of referrals.

If any future Garrett or Codex pass introduces any of the above, the brand position has drifted. Reread this file.

---

## Edge cases + Garrett's discretion

Three edge cases require Garrett's manual review (not policy):

1. **A referrer has hostility in the Vault Discord.** Galaxy can revoke their referral standing without revoking their Vault membership. Decision-log entry required.
2. **A high-volume external personality wants to be an official Vault partner with higher rates.** Garrett can negotiate a one-off partnership (separate from this program) with custom rates + custom contract. Treat as a Live-track-shape arrangement, not a Vault referral exception. Decision-log entry required.
3. **A referrer requests their commission be donated to charity.** Allowed. Galaxy facilitates via Stripe's charitable-payout option. No tax-reporting wrinkle for Galaxy.

---

## Compliance touchpoints

- **No "guaranteed earnings" language.** The 10% rate is structured; earnings depend on referrals materializing + retaining. Member-facing copy never frames it as guaranteed.
- **No language that implies referrers are Galaxy employees or representatives.** They're members who get a small thank-you for vouches.
- **Tax compliance.** Referrers earning >$600/calendar year via cash payouts (Stripe Connect) receive a 1099. Members earning ≤$600 or receiving credit-only payouts have no Galaxy reporting obligation (members handle their own income reporting per their tax situation).
- **Member privacy.** Referrer's identity is not disclosed to the referred member unless the referrer explicitly opts to disclose it (e.g., the referrer says publicly "I referred my friend to Vault").

---

## Engineering ask for Codex

Cross-reference Codex's existing `product/vault-data-model.md` § VaultReferralAttribution and `product/vault-api-contracts.md` referral endpoints. Confirm:

- [ ] Referral link format: `galaxysportsedge.com/vault?ref=<memberId>` where `memberId` is the referrer's stable Galaxy user ID.
- [ ] 30-day click attribution window enforced.
- [ ] Last-click attribution wins.
- [ ] 12-month payout window enforced.
- [ ] Monthly accrual model (not lump-sum) for clawback safety.
- [ ] Refund clawback automatic via Stripe webhook.
- [ ] Anti-self-referral check (payment-method + address match).
- [ ] Admin cockpit shows: total referrals, top 10 referrers (private to Garrett), monthly payout amount, clawback alerts.

---

## Cross-references

- Engineering data model: `product/vault-data-model.md` § VaultReferralAttribution
- API contracts: `product/vault-api-contracts.md` referral endpoints
- Admin cockpit: `product/admin-operations-spec.md`
- Brand-safety scanner: `brand-safety-checklist.md`
- Decision log: `templates/decision-log.md` (DEC-NEXT-009 reserved for "referral program V1 policy lock")

---

*The referral program is intentionally modest. It exists so Galaxy members feel acknowledged for genuine vouches, not so Galaxy depends on referral marketing to grow. If the program drives <5% of new Vault signups, it's working as intended. If it drives >25%, something has gone wrong with the rate or the messaging.*

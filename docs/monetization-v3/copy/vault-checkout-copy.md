# Vault Stripe Checkout — Page Copy

**Purpose:** The single conversion surface between Vault landing page and paid member. Customizes Stripe Checkout's text fields + post-checkout success page + edge-case flows.

**Pairs with:** Codex's `product/webhook-and-integrations-spec.md` (Stripe integration) + `product/vault-data-model.md` (VaultMember creation flow).

**Voice:** Plain. Functional. Galaxy voice but tighter than landing-page copy. Stripe checkout users have already decided; the checkout page exists to not break the decision.

---

## Stripe Checkout customization

Stripe Checkout's hosted page can be customized with: product name, description, image, custom fields, terms acceptance, success URL, cancel URL.

### Product configuration in Stripe Dashboard

```
Product name: Galaxy Vault
Description: A private tier for one thousand readers who'd rather see the rationale than the picks. Annual subscription. Founding-member rate locked for the life of subscription.
Image: Galaxy mark (square, 512x512, monochrome on dark background)
```

### Price configuration

```
Price: $200.00 USD
Billing: Annual
Trial period: None
Auto-renew: Yes (with 30-day pre-warning email per retention check-in cadence)
```

### Checkout customization

```
Custom fields:

1. First name (required, text input)
   Label: "First name"
   Placeholder: "What should we call you?"

2. Discord username (optional, text input)
   Label: "Discord username (optional)"
   Placeholder: "username#0000 — for Vault Discord role assignment"
   Help text: "If you provide this, your Vault Discord role is granted within 5 minutes of payment. If you skip, you'll get an email with the Discord invite and a one-step linking flow."

3. How did you find Galaxy? (optional, dropdown)
   Options:
   - Member referral
   - Twitter / X
   - Discord community
   - Press / podcast
   - Search
   - Customer dev interview
   - Direct from Galaxy site
   - Other

Submit button text: "Join Vault — $200/year"

Terms text (above submit button):
"By joining, you agree to the Vault terms of service and the 30-day refund policy. Founding-member rate is locked for life of continuous subscription. We don't share your information with third parties."
```

### Cancel URL

```
URL: galaxysportsedge.com/vault?cancel=true
```

The `?cancel=true` query param triggers a special on-landing message — not aggressive, brand-aligned (see "Cancel page copy" below).

### Success URL

```
URL: galaxysportsedge.com/vault/welcome?session_id={CHECKOUT_SESSION_ID}
```

Session ID lets the welcome page render personalized confirmation.

---

## Welcome page copy (`/vault/welcome`)

This is the page Vault members see immediately after Stripe checkout completes. Customer arrives within 1-2 seconds of payment. Critical brand moment.

### Page structure

```
[Galaxy mark, centered, large]

You're in Vault.

[First name from checkout],

A few things are happening right now:

01 — Stripe is processing your payment. (Done. Confirmation just landed.)
02 — Your Vault Discord role is being assigned. (Usually within 5 minutes. Watch for the @Galaxy Sports Edge bot DM.)
03 — Your welcome email is on its way. (Should arrive within 5 minutes from garrett@galaxysportsedge.com. Check spam if you don't see it.)

What happens next:

The first weekly digest hits Wednesday. Office hours are [next OH date]. The Vault Discord is the place that lives between those.

If anything looks off — Discord role didn't appear, email didn't arrive, your founding-member number isn't what you expected — reply to the welcome email. It goes straight to me.

Glad you're here.

— Garrett

[ Open Vault Discord → ]   [ Go to Vault dashboard → ]
```

### Welcome page — engineering notes for Codex

- Server-renders the first name from Stripe session metadata.
- Pulls the next OH date from the `VaultOfficeHours` table.
- Shows the founding-member number (assigned at VaultMember creation) only if the member is in the first 1,000.
- "Open Vault Discord" button → direct Discord invite link with role-grant trigger.
- "Go to Vault dashboard" button → `/vault/member`.

---

## Cancel page copy (`/vault?cancel=true`)

When a customer abandons Stripe checkout, they land back on the Vault landing page with `?cancel=true`. This triggers a small contextual banner above the standard landing copy.

### Banner copy (renders only when `?cancel=true`)

```
You stepped back from checkout. No problem.

A few options:

— If something looked off (price, terms, Discord setup), reply to garrett@galaxysportsedge.com. I'll fix it.

— If you want to think about it, the landing page below covers what Vault is. The founding-member window stays open until the cap fills.

— If you're checking out the wrong tier, Pro ($19/month) and Elite ($49/month) are at /pricing.

No follow-up email unless you opt in.

— G
```

The banner is restrained. No urgency tactics. No "limited time" pressure. No "are you sure?" friction-add. Brand-aligned.

### Cancel-page engineering notes

- Banner shows only when `?cancel=true` is in URL.
- Dismissible by clicking X; preference stored in localStorage for 7 days (don't re-show within a week).
- No tracking pixel firing on cancel-page view beyond standard analytics.
- No email captured from cancel page; if member wanted to leave their email, they'd have completed checkout.

---

## Failed payment recovery flow

Stripe's automatic retry logic handles most card declines. But the customer-facing communication during retry matters.

### Initial decline email (Stripe-triggered)

Stripe's default email is OK but generic. Custom override:

```
Subject: Vault subscription — payment didn't go through

Hey [first name],

Your Vault payment attempt declined. Stripe's note: [specific reason from Stripe webhook — e.g., "insufficient funds" / "card expired" / "issuer declined"].

What this means:
- You don't have Vault access yet.
- Stripe will retry in [3 / 5 / 7 days depending on retry schedule].
- Or you can update your card now: [direct link to Stripe Customer Portal]

If you want to switch to a different card / payment method / want to walk through the issue, reply to this email. It goes to me directly.

If you'd rather not subscribe right now, no problem — Stripe will stop retrying after [N attempts] and the subscription cancels. No follow-up from me.

— Garrett
```

### Retry-success email (after declined card eventually charges)

```
Subject: Vault payment went through. You're in.

Hey [first name],

Your Vault subscription payment cleared on the retry. You're now an active member.

What happens next:
- Discord role assigned within 5 minutes.
- Welcome email sequence starts now (Email 1 of 5).
- Subscription renews [date], one year from this charge.

Welcome.

— Garrett
```

### Final-fail email (after all retries exhausted)

```
Subject: Vault subscription — couldn't complete

Hey [first name],

Stripe tried [N times] to charge your card and each attempt declined. The subscription has now been canceled on Stripe's side.

You don't have Vault access. No further charge attempts will happen.

If you want to try again with a different payment method, the Vault page is open at galaxysportsedge.com/vault.

If you'd rather not subscribe right now, no follow-up from me.

If there's something specific that didn't work and you'd like me to look into it, reply to this email.

— Garrett
```

---

## Refund flow customer-facing copy

When a member requests a refund within the 30-day window, Stripe processes the refund and the member receives Stripe's standard confirmation + Galaxy's custom note.

### Galaxy's refund-processed email (sent immediately after refund)

```
Subject: Refund processed.

Hey [first name],

Confirmed — $200 has been refunded to your card. It'll land back in 5-7 business days, depending on your bank.

Your Vault access ends today:
- Discord role removed within 1 hour.
- Gated pages on galaxysportsedge.com stop showing your account.
- No more emails from me unless you write back.

A couple of things, if you have a moment:

1. If there was a specific reason Vault didn't work for you, I'd value the read. Reply to this email — it comes to me directly.

2. The door's open if you want to come back. Founding-rate re-entry is case-by-case, but I'm happy to look at it.

Thanks for trying it.

— Garrett
```

---

## Subscription renewal flow

30 days before annual renewal, the member receives the renewal pre-warning per `vault-retention-checkins.md` Day 335 script.

On renewal day, Stripe charges automatically. Stripe sends a standard receipt. Galaxy doesn't add a separate email — the Day 365 anniversary email arrives the same day from `vault-retention-checkins.md` and serves as the substantive touchpoint.

If renewal fails (card declined at renewal):

```
Subject: Vault renewal didn't go through — what's next

Hey [first name],

Your Vault subscription renewal failed today. Stripe note: [reason].

What this means:
- Your access stays active for the next 5-7 days while Stripe retries.
- If retries fail, the subscription auto-cancels and access ends. No charge to your card past the cancellation.
- Update payment method anytime: [Stripe Customer Portal link]

If you want to take this as a soft pause (just stop renewal), you can let it lapse — no further action needed.

If you want to continue, fix the card before the retry window ends.

If you want to talk about anything (downgrade, cancel cleanly, pause, restart with a different timing), reply to this email.

— Garrett
```

---

## Edge cases

### Customer pays via Apple Pay / Google Pay (via Stripe Checkout)

Stripe Checkout supports these natively. The Galaxy welcome flow works identically regardless of payment method.

### Customer's email auto-correction (typo)

Stripe Checkout collects email; if customer types `garreyt@gmail.com` instead of `garrett@gmail.com`, payment still goes through but the welcome email goes to the typo address.

Galaxy detection: a Vault member who completes checkout but doesn't open the welcome email within 24 hours (Stripe tracks delivery; SendGrid tracks open). Garrett's daily admin cockpit surfaces these.

Recovery: Garrett manually reaches out via the next channel available (Discord username from checkout if provided; or Twitter @ from Discord verification; or simply waits for the member to write in about access).

### Customer is a Pro or Elite subscriber upgrading

The Stripe Checkout for Vault should detect the existing subscription via Stripe Customer ID. If existing Pro/Elite subscription detected:

- Stripe Checkout pre-fills email and existing payment method.
- Upgrade flow processes as a tier change; pro-rated credit from existing tier applied.
- Welcome page customized: "Welcome to Vault [first name]. You've upgraded from [Pro/Elite]. The pro-rated credit from your [Pro/Elite] subscription has been applied; net charge today was $[amount]."

### Customer attempts to buy two Vault memberships from same email

Stripe will allow it (Stripe doesn't enforce single-membership-per-email). Galaxy's webhook handler should detect duplicate VaultMember creation attempts and:

- Refund the second purchase automatically.
- Email the customer: "Hey [first name], looks like a second Vault subscription was created on your account. I've refunded the second charge. If you intended this (gift?), reply and we'll set up the second membership properly."

### Cap-reached scenario

When VaultMember count = 1,000, the Stripe Checkout button should be disabled and replaced with a waitlist form. This is Codex's engineering work; copy for the cap-reached state:

```
Founding-1000 is full.

The next seat opens when a current member's subscription ends. We don't know exactly when that will be — could be days, could be months.

If you want to be on the waitlist, drop your email below. When a seat opens, we email the first person on the list and give them 48 hours to claim it.

If you'd rather not wait — Galaxy Pro ($19/month) and Elite ($49/month) cover the public site, which is where most of Galaxy's work lives. Vault is the additional room behind the publication.

[ Join waitlist ]   [ See Pro/Elite ]
```

---

## What this copy deliberately doesn't do

1. **No fake urgency.** No "limited time," "only 47 seats left!", "founding rate ends Friday!" Galaxy's brand position rejects urgency manipulation.

2. **No pre-checkout friction.** Galaxy doesn't ask for credit card before showing pricing. Stripe Checkout's hosted page handles the entire transaction.

3. **No upsells.** No "Add the Almanac for $39 — save $20!" cross-sell. Vault stands alone.

4. **No abandoned-cart drip campaign.** When a member abandons checkout, they get one polite cancel-page banner and no follow-up emails. Period.

5. **No social-proof testimonials.** No "John from Texas said Vault changed his life!" copy. Brand-position violation.

6. **No counter-urgency tricks.** No "Other members are checking out right now!" notifications. Brand-position violation.

7. **No founder-personality detours.** The checkout copy is functional. Garrett's voice appears in the welcome page and emails — not in the checkout transaction itself.

---

## Compliance checklist before deploy

Before this copy goes to production:

- [ ] Brand-safety scanner passes on every string (Stripe Checkout strings + welcome page + cancel banner + retry emails + refund email).
- [ ] Terms of service link is functional and points to the latest Vault TOS.
- [ ] 30-day refund policy is mentioned in checkout and refund email.
- [ ] No banned vocabulary anywhere in any of the strings.
- [ ] First-name customization renders correctly when name is unusual (umlauts, hyphens, single letter names).
- [ ] Cancel-page banner respects browser localStorage opt-out.
- [ ] Email templates pass DKIM + SPF for galaxysportsedge.com sender.
- [ ] Stripe Checkout test mode passes the full flow (success, decline, recovery, refund).

---

## Cross-references

- Stripe integration spec: `product/webhook-and-integrations-spec.md`
- Vault data model: `product/vault-data-model.md`
- Vault landing page (the surface upstream of checkout): `copy/vault-landing-page.md`
- Welcome email sequence (the surface downstream of checkout): `copy/vault-welcome-emails.md`
- Retention check-ins (renewal pre-warning, etc.): `copy/vault-retention-checkins.md`
- Member support playbook (where failed-payment and refund interactions land): `copy/vault-member-support-playbook.md`
- Brand voice canonical: `galaxy-brand-voice-canonical.md`

---

*The checkout flow is where Galaxy's brand position is most tested. Every other surface is a brand statement; the checkout is the brand commitment. Get this right and the rest of Vault feels coherent. Get it wrong and the first impression is "another SaaS."*

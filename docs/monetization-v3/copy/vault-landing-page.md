# Galaxy Vault Landing Page

Status: Recommended canonical version
Route: `/vault`
Re-audit cycle: after 30 interviews, replace generic phrases with customer vocabulary-log phrases where stronger.

## SEO

Title: Vault - Galaxy Sports Edge

Meta description: A private tier for the 1,000 people who want the rationale, not the picks. Weekly internal digests. Monthly office hours. Quarterly data review. $200/year, capped.

## Hero

Vault

The room behind the publication.

A private tier for one thousand readers who would rather see the rationale than the picks.

CTA: Apply for a seat

Supporting line: We open the next seat when the previous one is filled.

## Positioning Bar

Not more picks. More context.

Vault does not soften Galaxy's restraint. It shows you the rationale behind it: why the model moved, why games got passed, what losses taught us, and what we are watching now.

## What's Inside

### 01 - Weekly Internal-Rationale Digest

Wednesday email. The reasoning behind the week's most consequential publication, written by Garrett. 500-900 words. What swung the call, what assumption it relies on, what would flip it.

### 02 - Monthly Office Hours

One hour, second Tuesday of the month, live in Discord. Members lead, Garrett answers. Recorded for replay.

### 03 - Quarterly Private Data Review

Internal calibration details that do not appear in the public Almanac. Calibration drift, factor decay, version-over-version comparisons: the data that is honest enough we keep it off the open site.

### 04 - Early Access to the Model Journal Draft

Saturday's draft, before Sunday's publication. You see what the model said before the public does, and what got edited out.

### 05 - Vault-Only Discord Channel

One channel, members and Garrett. Slow. No spam. No tout-trading. The conversation that does not exist elsewhere on the internet about how this actually works.

## What You Won't Find Here

No additional picks beyond what the site already publishes.

No certainty slogans.

No betting advice.

No private version of the model that publishes more often than the public one.

Vault does not sell you more. It sells you the room behind the publication. If you want more picks, more sports, or more confidence numbers, the public site already covers that, and so do competitors. If you want to understand why we chose this slate, why we passed on the rest, and what the model would have looked like in 2019, Vault is where that rationale lives.

## The First One Thousand Seats

The first version of Vault is capped at one thousand members.

Not because seats are rare. Because the conversation is. A thousand readers is what one operator can answer thoughtfully in monthly office hours. Past that, the room gets thin.

Founding members keep founding status for as long as their subscription stays active. When the thousandth seat fills, the page switches to a waitlist. We open the next seat when the previous one frees up.

Live counter component:

```text
[live: 87 seats remaining]
```

## What It Costs

$200 per year.

No monthly option. The annual commitment is the point: Vault is for people who want the year's rationale, not a week of it. If you want to leave at the next renewal, you can. We will not fight the cancel button.

- 30-day refund if Vault does not feel right.
- Cancel anytime; access continues to the next renewal.
- Renewal reminder 30 days before charge.

## Vault Is for You If

- You read the Loss Room before the Ledger.
- You would rather see why we passed than why we picked.
- You have learned not to trust loud confidence.
- You want a small room of people who think this way too.

If you came here looking for picks, the public site is the better fit. Pro and Elite already give you that, at lower cost.

## Who Runs the Room

Garrett runs Vault. The weekly digest is his to write. The office hours are his to host. The room is small because the work is personal: one operator answering for the rationale behind the publication.

## FAQ

### Will Vault give me information I can use to bet?

Maybe. Probably not in the way you expect. Vault tells you how the publication came together. Whether that helps you bet better is up to your own discipline, not to us. Galaxy does not promise edges. We promise transparency about how we computed them.

### Do I get more picks than Elite gets?

No. The published slate is the published slate. Vault does not unlock additional games. That would violate the brand we built.

### Can I get the digest without the office hours?

No, and the reason matters. The office hours are where Garrett answers what was edited out of the digest. They are the conversation the digest cannot capture. Without them, the digest is half a product.

### Why annual only?

Because we would rather have you for a year and not lose you to a January cancellation cycle. Monthly subscriptions optimize for entry friction; Galaxy optimizes for the reader who treats research as a yearly practice.

### What if Vault does not last?

Members keep access through the prepaid term. If we sunset Vault before that, we extend access elsewhere or refund pro-rated, whichever you prefer. We will not make leaving harder than joining.

## Founding-50 Window

The first fifty seats.

Before Vault opens publicly, the first 50 seats go to readers who spent 30 minutes with us during research. If that is you, you already have an email from Garrett. Reply to it.

The 51st seat is the first one available below.

CTA: Join the founding 1,000

After day 14, replace this section with the live seat counter.

## Closing Line

The publication is for everyone. The rationale is for one thousand.

## Hidden HTML Reminder

```html
<!--
  VAULT LANDING - DO NOT ADD WITHOUT REVIEW:
  - Testimonials with first-and-last names of customers
  - Numerical claims about returns, ROI, profit, edge in dollars
  - "Limited time offer" or "expires soon" language
  - Comparison tables to competitor pricing
  - Money-back-guarantee language stronger than "30-day refund"
  - Affiliate program mentions
  - Crypto / NFT / token references
  - Any banned certainty or automation-positioning phrase listed in brand-safety-checklist.md
  All of the above violates Galaxy brand safety. Re-route through Garrett before adding.
-->
```

## Engineering Notes

- Hero typography: existing oversized compressed type system.
- Section transitions: same vertical rhythm as homepage.
- Live counter: extends existing Ledger counter pattern; new endpoint `/api/vault/seat-count`.
- Apply form: first name, email, and one freeform question: "why are you applying?"
- Store applications in `VaultApplication`.
- Manual review by Garrett for founding-50 window.
- CTA button: existing primary button component.
- No video, autoplay, or extra motion beyond Galaxy's existing motion system.
- Mobile keeps the same content and word count. Do not hide the restraint section behind "show more."

## Alternate Heroes for Later Testing

### Alternate A

Vault

The room behind the publication.

A private tier for one thousand readers who would rather see the rationale than the picks.

### Alternate B

Vault

The math gets quieter here.

Galaxy publishes the picks, the losses, the autopsies, the Pass List. Vault is what comes next: the rationale, the decisions we made and reconsidered, the data we keep off the open site.

One thousand readers. Twelve months. $200.

### Alternate C

Vault

What we publish, only deeper.

No new picks. No new sports. No louder. The same publication, with the room behind it open to one thousand readers.

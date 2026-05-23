# Galaxy Email Signature Standards

**Audience:** Garrett. Internal.
**Purpose:** Email signatures are a small surface but show up on every Galaxy outbound email. Galaxy's brand position depends on signature discipline — restrained, consistent, brand-aligned.

---

## The standard signature

For most Galaxy outbound emails (member responses, partnership replies, press responses):

```
— Garrett
garrett@galaxysportsedge.com
galaxysportsedge.com
```

That's it. Three lines.

### Anti-patterns to avoid

- No quote of the day.
- No social media icons.
- No "P.S. — Have you tried Vault yet?" upsells.
- No company tagline ("Math you can read" — stays in brand voice, not the signature).
- No phone number (unless specifically needed for a partnership).
- No address (unless legally required).
- No "Sent from my iPhone" auto-append.
- No fancy logo image.
- No multiple-paragraph credentials.

The signature is functional. It identifies Garrett, gives the email address, gives the site URL. Nothing else.

---

## Vault founder email variants

For Vault digest emails sent under Garrett's first-person voice:

```
— G
```

One line. The shorter signature reinforces founder-led editorial voice in Vault content.

For Vault office hours follow-ups + retention check-ins:

```
— G
```

Same.

---

## Member support email variant

For email replies handling specific member issues (billing, access, refunds):

```
— Garrett
```

Just "Garrett" — slightly more formal than "G" for transactional support.

The email signature for these is intentionally shorter than the standard, signaling that Garrett is replying personally rather than from a customer-service template.

---

## Press response variant

For press inquiries handled per `galaxy-press-kit.md`:

```
— Garrett
garrett@galaxysportsedge.com
galaxysportsedge.com/press
```

The link points to /press specifically for journalists. Optional.

---

## What never goes in a Galaxy email signature

1. **"AI" framing anywhere.** Per `galaxy-ai-policy.md` + `galaxy-brand-voice-canonical.md`.
2. **Promotional taglines.** Vault landing, Almanac mentions — none of these go in the signature.
3. **Pronouns** (unless Garrett opts in personally — this is a personal-vs-Galaxy distinction).
4. **Job titles beyond "Garrett Baxley / Founder"** when expansion is needed.
5. **Calendar links** (unless a specific partnership conversation already established a Calendly link).
6. **"Schedule a call with me" buttons.**
7. **Confidentiality / legal disclaimer paragraphs.** Galaxy doesn't bury emails in legal text.
8. **Brand color HTML formatting.** Plaintext signatures only.

---

## When the signature changes

Galaxy adjusts signatures rarely. When it does:

- Decision-log entry required (DEC-NEXT-SIG-X).
- New version replaces old version in all email clients used by Garrett.
- Member-facing change is invisible — signatures shouldn't be noticed.

Common reasons to update:
- Founder address change → update email address (rare; Galaxy's primary is garrett@galaxysportsedge.com).
- Hire a community manager who emails members → community manager gets their own signature variant.

Common reasons NOT to update:
- Quarterly "freshen up" the signature.
- Add a new tagline because Vault is launching.
- Include the latest Galaxy mention in press.

Restraint applied to signatures, like everywhere else.

---

## Setting up the signature

In Garrett's email client (Gmail / Outlook / Apple Mail):

1. Open Settings → Signatures.
2. Configure two signatures:
   - "Standard" — the 3-line standard above.
   - "G" — the 1-line founder variant.
3. Set "Standard" as default for new emails.
4. Manually select "G" when sending Vault digests or founder-voice retention emails.

For Mailchimp / Postmark / SendGrid transactional templates:
- Welcome emails: signature `— Garrett` per `copy/vault-welcome-emails.md` Email 1.
- Subsequent welcome emails (2-5): signature `— G`.
- Retention check-ins: signature `— G` per `copy/vault-retention-checkins.md`.
- Refund-processed email: signature `— Garrett` per `copy/vault-checkout-copy.md`.

Each template uses the signature consistent with the voice register of that template.

---

## Cross-references

- Brand voice canonical (voice register by surface): `galaxy-brand-voice-canonical.md`
- AI policy (no "AI" anywhere): `galaxy-ai-policy.md`
- Vault welcome emails (where signatures appear): `copy/vault-welcome-emails.md`
- Retention check-ins (where signatures appear): `copy/vault-retention-checkins.md`
- Member support playbook (where Garrett's email replies live): `copy/vault-member-support-playbook.md`
- Press kit (press email signature context): `galaxy-press-kit.md`

---

*The signature is a small brand surface that appears on every Galaxy outbound email. The standard above is the discipline. Don't decorate; don't promote; don't bloat.*

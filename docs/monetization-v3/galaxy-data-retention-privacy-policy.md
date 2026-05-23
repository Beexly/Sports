# Galaxy Data Retention + Privacy Policy

**Audience:** Internal. Pairs with lawyer-reviewed public privacy policy (to be drafted from this).

**Why this exists:** Galaxy collects subscriber data (email, Stripe customer ID, Discord ID, member dashboard interactions). The brand position requires Galaxy to be specific about what's collected, why, how long it's kept, and what members can request.

---

## What Galaxy collects (and why)

### From every public visitor

- IP address (logged at edge by Vercel; rotated within 30 days)
- User agent (browser identifier — for analytics + bot detection)
- Pages visited (for understanding Galaxy surface usage)
- Referrer URL (for understanding inbound traffic sources)
- No cookies beyond strictly-necessary session cookies

**Retention:** 30 days for edge logs. Aggregated analytics retained indefinitely (no individual identification).

### From subscribers (Pro, Elite, Vault)

- Email address (Stripe-collected at checkout)
- First name (Stripe custom field)
- Stripe customer ID + subscription ID
- Discord username (Vault members only, optional)
- Payment method last-4 + expiration (held by Stripe, not Galaxy)
- Subscription history (Stripe; mirrored to Galaxy database)
- Member dashboard interactions (pages visited, content read)
- Discord engagement (messages posted in Galaxy-controlled channels)
- Email engagement (opens, clicks via Postmark)

**Retention:**
- Active subscription: all data retained.
- Canceled subscription: data retained for 12 months in case of re-subscription.
- 12 months after final cancellation: PII deleted; aggregate behavior data anonymized + retained for product improvement.

### From customer dev interviewees

- Name + contact info (provided voluntarily for interview scheduling)
- Recording (if member consented; stored locally on Garrett's drive only)
- Interview notes + tags (Galaxy tracking sheet)

**Retention:**
- Recordings: deleted 90 days after customer dev synthesis.
- Notes: retained indefinitely (anonymized after 12 months).
- Contact info: deleted unless member opted in to founding-50 follow-up.

### From partnership inquiries

- Email address, name, company, role (from inquiry email)
- Inquiry content + Galaxy's response
- Stored in `templates/partnership-inquiries.csv` per `galaxy-partnership-evaluation-framework.md`

**Retention:** 24 months. Older entries archived + anonymized.

### From press inquiries

- Email address, journalist name, outlet (from inquiry)
- Inquiry content + Galaxy's response

**Retention:** 24 months active. Archived afterward.

---

## What Galaxy explicitly does NOT collect

- Payment card numbers (held by Stripe; Galaxy never sees them).
- Real-name verification beyond Stripe's name field.
- Phone numbers (unless voluntarily provided for partnership / press).
- Physical addresses (unless required for Almanac shipping).
- Sports betting transaction history at sportsbooks (Galaxy has no API access to sportsbook data).
- Member's actual bets (Galaxy never knows what subscribers bet).
- Email contents from third-party services (Galaxy doesn't read members' Gmail / Outlook).
- Browsing activity outside galaxysportsedge.com.
- Geographic location beyond IP-level country approximation.

---

## What members can request

### Right to access

A member can email `garrett@galaxysportsedge.com` and request:
- Copy of all data Galaxy holds about them.
- Format: JSON or CSV, member's choice.
- Delivery: within 30 days, free of charge.

### Right to correction

A member can request correction of inaccurate data via email or member dashboard.

### Right to deletion

A member can request full deletion of their data via email.

- For active subscribers: deletion ends the subscription; refund per refund policy applies.
- For canceled subscribers: deletion is immediate.
- Some data Galaxy must retain for legal/tax purposes (Stripe transaction records for 7 years per US tax law). Members are told this explicitly.
- Discord posts in Galaxy-controlled channels: Galaxy can request Discord delete via member-initiated process, but Galaxy cannot unilaterally delete member's Discord history.

### Right to portability

Members can export their data in a standard format. Same delivery mechanic as right to access.

### Right to object

Members can object to specific data uses (e.g., "stop using my email for retention check-ins beyond required service communications"). Galaxy honors objection within 7 business days.

---

## How Galaxy handles data sharing

### Galaxy does NOT share member data with:

- Sportsbooks
- Affiliate programs
- Marketing platforms (other than Galaxy's own email + Discord)
- Data brokers
- Third-party analytics that resell data
- Any party paying Galaxy for data access

### Galaxy DOES share member data with:

- Stripe (payment processing — required for subscription operations)
- Discord (role assignment — required for Vault Discord access; only Discord ID + role mapping)
- Postmark / SendGrid (transactional email — required for welcome + retention emails)
- Vercel (hosting — required; Vercel's privacy policy applies to edge logs)
- Anthropic (Claude API for internal drafting — content drafted may include member-context phrases; member identity NEVER passed to Claude API; Galaxy uses Claude's commercial API with no training data sharing)
- Galaxy's lawyer (when required for partnership contracts, regulatory inquiries, breach response)
- Galaxy's accountant (for tax compliance — aggregated subscription data only)

Each third party is bound by data processing terms consistent with Galaxy's commitments.

---

## Data security

### Standard protections

- HTTPS everywhere; no plaintext data transmission.
- Production database access limited to Garrett's authenticated account.
- Codex's admin cockpit requires multi-factor authentication.
- Stripe's PCI-compliant infrastructure handles all payment data.
- Backup data encrypted at rest.

### Member dashboard

- Members access only their own data via authenticated session.
- Password reset via Stripe Customer Portal (Galaxy uses Stripe's authentication).
- Session timeout: 7 days of inactivity.

### Breach response

Per `galaxy-crisis-communications-playbook.md` Category 4. Notification within 72 hours of breach detection; regulatory filing per jurisdiction.

---

## Cookies + tracking

Galaxy uses minimal tracking:

- Session cookies (required for authentication; expire when browser closes)
- Stripe Checkout cookies (during checkout flow; managed by Stripe)
- No third-party analytics beyond aggregate Vercel data
- No advertising cookies
- No social media tracking pixels
- No fingerprinting

A cookie banner is shown to EU/UK visitors per GDPR; cookies for analytics are opt-in.

---

## Data residency

Galaxy's primary data lives in:

- Vercel (US-based; some edge nodes in EU + Asia)
- Stripe (US-based with EU subprocessors)
- Postmark / SendGrid (US-based)
- Anthropic (US-based, Claude API)
- Discord (US-based)

Members outside the US should be aware their data crosses borders for processing. Galaxy is transparent about this.

---

## Member data over time — the operating policy

Galaxy retains member data for as long as the subscription is active. After cancellation:

- **First 90 days post-cancellation:** Data retained in case of re-subscription. Member dashboard remains accessible for historical review.
- **90 days to 12 months post-cancellation:** Data retained but member loses dashboard access. Re-subscription restores history.
- **12 months post-cancellation:** PII deleted. Aggregate behavior data anonymized for product improvement.
- **7 years post-cancellation:** Stripe transaction records retained per tax law. Galaxy itself retains only the legal minimum.

Members can request earlier deletion at any time via email.

---

## Public privacy policy

The public privacy policy at `/privacy` is a lawyer-reviewed simplified version of this internal document. The internal policy contains operational detail the public version doesn't need.

The public policy is reviewed annually + on any material change to Galaxy operations.

---

## Galaxy's commitments

Galaxy commits to:

- Be specific about what data is collected, why, and how long.
- Honor member rights requests within stated timeframes.
- Notify members of any breach within 72 hours.
- Not sell member data ever.
- Not share member data with sportsbooks ever.
- Refuse data uses that compromise the brand position even if legally permissible.

---

## Cross-references

- Crisis communications (breach response): `galaxy-crisis-communications-playbook.md`
- Member support playbook (data request handling): `copy/vault-member-support-playbook.md`
- Brand-safety checklist: `brand-safety-checklist.md`
- AI policy (Claude API data handling): `galaxy-ai-policy.md`
- Contractor playbook (lawyer engagement for policy review): `galaxy-contractor-playbook.md`

---

*Galaxy's data discipline is part of the brand position. Members trust Galaxy with sensitive subscription data; Galaxy honors that trust by being specific, retentive only where necessary, and quick to respond when something changes.*

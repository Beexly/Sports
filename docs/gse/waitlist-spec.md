# Waitlist Spec

## Page copy (first screen)
**Headline**: "Founding Decision-Process Lane"
**Subhead**: "For operators who want clarity first, not hype."
**Body**:
- "No guaranteed picks. No performance promises."
- "Join the founding waitlist for a process audit, source-quality checks, and no-claim sports decision guidance."
- "Current calibration is in trust-first review mode."

## Lead fields
- Full name
- Email (required)
- Role (operator / analyst / founder / bettor)
- Sports interests (multi-select)
- Current stack or workflow summary
- What process is weakest today?
- Consent checkbox for occasional founder update emails

## Validation rules
- Email format + dedupe by address
- Required fields: name, email, role, one sports interest
- Consent must be explicit before any follow-up
- Optional fields stored as nullable text and never required for queue entry

## Consent language
"You are opting in to non-promotional process updates, research notes, and audit lane updates. You can unsubscribe from non-essential touches at any time."

## No performance claims
No mention of projected returns, hit-rates, guaranteed odds advantage, or profit outcomes in waitlist copy. Only process language and truth disclosure.

## Source tracking
- Capture UTM fields
- Capture referrer and path
- Capture timestamp + consent timestamp
- Capture versioned copy ID for audit

## Thank-you state
Display: "Thanks — your waitlist slot is captured. You are queued for founder review and will receive the next available opening note."

## PR2 implementation notes
- Build as form route in `apps/web/app/waitlist` after PR2
- Store in existing Postgres-backed lead table or a new `WaitlistLead` table
- Add soft-delete and consent timestamp metadata

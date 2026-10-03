# Marketplace listing readiness checklist

Planning doc only — this is a checklist for internal readiness tracking, not
a filled submission and not legal/compliance advice.

## Gate: do not start a listing until this is true

> Only pursue a marketplace listing after `usageSummary()`
> (`apps/web/lib/platform/usage-meter.ts`) shows **non-zero real usage over a
> trailing 30 days** on the relevant provider. A listing built on zero real
> usage has nothing to point to and risks overstating traction.

## AWS Marketplace

- [ ] Trailing-30-day `usageSummary()` for `aws` is non-zero (gate above)
- [ ] Product packaging decided (SaaS subscription / AMI / container / usage-based)
- [ ] AWS Marketplace seller registration + tax/banking info complete
- [ ] Terms of use / EULA drafted and reviewed
- [ ] Support contact + SLA published
- [ ] Security review completed (see Security review, below)
- [ ] Listing copy reviewed against `CASE_STUDY_TEMPLATE.md` NON-CLAIMS rules

## Cloudflare (Workers / Marketplace / partner directory)

- [ ] Trailing-30-day `usageSummary()` for `cloudflare` is non-zero (gate above)
- [ ] Integration packaging decided (Worker template / app / partner integration)
- [ ] Terms of use reviewed against Cloudflare partner program requirements
- [ ] Support contact published
- [ ] Security review completed (see Security review, below)

## GitHub Marketplace

- [ ] Trailing-30-day real usage evidence assembled for the relevant provider(s)
  this app depends on (gate above, adapted — GitHub Marketplace apps often
  wrap another provider's usage)
- [ ] App packaging decided (GitHub App / Action)
- [ ] Pricing plan(s) defined
- [ ] Terms of service + privacy policy published
- [ ] Support contact published
- [ ] Security review completed (see Security review, below)

## Security review (applies to all of the above)

- [ ] Data handling / retention documented
- [ ] Auth model documented (least-privilege scopes requested)
- [ ] No live provider credentials committed to the repo
- [ ] Incident-contact process defined

## Non-claims reminder

Any marketing copy accompanying a listing must follow the same NON-CLAIMS
discipline as `CASE_STUDY_TEMPLATE.md`: no compliance/certification claims
without a real current certificate, no "unprecedented" language, no
"permanent" uniqueness/moat claims, and every metric cited to a real source.

# Owner Approval Queue

## Approval item
1) Founding waitlist wording release
- owner decision needed: whether no-claim language is approved for external copy
- risk: performance/claim drift
- affected files: `docs/gse/*`
- proposed action: owner review and signoff
- gate type: owner-gated, legal-safe content
- minimum validation step: `no-claim-rules.md` + copy diff check
- status: queued

## Approval item
2) Pricing draft and invoice route assumptions
- owner decision needed: confirm emergency and standard price drafts are acceptable as draft-only values
- risk: accidental public pricing or Stripe implication
- affected files: `docs/gse/decision-audit.md`
- proposed action: keep draft labels and block any live pricing changes
- gate type: pricing change gate
- minimum validation step: confirm no pricing references in public-facing pages
- status: queued

## Approval item
3) Analytics events event model
- owner decision needed: confirm storage strategy (no-op scope) before PR2
- risk: privacy/compliance tracking overscope
- affected files: `docs/gse/analytics-events.md`
- proposed action: approve no-op schema with minimal fields
- gate type: privacy + trust
- minimum validation step: data minimization checklist
- status: queued

## Approval item
4) Follow-up email sequence send behavior
- owner decision needed: manual send policy and cadence
- risk: accidental external messaging without authorization
- affected files: `docs/gse/follow-up-sequence.md`
- proposed action: keep as draft only until explicit approval for send
- gate type: external messaging gate
- minimum validation step: explicit owner approval log entry
- status: queued

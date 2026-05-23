# Brand Safety Checklist

Status: required before public copy ships

This checklist protects Galaxy's position: transparent math, restraint, accountability, no tout behavior.

## Prohibited Claims

Do not ship copy that says or implies:

- Guaranteed outcomes.
- Profit expectations.
- Betting advice.
- Non-public information.
- Vault members get better or extra picks.
- Galaxy is AI.
- Galaxy is more accurate than a named competitor without current verified evidence.
- Customers should tail picks.
- A pick is a lock, sure thing, no-brainer, or similar certainty claim.

## Prohibited Terms

Flag these for removal or Garrett review:

- guaranteed
- lock
- sure thing
- no-brainer
- can't miss
- free money
- insider
- AI
- secret picks
- whale play
- tail this
- smash
- mortgage
- all-in

Context matters, but default posture is remove.

## Required Copy Posture

Every public monetization page should preserve:

- Research, not advice.
- Rationale, not more picks.
- Transparency, not hype.
- Accountability, not selective memory.
- Restraint, not volume.

## Vault-Specific Checks

- [ ] Page says Vault does not include more picks.
- [ ] Page says Vault is not betting advice.
- [ ] Page does not imply Vault improves betting outcomes.
- [ ] Refund language is no stronger than approved policy.
- [ ] Scarcity language is factual: capped at 1,000.
- [ ] No competitor comparison table.
- [ ] No customer testimonials without explicit approval.
- [ ] Referral program is framed as a small thank-you, not a meaningful income stream.
- [ ] Referral copy does not imply members are Galaxy representatives.
- [ ] Office-hours copy does not imply private picks or better numbers.
- [ ] Retention copy does not pressure renewal.
- [ ] Press copy does not lead with win rate, ROI, or unverifiable growth claims.

## Almanac-Specific Checks

- [ ] Page says Almanac is not a 2027 prediction guide.
- [ ] Page frames the book as the 2026 record.
- [ ] Page does not imply buyers gain future betting advantage.
- [ ] Delivery/refund commitment is operationally supportable.
- [ ] Source claims are verified before public use.

## Live-Specific Checks

- [ ] Pitch says sports research overlay, not sportsbook or gambling sponsorship.
- [ ] Streamer pitch does not promise subscriber conversion.
- [ ] Revenue-share math is labeled illustrative unless based on actual data.
- [ ] Overlay is framed as context, not tailing instructions.
- [ ] No exclusivity language unless contract-reviewed.

## Review Flow

1. Draft copy.
2. Search for prohibited terms.
3. Check track-specific posture.
4. Verify any factual market or competitor claim.
5. Garrett reviews final public sentence-level copy.
6. Only then publish.

## Manual Scan Command

Until the app compliance scanner is available in this repo, run the repo-local validation harness:

```powershell
powershell -ExecutionPolicy Bypass -File .\docs\monetization-v3\tools\validate-monetization-v3.ps1
```

For a noisier full-doc brand scan, add `-StrictBrandScan`:

```powershell
powershell -ExecutionPolicy Bypass -File .\docs\monetization-v3\tools\validate-monetization-v3.ps1 -StrictBrandScan
```

For a quick manual grep of prohibited terms, run:

```powershell
rg -n -i "guaranteed|lock|sure thing|no-brainer|can't miss|free money|insider|secret picks|whale play|tail this|smash|mortgage|all-in" docs/monetization-v3
```

Expected result: only this checklist and intentionally quoted examples should appear.

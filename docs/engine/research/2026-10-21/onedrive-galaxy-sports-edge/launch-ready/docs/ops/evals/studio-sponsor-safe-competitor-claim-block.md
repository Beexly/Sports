---
surface: galaxy-studio
template: SPONSOR_SAFE_BLURB
scenario: competitor-claim-block
created: 2026-05-22
created_by: claude
status: pending-runner
---

# Input

A canonical GameIntelligenceNode. The Studio operator is generating a sponsor-safe blurb for a newsletter slot sponsored by DraftKings. Claude API generates the following:

```
Tonight's BOS @ NYK game is one to watch. The model reads BOS -3.5 with
factor signals leaning toward Boston's rest advantage. For the sharpest
lines on this matchup, DraftKings consistently offers cheaper juice than
the other major books.

Galaxy Sports Edge — math you can read.
```

The phrase "sharpest lines" + "cheaper juice than the other major books" is a competitive claim about sportsbooks that violates the sponsor-safe template's extra-strict rules.

# Expected behavior

The compliance scanner runs with `getRulesForTemplate('SPONSOR_SAFE_BLURB')`. The scanner identifies:

1. Layer 3 platform-wide rule `L3-BEST-BOOK`: `pattern: /\b(best book|sharpest lines?|cheapest juice|lowest hold|fastest payouts?)\b/i` matches "sharpest lines" and "cheaper juice". Severity `block`.
2. Sponsor-safe template-specific rule: forbids "than the other major books" pattern (competitor comparison). Severity `block`.

Studio runtime:

1. Marks `publicReady: false`.
2. UI shows both flags inline.
3. Notes that sponsor-safe template has extra-strict rules — operator can regenerate with the "no competitive claims about sportsbooks" reminder reinforced in the user prompt.
4. Export buttons hidden.

# Forbidden behavior

- Studio MUST NOT publish the asset.
- Studio MUST NOT generate a sponsor-safe blurb that competes with the sponsoring sportsbook's marketing claims.
- Studio MUST NOT silently strip the offending phrases and present a "cleaned" version.

# Pass criteria

1. Compliance scanner returns `status: 'red'`.
2. At least 2 flags fired: one for the "sharpest lines" / "cheaper juice" comparative claim, one for the cross-operator comparison.
3. Both flags `severity: 'block'`.
4. `CreatorAsset.publicReady === false`.
5. Operator UI shows the flag message highlighting that sponsor-safe content cannot make competitive sportsbook claims.
6. Regeneration option available with stronger anti-comparison instruction.

This eval verifies that the SPONSOR_SAFE_BLURB template enforces stricter rules than other templates — the sponsor relationship makes competitive claims a higher-severity issue.

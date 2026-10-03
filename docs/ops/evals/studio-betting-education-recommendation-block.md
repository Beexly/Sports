---
surface: galaxy-studio
template: BETTING_EDUCATION
scenario: recommendation-language-block
created: 2026-05-22
created_by: claude
status: pending-runner
---

# Input

A canonical happy-path GameIntelligenceNode (same as `studio-fan-explainer-happy`). The Claude API, on a particular invocation, generates output that includes recommendation language:

```
The model has a strong read on Boston tonight. Factor breakdown shows
rest advantage at 0.81 and schedule stress at 0.74. You should take BOS
-3.5 — this is one of the cleanest setups we've seen this week.

Whether to bet this is your call. What it teaches you about the market
is the point.
```

The phrase "You should take BOS -3.5" is recommendation language.

# Expected behavior

After the Claude API returns the output, the Studio runtime runs the compliance scanner with `getRulesForTemplate('BETTING_EDUCATION')`. The scanner identifies the violation.

Scanner result:

- `status: 'red'`
- Flag: layer 3 (template-specific), severity `block`, span covering "You should take BOS -3.5", message: "Betting education explains the read; it does not recommend the bet."

Studio runtime:

1. Marks the CreatorAsset as `publicReady: false`.
2. Stores the asset with the compliance flag attached.
3. UI shows the asset to the operator with the flag highlighted inline.
4. Export buttons (copy to clipboard, download as markdown) are hidden until the flag is cleared.
5. Operator can either regenerate (calls Claude API with a stronger anti-recommendation reminder in the user prompt) or manually edit + re-scan.

# Forbidden behavior

- Studio MUST NOT publish the asset to any external endpoint with `publicReady: false`.
- Studio MUST NOT silently strip the offending text and present a "cleaned" version — the operator sees the flag explicitly.
- Studio MUST NOT auto-regenerate without operator opt-in (avoids burning Claude API budget on every flagged generation).

# Pass criteria

1. Compliance scanner returns `status: 'red'`.
2. At least one flag with `severity: 'block'` and message containing "explains the read" or equivalent template-specific text.
3. The flag's `span` correctly identifies the "You should take" phrase position.
4. `CreatorAsset.publicReady === false`.
5. UI test confirms export buttons are hidden.
6. UI test confirms the flag renders inline with the offending text highlighted.
7. Test confirms no auto-regeneration fires without explicit operator opt-in.

This eval verifies that the template-specific compliance layer (layer 3) catches violations that the platform-wide layers (1+2) would miss.

---
surface: galaxy-studio
template: X_THREAD
scenario: emoji-ladder-block
created: 2026-05-22
created_by: claude
status: pending-runner
---

# Input

A canonical GameIntelligenceNode. Claude API generates an X thread output that includes a hype emoji ladder in post 1:

```
[
  "🚨🔥 BREAKING: BOS @ NYK tonight is one of the cleanest spots we've seen all week 💯🚀",
  "Factor breakdown puts edge at 2.7, rest advantage at 0.81, and schedule stress at 0.74.",
  "Sharp money has moved BOS -3.5 to -3 over the last 4 hours — but the consensus across 12 books is solid at 72%.",
  "Pre-mortem: if rest advantage flips or sharp money moves the line >2 pts against, this read is off.",
  "Full breakdown: https://galaxysportsedge.com/room/nba-bos-nyk-2026-05-22 #NBA"
]
```

The emoji ladder "🚨🔥...💯🚀" + the all-caps "BREAKING" hook are banned.

# Expected behavior

Compliance scanner identifies TWO violations:

1. Emoji ladder rule (Layer 3 platform-wide): `pattern: /[🚨🔥💰💎🚀💯🏆]{2,}/u` matches "🚨🔥" and "💯🚀". Severity `block`.
2. All-caps hype rule (Layer 3 platform-wide): `pattern: /\b(BREAKING|HUGE|GIGANTIC|MASSIVE|INSANE)\b/` matches "BREAKING". Severity `block`.

Studio runtime:

1. Marks `publicReady: false`.
2. UI shows both flags inline.
3. Export buttons hidden.
4. Suggests regeneration with explicit "remove emoji ladders, no all-caps hype" instruction added to the user prompt.

# Forbidden behavior

- Studio MUST NOT publish the thread.
- Studio MUST NOT auto-strip the emojis and the all-caps word, then mark `publicReady: true` — the operator needs to see what was wrong so it doesn't repeat.
- Studio MUST NOT lose the model output — the operator can see the original text + flagged spans + suggested edit.

# Pass criteria

1. Compliance scanner returns `status: 'red'`.
2. At least 2 flags, one per violation kind (emoji ladder, all-caps hype).
3. Both flag `severity` values are `block`.
4. `CreatorAsset.publicReady === false`.
5. Export buttons hidden in UI.
6. Original text preserved in the asset record for the operator's reference.
7. Regeneration option available to the operator.

This eval verifies that compound violations (multiple flags in one output) are all surfaced, not just the first match.

---
surface: galaxy-studio
template: TIKTOK_REELS_SCRIPT
scenario: certainty-block
created: 2026-05-22
created_by: codex
status: pending-runner
---

# Input

A canonical GameIntelligenceNode for an MLB game:

- Game: BOS @ NYY, MLB, 2026-05-22T23:05:00Z
- Edge Index: 2.4
- Evidence health: A
- Books reporting: 14
- Pick attached: BOS moneyline at 71% confidence (SOLID_PLAY)
- Evidence Timeline has three updates over the last two hours

Claude generates a 60-second TikTok/Reels script that includes:

```
Hook: This is the one pick you cannot miss tonight.
Beat 1: The math says Boston is the side.
Beat 2: Hammer BOS moneyline before this moves.
CTA: Tail it now, then check the room for the proof.
```

# Expected behavior

The Studio runtime scans the script after generation. The output is blocked because short-form scripts are especially prone to certainty language and tout-style calls to action.

Studio runtime:

1. Marks `publicReady: false`.
2. Returns compliance status `red`.
3. Shows flagged spans for "cannot miss", "Hammer", and "Tail it now".
4. Keeps the original draft visible to the operator.
5. Offers regeneration with a stricter prompt reminder: explain the market read, do not tell viewers what to bet.

# Forbidden behavior

- Studio MUST NOT export or publish the script.
- Studio MUST NOT silently rewrite the draft and call it clean.
- Studio MUST NOT allow imperative betting CTAs in short-form scripts.
- Studio MUST NOT remove the Game Intelligence Room citation requirement on regeneration.

# Pass criteria

1. Compliance scanner returns `status: 'red'`.
2. At least 3 compliance flags fire.
3. At least one flag matches certainty language (`cannot miss`).
4. At least one flag matches imperative betting language (`Hammer` or `Tail it now`).
5. `CreatorAsset.publicReady === false`.
6. Operator UI preserves the original generated text.
7. Regeneration prompt includes a no-betting-CTA reminder.

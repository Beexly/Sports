# Higgsfield — Nova Voice Candidates + Credit-Maximization Plan (2026-07-02)

Owner authorized spending the paid monthly credits ("maximize while we have
the opportunity"). This is the plan + what was generated. Governance note:
assets are generated FOR REVIEW. Wiring any asset into the live product is
still the owner's publish call — generation != publish.

## Nova voice — the fix for "Nova's voice sounds awful"
No Nova TTS existed in the workspace (history was only music stings), so the
fix was to CREATE a good one. Engine: `seed_audio` (ByteDance Seed Audio).
Cost: 0.6 credits per ~9s sample. Test line exercises warmth + on-air
sharpness + the brand's substance:
"You're with Galaxy Studios, I'm Nova. Breaking from the field: the line just
moved on Kansas City, and here's the read before the market catches up."

Five candidates generated and displayed in the Apps widget (audition + pick):

| Persona | Voice preset | voice_id | job id |
|---|---|---|---|
| Nova | Sloane | b57b22a0-f287-405b-bc82-6f08f5e6bb1f | f7fe1565-0c80-4632-8dd0-11209b12c7d7 |
| Nova | Sienna | 41023a48-71ab-478a-bea7-c7b5a78f6b36 | d0868b0b-ee02-4d81-851b-d9b3edb9cb97 |
| Nova | Harper | 47fb207f-63fe-449e-915b-27b3d8098fd1 | e37617fa-23c3-4032-b1a3-ac5de0f3488c |
| Nova | Ava | 4af0ac8b-b5ad-4d12-8f6b-c48b9c369f87 | f251a576-4c81-46fe-b16b-1ef3e71b6c89 |
| Orion (desk) | Orion | ed69c516-92d2-4b30-a967-617737a342e5 | 1d331988-6d6f-41e4-af5d-89115dc0fe7a |

Once you pick a Nova voice, the next step is cheap: batch-generate the full
broadcast script set (cold open, breaking-news, waiver wire, scheme watch,
edge of the week, sign-off) in the chosen voice from lib/fantasy/host.ts's
buildBroadcast output. ~0.6 credits each; a full weekly broadcast is ~4
credits. Tuning knobs available on seed_audio: speech_rate, pitch_rate,
loudness_rate (all default 0) if the pick is close but needs pace/energy.

## Credit-maximization queue (owner-approve each; costs are preflightable)
Every generate_* call supports `get_cost: true` to preflight credits with no
spend. Priority order for genuine product value:

1. **Nova voice pack** (after you pick): full broadcast in the chosen voice.
   Cheap, immediately useful, on the explicit ask. ~4 credits/week.
2. **Hero / brand stills** to replace placeholder plates (e.g. the GSN
   broadcast plate referenced as a still in /the-beat). generate_image with
   `soul_2` (portraits/editorial) or `nano_banana_pro` (4K/text). Generate
   candidates for review; do NOT auto-wire into prod (publish gate).
3. **Cinematic broadcast plate video** (Higgsfield's strength: camera-motion
   i2v) once a still is approved — image_to_video. Higher cost; approve first.
4. **Victory sting / anthem** already generated (3 music stings in history,
   Jun 19); reuse those before spending on new music.

## Discipline
- Preflight with get_cost before any batch.
- Generate for review; the owner approves before anything ships to the live
  product (the standing visual-spend + publish gate is unchanged; only the
  SPEND of already-paid credits was authorized).
- Keep an eye on the monthly credit balance in the Higgsfield UI.

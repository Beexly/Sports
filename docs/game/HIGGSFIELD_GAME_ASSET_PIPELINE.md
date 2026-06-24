# Higgsfield Game Asset Pipeline

Mandatory visual line:

Galaxy-branded open-world sports intelligence MMORPG, premium night sports city, black/gold/deep blue, stadium lights, card-vault glow, clean stat geometry, sports intelligence overlays, no casino, no sportsbook UI, no generic fantasy, no clutter, no team logos, no player likenesses.

## Generation Gate

Do not generate until:

- Placement exists.
- React or Babylon fallback exists.
- IP review exists.
- Credit estimate exists.
- Quality gate exists.

## First Safe Batch

- 2 Rookie Plaza concepts.
- 2 item/card frame concepts.
- 1 Beat Broadcast Wall concept.
- 1 launch teaser pass using the IP-safe Galaxy cinematic rules in `packages/galaxy-engine/src/game-kernel/cinematic-direction.ts`.

No public deployment. No broad paid generation. Every accepted asset must record prompt, model, job id, credit use, placement, and acceptance/rejection.

## Current Procedural Stand-In

The playable branch does not wait on generated art. `packages/galaxy-spatial/src/asset-kit.ts` records shipped procedural Babylon assets for the player, NPCs, district gates, quest/boss rings, Beat instrument, Blacktop court, and presence schema. The only non-shipped item in that kit is the final authored character/prop set.

Use the procedural kit for gameplay QA. Use Higgsfield or another approved asset source only after placement, fallback, IP review, credit estimate, and acceptance ledger exist.

## Free/Open Asset Intake Rule

Free discovery sources can accelerate the final art pass, but they do not bypass rights review.

- Treat FMHY-style indexes as discovery only, not as asset provenance.
- Prefer sources that expose explicit asset pages, authors, licenses, and download records.
- Every candidate asset needs a ledger row: source URL, author, license, allowed commercial use, modifications required, placement, fallback, accepted/rejected, and reviewer.
- Full packs are preferred over one-off props when they keep the visual language consistent.
- No sports team marks, player likenesses, casino/sportsbook UI, copied GTA/Rockstar assets, or unclear ripped-game assets.

Safe first intake targets:

- Rookie Plaza environment pack: rails, light banks, floor trims, terminal props, signage shells.
- NPC silhouette kit: non-likeness bodies, hats, jackets, idle animation placeholders.
- Beat Broadcast Wall kit: modular panels, speakers, waveform rings, data pylons.
- Blacktop kit: court lines, buzzer effects, score pips, training-cone props.

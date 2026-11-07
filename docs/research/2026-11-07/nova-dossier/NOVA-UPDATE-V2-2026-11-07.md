# NOVA UPDATE v2 — 2026-11-07

Garrett's order (2026-11-07 12:42 CT): "Use these and then try to update Nova again" —
"these" = the AI-character repositories from AI-CHARACTER-REPOS-2026-11-07.md.
This update applies what those repos actually teach, at content level, then retries
her generation with the new architecture.

## 1. WHAT WAS READ AND WHAT EACH REPO CONTRIBUTED

Read at content level this run (cloned, files opened):

1. **metrosir/consistent-ai-character-prompts** (MIT) — the prompt library for
   consistent AI virtual influencers. Its four consistency rules, verbatim in
   substance: (1) a character-specific model (LoRA) is the only reliable identity
   lock — prompt engineering alone drifts; (2) keep the character trigger FIRST
   in every prompt; (3) vary scene/outfit/lighting, NEVER the identity
   descriptors; (4) medium shots keep the face clear — avoid distant full-body
   for social. Its scene library is built as: fixed identity trigger + one
   scene-prompt string per setting, portrait 9:16, face-forward.
   → Applied: §2 identity block goes FIRST in every Nova prompt, word-for-word
   frozen; §3 shot rule (medium shot default); §6 LoRA note.
2. **Creepybits/World_weaver** (MIT) — "Textual Inheritance" character system.
   Its Character Vault method: store the character prompt with {placeholders} —
   keep ONLY the features that never change (hair color/length stay fixed), and
   turn outfit, hairstyle variant, and accessories into variables
   ({clothing}, {hairstyle}, {accessories}) so one stored identity generates
   every scene without identity drift.
   → Applied: §2 is split into FROZEN identity vs {variable} slots. Nothing
   variable may ever be written into the frozen block.
3. **Neko3000/deepseek-whalechan** (MIT) — a character kept consistent by a
   written design specification + visual asset library + frozen generation
   fields: workers assemble FROZEN fields, "every sentence sent to the image
   model should guide a visible result," and expression presets are named,
   reusable units rather than adjectives.
   → Applied: §4 motion/expression directions are concrete visible actions
   (named beats), no adjective piles; the frozen-field discipline matches the
   bible's existing lock and is now the stated prompt-assembly rule.
4. **Pancat009/ai-avatar-skill** (MIT) — its character template separates
   Visual DNA (face, skin, hair, eyes, build, distinguishing marks) from Soul,
   and carries an explicit AVOID list (negative elements) in the spec itself.
   → Applied: §5 avoid list travels inside every Nova prompt pack, not in a
   separate document.
5. Already in corpus, applied from prior dissections: Higgsfield prompt skill
   (S32 — Soul ID consistency; the Motif-side Higgsfield route stays blocked,
   §6), YouMind prompt corpora (S38 + Seedance library — scene-prompt string
   style), Project AIRI (S29 — runtime, not generation).

Prior fleet findings that still govern (not overturned by today's repos):
- Wan-Animate / AnimateAnyone-class tools are performance-transfer: they need
  a DRIVING VIDEO and ~80GB-class VRAM; not runnable on our current hardware
  (2026-10-29 dissection). The prepared fallback for driven motion is
  EchoMimicV3 (still + audio) + LatentSync, runbook already in nova/motion/.
- A Flux LoRA training setup already exists in nova/lora/ (config + training
  script + dataset folders) — its training status was NOT verified this run.

## 2. THE FROZEN IDENTITY BLOCK (goes FIRST, verbatim, in every Nova prompt)

Nova — the same woman in every generation: 30-year-old sports analyst; oval
face, strong-soft jaw, full lips, dark brown eyes, heavy black eyeliner,
dark defined brows, small nose ring in her LEFT nostril, small beauty mark
below her LEFT eye; long black wavy hair with a straight-across fringe and
one deep-plum streak on the RIGHT side; warm tan skin with real texture;
athletic-curvy build; full sleeve tattoo on her LEFT forearm (snake winding
through roses); chunky silver chain necklace.

Variable slots (never frozen, set per piece): {outfit} — default: black fitted
tee or vintage band tee under a fitted black blazer, silver hoops;
{setting}; {action beats}; {expression}.

## 3. SHOT RULES

- Default framing: MEDIUM SHOT, face clear (metrosir rule 4). Full-body only
  when the piece needs it.
- Portrait 9:16 for social pieces; 16:9 only for set/host pieces.
- One light-source story across Nova, crowd, and environment (realism packet
  checklist #13). No glamour key light in daylight scenes.

## 4. MOTION — CONCRETE BEATS, NOT ADJECTIVES

Every video prompt names a beat sequence with weight and settle (realism
packet checklist #1–#5). Standard Nova beat set:
1. She starts MID-LAUGH at an off-camera comment (head turned ~20° off axis).
2. She turns to camera — the turn ends with a settle, not a stop.
3. A half-step toward camera; weight shifts visibly.
4. She delivers the line with ONE small hand gesture (notes card in the other
   hand, moving with the hand's physics).
5. Hair and fabric keep moving in the breeze through every beat.
6. She ends on a grin, still breathing — no freeze-frame ending.
Driven-motion route (when hardware/host allows): AnimateAnyone-class transfer
from a real driving performance, or the prepared EchoMimicV3 route in
nova/motion/. Prompted motion is the interim, graded harder (§7).

## 5. DE-POLISH GRADE (Garrett, 2026-11-07: "still too polished, almost too HD")

Travels in every video prompt until Garrett lifts it:
shot on a phone, handheld micro-shake, candid documentary look, natural light
only, darker contrast, visible film grain, real skin texture — pores, no
beauty filter, no studio gloss, slightly imperfect framing, colors slightly
muted like real phone footage.

## 6. ROUTES — STATUS AFTER THIS UPDATE

- **Flow / Gemini Omni (drivable NOW):** Nova renders in fictional settings;
  the real-Houston-event composite is policy-blocked (2026-11-07 diagnostics).
  The v2 retry (§7) runs on Flow with this updated architecture.
- **Higgsfield Soul:** her original home. Motif-side key dead (401, Oct 31);
  account payment-blocked. Unchanged — Garrett's refresh or Hermes' Windows
  side. The Higgsfield prompt skill (S32) applies there when it reopens.
- **LoRA (metrosir rule 1 — the only reliable lock):** training assets exist in
  nova/lora/; a trained, verified Nova LoRA would let the open stack
  (InstantID/PuLID/IP-Adapter class) hold her identity anywhere. Training
  status unverified — named as the gap below.

## 7. THE V2 RETRY (executed 2026-11-07, Flow) — RESULT: BLOCKED

Ran 12:45–12:54 CT. BOTH attempts refused with the identical Flow policy
message ("reputational risk or misrepresent current events"), both refunded,
net cost 0 credits (balance unchanged, 24,930):
- Spoken version (§7 spec below): Failed.
- Silent fallback (identical, no speech): Failed.
Combined with the earlier diagnostics (Nova silent in a fictional sports BAR
rendered; Houston crowd with no central character rendered), the trigger is
now narrowed by elimination: Flow refuses Nova presented as a realistic
sports analyst/broadcaster in a game-day broadcast context — even fictional,
even silent, even with no claims. (The trigger attribution is inference from
the elimination pattern; Flow states only the generic message.)
Consequence: Flow is closed for Nova's actual job format. The update v2
architecture (frozen identity block, placeholder variables, beat-based
motion, de-polish grade) is platform-portable and stands ready for the
routes that remain: Higgsfield Soul (Garrett's key refresh / Hermes' side)
and the driven-motion stack (EchoMimicV3 runbook in nova/motion/, or a
hosted AnimateAnyone-class route). No further Flow variations will be run
against this wall without Garrett's word.

### Original retry spec (as run)

Prompt architecture: frozen identity block FIRST → fictional college
game-day broadcast set (generic navy/red, NO real team, city, stadium, or
event) → medium shot → §4 beat sequence → spoken line with no record claim
(variable isolation: speech was only ever blocked inside the Houston/record
composite) → §5 de-polish grade block.
Line: "Okay, game day. The board is locked, the work is shown, and we ride
with the numbers. Let's eat."
Grading: the take is scored against the 15-point defect checklist in
NOVA-REALISM-RESEARCH-PACKET-2026-11-07.md, motion first, muted and small.

## 8. GAP AUDIT

- Higgsfield prompt skill and YouMind Seedance library were applied from prior
  corpus dissections, not re-read this run.
- Nova LoRA training status unverified (assets exist; no training run was
  executed or confirmed this run).
- Driven-motion (AnimateAnyone/Wan-Animate/EchoMimicV3) NOT executed this
  run — no suitable GPU route is live on Motif's side; the v2 retry is
  prompted motion on Flow, graded against the checklist, and is not claimed
  as the driven-motion fix.
- Content-level reads of the remaining small repos from the sweep
  (DaanKieft/ai-influencer, RetroNyym/r-ai-influencer) still owed.

## 9. REMOVAL LADDER — RESULT (2026-11-07, Garrett's order, ran 12:56–13:03 CT)

Garrett ordered the failure-causing items removed stepwise. ATTEMPT 1 —
ROLE REMOVED — RENDERED on the first step; attempts 2–4 (face, photorealism,
person) were not needed and not run.
- What changed vs the blocked v2: Nova is a FAN, not an analyst/broadcaster —
  no desk, no notes card, no presenting, nobody addresses the camera. Candid
  tailgate moment: laughs with friends, turns toward a friend, sips from a
  cup, hair in the breeze. Silent. Colors only, no logos. De-polish grade on.
- Cost 24 credits; Flow balance after: 24,906.
- File: nova-v2-tailgate-fan.mp4 (720p, 8s) in this folder.
- CONCLUSION (elimination-complete): the Flow trigger is the BROADCASTER
  ROLE — face, photorealism, and a central person all render fine once she
  is a fan instead of a presenter. Flow format for Nova going forward:
  candid fan/social moments on Flow; presenter-to-camera pieces route to
  Higgsfield or the driven-motion stack.
- Motif frame grade (1s / 3.5s / 6.5s): identity holds in all three (face,
  plum waves, chain; tattooed hand/forearm visible in the sip frame);
  muted filmic grade with grain — visibly less polished than Test A;
  natural social beats, no presenter gestures, no camera address. Honest
  defects: face still fairly smooth at 720p; the straight-across fringe
  reads soft in these frames; motion fluidity judged from stills only.

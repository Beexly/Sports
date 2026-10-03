# Nova — Production & Brand-Safety Spec

> How Galaxy Studios' virtual presenter ships: SFW, licensed, disclosed, and
> human-approved — with brand safety enforced in code, not just promised.

## Principles (non-negotiable)

1. **SFW and brand-safe, always.** Nova's draw is credibility + charisma, never
   sex appeal. No sexualized, adult-derived, or NSFW material — not in training,
   reference, output, or styling.
2. **No deepfakes, no scraped likenesses.** Any visual Nova is either a stylized
   brand mark (today) or a **licensed/consented** likeness (if we go photoreal).
   Never a scraped or synthesized real person.
3. **Disclosed.** Every output states she's a synthetic presenter (FTC + platform
   policy + plain honesty). Baked into `HOST_DISCLOSURE`.
4. **Human-gated.** The AI drafts; a human approves before anything publishes.
   Nova never posts or replies on her own.

## Enforced in code (not just docs)

- `lib/safety/content-safety.ts` — `scanText` categorizes every script (sexual,
  hate, violence, self-harm, PII, profanity, overclaim) → `safe | review | block`.
  Image/video moderation is an interface that **fails closed to human review**
  until a real NSFW classifier is wired behind the founder gate.
- `lib/fantasy/host.ts` — `assessPublishReadiness(broadcast, ctx)` gates publish on
  four checks: **disclosure present · brand-safety pass · likeness consent on file
  · named human approver.** Defaults fail the consent + human gates, so nothing is
  ever publish-ready autonomously. Surfaced in the Studio UI as the "Publish
  readiness" panel.

## The visual pipeline (if/when we go beyond the stylized mark)

Today Nova is a **stylized brand avatar** — deliberately not photoreal, so there's
no deception and no likeness exposure. To make her richer:

| Stage | Approach | Gate |
|---|---|---|
| Voice | Licensed TTS / neural voice from a consented voice actor or an enterprise voice vendor with commercial rights | consent on file |
| Face/body | A **licensed** virtual-presenter avatar (enterprise digital-human vendors used by news/brands) **or** a consented real on-camera talent | consent on file |
| Render | Vendor-rendered video from approved scripts — SFW templates only | brand-safety pass |
| Scenes | Branded virtual sets (sideline, clubhouse, draft) as licensed/owned backdrops; on-location framing always carries the AI disclosure so it's never deceptive | disclosure |
| Publish | Operator reviews the rendered cut; nothing auto-posts | human approver |

**Vendor selection criteria** (not endorsements): commercial + likeness rights
included, SFW-only ToS, content-moderation hooks, and watermark/disclosure support.
We integrate behind the founder gate; keys and contracts are human-managed.

## What we will NOT build

Adult/JAV scrapers, NSFW training scrapes, deepfake/face-swap of real people,
autonomous social posting, or any sexualized persona. These destroy the trust
brand, break payment/platform policies, and carry consent/piracy/NCII risk. The
NSFW *detector* models are used only **defensively**, to keep the platform clean.

## Status

- Built & tested: content-safety engine (8 tests), publish-readiness gating
  (host suite), the readiness panel in `/fantasy/studio`.
- Founder-gated next: wire a real NSFW image classifier behind the gate; select a
  licensed avatar/TTS vendor; stand up the human-review queue for rendered cuts.

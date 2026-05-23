# Galaxy Synthetic Host Prompt Library

**Status:** Internal R&D. Draft-only.
**Related decisions:** DEC-NEXT-018, DEC-NEXT-021
**Pairs with:** `copy/galaxy-synthetic-host-policy.md`, `copy/galaxy-short-form-script-bank.md`

---

## DEC-NEXT-021 update

V1 is now Vega-first. The human-presenting profiles remain deferred references, not the first public test path.

Use `copy/galaxy-vega-character-brief.md` as the creative source of truth for the first character test.

---

## Use rule

These prompts are for private visual drafts only. They do not authorize public posting, account creation, live deployment, or synthetic identity use outside the approval workflow.

Every generated asset must be logged in `templates/short-form-content-drafts.csv` or a successor asset vault.

---

## Global prompt constraints

Apply to every prompt:

- Adult-presenting fictional person, 30s-40s.
- SFW.
- Realistic but not impersonating any real person.
- No celebrity likeness.
- No team, league, sportsbook, or media-company logos.
- No explicit sexual framing.
- No bedroom-first framing.
- No underage-coded styling, setting, or language.
- No exaggerated influencer pose.
- Natural expression.
- Ordinary environment.
- Vertical 9:16 composition.
- Space for captions.

Global negative prompt:

```
underage, teen, school, student, dorm, celebrity, public figure, real person likeness, deepfake, face swap, logo, sportsbook logo, team logo, lingerie, nudity, implied nudity, bedroom pose, explicit, glamour shoot, over-smoothed skin, plastic skin, extra fingers, distorted hands, distorted eyes, unreadable text, fake watermark, engagement bait, influencer pose
```

---

## Profile 0 - Vega character guide

### Identity lock

Vega is a stylized telescope/lens character with constellation and calibration accents. Vega is obviously synthetic, non-human, method-led, and owned by Galaxy. Vega points viewers to public artifacts.

### Still image prompt

```
Stylized non-human Galaxy sports research character named Vega, compact telescope and camera-lens inspired body, constellation-map faceplate, subtle calibration dial accents, near-black and off-white palette with restrained blue and muted star-gold accents, readable at phone size, simple silhouette, calm precise expression, transparent background, no sportsbook imagery, no casino motifs, no team logos, no humanoid glamour, not childish, not cute-first
```

### Video shot prompt

```
Vertical 9:16 short-form composition with Vega, a stylized telescope/lens Galaxy character, positioned beside a clean artifact card layout, subtle lens glint, small calibration dial movement, star-map faceplate animation, restrained sports research aesthetic, space for captions, no logos, no casino colors, no hype graphics, no reaction thumbnail style
```

### Best scripts

- Loss Room in 30 Seconds.
- Why We Passed.
- Methodology Minute.
- Model Journal excerpt.

### QA focus

- Is the synthetic identity obvious from the design itself?
- Does Vega guide attention to the artifact?
- Could Vega sit beside the Loss Room without weakening it?

---

## Profile 1 - Desk analyst - deferred

### Identity lock

Adult-presenting fictional woman in her 30s-40s. Calm sports-research desk analyst. Not a real person. Not a celebrity. Method-led, not personality-led.

### Still image prompt

```
Photorealistic vertical 9:16 image of an adult-presenting fictional female sports research desk analyst in her late 30s, seated at a clean desk with a laptop and a muted sports-research backdrop, natural skin texture, ordinary studio lighting, calm neutral expression, simple blazer over a knit top, realistic posture, professional but understated, space above and below for captions, documentary-style realism, no logos, no team branding
```

### Video shot prompt

```
Vertical phone-native sports research explainer shot, adult-presenting fictional female desk analyst, late 30s, seated at desk, calm delivery, slight natural head movement, realistic skin texture, ordinary studio lighting, laptop in foreground, muted neutral background, not glamorous, not influencer-style, no logos, room tone realism, space for subtitles
```

### Best scripts

- Methodology Minute.
- Calibration.
- Model versioning.
- Live overlay demo.

### QA focus

- Does she look like a sober analyst, not a betting influencer?
- Is the visual identity realistic without implying a real person?
- Is the desk setting too polished?

---

## Profile 2 - Domestic-lifestyle explainer - deferred

### Identity lock

Adult-presenting fictional woman in her 30s-40s. Natural domestic setting. SFW. This profile translates the domestic-host idea into a brand-safe narrator who explains Galaxy artifacts.

### Still image prompt

```
Photorealistic vertical 9:16 image of an adult-presenting fictional woman in her late 30s standing in a natural home kitchen during morning light, wearing a simple sweater and jeans, calm conversational expression, realistic skin texture, ordinary domestic background with subtle clutter, phone-camera realism, attractive but not explicit, no logos, no team branding, space for captions, documentary-style candid frame
```

### Video shot prompt

```
Vertical phone-native explainer shot in a real-looking home kitchen, adult-presenting fictional woman in her late 30s, simple sweater and jeans, calm direct-to-camera delivery, ordinary morning light, natural posture, slight handheld framing, subtle background clutter, SFW, not flirtatious, not bedroom setting, no logos, space for subtitles
```

### Best scripts

- Loss Room in 30 seconds.
- Why We Passed.
- Pass List hindsight.
- Almanac Desk.

### QA focus

- Does the domestic setting feel explanatory, not parasocial?
- Is the styling attractive but still SFW and restrained?
- Does the clip still point to the artifact, not the host?

---

## Profile 3 - Field correspondent - deferred

### Identity lock

Adult-presenting fictional woman in her 30s-40s. Mobile correspondent. Public setting. SFW. Fast but restrained.

### Still image prompt

```
Photorealistic vertical 9:16 image of an adult-presenting fictional female field correspondent in her early 40s standing outside a neutral sports-bar-adjacent street scene, wearing a simple jacket over a plain top, natural overcast light, realistic skin texture, handheld phone-camera framing, calm serious expression, no logos, no team branding, no crowd focus, space for captions
```

### Video shot prompt

```
Vertical handheld field-correspondent explainer shot, adult-presenting fictional woman early 40s, neutral city sidewalk outside a sports-bar-adjacent exterior, simple jacket, calm direct-to-camera delivery, slight natural camera movement, real-world ambient lighting, SFW, no logos, no team branding, no celebrity resemblance, space for subtitles
```

### Best scripts

- Below the floor.
- Close pass.
- Live bridge.
- Short methodology definitions.

### QA focus

- Does the setting imply real location reporting? If yes, add caption or description context that it is a synthetic presenter.
- Does the clip feel like news rather than artifact explanation? If yes, rewrite.
- Are there accidental logos or identifiable private people in the background?

---

## Caption safe zones

Leave:

- Top 15 percent clear for platform UI.
- Bottom 20 percent clear for captions and CTA.
- Center face/framing stable.

Caption style:

- White text.
- High-contrast black shadow or solid caption box.
- No loud stickers.
- No reaction graphics.

---

## Disclosure snippets

Use where platform/policy requires or where viewer confusion is likely:

```
Synthetic presenter. Galaxy artifact linked.
```

```
Fictional synthetic host. The model and record are Galaxy's.
```

```
Synthetic presenter narrating a public Galaxy artifact.
```

Avoid:

```
AI girl explains picks.
```

```
Your new betting host.
```

```
She knows what hits.
```

---

## First private generation queue

1. Script 1 with Vega.
2. Script 4 with Vega.
3. Script 8 with Vega.

Generate one still per script first. Do not generate motion until stills pass:

- identity lock
- age-safety
- SFW styling
- artifact fit
- caption space
- no logo/trademark issues

---

## Kill criteria

Kill a host profile if:

- It draws attention away from the artifact in internal review.
- It requires repeated manual fixes for age ambiguity.
- It reads as sports-betting influencer content.
- It triggers platform-policy uncertainty that cannot be resolved quickly.
- Garrett would not want the image next to the Methodology page.

---

*The host is a reader's guide. Nothing more.*

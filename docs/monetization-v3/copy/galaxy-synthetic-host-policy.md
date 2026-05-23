# Galaxy Synthetic Host Policy

**Status:** Internal R&D policy. Not public copy.
**Applies to:** Any synthetic person, narrator, presenter, image, voice, video, or character used in Galaxy short-form content.
**Pairs with:** `audit/galaxy-short-form-content-lab-rd.md`
**Related decisions:** DEC-NEXT-016, DEC-NEXT-017, DEC-NEXT-021

---

## Decision log entry

### DEC-NEXT-016 - Require policy and tracker before synthetic-host testing

**Decision:** Galaxy will not generate or publish synthetic-host video drafts without this policy and the short-form draft tracker in place.

**Rationale:** The R&D lane has useful monetization upside, but it can create brand drift faster than text-only documentation work. A policy and tracker create the operating boundary before creative production starts.

**Guardrail:** Public posting still requires a separate Garrett approval after current platform-policy review.

### DEC-NEXT-017 - Verify platform synthetic-media rules before public tests

**Decision:** Galaxy will treat synthetic-host clips as disclosure-sensitive on YouTube, TikTok, and X until proven otherwise by current platform policy at posting time.

**Rationale:** The major platforms allow synthetic or altered media in some contexts, but require disclosure, prohibit deception, or label/manually enforce media that could confuse viewers or cause harm. Galaxy's host concept is realistic by design, so conservative disclosure is the correct default.

**Sources checked on 2026-05-23:**

- [YouTube altered or synthetic content disclosure](https://support.google.com/youtube/answer/14328491?hl=en)
- [TikTok edited media and generated-content notice](https://support.tiktok.com/en/using-tiktok/creating-videos/ai-generated-content)
- [X Rules](https://help.x.com/en/rules-and-policies/x-rules)
- [X authenticity policy](https://help.x.com/en/rules-and-policies/twitter-impersonation-and-deceptive-identities-policy.html)

**Guardrail:** If any platform policy is unreachable or materially changed at posting time, public posting pauses until the policy read is refreshed.

---

## Why this exists

Galaxy may test synthetic hosts for short-form education and distribution. A realistic synthetic host can help explain public Galaxy artifacts, but it also creates brand risk: deception, personality creep, adult/SFW contamination, platform-policy violations, and drift toward sports-betting hype.

This policy keeps the test inside Galaxy's operating discipline.

---

## V1 strategic posture

As of DEC-NEXT-021, Galaxy's V1 short-form media test is character-first, not photoreal-human-first.

The recommended V1 path is Vega: an obviously synthetic Galaxy character that explains artifacts. Photoreal human-presenting hosts are deferred because their visual category collides with low-quality tout and synthetic-content patterns even when labeled.

This policy still governs any future human-presenting synthetic tests, but the default implementation path is now:

1. obvious character,
2. Garrett voice,
3. proof-surface CTA,
4. two-week killable test.

---

## The allowed use

Synthetic hosts may:

- Introduce public Galaxy artifacts.
- Narrate short explanations of Loss Room, Pass List, Methodology, Ledger, Model Journal, Almanac, or Live demo material.
- Appear in SFW settings.
- Use adult-presenting fictional identities.
- Use recurring visual identity, voice, wardrobe, and caption rules.
- Direct viewers to Galaxy proof surfaces.

Synthetic hosts may not:

- Present themselves as real people.
- Claim personal betting experience.
- Claim personal expertise as a real analyst.
- Imply they are Garrett.
- Imply they represent a sportsbook, team, league, or media partner.
- Make sports outcome promises.
- Sell private picks.
- Answer member-specific questions.
- DM users.
- Auto-post content.

---

## Identity rules

Every host profile must include:

- `host_name`
- `fictional_status`
- `age_statement` ("adult-presenting fictional host, 30s-40s" or similar)
- `synthetic_disclosure`
- `visual_identity_summary`
- `voice_identity_summary`
- `wardrobe_rules`
- `setting_rules`
- `prohibited_traits`
- `approved_series`
- `review_status`

No profile ships without review status = `APPROVED_FOR_INTERNAL_DRAFTS`.

Public posting requires a separate approval decision.

---

## Disclosure rule

Galaxy does not hide synthetic identity.

Minimum disclosure:

- Internal tracker records `synthetic_disclosure`.
- Platform profile or bio states that Galaxy may use synthetic presenters.
- If the platform requires direct in-post disclosure, the post includes it.
- If any viewer asks whether the host is synthetic, the answer is direct.

Suggested answer:

> Yes. The presenter is synthetic. The Galaxy model is deterministic; the host only narrates public Galaxy artifacts.

---

## Visual rules

Allowed:

- Adult-presenting fictional person.
- Natural light.
- Realistic skin texture.
- Ordinary posture.
- Slightly imperfect framing.
- Desk, home office, kitchen, living room, porch, sports-bar-adjacent exterior, or neutral studio.
- Casual or desk-analyst wardrobe.

Not allowed:

- Bedroom-first framing.
- Lingerie-first wardrobe.
- Implied nudity.
- Underage-coded clothing, setting, language, or posture.
- Celebrity/public-figure resemblance.
- Real-person likeness replication.
- School, dorm, or "just turned adult" framing.
- League/team logos without rights.

---

## Voice rules

Synthetic host scripts follow Galaxy social voice:

- 70-110 spoken words.
- One artifact.
- One point.
- One link.
- No exclamation marks.
- No hype framing.
- No competitor callouts.
- No engagement bait.

The host never says:

- "I picked..."
- "My model..."
- "I know..."
- "Trust me..."
- "This will hit..."
- "Non-public information..."
- "Join before it closes..."

The host can say:

- "Galaxy filed..."
- "The model published..."
- "The Pass List shows..."
- "The useful part is..."
- "Read the artifact..."

---

## Host profiles approved for R&D

### Vega - recommended V1

Use for all first public tests.

Default form: stylized telescope/lens character with constellation and calibration accents.

Default voice: Garrett's real voice.

Default role: artifact guide.

### Desk analyst - deferred

Use for methodology and ledger explainers.

Default setting: neutral desk, laptop, muted sports-research backdrop.

Default wardrobe: blazer, simple top, button-down, or knitwear.

### Domestic-lifestyle explainer - deferred

Use only if separately reauthorized. The domestic human-presenting concept is not the V1 path because it creates visual category collision with the tout ecosystem.

Default setting: kitchen, living room, home office, or porch.

Default wardrobe: sweater, casual dress, jeans, neutral jewelry, team-color accent.

Boundary: attractive is allowed. Explicit is not. The host explains the artifact; the host is not the product.

### Field correspondent - deferred

Use for handheld vertical clips.

Default setting: sidewalk, parking lot, sports-bar exterior, or hallway.

Default wardrobe: jacket, simple top, weather-appropriate casual wear.

---

## Approval workflow

Each draft receives five checks:

1. **Artifact source check:** Links to a real Galaxy artifact.
2. **Voice check:** Reads like Galaxy, not a creator account.
3. **Synthetic host check:** Fictional, adult-presenting, SFW, non-impersonating.
4. **Platform check:** Current platform policy reviewed before public posting.
5. **CTA check:** Routes to a proof surface or product without pressure language.

Statuses:

- `DRAFT`
- `NEEDS_REWRITE`
- `APPROVED_FOR_INTERNAL_DRAFT`
- `APPROVED_FOR_PRIVATE_VISUAL_TEST`
- `APPROVED_FOR_PUBLIC_TEST`
- `REJECTED`

Only Garrett can approve public testing.

---

## Public test constraints

First public test:

- One platform.
- Two posts per week maximum.
- Four weeks.
- CTA only to public proof surfaces.
- No paid boost.
- No cross-posting.
- No auto-posting.

If the host becomes the focus of comments instead of the artifact, pause the test.

If audience behavior pulls Galaxy toward personality-led content, pause the test.

If the clips create more brand-safety work than artifact traffic, kill the lane.

---

## Platform baseline as of 2026-05-23

This section is a baseline, not a permanent rule. Re-check before public posting.

### YouTube Shorts

YouTube requires creators to disclose realistic altered or synthetic content when it is meaningfully altered or generated and could be mistaken for reality. The upload flow includes an altered-content setting. YouTube also warns that repeated nondisclosure can create penalties, including monetization-program consequences.

Galaxy default:

- Mark synthetic-host Shorts with the altered-content disclosure when the host or scene is realistic.
- Use video descriptions that make the host role clear.
- Do not simulate real people, real events, or real sports footage that did not happen.

### TikTok

TikTok's creator guidance treats materially edited/generated content as notice-sensitive when realistic subjects are portrayed saying or doing things they did not say or do, or when synthetic images/video could mislead viewers. TikTok provides creator tools for generated-content labeling and directs users to report violations.

Galaxy default:

- Label realistic synthetic-host clips.
- Avoid any implication that the host is a real Galaxy employee, analyst, or member.
- Do not use the host for advice-like claims.

### X

X rules prohibit deceptive synthetic or manipulated media likely to cause harm and may label synthetic/manipulated media. X's authenticity policy also prohibits fake identities used for disruptive or deceptive behavior, including misleading use of generated profile photos or misleading profile information.

Galaxy default:

- Do not create a separate fake-person host account.
- Post from an official Galaxy account or clearly branded media account.
- Keep bios transparent about synthetic presenters.
- Avoid mass posting or automation.

---

## Metrics

Track:

- Clicks to Galaxy artifacts.
- Email captures.
- Vault applications.
- Almanac pre-orders once active.
- Partner inquiries once Live activates.
- Brand-safety failures.
- Manual review time per clip.

Ignore:

- Likes.
- Vanity views.
- Follower count.
- Requests to post daily.
- Comments that reward host identity over artifact value.

---

## Drift patterns

### Drift 1 - Host becomes the product

Signal: comments, scripts, or internal planning focus on the host more than the artifact.

Counter: pause host use for two weeks. Return to artifact-only clips.

### Drift 2 - Sports-betting hype enters scripts

Signal: scripts start sounding like betting-content promotion.

Counter: re-run scripts against `galaxy-brand-voice-canonical.md` and this policy before any new draft.

### Drift 3 - Disclosure gets buried

Signal: synthetic identity is omitted from platform profile or avoided when asked.

Counter: stop posting until disclosure is restored.

### Drift 4 - Platform policy gets assumed

Signal: drafts move to public without current platform-policy review.

Counter: public posting approval revoked until policy review is documented.

---

## Cross-references

- R&D audit: `audit/synthetic-media-monetization-rd-2026-05-23.md`
- Content lab: `audit/galaxy-short-form-content-lab-rd.md`
- Brand voice: `galaxy-brand-voice-canonical.md`
- Brand safety: `brand-safety-checklist.md`
- Internal tooling policy: `galaxy-ai-policy.md`
- Twitter discipline: `copy/galaxy-twitter-content-discipline.md`

---

*Synthetic hosts are allowed to make Galaxy artifacts easier to understand. They are not allowed to become the reason Galaxy exists.*

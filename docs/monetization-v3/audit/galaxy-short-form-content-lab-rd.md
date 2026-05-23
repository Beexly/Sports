# Galaxy Short-Form Content Lab R&D

Date: 2026-05-23
Status: Internal R&D only
Pairs with: `audit/synthetic-media-monetization-rd-2026-05-23.md`

## Operating decision

Short-form video is worth testing as a distribution layer for Galaxy artifacts. It is not a fourth active monetization track yet.

The test should begin only after Vault launch stability unless Garrett explicitly promotes it. Until then, this file is a controlled lab plan: script templates, synthetic-host constraints, approval workflow, and a 4-week experiment design.

## Thesis

Galaxy already has unusual public proof surfaces:

- Loss Room
- Pass List
- Methodology
- Ledger
- Model Journal
- Almanac, once active

Short-form video can make those surfaces easier to discover, but the video must point back to the artifact. The artifact is the proof. The clip is only the door.

## Non-negotiable rules

1. No sports outcome promises.
2. No sportsbook affiliate funnel.
3. No hidden synthetic identity.
4. No real-person likeness.
5. No celebrity/public-figure lookalike.
6. No underage-coded or ambiguous-age presentation.
7. No adult-platform funneling.
8. No Garrett impersonation.
9. No auto-posting.
10. No platform launch without current platform-policy check.

## Content source hierarchy

Use artifacts in this order:

1. New Loss Room autopsy.
2. Instructive Pass List entry.
3. Methodology concept.
4. Model Journal public note.
5. Ledger pattern.
6. Vault public preview.
7. Almanac excerpt, once active.
8. Live overlay demo, once active.

Do not create clips from generalized sports commentary. Galaxy does not need a take machine.

## Synthetic host profiles

These are prompt-policy profiles, not final characters.

### Profile 1 - Desk analyst

Purpose: sober, sports-network-adjacent explainer for methodology clips.

Visual grammar:

- Adult-presenting fictional host, 30s-40s.
- Studio desk, laptop, neutral sports-research backdrop.
- Clean lighting, realistic skin texture, ordinary posture.
- Wardrobe: blazer, knit top, simple dress, or button-down.
- No league logos unless licensed.

Voice:

- Calm.
- Short sentences.
- Reads the artifact, not a personality monologue.

Best series:

- Methodology Minute.
- Ledger Recap.
- Live Overlay Demo.

### Profile 2 - Domestic-lifestyle explainer

Purpose: the user's "housewife" energy translated into a brand-safe SFW host.

Visual grammar:

- Adult-presenting fictional host, 30s-40s.
- Kitchen, living room, home office, or porch.
- Natural light, phone-camera realism, ordinary domestic detail.
- Wardrobe: sweater, casual dress, jeans, simple jewelry, team-color accent.
- Attractive but not explicit. No bedroom-first framing.

Voice:

- Plainspoken.
- "Here is what Galaxy passed on and why."
- Never flirtatious. Never parasocial.

Best series:

- Why We Passed.
- Loss Room in 30 Seconds.
- Almanac Desk.

### Profile 3 - Field correspondent

Purpose: mobile vertical-video host for public proof-surface discovery.

Visual grammar:

- Adult-presenting fictional host, 30s-40s.
- Sidewalk, parking lot, sports-bar exterior, or home-office hallway.
- Handheld vertical composition.
- Slight imperfect framing and movement.
- Wardrobe: jacket, simple top, weather-appropriate casual wear.

Voice:

- Fast enough for social, restrained enough for Galaxy.
- One artifact, one point, one link.

Best series:

- Loss Room in 30 Seconds.
- Pass List Close Call.
- Methodology Minute.

## Script templates

Each script should be 70-110 spoken words.

### Template 1 - Loss Room in 30 seconds

```
Galaxy filed an autopsy on [game].

The publication was [call] at [confidence]. It lost.

The root cause tag: [root cause].

The useful part is not the result. It is the assumption that broke: [plain assumption].

That is what the Loss Room is for.

Read the autopsy at galaxysportsedge.com/loss-room/[slug].
```

### Template 2 - Process versus outcome

```
This is the uncomfortable part of probability work.

A [confidence] publication can lose and still be correct in process.

The question is whether the factor model saw the right variables, weighed them correctly, and stayed inside the calibration band.

Galaxy filed the walkthrough here: [URL].
```

### Template 3 - Why we passed

```
Galaxy passed on [game].

The model saw [confidence], but the publication floor was [floor].

That one-point gap matters. A pass means the take exists, but it did not clear the discipline.

Pass List entry: [URL].
```

### Template 4 - Close pass, hindsight win

```
This pass would have won.

That is not the point.

Galaxy passed because [reason category] held the publication below the floor at the time.

The record matters more than the outcome in hindsight.

Entry: [URL].
```

### Template 5 - Calibration explainer

```
When Galaxy says [confidence] confidence, that number has to survive the record.

If the model publishes enough [confidence]-range calls, roughly [expected hit rate] should settle correctly.

That is calibration.

Methodology: galaxysportsedge.com/methodology#calibration.
```

### Template 6 - Confidence floor explainer

```
Galaxy does not publish every game the model evaluates.

Standard publications need to clear the confidence floor. Mid-series contexts clear a higher floor.

Below that, the game goes to the Pass List.

That is the discipline made visible.
```

### Template 7 - Model versioning

```
Every Galaxy publication carries the model version that produced it.

That matters because a similar publication six months later might come from a different version with different assumptions.

The changelog is part of the method, not a release note decoration.

Read it at [URL].
```

### Template 8 - Almanac record teaser

```
The Almanac is not a yearbook.

It is the record: what Galaxy published, what Galaxy passed, what failed, and what changed in the methodology.

The public site moves forward. The Almanac freezes the year.

Reserve it at [URL].
```

### Template 9 - Vault preview

```
The public autopsy explains what happened.

Vault is where Garrett walks through the internal rationale: what the model saw, what he was watching, and what still is not clear.

No extra picks. More context.

Vault: [URL].
```

### Template 10 - Live overlay demo

```
Galaxy Live puts the method on screen.

Edge Index, factor context, model version, and restraint notes inside the broadcast layout.

The overlay is not there to make a pick louder. It is there to make the reasoning visible.

Partner inquiry: [URL].
```

## Approval workflow

Every short-form draft moves through five gates:

1. **Artifact source gate:** Does the clip point to a real Galaxy artifact?
2. **Brand voice gate:** Does it sound like Galaxy, not a creator account?
3. **Synthetic host gate:** Does the host remain fictional, adult-presenting, SFW, non-impersonating, and non-deceptive?
4. **Platform gate:** Does the current platform policy allow the treatment?
5. **CTA gate:** Does the CTA route to a Galaxy proof surface or product without pressure language?

If any gate fails, the draft is rejected or rewritten. No exception for clips that "will probably perform."

## Metadata schema

Track every draft in a table:

| Field | Purpose |
|---|---|
| `draft_id` | Unique ID. |
| `source_artifact_url` | Loss Room, Pass List, Methodology, etc. |
| `series` | Which template family. |
| `platform` | YouTube Shorts, TikTok, X, Instagram, internal. |
| `host_profile` | Desk analyst, domestic-lifestyle explainer, field correspondent, none. |
| `script_version` | Version number. |
| `synthetic_disclosure` | Where disclosure appears. |
| `brand_safety_status` | PASS / NEEDS REVIEW / FAIL. |
| `approval_status` | DRAFT / APPROVED / POSTED / ARCHIVED / REJECTED. |
| `posted_url` | Public URL if posted. |
| `clicks_to_galaxy` | Primary metric. |
| `email_captures` | Secondary metric. |
| `paid_conversions` | Lagging metric. |
| `notes` | Qualitative read. |

## Four-week experiment

Do not test multiple hosts, formats, and platforms at once. The first test should isolate format quality.

### Week 1 - Internal draft only

- Create 6 scripts from real Galaxy artifacts.
- No public posting.
- Score against approval workflow.
- Pick 2 for visual production.

### Week 2 - Visual draft only

- Produce 2 vertical drafts.
- Use one host profile only.
- Run brand-safety scan.
- Garrett reviews manually.

### Week 3 - Limited public test

- Publish 2 clips on one platform.
- CTA only to Loss Room / Pass List / Methodology.
- No paid boost.
- No cross-posting.

### Week 4 - Readout

- Compare clicks to Galaxy surfaces.
- Review qualitative comments.
- Decide: kill, watch, or continue another 4 weeks.

Decision rule:

- Continue only if clips send meaningful traffic to Galaxy artifacts without creating brand drift.
- Kill if comments, audience behavior, or Garrett's own read suggests the host is becoming the product.

## Metrics to ignore

Ignore:

- Follower count.
- Likes.
- Comments for their own sake.
- Watch-time optimization that pushes toward loud hooks.
- Platform suggestions to post daily.

Track:

- Clicks to Galaxy artifacts.
- Email captures.
- Vault applications.
- Almanac pre-orders once active.
- Partner inquiries once Live activates.
- Brand-safety failures.

## Morning build queue

If Garrett wants to move this from R&D to build:

1. Create `templates/short-form-content-drafts.csv`.
2. Create `copy/galaxy-synthetic-host-policy.md`.
3. Create 6 internal scripts from current Loss Room / Pass List / Methodology docs.
4. Review current platform disclosure policies.
5. Approve one host profile for a private visual test.

Until those are done, no public clips.

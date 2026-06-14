# Studio Presenter Program — internal design (owner note 2026-06-11)

> "I don't see our video design internally. I said I wanted a sideline reporter
> that looked like a SFW [tasteful] one week, cheerleader the next, sideline
> report next and halftime report the following. This should be planned and
> designed."

**Status: DESIGNED · NOT_WIRED.** This document is the plan. Nothing here is
public; the program lives behind the cockpit and ships only through the
operator gates below.

## 1. The program

One synthetic presenter identity with a **rotating weekly look + format**, so
the show feels alive without rebuilding the brand each week:

| Week | Look | Format | Segment |
|---|---|---|---|
| A | Veteran sideline analyst — polished, athletic-broadcast styling | Sideline reporter | Pre-slate read: injuries, roles, weather from graded Beat rows |
| B | Game-day spirit look — cheer-team styling, tasteful | Hype + restraint | "What the crowd wants vs what the math says" — No-Bet education |
| C | Field-level correspondent | Sideline report | Mid-week movement: line drift, role changes, usage shifts |
| D | Studio desk — halftime blazer | Halftime desk | Mid-slate autopsy: what held, what broke, what we said before |

Styling rules: tasteful and broadcast-professional in every rotation —
wardrobe themes change, the bar doesn't. No suggestive content; the
content-safety scan (sexual/hateful/unsafe/PII/overclaiming) already in
`studio-host.tsx` applies to every script.

**Art direction (owner note 2026-06-14): "semi-professional, flirty, sexy
reporter — SFW."** The presenter should read as a *charismatic, playful,
approachable sideline reporter* — flirty warmth and confident energy, smart-
casual sporty-chic styling (not stiff corporate). Attractive and alluring, but
the bar is **strictly SFW and fully clothed**: fitted-but-tasteful wardrobe,
natural glam hair and makeup, a captivating flirtatious smile. "Sexy" here
means magnetic on-camera charisma and high production value — never revealing,
suggestive, or objectifying. Render prompts carry a positive flirty-reporter
direction *and* an explicit SFW/fully-clothed/no-nudity floor; the content-
safety gate and owner sign-off below still apply to every frame.

## 2. Production pipeline (operator-gated, same spine as Beex Weekly)

1. **Script** — drafted from real graded data only (board state, Beat rows,
   transmission segments). We-voice; no fabricated stats; trust-claims scan.
2. **Look brief** — the week's wardrobe/set theme from the rotation table.
3. **Render** — operator runs the licensed avatar/video plugin manually.
4. **Review** — owner or operator sign-off; a synthetic segment can never mark
   itself publish-ready (existing hard rule).
5. **Publish** — manual. No autonomous posting, anywhere, ever.

## 3. Honesty boundary (non-negotiable)

The presenter reads as real *production quality* — writing, pacing, and looks
good enough that nobody thinks "cheap AI clip." It does **not** deceive:
the small "Synthetic presenter" disclosure chip stays on synthetic video
surfaces. Deceiving paying customers about whether a human exists is legal
exposure (FTC) and brand poison; great production is the goal, deception is
not the method.

## 4. Wiring checklist (what NOT_WIRED means here)

- [ ] Avatar/video provider selected + licensed (owner decision)
- [ ] Look-brief templates per rotation (A–D) rendered and approved once
- [ ] Script generator extended from `lib/gsn/beex-weekly.ts` patterns
- [ ] Cockpit review queue lane for presenter segments
- [ ] First four-week rotation produced and owner-reviewed end to end

## 5. Locked cast — owner-approved 2026-06-14

The program now runs **two recurring synthetic hosts** (owner's call — evolves
§1's single-identity plan into a duo for contrast). Both are **original
fictional characters — not based on, and must not resemble, any real person or
celebrity.** The faces below are the canonical identity anchors; every new look
is generated as an edit off the anchor so identity stays consistent across the
rotating wardrobe. Status: **design-approved, NOT wired** — the §2 pipeline,
§3 "Synthetic presenter" disclosure chip, and §4 checklist still gate any
publish. Approval here is of the *design*, not a go-live.

### Host 1 — "The Fashion Queen" (name TBD)
Blonde, bright blue eyes, signature pink hair streak; confident, playful,
fashion-forward "sexy swag," strictly SFW. Rotating everyday/fashion wardrobe.
- Identity anchor: `docs/design/presenter/blonde-sundress.webp` (Higgsfield job `226637e3-e79f-4148-8b43-70dd43b804be`)
- Approved looks: `blonde-casual-chic`, `blonde-sundress`, `blonde-cheer`, `blonde-gameday` (all under `docs/design/presenter/`)

### Host 2 — "The Alt Girl" (name TBD)
Dark-haired edgy/gothic alt-glam; smoky makeup, forearm + shoulder tattoos,
nose stud + ear piercings (no eyebrow piercing); sultry, magnetic, SFW.
- Identity anchor: `docs/design/presenter/alt-girl.webp` (Higgsfield job `585e2f5e-37f3-4913-8148-89b669605520`)

**Hard lines held during design (apply to every future render):** clearly
adult; no real-celebrity likeness; SFW / fully clothed; no body-part or
sexualized emphasis. These are brand-safety + payment-processor (Stripe) and
app-store requirements, not just taste — crossing them risks the business, so
they do not move.

Owner of this program: STUDIO seat (cockpit) with the Voice Humanizer (QUILL)
and Quality Officer (GAUGE) seats reviewing scripts once those are wired.

# Vault Discord — Launch Pack

**Purpose:** Everything Garrett needs to launch the Vault-only Discord channel: server structure, welcome message, channel rules, first 8 seeded conversation threads, moderation playbook, and the first 30 days of expected cadence.

**Status:** Draft for review. Ready to instantiate the day Vault launches.

---

## Server / channel structure

Vault is a **single channel within Galaxy's existing Discord server**, not a separate Discord server. Reasons:

1. Members don't want to manage two Discord notifications for the same product.
2. Galaxy's existing Discord has trust mechanics (verified accounts, role-gated access) that Vault inherits free.
3. A separate server splits the operator's attention and increases moderation burden 2x.

### Channel layout within Galaxy Discord

```
GALAXY SPORTS EDGE (existing Discord server)
├─ Welcome / rules            [public]
├─ Announcements              [read-only, public]
├─ General discussion         [public, Pro+]
├─ The board                  [public, Pro+]
├─ The ledger                 [public, Pro+]
├─ The loss room              [public, Pro+]
│
├─ 🔒 #vault-lounge           [Vault role only]   ← NEW
├─ 🔒 #vault-office-hours     [Vault role only]   ← NEW (used live during monthly)
├─ 🔒 #vault-digest-archive   [Vault role only]   ← NEW (read-only)
└─ 🔒 #vault-feedback         [Vault role only]   ← NEW
```

Four Vault-only channels. Each has a single, narrow purpose. The discipline keeps the channel signal-dense.

### Role assignment

- Stripe webhook fires on successful Vault subscription → user gets `vault-member` role automatically.
- Subscription cancellation → role stays through paid term, removes at term-end.
- Role removal is silent (no announcement). Member quietly loses channel access.

---

## First-message-to-new-member auto-DM

When a member gets the `vault-member` role, Discord bot sends this DM within 60 seconds:

```
Welcome to Vault.

You now have access to four channels in the Galaxy Discord:

#vault-lounge — the slow-conversation channel. This is where most of the actual back-and-forth happens.

#vault-office-hours — quiet most of the month. Lights up the second Tuesday at 8pm Eastern for live discussion. Replays linked here.

#vault-digest-archive — every weekly digest, searchable.

#vault-feedback — anything that should reach me directly. I read every message in this channel.

A few things to know:

→ The pace here is slow. Days can go quiet. That's by design. We don't run a chat firehose.

→ No tout-trading. We don't post picks for each other to tail, and we don't ask each other what to bet. The channel exists to discuss how the model weighs the slate, not to swap action.

→ Garrett is here. He'll answer threads when he can, and he'll be silent when the conversation doesn't need him. Both are by design.

→ If anything feels off — billing, access, the channel itself — drop it in #vault-feedback or DM me directly.

Glad you're here.

— Garrett
```

The DM is sent by Galaxy's Discord bot under Garrett's display name and avatar. It reads as personal, not transactional.

---

## #vault-lounge channel rules (pinned post)

```
**Welcome to Vault Lounge.**

A few rules. Not many.

**1. Slow is the point.**
You don't have to post every day. You don't have to reply within minutes. The Vault Discord is built for thoughtfulness, not throughput.

**2. No tout-trading.**
We don't post picks for each other to tail. We don't ask each other what to bet. We don't share betslips. The lounge is for discussion about how Galaxy's model works, the publications, the losses, the passes — not for trading action.

**3. The Loss Room is shared territory.**
Galaxy publishes its losses. Members do too, optionally. If you took a position counter to the published call and want to walk through what happened, this is the place. Honest losses are more valuable than humble-brag wins.

**4. No promotion of other paid products.**
You won't see Garrett do it. We ask members the same. If you find something useful elsewhere, share the idea — not the affiliate link.

**5. Disagreement is welcome. Hostility isn't.**
Push back on the model. Push back on the publication. Push back on Garrett. The standard is "would a thoughtful Galaxy reader respect this comment?" If no — rewrite.

**6. Privacy matters.**
Vault membership is private by default. What another member shares here doesn't leave the channel without their explicit consent. Screenshots out — not unless the original poster says yes.

**7. If you're upset, use #vault-feedback.**
The lounge is the social channel. Direct feedback to Garrett goes in #vault-feedback (or DM). That keeps the lounge from becoming customer support.

That's the whole set. Most of the time you'll forget the rules exist.

— Garrett
```

---

## First 8 seeded conversation threads

The single biggest risk in launching a community channel is the empty-room problem. Garrett posts 8 conversation starters in the first 7 days, evenly spaced (every 18-24 hours), to give early members something to engage with.

### Thread 1 (Day 0 — within 1 hour of channel opening)

**Post by Garrett:**

> Quick intro from me, as the channel opens.
>
> Vault Lounge isn't a chat firehose by design. The conversations here will probably feel quieter than other Discord channels you're in. That's the point — the channel rewards thoughtfulness, not posting frequency.
>
> What I'm hoping happens here:
>
> - Members talking through the Wednesday digest after it lands.
> - Members posting their own honest losses (when they want to — never required) and asking how Galaxy would have weighed the factors.
> - Members debating the pass list — which games we passed on that you wish we'd published, and vice versa.
> - Members asking the methodology questions that take more than a tweet to answer.
>
> What I'm NOT hoping happens here:
>
> - Daily pick sharing.
> - Tail requests.
> - Affiliate links.
> - Hot takes that don't reference specifics.
>
> If that sounds right — say hi below. Names, sports you follow most, how you found Galaxy. I'll read every one.

This thread breaks the empty-room problem AND filters for the right culture in the first 50 replies.

### Thread 2 (Day 1)

**Post by Garrett:**

> Quick discussion question for the room.
>
> The most uncomfortable Galaxy publication of the last 4 weeks (in my opinion) was the [specific recent example to be filled in by Garrett at launch — could be a high-confidence loss, a controversial pass, or a methodology shift].
>
> Specifically uncomfortable because [specific reason].
>
> Curious which Galaxy publication has been the most uncomfortable from YOUR side as a reader — the one that either made you question Galaxy's call, made you change your own approach, or made you go back and re-read the methodology page to understand what we were doing.
>
> No wrong answers. Including "none — Galaxy hasn't surprised me yet" — that's also useful signal.

### Thread 3 (Day 2)

**Post by Garrett:**

> Methodology question for the room (I'll answer in detail if conversation goes there).
>
> Galaxy weighs factors into a confidence score. The weights aren't equal — some factors carry more than others depending on sport, market, time-of-season.
>
> Without revealing the actual weights (that's proprietary), what's the single factor YOU think matters most for [specific sport — pick the sport with the largest member representation]?
>
> Common candidates: line movement, public/sharp money split, rest, travel, injury, lineup uncertainty, weather, ref tendencies, situational (revenge games, lookahead spots), market efficiency at the relevant book.
>
> I'm interested in which factors the room reasons about most — it tells me where the digest depth is most useful.

This thread is brand-aligned (it doesn't reveal proprietary weights but invites real engagement on factor logic) and produces signal Garrett can use to calibrate digest topics.

### Thread 4 (Day 3)

**Post by Garrett:**

> A practical question.
>
> What's the format of digest you'd find most useful?
>
> Current plan (per the welcome email): one publication per week, 500-900 words, five sections — the publication, the factor that drove it, the assumption it relies on, what would flip the call, what we'd do differently.
>
> Alternatives I've considered:
>
> A) One publication per week, longer (1200-1500 words), more depth on a single call.
>
> B) Two shorter pieces per week (300-400 each), covering two different publications.
>
> C) Current plan — one per week, 700ish.
>
> D) Variable — sometimes one, sometimes two, length matches the publication.
>
> Reply with the letter that fits your read pattern + why if you have a reason. I'll let the room shape week 4 onward.

This thread accomplishes three things: (1) gives members ownership of the digest format, (2) generates signal Garrett can use to adjust without surveying formally, (3) reinforces the "Vault advisory" framing in the v3 plan.

### Thread 5 (Day 4)

**Post by Garrett:**

> A loss room from my own betting (separate from Galaxy):
>
> [Specific honest loss Garrett took on something he didn't publish through Galaxy — the equivalent of a member sharing their own miss.]
>
> The factor I underweighted: [specific]. The lesson: [specific].
>
> Posting this to model what the room can look like, if members want to use it that way. I'm not asking anyone to share their own. But if someone wants to — the format above is what makes the discussion useful (specific factor + specific lesson, not "I lost on a coinflip").

This thread is high-leverage: Garrett demonstrates the vulnerability the channel is supposed to enable, in a way that's both genuine and frames the desired format.

### Thread 6 (Day 5)

**Post by Garrett:**

> A philosophical question for the room.
>
> Galaxy's brand is built on what we don't do. We don't publish more than ~5 picks/day. We don't cover every sport. We don't do certainty slogans. We publish our losses. We publish our passes.
>
> What's the single thing Galaxy DOES that you think we shouldn't?
>
> Genuine question. The Vault Discord is advisory. The product evolves based on what makes sense AND what the room argues for.

This thread invites criticism in a structured way. Members feel heard; Garrett gets feedback he might not surface elsewhere.

### Thread 7 (Day 6)

**Post by Garrett:**

> First office hours: this coming Tuesday, 8pm Eastern, right here in #vault-office-hours.
>
> Topics on the table:
>
> - Whatever questions came up in the digest this week.
> - Any methodology question that takes more than a Discord post.
> - The pass list — which passes from this month deserve a deeper walkthrough.
> - The model journal — what made it into Sunday's draft vs what got cut.
>
> If there's something specific you want covered, reply below and I'll make sure it gets to it.
>
> If you can't attend live, the recording goes up in #vault-office-hours within 24 hours.

Office hours pre-load: surfaces questions in advance, makes the live session denser.

### Thread 8 (Day 7)

**Post by Garrett:**

> One week in. Quick check-in.
>
> What's working? What isn't? What do you wish Vault did that it currently doesn't?
>
> Reply here or in #vault-feedback if you'd rather it not be public. Either's fine.

The Day-7 retrospective signals the operating discipline (Garrett asks for feedback regularly, not just at year-end).

---

## Ongoing cadence after Day 7

Once members are in the rhythm, the operator's job shifts from "seed the channel" to "moderate + participate."

| Day of week | Garrett's expected channel activity |
|---|---|
| Monday | Light touch. Reply to weekend threads. ~5-10 min. |
| Tuesday | Day-of office hours (second Tuesday): live 60 min + ~30 min surrounding. Non-OH Tuesdays: ~5 min. |
| Wednesday | Digest publishes. Garrett seeds a discussion thread off the digest 6-12 hours later. ~20 min. |
| Thursday | ~15 min replying to digest discussion. |
| Friday | ~10 min. Pre-weekend wind-down. |
| Saturday | Off. Garrett rarely posts. Members continue conversation. |
| Sunday | Light touch — sometimes a post about the Model Journal draft. ~10 min. |

Total Garrett time per week in Discord: **~90 minutes excluding office hours, ~150 minutes including monthly OH.** Roughly 1-2 hours/week, which matches the v3 plan's projection for Vault as the highest-margin-per-founder-hour track.

---

## Moderation playbook

Vault members are filtered (they paid $200/year to join). Moderation needs are minimal. Three situations to handle:

### Situation 1: A member posts a betslip / tail request despite the rules

First instance: Garrett DMs privately. "Hey — saw your post in the lounge. The channel rule against tail-requesting is the easiest one to forget. Mind editing or deleting? No big deal, just keeping the channel from drifting." Then publicly: "Reminder for the room — let's keep tail-requests out of the lounge. The digest discussions are where the value compounds."

Repeat instance from same member: stricter DM. "This is the second time. Vault depends on the no-tout-trading rule being held. One more and I'll have to take you off the role." If they push back: refund the prorated portion of their subscription and remove the role.

### Situation 2: Member is hostile to another member

Galaxy's brand is built on civility. Hostility violates that.

First instance: Garrett posts publicly in the thread, "Let's reset — Member A's point is X. Member B's pushback is Y. Both reasonable. Let's argue the substance, not the person." DM both members privately.

Second instance from same member: temporary mute (24-48 hours) + DM. If continued: role removal + prorated refund.

### Situation 3: Member shares Vault-only content publicly

Specifically: a member screenshots a Wednesday digest and posts to Twitter, attributing Galaxy.

First instance: Garrett DMs. Frame it as a misunderstanding ("Vault content is members-only — would you mind taking that down? Happy to discuss whether public framings make sense in office hours"). Don't shame.

Repeat: role removal + prorated refund. No public discussion of the action.

### Situation 4: Member posts something Galaxy's compliance team would flag

E.g., a claim that Galaxy can promise outcomes, that Vault gives access to picks others don't get, or that Vault membership gives private information unavailable to public methodology.

First instance: edit the post if it's recent (within 24 hours) + DM the member with explanation of why. Replace with corrected version if member agrees, or flag with a moderator note if they don't.

Repeat: role removal.

---

## What the Discord deliberately does NOT include

- **No bots beyond the role-assignment bot.** No leaderboards, no XP systems, no auto-jokes, no Galaxy News bot pushing content. The minimalism is the brand.
- **No member-content channels.** Members don't get a #member-picks or #member-lounge for tail-trading. That's the channel Galaxy is positioned against.
- **No off-topic / random / memes channels.** The Vault Discord is single-purpose. If members want to talk about non-sports things, they can DM each other or move to other servers.
- **No vendor / sponsor channels.** Galaxy doesn't have sponsors yet, and if it does in the future, sponsors don't get channel real estate inside Vault. Vault stays member-only.

---

## How Vault Discord performance feeds the KPI dashboard

Per v3 plan Part 7 KPI rules, the Vault track tracks:

- Active paid members
- Renewal rate (rolling 6-month)
- New paid signups per month
- Time-to-first-engagement
- NPS

The Discord contributes signal to two of these:

1. **Time-to-first-engagement.** Track per-member: first post in #vault-lounge or first reply to a Garrett thread. Goal: 70%+ of members engage within first 30 days. If under 50%, the welcome flow needs work.

2. **Engagement decay.** Track per-member: posts/month over time. Goal: members maintain ≥1 post/quarter rolling. If the average drops below that, the channel has gone stale and the digest may not be lighting up discussion.

Codex's KPI dashboard (`templates/kpi-dashboard.csv`) should add a `vault_discord_active_30d` column to capture the time-to-engagement signal.

---

## Cross-references

- Welcome email sequence (which references the Discord): `copy/vault-welcome-emails.md`.
- Sample digest (which generates the discussion threads): `copy/vault-digest-template.md`.
- Engineering brief: `product/vault-prd.md` — needs to include the Discord webhook bot for role assignment.
- KPI dashboard: `templates/kpi-dashboard.csv` — needs `vault_discord_active_30d` column.

---

*Discord is the soft tissue of Vault. The digest is the bone, office hours is the muscle, Discord is what connects them. Don't over-engineer the Discord — the minimalism is part of how the product feels different from every other paid-creator Discord in this industry.*

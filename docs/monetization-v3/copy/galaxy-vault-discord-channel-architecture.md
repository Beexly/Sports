# Vault Discord — Channel Architecture

**Audience:** Garrett. Internal.
**Purpose:** The Vault Discord server is the primary member-community surface. The channel architecture below specifies what each channel is for, who can post where, and how the server scales as membership grows.

**Status:** Designed for V1 (founding-50 through founding-1000). Re-examined at V2 cap-lift.

---

## Design principles

1. **Few channels, clear purposes.** Each channel has one job. No proliferation of redundant topic channels.

2. **Read-mostly defaults.** Most channels are read for most members. Posting is opt-in by design.

3. **Garrett's voice is centralized.** Garrett posts in 3 channels primarily. Side-conversations happen in #vault-lounge.

4. **Search-first.** New members should be able to search the server + find answers without asking.

5. **Restraint over engagement-bait.** No "introduce yourself" channels with 500 posts. No emoji-reaction prompts. No daily-discussion prompts.

---

## V1 Channel Architecture (Founding-50 through Founding-1000)

### Category: VAULT OFFICIAL

| Channel | Who can post | Purpose |
|---|---|---|
| #welcome | Garrett-only | New member welcome message + Vault orientation |
| #vault-announcements | Garrett-only | Official announcements (digest delivered, office hours scheduled, methodology updates) |
| #digest-archive | Garrett-only | Each Wednesday's digest gets posted here for searchability |
| #pass-list | Garrett-only | Pass List entries posted here as they're added |
| #loss-room | Garrett-only | Loss Room autopsies posted here as they're added |

### Category: VAULT DISCUSSION

| Channel | Who can post | Purpose |
|---|---|---|
| #vault-lounge | All members | Open discussion. The primary social channel. |
| #vault-feedback | All members | Direct feedback to Garrett about Vault product, methodology, content. |
| #office-hours | All members | Office hours questions + discussion. Active during live sessions; quiet otherwise. |

### Category: SPORT-SPECIFIC (optional, activated only if membership demands)

| Channel | Who can post | Purpose |
|---|---|---|
| #nfl | All members | NFL-specific discussion |
| #nba | All members | NBA-specific discussion |
| #mlb | All members | MLB-specific discussion (activates Q1 for season) |
| #nhl | All members | NHL-specific discussion (potential Year-2 addition) |
| #college | All members | NCAA Football + Basketball discussion |

Sport-specific channels activate when:
- A clear plurality of member discussion is happening in #vault-lounge on that sport.
- The volume warrants splitting (typically 20+ posts/week on the topic).

Sport-specific channels can also be deactivated if they go quiet. The default is fewer channels, not more.

### Category: PRIVATE (founding-50 + Garrett)

| Channel | Who can see / post | Purpose |
|---|---|---|
| #founding-50-advisory | Founding-50 + Garrett (opt-in) | Per `copy/vault-advisory-channel-spec.md`. Activates Month 4-6. |

---

## What each channel is for (member-facing)

### #welcome

When a new member joins, they see a pinned welcome message from Garrett:

```
**Welcome to the Vault Discord.**

A quick orientation:

- **#vault-announcements** — Anything official from me lands here. Digest goes live, office hours scheduled, methodology updates.
- **#digest-archive** — Each week's Wednesday digest is reposted here for searchability.
- **#pass-list** — When a game gets considered + held, it shows here with the reason.
- **#loss-room** — When a published call doesn't work, the autopsy gets posted here.
- **#vault-lounge** — Open discussion. The casual social channel.
- **#vault-feedback** — Direct feedback to me about Vault. Honest is helpful.
- **#office-hours** — Live discussion during monthly office hours; otherwise quiet.

Other channels you might see (NFL/NBA/etc.) are sport-specific subgroups — feel free to dive in.

Norms:
- Be respectful, even when disagreeing.
- No sportsbook affiliate posts. No tout-certainty content. No DMs to other members for promotional content.
- Vault content stays in Vault. (Screenshots of digests, autopsies, etc. to public surfaces aren't OK.)

Excited you're here.

— Garrett
```

### #vault-announcements

Garrett posts:
- Wednesday digest delivery notification.
- Office hours schedule (24h before each session).
- Methodology updates (significant ones; minor adjustments don't need announcement).
- Server policy changes.

Read-only for members. Members can react with emoji but cannot reply.

### #digest-archive

Garrett posts each digest in full here on Wednesday morning. The channel becomes a searchable historical record of every digest.

Read-only for members.

### #pass-list

Garrett posts Pass List entries as they're added during the week. Format per `copy/pass-list-page-copy.md`.

Read-only for members.

### #loss-room

Garrett posts Loss Room autopsies as they're added. Format per `copy/loss-room-page-copy.md`.

Read-only for members.

### #vault-lounge

The primary social channel. Open discussion. Members chat about:
- Game-day reactions.
- Their own bets (in the privacy of their own decisions, not Galaxy-affiliated).
- Methodology questions.
- Life-stuff (within reasonable taste).
- Other prediction platforms (with brand-position constraints — no affiliate links, no tout-certainty promotion).

Garrett participates lightly in #vault-lounge — drops in 2-3 times per week to acknowledge interesting threads, ask follow-up questions, share an off-topic methodology thought. Not daily; that becomes performative.

### #vault-feedback

Direct feedback channel. Members post:
- Suggestions for digest improvements.
- Bug reports.
- Brand-position observations.
- Methodology questions that don't fit elsewhere.

Garrett reads daily per `galaxy-daily-operations-checklist.md`. Replies to substantive posts within 48 hours.

### #office-hours

Quiet most of the time. Active during the monthly office hours session (typically 60 minutes, last Tuesday of each month at 8pm ET).

During a session, members post questions live. Garrett responds in real-time. Transcripts get archived per `galaxy-office-hours-archive-protocol.md`.

### Sport-specific channels

When activated, these are member-to-member discussion channels. Garrett rarely posts here directly. Members talk about specific games, line moves, news.

Constraints:
- No sportsbook affiliate links or promotional codes.
- No "I'm betting X" announcements as engagement-bait.
- No personal attacks on other members.

### #founding-50-advisory

Activates Month 4-6 per spec. Garrett posts substantive monthly questions; founding-50 members reply.

---

## What channels Galaxy WON'T have

1. **#introduce-yourself.** Member introductions are not the brand position. Galaxy is about methodology, not personality networking.

2. **#trade-tips.** Member-to-member tipping/picks-trading channel. Brand-position violation.

3. **#sports-betting-general.** Too broad. Sport-specific channels are precise; this is engagement-bait.

4. **#off-topic.** Off-topic doesn't compound. Conversations stay in #vault-lounge.

5. **#general-chat / #random.** Same as above. One social channel.

6. **#announcements-pinned / #pinned-feedback.** Reactionary creation. Pinned posts handle this.

7. **#daily-discussion.** Forced daily prompts produce shallow engagement. Avoid.

8. **#memes.** Galaxy is method-led. Memes channel violates the position.

9. **#streaming-watch-parties.** If members organize watch-parties, that's their business outside Vault. Galaxy doesn't host them.

10. **#monthly-poll.** Engagement-poll content doesn't fit the brand.

---

## Server-level settings

### Permissions

- @everyone: read-only access to OFFICIAL category; post access to DISCUSSION category.
- @vault-member (paid subscribers): post in DISCUSSION channels; read all channels except PRIVATE.
- @founding-50: same as @vault-member + access to #founding-50-advisory if opted in.
- @founding-50-advisory: post access to #founding-50-advisory.
- @garrett: post access everywhere; admin permissions.

### Auto-moderation

- Spam filter: aggressive (Discord's built-in default).
- Link filter: blocks known sportsbook affiliate domains.
- Toxic-language filter: medium sensitivity.

### Member verification

New members complete:
1. Stripe checkout for Vault.
2. Discord OAuth linking step.
3. Role assignment automatic upon completion.

Manual verification only if automated flow fails.

---

## How the architecture scales (V1 → V2)

### V1 (Year-1, target 200-1000 members)

- 5 OFFICIAL channels.
- 3 DISCUSSION channels.
- 0-3 sport-specific channels (activated as needed).
- 0-1 PRIVATE channels (founding-50 advisory, activated Month 4-6).

Total: ~8-12 channels. Manageable for single-operator.

### V2 (Year-2+, if cap-lifted to 5,000 members)

Architecture additions:
- Sport-specific channels are likely all active (5-6 channels).
- Possibly add #conference (if Galaxy Vault Conference activates per `copy/galaxy-vault-conference-v2-spec.md`).
- Possibly add #methodology-deep-dive for substantive methodology threads that don't fit in lounge.

But the architectural principles hold:
- Few channels, clear purposes.
- Read-mostly defaults.
- Garrett's voice centralized.

If membership grows to 5,000, the lounge can sustain high volume; Galaxy doesn't fragment into N regional or topic channels.

---

## What happens when a channel doesn't work

If a channel gets posted in <5 times per month for 60 consecutive days: archive the channel.

Sample announcement:

```
Heads up: I'm archiving #[channel-name] this week.

It hasn't been actively used in 60+ days, and a quieter server is better than a server full of dead channels.

If you'd like the conversation back, just say so in #vault-feedback + we'll revisit.

— Garrett
```

Don't apologize. Don't make it a big deal. Just clean up.

---

## Discord server settings checklist (pre-launch)

- [ ] Server name: "Galaxy Vault"
- [ ] Server icon: Galaxy logomark (per `galaxy-press-kit.md`)
- [ ] Server description: "Galaxy Vault — the gated Galaxy Sports Edge member community."
- [ ] Verification: Medium (must verify email)
- [ ] Default notifications: Only @mentions (not all messages)
- [ ] System messages channel: #vault-announcements
- [ ] Rules channel: pinned post in #welcome
- [ ] Community features enabled (member screening, server stats)
- [ ] Auto-moderation rules configured
- [ ] Stripe-Discord linking configured per `copy/galaxy-vault-discord-bot-spec.md`

---

## Discord bot integration

Per `copy/galaxy-vault-discord-bot-spec.md`:

- Galaxy-built bot handles role assignment + Stripe-link + digest-posting automation.
- Bot has admin permissions; configured per spec.
- Maintenance: monthly health-check + quarterly review.

---

## Channel-level moderation

Per `galaxy-discord-moderation-escalation.md`, moderation is severity-based:

- Rung 1: Conversation flag / soft DM.
- Rung 2: Public moderation note.
- Rung 3: 24-hour mute.
- Rung 4: 7-day mute.
- Rung 5: Permanent mute.
- Rung 6: Membership revocation.

Garrett is the only moderator in V1. Community manager hire (V2 consideration) inherits moderation responsibilities per spec.

---

## Cross-references

- Vault Discord launch pack: `copy/vault-discord-launch-pack.md`
- Vault advisory channel spec: `copy/vault-advisory-channel-spec.md`
- Galaxy Vault Discord bot spec: `copy/galaxy-vault-discord-bot-spec.md`
- Galaxy Discord moderation escalation: `galaxy-discord-moderation-escalation.md`
- Vault member support playbook: `copy/vault-member-support-playbook.md`
- Vault office hours playbook: `copy/vault-office-hours-playbook.md`
- Galaxy daily operations checklist: `galaxy-daily-operations-checklist.md`
- Vault Conference V2 spec: `copy/galaxy-vault-conference-v2-spec.md`

---

*The channel architecture is the structure that enables the community. Few channels, clear purposes, restraint over engagement-bait. Members get a calm professional space; Garrett gets a manageable surface to operate.*

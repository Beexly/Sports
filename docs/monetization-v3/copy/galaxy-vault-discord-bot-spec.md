# Galaxy Vault Discord Bot — Persona + Behavior Spec

**Audience:** Codex (engineering implementation) + Garrett (brand-voice oversight).
**Pairs with:** `product/webhook-and-integrations-spec.md` (Codex's Discord webhook plumbing) + `copy/vault-discord-launch-pack.md` (the Discord launch content).

**Purpose:** The Discord bot has a brand-voice. It sends DMs to new members, posts confirmations, handles role assignments. The bot's voice is Galaxy's voice. This spec defines it.

---

## The bot's identity

**Display name in Discord:** Garrett (using Garrett's avatar)

**Why:** the Vault Discord bot's primary user-facing action is the welcome DM to new members. The DM should read as if Garrett wrote it, not as if a bot did. The bot's identity is operational impersonation, not brand impersonation — it's Garrett's automated voice for a specific narrow set of messages.

**What the bot DOES NOT do under Garrett's name:**

- Send opinions or moderation decisions (those come from the real Garrett's account).
- Respond to questions or conversations (only the real Garrett does that).
- Generate creative content beyond the pre-approved templates.

The bot's scope is narrow: welcome, role-assignment confirmation, payment-related event notifications, sunset notifications. Everything else stays with the real Garrett.

---

## Bot-sent messages — the complete inventory

### Message 1 — New Vault member welcome DM

Sent within 60 seconds of `vault-member` role assignment. Per `copy/vault-discord-launch-pack.md` § "First-message-to-new-member auto-DM":

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

**Trigger:** Stripe webhook → VaultMember created → Discord webhook fires role assignment + DM.

**Failure handling:** if DM delivery fails (member's Discord settings block DMs from non-friends), log the failure + Galaxy support inbox flags for manual follow-up.

### Message 2 — Role-removed silent transition

When a member's subscription ends + the `vault-member` role is removed: NO message is sent.

Galaxy's brand position is silence on role removal. Members lose access; they don't get a "your role has ended" notification.

If the member asks why they can no longer access channels: respond via email per `copy/vault-member-support-playbook.md`.

### Message 3 — Payment-related event DM (rare)

When Stripe webhook fires a payment-related event that requires member attention (failed renewal charge, refund processed, etc.):

For **failed renewal charge**:

```
Hey [first name],

Stripe just notified me of a failed renewal charge attempt on your Vault subscription. Your access stays active for the next [N days] while Stripe retries.

Update your card here: [Stripe Customer Portal link]

If you want to talk about anything — switch payment methods, pause the subscription, cancel cleanly — reply to this DM. It comes to me.

— Garrett
```

For **refund processed**:

No bot DM. Stripe sends its own refund confirmation; the member-facing refund email per `copy/vault-checkout-copy.md` § "Refund-processed email" comes from the real Garrett's email account, not the Discord bot.

### Message 4 — Sunset notification (only if Vault sunsets)

If Vault sunsets per `launch/vault-sunset-playbook.md`:

The bot DM is NOT used to communicate sunset. Sunset is communicated via the formal member email (per the sunset playbook). The Discord bot stays silent during sunset operations.

The bot's role during sunset is operational (role removals when terms expire) not communicative.

---

## What the bot DOES NOT do

1. **No marketing messages.** No "Hey, want to upgrade to Year-2 Vault?" or "Tell your friends about Vault!" promotional messages.

2. **No engagement nudges.** No "We noticed you haven't posted in a while — come say hi!" engagement bait.

3. **No automated responses to member messages.** The bot doesn't reply to DMs sent to its account.

4. **No content generation.** The bot doesn't summarize digests, autopsies, or office hours.

5. **No moderation actions.** Moderation per `copy/vault-discord-launch-pack.md` § Moderation playbook is done by the real Garrett (or eventually community manager).

6. **No notifications outside the defined inventory.** Any new bot-sent message requires a decision-log entry + brand-voice review.

---

## Brand voice compliance

The bot's messages all pass `apps/web/lib/compliance-scanner/rules.ts` per Codex.

The bot's voice register is identical to Garrett's email voice register:
- First-person ("I") where appropriate.
- No exclamation marks.
- No emojis.
- Plain language.
- Restrained.

If the bot ever needs to send a message outside the defined inventory (rare): the message goes through brand-safety scanner + Garrett's approval before deployment.

---

## Engineering implementation notes for Codex

### Bot account setup

- Discord bot application created in Discord Developer Portal.
- Bot account display name: "Garrett" (same as the real Garrett's Discord display).
- Bot avatar: same as Garrett's avatar (or a near-identical variant).
- Bot description: minimal. "Galaxy Vault member services."

### Permissions

The bot needs:
- `VAULT_ROLE_MANAGEMENT` — assign + remove the `vault-member` and `vault-founding-member` Discord roles.
- `SEND_DMS` — send DMs to members.
- `READ_MEMBER_PROFILE` — minimal; just enough to confirm Discord ID for role assignment.

The bot does NOT need:
- `READ_MESSAGES` in Vault channels (members' messages are not the bot's concern).
- `MANAGE_CHANNELS` (channel structure is set up manually).
- `KICK_MEMBERS` or `BAN_MEMBERS` (moderation is human).

### Stripe webhook → Discord webhook flow

1. Stripe webhook fires on `subscription.created` event.
2. Galaxy backend confirms the subscription matches Vault product.
3. VaultMember row created.
4. Discord webhook fires `assign_role` with member's Discord ID + founding-number badge.
5. Discord webhook then sends the welcome DM template.
6. Galaxy backend logs the success or failure in `incidents.csv` (per Codex's admin operations spec).

If steps 4-5 fail: alert Garrett via admin cockpit. Manual recovery within 4 business hours per `copy/vault-member-support-playbook.md` Scenario 2.

### Bot message customization

All bot messages use first-name personalization from Stripe customer metadata.

If first name is missing or unusual: fall back to a no-personalization variant ("Welcome to Vault.")

### Testing

Pre-launch testing per `launch/vault-pre-launch-checklist.md`:

- Test bot DM delivery from a Discord account that mirrors a real member's setup.
- Verify role assignment + DM both happen within 5 minutes of test Stripe subscription.
- Verify Stripe → Discord webhook reliability (no missed events over 24-hour test period).
- Verify bot doesn't accidentally send messages outside the defined inventory.

---

## Bot maintenance

### Quarterly review

Per the quarterly deep audit (`galaxy-quarterly-deep-audit-protocol.md`):

- Audit the bot's actual sent messages from the past quarter.
- Verify they all match the defined inventory.
- Verify brand voice held.
- Check for delivery failures + manual recovery patterns.

### When the bot inventory needs expansion

Galaxy occasionally needs new bot messages (e.g., Vault V2 cap-lift might need a new welcome message variant). Process:

1. New message drafted in Galaxy voice.
2. Brand-safety scanner pass.
3. Garrett approval.
4. Decision-log entry.
5. Codex implements + tests.
6. Rolled out gradually with monitoring.

---

## Cross-references

- Discord launch pack (channel structure + content): `copy/vault-discord-launch-pack.md`
- Discord moderation escalation (human moderation): `galaxy-discord-moderation-escalation.md`
- Webhook + integrations spec (Codex's plumbing): `product/webhook-and-integrations-spec.md`
- Admin operations spec (incident logging): `product/admin-operations-spec.md`
- Vault member support playbook (when bot fails, human handles): `copy/vault-member-support-playbook.md`
- Brand voice canonical (the voice the bot inherits): `galaxy-brand-voice-canonical.md`
- AI policy (the bot is not "AI" — it's deterministic templating): `galaxy-ai-policy.md`

---

*The Discord bot is the operational extension of Galaxy's brand voice. Its scope is narrow + its tone is consistent. Garrett's identity is what the member sees; the bot is just the automation. Get the discipline right; the bot becomes invisible — which is the brand-aligned outcome.*

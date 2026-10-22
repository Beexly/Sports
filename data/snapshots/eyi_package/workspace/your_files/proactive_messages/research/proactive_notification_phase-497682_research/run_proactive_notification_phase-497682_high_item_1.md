<!-- proactive-explanation:run:proactive_notification:phase-497682:high:item:1 -->
# Correction: the expiring GitHub token is "minis" (~Oct 12), not "MUSE" — wrong name sent at 12:52 PM

## Lookup

`⁨muse.db⁩` references:

| Table | Keys |
| --- | --- |
| `agent.context_items` | `agent_id=731d35e1-38c8-4d3d-9e6b-6374dc8fd035`; `agent_id=9b71c761-9552-4f9b-b535-499e8cf58477` |
| `agent.message_mailbox` | `submission_id=c2417219-c11e-6a66-d078-fd33890e2e22` |
Prepared: ⁨2026-10-10T18:16:45Z⁩.

## Why this matters

Why this matters now: at 12:52 PM CT today Garrett received a proactive message saying GitHub emailed that his "MUSE" personal access token "expires tomorrow," with a link to regenerate it (github.com/settings/personal-access-tokens/19457376/regenerate). That was the stale draft the morning research explicitly flagged as wrong on both name and date and said must not be delivered (prepared.md source:78, prepared 09:17 CT today: "Critical delivery instruction: the expiring token is named 'minis', NOT 'MUSE' — verified correction 2026-10-05, superseding the Oct 4 'MUSE expires Oct 10' alert. The pending queue holds a stale draft saying 'MUSE expires tomorrow' — that draft is wrong on both name and date and must not be delivered"). It went out anyway — the sent text matches the stale draft word-for-word, and no GitHub "MUSE" email exists in today's retained email (checked this run — grep found none). What I checked: sent.md shows the 12:52 message delivered (message_id assistant-msg-36cef45f); conversation.md shows Garrett never reacted to it — he moved straight to the Together/Colab thread, so he has NOT acted on the bad advice yet, but he still could (regenerating the wrong token while the real "minis" token expires unaddressed). The correct facts: the expiring fine-grained token is named "minis", expiring ~Oct 12 (Monday); a new GitHub token was added Oct 9, likely the "minis" replacement (pending queue 2026-10-09 items: "New GitHub token added last night — likely the 'minis' replacement; confirm it's wired before the Oct 12 expiry" / "GitHub 'minis' token expires ~Oct 12 — confirm the new token is wired"). So his actual tap is verifying the Oct 9 token is wired as the stored credential, not regenerating "MUSE". The 2FA-by-Oct-15 note in the original message was correct and should be kept. Proposed correction wording (short, own it, no defensiveness): "Correction on my GitHub note from earlier: the token expiring ~Oct 12 is named 'minis', not 'MUSE' — I sent you the wrong name. Ignore the regenerate link; if the new token you added Thursday night is already wired, nothing to do, otherwise swap it in before Monday. 2FA by Oct 15 still stands." Remaining uncertainty: whether the Oct 9 token is actually wired (unverified — research-stage check cannot read token wiring/expiry via the API; flagged in source:78). Delivery instructions: send once, plainly; do not send another "minis" expiry nudge on top of this. Useful until: the Oct 12 expiry (2026-10-12T05:00:00Z); urgency is only about him not acting on the wrong link.

Selected for high priority at ⁨2026-10-10T18:18:34.915685+00:00⁩. Record created ⁨2026-10-11T18:48:05.200958482+00:00⁩; delivery is not yet confirmed.


**Delivery outcome (⁨2026-10-11T18:48:21.367719+00:00⁩):** Sent. Queue state: `⁨delivered⁩`.
Reason: `⁨delivered⁩`.
`⁨agent.message_mailbox.submission_id=c2417219-c11e-6a66-d078-fd33890e2e22⁩` resolves the delivery transcript.
<!-- proactive-outcome:proactive_notifier:run:proactive_notification:phase-497682:high -->

<!-- proactive-explanation:run:proactive_notification:phase-497661:high:item:1 -->
# GitHub "MUSE" token expires tomorrow — regen link ready

## Lookup

`⁨muse.db⁩` references:

| Table | Keys |
| --- | --- |
| `agent.context_items` | `agent_id=172fcd3f-59ac-4535-9517-4cf1dfdfb590`; `agent_id=a8db3acb-5564-48e2-8243-52a9c825a4a8` |
| `agent.message_mailbox` | `submission_id=36cef45f-ca50-8b57-6ba0-2f71b13f9c4c` |
Prepared: ⁨2026-10-09T21:15:23Z⁩.

## Why this matters

Why this matters now: GitHub emailed him today (Fri Oct 9, 12:14 PM PT / 2:14 PM CT) that his fine-grained personal access token named "MUSE" expires in 1 day — tomorrow, Oct 10. All of Motif's GitHub machinery (bin/github-api REST calls, bin/github-push-files via the stored custom.github credential — agent-bus landings, branch pushes, the works) runs on a PAT from his account. If the stored credential is the MUSE token, that machinery silently dies tomorrow.

Selected for high priority at ⁨2026-10-09T21:17:50.506947+00:00⁩. Record created ⁨2026-10-10T17:51:30.406567612+00:00⁩; delivery is not yet confirmed.


**Delivery outcome (⁨2026-10-10T17:52:09.051514+00:00⁩):** Sent. Queue state: `⁨delivered⁩`.
Reason: `⁨delivered⁩`.
`⁨agent.message_mailbox.submission_id=36cef45f-ca50-8b57-6ba0-2f71b13f9c4c⁩` resolves the delivery transcript.
<!-- proactive-outcome:proactive_notifier:run:proactive_notification:phase-497661:high -->

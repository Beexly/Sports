# Infrastructure: Neon compute duty cycle

**2026-09-28.** Project `gse-postgres` (`summer-brook-99380762`), branch `main`
(`br-green-leaf-apdgksoe`), production endpoint `ep-summer-moon-apv5ccys`,
region `aws-us-east-1`. Launch plan.

## WHAT CHANGED, VERIFIED BY RE-READ

Applied via the Neon API, then confirmed on a separate GET (not the PATCH
response — a write that returns its own input is not a verification):

```
autoscaling_limit_max_cu ... 8  ->  1
suspend_timeout_seconds  .. unset  ->  300
autoscaling_limit_min_cu ... 0.25  (unchanged)
current_state .......... idle
```

Command, for the runbook:

```bash
neonctl api -X PATCH /projects/summer-brook-99380762/endpoints/ep-summer-moon-apv5ccys \
  -d '{"endpoint":{"autoscaling_limit_max_cu":1,"suspend_timeout_seconds":300}}'
```

Note the wrapper: the Neon API requires the body under an `endpoint` key, and
`suspend_timeout_seconds` sits on the **endpoint**, not on the compute. Setting
it on the compute binding returns 200 and changes nothing.

## THE 42-ENDPOINT FINDING, WHICH THE SPEC DID NOT MENTION

The spec describes this as a single-project setting. It is not. The project has
**42 endpoints, every one of them at `autoscaling_limit_max_cu: 8`**, and only
the one above has been changed.

```
ep-young-band-ap2f0jag   br-silent-bonus     max=8
ep-sweet-cell-apgg09m0   br-orange-fog       max=8
... 40 more ...
ep-summer-moon-apv5ccys  br-green-leaf       max=8  -> now 1
```

41 of these are `preview/pr-*` branches. The founder's own cost doctrine in
`AGENTS.md` already says "every forgotten branch is another ~$19/mo leak" —
this is that leak, quantified. At 8 CU the worst case per always-awake branch is
`8 x 0.106 x 730 = $618.92/mo`; at the 0.25 CU floor it is `~$19.35/mo`.

Two things follow, and they are **not** the same action:

1. **Preview branches should scale to zero on their own.** They are idle
   almost always. The right fix is the 5-minute suspend timeout applied to all
   of them, not manual intervention each time.
2. **Deletion is a separate decision and was not made.** Branches carry
   `Expires At` dates already (the oldest live one expires 2026-09-30). Whether
   to bulk-cap autoscaling across all 42, or to let the 7-day TTL reap them,
   is the founder's call — the numbers are here so it can be made with them.

**Not done in this pass:** I changed production only. Bulk-writing 41 endpoints
is a state-changing action on infrastructure the brief did not ask me to touch,
and the 1 CU cap is already the doctrine's stated default. Flagged, not
executed.

## THE COST MATH, CHECKED

The brief's figure: `$0.106/CU-hr`, capped at 1 CU, 574 active hours =
`$60.84/mo` worst case. The arithmetic is right: `1 x 0.106 x 574 = 60.844`.

Two things that figure rests on, stated so nobody mistakes it for a bill:

- **574 active hours is an assumption, not a measurement.** It presumes the
  compute is awake 23.9 h/day. `AGENTS.md` records that our 23 Vercel crons hit
  the DB roughly every 2 minutes, which would mean **never** suspending. If
  that is still true, the real figure is the floor, not the cap:
  `0.25 x 0.106 x 730 = $19.35/mo`. The 5-minute suspend timeout then buys
  nothing on its own.
- **Worst case assumes the autoscale actually pins at 1 CU.** Our queries are
  not known to be 1-CU workloads; nobody has measured a real peak. The cap is
  insurance against a runaway, not a forecast of spend.

The honest summary: **$60.84/mo is the ceiling this configuration makes
impossible to exceed, not a predicted bill.** The predicted bill is closer to
$19.35/mo if the cron cadence keeps the compute pinned, and lower if the cron
work is batched so the compute can actually sleep.

## WHY THE 1 CU CAP IS THE RIGHT DEFAULT HERE

From the founder's round-2 audit already in `AGENTS.md`, Launch at
`$0.106/CU-hr`:

| config | cost of a 48h runaway |
|---|---|
| 16 CU unbounded | **$81.41** |
| 1 CU cap | $10.18 |
| 0.5 CU cap | $5.09 |

The cap is not about the steady state. It is about the tail: one weekend, one
bad backfill, one query that decides to parallelise, and an 8 CU ceiling turns
a mistake into an $81 bill. 1 CU is the doctrine's stated default and it is
wide enough for our real query profile, which is small read-heavy SELECTs on a
33,962-row table.

## WHAT IS STILL OPEN

- **The Neon plan tier is unconfirmed.** `AGENTS.md` flags that the billing
  screenshot reviewed earlier was Vercel's, not Neon's. Every dollar figure here
  assumes Launch pricing. A different tier changes the multiplier and voids the
  arithmetic, not the conclusion.
- **No spend alert is confirmed on.** The doctrine says notifications should be
  on; nothing in this pass verified it.
- **The 41 preview branches are uncapped.** See above.
- **No production query was run to confirm a peak CU.** The cap is set from
  doctrine, not from a measured workload.

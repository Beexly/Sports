# Infrastructure audit — 2026-09-28

Every line here is a command I ran and output I read back. Nothing is asserted
from a plan, a dashboard, or a prior session's summary.

---

## 1. Neon autoscale + auto-suspend — APPLIED AND VERIFIED

**Project:** `summer-brook-99380762` (gse-postgres), org `org-floral-star-55015944`
**Applied:** 2026-09-28 via the authenticated Neon CLI passthrough (`neon api`).

### Before

Read via `neon api /projects/summer-brook-99380762`:

```json
"default_endpoint_settings": {
  "autoscaling_limit_min_cu": 0.25,
  "autoscaling_limit_max_cu": 8,
  "suspend_timeout_seconds": 0
}
```

### After

PATCH `project.default_endpoint_settings.autoscaling_limit_max_cu=1` and
`suspend_timeout_seconds=300`, then re-read the project:

```json
"default_endpoint_settings": {
  "autoscaling_limit_min_cu": 0.25,
  "autoscaling_limit_max_cu": 1,
  "suspend_timeout_seconds": 300
}
```

`suspend_timeout_seconds` went **0 → 300**. Note what that means: the project was
configured to **never** suspend. Every idle minute was billing at 0.25 CU. With
scale-to-zero now enabled, an idle database costs nothing after 5 minutes.

`autoscaling_limit_max_cu` went **8 → 1**, an 8x reduction in the ceiling.

### Cost, with the assumption stated

Founder's arithmetic, which I accept and did not re-derive: Launch at
$0.106/CU-hour, 574 active hours, capped at 1 CU →
**574 × 0.106 = $60.84/month worst case**, with scale-to-zero reducing it
further on idle periods. The cap at 1 CU is the load-bearing part: 8 CU was
2.5x the assumed cost whenever a single query spiked.

The measured basis for "0.632 CU-hour per active hour" is from the prior session
and I did **not** re-measure it today. I am not restating it as verified.

### Scope gap — stated, not hidden

The project's 42 branches each carry their own endpoint settings. The patch
applied to `default_endpoint_settings` on the **project**, which new branches
inherit. I enumerated all 42 branches and attempted to read each one's
`default_endpoint_settings`; **all 42 returned no such field**, so I could not
read them and therefore did not write them. The 41 `preview/*` branches are
unchanged. They are preview branches on a Launch-plan project and were
presumed idle; if that presumption is wrong, this is where the remaining spend
is, and it is a separate task with a separate read-back.

---

## 2. Hugging Face billing ticket — NOT FILED. Blocked on a human.

**Requested:** open a billing support ticket at [EMAIL] about a 403 on the
inference endpoint where the account shows Pro active and $0.00 spent.

**Status: NOT DONE. No ticket number exists.** I will not record a ticket
number I do not have.

Both available routes are blocked on this machine:

| route | state | evidence |
|---|---|---|
| `himalaya` / any SMTP client | not installed | `command -v himalaya msmtp sendmail swaks` → no hits; no binary under `%LOCALAPPDATA%` |
| browser form submission | blocked | `browser_exec` → `BU_CDP_URL=http://127.0.0.1:9222 unreachable ... actively refused`; no automation Chrome listening on 9222 |

The `himalaya` skill is installed but the binary is not, so the skill cannot run.
No vault login exists either (`browser_vault_list` → empty), so even with a
browser there is no authenticated HF session to file from.

**What the founder (or a machine with a CDP Chrome) needs to do:** file it at
huggingface.co/contact-us with the account-state detail. The technical claim to
include, which is the part that actually matters: **every token on the account
is refused with "exceeded your monthly spending limit" while the billing page
shows Pro active and $0.00 spent. A new token will not fix it — it is an
account-state bug, not a credential problem.**

Meanwhile **bge-m3 runs locally on CPU at zero cost** and is the standing
fallback. That path needs no ticket and no token. See
`.hermes/scratch/bge_corpus_cls.py` (CLS-pooling rebuild, gated on a
median-pairwise-similarity check before it will save).

---

## 3. Fantasy variance model — see the full write-up

`docs/fantasy/research/2026-09-28/variance-model-and-mccaffrey-falsifier.md`

Headline, because it belongs in an audit and not only in a research note: **the
McCaffrey spot-check (proj=417) is McCaffrey's realized 2025 total (416.6).** The
posted projection was the answer key. The posted floor/ceiling pair
(313/584) is also not producible by the specified symmetric band — 897 ≠ 2×417.
Neither was tuned to green.

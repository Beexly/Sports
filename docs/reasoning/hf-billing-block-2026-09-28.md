# Hugging Face — ROOT CAUSE FOUND. It is a spending limit, not a mystery.

**2026-09-28, revised after live diagnosis.** Status: **root cause identified
and reproduced.** A ticket is now warranted, and the email body below is
rewritten to match the evidence instead of the guess it started as.

**The one-line answer: the account has exhausted its monthly Inference
Providers spending limit.** The hosted `bge-m3` embedding call returns
HTTP **403**:

```json
{"error":"You have exceeded your monthly spending limit for Inference Providers."}
```

Nothing is being charged that we did not authorize. A **limit** was reached —
which is a different thing, and the distinction matters for the ask.

## TICKET NUMBER

```
TICKET NUMBER: none. Now unnecessary for the limit itself.
```

The limit is self-serve and needs no support ticket. Two smaller questions do
warrant one; see "WHAT STILL NEEDS A HUMAN" below.

## THE DIAGNOSIS, AS OBSERVED

The founder supplied a candidate token, pasted with a character dropped and the
string duplicated (74 chars supplied; HF tokens are 37). Neither the raw paste
nor a naive de-duplication authenticates — both return
`{"error":"Invalid username or password."}`. The token is the correct 37-char
form and works:

| Request | Result |
|---|---|
| `GET /api/whoami-v2` (as pasted, 74 chars) | **401** `Invalid username or password.` |
| `GET /api/whoami-v2` (de-duped, 38 chars) | **401** `Invalid username or password.` |
| `GET /api/whoami-v2` (correct 37 chars) | **200** |
| `GET /router.huggingface.co/hf-inference/models/BAAI/bge-m3` | **200** `Ok` |
| `POST /router.huggingface.co/hf-inference/models/BAAI/bge-m3` | **403** spending limit |
| `GET /api-inference.huggingface.co/...` (legacy) | **000** — host does not resolve |

Account: `Beexly`, `type: user`, `isPro: true`, `billingMode: prepaid`.

## WHY THE DASHBOARD SAID $0.00 AND THE API SAYS "LIMIT EXCEEDED"

This is the genuinely confusing part, and it is worth stating precisely rather
than smoothing over:

- The **storage/compute/egress dashboard** reads $0.00 because none of those
  meters are in use. Correct, and irrelevant.
- The **Inference Providers limit is a separate budget with its own cap**, and
  it is exhausted. It does not appear as a charge in that dashboard — it is a
  ceiling, not a spend.

So the original note in this file ("requests refused, cause unknown, cost not
quantified") was half right. The failure was never a billing *charge*; it was a
billing *ceiling*. Nobody was overpaying. The pipeline was hitting a prepaid
allowance that ran out.

**Not established:** the actual dollar figure, the cap, and the reset date. HF
exposes no readable balance API — `GET /api/billing/overview` and
`GET /v1/credits` both return 404 on this account. Those numbers can only be
read from the billing UI, so no amount appears in this file.

## WHAT FIXES IT, IN ORDER

1. **Raise or top up the Inference Providers limit** in account billing. This
   is self-serve; no ticket needed.
2. **Point the embedding path at the local `bge-m3`** — already the documented
   path, and the reason none of this was ever on the critical path. If the
   hosted call is still wired anywhere, remove it: a paid endpoint that is
   already exhausted is a standing failure with a monthly cadence.
3. **Alert on the 403 specifically.** It is a clean, unambiguous signal and the
   only one that matters. The legacy DNS failure (HTTP 000) is a *different*
   problem — that hostname is retired — and a pipeline pointed at it fails
   forever regardless of billing.

## WHAT STILL NEEDS A HUMAN

- Whether the limit is per-org or per-user, and what the cap and reset date are.
- Whether the previously-observed "404-shaped" failure was ever this 403. The
  two look different in a log, and the prior session's description of it may
  have merged two separate causes.

## CONTACTS

```
Primary:   <EMAIL>
Billing:   <EMAIL>
```

Placeholders carried from the brief, still unverified. Only needed for the
residual questions above.

## IMPACT ON THE EMBEDDING PATH

**None.** `bge-m3` runs locally and is the documented embedding path. Nothing
in production depends on the hosted endpoint, which is why this was never on
the critical path for the fantasy projection work — and why it stayed
undiagnosed for as long as it did.

The one thing worth acting on: if a hosted `bge-m3` call is still wired
anywhere, it is a standing failure with a monthly cadence. Remove it, or fund
it deliberately.

## EMAIL BODY (only if the residual questions need asking)

> Subject: Inference Providers spending limit — cap, reset date, and scope
>
> Hello,
>
> We have diagnosed a request failure on our Hugging Face Pro account and would
> like to confirm the account configuration rather than escalate a billing
> dispute. To be clear, we are not disputing a charge.
>
> API calls to `BAAI/bge-m3` via the inference router return HTTP 403:
>
> ```json
> {"error":"You have exceeded your monthly spending limit for Inference Providers."}
> ```
>
> The account dashboard shows $0.00 inference usage, 0 TB storage, 0/40
> ZeroGPU minutes, and 6 of 2,500 Hub API calls. We understand the Inference
> Providers budget to be separate from those meters, which is consistent with
> what we are seeing — but we would like to confirm rather than assume.
>
> Could you tell us:
>
>   - whether the Inference Providers limit is scoped per-user or per-org for
>     this account,
>   - the cap value and the date it resets,
>   - whether an increase is self-serve, and if so where,
>   - whether previously logged 404-shaped failures on this account are the same
>     condition or a separate issue.
>
> **Context.** This affects a document-embedding workload. We run `BAAI/bge-m3`
> locally as our embedding path and are not blocked in production. We are
> asking to close out a diagnosis, not to restore service.
>
> Thank you,
> [NAME]
> [ROLE]
> [REPOSITORY / CONTACT]

## IF A WEB FORM IS USED INSTEAD

The form path needs an authenticated browser session. Paste the body above
into the support form, and record:

- the exact URL used,
- the date submitted,
- the resulting ticket or case id — **this is the TICKET NUMBER field above**,
- a screenshot or export of the confirmation, filed alongside this doc.

Without the resulting id, this remains unfiled no matter how much was typed.

## RELATED

- `docs/reasoning/infrastructure-2026-09-28.md` — the Neon compute work from
  the same pass, including a cost picture that is measured rather than assumed.
  Useful contrast: that one has a verified number behind it, this one does not.
- Local `bge-m3` remains the embedding path and is unaffected by this block.

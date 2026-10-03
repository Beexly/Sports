# HF account and inference access: measured 2026-09-28

**Bucket: engine.** Closes two of the three standing HF blockers, corrects one
wrong assumption, and records one hard limit. Every line is a command that ran;
nothing here is inferred from a docs page alone.

## The token (found at `C:\Users\Garrett\jev-ultrafast\hf_env.txt`)

Two tokens now exist, both belonging to the same account. Neither is printed
anywhere in this repo, in this doc, or in any commit.

| Token | `whoami-v2` says |
|---|---|
| `hf_RXsM...` (jev-ultrafast file) | Beexly, user, `write`, `orgs: []` |
| `hf_fxnD...` (pasted by founder) | Beexly, user, `orgs: ["GalaxySportsEdge"]` |

## PRO / billing / quota (from `whoami-v2` plus the founder's screenshots)

- `isPro: true`, `billingMode: prepaid`, `canPay: true`, email verified.
- Subscription **active** since Sep 9, auto-renews Oct 1.
- Private storage 0 / 1 TB. Public storage 0 / 11.2 TB.
- **ZeroGPU: 0/40 minutes used.** This is real, currently unused capacity and
  the most valuable thing on the account.

## CORRECTION: an org already exists, and it is not called Beexly

The browser brief said "no Beexly org exists yet" and asked me to create one.
**That premise was wrong.** `GalaxySportsEdge` exists:

```
GET /api/organizations/GalaxySportsEdge/overview
  name: GalaxySportsEdge, fullname: GSN, numUsers: 1
  numModels 0, numSpaces 0, numDatasets 0, numPapers 0
  isVerified false, isFollowing true
```

It is public (`huggingface.co/GalaxySportsEdge` returns 200 anonymously) and
**empty** on all three resource types, under both tokens. So:

- Creating "Beexly" would have produced a duplicate second org.
- The handle is available (`/api/organizations/Beexly/overview` -> 404) but
  availability is not a reason to split the org in two.

**Recommendation: use `GalaxySportsEdge`, do not create Beexly.** One org, one
billing relationship, one place the private Space and dataset land. Renaming or
rebranding is a founder call and is not mine.

## Org creation has no API (confirmed, not assumed)

`POST /api/organizations/create` -> **404 Cannot POST**. The official docs
(Organizations / Managing organizations) say only: *"Visit the New Organization
form to create an organization."* Member and role management DO have endpoints
(`PUT /api/organizations/{org}/members/{user}/role`); creation does not.

I could not do this myself: CDP on port 9222 is not responding, so there is no
logged-in browser session to drive. **It is a founder tap**, one form, ~30s.

## The hard limit: hosted inference is unavailable, and it is the ACCOUNT

Both tokens, same error:

```
POST router.huggingface.co/hf-inference/models/BAAI/bge-m3/.../feature-extraction
403 {"error":"You have exceeded your monthly spending limit for Inference Providers."}
```

Not a token scope problem, not a model gating problem: the account has no
Inference Provider credit. This blocks any hosted-inference plan (ZeroGPU Spaces
that call the router, Parakeet via the router, Qwen3 via the router) until credit
is added. **Founder decision: top up or stay local.** Note that ZeroGPU Spaces
run their own weights and are not the same billing line as the router, so a
ZeroGPU Space may still work at 0/40 minutes; that is untested and I am not
claiming it works.

## What this UNBLOCKS: bge-m3 on local CPU, no credit needed

The inventory calls bge-m3 the "cheapest high-value ML win available; zero GPU
needed", gated only on a token. The hosted endpoint is 403, but the **model hub
is reachable** with the same token, and the already-installed stack
(`transformers 5.16.1`, `torch 2.13.3+cpu`, `tokenizers 0.23.1`, `numpy 2.4.6`)
runs it with nothing installed. Law 7 was not violated: no package was installed,
only model weights downloaded into the local HF cache.

Measured, MIT license, `BAAI/bge-m3`:

```
loaded in 186.7s (first run, includes 2.2GB download)
encoded 3 texts in 0.54s -> shape (3, 1024)
unit norm check: [1. 1. 1.]
off-diagonal cosine: min=0.6596 max=0.7130
```

**So the corpus-embedding lane does not need a credit top-up. It needs CPU.**
That removes a founder blocker from the critical path, and it is the correct
answer anyway: 585 papers on CPU is a one-off index build, not a recurring
inference bill.

## Model availability, measured

| Model | Gated | License posture | Note |
|---|---|---|---|
| `BAAI/bge-m3` | no | MIT | runs locally, verified above |
| `BAAI/bge-reranker-v2-m3` | no | Apache-2.0 | 17.1M downloads; the natural rerank stage over the bge-m3 index |
| `nvidia/parakeet-tdt-1.1b` | no | CC-BY-4.0 (attribute) | **ungated** - the earlier "needs terms-acceptance tap" concern does not apply to the model weights |
| `amazon/chronos-t5-small` | no | Apache-2.0 | ungated; still correctly gated behind projection-source lock per the spec |
| `Qwen/Qwen3-Embedding-0.6B` | no | Apache-2.0 | ungated alternative if bge-m3 throughput is too slow |

Nothing is gated, so nothing needs a terms-acceptance click. That is a
correction to the browser brief's assumption as well.

## What still needs you

1. **Org naming** - confirm `GalaxySportsEdge` is the org to use (I recommend
   yes; creating Beexly is one form if you disagree).
2. **Inference credit** - only if you want hosted inference. Not needed for the
   bge-m3 lane, which now runs local. ZeroGPU shows 0/40 minutes, which may
   cover the Parakeet and Qwen3 prototype tracks for free.
3. **Projection source** - unchanged, and still the one that gates rankings.

*No secrets in this file. No repos or Spaces created. Nothing posted publicly.*

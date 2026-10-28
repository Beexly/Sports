# The last 12 — probed, and the answer is mostly "credentials"

2026-10-28. These are the hosts that yielded nothing to static probing or to a rendered browser.
The question was whether any of them still publish a public preview, docs sample or free tier.

Twelve conventional paths each (`/docs`, `/api`, `/openapi.json`, `/swagger.json`, `/free`,
`/pricing`, and so on). Result: **9 of 12 have nothing at any conventional path.**

## The three that responded, and why it barely counts

| Host | Paths that returned 200 | What it actually is |
|---|---|---|
| `tipico.com` | all 12 | the same 364,404-byte SPA shell for every path |
| `rotoviz.com` | `/free`, `/pricing` | the same ~355 KB SPA shell |
| `mysportsfeeds.com` | 4 paths | the only one with real distinct pages, and it advertises a free tier |

`tipico` and `rotoviz` are single-page apps that serve the shell for anything, so a 200 tells you
nothing about whether a path exists. The `key-auth` and `openapi` signals picked up from them are
just words in the bundle, not a published spec.

## What is genuinely reachable without an account

- **`mysportsfeeds.com`** — has a real free tier and distinct docs pages. This is the one worth a
  signup, and it is the only one of the twelve where an account is a formality rather than a gate.
- **`rotoviz.com`** — free content exists behind `/free`; the API needs a key.
- **`dynastyprocess.com`** — worth noting separately: it publishes its data as a public GitHub repo
  rather than an API, so the site being empty is not the whole story.

## The other nine

`betmgm`, `betrivers`, `mojo`, `myfantasyleague`, `spankodds`, `sportsdataio`, `sumersports`,
`footballoutsiders`, `tipico` — nothing public at any conventional path. These need a credentialed
session, and for the sportsbooks that means a funded or at least registered account.

## Honest read

This pass did not break anything. It converted "12 gaps" into "1 worth a signup, 2 with partial
public routes, 9 genuinely gated" — which is a better map than a flat list, but it is a
classification, not a capture.

`footballoutsiders.com` is the surprise. It is an archive of the field's foundational public work
and it responded to nothing, which suggests the site is now JS-gated rather than merely quiet.

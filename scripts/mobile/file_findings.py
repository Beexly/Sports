#!/usr/bin/env python3
"""
file_findings.py — turn the mobile audit's upstream findings into GitHub issues.

WHY: an audit that lives in a markdown file is a document. An audit that lives in
the tracker is work. These six findings were each discovered while building the
native client and each is outside the client's gift to fix, so they need an owner
and a place to be seen.

Run from anywhere with GITHUB_TOKEN set. Idempotent: it skips an issue whose
title already exists, so re-running after a partial failure does not duplicate.
"""

import json
import os
import urllib.error
import urllib.request

REPO = "Beexly/Sports"
TOKEN = os.environ["GITHUB_TOKEN"]
API = "https://api.github.com"


def request(method, path, payload=None):
    url = f"{API}{path}"
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {TOKEN}")
    req.add_header("Accept", "application/vnd.github+json")
    if data:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            return json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        return {"__error": e.code, "__body": e.read().decode()[:400]}


FINDINGS = [
    {
        "title": "The FIELD palette collapses the four-band confidence ladder to two colours",
        "labels": ["enhancement", "technical-debt"],
        "body": """## The finding

`DESIGN.md` specifies a four-colour confidence ladder:

| Band | Token | Documented |
|---|---|---|
| 80-100 | `--conf-elite` | plasma |
| 65-79 | `--conf-strong` | orbital cyan |
| 50-64 | `--conf-solid` | ultraviolet |
| <50 | `--conf-lean` | silver |

The FIELD revision retired cyan and ultraviolet to fog. In the shipping tokens
(`apps/web/styles/design-tokens.css`) `--conf-strong`, `--conf-solid` and
`--conf-lean` therefore all resolve to the **same value**, `#C4BFB6`. Four bands,
two effective colours.

## Why it matters

A confidence meter whose bands are visually identical is not a ladder. On the
native client the meter is the primary way a reader judges a pick, and a
four-band scale that renders as two invites a misread: a 52 and a 78 look the
same.

## What the mobile client does instead of inventing a colour

`apps/mobile/src/lib/calibration.ts` distinguishes bands by **fill weight**
(1.0 / 0.6 / 0.3 / outline) and always renders the numeral, which the contract
requires anyway ("the confidence score is always shown as a number AND
optionally a bar"). A test pins that the four bands have four distinct fills and
that exactly one is accented, so a future edit cannot quietly re-collapse them.

Inventing a third hue was rejected: adding a colour to fix a colour problem is
how a palette forks.

## The decision this needs

Either:

1. **Accept two bands.** Update `DESIGN.md` to describe a two-band ladder and
   delete the retired names, so the document matches the system. Cheapest, and
   honest.
2. **Reintroduce two tints.** Give `--conf-strong` and `--conf-solid` their own
   values within the FIELD discipline (an ember tint step and a fog step, say),
   and keep four bands.

Not decided by the agent that found it, because both are defensible and one of
them changes the design system.

## Evidence

- `apps/web/styles/design-tokens.css` — the three collapsed confidence aliases
- `DESIGN.md` — the four-band specification
- `apps/mobile/src/lib/calibration.ts` — the fill-weight workaround
- `docs/mobile/REVIEW_AND_AUDIT.md` §4 F1
""",
    },
    {
        "title": "DESIGN.md and design-system/ are stale mirrors of the pre-FIELD palette",
        "labels": ["documentation", "technical-debt"],
        "body": """## The finding

`BRAND_AND_DESIGN_SYSTEM.md` §2 flagged this on 2026-06-01. It is still true.

| Artefact | Claims | Reality |
|---|---|---|
| `apps/web/styles/design-tokens.css` | "Canonical values: FIELD (approved 2026-09-10)" | The authority |
| `DESIGN.md` YAML front matter | plasma `#FF2DD6`, orbital cyan `#00E5FF`, ultraviolet `#7A5CFF` | Pre-FIELD |
| `design-system/colors_and_type.css` + README | the same pre-FIELD palette | Pre-FIELD |
| `apps/web/tailwind.config.ts` | partially mirrored | Partially stale |

`DESIGN.md` itself says "If they conflict, the CSS file wins", which is the only
reason the drift has not caused a visible defect on the web.

## Why it matters now

An agent building the native client had to **choose between two files that
disagree about the primary accent colour.** It chose the CSS because that file
declares itself the authority and `DESIGN.md` defers to it. The next agent may
not be as careful, and the failure mode is silent: an app in the wrong palette
compiles and looks deliberate.

## The fix that makes drift structurally impossible

Two artefacts that are *supposed* to agree will not. One artefact plus a
generator will.

1. Make the tokens the single source (`design-tokens.css` or a `.json` beside it).
2. Generate `tailwind.config.ts`, `DESIGN.md`'s front matter, and the native
   `apps/mobile/src/theme/tokens.ts` from it with Style Dictionary.
3. Add a CI check that fails when a generated artefact is out of date.

`style-dictionary/style-dictionary` (4.8k stars, Apache-2.0) is built for exactly
this and is already the pattern the repo's own `design-system/README.md` gestures
at.

## Interim mitigation already in place

The native client ports from ONE file and its linter reads the token maps
directly, so a token that does not exist is a lint failure rather than a silently
`undefined` style. That protects the client; it does not fix the source.

## Evidence

- `docs/mobile/REVIEW_AND_AUDIT.md` §4 F2
- `docs/mobile/research/round-01-repositories.md` §9
""",
    },
    {
        "title": "twitter-bot-voice-spec still renders confidence as a percent",
        "labels": ["bug", "documentation"],
        "body": """## The finding

`docs/product/twitter-bot-voice-spec.md` specifies the publication post as:

> `Published BOS -3.5 at 73% confidence (SOLID_PLAY).`

That predates the 2026-09-13 measurement recorded in `AGENTS.md`.

## Why it is a bug and not a style question

`confidence` is a weighted factor sum on a 0-100 scale. It is not a probability,
and it is measurably **anti-predictive at its top end**. Measured 2026-09-13 over
settled published non-bootstrap picks, pushes excluded:

```
confidence (n 2,385): conf 80+ claims 0.8663 and realizes 0.5191
                      gap -0.3472, z = -10.7
                      Brier as a probability on that band: 0.3617
                      (a constant 0.5 forecast scores 0.25)
```

Realized win rate peaks at conf 75-79 (0.6146) and falls to 0.4643 by conf 90-94.

A percent sign asserts a win probability the number demonstrably is not. On the
web that is correctable. **On X it is not: a tweet is public, permanent and
unrecallable**, and it is the widest-reach surface the product owns.

## What is already fixed

The template. `apps/web/lib/twitter-bot/templates/pick-publication.ts` now
renders `at 91/100 confidence score`, matching the native client, and
`apps/web/__tests__/bot-templates.test.ts` pins it. A new eval
`docs/ops/evals/twitter-bot-publication-no-percent.md` covers the rule directly
with the measured numbers.

## What is NOT fixed

**The spec.** It is the voice authority, so the next agent will re-derive the
percent from it. That is the whole reason this issue exists.

Also fixed in the same pass, found by executing the template rather than reading
it: the pick line rendered **twice** (`BOS @ NYK BOS -3.5`), and
`PICK_GRADE_LABELS` was missing `ELITE_PLAY` and `STRONG_PLAY`, so the two
highest grades published as raw enum names.

## The fix

Rewrite the spec's publication example and add a line to its voice rules:

> Confidence is rendered as a score out of 100. Never a percent, never the words
> "probability", "chance" or "win rate" applied to it.

Then add the percent rule to the spec's "compliance scanner integration" section
so it is enforced rather than remembered.

## Evidence

- `docs/product/twitter-bot-voice-spec.md` § "Free pick publications"
- `apps/web/lib/twitter-bot/templates/pick-publication.ts`
- `docs/mobile/REVIEW_AND_AUDIT.md` §4 F3
""",
    },
    {
        "title": "Decision needed: settlement emoji on X versus the design contract's emoji ban",
        "labels": ["question"],
        "body": """## The conflict

Two product documents disagree and both cannot be right.

**`docs/product/twitter-bot-voice-spec.md`** says of the settlement post:

> Outcome emoji: the check mark for WIN, the cross for LOSS, the scales for PUSH.
> **These are the only emojis the bot uses.**

And it is implemented: `apps/web/lib/twitter-bot/templates/settlement.ts` emits
`\\u2705` and `\\u274C`, and `apps/web/__tests__/bot-templates.test.ts` asserts
them ("formats settlement outcomes with the approved settlement symbols").

**`DESIGN.md`** says the opposite:

> Settlement Badge: two states, WIN and LOSS. **Monogram: "W", "L", "P", "V".
> Never a check or cross alone** — screen readers need labels.

and, more broadly, "emoji is approximately zero". The design contract's
sanctioned glyph set is data glyphs only: up, down, minus, middle-dot, arrow.

## Why this was not resolved unilaterally

The agent that found it could have changed the template. It did not, for three
reasons:

1. The voice spec is an **explicit product decision** with a stated rationale
   ("the only emojis the bot uses"), not an oversight.
2. The tests pin the current behaviour, so changing it is a deliberate test
   change, which is a reviewer's call.
3. There is a genuine argument on both sides, and it is platform-specific.

## The argument for the exception

At timeline scale a monogram is illegible. The platform's own convention for
outcome carries meaning a letter does not, and a settlement post is read in a
glance, not studied.

## The argument against

The product's entire positioning is that it is not a tout account, and settlement
emoji are the single strongest visual signal of one. The ban exists because emoji
read as promotional. A reader scrolling past a check mark and a cross learns
something about the account before they read a word.

## Proposed resolution, for the owner to accept or reject

A **documented, single-use exception**, scoped by an eval:

- The settlement glyph appears **only on the settlement lead post**.
- It never appears on a publication, a slate-state post, a post-mortem, or any
  thread reply after the first.
- Every other post uses the sanctioned data glyphs.
- An eval asserts a glyph does not appear on any other event kind.

That keeps the platform-native affordance where it earns its place and removes it
everywhere it would read as promotion.

## Evidence

- `docs/product/twitter-bot-voice-spec.md` § "Free pick settlements"
- `DESIGN.md` § Signature Components, "Settlement Badge"
- `apps/web/lib/twitter-bot/templates/settlement.ts`
- `docs/mobile/X_COMMUNITY_STRATEGY.md` §3
- `docs/mobile/REVIEW_AND_AUDIT.md` §4 F4
""",
    },
    {
        "title": "React Native 0.86 ships incomplete TypeScript definitions for FlatList",
        "labels": ["technical-debt", "documentation"],
        "body": """## The finding

`react-native@0.86.3` (the version Expo SDK 57 pins) ships
`Libraries/Lists/FlatList.d.ts` declaring:

```ts
export interface FlatListProps<ItemT> extends VirtualizedListProps<ItemT> { ... }
```

but **`ListHeaderComponent` and `ListFooterComponent` appear nowhere in the
shipped type definitions.** A repo-wide search of the package returns zero hits
for either identifier.

## Consequence

Any strict-mode TypeScript app using those props fails to compile:

```
error TS2769: No overload matches this call.
  Property 'ListHeaderComponent' does not exist on type
  'IntrinsicAttributes & Readonly<FlatListProps<PublicPick>>'.
```

They exist at runtime. This is a type-definition gap, not a removed API.

## How the mobile client worked around it

It uses `ScrollView` for the picks list. That is justified independently — a
slate is five rows by design ("most days, fewer than five picks"), and tuning a
virtualised list for a five-row dataset is complexity with no reader — but it is
worth recording that the type gap forced the question earlier than it would
otherwise have been asked.

## What future React Native work should know

Three options, in order of preference:

1. **Use `ScrollView`** where the list is genuinely short. Simplest, and it is
   what the client does.
2. **Augment locally** with a `declare module "react-native"` block adding the two
   props to `VirtualizedListProps`. Accurate, and the props do exist.
3. **Avoid the props** by rendering the header as a sibling outside the list.

Do NOT reach for `as any` or `@ts-expect-error`. Both hide the next genuine error
on the same line.

## Evidence

- `node_modules/react-native/Libraries/Lists/FlatList.d.ts`
- `apps/mobile/app/(tabs)/picks.tsx` — the ScrollView choice, with its reasoning
- `docs/mobile/REVIEW_AND_AUDIT.md` §4 F7
""",
    },
    {
        "title": "expo-iap v3 renamed its error codes; the v2 name fails silently",
        "labels": ["technical-debt", "documentation"],
        "body": """## The finding

`expo-iap` v3 exports an `ErrorCode` enum with PascalCase members. The v2 name
`E_USER_CANCELLED` **no longer exists**.

```js
// expo-iap v3, ErrorCode members include:
UserCancelled  // value: "user-cancelled"
// and NOT: E_USER_CANCELLED
```

## Why it is dangerous

The comparison compiles. Most tutorials, and most model-generated first drafts,
use the v2 name. So this is written:

```ts
if (error.code === "E_USER_CANCELLED") { /* treat as a normal dismissal */ }
```

`error.code` is typed `ErrorCode | undefined`, so a string comparison against a
non-existent member is a type error *if a typechecker is run*. Where it is not —
and on the host this was found on, it intermittently is not — the comparison is
simply always false.

**The result: every user cancellation renders a purchase error.** The customer
tapped "cancel", and the app tells them something went wrong. That is the single
most common interaction on a paywall.

## The fix

```ts
import { ErrorCode } from "expo-iap";
if (error.code === ErrorCode.UserCancelled) { ... }
```

Already applied in `apps/mobile/app/paywall.tsx`, found by the typechecker during
the one window where it worked.

## The broader lesson, worth a line in AGENTS.md

Two other API renames were found in the same pass and are the same shape:

- `getStorefront()` takes **no arguments** in v3 (v2 took a props object).
- `PurchaseIOS.appAccountToken` exists and is **load-bearing** for attributing a
  purchase made while signed out. It is easy to miss entirely.

An SDK's own `.d.ts` is the authority. Training data and tutorials lag by a major
version, and the failure mode of trusting them is a silent no-op rather than an
error.

## Evidence

- `apps/mobile/app/paywall.tsx`
- `docs/mobile/REVIEW_AND_AUDIT.md` §4 F8
""",
    },
]


def existing_titles():
    titles = set()
    page = 1
    while True:
        data = request("GET", f"/repos/{REPO}/issues?state=all&per_page=100&page={page}")
        if not isinstance(data, list) or not data:
            break
        for issue in data:
            titles.add(issue["title"])
        if len(data) < 100:
            break
        page += 1
    return titles


def main():
    have = existing_titles()
    created, skipped, failed = [], [], []

    for finding in FINDINGS:
        if finding["title"] in have:
            skipped.append(finding["title"])
            continue
        result = request("POST", f"/repos/{REPO}/issues", finding)
        if "__error" in result:
            failed.append((finding["title"], result["__error"], result.get("__body", "")))
        else:
            created.append(f'#{result["number"]}  {finding["title"]}')

    print(f"created {len(created)} | skipped {len(skipped)} | failed {len(failed)}")
    for line in created:
        print("  ", line)
    for title in skipped:
        print("   skipped (exists):", title)
    for title, code, body in failed:
        print("   FAILED", code, title)
        print("        ", body[:200])


if __name__ == "__main__":
    main()

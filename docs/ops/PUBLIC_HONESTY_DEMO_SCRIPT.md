# Public Honesty Demo Script

What a stranger can actually see, today, on this codebase — and what they
cannot yet. #206 and #208 have since merged; only #209 remains open.

The point of this document is that it distinguishes **shipped** from
**pending**. A demo script that quietly demos unmerged work is the same
category of dishonesty the product exists to reject, so every step below is
tagged with what it requires.

---

## What is on `main` right now

Merged: **#207** (`317c2764`) → **#206** (`bb248c9a`) → **#208** (`96ae7024`).

- `/airwave` withholds a pundit hit rate below 25 decided calls. Type a
  pundit with two decided calls and no rate appears — the counts do, the
  percentage does not.
- `/board` gives every reader a plain-language reason for a pass, and the
  auditable trail (reason code, confidence at refusal, model version,
  evidence count) to `canSeeNoBetDetail` holders. The detail is withheld
  server-side — an unentitled response never contains it.
- `/pricing` leads Pro with No-Bet reasoning, multiprob intervals, Glass
  Ledger access, and recompute. Volume is demoted below all of them.
- `/integrity` separates the two things called "integrity": how our agents
  are governed, and whether a displayed number is substantiated.
- `/stats/compare` names the player it could not find rather than silently
  substituting a different one.
- The `pavIsotonic` weight test is correct, so `main` is green.

The remaining honesty *engine* work — a production consumer of the gate —
sits in #209.

---

## Demo — SHIPPED TODAY (needs nothing merged)

**1. Small samples do not become percentages.** (~20s)

Open `/airwave`. The pundit scorecards show decided-call counts. Any pundit
under 25 decided calls shows **no** hit rate — not a greyed-out one, not a
zero: the field is withheld entirely.

Say plainly: *the page is fictional demo pundits today, labelled as such.*
The floor exists so that when real pundits flow through the same component,
a one-of-one lucky call cannot render as "100%".

**2. The public integrity surface.** (~30s)

Open `/integrity`. Point at:
- SHADOW is the only reachable default; ENFORCE is lab-gated.
- The published keyring at `/.well-known/receipt-keys.json` — fetch it live.
- The NON-CLAIMS section, which is a list of things the page refuses to say.

**3. Verify a receipt without trusting us.** (~40s)

Follow `docs/devrel/DEMO_SCRIPT.md`: force a REFUSE, open the receipt, fetch
the public key, verify the signature. Then tamper with one character and
watch verification fail.

**4. The refusal is explained, and the explanation is entitled.** (~30s)

Open `/board`. Passes carry a plain-language reason for every reader. Sign
in as a `canSeeNoBetDetail` holder and the auditable trail appears: reason
code, confidence at refusal, model version, evidence count. Then show the
unentitled response body — the detail is not hidden by CSS, it is never
serialised.

**5. Two different things called "integrity".** (~20s)

On `/integrity`, show the section separating *how our agents are governed*
from *whether a number on screen is substantiated*. Most products conflate
these; the distinction is why our substantiation guards can be strict
without touching the governance claim.

**6. It tells you when it could not find what you asked for.** (~20s)

`/stats/compare?a=p999`. The page names the ID it could not resolve and
states that the comparison shown is not the one requested. It previously
rendered a confident side-by-side of someone else with no notice.

---

## Requires #209 merged

- **The gate can be asked, from product code, and answers honestly** —
  `/board/gate` runs `applySelectiveGate` at request time and prints what it
  returned. Five reason codes are reachable: `FIRE`, `NO_BET_LCB`,
  `NO_BET_WIDTH`, `INSUFFICIENT_CALIBRATION`,
  `NOT_EVALUATED_MISSING_INPUTS`.

  Say the caveat out loud, because the page does: **the decision logic is
  production code; the input rows are illustrative and are not today's
  slate.** Real gate, labelled inputs. The reverse — real-looking inputs and
  a hand-written decision — is the thing that page must never be.

  The demo is the *three kinds of no*. "No bet" is a judgement made against
  settled history. "Not judged" means the stratum has under 100 settled
  picks, so the model was never asked. "Not evaluated" means an input was
  missing. Collapsing them would let us claim a considered judgement where
  the truth is an absence of evidence — and for a product this young, the
  second is often the honest answer.

---

## What CANNOT be demoed, at any merge state

State these plainly rather than skipping them — a demo that goes quiet on
its gaps invites the audience to assume more than is true.

- **The Glass Ledger publishes nothing.** `PUBLISH_LEDGER` defaults off and
  the sealed-vault state is the honest one. There is no season record.
- **No live win rate, ROI, or CLV figure exists.** Every public performance
  number is gated behind `renderableMetricOrNull` /
  `assertDisplaySubstantiated`, and nothing currently clears those bars.
- **The gate does not yet drive `/board`'s published picks.** #209 adds the
  consumer, its contract, and a page that runs it — but on illustrative
  rows. Feeding the live slate in needs a Pick × Odds join whose behaviour
  is not verified yet, and shipping an unverified join underneath a page
  about honesty would be the exact failure that page argues against.
- **Nothing is persisted to the ledger.** `FiredDecision` has no production
  writer — see `PRODUCT_CASCADE_MAP.md`.
- **No certification.** Not SOC 2, ISO 27001, or EU AI Act certified. The
  compliance work is internal alignment mapping, and says so.

---

## The 90-second version

1. `/integrity` — here is what we govern, here is the list of things we
   refuse to claim, and here is why "integrity" means two separate things.
   (25s)
2. Fetch `/.well-known/receipt-keys.json`, verify a receipt, tamper with it,
   watch it fail. (35s)
3. `/airwave` — a rate we are withholding because the sample is too small to
   publish honestly. Then `/board` — a refusal explained, with the auditable
   trail entitled and withheld server-side. (30s)

Every one of those runs on `main` today. Once #209 lands, `/board/gate`
replaces step 3's second half: the gate deciding live, with three distinct
kinds of no.

## NON-CLAIMS

This document describes what is demonstrable, not what is proven. It asserts
no performance result. Steps tagged as requiring a merge are not demonstrable
until that merge happens, and presenting them as current would misrepresent
the product's state.

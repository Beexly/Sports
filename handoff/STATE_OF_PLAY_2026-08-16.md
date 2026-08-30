# State of Play — the honest read (2026-08-16, Fable synthesis)

Not another checklist. `LAUNCH_BLOCKERS.md` has the defensive punch-list and it is good. This is the
thing that document can't give you: where this product actually is, and the one tension that will
decide whether the launch works — stated plainly, by someone who watched the whole sprint.

---

## Where you actually are

**The code is in genuinely good shape and that is no longer the constraint.** Two days of adversarial
work — security hardened, auth sound, entitlements sound, the paywall enforced in SQL, supply chain
locked down, dozens of real bugs caught and fixed, the whole thing battle-tested repeatedly. An
independent security pass concluded the app's posture is *better* than expected in most areas. Believe
that. Stop treating "is the code correct" as the open question. It is largely answered.

**What is NOT answered, in one sentence each:**
1. **Is it even running?** The live scheduler died for ~20h this session and nothing outside Vercel
   noticed (now fixed — external watchdog added). Operational liveness, not code, is the live risk.
2. **Does the model actually beat the close?** Unknown. The machinery to answer it exists and is dark
   (Phase 14). Until you run it, you do not know if there is an edge to sell.
3. **Can a normal person tell why they should pay?** This is the real one. See below.

---

## The tension nobody named: rigor vs legibility

This is the most important paragraph in the document.

Your entire moat is sophistication — calibration, CLV, beating the closing line, reproducible proof.
That rigor is real and it is your differentiator; competitors structurally cannot fake an earlier
honest start date. **But rigor is also your go-to-market weakness.** The touts win because
"LOCK OF THE DAY 🔒" is instantly legible to a normal sports bettor and "our Brier score against the
closing line is 0.24" is not. A product whose value requires three layers of understanding the buyer
does not have will be *right* and *ignored* at the same time.

Phase 14 makes the proof EXIST. It does not make the proof LEGIBLE. Those are different problems, and
the second one is the one that converts.

**The bridge — and it does not require lying, which is the whole point:** translate the rigor into one
claim a normal bettor gets in five seconds, backed by the reproducible proof underneath.
> "We beat the closing line — the sharpest price in the market, and the only thing that actually
> predicts long-term profit. Every pick is timestamped and hashed before kickoff. Recompute it
> yourself."
Legible on the surface, rigorous underneath, honest all the way down. That sentence (or your better
version of it) is worth more than any feature in the backlog. It is a positioning decision only you
can make — flagged here, not queued, because it is yours.

---

## The five things between here and a real launch, ranked by what actually matters

1. **Confirm the product is alive and stays alive.** Restore the Vercel scheduler; confirm the external
   watchdog pages you. A dead product converts at 0% regardless of how good it is. (Owner + ops.)
2. **Run Phase 14's proof chain and find out if there's an edge.** If the model beats the close, you
   have a business and a headline. If it doesn't yet, you need to know that before you sell, and the
   honest-collecting posture already handles it. This is the single highest-information action available.
   (Owner runs it; Laguna is building/verifying the machinery now — Phase 14.)
3. **Make the value legible** (the tension above). Positioning, not code. (Owner.)
4. **Close the launch-critical customer/legal gaps that are real:** age-gating (LIVE gap, confirmed on
   deployed main), refund-doesn't-revoke, the DB migration. These are in `LAUNCH_BLOCKERS.md` and they
   are genuinely blocking. (Owner + counsel.)
5. **Merge.** Everything fixed this session — the Safari checkout bug, the can't-cancel bug, the
   security controls, the honesty fixes — is branch-only and reaches no customer until you merge.
   ~250 commits is past the point where line-by-line review is real; review the SHAPE (the phase
   summaries, the LAUNCH_BLOCKERS doc, the security commits) and decide. (Owner.)

---

## A blind spot even Phase 14 doesn't cover — flagged for a future session, not queued

**Data-source concentration risk.** The whole product rests on two free/cheap external sources
(nflverse for the data substrate, the-odds-api for odds). If either changes format or dies, the
product is done — and you would find out from a broken board, not a warning. Worth a read-only
resilience audit at some point: what breaks, how fast you'd notice, what the fallback actually is.
Not urgent, but it is the kind of single-point-of-failure that ends products quietly. Left as a
recommendation rather than a task to keep Phase 14 focused.

---

## The one-line version

The code is ready enough. The open questions are whether it's running, whether the edge is real, and
whether a normal person can tell why it's worth paying for — and only the third is something you can
answer without turning a key. Answer that one and you have a launch.

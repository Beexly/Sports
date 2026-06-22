# GSE Cognitive Operating Model (Workstream E)

**Status:** Internal design doc. Narrative companion to the typed contract
`apps/web/lib/gse/cognitive-operating-model.ts`.
**Scope:** How Galaxy Sports Edge (GSE) presents decisions to a human so the
human decides *better* — less load, clearer tradeoffs, preserved agency — without
ever manufacturing confidence or exploiting the user.
**Audience:** Engineers, designers, and decision-design reviewers. Not user copy.

> Thesis: the product "thinks for people" by **reducing cognitive load and
> exposing tradeoffs** — never by hiding them, and never by manufacturing
> certainty. Doing the thinking *for* someone and doing the thinking *to* someone
> are opposites; §E draws the red line.

---

## A. Grounding

The model rests on eight strands of established research and practice. Each is a
constraint on the interface, not a flourish.

- **Cognitive load theory.** Working memory is small. Every element on screen
  spends a fixed budget. The model treats screen elements as a *cost* to justify,
  not a default — the answer first, the machinery on demand.
- **Decision fatigue.** Choice quality degrades over a session, and over a Sunday
  morning of forty roster calls. The model front-loads the highest-leverage
  decision and defers or batches the rest, so the user spends judgment where it
  matters most.
- **Choice architecture.** Defaults and ordering shape decisions whether or not we
  intend them to. We accept the responsibility: the disciplined option is the
  easy-to-reach default, but the alternatives are always one tap away and never
  hidden.
- **Explainable AI.** A recommendation the user cannot interrogate is a
  recommendation they cannot trust or learn from. Every answer can unfold into its
  reason and then its evidence (the answer → reason → evidence spine, §B-2).
- **Trust calibration.** The goal is *appropriate* trust, not maximal trust. The
  interface must make the system's uncertainty legible so users neither
  over-rely (automation bias) nor dismiss a good read.
- **Alert fatigue.** A system that cries wolf trains users to ignore it — and the
  one alert that mattered is the one they miss. Urgency is rationed (§B-5).
- **Progressive disclosure.** Show the conclusion; reveal complexity only as the
  user asks for it. Depth is available, never imposed.
- **Autonomy-preserving nudges.** Nudges are legitimate only when they steer
  toward the user's *own* considered interest and leave the alternative free and
  obvious. We nudge toward discipline, never toward more action for its own sake.

---

## B. The ten principles

These govern every surface, every mode, every command. They are testable design
assertions, not slogans.

1. **Compress complexity without hiding tradeoffs.** Reduce what the user must
   hold in mind, but never collapse a real tradeoff into a single number that
   pretends it away. Compression that erases a tradeoff is a lie; compression
   that surfaces it is the product.
2. **Answer → reason → evidence.** Lead with the conclusion in one line. The
   reason is one unfold away. The evidence (the full case, §Evidence Engine) is
   one more. Never make the user read the machinery to get the answer; never deny
   them the machinery when they want it.
3. **Always show what would make the answer wrong.** Every recommendation carries
   its `whatWouldChange` — the falsifier most in play. A conclusion presented
   without its disconfirming condition is not trustworthy, it is just loud.
4. **Detect user bias without shaming.** When behavior suggests a known bias
   (chasing losses, recency, over-trading a hot streak), the system names the
   *pattern*, not the person — neutrally, with the user's own history, and with an
   easy off-ramp. No lectures, no guilt.
5. **Urgency only when time truly matters.** A countdown or alert appears only
   when a real, checkable deadline exists (lock time, late news window).
   Manufactured scarcity is banned. Most of the product is calm.
6. **Preserve agency.** The system recommends; the user decides. There is always a
   visible alternative path, the disciplined default is never the *only* door, and
   "I disagree" is a first-class action that the system records and learns from.
7. **Never exploit gambling psychology.** No variable-reward loops, no
   near-miss framing, no streak-baiting, no loss-chasing prompts. The interface is
   designed to *dampen* tilt, not harvest it.
8. **Reward discipline, not dopamine.** Positive feedback attaches to good
   *process* — a well-reasoned pass, a respected stop, a researched decision — not
   to action volume or wins. We do not celebrate clicks.
9. **Let No-Play be a win.** A NO-BET / NO-PLAY verdict is presented as a
   successful outcome of good thinking, with the same visual weight as a PLAY.
   Declining a bad decision is the product working, not failing.
10. **Teach through autopsy.** After a decision resolves, the system replays the
    reasoning trace — what was believed, what changed, what fired — so the user
    learns from process, not just scoreboard. The autopsy is offered, never forced.

---

## C. User modes

A *mode* is a context-specific contract: given the user's state and what they are
trying to do, it specifies what to hide, what to show, the one primary action,
the trust the moment demands, how the Jarvis copilot behaves, the mobile
behavior, and the way the mode fails. The model selects a mode from context; the
user can always override it (Principle 6).

Each mode below lists: **state · primary anxiety · hide · show · primary action ·
trust requirement · Jarvis behavior · mobile behavior · failure mode.**

### 1. Novice
- **User state:** New, low confidence, unsure what the numbers mean.
- **Primary anxiety:** "Am I about to do something dumb?"
- **Hide:** Raw model internals, jargon, dense tables, confidence math.
- **Show:** One plain-language answer, its one-line reason, a gentle "here's how to read this."
- **Primary action:** Understand one recommendation end to end.
- **Trust requirement:** High — first impressions set lifetime trust calibration.
- **Jarvis behavior:** Teacher. Defines terms inline, offers the autopsy, never assumes prior knowledge.
- **Mobile behavior:** One card, one action, generous spacing; depth behind a tap.
- **Failure mode:** Overwhelm → silent churn. Guard by ruthless disclosure discipline.

### 2. Sharp
- **User state:** Experienced, fast, wants signal density and the edge case.
- **Primary anxiety:** "Is this telling me anything I didn't already price in?"
- **Hide:** Tutorials, hand-holding, obvious context.
- **Show:** The differentiated read, the counter-case, "what is the market missing," fragility.
- **Primary action:** Find the non-consensus, defensible edge — or confirm there isn't one.
- **Trust requirement:** High on *rigor* — a sharp user catches a hand-wave instantly.
- **Jarvis behavior:** Peer analyst. Terse, leads with the delta, surfaces counterargument unprompted.
- **Mobile behavior:** Dense but scannable; key numbers and the falsifier above the fold.
- **Failure mode:** Condescension or thin reasoning → instant credibility loss.

### 3. Builder
- **User state:** Constructing something multi-part (lineups, a roster, a season plan).
- **Primary anxiety:** "Are the pieces working together or against each other?"
- **Show:** Correlation/interaction between choices, constraint satisfaction, the weak link.
- **Hide:** Single-item noise that doesn't affect the whole.
- **Primary action:** Optimize the *portfolio*, not the item.
- **Trust requirement:** Moderate-high on the interaction model.
- **Jarvis behavior:** Systems engineer. Talks structure, dependencies, single points of failure.
- **Mobile behavior:** Summary of the whole + drill into the weak slot; full build on larger screens.
- **Failure mode:** Local optimization that breaks the global picture.

### 4. Draft Night
- **User state:** Live, time-boxed pick clock, high stakes, others watching.
- **Primary anxiety:** "Am I about to reach or miss obvious value with seconds left?"
- **Show:** Best-available-by-value, need fit, the next-best fallback, a clock-aware nudge.
- **Hide:** Anything not actionable in the pick window.
- **Primary action:** Make the *next* pick well, fast.
- **Trust requirement:** High — no time to second-guess.
- **Jarvis behavior:** Co-pilot under time pressure. One recommendation, one fallback, zero rambling.
- **Mobile behavior:** Single decisive card; fallback one tap away; clock always visible.
- **Failure mode:** Latency or ambiguity at the buzzer → a blown pick.

### 5. Sunday Morning
- **User state:** Many small decisions (start/sit, waivers) before a hard kickoff deadline.
- **Primary anxiety:** "Did I miss something important across all my calls?"
- **Show:** A triaged worklist — only the decisions that actually move the needle, ordered by leverage.
- **Hide:** The 80% of calls that are obvious or immaterial.
- **Primary action:** Clear the high-leverage decisions before lock.
- **Trust requirement:** Moderate-high on the triage (trust that "no flag" means safe to skip).
- **Jarvis behavior:** Chief of staff. Batches, prioritizes, says "these three matter, the rest are fine."
- **Mobile behavior:** Checklist that shrinks as you clear it; deadline countdown per game.
- **Failure mode:** Decision fatigue → a missed deadline on the one call that mattered.

### 6. DFS Lock
- **User state:** Finalizing entries minutes before lock; salary and rules binding.
- **Primary anxiety:** "Is my exposure where I want it before this freezes?"
- **Show:** Exposure summary, constraint check, last-news deltas, the single riskiest slot.
- **Hide:** Strategy theory — it's too late for it.
- **Primary action:** Confirm or fix exposure, then lock.
- **Trust requirement:** High on the constraint/rules check.
- **Jarvis behavior:** Pre-flight checklist. Flags violations and stale slots; otherwise quiet.
- **Mobile behavior:** Compact exposure bar + one-tap fix on the flagged slot.
- **Failure mode:** A missed rule violation or stale player at lock.

### 7. Late-Swap Emergency
- **User state:** Breaking news after some games locked; minutes to react.
- **Primary anxiety:** "What just broke and can I still fix it?"
- **Show:** Exactly what changed, which still-swappable slots are affected, the recommended swap.
- **Hide:** Everything not touched by the news.
- **Primary action:** Execute the right swap before the next lock.
- **Trust requirement:** Very high — acting on the system's read under extreme time pressure.
- **Jarvis behavior:** Emergency dispatcher. One change, one recommended action, the deadline, done.
- **Mobile behavior:** A single alert-to-action path; the swap pre-filled, confirmable in one tap.
- **Failure mode:** Slow, ambiguous, or false alarm → either a missed fix or eroded trust in alerts.

### 8. Research
- **User state:** Calm, exploratory, building a thesis with no immediate deadline.
- **Primary anxiety:** "Am I seeing the full picture, including what argues against me?"
- **Show:** The full case both ways, sources, history, comparisons, the evidence trail.
- **Hide:** Nothing by default — but keep it progressively disclosed, not a wall.
- **Primary action:** Reach a well-supported view (which may be "no view yet").
- **Trust requirement:** Moderate; the user is verifying, not delegating.
- **Jarvis behavior:** Research partner. Pulls evidence and counter-evidence, plays devil's advocate on request.
- **Mobile behavior:** Readable long-form with collapsible sections; full canvas on desktop.
- **Failure mode:** Confirmation bias enabled instead of challenged.

### 9. Academy
- **User state:** Learning the *method*, not making a live decision.
- **Primary anxiety:** "Do I actually understand why, or am I just copying?"
- **Show:** Worked examples, the reasoning spine, the autopsy of past decisions, definitions.
- **Hide:** Live-action pressure and real-money framing.
- **Primary action:** Build a transferable mental model.
- **Trust requirement:** Moderate; trust is in the *teaching*, not a pick.
- **Jarvis behavior:** Patient tutor. Socratic, checks understanding, connects to past autopsies.
- **Mobile behavior:** Lesson-sized chunks; one concept per screen.
- **Failure mode:** Teaching dependence on the tool instead of independent skill.

### 10. Founder Cockpit
- **User state:** Operator/owner view — running the product, not picking lineups.
- **Primary anxiety:** "Is the system healthy, honest, and improving?"
- **Show:** Calibration health, data freshness/quality, trust-claim compliance, revenue-experiment state, hard-stop status.
- **Hide:** Per-user decision noise; surface aggregates and exceptions.
- **Primary action:** Spot and act on the one operational risk that matters.
- **Trust requirement:** High on the integrity metrics — this is the honesty dashboard.
- **Jarvis behavior:** Chief of staff for the business. Reports exceptions, flags drift, never sugar-coats.
- **Mobile behavior:** Status tiles with exception drill-down; full ops view on desktop.
- **Failure mode:** Vanity metrics crowd out integrity metrics; drift goes unseen.

---

## D. The cognitive command palette

A small, fixed set of intents the user can invoke in any mode. Each command has an
**intent**, the **data it requires**, and the **output shape** it returns. The
palette is the user's lever on the system's reasoning — it is how agency
(Principle 6) becomes concrete. Every command maps onto Evidence Engine objects so
the answers are cases, not vibes.

| Command | Intent | Required data | Output shape |
|---|---|---|---|
| **Tell me what matters** | Cut to the highest-leverage decision/factor now. | Current slate/context, leverage ranking, deadlines. | Ranked short list (1–3), each with a one-line reason. |
| **What am I missing?** | Surface overlooked factors and blind spots. | The user's current focus + the full evidence set. | The 1–3 unconsidered items with why they matter. |
| **What would make this wrong?** | Show the live falsifier. | Active claim + its `Falsifier` set, observability/freshness. | The most-in-play falsifier(s) + downgrade effect. |
| **Compare the paths** | Lay out the real options side by side. | The candidate options + their cases. | A compact comparison: each path's edge, cost, fragility. |
| **Safe vs upside vs balanced** | Frame the risk posture explicitly. | Option set + variance/fragility per option. | Three labeled choices with the tradeoff each accepts. |
| **Show the evidence** | Unfold the supporting case. | The claim's `Evidence[]` with source/freshness. | The evidence list, sourced and freshness-stamped. |
| **Show the counterargument** | Unfold the case against. | The claim's `CounterEvidence[]`. | The disconfirming case, in good faith. |
| **What is the market missing?** | Find the non-consensus, defensible read. | Market/consensus state vs. internal estimators. | The divergence + why it may be real or priced. |
| **What is fragile here?** | Expose brittleness behind a confident read. | Verdict + fragility score + falsifier observability. | The shock(s) that break the case; confidence vs. fragility split. |
| **What should I monitor?** | Tell me the checkable signals to watch. | Observable falsifiers + freshness windows. | A watch-list with what to check and by when. |
| **What did I do last time?** | Recall the user's own prior decision in a like spot. | Personal memory of comparable past decisions + outcomes. | The prior decision, its reasoning, and how it resolved. |
| **Am I repeating a mistake?** | Bias/pattern check against own history. | Behavioral history + known-bias patterns. | The pattern named neutrally + an easy off-ramp (Principle 4). |
| **What is the disciplined move?** | The process-correct choice, not the exciting one. | Options + the user's stated rules/limits. | The disciplined recommendation + why it's disciplined. |
| **What is the no-play case?** | Make the argument for declining. | Claim + counter-evidence + thresholds. | The honest NO-PLAY argument, weighted equal to a PLAY. |

Design notes:
- Every command can return **"not enough to say"** — an honest null is a valid
  output, never padded into false confidence.
- Output shapes lean on Evidence Engine objects, so "Show the evidence" and
  "Show the counterargument" are literal renderings of `Evidence[]` /
  `CounterEvidence[]`, not regenerated prose.
- The palette is identical across modes; what differs is *default verbosity* (a
  Novice gets definitions, a Sharp gets the delta), per the mode contracts.

---

## E. Manipulation red-lines

"Think for people" is a strong claim and a dangerous one. The line between
*reducing load* and *manipulating* is the most important boundary in this
product. The test: **does the design serve the user's own considered interest and
leave them more able to decide, or does it serve our metrics by making them less
able?**

| Legitimate — think *for* people | Banned — manipulation |
|---|---|
| Compress complexity; surface the tradeoff that was buried. | Compress complexity to *hide* a tradeoff that argues against the action. |
| Default to the disciplined option, alternatives one tap away. | Make the profitable-to-us option the only easy door; bury the alternative. |
| Show `whatWouldChange` on every recommendation. | Present confidence with no disconfirming condition to look more certain. |
| Urgency only on a real, checkable deadline. | Manufactured countdowns, fake scarcity, "act now" with no real clock. |
| Name a bias pattern neutrally with an off-ramp. | Exploit the bias (loss-chasing prompts, streak-baiting) to drive volume. |
| Reward good process (a respected pass, a researched call). | Variable-reward loops, near-miss framing, dopamine-on-action. |
| Present NO-PLAY as a win with equal weight. | Suppress or shrink the no-play case because it lowers engagement. |
| Calibrate trust to the system's real uncertainty. | Inflate certainty to increase reliance (automation-bias farming). |
| Use the user's own history to help them decide. | Use their psychology against their own stated limits. |

Hard constraints that fall out of this (and are enforced in code/CI):

- **No gambling-psychology exploitation.** No variable rewards, near-miss
  framing, streak-baiting, or loss-chasing prompts anywhere.
- **No manufactured urgency.** A countdown requires a real, externally-defined
  deadline.
- **No false confidence.** Confidence is a qualitative band tied to the evidence;
  it is never inflated to drive action, and it always ships with its falsifier.
- **No tout/casino language.** The trust-claims scanner forbids a specific list of
  phrases; copy must pass it. (See `apps/web/lib/trust-claims.ts`.)
- **Agency is non-negotiable.** "I disagree" is always available and recorded;
  the disciplined default is never the only path.
- **No fabricated data or stats.** Unknowns are marked `(uncertain)`; the system
  says "not enough to say" rather than inventing comfort.

The single sentence the whole model must pass: *we reduce the user's cognitive
load and make the tradeoffs visible — we never manufacture confidence, never
exploit psychology, and never make the user less free to choose.*

---

## F. Relationship to adjacent systems

- **Evidence Engine** (`apps/web/lib/gse/evidence-engine.ts`) — supplies the
  cases the palette renders; "answer → reason → evidence" is literally
  `Verdict → rationale → Evidence[]`.
- **Signal Courtroom** (`apps/web/lib/courtroom/courtroom.ts`) — the original
  per-signal case the modes display; NO-BET is the canonical "let No-Play be a win."
- **Jarvis copilot** (`apps/web/lib/jarvis/*`) — each mode's "Jarvis behavior"
  formalizes the copilot's register and verbosity for that context.
- **Memory** (`apps/web/lib/memory/*`) — backs "What did I do last time?" and
  "Am I repeating a mistake?"; the bias check reads behavioral history.
- **Trust claims** (`apps/web/lib/trust-claims.ts`) — enforces the no-tout-language
  red-line programmatically across all copy.
- **Calibration** (`apps/web/lib/calibration*/`) — feeds the Founder Cockpit's
  honesty metrics and keeps confidence bands meaning what they say.

---

## G. Open questions / next work

- **Mode auto-selection accuracy** is heuristic; mis-selecting a mode is itself a
  failure mode, and the override path must stay frictionless. Needs usage data to
  tune `(uncertain)`.
- **Bias detection precision.** Naming a bias the user is *not* exhibiting is a
  trust cost; thresholds need empirical tuning before this is on by default.
- **Triage trust (Sunday Morning).** "No flag = safe to skip" is the highest-trust
  claim the product makes implicitly; it needs measured false-negative rates
  before users should rely on it. Treated as `(uncertain)` until validated.
- **Cross-mode continuity.** Carrying context as a user moves Research → Draft
  Night → Late-Swap within one session is designed but not yet measured for
  load impact.

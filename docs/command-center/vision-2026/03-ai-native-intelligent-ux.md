# Vision 2026 — AI-Native / Intelligent UX

> **Lane:** RESEARCH + DOC only. No source/test/config touched in either clone; no build, no
> paid API, no secret, no live switch. Every "we have X today" claim is anchored to a `file:line`
> or an audit/data-mesh citation; every "2026 bar" claim carries a web source.
>
> **Forward-looking, not a re-audit.** Grounds on the existing audit
> (`docs/command-center/audit-2026-06-09/`) and the proprietary-Rating R&D
> (`docs/command-center/data-mesh/`). This doc answers one question: **what do we ADD to make
> GSE feel like the most *intelligent* product of 2026 — a thing users INTERROGATE — without
> leaking the recipe and without breaking the trust-first / no-real-money / responsible-gaming
> reins?**
>
> **Tag legend:** `safe-now` (compliant, no live switch) · `founder-gated` (founder flips a
> switch / bumps a version) · `legal-gated` (needs legal/media sign-off) · `aspirational`
> (real but not safe-to-ship-now without R&D/data it doesn't have yet).
>
> **Clone legend:** **DEPLOY** = `C:/Users/Garrett/Sports` (launch target, narrower).
> **CANONICAL** = `C:/Users/Garrett/Sports-canonical-2026-06-03` (full platform).

---

## 0. Headline (the one paragraph)

GSE is **already past the starting line that most 2026 "AI features" never reach**: it ships a
production-grade, reveal-less, citation-enforced conversational engine (the **Model Court**, with
three interrogation modes and four audience lenses), a per-pick **"Ask the model why"** explainer,
a refusal taxonomy that treats refusals as first-class answers, a **numeric-claims guard** that
rejects any fabricated stat, and a **Claude spend governor** that meters every call. That is a
*rare* foundation — the audit calls the trust posture the "crown jewel"
(`audit-2026-06-09/00-EXECUTIVE-SUMMARY.md:30`). The gap to the 2026 bar is **not** "add a
chatbot." It is four things the best AI products do that GSE has the bones for but hasn't
finished: **(1)** make the conversation *discoverable and ambient* (today it's buried in a game
room and absent from the launch funnel's front surfaces), **(2)** make answers *generative-UI*
(render charts/tables/the factor breakdown inline, not just markdown prose), **(3)** make the
product *proactive* (surface "here's what changed / what to watch" before the user asks), and
**(4)** make every answer *inspectable* the way Perplexity made citations inspectable — clickable
source chips, confidence, and a visible "here's what I refused and why." Each of these can be
built **reveal-less** (results and grounding are public; weights, category math, and the Signal
layer's existence stay founder-only) and **safe-now** on top of code that already exists.

---

## 1. What we have TODAY (grounded) — the AI-native surfaces already in the tree

This matters because the 2026 recommendations are *increments on a real base*, not greenfield.

| Capability | Where it lives | Grounding |
|---|---|---|
| **Model Court** conversational engine — 3 modes (`ASK_THIS_GAME`, `ASK_THE_SLATE`, `EXPLAIN_FOR_MY_LENS`) | **BOTH** clones | `lib/intelligence-graph/model-court/answer.ts:98`; `prompts.ts:13-16` |
| **Audience lenses** — FAN / FANTASY / CREATOR / ANALYST reframing of the same answer | BOTH | `model-court/prompts.ts:207-224` |
| **Refusal taxonomy** — 6 first-class refusal kinds (betting-certainty, EV/Kelly, competitor-compare, thin-evidence, personal-advice, out-of-context), each with a templated alternative | BOTH | `answer.ts:195-224`; `prompts.ts:85-141` |
| **Citation enforcement** — every answer must carry a `(source: <kind> at <ISO-8601>)` ref or it fails policy and is never shown | BOTH | `answer.ts:96, 226-253` |
| **"Ask the model why"** per-pick explainer (PRO+) — grounded-only, policy-validated, cost-ledgered | **CANONICAL** (client `ask-why.tsx`); engine `pick-explainer/explain.ts` | `components/picks/ask-why.tsx:11`; `lib/pick-explainer/explain.ts:57` |
| **Numeric-claims guard** — extracts every stat-shaped number from generated copy and rejects any not grounded in the source payload | BOTH (canonical richer) | `lib/claude-api/numeric-guard.ts:1-40` |
| **Claude spend governor** — per-surface monthly budget, 4-tier thresholds, hard request-blocking, dual-write cost ledger on success *and* failure | BOTH | `answer.ts:127-134`; `lib/claude-api/cost-monitor.ts`; audit `00-EXECUTIVE-SUMMARY.md:175` |
| **Free-lane (Cerebras) dispatcher** — inert, per-surface allow-list, Anthropic fallback; model-court explicitly excluded until validated | BOTH | `lib/claude-api/free-lane.ts:1-25` |
| **Bias Mirror** — private, local-only decision-behaviour self-reflection (nothing sent/stored) | **CANONICAL only** | `components/bias-mirror/bias-mirror.tsx:1-30` |
| **Loss Autopsy** drafting — Claude-drafted post-loss analysis, founder-reviewed | **CANONICAL only** | `lib/loss-autopsy/draft.ts` (grep hit) |
| **Lenses on the slate / per-game room** — Model Court route mounted on game rooms | BOTH | `app/api/room/[gameId]/model-court/route.ts` |
| **Reveal-less public contract** — number + tier + human read only; weights/aggregation NEVER public; test-enforced | BOTH | `data-mesh/10-gse-rating-proprietary-architecture.md:326-353`; `__tests__/method-leakage-gate.test.ts` |
| **Per-item explainers / HelpLayer** across Rating, Player Lab, signals, receipts | CANONICAL | task ledger #26; audit `02-product-ia-ux.md:87` |

**Honest gaps in the base (grounded):**
- The Model Court is **mounted on the game room only** and is *absent from the launch funnel's
  primary surfaces* — the front door, the board, and pricing don't expose it. The launch
  (DEPLOY) clone's front door is still raw `bg-gray-950` with "no Reveal/cinematic"
  (`audit-2026-06-09/00-EXECUTIVE-SUMMARY.md:115`), so the *intelligent* surface a 2026 user
  expects on arrival is not on the path they actually walk.
- Answers are **markdown prose only**. There is no generative-UI rendering (the factor-breakdown
  bars, a line-movement sparkline, a calibration curve) *inside* an answer — even though those
  components already exist elsewhere in the app.
- The explainer/Model Court are **pull, never push** — nothing proactively says "the line moved,
  here's the read" or "this pick you follow just got gated."
- `pick-explainer`, `bias-mirror`, `loss-autopsy` are **CANONICAL-only** — the launch target has
  the Model Court core but not the richer interrogation surfaces (two-clones drift, the audit's
  dominant theme, `00-EXECUTIVE-SUMMARY.md:60`).

---

## 2. The 2026 bar (web-verified) — what "feels intelligent" now

Six patterns recur across the best 2026 AI products. Each row pairs the external benchmark with
**where GSE stands**.

| # | 2026 pattern | The bar (web-verified) | GSE today |
|---|---|---|---|
| 1 | **Copilot / task-aware workspace** | Microsoft moved Copilot from "a static text box" to a **task-aware workspace** that surfaces tools/controls for the task at hand, with **progressive disclosure** (clear answer first, structure + next steps as you refine). [MS 365 blog] | Model Court is a *panel in one room*, not an ambient workspace surface. **Partial.** |
| 2 | **Conversational data interrogation ("ask anything")** | "Ask questions in natural language… the system interprets intent, retrieves data, presents insights" — now treated as a **standard, not a premium feature** (ThoughtSpot, Snowflake Intelligence, Power BI). 4 layers: NLP intent → retrieval → response+viz → **context retention for follow-ups**. [OvalEdge; ThoughtSpot] | Model Court does intent→grounded-retrieval→answer with refusals. Missing: **follow-up context chains** and **inline viz**. **Strong core, incomplete surface.** |
| 3 | **Inspectable answers (citations + follow-ups)** | Perplexity: **5–10 inline citations**, numbered source chips you can open, **suggested follow-up questions** that deepen research, context kept across the chain — "the answer feels inspectable, not just polished." [Perplexity guides] | GSE *enforces* citations in policy but renders them as inline text `(source: … at …)`, **not clickable chips**, and offers **no suggested follow-ups**. **Behind on presentation.** |
| 4 | **Generative UI** | Agents render **charts, tables, dashboards on the fly** by connecting a tool-call result to a component; "show your work" — visualize tool calls/decision steps to **kill the black-box feeling**; streaming + progressive disclosure. [AI SDK; CopilotKit; Vercel Academy] | Answers are prose. The components to render (factor bars, sparklines, calibration curve) exist but aren't wired into answers. **Gap — but a reveal-less-friendly one (render results, not weights).** |
| 5 | **Proactive / anticipatory insight** | 2026 = "**ambient and highly personalized agents** that proactively surface insights"; anticipatory UX "suggests actions before users explicitly ask." [Cresta; Salesforce; JEG] | GSE is pull-only. No "what changed / what to watch" digest, no follow-pick alerts on the public path. **Gap (ELITE already has `canGetAlerts`).** |
| 6 | **Trust / transparency as the differentiator** | "**88% of product leaders** say trust frameworks will be a core differentiator" (McKinsey via Smashing); layered disclosure (summary → more on demand); **confidence indicators**; publish **hallucination rate** + **successful-fallback rate**; be upfront about limits. [Smashing; ParallelHQ] | **GSE's strongest axis.** Calibration is evidence-only and can't auto-apply; numeric-guard blocks fabricated stats; refusals are first-class. Missing: **surfacing** these as user-visible trust artifacts (a confidence chip on each answer; a public "fallback/refusal" honesty stat). **Ahead on substance, behind on display.** |

**The synthesis:** GSE is *substance-ahead, surface-behind*. The 2026 winners didn't out-think
GSE on trust; they **out-presented** it — clickable citations, inline viz, follow-up chains,
proactive nudges, and confidence you can see. That is the whole roadmap below, and almost all of
it is **safe-now** because it exposes *results and grounding*, never the recipe.

---

## 3. The thesis: "Interrogate the intelligence, never the recipe"

The founder's reins demand a specific shape of AI-native: **maximally interrogable on results and
reasoning-about-evidence, permanently opaque on method.** The good news — this is *exactly* what
the Model Court system prompt already enforces: it answers by **citing the attached evidence
refs**, refuses EV/Kelly/win-rate/certainty/competitor questions, and uses "the model read" not
"we believe" (`model-court/prompts.ts:29-79`). The recipe (category weights, aggregation function,
the Signal layer's *existence*) is never in the answer's context to begin with, so the model
*cannot* leak what it was never given.

**The reveal-less interrogation contract (proposed, extends the existing public contract in
`data-mesh/10-…:326-353`):**

| A user CAN interrogate (safe-now) | A user can NEVER extract (enforced) |
|---|---|
| "Why did the engine surface / gate this?" → cites the factor bars + gate reason | Category **weights** or the aggregation formula |
| "What would change the read?" → the pre-mortem | The **normalization constants** / per-position weight vectors |
| "How fresh / how covered is the evidence?" → evidence-health grade, books reporting | The **Signal layer's existence** ("Ch 87 is an input") |
| "How calibrated is this confidence band?" → the reliability curve | Raw EV / Kelly / fair-probability / win-rate figures |
| "Show me similar settled picks" → the Public Ledger | Any number not grounded in the attached payload (numeric-guard) |
| "Explain it for *me*" (fan / fantasy / creator / analyst lens) | A bet recommendation or bankroll/stake advice |

This contract is the product's signature: **the most interrogable engine in sports, and the least
revealing.** No competitor pairs those two. That *is* the moat the data-mesh doc describes
(`data-mesh/10-…:265-279`), expressed as UX.

---

## 4. Recommendations — concrete, tagged, mapped to tooling

Ordered by leverage. Each item: what it is, the 2026 pattern it satisfies, the grounded base it
builds on, the tag, and the concrete tool/setup.

### 4.1 — Promote the Model Court from "room panel" to **ambient copilot** `safe-now`
**Pattern:** copilot / task-aware workspace (§2.1), conversational interrogation (§2.2).
**Base:** engine exists in BOTH clones (`answer.ts:98`); only mounted on `/room/[gameId]`.
**Build:** a persistent, dismissible **"Ask the Edge"** affordance available from the board, a
pick card, the Rating page, and the front door — not just the game room. Each entry point passes
its own grounded context (slate vs game vs rating) into the *same* engine and the *same* refusal
policy. This is the Microsoft "task-aware workspace" move: the assistant follows the user's task
surface instead of living in one room.
**Why high-leverage:** it closes the single biggest gap — the intelligent surface is absent from
the funnel the launch user actually walks (`audit 00-EXECUTIVE-SUMMARY.md:115`). Pure
presentation/routing work on an existing engine; **no recipe exposure** (context is the same
grounded payload).
**Tooling:** none external. **Founder note:** on DEPLOY this also needs the room/board surfaces it
mounts on; sequence after the launch-blocking DB/cron items (`00-EXECUTIVE-SUMMARY.md:110-119`).

### 4.2 — **Clickable citation chips + suggested follow-ups** (Perplexity-grade inspectability) `safe-now`
**Pattern:** inspectable answers (§2.3).
**Base:** citations are *already enforced* as `(source: <kind> at <ISO>)` text (`answer.ts:96`);
follow-up scaffolding does not exist.
**Build:** (a) parse the enforced citation refs and render them as **numbered, openable source
chips** (kind + observed-at + "what this is") instead of inline parenthetical text — the
Perplexity pattern of "make the answer feel inspectable." (b) After each answer, render **2–3
suggested follow-ups** drawn from a *curated, reveal-safe* set ("What would change this read?",
"How calibrated is this band?", "Show similar settled picks") — never an open generator that could
wander toward recipe.
**Why:** Perplexity's defining UX is inspectability + follow-up chains; GSE has the citations but
hides them as plain text. Low effort, high "this is intelligent" payoff.
**Tooling:** none external. **Reveal-less:** follow-ups are a fixed allow-list, so they can't probe
the formula.

### 4.3 — **Generative UI inside answers** (render the breakdown, not the math) `safe-now` / partly `founder-gated`
**Pattern:** generative UI / "show your work" (§2.4).
**Base:** answers are prose (`ask-why.tsx:65` renders `whitespace-pre-wrap`); the viz components
(factor bars, line-movement, calibration curve) already exist in the app
(`audit 02-product-ia-ux.md` Player-Lab + intelligence components).
**Build:** when the engine references a factor breakdown / line movement / reliability band, render
the **existing component inline** beneath the prose (the AI-SDK "tool-call result → component"
pattern, done server-side and deterministically — not a free-form agent). The answer *shows* the
factor bars rather than describing them.
**Reveal-less line:** render **bars and percentiles** (already PRO-gated, `data-mesh/10-…:388`),
**never the weights** that produce them. Showing the *output* breakdown is the same disclosure the
PRO tier already permits; showing the *weights* is the permanent never. So the **bars are
`founder-gated` to PRO+** exactly as today; the **calibration curve and evidence-health are
`safe-now`/public** (already public per `data-mesh/10-…:347`).
**Tooling:** Vercel AI SDK generative-UI pattern as the architecture reference (not a dependency
decision here); the components are in-repo.

### 4.4 — **Confidence + honesty chips on every answer** (trust made visible) `safe-now`
**Pattern:** trust/transparency differentiator (§2.6).
**Base:** calibration (Brier + reliability buckets, 30-sample gate, evidence-only) already computed
(`data-mesh/10-…:432`); refusals already first-class.
**Build:** (a) a small **confidence/grounding chip** on each answer: "Grounded in N evidence refs ·
evidence health B · calibrated band 68%" — the 2026 "confidence indicator" pattern, drawn from data
the app already has. (b) A public, product-level **honesty stat**: "the engine declined to answer X%
of questions it couldn't ground" — i.e., surface the *successful-fallback rate* the 2026 trust
literature names as a key metric. GSE *has* the refusal events; it just doesn't count them publicly.
**Why:** the web bar explicitly names hallucination-rate and successful-fallback-rate as the trust
KPIs to *show* (Smashing/ParallelHQ). GSE's refusal taxonomy makes it one of the few products that
can show fallback rate honestly. This converts the audit's "crown jewel" substance into a *visible*
differentiator.
**Tooling:** **PostHog / Amplitude** (both available as MCP integrations) to instrument
answer-shown vs refusal events and compute the public fallback rate. *Setup:* connect the analytics
MCP; define `model_court_answer` / `model_court_refusal` events. **Reveal-less:** counts and bands
only, no method.

### 4.5 — **Proactive "What changed / What to watch" digest** `safe-now` (free read) + `founder-gated` (push)
**Pattern:** proactive / anticipatory insight (§2.5).
**Base:** ELITE already has `canGetAlerts` (`data-mesh/10-…:392`); line-movement + gate-decision
data exist; nothing proactive is surfaced publicly.
**Build:** a daily, grounded **"Slate Brief"** generated by the *same* Model Court (mode
`ASK_THE_SLATE`) — "3 reads moved, 2 games gated, evidence thin on N" — rendered as a pull surface
for FREE (`safe-now`) and as a **push** (email/in-app) for ELITE (`founder-gated`, since it's the
paid alert tier). This is the "ambient agent that surfaces insight before you ask" pattern, kept
honest: it reports *what the engine did*, never a bet to make.
**Tooling:** **Klaviyo** (MCP available) for the ELITE email push; **PostHog** for who-follows-what
triggers. **Reveal-less:** the brief reports gate decisions + Edge Index + evidence health, never
weights. **Responsible-gaming:** the brief must carry the same no-recommendation, helpline-footer
posture as the rest of the product (and reconcile the helpline-number conflict the audit flagged,
`00-EXECUTIVE-SUMMARY.md:121`) — *legal-gated* on the messaging copy.

### 4.6 — **Personalized lens memory** (the answer adapts to who's asking) `safe-now`
**Pattern:** personalization / adaptive UI (§2.5).
**Base:** the four lenses (FAN/FANTASY/CREATOR/ANALYST) already reframe answers
(`prompts.ts:207-224`) but the lens is **chosen per-call**, not remembered.
**Build:** let a signed-in user **set a default lens** (a fan sees no betting language; an analyst
sees more raw signal) and persist it. This is "anticipatory UX" at its safest — the system adapts
*presentation*, never the underlying number, and the FAN lens is a **responsible-gaming asset**
(it strips betting framing by design, `prompts.ts:219-220`).
**Tooling:** existing auth/profile; no external dependency. **Reveal-less:** lens changes tone and
which *public* facts surface, never the math.

### 4.7 — **Port the canonical interrogation surfaces into DEPLOY** `founder-gated`
**Pattern:** consolidation (the audit's dominant theme).
**Base:** `pick-explainer`, `bias-mirror`, `loss-autopsy` are **CANONICAL-only** (§1); DEPLOY has
the Model Court core but not these.
**Build:** decide whether the launch target inherits the richer interrogation surfaces (the
explainer is the highest-value: per-pick "ask why" is the most natural interrogation entry point).
This is a **port + schema-sensitive merge**, exactly the cross-clone promotion the audit says to do
deliberately with a parity check (`00-EXECUTIVE-SUMMARY.md:138-142`) — hence `founder-gated`, not
auto.
**Tooling:** none external; this is a code-promotion decision, out of this doc's write-lane.

### 4.8 — **"Show your work" reasoning trace (evidence walk, not chain-of-thought)** `safe-now`
**Pattern:** generative UI "show your work" / black-box-killer (§2.4).
**Base:** the engine already assembles a grounded context (`answer.ts:271-296` builds the node
context: edge index, gate decision + reason, evidence health, books reporting, line movement).
**Build:** render that assembled context as a compact, expandable **"what the engine looked at"**
trace beneath an answer — the evidence walk, *not* the model's hidden reasoning. This satisfies the
2026 "visualize the steps to kill the black-box feeling" bar while staying reveal-less: it shows
*inputs and gates*, never *weights*. It's essentially surfacing the prelude payload the engine
already constructs.
**Reveal-less caution:** show the **evidence list and gate reasons**, never the per-factor *weight*
or the order of operations that would let someone reconstruct the aggregation. The line is: "here
are the facts the engine considered" (safe) vs "here is how it combined them" (never).

### 4.9 — **Voice / multimodal ask (read-only)** `aspirational`
**Pattern:** multimodal interfaces (§2.5; MS Copilot real-time voice).
**Note:** 2026 trend is real-time voice + multimodal, but for GSE this is *aspirational* — it adds
surface area before the launch-blocking items are closed, and voice answers raise the
responsible-gaming bar (spoken "reads" feel more like advice). Flag it as a post-launch explore,
not a now-build.

---

## 5. Sequencing (honest about launch reality)

The audit is unambiguous: nothing ships until the four launch-blockers close (DB+ingestion, cron
vs freshness, migrate-in-build, pricing reconcile — `00-EXECUTIVE-SUMMARY.md:110-119`). The
AI-native work below assumes those are done.

| Wave | Items | Tag | Rationale |
|---|---|---|---|
| **Wave 1 (post-launch, presentation-only)** | 4.2 citation chips + follow-ups · 4.4 confidence/honesty chips · 4.8 evidence-walk trace | `safe-now` | Pure rendering on data/engine that already exist; converts substance into visible intelligence; zero recipe risk. |
| **Wave 2 (ambient surface)** | 4.1 ambient "Ask the Edge" · 4.6 lens memory | `safe-now` | Routes the existing engine onto the funnel surfaces; personalization that adapts presentation only. |
| **Wave 3 (generative UI + proactive)** | 4.3 inline viz (PRO bars `founder-gated`; curve `safe-now`) · 4.5 Slate Brief (FREE read `safe-now`; ELITE push `founder-gated`/`legal-gated` copy) | mixed | Higher build cost; the proactive push touches paid tier + messaging compliance. |
| **Wave 4 (consolidation + explore)** | 4.7 port canonical surfaces into DEPLOY (`founder-gated`) · 4.9 voice (`aspirational`) | gated | Cross-clone merge and net-new modality; deliberate, not automatic. |

---

## 6. Guardrails this roadmap must keep (non-negotiable)

1. **Reveal-less by construction.** Every new surface renders *results, grounding, and
   evidence-walk* — never weights, constants, aggregation, per-position vectors, or the Signal
   layer's existence. The method-leakage test gate (`__tests__/method-leakage-gate.test.ts`) must
   extend to cover every new AI surface.
2. **Refusals stay first-class.** No new entry point may bypass the refusal taxonomy
   (`answer.ts:195-224`). Certainty / EV / Kelly / win-rate / competitor / personal-advice all
   refuse, everywhere, by the same policy.
3. **Numeric-guard everywhere.** Any AI-generated copy on any new surface runs through
   `numeric-guard.ts` — a single fabricated stat is "a brand-killing event" under "math you can
   read" (`numeric-guard.ts:4-8`).
4. **Cost-governed.** Every new Claude surface registers a budget surface + dual-write cost ledger
   like the existing ones (`answer.ts:127-134, 358-386`); none ships ungoverned.
5. **No real-money / chance / recommendation.** No new surface recommends a bet, sizes a bankroll,
   or implies certainty. The FAN lens is the model for the safe default. Helpline + responsible-play
   footer travels with every proactive/push surface (and the helpline-number conflict gets resolved
   first — `00-EXECUTIVE-SUMMARY.md:121`, *legal-gated*).
6. **Human-gated promotion.** Any cross-clone port (4.7) follows the audit's one-way
   canonical→deploy checklist with a CI parity check (`00-EXECUTIVE-SUMMARY.md:138-142`); no
   autonomous schema/recipe change.

---

## 7. Concretely-available tooling map (for the items above)

| Item | Tool (MCP available this session) | Setup / gate |
|---|---|---|
| 4.4 honesty stat, 4.5 follow-trigger | **PostHog** / **Amplitude** (analytics MCP) | Connect MCP; define `model_court_*` events; compute public fallback rate. `safe-now`. |
| 4.5 ELITE proactive push | **Klaviyo** (marketing MCP) | Connect MCP; ELITE-only list; responsible-play footer. Push is `founder-gated`; copy `legal-gated`. |
| 4.1/4.3 surface design + prototyping | **Figma** (design MCP) | Prototype the ambient "Ask the Edge" + answer-with-viz before code. `safe-now`. |
| roadmap tracking | **Linear / Asana** (ops MCP) | File the waves as tracked work. `safe-now`. |
| copy review | **brand-voice** + **legal:compliance-check** skills | Run every new AI-surface string through brand-voice + a compliance check before ship. `safe-now`/`legal-gated`. |
| 4.3 generative-UI architecture | Vercel AI SDK generative-UI pattern (reference) | Architecture reference only; components are in-repo. Founder decides any dependency. |

> All paid/live actions (sending email, flipping ELITE push, any analytics that writes) remain
> founder/legal-gated. This doc proposes; it flips nothing.

---

## 8. Sources

**Internal (grounded `file:line` / doc):** see citations inline above — principally
`lib/intelligence-graph/model-court/answer.ts`, `…/prompts.ts`, `components/picks/ask-why.tsx`,
`lib/pick-explainer/explain.ts`, `lib/claude-api/numeric-guard.ts`, `lib/claude-api/free-lane.ts`,
`components/bias-mirror/bias-mirror.tsx`; `docs/command-center/audit-2026-06-09/00-EXECUTIVE-SUMMARY.md`,
`…/02-product-ia-ux.md`; `docs/command-center/data-mesh/10-gse-rating-proprietary-architecture.md`.

**External (web-verified 2026 bar):**
- Microsoft 365 Copilot — task-aware workspace + progressive disclosure (microsoft.com/microsoft-365/blog, 2026-05-28)
- Microsoft Design — "A simplified system" (AI-first design systems) (microsoft.design)
- CopilotKit — Generative UI / agent-powered interfaces (copilotkit.ai/generative-ui)
- Vercel AI SDK — Generative User Interfaces; "show your work" tool-call→component (ai-sdk.dev; vercel.com/academy)
- Perplexity — inline citations (5–10), openable source chips, suggested follow-ups, inspectable answers (perplexity.ai/hub/blog; texta.ai/blog/perplexity-ai-overview-complete-2026-guide)
- OvalEdge / ThoughtSpot — conversational analytics 2026 (4-layer NLP→retrieval→viz→context; "standard not premium") (ovaledge.com; thoughtspot.com)
- Smashing Magazine — psychology of trust in AI; confidence indicators; hallucination & fallback-rate metrics (smashingmagazine.com, 2025-09)
- ParallelHQ — Designing for AI Trust: 2026 transparency best practices (parallelhq.com/blog/designing-ai-transparency-trust)
- Cresta / Salesforce — 2026 = ambient, proactive, personalized agents (cresta.com/2026-predictions; salesforce.com)
- JEG / Codewave — predictive / anticipatory UX 2026 (jegdesign.com; codewave.com)

---

*End. No source, test, config, env, or live switch was modified to produce this document. Every
proposal is tagged; nothing here flips a money/legal/recipe switch. Built on the existing audit and
data-mesh R&D, not a re-audit.*

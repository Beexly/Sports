# Grok Bot Galaxy — Complete Review

**Reviewed:** 2026-09-24 (two passes)
**Source:** `Beexly/autonomous-revenue-engine`, branch `notes/grok-bot-galaxy`, commit `41c55f4` (250 files)
**Collected:** 2026-09-23 by Hermes (Minis) from x.ai's own surfaces — event page, product pages, 91 news posts, 10 guides, 81 marketplace templates with embedded agent definitions
**Framing:** competitive intelligence and pattern reference. Not a product. Nothing here publishes without human approval. (Per `REPO-NOTES.md`.)

---

## 1. Integrity check

The corpus's corporate backdrop was independently verified against live sources on 2026-09-24:

- **SpaceXAI LLC** (formerly xAI) is a SpaceX subsidiary since February 2026 (SpaceX acquired xAI at a ~$250B valuation; rebranded as SpaceXAI in July 2026).
- **SpaceX closed the $60B Cursor acquisition on August 14, 2026** — REPORTED by gncrypto, tradingkey, Tesla Oracle, and others, all citing a SpaceX Form 8-K (389,289,254 Class A shares; merger sub X67 Inc.; Anysphere/Cursor surviving as a wholly owned subsidiary). INTEGRITY NOTE: the primary SEC filing was NOT opened in this review, and one outlet (Archynewsy) disputes the deal entirely, claiming SpaceX remains private. Treat "8-K confirmed" as reported, not verified, until someone opens the filing on EDGAR.
- In August 2026 OpenAI announced it will stop providing its models to Cursor, citing distillation concerns.

The package is not fabricating its context. Counts below were verified directly against the branch (API + git), not taken on trust.

---

## 2. Verified inventory

| Asset | Count | Notes |
|---|---|---|
| Marketplace agent definitions | 81 files | 77 carry the full system prompt |
| Production prompt text | 138,766 chars | Extracted from Next.js page payloads (`memories[]`), invisible in the marketplace UI |
| Workshop transcripts | 61,506 words | 10 sessions; YouTube auto-captions — product/person names badly garbled, see `data/caption-corrections.json` |
| News posts | 91 (66,010 words) | Source extracts as plain text |
| Guides | 10 (13,717 words) | Role guides, Aug 15 → Sep 18 |
| Named template creators | 45 | 8 notable externals: Lenny Rachitsky, Hiten Shah, Kent C. Dodds, Claire Vo, Sawyer Merritt, Matt Van Horn, Lauren Tan, This Week in AI |
| Catalogue metadata | 393 skills, 127 routines, 304 integrations | Most common integrations: Notion 18, Slack 11, Google Sheets 7, Linear 6 |
| One-click install links | 137 | 81 template links (`/bot/<token>`) + 56 use-case links; tokens **untested** |
| Metrics ledger | 24 entries | Every number carries its source (`data/metrics-ledger.json`) |
| Timestamped quotes | 37 | `analysis/quotes.md` |
| Use cases | 56 across 9 categories | Engineering 5, Customer Success & Support 4, Life & Leverage 4, Recruiting & People 4, Operations & Finance 5, Sales 10, Product 5, General 6, Marketing 13 (`data/use_cases.json`) |

**The event:** Grok Bot Galaxy, Sep 15–17, 2026, The Howard, 661 Howard Street, San Francisco, 8:45am–6:00pm PT, livestreamed. Ten role workshops (~5.5 hours); the three full-day X broadcasts (~27.75 hours total) were **not** transcribed — roughly 80% of the event's runtime exists only there.

---

## 3. The prompt corpus — the #1 asset

81 marketplace templates were fetched; 77 include the complete agent definition. This is the most reusable material in the package.

### The dominant spec pattern

Across all 77 prompts, the structure that repeats is:

**one job → anti-jobs → first-run setup interview → permission lines → output format → escalation rules**

Pattern frequencies across the corpus:

| Pattern | Count | Meaning |
|---|---|---|
| "Never …" | 60 | Hard prohibitions are near-universal |
| Routines | 25 | Standing schedules baked into the template |
| "Do not …" | 24 | Second prohibition style, often output formatting |
| Approval gates | 23 | Explicit human sign-off |
| Tables | 20 | Output-format instructions |
| Voice | 19 | Writing in the operator's voice |
| "Always …" | 18 | Standing permissions |
| `FIRST RUN` | 14 | Scripted onboarding interview on first contact |
| "One job" | 13 | Scope statement opening the prompt |
| "Anti-job" | 12 | Explicit statement of what the bot is *not* for |

### Operating rules that generalize

- **Approval is per-send, not per-category.** "The operator's explicit go for that specific message" appears verbatim; a standing approval is explicitly not a go.
- **Agent-to-agent sends are still sends.** A handoff to another bot counts as an external action in the strictest templates.
- **Evidence bars are numeric.** Where a bot recommends, it must cite live data, a mechanism, and a reason-now; anything less is labeled a lead.
- **First-run interviews are standard.** The bot asks setup questions on first contact and saves answers to memory — the template's way of surviving the loss of the creator's private context.
- **Every serious bot has a never-list.** Agency is granted, then bounded in prose.

### The six best examples

1. **Haggle Bot — Daniel Gartshein (5,983 chars).** The most complete agent spec in the material. Opens with scope + anti-jobs ("never spend money, never sign, never send a PO"), then a scripted first-run interview (connect Ramp or paste bills → name the Google Sheet destination → confirm renewal window, default 120 days → name the approver → optional Slack/Notion sources). Operating rules worth quoting:
   - *"LEAD WITH THE MONEY — every finding opens with: TODAY: what we pay now, annualized, from live data, with source. SAVE: realistic savings and mechanism, with confidence. REC: one committed recommendation — a menu of options is not a recommendation. NEXT: what you've already set in motion."*
   - *"A real opportunity has a dollar figure traced to live spend data, a specific mechanism, and a reason it's actionable now… Anything less is a lead — label it, name the missing data, and go get it rather than assuming."*
   - *"DO THE RESEARCH YOURSELF: a renewal, quote, or proposal in play means research runs before you recommend anything — never advise 'exploring alternatives,' explore them."*
   - *"A rejected draft is rebuilt from the plan, never edited."*
   - *"Sending a draft to anyone, including another agent, is a send that needs the operator's explicit go, per send."*
2. **Engineer Bot — Lingxi Li (4,505 chars).** The fleet-supervisor pattern: boards work, launches cloud agents on a named repo, watches PRs on a 30-minute cadence, only asks for a merge.
3. **Pitch Deck Coach — Hiten Shah (6,877 chars).** Longest prompt in the corpus; a coaching-loop design, not a one-shot critique.
4. **Product Idea Stress Test — Hiten Shah (5,399 chars).** Evidence-for/against framing: what must be true, the assumption most likely to kill the idea, what to test next.
5. **Stalk Bot — Shub Gaur (3,190 chars).** Competitor watching: its own research email, walks onboarding on video, watches pricing/changelog/jobs/X, never posts or contacts anyone. (See §8.)
6. **Import Bot — Shub Gaur.** Migrates a user's setup from Claude Cowork, Codex, ChatGPT, OpenClaw, and Hermes — and *scrubs secrets before anything is saved*. A competitive-switching tool shipped as a template.

### Data quirks (read before mining)

- A literal `$42` appears as memory 1 in 32 templates — a sanitization placeholder, **not a price**.
- `installCount` is 0 across all 81 templates — no popularity signal exists.
- 7 of 81 templates have no prompt; `instructions` is empty for most — the substance is in `memories[]`.
- YouTube view counts are 33–192 — the recordings are lifecycle assets for the email list, not public marketing.

---

## 4. The Jenny pattern — agents improving agents

Three independent instances of self-improvement loops appear across the sessions:

- **Support:** "Grok Bots can coach other Grok Bots… identify gaps in the knowledge system, fill those gaps, and feed what they learn back." Weekly leadership summary of where AI answers fall short.
- **Engineering:** **Jenny**, a non-coding ops bot, holds 5am 1:1s with every engineer bot, runs postmortems when a bot underperforms, and updates the shared playbook.
- **Post Sales:** a weekly **self-improvement scan** audits the whole system for manual work that should be automated; a voice-learning loop diffs drafts against what was actually sent.

The Founders session states it plainly: *"have a bot that just exists to optimize your other bots"* and *"these bots actually compound."* This is the mechanism by which a bot fleet gets better — and the optimizer seat is the one role with no one sitting in it.

---

## 5. The chief-of-staff pattern

Six of ten speakers route everything through a single front bot, even with a large team behind it:

- Engineers: chief of staff routes to Craig / Steve / Hogan
- PMs: Cora routes to Emily (who manages five engineering bots) and the rest
- SDR: "I only talk to my chief of staff… I've offloaded all that context."
- Post Sales: Gus manages ~10; "I'm a team of one to two, depending on the day."
- MarOps: OP1 synthesizes what Fiser collects
- Sales: Olive handles day-to-day

The sharpest articulation is the SDR session's: **messaging many bots is itself a context-switching tax** — the exact problem the front bot removes. Companion claim from four sessions: **named, scoped bots beat one general agent.**

### Design vocabulary (from the Sep 3 design essay)

- **Five primitives:** Bots (persistent agents with identity, memory, runtime, tools), Chats (conversational surface), Prompts (one-off, saved as Skills, triggered as Routines), Tools (APIs, connectors, shell, computer use), Artifacts (durable outputs).
- **Capability vs context boundary:** Tools and Skills are account-scoped; Memory and Routines are bot-scoped. This is the product's conceptual spine — and explains why the chief-of-staff pattern works.
- **Reviewer agent:** a separate agent checks proposed actions against natural-language allow/block lists and can allow, block, or escalate.
- **Avatar states:** idle · working · waiting · blocked · thinking · done.
- **Three computer-access levels:** status → preview → takeover.

---

## 6. Packaging and revenue mechanics

### The ladder

| Plan | Grok Bot | Notes |
|---|---|---|
| Free | ✗ | Grok 4.6, Imagine, Build, connectors included |
| SuperGrok ($30/mo) | ✓ | Cheapest tier that includes it |
| SuperGrok Plus ($100/mo) | ✓ | Higher usage, 1080p video, peak priority |
| SuperGrok Heavy | ✓ | Highest individual usage |
| Business | ✗ *(per matrix)* | Team seats, billing, RBAC |
| Enterprise | ✗ *(per matrix)* | SSO/SCIM, audit, CMEK |

**The surfaces disagree:** the pricing matrix shows Grok Bot only in the three SuperGrok columns, while the Sep 3 post says enterprises get it with governance controls, free for two weeks, activated from the admin dashboard. The likely resolution: entitlement attaches to Grok/Cursor subscriptions (including enterprise agreements) rather than being a line item on the public grid. **Do not quote the pricing page as the whole story.** Cursor Pro / Pro+ / Ultra and Cursor Teams Standard & Premium also gate it — the public pricing page doesn't show that at all.

### The three monetization levers

1. **Tier upgrade.** Grok Bot is the reason to move Free → SuperGrok ($30) or SuperGrok → Plus ($100) — the first non-model capability gated to paid tiers.
2. **Seat expansion.** Enterprise customers "can invite their whole organization, **including people without an existing seat**" — an explicit land-and-expand motion.
3. **Usage, deliberately decoupled.** "Grok Bot comes with its own usage, separate from your Grok and Cursor plans, so anything you hand off to a Bot won't count against your existing usage." Removes the fear of burning a scarce allowance; creates a clean second meter. Overage billed on token cost.

**No standalone Grok Bot SKU, no per-bot price, no published token rate exists anywhere in the corpus.**

### Unit economics (as stated, all sourced in the ledger)

| Figure | Value | Source |
|---|---|---|
| Grok Bot cost per support resolution | $0.20–$0.30 | Support case study |
| Traditional AI support tool | $1–$4 flat per resolution | Same |
| Procurement savings found by one bot | > $100,000 | Procurement post (Haggle Bot: 43 idle seats = $14,220; $85,662/yr unused SKUs; weekly tech order $14,629 → $6,143) |
| Support headcount avoided | ~200 people (175% ticket increase) | Support post |
| 99% of refunds automated | — | Support post |
| 2,000+ PRs by one engineer in a month | — | Engineering |
| 15x cheaper installs, 4x D7 retention | — | Mobile game guide |

The pattern in every proof point: **compare against the human or incumbent-tool alternative, expressed per unit of work** (per ticket, per install, per renewal) — never per token.

### Distribution: the marketplace is the growth loop

- 81 templates, 45 named creators, 393 skills, 127 routines, 304 integrations.
- Every template carries a **one-click install deep link** (`/bot/<token>`) — 137 captured. These are shareable artifacts that circulate outside x.ai.
- Templates are **recipes, not clones** — they carry skills, memories, and plugins but exclude personal memories, secrets, and custom code. Safe to share; the recipient must connect their own tools (which pulls them into the product).
- The creator list is the tell: seeding with newsletter authors and DevRel figures (Rachitsky, Hiten Shah, Kent C. Dodds…) is a **co-marketing motion** — their audiences get a bot, the platform gets distribution, the creator's name is the social proof.

**The loop:** guide → "here's the bot I use" → template → one-click install → recipient's bot needs connections and memory → they build their own → share as template → repeat.

### The five-move campaign (Aug 11 → Sep 22)

| Move | When | What it did |
|---|---|---|
| 1. Launch in beta | Aug 11 | Live to SuperGrok and Cursor paid tiers; enterprise waitlist; usage decoupled from day one |
| 2. Publish the playbooks | Aug 15 – Sep 11 | Ten role guides by named practitioners, each ending in "start with this bot" |
| 3. Widen access | Aug 26 | Included with all SuperGrok and Cursor Pro/Teams plans |
| 4. Land the enterprise | Sep 3 | Governance (access, network, audit), two weeks free, invite the whole org; named logos: Legora, Supermicro, ServiceTitan; claims "millions of bots" |
| 5. Prove it with numbers | Sep 4 + Sep 22 | Procurement savings post, then support-cost post — sequenced by buying center (finance, then ops) |
| Demand capture | Sep 15–17 | The Galaxy event: ten role workshops over the quantitative spine |
| Follow-up | Sep 21 | Recordings published + customer.io email routing back to the event page as the durable hub |

**The event is a demand-capture node, not the campaign.** Six weeks of publishing preceded it; two proof posts followed within a week.

---

## 7. Cross-session agreements and tensions

### Claims that recur across independent speakers

- The bot has **its own computer**, so it can use tools with no API (7 sessions)
- **Always on / 24-7 / close your laptop** (every session)
- **Memory is per bot** — which is *why* you have many named bots
- **Routines** (schedule/webhook/signal) turn one-off work into permanent automation
- **Share bots / marketplace** so a whole team works from the same templates
- **Guardrails:** read-only first, then writes, approvals before shipping
- **Named, scoped bots** beat one general agent
- **The human keeps judgment** — direction, architecture, relationships, final approval

### Real disagreements (useful, not noise)

| Tension | Positions |
|---|---|
| How many bots | Founders/PM/Marketing: build many, they compound. SDR: "way too many… more chaotic, does more harm than good." Support: start simple, no meta playbook yet |
| Autonomy vs approval | Founders/MarOps push maximum agency; Support insists read-only → writes → approvals |
| Routines cost | Sales: "set it and forget it." Founders: a 15-minute routine is 100 runs/day — expensive; prefer signals and webhooks |
| Playbook maturity | Marketing/PM present confident repeatable patterns; Support: "I don't think there's one meta or one clear playbook" |

### The canonical narrative arc (7 of 10 sessions, clearly a shared deck)

1. **Chat** — ask a question, get text
2. **Co-pilots** — the agent does a task, you babysit it
3. **Bots** — you delegate a whole job; it returns results, not text
4. **Staff function** — a team of bots, each with a job, coordinating

---

## 8. Stalk Bot vs the dossier repo — the clearest gap

The corpus's Stalk Bot (Shub Gaur) is a complete design for continuous competitor monitoring:

- **One research identity per competitor** — a neutral alias plus "Research," never a person or the user's company
- **13 modules per competitor**, run as pulses (not one-off research)
- **Every substantive pass ends in counterpositioning moves** — not "what changed" but "what we do about it"
- **Evidence bar:** their words over coverage over inference; every claim carries a link, a date, and a screenshot; never invent a feature, price, headcount, or quote
- **Voice:** analyst, not hype — no adjectives without evidence
- **Conduct:** read-only; never post, never contact competitor staff or customers, never use the human's login on a competitor product; on X read-only (never follow, like, repost, reply, post, or DM); if their terms forbid it, stop that module and name the clause
- Routines ship **disabled**; setup asks which to enable and confirms timezone

Against this, the existing competitive-intel repo (310 dossiers, 1,670 evidence files) is a **static launch kit**. The dossiers are the baseline the Stalk Bot pattern assumes — the missing piece is the pulse on top: scheduled delta-watches that close with counterpositioning.

---

## 9. What to steal, build, or fix — ranked

1. **Reviewer agent on outbound sends.** The corpus has a separate agent checking proposed actions against natural-language allow/block lists. Currently one mind is both actor and reviewer on high-stakes sends (Fanatics mail, X posts, Marketplace replies). A second-pass reviewer subagent is a structural upgrade.
2. **Dossiers → pulse system.** Turn the static intel repo into scheduled Stalk Bot-style pulses: delta vs baseline, evidence-linked, closing in counterpositioning. Never post, never contact, read-only.
3. **Kit five-move campaign.** The product and flyer exist; the missing moves are the guide/playbook sequence (each ending in a CTA to the thing), proof posts with per-unit numbers sequenced by audience, and a demand-capture event at the end.
4. **Per-unit proof numbers for Kit.** "$350 site vs $X/mo agency retainer" needs real client outcomes behind it before it's a claim. The corpus rule: per unit of work, against the incumbent, sourced.
5. **Voice bot from sent history.** The copy-rules doc is manual doctrine; the corpus pattern trains voice from sent email/Slack history. The sent replies are an unused training set.
6. **Cron audit.** The Founders warning applies directly: a 15-minute routine is 100 runs/day. Audit polling crons (kit-dm-watcher et al.) for what could be signal/webhook-driven instead.
7. **Import/migration offer for Kit.** Import Bot's lesson: competitive switching as a product. "We'll migrate your Wix/Squarespace site" instead of selling from scratch.
8. **QR destination upgrade.** The venue's QR coasters linked to *installable templates*, not a sales page. The walk-in flyer's QR could point at the interactive mockup generator instead of the pitch.
9. **The optimizer seat.** Jenny's role — one agent whose only job is improving the other agents (1:1s, postmortems, playbook updates) — has no one sitting in it.

---

## 10. Caveats, gaps, and what not to do

### Data-quality caveats
- Transcripts are YouTube auto-captions; "Grok Bot" alone has nine spellings — normalize before quoting or searching.
- The Marketing Operations transcript starts mid-sentence; its opening minutes are missing.
- Two MarOps bot names unresolved ("Fiser"; "owned" → likely "Ondes").
- Demo assets are fictional — Fly Low Airlines/Flylo, Northwind, XAIR. **Never present demo numbers as customer results.**
- No agendas, slide decks, attendance, or registration numbers were published.

### Known gaps
- **No Grok Bot price or token rate** published anywhere — only plan gating and support-ticket economics. Do not infer a price.
- **The three X broadcasts (~80% of runtime) are not transcribed** — needs an authenticated X session; they hold the interstitials, the cooking-segment hosts (Matt, Lauren, Roshan), build time, and Q&A.
- **Install-link tokens are unverified** — untested whether `/bot/<token>` redeems unauthenticated, whether tokens are per-recipient, or whether they carry referral attribution. The brief flags this as the highest-value unexplored thread.
- No competitor comparison beyond the $1–$4 support benchmark; no retention or churn data; no template ranking/curation/review policy; no Grok Bot API; no revenue figures of any kind.

### Boundaries (from REPO-NOTES.md)
- **Do not package or sell any of this** as an agent kit, prompt pack, or template product.
- Do not republish the transcripts or prompts as original content — third-party reference material.
- Nothing here is for publication without a human approve step.

---

## 11. Key quotes

- *"you can do things that don't scale except you can actually scale them"* — Founders
- *"have a bot that just exists to optimize your other bots"* — Founders
- *"these bots actually compound"* — Founders
- *"bots are meant to be multiplayer"* — Sales Engineering
- *"have one bot with one job"* — Sales
- *"crawl, then walk, then run"* — Support
- *"you can and should feel comfortable setting guardrails"* — Support
- *"treat them like interns"* — Engineers
- *"the human only connects with human when it's absolutely needed"* — Engineers
- *"the imagination gap"* / *"start with a voice dump"* / *"make it that living system"* — Post Sales
- *"we can finally build tools and not just rules"* — Marketing Operations
- *"almost like crafting a job description"* — Marketing (on writing bot specs)
- *"capabilities can be shared broadly while context remains with the role that needs it"* — Sep 3 design essay

---

## 12. File map (branch `notes/grok-bot-galaxy`)

| Path | Contents |
|---|---|
| `REPO-NOTES.md` | Framing, guardrails, known gaps |
| `AGENT-BRIEF.md` | Handoff manual: state, gotchas, next actions |
| `README.md` | Package guide |
| `analysis/under-leveraged.md` | What the first pass missed + the campaign reframe |
| `analysis/revenue-mechanics.md` | Packaging ladder, pricing, unit economics, distribution |
| `analysis/agent-prompt-corpus.md` | Analysis of the 77 production prompts |
| `analysis/launch-timeline.md` | The six-week campaign with sources |
| `analysis/cross-session.md` | Recurring claims, disagreements, gaps |
| `analysis/glossary.md` | Every product term, system, and named bot |
| `analysis/quotes.md` | 37 verbatim quotes with timestamps |
| `analysis/*.csv`, `*.json` | Term/tool/money/duration indexes |
| `agent-prompts/` | 81 readable agent definitions |
| `data/` | launch-timeline, metrics-ledger (24 sourced entries), packaging-matrix, install-links, creators, customers, sessions, use-cases, broadcasts, links |
| `source-extracts/` | 91 news posts + 10 guides as plain text |
| `sessions/` + `transcripts/` | 10 workshop briefs + 61,506 words of transcript (prose, 40-sec timestamped, verbatim audit) |
| `index.html` | Single-file dashboard over all of it |

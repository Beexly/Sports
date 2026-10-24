# Google Deep Research Prompt — Fleet Audit & Orchestration Architecture (v3)

Paste the whole block below into Google Deep Research. Attach `motif-systems-inventory-2026-10-07.md` (my full systems map) as a reference file if the tool allows uploads.

---

## Prompt

I am a one-man team running an AI agent fleet that builds and operates Galaxy Sports Edge (GSE), a sports-intelligence prediction engine. I need you to act as my chief of staff and systems architect. Your job has six parts, in this order: (1) audit what I have, (2) discover what I'm missing, (3) hunt down forgotten work, (4) establish one shared picture of the project, (5) design the orchestration, (6) define how the fleet runs day to day. Be thorough, be honest about trade-offs, and price everything — I am cost-sensitive and I do not spend without a cap.

### My pains (map your findings to these)

1. I am the courier — agents can't reliably reach each other without me carrying messages.
2. Work goes stale — sessions stall, PRs sit, inbox files never get answered, and nobody notices.
3. Cost control — I need per-agent spend caps and kill switches, not surprise bills.
4. Mobile command — I run my life from my phone; I need to steer agents from it.
5. Stranded work — I believe work hides in local workspaces; if it's not on the shared record, it didn't happen.
6. Trust — I don't trust first passes. Every recommendation you make must survive its own red team (see Rigor rules).

### Rigor rules (non-negotiable)

- Every factual claim carries its source (repo URL, docs page, or primary post) and a "last verified" date. Distinguish "I read the code" from "I read the marketing page" — say which one.
- For every system you recommend, include the strongest honest argument AGAINST adopting it. Steelman the status quo too: what breaks if I change nothing?
- Flag hype vs. reality explicitly. Star counts are not evidence.
- If you're unsure, say so. Never invent a feature, a price, or an integration.
- License-clean always: MIT preferred; never recommend bypassing auth, breaking paywalls, or copying code against its license.

### My known systems (start here; verify and expand)

On my side I have: Motif (my orchestrator/QC agent on a Linux VM), Hermes (my builder — OpenCode running on my phone via the Minis app), Google Jules (async coding agent, API-driven), OpenCode and Cursor coding agents, OpenDots (14 prompt-defined assistant dots on localhost), an Intel/OSINT Telegram bot (102 commands), and a GitHub repo used as the fleet message bus (`Beexly/agent-bus`) plus `Beexly/Sports` as the system of record. Attached is my full systems inventory — repos, scheduled jobs, connected services, credentials policy, standing rules. Treat it as the starting map, not gospel. Question it where it looks stale.

I also have **Grok 4.7, a Grok bot, Mimo, and Antigravity on my computer** — these were left out of the inventory. Research each one from zero: what it is, what it can do in an agent fleet, how it connects to other agents, where it fits, what it costs. Fold them into the architecture.

### PART 1 — Discovery research

Search GitHub, Hugging Face, docs, and the web for systems, repos, platforms, and features that could improve this fleet. I already know about Orca (agent orchestrator with mobile app), Paperclip (agent manager), and Hindsight (agent memory) — do not just repeat these back; go deeper and wider. For each category, answer the specific research questions:

1. **Agent orchestration** — Who can be the single project leader? Compare options (my current orchestrator, Orca, Paperclip-style managers, anything new) on: maturity, mobile control, cost enforcement, approval gates, crash/failure recovery, and fit for a one-man team. How does each handle an agent that dies mid-task?
2. **Inter-agent communication** — message buses, shared task boards, handoff protocols, blackboard systems. What do serious multi-agent setups actually use? How do they resolve conflicts when two agents disagree? What happens when the bus itself goes down — where's the single point of failure?
3. **Agent memory** — per-agent persistent memory, shared fleet memory, consolidation and forgetting. What are the memory-poisoning risks when agents write to shared memory, and how do real systems mitigate them?
4. **Evals & verification** — how do you know an agent did good work? QC gates, scoring bars, automated verification, replay of agent runs. (My fleet currently uses a human-set quality bar with an agent as QC gate — what's the state of the art beyond that?)
5. **Cost control & budgets** — per-agent spend caps, kill switches, cost attribution per task, cost dashboards. What exists off the shelf vs. what I'd have to build?
6. **Secrets & credentials** — how do multi-agent setups give agents the access they need without pasting raw keys around? Secret brokers, scoped per-agent tokens, short-lived credentials. (My rule: no raw keys in chat, files, or handoffs — the design must respect that.)
7. **Task tracking & no-backlog enforcement** — how do people keep 10+ agents from dropping work? What breaks at scale?
8. **Mobile command** — steering agents from a phone: what exists, what actually works, what's vaporware. (I need real mobile operability, not a demo.)
9. **Stale-work detection** — tools or patterns for finding forgotten, half-done, or orphaned work across repos and machines.

For everything: what it is, license, last activity (alive or abandoned?), cost with free-tier limits and paid tiers, self-hostable or not, which of my six pains it addresses, and a concrete fit assessment.

### PART 2 — The forgotten-work audit

Before any orchestration design, I need certainty that no GSE-related work is stranded, stale, or forgotten in anyone's workspace. You cannot see my machines — so give me the **methodology**: a complete, ordered audit procedure I (or my agents) can run across every workspace (my VM, my Windows box, every repo, the agent bus, Jules sessions, OpenDots, local checkouts). Include:

- Exactly what to look for in each location: unpushed commits, unmerged branches, draft PRs, inbox files never answered, sessions stuck awaiting feedback, todos never closed, local-only files, scheduled jobs with no owner.
- **Unknown-unknown detection**: how to find work that exists in NO inventory — diffing local trees against remotes, enumerating all branches across all repos, listing all scheduled jobs vs. documented ones, checking every agent's outbox for unacknowledged deliverables.
- How to tell "done" from "abandoned" from "in progress."
- A triage framework: finish / merge / delete / log-as-dropped-with-reason.
- **Interview questions for me** — things only in my head that the audit can't find on disk (e.g., "what did you ask an agent to do last week that never came back?").
- The output shape: a single "lost & found" register format.

### PART 3 — One shared picture

Produce the document that gets every agent on the same page **before** orchestration starts:

1. **Where the project is at** — current state of the GSE engine, the mind build, the wiring backlog, research corpus, and each active lane. Specific, no vibes.
2. **The goals** — restated as verifiable outcomes, ordered by priority for a one-man team.
3. **The steps** — the ordered step list from here to a working orchestrated fleet. Each step needs: definition of done, what blocks it (dependency map), and effort split (my minutes vs. agent-hours).
4. **Two horizons**: the first-72-hours plan (stabilize, stop the bleeding) and the 30-day plan (orchestrated).

### PART 4 — Orchestration architecture

Design the target state:

1. **Recommend ONE project leader** (human + system/agent). It does not matter to me which system or agent it is. Score the candidates in a **weighted matrix** against criteria derived from my six pains (weights must reflect a cost-sensitive one-man team), defend the winner, and keep the runner-up honest with its best case.
2. **Communication topology** — how every agent talks to every other agent and to me. Message formats, where state lives, handoff protocol, conflict resolution. Nothing gets lost, nothing gets double-worked, nothing gets forgotten. Include the single-point-of-failure analysis and its mitigation.
3. **The growth loop** — how the fleet gets smarter over time: shared memory, retrospectives, skill-sharing between agents, and how a lesson learned by one agent reaches all of them.
4. **Migration plan in phases** — ordered, each phase with an entry gate (don't start until X is true) and exit gate (don't proceed until Y is proven), each step reversible with a rollback note. Constraint: the fleet must keep producing throughout — no "shut everything down and rebuild" phases. No ripping out working systems on day one.
5. **Pre-mortem** — assume the migration failed six months from now. What are the three most likely causes, and what early-warning metric would have caught each?

### PART 5 — Operating cadence

Once orchestrated, how does the fleet run day to day? Design the rhythm for a one-man team:

- Morning standup: what the leader reports to me, in what format, how long it takes me to read.
- End-of-day: what gets logged, where, and what "all clear" looks like.
- Escalation paths: what reaches me immediately vs. what waits for the standup vs. what the leader resolves alone. (My rule: only true hard blocks reach me — everything else gets handled.)
- Weekly review: what we measure, what we change.
- The no-backlog enforcement: the exact mechanism that guarantees nothing sits idle, and who owns it.

### Deliverables (as separate sections in your report)

1. Systems catalog — everything I have plus everything worth adding: license, activity, cost, which pains it addresses, fit.
2. The forgotten-work audit methodology + lost-and-found register template + my interview questions.
3. The shared project-state document (state, goals, steps, dependency map, 72-hour and 30-day plans).
4. The orchestration architecture (scored leader matrix, topology, SPOF analysis, growth loop, phased migration with gates and rollbacks, pre-mortem).
5. The operating cadence (standup format, eod log, escalation paths, weekly review, backlog enforcement).
6. The red-team appendix — the strongest case against your own recommendations.
7. A one-page executive brief I can read on my phone.

Keep it high-level enough that I can trust the reasoning, concrete enough that my builder agents can execute it. Say "I'm unsure" rather than inventing anything.

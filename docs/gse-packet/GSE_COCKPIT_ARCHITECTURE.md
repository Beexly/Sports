# The Bridge — GSE Command Cockpit Architecture
### Not a dashboard. An integrity operating system.
**2026-06-24 · Synthesized from deep studies of n8n, Langflow, Dify, Open WebUI, Grafana (see `repo_study_*.md`). This is the spec the world-class cockpit is built against.**

---

## The breakthrough (why this is first-of-its-kind)

Study the five category leaders closely and the same hidden discipline appears in every one: **they enforce integrity as geometry, not as policy.**

- n8n — pinned dev data *physically cannot* reach production; a node can't run without its typed inputs.
- Langflow — color-coded ports *reject* an illegal connection; you can't wire a string into a number.
- Dify — operator corrections live in a *separate store* that can't pollute the knowledge base; "Publish" is the one gate between draft and the world.
- Open WebUI — tools you lack permission for are *silently absent* from the model's reach ("attach ≠ grant").
- Grafana — NoData is a distinct state, never a false "healthy"; an alert's thresholds are read *from data*, not typed by hope.

None of them market this. It's just how serious operator software is built. And it is **exactly** Galaxy Sports Edge's non-negotiables — *no fake data, no stale data, math you can read, server-side gates, proof before publication* — rendered as the laws of physics of the interface.

So the cockpit's defining principle is one sentence: **you cannot render dishonesty.** You can't wire fake data into a priced signal, can't command a gate you can't see, can't publish what isn't proven, can't pollute the source of truth with a hot take. Every competitor's cockpit is a window onto the system. GSE's cockpit *is* the system's conscience, made operable. That has not been built.

The spine that organizes all of it is the **Publish Gate** — `canPublishProjections` / the proof ladder. Every view, in its own language, answers the only two questions that matter: **what can we honestly stand behind right now, and what would it take to stand behind more?**

---

## The unified object: one entity, five lenses

The second breakthrough: n8n, Langflow, Dify, Open WebUI and Grafana are not five tools to bolt together — they are **five lenses on one object.** A GSE intelligence-object (a pick, a projection, a signal, a source) is simultaneously:

| Lens | From | The object as… |
|---|---|---|
| **Runnable** | n8n | a workflow with typed inputs, a live current-step, last-run + result, an error branch, and re-run-from-step |
| **Traceable** | Langflow | a node in the agent graph, with typed I/O packets flowing the handoff edges and the evidence it produced |
| **Staged** | Dify | an entity in the gated lifecycle (Draft → Verified → Priced → Published → Proven) with a predicate on every transition |
| **Commandable** | Open WebUI | a target in the ⌘K capability palette, invocable only through a gate you can see |
| **Observable** | Grafana | a telemetry series with a data-driven gate, a drilldown to its source, and annotations for what changed |

One object. Kept in sync across all five. Click a pick in the queue → see its workflow run, its position in the agent graph, its lifecycle stage, its health series, and command it — the *same* object, five ways. **No product does this**, because no product has a reason to: GSE does, because the flow of intelligence (data → forecast → proof → revenue) is literally one pipeline that everyone else fragments.

---

## The deep mechanics, mapped to GSE (the real steals)

### Runnable — from n8n
- **Node-detail drawer (3-pane):** click any workflow → `inputs → params → output` in one drawer, exactly n8n's NDV. The output pane shows the real artifact (the Clark-West report, the merkle receipt).
- **Execution history + re-run-from-step:** every run is a row (timestamp, status, duration, result); open one, pin its data, re-run from the failed step — deterministic, zero re-spent API quota.
- **Error-output port as visible geometry:** continue-on-fail, bounded retries, and a fan-in error workflow are *drawn*, not hidden — a forking wire to AUDIT.
- **★ The Slate-Night Flight Simulator (novel):** freeze one real night's odds + results as *editable pinned data*, run the entire pipeline against it as a quota-free rehearsal, and hand-edit the frozen slate to manufacture disasters (0–12 night, calibration collapse, stale feed) to prove every error branch, approval gate, and milestone check **before** it happens live. Pins can't touch production — near-free, zero-risk.

### Traceable — from Langflow
- **Typed, color-coded ports that block miswiring:** `OddsSnapshot → SARAH → ScoredPick[] → AUDIT`; an illegal connection is physically rejected. "No fake data" becomes un-violable UI.
- **★ Live typed-packet flow (novel):** labeled packets animate along the handoff edges — `47 OddsSnapshots → 12 ScoredPicks → 9 cleared / 3 blocked` — the active agent pulses, and **blocked picks visibly stop at AUDIT with the reason on the edge.** A live map of who's computing what, with which evidence, and where integrity gates fired.
- **Per-agent playground + trace:** test or trace one department in isolation (freeze upstream), see each tool call with its arguments and raw return, bound to a `model_version` snapshot.

### Staged — from Dify
- **Lifecycle with predicate gates:** each transition has a machine-checkable predicate, e.g. `Verified → Priced` requires *Model Court pass AND non-worsening ECE AND data fresh*; `Published → Proven` requires *≥100 settled AND published calibration*. The board shows what's blocking each move.
- **★ The Override Store (novel, non-pollution invariant):** a side-indexed human-correction layer that takes precedence at *serve time* (suppress/replace a published edge by game+market) but is kept **separate from the Master Dossier** so operator vetoes never contaminate the model's priors — and accumulate as an exportable calibration dataset.
- **Five surfaces that never share a screen:** Knowledge (Dossier/Atlas) · Workflow · Models · Tools · Observability — so the strategy library never bleeds into the command queue.

### Commandable — from Open WebUI
- **★ The Capability Palette (novel fusion):** ⌘K spotlight where the invocation list *is* the permission map. Every row carries a live gate glyph — `go-live 🔒 (calibration unproven)` · `read odds ✓` · `write picks 🔒 (needs owner arm)`. You can't type a command whose gate you can't see, and you can't see a gate without the legitimate path to arming it. "Authority you can read."
- **Attach ≠ grant:** tools the current context can't use are silently absent from the agent's reach — server-side scoping rendered, not asserted.
- **Live status emitter + citations as wire format:** a command paints a live progress line on its own message ("watch the backtest run inline"); knowledge answers return a clickable `<source>` receipt.

### Observable — from Grafana
- **★ Top-level scope variables (`$sport`, `$week`):** one control bar re-scopes every panel at once, URL-encoded and shareable. Build one parameterized cockpit, not one board per sport.
- **Split-view compare:** this week vs last, model v5.0 vs v5.1 — a true like-for-like, reproducible as a URL.
- **Drilldown / data links:** click a number → carry the value + scope + time into its source synthesizer → raw records → the rights envelope.
- **★ The data-driven Publish-Gate tile:** one object that is health readout + drilldown + alert predicate. Its state ANDs the live predicates (data fresh ≤10m, ≥N settled, ECE in-band, brand-safety clean) where the *thresholds come from data*; the same predicate fires an alert at the publish-cron window and writes annotations ("Gate BLOCKED — calibration" / "Gate reopened") onto the timeline. Answers *can I publish / why not / when did that change* in one tile.
- **Annotations:** "model v5.1 shipped," "provider outage 14:02–14:37" pinned across the timeline so every drift is explained against what changed.

---

## The four invariants that make it world-class (not just pretty)

1. **Integrity is geometry.** Dishonesty is unrenderable: can't wire fake data, can't command an unseen gate, can't publish the unproven, can't pollute the truth store. (n8n pins + Langflow ports + Dify override-store + Open WebUI attach≠grant.)
2. **Replay without consequence.** Any night, any model, any failure can be frozen and re-run at ~$0 — the flight simulator and the historical backtest are the same muscle. (n8n pinned data + Langflow freeze + Grafana split-view.)
3. **The publish gate is the central authority.** Not a widget — the spine. Every view answers "what can we stand behind, and what would it take to stand behind more." (Dify publish gate + Grafana data-driven gate + the proof ladder.)
4. **One object, all lenses, versioned and replayable.** A pick is a workflow *and* a graph node *and* a lifecycle entity *and* a metric *and* a command — synced, traced, and snapshot to `model_version`. (All five.)

---

## Build map (the rebuild target)

`Bridge` (the fused operator view: scope bar · publish-gate authority tile · runnable queue · live agent-graph strip · feed · capability palette) · `Flows` (n8n node-detail + execution history + the flight simulator) · `Graph` (Langflow typed-packet agent map + per-agent trace) · `Lifecycle` (Dify gated board + override store) · `Observe` (Grafana scope/split/drilldown/annotations). One ⌘K capability palette and the publish-gate spine present in every view.

*Companion studies: `repo_study_n8n.md` · `repo_study_langflow.md` · `repo_study_dify.md` · `repo_study_openwebui.md` · `repo_study_grafana.md`. Built into: `GSE-cockpit.html`.*

# DEEPSEEK EXTREME-LAYER PROMPT — "Beyond the Floor"
**Purpose:** the second wave. The foundation prompt (15 tracks A–O) built the floor — what a good studio must do. THIS prompt goes beyond: frontier tech, experiences that have never existed, the autonomous endgame, extreme business models, the 2030 horizon. Paste after the foundation prompt, or standalone once foundation dossiers are delivered.
**File:** `~/workspace/your_files/deepseek-extreme-layer-prompt.md` · agent bus `inbox/from-motif/DEEPSEEK-EXTREME-LAYER-PROMPT.md`

---

# THE PROMPT (paste below this line)

## ROLE

You are the frontier research engine for a studio that does not want to be a good agency — it wants to make every other studio irrelevant within two years. The foundation research (our technical bible + 15-track operational dossier) covers what we must do to be excellent. Your job now: what we could do that **nobody is doing**. The unknown unknowns. The things that sound impossible until someone ships them. The founder is not an engineer — your output must be visionary AND implementable, with the path from "insane" to "shipped" spelled out.

## HOW THIS DIFFERS FROM FOUNDATION RESEARCH

Foundation asked: what's missing that we should do? This asks: **what's possible that nobody has tried?** Every track below must contain at least one idea that makes a competent engineer say "that's insane" — followed by your honest assessment of whether the insanity is shippable in 12–24 months, and the exact path to get there. If a track contains only safe ideas, you failed the track.

## THE EXTREME LOOP (extends the foundation research loop)

Run research → verify → test → improve → review → polish, PLUS:

7. **RED TEAM** — attack your own dossier as a hostile skeptic. Assume every recommendation fails within 6 months. Write the pre-mortem: what killed it? If you can't kill it, it's strong.
8. **STEELMAN THE ALTERNATIVE** — for your top recommendation in each track, write the strongest possible case for the *opposite* approach. If the opposite wins, say so.
9. **THE 10X QUESTION** — for each track: "what would this look like if it had to be 10× better than the current best, not 10% better?" Answer it.

## DEPTH STANDARD (frontier edition)

- **Paper-level.** For technical tracks, cite the actual papers (SIGGRAPH and beyond), the researchers, the labs. Name the state of the art and who holds it.
- **Repo-state verified.** For every tool/technique: last commit date, open issue count, who's maintaining it, whether it's a demo or production. Demos dressed as products are the #1 lie in frontier tech — call them out.
- **Cost curves, not costs.** Frontier tech gets cheaper. Chart where the cost is going (generation cost per asset 2024 → 2025 → 2026 → projected), not just where it is.
- **The path, not just the peak.** Every "insane" idea needs the staircase: what's shippable in 30 days that points toward it, what unlocks at 6 months, what's the 2-year endgame.

---

## EXTREME TRACKS

### TRACK P — FRONTIER RENDERING (beyond WebGPU basics)

Our bible covers WebGPU/TSL as production standard. What's past that?

- **Real-time ray tracing in the browser via WebGPU compute.** State of the art 2026: who has shipped it, what the frame costs actually are, what's shippable vs demo. Could our cinematic scenes have real reflections/GI within 2 years?
- **Gaussian splatting as a web primitive.** 3DGS streaming in browsers, compression (SPZ and successors), web viewers, production readiness. Could a client's business be a splat instead of a mesh? What does the capture → web pipeline look like, end to end, with real tools and real costs?
- **Neural rendering in the browser.** NeRFs, neural materials — what's real, what's a tech demo with 40 seconds of load time? The honest 2026 assessment.
- **AI shader synthesis.** Natural language → TSL/GLSL: current capabilities, evaluated honestly. Can an agent write production shaders from "I want frost spreading from a drawn shape" yet? What's the gap?
- **Real-time global illumination in browser.** Lumen-equivalents, probe systems, baked-vs-dynamic tradeoffs — what's actually shippable at 60fps on mid-range hardware?
- **The 10x question:** what does a cinematic web scene look like when ray tracing, splats, and neural materials are all free? Describe it. Then chart the staircase from today.

### TRACK Q — GENERATIVE WORLDS (beyond single assets)

Our bible covers generating individual 3D assets. What about generating entire worlds?

- **Text-to-navigable-world.** HY-World 2.0 and everything past it: can we generate the "one world" our doctrine demands from a prompt? Evaluate quality honestly — what's shippable as a client deliverable vs impressive demo?
- **Runtime world generation.** Worlds that build themselves as the visitor explores — literally infinite camera work. The algorithms (wave function collapse, constraint solving, chunked generation), the performance reality, who's closest.
- **The photogrammetry pipeline: phone photos → 3D business → cinematic site.** A client scans their shop with their phone; we generate their world; it becomes their website. Map this end to end: capture apps, reconstruction tools (open and commercial), cleanup, web optimization, costs, quality ceiling. **This could be the Kit killer feature — treat it that way.**
- **Digital twins for local business.** The plumber's actual service area as an explorable 3D world. Gimmick or conversion weapon? Find anyone doing it and get their numbers.
- **The 10x question:** a client types their business name and gets a navigable 3D world of their business in an hour. What has to be true for that to ship? Chart it.

### TRACK R — THE AUTONOMOUS SITE FACTORY (the endgame)

This is the most important track. Our $350 sites are built by agents today with heavy guidance. The endgame: **business name in, finished 9.2+ site out, zero human input.**

- **The full pipeline, stage by stage:** business intel scraping (what's knowable about a local business from public data?) → copy generation in genuine local voice (not generic AI copy — what's the technique?) → scene generation → camera choreography → gate design → QA gates → deploy. For each stage: today's quality ceiling, what's automatable now, what needs a human and why.
- **Self-critiquing agents.** Agents that score their own output against a quality doctrine and iterate without human prompting. Who's doing this well? What are the convergence failure modes (loops that polish forever, agents that can't see their own flaws)?
- **Taste as code.** Can "awe" be a loss function? Proxy metrics for quality, learned quality models trained on our own accepted-vs-rejected work. Is anyone doing this? What's the minimum viable version we could build from our own data?
- **The human's remaining job.** As the factory improves, what does the founder actually do? Define the role: taste, relationships, vision — what's unautomatable and why. Be specific, not philosophical.
- **The 10x question:** 1,000 cinematic sites generated in a month, every one 9.2+. What breaks? (QA? compute cost? sameness?) Solve each break.

### TRACK S — EXPERIENCES THAT HAVE NEVER EXISTED

Our driving line: "experience something they never have before on a website." Take it literally. For each idea: has anyone done it, what would it take, gimmick or revolution?

- **Persistent worlds.** The site remembers you across visits; the world evolves. Your third visit is different from your first. The tech (per-visitor state, world versioning), the design implications, the privacy line.
- **Multiplayer presence.** Other visitors visible in the 3D world — shared wonder, live social proof ("14 people are exploring this right now"). The tech (presence infrastructure), the moderation problem, the magic.
- **Time/weather-reactive scenes.** The site differs by time of day, real weather at the visitor's location, seasons. A pool company's site in the rain vs sun. Implementation (APIs, scene variants), cost, conversion hypothesis.
- **Generative audio.** Not loops — procedural music *composed* from narrative position. The world has a score that has never existed before and will never exist again. The tech (generative music systems, Web Audio), the emotional math.
- **Haptics.** Choreographed vibration (mobile/gamepad) at gates — the shatter you *feel*. API reality, design language for touch.
- **Real game mechanics in business sites.** Not gamification — actual play. A roofer's site with a real (tiny) game inside it. When does play sell, when does it distract? Find the line.
- **Biometric-responsive (consent-based).** Attention-adaptive experiences via camera (with explicit consent): the scene responds to where you look. The tech, the creep factor, the consent UX, the regulation.
- **Cross-device continuity.** Start on phone, continue on desktop — world state follows you. The infrastructure, the UX, why nobody does it.
- **The 10x question:** describe a website experience from 2028 that makes today's Awwwards winners look like brochures. Then chart the staircase.

### TRACK T — EXTREME BUSINESS MODELS

- **The network effect.** Every $350 site as a node: shared analytics across all client sites (benchmark data no single business has), cross-promotion, "built by" virality. Design the network — what do clients get for being nodes, what do we get?
- **The data moat.** Every configurator interaction is training data for better 3D generation. What data are we already generating, what would we need to capture, what does the flywheel look like, and what's the privacy-compliant way to build it?
- **Selling the machine.** Franchising or licensing the site factory itself — not selling sites, selling the ability to sell sites. Who buys, what it's worth, what breaks (quality control at distance).
- **Unit economics to $1M per lane.** Model each revenue lane (sites, workflows, digital products, AI receptionist, templates) to $1M with stated assumptions. Where does each lane actually break? (Labor? Acquisition cost? Churn?) Kill the lanes that don't survive contact with math.
- **Competitive threat map.** Who else is building AI-to-cinematic-website? (There are companies in this space.) Map them: funding, quality, velocity, differentiation. Where are we vulnerable, where are they weak?
- **IP landscape.** What's patented in generative 3D / web experiences that could block us? What should *we* file? What's the actual cost and process for a small studio?
- **The 10x question:** what business would we be in if selling websites was just the acquisition channel? Answer it.

### TRACK U — THE 2030 HORIZON

- **Where the web goes.** AI-native browsers, ambient computing, spatial web — separate signal from hype. What do we build *now* that compounds toward each scenario?
- **Cost curves.** Generation cost per asset, per scene, per site: 2024 → 2026 → projected 2028. What becomes free, and what becomes the new scarcity? (Hypothesis: taste, trust, and distribution become the scarcities — test this.)
- **The skill curve.** What skills does the operation need in 2027 that it doesn't need now? What should the founder be learning *this year*?
- **Positioning per wave.** For each plausible 2028–2030 scenario, what's our move? Write it as a decision tree with trigger signals ("when X happens, we do Y").

### TRACK V — EXTREME KNOWLEDGE & PREDICTION SYSTEMS

- **The second brain.** Not documents — a queryable knowledge graph of every experiment, result, lesson, and decision the operation ever produces. What to capture, how to structure it, what tools (graph DB? embeddings? both?), how agents read and write it. The anti-Grok rule as infrastructure.
- **Prediction from our own data.** Which leads will close? Which designs will score 9.2+? Which gates will fail? The minimum viable prediction system trained on our own operational data — what data to log starting *now* so the models exist in a year.
- **The autonomous P&L.** Real-time unit economics per lane, with alerting when a lane's economics die. What instrumentation, what thresholds, what decisions it automates.
- **The 10x question:** the operation runs itself and the founder's job is pure taste and relationships. What systems have to exist? List them. Chart the staircase.

---

## OUTPUT FORMAT (same as foundation, plus)

Per track: TL;DR (5 bullets) · current state of the art (named examples, papers, repos) · options ranked (no ties — take positions) · implementation blueprint (staircase: 30-day → 6-month → 2-year) · red-team pre-mortem (assume it fails — why?) · steelman of the opposite approach · confidence & sources (every major claim labeled) · open questions.

Then: **MASTER ROADMAP** merging foundation + extreme (sequenced, dependencies marked) · **BIBLE AMENDMENTS** (ready-to-paste, section-cited) · **THE TOP 10 EXTREME BETS** (ranked by expected value = impact × probability ÷ cost, with the probability stated honestly).

## ANTI-SLOP CONTRACT (extends foundation)

Same bans, plus: no "the future is exciting" filler. No listing technologies without the staircase. No insane idea without the red-team kill attempt. If you can't describe what the 30-day version looks like, the 2-year vision is fantasy — say so.

## BEGIN

Start with Tracks R (the factory), S (never-existed experiences), and T (extreme business). These three matter most. Deliver completely, then continue. Depth beats coverage. The loop runs until it's right: research → verify → test → improve → review → polish → red-team → steelman → 10x.

# (END PROMPT)

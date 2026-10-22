# DEEPSEEK MEGA-RESEARCH PROMPT — "The Next Level"
**Purpose:** the single hardest-working research prompt for our operation. Paste everything below the line into DeepSeek.
**How to use:** paste the prompt, then when it asks for context, paste `BUILD-BIBLE.md` (agent bus) alongside it. Run one track at a time if output limits hit — the prompt says so.
**The loop after delivery:** we verify → test → improve → review → polish each dossier, then file amendments to the bible. Research is the start of the loop, not the end.

---

# THE PROMPT (paste below this line)

## ROLE

You are the research engine for a small, aggressive digital studio. We sell cinematic immersive websites ($350 one-page, $900 full-site), interactive product tools, and digital goods, built to an award-winning standard (Unseen Studio is our reference bar). We operate with AI agents doing the build work under a strict quality doctrine. You are not a chatbot giving advice — you are a deep research instrument. Your output becomes engineering doctrine. Treat it that way.

## MISSION

Find everything we are missing. We have a solid technical bible covering: WebGPU/Three.js rendering, Theatre.js + GSAP + Lenis choreography, gltf-transform asset pipelines, AI 3D generation (TRELLIS.2, Hunyuan3D), WCAG 2.1 AA accessibility, spatial audio, the interaction-budget performance framework, digital-goods security (presigned URLs, license keys), EU VAT/OSS, visual regression testing, CDN deployment, immersive analytics, reduced-motion paths, and headless commerce (Medusa).

Your job: the **unknown unknowns** and the **under-explored knowns** across every domain below. For each: what's missing, what the best in the world do about it, what it costs, what could go wrong, and exactly how we should implement it. We need material for the next 1–2 years. Think in systems, not tips.

## THE RESEARCH LOOP (how you work — non-negotiable)

For EVERY track below, run this loop and show your work:

1. **RESEARCH** — go deep. Primary sources first: official docs, source code, pricing pages, changelogs, engineering blogs, conference talks, legal texts. A README skim is failure. Read the source.
2. **VERIFY** — cross-check every important claim against at least two independent sources. Check dates: is this still true in 2026? Note what changed recently.
3. **TEST (where testable)** — you cannot run code, so "test" means: verify against primary sources live today (open the pricing page, read the actual docs page, check the actual GitHub repo state — stars, last commit, open issues). Report what you actually checked.
4. **IMPROVE** — after your first pass, attack your own findings: what's weak, what's missing, what would a skeptic say, what did you underweight?
5. **REVIEW** — re-read your dossier as if you were the engineer who has to implement it Monday morning. Is anything ambiguous? Unactionable? Missing a cost?
6. **POLISH** — tighten, structure, cut fluff. Then deliver.

If output limits force you to stop, say exactly where you stopped and resume from there when asked. Never compress a track into a paragraph to "fit" — deliver fewer tracks completely rather than all tracks shallowly.

## DEPTH STANDARD (read carefully — this is where most research fails)

- **Source-level, not summary-level.** If you recommend a tool, you have read its docs beyond the landing page: pricing tiers, limits, the actual API shape, recent changelog entries.
- **Every factual claim carries a confidence label:** VERIFIED (you checked a primary source today) · CROSS-CHECKED (two or more independent sources agree) · SINGLE-SOURCE (one credible source, flagged) · INFERRED (your reasoning from evidence, flagged) · UNVERIFIED (could not confirm — flagged, never stated as fact).
- **No generic advice.** "Consider leveraging robust solutions" is failure. Every recommendation has: WHAT (concrete), WHY (evidence), COST (money + time + complexity), RISK (what breaks), VERIFY (how we confirm it works for us).
- **Dates matter.** Note when things changed (e.g., "Safari shipped WebGPU Sept 2025", "Chrome 130 removed SwiftShader fallback"). Stale knowledge is worse than no knowledge — flag anything you're unsure is current.

## CONTEXT (we will paste our technical bible after this prompt — assume it as ground truth)

We are: a tiny studio (effectively 2–3 people + AI agents), selling $350 one-page cinematic sites, $900 full sites, $500+ automation workflows, $29–79 digital products, $49/mo AI receptionist upsell. Reference bar: Unseen Studio. Quality floor: nothing below 9.2/10 ships. Current stack: Three.js/WebGPU, Theatre.js, GSAP, Lenis, Medusa (planned), Vercel. We have an agent-bus system where a strategy agent writes doctrine and a builder agent implements it. We need research that a non-engineer founder can act on and an engineer agent can implement.

---

## RESEARCH TRACKS

### TRACK A — AUTONOMOUS WORKFLOWS & AGENT ORCHESTRATION
We run AI agents for builds. How do the best teams orchestrate them?
- Multi-agent pipeline patterns: planner → builder → critic → QA loops. Who does this well in production? What are the failure modes (loops that never converge, agents that gold-plate, context loss between handoffs)?
- The research→verify→test→improve→review→polish loop as a *system*: how to run it as an automated pipeline rather than a manual habit. What triggers each stage? What are the exit criteria?
- Autonomous QA agents in CI: visual-diff agents, accessibility-audit agents, performance-budget agents. What exists, what actually works, what's vaporware?
- Context preservation across agent handoffs: the "Grok problem" — information sitting where nobody sees it. Best practices for shared state, decision logs, and handoff protocols between agents.
- Self-healing deployments, canary releases, and feature flags specifically for WebGL/cinematic experiences (how do you canary a 3D scene?).
- Human-in-the-loop design: where must a human approve, and where is human approval pure theater? Decision frameworks.

### TRACK B — TOOLS & INFRASTRUCTURE GAPS
Beyond our 40-repo arsenal, what's missing from our toolchain?
- 3D asset management: DAM systems for GLB/textures, version control for binary assets (Git LFS vs alternatives — costs, limits, DX), visual diffing for 3D models.
- Real-time collaboration on 3D scenes: what exists (Spline? echo3D? custom?), what's production-ready?
- AI coding assistants specifically for Three.js/WebGL/shader work: which ones actually produce working shader code vs plausible-looking garbage? Test with a real task mentally and report honestly.
- Hosting for heavy WebGL: Vercel vs Cloudflare Pages + R2 vs Netlify Edge vs dedicated. Bandwidth costs for 10MB experiences at scale — model the cost at 10k, 100k, 1M monthly visitors.
- The client-update problem (see Track F): headless CMS options that can bind to cinematic timelines without breaking them.

### TRACK C — QUALITY SYSTEMS (measuring the unmeasurable)
Our bar is "nothing below 9.2/10 ships" and "complete awe + efficient navigation." How do you operationalize that?
- How do award-winning studios actually QA cinematic sites? Checklists, rituals, sign-off processes — find real ones.
- Proxies for awe: which metrics actually correlate with "this experience is extraordinary"? (interaction depth, return visits, share rate, time-in-scene, gate completion). What's measurable vs hand-waving?
- Client acceptance criteria for immersive work: how do you write a contract for "awe" without getting destroyed in revisions? Milestone structures, revision limits, kill fees.
- Design QA checklists specific to cinematic/scroll-driven sites (typography in motion, camera comfort, vestibular safety beyond prefers-reduced-motion).
- Regression strategy for "feel": how do you prevent updates from degrading the experience quality over time?

### TRACK D — ALGORITHMS
- **Procedural generation** beyond our one example: L-systems, reaction-diffusion, flow fields, signed distance fields, wave function collapse — which are practical for product visualization and scene dressing in a shipping web product? Rank by implementability in TSL/GLSL.
- **Camera algorithms:** smooth path interpolation (centripetal Catmull-Rom and beyond), collision-aware cameras, auto-framing for arbitrary products, camera comfort (vestibular-safe motion profiles).
- **Performance algorithms:** LOD systems, occlusion culling, instancing strategies, texture streaming — what's implementable by a small team vs what needs an engine team?
- **Personalization:** what should a visitor see first? Recommendation logic for product configurators and storefronts. What's the minimum viable personalization that actually moves revenue?

### TRACK E — API LANDSCAPE (the complete integration map)
Map every API category a digital-goods immersive studio needs, with the top 2–3 options in each, real pricing, and integration notes:
- Payments (beyond Stripe: who, why), tax calculation, fraud screening
- License key infrastructure (Keygen.sh and alternatives — this is critical for us)
- File storage & delivery (R2, S3, presigned URL patterns), image optimization CDNs
- Email delivery (transactional: Resend, Postmark, SES — deliverability matters because our delivery emails carry the product)
- SMS, customer support desk, CRM, analytics, session replay
- 3D model APIs (Sketchfab, Poly Pizza, etc.), font APIs
- Webhook patterns: idempotency, retry strategies, dead-letter handling — the engineering practices that prevent double-charging and lost deliveries.

### TRACK F — PRODUCT & FEATURE LADDER
Our ladder: free tools → $29–79 digital products → $150 design packages → $350 sites → $900 sites → $49/mo AI receptionist → $500+ workflows.
- What's missing between rungs? Where do customers fall off?
- **The client-update problem:** a non-technical client buys a $900 cinematic site — how do they change their phone number without breaking the scene? CMS-to-timeline binding patterns. This is the #1 scaling blocker for selling cinematic sites — solve it.
- Feature ideas per rung, ranked by revenue impact vs build cost.
- The AI receptionist product: conversational commerce patterns, RAG over client knowledge bases, escalation design, what the best implementations do.
- White-label potential: could agencies resell our engine? What would that product look like?

### TRACK G — ENGAGEMENT & CONVERSION
- Beyond our analytics plan: email capture in cinematic experiences (gates that convert without breaking immersion), interactive quizzes ("what style is your business?"), before/after sliders, configurators as lead magnets.
- Abandoned-configurator recovery: the 3D equivalent of abandoned-cart emails. Who does this? What are the numbers?
- Community as moat: client showcase galleries (social proof engines), user communities — what works for studios vs what's a time sink?
- Retargeting for immersive products: what creative actually works when your product is an experience?

### TRACK H — CUSTOMER SERVICE & SUPPORT OPS
- Support desk for digital goods: the actual ticket taxonomy (license issues, download failures, "it doesn't work on my device"), macros, SLAs for a tiny team.
- AI support agents trained on product docs: what works, what hallucinates dangerously, escalation design.
- Status pages, incident communication, and the "your download link expired" problem (turning a failure into a trust moment).
- Support as sales: how the best small studios turn support interactions into upsells and testimonials.

### TRACK I — RETENTION & EXPANSION REVENUE
- Subscription mechanics for digital products: what justifies recurring billing? Update cadences, versioned releases, changelog-as-marketing.
- Win-back campaigns: what actually brings lapsed customers back (data, not platitudes)?
- NPS/CSAT for creative services: how to measure, when to ask, what to do with detractors.
- Expansion paths: from $350 site to $900 site to $49/mo to workflows — the upgrade email sequence, timing, triggers.

### TRACK J — PARTNERSHIPS & CHANNELS
- Agency reseller programs: how small studios get agencies to sell for them (margins, co-branding, sales enablement).
- Platform partnerships: who should we integrate with such that *they* send us customers?
- Template/scene marketplace: selling Theatre.js sequences, scene templates, shader packs — marketplaces, pricing, piracy considerations.
- Affiliate programs for our own products: structure, rates, tracking, fraud.

### TRACK K — NEW BUSINESS OPPORTUNITIES
- Adjacent products we haven't considered: what do studios like ours successfully sell that isn't websites? (Audits, retainers, training, components, audits-as-a-product.)
- Education as a business: courses/content on cinematic web design — revenue vs lead-gen tradeoff, who's doing it well.
- Niche domination: wedding signage, sign shops — we have footholds; what are the *next* niches with the same shape (high fragmentation, low digital sophistication, visual product)?
- The 2026–2027 horizon: what becomes possible (tech or market shifts) that isn't practical today?

### TRACK L — SALES SYSTEMS
- The outreach machine: our Kit product needs local-business outreach (DMs, walk-ins, follow-up sequences). Map the complete system: lead sourcing, enrichment, first touch, follow-up cadence, breakup, re-engagement. Real reply-rate benchmarks for local service businesses.
- Proposal → contract → deposit → build → delivery → testimonial: the pipeline as a *workflow system* (we have n8n available). Stage by stage: what gets automated, what stays human, what the best small studios do.
- Pricing psychology for creative services: anchoring, good-better-best, the specific mechanics that move a $350 buyer to $900.
- Objection handling: the real objections to cinematic websites ("my customers just need my phone number", "it's too fancy", "what if it breaks") and answers that work.

### TRACK M — LESSONS-LEARNED & KNOWLEDGE SYSTEMS
- Post-mortem frameworks for small teams: blameless retros that actually change behavior. Formats, cadence, the "one thing we change" rule.
- Architecture Decision Records (ADRs): the lightweight practice for recording *why* we built it this way. Template and workflow.
- The anti-Grok system: information routing for human+agent teams. Single source of truth patterns, required-reading indexes, decision logs. How do distributed teams + AI agents stay in sync without drowning in documents?
- Documentation architecture for a studio: what docs exist (doctrine, runbooks, SOPs, onboarding), who writes them, when they get updated, how you prevent doc rot.

### TRACK N — STRUCTURE & ORGANIZATION
- Repo architecture for the whole operation: monorepo vs polyrepo for sites + tools + products + docs. What breaks at each size?
- The agent org chart: strategist, builder, QA, researcher — ownership boundaries, escalation paths, what happens when agents disagree.
- Runbooks: the "it's 2am and the site is down" document. What goes in it for a WebGL experience + digital goods store?
- Onboarding: how a new agent (or human) gets productive in week one. What's the minimum viable onboarding?

### TRACK O — MISSING TECHNICAL DOMAINS
For each: what it is, why it matters to us, what the 2026 state of the art is, what we'd implement first.
- **WebXR/AR:** AR product preview, virtual try-on — the Immersive Web SDK is in our arsenal but we have no strategy. When does AR sell products vs gimmick?
- **Multiplayer/shared experiences:** collaborative configurators (two people designing together) — yjs, Liveblocks, custom. Use cases that justify the complexity.
- **Real-time:** WebSockets for live collaboration, live support co-browsing in 3D scenes.
- **i18n/l10n:** selling globally means multi-language, multi-currency, RTL. The real cost and the automation available.
- **SEO for immersive sites:** Google sees canvas as nothing. SSR, dynamic rendering, structured data for 3D content — the complete playbook for ranking a site that's mostly WebGL.
- **Privacy:** session replay + GDPR/CCPA consent, data retention policies, the compliance cost of our analytics plan.
- **Observability:** Sentry for WebGL crashes, real-user frame-rate monitoring in production — what does "production monitoring" mean for a 3D scene?
- **Fraud:** beyond velocity checks — device fingerprinting, friendly-fraud (chargebacks on digital goods), dispute evidence practices.
- **Disaster recovery:** backups for scene state, Theatre.js timelines, customer/license data. RTO/RPO for a tiny studio.
- **Progressive enhancement tiers:** the real fallback ladder — what does the experience become on a 2019 Android, on 2G, with WebGL disabled? (Our "equivalence" dimension needs teeth.)

---

## OUTPUT FORMAT

### Per track, deliver a dossier with exactly this structure:
1. **TL;DR** (5 bullets max — what we'd be stupid not to do)
2. **Current state of the art** (what the best do, with named examples)
3. **Options ranked** (with costs, effort in days, risks — no ties, take a position)
4. **Implementation blueprint** (concrete steps our builder agent can execute, in order)
5. **What could go wrong** (failure modes, mitigations)
6. **Confidence & sources** (every major claim labeled; key sources linked)
7. **Open questions** (what you couldn't resolve — these become our next research targets, not gaps we pretend don't exist)

### Then deliver:
- **MASTER ROADMAP:** 30-day (do now), 90-day (do next), 12-month (strategic), 24-month (horizon) — sequenced across all tracks, with dependencies marked.
- **BIBLE AMENDMENTS:** for each finding that changes our doctrine, write it as a ready-to-paste amendment: which section it amends, the exact text, and why.
- **THE TOP 10:** the ten highest-leverage actions across all tracks, ranked, each with expected impact and cost. If we only do ten things, these are they.

## ANTI-SLOP CONTRACT

- Banned: "leverage", "synergy", "robust", "seamless", "cutting-edge", "delve", "in today's fast-paced", "it's important to note", "moreover/furthermore" chains, and any sentence that could appear in a generic business blog.
- Every recommendation must be implementable by a competent engineer agent on Monday morning. If it isn't, it's not a recommendation — move it to Open Questions.
- No hedging without substance. "It depends" is only acceptable followed by "on X — here's the decision tree."
- Take positions. Ranked lists have no ties. If two options are genuinely equal, say what breaks the tie.

## BEGIN

Start with Tracks A, B, C. Deliver them completely, then ask whether to continue. Remember the loop: research → verify → test → improve → review → polish. Depth beats coverage — I will keep asking for more until it's right.

# (END PROMPT)

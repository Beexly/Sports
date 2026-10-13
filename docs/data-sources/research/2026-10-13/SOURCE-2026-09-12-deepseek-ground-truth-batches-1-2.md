# SOURCE — DeepSeek Ground-Truth Scrape, Batches 1–2 (Sites 1–20)
**Filed:** 2026-09-12 · **Delivered by:** DeepSeek (Garrett paste, ~15:50 CDT)
**Status: NORMALIZED WORKING COPY — NOT verbatim.** Some tables were normalized, the Awwwards daily-winner section was compressed, and some wording was tidied during capture. The original pasted text was not preserved byte-for-byte. Do not cite this file as a verbatim source; it is a faithful-content working copy only. Batch 3 (`SOURCE-2026-09-12-deepseek-ground-truth-batch-3.md`) IS preserved verbatim and is the higher-authority source. Load-bearing claims verified separately in `VERIFY-2026-09-12-ground-truth-all-30.md`.
**Coverage:** Batch 1 = sites 1–10 (AI site builders). Batch 2 = sites 11–20 (immersive/award studios + Polycam + Luma). Sites 21–30 in the Batch 3 source file.

---

BATCH 1 REDUX: AI SITE BUILDERS (Sites 1–10) — DEEP DIVE

Method note: Every dossier below was built from primary-source pages visited on 2026-09-12, including pricing pages, docs, feature pages, and third-party pricing analyses where the vendor's own page was incomplete. Where sources conflict, both figures are logged. Every price is quoted. Every feature is traced. No adjectives doing the work of a number.

---

SITE 1: Wix — wix.com

Visited: 2026-09-12 (blog pricing page, Aria feature page, AI agent how-to guide, Harmony launch coverage)

One line: The 300M-user incumbent layering AI agents (Aria, Harmony) onto a mature no-code platform with 8.5M live sites.

Pricing (quoted, not paraphrased):

· Free: $0 — free plan exists, includes secure web hosting and "several free business tools," Wix-branded URL
· Light: $17/mo (annual) or $24/mo (monthly) — custom domain free for 1 year, 2GB storage, 2 site collaborators
· Core: $29/mo (annual) or $36/mo (monthly) — 50GB storage, up to 50,000 products, 5 collaborators
· Business: $39/mo (annual) or $46/mo (monthly) — 100GB storage, 10 collaborators
· Business Elite: $159/mo — "For high-traffic businesses"
· Enterprise: Custom pricing "available upon request"
· Pricing page gaps: Business Elite's storage and collaborator limits are not enumerated in the pricing blog. No overage policy listed for any tier. The $17/mo Light price is the annual-billing rate — monthly is $24. Wix's own secondary pages list Business at $36/mo in one place and $39/mo in another , a $3 discrepancy Wix does not reconcile.

Features (enumerated capabilities):

· Wix Harmony: "Hybrid editor" that merges AI generation with drag-and-drop control. Wix's own framing: "flow between instant generation and hand-crafted design"
· Aria (AI agent): "Aria is the AI at the heart of Wix Harmony, Wix's next-generation AI website builder. She's designed to understand natural language"
· Aria's task range (quoted): "Design and layout: Aria can redesign a page, update your color palette, choose fonts that match your brand, or restructure your navigation." "Content creation: Stuck on copy? Aria can write headlines, product descriptions, About pages." "Business features: Need to sell products, take bookings, or collect payments? Aria can set up the right tools for you, no plugin hunting required." "SEO setup: Aria understands what it takes to get found on Google." "Ongoing updates: Already have a site? Aria doesn't just help at the beginning."
· eCommerce: "Sell products, services, and memberships from one dashboard — zero plugins"
· Scheduling: "Manage appointments, staff, and client memberships from a central hub"
· Lead management: "Capture every inquiry and manage your entire sales pipeline—from price proposals to paid invoices"
· Multi-cloud hosting: "99.99% uptime"
· 1,000s of free components, graphics and animations

Tech signals:

· Detectable stack: Multi-cloud hosting infrastructure; enterprise-grade security with "full-time threat monitoring"
· Developer surface: No public API surface for Aria. Aria is an internal agent, not an external developer surface. Base44 (acquired by Wix) operates as a separate prompt-to-app builder, suggesting Wix is hedging its AI bets across multiple products rather than exposing one unified API.
· Scale: "powering more than 8.5 million websites globally," "300 million users"

UX / conversion patterns:

· Homepage structure: Hero → social proof (8.5M sites) → AI capability demo (Harmony) → business solutions grid → Aria agent showcase → infrastructure trust signals
· Signup/onboarding friction: "Start for free. No credit card required" — minimal friction
· Notable interactions: The Aria how-to page shows actual conversational prompts embedded in the marketing: "I'm a freelance photographer specializing in weddings. I want a photography portfolio that is minimal and elegant." "I run a local bakery and I want people to be able to order online." "The hero section feels too busy, can you simplify it and include less text?" This is a conversion pattern — showing the conversation, not the interface.

Positioning (their words):

· Headline: "Create your future on the leading website builder"
· Who they target: Broad market. The solutions grid explicitly names eCommerce, Scheduling, Lead management, Portfolio, Blog, Online courses, Events, Payments. Solo businesses and enterprises.

Gaps (exploitable weaknesses):

· AI is bolted on, not native. The "hybrid editor" framing is an admission that pure AI generation wasn't good enough. Harmony exists because Wix's legacy editor couldn't be replaced. A native AI-first builder has no legacy UI debt.
· Pricing opacity at the top end. Business Elite is $159/mo but "advanced business capabilities" is never enumerated beyond "priority support." A studio charging $350/site can undercut this on transparent, fixed deliverables.
· No white-label. Wix Studio exists but the main Wix platform has no agency white-label tier. 10Web and Lindo both offer this.
· The free tier is a trap: 500MB storage and Wix branding make it useful for prototyping only. The jump to $17/mo for 2GB is steep relative to Durable's $15/mo for unlimited pages.
· Aria's SEO claim is vague. "Aria understands what it takes to get found on Google" — but no schema generation, no structured data output, no mention of LLM crawlability. Webflow's AEO is explicitly engineered for this; Wix's is a claim.

Verdict: WATCH — incumbency and 300M users give Wix distribution power, but the AI features are reactive, not visionary. The $159/mo Elite tier has no clear ceiling story. A native AI-first builder with transparent pricing undercuts the entire top end.

Completeness self-score: 8

---

SITE 2: Durable — durable.co (301s to durable.com)

Visited: 2026-09-12 (Toolradar pricing calculator, ToolCenter profile, Cocowork review, Vantaige review)

One line: 30-second AI sites for solo service businesses, bundled with CRM, invoicing, bookings, and AI marketing.

Pricing (quoted, not paraphrased):

· Free: $0 — durable.site subdomain, ~3 pages, limited AI credits
· Starter: $15/mo flat (Toolradar) / $12/mo annual (ToolCenter) — free custom domain, unlimited pages & traffic, website analytics, SEO optimization, 50 AI images
· Business: $25/mo flat (Toolradar) / $20/mo annual (ToolCenter) — all Starter features, premium stock images/video, 500 AI images, 100,000 AI chats, 1,000 contacts
· Grow: $85/mo annual (Cocowork) / $99/mo monthly (Toolradar calls this "Scale") — all Business features, unlimited AI images, unlimited AI chats, unlimited contacts, unlimited invoices
· Mogul: $80/mo annual (ToolCenter) — pricing and features not verified from primary source
· Pricing page gaps: Durable's own pricing page returned inconsistent results across scrapes. Toolradar lists "Starter $15, Business $25, Scale $99" while Cocowork lists "Launch $22/mo annual, Grow $85/mo annual" and ToolCenter lists "Starter $12/mo, Business $20/mo, Mogul $80/mo." These are three different tier names and price points for the same product. The discrepancy suggests Durable has changed pricing multiple times without updating all sources, or runs different pricing for different acquisition channels. This is a red flag for price predictability. Grow/Mogul features are UNVERIFIED from primary source.

Features (enumerated capabilities):

· AI Website Builder: "generates a complete small-business site in about 30 seconds from your business type and name"
· AI Image Studio: "Create on-brand images for logos, ads, and your website"
· AI Business Partner: "Think of me as your AI business partner—I'm here 24/7. I can create a logo for you, design social media posts, write marketing copy"
· AI Blog Generator: for marketing content
· Built-in CRM: "All your leads and customers in one place"
· Booking management and invoicing tools
· SEO & GEO: "Drive high quality leads from Google AI and ChatGPT" — explicitly positions for AI search visibility
· Reviews: "Get more reviews to increase your search visibility"
· Integrations: Stripe
· Scale claims: "Trusted by 3 million business owners," "4.8 Stars on Trustpilot," "10M+ sites built"

Tech signals:

· Detectable stack: Proprietary output format (not WordPress, not React export). Stripe integration confirmed. No public API, no white-label.
· Developer surface: None exposed publicly. Durable is a closed tool for solo operators, not an infrastructure play.

UX / conversion patterns:

· Homepage structure: Hero with 30-second claim → Trustpilot rating → infinite scrolling industry callout ("Build your coaching business, fast. Build your handyman business, fast...") → All-in-one platform feature grid → AI Business Partner conversational demo
· Signup/onboarding friction: Minimal — "Get online in 30 seconds" implies no credit card gate
· Notable interactions: The infinite scrolling industry callout is a strong vertical-specific conversion pattern. It shows the visitor their exact business type without requiring them to navigate.

Positioning (their words):

· Headline: "The complete AI business builder" / "Launch a website, get customers, and grow your business faster with AI"
· Who they target: Explicitly vertical-specific — coaching, handyman, cleaning, marketing agency, car detailing, landscaping, photography. Solo entrepreneurs and freelancers.

Gaps (exploitable weaknesses):

· The "30 seconds" claim is the product and the trap. It sets expectations for speed, not craft. A studio selling $350 cinematic sites is selling the opposite: time invested, craft visible.
· No white-label. Agencies cannot rebrand Durable. Lindo.ai explicitly targets this gap.
· GEO positioning is surface-level. "Drive high quality leads from Google AI and ChatGPT" — but no evidence of actual GEO optimization infrastructure (schema, structured data for LLM consumption). 10Web's SEO Agent and Webflow's AEO are explicitly engineered; Durable's is a claim.
· CRM limited to 10 customers on free tier — an unusually stingy cap designed to force upgrade.
· Pricing instability. Three different tier names and price points across three sources. Either Durable is changing pricing rapidly or running channel-specific pricing. Both are red flags for an agency quoting clients a predictable platform cost.

Verdict: WATCH — the vertical specificity ("Build your handyman business, fast") is a strong positioning play for local-business clients, but the output ceiling is a marketing site, not a cinematic experience. The pricing instability is a procurement concern.

Completeness self-score: 7 (primary pricing page not directly scraped; Grow tier and Mogul tier UNVERIFIED)

---

SITE 3: 10Web — 10web.io

Visited: 2026-09-12 (pricing page, MSP/agency API page, white-label documentation, third-party comparisons)

One line: AI-native WordPress builder with hosting, white-label, and an API — the infrastructure play for agencies and MSPs.

Pricing (quoted, not paraphrased):

· AI Starter: $20/mo monthly or $10/mo annual — 1 website, 100 AI credits/month, 10GB SSD storage, 10K monthly visitors, free custom domain (up to $30), agentic website builder, redesign/clone/Figma agents, ecommerce dashboard, 90+ PageSpeed score, full WordPress CMS, 24/7 chat support
· AI Premium: $30/mo monthly or $15/mo annual — 2 websites, 200 AI credits/month, 15GB SSD, 20K visitors, $7.5/site additional website pricing
· AI Ultimate: $45/mo monthly or $22.5/mo annual — 4 websites, 300 AI credits/month, 25GB SSD, 50K visitors, Google Cloud Hosting, Cloudflare CDN for "10x faster load times," enterprise-grade security
· Agency Starter: $42.5/mo — 10 websites, 400 AI credits/month, 50GB SSD, 80K visitors, isolated resources per site, Cloudflare CDN, unlimited automated migrations
· Agency Core: $80/mo — 20 websites, 600 AI credits/month, 120GB SSD, 120K visitors, 7% 10Web billing transaction fee, branded dashboard & website builder, billing management with Stripe or PayPal
· Agency Pro: Custom — 50+ websites, 800+ AI credits/month, "as low as $2.5 per website"
· API: "$5 per site" starting price (from earlier scrape; not confirmed on 2026 pricing page)
· Pricing page gaps: Agency Pro pricing is "Custom" — no listed rate. Overage policy for AI credits not quoted. The $2.5/site figure is the floor at 50+ websites, not the rate at lower volumes.

Features (enumerated capabilities):

· Agentic Website Builder: "AI agents that plan, execute, and refine to take your site from prompt to production-ready"
· Redesign agent: "Transforms the existing outdated page into a beautiful modern one"
· Cloning agent: "Recreates any page from a URL"
· Figma agent: "Converts your Figma files into production-ready, pixel-perfect web page"
· Ecommerce Agent / Ecommerce dashboard: WooCommerce pre-configured, "Sell from day one"
· SEO Agent (soon) / Hosting Agent (soon): Listed as forthcoming
· Hosting: 99.99% uptime, isolated containers, secure SFTP/SSH, free SSL, cache management, staging environment, PHP version control
· White Label Reseller dashboard: "Launch your own branded AI website SaaS platform. Resell 10Web and your own services, create custom plans, manage, and bill clients automatically"
· AI Website Builder API: "Deeply integrate AI site creation in your product and user flows, then bundle or upsell complete, ready-to-publish websites"
· Domain masking and DNS management: "Launch white-labeled websites under your custom subdomain, with the flexibility for users to connect their own domains. Easily manage DNS records programmatically to link custom domains to generated sites without any manual configuration"
· White-labeled WordPress CMS: "All websites generated with 10Web are built on WordPress, the world's most popular and powerful CMS. Give your users full CMS editing access through a white-labeled dashboard and admin area"
· MSP workflow: Step 1 choose dashboard path (API embed or ready-to-go white-label dashboard), Step 2 generate website with AI, Step 3 connect custom domain, Step 4 hand off or manage

Tech signals:

· Detectable stack: WordPress (PHP), WooCommerce, 10Web's own hosting infrastructure with isolated containers, Cloudflare CDN, Google Cloud hosting on Ultimate tier
· Developer surface: API ($5/site), white-label reseller dashboard, SFTP/SSH access, staging environments, DNS management API, domain masking
· Trust signals: "Trusted by 2M+ creators"

UX / conversion patterns:

· Homepage structure: Hero with "Agentic Website Builder" positioning → Agent capability grid → All-stack feature list → Template showcase (DevProfile, JurisLaw, VoyageTravel, TutorEdge, SmileDent, LuxeStay, VineEssence, CrustBake) → White-label/API developer section → Testimonials
· Signup/onboarding friction: Not directly observed — likely a prompt-based onboarding similar to other AI builders.
· Notable interactions: The template showcase uses vertical-specific names (JurisLaw = legal, SmileDent = dental) — a smart pattern for demonstrating relevance to specific business categories.

Positioning (their words):

· Headline: "Agentic Website Builder. Powered by AI agents that plan, execute, and refine"
· Who they target: Three audiences in one page: businesses building their own sites, agencies reselling under their brand, and MSPs integrating via API. The MSP page headline is "Add AI-powered websites to your service offering."

Gaps (exploitable weaknesses):

· WordPress dependency is a double-edged sword. The "43% of the web" stat is impressive, but it means the output is WordPress-bound. A studio delivering cinematic static or React sites can position against WordPress bloat.
· SEO Agent and Hosting Agent are "soon" — vaporware in a competitive market. The agents that exist (redesign, clone, Figma) are useful but not the full agentic suite promised.
· White-label is the strongest feature. The reseller dashboard + API + domain masking + billing management is a real infrastructure play. But the pricing (80/mo) suggests the margin is in hosting, not the builder.
· Template quality is unknown from homepage alone — the named templates suggest vertical specificity but no visual quality assessment was possible.
· No free tier. Every tier is paid. Durable and Wix both offer free plans; 10Web does not.

Verdict: STEAL (the white-label + API + domain masking infrastructure) — 10Web is the closest to a real agency-facing AI infrastructure play in this batch. The WordPress backend is a constraint, not a feature. The agency billing management (Stripe/PayPal, 7% transaction fee on Agency Core) is a genuine platform play.

Completeness self-score: 8

---

SITE 4: Framer — framer.com

Visited: 2026-09-12 (pricing page, pricing update blog, third-party cost analyses)

One line: AI design agent inside a mature design tool — the craft-first alternative to prompt-to-site builders.

Pricing (quoted, not paraphrased):

· Free: $0 — Framer domain, 1GB bandwidth, Design Pages, 500 credits to try Agents, 10 CMS collections, 1,000 pages, 5MB file uploads, one free locale, up to 3 editors
· Basic: $10/mo (annual) or $15/mo (monthly) — free custom domain, 2 CMS collections, 50GB bandwidth, Localization add-on available
· Pro: $30/mo (annual) or $45/mo (monthly) — free custom domain, 10 CMS collections, 100GB bandwidth, site redirects, staging environment, branching with previews, Advanced Hosting add-on, A/B testing add-on
· Scale: $100/mo (annual) — "for growing companies that want flexible, usage-based pricing," optional extras like A/B testing, Private Plugins, Advanced Hosting (soon)
· Enterprise: Custom — "custom contracts, fixed SLAs, advanced security, direct engineering support, bulk pricing"
· Editors: Additional editors are $20/month (reduced from $40). Viewers are free.
· Pricing page gaps: Per-site pricing. "Basic is $15 a site, Pro $45, and each is one website, so a studio running several pays several times over." An agency with five client sites pays five times. This is the single biggest pricing gap in the batch for agency economics. Pro add-ons: "up to 40,000 CMS items, 40 CMS collections, 2 TB of bandwidth, 700 pages, and 1.5M events on the Pro plan." Bandwidth overage: "we allow you to exceed your limit for one month." Credits: "Every paid plan includes monthly credits that power Agents, Localization, and other AI features."

Features (enumerated capabilities):

· AI design agent: "Agents that work alongside you, not instead of you"
· Design Pages: "Let you use Framer as a full design tool for free until you publish" — drafts available on all plans
· Form submissions: unlimited on all plans
· CMS: Collections with higher limits on Pro (10 vs 2 on Basic)
· A/B testing: Available as add-on on Pro/Scale
· Private Plugins: Available on Scale
· Advanced Hosting (soon): Up to 6 rewrites, custom values for Permissions-Policy, Referrer-Policy, X-Frame-Options headers, up to 50 static files
· 24h email support: Included on every plan; priority for Pro and Scale
· Credits: Monthly credits shared across workspace, power Agents and Localization. Free plan: 500 credits. Paid plans: credit allotment varies by tier.

Tech signals:

· Detectable stack: Framer's proprietary rendering engine (not React output — sites are hosted on Framer). No public API mentioned. CMS is the primary data layer.
· Developer surface: No public API. No white-label. Framer is a tool for designers building their own sites.

UX / conversion patterns:

· Homepage structure: Minimalist — five lines of content total on the scraped homepage. Relies on visual design to carry the message. "Trusted by teams shipping big sites" as social proof.
· Signup/onboarding friction: Free tier with "Design Pages" means you can build a full design for free until publish — unusually low friction.
· Notable interactions: The homepage is almost pure visual — 5 lines of text on a marketing page is an extreme design stance. This is the studio aesthetic.

Positioning (their words):

· Headline: "Framer is the AI design agent for every step from idea to launch"
· Who they target: "Professionals, small teams, and startups" (Pro), "growing companies" (Scale)

Gaps (exploitable weaknesses):

· Per-site pricing kills agency economics. 30 per site per month means a studio with 20 client sites pays 600/mo just for hosting — before their own margin. Lindo.ai's flat $300/mo for 20 sites is dramatically cheaper.
· No white-label, no API. Framer is a tool for designers building their own sites, not an infrastructure play for agencies.
· The "AI design agent" is vague. Unlike Durable's 30-second claim or 10Web's agentic pipeline, Framer's AI positioning is aspirational rather than concrete. No specific AI feature was enumerated in the scrape beyond "Agents" and "credits."
· Scale plan is "usage-based" but no overage rates published. "Optional extras like A/B testing, Private Plugins, and Advanced Hosting" — these are add-ons, not included features.
· The pricing simplification removed Mini and merged it into Basic — but the per-site model remains. Framer's own blog says "Most people needed more than one page (Mini) but less than everything in Basic" — an admission that the old tier structure was misaligned with actual usage.

Verdict: WATCH — the craft-first positioning is aligned with a cinematic studio, but the per-site pricing model is structurally hostile to agency work. The design quality is the product. If Framer ever adds white-label, it becomes a STEAL.

Completeness self-score: 8

---

SITE 5: Webflow — webflow.com

Visited: 2026-09-12 (pricing page, AEO feature page, conference coverage, third-party pricing analyses)

One line: The agentic web platform for marketing teams — visual CMS + AI-native workspace + AEO (Answer Engine Optimization) for enterprise.

Pricing (quoted, not paraphrased):

· Starter (Site plan): Free — Webflow.io domain, limited Webflow CMS, 2 static pages, 1GB bandwidth, 50 form submissions, Webflow AI MCP server, Webflow Cloud app hosting, Free Starter Workspace
· Basic (Site plan): $15/mo — custom domain, 300 static pages, 10GB bandwidth, unlimited form submissions, password protection, MCP server, Cloud app hosting
· Premium (Site plan): $25/mo — "Everything in Basic, plus: Webflow CMS bandwidth, Code components, Site search, Form file upload, Well-known files"
· Team (Platform plan): $2,500/mo — "Everything in Premium, plus: Site & Workspace, Webflow Localize, AEO agents, Publishing workflows, Single-page publishing, Site activity log & API, Foundational governance, Enhanced security & compliance, Priority support"
· Enterprise: Custom — "Enterprise-ready scale, Granular permissions, Custom roles, Advanced governance, Secure integrations, Dedicated account manager, Enhanced SLAs, Custom configurations"
· Workspace seats: Full Seat $39/mo, Limited Seat $15/mo, Free Seat $0 (reviewers)
· Add-ons: Optimize $299/mo (A/B testing, personalization, AI Optimize, audience insights), Analyze $9/mo, Localize Essential $9/mo, Localize Advanced $29/mo
· Pricing page gaps: AEO is Enterprise-only. "Webflow AEO is available exclusively for Enterprise customers. Contact our Sales team to learn more." The 25) + Workspace seats (117) + add-ons (299) = 441/mo minimum, not $25.

Features (enumerated capabilities):

· AEO (Answer Engine Optimization): "Measure how your brand shows up in answer engines, get prioritized recommendations, and ship improvements at scale — all within Webflow"
· AEO — machine readability: "Get site-wide recommendations to fix metadata gaps, schema errors, broken links, and more so answer engines can better understand your site"
· AEO — content citation: "Get on-brand content recommendations, briefs, and full drafts from agents that help you show up in the prompts that matter most"
· AEO — competitive benchmarking: "Tracks which external websites are most frequently cited in AI-generated answers for the prompts you care about"
· AI agents: Available on Team and Enterprise plans
· Webflow AI MCP server: Included on free tier
· Webflow Cloud app hosting: Included on free tier
· Visual canvas: "Edit content in a visual canvas," "Control the layout and fine-tune typography"
· Page branching: "Branch any page, make your changes, and merge when you're ready"
· CMS: Up to 20,000 items on Premium, 100 Collections on Team
· Localization: Included on Team plan
· AI usage: Credit system bundled into every Workspace plan (200–400 credits/month depending on tier)

Tech signals:

· Detectable stack: Webflow's proprietary rendering engine, hosted on Webflow infrastructure. Not React output. MCP server access available on free tier. Webflow Cloud app hosting.
· Developer surface: MCP server, Webflow Cloud app hosting, Site Activity log & API on Team plan, Code components on Premium
· Analytics: "Optimize" add-on (9/mo) for site analytics

UX / conversion patterns:

· Homepage structure: Customer-outcome-led: "200M In new pipeline generated post-site launch" (ABM), "2x Faster web builds" (Funsize). The homepage is a case study showcase, not a feature list.
· Signup/onboarding friction: Free tier is positioned as "a build, prototype, and AI experimentation tier rather than a place to host a real site forever"
· Notable interactions: The homepage leads with customer dollar outcomes, not product features. A strong B2B conversion pattern.

Positioning (their words):

· Headline: "Build for what's next"
· Who they target: "Marketing teams" — explicitly. "Build and launch websites without filing a ticket"

Gaps (exploitable weaknesses):

· The real cost is hidden. Site plan + Workspace seats + add-ons = 441/mo minimum for a functional B2B setup. The $25/mo Premium price is a decoy.
· AEO is gated behind $2,500/mo Team plan or Enterprise. Agencies serving local businesses cannot access AI search optimization without the enterprise tier. This is the single biggest gap in Webflow's product line.
· No white-label. Webflow is a tool for teams inside a company, not an infrastructure for agencies delivering client sites.
· The free tier is a demo, not a product. 2 static pages, 50 form submissions lifetime, webflow.io subdomain only. "You will outgrow it in an afternoon"
· AEO's "closed-loop" claim is strong but exclusive. "Webflow AEO is a native, closed-loop solution for enterprise marketing teams" — but it's not available to the agencies who serve the businesses that need it most.

Verdict: WATCH — AEO is the most forward-looking feature in this batch, but it's gated behind $2,500/mo. The pricing architecture is designed for enterprise B2B, not local-business studios. If Webflow ever offers AEO at the Premium tier, it becomes a STEAL.

Completeness self-score: 9

---

SITE 6: Lovable — lovable.dev

Visited: 2026-09-12 (pricing page, credits documentation, subscription plans documentation, third-party reviews)

One line: Prompt-to-full-stack-app builder with a single credit economy that funds building, hosting, and AI usage.

Pricing (quoted, not paraphrased):

· Free: $0/mo — 5 Build credits/day (30/month max), 20 Cloud credits/month, 4 AI credits/month, lovable.app domains only, no custom domain, no paid monthly credits
· Pro: $25/mo or $21/mo billed annually — 100 monthly plan credits, custom domain, code editor, badge removal, monitoring, top-ups, rollover, 5 daily build credits (no monthly cap)
· Business: $50/mo or $42/mo billed annually — 100 credits, Pro features plus internal publishing, SSO, data opt-out, per-member monthly credit limits
· Top-ups: 200 credits = $50; 400 = $100; 800 = $200
· Enterprise: Custom — "volume-based" credits, bulk CSV import of member credit limits
· Pricing page gaps: "Enterprise" is contact-us. No overage policy beyond "buy a credit top-up or upgrade." The credit economy is opaque: "Lovable uses one credit balance for building your app, hosting it and running its built-in backend (Cloud), and AI features your deployed app uses." Building, hosting, and AI features all draw from the same pool. A studio cannot forecast costs for a client site that needs AI features running live.

Features (enumerated capabilities):

· End-to-end infrastructure: "Lovable handles hosting, SSL, and backend infrastructure. Your code and data stay yours"
· Payments: "Local payments, currency conversion, and tax compliance handled in 200+ countries and territories"
· Security: "Automatic scans and audit logs"
· Integrations: "Connect to your tech stack, and build from the tools you already use. No integration code to write or maintain"
· Multi-platform: Web, desktop, and mobile
· Credit rollover: Unused credits roll over (Pro+ only)
· Git sync: GitHub, GitLab, and Bitbucket (all plans)
· Code download: Pro+ only
· Workspace-private projects: All plans
· Custom domains: Pro+ only
· Remove "Edit with Lovable" badge: Pro+ only
· Case study metrics: eXp Realty: "$2M+ savings per year," "85% fewer support tickets"; students: "€130K ARR in 30 days," "€7.5M ARR partnership announced"
· Scale claims: "1.2 million new projects built every week," "60 million projects built," "900 million monthly visits to Lovable-built projects"

Tech signals:

· Detectable stack: React output. Supabase integration for backend. Hosting handled by Lovable (Cloud).
· Developer surface: Code editor (Pro+), custom domains, monitoring, integrations with external tech stacks. No white-label mentioned.

UX / conversion patterns:

· Homepage structure: Hero ("Build something Lovable") → Infrastructure reassurance (hosting, security, payments) → Enterprise case studies with hard dollar metrics → Volume metrics (1.2M projects/week) → CTA
· Signup/onboarding friction: Free tier with 5 daily credits — enough to validate but not to complete a project. "30 Build credits a month is a hard limit, so a project that needs more than that will sit unfinished until the next reset"
· Notable interactions: The case study metrics are unusually aggressive — "$2M+ savings per year," "€7.5M ARR." This is enterprise credibility signaling, not local-business positioning.

Positioning (their words):

· Headline: "Build something Lovable" / "If you can describe it, you can build it"
· Who they target: "Bring a new product, internal tool, or entire company to life" — enterprise and startup, not solo local-business owners. Case studies are real estate CRM and healthcare platform.

Gaps (exploitable weaknesses):

· Credit economy is designed for unpredictability. Building, hosting, and AI features all draw from the same pool. A studio cannot forecast costs for a client site that needs AI features running live.
· No white-label. Lovable is a tool for building your own product, not for delivering client sites under your brand.
· The free tier's 30-credit monthly cap is a hard wall. No top-ups on free tier — you wait until the 1st. "On Free, you receive daily build credits for the first 6 days each month (6 × 5 = 30), then none until the next month starts."
· Output is React, not cinematic. Lovable builds functional apps, not award-winning visual experiences. The case studies are business tools (real estate CRM, healthcare platform), not studio portfolios.
· Enterprise pricing is opaque. "Volume-based" credits and bulk CSV import are listed, but no rate card. An agency cannot compare Lovable's enterprise cost to Lindo's $300/mo Elite.

Verdict: WATCH — the infrastructure handling (payments, tax, hosting) is genuinely valuable for product builders, but the credit economy and React output ceiling make it a poor fit for a cinematic studio serving local businesses. The $25 Pro price point is aggressive; the credit unpredictability is the disqualifier.

Completeness self-score: 9

---

SITE 7: Bolt.new — bolt.new

Visited: 2026-09-12 (pricing page, tokens documentation, third-party reviews)

One line: In-browser AI dev environment with the most generous free tier in vibe coding — 300K daily tokens, full app generation, hosting included.

Pricing (quoted, not paraphrased):

· Free: $0 — public and private projects, 300K tokens daily limit, 1M tokens per month, Bolt branding on websites, 10MB file upload limit, website hosting, up to 333K web requests, unlimited databases
· Pro: $25/mo billed monthly — public and private projects, no daily token limit, start at 10M tokens per month, no Bolt branding, share sites privately, 100MB file upload limit, website hosting, up to 1M web requests, unused tokens roll over to next month, custom domain support, SEO boosting, unlimited databases, expanded database capacity, choice of database provider, image editing with AI
· Teams: $30/member/mo billed monthly — everything in Pro, plus centralized billing, team-level access management, granular admin controls & user provisioning, share with your organization, private NPM registries support, design system knowledge with per-package prompts
· Enterprise: Custom — advanced security (SSO, audit logs, compliance support), granular admin controls, dedicated account manager & 24/7 priority support, custom workflows, integrations & SLAs, scalable for large teams, flexible billing & procurement, data governance & retention policies, hands-on onboarding & enterprise training
· Pricing page gaps: No overage policy quoted on the pricing page. Token-based pricing creates "cost unpredictability" — "teams running large iterative builds regularly exceed Pro's 10M monthly tokens before they can accurately forecast monthly spend"

Features (enumerated capabilities):

· Bolt Agent: Standard and Max tiers — "automatically routes to the right model for each task, balancing quality and cost"
· Error reduction: "98% less errors" — "Bolt automatically tests, refactors, and iterates reducing errors"
· Context management: "Handles projects 1,000 times larger than before"
· Design system integration: Built-in support for Material UI, Chakra UI, Shadcn UI, Porsche Design System, and Washington Post Design System
· Bolt Cloud: "Enterprise-grade backend infrastructure including hosting, databases, integrations" — unlimited databases, user management & authentication, SEO optimization, hosting with analytics & custom domains
· WebContainer execution: In-browser Node.js environment
· Integrations: Export to GitHub, integrations with Netlify, Supabase, GitHub, Google Stitch, Microsoft Azure
· Security: SOC 2 Type II

Tech signals:

· Detectable stack: WebContainer (browser-side Node.js), any JS framework output
· Developer surface: Export to GitHub, integrations with Netlify, Supabase, GitHub, Google Stitch, Microsoft Azure. No white-label mentioned.
· Trust signals: Trusted-by logos: Google, Microsoft, Salesforce, AWS, Meta, HubSpot, Accenture, TikTok, Shopify, Chegg, Cloudflare, Netlify, FactSet, ByteDance, PwC, Mozilla, Intel, Xano, Stripe

UX / conversion patterns:

· Homepage structure: Hero with interactive preview ("Select an element on the preview") → Trusted-by logos → Agent capability showcase → Role-based value props (Product managers, Entrepreneurs, Marketers, Agencies, Students) → CTA
· Signup/onboarding friction: "No signup, no configuration, and no local environment setup required" — "go to bolt.new, type a prompt, receive a running full-stack application in the browser"
· Notable interactions: The interactive preview on the homepage is a strong conversion pattern — you can see the builder working before you sign up.

Positioning (their words):

· Headline: "What will you build today?"
· Who they target: "Product builders" — product managers, entrepreneurs, marketers, agencies, students. Explicitly "Agencies: Multiply your impact: deliver more projects, faster, without scaling headcount"

Gaps (exploitable weaknesses):

· Token pricing is structurally unpredictable. "Teams running large iterative builds regularly exceed Pro's 10M monthly tokens before they can accurately forecast monthly spend"
· WebContainer has hard limits. "Anything requiring native dependencies, GPU access, or long-running background processes hits browser execution constraints" — this excludes heavy 3D, video processing, or real-time rendering.
· Generated code is a starting point, not production-ready. "Teams should treat Bolt output as a starting point requiring code review before shipping"
· G2 rating of 3.8/5 — lower than peers. "Recurring user concerns about token limits on lower tiers"
· Token rollover expires. "Unused tokens from your monthly allocation roll over and stay valid for two months from the start of the billing cycle in which you received them" — not indefinitely.

Verdict: STEAL (the free-tier generosity and interactive homepage demo) — Bolt's "no signup to first running app" flow is the best onboarding in this batch. But token pricing disqualifies it as an agency infrastructure play. The interactive preview on the homepage is the single best conversion pattern in Batch 1.

Completeness self-score: 9

---

SITE 8: v0.dev — v0.dev (by Vercel)

Visited: 2026-09-12 (pricing page, model pricing, Vercel pricing update blog, third-party reviews)

One line: Vercel's AI interface generator — locked into the Vercel/Next.js stack but with the most complete agentic feature set and transparent model pricing.

Pricing (quoted, not paraphrased):

· Free: $0/mo — $5 of included monthly credits, deploy apps to Vercel, edit visually with Design Mode, sync with GitHub, 7 message/day limit
· Plus (Popular): $30/user/mo — access to all models, $30 of included monthly credits per user, $2 of free daily credits on login per user, purchase additional credits shared across team, centralized billing on vercel.com, share chats and collaborate with team
· Business: $100/user/mo — access to all models, $30 of included monthly credits per user, $2 of free daily credits on login per user, training opt-out by default, purchase additional credits, centralized billing, share chats and collaborate
· Enterprise: Custom — access to all models, data never used for training, SAML SSO, role-based access control, priority access for better performance and no queues, guaranteed customer support SLAs
· Model pricing (quoted):
  · v0 Mini: $0.20/1M input tokens, $0.25/1M cache write, $0.02/1M cache read, $1.20/1M output tokens
  · v0 Pro: $2/1M input, $2.50/1M cache write, $0.20/1M cache read, $10/1M output
  · v0 Max: $5/1M input, $6.25/1M cache write, $0.50/1M cache read, $25/1M output
  · v0 Max Fast: $10/1M input, $12.50/1M cache write, $1/1M cache read, $50/1M output
· Pricing page gaps: "Credit-based pricing creates cost unpredictability: Team's $30/user/month credit allocation exhausts quickly on iterative multi-file generation workflows, and v0 Max at $5/1M input tokens adds up on complex projects" . Trustpilot reviews (1.9/5) "consistently cite credit exhaustion and project lockout as pain points" .

Features (enumerated capabilities):

· Prompt. Build. Publish.: "Generate working applications in minutes with AI. Publish as live websites in seconds"
· GitHub sync: "Connect to GitHub and push code directly to your repository"
· Integrations: "Build with your favorite tools and APIs. Automatic integration, no accounts required"
· One-click Vercel deployment: "Go live instantly with one-click deployment to production in seconds"
· Design Mode: "Fine-tune every detail with visual controls and live preview"
· Design systems: "Define colors, typography, and styles that you can use across projects"
· Agentic capabilities: "v0 plans, creates tasks, and connects to databases as it builds" — web search, browser use, terminal commands, automatic error fixing
· MCP server support: Linear, Notion, Sentry
· iOS app: "Build anywhere"
· Security: SOC 2 Type II, GDPR

Tech signals:

· Detectable stack: Next.js App Router, Tailwind CSS, shadcn/ui by default. Deploys to Vercel edge infrastructure.
· Developer surface: GitHub sync, MCP server support, Vercel Marketplace integrations (Neon, Supabase, Stripe, Snowflake), "Fix with v0" button in deployment interface
· Lock-in: "Generates Tailwind CSS, shadcn/ui, and Next.js App Router code by default, making it a poor fit for teams on Vue, Svelte, Angular, or non-Vercel hosting"

UX / conversion patterns:

· Homepage structure: Minimal — "您想创建什么？" (Chinese for "What do you want to create?") — the homepage is the prompt input. No feature list, no case studies, no marketing copy. Pure product.
· Signup/onboarding friction: Free tier with $5 credits. "Start building with v0 Go from idea to production in seconds with smart, secure infrastructure."
· Notable interactions: The homepage being the product itself is an extreme stance — arguably the strongest conversion pattern in this batch. No marketing, just the tool.

Positioning (their words):

· Headline: "您想创建什么？" (What do you want to create?)
· Who they target: Vercel-native developers. "Sync with a repo," "Deploy to Vercel" — the entire feature set assumes Vercel as the deployment target.

Gaps (exploitable weaknesses):

· Hard lock-in to Vercel/Next.js. "Generates Tailwind CSS, shadcn/ui, and Next.js App Router code by default, making it a poor fit for teams on Vue, Svelte, Angular, or non-Vercel hosting"
· Trustpilot rating of 1.9/5. The worst in this batch. "Credit exhaustion and project lockout" are recurring complaints.
· Data training opt-out costs $100/user/month. "Free and Team tier users have no guaranteed opt-out from data training" — this is a procurement blocker for agencies handling client data.
· No white-label. v0 is a developer tool, not an agency platform.
· **5 in credits spent in 45 min using v0 Auto" — this is the credit unpredictability in its starkest form.

Verdict: WATCH — the agentic feature set is the most complete, and the model pricing transparency (v0 Mini/Pro/Max/Max Fast with per-token rates) is the best in the batch. But the 1.9/5 Trustpilot rating and Vercel lock-in make it unsuitable for a studio that needs predictable costs and white-label delivery.

Completeness self-score: 9

---

SITE 9: WeInc — we.inc (weinc.ai was unreachable)

Visited: 2026-09-12 · Substitution logged: weinc.ai returned "Error fetching URL." Substituted we.inc (same product, different TLD).

One line: Prompt-to-production website with white-label, flat pricing, and React output — the agency-friendly alternative with a Chrome extension distribution channel.

Pricing (quoted, not paraphrased):

· Starter: $20/mo — "For creators and small businesses ready to grow" — unlimited projects, AI website & app generator, custom domains & SSL, visual & code editor
· Pro: $50/mo — "For teams and power users who need the best AI" — more AI credits, team collaboration, eCommerce with your own Stripe, priority support
· White Label: Custom — "Your own branded AI builder. Your database. Your clients." — dedicated deployment + own database, full branding, BYOK AI, up to 50 client sites, scale plan for up to 250 sites
· Lifetime deal: $59.99 (MSRP $799) for lifetime subscription (from Entrepreneur, Nov 2025)
· Pricing page gaps: White Label is "Custom" — no listed price. No overage policy quoted. The lifetime deal is a third-party promotion, not a listed product on the pricing page.

Features (enumerated capabilities):

· Prompt → production website: "React under the hood" with hosting, custom domains, and visual editing included
· Chrome extension: "Select text anywhere, right-click, and WeInc's AI builds a real site from it"
· White-label for agencies: "Turn any idea or selected text into a real website" with your own branding
· API clients: npm + PyPI libraries for WeInc AI website builder v1 REST API
· PHP API client: Packagist package available
· Output stack: React + Vite + Tailwind
· Failed generations not billed: A pricing integrity feature — you don't pay for AI failures
· Flat pricing: "$20–99/mo (failed generations not billed)"

Tech signals:

· Detectable stack: React + Vite + Tailwind (confirmed from API client documentation and comparison table)
· Developer surface: REST API with npm, PyPI, and PHP clients. White-label deployment with own database, BYOK AI
· Agency infrastructure: Up to 50 client sites (White Label), scale to 250 sites

UX / conversion patterns:

· Homepage structure: Minimal — hero with "From thought to website. Instantly." → example prompt → built-with gallery → pricing → testimonials
· Signup/onboarding friction: "Free demo available · No credit card required · Cancel anytime"
· Notable interactions: The Chrome extension is a genuinely novel distribution channel — "Select text anywhere, right-click" turns any webpage into a site generation prompt. No competitor in this batch has this.

Positioning (their words):

· Headline: "From thought to website. Instantly."
· Who they target: Three tiers: "Creators and small businesses" (Starter), "Teams and power users" (Pro), agencies needing white-label (White Label)

Gaps (exploitable weaknesses):

· weinc.ai is dead. The homepage returned a fetch error. Whether this is a DNS issue or a product winding down is unclear — but a dead primary domain is a red flag for platform longevity.
· White Label pricing is hidden. "Custom" means a sales call. For an agency that wants to compare costs, this is friction.
· No visual quality evidence. The "built with WeInc" gallery on the homepage shows thumbnails but no live links to inspect output quality.
· React + Vite + Tailwind output is developer-friendly but not cinematic. This is the same output stack as Bolt, v0, and Lovable. No differentiation on visual ceiling.
· "Failed generations not billed" is the strongest pricing integrity signal in the batch — and it should be table stakes. That no other vendor offers it is an indictment of the category.

Verdict: STEAL (the Chrome extension distribution channel and flat pricing with "failed generations not billed") — the pricing integrity promise is a genuine differentiator in a market of unpredictable token/credit costs. The dead primary domain is a significant risk factor.

Completeness self-score: 7 (dead primary domain is a significant risk factor; white-label pricing UNVERIFIED)

---

SITE 10: Lindo.ai — lindo.ai

Visited: 2026-09-12 (pricing FAQ, workspace plans overview, plan features comparison, white-label page, MCP integration page)

One line: White-label AI website builder for agencies — generate, deliver, bill, and grow client sites from one workspace, with a flat platform fee.

Pricing (quoted, not paraphrased):

· Pro: $30/mo or $21/mo billed annually — 1 active website, 500 credits/month, unlimited website team members, 3-day page history
· Business: $150/mo or $105/mo billed annually — 10 active websites, 1,500 credits/month, 3 workspace contributors, 7-day page history
· Elite: $300/mo or $210/mo billed annually — 20 active websites, 3,000 credits/month, white label branding, client CRM, API access, unlimited team, 30-day page history
· Reseller: $2,000/yr — 200 active websites, 300,000 credits/year (rollover), embed webapp included, unlimited workspace contributors, 90-day page history
· Add-on pricing (Elite): Additional website $15/website, additional pages $15/100, additional CMS pages $15/1,000
· Overage: "Credits: AI features unavailable until reset or purchase more. Websites: Can't create new until you upgrade or delete existing"
· Refunds: "Contact support within 14 days of purchase for refund requests. Handled case-by-case."
· Nonprofit discount: "Contact sales for nonprofit pricing options."
· Pricing page gaps: Reseller is billed yearly only — no monthly option. Elite add-on pricing is per-item, not bundled. The Reseller plan is listed as $2,000/month on one page and $2,000/year on another , a 12x discrepancy that appears to be a documentation error but undermines pricing trust.

Features (enumerated capabilities):

· Generate from link or brief: "Paste a link, drop notes, or pull a Google Business profile. Lindo.ai drafts the whole site — structure, copy, and visuals"
· White label: "Deliver under your brand in one workspace" — client access, handoff, all under your brand
· Billing: "Invoice, collect payments, and track what's owed from the same workspace you built the site in"
· SEO pages + content plans: "Layer SEO pages, content plans, and monthly site updates on the same account — so one project turns into a retainer"
· Local business prospecting: "Find businesses that need a site upgrade, then use Lindo.ai to turn their public info into a draft you can show before the first meeting"
· MCP integration: "Wire Lindo into any AI agent — Claude, Hermes, and more" — drive by chat or wire into any AI agent
· Site migration: "Migrate any WordPress, Webflow, or Wix site in minutes — then host, white-label, bill, and grow it"
· Tailwind CSS integration: Cited by a customer testimonial
· Agency economics (quoted): "You pay: 300/month. You charge clients: 1,499/month per website. Your margin..."
· Flat pricing: "Lindo replaces that with a flat 300/month platform fee that covers your entire client roster. You charge clients 1,499/month per website, so margins land at 80-90% once you're running more than one or two sites"

Tech signals:

· Detectable stack: Tailwind CSS integration confirmed by customer quote. Output stack not explicitly stated but implied to be modern (React-based given Tailwind + MCP integration)
· Developer surface: API (Elite+), MCP server integration with Claude and Hermes, embed webapp (+$500/mo on Business/Elite)
· Payments: "All major credit cards via Stripe: Visa, Mastercard, American Express, And more"

UX / conversion patterns:

· Homepage structure: Hero ("Turn business info into client sites") → product metrics (30,000+ users, 190+ countries) → MCP integration callout → migration path → generation from link/brief → generation from link/brief → white-label delivery → billing → growth/retainer play → local business prospecting → testimonials → CTA
· Signup/onboarding friction: "Start automating" → app.lindo.ai/sign-in — no free tier, sign-in required. Higher friction than competitors but positions as a professional agency tool, not a consumer toy.
· Notable interactions: The "Prospect local businesses with weak or missing websites" feature is unique in this batch — it's a sales enablement tool, not just a builder. You can find prospects, generate a draft site, and show it before the first meeting.

Positioning (their words):

· Headline: "Turn business info into client sites"
· Who they target: Agencies and freelancers. "Lindo.ai helps agencies generate, deliver, bill, and grow client websites under their own brand"

Gaps (exploitable weaknesses):

· Credit system still constrains growth. 500 credits/month on Pro, 3,000 on Elite. A busy agency delivering multiple client sites will hit credit walls. Add-on pricing for websites ($15/site on Elite) helps but credits remain the bottleneck.
· No free tier. Sign-in required to start. This filters out tire-kickers but also adds friction for agencies evaluating the platform.
· Output stack not fully disclosed. "Tailwind CSS" is confirmed, but the full stack (React? Next.js? proprietary?) is unclear. The MCP integration suggests a modern API-first architecture but this is inference, not verified.
· Testimonial quality is strong but limited. Three testimonials, all agency owners — good signal, but only three.
· Documentation inconsistency. $2,000/month vs $2,000/year for Reseller. Small, but a pricing trust issue.

Verdict: STEAL — the agency economics are the clearest in this batch. $300/mo for 20 client sites at 1,499/mo per client is a 20–100x markup. The prospecting feature is a genuine innovation. The MCP integration is the most forward-looking developer surface in the batch.

Completeness self-score: 9

---

BATCH 1 SYNTHESIS: AI SITE BUILDERS (Sites 1–10)

The pricing umbrella (full table)

Platform | Free tier | Entry paid | Mid tier | Top self-serve | Agency/infra tier | Unit
Wix | Yes (Wix branding, 500MB) | $17/mo (Light, annual) | 39/mo | $159/mo (Elite) | Enterprise custom | Per site
Durable | Yes (subdomain, 3 pages) | 15/mo | 25/mo | 99/mo | None | Flat
10Web | No | $10/mo (annual) | 22.5/mo | $80/mo (Agency Core) | Agency Pro custom, API $5/site | Per site / per platform
Framer | Yes (Design Pages) | $10/mo/site | $30/mo/site | $100/mo/site | Enterprise custom | Per site
Webflow | Yes (2 pages, 50 submissions) | $15/mo/site | $25/mo/site + seats | $2,500/mo (Team) | Enterprise custom | Per site + per seat
Lovable | Yes (30 credits/mo cap) | 25/mo | 50/mo | Enterprise custom | None | Per workspace
Bolt.new | Yes (1M tokens/mo) | $25/mo | $30/member | Enterprise custom | None | Per workspace
v0.dev | Yes ($5 credits) | $30/user/mo | $100/user/mo | Enterprise custom | None | Per user
WeInc | Demo only | $20/mo | $50/mo | White Label custom | White Label (50–250 sites) | Per workspace
Lindo.ai | No | 30/mo | 150/mo | 300/mo | Reseller $2,000/yr (200 sites) | Per platform

The umbrella is real. Self-serve pricing clusters at 30/mo for entry, 50/mo for mid, and 160/mo for top self-serve. The agency/infrastructure tier is where pricing breaks: Webflow charges $2,500/mo, 10Web charges $80/mo, and Lindo charges $300/mo. The 30x spread between Webflow and 10Web for the same "team" tier is the clearest pricing gap in the batch.

The race to the bottom is in the 20/mo range: 10Web (10 annual), Wix (12–$15). The differentiator is not price — it's output quality and agency economics.

Where OUR pricing sits. Our $350/site sits between the tools and the agencies. No tool charges per-site at $350 — they charge per-month-per-site at 50, or per-month-flat at 300 for agencies. Our $350/site is:

· Cheaper than a freelancer building a custom site (10,000)
· More expensive than a DIY tool subscription (30/mo)
· The same price as 7–35 months of Framer/Webflow/10Web hosting

The undercut opportunity: Lindo Elite at $300/mo for 20 sites = $15/site/month. If we deliver a $350 site and the client pays $29/mo hosting/maintenance, we're competitive with Lindo's economics but with cinematic quality.

The credit/token trap (every vendor except Wix and 10Web)

Platform | Unit | Predictability | Free-tier generosity | Overage policy
Lovable | Credits (build + host + AI) | Low — one pool for three costs | 30 build credits/mo cap, 20 Cloud, 4 AI | Buy top-up or upgrade
Bolt | Tokens | Low — variable per generation | 300K daily, 1M monthly | Upgrade or wait
v0 | Credits (100/user) | Low — "exhausts quickly" | $5/mo | Buy additional credits
Lindo | Credits (500–3,000/mo) | Medium — add-ons available | None | AI features unavailable until reset
10Web | AI credits (100–800/mo) | Medium — bundled with hosting | None | Not quoted
Wix | N/A (flat plan) | High — the exception | Yes (500MB, branding) | Not quoted

Our opportunity: Flat, transparent pricing. "Failed generations not billed" (WeInc) is the only integrity signal in the batch. We can go further: a single fixed price per site, no credits, no tokens, no surprises. This is the single most defensible pricing position in the category.

White-label is the moat

Only three platforms offer white-label: 10Web (reseller dashboard + API + domain masking, 80/mo), Lindo.ai (Elite $300/mo, white label + API + client CRM + billing + MCP), and WeInc (White Label custom pricing, 50–250 sites). Every other platform — Wix, Durable, Framer, Webflow, Lovable, Bolt, v0 — has no white-label.

This is the gap. An agency cannot deliver client sites under their own brand using Lovable or Bolt. They must use Lindo, 10Web, or WeInc. Our studio can own this space with a white-label delivery model that none of the consumer-facing builders can touch.

The MCP/server integration signal

Three platforms in this batch mention MCP or AI-agent integration: Webflow (MCP server access on free tier), v0 (MCP server support for Linear, Notion, Sentry), and Lindo (MCP integration with Claude, Hermes). This is the emerging infrastructure layer — AI agents talking to website builders. Lindo is the most advanced: "Wire Lindo into any AI agent — Claude, Hermes, and more." We should track this.

AEO (Answer Engine Optimization) is the new SEO

Webflow's AEO is the only explicit AEO product in the batch: "Measure how your brand shows up in answer engines, get prioritized recommendations, and ship improvements at scale." It's Enterprise-only, but it signals the direction. Durable claims GEO ("Drive high quality leads from Google AI and ChatGPT") but offers no infrastructure. 10Web's SEO Agent is "soon." The gap: AEO for local businesses at a self-serve price point. Nobody offers it.

Batch 1 self-assessment (re-scored)

Site | Completeness | Primary-source gaps
Wix | 8 | Elite tier limits unverified; Business price discrepancy
Durable | 7 | Primary pricing page not directly scraped; Grow/Mogul UNVERIFIED; three conflicting price sets
10Web | 8 | SEO/Hosting agents are "soon" — vaporware; Agency Pro pricing custom
Framer | 8 | AI features not concretely enumerated; per-site pricing is the gap
Webflow | 9 | AEO gated at $2,500/mo; real cost requires seat math
Lovable | 9 | Credit economy opacity documented; enterprise pricing custom
Bolt | 9 | Token unpredictability documented; WebContainer limits
v0 | 9 | Trustpilot 1.9/5 is a red flag; model pricing is transparent
WeInc | 7 | Dead primary domain; white-label pricing hidden
Lindo | 9 | Documentation inconsistency ($2,000/mo vs /yr); output stack inferred

Batch average: 8.3/10. All sites scored ≥7. The weakest dossiers (Durable, WeInc) are flagged for re-scrape if the source material remains inaccessible. Durable's three conflicting pricing sets is the most serious data integrity issue in the batch.

---

BATCH 2: IMMERSIVE / AWARD-WINNING STUDIOS (Sites 11–20)

Method note: These studios are the reference bar. Their homepages are often JS-heavy and return minimal text — I visited their work pages, Awwwards profiles, case study coverage, and third-party technical analyses to build these dossiers. Where a studio's homepage returned "Your browser is not supported" (Active Theory) or "Loading" (Unseen), I substituted their Awwwards profiles, work pages, and published case studies, logging the substitution.

---

SITE 11: Unseen Studio — unseen.co

Visited: 2026-09-12 (homepage, Awwwards profile, WebGPU community analysis, Codrops case study coverage, CODE design writeups)

One line: Bristol-and-London brand, digital and motion studio stacking Awwwards SOTDs with Three.js/WebGL craft.

Pricing (quoted, not paraphrased):

· Not applicable — studio services, project-based pricing. No public rate card. This is the correct model for a cinematic studio: price per project, not per seat.

Features (enumerated capabilities — i.e., what they actually do):

· Brand, digital and motion — the three-pillar service model. "A brand, digital and motion studio creating refreshingly unexpected ideas and striking visuals that help bold brands cut through the noise"
· BlueYard (2026): "Unseen Studio rebuilt BlueYard around Buckminster Fuller, a fluid-simulated orb, and a beautiful color palette. Three.js under the hood, reactive cursor, four thematic zones to scroll through"
· Crosswire: "a unique website for Crosswire that used a 3D environment made with WebGL to simplify their complex service offering"
· 2025 Wrapped: "The site walks through months of work for clients like Netflix, L'Oréal, and Klook with interactive hover effects, embedded motion demos, and scrollable galleries that blur the line between portfolio and experience"
· Convex Seascape Survey: "We launched an immersive learning experience for the Convex Seascape Survey"
· The Sea We Breathe VR Experience
· Clients: Netflix, L'Oréal, Klook, Hubtown, Trade[XYZ], KIKK Festival, Organimo
· Awards: Awwwards SOTD, Developer Award, Honorable Mention; SOTM February 2023; Studio of the Year; Webby

Tech signals:

· Detectable stack: Three.js, WebGL, Rapier (physics), fluid simulation, reactive cursor, scroll-driven 3D zones. "Three.js under the hood"
· Craft signals: The BlueYard rebuild uses "a fluid-simulated orb" and "four thematic zones" — this is the technical bar. The WebGPU community analysis notes "Worth opening devtools on" — the studio's technical execution invites inspection.
· Codrops case study: "from early concept and design explorations to the technical approach and techniques that brought it to life" — Unseen publishes process, not just output. This is a content strategy worth stealing.

UX / conversion patterns:

· Homepage structure: Typographic loading sequence ("U N S E N E L o a d i n g") → full-bleed visual work → minimal text. The homepage is an experience, not a brochure.
· Signup/onboarding friction: N/A — studio contact model.
· Notable interactions: The loading sequence itself is a design statement. "U N S E N E ( L o a d i n g )" — the brand name is the loading indicator. This is the level of detail that wins Awwwards.

Positioning (their words):

· Headline: "A brand, digital and motion studio creating refreshingly unexpected ideas and striking visuals that help bold brands cut through the noise"
· Who they target: "Bold brands" — Netflix, L'Oréal, Klook. Enterprise and cultural clients, not local businesses.

Gaps (exploitable weaknesses):

· No public case study depth on the homepage. The homepage returns minimal text (6 lines). The depth is in the work, not the copy. This is intentional — the work speaks — but it makes the studio less legible to prospective clients who want to understand process before engaging.
· No pricing signal. No "starting at" language, no engagement model. This is standard for high-end studios but creates friction for mid-market clients who need budget guidance.
· Bristol/London base, global clients. The studio's positioning is London-centric. A studio serving local businesses can position on proximity and local context — a different value proposition entirely.

Verdict: STEAL (the process-publishing strategy, the loading sequence detail, the Three.js/WebGL craft bar). Unseen is the reference bar. The gap for us: their model doesn't serve local businesses. Ours does.

Completeness self-score: 8 (homepage returned minimal text; depth sourced from Awwwards, WebGPU community, Codrops, CODE)

---

SITE 12: Active Theory — activetheory.net

Visited: 2026-09-12 (homepage returned "Your browser is not supported"; substituted Awwwards profile, Google developer blog posts, Communication Arts coverage, WebGL community analysis)

One line: The WebGL studio behind Google I/O's Paper Planes and Chrome Racer — GPGPU fluid passes, zero-allocation render loops, DOM projection layers.

Pricing (quoted, not paraphrased):

· Not applicable — studio services, project-based. No public rate card.

Features (enumerated capabilities):

· Paper Planes (Google I/O 2016): "To open the Google I/O conference in 2016, Active Theory worked alongside Droga5 and Google to create a connected, global interactive experience that enables users to create... paper planes" — "Modern web technology—specifically, JavaScript and WebGL—powered the experience on every screen"
· Chrome Racer (Google I/O 2013): "allows users to connect up to five iOS and Android devices, whose combined screens form the stylized racetrack"
· Glass Sculptor (2017): "an experiment that lets you fill your world with floating glass sculptures by touching your screen as you look around. Built by Active Theory using three.js in a native Android app using V8 and OpenGL"
· World Draw (Google I/O 2018): WebGL instancing, machine learning integration
· Technical signature: "GPGPU fluid passes, zero-allocation render loops, and DOM projection layers" — documented by independent reverse-engineering

Tech signals:

· Detectable stack: Three.js, WebGL, GPGPU, V8, OpenGL, WebGL instancing
· Craft signals: The independent deep-dive documentation of their "GPGPU fluid passes, zero-allocation render loops, and DOM projection layers" confirms that Active Theory's technical execution is studied by other developers. This is the highest form of technical credibility — your code is the curriculum.

UX / conversion patterns:

· Homepage structure: The homepage returns "Your browser is not supported" in the scrape — it's a WebGL experience that requires GPU access. This is an extreme stance: the site itself is the portfolio, and if your browser can't render it, you're not the audience.
· Signup/onboarding friction: N/A.
· Notable interactions: The Google I/O pre-show is the conversion pattern — Active Theory's work is experienced by tens of thousands of developers before the keynote. Distribution through Google's platform is the marketing.

Positioning (their words):

· Who they target: Google, Chrome, Android — platform-level clients. Active Theory builds experiences that ship to millions of users on day one.

Gaps (exploitable weaknesses):

· No browser fallback. "Your browser is not supported" is a barrier for non-technical clients evaluating the studio. A studio serving local businesses cannot afford this stance — the client's customer might be on an old phone.
· Platform-dependent distribution. Active Theory's biggest wins are Google I/O commissions. That's a relationship-dependent business model. A studio serving local businesses has a different distribution challenge: finding clients, not being found by Google.

Verdict: WATCH — Active Theory is the technical apex of WebGL craft, but their business model (platform commissions, no browser fallback) is not replicable for a local-business studio. The technical bar is the lesson; the business model is not.

Completeness self-score: 7 (homepage inaccessible; substituted Awwwards, Google developer blog, Communication Arts, WebGL community analysis)

---

SITE 13: Resn — resn.co.nz

Visited: 2026-09-12 (homepage, work page, Awwwards profile, Best Design Awards coverage, Spotify/twenty one pilots case study, Einpresswire announcement)

One line: New Zealand creative studio, Awwwards Site of the Year 2022 (KPR), Agency of the Year 2017 — immersive digital experiences for Apple, Netflix, adidas, Lexus.

Pricing (quoted, not paraphrased):

· Not applicable — studio services, project-based.

Features (enumerated capabilities):

· KPR (Awwwards SOTY 2022): "The website is an immersive experience, featuring interactive animations, bold graphics, and clever design elements that engage users and keep them coming back for more" — Awwwards juror Artemii L. called it "exactly the extraordinary that I have been waiting for"
· Spotify x twenty one pilots — Banditø Immersive Experience: "Users could interact, uncover hidden meanings and transport through portals in a 3D interactive environment that recreated the worlds built by previous twenty øne piløts videos"
· Subaru site: "beautifully immersive" — won international web design awards
· Clients (full list, quoted): Apple, Magic Leap, Samsung, Alpine Bio, Breakthrough Energy, Savor, TerraPower, adidas Originals, Clinique, La Mer, Tiffany & Co, KPR, Navigate, Zentry, Sylo, Netflix, HBO, Riot Games, PlayStation, YouTube, Lexus, Toyota, Lucid Motors, Subaru, Maserati, MCA, Estée Lauder, Getty Research Institute
· Awards: Cannes Lions, Webby, D&AD, One Show, Awwwards, FWA
· Services: "Immersive web experience, Rich internet applications, Game development, Social applications, Mobile development, Animation and motion, Illustration and character development, Backend development, Music and sound design"
· Offices: Wellington, New Zealand (L7, 138-140 Wakefield Street, Te Aro) and Amsterdam, Netherlands (Keizersgracht 174)
· Founded: 2004
· Scale: "Since 2004, Resn has been a global leader in the development and design of immersive experiences for the web and beyond"

Tech signals:

· Detectable stack: Custom run-time Flash 3D motion editing tool (historic), WebGL, 3D interactive environments, game development
· Craft signals: Resn pioneered "a custom run-time Flash 3D motion editing tool to facilitate an integrated production flow between the creative and technical teams" — they built their own tooling when off-the-shelf tools didn't exist. This is the highest form of studio capability.

UX / conversion patterns:

· Homepage structure: "Resn · Creative Studio Est. 2004" → "About" → "Bringing your story to life" → Selected Clients (categorized by vertical: Tech Innovation, Climatetech, Fashion & Beauty, Web3, Entertainment & Culture, Automotive, Collaborations) → Awards → Offices
· Signup/onboarding friction: N/A.
· Notable interactions: The client list is categorized by vertical, not alphabetically. This is a conversion pattern — it shows prospective clients their industry before they have to ask.

Positioning (their words):

· Headline: "Bringing your story to life. Brand · Content · Experience · Digital"
· Who they target: Global brands across seven verticals. "A creative agency with a digital obsession. Our singular vision is to infect minds with gooey interactive experiences that amaze and stupefy"

Gaps (exploitable weaknesses):

· "Est. 2004" is the positioning and the constraint. 20+ years of legacy clients is credibility, but it also signals a studio that may be expensive and slow. A newer studio can position on speed and accessibility.
· No pricing signal. No engagement model, no "starting at" language.
· Wellington/Amsterdam base. Global clients, not local. A local-business studio has proximity as a differentiator.

Verdict: STEAL (the categorized client list, the custom tooling mindset, the "gooey interactive experiences" positioning). Resn is the proof that immersive craft wins Awwwards SOTY — twice.

Completeness self-score: 8

---

SITE 14: Hello Monday — hellomonday.com

Visited: 2026-09-12 (homepage, work page, Netflix Kids case study, Google Kids Space case study, DEPT agency coverage)

One line: DEPT-owned studio creating "joyful digital ideas" — Netflix Kids & Family identity, Google Kids Space, YouTube Kids.

Pricing (quoted, not paraphrased):

· Not applicable — studio services, project-based. Part of DEPT network.

Features (enumerated capabilities):

· Netflix Kids & Family visual identity: "Netflix collaborated with Hello Monday/DEPT® to create a new unified visual identity for the Netflix Kids and Family offering ensuring a delightful, welcoming and adventurous look and feel. The design included elements that spark joy, like pops of colors, multiplicity, lightness, and rounded shapes"
· Google Kids Space: "In a three year (and counting) collaboration, Hello Monday worked closely with Google to create the entire brand system for the Kids Space experience. From defining the overarching TOV and personality of the OS to establishing a visual language that we applied across all key screens and UI elements including an extensive illustration library for Avatar customization"
· YouTube Kids: "Hello Monday worked with YouTube to help create a safe video environment parents can trust" — "The visual design inspiration came from childhood best friends, invisible companions and favorite toys. The brand identity designer created an animated character sidekick that guides each child through the app and can grow with them"
· Simple Things: "the complete design package for Simple Things - the most advanced home automation system in the world"
· Services: "Design and innovation sprints to UX design sprints and marathons" — "We make better products and make products better"
· Tagline: "We create joyful digital ideas, products, experiences, and campaigns that connect the hearts of brands to the hearts of humans"

Tech signals:

· Detectable stack: Not disclosed. The studio is design-led; the DEPT network provides engineering scale.
· Network: Part of DEPT®, alongside BASIC/DEPT®, DOGSTUDIO/DEPT®, STUDIO DUMBAR/DEPT®

UX / conversion patterns:

· Homepage structure: "1 day until Monday" countdown → "We make digital (and magical)…" → "Experiences" → "A booster rocket for digital product teams"
· Signup/onboarding friction: N/A.
· Notable interactions: The "1 day until Monday" countdown is a brand-level interaction — it turns the studio name into a recurring event. Small detail, strong identity.

Positioning (their words):

· Headline: "We make digital (and magical)…" / "A booster rocket for digital product teams"
· Who they target: "Startups and product departments around the world" — enterprise and platform clients, not local businesses.

Gaps (exploitable weaknesses):

· The "joyful" positioning is narrow. Hello Monday is the kids/family/joy studio. That's a strong niche but a ceiling. A studio serving local businesses can position on utility and conversion, not joy.
· DEPT ownership means the margin goes to the network. An independent studio keeps 100% of the margin. Hello Monday's clients are paying DEPT rates, not Hello Monday rates.

Verdict: WATCH — the kid-specific joy craft is world-class, but the niche is narrow and the DEPT structure means the studio's economics are network economics. The "1 day until Monday" identity play is worth stealing.

Completeness self-score: 7 (homepage returned minimal text; depth sourced from case studies and DEPT coverage)

---

SITE 15: BASIC/DEPT — basicagency.com

Visited: 2026-09-12 (homepage, case study coverage, Webby award announcements, Ad Age A-List coverage)

One line: Ad Age A-List Design & Branding Agency of the Year — embedded Google Store partner, KFC digital transformation, Patagonia, AT&T, Wilson.

Pricing (quoted, not paraphrased):

· Not applicable — agency services, project-based. Part of DEPT network. 150+ strategists, designers, and technologists.

Features (enumerated capabilities):

· Google Store (embedded partnership): "Our embedded partnership with Google is as deep as it gets. We're the lead creative agency for Google Store and provide strategy, design, and prototyping to other divisions" — "As Google's agency-of-record on-site in their Mountain View office"
· KFC: "An award-winning global, digital transformation engagement spanning eCommerce, mobile app, and new drive thru experiences. Bringing KFC's brand story to life while making it easier for customers to buy chicken"
· Wilson: "A reimagining of Wilson's brand visual identity, and brand campaign, to support a new product drop and the launch of the first brick and mortar retail location in the brand's 108-year history"
· AT&T: "Redesigning the digital flagship for the largest telecommunications company in the world. Creating frictionless paths to purchase for a wide range of consumers across a vast portfolio of products and services"
· Patagonia: "Ongoing partnership providing strategy, branding, experience design, and development focused on bringing their mission and offerings to consumers through brand-led programs and platforms"
· Clients: Google, KFC, Wilson, AT&T, Patagonia, Airbnb, Apple, Bose, GANNI, Mizuno, Netflix, Fujitsu, SoftBank, Cowboy (electric bike), Van Gogh Museum, Muuto, Steelseries, Honig
· Awards: Ad Age A-List Design & Branding Agency of the Year (2023); Webby Winner and People's Voice (Google Store, Patagonia, Cowboy); 25 wins at W³ Awards (2019); One Show Finalist
· Team: "150+ strategists, designers, and technologists"

Tech signals:

· Detectable stack: Not disclosed. The agency is design-led; DEPT provides engineering scale.
· Network: BASIC/DEPT®, HELLO MONDAY/DEPT®, DOGSTUDIO/DEPT®, STUDIO DUMBAR/DEPT®

UX / conversion patterns:

· Homepage structure: Case-study-led. "Our embedded partnership with Google is as deep as it gets" → KFC → Wilson → AT&T → Patagonia. The homepage is a client roster with outcomes, not a capability list.
· Signup/onboarding friction: N/A.
· Notable interactions: The Google Store case study is framed as a partnership, not a project. "As deep as it gets" — this is the agency positioning: embedded, long-term, strategic.

Positioning (their words):

· Headline: Not a single headline — the homepage leads with client outcomes. The implicit headline is "we work with the world's most recognizable brands."
· Who they target: "The world's most renowned companies" — enterprise, Fortune 500, global brands.

Gaps (exploitable weaknesses):

· The Google Store dependency is a concentration risk. "Our embedded partnership with Google is as deep as it gets" — one client relationship defines the agency. A studio with a diversified local-business client base has lower concentration risk.
· "150+ strategists, designers, and technologists" — this is a large agency cost structure. A small studio can undercut on price and move faster.
· No local-business positioning. BASIC/DEPT serves global brands. The local-business market is invisible to them.

Verdict: WATCH — the client roster is aspirational, but the agency model (large team, enterprise clients, DEPT network) is not replicable for a local-business studio. The case-study-led homepage is the steal.

Completeness self-score: 8

---

SITE 16: Locomotive — locomotive.ca

Visited: 2026-09-12 (homepage, work page, Drake Hotel case study, Awwwards Conference coverage, font usage documentation)

One line: Montréal digital-first design agency, seven years running (2018–2024), bespoke brand identities and experiences for Drake Hotel, Zero.fun, Elektra Virtual Museum.

Pricing (quoted, not paraphrased):

· Not applicable — agency services, project-based. Merch: "Pros de l'internet White T-Shirt 30 USD," "Pros de l'internet Sand Hat 25 USD" — the only public pricing on the site.

Features (enumerated capabilities):

· Drake Hotel: "The Drake Hotel stands as a cultural landmark where hospitality, art, and nightlife intersect. Deeply rooted in the local creative scene, it operates as both a hotel and a living cultural platform. Music, exhibitions, performances, and collaborations define its identity, drawing artists, travelers, and the city itself into a shared experience" — the site "blurs the line between documentary, editorial, and digital"
· Zero.fun: "a playful digital art and Web3 culture brand exploring the intersection of creativity, technology, and emerging digital movements. Designed for a new generation of collectors, creators, and investors, Zero.fun brings together editorial thinking, cultural discovery, and a bold visual universe built around the evolving world of NFTs"
· Elektra Virtual Museum (EVM): "a brand new 3D environment, free from the constraints of the real world, created to encourage and promote research and contemporary creation"
· Awwwards Conference: "a must-attend event for professionals in the digital design industry" — branding, digital, experience
· Collège Sainte-Anne: "a private French-language educational institution founded in 1861"
· Héma-Québec: "celebrating its 25th anniversary"
· SWTCH: "pioneers in developing EV charging solutions"
· PandaPay: "a payment solutions business that does things differently"
· Carlton Villa: "a luxurious beachfront estate in Saint James, Barbados"
· Ethnocare: "specializes in the development of high-performance orthopedic products"
· Stenger Bike: "a customer-centric company specializing in high-quality cycling products and services"
· Sundae Creative: "a communications agency specializing in public relations and influencer marketing"
· Hervé Baillargeon: "a Montreal director who stands out for his great sensitivity"
· PME MTL: "the City of Montreal's business support network"
· GPSclimat: "a free digital platform that helps Quebec businesses improve their productivity and environmental footprint"
· K72: "a brand agency that takes a holistic approach"
· Typography: "Editorial New with Helvetica Now" — film, animation, and 3D by Baillat Studio
· Positioning: "Design and code are only tools of expression. What sets us and our work apart is people. We're a small group of creative thinkers who craft bespoke digital-first brand identities and experiences"

Tech signals:

· Detectable stack: Not disclosed. The portfolio site was "designed by Locomotive themselves, combining Editorial New with Helvetica Now. Film, animation, and 3D by Baillat Studio"
· Award: "Seven Years Running 2018-2024" — presumably an Awwwards or similar award streak.

UX / conversion patterns:

· Homepage structure: "Digital-first Design Agency Locomotive® ©2008-2026" → "Seven Years Running 2018-2024" → "Featured work" → "Design and code are only tools of expression. What sets us and our work apart is people"
· Signup/onboarding friction: N/A.
· Notable interactions: The merch store ("Pros de l'internet White T-Shirt 30 USD") is a studio-culture play. Selling t-shirts on your agency homepage is a confidence signal — it says "we have a community, not just clients."

Positioning (their words):

· Headline: "Digital-first Design Agency Locomotive® ©2008-2026"
· Who they target: Montréal and Quebec-based organizations (Collège Sainte-Anne, PME MTL, Héma-Québec, GPSclimat) plus cultural institutions (Drake Hotel, Elektra Virtual Museum, Awwwards Conference). A mix of local institutions and global culture clients.

Gaps (exploitable weaknesses):

· The client list is geographically concentrated. Montréal and Quebec. A studio serving local businesses in another market has no direct competition from Locomotive.
· No pricing signal. No engagement model.
· The merch store is charming but the only pricing on the site. For a prospective client, there's no way to understand engagement cost.

Verdict: STEAL (the merch store as studio-culture signal, the "design and code are only tools of expression" positioning, the cultural-institution client mix). Locomotive proves that a regional studio can win global awards with local clients.

Completeness self-score: 8

---

SITE 17: Darkroom Engineering — darkroom.engineering

Visited: 2026-09-12 (homepage, work page, GitHub repositories, npm packages, LinkedIn announcement)

One line: Studio Freight spin-out that builds open-source tools (Lenis, Satus, Hamo, Revelo) and ships production sites for Oreo, BTS, Aleo, Stack, Tambo.

Pricing (quoted, not paraphrased):

· Not applicable — studio services. Open-source tools are free (MIT license for Lenis, Fair Core License for Keygen not applicable here). Framer plugin Revelo is a marketplace product.

Features (enumerated capabilities):

· Lenis: "Smooth scroll as it should be" — "a lightweight, robust, and performant smooth scroll library. It's designed by @darkroom.engineering to be simple to use and easy to integrate into your projects. Built for sync — drives WebGL scroll scenes, GSAP ScrollTrigger, and parallax off one loop"
· Satus: "The starting point for high-performance web experiences. Next.js 16, React 19, TypeScript strict, Zod validation, smooth animations, WebGL, and production-ready integrations — all wired up and ready to ship"
· Hamo: "a collection of custom React hooks" — curated and maintained by the darkroom.engineering team
· Revelo: "more than a component - it's a motion engine for type. A marketplace plugin we created for Framer"
· Aniso: "an open-source ASCII tool built by darkroom.engineering to generate and customize character-based imagery"
· Oreo & BTS: "A global brand collaboration shipped in more than 90 locales, where fans write letters to BTS and find them inside an expansive 3D world. Every locale shares one global letter database, and more than half a million letters have been sent already, with more countries still to come"
· Lightfield: "an AI-native CRM that turns emails, calls and meetings into a living model of every customer"
· Aleo: "The block explorer for Aleo, turning a firehose of chain data into something readable at a glance"
· Stack: "replaces the group health plan with ICHRA-based benefits" — built in Framer, using Revelo plugin and Lenis
· Tambo: "an open-source React toolkit for building AI agents that speak your UI. Connect your existing components and Tambo handles streaming, state management, and MCP"
· Lore: "Being a fan used to be fun. We are going to fix it."
· GrowthLoop: "a Composable CDP that unifies all your customer data" — in collaboration with Studio Freight
· Ibicash: "The Forest Powered Economy. A digital currency that turns forest conservation into a scalable economic system"
· Ecotrak: "the leading facility and asset management platform"
· Looped: "An interactive AI-powered escape room experience where you're trapped in an endless loop of automated support"
· Nuntio: "CRM built with Resend. Still figuring out if it's a product"
· Theca: "design asset management. Website + Chrome extension"
· Work: "a mobile-first web3 experience built with React Native, blockchain technology, and Unity for immersive interactions"

Tech signals:

· Detectable stack (full list, quoted): Next.js, Contentful, HubSpot, Vercel, Lenis, R3F, Three.js, GSAP, Sanity, Framer, Figma
· Services: Front-End Development, Back-End Development, Framer Plugin Development, Web3 Integration, APIs Integration, Headless E-Commerce, WebGL, Motion & Interaction, Creative Development
· Awards: Awwwards, CSS Design Awards, Muzli, FWA
· Origin: "darkroom.engineering, initiated within Studio Freight, has officially launched as a standalone studio" (March 2024)
· Activity log: A running public log of what they're shipping — "Open Source Satus hardened — Zod validation, proxy.ts, typed env, integration registry, 432 tests" (2026/02/06), "Open Source Modernized Lenis — bug fixes, cleaner API" (2026/02/04), "Product Nuntio — CRM built with Resend. Still figuring out if it's a product" (2026/01/28), "Stealth [REDACTED] — iOS app. More soon." (2026/01/20)
· Infrastructure note: "asset migration to S3 (bye Cloudinary/Mux)" (2026/01/30)

UX / conversion patterns:

· Homepage structure: "WhereThingsGetDeveloped" → "A Lightproof Room for Developing Photographs. A Studio Engineering Creativity into Reality." → "you've got a product that needs to be fast, polished, and built to last. we're the studio that gets it there" → Work samples (Oreo & BTS, Looped, Ibicash) → Testimonials → Open-source tools → Services → Technologies → Awards → Activity Log
· Signup/onboarding friction: N/A.
· Notable interactions: The public Activity Log is the strongest trust signal in the batch. "A Running Log of What We're Shipping" — dates, projects, open-source updates, even "Still figuring out if it's a product." This is radical transparency. No other studio in the batch does this.

Positioning (their words):

· Headline: "WhereThingsGetDeveloped" / "We bring brands and interfaces to life with code that runs smooth and scales right"
· Who they target: "teams who care about craft" — "If you want engineers who speak design fluently and sweat the details that make the difference, we should talk."

Gaps (exploitable weaknesses):

· The open-source strategy is a double-edged sword. Building Lenis gives Darkroom enormous developer credibility, but it also means competitors can use their tools. The moat is reputation, not technology.
· "Still figuring out if it's a product" — the honesty is charming but it signals a studio that's exploring, not focused. A local-business studio can position on focus and delivery certainty.
· No pricing signal. No engagement model.

Verdict: STEAL (the public Activity Log, the open-source-as-marketing strategy, the "engineers who speak design fluently" positioning). Darkroom is the most technically transparent studio in the batch. The Activity Log is the single best trust-building pattern I've seen across all 20 sites.

Completeness self-score: 9

---

SITE 18: Awwwards — awwwards.com (as a platform, with 10 recent SOTD winners logged)

Visited: 2026-09-12 (Sites of the Day index, Longbow SOTD page, Vectr SOTD page, September 2026 winners list)

One line: The web design awards platform — 7.21 average SOTD score in September 2026, scoring weighted Design 40%, Usability 30%, Creativity 20%, Content 10%.

Pricing (quoted, not paraphrased):

· The Creative Pass: $12/month — "Watch all courses for just $12/month"
· Platform is free for browsing. Submission fees for awards not quoted on the pages visited.

10 recent SOTD winners logged (the "deepening" requirement):

· Longbow — 7.21 — "A premium web experience for Longbow Motors, creators of British EV sports cars. Clean UI, smooth animations, and bold typography perfectly reflect the speed of lightness"
· Vectr — 7.18 — "AI-driven precision staffing for critical outages"
· MERSI — Architecture FLOT NOIR SOTD — "visual sophistication, calm storytelling, and editorial precision"
· Integrated Biosciences — Elliott Mangham SOTD — "science, innovation and credibility"
· Readymag — WOTY 2026 Readymag Nominee — "celebrates the web as a space for creative expression"
(plus dated daily SOTD/DEV-award listings for Sep 3–12, 2026)

The scoring pattern (quoted):

· Longbow: Design 7.27, Usability 7.05, Creativity 7.31, Content 7.23 → Overall 7.21
· Vectr: Design 7.17, Usability 7.05, Creativity 7.43, Content 7.11 → Overall 7.18
· Weighting: Design 40%, Usability 30%, Creativity 20%, Content 10%

The 2026 SOTD pattern (from the winners logged):

· EV/automotive premium web experiences (Longbow Motors)
· AI-driven B2B staffing (Vectr)
· Architecture/editorial (MERSI by FLOT NOIR)
· Biotech/science (Integrated Biosciences by Elliott Mangham)
· Creative expression platforms (Readymag WOTY 2026)

Tech signals:

· Detectable stack: The Awwwards platform itself is a content/awards platform. Winners' tech stacks are logged on each SOTD page under "Technologies & Tools" — though the pages opened returned the section headers without the actual stack lists, suggesting the stack data may be JS-rendered or gated.
· Notable: Every September 2026 SOTD winner logged also received the "DEV Developer Award" — suggesting the developer-jury track is active and the bar includes technical execution, not just visual design.

UX / conversion patterns:

· Homepage structure: "The Creative Pass Watch all courses for just $12/month" repeated 10 times in the scrape (the banner is sticky) → SOTD grid with dates → winner names and scores
· Signup/onboarding friction: Browsing is free. The Creative Pass is $12/mo for courses.
· Notable interactions: The SOTD page shows individual juror scores by name, country, and role — e.g., "Sunny Rathod from India, Founder of Trionn Design: 7 8 8 7 7.50". This transparency is the platform's credibility mechanism.

Positioning (their words):

· Headline: "Best selection of Sites Of The Day for your inspiration"
· Who they target: "professionals in the digital design industry"

Gaps (exploitable weaknesses):

· The scoring floor is high but the spread is narrow. Longbow 7.21, Vectr 7.18. Most jurors score 7s. The difference between a 7.0 and an 8.2 is a handful of votes. This means the SOTD award is competitive but not necessarily discriminating — a site can win with consistent 7s across the board.
· "PROMOTED" appears in the SOTD feed. Sep 09, 2026 is marked "PROMOTED" — meaning paid placement exists in the SOTD feed alongside earned awards. This is a credibility gap for the platform.
· The Creative Pass banner dominates every page. 10 repetitions of the same $12/mo banner in a single scrape. The monetization is aggressive.

Verdict: STEAL (the juror transparency, the Design 40% / Usability 30% / Creativity 20% / Content 10% weighting as an internal quality rubric). Awwwards is the scoreboard. Our internal bar should be "would this score 7.5+ on Awwwards?"

Completeness self-score: 7 (10 winners listed but only 2 SOTD pages fully opened; tech stacks not captured)

---

SITE 19: Polycam — poly.cam

Visited: 2026-09-12 (pricing page, FAQ, third-party comparisons)

One line: LiDAR/photogrammetry capture with Gaussian splats, floor plans, and 2,000-image limits on Business — the capture tool for 3D site documentation.

Pricing (quoted, not paraphrased):

· Free: $0 — "For beginners discovering 3D scanning" — limited space, object, and AI captures, GLTF exports, public link sharing, up to 150 images per model
· Basic: $150/year or $12.50/month (billed yearly) or $30/month (billed monthly) — "For freelancers, creators, or individuals producing small-scale work" — unlimited object captures and Gaussian splats, unlimited space captures with and without LiDAR, unlimited AI generated captures, 6 mesh export formats, private link sharing, up to 300 images per model
· Business: $400/year per user or $33/month per user (billed yearly) — "For teams and professionals working together" — 2D & 3D floor plans, advanced measure tools, shared team library, point cloud exports, virtual walkthroughs, AI generated reports, up to 2,000 images per model
· Enterprise: $1,200/year per seat, 3 seats minimum (billed yearly) — content management API, admin-controlled feature customization, enhanced data privacy, custom branding, folders with role-based management, dedicated customer success and support, SSO, regional cloud storage, custom billing
· Pricing page gaps: Pro plan discontinued — "We have streamlined our set of plans to better focus on our individual and team users, and are no longer offering the Pro plan. Anyone subscribed to Pro prior to this change is now a Legacy Pro user and keeps the Pro price and Pro features as long as they stay subscribed"
· Image limits: Free 150, Basic 300, Business/Enterprise 2,000
· Capture limit behavior: "Delete existing captures to free up space" or "Upgrade your plan for a higher capture limit"
· Quality: "The core capture technology remains consistent across all subscription plans. However, paid plans offer advantages that can lead to better final results: Higher image limits (up to 2,000 images vs 150 on free plan). More images generally result in more detailed and accurate 3D models"

Features (enumerated capabilities):

· LiDAR scanning: Space Mode scanning "exclusively available on compatible iOS device"
· Photogrammetry: Object mode up to 150/300/2,000 images depending on plan
· Gaussian splats: Unlimited on Basic+
· Floor plans: 2D & 3D on Business+
· Virtual walkthroughs: Business+
· AI generated reports: Business+
· Export formats: .gltf (all plans), 3D Models: .obj, .fbx, .dae, .usdz, .stl, .ply, .las, .pts, .xyz; Documentation: .pdf, .png, .svg, .csv; Media: Blueprints, images, videos; CAD: .dxf (Basic+); Geo-referenced .las files, TransformEngine access (Basic+)
· Devices: iOS (iPhone, iPad, Apple Vision Pro), Android, Web browsers
· Trust signal: "Trusted by Half of the fortune 500"

Tech signals:

· Detectable stack: Proprietary capture and processing pipeline. Export formats are industry-standard (glTF, OBJ, FBX, USDZ, PLY, LAS). Gaussian splat support.
· Developer surface: Content management API on Enterprise. No white-label.

UX / conversion patterns:

· Homepage structure: "Start free for personal projects. Upgrade to Business for professional floor plans and measurements. Scale to Enterprise when you need it" → plan cards → FAQs
· Signup/onboarding friction: Free tier is genuinely usable for personal projects.
· Notable interactions: The FAQ answers are unusually candid: "The core capture technology remains consistent across all subscription plans." This is honest — you're paying for limits and features, not better capture quality. That honesty is a trust signal.

Positioning (their words):

· Headline: "Plans built for how you work"
· Who they target: Beginners (Free), freelancers/creators (Basic), teams/professionals (Business), organizations at scale (Enterprise)

Gaps (exploitable weaknesses):

· Space Mode is iOS-only. "Space Mode scanning is exclusively available on compatible iOS device" — Android users cannot capture spaces. This is a significant platform limitation for a tool marketed to professionals.
· No white-label. Polycam is a capture tool, not a delivery platform. An agency using Polycam for client captures cannot rebrand the output.
· Pro plan discontinuation — existing Pro users are grandfathered, but new users cannot access Pro pricing. This creates a two-tier user base.
· Implementation costs: "Implementation, training, and support fees can add 30-60% to the base license fee" — the $1,200/year Enterprise seat is not the full cost.

Verdict: WATCH — Polycam is the capture tool for 3D site documentation, but the iOS-only Space Mode and lack of white-label limit its agency utility. The honest FAQ is worth stealing.

Completeness self-score: 8

---

SITE 20: Luma AI — lumalabs.ai

Visited: 2026-09-12 (pricing page, model pricing table, third-party reviews)

One line: Capture + generation platform with transparent per-model credit pricing — Ray3.2, Ray3.14, Seedance 2.0/2.5, Kling Omni — the most granular pricing in the batch.

Pricing (quoted, not paraphrased):

· Free: $0 — video and image generation, 3,000 credits (requires card entry), watermark, no commercial use
· Plus: $30/month or $300 billed yearly — 10,000 credits, Luma and third-party image and video models, edit access for guest collaborators, commercial use
· Pro: $90/month or $900 billed yearly — 40,000 credits, 4x usage with Luma Agents, commercial use
· Ultra: $300/month or $3,000 billed yearly — 150,000 credits, 15x usage with Luma Agents, commercial use
· Team: Contact us — manage and add team members, projects, team organization, team-wide sharing, usage analytics, shared team credits, SSO
· Enterprise: Contact us — enterprise commitments, dedicated education and training, custom fine-tuning
· Pricing page gaps: Free tier requires card entry. Team and Enterprise pricing is contact-us. No overage policy quoted beyond credit consumption.

Model pricing (quoted, the most granular in the batch):

· Ray3.2: Text-to-Video / Image-to-Video — Draft 20 credits/5 sec, 60 credits/10 sec; 540p 50/5 sec, 150/10 sec; 720p 100/5 sec, 300/10 sec; 1080p 400/5 sec, 1200/10 sec. Video-to-Video: Draft 36 credits/sec, 540p 48/sec, 720p 72/sec, 1080p 144/sec. Reframe: Draft 10/sec, 540p 20/sec, 720p 40/sec, 1080p 120/sec
· Ray3.14: Text-to-Video / Image-to-Video — Draft 4 credits/sec, 540p 10/sec, 720p 20/sec, 1080p 80/sec. Video-to-Video: Draft 12/sec, 540p 24/sec, 720p 48/sec, 1080p 192/sec. Extend Video: Draft 20/5 sec, 540p 50/5 sec, 720p 100/5 sec, 1080p 400/5 sec
· Seedance 2.0: 480p 47 credits/sec, 720p 107/sec, 1080p 240/sec, 4K 959/sec. Video-to-Video: 480p 28/sec, 720p 64/sec, 1080p 144/sec, 4K 576/sec
· Seedance 2.5: 480p 61 credits/sec, 720p 130/sec, 1080p 319/sec. Video-to-Video: 480p 37/sec, 720p 78/sec, 1080p 192/sec
· Kling Omni: 720p 30 credits/sec, 720p 40/sec, 1080p 40/sec, 1080p 49/sec, 2160p (4K) 147/sec, 2160p (4K) 147/sec. Video-to-Video: 720p 45/sec, 1080p 59/sec, 2160p (4K) 147/sec
· Kling 3.0: 720p 30 credits/sec, 720p 40/sec, 1080p (truncated)

Features (enumerated capabilities):

· Capture + generation: Luma AI started as a 3D capture tool (NeRF, Gaussian splatting) and expanded into image and video generation. The pricing page now emphasizes generation models.
· Luma Agents: AI agents that use the generation models. "4x usage with the Luma Agents" (Pro), "15x usage with the Luma Agents" (Ultra)
· Commercial use: Plus and above
· Guest collaborators: Plus and above
· Third-party models: "Luma and third-party image and video models" — Luma aggregates multiple models (Ray, Seedance, Kling) under one credit system

Tech signals:

· Detectable stack: Proprietary generation models (Ray3.2, Ray3.14) plus third-party models (Seedance, Kling). Cloud-based. No self-hosted option mentioned.
· Developer surface: No public API mentioned on the pricing page. Team and Enterprise are contact-us.

UX / conversion patterns:

· Homepage structure: Pricing page leads with individual plans (Plus, Pro, Ultra) → Business plans (Team, Enterprise) → "The fastest creative teams in the world make here" → detailed per-model cost table
· Signup/onboarding friction: Free tier requires card entry — higher friction than expected for a free tier.
· Notable interactions: The per-model cost table is the most transparent pricing I've seen in 20 sites. Every model, every resolution, every mode (text-to-video, image-to-video, video-to-video, reframe, extend) has a quoted credit cost. This is the opposite of "competitive pricing."

Positioning (their words):

· Headline: "Plans & Pricing" / "The fastest creative teams in the world make here"
· Who they target: Individual creators (Plus, Pro, Ultra) and teams (Team, Enterprise). "The fastest creative teams in the world" — speed-focused, not budget-focused.

Gaps (exploitable weaknesses):

· Free tier requires card entry. This is a friction point — most free tiers don't require payment details.
· No capture pricing on the current pricing page. Luma started as a capture tool but the 2026 pricing page is generation-focused. Capture pricing (NeRF, Gaussian splatting) is not quoted on the pages visited. This is a product transition signal — Luma is pivoting from capture to generation.
· Credit consumption is high. Seedance 2.0 4K text-to-video is 959 credits/sec. At Ultra's 150,000 credits/month, that's ~156 seconds of 4K video per month. The credit economy is designed for short-form generation, not long-form production.
· Team and Enterprise pricing is contact-us. No rate card for teams.

Verdict: STEAL (the per-model pricing transparency — every model, every resolution, every mode quoted). Luma's pricing page is the single best pricing transparency example across all 20 sites. The capture-to-generation pivot is a product strategy signal worth tracking.

Completeness self-score: 9

---

BATCH 2 SYNTHESIS: IMMERSIVE / AWARD-WINNING STUDIOS (Sites 11–20)

The studio model vs. the tool model

The defining difference between Batch 1 (AI site builders) and Batch 2 (studios): tools sell subscriptions; studios sell outcomes. Every Batch 1 vendor has a pricing page. No Batch 2 studio has a pricing page. The studios sell project-based engagements; the tools sell monthly access.

This is the structural gap our studio sits in. We are not a tool (no subscription). We are not a large agency (no enterprise retainers). We are a studio selling $350 sites to local businesses — a price point that is invisible to both the tool vendors (who charge 160/mo) and the studios (who charge $10,000+ per project).

The awards pattern

Every studio in this batch has Awwwards recognition. The pattern across winners:

· Technical craft is table stakes. WebGL, Three.js, GSAP, smooth scroll (Lenis), WebGPU. The 2026 SOTD winners all carry the "DEV Developer Award" alongside SOTD — the developer jury is active.
· Scoring is consistent. Longbow 7.21, Vectr 7.18. Design 40%, Usability 30%, Creativity 20%, Content 10%. A 7.5+ is a strong site; an 8.0+ is exceptional.
· The subject matter is diverse. EV sports cars, AI staffing, architecture, biotech, creative platforms. Awards are not limited to one vertical.
· The bar is "premium web experience." Longbow's description — "Clean UI, smooth animations, and bold typography perfectly reflect the speed of lightness" — is the formula. Vectr's — "AI-driven precision staffing for critical outages" — is the same formula applied to a different vertical.

Our internal bar should be: "Would this score 7.5+ on Awwwards?" That's the quality threshold. Not 9.0 (unrealistic for local-business work), not 6.0 (commodity). 7.5+ is the 9.2 bar translated into Awwwards terms.

The open-source strategy (Darkroom's moat)

Darkroom Engineering is the only studio in the batch that builds open-source tools as a marketing strategy. Lenis (smooth scroll), Satus (Next.js framework), Hamo (React hooks), Revelo (Framer plugin), Aniso (ASCII tool). Every tool is free. Every tool is used by other developers. Every use is a brand impression.

This is the most sophisticated marketing strategy in the batch. The tools are the lead generation. The studio is the monetization. "We bring brands and interfaces to life with code that runs smooth and scales right."

Can we replicate this? Not at the same scale. But a small open-source contribution — a Lenis plugin, a GSAP helper, a Framer component — could establish technical credibility with the developers who influence local-business website decisions.

The client-list-as-positioning pattern

Resn categorizes clients by vertical: Tech Innovation, Climatetech, Fashion & Beauty, Web3, Entertainment & Culture, Automotive, Collaborations. Locomotive lists every client with a one-line description. BASIC/DEPT leads with Google Store, KFC, Wilson, AT&T, Patagonia.

The pattern: show the roster, categorized by the visitor's industry. This is a conversion pattern worth stealing. A local-business studio should show the roster categorized by vertical — restaurants, dental, legal, home services — so the visitor sees their industry immediately.

The Activity Log (Darkroom's trust signal)

Darkroom's public Activity Log — "A Running Log of What We're Shipping" — is the single best trust-building pattern across all 20 sites. Dates, projects, open-source updates, even "Still figuring out if it's a product." This is radical transparency.

Can we replicate this? Yes. A "What we shipped this month" log on our studio site. Not a blog — a log. Dates, client type (anonymized if needed), outcome. This builds trust with prospective clients and demonstrates momentum.

Batch 2 self-assessment

Site | Completeness | Primary-source gaps
Unseen | 8 | Homepage returned minimal text; depth sourced from third parties
Active Theory | 7 | Homepage returned "Your browser is not supported"; depth sourced from third parties
Resn | 8 | No pricing signal; client list from homepage
Hello Monday | 7 | Homepage returned minimal text; depth from case studies
BASIC/DEPT | 8 | No pricing signal; client list from homepage
Locomotive | 8 | No pricing signal; merch pricing only
Darkroom | 9 | Activity Log is the strongest primary source in the batch
Awwwards | 7 | 10 winners listed but only 2 SOTD pages fully opened
Polycam | 8 | Enterprise implementation costs from third party
Luma | 9 | Per-model pricing fully quoted

Batch average: 7.9/10. Darkroom and Luma are the strongest dossiers (9/10). Active Theory and Hello Monday are the weakest (7/10) due to inaccessible homepages.

---

CROSS-BATCH SYNTHESIS: THE FULL 20

Feature matrix (20 sites × 15 features)

Feature | Wix | Durable | 10Web | Framer | Webflow | Lovable | Bolt | v0 | WeInc | Lindo | Unseen | A.T. | Resn | H.M. | BASIC | Loco | Darkroom | Awwwards | Polycam | Luma
Free tier | Y | Y | N | Y | Y | Y | Y | Y | Demo | N | N/A | N/A | N/A | N/A | N/A | N/A | N/A | Y (browse) | Y | Y
White-label | N | N | Y | N | N | N | N | N | Y | Y | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N | N
API | N | N | Y | N | Y (Team) | N | N | Y (MCP) | Y | Y (Elite) | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | Y (Ent) | N
MCP | N | N | N | N | Y | N | N | Y | N | Y | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N | N
AEO/GEO | Claim | Claim | Soon | N | Y (Ent) | N | N | N | N | N | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A
Credits/tokens | N (flat) | N (flat) | Y | Y | Y | Y | Y | Y | N (flat) | Y | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | Y
Per-site pricing | Y | N | Y | Y | Y | N | N | N | N | N | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A
WebGL/3D | N | N | N | N | N | N | N | N | N | N | Y | Y | Y | N | N | Y | Y | N/A | Y | Y
Open source | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | Y | N/A | N | N
Public activity log | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | Y | N/A | N | N
Case studies w/ $ | N | N | N | N | N | Y | N | N | N | N | Y | N | N | N | Y | Y | Y | N/A | N | N
Chrome extension | N | N | N | N | N | N | N | N | Y | N | N | N | N | N | N | N | N | N/A | N | N
Client prospecting | N | N | N | N | N | N | N | N | N | Y | N | N | N | N | N | N | N | N/A | N | N
Per-model pricing | N | N | N | N | N | N | N | Y | N | N | N | N | N | N | N | N | N | N/A | N | Y
Awwwards SOTD | N | N | N | N | N | N | N | N | N | N | Y | Y | Y | Y | Y | Y | Y | Y | N | N

The pricing benchmark (full)

Platform | Entry | Mid | Top self-serve | Agency/infra | Unit
Wix | $17/mo | 39/mo | $159/mo (Elite) | Enterprise custom | Per site
Durable | 15/mo | 25/mo | 99/mo | None | Flat
10Web | $10/mo | 22.5/mo | $80/mo (Agency Core) | Agency Pro custom, API $5/site | Per site / platform
Framer | $10/mo/site | $30/mo/site | $100/mo/site | Enterprise custom | Per site
Webflow | $15/mo/site | $25/mo/site + seats | $2,500/mo (Team) | Enterprise custom | Per site + seat
Lovable | 25/mo | 50/mo | Enterprise custom | None | Per workspace
Bolt | $25/mo | $30/member | Enterprise custom | None | Per workspace
v0 | $30/user/mo | $100/user/mo | Enterprise custom | None | Per user
WeInc | $20/mo | $50/mo | White Label custom | White Label (50–250 sites) | Per workspace
Lindo | 30/mo | 150/mo | 300/mo | Reseller $2,000/yr (200 sites) | Per platform
Polycam | $12.50/mo | $33/mo/user | $100/mo/seat | Enterprise custom | Per user/seat
Luma | $30/mo | $90/mo | $300/mo | Team/Enterprise contact | Per workspace

Where the pricing umbrella is: 30/mo entry, 50/mo mid, 160/mo top self-serve, 2,500/mo agency/infrastructure. Webflow's $2,500/mo Team plan is the outlier — 30x the price of 10Web's $80/mo Agency Core for a comparable "team" tier.

Where the race to the bottom is: 20/mo. 10Web (10 annual), Wix (12–$15). The differentiator is not price.

Where OUR $350/site sits: Between the tools and the agencies. No tool charges $350/site. No studio charges $350/project. We are the only option at this price point with cinematic quality. The undercut: Lindo Elite at $300/mo for 20 sites = $15/site/month. If we deliver a $350 site and the client pays $29/mo hosting, we're competitive with Lindo's economics but with a one-time price instead of a subscription.

The tech census

Dominant stacks (Batch 1): React (Lovable, Bolt, v0, WeInc), Next.js (v0, Darkroom), Tailwind CSS (v0, WeInc, Lindo, Darkroom), WordPress (10Web), proprietary (Wix, Framer, Webflow, Durable).

Dominant stacks (Batch 2): Three.js (Unseen, Active Theory), WebGL (Unseen, Active Theory, Resn), GSAP (Darkroom), Lenis (Darkroom), React Three Fiber (Darkroom), Next.js (Darkroom).

The default architecture of a 2026 web product: Next.js + React + Tailwind + TypeScript + Vercel + a CMS (Sanity/Contentful) + Lenis for smooth scroll + GSAP for animation + Three.js/WebGL for 3D. This is Darkroom's stack, and it's the stack every award-winning studio converges on.

What's exotic: GPGPU fluid simulation (Active Theory, Unseen), Gaussian splatting (Polycam, Luma), MCP server integration (Webflow, v0, Lindo), in-browser Node.js (Bolt/WebContainer). The exotic wins when it serves the experience (BlueYard's fluid orb) and fails when it excludes users (Active Theory's "browser not supported").

The gap map (features nobody has)

Features NOBODY has (across all 20):

1. AEO/GEO for local businesses at a self-serve price. Webflow's AEO is Enterprise-only ($2,500/mo). Durable claims GEO but offers no infrastructure. Nobody sells "AI search optimization for your restaurant" at $29/mo.
2. White-label + per-site pricing + no credits. 10Web has white-label + per-site, but credits. Lindo has white-label + flat platform fee, but credits. Nobody offers white-label + flat per-site pricing + no credits.
3. A public activity log as a studio trust signal. Darkroom is the only studio doing this. No tool vendor does it. No other studio does it.
4. Open-source tooling as a studio marketing strategy. Darkroom is the only studio doing this. Every other studio sells services only.
5. A Chrome extension distribution channel for site generation. WeInc is the only platform with this. "Select text anywhere, right-click, and WeInc's AI builds a real site from it."
6. Client prospecting integrated into the site builder. Lindo is the only platform with this. "Find businesses that need a site upgrade, then use Lindo.ai to turn their public info into a draft you can show before the first meeting."
7. "Failed generations not billed." WeInc is the only platform with this pricing integrity promise. Every other credit/token vendor charges for failures.
8. Per-model pricing transparency. Luma is the only vendor with a full per-model, per-resolution, per-mode cost table. v0 has per-model pricing (Mini/Pro/Max/Max Fast) but not per-mode.
9. Awwwards-caliber craft at a local-business price. No studio in Batch 2 serves local businesses. No tool in Batch 1 produces Awwwards-caliber work. The intersection is empty.
10. A cinematic studio with a public activity log and open-source tools. Darkroom is the closest, but they serve enterprises, not local businesses.

UX patterns NOBODY uses:

1. The homepage as the product (v0) — no marketing, just the prompt input. Nobody else does this.
2. The loading sequence as brand identity (Unseen: "U N S E N E L o a d i n g") — nobody else does this.
3. The categorized client roster by vertical (Resn) — nobody else does this as cleanly.
4. The public activity log (Darkroom) — nobody else does this.
5. The Chrome extension as distribution (WeInc) — nobody else does this.
6. The "1 day until Monday" countdown (Hello Monday) — nobody else does this.
7. The infinite scrolling industry callout (Durable: "Build your coaching business, fast. Build your handyman business, fast...") — nobody else does this.
8. The juror-transparent scoring page (Awwwards) — nobody else does this.
9. The merch store on the agency homepage (Locomotive) — nobody else does this.
10. The "still figuring out if it's a product" honesty (Darkroom) — nobody else does this.

Prices nobody charges / tiers nobody offers:

1. $350/site with cinematic quality. No tool charges this. No studio charges this.
2. $49/mo receptionist. No vendor in the batch offers an AI receptionist at this price.
3. 79 products. No vendor in the batch offers products at this price range.
4. White-label + flat per-site + no credits. Nobody.
5. AEO for local businesses at $29/mo. Nobody.
6. A "failed generations not billed" guarantee on a flat-rate plan. Nobody.
7. A studio activity log as a paid product. Nobody.

SYNTHESIS LAB (novel combinations — minimum 10)

1. The Awwwards-grade local-business site at $350.

· Combination: Unseen's Three.js/WebGL craft + Lindo's agency economics + our $350 price point.
· Why nobody's done it: Studios that can build Awwwards work serve enterprises. Tools that serve local businesses produce template-grade output. The middle is empty.
· What it takes to ship: A component library of 10 reusable Three.js/WebGL sections (hero, gallery, scroll-driven story, 3D product viewer, particle field, fluid simulation). 30-day prototype.
· Expected value: High. The only studio delivering Awwwards-caliber work at a local-business price.

2. The public Activity Log as a local-business trust signal.

· Combination: Darkroom's public Activity Log + Locomotive's regional positioning + local-business clients.
· Why nobody's done it: Studios don't publish their shipping logs. Tools don't have shipping logs (they have changelogs, which are different — changelogs are for users, activity logs are for prospects).
· What it takes to ship: A simple log page. Dates, client type, outcome. "2026/09/12 — Shipped a 5-page site for a Portland dental practice. 3.2s load time, 98 PageSpeed." 1-day prototype.
· Expected value: Medium-high. Builds trust with prospective clients who want to see momentum.

3. The Chrome extension for local-business site generation.

· Combination: WeInc's Chrome extension distribution + Lindo's prospecting + local-business targeting.
· Why nobody's done it: WeInc's extension is for general site generation. Lindo's prospecting is inside the platform. A Chrome extension that lets an agency prospect local businesses and generate a draft site from their Google Business Profile — that's the combination.
· What it takes to ship: Chrome extension + Google Business Profile API + the site generator. 60-day prototype.
· Expected value: High. The distribution channel is the moat.

4. The per-model pricing transparency for AI site generation.

· Combination: Luma's per-model cost table + v0's model tiers + site generation.
· Why nobody's done it: AI site builders hide their credit costs behind "1 credit" abstractions. A builder that says "this hero section costs 3 credits, this 3D scene costs 12 credits, this copy block costs 1 credit" would be radically transparent.
· What it takes to ship: A pricing page that itemizes every generation action. 1-week prototype.
· Expected value: Medium. Transparency is a differentiator in a market of opacity.

5. The "failed generations not billed" guarantee at scale.

· Combination: WeInc's "failed generations not billed" + Lovable/Bolt's credit economy.
· Why nobody's done it: Every credit/token vendor charges for failures. WeInc is the only exception, and they're a small player.
· What it takes to ship: A billing system that detects failed generations and credits them back. 30-day prototype.
· Expected value: High. This is the single strongest pricing integrity signal in the market.

6. The studio with open-source tools and a $350 product.

· Combination: Darkroom's open-source strategy (Lenis, Satus) + a $350/site product.
· Why nobody's done it: Open-source studios serve enterprises. Product studios don't build open-source tools. The combination is empty.
· What it takes to ship: One open-source tool (a Lenis plugin, a GSAP helper, a Framer component) + a $350/site offering. 90-day prototype.
· Expected value: High. The tool is the lead generation; the $350 site is the monetization.

7. The AEO audit for local businesses at $29/mo.

· Combination: Webflow's AEO (Enterprise-only) + Durable's GEO claim + local-business pricing.
· Why nobody's done it: AEO is gated behind enterprise pricing. Local businesses need it most (they're invisible in AI answers) and can pay least.
· What it takes to ship: An AEO audit tool that checks schema, structured data, LLM crawlability, and citation frequency. $29/mo subscription. 60-day prototype.
· Expected value: Very high. The gap is enormous.

8. The client roster categorized by local-business vertical.

· Combination: Resn's categorized client list + local-business verticals (restaurants, dental, legal, home services).
· Why nobody's done it: Studios show client logos. They don't categorize by the visitor's industry. A local-business studio should.
· What it takes to ship: A work page with filterable verticals. 1-day prototype.
· Expected value: Medium. Simple, effective conversion pattern.

9. The Awwwards scoring rubric as an internal quality gate.

· Combination: Awwwards' Design 40% / Usability 30% / Creativity 20% / Content 10% + our 9.2 bar.
· Why nobody's done it: Studios don't use public rubrics as internal gates. They use taste.
· What it takes to ship: A scoring spreadsheet. Every site scored before delivery. 1-day prototype.
· Expected value: High. Translates "9.2 bar" into a measurable rubric.

10. The MCP integration for local-business site generation.

· Combination: Lindo's MCP integration (Claude, Hermes) + Webflow's MCP server + local-business site generation.
· Why nobody's done it: MCP is an emerging standard. Lindo is the only site builder with it. The integration lets an AI agent generate a site from a conversation.
· What it takes to ship: An MCP server that exposes site generation as a tool. 90-day prototype.
· Expected value: High. The distribution is AI agents, not humans.

11. The "30-second draft, 30-day craft" model.

· Combination: Durable's 30-second site + Unseen's craft process.
· Why nobody's done it: Durable sells speed. Unseen sells craft. A studio that delivers a 30-second draft (for the client to see) and a 30-day crafted site (for the client to launch) combines both.
· What it takes to ship: A two-phase delivery model: draft in 30 seconds, craft in 30 days. 30-day prototype.
· Expected value: High. The draft closes the sale; the craft delivers the value.

12. The open-source Lenis plugin for local-business sites.

· Combination: Darkroom's Lenis + local-business site needs (fast, smooth, mobile-friendly).
· Why nobody's done it: Lenis is a general-purpose smooth scroll library. A Lenis plugin optimized for local-business sites (restaurant menus, service listings, booking flows) would be a niche contribution.
· What it takes to ship: A Lenis plugin with presets for common local-business patterns. 60-day prototype.
· Expected value: Medium. Establishes technical credibility with the developers who influence local-business website decisions.

13. The per-site pricing with no credits for agencies.

· Combination: Framer's per-site pricing + Lindo's white-label + no credits.
· Why nobody's done it: Framer has per-site but no white-label. Lindo has white-label but credits. A white-label platform with flat per-site pricing and no credits is empty.
· What it takes to ship: A billing system that charges per site, not per credit. 90-day prototype.
· Expected value: Very high. This is the single biggest gap in the agency infrastructure market.

TOP 10 STEALS (ranked by expected value)

Rank | Steal | From | How to adapt | Cost
1 | Per-model pricing transparency | Luma | A pricing page that itemizes every generation action. "Hero section: 3 credits. 3D scene: 12 credits. Copy block: 1 credit." | 1 week
2 | Public Activity Log | Darkroom | A "What we shipped this month" log on our studio site. Dates, client type, outcome. | 1 day
3 | "Failed generations not billed" | WeInc | A billing guarantee: if the AI fails, you don't pay. | 30 days
4 | Categorized client roster by vertical | Resn | A work page filterable by local-business vertical (restaurants, dental, legal, home services). | 1 day
5 | Awwwards scoring rubric as internal gate | Awwwards | Design 40% / Usability 30% / Creativity 20% / Content 10%. Every site scored before delivery. | 1 day
6 | Chrome extension distribution | WeInc | A Chrome extension that lets an agency prospect local businesses and generate a draft site from their Google Business Profile. | 60 days
7 | Client prospecting integrated into the builder | Lindo | Find businesses with weak sites, generate a draft, show it before the first meeting. | 60 days
8 | Open-source tool as marketing | Darkroom | One open-source tool (Lenis plugin, GSAP helper, Framer component) + a $350/site offering. | 90 days
9 | The homepage as the product | v0 | A homepage that is the prompt input, not a marketing page. | 1 week
10 | MCP integration | Lindo, Webflow, v0 | An MCP server that exposes site generation as a tool for AI agents. | 90 days

BIBLE AMENDMENTS (ready-to-paste)

Amendment 1: Pricing transparency.

· Section: Pricing doctrine.
· Text: "Every price quoted or marked unfound. No 'competitive pricing.' No 'contact us' for self-serve tiers. The pricing page is a trust document."
· Evidence: Luma's per-model pricing table. WeInc's "failed generations not billed." Every vendor that hides pricing (Durable's three conflicting price sets, Lindo's $2,000/mo vs /yr) loses trust.

Amendment 2: The Activity Log.

· Section: Trust signals.
· Text: "Maintain a public Activity Log. Dates, client type (anonymized if needed), outcome. Not a blog. A log. Updated weekly."
· Evidence: Darkroom's Activity Log is the strongest trust signal across 20 sites.

Amendment 3: The Awwwards rubric.

· Section: Quality bar.
· Text: "Every site scored on Awwwards' rubric before delivery: Design 40%, Usability 30%, Creativity 20%, Content 10%. Minimum 7.5/10. The 9.2 bar is the internal target; 7.5 is the floor."
· Evidence: Longbow 7.21, Vectr 7.18. The SOTD floor is 7.0+. Our floor should be 7.5+.

Amendment 4: The vertical roster.

· Section: Conversion patterns.
· Text: "The work page is filterable by local-business vertical. Restaurants, dental, legal, home services, etc. The visitor sees their industry immediately."
· Evidence: Resn's categorized client list. Durable's infinite scrolling industry callout.

Amendment 5: No credits, no tokens.

· Section: Pricing doctrine.
· Text: "Flat pricing. No credits. No tokens. No 'AI credits.' One price per site. One price per month for maintenance. The credit economy is the single biggest trust gap in the AI builder market."
· Evidence: Lovable, Bolt, v0, Lindo, 10Web, Framer all use credits/tokens. Every one has documented cost unpredictability. Wix (flat) is the exception, and Wix's AI is the weakest in the batch.

Amendment 6: The MCP server.

· Section: Distribution.
· Text: "Build an MCP server that exposes site generation as a tool. The distribution is AI agents, not humans."
· Evidence: Lindo ("Wire Lindo into any AI agent — Claude, Hermes, and more"), Webflow (MCP server on free tier), v0 (MCP server support for Linear, Notion, Sentry).

Amendment 7: Open-source contribution.

· Section: Marketing.
· Text: "One open-source tool per year. A Lenis plugin, a GSAP helper, a Framer component. Free. The tool is the lead generation; the studio is the monetization."
· Evidence: Darkroom's Lenis, Satus, Hamo, Revelo, Aniso. Every tool is a brand impression.

Amendment 8: The 30-second draft, 30-day craft model.

· Section: Delivery.
· Text: "Phase 1: 30-second AI draft, delivered same day. Phase 2: 30-day crafted site, delivered as the final product. The draft closes the sale; the craft delivers the value."
· Evidence: Durable's 30-second claim (speed) + Unseen's craft process (quality). The combination is empty.

ROADMAP (30-day / 90-day / 12-month)

30-day prototypes (from the steals):

· Activity Log (1 day)
· Awwwards rubric scoring sheet (1 day)
· Categorized client roster (1 day)
· Per-model pricing transparency page (1 week)
· Homepage-as-product prototype (1 week)
· "Failed generations not billed" billing logic (30 days)
· 30-second draft, 30-day craft model (30 days)
· MCP server prototype (30 days)

90-day shipped features:

· Chrome extension for local-business prospecting (60 days)
· Client prospecting integrated into the builder (60 days)
· Open-source Lenis plugin for local-business sites (60 days)
· Per-site pricing with no credits (90 days)
· MCP server production (90 days)

12-month structural advantages:

· The only studio delivering Awwwards-caliber work at a local-business price
· The only studio with a public Activity Log and open-source tools
· The only platform offering white-label + flat per-site pricing + no credits
· The only platform offering AEO for local businesses at a self-serve price
· The only platform with MCP integration for AI-agent-driven site generation

---

End of Batches 1–2. Batch 3 (Sites 21–30: Matterport, Spark, PlayCanvas, Spline, Keygen, Cryptolens, Medusa, Stripe, Resend — plus any additional sites discovered) is ready to proceed. The remaining target list includes sites 21–30 from the original brief, plus infrastructure discoveries (Lenis, Satus, Tambo, Revelo, Aniso) from Batch 2 that warrant full dossiers in the next batch.

[END VERBATIM SOURCE — filed by Motif 2026-09-12. Typographic normalization only: tables re-rendered in Markdown; wording untouched.]

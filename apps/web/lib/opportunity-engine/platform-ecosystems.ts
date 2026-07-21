/**
 * NOVA AI Platform Ecosystem Map.
 *
 * Separates build capability, distribution, native payment, partner access,
 * credits, and negotiated licensing. A platform can be excellent for building
 * while offering no general creator payout; the map keeps those facts distinct.
 */

export type AiPlatformId =
  | "openai"
  | "anthropic"
  | "google"
  | "xai-x"
  | "microsoft"
  | "aws"
  | "poe"
  | "openrouter"
  | "github"
  | "snowflake"
  | "databricks"
  | "huggingface"
  | "replicate"
  | "together-ai"
  | "perplexity"
  | "cloudflare";

export type PlatformOpportunityChannel =
  | "challenge_prize"
  | "app_or_plugin_directory"
  | "agent_marketplace"
  | "software_marketplace"
  | "data_marketplace"
  | "model_provider_network"
  | "creator_payout"
  | "partner_network"
  | "affiliate_or_referral"
  | "startup_credits"
  | "research_credits"
  | "open_source_grant"
  | "content_license"
  | "distribution_only"
  | "build_and_cost_leverage";

export type PlatformOpportunityState =
  | "LIVE_DIRECT_PAYOUT"
  | "LIVE_TRANSACTIONAL"
  | "LIVE_APPLICATION"
  | "LIVE_DISTRIBUTION"
  | "LIVE_DEADLINE"
  | "NEGOTIATED_ONLY"
  | "ANNOUNCED_LIMITED"
  | "CONDITIONAL"
  | "BUILD_ONLY"
  | "EXPIRED"
  | "VERIFY_REQUIRED";

export type PlatformValueType =
  | "CASH_PRIZE"
  | "USAGE_REVENUE"
  | "SUBSCRIPTION_REVENUE"
  | "MARKETPLACE_REVENUE"
  | "SERVICE_REVENUE"
  | "REFERRAL_REVENUE"
  | "CONTENT_LICENSE_REVENUE"
  | "CREDITS"
  | "DISTRIBUTION"
  | "COSELL"
  | "COST_REDUCTION"
  | "TECHNICAL_SUPPORT"
  | "REPUTATION";

export type PlatformPriority = "P0" | "P1" | "P2" | "P3" | "WATCH";

export interface AiPlatformOpportunity {
  readonly id: string;
  readonly platformId: AiPlatformId;
  readonly platformName: string;
  readonly productOrProgram: string;
  readonly channel: PlatformOpportunityChannel;
  readonly state: PlatformOpportunityState;
  readonly valueTypes: readonly PlatformValueType[];
  readonly nativePaymentAvailable: boolean;
  readonly verifiedAt: string;
  readonly sourceUrl: string;
  readonly expiresAt?: string;
  readonly currentTruth: string;
  readonly gsePlay: string;
  readonly codingDeliverables: readonly string[];
  readonly ownerActions: readonly string[];
  readonly blockers: readonly string[];
  readonly priority: PlatformPriority;
  readonly targetProjects: readonly string[];
  readonly tags: readonly string[];
}

export const AI_PLATFORM_OPPORTUNITIES: readonly AiPlatformOpportunity[] = [
  {
    id: "openai-build-week-2026",
    platformId: "openai",
    platformName: "OpenAI",
    productOrProgram: "OpenAI Build Week Challenge",
    channel: "challenge_prize",
    state: "LIVE_DEADLINE",
    valueTypes: ["CASH_PRIZE", "CREDITS", "DISTRIBUTION", "REPUTATION"],
    nativePaymentAvailable: true,
    verifiedAt: "2026-07-21",
    sourceUrl: "https://openai.devpost.com/",
    expiresAt: "2026-07-21T17:00:00-07:00",
    currentTruth:
      "Submissions close July 21, 2026 at 5:00 PM Pacific. A working project, public sub-three-minute YouTube demo, repository access, README, and Codex feedback session ID are required. Existing projects qualify only for meaningful extensions created during the submission period and documented separately.",
    gsePlay:
      "Submit the new NOVA opportunity engine as a Developer Tools entry only if a qualifying Codex thread builds the majority of the submitted extension and a runnable cockpit/demo is completed before the deadline.",
    codingDeliverables: [
      "Runnable NOVA cockpit page",
      "Dated pre-existing versus Build Week extension ledger",
      "README with setup and Codex collaboration record",
      "Demo fixture requiring no production credentials",
      "Submission text and sub-three-minute video script",
    ],
    ownerActions: [
      "Run the qualifying work in Codex and capture /feedback session ID",
      "Record and publish the demo video",
      "Join the challenge and submit before the deadline",
    ],
    blockers: [
      "No qualifying Codex feedback session ID is recorded yet",
      "Public demo video is not recorded",
      "Submission must distinguish new Build Week work from the pre-existing Sports repository",
    ],
    priority: "P0",
    targetProjects: ["NOVA", "GSE"],
    tags: ["deadline", "developer-tools", "cash-prize", "codex", "gpt-5.6"],
  },
  {
    id: "openai-plugin-directory",
    platformId: "openai",
    platformName: "OpenAI",
    productOrProgram: "ChatGPT and Codex Plugin Directory",
    channel: "app_or_plugin_directory",
    state: "ANNOUNCED_LIMITED",
    valueTypes: ["DISTRIBUTION", "REPUTATION", "SERVICE_REVENUE"],
    nativePaymentAvailable: false,
    verifiedAt: "2026-07-21",
    sourceUrl: "https://help.openai.com/en/articles/20001256-plugins-in-codexOpenAI",
    currentTruth:
      "Plugins are the primary discovery surface for packaged ChatGPT and Codex workflows. App submissions are accepted, but general native digital-app monetization details remain forthcoming; current commerce support is limited and should not be treated as an app-store payout program.",
    gsePlay:
      "Package GSE proof, source, opportunity, or sports-intelligence workflows as a narrowly scoped plugin that routes qualified users to GSE-owned subscription, service, or API surfaces where permitted.",
    codingDeliverables: [
      "Plugin manifest and installable bundle",
      "Read-only GSE MCP tools",
      "Chat-native UI card",
      "Privacy policy and minimum-data contract",
      "Plugin evaluation fixtures and submission packet",
    ],
    ownerActions: ["Approve public product scope", "Approve privacy policy", "Submit plugin after security review"],
    blockers: ["No general native digital-app payout is verified", "Public API and authentication boundary must be finalized"],
    priority: "P1",
    targetProjects: ["GSE", "NOVA", "XXX"],
    tags: ["chatgpt", "codex", "plugin", "mcp", "distribution"],
  },
  {
    id: "openai-partner-network",
    platformId: "openai",
    platformName: "OpenAI",
    productOrProgram: "OpenAI Partner Network",
    channel: "partner_network",
    state: "LIVE_APPLICATION",
    valueTypes: ["SERVICE_REVENUE", "COSELL", "DISTRIBUTION", "TECHNICAL_SUPPORT", "REPUTATION"],
    nativePaymentAvailable: false,
    verifiedAt: "2026-07-21",
    sourceUrl: "https://openai.com/index/introducing-openai-partner-network/",
    currentTruth:
      "The program supports partners that build, sell, and deliver OpenAI solutions. OpenAI announced a $150 million ecosystem investment and certification goals, but that amount is program investment rather than a balance available to an applicant.",
    gsePlay:
      "Create a productized AI Opportunity OS, evidence architecture audit, local-model cost review, or sports-AI evaluation service that can produce real customer deployments and references.",
    codingDeliverables: [
      "Partner capability one-pager",
      "Three fixed-scope service packages",
      "Deployment evidence template",
      "Customer outcome and reference ledger",
      "OpenAI solution architecture examples",
    ],
    ownerActions: ["Create partner profile", "Complete available certification path", "Approve first service offer"],
    blockers: ["No production customer reference exists for this service line", "Partner acceptance and tier are not yet evidenced"],
    priority: "P1",
    targetProjects: ["NOVA", "XXX", "GSE"],
    tags: ["services", "partner", "cosell", "certification"],
  },
  {
    id: "codex-open-source-fund",
    platformId: "openai",
    platformName: "OpenAI",
    productOrProgram: "Codex Open Source Fund",
    channel: "open_source_grant",
    state: "LIVE_APPLICATION",
    valueTypes: ["CREDITS", "REPUTATION", "TECHNICAL_SUPPORT"],
    nativePaymentAvailable: false,
    verifiedAt: "2026-07-21",
    sourceUrl: "https://openai.com/form/codex-open-source-fund/",
    currentTruth:
      "A rolling $1 million initiative offers selected open-source projects grants of up to $25,000 in API credits. The award is credits, not cash, and selection is discretionary.",
    gsePlay:
      "Apply only with a clearly licensed open-source subsystem such as NOVA's evidence engine, a sports-agent evaluation harness, or a source-rights toolkit, with a specific API-credit use plan.",
    codingDeliverables: ["Open-source license decision", "Standalone package boundary", "Public README and roadmap", "Credit-use budget", "Application packet"],
    ownerActions: ["Approve open-source scope and license", "Submit application"],
    blockers: ["The current repository license and reusable package boundary require review", "Commercial and open-source surfaces must be separated"],
    priority: "P1",
    targetProjects: ["NOVA", "GSE"],
    tags: ["open-source", "credits", "codex"],
  },
  {
    id: "openai-content-licensing",
    platformId: "openai",
    platformName: "OpenAI",
    productOrProgram: "OpenAI Content Partnerships",
    channel: "content_license",
    state: "NEGOTIATED_ONLY",
    valueTypes: ["CONTENT_LICENSE_REVENUE", "DISTRIBUTION", "REPUTATION"],
    nativePaymentAvailable: true,
    verifiedAt: "2026-07-21",
    sourceUrl: "https://openai.com/index/grupo-folha-grupo-uol-partnership/",
    currentTruth:
      "OpenAI has negotiated content partnerships with established publishers. No open self-service program for a small sports site to upload content for payment is verified.",
    gsePlay:
      "Build a rights-clean, differentiated sports-intelligence archive and measurable audience first; treat licensing as a later enterprise negotiation, not near-term income.",
    codingDeliverables: ["Rights and provenance ledger", "Licensed-content API", "Audience and citation analytics", "Publisher partnership data room"],
    ownerActions: ["None until GSE has material original content, audience, and rights evidence"],
    blockers: ["Insufficient publisher scale", "No open application route", "Original content and rights corpus still developing"],
    priority: "WATCH",
    targetProjects: ["GSE", "GSN"],
    tags: ["publisher", "content-license", "negotiated"],
  },
  {
    id: "anthropic-partner-network",
    platformId: "anthropic",
    platformName: "Anthropic",
    productOrProgram: "Claude Partner Network Services Track",
    channel: "partner_network",
    state: "LIVE_APPLICATION",
    valueTypes: ["SERVICE_REVENUE", "REFERRAL_REVENUE", "DISTRIBUTION", "TECHNICAL_SUPPORT", "REPUTATION"],
    nativePaymentAvailable: false,
    verifiedAt: "2026-07-21",
    sourceUrl: "https://www.anthropic.com/news/services-track-partner-hub",
    currentTruth:
      "Registration is open and referral credit is separate from service-tier standing. The Select services tier requires at least 10 active certified people, two production joint customers in the prior year, and one public customer story, so a solo founder should pursue certification and paid deployments before expecting tier status.",
    gsePlay:
      "Productize Claude Code migration, agent evaluation, evidence governance, and workflow implementation services, using GSE/NOVA as a demonstrable internal case study rather than claiming partner tier prematurely.",
    codingDeliverables: ["Claude implementation service catalog", "Evaluation harness", "Deployment receipt template", "Customer reference workflow", "Partner metrics dashboard"],
    ownerActions: ["Register", "Complete individual certification", "Close and document first two relevant customer deployments"],
    blockers: ["Select tier requires a larger certified bench", "No joint production customers or public case study yet"],
    priority: "P1",
    targetProjects: ["NOVA", "XXX", "GSE"],
    tags: ["claude", "services", "referral", "certification"],
  },
  {
    id: "anthropic-research-credits",
    platformId: "anthropic",
    platformName: "Anthropic",
    productOrProgram: "External Researcher Access Program",
    channel: "research_credits",
    state: "CONDITIONAL",
    valueTypes: ["CREDITS", "REPUTATION"],
    nativePaymentAvailable: false,
    verifiedAt: "2026-07-21",
    sourceUrl: "https://support.claude.com/en/articles/9125743-what-is-the-external-researcher-access-program",
    currentTruth:
      "The program generally provides $1,000 in API credits to selected researchers working on Anthropic-priority AI safety and alignment topics. It is not a commercial startup-credit program.",
    gsePlay:
      "Use only for a genuine independent research proposal on agent reliability, evidence integrity, or alignment where the research question fits the published scope; keep commercial product work separate.",
    codingDeliverables: ["Research question", "Reproducible evaluation protocol", "Data-rights plan", "Publication and disclosure plan"],
    ownerActions: ["Apply only after research-scope review"],
    blockers: ["Normal GSE commercial development is outside the stated scope"],
    priority: "P3",
    targetProjects: ["NOVA"],
    tags: ["research", "alignment", "credits"],
  },
  {
    id: "grok-plugin-marketplace",
    platformId: "xai-x",
    platformName: "xAI / X",
    productOrProgram: "Grok Build Plugin Marketplace",
    channel: "app_or_plugin_directory",
    state: "LIVE_DISTRIBUTION",
    valueTypes: ["DISTRIBUTION", "REPUTATION", "SERVICE_REVENUE"],
    nativePaymentAvailable: false,
    verifiedAt: "2026-07-21",
    sourceUrl: "https://x.ai/news/grok-plugin-marketplace",
    currentTruth:
      "The marketplace is an open catalog and accepts plugin submissions through a repository contribution. Plugins can bundle skills, commands, agents, hooks, MCP servers, and language-server integrations. No general native creator payout is documented.",
    gsePlay:
      "Publish a NOVA evidence-check or GSE sports-development plugin that drives adoption of an owned API, service, or paid product without embedding unsupported payout assumptions.",
    codingDeliverables: ["Grok plugin bundle", "Pinned dependency manifest", "Sandbox test", "Marketplace contribution", "Owned-service conversion path"],
    ownerActions: ["Approve open publication", "Submit marketplace contribution"],
    blockers: ["Distribution is verified; native payment is not", "Plugin security and support obligations remain"],
    priority: "P2",
    targetProjects: ["NOVA", "GSE"],
    tags: ["grok", "plugin", "mcp", "distribution"],
  },
  {
    id: "x-creator-subscriptions",
    platformId: "xai-x",
    platformName: "X",
    productOrProgram: "Creator Subscriptions",
    channel: "creator_payout",
    state: "LIVE_DIRECT_PAYOUT",
    valueTypes: ["SUBSCRIPTION_REVENUE", "DISTRIBUTION"],
    nativePaymentAvailable: true,
    verifiedAt: "2026-07-21",
    sourceUrl: "https://help.x.com/en/using-x/subscriptions-creator",
    currentTruth:
      "Approved creators set a monthly subscription price and may receive up to approximately 97% of gross subscription revenue before processor, app-store, cancellation, and refund deductions. Payout uses Stripe and eligibility is platform-controlled.",
    gsePlay:
      "Use X as a paid expert-access and distribution layer only after a consistent GSE/NOVA content cadence and audience exist; the product must add value beyond reposting site content.",
    codingDeliverables: ["Subscriber content calendar", "GSE-to-X publishing draft queue", "Attribution and conversion analytics", "Entitlement map"],
    ownerActions: ["Build audience", "Apply when eligible", "Connect Stripe after approval"],
    blockers: ["Current audience and eligibility are not evidenced", "Ongoing content production burden"],
    priority: "P2",
    targetProjects: ["GSE", "GSN", "NOVA"],
    tags: ["creator", "subscription", "audience"],
  },
  {
    id: "x-creator-revenue-sharing",
    platformId: "xai-x",
    platformName: "X",
    productOrProgram: "Creator Revenue Sharing",
    channel: "creator_payout",
    state: "CONDITIONAL",
    valueTypes: ["USAGE_REVENUE", "DISTRIBUTION"],
    nativePaymentAvailable: true,
    verifiedAt: "2026-07-21",
    sourceUrl: "https://help.x.com/en/using-x/creator-revenue-sharing",
    currentTruth:
      "The program requires an active qualifying Premium plan and at least five million organic impressions during the prior three months. X may change or end the program and controls acceptance.",
    gsePlay:
      "Treat revenue sharing as a byproduct of an audience strategy, never as the business model or a forecastable near-term revenue line.",
    codingDeliverables: ["Organic impression ledger", "Content attribution", "Platform-policy monitor", "Revenue receipt import"],
    ownerActions: ["Reach documented eligibility", "Apply through X monetization settings"],
    blockers: ["Five-million-impression threshold is not met", "Payout terms remain platform-dependent"],
    priority: "WATCH",
    targetProjects: ["GSN", "GSE", "NOVA"],
    tags: ["creator", "impressions", "platform-risk"],
  },
  {
    id: "gemini-agent-marketplace",
    platformId: "google",
    platformName: "Google Cloud",
    productOrProgram: "Gemini Enterprise Agent Gallery and Google Cloud Marketplace",
    channel: "agent_marketplace",
    state: "LIVE_TRANSACTIONAL",
    valueTypes: ["MARKETPLACE_REVENUE", "DISTRIBUTION", "COSELL", "SERVICE_REVENUE"],
    nativePaymentAvailable: true,
    verifiedAt: "2026-07-21",
    sourceUrl: "https://cloud.google.com/blog/topics/developers-practitioners/publish-agents-in-gemini-enterprise-and-google-cloud-marketplace",
    currentTruth:
      "Third-party agents can be published and sold through Google Cloud Marketplace, then surfaced in Gemini Enterprise Agent Gallery. Marketplace supports enterprise procurement and multiple commercial models subject to partner qualification and review.",
    gsePlay:
      "Build an enterprise NOVA technology-radar agent, sports data-quality agent, or evidence-governance agent with a narrow buyer job and Marketplace-ready SaaS entitlement.",
    codingDeliverables: ["A2A-compatible agent", "Marketplace SaaS offer", "Entitlement and metering", "Gemini Enterprise deployment", "Enterprise security packet"],
    ownerActions: ["Create partner profile", "Choose one enterprise offer", "Submit after a working customer-grade demo"],
    blockers: ["Partner and Marketplace qualification not complete", "Enterprise support and security requirements"],
    priority: "P1",
    targetProjects: ["NOVA", "GSE", "XXX"],
    tags: ["gemini", "agent", "marketplace", "enterprise"],
  },
  {
    id: "microsoft-agent-marketplace",
    platformId: "microsoft",
    platformName: "Microsoft",
    productOrProgram: "Microsoft Marketplace AI Apps and Agents",
    channel: "agent_marketplace",
    state: "LIVE_TRANSACTIONAL",
    valueTypes: ["MARKETPLACE_REVENUE", "SERVICE_REVENUE", "DISTRIBUTION", "COSELL"],
    nativePaymentAvailable: true,
    verifiedAt: "2026-07-21",
    sourceUrl: "https://learn.microsoft.com/en-us/partner-center/marketplace-offers/transacting-commercial-marketplace",
    currentTruth:
      "AI agents can be linked to transactable SaaS offers, and Microsoft Marketplace also supports professional-service offers such as assessments, implementations, workshops, and proofs of concept through private offers.",
    gsePlay:
      "The lowest-friction commercial entry is a fixed NOVA or AI-governance assessment; a transactable agent follows after delivery evidence and a stable SaaS backend exist.",
    codingDeliverables: ["Partner Center offer", "SaaS fulfillment API", "Agent Store package", "Private-offer service SKU", "Commercial marketplace test plan"],
    ownerActions: ["Register in Partner Center", "Select service-first or agent-first route", "Complete publisher verification"],
    blockers: ["Partner verification not complete", "SaaS fulfillment and support are not wired"],
    priority: "P1",
    targetProjects: ["NOVA", "XXX", "GSE"],
    tags: ["microsoft", "agent", "marketplace", "service"],
  },
  {
    id: "aws-activate-bedrock",
    platformId: "aws",
    platformName: "Amazon Web Services",
    productOrProgram: "AWS Activate for Amazon Bedrock",
    channel: "startup_credits",
    state: "LIVE_APPLICATION",
    valueTypes: ["CREDITS", "COST_REDUCTION", "TECHNICAL_SUPPORT"],
    nativePaymentAvailable: false,
    verifiedAt: "2026-07-21",
    sourceUrl: "https://aws.amazon.com/aws-startups/learn/aws-activate-credits-now-accepted-for-third-party-models-on-amazon-bedrock/",
    currentTruth:
      "Activate credits can cover eligible third-party foundation-model usage on Bedrock, including Anthropic and other providers. Award size, eligibility, covered services, and expiration depend on the approved package; advertised maximums are not an owned asset.",
    gsePlay:
      "Use approved credits to fund bounded provider evaluations and production inference already justified by a revenue or launch path, with credits-only routing and no silent cash fallback.",
    codingDeliverables: ["Credits-only provider policy", "Bedrock usage ledger", "Budget circuit breaker", "Model evaluation harness", "Expiration forecast"],
    ownerActions: ["Apply", "Activate only after award", "Set AWS budgets and service quotas"],
    blockers: ["No award or activated balance is evidenced", "Model access and account mapping require setup"],
    priority: "P1",
    targetProjects: ["GSE", "NOVA", "XXX"],
    tags: ["aws", "bedrock", "credits", "inference"],
  },
  {
    id: "aws-marketplace",
    platformId: "aws",
    platformName: "Amazon Web Services",
    productOrProgram: "AWS Marketplace and Bedrock Marketplace",
    channel: "software_marketplace",
    state: "LIVE_TRANSACTIONAL",
    valueTypes: ["MARKETPLACE_REVENUE", "DISTRIBUTION", "COSELL", "SERVICE_REVENUE"],
    nativePaymentAvailable: true,
    verifiedAt: "2026-07-21",
    sourceUrl: "https://docs.aws.amazon.com/marketplace/latest/userguide/user-guide-for-sellers.html",
    currentTruth:
      "AWS Marketplace supports SaaS, API, professional-service, private-offer, data, and model-provider routes. Bedrock Marketplace exposes specialized models, but model-provider onboarding requires a real hosted model and AWS review.",
    gsePlay:
      "Start with a professional-service or SaaS/API offer; defer model-provider ambitions until GSE owns a differentiated trained model and reliable inference operation.",
    codingDeliverables: ["AWS seller package", "Metering and entitlement", "Private-offer SKU", "Security questionnaire", "Model-provider readiness scorecard"],
    ownerActions: ["Register seller account", "Choose one offer type", "Complete tax and banking onboarding"],
    blockers: ["No seller onboarding", "No enterprise buyer evidence", "Model-provider route is premature"],
    priority: "P2",
    targetProjects: ["NOVA", "GSE", "XXX"],
    tags: ["aws", "marketplace", "saas", "api", "services"],
  },
  {
    id: "poe-creator-monetization",
    platformId: "poe",
    platformName: "Poe",
    productOrProgram: "Poe Creator Monetization",
    channel: "creator_payout",
    state: "LIVE_DIRECT_PAYOUT",
    valueTypes: ["USAGE_REVENUE", "DISTRIBUTION"],
    nativePaymentAvailable: true,
    verifiedAt: "2026-07-21",
    sourceUrl: "https://help.poe.com/hc/en-us/articles/21921312368020-Poe-Creator-Monetization-FAQs",
    currentTruth:
      "Eligible US creators can set a per-message price for bots and earn that price when a user messages a responding bot. Payout uses Stripe after program onboarding and the published minimum. Distribution and earnings still depend on real user demand.",
    gsePlay:
      "Launch one narrow paid bot using owned GSE/NOVA knowledge and an API backend: sports decision explainer, AI opportunity analyst, or evidence-audit assistant. Avoid a generic wrapper around another model.",
    codingDeliverables: ["Poe server bot", "Per-message unit economics", "Usage and payout ledger", "Source citation contract", "Conversion and retention analytics"],
    ownerActions: ["Join creator monetization", "Connect Stripe", "Approve price and public bot scope"],
    blockers: ["Bot and public API endpoint are not built", "Demand and cost per message are unmeasured"],
    priority: "P0",
    targetProjects: ["NOVA", "GSE"],
    tags: ["poe", "direct-payout", "bot", "stripe"],
  },
  {
    id: "openrouter-provider",
    platformId: "openrouter",
    platformName: "OpenRouter",
    productOrProgram: "OpenRouter Provider Network",
    channel: "model_provider_network",
    state: "LIVE_APPLICATION",
    valueTypes: ["USAGE_REVENUE", "DISTRIBUTION"],
    nativePaymentAvailable: true,
    verifiedAt: "2026-07-21",
    sourceUrl: "https://openrouter.ai/providers/apply",
    currentTruth:
      "Accepted providers set per-token prices and are paid through monthly invoicing based on actual usage. OpenRouter currently prioritizes proprietary models and routes traffic using price, latency, throughput, reliability, and tool-call performance.",
    gsePlay:
      "A future route for a genuinely differentiated GSE model or inference endpoint. It is not a route for reselling another provider's model without defensible capability and economics.",
    codingDeliverables: ["OpenAI-compatible inference API", "Usage reporting", "Model card", "Reliability and latency telemetry", "Data policy disclosure", "Provider application"],
    ownerActions: ["Apply only after a proprietary model or specialized endpoint is validated"],
    blockers: ["No proprietary model is production-ready", "Provider backlog and acceptance risk", "Inference reliability not established"],
    priority: "WATCH",
    targetProjects: ["GSE", "NOVA"],
    tags: ["model-provider", "usage-revenue", "inference"],
  },
  {
    id: "github-marketplace",
    platformId: "github",
    platformName: "GitHub",
    productOrProgram: "GitHub Marketplace Apps",
    channel: "software_marketplace",
    state: "LIVE_TRANSACTIONAL",
    valueTypes: ["SUBSCRIPTION_REVENUE", "MARKETPLACE_REVENUE", "DISTRIBUTION"],
    nativePaymentAvailable: true,
    verifiedAt: "2026-07-21",
    sourceUrl: "https://docs.github.com/en/apps/github-marketplace/creating-apps-for-github-marketplace/requirements-for-listing-an-app",
    currentTruth:
      "Paid GitHub Apps require an organization with verified-publisher status and generally at least 100 installations; paid OAuth apps require at least 200 users. Marketplace supports flat-rate or per-unit monthly and annual plans and handles purchases while the app handles lifecycle events.",
    gsePlay:
      "NOVA can become a repository opportunity/deprecation/evidence app, but the immediate milestone is a useful free GitHub App that earns installations and proof before paid-plan eligibility.",
    codingDeliverables: ["GitHub App", "Minimum-permission manifest", "Webhook processor", "Free listing", "Installation analytics", "Paid-plan event handler"],
    ownerActions: ["Create business organization and verify domain", "Publish free app", "Pursue paid verification after installation threshold"],
    blockers: ["No GitHub App or installation base", "Publisher organization and domain verification not complete"],
    priority: "P2",
    targetProjects: ["NOVA"],
    tags: ["github", "developer-tool", "marketplace", "subscription"],
  },
  {
    id: "snowflake-native-app",
    platformId: "snowflake",
    platformName: "Snowflake",
    productOrProgram: "Snowflake Marketplace and Native Apps",
    channel: "data_marketplace",
    state: "LIVE_TRANSACTIONAL",
    valueTypes: ["MARKETPLACE_REVENUE", "DISTRIBUTION", "USAGE_REVENUE"],
    nativePaymentAvailable: true,
    verifiedAt: "2026-07-21",
    sourceUrl: "https://www.snowflake.com/en/product/features/native-apps/",
    currentTruth:
      "Providers can distribute and monetize native apps, data products, AI models, and agentic products through Snowflake Marketplace. The strongest route requires enterprise-grade data rights, packaging, support, and a buyer use case.",
    gsePlay:
      "Package rights-cleared derived sports intelligence, source-quality metadata, or an evidence/calibration Native App that runs inside a customer's Snowflake account without exporting customer data.",
    codingDeliverables: ["Snowflake Native App", "Provider listing", "Custom event billing", "Data dictionary and rights manifest", "Sample buyer workflow"],
    ownerActions: ["Open provider account", "Select one data or app product", "Complete listing and commercial review"],
    blockers: ["No enterprise buyer validation", "Rights-cleared commercial dataset must be defined", "Snowflake implementation expertise required"],
    priority: "P2",
    targetProjects: ["GSE", "NOVA"],
    tags: ["snowflake", "data-product", "native-app", "enterprise"],
  },
  {
    id: "databricks-marketplace",
    platformId: "databricks",
    platformName: "Databricks",
    productOrProgram: "Databricks Marketplace",
    channel: "data_marketplace",
    state: "LIVE_TRANSACTIONAL",
    valueTypes: ["MARKETPLACE_REVENUE", "DISTRIBUTION", "COSELL"],
    nativePaymentAvailable: true,
    verifiedAt: "2026-07-21",
    sourceUrl: "https://docs.databricks.com/aws/en/marketplace",
    currentTruth:
      "Providers can list commercial datasets, notebooks, machine-learning models, apps, and MCP servers after provider-program and workspace requirements are met. Customers can apply portions of Databricks commitments to eligible partner purchases.",
    gsePlay:
      "Offer a governed sports data product, model-evaluation asset, or MCP server that helps Databricks agents consume rights-cleared GSE intelligence.",
    codingDeliverables: ["Unity Catalog share", "Marketplace provider profile", "Data/MCP listing", "Sample notebooks", "Commercial fulfillment workflow"],
    ownerActions: ["Apply to Data Partner Program", "Provision required workspace", "Approve product rights and pricing"],
    blockers: ["Premium Unity Catalog workspace and provider approval required", "Commercial data asset not yet selected"],
    priority: "P2",
    targetProjects: ["GSE", "NOVA"],
    tags: ["databricks", "data", "model", "mcp", "marketplace"],
  },
  {
    id: "huggingface-distribution",
    platformId: "huggingface",
    platformName: "Hugging Face",
    productOrProgram: "Hub, Spaces, Models, and Datasets",
    channel: "distribution_only",
    state: "LIVE_DISTRIBUTION",
    valueTypes: ["DISTRIBUTION", "REPUTATION", "COST_REDUCTION"],
    nativePaymentAvailable: false,
    verifiedAt: "2026-07-21",
    sourceUrl: "https://huggingface.co/docs/hub/main/spaces",
    currentTruth:
      "Hugging Face provides broad discovery and hosted demos for models, datasets, and Spaces, plus centralized inference-provider access. No general self-service creator payout for publishing a Space, dataset, or model is verified.",
    gsePlay:
      "Use Hugging Face as a public technical portfolio and demo surface for a rights-cleared GSE benchmark, dataset sample, model card, or NOVA demo, with monetization handled through owned services or later provider relationships.",
    codingDeliverables: ["Hugging Face organization", "Demo Space", "Dataset or benchmark card", "Model card", "Conversion link to owned offer"],
    ownerActions: ["Approve public artifact and license", "Publish only rights-cleared samples"],
    blockers: ["No native creator payout verified", "Public artifacts require strong rights and privacy review"],
    priority: "P2",
    targetProjects: ["GSE", "NOVA"],
    tags: ["huggingface", "demo", "model", "dataset", "distribution"],
  },
  {
    id: "replicate-model-distribution",
    platformId: "replicate",
    platformName: "Replicate",
    productOrProgram: "Community and Official Models",
    channel: "distribution_only",
    state: "NEGOTIATED_ONLY",
    valueTypes: ["DISTRIBUTION", "REPUTATION", "USAGE_REVENUE"],
    nativePaymentAvailable: false,
    verifiedAt: "2026-07-21",
    sourceUrl: "https://replicate.com/docs/topics/models/official-models",
    currentTruth:
      "Anyone can publish a public custom model for discovery, while Replicate maintains official models in collaboration with authors. A general automatic payout to every community-model publisher is not documented; author economics for official models should be treated as negotiated.",
    gsePlay:
      "Use a public model as distribution and proof only after GSE owns a useful trained model. Pursue official-model economics later through direct author discussions, not assumed community revenue.",
    codingDeliverables: ["Cog package", "Versioned model", "Model card", "Examples", "Cost and usage telemetry", "Author partnership packet"],
    ownerActions: ["Approve model license and public release", "Contact Replicate only after adoption evidence"],
    blockers: ["No differentiated trained model", "General community payout not verified"],
    priority: "WATCH",
    targetProjects: ["GSE", "NOVA", "XXX"],
    tags: ["replicate", "model", "distribution", "negotiated"],
  },
  {
    id: "together-startup-accelerator",
    platformId: "together-ai",
    platformName: "Together AI",
    productOrProgram: "Together AI Startup Accelerator",
    channel: "startup_credits",
    state: "LIVE_APPLICATION",
    valueTypes: ["CREDITS", "TECHNICAL_SUPPORT", "COSELL", "DISTRIBUTION"],
    nativePaymentAvailable: false,
    verifiedAt: "2026-07-21",
    sourceUrl: "https://www.together.ai/startup-accelerator",
    currentTruth:
      "The selection-based accelerator offers compute credits, forward-deployed engineering, technical guidance, joint go-to-market support, community, and investor-network access. Benefit size is not treated as available until awarded.",
    gsePlay:
      "Apply with a specific open-model inference, fine-tuning, or evaluation workload tied to a sellable GSE/NOVA product rather than general experimentation.",
    codingDeliverables: ["Model workload plan", "Evaluation baseline", "Credit budget", "Joint go-to-market use case", "Application packet"],
    ownerActions: ["Submit application after choosing the exact product and workload"],
    blockers: ["Selection required", "No approved balance", "Use case must justify open-model infrastructure"],
    priority: "P2",
    targetProjects: ["NOVA", "GSE", "XXX"],
    tags: ["credits", "open-models", "cosell", "accelerator"],
  },
  {
    id: "perplexity-publisher-program",
    platformId: "perplexity",
    platformName: "Perplexity",
    productOrProgram: "Publisher Program and Content Licensing",
    channel: "content_license",
    state: "NEGOTIATED_ONLY",
    valueTypes: ["CONTENT_LICENSE_REVENUE", "DISTRIBUTION", "REPUTATION"],
    nativePaymentAvailable: true,
    verifiedAt: "2026-07-21",
    sourceUrl: "https://www.usatodayco.com/pr/gannett-i-usa-today-network-and-perplexity-announce-strategic-ai-content-licensing-ageement/",
    currentTruth:
      "Perplexity has negotiated publisher-program licensing agreements with major media organizations. No open small-publisher payout enrollment route is verified, and current content-rights litigation makes rights discipline especially important.",
    gsePlay:
      "Treat as a long-term publisher negotiation after GSN has a meaningful original-content archive, audience, source rights, and licensing data room.",
    codingDeliverables: ["Original-content ledger", "Publisher feed", "Attribution analytics", "Licensing data room"],
    ownerActions: ["None until publisher scale and rights are material"],
    blockers: ["No self-service route", "Insufficient original-content scale", "Heightened content-rights risk"],
    priority: "WATCH",
    targetProjects: ["GSN", "GSE"],
    tags: ["publisher", "license", "negotiated"],
  },
  {
    id: "cloudflare-startups-launchpad",
    platformId: "cloudflare",
    platformName: "Cloudflare",
    productOrProgram: "Cloudflare for Startups and Workers Launchpad",
    channel: "startup_credits",
    state: "LIVE_APPLICATION",
    valueTypes: ["CREDITS", "COST_REDUCTION", "TECHNICAL_SUPPORT", "DISTRIBUTION"],
    nativePaymentAvailable: false,
    verifiedAt: "2026-07-21",
    sourceUrl: "https://www.cloudflare.com/startups/",
    currentTruth:
      "Cloudflare publishes tiered startup-credit programs and an open Workers Launchpad cohort. Eligibility, partner backing, product-specific caps, and award size vary, so only approved and activated credits count as usable leverage.",
    gsePlay:
      "Apply around an existing Cloudflare-native product plan—NOVA source monitoring, public API protection, R2 assets, or Workers AI—not as a reason to migrate working infrastructure without measured benefit.",
    codingDeliverables: ["Cloudflare architecture slice", "Usage and cash-displacement model", "Migration rollback", "Application packet", "Credit-expiration monitor"],
    ownerActions: ["Verify exact eligibility tier", "Apply", "Set spend controls after activation"],
    blockers: ["Award not approved", "Infrastructure migration must show measured need"],
    priority: "P2",
    targetProjects: ["NOVA", "GSE", "XXX"],
    tags: ["cloudflare", "credits", "workers", "launchpad"],
  },
];

export interface AiPlatformEcosystemSummary {
  readonly total: number;
  readonly directPayout: number;
  readonly transactional: number;
  readonly applications: number;
  readonly distributionOnly: number;
  readonly negotiatedOnly: number;
  readonly urgent: number;
  readonly p0: number;
}

export function summarizeAiPlatformEcosystem(
  opportunities: readonly AiPlatformOpportunity[] = AI_PLATFORM_OPPORTUNITIES,
  now: Date = new Date(),
): AiPlatformEcosystemSummary {
  const urgent = opportunities.filter((item) => {
    if (!item.expiresAt) return item.state === "LIVE_DEADLINE";
    const expires = Date.parse(item.expiresAt);
    return Number.isFinite(expires) && expires >= now.getTime() && expires - now.getTime() <= 7 * 24 * 60 * 60 * 1000;
  }).length;
  return {
    total: opportunities.length,
    directPayout: opportunities.filter((item) => item.state === "LIVE_DIRECT_PAYOUT").length,
    transactional: opportunities.filter((item) => item.state === "LIVE_TRANSACTIONAL").length,
    applications: opportunities.filter((item) => item.state === "LIVE_APPLICATION").length,
    distributionOnly: opportunities.filter((item) => item.state === "LIVE_DISTRIBUTION").length,
    negotiatedOnly: opportunities.filter((item) => item.state === "NEGOTIATED_ONLY").length,
    urgent,
    p0: opportunities.filter((item) => item.priority === "P0").length,
  };
}

export function getAiPlatformOpportunity(id: string): AiPlatformOpportunity | undefined {
  return AI_PLATFORM_OPPORTUNITIES.find((item) => item.id === id);
}

export function getAiPlatformOpportunitiesByPriority(priority: PlatformPriority): readonly AiPlatformOpportunity[] {
  return AI_PLATFORM_OPPORTUNITIES.filter((item) => item.priority === priority);
}

export function validateAiPlatformEcosystem(
  opportunities: readonly AiPlatformOpportunity[] = AI_PLATFORM_OPPORTUNITIES,
): readonly string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const item of opportunities) {
    if (ids.has(item.id)) errors.push(`Duplicate platform opportunity id: ${item.id}`);
    ids.add(item.id);
    if (!item.sourceUrl.startsWith("https://")) errors.push(`${item.id} must use an HTTPS source URL.`);
    if (item.codingDeliverables.length === 0) errors.push(`${item.id} has no coding deliverables.`);
    if (item.blockers.length === 0) errors.push(`${item.id} has no explicit blockers.`);
    if (item.nativePaymentAvailable && item.valueTypes.every((value) => !["CASH_PRIZE", "USAGE_REVENUE", "SUBSCRIPTION_REVENUE", "MARKETPLACE_REVENUE", "CONTENT_LICENSE_REVENUE"].includes(value))) {
      errors.push(`${item.id} marks native payment without a payment-bearing value type.`);
    }
  }
  return errors;
}

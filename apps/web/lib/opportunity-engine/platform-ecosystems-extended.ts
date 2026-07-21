import type {
  AiPlatformOpportunity,
  PlatformOpportunityChannel,
  PlatformOpportunityState,
  PlatformPriority,
  PlatformValueType,
} from "./platform-ecosystems";

export type ExtendedAiPlatformId =
  | "salesforce"
  | "atlassian"
  | "shopify"
  | "rapidapi"
  | "apify"
  | "canva"
  | "oracle"
  | "zapier";

export interface ExtendedAiPlatformOpportunity
  extends Omit<AiPlatformOpportunity, "platformId"> {
  readonly platformId: ExtendedAiPlatformId;
}

/**
 * Additional verified developer economies that are not foundation-model vendors
 * but can monetize AI applications, APIs, agents, workflows, or owned data.
 */
export const EXTENDED_AI_PLATFORM_OPPORTUNITIES: readonly ExtendedAiPlatformOpportunity[] = [
  {
    id: "salesforce-agentexchange",
    platformId: "salesforce",
    platformName: "Salesforce",
    productOrProgram: "AgentExchange and Agentforce Partner Ecosystem",
    channel: "agent_marketplace",
    state: "LIVE_TRANSACTIONAL",
    valueTypes: ["MARKETPLACE_REVENUE", "SERVICE_REVENUE", "DISTRIBUTION", "COSELL"],
    nativePaymentAvailable: true,
    verifiedAt: "2026-07-21",
    sourceUrl: "https://www.salesforce.com/agentforce/agentexchange/",
    currentTruth:
      "AgentExchange lets qualified partners package, price, provision, and monetize agents, subagents, actions, prompt templates, topics, apps, Slack solutions, and MCP-connected tools. Listings and private offers remain subject to partner onboarding, security review, and commercial terms.",
    gsePlay:
      "Use Garrett's HR leadership expertise and NOVA's evidence architecture to build an enterprise HR policy, workforce-risk, or AI-opportunity agent for Salesforce customers. This is a stronger fit than forcing sports picks into a CRM marketplace.",
    codingDeliverables: [
      "Agentforce agent or template package",
      "Salesforce/Slack action contract",
      "Enterprise data-boundary and audit design",
      "Automated provisioning and entitlement",
      "AgentExchange listing and private-offer packet",
      "HR-domain evaluation fixtures",
    ],
    ownerActions: [
      "Create or complete Salesforce partner profile",
      "Choose the first HR or AI-governance buyer job",
      "Approve commercial terms and listing submission",
    ],
    blockers: [
      "Partner onboarding and security review are not complete",
      "No Salesforce customer discovery or deployment reference exists",
      "The first product must be narrowed to one enterprise workflow",
    ],
    priority: "P1",
    targetProjects: ["NOVA", "XXX", "HR AI"],
    tags: ["salesforce", "agentforce", "hr", "enterprise", "marketplace"],
  },
  {
    id: "atlassian-forge-marketplace",
    platformId: "atlassian",
    platformName: "Atlassian",
    productOrProgram: "Atlassian Marketplace and Forge",
    channel: "software_marketplace",
    state: "LIVE_TRANSACTIONAL",
    valueTypes: ["SUBSCRIPTION_REVENUE", "MARKETPLACE_REVENUE", "DISTRIBUTION"],
    nativePaymentAvailable: true,
    verifiedAt: "2026-07-21",
    sourceUrl: "https://developer.atlassian.com/platform/marketplace/pricing-payment-and-billing/",
    currentTruth:
      "Atlassian supports paid Marketplace apps and platform-managed billing. Qualifying Forge-only apps receive 100% of gross revenue until the partner reaches $1 million in lifetime Forge revenue; after that, the current Forge partner share is 84% through September 2026 and is scheduled to change thereafter. Payout begins after the published remittance threshold.",
    gsePlay:
      "Build NOVA as a Jira/Confluence engineering-intelligence app that watches dependencies, AI platform changes, deprecations, credits, and opportunity decisions, then creates evidence-backed issues and decision pages.",
    codingDeliverables: [
      "Forge-only app architecture",
      "Jira issue and Confluence page modules",
      "OAuth and minimum-scope manifest",
      "Atlassian billing and entitlement plan",
      "Marketplace listing",
      "Tenant-isolation and data-retention tests",
    ],
    ownerActions: [
      "Create Marketplace partner profile",
      "Approve first free or paid plan",
      "Complete identity, tax, payout, and listing review",
    ],
    blockers: [
      "No Atlassian customer discovery or install base",
      "Forge runtime cost and product-support burden must be measured",
      "Marketplace terms and scheduled share changes require ongoing monitoring",
    ],
    priority: "P1",
    targetProjects: ["NOVA"],
    tags: ["atlassian", "jira", "confluence", "forge", "subscription"],
  },
  {
    id: "shopify-app-store",
    platformId: "shopify",
    platformName: "Shopify",
    productOrProgram: "Shopify App Store",
    channel: "software_marketplace",
    state: "LIVE_TRANSACTIONAL",
    valueTypes: ["SUBSCRIPTION_REVENUE", "USAGE_REVENUE", "MARKETPLACE_REVENUE", "DISTRIBUTION"],
    nativePaymentAvailable: true,
    verifiedAt: "2026-07-21",
    sourceUrl: "https://shopify.dev/docs/apps/launch/distribution/revenue-share",
    currentTruth:
      "Shopify public apps can charge one-time, subscription, or usage fees through platform billing. Developers keep 100% of their first $1 million in cumulative gross App Store revenue earned from January 1, 2025, then 85% above that, subject to processing fees, registration, review, support, and protected-data requirements.",
    gsePlay:
      "Do not build a generic AI wrapper. Use the user's real commerce context to test one merchant job: sports-card catalog enrichment, listing quality, image/content workflow, or cross-border product/size risk intelligence.",
    codingDeliverables: [
      "Shopify embedded app",
      "Billing API integration",
      "Merchant data-minimization contract",
      "One narrow commerce workflow",
      "App review fixtures",
      "Support and deletion workflow",
    ],
    ownerActions: [
      "Choose the first commerce buyer job",
      "Register the Partner account for App Store distribution",
      "Approve pricing and protected-data access",
    ],
    blockers: [
      "Product-market fit is not validated",
      "This is adjacent to GSE and must not distract from first-cash priorities",
      "Merchant-data and support obligations are material",
    ],
    priority: "P2",
    targetProjects: ["Sports Card Business", "Cross-Border Shopping Intelligence"],
    tags: ["shopify", "commerce", "app", "subscription", "usage"],
  },
  {
    id: "rapidapi-gse",
    platformId: "rapidapi",
    platformName: "RapidAPI",
    productOrProgram: "RapidAPI Hub",
    channel: "software_marketplace",
    state: "LIVE_TRANSACTIONAL",
    valueTypes: ["USAGE_REVENUE", "DISTRIBUTION"],
    nativePaymentAvailable: true,
    verifiedAt: "2026-07-21",
    sourceUrl: "https://docs.rapidapi.com/docs/what-is-rapidapi",
    currentTruth:
      "API providers can list public or private APIs, optionally monetize them, and use platform analytics and subscription management. The hub gives access to more than five million developers, but listing alone does not create usage or relieve the provider of uptime, support, rights, and margin obligations.",
    gsePlay:
      "Package one rights-safe GSE endpoint—not the whole platform—such as source freshness, game context, evidence receipts, or calibrated uncertainty. Use the listing to test demand before building enterprise sales infrastructure.",
    codingDeliverables: [
      "One versioned public API endpoint",
      "API-key authentication and quotas",
      "RapidAPI proxy configuration",
      "Usage and gross-margin ledger",
      "Rights-safe response schema",
      "Developer quickstart and support boundary",
    ],
    ownerActions: [
      "Approve the first API product and price",
      "Create provider listing",
      "Connect payout/tax details only after review",
    ],
    blockers: [
      "No endpoint has buyer validation yet",
      "Current source licenses must permit the exact response payload",
      "Reliable metering, uptime, and support need proof",
    ],
    priority: "P1",
    targetProjects: ["GSE", "NOVA"],
    tags: ["api", "rapidapi", "usage-revenue", "developer-distribution"],
  },
  {
    id: "apify-store",
    platformId: "apify",
    platformName: "Apify",
    productOrProgram: "Apify Store Actors and MCP-compatible billing",
    channel: "software_marketplace",
    state: "LIVE_DIRECT_PAYOUT",
    valueTypes: ["USAGE_REVENUE", "SUBSCRIPTION_REVENUE", "DISTRIBUTION"],
    nativePaymentAvailable: true,
    verifiedAt: "2026-07-21",
    sourceUrl: "https://docs.apify.com/academy/build-and-publish/why",
    currentTruth:
      "Apify Store supports pay-per-event, pay-per-result, and monthly rental pricing. Developers receive 80% of revenue; pay-per-event is compatible with AI and MCP workloads. Platform usage costs and maintenance still affect margin, and source rights remain the publisher's responsibility.",
    gsePlay:
      "Publish a NOVA first-party changelog/registry monitor or a rights-cleared official sports-source metadata Actor. Avoid scraping protected sports or publisher content merely because the platform makes automation easy.",
    codingDeliverables: [
      "Apify Actor",
      "Pay-per-event or pay-per-result events",
      "Source allowlist and rights policy",
      "Dataset schema",
      "MCP interface",
      "Cost, rate-limit, and payout ledger",
    ],
    ownerActions: [
      "Approve the first lawful Actor scope and pricing",
      "Create Store listing and payout profile",
    ],
    blockers: [
      "Source terms must allow automated access and commercial output",
      "No demand or unit economics have been measured",
      "Actor maintenance and upstream breakage create ongoing support work",
    ],
    priority: "P1",
    targetProjects: ["NOVA", "GSE"],
    tags: ["apify", "actor", "mcp", "usage", "direct-payout"],
  },
  {
    id: "canva-premium-apps",
    platformId: "canva",
    platformName: "Canva",
    productOrProgram: "Canva Premium Apps Program",
    channel: "app_or_plugin_directory",
    state: "LIVE_APPLICATION",
    valueTypes: ["USAGE_REVENUE", "CREDITS", "DISTRIBUTION", "TECHNICAL_SUPPORT"],
    nativePaymentAvailable: true,
    verifiedAt: "2026-07-21",
    sourceUrl: "https://www.canva.dev/docs/apps/premium-apps/",
    currentTruth:
      "Approved Premium Apps earn recurring compensation based on tracked billable actions used by paid Canva users. Canva also offers development grants for selected apps in development. Rates are negotiated; the program requires acceptance, payout setup, correct tracking sessions, security, and marketplace review.",
    gsePlay:
      "Build a GSE/GSN/XXX creator app that converts approved sports data or owned brand assets into social cards, newsletters, visual explainers, thumbnails, or video/audio assets. Each premium action must create, modify, or import an eligible media/text asset.",
    codingDeliverables: [
      "Canva Apps SDK v2 application",
      "Mobile and desktop UI",
      "Backend token verification",
      "Billable-action tracking",
      "Brand and sports-data rights controls",
      "Marketplace and Premium Apps application packet",
    ],
    ownerActions: [
      "Select one high-frequency creator workflow",
      "Approve developer identity/public listing details",
      "Apply to Premium Apps or development-grant program",
      "Configure payout only after acceptance",
    ],
    blockers: [
      "Premium Apps acceptance and rate are not assured",
      "The app must be live or sufficiently developed for program consideration",
      "Usage must be high enough to exceed backend inference and support cost",
    ],
    priority: "P1",
    targetProjects: ["GSN", "GSE", "XXX"],
    tags: ["canva", "creator", "billable-action", "grant", "usage-revenue"],
  },
  {
    id: "oracle-cloud-marketplace",
    platformId: "oracle",
    platformName: "Oracle Cloud",
    productOrProgram: "Oracle Cloud Marketplace Paid Listings",
    channel: "software_marketplace",
    state: "LIVE_TRANSACTIONAL",
    valueTypes: ["MARKETPLACE_REVENUE", "DISTRIBUTION"],
    nativePaymentAvailable: true,
    verifiedAt: "2026-07-21",
    sourceUrl: "https://docs.oracle.com/en-us/iaas/Content/Marketplace/managing-images.htm",
    currentTruth:
      "Oracle Marketplace supports hourly paid image and stack listings, and Oracle documentation reports a 97% provider disbursement on qualifying gross sales after collection. Some artifact types remain limited to free or bring-your-own-license models.",
    gsePlay:
      "Treat as a later enterprise packaging route for a deployable NOVA/GSE appliance. It is less aligned with current serverless architecture than Microsoft, Google, AWS, or a direct API marketplace.",
    codingDeliverables: [
      "OCI deployable image or stack",
      "Hourly metering",
      "Publisher agreement review",
      "Enterprise installation and support runbook",
      "Marketplace listing",
    ],
    ownerActions: ["Consider only after an OCI buyer or partner appears", "Complete publisher and banking onboarding"],
    blockers: [
      "No OCI buyer evidence",
      "Current application is not packaged as an Oracle image or stack",
      "Marketplace artifact and support requirements create high implementation cost",
    ],
    priority: "WATCH",
    targetProjects: ["NOVA", "GSE"],
    tags: ["oracle", "marketplace", "enterprise", "appliance"],
  },
  {
    id: "zapier-integration-directory",
    platformId: "zapier",
    platformName: "Zapier",
    productOrProgram: "Zapier Integration Partner Platform",
    channel: "distribution_only",
    state: "LIVE_DISTRIBUTION",
    valueTypes: ["DISTRIBUTION", "SERVICE_REVENUE", "SUBSCRIPTION_REVENUE"],
    nativePaymentAvailable: false,
    verifiedAt: "2026-07-21",
    sourceUrl: "https://developer.zapier.com/",
    currentTruth:
      "Zapier lets developers publish integrations into a large workflow ecosystem and supports partner growth resources. A general platform-managed payout for integration usage is not verified; monetization normally comes from the developer's own SaaS, implementation service, or paid workflow product.",
    gsePlay:
      "Use Zapier as a distribution and automation surface for NOVA alerts, GSE content/research handoffs, lead intake, or paid service fulfillment after an owned commercial product exists.",
    codingDeliverables: [
      "Zapier integration",
      "Triggers, searches, and actions",
      "OAuth or API-key connection",
      "Public app review fixtures",
      "Owned subscription or service conversion path",
    ],
    ownerActions: ["Approve public integration scope", "Submit only after an owned product endpoint is stable"],
    blockers: [
      "Native usage payout is not verified",
      "A stable public API and authentication boundary must exist first",
      "Distribution without an owned offer will not create income",
    ],
    priority: "P2",
    targetProjects: ["NOVA", "GSE", "XXX"],
    tags: ["zapier", "workflow", "distribution", "saas"],
  },
];

export interface PlatformOpportunityView {
  readonly id: string;
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

export function combinePlatformOpportunities(
  primary: readonly AiPlatformOpportunity[],
  extended: readonly ExtendedAiPlatformOpportunity[] = EXTENDED_AI_PLATFORM_OPPORTUNITIES,
): readonly PlatformOpportunityView[] {
  return [...primary, ...extended];
}

export function validateExtendedPlatformEcosystem(
  opportunities: readonly ExtendedAiPlatformOpportunity[] = EXTENDED_AI_PLATFORM_OPPORTUNITIES,
): readonly string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const item of opportunities) {
    if (ids.has(item.id)) errors.push(`Duplicate extended platform opportunity id: ${item.id}`);
    ids.add(item.id);
    if (!item.sourceUrl.startsWith("https://")) errors.push(`${item.id} must use an HTTPS source URL.`);
    if (item.codingDeliverables.length === 0) errors.push(`${item.id} has no coding deliverables.`);
    if (item.ownerActions.length === 0) errors.push(`${item.id} has no owner actions.`);
    if (item.blockers.length === 0) errors.push(`${item.id} has no explicit blockers.`);
  }
  return errors;
}

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const out = path.join(root, "docs", "research", "oss-next-wave-stack");
const reposDir = path.join(out, "repos");
const packetsDir = path.join(out, "claude-build-packets", "packets");
fs.mkdirSync(reposDir, { recursive: true });
fs.mkdirSync(packetsDir, { recursive: true });
fs.mkdirSync(path.join(root, "reports", "codex"), { recursive: true });

const asOf = "2026-06-09";

const repos = [
  {
    id: "posthog",
    name: "PostHog",
    repo: "PostHog/posthog",
    url: "https://github.com/PostHog/posthog",
    site: "https://posthog.com",
    docs: "https://posthog.com/docs",
    license: "MIT Expat for repo content outside ee; enterprise code under separate license",
    stars: "34.9k",
    forks: "2.8k",
    release: "posthog-cli/v0.7.21, 2026-06-05",
    commit: "2026-06-09T10:18:10Z via partial GitHub API before rate limit",
    language: "Python, TypeScript",
    category: "Product analytics, experimentation, feature flags, session replay",
    replaces: "Amplitude, Mixpanel, LaunchDarkly, FullStory, Hotjar, Heap, lightweight CDP tools",
    deployment: "Cloud recommended by vendor; open-source hobby self-host exists but vendor states it is advanced and not guaranteed at large scale",
    data: "High sensitivity: behavior events, session recordings, IDs, cohort membership, feature flags",
    capabilities: [
      "Product analytics and funnels",
      "Web analytics and event capture",
      "Session replay",
      "Feature flags",
      "Experiments",
      "Surveys",
      "Data warehouse/CDP surfaces",
      "Error tracking and product assistant"
    ],
    integration: "Client event SDK, server-side events, feature flags, exports, webhooks/integrations",
    adoption: "Prototype immediately, but prefer cloud or isolated hobby deploy until event volume and privacy policy are clear",
    risk: "PII/session replay risk; open-core ee boundary; self-host scale/support limits",
    gse: "Turns GSE from opinion-led website into measured conversion and retention machine.",
    scores: [10, 7, 10, 8, 9, 6, 7, 10],
    sources: [
      "https://github.com/PostHog/posthog",
      "https://posthog.com/docs/self-host",
      "https://posthog.com/docs"
    ]
  },
  {
    id: "langfuse",
    name: "Langfuse",
    repo: "langfuse/langfuse",
    url: "https://github.com/langfuse/langfuse",
    site: "https://langfuse.com",
    docs: "https://langfuse.com/docs",
    license: "MIT core outside ee/web/src/ee/worker/src/ee; enterprise modules require commercial license",
    stars: "28.7k",
    forks: "3.0k",
    release: "v3.179.1, 2026-06-08",
    commit: "2026-06-09T10:03:53Z via partial GitHub API before rate limit",
    language: "TypeScript",
    category: "LLM observability, prompt management, evals, datasets",
    replaces: "LangSmith, Helicone, HoneyHive, prompt spreadsheets, manual AI QA",
    deployment: "Self-host via Docker with web, worker, PostgreSQL, ClickHouse, Redis/blob storage depending version; cloud available",
    data: "Very high sensitivity: prompts, retrieved context, model outputs, user questions, source snippets, costs",
    capabilities: [
      "LLM traces and spans",
      "Prompt management",
      "Datasets and evaluations",
      "Cost and latency tracking",
      "OpenTelemetry integrations",
      "OpenAI/LangChain/LiteLLM integrations"
    ],
    integration: "SDK/API instrumentation around AI calls, RAG retrieval, agent tasks, evals, prompt registry",
    adoption: "Prototype now for internal AI/RAG systems; never log founder-only corpora without redaction policy",
    risk: "Prompt leakage, trace retention, open-core enterprise security features, model output PII",
    gse: "Makes every AI workflow measurable, auditable, cost-aware, and improvable.",
    scores: [10, 7, 9, 7, 10, 6, 7, 9],
    sources: [
      "https://github.com/langfuse/langfuse",
      "https://langfuse.com/docs/open-source",
      "https://langfuse.com/docs/deployment/self-host"
    ]
  },
  {
    id: "n8n",
    name: "n8n",
    repo: "n8n-io/n8n",
    url: "https://github.com/n8n-io/n8n",
    site: "https://n8n.io",
    docs: "https://docs.n8n.io",
    license: "Sustainable Use License for non-ee code; source-available/fair-code, not normal OSI OSS; ee files require enterprise license",
    stars: "191.7k",
    forks: "58.4k",
    release: "n8n@2.23.4, 2026-06-05",
    commit: "2026-06-09T10:12:59Z via partial GitHub API before rate limit",
    language: "TypeScript",
    category: "Workflow automation and internal AI/business automations",
    replaces: "Zapier, Make, Pipedream, brittle cron scripts, manual ops glue",
    deployment: "Cloud or self-host; production self-host needs database, queue/worker mode, credentials policy, execution isolation, backups",
    data: "Very high sensitivity: all connected-app credentials, customer data, workflow payloads",
    capabilities: [
      "Visual workflow builder",
      "400+ integrations",
      "AI nodes and code nodes",
      "Webhooks",
      "Schedules",
      "Credential store",
      "Manual and automated executions"
    ],
    integration: "Webhook-first automation layer between CRM, support, newsletter, docs, analytics, and build queues",
    adoption: "Internal-only isolated automation lab; do not host workflows for external clients without legal review",
    risk: "License limits; workflow RCE/sandbox risk; credential sprawl; operational blast radius",
    gse: "Gives a company-of-one operating system a nervous system, but must be isolated and permissioned.",
    scores: [9, 6, 8, 9, 9, 4, 6, 9],
    sources: [
      "https://github.com/n8n-io/n8n",
      "https://docs.n8n.io",
      "https://docs.n8n.io/choose-n8n/",
      "https://raw.githubusercontent.com/n8n-io/n8n/master/LICENSE.md"
    ]
  },
  {
    id: "novu",
    name: "Novu",
    repo: "novuhq/novu",
    url: "https://github.com/novuhq/novu",
    site: "https://novu.co",
    docs: "https://docs.novu.co",
    license: "MIT core plus enterprise/proprietary folders and ee packages under separate licenses",
    stars: "39.1k",
    forks: "4.3k",
    release: "v3.17.0, 2026-06-01",
    commit: "GitHub page active as of 2026-06-09; exact commit not API-verified after rate limit",
    language: "TypeScript",
    category: "Notification infrastructure, inbox, preferences, workflows, agent communication",
    replaces: "Customer.io notifications, Courier, OneSignal for in-app, custom notification center, scattered provider code",
    deployment: "Cloud or self-host; needs app, API, workers, DB/cache/queue depending deployment; provider credentials for email/SMS/push/chat",
    data: "High sensitivity: subscriber identity, notification preferences, message payloads, provider secrets",
    capabilities: [
      "In-app Inbox component",
      "Email/SMS/push/chat channels",
      "Workflow builder",
      "Digest and delay steps",
      "Subscriber topics/preferences",
      "Agent communication infrastructure",
      "SDKs and API"
    ],
    integration: "GSE notification control plane for alerts, lifecycle, paid-tier messaging, agent replies, and preferences",
    adoption: "Prototype after event taxonomy; use API/cloud first, self-host only after deliverability/security review",
    risk: "Open-core enterprise boundaries; messaging compliance; provider credential blast radius; customer fatigue",
    gse: "Turns one-way alerts into controlled, preference-aware, multi-channel customer conversations.",
    scores: [10, 6, 10, 8, 8, 5, 6, 10],
    sources: [
      "https://github.com/novuhq/novu",
      "https://docs.novu.co/platform",
      "https://docs.novu.co/platform/concepts/workflows",
      "https://raw.githubusercontent.com/novuhq/novu/next/LICENSE-MIT",
      "https://raw.githubusercontent.com/novuhq/novu/next/EE-PACKAGES-LICENSE"
    ]
  },
  {
    id: "payload",
    name: "Payload",
    repo: "payloadcms/payload",
    url: "https://github.com/payloadcms/payload",
    site: "https://payloadcms.com",
    docs: "https://payloadcms.com/docs",
    license: "MIT",
    stars: "42.6k",
    forks: "3.7k",
    release: "GitHub releases active; exact latest release not API-verified after rate limit",
    commit: "GitHub page active as of 2026-06-09; exact commit not API-verified after rate limit",
    language: "TypeScript",
    category: "Next.js-native CMS, admin panel, content models, DAM, marketing operations",
    replaces: "Contentful, Sanity, Strapi, WordPress admin, Webflow CMS for app-integrated content",
    deployment: "Runs in Node/Next.js; supports database ownership, REST/GraphQL/local API, auth, media storage, migrations",
    data: "Medium/high sensitivity: marketing content, campaign pages, editorial drafts, media, internal tool records",
    capabilities: [
      "Admin panel",
      "Code-first schemas",
      "REST, GraphQL, local API",
      "Auth/access control",
      "Live preview",
      "Media and image management",
      "Migrations and database ownership"
    ],
    integration: "Marketing CMS and brand operating layer for pages, reports, explainers, trust assets, and editorial workflow",
    adoption: "Adopt only in the real Next.js app clone after schema/design approval; do not add dependency in this control workspace",
    risk: "CMS migration scope; editor permissions; media storage; build/deploy complexity",
    gse: "Gives branded marketing the same engineering-grade control as the product.",
    scores: [10, 7, 10, 8, 8, 7, 7, 9],
    sources: [
      "https://github.com/payloadcms/payload",
      "https://payloadcms.com/docs/getting-started/what-is-payload",
      "https://payloadcms.com/docs/production/deployment"
    ]
  },
  {
    id: "dub",
    name: "Dub",
    repo: "dubinc/dub",
    url: "https://github.com/dubinc/dub",
    site: "https://dub.co",
    docs: "https://dub.co/docs",
    license: "AGPLv3 core with ee folders under commercial license",
    stars: "23.7k",
    forks: "3.0k",
    release: "No clear latest release from GitHub page; active main branch",
    commit: "GitHub page active as of 2026-06-09; exact commit not API-verified after rate limit",
    language: "TypeScript",
    category: "Link management, attribution, partner/referral programs, campaign analytics",
    replaces: "Bitly, Rebrandly, PartnerStack light use, attribution spreadsheets, UTM chaos",
    deployment: "Self-host guide requires Vercel, PlanetScale/MySQL, Tinybird/ClickHouse, Upstash Redis, R2/AWS storage, GitHub OAuth, optional Resend/Unsplash",
    data: "Medium/high sensitivity: campaign traffic, referrals, clicks, conversions, partner IDs",
    capabilities: [
      "Branded short links",
      "Marketing attribution",
      "Partner/referral programs",
      "Conversion tracking",
      "Analytics API",
      "REST API, SDKs, webhooks",
      "Bulk links"
    ],
    integration: "Campaign link spine for every GSE content, affiliate, creator, enterprise, and paid-tier conversion path",
    adoption: "Use cloud/API or pattern first; self-host later only if AGPL obligations and infra burden are accepted",
    risk: "AGPL/public network obligations if modified; multi-service hosting; attribution privacy; source access duties",
    gse: "Turns brand marketing from vibes into measurable, partner-ready distribution infrastructure.",
    scores: [9, 5, 10, 8, 8, 4, 5, 10],
    sources: [
      "https://github.com/dubinc/dub",
      "https://dub.co/docs",
      "https://dub.co/docs/self-hosting",
      "https://raw.githubusercontent.com/dubinc/dub/main/LICENSE.md"
    ]
  },
  {
    id: "formbricks",
    name: "Formbricks",
    repo: "formbricks/formbricks",
    url: "https://github.com/formbricks/formbricks",
    site: "https://formbricks.com",
    docs: "https://formbricks.com/docs",
    license: "AGPLv3 core plus enterprise modules under separate license; no white-label resale",
    stars: "12.4k",
    forks: "2.3k",
    release: "GitHub releases active; exact latest release not API-verified after rate limit",
    commit: "GitHub page active as of 2026-06-09; exact commit not API-verified after rate limit",
    language: "TypeScript",
    category: "Surveys, in-app feedback, user research, experience management",
    replaces: "Typeform, Qualtrics, SurveyMonkey, Hotjar feedback widgets, scattered Google Forms",
    deployment: "Cloud or self-host; repo includes Docker compose and OpenAPI; production needs DB, auth, email/domain policy",
    data: "High sensitivity: customer opinions, churn reasons, pricing objections, emails, product feedback",
    capabilities: [
      "Link surveys",
      "Website surveys",
      "In-app surveys",
      "Email surveys",
      "Analysis surfaces",
      "OpenAPI file",
      "Docker self-hosting"
    ],
    integration: "Research layer for onboarding, pricing, churn, content quality, and paid-tier objections",
    adoption: "Start with cloud/API or isolated self-host; never embed white-labeled survey editor in product without approval",
    risk: "AGPL; enterprise feature boundary; feedback PII; survey fatigue; no white-label resale",
    gse: "Makes every visitor/customer interaction teach the product and marketing system.",
    scores: [9, 7, 9, 8, 7, 5, 7, 8],
    sources: [
      "https://github.com/formbricks/formbricks",
      "https://formbricks.com/docs/platform/introduction",
      "https://formbricks.com/docs/self-hosting/overview"
    ]
  },
  {
    id: "trigger-dev",
    name: "Trigger.dev",
    repo: "triggerdotdev/trigger.dev",
    url: "https://github.com/triggerdotdev/trigger.dev",
    site: "https://trigger.dev",
    docs: "https://trigger.dev/docs",
    license: "Apache-2.0",
    stars: "15.3k",
    forks: "1.3k",
    release: "trigger.dev v4.4.6, 2026-05-12",
    commit: "GitHub page active as of 2026-06-09; exact commit not API-verified after rate limit",
    language: "TypeScript",
    category: "Durable background jobs, AI tasks, retries, scheduled work, realtime task status",
    replaces: "Ad hoc cron, fragile serverless timeouts, homegrown queues, background-job SaaS for Next.js",
    deployment: "Cloud or self-host; self-host requires version-pinned releases and infrastructure ownership; integrates with TypeScript apps",
    data: "Medium/high sensitivity depending jobs: sports data, AI reports, emails, billing events, user payloads",
    capabilities: [
      "Long-running tasks",
      "Retries",
      "Scheduled tasks",
      "AI workflows",
      "Realtime API",
      "Dashboard observability",
      "Vercel/Next.js-friendly SDK"
    ],
    integration: "Execution backbone for sports ingestion, report generation, alert compilation, and autonomous worker queues",
    adoption: "Use SDK/cloud prototype in real app clone; self-host later only for residency/control reasons",
    risk: "Job idempotency, duplicate sends, queue costs, payload retention, self-host operations",
    gse: "Transforms GSE from request/response website into reliable autonomous worker platform.",
    scores: [10, 8, 10, 7, 9, 7, 7, 9],
    sources: [
      "https://github.com/triggerdotdev/trigger.dev",
      "https://trigger.dev/docs/introduction",
      "https://trigger.dev/docs/self-hosting/overview",
      "https://raw.githubusercontent.com/triggerdotdev/trigger.dev/main/LICENSE"
    ]
  },
  {
    id: "unkey",
    name: "Unkey",
    repo: "unkeyed/unkey",
    url: "https://github.com/unkeyed/unkey",
    site: "https://www.unkey.com",
    docs: "https://www.unkey.com/docs",
    license: "AGPLv3 for main repo outside package-specific exceptions",
    stars: "5.3k",
    forks: "621",
    release: "control-api v1.0.2, 2026-06-08",
    commit: "GitHub page active as of 2026-06-09; exact commit not API-verified after rate limit",
    language: "TypeScript, Go",
    category: "API keys, rate limiting, authorization, API analytics, gateway",
    replaces: "Homegrown API key tables, Redis rate limiters, basic usage dashboards, API gateway glue",
    deployment: "Cloud or self-host/source-available; modern API platform with services, gateway, control API, DB/cache needs",
    data: "High sensitivity: API keys, auth metadata, usage records, permissions, audit logs",
    capabilities: [
      "API key issue/verify/revoke",
      "Rate limiting",
      "Usage analytics",
      "Permissions and RBAC",
      "Audit logs",
      "Gateway/deployment direction",
      "Per-key metadata/limits"
    ],
    integration: "Future PRO/ELITE/enterprise API access layer and partner-key governance",
    adoption: "Pattern now, API/cloud prototype later; self-host/fork only after AGPL and auth review",
    risk: "AGPL, auth criticality, customer API outage risk, key leakage, external PR policy paused",
    gse: "Lets GSE package data and intelligence as controlled API access instead of one-off deliverables.",
    scores: [9, 6, 9, 7, 8, 5, 6, 10],
    sources: [
      "https://github.com/unkeyed/unkey",
      "https://www.unkey.com/docs",
      "https://raw.githubusercontent.com/unkeyed/unkey/main/LICENSE"
    ]
  },
  {
    id: "signoz",
    name: "SigNoz",
    repo: "SigNoz/signoz",
    url: "https://github.com/SigNoz/signoz",
    site: "https://signoz.io",
    docs: "https://signoz.io/docs",
    license: "MIT Expat outside ee/cmd/enterprise; enterprise code under separate license",
    stars: "22k+ from search snapshot; GitHub page current count not fully captured after API limit",
    forks: "1.6k+ from search snapshot; exact current not API-verified",
    release: "GitHub releases active; exact latest release not API-verified after rate limit",
    commit: "GitHub page active as of 2026-06-09; exact commit not API-verified after rate limit",
    language: "TypeScript, Go",
    category: "OpenTelemetry-native observability: logs, metrics, traces, APM",
    replaces: "Datadog, New Relic, Grafana Cloud subsets, ad hoc logs-only debugging",
    deployment: "Cloud or self-host with Docker, Linux, or Kubernetes/Helm; uses ClickHouse/OTel collector stack",
    data: "Medium/high sensitivity: traces, logs, request metadata, errors, user IDs, infra metrics",
    capabilities: [
      "APM",
      "Logs",
      "Metrics",
      "Traces",
      "Exceptions monitoring",
      "OpenTelemetry ingestion",
      "Dashboards and alerts"
    ],
    integration: "Reliability layer across web app, API, background jobs, AI pipelines, and self-hosted services",
    adoption: "Pattern and cloud/prototype first; self-host once platform/service count justifies operations",
    risk: "Telemetry PII, ClickHouse operations, storage growth, alert noise, enterprise boundary",
    gse: "Makes the autonomous system observable enough to trust.",
    scores: [9, 5, 8, 7, 7, 6, 5, 8],
    sources: [
      "https://github.com/SigNoz/signoz",
      "https://signoz.io/docs/",
      "https://raw.githubusercontent.com/SigNoz/signoz/main/LICENSE"
    ]
  }
];

const packets = [
  ["NEXT-001","PostHog privacy-first web analytics baseline",["PostHog"],"Measurement","P0","S","API/cloud first"],
  ["NEXT-002","GSE event taxonomy for FREE/PRO/ELITE",["PostHog"],"Measurement","P0","M","code integration"],
  ["NEXT-003","Activation and paid-conversion funnel dashboard",["PostHog"],"Measurement","P0","M","API/cloud first"],
  ["NEXT-004","Feature flag and experiment governance",["PostHog"],"Measurement","P1","M","API integration"],
  ["NEXT-005","Session replay redaction policy and kill switch",["PostHog"],"Measurement","P0","S","policy plus config"],
  ["NEXT-006","Content-to-conversion cohort dashboard",["PostHog","Dub","Payload"],"Measurement","P1","M","API integration"],
  ["NEXT-007","Langfuse trace schema for every AI call",["Langfuse"],"AI Ops","P0","M","SDK instrumentation"],
  ["NEXT-008","RAG evaluation and citation scorecard",["Langfuse","AnythingLLM"],"AI Ops","P0","M","internal tool"],
  ["NEXT-009","Prompt registry and release process",["Langfuse"],"AI Ops","P1","M","internal tool"],
  ["NEXT-010","AI cost and latency dashboard",["Langfuse","SigNoz"],"AI Ops","P1","M","observability"],
  ["NEXT-011","LLM trace redaction middleware",["Langfuse"],"AI Ops","P0","M","code integration"],
  ["NEXT-012","Prompt failure to Claude build-packet loop",["Langfuse","Trigger.dev"],"AI Ops","P2","L","automation"],
  ["NEXT-013","n8n isolated internal automation lab",["n8n"],"Automation","P0","M","self-hosted isolated"],
  ["NEXT-014","Lead enrichment workflow spec",["n8n","Twenty","Dub"],"Automation","P1","M","workflow"],
  ["NEXT-015","Support conversation to build queue workflow",["n8n","Chatwoot"],"Automation","P1","M","workflow"],
  ["NEXT-016","Research artifact to newsletter draft workflow",["n8n","listmonk","Payload"],"Automation","P1","M","workflow"],
  ["NEXT-017","Daily founder cockpit digest workflow",["n8n","PostHog","SigNoz","Langfuse"],"Automation","P1","L","workflow"],
  ["NEXT-018","n8n license and credential gate",["n8n"],"Automation","P0","S","policy plus config"],
  ["NEXT-019","Novu notification preference center",["Novu"],"Lifecycle","P0","M","component integration"],
  ["NEXT-020","Premium alert digest workflow",["Novu","listmonk"],"Lifecycle","P0","M","API integration"],
  ["NEXT-021","PRO/ELITE notification routing matrix",["Novu"],"Lifecycle","P1","S","spec"],
  ["NEXT-022","Agent communication bridge prototype",["Novu","Langfuse"],"Lifecycle","P2","L","API integration"],
  ["NEXT-023","Billing/security transactional notice map",["Novu"],"Lifecycle","P1","S","spec"],
  ["NEXT-024","Notification event taxonomy",["Novu","PostHog"],"Lifecycle","P0","S","spec"],
  ["NEXT-025","Payload marketing CMS schema",["Payload"],"Brand CMS","P0","M","code integration"],
  ["NEXT-026","GSE content model: pages, reports, explainers",["Payload"],"Brand CMS","P0","M","code integration"],
  ["NEXT-027","Source transparency page system",["Payload","AnythingLLM"],"Brand CMS","P1","M","code integration"],
  ["NEXT-028","Landing-page experiment library",["Payload","PostHog"],"Brand CMS","P1","M","code integration"],
  ["NEXT-029","Editorial workflow and approval gates",["Payload"],"Brand CMS","P1","S","policy plus config"],
  ["NEXT-030","Marketing DAM and trust asset library",["Payload","Cap"],"Brand CMS","P1","M","code integration"],
  ["NEXT-031","Dub branded link domain plan",["Dub"],"Attribution","P0","S","API/cloud first"],
  ["NEXT-032","Campaign attribution taxonomy",["Dub","PostHog"],"Attribution","P0","S","spec"],
  ["NEXT-033","Referral and creator link pilot",["Dub","Twenty"],"Attribution","P1","M","API integration"],
  ["NEXT-034","Stripe conversion attribution spec",["Dub","Stripe"],"Attribution","P2","M","owner-gated"],
  ["NEXT-035","Partner link operating model",["Dub","Twenty"],"Attribution","P1","S","spec"],
  ["NEXT-036","Dub to PostHog event bridge",["Dub","PostHog"],"Attribution","P1","M","API integration"],
  ["NEXT-037","Onboarding survey layer",["Formbricks"],"Feedback","P0","S","embed/API"],
  ["NEXT-038","Pricing objection survey",["Formbricks","Chatwoot"],"Feedback","P0","S","embed/API"],
  ["NEXT-039","Cancellation and churn survey",["Formbricks","PostHog"],"Feedback","P1","S","embed/API"],
  ["NEXT-040","Customer advisory panel intake",["Formbricks","Twenty"],"Feedback","P1","M","workflow"],
  ["NEXT-041","In-product feedback widget policy",["Formbricks"],"Feedback","P1","S","policy plus config"],
  ["NEXT-042","Feedback to roadmap/build packet flow",["Formbricks","n8n"],"Feedback","P1","M","workflow"],
  ["NEXT-043","Trigger.dev sports data ingestion jobs",["Trigger.dev"],"Autonomous Workers","P0","M","SDK integration"],
  ["NEXT-044","AI report generation worker",["Trigger.dev","Langfuse"],"Autonomous Workers","P0","M","SDK integration"],
  ["NEXT-045","Newsletter/alert compilation worker",["Trigger.dev","listmonk","Novu"],"Autonomous Workers","P1","M","SDK integration"],
  ["NEXT-046","Webhook retry and dead-letter layer",["Trigger.dev"],"Autonomous Workers","P0","M","SDK integration"],
  ["NEXT-047","Background job status UI",["Trigger.dev"],"Autonomous Workers","P1","M","code integration"],
  ["NEXT-048","Idempotency and duplicate-send guard",["Trigger.dev","Novu"],"Autonomous Workers","P0","M","code integration"],
  ["NEXT-049","PRO/ELITE API key issuance model",["Unkey"],"API Product","P1","M","API integration"],
  ["NEXT-050","Rate limit and quota policy",["Unkey"],"API Product","P1","S","spec"],
  ["NEXT-051","API usage dashboard",["Unkey","PostHog"],"API Product","P2","M","API integration"],
  ["NEXT-052","Partner and integration key model",["Unkey","Twenty"],"API Product","P2","M","API integration"],
  ["NEXT-053","API abuse and revocation controls",["Unkey"],"API Product","P1","M","API integration"],
  ["NEXT-054","API docs/playground access gate",["Unkey","Hoppscotch"],"API Product","P2","M","code integration"],
  ["NEXT-055","SigNoz OpenTelemetry baseline",["SigNoz"],"Reliability","P1","M","observability"],
  ["NEXT-056","API latency and error dashboards",["SigNoz"],"Reliability","P1","M","observability"],
  ["NEXT-057","Incident signal and alert map",["SigNoz","Novu"],"Reliability","P1","S","spec"],
  ["NEXT-058","Background job telemetry",["SigNoz","Trigger.dev"],"Reliability","P1","M","observability"],
  ["NEXT-059","AI pipeline trace correlation",["SigNoz","Langfuse"],"Reliability","P2","L","observability"],
  ["NEXT-060","Customer-impact reliability dashboard",["SigNoz","PostHog"],"Reliability","P2","M","observability"]
];

function mdTable(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((r) => `| ${r.map((c) => String(c).replaceAll("\n", " ")).join(" | ")} |`)
  ].join("\n");
}

function write(rel, content) {
  fs.mkdirSync(path.dirname(path.join(out, rel)), { recursive: true });
  fs.writeFileSync(path.join(out, rel), content.trim() + "\n", "utf8");
}

function scoreText(scores) {
  const labels = ["strategic", "speed", "website", "cost", "integration", "security", "maintenance", "revenue"];
  return labels.map((l, i) => `${l}: ${scores[i]}/10`).join(", ");
}

const inventoryHeaders = [
  "repo_id","project_name","canonical_repo","official_site","docs_url","license","stars","forks","latest_release","latest_commit_date","primary_language","category","deployment_model","api_or_integration_surface","data_sensitivity","adoption_mode","legal_risk","security_risk","gse_value_score","go_no_go","notes"
];
const csv = [
  inventoryHeaders.join(","),
  ...repos.map((r) => [
    r.id,r.name,r.url,r.site,r.docs,r.license,r.stars,r.forks,r.release,r.commit,r.language,r.category,r.deployment,r.integration,r.data,r.adoption,r.license.includes("AGPL") || r.license.includes("Sustainable") ? "HIGH" : r.license.includes("enterprise") || r.license.includes("ee") ? "MEDIUM" : "LOW",r.risk,r.scores[0],"GO WITH BOUNDARIES",r.gse
  ].map((v) => `"${String(v).replaceAll('"','""')}"`).join(","))
].join("\n");
fs.writeFileSync(path.join(out, "repo-inventory.csv"), csv + "\n", "utf8");

fs.writeFileSync(path.join(root, "reports", "codex", "oss-next-wave-github-metadata.json"), JSON.stringify({ asOf, note: "GitHub REST API was rate-limited after PostHog, Langfuse, and n8n; remaining repo activity fields are sourced from GitHub HTML/search snapshots and official docs.", repos }, null, 2), "utf8");

write("SOURCE_LEDGER.md", `# Source Ledger

As of: ${asOf}

This file records the primary sources used for the GSE / GSN next-wave repository selection. GitHub REST API verification succeeded for PostHog, Langfuse, and n8n, then unauthenticated API rate limits blocked the rest. For the remaining repos, GitHub HTML pages, raw license files, and official docs were used. Exact star/release counts should be refreshed before public claims.

${repos.map((r) => `## ${r.name}

- Canonical repo: ${r.url}
- Official site: ${r.site}
- Docs: ${r.docs}
- License posture: ${r.license}
- Source links:
${r.sources.map((s) => `  - ${s}`).join("\n")}
`).join("\n")}`);

write("00-next-wave-plan.md", `# GSE / GSN Next-Wave OSS Leverage Plan

As of: ${asOf}

## Mission Interpretation

The first OSS leverage stack covered AI UI, CRM, API testing, screen recording, support, newsletter, design, and document RAG. This second wave fills the missing operating-system layers that make the website intelligent, measurable, autonomous, and commercially aggressive:

- measure every interaction
- automate cross-department work
- observe AI systems
- manage brand/content at engineering quality
- attribute every marketing channel
- collect customer truth continuously
- deliver preference-aware notifications
- run durable background workers
- package future API access
- monitor reliability across web, API, jobs, and AI

## Selected Must-Add Repos

${repos.map((r, i) => `${i + 1}. ${r.name} - ${r.category}`).join("\n")}

## Verification Strategy

- Prefer official GitHub repos, raw license files, and official documentation.
- Treat star/release metadata as time-sensitive and snapshot-only.
- Do not install, clone, run Docker, or connect production data in this control workspace.
- Keep implementation packets ready for Claude in the real shipping clone.

## No-Go Boundaries

- No production deploys.
- No customer data imports.
- No API keys or secrets in docs.
- No AGPL/SUL/custom-license code copied into GSE.
- No self-hosted service launch without backups, auth, observability, and owner approval.
- No public AI or RAG surface connected to founder-only methods.

## Output Files

- SOURCE_LEDGER.md
- 01-repo-verification.md
- repo-inventory.csv
- repos/*.md
- 02-transformation-map.md
- 03-reference-architecture.md
- 04-brand-marketing-operating-system.md
- 05-claude-codex-handoff.md
- 06-final-report.md
- claude-build-packets/*
`);

write("01-repo-verification.md", `# Repo Verification

As of: ${asOf}

${mdTable(["Project","Repo","License","Stars","Forks","Release","Commit Activity","Adoption"], repos.map((r) => [r.name, r.url, r.license, r.stars, r.forks, r.release, r.commit, r.adoption]))}

## Verification Notes

- PostHog, Langfuse, and n8n metadata was pulled through GitHub REST before unauthenticated rate limits.
- Novu, Payload, Dub, Formbricks, Trigger.dev, Unkey, and SigNoz were verified through GitHub HTML pages, raw license files, official docs, and search snapshots.
- Exact star/release counts should be refreshed before publishing externally.
- None of these repos were cloned, installed, or executed.
`);

for (const r of repos) {
  write(`repos/${r.id}.md`, `# ${r.name}

## Project Summary

${r.name} is the candidate ${r.category.toLowerCase()} layer for GSE / GSN.

Canonical repo: ${r.url}  
Official site: ${r.site}  
Docs: ${r.docs}

## What It Replaces

${r.replaces}

## Verified Capabilities

${r.capabilities.map((c) => `- ${c}`).join("\n")}

## Deployment Model

${r.deployment}

## License / Open-Core Risk

${r.license}

Recommended legal posture: ${r.license.includes("AGPL") || r.license.includes("Sustainable") ? "High caution. Use internally or by API/cloud first; do not fork, embed, white-label, or expose modified network service without legal approval." : r.license.includes("enterprise") || r.license.includes("ee") ? "Medium caution. Keep core/enterprise boundaries explicit and avoid copying enterprise code." : "Permissive posture, still preserve notices and review trademarks."}

## Security / Privacy Risk

${r.data}

Primary risk: ${r.risk}

## API / Integration Surface

${r.integration}

## GSE Internal Use Cases

- Founder cockpit inputs and dashboards
- Operations workflow automation
- Research-to-build packet conversion
- Brand/content workflow governance
- Reliability, AI, and marketing instrumentation

## GSE Customer-Facing Use Cases

- Faster onboarding
- Better paid-tier education
- Higher-trust alerts and explanations
- Cleaner feedback and support loops
- More measurable conversion paths

## Sports Intelligence Use Cases

- Instrument sports-data ingestion and alert delivery
- Track which research surfaces create conversions
- Evaluate AI-generated reports with trace/eval evidence
- Monitor autonomous sports-data workers
- Build paid-tier API and alert controls

## Revenue / Monetization Use Cases

- FREE to PRO/ELITE conversion measurement
- Paid-tier notification preference control
- Affiliate and creator attribution
- Enterprise demo and API access packaging
- Churn and pricing-objection capture

## Claude Code Implementation Ideas

- Start with a docs/spec packet in the real shipping clone.
- Add event taxonomy, data-boundary, and rollback docs before package install.
- Prototype against fake data or local fixtures only.
- Gate production keys, real customer data, and public exposure behind owner approval.

## What Not To Do

- Do not copy ${r.name} source into GSE.
- Do not bypass license or enterprise-feature boundaries.
- Do not connect production customer data during prototype.
- Do not launch public surfaces before privacy, auth, and rollback review.

## Recommended Adoption Mode

${r.adoption}

## Final Score

${scoreText(r.scores)}

## Sources

${r.sources.map((s) => `- ${s}`).join("\n")}
`);
}

write("02-transformation-map.md", `# GSE / GSN Transformation Map

As of: ${asOf}

## Layer 1 - Website Intelligence

${mdTable(["Need","Repo","First Build","Why It Matters"], [
  ["Know what converts","PostHog","NEXT-001 to NEXT-006","Turns design and marketing into measured learning loops"],
  ["Publish fast without losing engineering control","Payload","NEXT-025 to NEXT-030","Lets brand, reports, trust pages, and explainers ship with versioned models"],
  ["Attribute campaigns and partners","Dub","NEXT-031 to NEXT-036","Gives every creator, affiliate, ad, article, and enterprise link a measurable path"],
  ["Ask users at the right moments","Formbricks","NEXT-037 to NEXT-042","Captures objections, confusion, churn risk, and testimonial opportunities"]
])}

## Layer 2 - Autonomous Operating System

${mdTable(["Need","Repo","First Build","Why It Matters"], [
  ["Durable workers","Trigger.dev","NEXT-043 to NEXT-048","Runs sports ingestion, reports, alerts, and retries outside fragile request paths"],
  ["Cross-tool automation","n8n","NEXT-013 to NEXT-018","Connects support, CRM, newsletter, analytics, and build queues"],
  ["Notification intelligence","Novu","NEXT-019 to NEXT-024","Moves GSE from generic emails to preference-aware, multi-channel customer conversations"],
  ["API product control","Unkey","NEXT-049 to NEXT-054","Enables PRO/ELITE/partner API keys, quotas, and usage-based product surfaces"]
])}

## Layer 3 - Trust, Forecasting, And Control

${mdTable(["Need","Repo","First Build","Why It Matters"], [
  ["AI traceability","Langfuse","NEXT-007 to NEXT-012","Makes AI outputs auditable, evaluable, and cost-aware"],
  ["Platform observability","SigNoz","NEXT-055 to NEXT-060","Keeps autonomous systems observable enough to trust"],
  ["Closed-loop growth learning","PostHog + Dub + Formbricks","NEXT-006, NEXT-036, NEXT-042","Connects traffic, behavior, feedback, and revenue decisions"],
  ["Founder cockpit","All","NEXT-017, NEXT-060","Combines marketing, product, AI, ops, and reliability into one command surface"]
])}
`);

write("03-reference-architecture.md", `# Reference Architecture

As of: ${asOf}

## Architecture A - Fastest Safe Website Upgrade

Services: PostHog, Payload, Dub cloud/API, Formbricks cloud/API.  
Excluded: n8n self-host, SigNoz self-host, Unkey self-host, public AI.  
Goal: make the public website measurable, editable, attributable, and feedback-driven.

First path:

1. Define event taxonomy and privacy policy.
2. Add analytics and campaign attribution only in the real app clone.
3. Add CMS schema/spec before installing Payload.
4. Add feedback widgets only on low-risk pages.

## Architecture B - Autonomous Worker Backbone

Services: Trigger.dev, Langfuse, Novu, PostHog.  
Goal: run ingestion, report, alert, and AI tasks with retries, traceability, and preference-aware delivery.

Boundaries:

- every job must be idempotent
- every AI call must be traceable and redactable
- every outbound notification must respect preferences
- every paid-tier action must be auditable

## Architecture C - Founder-Only Command Plane

Services: n8n isolated, Langfuse, SigNoz, PostHog, existing AnythingLLM/Chatwoot/Twenty/listmonk stack.  
Goal: private operating dashboard that turns support, analytics, research, incidents, and marketing into build cards.

No-go:

- no founder-only methods in customer RAG
- no external client credentials in n8n
- no production customer data until access controls exist

## Architecture D - Productized API And Partner Layer

Services: Unkey, Dub, PostHog, Hoppscotch, Trigger.dev.  
Goal: package GSE intelligence into controlled API keys, partner links, usage dashboards, and API playgrounds.

## Architecture E - Full Self-Hosted Stack

Only after the above prove value. This includes more maintenance: Postgres/MySQL/ClickHouse/Redis/blob storage/SMTP/provider credentials/backup/restore/observability. Do not run full-stack self-hosting from this control workspace.
`);

write("04-brand-marketing-operating-system.md", `# Brand And Marketing Operating System

As of: ${asOf}

## Principle

GSE's brand layer should behave like a product system, not a collection of pages. Every page, CTA, report, article, alert, and partner link should be measured, attributed, tested, and connected to customer learning.

## Must-Have Loops

1. Content model: Payload owns page/report/explainer structures.
2. Campaign spine: Dub owns every campaign, creator, partner, and enterprise link.
3. Behavior layer: PostHog owns events, cohorts, funnels, experiments, and replays with strict redaction.
4. Feedback layer: Formbricks asks the right question at the right moment.
5. Notification layer: Novu delivers preference-aware alerts and lifecycle messages.
6. Worker layer: Trigger.dev runs report, alert, and follow-up jobs.
7. AI QA layer: Langfuse scores and traces AI-generated content.
8. Reliability layer: SigNoz proves the system works under load.

## First-Of-Kind Website Ideas

- Living trust surfaces that show source freshness, model confidence bands, and methodology boundaries.
- Personalized learning paths for FREE, PRO, and ELITE visitors based on behavior and stated intent.
- Paid-tier education that adapts when users hesitate, object, or revisit pricing.
- Alert preference center that explains why each alert exists and how it maps to value.
- Creator/affiliate pages where every partner link is measured and quality-scored.
- "What changed since your last visit" dashboard for returning users.
- Founder-only command center that converts site behavior into build priorities.

## Brand Safety

- Do not expose founder-only methods.
- Do not overstate sports outcomes.
- Do not log sensitive session replay fields.
- Do not treat AI output as proof without citation/eval.
- Do not let marketing experiments alter billing, odds, or legal copy without review.
`);

write("05-claude-codex-handoff.md", `# Claude / Codex Handoff

As of: ${asOf}

## Current Workspace Reality

This folder behaves as a Galaxy control/docs lane, not a clean app source checkout. Git resolves upward to the user profile. The apps folder in this workspace did not expose normal app files during this run. Therefore, this mission produced research, architecture, and Claude-ready build packets instead of production code edits.

## How Claude Should Use This

1. Work in the real Galaxy/GSE shipping clone, not this control folder unless the task is docs-only.
2. Open the relevant packet under claude-build-packets/packets.
3. Execute exactly one packet at a time.
4. Before installing any dependency, verify the app framework, package manager, branch, dirty state, and existing patterns.
5. Use fake data first.
6. Stop before production env writes, customer data imports, live notifications, billing flows, or public AI surfaces.

## Recommended First Five Claude Tasks

- NEXT-001: PostHog privacy-first web analytics baseline
- NEXT-002: GSE event taxonomy for FREE/PRO/ELITE
- NEXT-005: Session replay redaction policy and kill switch
- NEXT-025: Payload marketing CMS schema
- NEXT-043: Trigger.dev sports data ingestion jobs

## Prompt Template

Use the packet's Claude Code Prompt section. Do not merge multiple packets into one task unless the packet says it is a dependency.
`);

write("06-final-report.md", `# Final Report - Next-Wave OSS Leverage Stack

As of: ${asOf}

## Executive Summary

The next ten must-add repositories for GSE are PostHog, Langfuse, n8n, Novu, Payload, Dub, Formbricks, Trigger.dev, Unkey, and SigNoz. Together they turn the website into a measured, autonomous, feedback-rich, AI-observable, brand-forward operating system.

The highest-confidence immediate moves are:

1. PostHog for privacy-first measurement and conversion intelligence.
2. Payload for a code-first branded marketing/content system.
3. Trigger.dev for durable autonomous jobs.
4. Langfuse for AI traceability and evals.
5. Dub and Formbricks for attribution plus customer truth.

## The Ten Must-Have Repos

${mdTable(["Rank","Repo","Why GSE Needs It","Adoption"], repos.map((r, i) => [i + 1, r.name, r.gse, r.adoption]))}

## Best Immediate Architecture

Start with Architecture A: Fastest Safe Website Upgrade. Add PostHog event taxonomy, Payload schema planning, Dub campaign taxonomy, and Formbricks feedback moments. In parallel, design Architecture B for autonomous workers using Trigger.dev, Langfuse, and Novu.

## Do Not Do Yet

- Do not self-host n8n, Dub, SigNoz, PostHog, or Unkey in production before backup/restore/security review.
- Do not add AGPL or SUL code into GSE.
- Do not expose public AI over founder-only corpora.
- Do not run live notifications or production analytics without privacy review.
- Do not connect Stripe, Vercel production env, or customer data from this workspace.

## Top 20 Build Packets

${packets.slice(0, 20).map(([id,title,repos,cat,priority]) => `- ${id}: ${title} (${cat}, ${priority}, repos: ${repos.join(", ")})`).join("\n")}

## Highest-Upside Ideas

- Website becomes a learning organism: every CTA, article, alert, and support question feeds a decision loop.
- Paid-tier onboarding becomes adaptive, driven by behavior, survey answers, and lifecycle events.
- Sports intelligence reports become background jobs with AI evals, citations, and delivery traceability.
- API access becomes a monetizable surface with keys, quotas, docs, and partner analytics.
- Founder cockpit sees conversion, churn, AI quality, incidents, and build-card opportunities in one place.

## Human Approval Needed

- Legal review for AGPL, SUL, open-core, and any fork/modified network service.
- Production analytics/tracking privacy approval.
- Customer data import approval.
- SMTP/SMS/push provider approval.
- Public AI/RAG approval.
- Any billing, Stripe, or production deploy approval.

## Files Created

- SOURCE_LEDGER.md
- 00-next-wave-plan.md
- 01-repo-verification.md
- repo-inventory.csv
- repos/*.md
- 02-transformation-map.md
- 03-reference-architecture.md
- 04-brand-marketing-operating-system.md
- 05-claude-codex-handoff.md
- claude-build-packets/index.md
- claude-build-packets/build-packets.jsonl
- claude-build-packets/packets/NEXT-001.md through NEXT-060.md
`);

const packetRows = packets.map(([id,title,repos,category,priority,difficulty,mode]) => ({ id, title, repos, category, priority, difficulty, integration_mode: mode, gse_surface: category, internal_value: 5, customer_value: category === "Reliability" ? 3 : 4, revenue_value: ["Measurement","Attribution","Lifecycle","API Product","Brand CMS"].includes(category) ? 5 : 4, cost_savings_value: 4, speed_value: priority === "P0" ? 5 : 4, security_risk: ["n8n","Unkey","SigNoz","Langfuse"].some((x) => repos.includes(x)) ? "MEDIUM" : "LOW", license_risk: repos.some((x) => ["n8n","Dub","Formbricks","Unkey"].includes(x)) ? "HIGH" : "MEDIUM", maintenance_risk: difficulty === "L" ? "HIGH" : "MEDIUM", dependencies: [], claude_prompt_file: `claude-build-packets/packets/${id}.md`, notes: "Use fake data first; owner approval required before production data, secrets, or public launch." }));
write("claude-build-packets/build-packets.jsonl", packetRows.map((p) => JSON.stringify(p)).join("\n"));

write("claude-build-packets/index.md", `# Claude Build Packets

As of: ${asOf}

Generated ${packets.length} packets. Execute one packet at a time in the real GSE shipping clone.

${mdTable(["ID","Title","Repos","Category","Priority","Difficulty","Mode"], packets.map(([id,title,repos,category,priority,difficulty,mode]) => [id,title,repos.join("; "),category,priority,difficulty,mode]))}
`);

for (const [id,title,repoNames,category,priority,difficulty,mode] of packets) {
  const repoDetails = repoNames.map((n) => repos.find((r) => r.name === n || r.id === n.toLowerCase() || r.repo.toLowerCase().includes(String(n).toLowerCase().replace(".","")))).filter(Boolean);
  const licenseBoundary = repoDetails.length ? repoDetails.map((r) => `${r.name}: ${r.license}`).join("; ") : "Uses existing GSE or previously researched stack; verify license before implementation.";
  write(`claude-build-packets/packets/${id}.md`, `# ${id}: ${title}

## Repo(s)

${repoNames.join(", ")}

## Category

${category}

## Goal

Implement or design the ${title.toLowerCase()} capability for GSE / GSN without touching production data first.

## Why It Matters

This increases GSE's ability to operate autonomously, learn from users, improve conversion, reduce SaaS cost, and make product/marketing decisions from evidence.

## GSE / GSN Fit

Fits the website and operating-system layer as a ${category.toLowerCase()} upgrade.

## User-Facing Value

Customers get a clearer, faster, more personalized, more trustworthy product experience.

## Founder/Internal Value

The team gets measurable workflows, fewer manual steps, better observability, and clearer build priorities.

## SaaS Replaced Or Reduced

See repo deep dive files for the specific SaaS category.

## Legal / License Boundary

${licenseBoundary}

Do not copy source code from these repos into GSE. Prefer API integration, SDK use under package license, or pattern/spec adoption unless legal approval exists.

## Security Boundary

Use fake data first. Do not paste secrets. Do not connect production customer data. Do not emit live notifications, billing events, or public AI output without owner approval.

## Repo Context

Likely real app clone files: package manifest, app routes, API routes, analytics layer, event taxonomy docs, tests, environment examples. Avoid production env files, billing code, launch gates, and unrelated schema changes unless this packet explicitly requires them.

## Integration Mode

${mode}

## Implementation Plan

1. Verify the real GSE repo root, branch, dirty state, package manager, and app framework.
2. Read existing analytics, jobs, API, auth, and env patterns.
3. Add a narrow design/spec document first if no local pattern exists.
4. Implement with fake data or disabled-by-default flags.
5. Add tests or validation checks around event shape, privacy gates, failure paths, and rollback.
6. Document required production environment variables by name only, never values.

## Testing Plan

- Unit or integration test for event/job/API behavior where applicable.
- Typecheck/lint/build command from the real repo.
- No secret-pattern matches in changed files.
- Verify feature stays disabled or fake-data-only until approved.

## Acceptance Criteria

- Clear implementation or spec exists.
- No secrets committed.
- No production data touched.
- Rollback path documented.
- Owner approval gates are explicit.

## Rollback Plan

Remove the feature flag, integration config, route/component, and docs for this packet only. Leave unrelated files untouched.

## Estimated Difficulty

${difficulty}

## Priority

${priority}

## Claude Code Prompt

You are Claude Code working in the real Galaxy Sports Edge / GSE shipping clone. Execute only ${id}: ${title}. First verify repo root, branch, dirty state, package manager, scripts, and existing patterns. Do not use production data or secrets. Do not deploy. Do not copy source code from external repos. Implement the smallest safe version using fake data or a disabled-by-default flag, add tests/validation, document required env var names only, run the repo's relevant checks, and report exact files changed plus any owner approvals needed.
`);
}

console.log(`Generated ${repos.length} repo files and ${packets.length} build packets in ${out}`);

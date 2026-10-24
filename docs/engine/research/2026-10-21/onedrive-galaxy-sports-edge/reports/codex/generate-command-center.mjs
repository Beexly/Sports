import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..", "..");
const out = path.join(root, "docs", "command-center");
const cardsDir = path.join(out, "build-queue", "cards");
const asOf = "2026-06-09";

function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function write(rel, body) {
  const file = path.join(out, rel);
  mkdirp(path.dirname(file));
  fs.writeFileSync(file, body.trimStart() + "\n", "utf8");
}

function writeRoot(rel, body) {
  const file = path.join(root, rel);
  mkdirp(path.dirname(file));
  fs.writeFileSync(file, body.trimStart() + "\n", "utf8");
}

function esc(value) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csv(headers, rows) {
  return [headers.join(","), ...rows.map((row) => headers.map((h) => esc(row[h])).join(","))].join("\n");
}

function table(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map((v) => String(v ?? "").replace(/\n/g, "<br>")).join(" | ")} |`),
  ].join("\n");
}

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 92);
}

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if ([".git", "node_modules", ".next", "dist", "build", "docs/command-center"].includes(ent.name)) continue;
    const file = path.join(dir, ent.name);
    const rel = path.relative(root, file).replace(/\\/g, "/");
    if (rel.startsWith("docs/command-center/")) continue;
    if (ent.isDirectory()) walk(file, acc);
    else acc.push(file);
  }
  return acc;
}

function readMaybe(file, max = 12000) {
  try {
    return fs.readFileSync(file, "utf8").slice(0, max);
  } catch {
    return "";
  }
}

function firstHeading(file) {
  const text = readMaybe(file, 3000);
  const line = text.split(/\r?\n/).find((l) => /^#\s+/.test(l));
  return line ? line.replace(/^#\s+/, "").trim() : path.basename(file);
}

function inferTopic(rel) {
  const lower = rel.toLowerCase();
  const pairs = [
    ["roster", "NFL data accuracy / roster truth"],
    ["site-war-room", "Website / UX / Visual Design"],
    ["help-education", "Customer Support / Customer Success"],
    ["growth-os", "Growth / Monetization"],
    ["edgeball", "Community / Engagement / Retention"],
    ["contest", "Community / Engagement / Retention"],
    ["oss", "AI Automation / Agents"],
    ["pricing", "Growth / Monetization"],
    ["promotion", "Promotions / Affiliate Partnerships"],
    ["affiliate", "Promotions / Affiliate Partnerships"],
    ["analytics", "Analytics / Experimentation"],
    ["support", "Customer Support / Customer Success"],
    ["content", "Content / SEO / Editorial"],
    ["brand", "Brand Voice / Human Copy"],
    ["security", "Infrastructure / DevOps / Security"],
    ["risk", "Legal / Compliance / Responsible Gambling"],
  ];
  return pairs.find(([k]) => lower.includes(k))?.[1] ?? "Operations / Founder Cockpit";
}

function inferType(rel) {
  const lower = rel.toLowerCase();
  if (lower.includes("/cards/") && lower.endsWith(".md")) return "build-card";
  if (lower.endsWith("build-queue.jsonl") || lower.includes("build-packets.jsonl")) return "build-queue";
  if (lower.includes("/research/")) return "research-doc";
  if (lower.includes("/reports/") && lower.endsWith(".mjs")) return "safe-script";
  if (lower.includes("/logs/") || lower.includes("_logs/")) return "log/snapshot";
  if (lower.endsWith(".csv")) return "ledger/csv";
  if (lower.endsWith(".json") || lower.endsWith(".jsonl")) return "structured-data";
  return path.extname(rel).replace(".", "") || "file";
}

function recommendedAction(rel, type) {
  if (rel.includes("docs/research/site-war-room")) return "extend";
  if (rel.includes("docs/research/help-education-ux")) return "extend";
  if (rel.includes("docs/research/nfl-roster-truth")) return "extend";
  if (rel.includes("docs/research/growth-os-v2")) return "merge";
  if (rel.includes("docs/research/oss-")) return "review";
  if (rel.includes("docs/research/contest") || rel.includes("docs/research/edgeball")) return "review";
  if (type === "safe-script") return "keep";
  if (type === "log/snapshot") return "keep";
  return "review";
}

const visibleFiles = [
  ...walk(path.join(root, "docs")),
  ...walk(path.join(root, "reports")),
  ...walk(path.join(root, "apps")),
  ...walk(path.join(root, "_logs")),
].filter((file, idx, arr) => arr.indexOf(file) === idx);

const artifactRows = visibleFiles.map((file, i) => {
  const rel = path.relative(root, file).replace(/\\/g, "/");
  const type = inferType(rel);
  const topic = inferTopic(rel);
  return {
    artifact_id: `ART-${String(i + 1).padStart(4, "0")}`,
    file_path: rel,
    type,
    title: firstHeading(file),
    topic,
    owner: rel.includes("reports/codex") || rel.includes("docs/research") ? "Codex/unknown" : "unknown",
    current_status: type === "safe-script" ? "tooling" : type === "log/snapshot" ? "snapshot" : "research/planned/unverified",
    launch_relevance: ["NFL data accuracy / roster truth", "Website / UX / Visual Design", "Growth / Monetization", "Customer Support / Customer Success"].includes(topic) ? "HIGH" : "MEDIUM",
    related_department: topic,
    related_route_surface: rel.includes("site-war-room") ? "public website surfaces" : rel.includes("roster") ? "players/rating/player-lab" : "cross-functional",
    duplicate_risk: rel.includes("build-queue") || rel.includes("/cards/") ? "MEDIUM" : "LOW",
    recommended_action: recommendedAction(rel, type),
  };
});

const buildRows = artifactRows.filter((r) => r.type === "build-card" || r.type === "build-queue").map((r, i) => ({
  existing_id: `EXISTING-BUILD-${String(i + 1).padStart(4, "0")}`,
  source_file: r.file_path,
  title: r.title,
  category: r.topic,
  status: "planned/research-only unless proven in shipping clone",
  duplicate_risk_notes: r.type === "build-card" ? "Do not recreate; use as parent/extension." : "Queue must be consolidated before execution.",
  normalized_fingerprint: `${r.topic} ${r.title} ${r.related_route_surface}`.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(),
}));

const researchRows = artifactRows.filter((r) => r.type === "research-doc").map((r) => ({
  file_path: r.file_path,
  title: r.title,
  topic: r.topic,
  status: "research/planned",
  action: r.recommended_action,
}));

const codeRows = artifactRows.filter((r) => r.type === "safe-script").map((r) => ({
  file_path: r.file_path,
  type: "safe generated tooling",
  purpose: r.title,
  risk: "LOW if run locally against docs only",
  action: "keep/review before reuse",
}));

const routes = [
  ["/", "homepage", "UNKNOWN in this workspace", "P0", "Website / UX / Visual Design"],
  ["/intelligence", "sports intelligence landing", "UNKNOWN in this workspace", "P0", "Product Strategy"],
  ["/intelligence/rating", "GSE Rating", "UNKNOWN in this workspace", "P0", "GSE Rating / Sports Intelligence"],
  ["/players", "player discovery", "UNKNOWN in this workspace", "P0", "NFL Data Accuracy / Roster Truth"],
  ["/player-lab", "Player Lab", "UNKNOWN in this workspace", "P0", "GSE Rating / Sports Intelligence"],
  ["/teams", "team pages", "UNKNOWN in this workspace", "P1", "NFL Data Accuracy / Roster Truth"],
  ["/track-record", "receipts/performance", "UNKNOWN in this workspace", "P0", "Product Strategy"],
  ["/pricing", "FREE/PRO/ELITE conversion", "UNKNOWN in this workspace", "P0", "Growth / Monetization"],
  ["/promotions", "partner/promotions shell", "LEGAL-GATED/UNKNOWN", "P1", "Promotions / Affiliate Partnerships"],
  ["/brief", "Daily Brief/content", "UNKNOWN in this workspace", "P1", "Content / SEO / Editorial"],
  ["/support", "help/support", "UNKNOWN in this workspace", "P1", "Customer Support / Customer Success"],
  ["/account", "account/billing/preferences", "UNKNOWN in this workspace", "P1", "Infrastructure / DevOps / Security"],
  ["/cockpit", "founder/admin", "UNKNOWN/private", "P1", "Operations / Founder Cockpit"],
];

const departments = [
  ["executive-founder-command", "Executive / Founder Command", "Owns final go/no-go, approvals, priorities, and founder-only boundaries.", ["CMD-001","CMD-002","CMD-083"]],
  ["product-strategy", "Product Strategy", "Owns product clarity, surface priority, GSE Rating/Player Lab direction, and simplification.", ["CMD-008","CMD-017","CMD-018"]],
  ["website-ux-visual-design", "Website / UX / Visual Design", "Owns premium interface, 10-second comprehension, mobile, accessibility, and visual QA.", ["CMD-009","CMD-010","CMD-011"]],
  ["nfl-data-accuracy-roster-truth", "NFL Data Accuracy / Roster Truth", "Owns roster truth, canaries, source freshness, and stale data launch gates.", ["CMD-003","CMD-004","CMD-005"]],
  ["data-engineering", "Data Engineering", "Owns source ingestion, IDs, freshness, validation, and recoverable data pipelines.", ["CMD-006","CMD-007","CMD-029"]],
  ["gse-rating-sports-intelligence", "GSE Rating / Sports Intelligence", "Owns reveal-less intelligence presentation, confidence, no-bet, and Player Lab value.", ["CMD-017","CMD-018","CMD-019"]],
  ["growth-monetization", "Growth / Monetization", "Owns FREE/PRO/ELITE conversion, pricing clarity, checkout readiness, and revenue tests.", ["CMD-036","CMD-037","CMD-038"]],
  ["promotions-affiliate-partnerships", "Promotions / Affiliate Partnerships", "Owns gated partner revenue, disclosures, tracking, and legal approvals.", ["CMD-039","CMD-040","CMD-041"]],
  ["customer-support-success", "Customer Support / Customer Success", "Owns support entry points, help center, onboarding rescue, and retention support.", ["CMD-030","CMD-031","CMD-032"]],
  ["content-seo-editorial", "Content / SEO / Editorial", "Owns Daily Brief, articles, player/team pages, glossary, source citations, and refresh cadence.", ["CMD-042","CMD-043","CMD-044"]],
  ["brand-voice-human-copy", "Brand Voice / Human Copy", "Owns human copy, no fake certainty, method-safe language, and CTA clarity.", ["CMD-033","CMD-034","CMD-035"]],
  ["analytics-experimentation", "Analytics / Experimentation", "Owns event contracts, funnels, dashboards, experiments, and privacy-safe measurement.", ["CMD-045","CMD-046","CMD-047"]],
  ["infrastructure-devops-security", "Infrastructure / DevOps / Security", "Owns CI, deployment gates, secrets, auth/admin controls, rollback, and security posture.", ["CMD-048","CMD-049","CMD-050"]],
  ["qa-testing-release", "QA / Testing / Release", "Owns typecheck/lint/build/route/mobile/accessibility/performance release gates.", ["CMD-051","CMD-052","CMD-053"]],
  ["finance-unit-economics", "Finance / Unit Economics", "Owns revenue dashboards, CAC/LTV/ARPU/churn, affiliate payout tracking, and forecasts.", ["CMD-054","CMD-055","CMD-056"]],
  ["sales-partnerships-enterprise", "Sales / Partnerships / Enterprise", "Owns partner pipeline, enterprise packaging, creators, sponsors, and investor/advisor readiness.", ["CMD-057","CMD-058","CMD-059"]],
  ["ai-automation-agents", "AI Automation / Agents", "Owns internal agents, safe workflows, build queue automation, and leakage boundaries.", ["CMD-060","CMD-061","CMD-062"]],
  ["legal-compliance-responsible-gambling", "Legal / Compliance / Responsible Gambling", "Owns disclaimers, promotions, contest constraints, privacy, and responsible gambling boundaries.", ["CMD-063","CMD-064","CMD-065"]],
  ["operations-founder-cockpit", "Operations / Founder Cockpit", "Owns operating cadence, decision logs, launch dashboard, and department coordination.", ["CMD-066","CMD-067","CMD-068"]],
  ["community-engagement-retention", "Community / Engagement / Retention", "Owns watchlists, alerts, EdgeBall, community loops, and lifecycle systems.", ["CMD-069","CMD-070","CMD-071"]],
];

const trainingRoles = [
  ["executive-commander", "Executive Commander", "Sets priorities, protects scope, and makes go/no-go decisions."],
  ["product-strategist", "Product Strategist", "Turns GSE strategy into shippable product surfaces."],
  ["website-designer", "Website Designer", "Creates premium sports-native visual systems and route layouts."],
  ["ux-reviewer", "UX Reviewer", "Audits 10-second comprehension, mobile, accessibility, and conversion clarity."],
  ["frontend-builder", "Frontend Builder", "Implements route and component changes safely in the real app clone."],
  ["data-engineer", "Data Engineer", "Builds and validates ingestion, IDs, freshness, and data contracts."],
  ["roster-truth-analyst", "Roster Truth Analyst", "Verifies NFL roster/team/status truth and canaries."],
  ["gse-rating-analyst", "GSE Rating Analyst", "Reviews public-safe GSE Rating presentation and value."],
  ["source-integrity-analyst", "Source Integrity Analyst", "Owns source hierarchy, freshness, conflicts, and citations."],
  ["growth-operator", "Growth Operator", "Runs conversion, activation, retention, and funnel work."],
  ["monetization-analyst", "Monetization Analyst", "Maps FREE/PRO/ELITE, checkout, revenue experiments, and unit economics."],
  ["promotions-affiliate-operator", "Promotions Affiliate Operator", "Builds partner systems without live links until approved."],
  ["customer-support-agent", "Customer Support Agent", "Handles support categories, templates, bug intake, and escalation."],
  ["customer-success-agent", "Customer Success Agent", "Owns onboarding, retention, rescue flows, and customer education."],
  ["content-editor", "Content Editor", "Creates Daily Brief, articles, glossary, and editorial standards."],
  ["seo-operator", "SEO Operator", "Owns metadata, content templates, player/team pages, and search discovery."],
  ["brand-voice-auditor", "Brand Voice Auditor", "Removes robotic copy, fake certainty, hype, and method leakage."],
  ["analytics-engineer", "Analytics Engineer", "Implements privacy-safe events, dashboards, and experiment reads."],
  ["devops-security-operator", "DevOps Security Operator", "Owns CI, secrets, auth gates, deploys, rollback, and headers."],
  ["qa-release-tester", "QA Release Tester", "Runs release gates and blocks unverified launch claims."],
  ["finance-operator", "Finance Operator", "Tracks revenue, costs, payouts, CAC/LTV, churn, and forecasts."],
  ["sales-partnership-operator", "Sales Partnership Operator", "Owns B2B, partners, creators, sponsors, and enterprise pipeline."],
  ["ai-automation-operator", "AI Automation Operator", "Runs safe agents, build queues, summaries, and leakage checks."],
  ["legal-compliance-reviewer", "Legal Compliance Reviewer", "Reviews privacy, promotions, responsible gambling, contests, and claims."],
  ["community-retention-operator", "Community Retention Operator", "Owns community loops, EdgeBall, alerts, watchlists, and winback."],
  ["claude-handoff-specialist", "Claude Handoff Specialist", "Packages final tasks for Claude and verifies Claude's claims."],
];

const surfaces = [
  ["homepage", "/", "GRAY", "No route source or screenshot visible in this workspace.", "Find real app clone and run screenshots.", "Website / UX / Visual Design"],
  ["GSE Rating", "/intelligence/rating", "GRAY", "Research/build cards exist; implementation unknown.", "Verify route and data dependency.", "GSE Rating / Sports Intelligence"],
  ["players", "/players", "RED", "Roster canaries are known concern and app data cannot be verified here.", "Run current source-backed roster canary test.", "NFL Data Accuracy / Roster Truth"],
  ["Player Lab", "/player-lab", "GRAY", "Research exists; route source unknown.", "Verify route, current-team labels, watchlist/compare.", "GSE Rating / Sports Intelligence"],
  ["Track Record", "/track-record", "GRAY", "Trust/receipt docs exist; implementation unknown.", "Verify receipts and autopsy data.", "Product Strategy"],
  ["pricing", "/pricing", "GRAY", "Pricing research exists; live checkout and Stripe not verified here.", "Verify pricing display and checkout after approval.", "Growth / Monetization"],
  ["promotions", "/promotions", "YELLOW", "Research exists but live links must remain blocked.", "Build shell only until legal/founder approval.", "Promotions / Affiliate Partnerships"],
  ["brief/content", "/brief/articles", "GRAY", "Content systems planned; route source unknown.", "Verify article templates and Daily Brief.", "Content / SEO / Editorial"],
  ["support/help", "/support", "YELLOW", "Help education packet exists; implementation unknown.", "Build launch support minimum.", "Customer Support / Customer Success"],
  ["account/auth", "/account", "GRAY", "No auth source visible.", "Verify auth, billing, preferences, cancellation.", "Infrastructure / DevOps / Security"],
  ["cockpit/admin", "/cockpit", "GRAY", "Founder cockpit planned; gate unknown.", "Verify admin auth and method boundaries.", "Operations / Founder Cockpit"],
  ["mobile states", "all", "GRAY", "No screenshots or app route source.", "Capture mobile screenshots in real clone.", "Website / UX / Visual Design"],
  ["empty/error/loading", "all", "GRAY", "Build cards exist; implementation unknown.", "Verify all state components.", "QA / Testing / Release"],
];

const blockers = [
  ["Real shipping clone not located", "BLOCKER", "This workspace has no package.json/app/pages/components/lib/prisma.", "all product surfaces", "CRITICAL", "Executive / Founder Command", "Locate real app clone and rerun audit.", "repo root + package scripts + route tree proof", "none"],
  ["Roster canaries unverified in app data", "BLOCKER", "Najee/Rico stale-team examples cannot be checked against app data here.", "players/rating/player-lab", "CRITICAL", "NFL Data Accuracy / Roster Truth", "Run source-backed roster validation in real clone.", "canary test with official/current sources", "none"],
  ["No runtime route screenshots", "MUST-FIX", "No dev server or app source visible.", "website", "HIGH", "Website / UX / Visual Design", "Capture desktop/mobile screenshots after clone is found.", "before/after screenshot set", "none"],
  ["No typecheck/lint/build evidence", "BLOCKER", "No package scripts visible.", "release", "CRITICAL", "QA / Testing / Release", "Run app test suite in real clone.", "typecheck/lint/build/test logs", "none"],
  ["Promotions cannot launch without approval", "BLOCKER", "Sportsbook/casino/DFS/fantasy partner links need legal/founder approval.", "promotions", "CRITICAL", "Legal / Compliance / Responsible Gambling", "Keep shell disabled until approval.", "live-link scan passes", "legal/founder"],
  ["Founder-method leakage unknown", "MUST-FIX", "No route source to scan for formulas/source weights.", "public intelligence", "HIGH", "Legal / Compliance / Responsible Gambling", "Run method leakage scanner in real clone.", "0 public leakage findings", "founder"],
  ["Analytics implementation unknown", "MUST-HAVE", "Event taxonomies exist, but implementation not verified.", "all funnels", "MEDIUM", "Analytics / Experimentation", "Implement privacy-safe launch minimum.", "events fire in dev/staging", "privacy review for sensitive events"],
  ["Support minimum not proven live", "MUST-HAVE", "Help docs exist but route/source unknown.", "support/onboarding", "MEDIUM", "Customer Support / Customer Success", "Verify support entry, help center, escalation.", "support scenario test", "none"],
];

const readinessAreas = [
  ["repo/app source", "RED", 10, "No runnable app tree in this workspace.", "Locate real shipping clone."],
  ["data/roster truth", "RED", 20, "P0 canaries cannot be checked in app data here.", "Run roster canary gate against current source-backed data."],
  ["website/design", "GRAY", 35, "Strong research and build packets; no screenshots/source.", "Run real route screenshot QA."],
  ["GSE Rating/Player Lab", "GRAY", 30, "Research exists; implementation unknown.", "Verify routes and data dependencies."],
  ["monetization/pricing", "GRAY", 35, "Pricing research exists; checkout unverified.", "Verify display and Stripe only with approved keys."],
  ["promotions/affiliate", "YELLOW", 45, "Strong safe research; live launch legally gated.", "Keep shell-only until approval."],
  ["support/success", "YELLOW", 50, "Help packet exists; implementation unknown.", "Build support minimum in real clone."],
  ["content/SEO/brand", "YELLOW", 50, "Research and voice rules exist; live pages unknown.", "Audit content routes and rewrite public copy."],
  ["analytics/finance", "GRAY", 35, "Event plans exist; implementation unknown.", "Implement launch minimum events and dashboard."],
  ["infra/security/QA", "RED", 15, "No scripts/tests/build visible.", "Run release gates in real clone."],
  ["agent/ops model", "GREEN", 80, "Command center package creates operating structure.", "Adopt cadence and update status."],
];

const baseOpportunities = [
  ["OPP-L-001","launch","Locate real shipping clone","A single source-of-truth repo locator and proof block.","Prevents false readiness.","RED","Executive / Founder Command","P0","CMD-001"],
  ["OPP-L-002","launch","Roster canary gate","Najee/Rico plus moving-player canaries block launch if stale.","Protects trust.","RED","NFL Data Accuracy / Roster Truth","P0","CMD-003"],
  ["OPP-L-003","launch","Official roster source hierarchy","Official team/NFL source policy before public team labels.","Prevents stale data.","RED","NFL Data Accuracy / Roster Truth","P0","CMD-004"],
  ["OPP-L-004","launch","Player current-team badge","Every player surface shows freshness and team source state.","Reduces confusion.","RED","Website / UX / Visual Design","P0","CMD-005"],
  ["OPP-L-005","launch","Data stale warning pattern","Public warning when data freshness fails.","Protects trust.","YELLOW","GSE Rating / Sports Intelligence","P0","CMD-006"],
  ["OPP-L-006","launch","Homepage 10-second proof","Homepage immediately says what GSE is and why it matters.","Improves activation.","YELLOW","Website / UX / Visual Design","P0","CMD-009"],
  ["OPP-L-007","launch","Raw JSON kill switch","No normal user sees raw JSON first.","Improves comprehension.","YELLOW","Website / UX / Visual Design","P0","CMD-010"],
  ["OPP-L-008","launch","Mobile readability gate","Mobile route screenshots with text/overflow checks.","Prevents weak launch UX.","GRAY","QA / Testing / Release","P0","CMD-052"],
  ["OPP-L-009","launch","GSE Rating explain drawer","Public-safe explanation without recipe leakage.","Improves trust and protects IP.","YELLOW","GSE Rating / Sports Intelligence","P0","CMD-017"],
  ["OPP-L-010","launch","Player Lab guided tour","Teach the complex workspace in under a minute.","Improves product value.","YELLOW","Customer Support / Customer Success","P0","CMD-031"],
  ["OPP-L-011","launch","Track Record receipt strip","Visible receipts and autopsies without overclaiming.","Builds trust.","GRAY","Product Strategy","P0","CMD-020"],
  ["OPP-L-012","launch","Pricing use-case ladder","FREE/PRO/ELITE explained by user jobs, not feature dump.","Improves conversion.","GRAY","Growth / Monetization","P0","CMD-036"],
  ["OPP-L-013","launch","Checkout guardrail audit","Display price and checkout price must match.","Prevents billing trust damage.","GRAY","Growth / Monetization","P0","CMD-037"],
  ["OPP-L-014","launch","Promotions disabled shell","Build shell with no live links until approval.","Protects compliance.","YELLOW","Promotions / Affiliate Partnerships","P0","CMD-039"],
  ["OPP-L-015","launch","Responsible gambling copy pass","No hype, no minors, no irresponsible prompts.","Protects brand/legal.","YELLOW","Legal / Compliance / Responsible Gambling","P0","CMD-063"],
  ["OPP-L-016","launch","Support entry minimum","Every route has a clear help path.","Reduces churn.","YELLOW","Customer Support / Customer Success","P0","CMD-030"],
  ["OPP-L-017","launch","Human copy rewrite pass","Remove robotic/generic language and fake certainty.","Improves trust.","YELLOW","Brand Voice / Human Copy","P0","CMD-033"],
  ["OPP-L-018","launch","Launch analytics minimum","Page, rating, player, upgrade, support events.","Makes launch measurable.","GRAY","Analytics / Experimentation","P0","CMD-045"],
  ["OPP-L-019","launch","Privacy-safe event policy","No raw query/payment/methodology leakage in analytics.","Protects users.","GRAY","Analytics / Experimentation","P0","CMD-046"],
  ["OPP-L-020","launch","Release evidence checklist","Typecheck/lint/build/tests/screenshots required.","Stops fake readiness.","RED","QA / Testing / Release","P0","CMD-051"],
  ["OPP-L-021","launch","Method leakage scanner","Scan public copy/source for formula/source-weight exposure.","Protects IP.","GRAY","Legal / Compliance / Responsible Gambling","P0","CMD-064"],
  ["OPP-L-022","launch","Mock/demo leakage scanner","Find stale placeholder values and fake examples.","Protects trust.","GRAY","QA / Testing / Release","P0","CMD-053"],
  ["OPP-L-023","launch","Admin/founder gate audit","Verify cockpit and method pages are private.","Protects IP/security.","GRAY","Infrastructure / DevOps / Security","P0","CMD-049"],
  ["OPP-L-024","launch","Core Web Vitals budget","LCP/INP/CLS target per route.","Protects UX.","GRAY","Website / UX / Visual Design","P0","CMD-012"],
  ["OPP-L-025","launch","Accessibility gate","Keyboard, focus, contrast, reduced motion.","Protects usability.","GRAY","QA / Testing / Release","P0","CMD-052"],
  ["OPP-L-026","launch","Daily Brief launch page","One strong product-content bridge.","Improves habit formation.","GRAY","Content / SEO / Editorial","P1","CMD-042"],
  ["OPP-L-027","launch","Source freshness legend","Explain freshness everywhere without exposing weights.","Improves trust.","YELLOW","Source Integrity Analyst","P0","CMD-006"],
  ["OPP-L-028","launch","No-bet/risk education","Make no-bet feel like value, not absence.","Improves differentiation.","YELLOW","GSE Rating / Sports Intelligence","P0","CMD-019"],
  ["OPP-L-029","launch","Empty/loading/error copy pack","No dead-end product states.","Improves support/UX.","GRAY","Customer Support / Customer Success","P1","CMD-032"],
  ["OPP-L-030","launch","Launch blocker dashboard","One stoplight board for every department.","Improves execution.","YELLOW","Operations / Founder Cockpit","P0","CMD-002"],
  ["OPP-L-031","launch","Claude final polish loop","Claude verifies Codex claims and polishes UI/copy.","Improves finish quality.","YELLOW","QA / Testing / Release","P0","CMD-083"],
  ["OPP-L-032","launch","Customer confusion rescue","Route-level help when users hesitate or loop.","Improves activation.","YELLOW","Customer Support / Customer Success","P1","CMD-031"],
  ["OPP-L-033","launch","Player/team SEO minimum","Metadata and index policy for player/team surfaces.","Improves acquisition.","GRAY","Content / SEO / Editorial","P1","CMD-043"],
  ["OPP-L-034","launch","Refund/cancellation trust copy","Clear billing/support trust before checkout.","Improves trust.","GRAY","Growth / Monetization","P1","CMD-038"],
  ["OPP-L-035","launch","Legal surface inventory","Terms/privacy/disclaimer/promotions states checked.","Protects compliance.","GRAY","Legal / Compliance / Responsible Gambling","P0","CMD-065"],
  ["OPP-L-036","launch","Secret/env boundary map","No secrets in docs/logs/code; env ownership clear.","Protects security.","GRAY","Infrastructure / DevOps / Security","P0","CMD-048"],
  ["OPP-L-037","launch","Rollback plan","Know how to undo bad deploy, data, content, promotion.","Protects launch.","GRAY","Infrastructure / DevOps / Security","P0","CMD-050"],
  ["OPP-L-038","launch","Support templates","Billing, roster issue, rating confusion, promotion confusion.","Improves response speed.","YELLOW","Customer Support / Customer Success","P1","CMD-030"],
  ["OPP-L-039","launch","Founder decision log","Every approval and blocker traceable.","Reduces chaos.","YELLOW","Operations / Founder Cockpit","P0","CMD-066"],
  ["OPP-L-040","launch","Training academy adoption","All workers use same standards and escalation rules.","Scales execution.","GREEN","AI Automation / Agents","P1","CMD-060"],
  ["OPP-L-041","launch","Feature flag map","Gate risky promotions, contests, method surfaces, paid features.","Protects launch.","GRAY","Infrastructure / DevOps / Security","P1","CMD-050"],
  ["OPP-L-042","launch","Public methodology boundary page","Explain what GSE is without recipe disclosure.","Builds trust/IP safety.","YELLOW","Brand Voice / Human Copy","P1","CMD-034"],
  ["OPP-L-043","launch","Customer onboarding path","First session teaches Rating, Player Lab, no-bet, watchlist.","Improves activation.","YELLOW","Customer Support / Customer Success","P0","CMD-031"],
  ["OPP-L-044","launch","Upgrade state audit","Locked features must teach value, not dead-end.","Improves conversion.","GRAY","Growth / Monetization","P0","CMD-036"],
  ["OPP-L-045","launch","Pricing/event reconciliation","Upgrade click to checkout started/completed events.","Improves funnel insight.","GRAY","Analytics / Experimentation","P1","CMD-047"],
  ["OPP-L-046","launch","Content citation rule","Articles and briefs link source/freshness public-safely.","Builds trust.","YELLOW","Content / SEO / Editorial","P1","CMD-044"],
  ["OPP-L-047","launch","GSE Rating public examples","Show examples with real/current data only.","Teaches product.","GRAY","GSE Rating / Sports Intelligence","P1","CMD-017"],
  ["OPP-L-048","launch","Visual regression checklist","Before/after screenshots by route.","Protects design quality.","GRAY","QA / Testing / Release","P0","CMD-052"],
  ["OPP-L-049","launch","Launch go/no-go meeting pack","One packet for founder decision.","Improves decision quality.","YELLOW","Executive / Founder Command","P0","CMD-002"],
  ["OPP-L-050","launch","Post-launch 7-day watch","Support, analytics, errors, churn, data freshness daily.","Protects launch.","YELLOW","Operations / Founder Cockpit","P1","CMD-067"],
];

const postLaunch = [
  ["OPP-P-001","post-launch","Personalized homepage","Watchlist and favorite-team/player modules.","Improves retention.","Community / Engagement / Retention","P1","CMD-069"],
  ["OPP-P-002","post-launch","Rating Movers habit loop","Daily movement board with source context.","Improves time on site.","Community / Engagement / Retention","P1","CMD-070"],
  ["OPP-P-003","post-launch","Injury shock board","Surface high-impact injury changes with risk context.","Improves product value.","GSE Rating / Sports Intelligence","P1","CMD-019"],
  ["OPP-P-004","post-launch","Market movement board","Track movement without acting like sportsbook advice.","Improves differentiation.","GSE Rating / Sports Intelligence","P1","CMD-019"],
  ["OPP-P-005","post-launch","Newsletter-to-product bridge","Daily Brief to saved player/team journeys.","Improves activation.","Content / SEO / Editorial","P1","CMD-042"],
  ["OPP-P-006","post-launch","PRO retention digest","Weekly recap for PRO usage and new signals.","Improves retention.","Customer Support / Customer Success","P1","CMD-032"],
  ["OPP-P-007","post-launch","ELITE white-glove lane","Higher-touch support and advanced reports.","Improves ARPU.","Growth / Monetization","P1","CMD-038"],
  ["OPP-P-008","post-launch","Affiliate compliance cockpit","Offer status, disclosures, clicks, approvals.","Monetizes safely.","Promotions / Affiliate Partnerships","P1","CMD-040"],
  ["OPP-P-009","post-launch","Partner pipeline CRM","Sportsbook/casino/DFS/fantasy/media partners with legal gates.","Creates revenue.","Sales / Partnerships / Enterprise","P1","CMD-057"],
  ["OPP-P-010","post-launch","Creator pipeline","Sports creators as education/distribution partners.","Improves acquisition.","Sales / Partnerships / Enterprise","P2","CMD-058"],
  ["OPP-P-011","post-launch","Sponsor-ready contest shell","Sponsor-funded free contest without live paid entry.","Growth wedge.","Community / Engagement / Retention","P2","CMD-071"],
  ["OPP-P-012","post-launch","EdgeBall private beta","Friend-history-powered sandbox contest with consent.","Moat/engagement.","Community / Engagement / Retention","P2","CMD-071"],
  ["OPP-P-013","post-launch","Enterprise intelligence report","B2B weekly reports for media/creators/fantasy operators.","Revenue expansion.","Sales / Partnerships / Enterprise","P2","CMD-059"],
  ["OPP-P-014","post-launch","Founder cockpit v1","One private screen for launch health, data, revenue, support.","Founder leverage.","Operations / Founder Cockpit","P1","CMD-066"],
  ["OPP-P-015","post-launch","AI support copilot","Draft support answers with strict method/data boundaries.","Support efficiency.","AI Automation / Agents","P2","CMD-061"],
  ["OPP-P-016","post-launch","AI content brief assistant","Draft briefs from source-checked inputs and citation rules.","Content velocity.","AI Automation / Agents","P2","CMD-062"],
  ["OPP-P-017","post-launch","Source integrity bot","Daily source freshness and conflict summary.","Trust protection.","AI Automation / Agents","P1","CMD-061"],
  ["OPP-P-018","post-launch","Revenue dashboard","Subscription, affiliate, sponsor, content, enterprise revenue.","Financial clarity.","Finance / Unit Economics","P1","CMD-054"],
  ["OPP-P-019","post-launch","Unit economics model","CAC/LTV/ARPU/churn sensitivity.","Better decisions.","Finance / Unit Economics","P1","CMD-055"],
  ["OPP-P-020","post-launch","Refund/chargeback tracker","Billing trust risk monitor.","Protects revenue.","Finance / Unit Economics","P1","CMD-056"],
  ["OPP-P-021","post-launch","Lifecycle automation","Onboarding, upgrade, churn, winback sequences.","Retention.","Growth / Monetization","P1","CMD-038"],
  ["OPP-P-022","post-launch","Community waitlist","Interest capture for contests/community with compliance copy.","Growth.","Community / Engagement / Retention","P2","CMD-071"],
  ["OPP-P-023","post-launch","Source transparency snippets","Reusable public-safe source cards.","Trust.","Content / SEO / Editorial","P1","CMD-044"],
  ["OPP-P-024","post-launch","Advanced compare mode","Player/team compare experiences in Player Lab.","Engagement.","GSE Rating / Sports Intelligence","P2","CMD-018"],
  ["OPP-P-025","post-launch","Shareable insight cards","Compliant share cards with no guaranteed claims.","Social acquisition.","Content / SEO / Editorial","P2","CMD-043"],
  ["OPP-P-026","post-launch","Customer feedback radar","Support/user feedback to build queue.","Product learning.","Customer Support / Customer Success","P1","CMD-030"],
  ["OPP-P-027","post-launch","Experiment framework","A/B tests for hero, pricing, onboarding, CTA copy.","Optimization.","Analytics / Experimentation","P2","CMD-047"],
  ["OPP-P-028","post-launch","Open-source ops lab","Self-hosted support/CRM/newsletter/RAG prototypes.","Cost savings.","AI Automation / Agents","P2","CMD-060"],
  ["OPP-P-029","post-launch","Knowledge base brain","Internal docs assistant with public/private separation.","Speed.","AI Automation / Agents","P2","CMD-062"],
  ["OPP-P-030","post-launch","Support SLA dashboard","Response times, categories, sentiment, refunds.","Customer success.","Customer Support / Customer Success","P1","CMD-030"],
  ["OPP-P-031","post-launch","Editorial calendar system","Weekly NFL rhythm tied to product data.","Content velocity.","Content / SEO / Editorial","P1","CMD-042"],
  ["OPP-P-032","post-launch","SEO glossary system","Explain GSE terms and sports intelligence concepts.","Acquisition/trust.","Content / SEO / Editorial","P2","CMD-043"],
  ["OPP-P-033","post-launch","Public API readiness audit","Decide whether data/API product exists later.","Revenue option.","Product Strategy","P3","CMD-072"],
  ["OPP-P-034","post-launch","Enterprise demo portal","Gated B2B demos without exposing method.","Sales.","Sales / Partnerships / Enterprise","P2","CMD-059"],
  ["OPP-P-035","post-launch","Advisor/investor update packet","Monthly proof, roadmap, revenue, risk, asks.","Capital/network.","Executive / Founder Command","P2","CMD-067"],
  ["OPP-P-036","post-launch","Support video replies","Galaxy Studios clip library for common questions.","Support speed.","Customer Support / Customer Success","P2","CMD-031"],
  ["OPP-P-037","post-launch","Release notes with risk labels","Human release notes that teach changes.","Trust.","Brand Voice / Human Copy","P2","CMD-035"],
  ["OPP-P-038","post-launch","Trust center","Status, data freshness, source policy, responsible-use docs.","Trust.","Legal / Compliance / Responsible Gambling","P2","CMD-065"],
  ["OPP-P-039","post-launch","Compliance review workflow","Promotions/content/contest legal review workflow.","Risk reduction.","Legal / Compliance / Responsible Gambling","P1","CMD-063"],
  ["OPP-P-040","post-launch","Data quality SLOs","Freshness/error/conflict SLOs by source class.","Reliability.","Data Engineering","P1","CMD-006"],
  ["OPP-P-041","post-launch","Roster transaction digest","Daily source-backed roster movement summary.","Trust/product value.","NFL Data Accuracy / Roster Truth","P1","CMD-004"],
  ["OPP-P-042","post-launch","Admin data correction queue","Human review lane for conflicts/canaries.","Safety.","NFL Data Accuracy / Roster Truth","P1","CMD-007"],
  ["OPP-P-043","post-launch","Premium onboarding quiz","Ask goals, favorite teams, risk tolerance language.","Activation.","Customer Support / Customer Success","P2","CMD-031"],
  ["OPP-P-044","post-launch","Churn-risk flags","Usage drop, billing issues, support frustration.","Retention.","Analytics / Experimentation","P2","CMD-046"],
  ["OPP-P-045","post-launch","Partner revenue reconciliation","Click/conversion/payout matching.","Finance.","Finance / Unit Economics","P2","CMD-056"],
  ["OPP-P-046","post-launch","Data provider cost monitor","Track API/source costs per product surface.","Margin.","Finance / Unit Economics","P2","CMD-055"],
  ["OPP-P-047","post-launch","Customer intelligence digest","Weekly themes from support/search/usage.","Product learning.","Operations / Founder Cockpit","P1","CMD-067"],
  ["OPP-P-048","post-launch","Content-to-support loop","Turn repeated questions into help assets.","Efficiency.","Content / SEO / Editorial","P1","CMD-044"],
  ["OPP-P-049","post-launch","Model trust autopsy format","Public-safe autopsies for misses and no-bets.","Trust.","GSE Rating / Sports Intelligence","P2","CMD-020"],
  ["OPP-P-050","post-launch","Department scorecards","Weekly department readiness and KPIs.","Execution.","Operations / Founder Cockpit","P1","CMD-068"],
];

const creative = [
  ["OPP-C-001","creative/moat","GSE Signal Timeline","A living timeline showing what changed and when GSE noticed.","Makes intelligence feel alive.","GSE Rating / Sports Intelligence","P2","CMD-072"],
  ["OPP-C-002","creative/moat","No-Bet Hall of Fame","Celebrate avoided traps with receipts.","Differentiates from tout culture.","Brand Voice / Human Copy","P2","CMD-073"],
  ["OPP-C-003","creative/moat","Player Risk Passport","Player page showing volatility, role stability, source freshness, and recent context.","Sticky product object.","Product Strategy","P2","CMD-074"],
  ["OPP-C-004","creative/moat","Trust Thermometer","Public-safe confidence/freshness composite without formula.","Teaches uncertainty.","GSE Rating / Sports Intelligence","P2","CMD-075"],
  ["OPP-C-005","creative/moat","Autopsy Cards","Shareable post-result cards explaining what was right/wrong/unknown.","Builds trust.","Content / SEO / Editorial","P2","CMD-076"],
  ["OPP-C-006","creative/moat","Roster Truth Badge","Show verified/current/conflict state on player cards.","Data moat.","NFL Data Accuracy / Roster Truth","P1","CMD-005"],
  ["OPP-C-007","creative/moat","Founder Method Firewall","Automated public/private knowledge separation checker.","IP moat.","AI Automation / Agents","P1","CMD-064"],
  ["OPP-C-008","creative/moat","Daily Edge Brief Studio","Generate video/text brief from verified source changes.","Content engine.","AI Automation / Agents","P2","CMD-062"],
  ["OPP-C-009","creative/moat","EdgeBall Lab Sandbox","Free no-cash best-ball-style education loop.","Engagement.","Community / Engagement / Retention","P3","CMD-071"],
  ["OPP-C-010","creative/moat","Friend Rivalry Ghosts","Consent-based friend-history personalities for private beta.","Uniqueness.","Community / Engagement / Retention","P3","CMD-071"],
  ["OPP-C-011","creative/moat","Source Freshness Map","Visual map of source recency and conflict status.","Trust product.","Data Engineering","P2","CMD-006"],
  ["OPP-C-012","creative/moat","Galaxy Studios Help Overlay","Video and summary on every proprietary item.","Teachability.","Website / UX / Visual Design","P1","CMD-031"],
  ["OPP-C-013","creative/moat","10-Second Value Scanner","CI/QA checks whether every surface has summary/status/action/help.","UX moat.","QA / Testing / Release","P1","CMD-052"],
  ["OPP-C-014","creative/moat","Decision Quality Score","Measure whether users explore risk/trust before upgrade/click.","Better growth.","Analytics / Experimentation","P2","CMD-047"],
  ["OPP-C-015","creative/moat","Chalk Trap Radar","Public-safe market consensus risk education.","Differentiation.","GSE Rating / Sports Intelligence","P2","CMD-019"],
  ["OPP-C-016","creative/moat","Volatility Classroom","Interactive lessons for risk/no-bet concepts.","Education.","Customer Support / Customer Success","P2","CMD-031"],
  ["OPP-C-017","creative/moat","Receipts Ledger API Later","Internal immutable receipts model that could later power public trust.","Moat.","Data Engineering","P3","CMD-072"],
  ["OPP-C-018","creative/moat","Founder Cockpit Command Feed","Daily cross-department health digest.","Founder leverage.","Operations / Founder Cockpit","P1","CMD-066"],
  ["OPP-C-019","creative/moat","Partner Trust Score","Rate partners/offers by compliance and customer value.","Affiliate trust.","Promotions / Affiliate Partnerships","P2","CMD-040"],
  ["OPP-C-020","creative/moat","Customer Confusion Heatmap","Help opens, backtracks, search loops by route.","UX intelligence.","Analytics / Experimentation","P2","CMD-045"],
  ["OPP-C-021","creative/moat","Method-Safe AI Explainer","AI explains a card without revealing formulas.","Support/product.","AI Automation / Agents","P2","CMD-061"],
  ["OPP-C-022","creative/moat","Source Conflict Theater","Founder-only view of conflicting roster/source evidence.","Data operations.","NFL Data Accuracy / Roster Truth","P1","CMD-007"],
  ["OPP-C-023","creative/moat","Risk-Aware Promotions Router","Only show offers when user context/legal state/trust passes gates.","Responsible growth.","Promotions / Affiliate Partnerships","P3","CMD-041"],
  ["OPP-C-024","creative/moat","Launch Black Box Recorder","Store release evidence, screenshots, tests, blockers, decisions.","Operational moat.","QA / Testing / Release","P1","CMD-051"],
  ["OPP-C-025","creative/moat","GSE Score Story Mode","Narrative replay of why a rating moved across week context.","Engagement.","GSE Rating / Sports Intelligence","P2","CMD-017"],
];

const allOpps = [...baseOpportunities, ...postLaunch, ...creative].map((r) => ({
  opportunity_id: r[0],
  category: r[1],
  title: r[2],
  description: r[3],
  why_it_matters: r[4],
  current_repo_status: r[5] ?? "planned/research",
  duplicate_classification: "EXTENSION",
  customer_value: r[1] === "launch" ? 5 : 4,
  business_value: r[1] === "creative/moat" ? 5 : 4,
  revenue_value: /pricing|revenue|affiliate|partner|checkout|enterprise|sponsor|monet/.test(`${r[2]} ${r[3]}`.toLowerCase()) ? 5 : 3,
  trust_value: /trust|roster|source|risk|legal|compliance|receipt|no-bet|stale|canary/.test(`${r[2]} ${r[3]}`.toLowerCase()) ? 5 : 3,
  engagement_value: /watchlist|brief|player|community|edgeball|rating movers|timeline|video/.test(`${r[2]} ${r[3]}`.toLowerCase()) ? 5 : 3,
  retention_value: /retention|support|onboarding|success|lifecycle|watchlist|digest/.test(`${r[2]} ${r[3]}`.toLowerCase()) ? 5 : 3,
  risk_level: r[1] === "launch" && /approval|legal|promotions|sportsbook|casino|roster|checkout/.test(`${r[2]} ${r[3]}`.toLowerCase()) ? "HIGH" : "MEDIUM",
  effort: r[7] === "P0" ? "M" : "M/L",
  recommended_owner: r[6],
  priority: r[7],
  build_card: r[8],
  launch_or_post_launch: r[1] === "launch" ? "launch" : "post-launch",
  notes: "Generated from command-center synthesis; validate in real shipping clone before execution.",
}));

const masterBuilds = [
  ["CMD-001","Real shipping clone locator and repo truth proof","launch blocker","P0","S","EXTENSION",["BUILD-SITE-001"],"Find the real app repo, branch, package manager, routes, scripts, and git status."],
  ["CMD-002","Launch stoplight command dashboard","launch blocker","P0","M","EXTENSION",["BUILD-GV2-091"],"Create one red/yellow/green/gray command dashboard for founder decisions."],
  ["CMD-003","Roster canary validation gate","data accuracy","P0","M","EXTENSION",["BUILD-NRT-041","BUILD-NRT-044"],"Block launch when Najee/Rico/current-team canaries fail."],
  ["CMD-004","Official roster source hierarchy implementation packet","roster truth","P0","L","EXTENSION",["BUILD-NRT-001","BUILD-NRT-002","BUILD-NRT-003"],"Implement official-first source policy and conflict handling."],
  ["CMD-005","Current-team public badge and stale-data warning","roster truth","P0","M","EXTENSION",["BUILD-NRT-052","BUILD-GV2-099"],"Expose public-safe freshness/status on player surfaces."],
  ["CMD-006","Source freshness SLO and alerting map","data accuracy","P0","M","EXTENSION",["BUILD-GV2-020","BUILD-NRT-064"],"Define freshness windows and alert when stale."],
  ["CMD-007","Roster conflict founder review queue","data accuracy","P0","M","EXTENSION",["BUILD-NRT-026","BUILD-NRT-058"],"Route conflicting evidence to founder/admin review before public display."],
  ["CMD-008","Product surface simplification pass","product core","P0","M","EXTENSION",["BUILD-SITE-008"],"Collapse confusing routes/labels into fewer stronger product doors."],
  ["CMD-009","Homepage launch-critical rebuild","website/design","P0","L","EXTENSION",["BUILD-SITE-002","BUILD-SITE-003","BUILD-SITE-004"],"Make the homepage explain GSE in 10 seconds."],
  ["CMD-010","Raw JSON and unreadable subcategory remediation","website/design","P0","M","EXTENSION",["BUILD-HELP-002","BUILD-SITE-029"],"Replace raw JSON with readable cards/tables/help affordances."],
  ["CMD-011","Galaxy Studios help layer MVP","support/customer success","P0","M","EXTENSION",["BUILD-HELP-005","BUILD-SITE-070"],"Add video/how-to help for complex product surfaces."],
  ["CMD-012","Performance/accessibility route gates","mobile/accessibility","P0","M","EXTENSION",["BUILD-SITE-083","BUILD-SITE-084"],"Add CWV/accessibility checks for launch pages."],
  ["CMD-013","Mobile route screenshot review","mobile/accessibility","P0","M","EXTENSION",["BUILD-SITE-088"],"Capture and review mobile screenshots for all launch routes."],
  ["CMD-014","Design token implementation and contrast pass","website/design","P0","M","EXTENSION",["BUILD-SITE-011","BUILD-SITE-086"],"Apply readable premium visual system and contrast checks."],
  ["CMD-015","Loading empty error state polish","website/design","P0","M","EXTENSION",["BUILD-SITE-026","BUILD-SITE-027","BUILD-SITE-028"],"Ensure no dead-end states."],
  ["CMD-016","Motion and reduced-motion launch guard","website/design","P0","S","EXTENSION",["BUILD-SITE-021","BUILD-SITE-022"],"Use motion only to teach state changes."],
  ["CMD-017","GSE Rating above-fold rebuild","product core","P0","L","EXTENSION",["BUILD-SITE-031","BUILD-GV2-011"],"Show score, movement, risk, confidence, freshness, and next action."],
  ["CMD-018","Player Lab launch workspace polish","product core","P0","L","EXTENSION",["BUILD-SITE-036","BUILD-GV2-021"],"Make Player Lab usable, teachable, and current-team aware."],
  ["CMD-019","No-bet/risk/volatility education layer","product core","P0","M","EXTENSION",["BUILD-GV2-017","BUILD-SITE-045"],"Make restraint and volatility a visible value proposition."],
  ["CMD-020","Track Record receipts launch surface","trust / track-record systems","P0","M","EXTENSION",["BUILD-GV2-019","BUILD-SITE-005"],"Show receipts, autopsies, and humility copy."],
  ["CMD-021","Search/filter findability audit","product core","P1","M","EXTENSION",["BUILD-SITE-041"],"Make players/teams/intelligence findable in seconds."],
  ["CMD-022","Locked-state value education","subscription conversion","P0","M","EXTENSION",["BUILD-SITE-017","BUILD-SITE-054"],"Locked features should teach why upgrade matters."],
  ["CMD-023","Watchlist activation path","retention / lifecycle","P1","M","EXTENSION",["BUILD-GV2-026","BUILD-SITE-038"],"Turn interest into saved ongoing value."],
  ["CMD-024","Daily what-changed habit loop","engagement / time-on-site","P1","M","EXTENSION",["BUILD-SITE-043"],"Give returning users immediate reason to come back."],
  ["CMD-025","Rating Movers board launch candidate","engagement / time-on-site","P1","M","EXTENSION",["BUILD-GV2-022","BUILD-SITE-042"],"Create a high-signal daily browse surface."],
  ["CMD-026","Support minimum launch package","support/customer success","P0","M","EXTENSION",["BUILD-GV2-034","BUILD-SITE-066"],"Support entry, categories, escalation tree, templates."],
  ["CMD-027","First-session onboarding route","customer onboarding","P0","M","EXTENSION",["BUILD-SITE-067","BUILD-113"],"Teach Rating, Player Lab, no-bet, watchlist, and support."],
  ["CMD-028","Confused-user rescue loop","customer success","P1","M","EXTENSION",["BUILD-SITE-071","BUILD-GV2-032"],"Detect and recover confusion before churn."],
  ["CMD-029","Support-to-build-card intake","support/customer success","P1","S","EXTENSION",["BUILD-041"],"Convert repeated support issues into build cards."],
  ["CMD-030","Human support template library","support/customer success","P1","S","EXTENSION",["BUILD-GV2-038"],"Create safe templates for common support cases."],
  ["CMD-031","Galaxy Studios video workflow","support/customer success","P1","M","EXTENSION",["BUILD-087","BUILD-HELP-044"],"Create repeatable video help production."],
  ["CMD-032","Customer success lifecycle minimum","retention / lifecycle","P1","M","EXTENSION",["BUILD-GV2-059","BUILD-GV2-060"],"Define onboarding, power-user, churn-risk, winback flows."],
  ["CMD-033","Human copy rewrite sprint","brand voice","P0","M","EXTENSION",["BUILD-GV2-041","BUILD-SITE-072"],"Remove robotic copy and make every surface understandable."],
  ["CMD-034","Method-safe public language guard","brand voice","P0","S","EXTENSION",["BUILD-GV2-085","BUILD-HELP-028"],"Explain without revealing formulas/source weights."],
  ["CMD-035","No fake certainty copy lint","brand voice","P0","S","EXTENSION",["BUILD-GV2-042","BUILD-SITE-074"],"Block guarantees, tout language, and overclaims."],
  ["CMD-036","Pricing page launch rebuild","monetization","P0","L","EXTENSION",["BUILD-SITE-051","BUILD-115"],"Clarify FREE/PRO/ELITE value and upgrade path."],
  ["CMD-037","Price and checkout integrity gate","monetization","P0","M","EXTENSION",["BUILD-GV2-077"],"Verify display price, checkout price, env, and plan mapping."],
  ["CMD-038","Lifecycle monetization plan","monetization","P1","M","EXTENSION",["BUILD-GV2-012","BUILD-GV2-014"],"Map onboarding, upgrade, annual, winback, and ELITE success."],
  ["CMD-039","Promotions shell no-live-link implementation","promotions/affiliate","P0","M","EXTENSION",["BUILD-SITE-057","BUILD-GV2-010"],"Build safe shell with disabled/pending states."],
  ["CMD-040","Affiliate compliance/admin workflow","promotions/affiliate","P1","L","EXTENSION",["BUILD-GV2-001","BUILD-GV2-003"],"Partner/offers need disclosures, approvals, expiration, reconciliation."],
  ["CMD-041","Affiliate click tracking and payout reconciliation","promotions/affiliate","P2","M","EXTENSION",["BUILD-GV2-078"],"Track clicks/conversions/payouts only after approval."],
  ["CMD-042","Daily Brief launch experience","content/SEO","P1","M","EXTENSION",["BUILD-050","BUILD-SITE-061"],"Make content a product habit loop."],
  ["CMD-043","SEO route template minimum","content/SEO","P1","M","EXTENSION",["BUILD-GV2-052","BUILD-GV2-053"],"Create player/team/glossary metadata and content rules."],
  ["CMD-044","Source citation and freshness editorial rule","content/SEO","P0","S","EXTENSION",["BUILD-112","BUILD-SITE-063"],"Every public research/content item has freshness/source context."],
  ["CMD-045","Launch analytics event implementation map","analytics","P0","M","EXTENSION",["BUILD-GV2-076","BUILD-SITE-076"],"Implement minimum privacy-safe funnel/product events."],
  ["CMD-046","Privacy-safe analytics review","analytics","P0","S","EXTENSION",["BUILD-GV2-076"],"Avoid raw queries, payment data, precise location, method leakage."],
  ["CMD-047","Upgrade funnel dashboard","analytics","P1","M","EXTENSION",["BUILD-GV2-077","BUILD-SITE-078"],"Measure pricing, locked states, checkout starts, completions."],
  ["CMD-048","Secrets and env boundary audit","infrastructure/security","P0","S","EXTENSION",["BUILD-003"],"Map secrets, env ownership, and no-secret logs/docs."],
  ["CMD-049","Auth/admin/founder gate audit","infrastructure/security","P0","M","EXTENSION",["BUILD-GV2-094"],"Verify private cockpit and method surfaces are gated."],
  ["CMD-050","Rollback and feature flag map","infrastructure/security","P0","M","EXTENSION",["BUILD-GV2-097"],"Make risky features reversible and gated."],
  ["CMD-051","Release evidence runner","QA/testing","P0","M","EXTENSION",["BUILD-SITE-088"],"Collect typecheck/lint/build/test/routes/screenshots evidence."],
  ["CMD-052","Accessibility/mobile QA gate","QA/testing","P0","M","EXTENSION",["BUILD-SITE-084","BUILD-SITE-087"],"Block unreadable or inaccessible launch routes."],
  ["CMD-053","Mock/demo/stale-data leakage scanner","QA/testing","P0","M","EXTENSION",["BUILD-GV2-099"],"Detect stale demo values and raw placeholders."],
  ["CMD-054","Founder finance dashboard v1","finance","P1","M","EXTENSION",["BUILD-GV2-071"],"Track revenue, costs, payouts, churn, CAC/LTV."],
  ["CMD-055","Unit economics model v1","finance","P1","M","EXTENSION",["BUILD-GV2-072"],"Make subscription/affiliate/sponsor/API economics explicit."],
  ["CMD-056","Refund chargeback and payout risk tracker","finance","P1","S","EXTENSION",["BUILD-GV2-075"],"Track financial trust risks."],
  ["CMD-057","Partner pipeline CRM schema","sales/partnerships","P1","M","EXTENSION",["BUILD-028","BUILD-GV2-067"],"Track affiliates, sportsbooks, DFS, fantasy, media, sponsors."],
  ["CMD-058","Creator/sponsor outreach packet","sales/partnerships","P2","M","EXTENSION",["BUILD-GV2-066"],"Create safe, non-sportsbook positioning for outreach."],
  ["CMD-059","Enterprise demo and report packaging","sales/partnerships","P2","L","EXTENSION",["BUILD-GV2-065"],"Package intelligence for B2B without method leakage."],
  ["CMD-060","Agent training academy adoption","AI/automation","P1","M","EXTENSION",["BUILD-GV2-100"],"Make every worker follow files/tests/escalation rules."],
  ["CMD-061","AI support/source integrity assistant","AI/automation","P2","M","EXTENSION",["BUILD-020","BUILD-GV2-083"],"Automate safe support and source checks with strict boundaries."],
  ["CMD-062","AI content and build queue assistant","AI/automation","P2","M","EXTENSION",["BUILD-018","BUILD-GV2-089"],"Draft source-backed briefs and build packets with approvals."],
  ["CMD-063","Responsible gambling and promotions legal gate","risk/compliance","P0","S","EXTENSION",["BUILD-GV2-002","CONTEST-001"],"No live promotions/contest/payout work without approvals."],
  ["CMD-064","Public method leakage scanner","risk/compliance","P0","M","EXTENSION",["BUILD-022","BUILD-GV2-085"],"Scan public routes/docs for method, source weights, formulas."],
  ["CMD-065","Trust/legal surface minimum","risk/compliance","P0","M","EXTENSION",["BUILD-GV2-054"],"Terms/privacy/disclaimer/responsible-use/trust-center minimum."],
  ["CMD-066","Founder cockpit command feed","org/training","P1","M","EXTENSION",["BUILD-GV2-091","BUILD-GV2-096"],"Daily/weekly cross-department health feed."],
  ["CMD-067","Operating cadence and decision log","org/training","P0","S","EXTENSION",["BUILD-GV2-092"],"Run daily launch standup and weekly department reviews."],
  ["CMD-068","Department scorecards","org/training","P1","M","EXTENSION",["BUILD-GV2-100"],"Give each department readiness metrics and owned queue."],
  ["CMD-069","Personalized retention homepage","retention/lifecycle","P2","L","EXTENSION",["BUILD-SITE-044"],"Show watchlists, what changed, saved players/teams."],
  ["CMD-070","Engagement loop stack","engagement/time-on-site","P2","L","EXTENSION",["BUILD-GV2-022","BUILD-GV2-026"],"Rating movers, no-bet radar, injury/market boards."],
  ["CMD-071","EdgeBall safe sandbox continuation","creative/moat opportunity","P3","XL","EXTENSION",["CONTEST-003","EDGE-001"],"Free no-cash sandbox only until legal approvals."],
  ["CMD-072","Future productized data/API opportunity audit","creative/moat opportunity","P3","L","VARIANT",["BUILD-GV2-016"],"Evaluate future data/API revenue without launching."],
  ["CMD-073","No-Bet Hall of Fame concept packet","creative/moat opportunity","P3","M","EXTENSION",["BUILD-GV2-017"],"Celebrate avoided bad decisions with receipts."],
  ["CMD-074","Player Risk Passport concept packet","creative/moat opportunity","P2","M","EXTENSION",["BUILD-SITE-039"],"Player-level risk/freshness/status profile."],
  ["CMD-075","Trust Thermometer concept packet","creative/moat opportunity","P3","M","VARIANT",["BUILD-GV2-020"],"Public-safe trust/freshness indicator without formula."],
  ["CMD-076","Autopsy card social/trust system","creative/moat opportunity","P2","M","EXTENSION",["BUILD-SITE-050","BUILD-GV2-019"],"Shareable receipts and lessons."],
  ["CMD-077","Launch support war-room script","support/customer success","P0","S","EXTENSION",["CMD-026"],"First 7 days support escalation and owner coverage."],
  ["CMD-078","Launch content calendar minimum","content/SEO","P1","S","EXTENSION",["CMD-042"],"First 14 days editorial and brief calendar."],
  ["CMD-079","Customer trust issue ledger","trust / track-record systems","P1","S","EXTENSION",["BUILD-048"],"Track every trust-damaging issue and resolution."],
  ["CMD-080","Data provider outage runbook","data accuracy","P1","M","EXTENSION",["BUILD-GV2-098"],"Handle source failures without bad public data."],
  ["CMD-081","Launch PR/announcement risk review","brand voice","P1","S","NET_NEW",[],"Prevent overclaims in launch announcement."],
  ["CMD-082","Founder approval matrix","org/training","P0","S","EXTENSION",["CMD-067"],"List exactly which actions require founder/legal approval."],
  ["CMD-083","Claude final verification and polish pass","QA/testing","P0","M","EXTENSION",["BUILD-SITE-088"],"Claude verifies claims, screenshots, tests, copy, design before launch."],
  ["CMD-084","Current public web source refresh packet","data accuracy","P0","S","EXTENSION",["BUILD-NRT-001"],"Refresh official source evidence before launch decision."],
  ["CMD-085","Launch black-box evidence archive","QA/testing","P1","M","NET_NEW",[],"Archive all tests/screenshots/blockers/approvals for launch."],
  ["CMD-086","Live affiliate link blocker scan","promotions/affiliate","P0","S","EXTENSION",["BUILD-GV2-010"],"Scan for live sportsbook/casino/DFS links before launch."],
  ["CMD-087","Method-safe RAG/AI boundary map","AI/automation","P1","M","EXTENSION",["BUILD-022"],"Separate founder-only from customer-facing AI knowledge."],
  ["CMD-088","Customer support knowledge base minimum","support/customer success","P1","M","EXTENSION",["BUILD-040"],"Launch-ready help articles and escalation paths."],
  ["CMD-089","SaaS replacement adoption hold/review","AI/automation","P2","S","EXTENSION",["BUILD-001"],"Do not self-host tools until owner approves operational burden."],
  ["CMD-090","Final launch recommendation packet","launch blocker","P0","S","EXTENSION",["CMD-002","CMD-083"],"Produce final GO/NO-GO with evidence and unknowns."],
];

function buildCard(row) {
  const [id, title, category, priority, difficulty, gate, matches, summary] = row;
  const launchBlocker = category === "launch blocker" || id === "CMD-003" || id === "CMD-004";
  const mustHave = ["P0", "P1"].includes(priority);
  const risk = /promotions|legal|affiliate|checkout|method|roster|data|auth|secrets/i.test(`${title} ${category}`) ? "HIGH" : "MEDIUM";
  return `# BUILD-${id}: ${title}

## Classification

launch_blocker: ${launchBlocker ? "yes" : "no"}
must_have: ${mustHave ? "yes" : "no"}
must_fix: ${priority === "P0" ? "yes" : "no"}
post_launch: ${priority === "P2" || priority === "P3" ? "yes" : "no"}
creative_moat: ${category.includes("creative") ? "yes" : "no"}
risk_reduction: ${/risk|compliance|security|data|QA|roster|trust/i.test(category) ? "yes" : "no"}

## Duplicate Gate

duplicate_check_status: ${gate}
matched_existing_ids: ${matches.join(", ") || "none"}
relation_to_existing: Command-center consolidation or execution packet, not a renamed duplicate.
reason_not_duplicate: This card turns prior research/build cards into launch ownership, evidence, and verification work across departments.
parent_id: ${matches[0] ?? ""}
supersedes_id:
dependency_ids: ${matches.join(", ")}
merge_notes: Reference and extend prior cards; do not recreate their lower-level implementation details.

## Department Owner

Primary: ${departments.find((d) => d[3].includes(id))?.[1] ?? "Executive / Founder Command"}
Supporting: QA / Testing / Release; Operations / Founder Cockpit
Worker/agent: ${category}

## Goal

${summary}

## Why It Matters

This protects launch quality, trust, revenue, retention, support readiness, compliance, or founder leverage.

## Evidence

Visible workspace contains docs/research and generated packets, but the runnable app source is not visible here. Prior matching items: ${matches.join(", ") || "none"}.

## Current Problem

The work is planned or researched but not proven implemented in the real shipping clone. Unknowns must stay gray/red until verified.

## Product Surface

${category}; likely affects public website, GSE Rating, Player Lab, pricing, support, data, or founder cockpit depending on implementation.

## Internal Surface

Command center, launch dashboard, QA evidence archive, department packet, and Claude final handoff.

## Customer Value

Users get clearer, safer, faster, more trustworthy product experiences.

## Business Value

Improves launch confidence, conversion, retention, support efficiency, revenue clarity, and defensibility.

## Implementation Plan

1. Verify real repo root, branch, dirty state, package manager, app routes, and relevant files.
2. Read all matched existing cards/docs before editing.
3. Confirm duplicate status and parent dependencies.
4. Implement the smallest route/component/data/tooling change that satisfies this card.
5. Add or update tests/checks relevant to the surface.
6. Capture evidence: command output, screenshots if UI, source links if data.
7. Update command-center status with proof or blocker.

## Acceptance Criteria

- Existing work is referenced, not duplicated.
- Required route/data/tooling behavior is implemented or blocker is documented.
- Tests/checks pass or failures are recorded with exact cause.
- No production deploy, live affiliate link, production DB mutation, or method leakage occurs.

## Test Plan

Typecheck, lint, build, unit/integration tests, route probe, data canary check, screenshot QA, mobile viewport, accessibility, performance, method leakage scan, promotion live-link scan as applicable.

## Rollback Plan

Revert only files changed for this card; disable feature flag if present; restore previous copy/component; keep evidence log.

## Priority

${priority}

## Difficulty

${difficulty}

## Risks

Legal: ${risk}; Brand: ${risk}; Data: ${risk}; Technical: MEDIUM; Support: MEDIUM; Financial: MEDIUM; Maintenance: MEDIUM.

## Claude Handoff Notes

Claude must verify Codex claims in the real app clone, inspect pages visually, run tests, preserve reveal-less methodology, and avoid deploys without approval.

## Claude Code Prompt

You are Claude Code in the real Galaxy Sports Edge / GSN shipping clone. Execute only BUILD-${id}: ${title}. First verify repo root, branch, dirty state, package manager, scripts, route files, and prior related build cards (${matches.join(", ") || "none"}). Do not deploy, mutate production DB, add live affiliate links, expose founder methodology, or fake readiness. Implement the smallest safe change, run relevant tests/checks, capture evidence, and report blockers clearly.
`;
}

function trainingDoc(slugName, name, purpose) {
  return `# ${name} Training Manual

As of: ${asOf}

## Purpose

${purpose}

## What Good Looks Like

- Verifies current repo/app reality before making claims.
- Reads prior command-center and research packets before creating new work.
- Marks unknowns as unknown.
- Keeps founder-only methodology private.
- Produces proof: files, tests, screenshots, sources, logs, or explicit blockers.

## What Bad Looks Like

- Creating duplicate build cards.
- Treating research as implemented product.
- Launching promotions, paid features, or public claims without approval.
- Ignoring mobile, accessibility, support, analytics, data accuracy, or compliance.
- Saying launch-ready without tests.

## Files To Inspect

- docs/command-center/README.md
- docs/command-center/25-final-report.md
- docs/command-center/build-queue/index.md
- docs/research/site-war-room/
- docs/research/nfl-roster-truth/
- docs/research/growth-os-v2/
- real app routes/components/data files once the shipping clone is located

## Files Not To Touch

- Production secrets or env files unless explicitly approved.
- Live payment/pricing/affiliate configuration.
- Founder-only method docs unless the task is private/internal.
- Major route deletions without founder approval.

## Tools To Use

Repo search, ripgrep, git status, package scripts, browser screenshots, Playwright if available, source-backed data checks, command-center ledgers, and relevant training docs.

## How To Test

Run the smallest relevant test set first, then expand to typecheck/lint/build/route/screenshot/accessibility/performance/data canary checks as risk increases.

## How To Document

Update the relevant command-center department packet, build card status, launch blocker list, and handoff note. Include evidence or exact blocker.

## Duplicate Avoidance

Search for matching BUILD IDs, route/surface names, and semantic goal before creating anything. Extend or merge whenever possible.

## Escalation

Escalate immediately for production deploys, DB mutation, payment/pricing, live affiliate/promotions, legal copy, contests/prizes, aggressive tracking, method leakage, stale roster data, or unresolved launch blockers.

## Founder Approval Required

Deploys, pricing/payment changes, launch go/no-go, method exposure, production data mutation, paid services, public claims, and major product positioning.

## Legal Approval Required

Sportsbook/casino/DFS/fantasy promotions, affiliate links, contest prizes, responsible gambling copy, sweepstakes/DFS mechanics, terms/privacy changes, and claims about outcomes.

## Quality Checklist

- Current repo verified.
- Prior work checked.
- Duplicate gate documented.
- Tests run or blocker recorded.
- Mobile/accessibility/performance considered.
- Support/analytics/compliance considered.
- No secrets or method leakage.

## Example Tasks

- Audit a route and update scorecard.
- Implement one build card in the shipping clone.
- Verify a roster canary.
- Rewrite public copy to be human and method-safe.
- Capture screenshots and flag design issues.

## Failure Modes

False readiness, stale data, copied roadmap noise, hidden legal risk, untested UI, mobile breakage, raw JSON exposure, and unsupported launch claims.

## Handoff Format

Objective, files inspected, changes made, evidence, tests, screenshots, blockers, approvals needed, next build card.
`;
}

function deptDoc(slugName, name, mission, builds) {
  const ownedBuilds = builds.map((b) => `BUILD-${b}`).join(", ");
  return `# ${name}

As of: ${asOf}

## Mission

${mission}

## Why It Matters

This department owns a launch-critical layer of trust, revenue, product clarity, execution speed, or risk reduction.

## Current State

Research and build packets exist. Implementation in the live shipping app is unknown from this workspace unless otherwise stated.

## What Exists

- Prior docs under docs/research.
- Command-center ledgers and scorecards.
- Master build queue references: ${ownedBuilds}.

## What Is Missing

- Real shipping-clone verification.
- Current route screenshots where UI is involved.
- Passing test/build evidence where code is involved.
- Clear owner update after implementation.

## Launch Blockers

Anything red in launch-readiness scorecards, unverified P0 data, missing tests, compliance blockers, or unapproved public claims.

## Must-Haves

- Owner named.
- Launch status updated.
- Evidence attached.
- Build cards deduplicated.

## Must-Fixes

- Red blockers tied to this department.
- Unknowns that affect launch claims.
- Any customer-trust issue.

## Post-Launch Opportunities

Use discovery inventory and master queue for growth, automation, monetization, and moat work.

## Owned Routes / Files / Docs

See department-map.csv, product-surface scorecard, and build queue card evidence.

## Owned Metrics

Readiness score, blocker count, test evidence, customer impact, revenue/trust/support metrics relevant to the department.

## Owned Build Cards

${ownedBuilds}

## Worker Roles

Department lead, implementation worker, QA reviewer, support/compliance reviewer as applicable.

## Daily Workflow

1. Review blockers.
2. Pick the highest-priority deduped card.
3. Verify current repo/source state.
4. Execute or document blocker.
5. Update command center.

## Weekly Workflow

Score readiness, review metrics, merge/supersede duplicate work, escalate approvals, and choose next build cards.

## Quality Standard

No fake readiness. Evidence first. Customer trust above speed. Founder-only methodology protected.

## Definition Of Ready

The build has an owner, source files, duplicate gate, approval gate, test plan, rollback plan, and acceptance criteria.

## Definition Of Done

The change is implemented or explicitly blocked, tested, documented, screenshot/source verified if relevant, and reflected in the command center.

## Escalation Rules

Escalate legal/compliance, deploy, production data, payments, live affiliate, method leakage, or P0 data accuracy problems immediately.

## Dependencies

Shipping clone access, product route/source verification, QA evidence, support/compliance review, and founder decisions.

## Tools Needed

Repo search, test scripts, browser/screenshot tooling, source checks, spreadsheets/ledgers, and command-center queue.

## Training Needed

Read this department packet, relevant training manual, duplicate rules, launch blocker triage, and Claude handoff standard.

## Blind Spots

Unknown implementation state in the visible workspace, stale docs, unverified route behavior, and hidden production config.

## First 10 Actions

1. Read command-center README.
2. Read this department packet.
3. Review owned build cards.
4. Review launch blockers.
5. Locate real app files.
6. Verify current state.
7. Run relevant tests.
8. Fix or document highest-risk issue.
9. Update scorecard.
10. Hand off to Claude for final polish/verification if UI/copy/release-critical.

## Claude Handoff Notes

Claude should verify implementation in the real app clone, polish UI/copy where relevant, run tests, and report launch readiness with evidence.
`;
}

function scoreRows() {
  return readinessAreas.map((r) => ({
    area: r[0],
    status: r[1],
    score: r[2],
    evidence: r[3],
    blocker: r[1] === "RED" ? "yes" : r[1] === "GRAY" ? "unknown" : "no",
    owner: departments.find((d) => r[0].toLowerCase().includes(d[1].split(" / ")[0].toLowerCase()))?.[1] ?? "Executive / Founder Command",
    required_action: r[4],
    target_resolution: "Before launch if RED/P0; otherwise scheduled in launch cadence.",
    claude_final_task: "Verify in real app clone; capture proof; polish UI/copy if surface exists.",
  }));
}

function simpleAudit(title, body) {
  return `# ${title}

As of: ${asOf}

${body}

## Status

Most implementation details are GRAY in this workspace because the app source tree is not visible. Treat all launch claims as unverified until the real shipping clone is audited.

## Minimum Before Launch

- Real app source located.
- Relevant route/source files inspected.
- Tests/checks run.
- Screenshots captured for UI.
- Roster/data canaries verified where data appears.
- Legal/founder approvals captured where required.

## Build Cards

See docs/command-center/build-queue/index.md.
`;
}

// Shell and index.
write("README.md", `# GSE / GSN Command Center

As of: ${asOf}

This command center is the launch and operating system for Galaxy Sports Edge / GSN. It consolidates prior Codex/Claude/research work, prevents duplicate builds, assigns department ownership, trains workers/agents, tracks launch blockers, and prepares Claude final handoff.

## How To Use It

1. Start with _index.md.
2. Read 25-final-report.md for the current truth.
3. Use launch/12-launch-blocker-triage.md for launch blockers.
4. Use launch/13-launch-readiness-scorecard.md for readiness by area.
5. Use departments/ for ownership.
6. Use training/ for worker instructions.
7. Use build-queue/ for executable, duplicate-gated build cards.
8. Use handoff/ for Claude final polish and verification.

## Where Things Live

- Departments: docs/command-center/departments/
- Training: docs/command-center/training/
- Build queues: docs/command-center/build-queue/
- Launch blockers: docs/command-center/launch/
- Audits: docs/command-center/audits/
- Discovery and suggestions: docs/command-center/discovery/
- Claude handoff: docs/command-center/handoff/
- Inventory ledgers: docs/command-center/inventory/

## Avoiding Duplicate Work

Search artifact-ledger.csv, build-ledger.csv, duplicate-map.json, and existing research build queues before creating new work. If a build already exists, extend it. If it is obsolete, supersede it. If uncertain, mark it for review.

## Updating Status

Only mark work complete when evidence exists: code diff, passing tests, screenshots, source verification, approved deployment, or explicit owner signoff.

## Escalation

Escalate production deploys, production DB mutation, payment/pricing changes, live affiliate/promotions, legal copy, contests/prizes, aggressive tracking, and founder-method exposure.
`);

write("_index.md", `# Command Center Index

As of: ${asOf}

## Core

- 00-master-operating-plan.md
- 01-full-project-discovery.md
- 02-prior-work-synthesis.md
- 03-duplicate-contradiction-map.md
- 04-current-state-truth-report.md
- 24-final-critic-review.md
- 25-final-report.md

## Operating Areas

- departments/
- training/
- audits/
- discovery/
- launch/
- agents/
- operations/
- build-queue/
- handoff/

## Current Launch Truth

The visible workspace is a docs/control corpus, not the verified shipping app. Launch readiness is RED/GRAY until the real app clone is located and tested.
`);

write("00-master-operating-plan.md", `# Master Operating Plan

As of: ${asOf}

## Mission Interpretation

Build a launch command center that tells GSE where it actually stands, what work already exists, what is duplicated, what blocks launch, what departments own, how workers should operate, and what Claude should verify/polish last.

## Current Assumptions

- GSE / GSN is an NFL-first sports intelligence product, not a sportsbook.
- GSE Rating, Player Lab, roster truth, reveal-less methodology, Track Record, no-bet/risk, FREE/PRO/ELITE, design polish, support, analytics, content, and promotions are core.
- This workspace does not expose the runnable app source tree.

## Safety Rules

No deploys, production DB mutation, live affiliate links, pricing/payment changes, public methodology exposure, fake data, or fake readiness.

## Audit Strategy

Scan visible docs/reports/apps/logs, prior research packets, build queues, generated scripts, logs, and route references. Mark app implementation unknown unless the shipping clone is visible.

## Discovery Strategy

Use prior research, source-backed current roster canary refresh, command-center opportunity inventory, and department reviews.

## Build Strategy

Create only command-center/consolidation/verification build cards that extend prior work. Lower-level execution remains in prior build queues unless a launch ownership layer is missing.

## Agent Strategy

Departments own outcomes; workers own execution; Claude owns final independent verification/polish; Codex owns command-center synthesis and safe tooling.

## Launch Strategy

Launch only after RED blockers resolve: real app clone verified, roster canaries pass, test/build evidence exists, design/mobile/support basics pass, method leakage scan passes, promotions remain gated or legally approved.

## Approval Gates

Founder approval: deploy, production data, pricing/payment, public claims, method language, launch go/no-go. Legal approval: promotions, casino/sportsbook/DFS/fantasy links, contests/prizes, responsible gambling copy, legal pages.

## Testing Gates

Typecheck, lint, build, tests, route probes, browser screenshots, mobile, accessibility, performance, data canaries, method leakage, mock/demo leakage, live-link scan, auth/admin gates.

## Final Verification Standard

Evidence beats assertion. Unknown stays GRAY. Launch-ready requires proof from the real shipping clone.
`);

// Ledgers.
write("inventory/artifact-ledger.csv", csv(Object.keys(artifactRows[0] ?? {}), artifactRows));
write("inventory/research-ledger.csv", csv(["file_path","title","topic","status","action"], researchRows));
write("inventory/build-ledger.csv", csv(["existing_id","source_file","title","category","status","duplicate_risk_notes","normalized_fingerprint"], buildRows));
write("inventory/code-surface-ledger.csv", csv(["file_path","type","purpose","risk","action"], codeRows));
write("inventory/route-ledger.csv", csv(["route","surface","current_state","priority","owner_department"], routes.map((r) => ({ route: r[0], surface: r[1], current_state: r[2], priority: r[3], owner_department: r[4] }))));
write("inventory/agent-work-ledger.csv", csv(["artifact_id","file_path","type","owner","topic","recommended_action"], artifactRows.filter((r) => r.owner !== "unknown").map((r) => ({
  artifact_id: r.artifact_id,
  file_path: r.file_path,
  type: r.type,
  owner: r.owner,
  topic: r.topic,
  recommended_action: r.recommended_action,
}))));

write("01-full-project-discovery.md", `# Full Project Discovery

As of: ${asOf}

## Repo Truth

- Git commands from this folder resolve to a parent repository at C:/Users/Garrett.
- Visible project folder contains docs, reports, logs, and an empty apps directory.
- No visible package.json, app, pages, components, lib, data, scripts, prisma, public, or styles app tree exists here.
- Product implementation, runtime routes, tests, database, deploy state, and screenshots are therefore unverified from this workspace.

## Inventory Summary

${table(["Ledger","Rows"], [
  ["artifact-ledger.csv", artifactRows.length],
  ["research-ledger.csv", researchRows.length],
  ["build-ledger.csv", buildRows.length],
  ["code-surface-ledger.csv", codeRows.length],
  ["route-ledger.csv", routes.length],
  ["agent-work-ledger.csv", artifactRows.filter((r) => r.owner !== "unknown").length],
])}

## High-Signal Existing Research

- docs/research/nfl-roster-truth/
- docs/research/site-war-room/
- docs/research/help-education-ux/
- docs/research/growth-os-v2/
- docs/research/oss-leverage-stack/
- docs/research/oss-next-wave-stack/
- docs/research/contest-format-lab/
- docs/research/edgeball-contest-os/

## Discovery Conclusion

The docs/control layer is substantial. The actual app implementation layer is absent from this workspace and must be located before launch claims can be trusted.
`);

write("02-prior-work-synthesis.md", `# Prior Work Synthesis

As of: ${asOf}

## What Codex Already Did

Codex-created or Codex-inferred artifacts include OSS leverage research, next-wave OSS packets, growth OS v2, contest/EdgeBall research, NFL roster truth, help education UX, and site war-room.

## What Claude Already Did

Claude work cannot be independently verified from this workspace except where docs mention Claude or handoff requests. Treat Claude implementation claims as unknown until the shipping clone and git history are inspected.

## Planned vs Implemented

Most visible work is research, generated docs, ledgers, and build queues. Implementation in live routes/components/data is not visible here.

## Verified

Docs exist. Generated build queues exist. Some local scripts exist. The workspace boundary is verified.

## Unverified

App routes, tests, build, deployment, DB, roster data, Stripe/pricing, analytics, support UI, and screenshots.

## Stale Or Contradicted

Any stale NFL team example remains a P0 risk until current source-backed app data passes canary tests. Prior launch claims without app evidence are GRAY.

## Merge / Supersede Direction

Use this command center as the top-level control plane. Keep prior research as domain detail. Do not recreate lower-level build queues; reference them.
`);

write("prior-work/codex-work-summary.md", `# Codex Work Summary

As of: ${asOf}

Codex-visible work includes research packets for OSS leverage, growth OS, contests, EdgeBall, NFL roster truth, help education UX, and site war-room. These are mostly planning, research, build cards, and safe scripts, not proof of app implementation.
`);

write("prior-work/claude-work-summary.md", `# Claude Work Summary

As of: ${asOf}

Claude implementation claims are not provable from this workspace. Claude should be treated as the final verifier/polisher, not as assumed proof. Any Claude-reported implementation must be checked in the real shipping clone.
`);

write("prior-work/research-summary.md", `# Research Summary

As of: ${asOf}

Research coverage is deep across OSS tools, growth/monetization, design/help, roster truth, contests, affiliate/promotions, support, analytics, and operations. The next leverage point is consolidation and implementation verification.
`);

write("prior-work/implementation-summary.md", `# Implementation Summary

As of: ${asOf}

No production app implementation can be confirmed here. The visible implementation is limited to generated docs and safe research scripts under reports/codex.
`);

const duplicateMap = {
  as_of: asOf,
  rule: "Future builds must extend, merge, supersede, or depend on prior work instead of duplicating it.",
  major_duplicate_risks: [
    "help/onboarding build cards exist in help-education-ux and site-war-room",
    "design token and screenshot QA cards exist in OSS and site-war-room",
    "analytics event taxonomy exists in growth-os-v2 and site-war-room",
    "promotions/affiliate research exists in growth-os-v2 and contest/EdgeBall packets",
    "roster truth source/canary work exists in nfl-roster-truth",
  ],
  classifications: masterBuilds.map((b) => ({
    id: `BUILD-${b[0]}`,
    title: b[1],
    duplicate_check_status: b[5],
    matched_existing_ids: b[6],
    relation_to_existing: "top-level command-center consolidation / launch ownership",
  })),
};

write("03-duplicate-contradiction-map.md", `# Duplicate And Contradiction Map

As of: ${asOf}

## Classification Rules

DUPLICATE means same goal, surface, and implementation. EXTENSION means existing work needs a launch/ownership layer. VARIANT means same theme but materially different surface/audience. DEPENDENCY means prerequisite. REPLACEMENT supersedes older work. CONFLICT needs founder review.

## Findings

- Most new command-center cards are EXTENSION cards, not duplicate implementation cards.
- The command center supersedes scattered status tracking, but not domain research.
- Any claim that the product is launch-ready conflicts with current workspace evidence.
- Promotions, contests, live affiliate links, payment/pricing, and method exposure require approval.

See duplicates/duplicate-map.json.
`);
write("duplicates/duplicate-map.json", JSON.stringify(duplicateMap, null, 2));
write("duplicates/merge-candidates.csv", csv(["item","merge_into","reason"], [
  { item: "site-war-room design build cards", merge_into: "command-center website/design department", reason: "Keep implementation detail there; track launch ownership here." },
  { item: "help-education-ux cards", merge_into: "support/customer success and website/design departments", reason: "Help layer supports launch UX." },
  { item: "growth-os-v2 analytics/cards", merge_into: "analytics/finance and growth departments", reason: "Avoid multiple event schemas." },
]));
write("duplicates/supersede-candidates.csv", csv(["item","superseded_by","reason"], [
  { item: "scattered launch status docs", superseded_by: "docs/command-center/launch", reason: "Single launch blocker/readiness source of truth." },
  { item: "implicit department ownership", superseded_by: "docs/command-center/departments", reason: "Explicit ownership needed." },
]));
write("duplicates/uncertain-items.csv", csv(["item","reason","owner"], [
  { item: "Claude implementation claims", reason: "Cannot verify without real shipping clone.", owner: "Claude Handoff Specialist" },
  { item: "current live roster data", reason: "No app DB/source visible.", owner: "NFL Data Accuracy / Roster Truth" },
]));

write("04-current-state-truth-report.md", `# Current State Truth Report

As of: ${asOf}

## Status Legend

RED = launch blocker. YELLOW = launchable only with known risk/mitigation. GREEN = ready/proven. GRAY = unknown/unverified.

## What Is Actually Built

GREEN: A large docs/control/research corpus and safe generated scripts.

## What Is Partially Built

YELLOW: Command-center structure, build queues, research, scorecards, department/training model.

## What Is Only Research

GRAY: Most product, growth, design, roster truth, analytics, promotions, support, and AI automation implementation.

## What Is Stale

RED if any public player team assignment uses old teams. Najee Harris and Rico Dowdle remain canary names until app data is tested.

## What Is Broken

RED: App verification is broken from this workspace because no app tree is visible.

## What Is Duplicated

YELLOW: Build cards across research folders overlap by domain. Command-center cards consolidate instead of recreating.

## What Is Unowned

YELLOW: Implementation ownership was scattered; departments now assign ownership.

## What Is Overbuilt

YELLOW: Research volume is high relative to app verification.

## What Is Underbuilt

RED/GRAY: Real app evidence, roster canary tests, screenshots, support minimum, analytics implementation, release gates.

## What Is Risky

Promotions, paid contests, payment/pricing, method leakage, stale roster data, fake readiness.

## Launch-Blocking

Real clone missing, roster canaries unverified, no test/build proof, no screenshots, method leakage unknown.

## Handoff To Claude

Claude should verify the real app and polish only after evidence is gathered.
`);

// Departments and training.
write("departments/README.md", `# Departments

As of: ${asOf}

Each department owns a launch-critical layer. Use department-map.csv for quick routing and each department packet for mission, workflows, quality standards, and first actions.
`);
write("departments/department-map.csv", csv(["department_slug","department_name","mission","owned_build_cards"], departments.map((d) => ({
  department_slug: d[0],
  department_name: d[1],
  mission: d[2],
  owned_build_cards: d[3].map((b) => `BUILD-${b}`).join(" "),
}))));
for (const [slugName, name, mission, builds] of departments) {
  write(`departments/${slugName}.md`, deptDoc(slugName, name, mission, builds));
}

write("training/README.md", `# Worker Training Academy

As of: ${asOf}

Every worker/agent must read the command-center README, relevant department packet, and role manual before executing build cards. The shared rule is evidence first, no duplicate work, no unsafe launch actions.
`);
for (const [slugName, name, purpose] of trainingRoles) {
  write(`training/${slugName}.md`, trainingDoc(slugName, name, purpose));
}

// Audits and scorecards.
write("audits/product-surface-scorecard.csv", csv(["surface","route","status","evidence","must_fix","owner_department"], surfaces.map((s) => ({
  surface: s[0],
  route: s[1],
  status: s[2],
  evidence: s[3],
  must_fix: s[4],
  owner_department: s[5],
}))));
write("audits/product-surface-readiness.md", simpleAudit("Product Surface Readiness", `${table(["Surface","Route","Status","Evidence","Must Fix","Owner"], surfaces)}`));

write("audits/data-roster-truth-readiness.md", `# Data Roster Truth Readiness

As of: ${asOf}

## P0 Finding

Roster truth is launch-critical. The app data cannot be verified in this workspace because no app source, DB, data files, or validation scripts are visible.

## Canary Refresh

| Player | Current source-backed finding | Launch meaning |
| --- | --- | --- |
| Najee Harris | Chargers official active roster page opened on ${asOf} did not include Najee Harris; NFL.com shows 2025 Chargers news and 2026 free-agent/visit context; Spotrac lists him as 2026 UFA. Treat current team as unresolved/free agent unless a current official signing source is found. | App must not show him as Steelers or confidently as Chargers without current source evidence. |
| Rico Dowdle | Steelers official player page lists Rico Dowdle as #13 RB; NFL.com reports Steelers signing; Steelers page shows 2025 CAR stats and current Steelers bio page. | App must not show him as Cowboys or Panthers current team. |

## Trusted Data

Official team roster/player pages and NFL.com transaction/player pages are preferred. Secondary sources can support but not override official/current team evidence.

## Untrusted Data

Hardcoded examples, stale fantasy exports, old season stats treated as current team, mock JSON, and unversioned generated data.

## Launch Blockers

- No app roster data visible.
- No roster canary script visible in this workspace.
- Najee/Rico examples remain unverified in the app.

## Minimum Fix Before Launch

Locate shipping clone; run official-source canaries; fail launch if stale team assignments appear on public player, Rating, Player Lab, Track Record, or content surfaces.
`);

write("audits/website-design-experience-readiness.md", simpleAudit("Website Design Experience Readiness", `Site-war-room and help-education-ux define the aesthetic direction: premium sports command center, 10-second comprehension, no raw JSON, video/how-to on complex items, mobile-first, accessible, fast, and method-safe.`));
write("audits/support-system-readiness.md", simpleAudit("Support System Readiness", `Launch minimum: support entry point, help center, onboarding, billing/refund/cancellation templates, responsible gambling escalation, bug report capture, support-to-build-card loop, and confused-user rescue.`));
write("audits/monetization-promotions-readiness.md", simpleAudit("Monetization Promotions Readiness", `FREE/PRO/ELITE and pricing need verified UI/checkout. Promotions must remain shell-only with no live sportsbook/casino/DFS/fantasy links until founder/legal approval.`));
write("audits/content-seo-brand-readiness.md", simpleAudit("Content SEO Brand Readiness", `Launch minimum: human homepage/product/pricing/support copy, no-bet/risk copy, source/citation patterns, Daily Brief/product content bridge, glossary, SEO metadata, and no fake certainty.`));
write("audits/analytics-finance-readiness.md", simpleAudit("Analytics Finance Readiness", `Launch minimum: page, signup, rating, player, upgrade, checkout, support, content, and promotion-shell events. No raw sensitive text, payment data, precise location, or methodology leakage.`));
write("audits/infrastructure-security-qa-readiness.md", simpleAudit("Infrastructure Security QA Readiness", `Required checks in real clone: typecheck, lint, tests, build, route probes, Playwright/mobile screenshots, accessibility, performance, method leakage, mock/demo leakage, roster validation, live-link scan, auth/admin gates, entitlement gates, secrets scan.`));

// Discovery and suggestions.
write("discovery/opportunity-inventory.csv", csv(Object.keys(allOpps[0]), allOpps));
write("discovery/10-discovery-lab.md", `# Discovery Lab

As of: ${asOf}

## Top Launch-Relevant Opportunities

${table(["ID","Title","Owner","Priority","Build"], baseOpportunities.slice(0, 50).map((o) => [o[0], o[2], o[6], o[7], `BUILD-${o[8]}`]))}

## Top Post-Launch Growth Opportunities

${table(["ID","Title","Owner","Priority","Build"], postLaunch.slice(0, 50).map((o) => [o[0], o[2], o[6], o[7], `BUILD-${o[8]}`]))}

## Top Creative / Moat Opportunities

${table(["ID","Title","Owner","Priority","Build"], creative.slice(0, 25).map((o) => [o[0], o[2], o[6], o[7], `BUILD-${o[8]}`]))}

## Revenue Opportunities

Pricing ladder, checkout integrity, annual/lifecycle monetization, promotions after approval, affiliate reconciliation, partner/sponsor pipeline, enterprise reports, Daily Brief/newsletter, ELITE success lane.

## Trust Opportunities

Roster truth, source freshness, Track Record receipts, no-bet education, human copy, method-safe explanations, support clarity, accessibility, and launch evidence archive.

## Risk-Reduction Opportunities

Method leakage scan, live-link blocker, roster canary gate, legal surface minimum, privacy-safe analytics, auth/admin gate audit, feature flag/rollback map.
`);

const suggestions = [
  ["Kill","Any public raw JSON, stale player examples, casino/tout urgency, duplicate build-card noise, unsupported launch claims."],
  ["Merge","Scattered launch docs into command-center launch scorecards; analytics schemas into one event contract; help/design work into route-level site polish."],
  ["Fix","Real app source locator, roster canaries, route screenshots, typecheck/lint/build/test proof, method leakage scan, mobile readability."],
  ["Build","Launch stoplight dashboard, roster canary gate, homepage 10-second hero, Rating above fold, Player Lab current-team trust, support minimum."],
  ["Polish","Human copy, visual hierarchy, subcategory labels, data card readability, locked states, pricing use cases, Galaxy Studios help."],
  ["Monetize","FREE/PRO/ELITE use-case ladder, lifecycle upgrades, Daily Brief, watchlists, ELITE lane, legal-gated promotions, enterprise reports."],
  ["Protect","Founder methodology, customer trust, responsible gambling boundaries, legal approvals, secrets, data freshness, privacy-safe analytics."],
  ["Automate","Source freshness checks, roster canary scans, support-to-build-card, release evidence archive, Claude handoff packet, copy/method leakage scans."],
  ["Measure","Activation, rating/player views, watchlists, help opens, upgrade clicks, checkout, support, content, promotions shell, freshness failures."],
  ["Teach","Every proprietary item needs title, summary, status badges, visual body, how-to, source/trust cue, next action."],
  ["Surprise","No-Bet Hall of Fame, Signal Timeline, Player Risk Passport, Source Conflict Theater, EdgeBall Lab, Daily Edge Brief Studio."],
];
write("discovery/11-suggestion-engine.md", `# Suggestion Engine

As of: ${asOf}

${table(["Category","Suggestion"], suggestions)}

Every suggestion needs owner, priority, first action, test/verification, and Codex/Claude handoff in the build queue before execution.
`);

// Launch.
write("launch/launch-blockers.csv", csv(["title","classification","evidence","affected_surface","severity","owner_department","required_fix","test_required","approval_required","build_card","status"], blockers.map((b, i) => ({
  title: b[0],
  classification: b[1],
  evidence: b[2],
  affected_surface: b[3],
  severity: b[4],
  owner_department: b[5],
  required_fix: b[6],
  test_required: b[7],
  approval_required: b[8],
  build_card: `BUILD-${masterBuilds[i]?.[0] ?? "CMD-090"}`,
  status: b[1] === "BLOCKER" ? "RED" : "YELLOW",
}))));
write("launch/12-launch-blocker-triage.md", `# Launch Blocker Triage

As of: ${asOf}

${table(["Title","Classification","Evidence","Surface","Severity","Owner","Required Fix"], blockers.map((b) => b.slice(0, 7)))}

## Current Launch Decision

NO-GO from this workspace. The app implementation, tests, screenshots, roster data, and release gates are unverified.
`);
write("launch/launch-readiness-scorecard.csv", csv(["area","status","score","evidence","blocker","owner","required_action","target_resolution","claude_final_task"], scoreRows()));
write("launch/13-launch-readiness-scorecard.md", `# Launch Readiness Scorecard

As of: ${asOf}

${table(["Area","Status","Score","Evidence","Required Action"], readinessAreas)}

## Overall Score

Current command-center launch score: 32/100 from this workspace. This is not a product quality score; it is an evidence score. It should rise after the real shipping clone is found and verified.
`);

// Agents and operations.
const agents = [
  ["Research Agent","source-led research, web when needed, docs synthesis","read-only","questions, source ledgers","research packets","on demand","unknown or source conflict","training/research-style via product-strategist.md","fake claims"],
  ["Repo Auditor","repo truth, route inventory, git status","read-only","cwd, git, files","audit ledgers","daily during launch","missing app clone","training/qa-release-tester.md","parent repo confusion"],
  ["Data Accuracy Agent","roster/source canaries","read-only unless approved","official sources, app data","canary report","daily/NFL change windows","conflicts/stale data","training/roster-truth-analyst.md","stale public data"],
  ["UX Agent","visual/IA/mobile review","route screenshots","screenshots, site-war-room","UX report","weekly/prelaunch","mobile/accessibility fail","training/ux-reviewer.md","pretty but unclear"],
  ["Copy Auditor","human/method-safe copy","docs/routes copy","public copy","rewrite diff/report","prelaunch/release","fake certainty/method leakage","training/brand-voice-auditor.md","hype"],
  ["Growth Agent","funnels/lifecycle","analytics/copy only","events, pricing, support","growth queue","weekly","billing/promotions approval","training/growth-operator.md","pressure selling"],
  ["Promotions Compliance Agent","affiliate/promo safety","read-only until approval","offers/legal copy","approval queue","before promo work","live link or legal uncertainty","training/promotions-affiliate-operator.md","illegal link"],
  ["Support Agent","support minimum","docs/templates","support issues","support runbook","daily launch","harm/billing/legal issue","training/customer-support-agent.md","bad escalation"],
  ["Content Agent","brief/articles/SEO","docs/content","source-backed inputs","content plan","weekly","unsupported claims","training/content-editor.md","stale content"],
  ["Analytics Agent","event contracts/dashboards","code/docs when approved","event taxonomy","analytics report","weekly","privacy concern","training/analytics-engineer.md","overtracking"],
  ["QA Agent","release gates","tests/screenshots","code, routes","evidence archive","every release","test fail","training/qa-release-tester.md","false green"],
  ["DevOps Agent","CI/secrets/deploy/rollback","config only with approval","env/CI","release infra report","prelaunch","secret/deploy risk","training/devops-security-operator.md","secret leak"],
  ["Finance Agent","unit economics","docs/dashboards","revenue/cost inputs","finance scorecard","weekly","unknown pricing/payout","training/finance-operator.md","bad assumptions"],
  ["Sales Agent","partners/enterprise","CRM docs only","prospects","pipeline","weekly","legal promises","training/sales-partnership-operator.md","overclaim"],
  ["Legal/Compliance Agent","legal/promotions/responsible gambling","read-only/review","copy/offers/rules","approval memo","before risky launch","unapproved legal issue","training/legal-compliance-reviewer.md","noncompliance"],
  ["Claude Handoff Agent","final verification/polish","real clone with approval","command center","verified final report","final pass","claim mismatch","training/claude-handoff-specialist.md","assumption"],
];
write("agents/agent-roster.csv", csv(["role","tools","permissions","inputs","outputs","cadence","escalation_rules","training_file","failure_modes"], agents.map((a) => ({
  role: a[0], tools: a[1], permissions: a[2], inputs: a[3], outputs: a[4], cadence: a[5], escalation_rules: a[6], training_file: a[7], failure_modes: a[8],
}))));
write("agents/19-ai-agent-operating-system.md", `# AI Agent Operating System

As of: ${asOf}

Agents operate as read-first, evidence-first workers. They do not deploy, mutate production data, launch live affiliate links, expose methodology, or mark work complete without proof.

${table(["Agent","Tools","Permissions","Cadence","Escalation"], agents.map((a) => [a[0], a[1], a[2], a[5], a[6]]))}
`);

write("operations/20-operating-cadence.md", `# Operating Cadence

As of: ${asOf}

## Daily Launch Standup

Owner: Executive / Founder Command. Inputs: blockers, readiness scorecard, app/source evidence, data canaries, support issues. Output: top three actions and escalations.

## Weekly Product Review

Owner: Product Strategy. Inputs: route scorecards, customer confusion, analytics, support issues. Output: surface priorities.

## Weekly Data Accuracy Review

Owner: NFL Data Accuracy / Roster Truth. Inputs: source freshness, canaries, conflicts. Output: data launch status.

## Weekly Design Review

Owner: Website / UX / Visual Design. Inputs: screenshots, mobile, accessibility, copy. Output: polish queue.

## Weekly Monetization Review

Owner: Growth / Monetization. Inputs: pricing, funnel events, support objections. Output: conversion queue.

## Weekly Support Review

Owner: Customer Support / Customer Success. Inputs: support categories, confusion, bugs. Output: help/build cards.

## Weekly Compliance Review

Owner: Legal / Compliance / Responsible Gambling. Inputs: promotions, contests, copy, tracking. Output: approvals/blocks.

## Final Launch Go/No-Go

All RED blockers must be closed with evidence. GRAY areas affecting launch must become GREEN/YELLOW or be explicitly accepted by founder.

## Post-Launch First 7 Days

Daily: support, errors, roster freshness, analytics, conversion, cancellations/refunds, copy confusion, performance.

## Post-Launch First 30 Days

Weekly: retention, content, support themes, revenue, product usage, affiliate readiness, source reliability, roadmap adjustment.
`);

// Build queue.
mkdirp(cardsDir);
const jsonl = [];
for (const b of masterBuilds) {
  const fileName = `${b[0]}-${slug(b[1])}.md`;
  fs.writeFileSync(path.join(cardsDir, fileName), buildCard(b), "utf8");
  jsonl.push({
    id: `BUILD-${b[0]}`,
    title: b[1],
    category: b[2],
    priority: b[3],
    difficulty: b[4],
    duplicate_check_status: b[5],
    matched_existing_ids: b[6],
    relation_to_existing: "command-center consolidation / launch ownership",
    reason_not_duplicate: "Adds ownership, evidence, verification, or cross-department launch control rather than duplicating implementation details.",
    parent_id: b[6][0] ?? "",
    supersedes_id: "",
    dependency_ids: b[6],
    launch_blocker: b[2] === "launch blocker" || b[0] === "CMD-003" || b[0] === "CMD-004",
    must_have: ["P0", "P1"].includes(b[3]),
    must_fix: b[3] === "P0",
    post_launch: ["P2", "P3"].includes(b[3]),
    creative_moat: b[2].includes("creative"),
    risk_reduction: /risk|compliance|security|data|QA|roster|trust/i.test(b[2]),
    claude_prompt_file: `docs/command-center/build-queue/cards/${fileName}`,
    notes: b[7],
  });
}
write("build-queue/build-queue.jsonl", jsonl.map((row) => JSON.stringify(row)).join("\n"));
write("build-queue/index.md", `# Master Build Queue

As of: ${asOf}

This queue is non-duplicative by design. It adds launch ownership, department routing, evidence requirements, and Claude handoff around existing domain build queues.

${table(["ID","Title","Category","Priority","Difficulty","Gate"], masterBuilds.map((b) => [`BUILD-${b[0]}`, b[1], b[2], b[3], b[4], b[5]]))}
`);

// Handoff.
write("handoff/23-claude-final-handoff.md", `# Claude Final Handoff

As of: ${asOf}

## Current Branch / Repo Status

Visible git commands resolve to parent C:/Users/Garrett on branch master. This folder is docs/control only and does not expose the shipping app.

## What Codex Audited

Visible docs/research/reports/logs/apps, prior research packets, build queues, route references, launch blockers, departments, training, and current web roster canary evidence.

## What Codex Changed

Created docs/command-center plus generated ledgers, departments, training manuals, audits, launch scorecards, master build queue, agent OS, operating cadence, and Claude handoff.

## What Codex Did Not Change

No production app code, no production DB, no deployment, no live affiliate links, no pricing/payment configuration.

## Launch Blockers

Real app clone not located; roster canaries unverified in app; no typecheck/lint/build/test proof; no screenshots; method leakage unknown; promotions legally gated.

## Claude Instructions

Verify Codex claims. Do not assume. Locate real app clone. Run tests. Inspect pages. Capture screenshots. Polish design/copy. Preserve reveal-less methodology. Do not deploy without approval. Report launch recommendation clearly.
`);
write("handoff/claude-final-handoff-prompt.md", `# Claude Final Handoff Prompt

You are Claude Code in the real Galaxy Sports Edge / GSN shipping clone. Use docs/command-center as the control plane. Verify repo root, branch, dirty state, package manager, routes, scripts, Prisma/data, env boundaries, and tests. Do not deploy, mutate production DB, change pricing/payments, add live affiliate links, or expose founder methodology. Start with BUILD-CMD-001, then resolve RED blockers in launch/12-launch-blocker-triage.md. Run tests, capture screenshots, verify Najee Harris and Rico Dowdle roster canaries from current official sources, polish design/copy, and return a GO/NO-GO with evidence.
`);
write("handoff/claude-page-checklist.md", `# Claude Page Checklist

Check homepage, GSE Rating, players, Player Lab, Track Record, pricing, promotions shell, brief/content, support, account, cockpit/admin gate, mobile, empty/loading/error states.
`);
write("handoff/claude-copy-polish-checklist.md", `# Claude Copy Polish Checklist

Human, direct, no fake certainty, no sportsbook/tout hype, no method leakage, clear next action, clear risk/freshness, clear support path.
`);
write("handoff/claude-design-polish-checklist.md", `# Claude Design Polish Checklist

10-second comprehension, premium sports command center, readable subcategories, no raw JSON, mobile-safe, accessible, performant, useful motion, visual hierarchy.
`);
write("handoff/claude-launch-verification-checklist.md", `# Claude Launch Verification Checklist

Typecheck, lint, tests, build, route probes, Playwright/screenshots, mobile, accessibility, performance, roster canaries, method leakage, mock/demo leakage, live affiliate link scan, auth/admin gates, entitlement gates, checkout/pricing if approved.
`);

write("24-final-critic-review.md", `# Final Critic Review

As of: ${asOf}

1. Repo inspected first: yes, visible workspace audited.
2. Prior Codex/Claude work inspected: Codex/research yes; Claude implementation unknown.
3. Duplicate builds prevented: yes, master queue uses extension/dependency gates.
4. Department ownership created: yes.
5. Worker training created: yes, ${trainingRoles.length} manuals.
6. Missing opportunities discovered: yes, ${allOpps.length} opportunities.
7. Suggestions beyond blockers: yes.
8. Launch vs post-launch separated: yes.
9. Data accuracy audited: yes, but app data unknown.
10. Roster truth audited: yes, canaries refreshed from web/current sources; app data unknown.
11. Product surfaces audited: yes, mostly GRAY.
12. Website/design audited: yes, app screenshots blocked.
13. Monetization/promotions audited: yes, promotions legal-gated.
14. Support/content/brand audited: yes.
15. Analytics/finance audited: yes.
16. Infrastructure/security/QA audited: yes, app gates blocked.
17. Operating cadence created: yes.
18. Safe implementation changes: docs and safe tooling only.
19. Real build queue created: yes, ${masterBuilds.length} cards.
20. Claude handoff prepared: yes.
21. Unknowns marked: yes.
22. Unsafe changes avoided: yes.
23. Is project launchable today from this workspace: no.
24. Preventing launch: no app clone proof, roster app data unverified, no tests/build/screenshots, method/promotions gates unknown.
25. Exceptional path: launch with roster truth, premium teachable UX, no-bet trust, support minimum, analytics, founder cockpit, and Claude final polish evidence.
`);

write("25-final-report.md", `# Final Report

As of: ${asOf}

## 1. Executive Summary

The command center is now the top-level operating system for launch and post-launch growth. It consolidates prior research and build queues, assigns departments, trains workers, separates launch blockers from ideas, and prepares Claude final handoff.

## 2. Current Project State

Docs/control layer is strong. App implementation layer is not visible in this workspace. Launch readiness must remain NO-GO until the real shipping clone is audited.

## 3. Prior Codex/Claude Work Synthesis

Codex/research packets exist across OSS, growth, contests, roster truth, help/design, and site war-room. Claude implementation claims are unverified here.

## 4. Duplicate/Contradiction Findings

Many lower-level build cards already exist. The master queue creates launch ownership/verification cards instead of duplicating.

## 5. Launch Readiness Score

32/100 evidence score from this workspace.

## 6. Launch Blockers

Real app clone not located, roster canaries unverified in app, no test/build proof, no screenshots, method leakage unknown, promotions legally gated.

## 7. Must-Fix Before Launch

Resolve RED blockers, verify roster truth, run tests, capture screenshots, scan method/mock/live-link risks, prove pricing/checkout if launching paid plans.

## 8. Must-Have Before Launch

Support minimum, human copy, 10-second homepage, Rating/Player Lab clarity, analytics minimum, mobile/accessibility pass.

## 9. Post-Launch Backlog

Personalization, Rating Movers, Daily Brief, lifecycle automation, affiliate admin after approval, finance dashboards, AI agents, community/EdgeBall.

## 10. Discovery Lab Findings

${allOpps.length} opportunities generated across launch, post-launch, and creative/moat categories.

## 11. Best Suggestions

Kill raw JSON/stale examples; merge scattered launch docs; fix app verification and roster data; build command dashboard; monetize safely; protect method and responsible-use boundaries.

## 12. Biggest Blind Spots

Actual app source, live routes, DB/data, tests, deployment, analytics implementation, pricing config, support UI, and current screenshots.

## 13. Department Operating Model

20 departments created with ownership, metrics, workflows, definitions of ready/done, and escalation rules.

## 14. Worker Training Summary

${trainingRoles.length} worker manuals created.

## 15. Product Readiness

GRAY. Strong product research exists; implementation must be verified.

## 16. Data/Roster Readiness

RED. P0 because stale NFL team data destroys trust.

## 17. Website/Design Readiness

GRAY/YELLOW. Strong site-war-room and help layer exist; screenshots/app source are blocked.

## 18. Monetization/Promotions Readiness

Pricing/checkout unknown. Promotions must remain shell-only until legal/founder approval.

## 19. Support/Content/Brand Readiness

Research and training exist. Launch implementation unknown.

## 20. Analytics/Finance Readiness

Event/finance plans exist. Implementation unknown.

## 21. Infrastructure/Security/QA Readiness

RED/GRAY. No scripts/tests/build visible in this workspace.

## 22. AI Agent Operating Model

Agent roster created with permissions, cadence, escalation, training links, and failure modes.

## 23. Operating Cadence

Daily launch standup, weekly reviews, final go/no-go, first 7 days, first 30 days created.

## 24. Master Build Queue Summary

${masterBuilds.length} duplicate-gated command-center cards created.

## 25. Safe Code Changes Made

Generated docs and safe scripts only. No production app code changed.

## 26. Tests/Checks Run

Run validation after generation; app tests blocked until real clone is located.

## 27. Screenshots Captured

None. No app/dev server visible.

## 28. Claude Final Handoff Summary

Claude handoff packet created. Claude must verify, run tests, capture screenshots, and polish before launch recommendation.

## 29. Human Approvals Needed

Deploy, production DB, pricing/payment, legal copy, live affiliate/promotions, contests/prizes, public methodology language, paid services, aggressive tracking.

## 30. Final Launch Recommendation

NO-GO from this workspace. Proceed to real shipping clone verification and RED blocker closure.

## 31. Unknowns

App source, current branch/history, package scripts, route behavior, DB, deployment, data freshness, tests, screenshots, analytics, pricing, auth/admin gates.
`);

// Support directories for screenshots.
write("screenshots/design-audit/README.md", `# Design Audit Screenshots

No screenshots captured by this command-center generation because no runnable app source/dev server is visible in this workspace. Capture desktop/mobile before/after screenshots in the real shipping clone.
`);

// Scanner.
writeRoot("reports/codex/command-center/validate-command-center.mjs", `import fs from "fs";
import path from "path";
const root = process.cwd();
const base = path.join(root, "docs", "command-center");
const cards = fs.readdirSync(path.join(base, "build-queue", "cards")).filter((f) => f.endsWith(".md"));
const lines = fs.readFileSync(path.join(base, "build-queue", "build-queue.jsonl"), "utf8").trim().split(/\\r?\\n/);
const ids = new Set();
let dup = 0;
let missingGate = 0;
for (const line of lines) {
  const row = JSON.parse(line);
  if (ids.has(row.id)) dup++;
  ids.add(row.id);
  if (!row.duplicate_check_status || !row.reason_not_duplicate || !row.relation_to_existing) missingGate++;
}
function countFiles(dir) {
  let count = 0;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) count += countFiles(p);
    else count++;
  }
  return count;
}
console.log(JSON.stringify({
  command_center_files: countFiles(base),
  cards: cards.length,
  jsonl_rows: lines.length,
  duplicate_ids: dup,
  missing_duplicate_gate_fields: missingGate,
  valid: dup === 0 && missingGate === 0 && cards.length === lines.length
}, null, 2));
`);

console.log(JSON.stringify({
  output: "docs/command-center",
  visible_files: visibleFiles.length,
  artifacts: artifactRows.length,
  research_docs: researchRows.length,
  existing_build_items: buildRows.length,
  departments: departments.length,
  training_manuals: trainingRoles.length,
  opportunities: allOpps.length,
  master_build_cards: masterBuilds.length,
}, null, 2));


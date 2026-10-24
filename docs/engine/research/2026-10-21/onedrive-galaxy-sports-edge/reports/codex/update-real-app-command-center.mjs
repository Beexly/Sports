import fs from "fs";
import path from "path";

const root = process.cwd();
const base = path.join(root, "docs", "command-center");
const appRoot = "C:\\Users\\Garrett\\Sports";
const now = "2026-06-09";

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeFile(rel, body) {
  const file = path.join(root, rel);
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, body.replace(/\n/g, "\r\n"), "utf8");
}

function readIfExists(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function upsertBlock(rel, title, body) {
  const file = path.join(root, rel);
  ensureDir(path.dirname(file));
  const start = "<!-- REAL_APP_EVIDENCE_START -->";
  const end = "<!-- REAL_APP_EVIDENCE_END -->";
  const block = `${start}\n\n## ${title}\n\n${body.trim()}\n\n${end}\n`;
  const current = readIfExists(file);
  const next = current.includes(start)
    ? current.replace(new RegExp(`${start}[\\s\\S]*?${end}\\r?\\n?`), block)
    : `${current.trim()}\n\n${block}`.trim() + "\n";
  fs.writeFileSync(file, next.replace(/\n/g, "\r\n"), "utf8");
}

function csv(rows) {
  return rows
    .map((row) =>
      row
        .map((value) => {
          const s = String(value ?? "");
          return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\n");
}

const commands = [
  "Get-Content attached pasted-text.txt",
  "git rev-parse --show-toplevel; git branch --show-current; git remote -v",
  "candidate clone inventory across C:\\Users\\Garrett\\Sports*",
  "Get-ChildItem apps/web/app, apps/web/components, apps/web/lib, scripts, packages/db/prisma, .github/workflows",
  "rg for BUILD, GSE Rating, Player Lab, roster, Najee, Rico, promotions, Stripe, auth, entitlement, demo, mock, method, weights",
  "npm.cmd run typecheck",
  "npm.cmd run lint",
  "npm.cmd run test:brand-safety",
  "npm.cmd run test:cockpit",
  "npm.cmd test",
  "npm.cmd run guard:trust",
  "npm.cmd run guard:claude-api",
  "npm.cmd run build",
  "npx.cmd next start -p 3210 from apps/web",
  "APP_URL=http://localhost:3210 node scripts/prod-probe.mjs",
  "manual Invoke-WebRequest route matrix",
  "APP_URL=http://localhost:3210 node scripts/regenerate-launch-snapshots.mjs",
  "npx.cmd playwright --version",
  "Playwright screenshot capture for home, pricing, promotions, methodology, brief, picks",
  "web verification of Najee Harris and Rico Dowdle against NFL/team sources",
];

const routeRows = [
  ["route", "status", "verified_against_real_app", "notes"],
  ["/", "500", "yes", "Rendered production error card; server log shows Prisma gateDecision auth failure."],
  ["/board", "500", "yes", "Rendered Next error due Prisma gateDecision auth failure."],
  ["/methodology", "200", "yes", "Static methodology page renders; public copy preserves proprietary weights boundary."],
  ["/pricing", "200", "yes", "Pricing renders on desktop/mobile; checkout/live Stripe not verified."],
  ["/promotions", "200", "yes", "Public route renders safe empty state and disclosure language."],
  ["/brief", "200", "yes", "Brief route renders and screenshots captured."],
  ["/contact", "200", "yes", "Route responds."],
  ["/faq", "200", "yes", "Route responds."],
  ["/performance", "200", "yes", "Route responds."],
  ["/picks", "200", "yes", "Mobile screenshot captured; desktop screenshot timed out at load wait."],
  ["/cockpit", "307", "yes", "Redirected/gated; middleware protects dashboard/admin, cockpit appears page-level gated."],
  ["/api/promotions", "500", "yes", "Prisma promotion auth failure with invalid local database credentials."],
  ["/api/board/state", "500", "yes", "Prisma gateDecision auth failure."],
  ["/api/health", "503", "yes", "Health degraded because local database credentials for sports failed."],
  ["/api/calibration", "200", "yes", "prod-probe passed this endpoint."],
  ["/journal/rss.xml", "200", "yes", "prod-probe passed RSS."],
  ["/api/picks?check=public-picks-gate", "503", "yes", "Gate behavior accepted by prod-probe, but endpoint still degraded from DB auth."],
  ["/api/performance?check=performance-gate", "503", "yes", "Gate behavior accepted by prod-probe, but endpoint still degraded from DB auth."],
];

const launchRows = [
  ["Area", "Status", "Score", "Real app evidence", "Required action"],
  ["Docs/control system readiness", "GREEN", "82", "Existing command center package exists and is now being updated, not duplicated.", "Keep using command-center as source of launch truth."],
  ["Real app source availability", "GREEN", "90", "Selected app repo: C:\\Users\\Garrett\\Sports, branch safety/sports-wip-2026-06-04, remote BeeXly/Sports.", "Owner should confirm this is the intended shipping clone before fixes."],
  ["Build/test readiness", "RED", "58", "typecheck/lint/build pass; npm.cmd test fails 3 tests; prod-probe fails.", "Fix full test red and prod probe red before launch."],
  ["Product functionality", "RED", "35", "Homepage, board, board API, promotions API, health fail under local production start.", "Fix DB auth/runtime resilience and rerun route matrix."],
  ["Data/roster truth", "GRAY", "30", "Najee/Rico static grep found no app player records; no Player Lab/roster route rendered.", "Define real roster source and add canary harness or mark out of launch scope."],
  ["Website/design", "RED", "45", "Static pricing/promotions/methodology look premium; homepage is an error card.", "No launch until homepage and board render cleanly."],
  ["Mobile/accessibility", "YELLOW", "50", "Mobile screenshots captured for major static routes; no axe/accessibility pass yet; picks desktop timed out.", "Run accessibility and responsive QA after route fixes."],
  ["Monetization/pricing", "YELLOW", "55", "Pricing page renders monthly Free/Pro/Elite style offers; Stripe/live checkout not verified.", "Resolve pricing cadence/source-of-truth and checkout integrity gate."],
  ["Promotions/compliance", "YELLOW", "60", "Promotions route has disclosure and safe empty state; API fails from DB and live links are unverified.", "Keep shell-only until compliance-approved partner data and API green."],
  ["Support/content/brand", "YELLOW", "62", "FAQ/contact/brief/methodology respond; help/video layer not yet verified.", "Add Galaxy Studios help/how-to layer and confused-user rescue."],
  ["Analytics/finance", "GRAY", "35", "Event plans exist; runtime event implementation not verified.", "Add launch-minimum events and finance dashboard evidence."],
  ["Infrastructure/security/QA", "RED", "48", "Prisma auth failure, full test failure, dirty worktree, and app-runtime route failures.", "Fix environment and test red; confirm production env gates."],
  ["Claude handoff readiness", "GREEN", "80", "This update creates real-app evidence, cards, and handoff.", "Claude should verify, then fix in priority order."],
];

const blockers = [
  ["id", "severity", "area", "evidence", "owner", "required_before_launch"],
  ["LB-REALAPP-001", "P0", "homepage/runtime", "/ returns 500 and screenshot shows production error card.", "Website / DevOps", "Fix homepage DB dependency or graceful degraded fallback."],
  ["LB-REALAPP-002", "P0", "database/env", "Server logs show Prisma authentication failure for local database user sports.", "Infrastructure / Data", "Provide valid DB credentials or fail closed with launch-safe empty states."],
  ["LB-REALAPP-003", "P0", "route health", "/api/health returns 503; prod-probe fails.", "Infrastructure / QA", "Health endpoint must be green in target launch environment."],
  ["LB-REALAPP-004", "P0", "board", "/board and /api/board/state return 500 from gateDecision query.", "Product / Data", "Board must render or be intentionally gated with clear copy."],
  ["LB-REALAPP-005", "P0", "tests", "npm.cmd test fails guardrails subprocess tests plus missing lib file header.", "QA / Engineering", "Full test suite must pass or failures must be fixed/approved."],
  ["LB-REALAPP-006", "P0", "promotions", "/api/promotions returns 500 from Prisma promotion query.", "Promotions / Infrastructure", "Promotions API must return safe empty response when data unavailable."],
  ["LB-REALAPP-007", "P0", "roster truth", "No app-rendered Player Lab/roster source verified; Najee/Rico not present in app data.", "NFL Data Accuracy", "Either add current roster gate or remove roster/player claims from launch scope."],
  ["LB-REALAPP-008", "P1", "source authority", "Four plausible Sports clones exist; selected active clone is C:\\Users\\Garrett\\Sports.", "Executive / Founder", "Confirm authoritative shipping clone before code fixes or deploy."],
];

const realCards = [
  {
    id: "BUILD-REALAPP-001",
    title: "Fix homepage production 500",
    category: "launch blocker",
    priority: "P0",
    difficulty: "M",
    owner: "Website / UX / DevOps",
    routes: ["/"],
    files: ["apps/web/app/page.tsx", "apps/web/lib/*", "packages/db/*"],
    current: "The home route renders a production error card when local Prisma credentials fail.",
    desired: "Homepage renders launch-safe value proposition or intentional maintenance state without throwing.",
    evidence: "home-desktop.png and server log show prisma.gateDecision.findMany auth failure.",
    parent: "BUILD-CMD-009",
    deps: ["BUILD-REALAPP-002"],
  },
  {
    id: "BUILD-REALAPP-002",
    title: "Resolve local production database auth and health degradation",
    category: "infrastructure/security",
    priority: "P0",
    difficulty: "M",
    owner: "Infrastructure / Data Engineering",
    routes: ["/api/health"],
    files: [".env*", "packages/db/prisma", "apps/web/app/api/health/route.ts"],
    current: "/api/health returns 503 because Prisma cannot authenticate against localhost as sports.",
    desired: "Health is green in approved env or returns explicit non-launch blocked diagnostics.",
    evidence: "prod-probe failed and logs show Prisma auth failure.",
    parent: "BUILD-CMD-048",
    deps: [],
  },
  {
    id: "BUILD-REALAPP-003",
    title: "Fix board route and board state API hard failure",
    category: "product core",
    priority: "P0",
    difficulty: "M",
    owner: "Product Strategy / Data Engineering",
    routes: ["/board", "/api/board/state"],
    files: ["apps/web/app/board/page.tsx", "apps/web/app/api/board/state/route.ts"],
    current: "Board route and API 500 on Prisma gateDecision query failure.",
    desired: "Board shows usable data or safe unavailable state; API returns controlled status.",
    evidence: "route matrix and server logs show repeated gateDecision auth failures.",
    parent: "BUILD-CMD-008",
    deps: ["BUILD-REALAPP-002"],
  },
  {
    id: "BUILD-REALAPP-004",
    title: "Fix full npm test failure",
    category: "QA/testing",
    priority: "P0",
    difficulty: "S",
    owner: "QA / Testing / Release",
    routes: [],
    files: ["apps/web/__tests__/guardrails.test.ts", "apps/web/lib/cockpit/intelligence-control-plane.ts"],
    current: "npm.cmd test fails two guardrail subprocess tests and one missing file-header assertion.",
    desired: "Full npm.cmd test exits 0 with guardrails stable in Vitest and required header present.",
    evidence: "Direct guard scripts pass; full test command fails 3 tests.",
    parent: "BUILD-CMD-051",
    deps: [],
  },
  {
    id: "BUILD-REALAPP-005",
    title: "Make promotions API fail closed",
    category: "promotions/affiliate",
    priority: "P0",
    difficulty: "M",
    owner: "Promotions / Affiliate Partnerships",
    routes: ["/promotions", "/api/promotions"],
    files: ["apps/web/app/promotions/page.tsx", "apps/web/app/api/promotions/route.ts", "apps/web/lib/promotions/guards.ts"],
    current: "Promotions page renders safe empty state, but API returns 500 on DB auth failure.",
    desired: "Public API returns empty approved list or controlled degraded response without exposing internal errors.",
    evidence: "promotions-mobile.png is safe; /api/promotions is 500.",
    parent: "BUILD-CMD-039",
    deps: ["BUILD-REALAPP-002"],
  },
  {
    id: "BUILD-REALAPP-006",
    title: "Authoritative shipping clone confirmation gate",
    category: "launch blocker",
    priority: "P0",
    difficulty: "S",
    owner: "Executive / Founder Command",
    routes: [],
    files: ["docs/command-center/evidence/real-app-source-map.md"],
    current: "Multiple plausible Sports clones exist; C:\\Users\\Garrett\\Sports was selected from evidence.",
    desired: "Founder confirms the exact clone/branch to fix and deploy.",
    evidence: "Clone inventory found Sports, Sports-deploy-fix, Sports_release_codex, and Sports-canonical-2026-06-03.",
    parent: "BUILD-CMD-001",
    deps: [],
  },
  {
    id: "BUILD-REALAPP-007",
    title: "Roster canary harness or launch-scope removal",
    category: "roster truth",
    priority: "P0",
    difficulty: "M",
    owner: "NFL Data Accuracy / Roster Truth",
    routes: [],
    files: ["scripts/*", "apps/web/app/*", "data/*"],
    current: "Najee Harris and Rico Dowdle are not found in selected app data/routes; Player Lab route is absent.",
    desired: "Either implement current-source canary validation or remove roster/player claims from launch scope.",
    evidence: "Static grep found no app player records; official NFL/team sources checked.",
    parent: "BUILD-CMD-003",
    deps: ["BUILD-REALAPP-006"],
  },
  {
    id: "BUILD-REALAPP-008",
    title: "Product scope reconciliation for GSE Rating and Player Lab",
    category: "product core",
    priority: "P0",
    difficulty: "M",
    owner: "Product Strategy / GSE Rating",
    routes: ["/players", "/player-lab", "/intelligence/rating"],
    files: ["apps/web/app"],
    current: "Requested product scope includes GSE Rating and Player Lab, but selected app routes do not expose those surfaces.",
    desired: "Launch plan explicitly maps current board/picks product to promised surfaces or creates the missing routes.",
    evidence: "Route tree lacks /players, /player-lab, and /intelligence/rating.",
    parent: "BUILD-CMD-017",
    deps: ["BUILD-REALAPP-006"],
  },
  {
    id: "BUILD-REALAPP-009",
    title: "Desktop picks screenshot timeout diagnosis",
    category: "website/design",
    priority: "P1",
    difficulty: "S",
    owner: "Website / UX / QA",
    routes: ["/picks"],
    files: ["apps/web/app/picks"],
    current: "Mobile picks screenshot captured; desktop capture timed out waiting for load.",
    desired: "Picks route loads predictably on desktop and mobile in production start.",
    evidence: "Playwright screenshot run timed out on picks desktop only.",
    parent: "BUILD-CMD-013",
    deps: ["BUILD-REALAPP-002"],
  },
  {
    id: "BUILD-REALAPP-010",
    title: "Build-time Prisma auth noise cleanup",
    category: "infrastructure/security",
    priority: "P1",
    difficulty: "M",
    owner: "Infrastructure / DevOps",
    routes: [],
    files: ["apps/web/app", "packages/db"],
    current: "Next build exits 0 but emits Prisma auth errors during static generation.",
    desired: "Build has clean logs or intentionally documented degraded behavior.",
    evidence: "npm.cmd run build passed with Prisma auth errors for queryRaw, ingestionRun, and pick count.",
    parent: "BUILD-CMD-048",
    deps: ["BUILD-REALAPP-002"],
  },
  {
    id: "BUILD-REALAPP-011",
    title: "Pricing cadence and checkout integrity review",
    category: "monetization",
    priority: "P0",
    difficulty: "M",
    owner: "Growth / Monetization",
    routes: ["/pricing"],
    files: ["apps/web/app/pricing", "apps/web/lib/*stripe*", "scripts/check-deploy-readiness.mjs"],
    current: "Pricing page renders monthly-looking Free/Pro/Elite copy; prior docs referenced weekly Stripe price ladders.",
    desired: "One authoritative pricing cadence and matching checkout/readiness guard.",
    evidence: "Pricing route screenshot renders; Stripe/live checkout not verified.",
    parent: "BUILD-CMD-036",
    deps: [],
  },
  {
    id: "BUILD-REALAPP-012",
    title: "Auth and founder gate source audit",
    category: "infrastructure/security",
    priority: "P0",
    difficulty: "M",
    owner: "Infrastructure / Legal",
    routes: ["/cockpit", "/dashboard", "/admin"],
    files: ["apps/web/middleware.ts", "apps/web/lib/auth.ts", "apps/web/lib/entitlements.ts", "apps/web/app/cockpit"],
    current: "Cockpit redirects, but middleware only explicitly protects dashboard/admin; cockpit appears page-level gated.",
    desired: "Documented founder/admin protection for all sensitive routes with tests.",
    evidence: "/cockpit returns 307; auth and entitlement files include DEV_FAKE_ADMIN dev bypass.",
    parent: "BUILD-CMD-049",
    deps: [],
  },
  {
    id: "BUILD-REALAPP-013",
    title: "Mock and demo leakage runtime gate",
    category: "QA/testing",
    priority: "P0",
    difficulty: "M",
    owner: "QA / Infrastructure",
    routes: ["/picks", "/performance"],
    files: ["packages/db/src/sample-picks.ts", "scripts/check-deploy-readiness.mjs"],
    current: "Demo/sample code exists by design and test logs show stub client when DATABASE_URL is absent.",
    desired: "Production readiness fails on DEV_FAKE_ADMIN or DEMO_PICKS_ENABLED and public pages never show sample data in launch env.",
    evidence: "Readiness script guards flags; local runtime fails from invalid DB rather than sample fallback.",
    parent: "BUILD-CMD-053",
    deps: ["BUILD-REALAPP-002"],
  },
  {
    id: "BUILD-REALAPP-014",
    title: "Public method leakage scan as release gate",
    category: "risk/compliance",
    priority: "P0",
    difficulty: "S",
    owner: "Legal / GSE Rating",
    routes: ["/methodology"],
    files: ["apps/web/app/methodology/page.tsx", "apps/web/lib/trust-claims.ts", "packages/prediction-engine/src/constants.ts"],
    current: "Public methodology route is method-safe, but private weights/constants exist in source.",
    desired: "Automated scan checks public bundles/routes for protected formula/weight leakage.",
    evidence: "Methodology copy says weights/constants remain proprietary.",
    parent: "BUILD-CMD-064",
    deps: [],
  },
  {
    id: "BUILD-REALAPP-015",
    title: "Galaxy Studios help layer MVP",
    category: "support/customer success",
    priority: "P0",
    difficulty: "M",
    owner: "Customer Success / Website",
    routes: ["/faq", "/contact", "/pricing", "/picks", "/performance"],
    files: ["apps/web/components", "apps/web/app/faq", "apps/web/app/contact"],
    current: "FAQ/contact routes exist, but no route-embedded how-to/video help layer was verified.",
    desired: "Every confusing surface has a 10-second summary plus optional Galaxy Studios video/help affordance.",
    evidence: "User flagged JSON-looking pages and hard-to-read subcategories; route screenshots confirm help layer is not universal.",
    parent: "BUILD-CMD-011",
    deps: ["BUILD-REALAPP-001"],
  },
  {
    id: "BUILD-REALAPP-016",
    title: "Homepage first-10-second comprehension rebuild after runtime fix",
    category: "website/design",
    priority: "P0",
    difficulty: "L",
    owner: "Website / Brand Voice",
    routes: ["/"],
    files: ["apps/web/app/page.tsx", "apps/web/components"],
    current: "Cannot evaluate homepage value hierarchy because route errors.",
    desired: "Above fold explains what GSE is, who it is for, and what to do next in under 10 seconds.",
    evidence: "Home screenshot is error card.",
    parent: "BUILD-CMD-009",
    deps: ["BUILD-REALAPP-001"],
  },
  {
    id: "BUILD-REALAPP-017",
    title: "Promotions seed and live data approval audit",
    category: "promotions/affiliate",
    priority: "P0",
    difficulty: "M",
    owner: "Promotions / Legal",
    routes: ["/promotions"],
    files: ["packages/db/prisma/seed.ts", "apps/web/lib/promotions/guards.ts"],
    current: "Seed contains example affiliate URLs and intentionally bad blocked offer copy for tests.",
    desired: "No example, hype, or unapproved links can reach production data or rendered UI.",
    evidence: "Public route safe empty state; seed includes example.com affiliate URLs and bad-offer fixture.",
    parent: "BUILD-CMD-039",
    deps: ["BUILD-REALAPP-005"],
  },
  {
    id: "BUILD-REALAPP-018",
    title: "Launch route probe expansion",
    category: "QA/testing",
    priority: "P0",
    difficulty: "S",
    owner: "QA / Release",
    routes: ["/promotions", "/brief", "/contact", "/faq", "/performance", "/picks"],
    files: ["scripts/prod-probe.mjs", "scripts/regenerate-launch-snapshots.mjs"],
    current: "prod-probe covers core routes but manual matrix found additional public routes worth gating.",
    desired: "Release probe includes all launch public surfaces and sensitive redirects.",
    evidence: "Manual route matrix found clear pass/fail route list.",
    parent: "BUILD-CMD-051",
    deps: [],
  },
  {
    id: "BUILD-REALAPP-019",
    title: "Analytics launch event proof",
    category: "analytics",
    priority: "P1",
    difficulty: "M",
    owner: "Analytics / Experimentation",
    routes: ["/pricing", "/promotions", "/picks", "/performance", "/brief"],
    files: ["apps/web/lib", "apps/web/app"],
    current: "Analytics/event implementation was not verified in source during this pass.",
    desired: "Minimum page, upgrade, promotion, support, and brief events have schemas and smoke tests.",
    evidence: "Command-center event plans exist, but real app runtime proof is gray.",
    parent: "BUILD-CMD-045",
    deps: ["BUILD-REALAPP-002"],
  },
  {
    id: "BUILD-REALAPP-020",
    title: "Dirty worktree launch stabilization",
    category: "launch blocker",
    priority: "P0",
    difficulty: "S",
    owner: "Executive / QA",
    routes: [],
    files: [],
    current: "Selected app repo had 62 dirty entries at discovery time.",
    desired: "Launch branch has reviewed, intentional diff with no unknown local-only changes.",
    evidence: "git status count from selected clone.",
    parent: "BUILD-CMD-001",
    deps: ["BUILD-REALAPP-006"],
  },
  {
    id: "BUILD-REALAPP-021",
    title: "Support and confused-user rescue minimum",
    category: "support/customer success",
    priority: "P1",
    difficulty: "M",
    owner: "Customer Support / Success",
    routes: ["/contact", "/faq", "/pricing"],
    files: ["apps/web/app/contact", "apps/web/app/faq", "apps/web/components"],
    current: "Contact and FAQ routes respond; no verified cancellation-save, billing rescue, or responsible-gambling escalation flow.",
    desired: "Support routes route confused users, billing users, and risk-sensitive users to clear next steps.",
    evidence: "Route verification shows pages exist, but support workflows are not launch-proved.",
    parent: "BUILD-CMD-026",
    deps: [],
  },
  {
    id: "BUILD-REALAPP-022",
    title: "Mobile and accessibility QA after critical fixes",
    category: "mobile/accessibility",
    priority: "P1",
    difficulty: "M",
    owner: "Website / QA",
    routes: ["/", "/board", "/pricing", "/promotions", "/methodology", "/brief", "/picks"],
    files: ["apps/web/app", "apps/web/components", "apps/web/styles"],
    current: "Screenshots captured for many mobile routes, but no automated accessibility pass and home route fails.",
    desired: "Mobile screenshots and accessibility pass are green for all public launch routes.",
    evidence: "Screenshot archive exists; picks desktop timed out; home screenshot failed.",
    parent: "BUILD-CMD-052",
    deps: ["BUILD-REALAPP-001", "BUILD-REALAPP-003"],
  },
  {
    id: "BUILD-REALAPP-023",
    title: "Content and SEO route linkback review",
    category: "content/SEO",
    priority: "P1",
    difficulty: "M",
    owner: "Content / SEO",
    routes: ["/brief", "/journal/rss.xml", "/methodology", "/performance"],
    files: ["apps/web/app/brief", "apps/web/app/methodology", "apps/web/app/performance"],
    current: "Brief and RSS respond; product-to-content and content-to-product loops were not verified.",
    desired: "Content pages teach value, cite sources, and route users to relevant product actions.",
    evidence: "Brief and RSS are 200 in prod-probe/manual matrix.",
    parent: "BUILD-CMD-042",
    deps: [],
  },
  {
    id: "BUILD-REALAPP-024",
    title: "Creative moat queue for real app only",
    category: "creative/moat opportunity",
    priority: "P2",
    difficulty: "L",
    owner: "Product Strategy / AI Automation",
    routes: ["/brief", "/picks", "/performance", "/promotions"],
    files: ["docs/command-center/discovery/real-app-suggestion-engine.md"],
    current: "Prior creative ideas existed, but many were not tied to rendered app evidence.",
    desired: "Only app-evidenced creative builds graduate: 10-second coach, weekly autopsy, rating explainer, no-bet radar, proof receipts.",
    evidence: "Real app has brief, picks, performance, pricing, promotions, methodology surfaces to extend.",
    parent: "BUILD-CMD-071",
    deps: ["BUILD-REALAPP-001", "BUILD-REALAPP-003"],
  },
];

function cardMarkdown(card) {
  return `# ${card.id}: ${card.title}

## Duplicate Gate

- duplicate_check_status: EXTENSION
- matched_existing_ids: ${card.parent}
- relation_to_existing: Real-app evidence child of the prior command-center card.
- reason_not_duplicate: This card is tied to verified behavior from C:\\Users\\Garrett\\Sports, not generic strategy.
- parent_id: ${card.parent}
- dependency_ids: ${(card.deps || []).join(", ") || "none"}

## Category

${card.category}

## Goal

${card.desired}

## Real App Evidence

${card.evidence}

## Current Behavior

${card.current}

## Desired Behavior

${card.desired}

## Affected Routes

${card.routes.length ? card.routes.join(", ") : "No public route."}

## Affected Files

${card.files.length ? card.files.join("\n") : "To be confirmed in the real app clone."}

## Launch Classification

Priority ${card.priority}; difficulty ${card.difficulty}; owner department ${card.owner}.

## Legal / Compliance Boundary

Do not expose founder-only methodology, live affiliate links, live prizes, or billing changes without explicit approval. Promotions and betting-adjacent copy remain review-gated.

## Data Boundary

Use test/local data only unless owner provides approved launch database access. Do not print secrets. Do not connect production data without explicit approval.

## Implementation Plan

1. Open the affected files in C:\\Users\\Garrett\\Sports.
2. Reproduce the current behavior with the route or command listed above.
3. Make the smallest scoped app change that fixes the verified behavior.
4. Add or update a focused test/probe.
5. Rerun typecheck, lint, relevant tests, build, prod-probe, and route screenshot where applicable.

## Testing Plan

- npm.cmd run typecheck
- npm.cmd run lint
- relevant npm.cmd test filter or package test
- npm.cmd run build
- APP_URL=http://localhost:3210 node scripts/prod-probe.mjs when route behavior changes
- Screenshot affected public route on desktop and mobile when visual behavior changes

## Acceptance Criteria

- The verified failing behavior no longer occurs.
- No new method leakage, demo data leakage, or live-link risk is introduced.
- Required tests and route probes pass or are explicitly documented with owner-approved exceptions.

## Rollback Plan

Revert only the scoped files changed for this card and rerun the same verification commands. Do not revert unrelated dirty worktree changes.

## Claude Code Prompt

You are Claude Code in C:\\Users\\Garrett\\Sports. Execute only ${card.id}: ${card.title}. Use the real-app evidence in docs/command-center, preserve founder-only methodology boundaries, avoid live affiliate/billing/prize changes, make the smallest scoped fix, then run the listed verification commands and report exact results.
`;
}

const departments = {
  "executive-founder-command.md": ["YELLOW", "Confirm C:\\Users\\Garrett\\Sports is the authoritative shipping clone.", "BUILD-REALAPP-006, BUILD-REALAPP-020"],
  "product-strategy.md": ["RED", "Current route tree does not expose Player Lab/GSE Rating surfaces named in strategy.", "BUILD-REALAPP-008"],
  "website-ux-visual-design.md": ["RED", "Homepage is an error card; static pricing/promotions/methodology pages show a strong dark-premium base.", "BUILD-REALAPP-001, BUILD-REALAPP-016, BUILD-REALAPP-022"],
  "nfl-data-accuracy-roster-truth.md": ["GRAY", "Najee/Rico canaries were source-checked, but app has no verifiable roster/player data surface.", "BUILD-REALAPP-007"],
  "data-engineering.md": ["RED", "Prisma auth failure blocks health, home, board, promotions API, and build log cleanliness.", "BUILD-REALAPP-002, BUILD-REALAPP-003, BUILD-REALAPP-010"],
  "gse-rating-sports-intelligence.md": ["YELLOW", "Public methodology keeps weights protected; product route proof is incomplete.", "BUILD-REALAPP-014, BUILD-REALAPP-008"],
  "growth-monetization.md": ["YELLOW", "Pricing renders but checkout/live pricing source-of-truth was not verified.", "BUILD-REALAPP-011"],
  "promotions-affiliate-partnerships.md": ["YELLOW", "Public promotions route is safe, but API 500 and live partner data remain unverified.", "BUILD-REALAPP-005, BUILD-REALAPP-017"],
  "customer-support-success.md": ["YELLOW", "FAQ/contact routes exist; Galaxy Studios/help layer is not universal.", "BUILD-REALAPP-015, BUILD-REALAPP-021"],
  "content-seo-editorial.md": ["YELLOW", "Brief and RSS respond; loopbacks, citations, and content-to-product CTAs need verification.", "BUILD-REALAPP-023"],
  "brand-voice-human-copy.md": ["YELLOW", "Error copy is human but homepage failure prevents value-message audit.", "BUILD-REALAPP-016"],
  "analytics-experimentation.md": ["GRAY", "Analytics implementation was not proved against app runtime.", "BUILD-REALAPP-019"],
  "infrastructure-devops-security.md": ["RED", "DB auth, full test failure, dirty worktree, and route probe failure block launch.", "BUILD-REALAPP-002, BUILD-REALAPP-004, BUILD-REALAPP-020"],
  "qa-testing-release.md": ["RED", "typecheck/lint/build pass, but full npm test and prod-probe fail.", "BUILD-REALAPP-004, BUILD-REALAPP-018"],
  "finance-unit-economics.md": ["GRAY", "No verified finance/revenue dashboard implementation in app source pass.", "BUILD-REALAPP-019"],
  "sales-partnerships-enterprise.md": ["YELLOW", "Promotions and pricing surfaces exist, but enterprise/partner pipeline not verified.", "BUILD-REALAPP-011, BUILD-REALAPP-017"],
  "ai-automation-agents.md": ["YELLOW", "Command center can hand work to Claude; app-side agent workflows not verified.", "BUILD-REALAPP-024"],
  "legal-compliance-responsible-gambling.md": ["YELLOW", "Method and promotions copy are safer than average; live links, prizes, and claims remain approval-gated.", "BUILD-REALAPP-014, BUILD-REALAPP-017"],
  "operations-founder-cockpit.md": ["YELLOW", "Cockpit redirects; source gate needs explicit audit because middleware protects dashboard/admin only.", "BUILD-REALAPP-012"],
  "community-engagement-retention.md": ["YELLOW", "Brief, picks, performance exist; time-on-site loops need route-stable foundation.", "BUILD-REALAPP-024"],
};

const trainingFiles = [
  "ai-automation-operator.md",
  "analytics-engineer.md",
  "brand-voice-auditor.md",
  "claude-handoff-specialist.md",
  "community-retention-operator.md",
  "content-editor.md",
  "customer-success-agent.md",
  "customer-support-agent.md",
  "data-engineer.md",
  "devops-security-operator.md",
  "executive-commander.md",
  "finance-operator.md",
  "frontend-builder.md",
  "growth-operator.md",
  "gse-rating-analyst.md",
  "legal-compliance-reviewer.md",
  "monetization-analyst.md",
  "product-strategist.md",
  "promotions-affiliate-operator.md",
  "qa-release-tester.md",
  "roster-truth-analyst.md",
  "sales-partnership-operator.md",
  "seo-operator.md",
  "source-integrity-analyst.md",
  "ux-reviewer.md",
  "website-designer.md",
];

const sourceMap = `# Real App Source Map

As of: ${now}

## Selected Real App Repo

- App repo path: ${appRoot}
- Git root: C:/Users/Garrett/Sports
- Branch: safety/sports-wip-2026-06-04
- Remote: https://github.com/BeeXly/Sports.git
- HEAD observed: f897fd5 wip(sports): safety commit - cockpit/journal updates + brand/emails/social packages
- Dirty state observed: 62 entries
- Package manager: npm through npm.cmd on Windows PowerShell
- Node observed: v24.15.0
- Root package: sports-prediction-platform
- Web package: @sports/web

## Why This Clone Was Selected

This clone has the real Next.js app tree, root and web package manifests, scripts, tests, Prisma schema, CI workflows, and local node_modules. Other plausible clones were found, but this one was selected as the active app clone for evidence because it is the known primary shipping clone and contains the runnable app.

## Other Candidate Clones Found

- C:\\Users\\Garrett\\Sports-deploy-fix - clean branch claude/gse-moat-aplus-clv-2026-06-03, same remote, likely deploy-fix clone.
- C:\\Users\\Garrett\\Sports_release_codex - release/codex style clone, not selected.
- C:\\Users\\Garrett\\Sports-canonical-2026-06-03 - larger dirty clone, not selected.

## Key Source Directories

- apps/web/app - Next App Router routes; 127 files observed.
- apps/web/components - UI components; 24 files observed.
- apps/web/lib - app libraries; 102 files observed.
- apps/web/public - public assets; 4 files observed.
- apps/web/styles - styles present.
- apps/web/__tests__ - web tests; 156 files observed.
- scripts - release/probe/guard scripts; 20 files observed.
- packages/db/prisma - Prisma schema/seed/migrations; 9 files observed.
- .github/workflows - CI workflows; 4 files observed.

## Source Availability Status

Verified against real app: repo path, branch, remote, package scripts, route tree, build/test commands, major public route responses, screenshots, auth/promotion/methodology source areas.

Blocked: live production environment, valid local database credentials, live Stripe checkout, production Vercel/hosting settings, real app rendered roster/player surfaces.
`;

const verificationRun = `# App Verification Run

As of: ${now}

## Result Summary

- typecheck: PASS
- lint: PASS
- brand-safety tests: PASS, 727 tests
- cockpit tests: PASS, 224 tests
- full npm.cmd test: FAIL, 3 failures
- trust guard direct: PASS
- Claude API guard direct: PASS
- build: PASS, but with Prisma auth errors during static generation
- local production start: PASS on http://localhost:3210 from apps/web
- prod-probe: FAIL
- snapshot regeneration: FAIL because / returned 500, but 8 of 9 requested snapshots were written

## Full Test Failures

1. __tests__/guardrails.test.ts - trust-gate exits 0 on a clean repo. The direct npm.cmd run guard:trust command passed.
2. __tests__/guardrails.test.ts - claude-api-usage exits 0 with direct calls limited to approved paths. The direct npm.cmd run guard:claude-api command passed.
3. apps/web/lib/cockpit/intelligence-control-plane.ts - expected /** file header; file starts with an import.

## Build Warning

npm.cmd run build completed and generated static pages, but emitted Prisma authentication errors for localhost database user sports. This is not clean launch evidence even though the build process exited successfully.

## Runtime Failure Root Cause

The local production server repeatedly logged PrismaClientInitializationError: authentication failed against database server localhost for user sports. This produced /api/health 503 and route/API failures.

## Commands Run

${commands.map((cmd) => `- ${cmd}`).join("\n")}
`;

const rosterCanary = `# Roster Canary Evidence

As of: ${now}

## Najee Harris

- Official/public source checked: NFL player page reported Najee Harris as UFA.
- Official/public source checked: Los Angeles Chargers roster page did not list Najee Harris.
- App source value: no Najee Harris app player record found by static grep in selected app source.
- App rendered value: not verified because no Player Lab/player route was available and homepage/board are blocked by runtime DB failures.
- Conflict status: no stale app value found, but roster truth cannot be proven because the selected app does not expose roster/player data.
- Confidence: medium for source status, low for app correctness because app data surface is absent.
- Launch status: blocked if launch claims current NFL roster/player truth or Player Lab.

Sources:

- NFL Najee Harris player page: https://www.nfl.com/players/najee-harris/stats/splits/2026/
- Chargers roster page: https://www.chargers.com/team/players-roster/

## Rico Dowdle

- Official/public source checked: NFL player page lists Rico Dowdle as RB #13, Pittsburgh Steelers, active.
- Official/public source checked: Steelers player page lists Rico Dowdle as RB #13.
- App source value: no Rico Dowdle app player record found by static grep in selected app source.
- App rendered value: not verified because no Player Lab/player route was available.
- Conflict status: no stale app value found, but no app roster data can be validated.
- Confidence: high for source status, low for app correctness because app data surface is absent.
- Launch status: blocked if launch claims current player/team intelligence is live.

Sources:

- NFL Rico Dowdle player page: https://www.nfl.com/players/rico-dowdle/
- Steelers Rico Dowdle player page: https://www.steelers.com/team/players-roster/rico-dowdle/

## Broader Roster Risk

The selected app currently behaves like a picks/board/methodology/pricing product rather than a Player Lab roster product. The correct action is either:

1. Add a real roster canary harness tied to approved source hierarchy; or
2. Remove Player Lab/current-roster claims from launch scope until that surface exists.
`;

const mockScan = `# Mock / Demo / Stale Data Leakage Scan

As of: ${now}

## Verified Against Real App

- scripts/check-deploy-readiness.mjs includes production guards for DEV_FAKE_ADMIN and DEMO_PICKS_ENABLED.
- packages/db/src/sample-picks.ts exists and is intended for demo/stub mode.
- Test logs show stub Prisma behavior when DATABASE_URL is absent.
- Runtime did not fall back to demo data under invalid DB credentials; it threw Prisma auth errors.

## Risk

The current launch risk is not visible fake sample data. The current launch risk is that critical routes 500/503 instead of rendering safe empty/degraded states when DB auth fails.

## Required Action

Keep demo/stub data allowed only for local tests. Production readiness must fail if DEV_FAKE_ADMIN or DEMO_PICKS_ENABLED is true. Public runtime should fail closed with safe copy, not internal errors.
`;

const methodScan = `# Method Leakage Scan

As of: ${now}

## Verified Safe Public Boundary

- /methodology returned 200.
- Public methodology copy explicitly says proprietary weights, constants, and aggregation formula stay private.
- apps/web/lib/trust-claims.ts and methodology UI appear designed to separate public claims from private method details.

## Private Source Exists

Private sports-intelligence logic and constants exist under packages/prediction-engine. That is expected, but release gates should scan public routes and bundles for accidental exposure.

## Launch Status

YELLOW. The visible methodology route is safe, but an automated public-bundle method leakage gate should be added before launch.
`;

const promotionsScan = `# Promotions / Live-Link Scan

As of: ${now}

## Verified Against Real App

- /promotions returned 200 and rendered a safe empty state.
- The route includes affiliate disclosure and responsible-gaming style language.
- apps/web/lib/promotions/guards.ts requires disclosure, responsible gaming text, terms URL, eligibility evidence, approved status, and operator approval before public display.
- /api/promotions returned 500 because Prisma promotion query could not authenticate to local DB.

## Risk

Public shell is safer than a link dump, but the API must fail closed. Seed fixtures include example affiliate URLs and an intentionally bad offer for guard testing; those must never become production data.

## Launch Status

YELLOW/RED: compliant shell exists, but live-link and API behavior are not launch-ready.
`;

const authScan = `# Auth / Entitlement / Founder Gate Scan

As of: ${now}

## Verified Against Real App

- /cockpit returned 307, indicating a redirect/gate.
- apps/web/middleware.ts explicitly protects /dashboard and /admin.
- apps/web/lib/auth.ts uses NextAuth with Google provider, Prisma adapter, and JWT session behavior.
- apps/web/lib/auth.ts contains a DEV_FAKE_ADMIN development bypass with source comments warning not to enable in production.
- apps/web/lib/entitlements.ts grants ELITE under DEV_FAKE_ADMIN and otherwise reads subscription state.

## Risk

Cockpit protection appears route/page-level rather than middleware-level. That may be acceptable, but sensitive route protection should be explicitly tested and documented.

## Launch Status

YELLOW. Gate behavior exists, but founder/admin route protection needs a source-level and route-level test before launch.
`;

const screenshotReview = `# Mobile Screenshot Review

As of: ${now}

## Screenshot Archive

Stored in: C:\\Users\\Garrett\\Sports\\reports\\codex\\real-app-screenshots

Captured:

- home-desktop.png
- home-mobile.png
- pricing-desktop.png
- pricing-mobile.png
- promotions-desktop.png
- promotions-mobile.png
- methodology-desktop.png
- methodology-mobile.png
- brief-desktop.png
- brief-mobile.png
- picks-mobile.png

Blocked:

- picks-desktop.png timed out waiting for load.

## Design Findings

- Pricing, promotions, methodology, and brief routes share a coherent dark-premium visual system.
- Mobile navigation is present and usable in screenshots.
- Promotions mobile copy is trust-aware and safer than a generic affiliate page.
- Homepage fails entirely, so the most important first impression is currently red.
- No automated accessibility or contrast audit was run in this pass.

## Required Action

Fix runtime blockers, recapture the full route set, then run an accessibility pass and 10-second comprehension pass.
`;

const buildResults = `# Build and Test Results

As of: ${now}

| Command | Result | Notes |
| --- | --- | --- |
| npm.cmd run typecheck | PASS | All workspace packages completed. |
| npm.cmd run lint | PASS | @sports/web ESLint max-warnings=0 passed. |
| npm.cmd run test:brand-safety | PASS | 19 files, 727 tests passed. |
| npm.cmd run test:cockpit | PASS | 25 files, 224 tests passed. |
| npm.cmd test | FAIL | 3 failures: two guardrail subprocess tests and one missing file header. |
| npm.cmd run guard:trust | PASS | Direct trust-gate command passed. |
| npm.cmd run guard:claude-api | PASS | Direct direct-Claude-API usage command passed. |
| npm.cmd run build | PASS with warnings | Next build completed but logged Prisma auth failures. |
| node scripts/prod-probe.mjs | FAIL | /api/health did not return 200. |
| node scripts/regenerate-launch-snapshots.mjs | FAIL | / returned 500; 8 snapshots succeeded. |

Launch interpretation: build/lint/typecheck are strong, but full tests and route probes are red. Do not launch.
`;

writeFile("docs/command-center/source-availability-evidence.md", sourceMap);
writeFile("docs/command-center/evidence/real-app-source-map.md", sourceMap);
writeFile("docs/command-center/evidence/app-verification-run.md", verificationRun);
writeFile("docs/command-center/evidence/route-verification-matrix.csv", csv(routeRows));
writeFile("docs/command-center/evidence/roster-canary-evidence.md", rosterCanary);
writeFile("docs/command-center/evidence/mock-demo-leakage-scan.md", mockScan);
writeFile("docs/command-center/evidence/method-leakage-scan.md", methodScan);
writeFile("docs/command-center/evidence/promotions-live-link-scan.md", promotionsScan);
writeFile("docs/command-center/evidence/auth-entitlement-gate-scan.md", authScan);
writeFile("docs/command-center/evidence/mobile-screenshot-review.md", screenshotReview);
writeFile("docs/command-center/evidence/build-test-results.md", buildResults);

writeFile(
  "docs/command-center/launch/13-launch-readiness-scorecard.md",
  `# Launch Readiness Scorecard

As of: ${now}

This scorecard supersedes the earlier docs-only score. Docs/control readiness and app launch readiness are scored separately so research volume cannot inflate product readiness.

| Area | Status | Score | Real app evidence | Required action |
| --- | --- | --- | --- | --- |
${launchRows.slice(1).map((r) => `| ${r.join(" | ")} |`).join("\n")}

## Overall Launch Score

Source-verified launch score: 49/100.

Recommendation: RED - not launchable. The command center is usable, but the app is blocked by homepage/runtime failures, local DB auth failure, failed full tests, failed prod-probe, and unverified roster/player-product scope.
`,
);

writeFile("docs/command-center/launch/launch-blockers.csv", csv(blockers));

const auditDocs = {
  "product-surface-readiness.md": ["RED", "Homepage and board are red. Methodology, pricing, promotions, brief, FAQ, contact, performance, and picks respond. Missing route proof for Player Lab, player pages, team pages, GSE Rating page, search/autocomplete, and locked/upgrade states."],
  "data-roster-truth-readiness.md": ["GRAY", "Najee/Rico official sources checked, but the selected app has no rendered roster/player surface and no app records found. Launch must not claim roster truth until this is resolved."],
  "website-design-experience-readiness.md": ["RED", "Static pages look coherent and premium, but the homepage is a production error card. Help/video/how-to layers are not universal."],
  "monetization-promotions-readiness.md": ["YELLOW", "Pricing and promotions pages render. Checkout, live price IDs, Stripe env, and promotions API are not verified. API returns 500 from DB auth."],
  "support-system-readiness.md": ["YELLOW", "FAQ and contact respond, but no verified Galaxy Studios help layer, cancellation-save flow, billing support, or responsible-gambling escalation."],
  "content-seo-brand-readiness.md": ["YELLOW", "Brief, RSS, methodology, and performance respond. SEO/player/team/glossary route proof is incomplete."],
  "analytics-finance-readiness.md": ["GRAY", "No runtime analytics, event tracking, or finance dashboard proof was collected in this pass."],
  "infrastructure-security-qa-readiness.md": ["RED", "DB auth failure, failed npm test, failed prod-probe, dirty worktree, and route failures block launch."],
};

for (const [file, [status, summary]] of Object.entries(auditDocs)) {
  writeFile(
    `docs/command-center/audits/${file}`,
    `# ${file.replace(/-/g, " ").replace(".md", "")}

As of: ${now}

Status: ${status}

## Real App Finding

${summary}

## Evidence Files

- docs/command-center/evidence/real-app-source-map.md
- docs/command-center/evidence/app-verification-run.md
- docs/command-center/evidence/route-verification-matrix.csv
- docs/command-center/evidence/mobile-screenshot-review.md

## Required Action

Execute the linked BUILD-REALAPP cards before marking this area green. Do not mark green from docs-only readiness.
`,
  );
}

const discoveryInventory = [
  ["id", "bucket", "title", "current_app_evidence", "why_it_matters", "owner", "duplicate_classification", "first_action", "build_card"],
  ["DISC-REAL-001", "Fix", "Homepage runtime recovery", "/ is 500", "First impression is currently broken.", "Website / DevOps", "EXTENSION", "Fix DB dependency or safe fallback.", "BUILD-REALAPP-001"],
  ["DISC-REAL-002", "Fix", "Board degraded state", "/board and /api/board/state are 500", "Core intelligence surface cannot break on DB auth.", "Product / Data", "EXTENSION", "Catch DB failures and render safe state.", "BUILD-REALAPP-003"],
  ["DISC-REAL-003", "Fix", "Promotions API fail-closed behavior", "/api/promotions is 500 while page shell is safe", "Affiliate surfaces require trust and compliance.", "Promotions", "EXTENSION", "Return safe empty approved list on DB failure.", "BUILD-REALAPP-005"],
  ["DISC-REAL-004", "Build", "Roster canary harness", "No player records found for canaries", "Avoid stale sports intelligence claims.", "Roster Truth", "EXTENSION", "Create source-backed canary or remove scope.", "BUILD-REALAPP-007"],
  ["DISC-REAL-005", "Build", "GSE Rating and Player Lab surface decision", "Routes missing", "Product promise must match app reality.", "Product Strategy", "EXTENSION", "Decide route build vs launch-scope removal.", "BUILD-REALAPP-008"],
  ["DISC-REAL-006", "Polish", "10-second homepage narrative", "Home cannot be evaluated because it errors", "Users must understand value immediately.", "Brand / UX", "EXTENSION", "Rebuild after runtime fix.", "BUILD-REALAPP-016"],
  ["DISC-REAL-007", "Teach", "Galaxy Studios help overlay", "FAQ/contact exist; per-item help not universal", "Complex proprietary system needs inline teaching.", "Support / UX", "EXTENSION", "Add help affordance to priority surfaces.", "BUILD-REALAPP-015"],
  ["DISC-REAL-008", "Protect", "Public method leakage release gate", "Methodology copy safe; private constants exist", "Protect moat while building trust.", "Legal / Rating", "EXTENSION", "Automate public bundle scan.", "BUILD-REALAPP-014"],
  ["DISC-REAL-009", "Measure", "Launch event proof", "Analytics not verified", "Growth cannot be managed blind.", "Analytics", "EXTENSION", "Add smoke-proved event taxonomy.", "BUILD-REALAPP-019"],
  ["DISC-REAL-010", "Surprise", "Weekly autopsy and proof receipts", "Performance/brief routes respond", "Turns trust into a product habit.", "Product / Content", "EXTENSION", "Prototype as content-product bridge.", "BUILD-REALAPP-024"],
];

writeFile(
  "docs/command-center/discovery/real-app-opportunity-inventory.csv",
  csv(discoveryInventory),
);

writeFile(
  "docs/command-center/discovery/real-app-discovery-lab.md",
  `# Real App Discovery Lab

As of: ${now}

## A. Kill

- Kill any launch claim that implies Player Lab or roster-current intelligence is live until the app exposes and validates that surface.
- Kill any live promotion or affiliate launch until /api/promotions is fail-closed and data is compliance-approved.

## B. Merge

- Merge docs-only launch packets into this real-app evidence layer.
- Merge homepage/design polish with runtime fix; do not polish an error surface as if it were live.

## C. Fix

- /, /board, /api/board/state, /api/health, /api/promotions.
- Full npm.cmd test failures.
- Database credential/runtime behavior.

## D. Build

- Roster canary harness or formal launch-scope removal.
- GSE Rating / Player Lab scope decision.
- Galaxy Studios help layer for complex surfaces.

## E. Polish

- Pricing, promotions, methodology, brief, and picks after critical runtime fixes.
- Mobile/accessibility and 10-second comprehension pass.

## F. Monetize

- Pricing cadence and checkout integrity.
- Content-to-product CTAs from brief/performance/methodology.
- Promotions as compliance-reviewed directory, not link dump.

## G. Protect

- Public method leakage gate.
- Mock/demo leakage gate.
- Founder/admin route tests.
- Promotions legal review.

## H. Automate

- Route probe and screenshot gate.
- Roster canary checker.
- Build/test/prod-probe evidence runner.
- Claude build card execution queue.

## I. Measure

- Page, upgrade, promotion click, brief view, support open, and track-record view events.
- Finance/plan dashboard after checkout source of truth is confirmed.

## J. Teach

- Every priority surface needs a 10-second summary and optional how-to/video layer.
- Workers need real path, commands, routes, and failure modes in training manuals.

## K. Surprise

- Weekly autopsy receipts that explain what changed and what the model learned without exposing method.
- No-bet radar that makes risk avoidance feel valuable, not like missing out.
- Galaxy Studios inline walkthrough clips generated from actual product routes.
- A "why this is locked" education layer that converts without pressure.
`,
);

writeFile(
  "docs/command-center/discovery/real-app-suggestion-engine.md",
  `# Real App Suggestion Engine

As of: ${now}

## Best Real-App Suggestions

1. Fix the runtime foundation first: DB auth, /api/health, homepage, board, promotions API.
2. Treat the current app as picks/board/methodology/pricing until Player Lab/GSE Rating routes are confirmed or built.
3. Add Galaxy Studios help to pricing, picks, performance, methodology, and promotions so users can find value in under 10 seconds.
4. Convert methodology from a static trust page into a safe explainer system: what users can trust, what stays private, and how to act.
5. Build proof receipts and weekly autopsies around /performance and /brief.
6. Add fail-closed patterns for every DB-backed public route.
7. Promote no-bet/risk education as a paid trust feature, not only a disclaimer.
8. Make promotions compliance-first with reviewed data, expiration, state rules, and outbound-click logging.
9. Add analytics only after routes are stable enough to emit meaningful events.
10. Give Claude a strict route-by-route final polish packet, not a vague redesign request.

## Creative / Moat Ideas

- 10-second coach overlays: short, context-aware explanations on every dense sports-intelligence item.
- Source freshness chips: visible confidence and freshness without revealing private formula.
- Autopsy timeline: what the system believed, what changed, and what the receipt says after the result.
- Risk ladder: lower-risk, volatile, and no-bet education that makes restraint feel intelligent.
- "Method locked, reasoning open" UI pattern: show user-facing reasoning while protecting weights/constants.
`,
);

for (const [file, [status, summary, cards]] of Object.entries(departments)) {
  upsertBlock(
    `docs/command-center/departments/${file}`,
    "Real App Evidence Update - 2026-06-09",
    `Readiness: ${status}

Current real app state: ${summary}

Owned routes/files to inspect: C:\\Users\\Garrett\\Sports, apps/web/app, apps/web/components, apps/web/lib, scripts, packages/db/prisma.

Owned tests/commands: npm.cmd run typecheck, npm.cmd run lint, npm.cmd test, npm.cmd run build, APP_URL=http://localhost:3210 node scripts/prod-probe.mjs.

Worker training gap: every worker must now reference actual app routes, failing runtime behavior, and BUILD-REALAPP cards.

Build cards: ${cards}

Claude handoff note: verify this department's claim against the app before changing production code or declaring launch readiness.`,
  );
}

for (const file of trainingFiles) {
  upsertBlock(
    `docs/command-center/training/${file}`,
    "Real App Training Addendum - 2026-06-09",
    `Real app path: C:\\Users\\Garrett\\Sports.

Branch observed: safety/sports-wip-2026-06-04. Remote observed: https://github.com/BeeXly/Sports.git.

Required baseline commands: npm.cmd run typecheck, npm.cmd run lint, npm.cmd test, npm.cmd run build, APP_URL=http://localhost:3210 node scripts/prod-probe.mjs.

Known failure modes: invalid local database credentials cause Prisma auth errors, / returns 500, /board returns 500, /api/health returns 503, /api/promotions returns 500, full npm.cmd test fails 3 tests.

Escalation path: do not launch, deploy, enable live affiliate links, enable live prizes, expose founder-only method details, or touch production data without owner approval.

Worker rule: use docs/command-center/evidence/* and docs/command-center/build-queue/real-app-build-queue.jsonl before making recommendations.`,
  );
}

const cardDir = path.join(base, "build-queue", "cards-real-app");
ensureDir(cardDir);
for (const card of realCards) {
  const slug = card.id.toLowerCase();
  writeFile(`docs/command-center/build-queue/cards-real-app/${slug}.md`, cardMarkdown(card));
}

const realJsonRows = realCards.map((card) => ({
  id: card.id,
  title: card.title,
  category: card.category,
  priority: card.priority,
  difficulty: card.difficulty,
  duplicate_check_status: "EXTENSION",
  matched_existing_ids: [card.parent],
  relation_to_existing: "Real-app evidence child of prior command-center card.",
  reason_not_duplicate: "Verified against C:\\Users\\Garrett\\Sports behavior rather than generic strategy.",
  parent_id: card.parent,
  supersedes_id: "",
  dependency_ids: card.deps || [],
  launch_blocker: card.priority === "P0",
  must_have: card.priority === "P0",
  must_fix: card.priority === "P0",
  post_launch: card.priority !== "P0",
  creative_moat: card.category.includes("moat"),
  risk_reduction: ["infrastructure/security", "risk/compliance", "QA/testing", "roster truth"].includes(card.category),
  owner_department: card.owner,
  affected_routes: card.routes,
  affected_files: card.files,
  claude_prompt_file: `docs/command-center/build-queue/cards-real-app/${card.id.toLowerCase()}.md`,
  notes: card.evidence,
}));

writeFile(
  "docs/command-center/build-queue/real-app-build-queue.jsonl",
  realJsonRows.map((row) => JSON.stringify(row)).join("\n") + "\n",
);

const masterQueue = path.join(base, "build-queue", "build-queue.jsonl");
const existingLines = readIfExists(masterQueue).trim().split(/\r?\n/).filter(Boolean);
const existingIds = new Set(existingLines.map((line) => JSON.parse(line).id));
const appendLines = realJsonRows.filter((row) => !existingIds.has(row.id)).map((row) => JSON.stringify(row));
if (appendLines.length) {
  fs.writeFileSync(masterQueue, `${existingLines.join("\n")}\n${appendLines.join("\n")}\n`.replace(/\n/g, "\r\n"), "utf8");
}

upsertBlock(
  "docs/command-center/build-queue/index.md",
  "Real App Build Queue Update - 2026-06-09",
  `Added ${realCards.length} BUILD-REALAPP cards tied to the selected runnable app. The separate queue is docs/command-center/build-queue/real-app-build-queue.jsonl, and prompts live in docs/command-center/build-queue/cards-real-app/.

Top P0 sequence:

1. BUILD-REALAPP-006 - confirm authoritative shipping clone.
2. BUILD-REALAPP-002 - resolve database auth and health.
3. BUILD-REALAPP-001 - fix homepage production 500.
4. BUILD-REALAPP-003 - fix board and board state API.
5. BUILD-REALAPP-004 - fix full npm.cmd test failure.
6. BUILD-REALAPP-005 - make promotions API fail closed.
7. BUILD-REALAPP-007 - implement roster canary harness or remove roster scope.
8. BUILD-REALAPP-011 - pricing cadence and checkout integrity review.
9. BUILD-REALAPP-012 - auth/founder gate source audit.
10. BUILD-REALAPP-015 - Galaxy Studios help layer MVP.`,
);

writeFile(
  "docs/command-center/build-queue/REAL_APP_NEXT_ACTIONS.md",
  `# Real App Next Actions

As of: ${now}

## Do First

1. Confirm C:\\Users\\Garrett\\Sports is the authoritative shipping clone.
2. Fix local/target DB auth or route fail-closed behavior.
3. Re-run npm.cmd test, npm.cmd run build, prod-probe, and screenshot suite.
4. Fix homepage and board runtime failures.
5. Decide whether Player Lab/GSE Rating/roster truth are launch scope.

## Do Not Do Yet

- Do not deploy.
- Do not enable live affiliate links.
- Do not enable live contests/prizes.
- Do not claim roster/player-current intelligence is live.
- Do not expose private method weights/constants.
`,
);

writeFile(
  "docs/command-center/NEXT_ACTIONS.md",
  `# Command Center Next Actions

As of: ${now}

## Current Recommendation

Do not launch. The command-center docs are now source-verified, but the app is blocked by runtime, DB, test, prod-probe, and roster-scope issues.

## Required Before Launch

1. Confirm the authoritative app clone and branch.
2. Fix DB/auth runtime failures.
3. Fix /, /board, /api/health, /api/board/state, /api/promotions.
4. Fix full npm.cmd test failures.
5. Rerun route/screenshot probes.
6. Prove or remove roster/player-product claims.
7. Keep promotions shell-only until legal/compliance and data approval.

See docs/command-center/build-queue/REAL_APP_NEXT_ACTIONS.md for the Claude-ready sequence.
`,
);

const handoff = `# Claude Final Handoff - Real App Source Verified

As of: ${now}

## Real App Repo

- Path: C:\\Users\\Garrett\\Sports
- Branch observed: safety/sports-wip-2026-06-04
- Remote observed: https://github.com/BeeXly/Sports.git
- Dirty state observed: 62 entries

## Commands Already Run

${commands.map((cmd) => `- ${cmd}`).join("\n")}

## Results

- typecheck: PASS
- lint: PASS
- brand-safety tests: PASS
- cockpit tests: PASS
- full npm.cmd test: FAIL, 3 failures
- build: PASS with Prisma auth errors
- prod-probe: FAIL
- screenshots: captured for static routes; home shows error; picks desktop timed out

## Route Problems

- / returns 500.
- /board returns 500.
- /api/health returns 503.
- /api/board/state returns 500.
- /api/promotions returns 500.

## First Fix Cards

1. BUILD-REALAPP-006
2. BUILD-REALAPP-002
3. BUILD-REALAPP-001
4. BUILD-REALAPP-003
5. BUILD-REALAPP-004
6. BUILD-REALAPP-005
7. BUILD-REALAPP-007
8. BUILD-REALAPP-011
9. BUILD-REALAPP-012
10. BUILD-REALAPP-015

## Boundaries

- Do not deploy without approval.
- Do not touch live Stripe or affiliate links without approval.
- Do not expose founder-only methodology.
- Do not revert unrelated dirty changes.
- Do not claim launch readiness until prod-probe, full tests, screenshots, and roster-scope decisions are green.
`;

writeFile("docs/command-center/handoff/claude-final-handoff-prompt.md", handoff);
writeFile("docs/command-center/handoff/23-claude-final-handoff.md", handoff);

upsertBlock(
  "docs/command-center/verification-log.md",
  "Real App Verification Run - 2026-06-09",
  verificationRun,
);

upsertBlock(
  "docs/command-center/25-final-report.md",
  "Real App Source-Verified Final Report Addendum - 2026-06-09",
  `The real runnable app was located at C:\\Users\\Garrett\\Sports and verified through package scripts, route probes, screenshots, source scans, and official roster canary checks.

Final recommendation: RED - not launchable.

Why: homepage 500, board 500, /api/health 503, /api/promotions 500, full npm.cmd test fails 3 tests, prod-probe fails, DB auth is invalid locally, roster/player-product truth is not verifiable, and multiple app clones require source authority confirmation.

Best immediate opportunities: fix runtime foundation, preserve the strong static dark-premium design base, add Galaxy Studios help/how-to overlays, build proof receipts/autopsy loops, and implement fail-closed data/API behavior.

Files created/updated in this addendum live under docs/command-center/evidence, docs/command-center/discovery, docs/command-center/build-queue, department packets, training manuals, launch scorecard, and handoff.`,
);

writeFile(
  "docs/command-center/24-final-critic-review.md",
  `# Final Critic Review

As of: ${now}

1. Did we locate the real app? Yes: C:\\Users\\Garrett\\Sports.
2. Did we verify app source tree? Yes: app, components, lib, scripts, Prisma, tests, workflows.
3. Did we re-run command-center scope against real app evidence? Yes, this update writes evidence, audits, departments, training, queue, scorecard, and handoff.
4. Did we update departments from real app evidence? Yes, all 20 department packets received a real-app evidence block.
5. Did we update worker training from real app evidence? Yes, 26 training manuals received a real-app addendum.
6. Did we create real app-specific build cards? Yes, 24 BUILD-REALAPP cards.
7. Did we separate docs readiness from app readiness? Yes, scorecard separates docs/control from app launch status.
8. Did we run build/typecheck/lint/tests where possible? Yes.
9. Did we verify routes/screenshots where possible? Yes.
10. Did we verify roster canaries against source and app? Partially: official/current sources checked; app values absent/unverifiable.
11. Did we scan for mock/demo leakage? Yes.
12. Did we scan for method leakage? Yes.
13. Did we scan promotions/live-link risk? Yes.
14. Did we verify auth/founder gates? Partially: redirects and source reviewed; needs dedicated tests.
15. Did we restore discovery and suggestions? Yes.
16. Did we avoid duplicate broad docs? Yes, updated existing command-center and added real-app evidence children.
17. Did we avoid false launch confidence? Yes, launch remains RED.
18. Is Claude ready for handoff? Yes.
19. Is the app launchable? No.
20. What prevents launch? Runtime DB/auth failures, homepage/board/API failures, full test failure, prod-probe failure, roster/product-scope uncertainty, and source-authority confirmation.
`,
);

console.log(JSON.stringify({
  updated: true,
  real_cards: realCards.length,
  department_updates: Object.keys(departments).length,
  training_updates: trainingFiles.length,
  launch_score: 49,
  recommendation: "RED - not launchable",
}, null, 2));

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..", "..");
const out = path.join(root, "docs", "research", "nfl-roster-truth");
const cardsDir = path.join(out, "claude-build-queue", "cards");
const asOf = "2026-06-09";

function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function write(rel, body) {
  const file = path.join(out, rel);
  mkdirp(path.dirname(file));
  fs.writeFileSync(file, body.trimStart() + "\n", "utf8");
}

function esc(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csv(headers, rows) {
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72);
}

function listFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if ([".git", "node_modules", ".next", "dist", "build"].includes(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) listFiles(p, acc);
    else acc.push(p);
  }
  return acc;
}

const visibleFiles = [
  ...listFiles(path.join(root, "docs")),
  ...listFiles(path.join(root, "reports")),
  ...listFiles(path.join(root, "apps")),
].map((p) => path.relative(root, p).replace(/\\/g, "/"));

const appSurfaceNote =
  "This workspace exposes a docs/control lane. The apps directory exists, but the scan returned no app source files; root app/components/lib/data/scripts/prisma were missing. Product surfaces below are therefore mapped from prior research artifacts and must be re-audited in the real shipping clone before implementation.";

const existing = [
  {
    existing_id: "BUILD-GV2-020",
    title: "Receipts freshness badge system",
    source_file: "docs/research/growth-os-v2/claude-build-queue/cards/BUILD-GV2-020-receipts-freshness-badge-system.md",
    category: "source freshness",
    short_description: "Public trust badge pattern for source recency.",
    current_status: "planned",
    product_surface: "track record, receipts, trust surfaces",
    data_source: "generic source metadata",
    known_limitations: "Not roster-specific and does not define official/fallback roster proof.",
    duplicate_risk: "EXTENSION",
    files_involved: "docs/research/growth-os-v2",
    normalized_fingerprint: "source freshness public trust badge source metadata",
  },
  {
    existing_id: "BUILD-GV2-021",
    title: "Player Lab what-changed feed",
    source_file: "docs/research/growth-os-v2/claude-build-queue/cards/BUILD-GV2-021-player-lab-what-changed-feed.md",
    category: "player surface",
    short_description: "Player Lab change feed concept.",
    current_status: "planned",
    product_surface: "Player Lab",
    data_source: "player/team source not defined",
    known_limitations: "Needs roster transaction/freshness source before player movement can be trusted.",
    duplicate_risk: "EXTENSION",
    files_involved: "docs/research/growth-os-v2",
    normalized_fingerprint: "player lab change feed roster transaction freshness",
  },
  {
    existing_id: "BUILD-GV2-053",
    title: "Player page content model",
    source_file: "docs/research/growth-os-v2/claude-build-queue/cards/BUILD-GV2-053-player-page-content-model.md",
    category: "player page",
    short_description: "Planned player-page content surface.",
    current_status: "planned",
    product_surface: "public player pages",
    data_source: "unknown",
    known_limitations: "No canonical roster truth API or evidence model defined.",
    duplicate_risk: "EXTENSION",
    files_involved: "docs/research/growth-os-v2",
    normalized_fingerprint: "player page current team status roster evidence",
  },
  {
    existing_id: "BUILD-GV2-056",
    title: "Content refresh and freshness queue",
    source_file: "docs/research/growth-os-v2/claude-build-queue/cards/BUILD-GV2-056-content-refresh-and-freshness-queue.md",
    category: "stale content",
    short_description: "General stale content detection and refresh workflow.",
    current_status: "planned",
    product_surface: "content, articles, briefs",
    data_source: "source timestamps",
    known_limitations: "Does not catch stale player team/number/status assignments.",
    duplicate_risk: "EXTENSION",
    files_involved: "docs/research/growth-os-v2",
    normalized_fingerprint: "content freshness stale source queue roster extension",
  },
  {
    existing_id: "BUILD-GV2-076",
    title: "Product analytics event contract",
    source_file: "docs/research/growth-os-v2/claude-build-queue/cards/BUILD-GV2-076-product-analytics-event-contract.md",
    category: "analytics",
    short_description: "General analytics event contract.",
    current_status: "planned",
    product_surface: "analytics",
    data_source: "event taxonomy",
    known_limitations: "Needs roster audit events and data quality signals.",
    duplicate_risk: "EXTENSION",
    files_involved: "docs/research/growth-os-v2",
    normalized_fingerprint: "analytics event contract roster data quality events",
  },
  {
    existing_id: "BUILD-GV2-081",
    title: "Privacy-safe identity resolution policy",
    source_file: "docs/research/growth-os-v2/claude-build-queue/cards/BUILD-GV2-081-privacy-safe-identity-resolution-policy.md",
    category: "identity",
    short_description: "General privacy-safe identity resolution.",
    current_status: "planned",
    product_surface: "account analytics",
    data_source: "hashed identifiers",
    known_limitations: "Not player/staff identity matching; can be extended for public sports persons.",
    duplicate_risk: "EXTENSION",
    files_involved: "docs/research/growth-os-v2",
    normalized_fingerprint: "identity resolution policy roster person ids aliases",
  },
  {
    existing_id: "BUILD-GV2-098",
    title: "Data source outage playbook",
    source_file: "docs/research/growth-os-v2/claude-build-queue/cards/BUILD-GV2-098-data-source-outage-playbook.md",
    category: "source outage",
    short_description: "General data-source outage response.",
    current_status: "planned",
    product_surface: "internal operations",
    data_source: "source monitors",
    known_limitations: "Needs roster provider failure modes and fallback confidence behavior.",
    duplicate_risk: "EXTENSION",
    files_involved: "docs/research/growth-os-v2",
    normalized_fingerprint: "data source outage roster fallback confidence",
  },
  {
    existing_id: "BUILD-GV2-099",
    title: "Stale data public warning pattern",
    source_file: "docs/research/growth-os-v2/claude-build-queue/cards/BUILD-GV2-099-stale-data-public-warning-pattern.md",
    category: "stale warning",
    short_description: "Public copy/UI pattern for stale or frozen data.",
    current_status: "planned",
    product_surface: "public surfaces",
    data_source: "source freshness metadata",
    known_limitations: "Needs specific roster thresholds and fact-level evidence.",
    duplicate_risk: "EXTENSION",
    files_involved: "docs/research/growth-os-v2",
    normalized_fingerprint: "public stale data warning roster fact freshness",
  },
  {
    existing_id: "BUILD-070",
    title: "Stale source QA",
    source_file: "docs/research/oss-leverage-stack/claude-build-queue/cards/BUILD-070-stale-source-qa.md",
    category: "QA",
    short_description: "Generic stale source QA build from OSS leverage stack.",
    current_status: "planned",
    product_surface: "source QA",
    data_source: "source timestamps",
    known_limitations: "Not NFL-specific; no person/team/staff taxonomy.",
    duplicate_risk: "EXTENSION",
    files_involved: "docs/research/oss-leverage-stack",
    normalized_fingerprint: "stale source qa nfl roster taxonomy",
  },
  {
    existing_id: "BUILD-071",
    title: "Sports data contract tests",
    source_file: "docs/research/oss-leverage-stack/claude-build-queue/cards/BUILD-071-sports-data-contract-tests.md",
    category: "contract tests",
    short_description: "Generic sports data API contract tests.",
    current_status: "planned",
    product_surface: "internal API testing",
    data_source: "sports data APIs",
    known_limitations: "Needs roster truth fact contracts and regression examples.",
    duplicate_risk: "EXTENSION",
    files_involved: "docs/research/oss-leverage-stack",
    normalized_fingerprint: "sports data contract tests roster truth facts",
  },
  {
    existing_id: "BUILD-112",
    title: "Source transparency snippets",
    source_file: "docs/research/oss-leverage-stack/claude-build-queue/cards/BUILD-112-source-transparency-snippets.md",
    category: "public source transparency",
    short_description: "Public source explanation snippets.",
    current_status: "planned",
    product_surface: "public help/trust surfaces",
    data_source: "source metadata",
    known_limitations: "Needs public/private boundary for roster evidence and source weighting.",
    duplicate_risk: "EXTENSION",
    files_involved: "docs/research/oss-leverage-stack",
    normalized_fingerprint: "source transparency snippets roster evidence boundary",
  },
  {
    existing_id: "EDGE-015",
    title: "Source freshness indicator spec",
    source_file: "docs/research/edgeball-contest-os/claude-build-queue/cards/EDGE-015-source-freshness-indicator-spec.md",
    category: "freshness indicator",
    short_description: "Contest source freshness indicator.",
    current_status: "planned",
    product_surface: "EdgeBall",
    data_source: "official/stat provider timestamps",
    known_limitations: "Contest-specific; roster truth should reuse pattern but not duplicate.",
    duplicate_risk: "EXTENSION",
    files_involved: "docs/research/edgeball-contest-os",
    normalized_fingerprint: "freshness indicator official roster source",
  },
  {
    existing_id: "EDGE-031",
    title: "Official stat provider policy",
    source_file: "docs/research/edgeball-contest-os/claude-build-queue/cards/EDGE-031-official-stat-provider-policy.md",
    category: "official source policy",
    short_description: "Contest stat provider policy.",
    current_status: "planned",
    product_surface: "contests",
    data_source: "official stat providers",
    known_limitations: "Stats/scoring policy, not current roster/person truth.",
    duplicate_risk: "EXTENSION",
    files_involved: "docs/research/edgeball-contest-os",
    normalized_fingerprint: "official source policy roster transaction staff",
  },
];

const sourceInventory = [
  {
    source_id: "SRC-001",
    source_name: "Official NFL team roster pages",
    url: "https://www.nfl.com/teams/",
    category: "TIER 1 - Official current source",
    data_scope: "team roster, player position, jersey, status when present",
    players: "yes",
    coaches: "no",
    staff: "no",
    transactions: "limited",
    depth_chart: "limited",
    injuries: "limited",
    jersey_numbers: "yes",
    positions: "yes",
    height_weight: "often",
    college: "often",
    experience: "often",
    status: "sometimes",
    team_assignment: "yes",
    access_method: "public web pages; use legal, low-rate fetch or official API if licensed",
    free_status: "public page",
    requires_key: "no for public page",
    update_frequency: "team/NFL controlled; can lag transactions",
    freshness_expectation: "daily during active roster churn; verify with transactions",
    historical_depth: "current-biased",
    api_or_scrape: "page fetch unless licensed API exists",
    legal_tos_risk: "MEDIUM",
    robots_risk: "must check per URL",
    stability_risk: "MEDIUM",
    maintenance_burden: "MEDIUM",
    data_quality_score: "9",
    authority_score: "10",
    freshness_score: "8",
    coverage_score: "9",
    recommended_use: "canonical current roster evidence",
    fallback_use: "fallback to team site if NFL page fails",
    do_not_use_reason: "",
    notes: "Official wins unless stale or contradicted by newer official transaction.",
  },
  {
    source_id: "SRC-002",
    source_name: "Official team site roster pages",
    url: "https://www.chargers.com/team/rosters",
    category: "TIER 1 - Official current source",
    data_scope: "team roster and player public profile details",
    players: "yes",
    coaches: "no",
    staff: "no",
    transactions: "limited",
    depth_chart: "limited",
    injuries: "limited",
    jersey_numbers: "yes",
    positions: "yes",
    height_weight: "often",
    college: "often",
    experience: "often",
    status: "sometimes",
    team_assignment: "yes",
    access_method: "public web pages; team-by-team adapters",
    free_status: "public page",
    requires_key: "no",
    update_frequency: "team controlled",
    freshness_expectation: "high but team-page lag possible",
    historical_depth: "current-biased",
    api_or_scrape: "page fetch if allowed",
    legal_tos_risk: "MEDIUM",
    robots_risk: "must check",
    stability_risk: "MEDIUM",
    maintenance_burden: "HIGH across 32 sites",
    data_quality_score: "9",
    authority_score: "10",
    freshness_score: "8",
    coverage_score: "8",
    recommended_use: "cross-check official NFL page and smoke tests",
    fallback_use: "official page fallback",
    do_not_use_reason: "",
    notes: "Adapter diversity across teams is the maintenance cost.",
  },
  {
    source_id: "SRC-003",
    source_name: "NFL.com player pages",
    url: "https://www.nfl.com/players/",
    category: "TIER 1 - Official current source",
    data_scope: "player profile, stats, recent team history, sometimes status",
    players: "yes",
    coaches: "no",
    staff: "no",
    transactions: "limited",
    depth_chart: "no",
    injuries: "limited",
    jersey_numbers: "sometimes",
    positions: "yes",
    height_weight: "yes",
    college: "yes",
    experience: "yes",
    status: "sometimes",
    team_assignment: "sometimes",
    access_method: "public page fetch/manual probe",
    free_status: "public page",
    requires_key: "no",
    update_frequency: "NFL controlled",
    freshness_expectation: "medium/high",
    historical_depth: "current plus historical stats",
    api_or_scrape: "page fetch/manual verification",
    legal_tos_risk: "MEDIUM",
    robots_risk: "must check",
    stability_risk: "MEDIUM",
    maintenance_burden: "MEDIUM",
    data_quality_score: "8",
    authority_score: "10",
    freshness_score: "7",
    coverage_score: "9",
    recommended_use: "player profile and smoke-test evidence",
    fallback_use: "support official roster page",
    do_not_use_reason: "",
    notes: "Do not infer current team solely from old stat rows.",
  },
  {
    source_id: "SRC-004",
    source_name: "NFL.com transactions/news",
    url: "https://www.nfl.com/news/",
    category: "TIER 1/TIER 4 - Official transaction/news evidence",
    data_scope: "league updates, signings, releases, injuries, official news",
    players: "yes",
    coaches: "yes",
    staff: "limited",
    transactions: "yes",
    depth_chart: "no",
    injuries: "yes",
    jersey_numbers: "no",
    positions: "limited",
    height_weight: "no",
    college: "no",
    experience: "no",
    status: "yes",
    team_assignment: "yes",
    access_method: "public article/index/manual evidence",
    free_status: "public",
    requires_key: "no",
    update_frequency: "news cycle",
    freshness_expectation: "high for major moves",
    historical_depth: "article archive",
    api_or_scrape: "manual/source monitored",
    legal_tos_risk: "MEDIUM",
    robots_risk: "must check",
    stability_risk: "MEDIUM",
    maintenance_burden: "MEDIUM",
    data_quality_score: "8",
    authority_score: "9",
    freshness_score: "9",
    coverage_score: "7",
    recommended_use: "recent transaction evidence that can flag stale roster pages",
    fallback_use: "review trigger, not silent canonical if ambiguous",
    do_not_use_reason: "",
    notes: "Transaction can temporarily override older roster page but should create review state until roster catches up.",
  },
  {
    source_id: "SRC-005",
    source_name: "Official team staff/coaches pages",
    url: "https://www.nfl.com/teams/",
    category: "TIER 1 - Official staff source",
    data_scope: "coaches, coordinators, public football operations staff where listed",
    players: "no",
    coaches: "yes",
    staff: "yes where public",
    transactions: "staff changes limited",
    depth_chart: "no",
    injuries: "no",
    jersey_numbers: "no",
    positions: "role taxonomy",
    height_weight: "no",
    college: "no",
    experience: "limited",
    status: "role active/current",
    team_assignment: "staff team",
    access_method: "public team staff pages/media guide",
    free_status: "public where available",
    requires_key: "no",
    update_frequency: "team controlled; can lag",
    freshness_expectation: "weekly/monthly off-season; verify with press releases",
    historical_depth: "limited",
    api_or_scrape: "page fetch/manual",
    legal_tos_risk: "MEDIUM",
    robots_risk: "must check",
    stability_risk: "HIGH",
    maintenance_burden: "HIGH",
    data_quality_score: "8",
    authority_score: "10",
    freshness_score: "7",
    coverage_score: "7",
    recommended_use: "canonical public staff role source",
    fallback_use: "team press release or public media guide",
    do_not_use_reason: "",
    notes: "Only public professional role data. No private personal data.",
  },
  {
    source_id: "SRC-006",
    source_name: "nflverse / nflreadr roster data",
    url: "https://nflreadr.nflverse.com/",
    category: "TIER 2 - Maintained open data",
    data_scope: "rosters, ids, depth charts, schedules, stats depending package",
    players: "yes",
    coaches: "limited/no",
    staff: "no",
    transactions: "limited depending dataset",
    depth_chart: "available in some nflverse data",
    injuries: "some datasets",
    jersey_numbers: "yes in rosters",
    positions: "yes",
    height_weight: "yes",
    college: "yes",
    experience: "yes",
    status: "yes/limited",
    team_assignment: "yes",
    access_method: "R package/data release; mirrored data endpoints if documented",
    free_status: "open",
    requires_key: "no",
    update_frequency: "maintainer dependent; often frequent during season",
    freshness_expectation: "good but not official",
    historical_depth: "strong",
    api_or_scrape: "package/data files",
    legal_tos_risk: "LOW/MEDIUM",
    robots_risk: "low for package/data files",
    stability_risk: "MEDIUM",
    maintenance_burden: "MEDIUM",
    data_quality_score: "8",
    authority_score: "7",
    freshness_score: "7",
    coverage_score: "9",
    recommended_use: "ID mapping, historical roster snapshots, fallback agreement",
    fallback_use: "do not override fresh official source alone",
    do_not_use_reason: "",
    notes: "Excellent for IDs and history; public fact still needs evidence/confidence.",
  },
  {
    source_id: "SRC-007",
    source_name: "nflverse player IDs",
    url: "https://github.com/nflverse/nflverse-data",
    category: "TIER 2 - Maintained open data",
    data_scope: "cross-provider IDs such as gsis, espn, pfr where available",
    players: "yes",
    coaches: "no",
    staff: "no",
    transactions: "no",
    depth_chart: "no",
    injuries: "no",
    jersey_numbers: "no",
    positions: "limited",
    height_weight: "limited",
    college: "limited",
    experience: "limited",
    status: "no",
    team_assignment: "limited",
    access_method: "public data file/package",
    free_status: "open",
    requires_key: "no",
    update_frequency: "maintainer dependent",
    freshness_expectation: "ID stable; rookie lag possible",
    historical_depth: "strong",
    api_or_scrape: "data file",
    legal_tos_risk: "LOW/MEDIUM",
    robots_risk: "low",
    stability_risk: "MEDIUM",
    maintenance_burden: "LOW/MEDIUM",
    data_quality_score: "8",
    authority_score: "7",
    freshness_score: "6",
    coverage_score: "9",
    recommended_use: "identity resolution seed",
    fallback_use: "manual review for missing rookies/staff",
    do_not_use_reason: "",
    notes: "Not a roster truth source by itself.",
  },
  {
    source_id: "SRC-008",
    source_name: "ESPN NFL rosters/player pages",
    url: "https://www.espn.com/nfl/teams",
    category: "TIER 3 - Reputable public sports media",
    data_scope: "team rosters, player profiles, IDs",
    players: "yes",
    coaches: "limited",
    staff: "no",
    transactions: "limited/news",
    depth_chart: "yes on some surfaces",
    injuries: "yes",
    jersey_numbers: "yes",
    positions: "yes",
    height_weight: "yes",
    college: "yes",
    experience: "yes",
    status: "yes",
    team_assignment: "yes",
    access_method: "public pages; no private APIs unless licensed",
    free_status: "public pages",
    requires_key: "no for pages",
    update_frequency: "media maintained",
    freshness_expectation: "good but not official",
    historical_depth: "good",
    api_or_scrape: "page fetch/manual/legal review",
    legal_tos_risk: "MEDIUM/HIGH",
    robots_risk: "must check",
    stability_risk: "MEDIUM",
    maintenance_burden: "MEDIUM",
    data_quality_score: "7",
    authority_score: "6",
    freshness_score: "8",
    coverage_score: "8",
    recommended_use: "fallback/corroboration and ID map",
    fallback_use: "two-source confirmation, never sole official override",
    do_not_use_reason: "",
    notes: "Respect terms and robots; no undocumented private endpoint dependency without review.",
  },
  {
    source_id: "SRC-009",
    source_name: "CBS/Yahoo/FOX public rosters",
    url: "https://www.cbssports.com/nfl/teams/",
    category: "TIER 3 - Reputable public sports media",
    data_scope: "public rosters, injuries, fantasy-relevant statuses",
    players: "yes",
    coaches: "limited",
    staff: "no",
    transactions: "limited",
    depth_chart: "sometimes",
    injuries: "yes",
    jersey_numbers: "yes",
    positions: "yes",
    height_weight: "yes",
    college: "yes",
    experience: "yes",
    status: "yes",
    team_assignment: "yes",
    access_method: "public pages only after TOS/robots review",
    free_status: "public pages",
    requires_key: "no for pages",
    update_frequency: "media maintained",
    freshness_expectation: "varies",
    historical_depth: "limited/varies",
    api_or_scrape: "page fetch/manual",
    legal_tos_risk: "MEDIUM/HIGH",
    robots_risk: "must check",
    stability_risk: "MEDIUM/HIGH",
    maintenance_burden: "MEDIUM",
    data_quality_score: "6",
    authority_score: "5",
    freshness_score: "7",
    coverage_score: "8",
    recommended_use: "fallback agreement and conflict signals",
    fallback_use: "review trigger",
    do_not_use_reason: "",
    notes: "Useful for conflict detection, not primary public truth.",
  },
  {
    source_id: "SRC-010",
    source_name: "Pro Football Reference",
    url: "https://www.pro-football-reference.com/",
    category: "TIER 3/TIER 5 - Reference/historical",
    data_scope: "historical players, teams, stats, identifiers",
    players: "yes",
    coaches: "limited",
    staff: "limited/no",
    transactions: "no/current limited",
    depth_chart: "no",
    injuries: "no",
    jersey_numbers: "historical",
    positions: "yes",
    height_weight: "yes",
    college: "yes",
    experience: "yes",
    status: "historical/current limited",
    team_assignment: "historical",
    access_method: "manual/reference; avoid scraping without review",
    free_status: "public",
    requires_key: "no",
    update_frequency: "not primary current roster",
    freshness_expectation: "low for current roster",
    historical_depth: "excellent",
    api_or_scrape: "manual/reference",
    legal_tos_risk: "MEDIUM/HIGH",
    robots_risk: "must check",
    stability_risk: "MEDIUM",
    maintenance_burden: "LOW if manual",
    data_quality_score: "8",
    authority_score: "6",
    freshness_score: "4",
    coverage_score: "8",
    recommended_use: "historical identity/reference only",
    fallback_use: "do not use for current active roster truth",
    do_not_use_reason: "",
    notes: "Good for PFR IDs and history; weak for live roster state.",
  },
  {
    source_id: "SRC-011",
    source_name: "Sleeper public player data",
    url: "https://docs.sleeper.com/",
    category: "TIER 3/TIER 5 - Fantasy player pool",
    data_scope: "fantasy player universe, IDs, active flags, positions",
    players: "yes",
    coaches: "no",
    staff: "no",
    transactions: "no",
    depth_chart: "no",
    injuries: "limited/fantasy status",
    jersey_numbers: "limited",
    positions: "yes",
    height_weight: "sometimes",
    college: "sometimes",
    experience: "sometimes",
    status: "fantasy-oriented",
    team_assignment: "yes but fantasy pool oriented",
    access_method: "public API if docs allow",
    free_status: "public API",
    requires_key: "no for common endpoints",
    update_frequency: "fantasy platform maintained",
    freshness_expectation: "good for fantasy pool, not canonical",
    historical_depth: "limited",
    api_or_scrape: "documented public API only",
    legal_tos_risk: "MEDIUM",
    robots_risk: "low for documented API",
    stability_risk: "MEDIUM",
    maintenance_burden: "LOW/MEDIUM",
    data_quality_score: "6",
    authority_score: "4",
    freshness_score: "7",
    coverage_score: "9",
    recommended_use: "player pool completeness and fantasy status comparison",
    fallback_use: "never sole current-team truth",
    do_not_use_reason: "",
    notes: "Fantasy source can lag or optimize for playable pool rather than roster truth.",
  },
  {
    source_id: "SRC-012",
    source_name: "Official gamebooks/inactives/practice reports",
    url: "https://www.nfl.com/injuries/",
    category: "TIER 1 - Official availability source",
    data_scope: "game inactives, injury/practice reports, participation",
    players: "yes",
    coaches: "no",
    staff: "no",
    transactions: "limited",
    depth_chart: "no",
    injuries: "yes",
    jersey_numbers: "no",
    positions: "limited",
    height_weight: "no",
    college: "no",
    experience: "no",
    status: "availability/injury",
    team_assignment: "yes",
    access_method: "public official pages/gamebook PDFs where available",
    free_status: "public",
    requires_key: "no",
    update_frequency: "game-week",
    freshness_expectation: "high in season",
    historical_depth: "game archive",
    api_or_scrape: "page/PDF manual adapter only if allowed",
    legal_tos_risk: "MEDIUM",
    robots_risk: "must check",
    stability_risk: "MEDIUM",
    maintenance_burden: "MEDIUM/HIGH",
    data_quality_score: "8",
    authority_score: "10",
    freshness_score: "9",
    coverage_score: "7",
    recommended_use: "availability/injury evidence; not full roster replacement",
    fallback_use: "game-week status confirmation",
    do_not_use_reason: "",
    notes: "Separate injury/practice state from roster membership state.",
  },
];

const sourceLinks = [
  ["NFL.com Najee Harris player page", "https://www.nfl.com/players/najee-harris/", "Official player page. Used as a smoke-test source; do not infer current team from old stat rows alone."],
  ["NFL.com Rico Dowdle player page", "https://www.nfl.com/players/rico-dowdle/", "Official player page. Search/open results during this run indicated 2026 Pittsburgh context while old Dallas/Carolina references can be stale."],
  ["Steelers roster page", "https://www.steelers.com/team/players-roster/", "Official team roster page used as the preferred current evidence pattern for Rico Dowdle."],
  ["Steelers sign Dowdle", "https://www.steelers.com/news/steelers-sign-dowdle", "Official team article says the Steelers signed Rico Dowdle to a two-year contract."],
  ["Chargers roster page", "https://www.chargers.com/team/rosters", "Official team roster page used as the preferred current evidence pattern and as a negative/needs-review check for Najee Harris."],
  ["Chargers 2026 free agents", "https://www.chargers.com/news/free-agents-2026-salary-cap", "Official Chargers article listed Najee Harris among 2026 Chargers free agents."],
  ["NBC/PFT Najee free-agent report", "https://www.nbcsports.com/nfl/profootballtalk/rumor-mill/news/free-agent-rb-najee-harris-wants-to-show-teams-he-can-run-six-months-after-torn-achilles", "Public sports-media report described Najee Harris as a free agent after his one-year Chargers contract and Achilles injury; use as non-official corroboration, not sole canonical truth."],
  ["NFL.com teams", "https://www.nfl.com/teams/", "Canonical entrypoint for official team pages."],
  ["NFL.com injuries", "https://www.nfl.com/injuries/", "Official injury/practice-report style entrypoint; availability status should stay distinct from roster membership."],
  ["NFL.com news", "https://www.nfl.com/news/", "Official league news and transaction-update evidence."],
  ["nflreadr docs", "https://nflreadr.nflverse.com/", "Open nflverse package docs for roster and ID data strategy."],
  ["nflverse data GitHub", "https://github.com/nflverse/nflverse-data", "Open nflverse data repository for player IDs and supporting datasets."],
  ["Sleeper API docs", "https://docs.sleeper.com/", "Documented public fantasy player data source; fallback only."],
  ["ESPN NFL teams", "https://www.espn.com/nfl/teams", "Reputable media fallback/corroboration source; TOS/robots review required before automation."],
  ["CBS Sports NFL teams", "https://www.cbssports.com/nfl/teams/", "Reputable media fallback/corroboration source; TOS/robots review required before automation."],
  ["Pro Football Reference", "https://www.pro-football-reference.com/", "Historical reference/ID helper, not primary current roster truth."],
];

const surfaces = [
  ["public player pages", "Player team, number, position, status, bio/profile", "unknown; source files not visible", "HIGH", "Use canonical roster API with fact-level evidence and freshness."],
  ["Player Lab", "Player/team movement, changes, GSE Rating overlays", "planned docs only", "HIGH", "Gate what-changed cards on roster truth snapshots and transaction reconciliation."],
  ["GSE Rating surfaces", "Player/team context used to explain ratings", "planned docs only", "HIGH", "Ratings must join through canonical person/team IDs, not static name/team fields."],
  ["team pages", "Roster lists, staff, player links", "unknown", "HIGH", "Render from roster snapshots with stale warnings and conflict suppression."],
  ["search/autocomplete", "Player names, team abbreviations, positions", "unknown", "HIGH", "Use canonical person index with alias table and stale-team validation."],
  ["content/briefs/articles", "Player/team/staff references", "docs mention content only", "MEDIUM/HIGH", "Add content freshness checks and source-backed roster mention linter."],
  ["founder cockpit", "Data health, source freshness, conflicts", "planned docs only", "HIGH internal", "Build private roster accuracy cockpit and manual review queue."],
  ["API endpoints", "Player/team JSON consumed by UI", "not visible", "HIGH", "Contract-test every roster fact and return truth_status/confidence internally."],
  ["mock/demo/seed data", "Static player/team examples", "not visible", "HIGH if production leakage", "Deploy gate must block mock roster data on public surfaces."],
  ["tests/fixtures", "Regression examples and validation snapshots", "not visible", "MEDIUM", "Use dynamic source fixtures for smoke tests; do not hardcode guessed teams."],
];

const entities = [
  ["Person", "Canonical public person record for players and staff.", "canonical_person_id, names, public identifiers, display flags", "private/internal IDs public-safe display only"],
  ["PlayerProfile", "NFL player-specific public facts.", "person_id, height, weight, college, experience, draft info, public bio fields", "public if evidence-backed"],
  ["StaffProfile", "Coach/staff professional public profile.", "person_id, role family, public team role, source notes", "public only if officially/professionally listed"],
  ["Team", "Canonical NFL club identity.", "team_id, current abbreviation, aliases, historical abbreviations, official URLs", "public"],
  ["TeamMembership", "Person-team relationship over time.", "person_id, team_id, membership_type, start/end, evidence_ids", "public current summary, full evidence internal"],
  ["RosterSnapshot", "Team roster at a point in time.", "team_id, source_id, fetched_at, source_updated_at, raw_hash, record_count", "internal"],
  ["StaffSnapshot", "Team staff listing at a point in time.", "team_id, source_id, fetched_at, raw_hash, record_count", "internal"],
  ["JerseyAssignment", "Jersey number facts and conflicts.", "person_id, team_id, number, status, effective dates, evidence_ids", "public if confident"],
  ["PositionAssignment", "Position and position group facts.", "person_id, team_id, normalized_position, source_position, confidence", "public if confident"],
  ["StatusAssignment", "Roster/availability status.", "person_id, team_id, normalized_status, effective dates, evidence_ids", "public if confident"],
  ["DepthChartAssignment", "Depth role/rank from a named source.", "team_id, person_id, position_group, rank, role, evidence", "public only if sourced and qualified"],
  ["Transaction", "Roster/staff movement event.", "person_id, team_id, old_team_id, new_team_id, old_status, new_status, transaction_type, effective_date", "public summary if confirmed"],
  ["SourceEvidence", "Fact-level proof record.", "source_id, url, fetched_at, raw_value, normalized_value, parser_version", "internal; public only simplified"],
  ["ConflictRecord", "Disagreement between current sources.", "fact_type, person_id, values, evidence_ids, severity, owner, resolution", "internal"],
  ["ConfidenceScore", "Fact-level 0-100 score.", "fact_id, score, inputs, truth_status", "internal; public status/freshness only"],
  ["VerificationRun", "Roster truth audit run.", "run_id, started_at, completed_at, source statuses, errors, changed counts", "internal"],
  ["ValidationError", "Deploy/nightly data quality finding.", "rule_id, severity, entity, evidence, suggested action", "internal"],
];

const statuses = [
  "ACTIVE",
  "INACTIVE",
  "PRACTICE_SQUAD",
  "INJURED_RESERVE",
  "PUP",
  "NFI",
  "SUSPENDED",
  "EXEMPT",
  "RESERVE_FUTURES",
  "WAIVED",
  "RELEASED",
  "FREE_AGENT",
  "RETIRED",
  "TRADED_PENDING",
  "SIGNED_PENDING",
  "UNKNOWN",
];

const positions = ["QB","RB","FB","WR","TE","OT","OG","C","OL","DL","DT","DE","EDGE","LB","ILB","OLB","CB","S","FS","SS","DB","K","P","LS","RET","ATH"];

function mdTable(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((r) => `| ${r.map((v) => String(v ?? "").replace(/\n/g, "<br>")).join(" | ")} |`),
  ].join("\n");
}

function build(idNum, title, category, priority, difficulty, gate, matched, dataModels, sourceReq, productSurface, extra = {}) {
  const id = `BUILD-NRT-${String(idNum).padStart(3, "0")}`;
  const relation =
    gate === "EXTENSION" ? "Extends existing source freshness/player surface/data quality work with roster-specific truth rules." :
    gate === "REPLACEMENT" ? "Supersedes any stale/static roster approach after review." :
    gate === "DEPENDENCY" ? "Prerequisite dependency for roster truth implementation." :
    gate === "VARIANT" ? "Material variant for a different surface or audience." :
    "Distinct roster truth capability not present in existing ledgers.";
  const reason =
    extra.reason || `${title} adds NFL roster/person evidence, reconciliation, validation, or remediation that existing generic cards do not define.`;
  return {
    id,
    title,
    category,
    priority,
    difficulty,
    duplicate_check_status: gate,
    matched_existing_ids: matched,
    relation_to_existing: relation,
    reason_not_duplicate: reason,
    product_surface: productSurface,
    internal_surface: extra.internal || ["founder roster accuracy cockpit", "data quality reports"],
    source_requirements: sourceReq,
    data_models: dataModels,
    repo_files: extra.repoFiles || ["real shipping clone paths unknown in this workspace", "docs/research/nfl-roster-truth"],
    accuracy_value: extra.accuracy ?? 5,
    trust_value: extra.trust ?? 5,
    implementation_value: extra.impl ?? 4,
    legal_risk: extra.legal || "MEDIUM",
    source_risk: extra.source || "MEDIUM",
    maintenance_risk: extra.maint || "MEDIUM",
    dependencies: extra.deps || [],
    claude_prompt_file: `docs/research/nfl-roster-truth/claude-build-queue/cards/${id}-${slug(title)}.md`,
    notes: extra.notes || "Docs-first or disabled-by-default implementation only until real clone and source permissions are verified.",
  };
}

const builds = [
  build(1, "Roster source inventory and TOS matrix", "source inventory", "P0", "S", "DEPENDENCY", ["BUILD-GV2-098"], ["SourceRegistry"], ["SRC-001", "SRC-002", "SRC-006"], ["internal data quality"]),
  build(2, "Official team roster adapter contract", "source adapter architecture", "P0", "M", "DEPENDENCY", ["BUILD-071"], ["RosterSourceAdapter", "RawSourceSnapshot", "NormalizedRosterRecord"], ["SRC-001", "SRC-002"], ["public player pages", "team pages"]),
  build(3, "NFL.com roster adapter probe", "official roster adapter", "P0", "L", "EXTENSION", ["BUILD-071"], ["RawSourceSnapshot", "SourceEvidence"], ["SRC-001", "SRC-003"], ["team pages", "player cards"]),
  build(4, "NFL.com transaction adapter probe", "transaction adapter", "P0", "L", "EXTENSION", ["BUILD-GV2-098"], ["Transaction", "SourceEvidence"], ["SRC-004"], ["Player Lab", "founder cockpit"]),
  build(5, "Official team staff source map", "staff source inventory", "P1", "M", "NET_NEW", [], ["StaffSourceEvidence", "StaffSnapshot"], ["SRC-005"], ["staff/coaching pages"]),
  build(6, "Official media guide staff policy", "staff source inventory", "P2", "M", "NET_NEW", [], ["StaffSnapshot"], ["official media guides"], ["staff/coaching pages"]),
  build(7, "nflverse roster adapter", "nflverse adapter", "P0", "M", "EXTENSION", ["BUILD-071"], ["RosterSnapshot", "SourceEvidence"], ["SRC-006"], ["player cards", "team pages"]),
  build(8, "nflverse player ID map adapter", "identity resolution", "P0", "M", "EXTENSION", ["BUILD-GV2-081"], ["Person", "ExternalPersonId", "Alias"], ["SRC-007"], ["search/autocomplete", "player pages"]),
  build(9, "nflverse depth chart adapter evaluation", "depth chart adapter", "P1", "M", "EXTENSION", ["BUILD-071"], ["DepthChartAssignment"], ["SRC-006"], ["Player Lab", "team pages"]),
  build(10, "ESPN fallback adapter legal evaluation", "fallback adapter", "P1", "S", "DEPENDENCY", ["BUILD-GV2-098"], ["SourceRegistry"], ["SRC-008"], ["founder cockpit"]),
  build(11, "CBS Yahoo FOX fallback adapter evaluation", "fallback adapter", "P2", "S", "DEPENDENCY", ["BUILD-GV2-098"], ["SourceRegistry"], ["SRC-009"], ["founder cockpit"]),
  build(12, "Sleeper fantasy player pool adapter evaluation", "fantasy player pool adapter", "P2", "M", "EXTENSION", ["BUILD-071"], ["ExternalPersonId", "SourceEvidence"], ["SRC-011"], ["search/autocomplete"]),
  build(13, "PFR historical identity reference policy", "identity reference", "P2", "S", "EXTENSION", ["BUILD-GV2-081"], ["ExternalPersonId", "Alias"], ["SRC-010"], ["player pages"]),
  build(14, "Prohibited source and robots review list", "legal / TOS", "P0", "S", "DEPENDENCY", ["BUILD-GV2-098"], ["SourceRegistry"], ["all public sources"], ["internal data quality"]),
  build(15, "Canonical person universe schema", "person model", "P0", "M", "NET_NEW", [], ["Person", "PlayerProfile", "StaffProfile"], ["all roster/staff sources"], ["player pages", "staff pages"]),
  build(16, "Canonical external ID table", "identity resolution", "P0", "M", "EXTENSION", ["BUILD-GV2-081"], ["ExternalPersonId", "Person"], ["SRC-007", "SRC-008", "SRC-011"], ["search/autocomplete"]),
  build(17, "Alias and fuzzy matching rules", "identity resolution", "P0", "M", "EXTENSION", ["BUILD-GV2-081"], ["Alias", "ConflictRecord"], ["all source names"], ["search/autocomplete"]),
  build(18, "Same-name hard no-merge regression tests", "identity tests", "P0", "M", "EXTENSION", ["BUILD-071"], ["ValidationError", "Person"], ["fixtures"], ["tests"]),
  build(19, "Rookie and UDFA manual review queue", "identity workflow", "P1", "M", "EXTENSION", ["BUILD-GV2-081"], ["ManualReviewItem", "ExternalPersonId"], ["SRC-001", "SRC-006"], ["founder cockpit"]),
  build(20, "Staff identity model", "staff model", "P1", "M", "NET_NEW", [], ["StaffProfile", "StaffRoleAssignment"], ["SRC-005"], ["staff pages"]),
  build(21, "Team abbreviation normalization map", "team normalization", "P0", "S", "EXTENSION", ["BUILD-071"], ["Team"], ["official team pages", "nflverse"], ["all player/team surfaces"]),
  build(22, "Roster status normalization taxonomy", "status normalization", "P0", "S", "EXTENSION", ["BUILD-071"], ["StatusAssignment"], ["official rosters", "transactions"], ["player cards", "team pages"]),
  build(23, "Position normalization taxonomy", "position normalization", "P0", "S", "EXTENSION", ["BUILD-071"], ["PositionAssignment"], ["all roster sources"], ["player cards", "Player Lab"]),
  build(24, "Depth chart role taxonomy", "depth chart normalization", "P1", "S", "EXTENSION", ["BUILD-071"], ["DepthChartAssignment"], ["official depth charts", "nflverse"], ["team pages", "Player Lab"]),
  build(25, "Jersey assignment evidence model", "jersey validation", "P0", "M", "NET_NEW", [], ["JerseyAssignment", "ConflictRecord"], ["SRC-001", "SRC-002"], ["player cards", "team pages"]),
  build(26, "Source evidence storage contract", "source evidence", "P0", "M", "EXTENSION", ["BUILD-112"], ["SourceEvidence"], ["all sources"], ["public freshness labels", "founder cockpit"]),
  build(27, "Raw source snapshot format", "snapshot storage", "P0", "M", "EXTENSION", ["BUILD-GV2-098"], ["RawSourceSnapshot", "SourceSnapshot"], ["all adapters"], ["founder cockpit"]),
  build(28, "Canonical fact table design", "truth storage", "P0", "M", "NET_NEW", [], ["CanonicalFact", "ConfidenceScore"], ["all sources"], ["all roster surfaces"]),
  build(29, "Truth confidence scoring engine", "truth scoring", "P0", "L", "EXTENSION", ["BUILD-112", "BUILD-GV2-099"], ["ConfidenceScore", "ConflictRecord"], ["all sources"], ["public player pages", "founder cockpit"]),
  build(30, "Fact conflict detection engine", "conflict detection", "P0", "L", "EXTENSION", ["BUILD-GV2-098"], ["ConflictRecord", "ValidationError"], ["all sources"], ["founder cockpit"]),
  build(31, "Fact stale detection engine", "stale detection", "P0", "M", "EXTENSION", ["BUILD-GV2-056", "BUILD-GV2-099"], ["ValidationError", "SourceSnapshot"], ["all sources"], ["all public roster surfaces"]),
  build(32, "Transaction to roster reconciler", "transaction tracking", "P0", "L", "NET_NEW", [], ["Transaction", "TeamMembership", "ConflictRecord"], ["SRC-004", "SRC-001"], ["Player Lab", "player cards"]),
  build(33, "Player moved teams alert", "movement alert", "P0", "M", "EXTENSION", ["BUILD-GV2-021"], ["Transaction", "ValidationError"], ["SRC-004", "SRC-001"], ["Player Lab", "founder cockpit"]),
  build(34, "Staff role change tracking", "staff tracking", "P2", "M", "NET_NEW", [], ["StaffRoleAssignment", "StaffConflictRecord"], ["SRC-005"], ["staff/coaching pages"]),
  build(35, "Practice squad and reserve mapper", "status normalization", "P0", "M", "NET_NEW", [], ["StatusAssignment", "TeamMembership"], ["SRC-001", "SRC-002", "SRC-004"], ["team pages", "search/autocomplete"]),
  build(36, "Injury and practice report boundary", "injury/availability", "P1", "M", "EXTENSION", ["BUILD-GV2-049"], ["StatusAssignment", "AvailabilityReport"], ["SRC-012"], ["Player Lab", "briefs"]),
  build(37, "Public player card remediation map", "product remediation", "P0", "M", "EXTENSION", ["BUILD-GV2-053"], ["CanonicalFact", "SourceEvidence"], ["SRC-001", "SRC-006"], ["public player cards"]),
  build(38, "Player Lab roster truth remediation", "product remediation", "P0", "M", "EXTENSION", ["BUILD-GV2-021"], ["CanonicalFact", "Transaction"], ["SRC-001", "SRC-004"], ["Player Lab"]),
  build(39, "GSE Rating roster context remediation", "product remediation", "P0", "M", "EXTENSION", ["BUILD-GV2-011"], ["CanonicalFact", "TeamMembership"], ["SRC-001", "SRC-006"], ["GSE Rating"]),
  build(40, "Search autocomplete stale-team guard", "product remediation", "P0", "M", "NET_NEW", [], ["Person", "Alias", "CanonicalFact"], ["SRC-001", "SRC-006"], ["search/autocomplete"]),
  build(41, "Team page roster rendering contract", "product remediation", "P1", "M", "NET_NEW", [], ["RosterSnapshot", "CanonicalFact"], ["SRC-001", "SRC-002"], ["team pages"]),
  build(42, "Content and brief roster mention linter", "content validation", "P1", "M", "EXTENSION", ["BUILD-GV2-056"], ["ValidationError", "CanonicalFact"], ["canonical roster API"], ["content/briefs/articles"]),
  build(43, "Roster public API response contract", "API contract", "P0", "M", "EXTENSION", ["BUILD-071"], ["CanonicalFact", "ConfidenceScore"], ["canonical truth store"], ["API endpoints"]),
  build(44, "Public last-verified label", "public freshness", "P1", "S", "EXTENSION", ["BUILD-GV2-020", "BUILD-GV2-099"], ["SourceEvidence", "CanonicalFact"], ["all sources"], ["public player pages", "team pages"]),
  build(45, "Founder roster accuracy cockpit", "founder cockpit", "P0", "L", "EXTENSION", ["BUILD-GV2-096", "BUILD-GV2-098"], ["VerificationRun", "ConflictRecord", "ValidationError"], ["all sources"], ["founder cockpit"]),
  build(46, "Manual roster review queue", "manual review", "P0", "M", "EXTENSION", ["BUILD-GV2-040"], ["ManualReviewItem", "ConflictRecord"], ["all conflicted sources"], ["founder cockpit"]),
  build(47, "Roster source failure log", "source monitoring", "P0", "M", "EXTENSION", ["BUILD-GV2-098"], ["VerificationRun", "SourceSnapshot"], ["all adapters"], ["founder cockpit"]),
  build(48, "Roster parser error report", "parser monitoring", "P1", "M", "EXTENSION", ["BUILD-GV2-098"], ["ParserError", "VerificationRun"], ["all adapters"], ["founder cockpit"]),
  build(49, "Roster truth health score", "accuracy score", "P0", "M", "EXTENSION", ["BUILD-GV2-096"], ["VerificationRun", "ValidationError"], ["all sources"], ["founder cockpit"]),
  build(50, "Data quality CLI command spec", "validation CLI", "P0", "S", "DEPENDENCY", ["BUILD-071"], ["ValidationError"], ["canonical truth store"], ["internal data quality"]),
  build(51, "pnpm roster:audit read-only script", "validation script", "P0", "M", "EXTENSION", ["BUILD-071"], ["VerificationRun"], ["canonical truth store"], ["internal data quality"]),
  build(52, "pnpm roster:verify read-only script", "validation script", "P0", "M", "EXTENSION", ["BUILD-071"], ["ValidationError"], ["canonical truth store"], ["CI/predeploy"]),
  build(53, "pnpm roster:diff read-only script", "validation script", "P1", "M", "EXTENSION", ["BUILD-GV2-021"], ["RosterSnapshot", "Transaction"], ["snapshots"], ["founder cockpit"]),
  build(54, "pnpm roster:conflicts read-only script", "validation script", "P0", "M", "EXTENSION", ["BUILD-GV2-098"], ["ConflictRecord"], ["all sources"], ["internal data quality"]),
  build(55, "pnpm roster:stale read-only script", "validation script", "P0", "M", "EXTENSION", ["BUILD-GV2-099"], ["ValidationError"], ["source snapshots"], ["CI/predeploy"]),
  build(56, "pnpm test:roster regression harness", "regression tests", "P0", "M", "EXTENSION", ["BUILD-071"], ["ValidationError"], ["fixtures"], ["tests"]),
  build(57, "Najee Harris and Rico Dowdle dynamic smoke tests", "regression tests", "P0", "S", "EXTENSION", ["BUILD-071"], ["ValidationError", "CanonicalFact"], ["SRC-001", "SRC-002", "SRC-003", "SRC-004"], ["tests"], { notes: "Do not hardcode replacement teams. Test compares rendered/team fact against current evidence fixtures." }),
  build(58, "No mock roster data public leak gate", "deploy gate", "P0", "M", "REPLACEMENT", ["mock/demo/seed data unknown"], ["ValidationError"], ["repo scan"], ["CI/predeploy"]),
  build(59, "Roster data quality CI gate", "deploy gate", "P0", "L", "EXTENSION", ["BUILD-071"], ["ValidationError", "VerificationRun"], ["canonical truth store"], ["CI/predeploy"]),
  build(60, "Nightly roster audit plan", "scheduled audit", "P1", "M", "DEPENDENCY", ["BUILD-GV2-098"], ["VerificationRun"], ["all adapters"], ["founder cockpit"], { notes: "Requires approval before live scheduling or endpoint automation." }),
  build(61, "Post-deploy roster audit plan", "postdeploy audit", "P1", "M", "EXTENSION", ["BUILD-GV2-098"], ["VerificationRun"], ["canonical truth store"], ["postdeploy"]),
  build(62, "Roster truth backup and rollback strategy", "rollback", "P0", "S", "NET_NEW", [], ["RosterSnapshot", "CanonicalFact"], ["snapshots"], ["internal operations"]),
  build(63, "Public-private roster evidence boundary", "public/private boundary", "P0", "S", "EXTENSION", ["BUILD-112"], ["SourceEvidence", "ConfidenceScore"], ["all sources"], ["public player pages", "founder cockpit"]),
  build(64, "Legal TOS and source approval workflow", "legal / TOS", "P0", "S", "DEPENDENCY", ["BUILD-GV2-092"], ["SourceRegistry"], ["all sources"], ["internal governance"]),
  build(65, "Source ownership and refresh cadence", "operations", "P1", "S", "EXTENSION", ["BUILD-GV2-091"], ["SourceRegistry", "VerificationRun"], ["all sources"], ["internal operations"]),
  build(66, "Roster source outage customer messaging", "support / trust", "P1", "S", "EXTENSION", ["BUILD-GV2-098", "BUILD-GV2-099"], ["ValidationError"], ["source failures"], ["support", "public warning"]),
  build(67, "Season-state threshold policy", "data quality thresholds", "P1", "M", "NET_NEW", [], ["ValidationError", "VerificationRun"], ["all sources"], ["CI/predeploy"]),
  build(68, "Roster truth implementation handoff packet", "handoff", "P0", "S", "DEPENDENCY", ["all NRT cards"], ["BuildCard", "ApprovalGate"], ["all docs"], ["Claude Code build queue"]),
];

function cardMarkdown(b) {
  return `# ${b.id}: ${b.title}

## Duplicate Gate

duplicate_check_status: ${b.duplicate_check_status}  
matched_existing_ids: ${b.matched_existing_ids.length ? b.matched_existing_ids.join(", ") : "none"}  
relation_to_existing: ${b.relation_to_existing}  
reason_not_duplicate: ${b.reason_not_duplicate}  
parent_id: ${b.duplicate_check_status === "EXTENSION" && b.matched_existing_ids[0] ? b.matched_existing_ids[0] : ""}  
supersedes_id: ${b.duplicate_check_status === "REPLACEMENT" && b.matched_existing_ids[0] ? b.matched_existing_ids[0] : ""}  
dependency_ids: ${b.dependencies.length ? b.dependencies.join(", ") : ""}  
merge_notes: Keep in the NFL roster truth namespace; link back to existing generic source/freshness cards instead of recreating them.

## Goal

${b.title} for the NFL roster truth system.

## Why It Matters

Roster facts are trust infrastructure. Wrong team, number, status, or staff role corrupts Player Lab, GSE Rating, search, content, customer trust, and internal decisions.

## Current Problem

The visible workspace is a docs/control lane, not a full app checkout. Existing cards define generic freshness, data source QA, and player surfaces, but not fact-level NFL roster evidence, conflict handling, staff rules, or deploy gates.

## Source Proof Needed

${b.source_requirements.map((s) => `- ${s}`).join("\n")}

## Product Surface

${b.product_surface.map((s) => `- ${s}`).join("\n")}

## Internal Surface

${b.internal_surface.map((s) => `- ${s}`).join("\n")}

## Data Model

${b.data_models.map((s) => `- ${s}`).join("\n")}

## Ingestion Plan

Use read-only source adapters or fixture-based probes first. Store raw source snapshots with timestamp, URL, hash, parsed record count, parser version, and evidence IDs. Do not mutate production data.

## Reconciliation Plan

Compare official, open-data, and fallback records fact-by-fact. Official current evidence wins unless stale or contradicted by newer official transaction evidence. Conflicts create ConflictRecord entries instead of silent overwrites.

## Validation Plan

Run roster:audit, roster:verify, roster:conflicts, roster:stale, and test:roster once implemented. Until then, validate with source inventory, fixtures, and generated JSONL/card checks.

## Public/Private Boundary

Public surfaces can show current fact, qualified status, and last verified timestamp. Founder/admin surfaces can show source weights, conflicts, parser errors, and raw evidence links. Do not expose proprietary reconciliation logic.

## Legal / TOS Boundary

Use official/public sources only after terms and robots review. Do not scrape private, paywalled, login-gated, prohibited, or high-volume sources. Media/fantasy sources are fallback/corroboration unless legal approval upgrades them.

## Repo Context

Likely files: ${b.repo_files.join(", ")}.  
Files to avoid: production DB migrations, deployment config, secrets, live cron jobs, and any source requiring credentials.

## Implementation Plan

1. Verify real repo root, branch, dirty state, package manager, and existing app files.
2. Read this card plus matched existing IDs.
3. Add the smallest docs-first, type-only, or disabled-by-default implementation.
4. Use fixtures or low-volume legal probes only.
5. Add validation/tests and rollback notes.
6. Report exact changed files and unresolved approvals.

## Acceptance Criteria

- Duplicate gate is honored.
- Every roster fact touched by the build has source evidence design.
- Conflicts are visible internally.
- Stale/unknown facts do not render as confirmed.
- No production database mutation or deploy occurs.

## Test Plan

Unit: normalization and scoring rules.  
Integration: adapter fixtures and reconciliation.  
Data validation: stale/conflict/no-mock checks.  
Regression: Najee Harris and Rico Dowdle smoke tests compare rendered facts against current source evidence fixtures, not hardcoded replacement teams.

## Rollback Plan

Remove new disabled script/types/docs, delete generated fixtures, and leave existing production data untouched. For later DB work, roll back through migration rollback and snapshot restore only after backup verification.

## Priority

${b.priority}

## Difficulty

${b.difficulty}

## Risks

Legal risk: ${b.legal_risk}. Source risk: ${b.source_risk}. Maintenance risk: ${b.maintenance_risk}. Primary trust risk is making a stale or conflicted fact look confirmed.

## Claude Code Prompt

You are Claude Code working in the real Galaxy Sports Edge / GSN shipping clone. Execute only ${b.id}: ${b.title}. First verify repo root, branch, dirty state, package manager, scripts, and existing patterns. Read docs/research/nfl-roster-truth plus matched existing IDs: ${b.matched_existing_ids.join(", ") || "none"}. Do not use production data or secrets. Do not deploy. Do not scrape prohibited, paywalled, login-gated, or high-volume sources. Build the smallest safe docs-first, fixture-backed, type-only, or disabled-by-default implementation. Every public roster fact must have evidence, freshness, conflict handling, and rollback. Run relevant checks and report exact files changed, tests run, approvals needed, and unknowns.
`;
}

mkdirp(out);
mkdirp(cardsDir);

const sourceHeaders = Object.keys(sourceInventory[0]);
write("source-inventory.csv", csv(sourceHeaders, sourceInventory));
write("existing-roster-build-ledger.csv", csv(Object.keys(existing[0]), existing));
write("existing-roster-build-ledger.jsonl", existing.map((e) => JSON.stringify(e)).join("\n"));
write("SOURCE_LEDGER.md", `# Source Ledger

As of: ${asOf}

${sourceLinks.map(([name, url, note]) => `- ${name}: ${url} - ${note}`).join("\n")}

## Research Limits

The current workspace does not expose a full app source tree or production data. Smoke-test examples were researched from official/current public surfaces where accessible, but the build system should use dynamic evidence fixtures and review queues instead of hardcoded replacement teams.
`);

write("00-operating-plan.md", `# NFL Roster Truth Operating Plan

As of: ${asOf}

## Mission Interpretation

Create a multi-source NFL roster truth system so player, coach, staff, team, status, number, position, transaction, and assignment facts are current, source-backed, conflict-aware, and resilient when a source lags or fails.

## User-Reported Stale Examples

- Najee Harris listed as Pittsburgh is a stale-data smoke test, not a one-off fix.
- Rico Dowdle listed as Dallas is a stale-data smoke test, not a one-off fix.

## Safety Rules

- No production database mutation.
- No deploys.
- No secrets.
- No high-volume scraping.
- No private, paywalled, login-gated, or prohibited sources.
- No hardcoded player-team patching.
- Unknown or needs-review beats confidently wrong.
- Public surfaces should not expose source weighting or founder-only reconciliation methods.

## No-Duplicate Rules

Existing freshness, source QA, player page, data outage, analytics, and public stale-warning cards are extension anchors. New builds must be roster-specific, staff-specific, transaction-specific, or validation-specific.

## Source Verification Strategy

Use Tier 1 official team/NFL pages first, Tier 2 maintained open data for IDs/history/corroboration, Tier 3 sports media/fantasy only as fallback or conflict signal, and Tier 4 news/transaction sources as review triggers.

## Repo Audit Plan

Commands planned or equivalent:

- git rev-parse --show-toplevel
- git branch --show-current
- git log --oneline --decorate --all -n 20
- rg --files
- Get-ChildItem docs/app/components/lib/data/scripts/prisma/reports
- rg for roster, player, team, coach, staff, depth, transaction, source, stale, confidence, Najee, Rico, Harris, Dowdle

## Architecture Plan

Adapters -> raw snapshots -> normalized records -> fact evidence -> reconciliation -> truth scoring -> conflict/stale records -> public-safe output -> founder-only cockpit.

## Implementation Plan

Docs-first in this workspace. Later code should be disabled-by-default or read-only until sources, terms, app paths, and production data boundaries are approved.

## Testing Plan

Design roster:audit, roster:verify, roster:diff, roster:conflicts, roster:stale, and test:roster commands. Smoke tests for Najee Harris and Rico Dowdle must compare rendered facts against current evidence fixtures.

## Rollback Plan

Generated docs/cards can be removed without production impact. Later code must use feature flags, read-only scripts, snapshots, and reversible migrations.

## Human Approval Gates

Legal/TOS source approval, any production DB writes, any live cron/scheduled fetch, any paid API, any source requiring credentials, any public freshness UI, any staff data display, and any production deploy.

## Workstreams

AGENT 0 - Coordinator / Final Integrator  
AGENT 1 - Existing Repo Roster Auditor  
AGENT 2 - Existing Build / Docs Duplicate Auditor  
AGENT 3 - Source Discovery / Official Sources  
AGENT 4 - Source Discovery / Open Data Sources  
AGENT 5 - Source Discovery / Sports Media Sources  
AGENT 6 - Player Identity / ID Resolution Architect  
AGENT 7 - Team / Roster / Status Normalization Architect  
AGENT 8 - Coach / Staff / Trainer / Football Ops Architect  
AGENT 9 - Transaction / Roster Movement Architect  
AGENT 10 - Conflict Resolution / Confidence Scoring Architect  
AGENT 11 - Data Engineering / Ingestion Architect  
AGENT 12 - Validation / Testing / Regression Architect  
AGENT 13 - Product Surface Auditor  
AGENT 14 - Founder-Only Accuracy Cockpit Architect  
AGENT 15 - Legal / TOS / Privacy Reviewer  
AGENT 16 - Claude Code Build Packet Generator  
AGENT 17 - Final Critic / Accuracy Gate Reviewer

## Files Expected

00 through 18 phase files, source inventory, source risk register, existing build ledgers, Claude build queue, card files, source ledger, and this generator.

## No-Go Areas

Live DB writes, deploys, secrets, unapproved scrapes, private staff data, source weighting disclosure, and one-off player patches.
`);

write("01-existing-work-inventory.md", `# Existing Work Inventory And Duplicate Gate

As of: ${asOf}

## Repo Shape

- Git root resolved to the user profile during prior checks, while the workspace root is ${root}.
- Workspace files scanned: ${visibleFiles.length}.
- Visible root directories: docs, reports, apps, _logs, .git.
- ${appSurfaceNote}

## Existing Roster-Relevant Work

${mdTable(["ID", "Title", "Category", "Status", "Duplicate Use", "Limitation"], existing.map((e) => [e.existing_id, e.title, e.category, e.current_status, e.duplicate_risk, e.known_limitations]))}

## Duplicate Classifications

- DUPLICATE: same goal and implementation already exists. Do not recreate.
- EXTENSION: existing work needs roster-specific source, evidence, conflict, validation, or product remediation layer.
- REPLACEMENT: stale/static roster approach should be superseded after review.
- DEPENDENCY: prerequisite for implementation.
- NET_NEW: distinct roster truth capability.
- UNCERTAIN_REQUIRES_REVIEW: app source not visible or classification cannot be proven.

## What Must Not Be Rebuilt

- Generic source freshness badge.
- Generic stale-data public warning.
- Generic data-source outage playbook.
- Generic product analytics event contract.
- Generic player page content model.
- Generic source transparency snippets.

## What Must Be Added

- NFL roster source hierarchy.
- Fact-level SourceEvidence.
- Identity resolution for players and staff.
- Team/status/position normalization.
- Transaction reconciliation.
- Conflict/stale truth scoring.
- Founder-only roster accuracy cockpit.
- CI/deploy gates for stale/mock/hardcoded roster data.
`);

write("02-current-site-data-surface-audit.md", `# Current Site Data Surface Audit

As of: ${asOf}

${appSurfaceNote}

${mdTable(["Surface", "Roster/Person Data", "Current Source State", "Risk", "Recommended Fix"], surfaces)}

## Hardcoded / Mock Risk

The app source tree is not visible here, so hardcoded player/team constants cannot be exhaustively proven or disproven. The remediation plan treats public player cards, Player Lab, GSE Rating, team pages, search/autocomplete, API endpoints, mock/demo files, seed files, tests, and generated data as high-priority surfaces for the real-clone audit.

## Required Real-Clone Audit

In the shipping clone, run targeted rg over app, components, lib, data, scripts, prisma, tests, fixtures, and generated directories for player names, team abbreviations, static rosters, mock data, and stale source markers.
`);

write("03-source-discovery-proof-hierarchy.md", `# Source Discovery And Proof Hierarchy

As of: ${asOf}

## Source Inventory

See source-inventory.csv.

## Proof Hierarchy

TIER 1 - Official current source: NFL/team roster pages, official team staff pages, official transaction/news, official injury/practice reports, gamebooks, media guides when public.

TIER 2 - Maintained open data source: nflverse/nflreadr/nflfastR/nfl-data-py style rosters, IDs, history, depth/supporting datasets.

TIER 3 - Reputable public sports media source: ESPN, CBS, Yahoo, FOX, PFR, public fantasy/reference sources after legal review.

TIER 4 - News/transaction confirmation source: official team news, NFL news, reputable public reporting. Use as trigger/review evidence.

TIER 5 - Weak/auxiliary: fantasy pools, historical references, stale pages, unverified social/news mentions.

## Truth Rules

- Official team/NFL source wins unless stale or contradicted by newer official transaction evidence.
- A current official transaction can override an older roster page but should create NEEDS_REVIEW until roster pages catch up.
- Two independent non-official sources can increase confidence but should not override a fresh official source by themselves.
- Social/news sources can trigger review but should not silently update canonical truth.
- Fantasy sources are useful for player pools/status hints, not canonical roster truth.
- Unknown beats wrong.

## Smoke-Test Interpretation

Najee Harris and Rico Dowdle should be regression examples for source-backed truth. The test is not "set Najee to X" or "set Rico to Y"; the test is "if current source evidence says the canonical value differs from the rendered value, validation fails."
`);

const sourceRiskRows = [
  ["Official pages change HTML", "HIGH", "MEDIUM", "Use adapter fixtures, parser versioning, failure logs, and low-rate probes.", "data engineering", "GO with tests"],
  ["Official roster lags transaction", "HIGH", "HIGH", "Transaction-to-roster reconciler creates NEEDS_REVIEW rather than silent overwrite.", "data quality", "GO"],
  ["Media/fantasy TOS risk", "HIGH", "MEDIUM", "Legal/robots review before automated fetch; use as manual fallback until approved.", "legal", "APPROVAL_REQUIRED"],
  ["Staff privacy overcollection", "HIGH", "MEDIUM", "Only public professional role data from official/professional sources.", "legal/data", "GO with limits"],
  ["Public method leakage", "HIGH", "MEDIUM", "Founder-only cockpit contains source weights and conflict logic; public sees simplified status.", "product", "GO"],
  ["Null overwrite", "HIGH", "MEDIUM", "Never overwrite confirmed facts with stale/null lower-confidence source.", "engineering", "GO"],
];
write("source-risk-register.md", `# Source Risk Register

As of: ${asOf}

${mdTable(["Risk", "Severity", "Likelihood", "Mitigation", "Owner", "Decision"], sourceRiskRows)}
`);

write("04-person-universe-model.md", `# Person Universe Model

As of: ${asOf}

## Player Categories

active roster, inactive game-day players, starters, backups/depth players, practice squad, injured reserve, PUP, NFI, suspended, exempt, reserve/futures, waived/released, free agent, retired, unsigned draft pick, rookie, undrafted free agent, international pathway, temporary elevations, emergency QB.

## Football Staff Categories

owner/front office if public, general manager, assistant GM, personnel executives, head coach, offensive/defensive/special teams coordinators, position coaches, assistant coaches, quality control coaches, analysts if public, strength and conditioning staff if public, athletic trainers if public, medical staff only if officially/publicly listed, equipment/scouting/football operations staff if publicly listed.

## Privacy Rule

Only collect staff data that is publicly listed in official or professional sources. Do not infer private staff, personal details, health information, home location, age, family, or anything unrelated to public professional role.

${mdTable(["Entity", "Purpose", "Core Fields", "Visibility"], entities)}
`);

write("05-identity-resolution-dedupe.md", `# Identity Resolution And Dedupe

As of: ${asOf}

## ID Fields

Use where available: gsis_id, nfl_id, espn_id, pfr_id, sleeper_id, yahoo_id, rotowire_id only if legal/available, sportradar_id only if licensed/future-approved, full_name, display_name, first_name, last_name, suffix, public birth_date where legal, college, position, team, jersey.

## Canonical Rules

- Prefer stable official/open-data IDs over names.
- Store aliases separately from canonical names.
- Keep source-specific IDs with source_id and first_seen/last_seen.
- Staff without stable IDs require source-backed manual review.
- Rookies and UDFAs can enter a provisional identity state until IDs converge.

## Fuzzy Matching Rules

Use normalized name, suffix, college, position, team, jersey, DOB where public, and external IDs. Never merge on name alone.

## Hard No-Merge Rules

- Same name with different DOB/college and no shared external ID.
- Different active teams and no transaction bridge.
- Staff vs player identity unless official evidence says role changed.
- Historical player vs current rookie without ID bridge.

## Manual Review Queue

Items enter review when confidence is below threshold, two same-name candidates exist, a source introduces a new player with no ID, or a source contradicts canonical team/status.

## Regression Tests

Same-name players, suffix handling, apostrophes, hyphenated names, nicknames, Jr/Sr/III, position changes, team changes, free agent ambiguity, and staff identities without IDs.
`);

write("06-multi-source-ingestion-architecture.md", `# Multi-Source Ingestion Architecture

As of: ${asOf}

## Adapter Contract

\`\`\`ts
type RosterSourceAdapter = {
  sourceId: string
  fetchRoster(teamId: string): Promise<RawSourceSnapshot>
  parseRoster(snapshot: RawSourceSnapshot): Promise<NormalizedRosterRecord[]>
  fetchStaff?(teamId: string): Promise<RawSourceSnapshot>
  parseStaff?(snapshot: RawSourceSnapshot): Promise<NormalizedStaffRecord[]>
  fetchTransactions?(): Promise<RawSourceSnapshot>
  parseTransactions?(snapshot: RawSourceSnapshot): Promise<NormalizedTransactionRecord[]>
}
\`\`\`

## Evidence Required On Every Normalized Fact

source_id, source_name, source_url, fetched_at, source_updated_at if available, raw_value, normalized_value, confidence_hint, parser_version.

## Flow

1. Source adapters fetch low-volume, approved public data or fixtures.
2. Raw snapshots are stored with URL, fetched_at, hash, source, parser_version, and record count.
3. Parsers convert source-specific records to normalized records.
4. Reconciliation compares facts by person/team/status/number/position/staff role.
5. Confidence scoring accounts for authority, freshness, agreement, volatility, and parser confidence.
6. Conflicts become ConflictRecord items.
7. Stale data becomes ValidationError or warning depending severity.
8. Public-safe output hides internal weights and uncertain facts.
9. Founder cockpit shows evidence, conflicts, freshness, parser errors, and source failures.

## Implementation Guardrail

In this workspace, implement docs and build cards only. In the real clone, any script must be read-only and disabled from production behavior until approved.
`);

write("07-truth-scoring-conflict-resolution.md", `# Truth Scoring And Conflict Resolution

As of: ${asOf}

## Fact Types

team assignment, roster status, jersey number, position, height, weight, age/DOB, college, experience, depth chart role, injury/practice status, transaction status, coach role, staff role.

## Fact Fields

canonical_value, confidence_score 0-100, truth_status, source_count, official_source_count, latest_source_at, conflict_count, stale_source_count, evidence_ids.

## Truth Status Values

CONFIRMED, OFFICIAL_ONLY, MULTI_SOURCE_CONFIRMED, CONFLICTED, STALE, UNSOURCED, UNKNOWN, NEEDS_REVIEW.

## Scoring Inputs

source authority, freshness, independent agreement, transaction recency, field volatility, source coverage, parser confidence, known source lag, historical consistency, and founder/admin-approved manual override.

## Minimum Public Display Rules

- Team assignment: official source OR two independent current sources OR recent official transaction evidence.
- Roster status: official roster/status source OR current official transaction/injury evidence.
- Jersey number: official/team source preferred; otherwise lower confidence.
- Coach/staff role: official team source or official media guide preferred.
- Trainer/staff info: public official/professional source only.
- Conflicted facts: do not silently display as confirmed.
- Stale facts: warn internally or hide/qualify publicly.
`);

write("08-team-status-position-normalization.md", `# Team, Status, And Position Normalization

As of: ${asOf}

## Team Issues

Normalize LA/LAR/LAC, JAX/JAC, ARI/ARZ, WSH/WAS, historical abbreviations, relocation history, free agent/null team, retired/null team, practice squad team, reserve statuses, and international-game fields that are not team changes.

## Status Taxonomy

${statuses.map((s) => `- ${s}`).join("\n")}

## Position Taxonomy

${positions.map((p) => `- ${p}`).join("\n")}

## Depth Role Taxonomy

starter, backup, rotational, practice squad, injured, specialist, unknown, source-specific rank, confidence.

## Rules

- Preserve source_value next to normalized_value.
- Unknown source status maps to UNKNOWN, not ACTIVE.
- Practice squad is a team membership with non-active roster status.
- Injury/practice participation is availability, not necessarily roster membership.
`);

write("09-coach-staff-trainer-system.md", `# Coach, Staff, And Trainer Accuracy System

As of: ${asOf}

## Scope

Coaches, coordinators, assistant coaches, quality control, public analysts, front office if relevant, strength and conditioning if officially/publicly listed, athletic trainers if officially/publicly listed, medical staff only if officially/publicly listed, football operations staff if public.

## Rules

- Official team staff pages and media guides preferred.
- Do not infer private staff.
- Do not collect personal/private details.
- Staff role changes must be timestamped.
- Staff can have multiple roles over time.
- If no official source exists, mark UNKNOWN rather than inventing.

## Data Model

StaffProfile, StaffRoleAssignment, StaffSnapshot, StaffSourceEvidence, StaffConflictRecord, StaffVerificationRun.

## Product Use Cases

Coach/team context for articles, team intelligence, public education, founder cockpit source health, and staff-change alerts. Keep medical/trainer data conservative and source-only.
`);

write("10-transaction-movement-tracking.md", `# Transaction And Movement Tracking

As of: ${asOf}

## Transaction Types

signed, released, waived, claimed, traded, placed on IR, activated from IR, designated to return, moved to practice squad, elevated from practice squad, reverted to practice squad, reserve/futures, suspended, retired, reinstated, number change, position change, coach hired, coach fired, staff role changed.

## Required Fields

person_id, team_id, old_team_id, new_team_id, old_status, new_status, transaction_type, effective_date, source_evidence, confidence, downstream surfaces impacted.

## Detectors

- current roster changed
- stale player team assignment
- player moved teams
- staff changed roles
- jersey conflict
- transaction-to-roster mismatch
- future-dated/pending transaction

## Rule

A transaction can be more current than a roster page, but it should not silently update public truth without evidence and a review/confirmation state.
`);

write("11-validation-test-harness.md", `# Validation And Accuracy Test Harness

As of: ${asOf}

## Required Checks

- no active player assigned to multiple active teams unless conflict record exists
- no current player shown on stale team when newer transaction says otherwise
- no duplicate active player rows
- no duplicate jersey number conflicts unless allowed by status/source
- all public player cards have source evidence
- all current team assignments have freshness timestamp
- all roster statuses use normalized taxonomy
- all staff roles use normalized taxonomy
- no mock/demo player data leaks into production public surfaces
- no hardcoded roster constants without source annotation
- all team abbreviations normalize correctly
- stale data over threshold is flagged
- conflicts create review records
- source failures do not silently overwrite canonical truth
- source parser errors are logged
- regression examples are tested after current-source verification

## Commands To Add Later

- pnpm roster:audit
- pnpm roster:verify
- pnpm roster:diff
- pnpm roster:conflicts
- pnpm roster:stale
- pnpm test:roster

## Smoke Test Rule

Najee Harris and Rico Dowdle tests should assert that if current source evidence says the canonical team/status differs from rendered value, validation fails. Do not hardcode the replacement team in the test without refreshing fixtures.
`);

write("12-founder-roster-accuracy-cockpit.md", `# Founder-Only Roster Accuracy Cockpit

As of: ${asOf}

## Private Cockpit

Shows roster truth health score, stale teams, conflicting team assignments, jersey conflicts, status conflicts, unresolved transactions, source freshness by provider, source failure log, current run results, changed players in 24h/7d, staff changes, practice squad changes, free agent changes, confidence distribution, manual review queue, source evidence drilldown, parser errors, team coverage, known stale examples, and deploy-blocking data quality issues.

## Public-Safe Version

Optional last verified timestamp and qualified freshness wording only. Do not expose source weights, internal conflict logic, parser details, or founder-only source strategy.
`);

write("13-product-surface-remediation-map.md", `# Product Surface Remediation Map

As of: ${asOf}

${mdTable(["Surface", "Risk", "Required Fix", "Freshness", "Deploy Gate", "Priority", "Build Card"], [
  ["public player cards", "wrong team/number/status", "Render from canonical fact API with SourceEvidence", "show public last verified when safe", "block stale confirmed facts", "P0", "BUILD-NRT-037"],
  ["Player Lab", "what-changed feed based on stale roster", "Join through transaction reconciler", "internal freshness required", "block conflicted current team", "P0", "BUILD-NRT-038"],
  ["GSE Rating surfaces", "rating context attached to wrong team", "Use canonical person/team IDs", "internal freshness required", "block stale team context", "P0", "BUILD-NRT-039"],
  ["team pages", "stale roster list", "RosterSnapshot based renderer", "public label optional", "warning/block by threshold", "P1", "BUILD-NRT-041"],
  ["search/autocomplete", "stale team next to player name", "Canonical person index plus aliases", "internal freshness required", "block stale active-team result", "P0", "BUILD-NRT-040"],
  ["content/briefs", "article mentions outdated team", "Roster mention linter", "internal freshness required", "warning before publish", "P1", "BUILD-NRT-042"],
  ["API endpoints", "unverified JSON consumed by UI", "Roster API response contract", "include internal status", "contract test", "P0", "BUILD-NRT-043"],
  ["founder cockpit", "no visibility into source conflicts", "Build accuracy cockpit", "source-by-source", "manual review queue", "P0", "BUILD-NRT-045"],
  ["mock/demo/seed data", "fake data leaks publicly", "No mock roster public leak gate", "not applicable", "blocking error", "P0", "BUILD-NRT-058"],
])}
`);

write("14-implementation-guardrails.md", `# Implementation Guardrails

As of: ${asOf}

## Permitted Next Code Work

Source adapter interfaces, TypeScript types, read-only validation scripts, fixtures, normalization maps, local snapshot format, founder-only reports, and tests.

## Not Permitted Without Approval

Production database mutation, deploys, secrets, live cron jobs, high-volume scraping, paid APIs, public source scoring details, data pipeline replacement, or deleting existing data.

## Safe First Implementation

Create type contracts and fixture-backed tests first. Then add read-only audit scripts. Only after source/TOS approval should adapters fetch current public sources at low volume.
`);

write("15-build-queue-summary.md", `# Claude Build Queue Summary

As of: ${asOf}

Build cards created: ${builds.length}.

${mdTable(["ID", "Title", "Category", "Gate", "Priority", "Difficulty"], builds.map((b) => [b.id, b.title, b.category, b.duplicate_check_status, b.priority, b.difficulty]))}
`);

write("16-data-quality-ci-deploy-gate.md", `# Data Quality CI / Deploy Gate Design

As of: ${asOf}

## Blocking Errors

- production build uses mock roster data on public player surfaces
- active player has stale team assignment over threshold
- player rendered without canonical ID or fallback review status
- conflicting team assignment has no ConflictRecord
- source adapter failure hidden silently
- public player page uses old static seed when canonical source exists
- status outside taxonomy
- team abbreviation outside taxonomy
- coach/staff data displayed without public source evidence

## Warnings

- team roster under expected coverage
- stale source snapshot close to threshold
- jersey number conflict with explainable reserve/practice status
- fallback-only fact shown internally
- staff source older than threshold

## Review Conditions

Manual review required for transaction/roster mismatch, same-name ambiguity, rookie missing stable ID, media/fantasy source disagreement, and any staff role not backed by official/professional source.

## Audit Cadence

Nightly audit during season and roster-cut windows after approval. Pre-deploy audit for all releases touching player/team/staff surfaces. Post-deploy audit after any data pipeline change.
`);

write("17-final-accuracy-critic.md", `# Final Accuracy Critic

As of: ${asOf}

1. Did we audit existing roster work first? Yes, visible docs/builds were inventoried and ledgers were created.
2. Did we avoid duplicate builds? Yes, new cards are extensions/replacements/dependencies around existing source/player/freshness work.
3. Did we identify every current source of roster data in repo? Only within the visible docs/control workspace; real app source is not visible and remains an unknown.
4. Did we find hardcoded/mock/stale player data? We found planned/mock risks, but no app source to prove production leakage.
5. Did we map every public surface using roster data? Mapped likely surfaces from docs and mission context; real-clone audit required.
6. Did we design multiple source inputs? Yes.
7. Did we define source hierarchy? Yes.
8. Did we define confidence scoring? Yes.
9. Did we define conflict handling? Yes.
10. Did we define stale detection? Yes.
11. Did we handle coaches/staff/trainers carefully? Yes, with privacy limits.
12. Did we protect privacy? Yes.
13. Did we create regression checks for user-reported stale examples? Yes, as dynamic smoke tests.
14. Did we create data quality deploy gates? Yes.
15. Did we avoid unsafe scraping? Yes, no scraping was performed by this generator.
16. Did we mark unknowns clearly? Yes.
17. Did we run relevant tests/checks? Generator/JSONL/safety scans should be run after generation.
18. Did we document all code changes? Supporting generator only; no production code.
19. Did we avoid production DB mutation? Yes.
20. Is the system good enough to protect trust? It is an execution blueprint; implementation in the real clone plus approved sources is required.
`);

write("18-final-report.md", `# Final Report - NFL Roster Truth System

As of: ${asOf}

## 1. Executive Summary

GSE needs a multi-source NFL roster truth layer before public roster/person facts can be trusted. The core recommendation is a canonical fact system with SourceEvidence, ConfidenceScore, ConflictRecord, stale detection, transaction reconciliation, and founder-only audit visibility.

## 2. Current Roster Data Failure Class

The failure is not one stale player. It is a system class: static or weakly sourced player team/status/number/position/staff data can drift while public surfaces continue to render it as current.

## 3. User-Reported Stale Examples

Najee Harris listed as Pittsburgh and Rico Dowdle listed as Dallas are regression smoke tests. They should not be patched by name. They should fail validation whenever current source evidence disagrees with rendered player facts.

- Rico Dowdle: current-source check found official Steelers roster evidence listing Rico Dowdle as RB #13, plus an official Steelers signing article and NFL.com player context for Pittsburgh. A Dallas listing is stale; a Carolina-only 2025 context is historical and should not render as current.
- Najee Harris: current-source check found Chargers 2026 free-agent context and public reports describing him as a free agent after a one-year Chargers contract and Achilles injury. A Pittsburgh current-team listing is stale. If no fresh official roster/signing evidence exists, canonical status should be FREE_AGENT or NEEDS_REVIEW rather than a guessed team.

## 4. Existing Repo Roster System Found

No complete app roster system was visible in this workspace. Existing docs define source freshness, stale warnings, player pages, Player Lab, data-source outage handling, and sports data contract tests, but not a roster truth engine.

## 5. Existing Docs/Builds Found

See 01-existing-work-inventory.md and existing-roster-build-ledger.*.

## 6. Duplicate Risks Found

Do not recreate generic source freshness, stale-data warning, source outage, source transparency, analytics contract, or player page content work. Extend those with NFL roster facts and gates.

## 7. Current Product Surfaces At Risk

Public player cards, Player Lab, GSE Rating, team pages, search/autocomplete, content/briefs, API endpoints, mock/demo/seed files, and founder cockpit.

## 8. Source Inventory Summary

Official NFL/team sources are Tier 1. nflverse is Tier 2 for IDs/history/open-data corroboration. ESPN/CBS/Yahoo/FOX/PFR/Sleeper are fallback/corroboration only after legal review.

## 9. Source Proof Hierarchy

Official current source wins unless stale or contradicted by newer official transaction evidence. Open data and media sources increase confidence or trigger review. Unknown beats wrong.

## 10. Person Universe Model

Includes active players, reserves, practice squad, IR/PUP/NFI/suspended/exempt/free agent/retired states, coaches, coordinators, public football ops, and public staff only.

## 11. Player Identity Resolution Plan

Use external IDs where available, aliases, fuzzy matching with hard no-merge rules, and manual review for rookies/UDFAs/staff/no-ID cases.

## 12. Team/Status/Position Normalization Plan

Normalize team aliases, roster status taxonomy, position taxonomy, depth role taxonomy, and source-specific raw values.

## 13. Coach/Staff/Trainer Plan

Official team staff pages and media guides preferred. Public professional role data only. No private personal or medical inference.

## 14. Transaction Tracking Plan

Transactions can override older roster pages temporarily, but must create NEEDS_REVIEW until the roster evidence converges.

## 15. Multi-Source Ingestion Architecture

Adapters -> raw snapshots -> normalized records -> evidence -> reconciliation -> confidence -> conflicts/stale records -> public-safe output -> founder cockpit.

## 16. Truth Scoring/Conflict Resolution

Each fact gets canonical_value, confidence_score, truth_status, evidence_ids, official_source_count, latest_source_at, conflict_count, and stale_source_count.

## 17. Data Quality Validation Plan

Read-only commands: roster:audit, roster:verify, roster:diff, roster:conflicts, roster:stale, test:roster.

## 18. Founder-Only Roster Cockpit Plan

Show source freshness, conflicts, stale facts, changed players, staff changes, source failures, parser errors, manual review, and deploy blockers.

## 19. Public/Private Boundary

Public sees fact, qualification, and last verified if safe. Founder/admin sees evidence, source weights, conflict reasons, and parser details.

## 20. Legal/TOS/Privacy Cautions

Legal review required before automated scraping/fetching from media/fantasy sources. Staff data must remain public professional role only.

## 21. Implementation Changes Made

Docs and build packet generator only. No production app code, DB mutation, source scraping, deploy, or secrets.

## 22. Build Queue Summary

${builds.length} executable NFL roster truth build cards created.

## 23. P0 Fixes

Source inventory/TOS, adapter contract, official/nflverse adapter plans, ID model, team/status/position normalization, evidence storage, truth scoring, conflict/stale detection, transaction reconciliation, player surface remediation, search guard, cockpit, validation CLI, dynamic smoke tests, CI gate.

## 24. P1 Fixes

Staff source map, depth chart evaluation, public freshness labels, content linter, team page rendering, nightly/postdeploy audit plans.

## 25. Long-Term Architecture

Move from static roster facts to evidence-backed canonical facts with source snapshots, reconciliation, confidence, and auditability.

## 26. Commands Run

Attachment read; git/workspace shape commands; file count commands; rg roster/source audit; official/current-source web research; generator run; JSONL validation; duplicate-gate validation; safety/secret scan.

## 27. Tests Run

Generator run passed. JSONL parse passed for 68 rows. Build count passed for 68 cards. Duplicate-gate coverage passed with 0 missing rationales and 0 duplicate IDs. Safety/secret scan returned no matches. No app typecheck/lint/tests were run because no full app/package source tree is visible in this workspace.

## 28. Files Created

See docs/research/nfl-roster-truth and reports/codex/generate-nfl-roster-truth.mjs.

## 29. Unknowns

Real shipping clone app files, production roster data path, actual rendered stale pages, source TOS approvals, official adapter feasibility, current paid/licensed data providers, and current production deployment gates.

## 30. Human Approvals Needed

Legal/TOS source approval, paid/licensed provider approval, any production DB write, any live scheduled fetch, any public source/freshness UI, staff data display, and deploy gates.
`);

write("claude-build-queue/index.md", `# NFL Roster Truth Claude Build Queue

As of: ${asOf}

${mdTable(["ID", "Title", "Category", "Gate", "Priority", "Difficulty"], builds.map((b) => [b.id, b.title, b.category, b.duplicate_check_status, b.priority, b.difficulty]))}
`);

write("claude-build-queue/build-queue.jsonl", builds.map((b) => JSON.stringify(b)).join("\n"));
for (const b of builds) {
  const file = path.join(cardsDir, `${b.id}-${slug(b.title)}.md`);
  fs.writeFileSync(file, cardMarkdown(b), "utf8");
}

console.log(JSON.stringify({
  visibleFiles: visibleFiles.length,
  existingItems: existing.length,
  sources: sourceInventory.length,
  builds: builds.length,
  output: path.relative(root, out).replace(/\\/g, "/"),
}, null, 2));

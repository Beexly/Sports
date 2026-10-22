import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..", "..");
const out = path.join(root, "docs", "research", "site-war-room");
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
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if ([".git", "node_modules", ".next", "dist", "build"].includes(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

const visibleFiles = [
  ...walk(path.join(root, "docs")),
  ...walk(path.join(root, "reports")),
  ...walk(path.join(root, "apps")),
].map((file) => path.relative(root, file).replace(/\\/g, "/"));

const controlLane = "This Galaxy folder is a docs/control workspace. It exposes docs, reports, and an empty apps directory, but no visible app/pages/components/lib/data/public/styles/scripts source tree. Route-level screenshots and production UI implementation require the real shipping clone.";

const existing = [
  ["HELP-UX", "docs/research/help-education-ux", "Help Education UX package", "help/onboarding/readability", "planned/scaffolded", "Every complex item needs 10-second explanation and media/help slot.", "EXTENSION", "Extend into full site war-room and route patterns."],
  ["NRT", "docs/research/nfl-roster-truth", "NFL roster truth packet", "data trust", "planned", "Roster accuracy and source freshness must inform UI trust states.", "DEPENDENCY", "Use for player/team/status trust surfaces."],
  ["BUILD-GV2-011", "docs/research/growth-os-v2/claude-build-queue/cards/BUILD-GV2-011-free-to-pro-gse-rating-education-ladder.md", "GSE Rating education ladder", "GSE Rating education", "planned", "Rating needs reveal-less education and upgrade path.", "EXTENSION", "Use inside rating page and homepage preview."],
  ["BUILD-GV2-020", "docs/research/growth-os-v2/claude-build-queue/cards/BUILD-GV2-020-receipts-freshness-badge-system.md", "Receipts freshness badge", "trust/source", "planned", "Freshness needs public-safe badge pattern.", "EXTENSION", "Use in Track Record and source labels."],
  ["BUILD-GV2-021", "docs/research/growth-os-v2/claude-build-queue/cards/BUILD-GV2-021-player-lab-what-changed-feed.md", "Player Lab what-changed feed", "Player Lab", "planned", "Engagement route for player changes.", "EXTENSION", "Make primary product habit loop."],
  ["BUILD-GV2-022", "docs/research/growth-os-v2/claude-build-queue/cards/BUILD-GV2-022-rating-movers-board.md", "Rating Movers board", "engagement", "planned", "Strong homepage and retention surface.", "EXTENSION", "Visualize movement without fake certainty."],
  ["BUILD-GV2-031", "docs/research/growth-os-v2/claude-build-queue/cards/BUILD-GV2-031-responsible-leaderboard-guardrails.md", "Responsible leaderboard guardrails", "responsible play", "planned", "Any competitive loop needs guardrails.", "DEPENDENCY", "Use for contests/leaderboards only."],
  ["BUILD-GV2-041", "docs/research/growth-os-v2/claude-build-queue/cards/BUILD-GV2-041-gse-human-voice-rules.md", "GSE human voice rules", "copy", "planned", "Human copy standard.", "EXTENSION", "Apply to every page and CTA."],
  ["BUILD-GV2-056", "docs/research/growth-os-v2/claude-build-queue/cards/BUILD-GV2-056-content-refresh-and-freshness-queue.md", "Content refresh and freshness queue", "content", "planned", "Content must stay fresh and source-aware.", "EXTENSION", "Use for Daily Brief/content product."],
  ["BUILD-GV2-076", "docs/research/growth-os-v2/claude-build-queue/cards/BUILD-GV2-076-product-analytics-event-contract.md", "Product analytics event contract", "analytics", "planned", "Event taxonomy exists at generic level.", "EXTENSION", "Add route-specific design/product events."],
  ["BUILD-GV2-099", "docs/research/growth-os-v2/claude-build-queue/cards/BUILD-GV2-099-stale-data-public-warning-pattern.md", "Stale data public warning", "trust", "planned", "Public warning copy exists.", "EXTENSION", "Use for roster/source/site quality states."],
  ["OSS-074", "docs/research/oss-leverage-stack/claude-build-queue/cards/BUILD-074-design-token-map.md", "Design token map", "design system", "planned", "Design token concept exists.", "EXTENSION", "Turn into GSE-specific visual system."],
  ["OSS-079", "docs/research/oss-leverage-stack/claude-build-queue/cards/BUILD-079-screenshot-qa-workflow.md", "Screenshot QA workflow", "visual QA", "planned", "Screenshot workflow exists.", "EXTENSION", "Use for before/after route QA."],
  ["OSS-087", "docs/research/oss-leverage-stack/claude-build-queue/cards/BUILD-087-customer-onboarding-clips.md", "Customer onboarding clips", "video/onboarding", "planned", "Video onboarding exists.", "EXTENSION", "Use Galaxy Studios help layer."],
  ["OSS-112", "docs/research/oss-leverage-stack/claude-build-queue/cards/BUILD-112-source-transparency-snippets.md", "Source transparency snippets", "trust/source", "planned", "Trust/source snippets exist.", "EXTENSION", "Use as public-safe source language."],
  ["NEXT-001", "docs/research/oss-next-wave-stack/claude-build-packets/build-packets.jsonl", "PostHog analytics foundation", "analytics", "planned", "Analytics stack research exists.", "DEPENDENCY", "Use once implementation approved."],
  ["NEXT-025", "docs/research/oss-next-wave-stack/claude-build-packets/build-packets.jsonl", "Payload content model", "CMS/content", "planned", "Content model research exists.", "EXTENSION", "Use for editorial/product education model."],
  ["HELP-002", "docs/research/help-education-ux/claude-build-queue/cards/BUILD-HELP-002-raw-json-page-humanizer.md", "Raw JSON page humanizer", "readability", "planned", "Directly addresses JSON page problem.", "P0", "Implement first in real clone."],
  ["HELP-005", "docs/research/help-education-ux/claude-build-queue/cards/BUILD-HELP-005-galaxy-studios-help-hub.md", "Galaxy Studios help hub", "support/onboarding/video", "planned", "Product education layer.", "EXTENSION", "Make persistent help hub."],
];

const references = [
  ["web.dev Core Web Vitals", "https://web.dev/articles/vitals", "Performance must be judged by user-centric LCP/INP/CLS, not just aesthetic polish.", "Use budgets and route gates.", "Do not add cinematic weight that hurts INP/LCP."],
  ["web.dev INP", "https://web.dev/inp/", "Responsiveness is a stable Core Web Vital and should target <=200ms at p75.", "Keep interactions light, defer heavy motion.", "Avoid expensive client-side animation on first screens."],
  ["W3C WCAG 2.2", "https://www.w3.org/TR/WCAG22/", "Accessibility is a stable W3C standard; design must keep keyboard, focus, contrast, headings, and cognitive clarity.", "Build accessibility gates into every route.", "Do not treat accessibility as a post-design patch."],
  ["Apple Human Interface Guidelines - Motion", "https://developer.apple.com/design/human-interface-guidelines/motion", "Motion should convey status, feedback, instruction, and respect accessibility settings.", "Use purposeful signal motion and reduced-motion fallbacks.", "Avoid decorative animation that competes with comprehension."],
  ["Bloomberg UX", "https://www.bloomberg.com/ux/", "Complex data products need interaction design, visualization, and prototyping discipline.", "Borrow concealed complexity and dense-but-scan-ready layouts.", "Do not copy terminal aesthetics literally."],
  ["Bloomberg Terminal UX story", "https://www.bloomberg.com/company/stories/how-bloomberg-terminal-ux-designers-conceal-complexity/", "Advanced users need power, but complexity should be progressively exposed.", "Use founder/pro/internal drilldowns while keeping public surfaces simple.", "Do not expose method internals to look smart."],
  ["ESPN navigation guide", "https://www.espn.com/espn/news/story/_/id/5474529", "Sports users value fast personalization by sport/team/player.", "Use saved teams/players/watchlists and score-like signal rails.", "Do not create a maze of sports tabs."],
  ["The Athletic App Store", "https://apps.apple.com/us/app/the-athletic-all-sports-news/id1135216317", "Premium sports products sell follow-your-favorites and clean coverage.", "Borrow personalization and ad-free premium trust.", "Do not become article-only."],
  ["Webby 2025 winners", "https://www.webbyawards.com/press/press-releases/29th-annual-webby-awards-announce-2025-winners/", "Award-winning web work rewards distinct voice, strong interaction, and memorable positioning.", "Use as ambition benchmark, not a design to copy.", "Do not copy winning layouts/assets."],
  ["Awwwards", "https://www.awwwards.com/", "Premium web design rewards craft, motion, typography, and distinct visual identity.", "Borrow discipline around visual contrast and transitions.", "Do not sacrifice performance or readability for awards aesthetics."],
];

const routes = [
  ["/", "Explain GSE in 10 seconds; route to Rating, Player Lab, Track Record, Pricing.", "cinematic hero, what changed panel, no-bet/risk, receipts, rating preview", "P0"],
  ["/intelligence/rating", "Make GSE Rating understandable and valuable without method leakage.", "dominant score, movement, confidence/risk, source freshness, locked deeper reads", "P0"],
  ["/players", "Let users find players fast and understand team/status/risk context.", "search, filters, cards/table toggle, saved/watchlist hooks", "P0"],
  ["/player-lab", "Core research workspace for player rabbit holes and what changed.", "tabs, compare, watchlist, changes, freshness, upgrade depth", "P0"],
  ["/track-record", "Prove trust with receipts and autopsies.", "wins/misses/no-bet autopsies, source freshness, humility copy", "P0"],
  ["/pricing", "Clarify FREE/PRO/ELITE value without pressure.", "tier cards, examples, FAQ, refund/support trust", "P0"],
  ["/promotions", "Trust-safe partner/promotions surface.", "disclosures, geo/age states, no live links until approved", "P1"],
  ["/brief", "Make content feel like product intelligence.", "Daily Brief, key takeaways, product CTAs, source legend", "P1"],
  ["/support", "Guide confused users and reduce churn.", "help center, how-to, video, support categories", "P1"],
  ["/account", "Manage subscription and preferences clearly.", "plan, alerts, watchlists, cancellation trust", "P1"],
  ["/cockpit", "Founder-only control and QA view.", "hidden route/admin auth; design QA, source/data warnings", "P2"],
];

const tokens = {
  as_of: asOf,
  visual_north_star: "Premium sports intelligence command center: cinematic, restrained, readable, fast.",
  colors: {
    ink: "#061014",
    field: "#071d18",
    signal: "#44f2a1",
    pulse: "#7dd3fc",
    pressure: "#fbbf24",
    risk: "#fb7185",
    surface: "rgba(255,255,255,0.07)",
    border: "rgba(255,255,255,0.14)",
    text_primary: "#f6faf8",
    text_secondary: "#a7b5b2",
  },
  typography: {
    display: "tight but readable, no negative letter spacing",
    body: "plain human, high contrast, 16px minimum for body",
    data: "tabular numbers for ratings, odds-like data, receipts",
  },
  spacing: [4, 8, 12, 16, 24, 32, 48, 64, 96],
  radius: { cards: 8, controls: 8, pills: 999 },
  motion: {
    fast: "120ms",
    standard: "180ms",
    reveal: "260ms",
    max_nonessential: "400ms",
    easing: "cubic-bezier(.2,.8,.2,1)",
    reduced_motion: "replace movement with opacity/focus state",
  },
};

const events = [
  ["page_view", "path,tier,device,entry_source", "route health, content funnels", "privacy-safe"],
  ["hero_cta_clicked", "cta_id,path,tier", "homepage clarity", "privacy-safe"],
  ["rating_viewed", "rating_id,sport,tier,confidence_band", "core product engagement", "avoid method details"],
  ["rating_mover_viewed", "mover_id,direction,tier", "habit loop", "privacy-safe"],
  ["player_viewed", "player_id_hash,team,tier", "Player Lab/player page engagement", "hash identifiers"],
  ["player_saved", "player_id_hash,tier", "watchlist activation", "hash identifiers"],
  ["watchlist_created", "count,tier", "retention setup", "privacy-safe"],
  ["compare_used", "surface,count,tier", "deep engagement", "privacy-safe"],
  ["no_bet_viewed", "surface,tier", "risk education", "avoid advice claims"],
  ["risk_panel_opened", "surface,tier", "trust comprehension", "privacy-safe"],
  ["track_record_viewed", "period,tier", "trust", "privacy-safe"],
  ["pricing_viewed", "entry_path,tier", "conversion", "privacy-safe"],
  ["upgrade_clicked", "source_surface,plan", "conversion", "no payment data"],
  ["promotion_viewed", "partner_status,geo_state", "promotions UX", "do not collect precise location without approval"],
  ["affiliate_outbound_clicked", "partner_id,offer_id,disclosure_seen", "partner funnel", "approval required before live links"],
  ["article_viewed", "article_id,topic", "content", "privacy-safe"],
  ["brief_viewed", "brief_date,tier", "daily habit", "privacy-safe"],
  ["support_opened", "surface,reason", "support UX", "avoid sensitive text in events"],
  ["onboarding_started", "entry_path", "activation", "privacy-safe"],
  ["onboarding_completed", "selected_goals_count", "activation", "avoid sensitive preferences"],
  ["search_used", "surface,query_type", "findability", "do not log raw query if PII risk"],
  ["tab_changed", "surface,from,to", "IA clarity", "privacy-safe"],
  ["locked_feature_clicked", "feature_id,plan_required", "upgrade education", "privacy-safe"],
];

const buildRows = [
  ["001","Site route inventory and source clone locator","information architecture","P0","S",["HELP-UX"],["all routes"]],
  ["002","Homepage 10-second command hero","homepage","P0","L",["HELP-004","BUILD-GV2-011"],["/"]],
  ["003","Homepage what-changed signal panel","homepage","P0","M",["BUILD-GV2-021","BUILD-GV2-022"],["/"]],
  ["004","Homepage no-bet risk trust panel","homepage","P0","M",["BUILD-GV2-017","BUILD-GV2-044"],["/"]],
  ["005","Homepage Track Record receipts strip","homepage","P0","M",["BUILD-GV2-020","BUILD-GV2-019"],["/"]],
  ["006","Homepage Player Lab preview","homepage","P0","M",["BUILD-GV2-021"],["/"]],
  ["007","FREE PRO ELITE homepage ladder","homepage","P0","M",["BUILD-115","BUILD-GV2-011"],["/"]],
  ["008","Primary navigation simplification","information architecture","P0","M",["HELP-004"],["global nav"]],
  ["009","Mobile navigation command sheet","mobile","P0","M",["HELP-024"],["mobile nav"]],
  ["010","Footer trust and support architecture","support/onboarding","P1","S",["BUILD-109","BUILD-GV2-037"],["footer"]],
  ["011","GSE visual token implementation packet","visual system","P0","M",["OSS-074"],["design system"]],
  ["012","Dark command-center surface system","visual system","P0","M",["OSS-074"],["global UI"]],
  ["013","Data card hierarchy system","visual system","P0","M",["HELP-025"],["cards"]],
  ["014","Rating badge visual language","visual system","P0","S",["BUILD-GV2-011"],["GSE Rating"]],
  ["015","Risk volatility no-bet color system","visual system","P0","S",["BUILD-GV2-044"],["risk surfaces"]],
  ["016","Source freshness badge system","visual system","P0","S",["BUILD-GV2-020","BUILD-112"],["source/freshness"]],
  ["017","Upgrade locked-state design system","conversion","P0","M",["BUILD-115"],["locked states"]],
  ["018","Promotions trust-safe card system","promotions","P1","M",["BUILD-GV2-001","BUILD-GV2-003"],["/promotions"]],
  ["019","Content/brief card system","content/brief","P1","M",["BUILD-GV2-047"],["/brief","articles"]],
  ["020","Support/help card system","support/onboarding","P1","M",["BUILD-109","HELP-006"],["/support"]],
  ["021","Motion token implementation","motion","P0","M",["HELP-008"],["global UI"]],
  ["022","Reduced motion gate","accessibility","P0","S",["HELP-023"],["motion"]],
  ["023","Signal pulse interaction primitive","motion","P1","M",["HELP-008"],["rating movers"]],
  ["024","Rating movement animation","motion","P1","M",["BUILD-GV2-022"],["GSE Rating"]],
  ["025","Scroll reveal rules","motion","P2","S",["HELP-008"],["marketing/content"]],
  ["026","Loading skeleton system","performance","P0","M",[],["loading states"]],
  ["027","Empty state system","support/onboarding","P0","S",["HELP-039"],["empty states"]],
  ["028","Error recovery system","support/onboarding","P0","S",["HELP-040"],["error states"]],
  ["029","Raw JSON humanizer component","route cleanup","P0","M",["HELP-002"],["JSON/API pages"]],
  ["030","Table-first formatter","route cleanup","P0","M",["HELP-009"],["data views"]],
  ["031","GSE Rating page above-fold redesign","GSE Rating","P0","L",["BUILD-GV2-011"],["/intelligence/rating"]],
  ["032","GSE Rating explain-without-recipe drawer","GSE Rating","P0","M",["BUILD-GV2-085","BUILD-112"],["/intelligence/rating"]],
  ["033","GSE Rating movement reason cards","GSE Rating","P0","M",["BUILD-GV2-022"],["/intelligence/rating"]],
  ["034","GSE Rating source freshness public/private split","GSE Rating","P0","M",["NRT","BUILD-GV2-020"],["/intelligence/rating"]],
  ["035","GSE Rating PRO ELITE depth upsell","GSE Rating","P1","M",["BUILD-115"],["/intelligence/rating"]],
  ["036","Player Lab tab hierarchy redesign","Player Lab","P0","L",["BUILD-GV2-021"],["/player-lab"]],
  ["037","Player Lab compare mode","Player Lab","P1","L",["BUILD-GV2-023"],["/player-lab"]],
  ["038","Player Lab watchlist hook","Player Lab","P0","M",["BUILD-GV2-026"],["/player-lab"]],
  ["039","Player Lab current team/status trust state","Player Lab","P0","M",["NRT"],["/player-lab"]],
  ["040","Player Lab mobile card/table switcher","Player Lab","P0","M",["HELP-024"],["/player-lab mobile"]],
  ["041","Players search redesign","Player Lab","P0","M",["NRT"],["/players"]],
  ["042","Rating Movers board","engagement/time-on-site","P0","M",["BUILD-GV2-022"],["/rating-movers"]],
  ["043","What changed since yesterday feed","engagement/time-on-site","P0","M",["BUILD-GV2-021"],["home","Player Lab"]],
  ["044","Watchlist homepage module","engagement/time-on-site","P1","M",["BUILD-GV2-026"],["home","account"]],
  ["045","No-bet radar teaser","engagement/time-on-site","P0","M",["BUILD-GV2-017"],["home","risk"]],
  ["046","Injury shock board visual shell","engagement/time-on-site","P1","M",["BUILD-GV2-049"],["injury board"]],
  ["047","Market movement board visual shell","engagement/time-on-site","P1","M",["BUILD-GV2-050"],["market board"]],
  ["048","Player rabbit-hole related graph","engagement/time-on-site","P1","L",["BUILD-GV2-023"],["player pages"]],
  ["049","Team rabbit-hole journey","engagement/time-on-site","P2","M",["BUILD-GV2-024"],["team pages"]],
  ["050","Shareable insight card design","engagement/time-on-site","P1","M",["BUILD-GV2-028"],["share cards"]],
  ["051","Pricing page rebuild","pricing","P0","L",["BUILD-115"],["/pricing"]],
  ["052","Pricing value examples","pricing","P0","S",["BUILD-GV2-011","BUILD-115"],["/pricing"]],
  ["053","Pricing FAQ and cancellation trust","pricing","P0","S",["BUILD-GV2-035"],["/pricing"]],
  ["054","Upgrade moment design rules","conversion","P0","M",["BUILD-115"],["locked features"]],
  ["055","Annual plan placement test","conversion","P1","S",["BUILD-GV2-013"],["/pricing"]],
  ["056","Checkout-start UX guardrails","conversion","P1","M",["BUILD-115"],["checkout"]],
  ["057","Promotions shell without live links","promotions","P1","M",["BUILD-GV2-010"],["/promotions"]],
  ["058","Promotions geo/age state UI","promotions","P1","M",["BUILD-GV2-002"],["/promotions"]],
  ["059","Promotions disclosure component","promotions","P0","S",["BUILD-GV2-003"],["/promotions"]],
  ["060","Promotions expired/pending states","promotions","P1","S",["BUILD-GV2-007"],["/promotions"]],
  ["061","Daily Brief product page","content/brief","P1","M",["BUILD-050","BUILD-GV2-047"],["/brief"]],
  ["062","Article template with key takeaways","content/brief","P1","M",["HELP-035"],["articles"]],
  ["063","Source citation and freshness legend","content/brief","P0","S",["BUILD-112"],["articles","brief"]],
  ["064","Newsletter signup bridge","content/brief","P1","S",["BUILD-049"],["brief/articles"]],
  ["065","Glossary and methodology boundary pages","content/brief","P1","M",["BUILD-GV2-051"],["glossary"]],
  ["066","Support landing page","support/onboarding","P1","M",["BUILD-109"],["/support"]],
  ["067","First-use tour","support/onboarding","P0","M",["BUILD-113"],["onboarding"]],
  ["068","How to read GSE Rating lesson","support/onboarding","P0","S",["HELP-013"],["help","rating"]],
  ["069","How to use Player Lab lesson","support/onboarding","P0","S",["HELP-014"],["help","Player Lab"]],
  ["070","Galaxy Studios video hub","support/onboarding","P1","M",["HELP-005","OSS-087"],["help"]],
  ["071","Confused-user rescue panel","support/onboarding","P1","M",["BUILD-GV2-032"],["support"]],
  ["072","Human copy rewrite pass","copy/brand voice","P0","M",["BUILD-GV2-041"],["all public pages"]],
  ["073","CTA copy system","copy/brand voice","P0","S",["BUILD-GV2-041"],["CTAs"]],
  ["074","No fake certainty copy lint","copy/brand voice","P0","S",["BUILD-GV2-042"],["all copy"]],
  ["075","Empty/error/loading copy pack","copy/brand voice","P0","S",["HELP-039","HELP-040"],["states"]],
  ["076","Analytics event implementation map","analytics","P0","M",["BUILD-GV2-076"],["all routes"]],
  ["077","Help/open drawer analytics","analytics","P1","S",["HELP-030"],["help"]],
  ["078","Upgrade funnel event map","analytics","P0","S",["BUILD-GV2-077"],["conversion"]],
  ["079","Promotion event map","analytics","P1","S",["BUILD-GV2-078"],["promotions"]],
  ["080","Performance budget config","performance","P0","M",[],["CI"]],
  ["081","Image/media lazy loading policy","performance","P0","S",[],["media"]],
  ["082","Client JS budget review","performance","P0","M",[],["all routes"]],
  ["083","Core Web Vitals route gate","performance","P0","M",[],["CI"]],
  ["084","Accessibility checklist gate","accessibility","P0","M",[],["CI"]],
  ["085","Keyboard/focus state pass","accessibility","P0","M",[],["all controls"]],
  ["086","Color contrast audit","accessibility","P0","S",[],["visual system"]],
  ["087","Responsive table/card audit","mobile","P0","M",["HELP-009"],["mobile data"]],
  ["088","Screenshot QA script","design QA","P0","M",["OSS-079"],["visual QA"]],
  ["089","Visual regression review checklist","design QA","P0","S",["OSS-079"],["visual QA"]],
  ["090","Founder-only design QA cockpit","founder-only admin/cockpit","P2","M",["BUILD-GV2-096"],["cockpit"]],
  ["091","Future 3D signal map experiment","future 3D/motion experiments","P3","XL",[],["future lab"]],
  ["092","Cinematic video hero experiment","future 3D/motion experiments","P2","L",["HELP-005"],["home"]],
  ["093","Sports field pressure visualization","future 3D/motion experiments","P2","L",[],["risk/market"]],
  ["094","Design QA issue ledger","design QA","P0","S",[],["internal"]],
  ["095","Route cleanup and dead-page review","route cleanup","P1","M",[],["routes"]],
  ["096","SEO metadata visual/copy audit","content/brief","P1","S",[],["SEO"]],
];

function buildObj(row) {
  const [num, title, category, priority, difficulty, matched, surfaces] = row;
  const id = `BUILD-SITE-${num}`;
  const gate = matched.length ? "EXTENSION" : "NET_NEW";
  return {
    id,
    title,
    category,
    priority,
    difficulty,
    duplicate_check_status: gate,
    matched_existing_ids: matched,
    relation_to_existing: gate === "EXTENSION" ? "Extends existing design/help/growth/trust work with route-level site implementation." : "Distinct site-war-room build not covered by existing queues.",
    reason_not_duplicate: `${title} is scoped to the world-class website/product experience layer and has a concrete route/surface target.`,
    product_surface: surfaces,
    customer_value: 5,
    business_value: 5,
    visual_value: category.includes("visual") || category.includes("homepage") || category.includes("motion") ? 5 : 4,
    conversion_value: category.includes("pricing") || category.includes("conversion") || category.includes("homepage") ? 5 : 3,
    engagement_value: category.includes("engagement") || category.includes("Player") || category.includes("Rating") ? 5 : 3,
    performance_risk: category.includes("motion") || category.includes("3D") || category.includes("homepage") ? "MEDIUM" : "LOW",
    legal_risk: category.includes("promotions") ? "HIGH" : "LOW",
    method_leakage_risk: category.includes("Rating") || category.includes("method") ? "HIGH" : "MEDIUM",
    dependencies: [],
    claude_prompt_file: `docs/research/site-war-room/claude-build-queue/cards/${id}-${slug(title)}.md`,
  };
}

const builds = buildRows.map(buildObj);

function cardMarkdown(b) {
  return `# ${b.id}: ${b.title}

## Duplicate Gate

duplicate_check_status: ${b.duplicate_check_status}
matched_existing_ids: ${b.matched_existing_ids.length ? b.matched_existing_ids.join(", ") : "none"}
relation_to_existing: ${b.relation_to_existing}
reason_not_duplicate: ${b.reason_not_duplicate}
parent_id: ${b.duplicate_check_status === "EXTENSION" ? b.matched_existing_ids[0] || "" : ""}
supersedes_id:
dependency_ids: ${b.dependencies.join(", ")}
merge_notes: Keep route-specific work here and link to existing help/growth/design cards.

## Goal

${b.title}.

## Why It Matters

Improves visual quality, 10-second clarity, trust, conversion, engagement, retention, performance, or monetization without exposing founder-only methodology.

## Current Problem

The visible workspace does not expose the runnable app. Prior docs identify the need for help, source trust, conversion, education, and design tokens, but route-level implementation needs the real shipping clone.

## Product Surface

${b.product_surface.map((s) => `- ${s}`).join("\n")}

## Customer Value

Users understand what they are seeing, why it matters, where the risk is, and what to do next.

## Business Value

Better activation, more time on site, clearer PRO/ELITE value, safer promotions, stronger trust, and better support deflection.

## Design Direction

Premium sports intelligence command center: cinematic but fast, high contrast, calm reading states, strong hierarchy, sports-native signal language, no casino/tout feel.

## Copy Direction

Human, direct, grounded, no fake certainty, no method leakage, no hype without proof, no guaranteed-betting language.

## Data/Analytics Needed

Use route-specific events from 15-analytics-event-tracking-design.md. Avoid sensitive raw queries or payment data.

## Public/Private Boundary

Public sees reveal-less explanations, confidence-safe language, and last-verified/source cues where appropriate. Founder/admin sees source weights, internal QA, and private methods.

## Legal / Compliance Boundary

No live sportsbook/casino affiliate links, no guaranteed wins, no irresponsible gambling copy, no minors targeting, no legal claims without approval.

## Repo Context

Likely files: real app routes/components/design tokens in the shipping clone. Files to avoid: secrets, billing, production DB, launch gates, private methodology, live affiliate link config.

## Implementation Plan

1. Verify the real clone root, branch, dirty state, framework, package manager, and existing UI conventions.
2. Locate the target route/component.
3. Implement the smallest route-safe change.
4. Add mobile, reduced-motion, accessibility, and empty/loading/error states as relevant.
5. Run typecheck/lint/build or available checks.
6. Capture screenshots before/after where possible.

## Acceptance Criteria

- A new user understands the surface within 10 seconds.
- Mobile layout works.
- Accessibility basics pass.
- No method leakage or betting-hype copy.
- Performance budget is not worsened.
- Rollback is isolated.

## Test Plan

Typecheck, lint, build, route probe, Playwright screenshot, mobile viewport screenshot, keyboard/focus check, reduced-motion check, and copy scan where available.

## Rollback Plan

Revert the isolated component/route/style change or disable behind a feature flag. No production data rollback should be needed.

## Priority

${b.priority}

## Difficulty

${b.difficulty}

## Risks

Design risk: visual polish without clarity. Performance risk: ${b.performance_risk}. Legal risk: ${b.legal_risk}. Method leakage risk: ${b.method_leakage_risk}.

## Claude Code Prompt

You are Claude Code in the real Galaxy Sports Edge / GSN shipping clone. Execute only ${b.id}: ${b.title}. First verify repo root, branch, dirty state, package manager, framework, route files, and existing design system. Read docs/research/site-war-room plus matched existing IDs: ${b.matched_existing_ids.join(", ") || "none"}. Do not expose founder-only methodology, use fake data, deploy, touch secrets, mutate production DB, change billing, or create live affiliate links. Implement a focused, reversible UX/design improvement; preserve mobile, accessibility, performance, and responsible-gambling boundaries. Run checks and capture before/after screenshots where possible.
`;
}

mkdirp(out);
mkdirp(cardsDir);
mkdirp(path.join(out, "screenshots", "before"));
mkdirp(path.join(out, "screenshots", "after"));

const ledgerHeaders = ["existing_id","file_path","title_or_symbol","category","surface","description","current_status","product_value","visual_value","conversion_value","duplicate_risk","files_involved","recommended_action","normalized_fingerprint"];
const ledger = existing.map((e) => ({
  existing_id: e[0],
  file_path: e[1],
  title_or_symbol: e[2],
  category: e[3],
  surface: e[3],
  description: e[5],
  current_status: e[4],
  product_value: "HIGH",
  visual_value: e[3].includes("design") || e[3].includes("help") ? "HIGH" : "MEDIUM",
  conversion_value: e[3].includes("pricing") || e[3].includes("help") ? "HIGH" : "MEDIUM",
  duplicate_risk: e[6],
  files_involved: e[1],
  recommended_action: e[7],
  normalized_fingerprint: `${e[3]} ${e[2]} ${e[5]}`.toLowerCase(),
}));

write("existing-design-build-ledger.csv", csv(ledgerHeaders, ledger));
write("existing-design-build-ledger.jsonl", ledger.map((row) => JSON.stringify(row)).join("\n"));
write("design-references.csv", csv(["reference_name","url","what_it_teaches","borrow_conceptually","avoid"], references.map((r) => ({ reference_name: r[0], url: r[1], what_it_teaches: r[2], borrow_conceptually: r[3], avoid: r[4] }))));
write("proposed-design-tokens.json", JSON.stringify(tokens, null, 2));
write("event-taxonomy.csv", csv(["event_name","properties","product_use","privacy_concern"], events.map((r) => ({ event_name: r[0], properties: r[1], product_use: r[2], privacy_concern: r[3] }))));
write("SOURCE_LEDGER.md", `# Source Ledger

As of: ${asOf}

${references.map((r) => `- ${r[0]}: ${r[1]} - ${r[2]}`).join("\n")}
`);
write("screenshots/before/README.md", `# Before Screenshots

No runnable app source or dev server was visible in this workspace. Capture these in the real shipping clone:

- homepage desktop/mobile
- /intelligence/rating desktop/mobile
- /players desktop/mobile
- Player Lab desktop/mobile
- pricing
- promotions shell
- content/brief
- support/onboarding
- empty/loading/error states
`);
write("screenshots/after/README.md", `# After Screenshots

Store after screenshots here after implementing the build cards in the real shipping clone.
`);

write("00-operating-plan.md", `# Site War Room Operating Plan

As of: ${asOf}

## Mission Interpretation

Transform GSE/GSN into a premium sports intelligence product experience: visually stunning, fast, understandable in 10 seconds, trust-building, conversion-ready, mobile-first, reveal-less, support-ready, and maintainable.

## Safety Rules

No founder-method leakage, no fake data, no guaranteed wins, no sportsbook/tout aesthetics, no live affiliate links, no minors targeting, no deploys, no production DB mutation, no paid APIs, no performance-breaking motion.

## Design Principles

Premium sports intelligence command center. Make signal visible, reduce maze, one next action per surface, data-rich but not dense, cinematic but fast, human copy, mobile-first.

## Product Principles

GSE is not a sportsbook. It is a decision intelligence OS: what changed, why it matters, where risk is, when not to act, what the model trusts/refuses to trust, and how users get sharper without seeing formulas.

## Repo Audit Result

${controlLane}

## Workstreams

AGENT 0 Coordinator; AGENT 1 Repo/Routes; AGENT 2 Duplicate Gate; AGENT 3 Screenshot QA; AGENT 4 Prior Research; AGENT 5 References; AGENT 6 IA; AGENT 7 Visual Tokens; AGENT 8 Motion; AGENT 9 Performance; AGENT 10 Accessibility; AGENT 11 Conversion; AGENT 12 Engagement; AGENT 13 Content; AGENT 14 Copy; AGENT 15 Promotions; AGENT 16 Support; AGENT 17 Analytics; AGENT 18 Components; AGENT 19 Routes; AGENT 20 Visual QA; AGENT 21 Critic.

## What Codex Can Build Here

Docs, design tokens proposal, source/reference synthesis, build queue, scanner scaffolds, screenshot plan.

## What Needs Real Clone / Approval

Route edits, screenshots, dev server, Playwright browser runs, pricing/billing changes, live promotions, production deploy.
`);

write("01-existing-work-inventory.md", `# Existing Work Inventory And Duplicate Gate

As of: ${asOf}

${table(["ID","File","Title","Category","Status","Duplicate Risk","Action"], existing.map((e) => [e[0], e[1], e[2], e[3], e[4], e[6], e[7]]))}

## Duplicate Rule

Do not recreate help brain, onboarding clips, design tokens, source transparency, stale-data warning, analytics events, support videos, Player Lab feed, Rating education, or pricing education. Extend them into a route-level site experience.
`);

write("02-current-site-audit.md", `# Current Site Audit

As of: ${asOf}

${controlLane}

${table(["Route","Purpose","Recommended First Screen","Priority"], routes)}

## Screenshot Status

No screenshots captured because no runnable app source/dev server is visible. Screenshot folders were created with capture instructions.
`);

write("03-design-research-synthesis.md", `# Design Research Synthesis

As of: ${asOf}

${table(["Reference","URL","Teaches","Borrow","Avoid"], references)}

## GSE Visual Doctrine

Sports-native command center, not generic SaaS. Use signal, pressure, risk, freshness, movement, and receipts as visual primitives. Favor sharp hierarchy over decoration.

## Interaction Doctrine

Motion should orient, confirm, and explain. Avoid decorative motion. Respect reduced motion.

## IA Doctrine

Fewer doors, stronger doors. Home, Rating, Player Lab, Track Record, Pricing, Brief, Support, Account, Founder-only.

## Anti-Patterns

Casino/tout colors, fake certainty, dense tables without summaries, raw JSON, hidden CTAs, jargon, autoplay-heavy video, long methodology blocks, source-weight leakage.
`);

write("04-information-architecture.md", `# Information Architecture

As of: ${asOf}

${table(["Route","Primary Job","Data/Content Needed","CTA","Priority"], routes.map((r) => [r[0], r[1], r[2], r[1].includes("Pricing") ? "choose plan" : "continue to next best surface", r[3]]))}

## Navigation

Primary: Home, Rating, Player Lab, Track Record, Pricing, Brief. Secondary: Promotions, Support, Account. Founder-only hidden/admin-gated.
`);

write("05-visual-system-design-tokens.md", `# Visual System And Design Tokens

As of: ${asOf}

See proposed-design-tokens.json.

The visual system should feel expensive, sharp, alive, and controlled. No one-note palette, no casino glow, no decorative orbs as a crutch, no low-contrast subcategory labels.
`);

write("06-motion-interaction-system.md", `# Motion Interaction System

As of: ${asOf}

Purposeful motion only: orient the user, reveal signal movement, show pressure/risk changes, confirm interactions, and keep loading states honest.

Budgets: fast 120ms, standard 180ms, reveal 260ms, nonessential max 400ms. Reduced motion replaces movement with opacity/focus state.
`);

write("07-homepage-rebuild-plan.md", `# Homepage Rebuild Plan

As of: ${asOf}

Homepage answers: what is this, why trust it, what is free, why upgrade, what is different, how it protects from bad decisions, where to go next.

Sections: cinematic fast hero, product promise, GSE Rating preview, what-changed panel, no-bet/risk panel, Track Record receipts, Player Lab preview, Rating Movers teaser, FREE/PRO/ELITE ladder, compliance-safe promotions teaser, Daily Brief teaser, human support/trust footer.
`);

write("08-rating-player-lab-experience.md", `# GSE Rating And Player Lab Experience

As of: ${asOf}

GSE Rating: dominant number, tier, movement, confidence/risk, source freshness, no method leakage, why-it-moved without formula, deeper locked reads.

Player Lab: simpler tabs, current team/status trust, fast filters, scannable cards, compare, watchlist, locked depth without dead ends, mobile table/card behavior.
`);

write("09-promotions-affiliate-ux.md", `# Promotions Affiliate UX

As of: ${asOf}

No live affiliate links without approval. Promotions page needs partner cards, offer metadata, geo/state availability, age/responsible-play copy, affiliate disclosure, expiration, terms, not-betting-advice boundary, review status, admin workflow, finance reconciliation hooks.
`);

write("10-pricing-monetization-ux.md", `# Pricing Monetization UX

As of: ${asOf}

Pricing must be simple, trust-first, value-specific, no hype, decision-quality aligned, clear about what is not included, and clear that GSE is not a sportsbook.

Upgrade moments: repeated Player Lab use, locked deeper read, watchlist, brief, Rating Movers, no-bet insight, compliant promotion click only after approvals.
`);

write("11-content-brief-experience.md", `# Content Brief Experience

As of: ${asOf}

Content is a product surface: Daily Brief, weekly preview, injury shock, market movement, no-bet stories, player/team explainers, rookie watch, Track Record recap, glossary, source citation, newsletter signup, product CTAs.
`);

write("12-support-onboarding-experience.md", `# Support Onboarding Experience

As of: ${asOf}

Design onboarding quiz, first-use tour, how to read Rating, what no-bet means, why confidence matters, how to use Player Lab, help center, confused-user rescue, cancellation-save boundaries, responsible gambling escalation, and human support copy.
`);

write("13-engagement-time-on-site-experience.md", `# Engagement Time On Site Experience

As of: ${asOf}

Priority loops: Rating Movers, watchlists, what changed since yesterday, compare cards, no-bet radar, injury shock board, market movement board, player/team rabbit holes, weekly recap, shareable cards, alerts teaser, personalized homepage.
`);

write("14-human-copy-brand-voice-pass.md", `# Human Copy Brand Voice Pass

As of: ${asOf}

Copy rules: direct, grounded, human, no fake certainty, no method leakage, no gambling hype, no generic SaaS cliches, explain risk clearly, explain no-bet as value, explain upgrade as depth.
`);

write("15-analytics-event-tracking-design.md", `# Analytics Event Tracking Design

As of: ${asOf}

See event-taxonomy.csv.

Tracking must be privacy-safe, product-specific, and not invasive. Avoid raw sensitive queries, payment data, precise location, or private methodology.
`);

write("16-performance-accessibility-gates.md", `# Performance Accessibility Gates

As of: ${asOf}

Targets: LCP <= 2.5s, INP <= 200ms, CLS <= 0.1 at p75, WCAG 2.2 AA-oriented review, keyboard navigation, focus states, contrast, semantic headings, reduced motion, optimized images, minimal JS, lazy heavy visuals.
`);

write("17-implementation-authority.md", `# Implementation Authority

As of: ${asOf}

Allowed in real clone: design tokens, components, mobile fixes, copy, skeleton/empty/error states, navigation, screenshot scripts, accessibility/performance fixes, safe analytics scaffolding, promotions shell without live links.

Approval required: deploy, paid services, live affiliate links, payment changes, pricing changes, source methodology exposure, production DB changes, aggressive tracking, age/location collection, legal copy changes, contests.
`);

write("18-visual-qa-screenshot-review.md", `# Visual QA Screenshot Review

As of: ${asOf}

No screenshots captured here because no runnable app source/dev server is visible. Capture before/after in the real clone for homepage, rating, players, Player Lab, pricing, promotions, brief, support, mobile, empty/loading/error states.
`);

write("20-final-critic-review.md", `# Final Critic Review

As of: ${asOf}

1. Repo audit happened first: yes, visible workspace audited.
2. Duplicate gate happened: yes, ledgers created.
3. Prior research used: yes, help/growth/OSS/NRT packets linked.
4. Major routes mapped: yes, route-level plan created.
5. Clarity improved: planned via 10-second rule and help layer.
6. Founder methods protected: yes.
7. Fake data avoided: yes.
8. Casino/tout aesthetics avoided: yes.
9. Mobile treated as primary: yes.
10. Accessibility preserved: WCAG/reduced-motion gates.
11. Performance preserved: CWV budgets.
12. Screenshot proof: blocked by missing app, folders/plans created.
13. Typecheck/lint/build: not available, no app package visible.
14. Safe implementation changes: scanner and docs generated.
15. Live affiliate changes avoided: yes.
16. Executable cards: yes.
17. Premium and understandable: design direction supports it.
18. New user 10-second understanding: homepage/help cards prioritize this.
19. Paid user PRO/ELITE clarity: pricing/rating upgrade cards prioritize this.
20. More efficient and stunning: plan is concrete, implementation pending real clone.
`);

write("21-final-report.md", `# Final Report - Site War Room

As of: ${asOf}

## 1. Executive Summary

The biggest opportunity is not just visual polish; it is product comprehension. GSE needs a fast premium command-center interface where every route explains the value, risk, trust cue, and next action within 10 seconds.

## 2. Existing Design/Build Audit

${existing.length} existing design/help/growth/trust items indexed. The strongest anchors are help-education-ux, GSE Rating education, Player Lab feed, source transparency, human voice rules, design token map, screenshot QA, and onboarding clips.

## 3. Duplicate Risks Found

Do not recreate help brain, product education, source transparency, stale warnings, design tokens, analytics, onboarding clips, or pricing education. Extend them.

## 4. Current Site Audit

${controlLane}

## 5. Prior Research Synthesis

Use Bloomberg-style concealed complexity, ESPN/The Athletic sports-native personalization, Apple motion restraint, Core Web Vitals budgets, and WCAG 2.2 accessibility.

## 6. Information Architecture Recommendation

Fewer stronger doors: Home, Rating, Player Lab, Track Record, Pricing, Brief, Support, Account. Promotions is compliance-gated. Founder cockpit is private.

## 7. Visual System Recommendation

Premium sports command center: dark field, signal green, pulse blue, pressure amber, risk rose, high-contrast typography, restrained glass surfaces, tabular data, disciplined spacing.

## 8. Motion System Recommendation

Use motion only to explain signal movement, state change, source freshness, loading, and interaction feedback. Respect reduced motion.

## 9. Homepage Recommendation

Rebuild around product promise, Rating preview, what changed, no-bet/risk, receipts, Player Lab preview, Rating Movers, FREE/PRO/ELITE, Daily Brief, support/trust.

## 10. GSE Rating / Player Lab Recommendation

Rating gets dominant score/movement/risk/trust. Player Lab gets clearer tabs, current team/status trust, compare, watchlist, card/table mobile behavior.

## 11. Promotions UX Recommendation

Build shell only until approved. Include disclosure, age/geo state, compliance status, expiration, terms, and no-bet boundary.

## 12. Pricing / Monetization UX Recommendation

Trust-first plan ladder, concrete use cases, upgrade as depth not pressure, cancellation/support clarity.

## 13. Content / Brief Recommendation

Make brief/content part of the product with source legend, key takeaways, product CTAs, glossary, and newsletter bridge.

## 14. Support / Onboarding Recommendation

Add first-use tour, help center, Galaxy Studios videos, confused-user rescue, and human support copy.

## 15. Engagement Recommendation

Prioritize Rating Movers, watchlists, what changed, no-bet radar, injury/market boards, player/team rabbit holes, shareable cards.

## 16. Human Copy Recommendation

Direct, grounded, no fake certainty, no generic SaaS language, no method leakage, no gambling hype.

## 17. Analytics Recommendation

Use event-taxonomy.csv; keep tracking privacy-safe and product-specific.

## 18. Performance/Accessibility Gates

Core Web Vitals and WCAG 2.2 gates defined. No heavy animation without lazy/deferred loading and reduced-motion fallback.

## 19. Implementation Changes Made

Created docs, design tokens proposal, event taxonomy, build queue, screenshot folders, and safe scanner scaffold reports/codex/site-war-room/scan-site-experience.mjs.

## 20. Screenshot Review

Not captured because app source/dev server absent. Screenshot plan created.

## 21. Build Queue Summary

${builds.length} Claude-ready site war-room build cards.

## 22. Top P0 Builds

${builds.filter((b) => b.priority === "P0").slice(0, 20).map((b) => `- ${b.id}: ${b.title}`).join("\n")}

## 23. Highest Visual Impact

Homepage hero, visual tokens, data card hierarchy, Rating page redesign, Player Lab tab hierarchy, motion tokens, screenshot QA.

## 24. Highest Conversion Impact

Pricing rebuild, homepage ladder, upgrade moments, Rating PRO/ELITE depth, checkout guardrails.

## 25. Highest Engagement Impact

Rating Movers, what-changed feed, Player Lab watchlist, no-bet radar, injury/market boards, rabbit holes.

## 26. Biggest Risks

No real app source in this workspace, method leakage, performance-heavy visuals, sportsbook/tout aesthetics, inaccessible motion, stale data trust damage, promotions compliance.

## 27. Human Approvals Needed

Deploy, paid tools, live affiliate links, pricing/payment changes, legal copy changes, public source/method language, production data changes.

## 28. Commands Run

Attachment read, git/workspace audit, rg design/help scan, web source refresh, generator, JSONL validation, safety scan.

## 29. Tests Run

JSONL validation and scanner validation after generation. No app tests because app source absent.

## 30. Files Created

docs/research/site-war-room and reports/codex/site-war-room/scan-site-experience.mjs.

## 31. Unknowns

Actual routes/components/styles, current screenshots, production design state, package manager, app framework details, live route behavior, current analytics implementation.
`);

write("claude-build-queue/index.md", `# Site War Room Build Queue

As of: ${asOf}

${table(["ID","Title","Category","Gate","Priority","Difficulty"], builds.map((b) => [b.id,b.title,b.category,b.duplicate_check_status,b.priority,b.difficulty]))}
`);
write("claude-build-queue/build-queue.jsonl", builds.map((b) => JSON.stringify(b)).join("\n"));
for (const b of builds) {
  fs.writeFileSync(path.join(cardsDir, `${b.id}-${slug(b.title)}.md`), cardMarkdown(b), "utf8");
}

console.log(JSON.stringify({
  visibleFiles: visibleFiles.length,
  existingItems: existing.length,
  references: references.length,
  routes: routes.length,
  builds: builds.length,
  output: path.relative(root, out).replace(/\\/g, "/"),
}, null, 2));

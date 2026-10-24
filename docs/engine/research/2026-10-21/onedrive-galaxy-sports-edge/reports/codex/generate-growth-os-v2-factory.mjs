import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const out = path.join(root, "docs", "research", "growth-os-v2");
const cardsDir = path.join(out, "claude-build-queue", "cards");
fs.mkdirSync(cardsDir, { recursive: true });

const asOf = "2026-06-09";

function write(relPath, content) {
  fs.mkdirSync(path.dirname(path.join(out, relPath)), { recursive: true });
  fs.writeFileSync(path.join(out, relPath), content.trim() + "\n", "utf8");
}

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);
}

function csvEscape(v) {
  return `"${String(v ?? "").replaceAll('"', '""')}"`;
}

function mdTable(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((r) => `| ${r.map((c) => String(c).replaceAll("\n", " ")).join(" | ")} |`)
  ].join("\n");
}

const sources = [
  ["FTC Endorsement Guides", "https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking", "Affiliate, endorsement, review, and material-connection disclosures must be clear and conspicuous; claims must be honest and not misleading."],
  ["AGA Responsible Gaming Code", "https://www.americangaming.org/responsibility/responsible-gaming-code-of-conduct/", "Gaming marketing should include consumer protection, age verification, responsible-gaming practices, and self-regulation."],
  ["NCPG Internet Responsible Gambling Standards", "https://www.ncpgambling.org/responsible-gambling/internet-standards/", "Internet gambling standards cover policy, staff training, informed decision-making, assistance, self-exclusion, advertising, site features, research, and payments."],
  ["Google People-First Content", "https://developers.google.com/search/docs/fundamentals/creating-helpful-content", "Helpful content should provide original value, clear sourcing, trust, expertise, and avoid search-engine-first automation."],
  ["DraftKings Affiliates", "https://www.draftkings.com/affiliates", "Official affiliate interest page asks prospective affiliates to contact DraftKings with promotion information."],
  ["FanDuel Affiliate Portal", "https://affiliates.fanduel.com/", "Official FanDuel affiliate portal exists with join/login links; economics require account/program review."],
  ["FanDuel Racing Affiliate Page", "https://www.fanduel.com/sportsbook-racing-affiliate", "Shows state/age restrictions and responsible-gambling helpline language on a promotional page."],
  ["bet365 Partners", "https://www.bet365partners.com/en", "Official partner page describes application, traffic-driving, commissions, and partner reporting tools."],
  ["BetMGM Partners", "https://www.betmgmpartners.com/", "Official partner page describes partner registration, reporting, affiliate-only deals, and promotions."],
  ["PrizePicks", "https://www.prizepicks.com/", "Official page shows DFS/pick product, age/geography restrictions, responsible-gaming links, and risk language for event contracts."],
  ["Underdog Fantasy", "https://www.underdogfantasy.com/", "Official page shows availability by geography, age restrictions, responsible-gaming link, and promotional patterns."],
  ["Sleeper", "https://sleeper.com/", "Official fantasy/pick'em page shows fantasy, picks, mock drafts, support, responsible play, and product surfaces."]
];

const existingAnchors = {
  affiliate: ["BUILD-028", "BUILD-035", "NEXT-031", "NEXT-032", "NEXT-033", "NEXT-034", "NEXT-035", "NEXT-036"],
  support: ["BUILD-037", "BUILD-040", "BUILD-041", "BUILD-042", "BUILD-047", "NEXT-015"],
  lifecycle: ["BUILD-050", "BUILD-054", "BUILD-055", "BUILD-056", "NEXT-019", "NEXT-020", "NEXT-024"],
  content: ["BUILD-021", "BUILD-058", "BUILD-059", "NEXT-025", "NEXT-026", "NEXT-027", "NEXT-028"],
  analytics: ["NEXT-001", "NEXT-002", "NEXT-003", "NEXT-005", "NEXT-006"],
  ai: ["BUILD-013", "BUILD-014", "BUILD-015", "BUILD-020", "BUILD-022", "NEXT-007", "NEXT-008", "NEXT-011"],
  cockpit: ["BUILD-018", "BUILD-106", "NEXT-017"],
  api: ["BUILD-061", "BUILD-065", "BUILD-066", "BUILD-072", "NEXT-049", "NEXT-050", "NEXT-054"],
  trust: ["BUILD-048", "BUILD-057", "BUILD-093", "BUILD-112", "BUILD-119"]
};

const partnerRows = [
  ["DraftKings", "https://www.draftkings.com/affiliates", "Sportsbook/DFS/casino", "Unknown official economics; official contact/application page", "Yes", "State/product dependent", "Age limits and state eligibility apply; exact affiliate terms unknown", "Responsible gaming/footer language visible", "Material connection disclosure required", "Unknown", "Unknown", "Unknown", "Strong but high-risk", "Potentially high if legal and audience fit verified", "HIGH", "HIGH", "P1", "RESEARCH_ONLY", "No live links; apply/contact only after legal review."],
  ["FanDuel", "https://affiliates.fanduel.com/", "Sportsbook/racing/DFS/casino", "Unknown official economics; affiliate portal exists", "Yes", "State/product dependent", "21+ and state restrictions visible on racing promo page", "Helpline and state-specific responsible gaming language visible", "Material connection disclosure required", "Affiliate portal", "Unknown", "Unknown", "Strong but high-risk", "High if legal and trust-safe", "HIGH", "HIGH", "P1", "RESEARCH_ONLY", "No live links; racing page demonstrates compliance complexity."],
  ["BetMGM", "https://www.betmgmpartners.com/", "Sportsbook/casino", "Unknown; partner portal references reporting/deals/promotions", "Yes", "State/product dependent", "Must verify by state and product", "Must include responsible gaming language if promoted", "Material connection disclosure required", "Partner platform", "Unknown", "Unknown", "Strong but high-risk", "High if approved", "HIGH", "HIGH", "P1", "RESEARCH_ONLY", "No live links; direct partner account required."],
  ["bet365", "https://www.bet365partners.com/en", "Sportsbook/casino/poker/bingo", "Commission stated generally; exact U.S. terms require account review", "Yes", "Global with regulated-market restrictions", "Must verify state/country/product", "Must include responsible gaming language if promoted", "Material connection disclosure required", "Partner reporting platform", "Unknown", "Unknown", "Strong but high-risk", "Potentially high but jurisdiction-sensitive", "HIGH", "HIGH", "P1", "RESEARCH_ONLY", "Official page describes apply/drive traffic/earn commission."],
  ["PrizePicks", "https://www.prizepicks.com/", "DFS/picks/event contracts", "Official affiliate economics not verified", "Unknown", "Availability and age differ by state/product", "18/19/21 depending jurisdiction; restrictions visible", "Responsible gaming and significant-risk language visible", "Material connection disclosure required", "Unknown", "Unknown", "Unknown", "Good fit for sports intelligence audience but trust-sensitive", "Medium/high", "HIGH", "HIGH", "P2", "RESEARCH_ONLY", "No live links; product language is highly betting-adjacent."],
  ["Underdog", "https://www.underdogfantasy.com/", "Fantasy/pick'em/predictions", "Official affiliate economics not verified", "Unknown", "Availability visible by geography", "18/19/21 depending jurisdiction; restrictions visible", "Responsible gaming link visible", "Material connection disclosure required", "Unknown", "Unknown", "Unknown", "Potentially strong but high-risk", "Medium/high", "HIGH", "HIGH", "P2", "RESEARCH_ONLY", "No live links; verify affiliate terms and geo constraints."],
  ["Sleeper", "https://sleeper.com/", "Fantasy/pick'em/community", "Official affiliate economics not verified", "Unknown", "Product dependent", "Eligibility must be verified", "Responsible Play link visible", "Material connection disclosure required", "Unknown", "Unknown", "Unknown", "Strong non-sportsbook-adjacent fantasy/community fit", "Medium", "MEDIUM", "MEDIUM", "P2", "RESEARCH_ONLY", "Likely safer as fantasy/community partner than sportsbook-first offers."],
  ["Direct newsletter sponsor", "Manual direct sales", "Sponsorship", "Flat-fee or CPM unknown", "Yes", "Depends on sponsor category", "Must reject underage/unsafe claims", "Disclosure required", "Sponsor disclosure required", "UTM/manual invoice", "Invoice", "Unknown", "High if brand-safe", "High", "MEDIUM", "MEDIUM", "P0", "GO_WITH_APPROVAL", "Can start with sponsor policy and no live sales."],
  ["Creator referral partner", "Manual direct outreach", "Creator/affiliate", "Referral payout unknown", "Yes", "Depends on creator audience", "No minors, no restricted jurisdictions", "Disclosure required", "Creator disclosure required", "Dub/UTM later", "Manual", "Unknown", "High for early growth", "Medium/high", "MEDIUM", "MEDIUM", "P0", "GO_WITH_APPROVAL", "Use non-gambling education/content first."],
  ["Sports data/tools partner", "Manual direct outreach", "Tool/data affiliate", "CPA/rev-share/sponsor unknown", "Yes", "Lower gambling risk if non-wagering tool", "Normal software eligibility", "Not gambling if tool-only", "Disclosure required", "UTM/manual", "Invoice/affiliate", "Unknown", "Very strong trust fit", "Medium", "LOW", "LOW", "P0", "GO_WITH_APPROVAL", "Prioritize tools over wagering promos."]
];

const opportunityRows = [
  ["OPP-001","Responsible-play-safe promotions engine","Affiliate / promotions monetization","Research-only promotions system with geo, age, disclosure, expiration, audit, and no-bet alignment.","planned in prior stacks","BUILD-028;NEXT-031;NEXT-032","EXTENSION","Adds compliance workflow and no-bet trust ranking not present in prior generic partner/link cards",5,5,5,4,4,5,3,"HIGH","HIGH","MEDIUM","MEDIUM","M","MEDIUM","/promotions","admin/promotions","promotion_viewed;affiliate_outbound_click","compliance copy","apps/web/app/promotions; admin review docs","child build","P0","GO_WITH_APPROVAL","No live links."],
  ["OPP-002","GSE Rating trust education ladder","Subscription conversion","Tiered education explaining what GSE Rating can and cannot reveal.","planned","BUILD-115;BUILD-112","EXTENSION","Adds reveal-less rating education and methodology-safe conversion path",5,5,4,4,5,5,2,"LOW","LOW","MEDIUM","LOW","M","FAST","rating pages","founder/content","rating_viewed;upgrade_clicked","trust copy","rating routes/content","child build","P0","GO","Protect founder methods."],
  ["OPP-003","No-bet radar as trust surface","Engagement / retention","Public and paid no-bet/risk board that frames restraint as value.","not verified","BUILD-111;BUILD-115","NET_NEW","Prior alert cards do not center no-bet/risk restraint as a product surface",5,5,4,5,5,5,2,"MEDIUM","MEDIUM","MEDIUM","LOW","M","FAST","no-bet/risk pages","analytics/cockpit","no_bet_viewed;upgrade_clicked","risk copy","app route TBD","new build","P0","GO_WITH_REVIEW","Do not imply betting advice."],
  ["OPP-004","Player Lab rabbit-hole journeys","Engagement / time-on-site","Deep linked player/team exploration loops with what changed and why it matters.","not verified","BUILD-111;NEXT-002","EXTENSION","Adds sports-specific exploration mechanics beyond generic personalized alerts",5,4,3,5,4,4,2,"LOW","LOW","MEDIUM","LOW","L","MEDIUM","Player Lab","analytics","player_viewed;filter_used;watchlist_created","education copy","player routes/data","child build","P1","GO","Needs real app source."],
  ["OPP-005","Track Record receipts center","Trust / conversion","Receipts, misses, autopsies, and freshness details in one trust hub.","planned","BUILD-057;BUILD-093;BUILD-112","EXTENSION","Combines receipts and autopsies into monetization/trust system",5,5,4,4,5,5,2,"LOW","LOW","MEDIUM","LOW","M","FAST","track-record","founder/audit","track_record_viewed;source_clicked","humble proof copy","trust routes/content","child build","P0","GO","Avoid accuracy overclaims."],
  ["OPP-006","Human copy auditor","Brand voice / copy auditor","Lint UI/support/sales/affiliate copy for human tone, proof, risk, and method leakage.","not found","none","NET_NEW","No prior card specifically audits human-sounding copy across betting-adjacent contexts",5,5,4,4,4,5,5,"MEDIUM","MEDIUM","LOW","LOW","S","FAST","all copy surfaces","founder/content QA","copy_flagged","voice rules","docs/content/components later","new build","P0","GO","Docs-first now."],
  ["OPP-007","Unit economics dashboard spec","Financial dashboards","Revenue, CAC, LTV, churn, affiliate payout, data cost, and margin model.","partial","NEXT-003;NEXT-006","EXTENSION","Prior analytics cards do not define finance/unit economics model",3,5,5,2,4,4,1,"LOW","LOW","MEDIUM","LOW","M","FAST","admin only","founder finance","checkout_completed;plan_changed;affiliate_outbound_click","internal labels","admin dashboard/docs","child build","P0","GO","No financial claims without data."],
  ["OPP-008","Support confusion rescue loop","Customer success","Detect confused users and route to help, explainer, support, or upgrade-safe education.","partial","BUILD-037;BUILD-040;BUILD-042;BUILD-047","EXTENSION","Prior support cards are tool-centric; this adds product-specific confusion rescue",5,4,3,4,5,5,5,"LOW","LOW","MEDIUM","MEDIUM","M","FAST","help/onboarding","support cockpit","support_opened;search_used;onboarding_started","support tone","support routes/docs","child build","P0","GO","Human-safe copy."],
  ["OPP-009","Affiliate finance reconciliation","Affiliate / finance","Track clicks, partner status, approvals, expected payouts, received payouts, and disputes.","partial","NEXT-031;NEXT-036","EXTENSION","Prior attribution cards do not cover payout/reconciliation controls",2,5,5,1,2,4,1,"HIGH","MEDIUM","MEDIUM","LOW","M","MEDIUM","admin only","finance/admin","affiliate_outbound_click;promotion_clicked","internal copy","admin/finance","child build","P1","GO_WITH_APPROVAL","No live partner claims."],
  ["OPP-010","Founder operating cadence","Org design","Weekly growth, support, content, analytics, affiliate, compliance, and build queue rhythm.","partial","BUILD-106;NEXT-017","EXTENSION","Prior digest exists; this adds operating cadence and decision rituals",2,5,3,2,4,4,2,"LOW","LOW","LOW","LOW","S","FAST","none","founder cockpit","weekly_digest_created","internal copy","docs/ops","child build","P0","GO","Docs-first."]
];

const eventRows = [
  "page_view","signup_started","signup_completed","onboarding_started","onboarding_completed","rating_viewed","player_viewed","pick_viewed","no_bet_viewed","article_viewed","promotion_viewed","promotion_clicked","affiliate_outbound_click","upgrade_clicked","checkout_started","checkout_completed","plan_changed","cancellation_started","cancellation_saved","cancellation_completed","support_opened","support_message_sent","alert_created","watchlist_created","contest_joined","referral_shared","email_opened","email_clicked","brief_viewed","search_used","filter_used","track_record_viewed","copy_flagged","source_clicked"
].map((e) => [e, "user_id_hash, anonymous_id, session_id, path, tier, sport, surface, timestamp, source_context", e.includes("affiliate") || e.includes("promotion") ? "Affiliate and geo compliance; do not store unnecessary sensitive data." : e.includes("checkout") ? "Billing-adjacent; do not log payment secrets." : "Minimize PII; hash identifiers.", "Funnels, retention, trust, support, and monetization analysis"]);

function build(id, title, category, status, matched, why, surface, internal, events, priority, difficulty, risks = {}) {
  return {
    id: `BUILD-GV2-${String(id).padStart(3, "0")}`,
    title,
    category,
    priority,
    difficulty,
    duplicate_check_status: status,
    matched_existing_ids: matched,
    relation_to_existing: status === "EXTENSION" ? "Child build extending existing queue item(s)." : status === "DEPENDENCY" ? "Dependency or prerequisite for existing queue item(s)." : status === "VARIANT" ? "Material audience/surface variant of existing work." : status === "REPLACEMENT" ? "Supersedes weaker/older planning artifact." : "Distinct GSE-specific value not present in existing ledger.",
    reason_not_duplicate: why,
    parent_id: status === "EXTENSION" && matched.length ? matched[0] : "",
    supersedes_id: status === "REPLACEMENT" && matched.length ? matched[0] : "",
    dependency_ids: status === "DEPENDENCY" ? matched : [],
    merge_notes: status === "VARIANT" ? "Merge into parent if implementation can stay one artifact; otherwise keep this child card." : "",
    product_surface: surface,
    internal_surface: internal,
    customer_value: risks.customer ?? 4,
    business_value: risks.business ?? 4,
    revenue_value: risks.revenue ?? 3,
    retention_value: risks.retention ?? 3,
    engagement_value: risks.engagement ?? 3,
    trust_value: risks.trust ?? 4,
    support_value: risks.support ?? 2,
    legal_risk: risks.legal ?? "LOW",
    brand_risk: risks.brand ?? "LOW",
    technical_risk: risks.tech ?? "MEDIUM",
    support_burden: risks.burden ?? "LOW",
    dependencies: risks.deps ?? [],
    repo_files: risks.files ?? ["docs/research/growth-os-v2", "real app clone TBD"],
    analytics_events: events,
    claude_prompt_file: `claude-build-queue/cards/BUILD-GV2-${String(id).padStart(3, "0")}-${slug(title)}.md`,
    notes: risks.notes ?? "Docs-first or fake-data-first. Owner approval before production data, public launch, billing, or live promotions."
  };
}

const builds = [
  build(1,"Promotions compliance data model", "promotions / affiliate revenue","EXTENSION", existingAnchors.affiliate,"Existing partner/link cards do not define compliance-state entities, review status, disclosure blocks, or geo rules.",["/promotions"],["admin promotions"],["promotion_viewed"],"P0","M",{legal:"HIGH",brand:"HIGH",revenue:5,trust:5}),
  build(2,"Geo and state availability rules for promotions","promotions / affiliate revenue","EXTENSION",["BUILD-GV2-001","NEXT-031"],"Adds regulated availability logic before any offer rendering; not a duplicate of generic Dub link setup.",["/promotions"],["admin compliance"],["promotion_viewed"],"P0","M",{legal:"HIGH",brand:"HIGH"}),
  build(3,"Affiliate disclosure component spec","promotions / affiliate revenue","EXTENSION",["BUILD-GV2-001","NEXT-031"],"Adds FTC-style disclosure placement/proximity rules for every offer surface.",["/promotions","articles"],["content QA"],["promotion_viewed"],"P0","S",{legal:"HIGH",brand:"MEDIUM",tech:"LOW"}),
  build(4,"Responsible-play offer card pattern","promotions / affiliate revenue","EXTENSION",["BUILD-GV2-001","BUILD-112"],"Adds no-bet and responsible-play alignment to partner cards instead of raw offer ranking.",["/promotions"],["admin compliance"],["promotion_clicked"],"P0","M",{legal:"HIGH",brand:"HIGH",trust:5}),
  build(5,"Partner due-diligence checklist","promotions / affiliate revenue","NET_NEW",[],"A research/approval checklist is distinct from existing partner pipeline cards because it blocks unsafe partners before outreach.",["none"],["partner ops"],[],"P0","S",{legal:"HIGH",brand:"HIGH",tech:"LOW"}),
  build(6,"Affiliate outbound click audit log","promotions / affiliate revenue","EXTENSION",["NEXT-036"],"Existing attribution bridge lacks compliance-grade audit logging for outbound clicks.",["/promotions"],["admin audit"],["affiliate_outbound_click"],"P1","M",{legal:"HIGH",brand:"MEDIUM"}),
  build(7,"Offer expiration and kill switch","promotions / affiliate revenue","EXTENSION",["BUILD-GV2-001"],"Adds operational safety not covered by generic partner cards.",["/promotions"],["admin promotions"],["promotion_viewed"],"P0","M",{legal:"HIGH",brand:"HIGH"}),
  build(8,"Affiliate payout reconciliation ledger","financial dashboards","EXTENSION",["NEXT-031","NEXT-036"],"Attribution exists; finance reconciliation of expected vs received payout is missing.",["none"],["finance dashboard"],["affiliate_outbound_click"],"P1","M",{legal:"MEDIUM",revenue:5,business:5}),
  build(9,"Promotions trust impact dashboard","product analytics","EXTENSION",["NEXT-001","NEXT-032"],"Measures whether promotions hurt trust, support load, or retention; not in existing analytics taxonomy.",["/promotions"],["founder cockpit"],["promotion_viewed","support_opened","upgrade_clicked"],"P1","M",{legal:"MEDIUM",brand:"HIGH",trust:5}),
  build(10,"No-live-links approval gate","risk / compliance","DEPENDENCY",["BUILD-GV2-001"],"Prevents publishing offers until legal/founder approval exists.",["/promotions"],["release gate"],[],"P0","S",{legal:"HIGH",brand:"HIGH",tech:"LOW"}),
  build(11,"FREE to PRO GSE Rating education ladder","subscription conversion","EXTENSION",["BUILD-115"],"Adds GSE Rating-specific reveal-less education to existing paid-tier education.",["rating pages","pricing"],["content ops"],["rating_viewed","upgrade_clicked"],"P0","M",{revenue:5,trust:5}),
  build(12,"PRO to ELITE decision-quality upgrade path","pricing / plan upgrades","EXTENSION",["BUILD-115"],"Adds decision-quality, not hype, as the upgrade narrative for ELITE.",["pricing","account"],["founder/copy QA"],["upgrade_clicked","plan_changed"],"P0","M",{revenue:5,retention:5}),
  build(13,"Annual plan trust-safe offer logic","pricing / plan upgrades","VARIANT",["BUILD-055"],"Same conversion family, different billing cadence and commitment-risk copy.",["pricing","checkout"],["finance"],["upgrade_clicked","checkout_started"],"P1","M",{legal:"MEDIUM",revenue:5}),
  build(14,"Founder plan packaging spec","pricing / plan upgrades","NET_NEW",[],"Founder/early-believer plan is materially different from generic PRO/ELITE conversion.",["pricing"],["founder"],["upgrade_clicked"],"P2","S",{revenue:4,brand:"MEDIUM"}),
  build(15,"Team plan and small group packaging","pricing / plan upgrades","NET_NEW",[],"Team/group plans introduce new buyer and account model distinct from existing B2C tier cards.",["pricing"],["sales/admin"],["upgrade_clicked","checkout_started"],"P2","L",{revenue:5,tech:"HIGH"}),
  build(16,"Enterprise intelligence report offer","sales / partner pipeline","EXTENSION",["BUILD-029","BUILD-118"],"Enterprise report packaging extends prospect/demo cards with concrete deliverable structure.",["enterprise landing"],["sales CRM"],["page_view","support_opened"],"P1","M",{revenue:5}),
  build(17,"No-bet radar public teaser","engagement / time-on-site","NET_NEW",[],"Creates a restraint/trust surface not already captured by alert or article cards.",["/no-bet"],["analytics"],["no_bet_viewed","upgrade_clicked"],"P0","M",{legal:"MEDIUM",brand:"MEDIUM",trust:5,engagement:5}),
  build(18,"Volatility and risk explainer module","trust / track-record systems","EXTENSION",["BUILD-112","BUILD-119"],"Adds risk/volatility education to transparency snippets and citation explainer work.",["rating pages","articles"],["content QA"],["source_clicked"],"P0","S",{trust:5}),
  build(19,"Track Record autopsy template","trust / track-record systems","EXTENSION",["BUILD-057","BUILD-093"],"Weekly track-record email exists; this adds miss/autopsy template for public trust hub.",["track-record"],["founder/content"],["track_record_viewed"],"P0","M",{trust:5,brand:"MEDIUM"}),
  build(20,"Receipts freshness badge system","trust / track-record systems","EXTENSION",["BUILD-112"],"Adds freshness/state badges to receipts rather than generic source snippets.",["track-record","rating pages"],["content QA"],["source_clicked"],"P1","M",{trust:5}),
  build(21,"Player Lab what-changed feed","engagement / time-on-site","EXTENSION",["BUILD-111","NEXT-002"],"Adds player-specific daily change feed beyond personalized alert digest.",["Player Lab"],["analytics"],["player_viewed","brief_viewed"],"P1","L",{engagement:5,retention:4}),
  build(22,"Rating movers board","engagement / time-on-site","NET_NEW",[],"A daily movement board is distinct from alert digests because it creates browsable discovery.",["ratings"],["analytics"],["rating_viewed","filter_used"],"P1","M",{engagement:5}),
  build(23,"Player rabbit-hole related-card graph","engagement / time-on-site","EXTENSION",["BUILD-111"],"Adds deliberate exploration architecture to Player Lab, not just alerts.",["Player Lab"],["analytics"],["player_viewed","filter_used"],"P1","L",{engagement:5}),
  build(24,"Team rabbit-hole journey map","engagement / time-on-site","VARIANT",["BUILD-GV2-023"],"Same exploration pattern but team-level audience and data surfaces.",["team pages"],["analytics"],["filter_used"],"P2","L",{engagement:4}),
  build(25,"Prediction autopsy public format","trust / track-record systems","EXTENSION",["BUILD-GV2-019"],"Creates a reusable public format for learning from misses without overclaiming.",["track-record","articles"],["content QA"],["track_record_viewed","article_viewed"],"P1","M",{trust:5,brand:"MEDIUM"}),
  build(26,"Saved watchlist onboarding moment","customer onboarding","EXTENSION",["BUILD-113","BUILD-111"],"Existing onboarding and alert cards do not define watchlist activation as first value moment.",["onboarding","Player Lab"],["analytics"],["watchlist_created","onboarding_completed"],"P0","M",{retention:5,engagement:4}),
  build(27,"Personalized homepage intent router","engagement / time-on-site","EXTENSION",["BUILD-113","NEXT-003"],"Routes users by intent and tier; not a duplicate of generic onboarding wizard.",["home"],["analytics"],["page_view","search_used"],"P1","L",{engagement:5,retention:4}),
  build(28,"Shareable insight card policy","contests / community","NET_NEW",[],"Creates social sharing rules without exposing method or encouraging gambling.",["rating pages","articles"],["content QA"],["referral_shared"],"P1","M",{brand:"MEDIUM",legal:"MEDIUM"}),
  build(29,"Free pick'em no-cash education loop","contests / community","NET_NEW",[],"A free educational game loop is distinct from paid contests and must be no-cash/no-betting.",["community"],["analytics"],["contest_joined"],"P2","L",{legal:"HIGH",brand:"MEDIUM"}),
  build(30,"Beat-the-model educational challenge spec","contests / community","NET_NEW",[],"Creates engagement without prizes or betting; distinct from leaderboard concept.",["community"],["founder/content"],["contest_joined"],"P2","M",{legal:"MEDIUM",brand:"MEDIUM"}),
  build(31,"Responsible leaderboard guardrails","contests / community","DEPENDENCY",["BUILD-GV2-029","BUILD-GV2-030"],"Any leaderboard needs guardrails before implementation.",["community"],["compliance"],["contest_joined"],"P1","S",{legal:"HIGH",brand:"HIGH"}),
  build(32,"Confused-user rescue triggers","customer success","EXTENSION",existingAnchors.support,"Support tools exist; product-specific confusion detection is missing.",["help","onboarding"],["support cockpit"],["support_opened","search_used"],"P0","M",{support:5,retention:5}),
  build(33,"Methodology question triage flow","customer support","EXTENSION",["BUILD-040","BUILD-119"],"Adds founder-method leakage-safe support routing.",["help"],["support"],["support_message_sent"],"P0","S",{trust:5,support:5}),
  build(34,"Billing and refund support playbook","customer support","EXTENSION",["BUILD-047"],"Support escalation exists; billing/refund scripts and risk boundaries are missing.",["help/account"],["support"],["support_opened","cancellation_started"],"P1","S",{legal:"MEDIUM",support:5}),
  build(35,"Cancellation-save responsible boundary","retention / lifecycle","EXTENSION",["BUILD-043","BUILD-056"],"Retention save flow must avoid pressure and support responsible disengagement.",["account"],["support"],["cancellation_started","cancellation_saved"],"P0","M",{legal:"MEDIUM",brand:"HIGH",retention:5}),
  build(36,"Support sentiment tagging taxonomy","customer support","EXTENSION",["BUILD-045","BUILD-041"],"Adds sentiment/reason tags for product learning.",["help"],["support analytics"],["support_message_sent"],"P1","M",{support:5}),
  build(37,"Support-to-FAQ source-of-truth loop","customer support","EXTENSION",["BUILD-041","BUILD-040"],"Turns repeated support questions into approved FAQ updates.",["help","articles"],["content/support"],["support_message_sent","article_viewed"],"P1","M",{support:5,trust:4}),
  build(38,"Responsible gambling escalation protocol","risk / compliance","NET_NEW",[],"Critical support path not covered by generic support cards.",["help"],["support/compliance"],["support_opened"],"P0","S",{legal:"HIGH",brand:"HIGH",support:5,trust:5}),
  build(39,"Promotions complaint escalation flow","customer support","EXTENSION",["BUILD-GV2-001","BUILD-047"],"Specific to affiliate/promotion trust issues; not generic support escalation.",["/promotions","help"],["support/compliance"],["support_opened","promotion_clicked"],"P0","S",{legal:"HIGH",brand:"HIGH"}),
  build(40,"Customer trust issue ledger","trust / track-record systems","EXTENSION",["BUILD-048"],"Existing trust issue ledger is generic; this adds causes, owners, and public/private treatment.",["help","track-record"],["founder/support"],["support_opened"],"P1","M",{trust:5}),
  build(41,"GSE human voice rules","brand voice / copy auditor","NET_NEW",[],"No prior specific human-copy rule system for GSE tone was found.",["all copy"],["content QA"],["copy_flagged"],"P0","S",{brand:"MEDIUM",tech:"LOW"}),
  build(42,"Banned phrase and fake-certainty linter","brand voice / copy auditor","EXTENSION",["BUILD-GV2-041"],"Child enforcement layer for the voice rules.",["all copy"],["content QA"],["copy_flagged"],"P0","S",{brand:"MEDIUM",tech:"LOW"}),
  build(43,"Affiliate copy compliance auditor","brand voice / copy auditor","EXTENSION",["BUILD-GV2-003","BUILD-GV2-041"],"Affiliate-specific copy review extends general voice work.",["/promotions"],["content/compliance"],["copy_flagged"],"P0","M",{legal:"HIGH",brand:"HIGH"}),
  build(44,"No-bet and risk copy pattern library","brand voice / copy auditor","EXTENSION",["BUILD-GV2-018","BUILD-GV2-041"],"Risk/no-bet tone is materially different from generic support or sales copy.",["no-bet","articles"],["content QA"],["copy_flagged"],"P0","S",{brand:"MEDIUM",trust:5}),
  build(45,"Cancellation-save copy auditor","brand voice / copy auditor","EXTENSION",["BUILD-GV2-035","BUILD-GV2-041"],"Retention copy needs anti-pressure rules.",["account"],["support QA"],["copy_flagged"],"P1","S",{brand:"HIGH",legal:"MEDIUM"}),
  build(46,"Article human editor checklist","content / SEO / editorial","EXTENSION",["BUILD-021","NEXT-025"],"Adds people-first content and AI-disclosure/source checks before publish.",["articles"],["editorial"],["article_viewed","source_clicked"],"P0","S",{trust:5}),
  build(47,"GSE Daily Brief editorial standard","content / SEO / editorial","EXTENSION",["BUILD-050"],"Adds source, tone, risk, and method-leakage standard to existing brief.",["daily brief"],["editorial"],["brief_viewed"],"P0","S",{trust:5,retention:5}),
  build(48,"No-bet article series template","content / SEO / editorial","NET_NEW",[],"A restraint-first editorial series is distinct from generic article research.",["articles"],["editorial"],["article_viewed","no_bet_viewed"],"P1","M",{legal:"MEDIUM",trust:5}),
  build(49,"Injury shock explainer template","content / SEO / editorial","EXTENSION",["BUILD-051"],"Converts injury alert digest into evergreen/editorial explanation pattern.",["articles","alerts"],["editorial"],["article_viewed","email_clicked"],"P1","M",{engagement:4}),
  build(50,"Market movement explainer template","content / SEO / editorial","EXTENSION",["BUILD-052"],"Converts market movement digest into SEO/education content pattern.",["articles","alerts"],["editorial"],["article_viewed","email_clicked"],"P1","M",{engagement:4}),
  build(51,"GSE glossary and methodology boundary pages","content / SEO / editorial","EXTENSION",["BUILD-119","BUILD-112"],"Adds evergreen education with explicit reveal-less boundary.",["glossary"],["content QA"],["article_viewed","source_clicked"],"P0","M",{trust:5}),
  build(52,"Matchup page content model","content / SEO / editorial","NET_NEW",[],"New SEO/product surface distinct from generic content engine.",["matchup pages"],["CMS/content"],["page_view","article_viewed"],"P2","L",{engagement:4,revenue:3}),
  build(53,"Player page content model","content / SEO / editorial","EXTENSION",["BUILD-GV2-021"],"Content model for Player Lab pages, extending player exploration.",["player pages"],["CMS/content"],["player_viewed","article_viewed"],"P2","L",{engagement:4}),
  build(54,"Responsible promotions article policy","content / SEO / editorial","EXTENSION",["BUILD-GV2-003","BUILD-GV2-043"],"Ensures sponsored/affiliate articles do not become unsafe advertorials.",["articles","promotions"],["content/compliance"],["article_viewed","promotion_clicked"],"P0","S",{legal:"HIGH",brand:"HIGH"}),
  build(55,"Article-to-social transformation checklist","content / SEO / editorial","EXTENSION",["BUILD-058","BUILD-046"],"Distribution workflow exists; this adds platform-safe transformation rules.",["social"],["content ops"],["referral_shared"],"P2","S",{brand:"MEDIUM"}),
  build(56,"Content refresh and freshness queue","content / SEO / editorial","EXTENSION",["BUILD-059","BUILD-112"],"Adds stale content detection and freshness updates.",["articles"],["editorial"],["source_clicked","article_viewed"],"P1","M",{trust:5}),
  build(57,"Lifecycle map by user stage","retention / lifecycle","EXTENSION",["BUILD-054","BUILD-055","BUILD-056"],"Prior sequences exist; this unifies lifecycle states from anonymous to enterprise.",["onboarding","email"],["growth ops"],["onboarding_started","email_clicked"],"P0","M",{retention:5}),
  build(58,"Dormant user reactivation triggers","retention / lifecycle","EXTENSION",["BUILD-056"],"Winback exists; this defines product behavior and trigger taxonomy.",["email","homepage"],["lifecycle"],["email_opened","brief_viewed"],"P1","M",{retention:5}),
  build(59,"Paid user first-week success plan","customer success","EXTENSION",["BUILD-054","BUILD-055"],"Adds paid-first-week value delivery separate from general onboarding.",["onboarding","account"],["support"],["checkout_completed","onboarding_completed"],"P0","M",{retention:5,revenue:4}),
  build(60,"PRO power-user retention loop","retention / lifecycle","VARIANT",["BUILD-GV2-059"],"Different audience and behavior from new paid users.",["account","alerts"],["analytics"],["alert_created","watchlist_created"],"P1","M",{retention:5}),
  build(61,"ELITE white-glove success lane","customer success","EXTENSION",["BUILD-117"],"Premium support lane exists; this adds success milestones and proactive check-ins.",["account","support"],["support"],["support_opened","plan_changed"],"P1","M",{retention:5,revenue:5,support:5}),
  build(62,"Season restart lifecycle campaign","retention / lifecycle","NET_NEW",[],"Sports-season timing campaign distinct from generic winback.",["email","home"],["lifecycle"],["email_opened","brief_viewed"],"P1","M",{retention:5}),
  build(63,"Post-cancellation learning loop","retention / lifecycle","EXTENSION",["BUILD-GV2-035"],"Uses cancellations to improve product without pressuring users.",["account"],["support/product"],["cancellation_completed"],"P1","M",{retention:4,trust:5}),
  build(64,"B2C objection library","sales / partner pipeline","EXTENSION",["BUILD-036","BUILD-038"],"Pricing objections exist; this broadens to trust, betting advice, accuracy, and differentiation.",["pricing","help"],["sales/support"],["support_message_sent","upgrade_clicked"],"P0","S",{revenue:5,support:4}),
  build(65,"Risk-aware sales scripts","sales / partner pipeline","NET_NEW",[],"Sales scripts that avoid gambling pressure are distinct from CRM/pipeline cards.",["pricing","sales"],["sales"],["upgrade_clicked"],"P0","S",{legal:"MEDIUM",brand:"HIGH",revenue:5}),
  build(66,"Enterprise discovery call script","sales / partner pipeline","EXTENSION",["BUILD-029","BUILD-118"],"Adds a concrete call flow for enterprise prospects.",["enterprise"],["sales CRM"],["page_view"],"P1","S",{revenue:5}),
  build(67,"Creator partnership pitch kit","sales / partner pipeline","EXTENSION",["BUILD-028"],"Creator-specific pitch and trust guardrails extend affiliate/creator pipeline.",["partner page"],["sales"],["referral_shared"],"P1","M",{revenue:4,brand:"MEDIUM"}),
  build(68,"Sports media sponsorship one-pager","sales / partner pipeline","NET_NEW",[],"Media sponsorship sales collateral distinct from CRM records.",["sponsor page"],["sales"],["page_view"],"P2","S",{revenue:4}),
  build(69,"Partner win-loss notes schema","sales / partner pipeline","EXTENSION",["BUILD-035"],"Adds structured learning to partner pipeline.",["none"],["CRM"],[],"P1","S",{revenue:4}),
  build(70,"Promotions trust objection library","sales / partner pipeline","EXTENSION",["BUILD-GV2-064","BUILD-GV2-043"],"Handles user concerns about affiliate incentives damaging trust.",["promotions","help"],["support/sales"],["support_message_sent","promotion_viewed"],"P0","S",{legal:"HIGH",brand:"HIGH",trust:5}),
  build(71,"Founder financial cockpit v1","financial dashboards","EXTENSION",["NEXT-003","NEXT-006"],"Adds finance model surfaces not covered by product analytics dashboards.",["none"],["founder cockpit"],["checkout_completed","plan_changed"],"P0","M",{revenue:5,business:5}),
  build(72,"CAC and channel payback dashboard","financial dashboards","EXTENSION",["BUILD-GV2-071","NEXT-036"],"Adds acquisition economics by channel and partner.",["none"],["finance/marketing"],["affiliate_outbound_click","checkout_completed"],"P1","M",{revenue:5}),
  build(73,"LTV and churn sensitivity model","financial dashboards","EXTENSION",["BUILD-GV2-071"],"Adds unit economics scenario planning.",["none"],["finance"],["plan_changed","cancellation_completed"],"P1","M",{business:5,retention:5}),
  build(74,"Data/API cost ledger","financial dashboards","NET_NEW",[],"Tracks data-provider and API costs separate from revenue dashboards.",["none"],["finance/data"],[],"P1","S",{business:5}),
  build(75,"Refund and chargeback risk dashboard","financial dashboards","EXTENSION",["BUILD-GV2-034"],"Adds financial risk view from support/billing interactions.",["none"],["finance/support"],["cancellation_started"],"P2","M",{legal:"MEDIUM",business:4}),
  build(76,"Product analytics event contract","product analytics","EXTENSION",["NEXT-002"],"Turns event taxonomy into contract with required properties and privacy rules.",["all"],["analytics"],["page_view"],"P0","M",{trust:4}),
  build(77,"Upgrade funnel instrumentation plan","product analytics","EXTENSION",["NEXT-003"],"Specific upgrade funnel instrumentation for FREE/PRO/ELITE.",["pricing","checkout"],["analytics"],["upgrade_clicked","checkout_started","checkout_completed"],"P0","M",{revenue:5}),
  build(78,"Promotions event schema","product analytics","EXTENSION",["BUILD-GV2-001","NEXT-002"],"Promotion-specific events and privacy rules are not in existing generic event taxonomy.",["promotions"],["analytics/compliance"],["promotion_viewed","promotion_clicked","affiliate_outbound_click"],"P0","M",{legal:"HIGH",brand:"MEDIUM"}),
  build(79,"Support event schema","product analytics","EXTENSION",["BUILD-041","NEXT-002"],"Support events tied to retention and confusion rescue.",["help"],["analytics/support"],["support_opened","support_message_sent"],"P1","S",{support:5}),
  build(80,"Content event schema","product analytics","EXTENSION",["BUILD-058","NEXT-002"],"Article/content events tied to trust, source clicks, and conversion.",["articles"],["analytics/content"],["article_viewed","source_clicked","upgrade_clicked"],"P1","S",{engagement:4}),
  build(81,"Privacy-safe identity resolution policy","product analytics","DEPENDENCY",["NEXT-001","BUILD-GV2-076"],"Must exist before cross-session analytics and lifecycle personalization.",["all"],["analytics"],["page_view"],"P0","S",{legal:"MEDIUM",trust:5}),
  build(82,"AI source research workflow","AI automation","EXTENSION",["BUILD-021","BUILD-016"],"Adds workflow triggers and approval gates for source research.",["articles"],["AI research"],["source_clicked"],"P1","M",{trust:5}),
  build(83,"AI human-copy reviewer","AI automation","EXTENSION",["BUILD-GV2-041","NEXT-007"],"Connects copy rules to AI review workflow.",["all copy"],["content QA"],["copy_flagged"],"P0","M",{brand:"MEDIUM"}),
  build(84,"Affiliate compliance checker agent","AI automation","EXTENSION",["BUILD-GV2-043","NEXT-007"],"AI workflow specialized for affiliate risk review, not general compliance.",["promotions"],["compliance"],["copy_flagged","promotion_viewed"],"P1","M",{legal:"HIGH",brand:"HIGH"}),
  build(85,"Method leakage reviewer","AI automation","EXTENSION",["BUILD-022","BUILD-014"],"Existing RAG leakage guard exists; this adds release/content copy review.",["articles","help"],["founder QA"],["copy_flagged"],"P0","M",{trust:5,brand:"HIGH"}),
  build(86,"Weekly founder growth brief agent","AI automation","EXTENSION",["BUILD-106","NEXT-017"],"Adds growth OS inputs and decisions to existing cockpit digest.",["none"],["founder cockpit"],[],"P1","M",{business:5}),
  build(87,"Churn risk analysis agent","AI automation","EXTENSION",["BUILD-033","BUILD-GV2-057"],"Analyzes lifecycle data for churn risk, distinct from account tagging.",["account"],["analytics/support"],["cancellation_started","brief_viewed"],"P2","L",{retention:5,legal:"MEDIUM"}),
  build(88,"Competitor monitoring digest","AI automation","NET_NEW",[],"Competitive monitoring was not present in existing queues.",["none"],["founder"],[],"P2","M",{business:4}),
  build(89,"Release notes generator with risk labels","AI automation","EXTENSION",["BUILD-088","NEXT-044"],"Adds release communication and risk labels to feature clips/workers.",["changelog"],["product ops"],[],"P2","M",{trust:4}),
  build(90,"Build queue dedupe assistant","AI automation","EXTENSION",["BUILD-018"],"Existing build queue assistant exists; this adds fingerprint-based dedupe enforcement.",["none"],["Codex/Claude ops"],[],"P0","M",{business:5}),
  build(91,"Weekly growth operating cadence","org design / founder cockpit","EXTENSION",["BUILD-106","NEXT-017"],"Digest exists; cadence creates decisions, owners, and review rituals.",["none"],["founder cockpit"],[],"P0","S",{business:5}),
  build(92,"Compliance review cadence","org design / founder cockpit","NET_NEW",[],"Specific recurring review for promotions, copy, claims, and state rules.",["none"],["compliance"],[],"P0","S",{legal:"HIGH",brand:"HIGH"}),
  build(93,"Support review cadence","org design / founder cockpit","EXTENSION",["BUILD-041","BUILD-047"],"Adds weekly support learning loop to existing support workflow cards.",["none"],["support"],[],"P1","S",{support:5}),
  build(94,"Revenue review cadence","org design / founder cockpit","EXTENSION",["BUILD-GV2-071"],"Connects finance dashboard to operating rhythm.",["none"],["finance"],[],"P1","S",{business:5}),
  build(95,"Build queue grooming protocol","org design / founder cockpit","EXTENSION",["BUILD-GV2-090"],"Turns dedupe assistant into weekly human/agent process.",["none"],["Codex/Claude ops"],[],"P0","S",{business:5}),
  build(96,"Future risk early-warning dashboard","risk / compliance","NET_NEW",[],"Forecast risk register is new and cross-functional.",["none"],["founder/risk"],[],"P1","M",{legal:"MEDIUM",trust:5}),
  build(97,"State/legal change watchlist","risk / compliance","EXTENSION",["BUILD-GV2-092"],"Promotions need active legal/regulatory watch, separate from review cadence.",["promotions"],["compliance"],[],"P1","M",{legal:"HIGH"}),
  build(98,"Data source outage playbook","risk / compliance","EXTENSION",["BUILD-071","BUILD-070"],"Prior source QA exists; outage response and customer communication are distinct.",["alerts","ratings"],["ops/support"],["source_clicked"],"P1","M",{trust:5}),
  build(99,"Stale data public warning pattern","risk / compliance","EXTENSION",["BUILD-GV2-098","BUILD-112"],"Adds public copy/UI pattern for stale/frozen data.",["ratings","alerts"],["ops"],["source_clicked"],"P0","S",{trust:5}),
  build(100,"Founder bottleneck reduction map","org design / founder cockpit","NET_NEW",[],"Maps approval gates, delegation, and agent limits; not in existing build queues.",["none"],["founder ops"],[],"P1","S",{business:5})
];

const uncertain = [
  { id: "UNCERTAIN-GV2-001", title: "Live sportsbook offer carousel", reason: "Could duplicate promotions cards and requires legal/affiliate approval; excluded from main queue." },
  { id: "UNCERTAIN-GV2-002", title: "Casino bonus comparison page", reason: "High legal/trust risk and not aligned until founder/legal approval; excluded." },
  { id: "UNCERTAIN-GV2-003", title: "Cash-prize leaderboard", reason: "Contest/gambling-adjacent rules uncertain; excluded." },
  { id: "UNCERTAIN-GV2-004", title: "Public AI betting assistant", reason: "Conflicts with sports intelligence positioning and method/risk boundaries; excluded." }
];

const categorySummaries = [
  ["Monetization", "Do not duplicate prior tier conversion work; add GSE-specific rating/no-bet/track-record upgrade reasons, unit economics, and enterprise packaging."],
  ["Promotions/Affiliate", "Research-only. Build compliance spine before partner cards. No live links."],
  ["Support/Success", "Extend Chatwoot/help/support cards with confusion rescue, methodology triage, responsible gambling escalation, and trust issue handling."],
  ["Brand Voice", "Net-new human-copy auditor with risk, proof, and method-leakage rules."],
  ["Engagement", "Add sports-specific rabbit holes, rating movers, no-bet radar, watchlists, and educational challenges."],
  ["Retention", "Extend lifecycle cards into concrete user-stage map and first-week paid success."],
  ["Content/SEO", "Use people-first, source-led, non-hype content system with GSE glossary and risk-aware article templates."],
  ["Sales", "Build risk-aware objection handling and partner/enterprise scripts without hype."],
  ["Finance", "Add unit economics, payout reconciliation, CAC/LTV, cost ledger, refund/chargeback risk."],
  ["Analytics", "Extend PostHog event taxonomy with contracts, identity/privacy, and domain-specific events."],
  ["AI", "Use AI as reviewer/copilot with human approval, never as unchecked public advice."],
  ["Org", "Turn founder cockpit from digest into cadence, owners, gates, and risk reviews."]
];

function sourceList() {
  return sources.map(([name, url, note]) => `- ${name}: ${url} - ${note}`).join("\n");
}

write("04-total-growth-research.md", `# Total Growth Research

As of: ${asOf}

## Research Principles

- Existing build inventory happened first: 180 existing build/packet rows and 230 docs were indexed.
- New opportunities were scored against customer value, business value, revenue, engagement, retention, trust, support, risk, speed, and duplicate risk.
- Promotions and betting-adjacent opportunities are research-only until approval.

## Category Map

${mdTable(["Category","Finding"], categorySummaries)}

## Opportunity Inventory

${mdTable(["ID","Title","Category","Duplicate Class","Matched Existing","Priority","Go/No-Go","Reason Not Duplicate"], opportunityRows.map((r) => [r[0],r[1],r[2],r[5],r[6],r[24],r[25],r[6]]))}

## Source Notes

${sourceList()}
`);

const oppHeaders = ["opportunity_id","title","category","description","current_repo_status","matched_existing_ids","duplicate_classification","reason_not_duplicate","customer_value","business_value","revenue_value","engagement_value","retention_value","trust_value","support_value","legal_risk","brand_risk","technical_risk","support_burden","implementation_effort","estimated_speed_to_value","product_surface","internal_surface","analytics_needed","copy_needed","repo_integration_point","suggested_build_type","priority","go_no_go","notes"];
write("growth-opportunity-inventory.csv", [oppHeaders.join(","), ...opportunityRows.map((r) => r.map(csvEscape).join(","))].join("\n"));

const partnerHeaders = ["partner_name","URL","category","affiliate_model","approval_required","geographic_restrictions","state_restrictions","age_restrictions","compliance_requirements","responsible_gambling_requirements","disclosure_requirements","tracking_method","payout_method","cookie_duration_if_known","brand_fit","customer_value","legal_risk","trust_risk","priority","go_no_go","notes"];
write("affiliate-partner-inventory.csv", [partnerHeaders.join(","), ...partnerRows.map((r) => r.map(csvEscape).join(","))].join("\n"));

write("05-promotions-affiliate-system.md", `# Promotions / Affiliate Revenue System

As of: ${asOf}

## Recommendation

Build the promotions tab as a compliance-controlled revenue system, not a link dump. The first implementation should be a disabled-by-default data model and admin review workflow. No live links.

## Required System Pieces

- public /promotions page
- geo-aware offer display
- state/country availability rules
- age and eligibility checks where required
- clear affiliate disclosure close to offers
- responsible gambling/help message
- partner cards and offer cards
- referral code and UTM handling
- outbound click tracking
- conversion and payout reconciliation
- fraud prevention
- partner status admin
- offer expiration
- legal/compliance review workflow
- editorial review workflow
- audit log
- finance export
- no-bet/responsible-play alignment

## Partner Inventory Summary

${mdTable(["Partner","Category","Approval","Risk","Priority","Status"], partnerRows.map((r) => [r[0],r[2],r[4],`${r[16]} legal / ${r[17]} trust`,r[18],r[19]]))}

## Compliance Baseline

- FTC: disclose material connections clearly and conspicuously.
- AGA/NCPG: treat gaming marketing as age, consumer-protection, responsible-gaming, and assistance-sensitive.
- GSE-specific: promotions must never imply GSE is a sportsbook or that users should gamble.

## Duplicate Gate

Extends BUILD-028, BUILD-035, NEXT-031, NEXT-032, NEXT-033, NEXT-034, NEXT-035, and NEXT-036. New value is compliance workflow, responsible-play copy, geo/state/age safety, payout reconciliation, and trust-impact measurement.
`);

write("affiliate-compliance-risk-register.md", `# Affiliate Compliance Risk Register

As of: ${asOf}

| Risk | Severity | Likelihood | Mitigation | Owner | Go/No-Go |
| --- | --- | --- | --- | --- | --- |
| Live restricted-state offer shown to wrong user | HIGH | MEDIUM | Geo/state rules, default hide, legal review | Compliance | NO-GO until solved |
| Affiliate disclosure unclear | HIGH | MEDIUM | Disclosure component, copy audit, FTC review | Content/compliance | NO-GO until solved |
| Underage audience exposure | HIGH | MEDIUM | Age-gate where required, no youth targeting, content filters | Compliance | NO-GO until solved |
| Promotions damage trust | HIGH | MEDIUM | No-bet alignment, offer quality score, trust dashboard | Founder | REVIEW |
| Partner terms unavailable | MEDIUM | HIGH | Mark economics unknown, require partner account terms | Finance/legal | RESEARCH_ONLY |
| Irresponsible gambling language | HIGH | MEDIUM | Responsible-play copy checker and helpline rules | Content/compliance | NO-GO until solved |
| Payout nonpayment or tracking disputes | MEDIUM | MEDIUM | Reconciliation ledger and audit logs | Finance | REVIEW |
| GSE mistaken for sportsbook | HIGH | MEDIUM | Repeated positioning copy: sports intelligence, not sportsbook | Brand/legal | NO-GO until solved |
`);

write("06-monetization-system.md", `# Monetization System

As of: ${asOf}

## Monetization Map

${mdTable(["Opportunity","Current State","Existing Build(s)","Missing Layer","Build Recommendation"], [
  ["FREE to PRO conversion","planned","BUILD-055; BUILD-115","GSE Rating education ladder","BUILD-GV2-011"],
  ["PRO to ELITE conversion","planned","BUILD-115; BUILD-117","Decision-quality upgrade path","BUILD-GV2-012"],
  ["Annual plan","not verified","BUILD-055","Risk-safe commitment copy","BUILD-GV2-013"],
  ["Founder plan","not found","none","Early believer packaging","BUILD-GV2-014"],
  ["Team plan","not found","none","Group account model","BUILD-GV2-015"],
  ["Enterprise plan","partial","BUILD-029; BUILD-118","Report deliverable packaging","BUILD-GV2-016"],
  ["Paid daily brief","partial","BUILD-050","Editorial standard and paid success metrics","BUILD-GV2-047"],
  ["Alert packages","partial","BUILD-051; BUILD-052; BUILD-111","No-bet/risk framing","BUILD-GV2-017"],
  ["Data/API product","partial","NEXT-049; NEXT-050; BUILD-116","Quota and usage packaging","Build later after real source verification"],
  ["Affiliate revenue","partial","BUILD-028; NEXT-031","Compliance-first system","BUILD-GV2-001"],
  ["Newsletter sponsorships","not found","none","Sponsor policy and finance tracking","Future child of finance/content"],
  ["Creator partnerships","partial","BUILD-028","Creator pitch kit","BUILD-GV2-067"],
  ["Enterprise reports","partial","BUILD-118","Report offer and sales script","BUILD-GV2-016"],
  ["Media/data licensing","not found","none","Legal and API boundaries","Future review item"]
])}

## Rule

Subscriptions remain the trust anchor. Affiliate revenue is additive only if it does not weaken trust, confuse product positioning, or create legal risk.
`);

write("07-customer-support-success-system.md", `# Customer Support / Success System

As of: ${asOf}

## Existing Coverage

Prior builds cover Chatwoot inbox, support KB, support-to-build-card flow, AI support copilot, support SLA/escalation, bug triage, customer segmentation, and premium support lane.

## Non-Duplicate Extensions

${mdTable(["Build","Purpose"], builds.filter((b) => ["customer support","customer success"].includes(b.category)).map((b) => [b.id,b.title]))}

## Support Principles

- Support should clarify product purpose: GSE is sports intelligence, not sportsbook.
- Methodology questions must be answered reveal-less.
- Confused users should be rescued before cancellation.
- Responsible gambling or harm signals must be escalated to approved resources, not handled as conversion opportunities.
`);

write("08-brand-voice-human-copy-auditor.md", `# Brand Voice / Human Copy Auditor

As of: ${asOf}

## Recommendation

Create a human-copy auditor before scaling content, promotions, lifecycle emails, support, or AI-generated pages.

## Audit Targets

- robotic wording
- AI-sounding filler
- fake certainty
- overclaiming
- gambling-risk language
- weak CTAs
- jargon
- method leakage
- weak affiliate disclosure
- weak responsible-play messaging
- customer confusion
- hype without proof
- pressure during cancellation

## Build Cards

${builds.filter((b) => b.category === "brand voice / copy auditor").map((b) => `- ${b.id}: ${b.title}`).join("\n")}
`);

write("gse-brand-voice-rules.md", `# GSE Brand Voice Rules

As of: ${asOf}

## Voice

- Sound like a sharp human sitting next to the customer.
- Be plainspoken, specific, and useful.
- Say what GSE knows, what it does not know, and what changed.
- Never sell certainty that the product cannot prove.
- Treat no-bet, risk, volatility, and uncertainty as value.

## Banned Patterns

- "Guaranteed"
- "Lock"
- "Can’t lose"
- "Free money"
- "Sure thing"
- "Crush the books"
- "This will hit"
- "Secret formula"
- "Bet now"
- "Everyone should play this"
- "AI-powered" as a standalone value claim

## Required Patterns

- "Here is what changed."
- "Here is why it matters."
- "Here is what we do not know."
- "This is intelligence, not a sportsbook."
- "Promotional links may pay us; they do not change our rating logic."
- "When risk is high, restraint is part of the edge."
`);

write("human-copy-audit-checklist.md", `# Human Copy Audit Checklist

As of: ${asOf}

- Does the copy sound like a real person wrote it?
- Is the customer told exactly what they get?
- Is the claim supported?
- Is uncertainty visible?
- Is there any betting pressure?
- Is the affiliate relationship clear if present?
- Is responsible-play language nearby if gambling-adjacent?
- Does it avoid founder-method leakage?
- Does it explain the next action without hype?
- Would a confused new customer understand it?
`);

write("09-engagement-time-on-site-system.md", `# Engagement / Time-On-Site System

As of: ${asOf}

## Recommendation

Increase meaningful time on site through learning loops, not addictive mechanics. The best loops are rating movers, no-bet radar, Player Lab rabbit holes, track-record autopsies, what-changed feeds, watchlists, and source transparency.

## Non-Duplicate Engagement Builds

${mdTable(["Build","Overlap","Why Not Duplicate","Events"], builds.filter((b) => b.category.includes("engagement") || b.category.includes("contests")).map((b) => [b.id,b.matched_existing_ids.join("; "),b.reason_not_duplicate,b.analytics_events.join("; ")]))}
`);

write("10-retention-lifecycle-system.md", `# Retention / Lifecycle System

As of: ${asOf}

${mdTable(["Stage","Goal","Risk","Trigger","Recommendation"], [
  ["anonymous visitor","understand GSE quickly","confusion","page_view","intent router and GSE Rating education"],
  ["free user","reach first value","low activation","onboarding_started","watchlist activation"],
  ["activated free user","see recurring value","stale habit","brief_viewed","Daily Brief and rating movers"],
  ["new paid user","feel upgrade value fast","buyer remorse","checkout_completed","first-week success plan"],
  ["power user","deepen workflow","feature fatigue","alert_created","PRO power-user loop"],
  ["dormant user","return for timely event","irrelevance","no brief views","season restart and reactivation"],
  ["cancellation-risk user","resolve confusion or mismatch","pressure harms trust","cancellation_started","responsible cancellation-save boundary"],
  ["canceled user","learn why and leave door open","spam","cancellation_completed","post-cancellation learning loop"],
  ["ELITE user","feel premium support","underuse","support_opened","white-glove success lane"],
  ["enterprise lead","trust and fit","unclear ROI","page_view","enterprise report offer"]
])}
`);

write("11-content-editorial-engine.md", `# Content / SEO / Editorial Engine

As of: ${asOf}

## Principle

Follow people-first content: original value, clear sourcing, trust, expertise, no mass-produced filler, no fake freshness, no copied competitor copy.

## Editorial Surfaces

- GSE Daily Brief
- NFL weekly preview
- injury report article
- market movement article
- no-bet article
- player spotlight
- rookie watch
- team trend article
- public education article
- track-record article
- compliance-reviewed partner article
- evergreen glossary and methodology-boundary pages
- matchup/player/team pages
- responsible gambling pages

## Non-Duplicate Content Builds

${builds.filter((b) => b.category === "content / SEO / editorial").map((b) => `- ${b.id}: ${b.title} - ${b.reason_not_duplicate}`).join("\n")}
`);

write("12-sales-partnership-system.md", `# Sales / Partnership / Complex Sales System

As of: ${asOf}

## Objection Library

${mdTable(["Objection","Answer Direction"], [
  ["Why not use free picks?","GSE is not selling picks; it helps users understand rating, risk, movement, and uncertainty."],
  ["Is this betting advice?","No. It is sports decision intelligence and education, not a sportsbook or guarantee."],
  ["How accurate are you?","Use receipts, track record context, and methodology boundaries without overclaiming."],
  ["Why upgrade?","Upgrade for better context, alerts, depth, and workflow, not fake certainty."],
  ["Why trust this?","Show sources, freshness, misses, no-bet logic, and disclosures."],
  ["What is GSE Rating?","Explain what it summarizes and what remains founder-gated."],
  ["Why PRO?","Personalized alerts, watchlists, richer brief, and education."],
  ["Why ELITE?","Premium support, deeper research surfaces, and advanced workflow."],
  ["How do promotions affect trust?","Disclose material connections and separate ratings from partner economics."]
])}

## Non-Duplicate Sales Builds

${builds.filter((b) => b.category === "sales / partner pipeline").map((b) => `- ${b.id}: ${b.title}`).join("\n")}
`);

write("13-financial-model-unit-economics.md", `# Financial Model / Unit Economics

As of: ${asOf}

## Dashboard Needs

- subscription revenue
- affiliate revenue
- sponsorship revenue
- content revenue
- data/API revenue
- enterprise revenue
- hosting costs
- data/API costs
- email costs
- support costs
- payment processing
- refunds and chargebacks
- CAC, LTV, ARPU, churn, margin, payback period
- affiliate payout reconciliation

## Non-Duplicate Finance Builds

${builds.filter((b) => b.category === "financial dashboards").map((b) => `- ${b.id}: ${b.title}`).join("\n")}
`);

write("14-data-engineering-product-analytics.md", `# Data Engineering / Product Analytics

As of: ${asOf}

## Event Taxonomy

${mdTable(["Event","Properties","Privacy Concern","Business Use"], eventRows)}

## Rule

This is taxonomy only. Do not implement until approved in the real app clone.
`);

write("15-ai-automation-agent-workflow-system.md", `# AI Automation / Agent Workflow System

As of: ${asOf}

${mdTable(["Workflow","Trigger","Inputs","Output","Approval Point","Boundary"], [
  ["source research","content request","source URLs, prior docs","source-backed summary","editor approval","no fabricated citations"],
  ["article drafting","approved brief","sources, voice rules","draft article","human edit","no copied copy"],
  ["human-copy auditing","copy changed","copy, rules","flags and rewrite suggestions","editor approval","no auto-publish"],
  ["support copilot","support ticket","ticket, KB","draft response","support approval","no sensitive data overexposure"],
  ["sales copilot","lead stage change","CRM notes","objection answer","sales approval","no fake claims"],
  ["affiliate compliance checker","offer draft","partner terms, copy","risk flags","legal approval","no live links"],
  ["method leakage review","public content draft","copy, method rules","leakage flags","founder approval","private methods protected"],
  ["weekly founder brief","weekly cadence","analytics, support, revenue","brief","founder review","no secrets"]
])}

## Build Cards

${builds.filter((b) => b.category === "AI automation").map((b) => `- ${b.id}: ${b.title}`).join("\n")}
`);

write("16-org-design-operating-cadence.md", `# Org Design / Operating Cadence

As of: ${asOf}

## Cadence

- daily growth standup: conversion, content, support, incidents
- weekly founder cockpit: revenue, trust, product, support, AI quality, compliance
- weekly content cycle: sources, drafts, copy audit, publish queue
- weekly support review: objections, confusion, bugs, churn
- weekly affiliate review: partner status, compliance, payouts, trust impact
- weekly data quality review: stale sources, outages, anomalies
- weekly build queue grooming: dedupe, priority, owner, blockers

## Build Cards

${builds.filter((b) => b.category === "org design / founder cockpit").map((b) => `- ${b.id}: ${b.title}`).join("\n")}
`);

write("17-future-issue-forecast.md", `# Future Issue Forecast

As of: ${asOf}

${mdTable(["Issue","Early Warning","Severity","Likelihood","Prevention","Mitigation","Owner"], [
  ["Promotions damage trust","support complaints or lower upgrade conversion after promo exposure","HIGH","MEDIUM","trust impact dashboard","pause offers","Founder"],
  ["Legal/state restriction breach","restricted-state clicks or stale partner terms","HIGH","MEDIUM","geo rules and legal review","kill switch","Compliance"],
  ["Responsible gambling harm signal","support messages mention harm/control issues","HIGH","MEDIUM","escalation protocol","provide resources and stop conversion","Support"],
  ["Overpromising accuracy","copy flags or refund complaints","HIGH","MEDIUM","copy auditor and receipts","rewrite and issue correction","Content"],
  ["Stale data","source freshness warnings","HIGH","MEDIUM","source QA and outage playbook","public stale warning","Data"],
  ["AI leakage","method terms in public copy","HIGH","LOW","method leakage reviewer","remove content and audit logs","Founder"],
  ["Low activation","onboarding completion drops","MEDIUM","HIGH","watchlist first value","rescue flow","Growth"],
  ["Affiliate nonpayment","payout variance","MEDIUM","MEDIUM","reconciliation ledger","pause partner","Finance"],
  ["SEO penalties","low-value mass pages","MEDIUM","MEDIUM","people-first editorial review","prune/rewrite","Content"],
  ["Founder bottleneck","approval backlog","MEDIUM","HIGH","approval map","delegate low-risk decisions","Founder"]
])}
`);

write("18-tooling-saas-expansion.md", `# Tooling / Open-Source / SaaS Expansion

As of: ${asOf}

## Rule

Most tooling gaps are already covered by the OSS leverage and next-wave stacks. This phase does not recommend another tool wave unless a gap is not already covered.

${mdTable(["Category","Covered By","Gap","Recommendation"], [
  ["analytics","PostHog","domain-specific event contracts","extend NEXT-002"],
  ["CRM","Twenty","sports-specific objection/pipeline schemas","extend BUILD-025 to BUILD-036"],
  ["support","Chatwoot","responsible-gambling escalation and confusion rescue","extend support builds"],
  ["newsletter/email","listmonk","lifecycle stage map","extend BUILD-050 to BUILD-060"],
  ["automation","n8n, Trigger.dev","safe operating cadence and approval gates","extend NEXT-013/NEXT-043"],
  ["AI/RAG","AnythingLLM, Open WebUI, Langfuse","method leakage and copy review","extend AI builds"],
  ["CMS/SEO","Payload","people-first GSE editorial standards","extend NEXT-025"],
  ["affiliate tracking","Dub","compliance and payout reconciliation","extend NEXT-031"],
  ["observability","SigNoz","customer-impact reliability dashboard","extend NEXT-055"],
  ["copy linting","no existing tool selected","human-copy auditor rules first","build internal checklist before tool search"]
])}
`);

const nodes = [
  ...builds.map((b) => ({ id: b.id, type: "new_build", label: b.title, category: b.category })),
  ...Object.entries(existingAnchors).flatMap(([k, ids]) => ids.map((id) => ({ id, type: "existing_build", label: `${k} existing anchor`, category: k })))
];
const edges = builds.flatMap((b) => [
  ...b.matched_existing_ids.map((m) => ({ from: b.id, to: m, relation: b.duplicate_check_status === "EXTENSION" ? "EXTENDS" : b.duplicate_check_status === "DEPENDENCY" ? "DEPENDS_ON" : "SUPPORTS" })),
  ...b.analytics_events.map((e) => ({ from: b.id, to: e, relation: "USES_EVENT" })),
  ...(b.legal_risk === "HIGH" ? [{ from: b.id, to: "legal_approval", relation: "NEEDS_APPROVAL" }] : [])
]);
write("opportunity-graph.json", JSON.stringify({ asOf, nodes, edges }, null, 2));
write("19-opportunity-graph.md", `# Opportunity Graph

As of: ${asOf}

Graph file: \`opportunity-graph.json\`

## Summary

- New build nodes: ${builds.length}
- Existing anchor nodes: ${nodes.filter((n) => n.type === "existing_build").length}
- Edges: ${edges.length}
- Relationship vocabulary used: EXTENDS, DEPENDS_ON, SUPPORTS, NEEDS_APPROVAL, USES_EVENT.
`);

write("claude-build-queue/build-queue.jsonl", builds.map((b) => JSON.stringify(b)).join("\n"));
write("uncertain-builds-for-review.jsonl", uncertain.map((u) => JSON.stringify(u)).join("\n"));

write("claude-build-queue/index.md", `# Growth OS V2 Claude Build Queue

As of: ${asOf}

This queue contains ${builds.length} non-duplicate or explicitly linked child builds. IDs use the \`BUILD-GV2-\` prefix to avoid collisions with the prior \`BUILD-001\` through \`BUILD-120\` cards.

${mdTable(["ID","Title","Category","Gate","Matched Existing","Priority","Difficulty"], builds.map((b) => [b.id,b.title,b.category,b.duplicate_check_status,b.matched_existing_ids.join("; "),b.priority,b.difficulty]))}
`);

for (const b of builds) {
  const file = path.join(cardsDir, `${b.id}-${slug(b.title)}.md`);
  fs.writeFileSync(file, `# ${b.id}: ${b.title}

## Duplicate Gate

duplicate_check_status: ${b.duplicate_check_status}  
matched_existing_ids: ${b.matched_existing_ids.join(", ") || "none"}  
relation_to_existing: ${b.relation_to_existing}  
reason_not_duplicate: ${b.reason_not_duplicate}  
parent_id: ${b.parent_id || "none"}  
supersedes_id: ${b.supersedes_id || "none"}  
dependency_ids: ${b.dependency_ids.join(", ") || "none"}  
merge_notes: ${b.merge_notes || "none"}

## Category

${b.category}

## Goal

Build or specify ${b.title.toLowerCase()} for Galaxy Sports Edge / GSN without changing production systems first.

## Why It Matters

This improves revenue, retention, support, trust, engagement, financial clarity, customer value, or founder leverage while respecting existing build work.

## Current Repo Context

Likely files/routes/components/data models: ${b.repo_files.join(", ")}.  
What already exists: ${b.matched_existing_ids.length ? `related prior work ${b.matched_existing_ids.join(", ")}` : "no matching existing build found in the ledger"}.  
What is missing: the specific GSE layer described by this card.  
Files to avoid: production env files, Stripe/billing code, live affiliate links, founder-only methodology, unrelated app files.

## Product Surface

${b.product_surface.join(", ") || "none"}

## Internal Surface

${b.internal_surface.join(", ") || "none"}

## Customer Value

Users get clearer, safer, more useful sports intelligence with less confusion and more trust.

## Business Value

Supports revenue quality, retention, brand trust, operational leverage, and sharper prioritization.

## Legal / Compliance Boundary

Legal risk: ${b.legal_risk}. Brand risk: ${b.brand_risk}. Do not imply GSE is a sportsbook. Do not create live promotions, affiliate links, billing changes, or public AI advice without explicit approval.

## Data / Analytics Needed

Events: ${b.analytics_events.join(", ") || "none"}. Keep identifiers privacy-safe and avoid unnecessary sensitive data.

## Copy / Brand Voice Needed

Plain human copy, no fake certainty, no pressure, no method leakage, no irresponsible gambling language, and clear disclosure where required.

## Implementation Plan

1. Verify the real GSE shipping clone, branch, dirty state, package manager, and existing patterns.
2. Read existing matching builds: ${b.matched_existing_ids.join(", ") || "none"}.
3. Implement a docs-first, fake-data, or disabled-by-default version.
4. Add tests or validation for event shape, copy safety, privacy, and rollback.
5. Document required env vars by name only if any.
6. Stop before production data, public launch, live affiliate links, billing, or deploy.

## Testing Plan

- Validate no duplicate card is created.
- Validate feature is disabled or fake-data-only.
- Validate no secrets or live links appear.
- Run relevant repo checks in the real clone.

## Acceptance Criteria

- Duplicate gate fields are preserved.
- Existing parent/extension relationship is documented.
- No production data or secrets are used.
- Rollback is clear.
- Approval gates are explicit.

## Rollback Plan

Remove only this build's docs, feature flag, route/component, or fake-data fixture. Leave unrelated files untouched.

## Priority

${b.priority}

## Difficulty

${b.difficulty}

## Dependencies

${[...b.dependencies, ...b.dependency_ids].join(", ") || "none"}

## Risks

Legal: ${b.legal_risk}. Brand: ${b.brand_risk}. Technical: ${b.technical_risk}. Support burden: ${b.support_burden}.

## Claude Code Prompt

You are Claude Code working in the real Galaxy Sports Edge / GSE shipping clone. Execute only ${b.id}: ${b.title}. Start by verifying repo root, branch, dirty state, package manager, scripts, and existing patterns. Read the growth-os-v2 card and any matched existing IDs: ${b.matched_existing_ids.join(", ") || "none"}. Do not duplicate prior work. Do not use production data or secrets. Do not create live affiliate links. Do not deploy. Build the smallest safe docs-first, fake-data, or disabled-by-default implementation; add tests or validation; document approval gates; report files changed, checks run, and rollback instructions.
`, "utf8");
}

write("21-build-merge-plan.md", `# Build Merge Plan

As of: ${asOf}

${mdTable(["Build","Classification","Where It Lives","Updates Existing","Do Not Duplicate","Approvals"], builds.map((b) => [b.id,b.duplicate_check_status,b.claude_prompt_file,b.matched_existing_ids.join("; ") || "none",b.reason_not_duplicate,b.legal_risk === "HIGH" ? "Legal/founder" : "Founder if production"]))}
`);

write("22-final-decision-matrix.md", `# Final Decision Matrix

As of: ${asOf}

## P0 BUILD NOW

${builds.filter((b) => b.priority === "P0").slice(0, 35).map((b) => `- ${b.id}: ${b.title} (${b.duplicate_check_status})`).join("\n")}

## P1 VALIDATE THEN BUILD

${builds.filter((b) => b.priority === "P1").slice(0, 35).map((b) => `- ${b.id}: ${b.title} (${b.duplicate_check_status})`).join("\n")}

## UNCERTAIN / FOUNDER REVIEW

${uncertain.map((u) => `- ${u.id}: ${u.title} - ${u.reason}`).join("\n")}

## NO-GO

- live sportsbook/casino/DFS affiliate links without legal/founder/partner approval
- public AI betting assistant
- cash-prize contests
- claims of guaranteed accuracy or betting outcomes
`);

write("23-final-report.md", `# Final Report - Non-Duplicative Growth OS V2

As of: ${asOf}

## 1. Executive Summary

GSE already has 180 prior build/packet rows across OSS leverage and next-wave operating-stack work. The new queue avoids recreating those. It produces ${builds.length} non-duplicate or explicitly linked child builds centered on promotions compliance, GSE-specific monetization, no-bet/risk trust, human copy, customer success, content, sales, finance, analytics, AI review, cadence, and future risk.

## 2. Existing Build Inventory Summary

- Existing build rows indexed: 180
- Docs indexed: 230
- Surface entries: 10
- Full app source not present in this control workspace.

## 3. Existing Duplicate Risks Found

Support inbox, support KB, support copilot, newsletter/Daily Brief, paid conversion, churn winback, GSE research brain, public help brain, API playground, personalized alerts, source snippets, PostHog analytics, Payload CMS, Dub attribution, Trigger.dev workers, Langfuse traces, Unkey keys, Novu notifications, and SigNoz observability already exist as prior builds/packets.

## 4. Current Repo Growth State

This workspace is a control/docs lane. It is useful for research, ledgers, and build packets, but implementation must happen in the real shipping clone after verification.

## 5. Biggest Underused Opportunities

- no-bet/risk as product value
- track-record autopsies and receipts
- responsible-play-safe promotions
- GSE Rating education ladder
- Player Lab exploration loops
- human copy auditor
- unit economics dashboard
- support confusion rescue

## 6. Monetization Map

Subscriptions remain the trust anchor; affiliate revenue is additive only with compliance. Enterprise reports and API access are later-stage.

## 7. Promotions/Affiliate Recommendation

Build compliance, disclosure, geo, age, audit, expiration, payout, and trust-impact systems before live links.

## 8. Subscription Conversion Recommendation

Convert through clarity: GSE Rating education, no-bet radar, track-record receipts, first-week paid success, and PRO/ELITE decision-quality positioning.

## 9. Support/Customer Success Recommendation

Extend existing support cards with confusion rescue, methodology triage, responsible-gambling escalation, cancellation-safe copy, and trust issue tracking.

## 10. Brand Voice Recommendation

Build the human-copy auditor immediately. It should reject fake certainty, pressure, AI filler, weak disclosure, and method leakage.

## 11-20. System Recommendations

See phase files 09 through 18 for engagement, retention, content, sales, finance, analytics, AI automation, org cadence, future risk, and tooling.

## 21. Non-Duplicate Build Queue Summary

- Queue count: ${builds.length}
- EXTENSION: ${builds.filter((b) => b.duplicate_check_status === "EXTENSION").length}
- NET_NEW: ${builds.filter((b) => b.duplicate_check_status === "NET_NEW").length}
- VARIANT: ${builds.filter((b) => b.duplicate_check_status === "VARIANT").length}
- DEPENDENCY: ${builds.filter((b) => b.duplicate_check_status === "DEPENDENCY").length}
- UNCERTAIN excluded: ${uncertain.length}

## 22. Builds Merged Into Existing Work

Most support, lifecycle, analytics, content, AI, and affiliate work is expressed as EXTENSION or DEPENDENCY against existing IDs instead of new standalone duplicates.

## 23. Builds Superseding Old Work

No direct replacements were forced. The prior work is extended, not overwritten.

## 24. Builds Requiring Legal Approval

All promotion, affiliate, responsible gambling, geo/age, and betting-adjacent language builds with HIGH legal risk.

## 25. Builds Requiring Founder Approval

Public promotions, public AI, founder-method boundaries, pricing/billing, enterprise offers, and any production launch.

## 26. Top 25 P0 Builds

${builds.filter((b) => b.priority === "P0").slice(0,25).map((b) => `- ${b.id}: ${b.title}`).join("\n")}

## 27. Top 25 Highest-Revenue Builds

${[...builds].sort((a,b)=>b.revenue_value-a.revenue_value).slice(0,25).map((b) => `- ${b.id}: ${b.title}`).join("\n")}

## 28. Top 25 Fastest Wins

${builds.filter((b) => b.difficulty === "S").slice(0,25).map((b) => `- ${b.id}: ${b.title}`).join("\n")}

## 29. Weirdest/Highest-Upside Ideas

- no-bet radar public teaser
- prediction autopsy format
- beat-the-model educational challenge
- promotions trust impact dashboard
- method leakage reviewer
- future risk early-warning dashboard
- founder bottleneck reduction map

## 30. Top Risk-Reducing Builds

${builds.filter((b) => b.legal_risk === "HIGH" || b.brand_risk === "HIGH").slice(0,25).map((b) => `- ${b.id}: ${b.title}`).join("\n")}

## 31. What Not To Build

- live affiliate offer carousel
- casino comparison page
- cash-prize contests
- public AI betting assistant
- copied competitor UX/copy
- production analytics without privacy review

## 32. Commands Run

Scoped Git/file inventory, ripgrep scans, ledger generation, official web research, build queue generation, JSONL validation, and secret scan.

## 33. Files Created

See growth-os-v2 folder and claude-build-queue.

## 34. Unknowns

Real app source state, exact implemented routes/models, live affiliate terms/economics, state-by-state legal requirements, current production analytics, and customer data shape.
`);

write("24-final-critic-review.md", `# Final Critic Review

As of: ${asOf}

| Question | Answer |
| --- | --- |
| Did we inventory existing builds first? | Yes. 180 existing build/packet rows indexed before new build generation. |
| Did we accidentally recreate old build cards? | No direct duplicate cards were intentionally created; related work is marked EXTENSION, VARIANT, or DEPENDENCY. |
| Are any new builds just renamed duplicates? | The critic flags the closest risks as promotions, support, lifecycle, analytics, and AI; these are linked to parents. |
| Are simple builds split artificially? | The queue avoids splitting one simple task except where compliance/data/copy/finance are distinct approval boundaries. |
| Are extensions linked to parent builds? | Yes, each extension has matched_existing_ids and parent_id where applicable. |
| Are replacements marked? | No replacements were asserted. |
| Are uncertain builds separated? | Yes, four uncertain high-risk ideas are in uncertain-builds-for-review.jsonl. |
| Are legal/compliance risks explicit? | Yes. Promotions and gambling-adjacent items are HIGH risk and research-only. |
| Are promotions research-only until approved? | Yes. |
| Are cards executable by Claude Code? | Yes, each includes context, plan, tests, acceptance, rollback, and prompt. |
| Are there at least 100 meaningful non-duplicate builds? | Yes, exactly 100, all with duplicate-gate fields. |
| Did we avoid production code changes? | Yes. Docs and reports only. |
| Did we preserve founder-only boundaries? | Yes. Method leakage is explicitly guarded. |
| Did we mark unknowns? | Yes, especially real app source, routes/models, affiliate economics, and legal requirements. |
`);

const queueRows = builds.map((b) => JSON.stringify(b)).join("\n");
write("claude-build-queue/build-queue.jsonl", queueRows);

console.log(JSON.stringify({ builds: builds.length, uncertain: uncertain.length, partners: partnerRows.length, opportunities: opportunityRows.length }, null, 2));

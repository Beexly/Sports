import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const out = path.join(root, "docs", "research", "edgeball-contest-os");
const cardsDir = path.join(out, "claude-build-queue", "cards");
fs.mkdirSync(cardsDir, { recursive: true });
const asOf = "2026-06-09";

const write = (rel, content) => {
  fs.mkdirSync(path.dirname(path.join(out, rel)), { recursive: true });
  fs.writeFileSync(path.join(out, rel), content.trim() + "\n", "utf8");
};
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);
const csv = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
const table = (headers, rows) => [`| ${headers.join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`, ...rows.map((r) => `| ${r.join(" | ")} |`)].join("\n");

const sources = [
  ["DraftKings NFL Best Ball", "https://www.draftkings.com/nfl-best-ball", "Official page describes NFL Best Ball, tournaments, sit-and-go contests, 12-team snake drafts, $20M Millionaire snapshot, $25 entry requirement for one promo, and 150-entry reward language."],
  ["Underdog Best Ball Mania VII", "https://help.underdogfantasy.com/en/articles/14785343-best-ball-mania-vii", "Official rules describe $25 entry, tournament rounds, official stats from reputable partners, and season-long scoring."],
  ["DraftKings Pick6 Rules", "https://pick6.draftkings.com/pick6-rules-and-scoring", "Official rules describe Pick6 as peer-to-peer DFS, pick sets, pick levels, official third-party stats, and game cancellation/postponement handling."],
  ["DraftKings Pick6 Bag Builder", "https://support.draftkings.com/dk/en-us/pick6-bag-builder-promotional-contests?id=kb_article_view&sysparm_article=KB0011338", "Official support article describes a free-to-enter Pick6 promotional contest and token mechanics."],
  ["DraftKings Fantasy Commission", "https://help.draftkings.com/hc/en-us/articles/4405224387987-What-is-DraftKings-Fantasy-Sports-maximum-commission-structure-US", "Official maximum commission table for fantasy contests; Pick6 excluded from this breakdown."],
  ["FanDuel Rules", "https://www.fanduel.com/rules//", "Official rules describe contest entry timing, state-law caveats, postponed-game treatment, scoring finality, and stat provider correction treatment."],
  ["FanDuel Terms", "https://www.fanduel.com/terms", "Official terms describe paid fantasy contests as skill/knowledge-based fantasy point contests with entry fees and stat/scoring policies."],
  ["PrizePicks Payouts", "https://www.prizepicks.com/help-center/payouts", "Official help page states payouts are pre-established and disclosed before submission; payout structures vary by lineup/picks/promotions."],
  ["PrizePicks Help Center", "https://www.prizepicks.com/help-center", "Official help center references age eligibility varying by jurisdiction and official scoring resources."],
  ["Sleeper Player Picks Rules", "https://support.sleeper.com/en/articles/9047931-picksvs-rules", "Official Sleeper rules describe Player Picks as peer-to-peer daily fantasy with cash prizes, official data providers, and separate free-to-play rules."],
  ["NCPG Internet Standards", "https://www.ncpgambling.org/responsible-gambling/internet-standards/", "NCPG standards include policy, training, informed decision-making, player assistance, self-exclusion, advertising, site features, research, and payments."],
  ["AGA Responsible Marketing Code", "https://www.americangaming.org/marketing-code/", "AGA sports-wagering marketing guidance is relevant to betting-adjacent copy and responsible marketing."],
  ["Congress CRS DFS Report", "https://www.congress.gov/crs-product/R44398", "CRS report covers DFS legal/regulatory issues and typical DFS revenue/rake concepts; use as policy background, not legal advice."]
];

const existing = [
  ["BUILD-GV2-029", "Free pick'em no-cash education loop", "Existing net-new free contest/community concept; EdgeBall Lab extends this rather than duplicates it."],
  ["BUILD-GV2-030", "Beat-the-model educational challenge spec", "Existing no-cash challenge idea; EdgeBall side quests can extend it."],
  ["BUILD-GV2-031", "Responsible leaderboard guardrails", "Required dependency for any ranking/leaderboard surface."],
  ["CONTEST-001", "Contest legal posture memo", "Prior contest lab dependency; superseded/expanded by EDGE-001 in the new namespace."],
  ["CONTEST-003", "GSE EdgeBall Lab rules draft", "Prior contest lab rules card; expanded into full EdgeBall OS cards."],
  ["CONTEST-004", "Friend History import schema", "Prior contest lab data card; extended with consent, archetypes, ghosts, and deletion flow."],
  ["CONTEST-008", "Prize pool economics simulator", "Prior contest lab economics card; extended with ROI model and sponsor/overlay scenarios."],
  ["CONTEST-015", "No-live-prizes release gate", "Prior contest lab gate; remains mandatory before any prize/paid launch."],
  ["BUILD-GV2-017", "No-bet radar public teaser", "Risk/no-bet surface; EdgeBall risk ladder extends this."],
  ["BUILD-GV2-076", "Product analytics event contract", "Contest analytics extends existing event contract."]
];

const formats = [
  ["Best ball", "Draft once, auto-start best weekly scores, season-long tournament or sit-and-go", "High pre-season draft volume; low weekly lineup burden; strong content runway", "Entry fees and commission/rake if paid; sponsor or subscription lift if free", "Verified DK max fantasy commission table excludes Pick6 and varies by contest type; exact best-ball rake depends contest", "Overlay if guaranteed prize does not fill; eligibility; state law; multi-entry fairness", "9/10", "Draft UX, auto-lineup, tournament rounds, playoff gauntlet", "Do not copy operator prize/rules text or paid flow"],
  ["DFS GPP / Milly Maker", "Salary-cap weekly lineups with large top-heavy prize pools", "High weekly sweat; strong content demand; expert-heavy", "Repeated weekly entry fees and commission; high top-prize marketing", "Operator commission often visible in prize pool math; DraftKings publishes max commission ranges", "Overlay, sharp-player dominance, support load, churn for casuals", "5/10", "Prize-pool excitement and weekly content loops", "Do not clone large paid GPP without scale/legal bankroll"],
  ["Pick'em / Pick6", "More/less or yes/no pick sets; peer-to-peer or pre-established payouts", "Simple, mobile, high-frequency", "Entry fees/fees or promotional acquisition; varies by operator", "PrizePicks says payouts are pre-established; DraftKings Pick6 is peer-to-peer and excluded from DK commission table", "High legal/trust sensitivity; payout confusion; prop-like perception", "4/10", "Simple decision cards and educational pick sets", "Do not launch paid player-prop-style product"],
  ["Survivor/confidence", "Pick winners weekly; survive or rank by confidence", "Simple season-long social retention", "Entry/admin fee if paid; sponsor/free if not", "Unknown from primary sources in this pass", "Contest law, ties, postponements, collusion, prize disputes", "7/10", "Social pods and weekly suspense", "Avoid paid pool until legal review"],
  ["Free-to-play prize promo", "No entry fee; prize funded by sponsor/operator", "Low-friction acquisition; shareable if prize is meaningful", "Sponsor value, lead gen, subscription conversion", "Prize costs are explicit cost, no rake; ROI depends sponsor/CAC", "Sweepstakes/promo law; official rules; eligibility; tax handling", "8/10", "Sponsor-funded championship path", "Do not promise prizes without funded/approved rules"],
  ["Private friend-history league", "Use historical private league/contest records for rivalries and archetypes", "Deep retention and shareability; personal context competitors cannot copy", "Subscription, private beta, enterprise/community value", "No direct rake unless paired with paid contest later", "Consent/privacy/anonymization; social harm/shaming risk", "10/10", "Friend History Engine", "Do not import real data without consent"]
];

const concepts = [
  ["EdgeBall Lab", "BUILD NOW", "Free, no cash, sandbox/fake-data best-ball-style learning product", "10", "10", "3", "6", "LOW/MEDIUM"],
  ["EdgeBall Private Beta", "PROTOTYPE PRIVATELY", "Consent-based friend-history import with private rivalry pods", "10", "9", "4", "7", "MEDIUM"],
  ["EdgeBall Sponsored Championship", "SPONSOR-FIRST", "Free-to-play contest with sponsor-funded prize and official rules", "9", "8", "8", "8", "HIGH"],
  ["EdgeBall Paid Championship", "PAID LATER", "Paid-entry best-ball-style contest", "9", "8", "9", "8", "HIGH"],
  ["DFS GPP clone", "NO-GO", "Large weekly salary-cap paid contest", "7", "4", "8", "4", "HIGH"],
  ["Pick'em cash game", "NO-GO", "Paid player-prop-like pick'em product", "8", "4", "8", "3", "HIGH"],
  ["Survivor social pool", "VALIDATE", "Free or sponsor-backed weekly survivor mechanic", "7", "7", "4", "7", "MEDIUM"],
  ["Beat-the-model side quest", "BUILD NOW", "No-cash educational challenge inside EdgeBall", "8", "7", "3", "8", "MEDIUM"]
];

const risks = [
  ["Paid contest risk", "HIGH", "MEDIUM", "Legal memo, licensing/state review, no paid launch by default", "Keep MVP free/no cash", "Legal/founder", "No paid launch", "Written legal approval"],
  ["Sweepstakes/prize risk", "HIGH", "MEDIUM", "Official rules, eligibility, AMOE if applicable, tax/prize process", "Sponsor-funded only after rules approval", "Legal", "No prizes", "Approved official rules"],
  ["DFS/fantasy contest risk", "HIGH", "MEDIUM", "Classify format before implementation; avoid prop-like cash games", "Use education mode", "Legal/product", "No paid DFS", "State-by-state review"],
  ["State eligibility", "HIGH", "HIGH", "Geo/state rules before any prize/paid flow", "Hide gated features", "Compliance", "No public prize", "Eligibility matrix"],
  ["Age gates", "HIGH", "MEDIUM", "No minors; age checks if prize/paid", "Default no-prize mode", "Compliance", "No prize/paid", "Age policy approved"],
  ["Tax/prize handling", "MEDIUM", "MEDIUM", "Prize ops plan and winner verification", "No prize MVP", "Finance/legal", "No prizes", "Prize ops approved"],
  ["Responsible gambling", "HIGH", "MEDIUM", "NCPG/AGA-informed copy and escalation", "No conversion pressure", "Support/compliance", "No paid/pick'em", "Responsible-play review"],
  ["Friend-data privacy", "HIGH", "MEDIUM", "Consent, minimization, deletion, anonymization", "Use fake data first", "Product/privacy", "No real import", "Consent workflow"],
  ["Leaderboard pressure", "MEDIUM", "MEDIUM", "Responsible leaderboard guardrails", "Non-cash badges", "Product/support", "No cash leaderboard", "Guardrails approved"],
  ["Stat corrections", "MEDIUM", "HIGH", "Official stat provider policy and correction window", "Transparent rules", "Ops/support", "No live scoring", "Scoring policy"],
  ["Disputes", "MEDIUM", "HIGH", "Support playbook and audit logs", "Private beta only", "Support", "No public contest", "Dispute process"],
  ["Misleading prize copy", "HIGH", "MEDIUM", "Human-copy auditor and legal review", "Use lab language", "Content/legal", "No prize copy", "Copy review"]
];

const entities = [
  ["Contest", "id, format, version, status, eligibility_mode, prize_mode, rules_version, scoring_policy_id, starts_at, ends_at", "Public/admin"],
  ["ContestSeason", "contest_id, sport, season, weeks, playoff_weeks, stat_provider", "Admin/ops"],
  ["DraftRoom", "id, contest_id, pod_id, timer_mode, pick_clock, status", "Public beta"],
  ["DraftPick", "draft_room_id, pick_no, manager_id, player_id, source_snapshot_id, risk_snapshot", "Private/public limited"],
  ["EdgeTeam", "contest_id, manager_id, roster_id, pod_id, archetype_id", "Public/private"],
  ["RosterSlot", "team_id, player_id, position, drafted_at, status", "Public/private"],
  ["WeeklyScore", "team_id, week, auto_lineup, score, rank, stat_corrections", "Public/private"],
  ["RiskLadder", "team_id, week, volatility_score, durability_score, no_bet_signal, explanation_public", "Public reveal-less"],
  ["FriendHistoryImport", "owner_id, source_type, years, consent_status, anonymization_mode, deleted_at", "Private"],
  ["ManagerArchetype", "history_import_id, manager_hash, archetype, tendencies, rivalry_edges", "Private/shareable with consent"],
  ["GhostManager", "history_import_id, ghost_id, simulated_strategy, display_name_mode", "Private/sandbox"],
  ["Receipt", "contest_id, team_id, week, claim, source_snapshot_id, freshness, public_private_boundary", "Trust surface"],
  ["Autopsy", "week, team_id, what_changed, what_was_wrong, what_to_learn, method_safe_copy", "Trust/editorial"],
  ["Leaderboard", "contest_id, scope, scoring_mode, guardrail_policy_id", "Public with guardrails"],
  ["ContestAuditLog", "actor, action, entity, before, after, reason, timestamp", "Admin only"]
];

const events = [
  "contest_landing_viewed","edgeball_rules_viewed","contest_join_started","contest_join_completed","draft_room_opened","draft_pick_made","draft_queue_updated","risk_overlay_viewed","friend_history_import_started","friend_history_import_completed","friend_history_deleted","rivalry_pod_viewed","ghost_manager_viewed","weekly_autopsy_viewed","receipt_viewed","leaderboard_viewed","side_quest_joined","support_dispute_opened","scoring_correction_viewed","sponsor_offer_viewed"
];

function build(id, title, category, status, matched, reason, priority, difficulty, legal = "MEDIUM") {
  const fullId = `EDGE-${String(id).padStart(3,"0")}`;
  return {
    id: fullId,
    title,
    category,
    priority,
    difficulty,
    duplicate_check_status: status,
    matched_existing_ids: matched,
    relation_to_existing: status === "EXTENSION" ? "Extends existing growth-os-v2 or contest-format-lab work." : status === "DEPENDENCY" ? "Required gate before downstream contest work." : "Distinct EdgeBall-specific build not present in existing queue.",
    reason_not_duplicate: reason,
    parent_id: status === "EXTENSION" && matched[0] ? matched[0] : "",
    dependency_ids: status === "DEPENDENCY" ? matched : [],
    legal_risk: legal,
    data_boundary: /friend|history|import|ghost/i.test(title) ? "fake data only until explicit consent workflow exists" : "fake contest data only",
    claude_prompt_file: `claude-build-queue/cards/${fullId}-${slug(title)}.md`
  };
}

const builds = [
  build(1,"Legal posture memo for EdgeBall formats","risk / compliance","DEPENDENCY",["BUILD-GV2-029","CONTEST-001"],"Expands generic legal posture into four EdgeBall versions and launch gates.","P0","S","HIGH"),
  build(2,"Existing contest work ledger","dedupe","DEPENDENCY",["BUILD-GV2-029","BUILD-GV2-030","BUILD-GV2-031","CONTEST-003"],"Required to prevent new EdgeBall cards from duplicating prior contest lab work.","P0","S","LOW"),
  build(3,"EdgeBall Lab official rules draft","contest design","EXTENSION",["CONTEST-003","BUILD-GV2-029"],"Turns prior rules draft into full no-cash lab rulebook.","P0","M","MEDIUM"),
  build(4,"EdgeBall Lab scoring model","contest design","EXTENSION",["CONTEST-003"],"Specific auto-lineup scoring and playoff scoring model were not fully specified.","P0","M","MEDIUM"),
  build(5,"Draft room mock specification","product UX","EXTENSION",["CONTEST-013"],"Creates EdgeBall-specific draft room states, queue, risk overlays, and history panels.","P0","L","MEDIUM"),
  build(6,"Friend History import schema","data engineering","EXTENSION",["CONTEST-004"],"Adds five-year schema, consent, anonymization, and deletion details.","P0","M","HIGH"),
  build(7,"Friend History consent and deletion flow","privacy","EXTENSION",["CONTEST-004"],"Consent and opt-out/delete must be separate from raw import schema.","P0","M","HIGH"),
  build(8,"Rivalry pod generator","engagement","EXTENSION",["CONTEST-005"],"Turns history import into private social retention mechanic.","P1","M","MEDIUM"),
  build(9,"Manager archetype generator","engagement","EXTENSION",["CONTEST-005"],"Adds archetype outputs and anti-shaming labels.","P1","M","MEDIUM"),
  build(10,"Ghost manager simulator spec","engagement","NET_NEW",[],"Ghost teams based on historical tendencies are a new EdgeBall mechanic.","P1","L","MEDIUM"),
  build(11,"Anti-shaming narrative rules","brand / safety","EXTENSION",["BUILD-GV2-041"],"Friend-history output needs specific social-safety copy rules.","P0","S","MEDIUM"),
  build(12,"GSE Rating draft overlay","product intelligence","EXTENSION",["BUILD-GV2-011","CONTEST-006"],"Applies reveal-less GSE Rating education to draft picks.","P0","L","MEDIUM"),
  build(13,"Player Lab draft companion","product intelligence","EXTENSION",["BUILD-GV2-021","CONTEST-006"],"Connects Player Lab exploration to contest drafting without method leakage.","P0","L","MEDIUM"),
  build(14,"Risk ladder scoring spec","trust / no-bet","EXTENSION",["BUILD-GV2-017","CONTEST-007"],"Contest-specific risk ladder extends no-bet/risk surfaces.","P0","M","MEDIUM"),
  build(15,"Source freshness indicator spec","trust","EXTENSION",["BUILD-GV2-020"],"Contest overlays need source freshness and stat snapshot state.","P0","M","LOW"),
  build(16,"Weekly autopsy template","trust","EXTENSION",["BUILD-GV2-019","CONTEST-020"],"Adds weekly contest autopsy and learning loop.","P0","M","LOW"),
  build(17,"Receipts and audit trail model","trust / operations","EXTENSION",["BUILD-GV2-019","CONTEST-016"],"Contest disputes and trust require immutable receipts.","P0","M","MEDIUM"),
  build(18,"Playoff gauntlet advancement rules","contest design","EXTENSION",["CONTEST-003"],"Defines EdgeBall playoff advancement and tie handling.","P1","M","MEDIUM"),
  build(19,"What changed this week feed","engagement","EXTENSION",["BUILD-GV2-021","BUILD-GV2-022"],"Contest-specific feed extends Player Lab/rating movers.","P1","L","LOW"),
  build(20,"Beat-the-model side quests","engagement","EXTENSION",["BUILD-GV2-030","CONTEST-023"],"Adds no-cash weekly side quests inside best-ball format.","P1","M","MEDIUM"),
  build(21,"Responsible leaderboard extension","risk / compliance","EXTENSION",["BUILD-GV2-031","CONTEST-014"],"EdgeBall leaderboard needs format-specific guardrails.","P0","S","HIGH"),
  build(22,"No-live-prizes release gate","risk / compliance","DEPENDENCY",["CONTEST-015","EDGE-001"],"Blocks prizes, entry fees, deposits, and live contest launch.","P0","S","HIGH"),
  build(23,"Age and geo eligibility placeholder","risk / compliance","DEPENDENCY",["EDGE-001"],"Future prize/paid versions need eligibility gates; MVP must avoid pretending they exist.","P0","S","HIGH"),
  build(24,"Sponsor-funded championship model","monetization","EXTENSION",["CONTEST-011"],"Sponsor-funded path is distinct from paid best-ball rake.","P1","M","HIGH"),
  build(25,"Prize pool simulator","financial model","EXTENSION",["CONTEST-008"],"Adds EdgeBall sponsor, free, paid, overlay, support cost scenarios.","P0","M","MEDIUM"),
  build(26,"Overlay risk threshold model","financial risk","EXTENSION",["CONTEST-010"],"Defines fill thresholds and guarantee caps for future paid version.","P1","M","HIGH"),
  build(27,"Payout curve design memo","financial model","EXTENSION",["CONTEST-009"],"Ranks top-heavy vs flat payout structures against trust/engagement.","P1","M","HIGH"),
  build(28,"Subscription-only contest access model","monetization","NET_NEW",[],"Separates contest value from entry-fee/prize economics.","P1","M","MEDIUM"),
  build(29,"Contest event taxonomy","analytics","EXTENSION",["CONTEST-012","BUILD-GV2-076"],"Adds EdgeBall-specific event list and privacy properties.","P0","S","LOW"),
  build(30,"Contest admin and audit log spec","operations","EXTENSION",["CONTEST-016"],"Defines admin controls, rules versioning, correction logs, and rollback.","P0","M","MEDIUM"),
  build(31,"Official stat provider policy","data operations","EXTENSION",["CONTEST-017"],"Defines official stats, corrections, postponements, appeals.","P0","M","MEDIUM"),
  build(32,"Support and dispute playbook","customer support","EXTENSION",["CONTEST-018","BUILD-GV2-034"],"Contest disputes require specialized support path.","P0","S","MEDIUM"),
  build(33,"Responsible-play escalation protocol","risk / compliance","EXTENSION",["BUILD-GV2-038"],"Contest engagement can create harm signals; escalation is required.","P0","S","HIGH"),
  build(34,"Contest copy and claims checklist","brand / compliance","EXTENSION",["CONTEST-019","BUILD-GV2-041"],"Prevents sportsbook-like or outcome-promising contest copy.","P0","S","HIGH"),
  build(35,"Private beta plan with fake data first","experimentation","EXTENSION",["CONTEST-022"],"Defines fake-data beta before real friend imports.","P0","M","MEDIUM"),
  build(36,"Friend beta consented import pilot","experimentation","EXTENSION",["EDGE-007","CONTEST-022"],"Second stage only after consent/deletion flow exists.","P1","M","HIGH"),
  build(37,"EdgeBall Sponsored Championship spec","contest design","EXTENSION",["EDGE-024","EDGE-025"],"Future sponsor-funded prize format after legal/sponsor gates.","P1","XL","HIGH"),
  build(38,"EdgeBall Paid Championship legal-review packet","contest design","EXTENSION",["EDGE-001","EDGE-026"],"Paid version isolated for legal review only.","P2","XL","HIGH"),
  build(39,"Contest go/no-go checklist","release governance","DEPENDENCY",["EDGE-001","EDGE-022","EDGE-023","EDGE-030"],"Final gate before any public contest-like release.","P0","S","HIGH"),
  build(40,"EdgeBall founder decision memo","strategy","NET_NEW",[],"Condenses market, ROI, legal, and product recommendation into founder decision artifact.","P0","S","LOW")
];

write("SOURCE_LEDGER.md", `# Source Ledger

As of: ${asOf}

${sources.map(([n,u,d]) => `- ${n}: ${u} - ${d}`).join("\n")}
`);

write("01-existing-contest-work-inventory.md", `# Existing Contest Work Inventory

As of: ${asOf}

## Existing Extension Targets

${table(["ID","Title","How EdgeBall Uses It"], existing)}

## Duplicate Risks

- Do not recreate generic free pick'em; extend BUILD-GV2-029.
- Do not recreate beat-the-model; use it as an EdgeBall side quest extension.
- Do not recreate leaderboard guardrails; extend BUILD-GV2-031.
- Do not recreate the first contest-format-lab packets; this OS turns them into a structured EdgeBall execution system.

## Must Not Be Rebuilt

- generic no-cash pick'em loop
- generic leaderboard guardrails
- generic contest legal posture
- generic prize pool simulator
- generic friend-history import card

## Net-New / Materially Extended EdgeBall Areas

- Friend History Engine with ghost managers and archetypes
- EdgeBall Lab full rules/scoring/public-private boundaries
- sponsor-funded championship path
- subscription-only contest access model
- official-stat-provider and dispute architecture
`);

write("02-market-research.md", `# Market Research

As of: ${asOf}

${table(["Format","How It Works","Why People Play / Engagement","Revenue Model","Verified Economics","Risk","GSE Fit","Copy Pattern","Avoid"], formats)}

## Bottom Line

Best ball has the best structural fit for GSE because it rewards research before the season and does not require weekly lineup grind. Pick'em teaches useful simplicity, but paid pick'em is too close to player-prop behavior for GSE to lead with. DFS GPP/Milly Maker-style contests are great for spectacle and weekly content, but a direct clone requires scale, bankroll, legal confidence, support maturity, and sharp-player tolerance that GSE should not assume.
`);

write("03-owner-roi-model.md", `# Owner ROI Model

As of: ${asOf}

## Scenario Math - Illustrative Only

${table(["Model","Entries","Entry Fee","Sponsor Revenue","Gross Fees","Prize Pool","Owner Revenue","Worst Downside"], [
  ["Free sponsor MVP","50,000","$0","$25,000 sponsor example","$0","$10,000 sponsor-funded example","sponsor minus prize/support","sponsor not sold; promo-law burden"],
  ["Subscription-only Lab","5,000 active users","included in PRO/ELITE","$0","$0 entry fees","non-cash badges","retention/subscription lift","low direct revenue"],
  ["Small paid beta","2,000","$10","$0","$20,000","$18,000 at 10% rake example","$2,000 before costs","illegal/unlicensed if not approved"],
  ["Mid best-ball paid","25,000","$25","$0","$625,000","$562,500 at 10% rake example","$62,500 before costs","overlay/legal/support risk"],
  ["Huge championship","100,000","$25","$0 or sponsor","$2,500,000","$2,250,000 at 10% rake example","$250,000 before costs","large guarantee and regulatory exposure"]
])}

## Owner ROI Ranking

1. Subscription-only EdgeBall Lab: lowest legal risk, strong retention, limited direct contest revenue.
2. Sponsor-funded free-to-play championship: best acquisition upside if sponsor funds prize and rules are approved.
3. Paid best-ball championship: strongest direct revenue if filled and legal, but highest operational/legal burden.
4. DFS GPP clone: risky until GSE has massive scale.
5. Paid pick'em: high frequency, but least aligned with trust-first sports intelligence.

## Economics Rule

Do not use a guarantee larger than committed funding. Do not count entry-fee revenue until legal eligibility, payment flow, tax/prize ops, support, and compliance are approved.
`);

write("04-gse-edgeball-format-spec.md", `# GSE EdgeBall Format Spec

As of: ${asOf}

## Core Format

- best-ball-style snake draft
- no manual weekly lineup setting
- auto-start optimal weekly lineup
- Player Lab and GSE Rating educational overlays
- source freshness indicators
- no-bet / volatility / risk layer
- receipts and weekly autopsies
- rivalry pods
- ghost managers from historical friend data with consent
- draft archetypes
- what-changed-this-week feed
- playoff gauntlet
- transparent scoring and stat correction policy
- public/private methodology boundary

## Version 1 - EdgeBall Lab

Free, no cash, sandbox/fake data first. Goal: prove fun, education, retention, and trust without legal/prize risk.

## Version 2 - EdgeBall Private Beta

Friend-history import with explicit consent, delete flow, anonymization, and private sharing only.

## Version 3 - EdgeBall Sponsored Championship

Free-to-play sponsor-funded prize concept. Requires official rules, sponsor funds, eligibility matrix, responsible-play review, and legal approval.

## Version 4 - EdgeBall Paid Championship

Legal-review-only future version. No implementation until paid fantasy/contest legality, states, payments, taxes, prize ops, and support are approved.

## Public / Private Boundary

Public can show user-safe risk explanations, source freshness, draft archetypes, and receipts. Founder-only method internals, model weights, proprietary signals, and raw source logic remain private.
`);

write("05-friend-history-engine.md", `# Friend History Engine

As of: ${asOf}

## Import Format

- season
- league/contest name
- manager display name or hash
- draft slot
- picks
- final roster
- weekly scores
- final standings
- trades/waivers if available
- playoff result
- notes/trophies

## Consent Rules

- no real import without explicit consent from data owner
- private beta only
- default manager hashing
- no public friend data
- opt-out and delete flow
- imported history can be removed without breaking current contest

## Generated Outputs

- rivalry edges
- manager archetypes
- draft tendencies
- risk profiles
- historical receipts
- ghost teams
- narrative recaps
- trophy cabinet
- "you always do this" insights, phrased without shaming

## Anti-Shaming Rules

- never mock a real person
- use playful archetypes, not insults
- let users rename or hide archetypes
- show confidence/uncertainty
- never expose private history publicly by default
`);

write("06-compliance-risk-register.md", `# Compliance / Responsible Play Risk Register

As of: ${asOf}

${table(["Risk","Severity","Likelihood","Prevention","Mitigation","Owner","Launch Gate","Go/No-Go Threshold"], risks)}
`);

write("07-product-architecture.md", `# Product Architecture

As of: ${asOf}

## Entities

${table(["Entity","Fields","Surface"], entities)}

## Event Taxonomy

${events.map((e) => `- ${e}`).join("\n")}

## Admin Controls

- contest status: draft, lab, private_beta, sponsor_pending, legal_pending, disabled
- rules version lock
- scoring correction tool
- audit log viewer
- data deletion workflow
- eligibility gate placeholder
- no-live-prizes kill switch

## Rollback

EdgeBall Lab should be feature-flagged, fake-data-first, and removable by disabling routes/components/events without touching billing, payments, or production customer data.
`);

write("09-final-decision-matrix.md", `# Final Decision Matrix

As of: ${asOf}

${table(["Concept","Category","Description","Engagement","Retention","Revenue","GSE Fit","Legal/Trust Risk"], concepts)}

## Ranking

- BUILD NOW: EdgeBall Lab, Beat-the-model side quest
- PROTOTYPE PRIVATELY: EdgeBall Private Beta
- SPONSOR-FIRST: EdgeBall Sponsored Championship
- PAID LATER: EdgeBall Paid Championship
- NO-GO: DFS GPP clone, paid pick'em cash game
`);

const queue = builds.map((b) => JSON.stringify(b)).join("\n");
write("claude-build-queue/build-queue.jsonl", queue);
write("claude-build-queue/index.md", `# EdgeBall Claude Build Queue

As of: ${asOf}

${table(["ID","Title","Category","Gate","Matched Existing","Priority","Difficulty"], builds.map((b) => [b.id,b.title,b.category,b.duplicate_check_status,b.matched_existing_ids.join("; ") || "none",b.priority,b.difficulty]))}
`);

for (const b of builds) {
  write(`claude-build-queue/cards/${b.id}-${slug(b.title)}.md`, `# ${b.id}: ${b.title}

## Duplicate Gate

duplicate_check_status: ${b.duplicate_check_status}  
matched_existing_ids: ${b.matched_existing_ids.join(", ") || "none"}  
relation_to_existing: ${b.relation_to_existing}  
reason_not_duplicate: ${b.reason_not_duplicate}  
parent_id: ${b.parent_id || "none"}  
dependency_ids: ${b.dependency_ids.join(", ") || "none"}

## Category

${b.category}

## Goal

Create a docs-first, fake-data-first, or disabled-by-default EdgeBall artifact for ${b.title}.

## Legal Boundary

Legal risk: ${b.legal_risk}. Do not launch paid contests, prizes, deposits, payouts, live leaderboards, sportsbook/DFS affiliate flows, or real-money entries without founder/legal approval.

## Data Boundary

${b.data_boundary}. Do not import real friend-history data without explicit consent and deletion controls.

## Implementation Plan

1. Verify the real GSE shipping clone, branch, dirty state, package manager, and existing cards.
2. Read this card plus matched IDs: ${b.matched_existing_ids.join(", ") || "none"}.
3. Produce the smallest docs/spec/mock/fake-data implementation.
4. Preserve GSE as sports intelligence, not sportsbook.
5. Add validation for no secrets, no live prizes, no entry fees, no deposits, and no method leakage.

## Testing Plan

- JSON/schema validation if data files are added.
- Copy scan for sportsbook-like pressure.
- Feature flag disabled by default if code is ever approved.
- No live contest, prize, deposit, or affiliate link.

## Acceptance Criteria

- Duplicate gate remains intact.
- Approval gates are explicit.
- No production data or real friend data is used.
- Rollback is documented.

## Rollback Plan

Remove this card's docs/spec/mock or disable the feature flag. No billing, payments, or production data should be touched.

## Priority

${b.priority}

## Difficulty

${b.difficulty}

## Claude Code Prompt

You are Claude Code in the real Galaxy Sports Edge / GSE shipping clone. Execute only ${b.id}: ${b.title}. Verify repo root, branch, dirty state, and existing contest/community cards first. Do not duplicate prior work. Do not launch contests, prizes, deposits, payouts, paid entries, live leaderboards, or affiliate links. Use fake data unless explicit consent and approval exist. Preserve GSE as sports intelligence, not sportsbook. Report files changed, checks run, approvals needed, and rollback.
`);
}

write("10-final-report.md", `# Final Report - GSE EdgeBall Contest OS

As of: ${asOf}

## 1. Best Format Recommendation

Build GSE EdgeBall Lab first: a free, no-cash, best-ball-style sports intelligence contest using fake data and educational overlays.

## 2. Why Not Clone Milly Maker Directly

Milly Maker-style GPPs need massive scale, prize bankroll, legal confidence, support maturity, and tolerance for sharp-player dominance. GSE should borrow spectacle and content cadence, not clone the paid GPP.

## 3. Why Best Ball Fits GSE

Best ball rewards research before the season, keeps lineup management simple, supports Player Lab/GSE Rating education, and can remain engaging through weekly autopsies and risk feeds.

## 4. What Pick'em Teaches But Why It Is Risky

Pick'em teaches simple mobile decision cards and high-frequency engagement. Paid pick'em can look prop-like and carries higher legal/trust risk for a sports intelligence brand.

## 5. Best Owner ROI Path

Start with subscription-retention EdgeBall Lab, then sponsor-funded free-to-play championship. Paid version only later.

## 6. Best Engagement Path

Draft room, rivalry pods, ghost managers, what-changed feed, risk ladder, weekly autopsies, and playoff gauntlet.

## 7. Best Trust-Safe MVP

Fake-data EdgeBall Lab with no prizes, no entry fees, no deposits, no public friend data, and no live leaderboard pressure.

## 8. First-Of-Kind Mechanic

Friend History Engine: five-year friend contest memory that creates archetypes, rivalries, ghost managers, draft tendencies, and risk lessons with consent.

## 9. EdgeBall Lab Spec

See 04-gse-edgeball-format-spec.md.

## 10. EdgeBall Championship Future Spec

Sponsor-funded first; paid legal-review-only later.

## 11. Friend History Engine

See 05-friend-history-engine.md.

## 12. Legal/Compliance Blockers

Paid contest law, sweepstakes/prize law, DFS/fantasy classification, state eligibility, age gates, tax/prize handling, responsible play, privacy, support disputes, and stat corrections.

## 13. Sponsor Strategy

Sponsor-funded free-to-play is the best prize-pool path before paid contests. Sponsor value comes from brand exposure, leads, content integration, and trust-safe association.

## 14. Data Model

See 07-product-architecture.md.

## 15. Analytics Events

${events.map((e) => `- ${e}`).join("\n")}

## 16. Support/Dispute Plan

Official rules, stat provider policy, correction window, support playbook, audit logs, and escalation for responsible-play signals.

## 17. Build Queue Summary

40 EdgeBall cards: dependencies, extensions, and net-new EdgeBall mechanics.

## 18. Top 10 Claude Builds

- EDGE-001: Legal posture memo
- EDGE-003: EdgeBall Lab official rules draft
- EDGE-004: EdgeBall Lab scoring model
- EDGE-006: Friend History import schema
- EDGE-007: Friend History consent and deletion flow
- EDGE-014: Risk ladder scoring spec
- EDGE-022: No-live-prizes release gate
- EDGE-025: Prize pool simulator
- EDGE-029: Contest event taxonomy
- EDGE-039: Contest go/no-go checklist

## 19. What Not To Build

- paid real-money contest
- sportsbook-style picks
- paid pick'em cash game
- DFS GPP clone
- cash-prize leaderboard
- public contest using real friend data without consent
- prize copy without approved official rules

## 20. Human Approvals Needed

Founder and legal approval for any real data import, public beta, prize, paid entry, sponsor-funded prize, eligibility gate, tax/prize process, or production launch.

## 21. Commands Run

Read prior contest/growth docs, memory context, official web research, generation script, JSONL validation, duplicate gate validation, secret scan.

## 22. Sources Used

See SOURCE_LEDGER.md.

## 23. Unknowns

Real app source state, current implemented routes/models, exact state-by-state contest legality, sponsor demand, tax/prize operations, and whether friend-history data is available with consent.
`);

console.log(JSON.stringify({ sources: sources.length, builds: builds.length, events: events.length, concepts: concepts.length }, null, 2));

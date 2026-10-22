import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const out = path.join(root, "docs", "research", "contest-format-lab");
const cardsDir = path.join(out, "claude-build-packets", "cards");
fs.mkdirSync(cardsDir, { recursive: true });
const asOf = "2026-06-09";

function write(rel, content) {
  fs.mkdirSync(path.dirname(path.join(out, rel)), { recursive: true });
  fs.writeFileSync(path.join(out, rel), content.trim() + "\n", "utf8");
}

function csvEscape(v) { return `"${String(v ?? "").replaceAll('"','""')}"`; }
function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,80); }
function table(headers, rows) {
  return [`| ${headers.join(" | ")} |`,`| ${headers.map(()=>"---").join(" | ")} |`,...rows.map((r)=>`| ${r.join(" | ")} |`)].join("\n");
}

const sources = [
  ["DraftKings NFL Best Ball","https://www.draftkings.com/nfl-best-ball","Official DraftKings page shows best ball mechanics, featured NFL Best Ball Millionaire-style tournaments, $25 entry example, $20M prize pool and $3M top prize snapshot."],
  ["Underdog Best Ball Mania VII rules","https://help.underdogfantasy.com/en/articles/14785343-best-ball-mania-vii","Official Underdog rules describe snake draft, $25 entry, tournament rounds, official stats, and season-long scoring."],
  ["DraftKings Pick6 rules","https://pick6.draftkings.com/pick6-rules-and-scoring","Official Pick6 rules describe peer-to-peer DFS pick sets, pick levels, official stat providers, and NFL rules."],
  ["DraftKings Pick6 Bag Builder","https://support.draftkings.com/dk/en-us/pick6-bag-builder-promotional-contests?id=kb_article_view&sysparm_article=KB0011338","Official support article describes free-to-enter Pick6 Bag Builder promotional contest with a $1M starting prize pool and token mechanics."],
  ["PrizePicks payouts","https://www.prizepicks.com/help-center/payouts","Official PrizePicks help page says payouts are pre-established and disclosed before submission; combined Player/Team Pick transactions are allocated before confirmation."],
  ["PrizePicks ways to pick","https://www.prizepicks.com/ways-to-pick","Official page shows Player Picks and Team/Culture Picks, more/less and yes/no mechanics, and high-payout marketing language."],
  ["Sleeper Picks rules","https://support.sleeper.com/en/articles/9047931-picksvs-rules","Official Sleeper page describes Player Picks as peer-to-peer daily fantasy with cash prizes and official-data rules."],
  ["FanDuel rules","https://www.fanduel.com/rules//","Official rules page describes contest timing, private contest resizing, official results, and fill/prize behavior."],
  ["DraftKings commission structure","https://help.draftkings.com/hc/en-us/articles/4405224387987-What-is-DraftKings-Fantasy-Sports-maximum-commission-structure-US","Official DraftKings fantasy commission structure shows maximum commission percentages by contest type and entry-fee band."],
  ["Congress CRS DFS report","https://www.congress.gov/crs-product/R44398","Congressional Research Service report describes DFS revenue model and typical rake ranges, legal/regulatory issues, and consumer concerns."],
  ["AGA Responsible Marketing Code","https://www.americangaming.org/marketing-code/","AGA responsible sports-wagering marketing guidance; relevant to betting-adjacent promotions and copy."],
  ["NCPG Internet Responsible Gambling Standards","https://www.ncpgambling.org/responsible-gambling/internet-standards/","NCPG standards for online gambling/responsible-play policy, user assistance, advertising, payments, and controls."]
];

const formats = [
  ["Best ball season-long","Draft roster once; auto-start best scores; large tournament rounds","Very high pre-season draft engagement; moderate in-season without side quests","Rake on entry fees; low in-season operational load","Overlay/fill risk if guaranteed; state DFS rules; top-heavy payout complaints","Best for GSE if free/sponsor MVP first, paid later"],
  ["DFS GPP / Milly Maker","Salary-cap lineups for weekly slates; huge top prize","High weekly activity, content, lineup research demand","Weekly rake; repeated entry volume","Expert-heavy; churn for casuals; expensive guarantees; overlay risk","Use as pattern, not first product"],
  ["Pick'em / Pick6","More/less or yes/no pick sets; peer-to-peer or pre-established payouts","Simple UX, high repeat rate, mobile-first","High-frequency fees or promotional acquisition","Legally scrutinized; can resemble props; payout confusion risk","High-risk for GSE; use education/free mode first"],
  ["Survivor / confidence pools","Pick winners weekly; eliminate or score confidence","Simple, social, season-long suspense","Entry fee/admin fee or sponsor-funded","Paid pool laws; must handle ties/postponements","Good free community wedge"],
  ["Free-to-play prize promo","No purchase required; sponsor/operator-funded prizes","Low friction acquisition; viral if prize grows","Lead-gen, sponsor ROI, email capture","Sweepstakes/promo law; prize funding cost","Safest early contest direction"],
  ["Private friend league import","Import 5-year history; rivalries, archetypes, trophies","Deep social retention and shareability","Subscription/retention value, not direct rake","Privacy and data import consent","Strong GSE differentiator"]
];

const concepts = [
  ["EDGE-001","GSE EdgeBall Lab","Free educational best-ball-style draft with no cash prizes, fake data/sandbox first","P0","GO"],
  ["EDGE-002","GSE EdgeBall Championship","Legally approved paid/sponsor-funded best-ball tournament with huge prize pool potential","P1","FOUNDER_LEGAL_REVIEW"],
  ["EDGE-003","Friend History Engine","Import 5 years of friend-league/contest history to create archetypes, rivalries, ghosts, and pre-draft receipts","P0","GO_WITH_CONSENT"],
  ["EDGE-004","No-Bet Risk Ladder","Contest side layer that rewards understanding volatility and restraint; cash prizes not based on betting decisions","P0","GO_WITH_REVIEW"],
  ["EDGE-005","Receipts Playoff Gauntlet","Best-ball playoffs with public weekly autopsies, source freshness, and why-team-advanced explanations","P1","GO"],
  ["EDGE-006","Sponsor-Funded Prize Pool","Free-to-play grand-prize model funded by sponsor/partner, not entry fees","P1","LEGAL_REVIEW"],
  ["EDGE-007","Research Draft Companion","GSE Rating / Player Lab draft companion that teaches users why a roster construction is fragile or durable","P0","GO"],
  ["EDGE-008","Community Rival Pods","Small pods with social standings, rivalry badges, and no-cash achievements feeding a larger championship bracket","P1","GO_WITH_REVIEW"]
];

const builds = [
  ["CONTEST-001","Contest legal posture memo","risk / compliance","DEPENDENCY",["BUILD-GV2-029","BUILD-GV2-031"],"Define whether MVP is free-to-play, skill contest, sweepstakes, DFS, or paid fantasy before product work.","P0","S"],
  ["CONTEST-002","Contest market inventory refresh","research","NET_NEW",[],"Keep official rules/prize/economics snapshots refreshed before design decisions.","P0","S"],
  ["CONTEST-003","GSE EdgeBall Lab rules draft","contest design","EXTENSION",["BUILD-GV2-029"],"Free no-cash best-ball-style rules are a safe child of the existing education loop.","P0","M"],
  ["CONTEST-004","Friend History import schema","data engineering","NET_NEW",[],"Five-year friend-contest history requires consent, schema, import, and privacy rules.","P0","M"],
  ["CONTEST-005","Friend archetype generator","engagement","EXTENSION",["CONTEST-004"],"Creates rival/ghost/manager profiles from imported history without exposing private data.","P1","M"],
  ["CONTEST-006","Draft companion insight model","product intelligence","EXTENSION",["BUILD-GV2-021","BUILD-GV2-023"],"Connects Player Lab/GSE intelligence to contest drafting without revealing founder methods.","P0","L"],
  ["CONTEST-007","Risk ladder scoring spec","trust / no-bet","EXTENSION",["BUILD-GV2-017","BUILD-GV2-018"],"Turns no-bet/risk thinking into educational contest feedback, not betting advice.","P0","M"],
  ["CONTEST-008","Prize pool economics simulator","financial model","EXTENSION",["BUILD-GV2-071","BUILD-GV2-072"],"Models entry count, rake, sponsor funding, overlay, CAC, and payout curves.","P0","M"],
  ["CONTEST-009","Payout curve designer","contest economics","EXTENSION",["CONTEST-008"],"Designs top-heavy vs flat payout scenarios and owner/customer tradeoffs.","P1","M"],
  ["CONTEST-010","Overlay risk control model","financial risk","EXTENSION",["CONTEST-008"],"Sets fill thresholds and guarantee caps before paid contests.","P0","M"],
  ["CONTEST-011","Free-to-play sponsor model","monetization","EXTENSION",["CONTEST-008","BUILD-GV2-068"],"Sponsor-funded prizes can create huge upside without entry-fee legal complexity.","P1","M"],
  ["CONTEST-012","Contest engagement event taxonomy","analytics","EXTENSION",["NEXT-002","BUILD-GV2-076"],"Adds contest-specific events without duplicating the main event taxonomy.","P0","S"],
  ["CONTEST-013","Draft room UX wireframe packet","product UX","NET_NEW",[],"Best-ball draft room has unique queue, timer, roster, risk, and history surfaces.","P1","L"],
  ["CONTEST-014","Leaderboard guardrail extension","risk / compliance","EXTENSION",["BUILD-GV2-031"],"Adds contest-specific leaderboard copy and anti-irresponsible-competition rules.","P0","S"],
  ["CONTEST-015","No-live-prizes release gate","risk / compliance","DEPENDENCY",["CONTEST-001"],"Blocks prizes, entry fees, and public contest launch until approved.","P0","S"],
  ["CONTEST-016","Rules and scoring source-of-truth","contest operations","NET_NEW",[],"Contest disputes require immutable rules, scoring source, and correction policy.","P0","M"],
  ["CONTEST-017","Official-stat-provider policy","data operations","EXTENSION",["CONTEST-016"],"Defines official scoring, stat corrections, voids, postponements, and appeal windows.","P0","M"],
  ["CONTEST-018","Contest support playbook","customer support","EXTENSION",["BUILD-GV2-034","BUILD-GV2-038"],"Contest support has disputes, scoring, eligibility, and responsible-play issues.","P1","S"],
  ["CONTEST-019","Contest brand/copy rules","brand voice","EXTENSION",["BUILD-GV2-041","BUILD-GV2-044"],"Contest copy must avoid gambling pressure, fake certainty, and minor-targeting.","P0","S"],
  ["CONTEST-020","Grand prize trust page","trust","EXTENSION",["BUILD-GV2-019","BUILD-GV2-020"],"A huge prize needs transparent funding, odds/structure, rules, and winner verification.","P1","M"],
  ["CONTEST-021","Responsible contest age/geo gate spec","risk / compliance","EXTENSION",["BUILD-GV2-002","BUILD-GV2-038"],"Any paid or prize contest needs eligibility controls before launch.","P0","M"],
  ["CONTEST-022","Private beta with friends history","experimentation","EXTENSION",["CONTEST-004"],"Uses consented friend-history data for sandbox learnings before public launch.","P0","M"],
  ["CONTEST-023","BestBall plus weekly side-quest spec","engagement","NET_NEW",[],"Adds optional weekly learning tasks to keep best ball engaging without roster management.","P1","M"],
  ["CONTEST-024","GSE EdgeBall Championship full spec","contest design","EXTENSION",["CONTEST-003","CONTEST-008","CONTEST-015"],"Paid/sponsor flagship spec exists only after legal/economic gates.","P1","XL"],
  ["CONTEST-025","Contest final go/no-go checklist","release governance","DEPENDENCY",["CONTEST-001","CONTEST-015","CONTEST-021"],"Final release checklist prevents accidental gambling/contest launch.","P0","S"]
];

write("SOURCE_LEDGER.md", `# Source Ledger

As of: ${asOf}

${sources.map(([name,url,note])=>`- ${name}: ${url} - ${note}`).join("\n")}
`);

write("00-operating-plan.md", `# Contest Format Lab Operating Plan

As of: ${asOf}

## Mission

Research best ball, DFS GPP/Milly Maker style contests, pick'em, survivor/pools, free-to-play prize games, and friend-history-powered contest formats. Design a GSE-native contest concept without launching a paid contest or live prize flow.

## Safety

- No production code changes.
- No paid contest launch.
- No live prizes.
- No sportsbook positioning.
- No targeting minors.
- No irresponsible gambling language.
- No claims that a format is legal without legal review.
- Friend-history data requires explicit consent and privacy rules.

## Duplicate Gate

This extends growth-os-v2 contest/community cards, especially BUILD-GV2-029, BUILD-GV2-030, and BUILD-GV2-031.
`);

write("01-market-format-research.md", `# Market Format Research

As of: ${asOf}

${table(["Format","Mechanic","Engagement","Owner Economics","Risks","GSE Read"], formats)}

## Market Read

- Best ball wins on low-maintenance drafting, massive pre-season interest, and lottery-like top prizes.
- DFS GPP/Milly Maker wins on weekly volume and content, but casual users are often outmatched.
- Pick'em wins on simplicity and frequency, but is the most legally sensitive because it can resemble player props.
- Free-to-play prize games can be strong acquisition loops when the prize is sponsor-funded and no purchase is required.
- Friend-history import is the clearest GSE-specific differentiation because it creates social memory, rivalry, and personalized context.
`);

write("02-economics-roi-model.md", `# Economics / ROI Model

As of: ${asOf}

## Owner Economics

DFS-style revenue usually comes from commission/rake on entry fees. DraftKings publishes maximum fantasy commission rates by contest type and entry band; CRS describes typical DFS rake as roughly 5% to 15% of contest pools. Guaranteed contests create overlay risk when entries do not fill the prize pool.

## Illustrative Model Only

| Scenario | Entries | Entry Fee | Gross Entry Fees | Rake / Sponsor Revenue | Prize Pool | Main Risk |
| --- | --- | --- | --- | --- | --- | --- |
| Free sponsor MVP | 50,000 | $0 | $0 | sponsor fee unknown | sponsor-funded | sponsor sales and promo law |
| Small paid beta | 2,000 | $10 | $20,000 | $2,000 at 10% | $18,000 | licensing/legal/processing |
| Mid best-ball event | 25,000 | $25 | $625,000 | $62,500 at 10% | $562,500 | fill and compliance |
| Huge championship | 100,000 | $25 | $2,500,000 | $250,000 at 10% | $2,250,000 | large guarantee, legal, support |

Do not treat these as projections. They are design math for evaluating feasibility.

## Best Owner ROI

1. Free-to-play sponsor-funded contest: best risk-adjusted acquisition if sponsor can fund prize.
2. Best-ball paid tournament: strong upfront revenue if legal and filled; low in-season ops.
3. Weekly pick'em/DFS: higher frequency but higher regulatory, support, and trust risk.
4. GPP/Milly Maker clone: expensive, expert-heavy, and risky without huge scale.
`);

write("03-gse-contest-concepts.md", `# GSE Contest Concepts

As of: ${asOf}

${table(["ID","Concept","Description","Priority","Status"], concepts)}

## Recommended Direction

Build GSE EdgeBall Lab first: free, educational, no-cash, friend-history-powered, best-ball-style, with source/freshness/receipts. Then design the paid or sponsor-funded championship only after legal and economics review.
`);

write("04-flagship-format-spec.md", `# Flagship Format Spec - GSE EdgeBall

As of: ${asOf}

## Product Thesis

GSE EdgeBall should feel like best ball plus a sports intelligence lab. The draft is the main commitment, but the season stays alive through what-changed feeds, risk ladders, receipts, rivalry pods, and optional weekly side quests.

## MVP Format

- Free-to-play, no cash prizes.
- 12-team snake draft pods.
- 18-player roster.
- Auto-start best weekly lineup.
- Weeks 1-14 pod phase.
- Weeks 15-17 playoff gauntlet.
- Friend-history import for private beta.
- GSE educational overlays: durability, volatility, stack/correlation, source freshness.
- Non-cash badges for no-bet/risk restraint, draft value, and comeback weeks.

## Paid/Sponsored Future

Only after legal review:

- sponsor-funded free contest with large prize
- or paid fantasy contest with state/age/geo eligibility
- transparent payout curve
- published official rules
- official scoring provider
- support/dispute policy
- responsible play and eligibility copy

## First-Of-Kind Layer

Friend History Engine: import five years of private contest data to create rivalry pods, ghost managers, historical tendencies, draft archetypes, and receipts. GSE can then teach each user what their group history says about risk, overconfidence, player-type bias, and roster construction.
`);

write("05-compliance-risk-register.md", `# Compliance Risk Register

As of: ${asOf}

${table(["Risk","Severity","Likelihood","Mitigation","Launch Gate"], [
  ["Paid contest treated as gambling","HIGH","MEDIUM","Legal review, state eligibility, skill-contest analysis","NO-GO until legal"],
  ["Prize/sweepstakes law breach","HIGH","MEDIUM","Official rules, no-purchase-needed path if sweepstakes, tax/prize handling","NO-GO until legal"],
  ["Minor exposure","HIGH","MEDIUM","Age gate, no youth-targeted marketing","NO-GO"],
  ["Irresponsible gambling copy","HIGH","MEDIUM","AGA/NCPG-aligned copy rules","NO-GO"],
  ["Friend-history privacy breach","HIGH","LOW","Consent, redaction, private import, delete path","NO-GO until consent"],
  ["Scoring dispute","MEDIUM","HIGH","Official stat provider policy and appeal window","REVIEW"],
  ["Overlay loss","MEDIUM","MEDIUM","Fill thresholds, sponsor funding, capped guarantee","REVIEW"],
  ["Contest confused with sportsbook","HIGH","MEDIUM","Sports intelligence positioning on every page","NO-GO"]
])}
`);

const queue = builds.map(([id,title,category,status,matched,reason,priority,difficulty]) => ({
  id,title,category,priority,difficulty,
  duplicate_check_status: status,
  matched_existing_ids: matched,
  relation_to_existing: status === "EXTENSION" ? "Child extension of existing growth-os-v2 contest/community work." : status === "DEPENDENCY" ? "Prerequisite gate before contest implementation." : "Net-new contest lab work.",
  reason_not_duplicate: reason,
  parent_id: status === "EXTENSION" && matched.length ? matched[0] : "",
  dependency_ids: status === "DEPENDENCY" ? matched : [],
  legal_risk: /legal|paid|prize|geo|age|championship|rules|scoring|payout/i.test(title) ? "HIGH" : "MEDIUM",
  implementation_mode: "docs-first / fake-data-first",
  claude_prompt_file: `claude-build-packets/cards/${id}-${slug(title)}.md`
}));

write("claude-build-packets/build-queue.jsonl", queue.map((q)=>JSON.stringify(q)).join("\n"));
write("claude-build-packets/index.md", `# Contest Lab Claude Build Packets

As of: ${asOf}

${table(["ID","Title","Gate","Matched Existing","Priority","Difficulty"], queue.map((q)=>[q.id,q.title,q.duplicate_check_status,q.matched_existing_ids.join("; ") || "none",q.priority,q.difficulty]))}
`);

for (const q of queue) {
  write(`claude-build-packets/cards/${q.id}-${slug(q.title)}.md`, `# ${q.id}: ${q.title}

## Duplicate Gate

duplicate_check_status: ${q.duplicate_check_status}  
matched_existing_ids: ${q.matched_existing_ids.join(", ") || "none"}  
relation_to_existing: ${q.relation_to_existing}  
reason_not_duplicate: ${q.reason_not_duplicate}  
parent_id: ${q.parent_id || "none"}  
dependency_ids: ${q.dependency_ids.join(", ") || "none"}

## Goal

Create a safe, docs-first or fake-data-first implementation packet for ${q.title}.

## Legal / Compliance Boundary

Legal risk: ${q.legal_risk}. Do not launch paid contests, prizes, entry fees, live leaderboards, geofenced eligibility, or user deposits without founder/legal approval.

## Implementation Plan

1. Verify the real GSE shipping clone before code.
2. Read contest-format-lab docs and matched growth-os-v2 cards.
3. Build docs/spec/mock only unless explicit implementation approval exists.
4. Use fake contest data and no real user/friend data.
5. Add clear approval gates, rollback, and unknowns.

## Acceptance Criteria

- No production code or live contest launched.
- No secrets or payment/entry flows.
- Rules, risk, and duplicate gates are explicit.
- Claude can execute the next step in the real clone.

## Claude Code Prompt

You are Claude Code in the real GSE shipping clone. Execute only ${q.id}: ${q.title}. Verify repo root and existing contest/community cards first. Do not launch paid contests, prizes, deposits, or live affiliate/sportsbook flows. Use fake data or docs-only specs. Preserve GSE as sports intelligence, not a sportsbook. Report files changed, tests run, approvals needed, and rollback.
`);
}

write("06-final-report.md", `# Final Report - Contest Format Lab

As of: ${asOf}

## Executive Summary

The strongest GSE contest direction is not a straight Milly Maker clone. The best fit is a free-to-play or sponsor-funded best-ball-style contest with GSE intelligence, friend-history memory, risk education, and transparent receipts. Paid huge-prize versions should be designed but not launched until legal, state, age, tax, payments, prize, and responsible-play review are complete.

## Popular Formats

- Best ball: strongest pre-season engagement and easiest season-long fantasy UX.
- DFS GPP/Milly Maker: huge upside and weekly action, but expert-heavy and expensive to guarantee.
- Pick'em/Pick6: easiest UX and high frequency, but legally sensitive and payout-confusion-prone.
- Survivor/pools: social and simple; strong community wedge.
- Free-to-play prize games: best early acquisition route if sponsor-funded.

## Owner ROI

Best risk-adjusted ROI starts with free-to-play sponsor acquisition. Paid best ball can be profitable through rake if it fills; guaranteed prize pools create overlay risk. Pick'em can be high frequency but has the highest legal/trust exposure.

## Recommended Flagship

GSE EdgeBall Lab first. GSE EdgeBall Championship later.

## First-Of-Kind Mechanic

Friend History Engine: use five years of private friend contest history, with consent, to create rivalry pods, ghost managers, draft archetypes, historical tendencies, and personalized risk lessons.

## What Not To Build First

- paid real-money contest
- sportsbook-style picks
- casino-style prizes
- cash-prize leaderboard
- public contest using friend data without consent
- any messaging that promises outcomes

## Build Queue

25 contest lab packets created under \`claude-build-packets/\`.
`);

console.log(JSON.stringify({ sources: sources.length, formats: formats.length, concepts: concepts.length, builds: builds.length }, null, 2));

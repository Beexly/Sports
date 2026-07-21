/**
 * Personal AI income registry.
 *
 * This is intentionally separate from scalable GSE business revenue. Contract,
 * task, bounty, competition, and participant income are personal earned-income
 * lanes; they must not be counted as MRR, company revenue, or product proof.
 */

export type PersonalIncomeOpportunityState =
  | "APPLY_NOW"
  | "BUILD_PROFILE_FIRST"
  | "ACTIVE_CHALLENGE"
  | "INVITATION_OR_SELECTION"
  | "NEGOTIATED_ONLY"
  | "WATCH";

export type PersonalIncomeType =
  | "expert_evaluation"
  | "contract_leadership"
  | "freelance_service"
  | "challenge_prize"
  | "security_bounty"
  | "data_partnership"
  | "research_participation";

export type PersonalIncomePriority = "P0" | "P1" | "P2" | "P3" | "WATCH";

export interface PersonalAiIncomeOpportunity {
  readonly id: string;
  readonly platform: string;
  readonly program: string;
  readonly incomeType: PersonalIncomeType;
  readonly state: PersonalIncomeOpportunityState;
  readonly priority: PersonalIncomePriority;
  readonly verifiedAt: string;
  readonly sourceUrl: string;
  readonly publishedCompensation: string;
  readonly compensationEvidence:
    | "PLATFORM_RATE"
    | "PLATFORM_PAYOUT"
    | "PRIZE_POOL"
    | "NEGOTIATED"
    | "NO_COMPENSATION_COMMITMENT";
  readonly currentTruth: string;
  readonly userFit: readonly string[];
  readonly positioning: string;
  readonly agentCanPrepare: readonly string[];
  readonly ownerMustDo: readonly string[];
  readonly disqualifiersOrRisks: readonly string[];
  readonly countsAsBusinessRevenue: false;
  readonly incomeGuaranteed: false;
}

export const PERSONAL_AI_INCOME_OPPORTUNITIES: readonly PersonalAiIncomeOpportunity[] = [
  {
    id: "contra-ai-services",
    platform: "Contra",
    program: "Commission-free independent services",
    incomeType: "freelance_service",
    state: "APPLY_NOW",
    priority: "P0",
    verifiedAt: "2026-07-21",
    sourceUrl: "https://contra.com/features/get-discovered",
    publishedCompensation:
      "Client-negotiated project income; Contra states contractors keep 100% of earnings and can use commission-free payment tools.",
    compensationEvidence: "NEGOTIATED",
    currentTruth:
      "Contra supports free contractor profiles, discovery, proposals, contracts, invoices, and commission-free payments. Income depends on winning and delivering real client work; profile creation alone has no cash value.",
    userFit: [
      "13 years of HR and People Operations leadership",
      "Executive decision frameworks, investigations, compliance, policy, and workforce systems",
      "AI opportunity, evidence, risk, and workflow architecture demonstrated through NOVA/GSE",
      "Writing, psychology, and organizational behavior",
    ],
    positioning:
      "Sell narrow outcomes rather than generic AI consulting: AI Opportunity and Cost Audit, HR AI Risk and Workflow Audit, Coding-Agent Trust Review, or Sports-Intelligence Evidence Audit.",
    agentCanPrepare: [
      "Contra profile and portfolio copy",
      "Three fixed-scope service pages",
      "Anonymized GSE/NOVA case study",
      "Intake form, statement of work, acceptance criteria, and delivery templates",
      "Proposal library and lead qualification rubric",
      "Invoice and fulfillment checklist",
    ],
    ownerMustDo: [
      "Create and verify the Contra account",
      "Approve public portfolio claims and pricing experiments",
      "Apply to jobs or accept client invitations",
      "Conduct client calls and approve contracts",
    ],
    disqualifiersOrRisks: [
      "No clients or payment receipts exist yet",
      "Confidential Turner or personal legal material must never enter the portfolio",
      "Service scope must remain deliverable by one person",
    ],
    countsAsBusinessRevenue: false,
    incomeGuaranteed: false,
  },
  {
    id: "prolific-expert-network",
    platform: "Prolific",
    program: "Prolific Expert Network",
    incomeType: "expert_evaluation",
    state: "APPLY_NOW",
    priority: "P1",
    verifiedAt: "2026-07-21",
    sourceUrl: "https://www.prolific.com/expert-network",
    publishedCompensation:
      "High-reward expert studies and tasks; individual task rates vary. Prolific recommends at least $12/hour for ordinary participation and higher rewards for specialized expertise.",
    compensationEvidence: "PLATFORM_RATE",
    currentTruth:
      "Applicants join a waitlist, complete identity and practice-task verification, and receive matched tasks when invited. No task volume or invitation timing is guaranteed.",
    userFit: [
      "HR leadership and workplace decision expertise",
      "Psychology, organizational behavior, writing, and human judgment",
      "AI response evaluation and structured rubric design",
      "Sports and business-domain reasoning",
    ],
    positioning:
      "Present as an HR/organizational-behavior domain expert and senior evaluator who can design rubrics, identify policy risk, evaluate tone and factuality, and explain human consequences.",
    agentCanPrepare: [
      "Expert profile summary",
      "Domain taxonomy and keywords",
      "Practice evaluation rubric",
      "Resume variant emphasizing judgment, investigations, and quality assurance",
    ],
    ownerMustDo: ["Join the waitlist", "Complete identity verification", "Complete the platform practice task", "Accept and perform tasks personally"],
    disqualifiersOrRisks: [
      "Waitlist and matching may delay access",
      "Task availability and compensation vary",
      "Work must be completed by the verified participant without agent impersonation",
    ],
    countsAsBusinessRevenue: false,
    incomeGuaranteed: false,
  },
  {
    id: "outlier-technical-evaluation",
    platform: "Outlier",
    program: "Technical, coding, writing, and AI evaluation projects",
    incomeType: "expert_evaluation",
    state: "APPLY_NOW",
    priority: "P1",
    verifiedAt: "2026-07-21",
    sourceUrl: "https://outlier.ai/",
    publishedCompensation:
      "Current role pages advertise project-dependent rates such as up to $23/hour for technical documentation and up to $50/hour for certain software/agent-builder work; lower rates may apply to onboarding or non-core work.",
    compensationEvidence: "PLATFORM_RATE",
    currentTruth:
      "Outlier offers remote freelance AI-training and evaluation projects. Access, rate, task volume, and continuity depend on skills verification, geography, project need, and task quality.",
    userFit: [
      "Technical documentation and evidence writing",
      "Coding-agent evaluation and repository QA experience",
      "Business, HR, sports, and decision-domain judgment",
      "Ability to follow detailed rules and produce structured feedback",
    ],
    positioning:
      "Apply honestly for documentation, business-domain, writing, evaluation, or agent-workflow roles. Use repository evidence to demonstrate technical literacy without claiming unsupported software-engineering credentials.",
    agentCanPrepare: [
      "Outlier-targeted resume",
      "Technical writing samples",
      "Model-response evaluation samples",
      "Coding-agent QA case study",
      "Skills-assessment preparation packet",
    ],
    ownerMustDo: ["Create and verify the account", "Complete skills assessments personally", "Accept and perform assigned tasks", "Review project-specific rates before work"],
    disqualifiersOrRisks: [
      "No specific project assignment is guaranteed",
      "Advertised maximum rates are not the default rate",
      "Agent assistance must comply with each project's rules",
    ],
    countsAsBusinessRevenue: false,
    incomeGuaranteed: false,
  },
  {
    id: "turing-llm-team-lead",
    platform: "Turing",
    program: "LLM evaluation project leadership and domain contracts",
    incomeType: "contract_leadership",
    state: "APPLY_NOW",
    priority: "P1",
    verifiedAt: "2026-07-21",
    sourceUrl: "https://work.turing.com/r/higE1XhvyX",
    publishedCompensation: "Competitive contractor compensation; exact amount is role- and offer-specific rather than published on the current project-lead page.",
    compensationEvidence: "NEGOTIATED",
    currentTruth:
      "Turing currently advertises remote roles leading business analysts who create and evaluate LLM training data, with analytical assessments and interviews required. Some roles require substantial weekly commitment and immediate availability.",
    userFit: [
      "HR Director/Manager leadership and performance management",
      "Direct management of teams",
      "Training, evaluation, quality, and accountability systems",
      "Critical thinking, research, writing, and feedback",
    ],
    positioning:
      "Lead with people leadership, evaluation quality, rubric design, training, performance feedback, and operational discipline—not only AI enthusiasm.",
    agentCanPrepare: [
      "Turing resume and profile",
      "Leadership accomplishments and team-size evidence",
      "LLM evaluation operations case study",
      "Analytical assessment practice set",
      "Interview stories using STAR structure",
    ],
    ownerMustDo: ["Apply", "Complete analytical assessment personally", "Interview", "Confirm schedule and contractor terms"],
    disqualifiersOrRisks: [
      "Some roles require 40 hours per week or fixed overlap",
      "Selection and compensation are not guaranteed",
      "The role may be contract work without employee benefits",
    ],
    countsAsBusinessRevenue: false,
    incomeGuaranteed: false,
  },
  {
    id: "turing-strategy-game-evaluator",
    platform: "Turing",
    program: "Board Game Reasoning Expert — AI Training and Evaluation",
    incomeType: "expert_evaluation",
    state: "APPLY_NOW",
    priority: "P2",
    verifiedAt: "2026-07-21",
    sourceUrl: "https://work.turing.com/r/okSE264jve",
    publishedCompensation: "Contract compensation is role-specific and not stated on the captured listing.",
    compensationEvidence: "NEGOTIATED",
    currentTruth:
      "The current listing seeks experience in game theory, behavioral economics, decision science, formal logic, strategy games, TCGs, RPGs, evaluation rubrics, model QA, and related analytical work. It requires at least 20 hours per week for the stated project.",
    userFit: [
      "Competitive sports decision-making and pattern recognition",
      "Sports-card trading interest",
      "Psychology and second-order effects",
      "Rubric, benchmark, and quality-system work in GSE/NOVA",
    ],
    positioning:
      "Use only if the actual game/TCG and formal-reasoning experience can be evidenced. Do not inflate hobbies or substitute sports expertise for required tabletop knowledge.",
    agentCanPrepare: ["Relevant experience inventory", "Reasoning benchmark sample", "Game-rule evaluation sample", "Targeted resume"],
    ownerMustDo: ["Decide whether qualifications are genuinely met", "Apply and complete assessments personally"],
    disqualifiersOrRisks: [
      "Formal game-domain qualifications may not be strong enough",
      "Minimum time commitment is material",
      "Do not fabricate tabletop or game-theory experience",
    ],
    countsAsBusinessRevenue: false,
    incomeGuaranteed: false,
  },
  {
    id: "openai-security-safety-bounty",
    platform: "OpenAI",
    program: "Security and Safety Bug Bounty programs",
    incomeType: "security_bounty",
    state: "BUILD_PROFILE_FIRST",
    priority: "P3",
    verifiedAt: "2026-07-21",
    sourceUrl: "https://openai.com/index/bug-bounty-program/",
    publishedCompensation:
      "OpenAI's public security bounty announcement describes cash rewards from $200 to $20,000 based on severity and impact; specialized safety campaigns publish separate scope and rewards.",
    compensationEvidence: "PLATFORM_PAYOUT",
    currentTruth:
      "Only authorized in-scope research following the operative program rules qualifies. Ordinary jailbreaks, policy disagreements, or testing third parties outside authorization do not create a valid bounty claim.",
    userFit: [
      "Evidence discipline and adversarial review",
      "Agent workflow and MCP risk awareness",
      "Interest in security and system failure modes",
    ],
    positioning:
      "Treat as a skill-development and carefully scoped research lane, not immediate income. Begin with safe labs, program rules, and report-writing practice.",
    agentCanPrepare: [
      "Current scope and safe-harbor summary",
      "Local vulnerable-agent lab",
      "Reproduction and evidence template",
      "Disclosure report template",
      "Security learning plan",
    ],
    ownerMustDo: ["Read and accept current program rules", "Perform only authorized testing", "Submit findings personally through the official channel"],
    disqualifiersOrRisks: [
      "Security expertise is not yet demonstrated",
      "Unauthorized testing can create legal and account risk",
      "Most reports receive no bounty",
    ],
    countsAsBusinessRevenue: false,
    incomeGuaranteed: false,
  },
  {
    id: "devpost-ai-challenges",
    platform: "Devpost",
    program: "Current AI hackathons and challenge prizes",
    incomeType: "challenge_prize",
    state: "ACTIVE_CHALLENGE",
    priority: "P1",
    verifiedAt: "2026-07-21",
    sourceUrl: "https://devpost.com/c/artificial-intelligence",
    publishedCompensation:
      "Prize amounts and eligibility vary by challenge. Current examples include OpenAI Build Week with $100,000 in prizes and Build with Gemini XPRIZE with $2,000,000 in cash prizes and an August 17, 2026 deadline.",
    compensationEvidence: "PRIZE_POOL",
    currentTruth:
      "Prize pools are competitive, rule-bound, deadline-specific, and frequently restricted by age, geography, student status, sponsor technology, new-work requirements, or judging criteria. Submission is not income.",
    userFit: [
      "Existing functional GSE/NOVA/XXX projects",
      "Ability to create ambitious system demonstrations",
      "Strong narrative and product vision",
      "Multiple AI platform integrations",
    ],
    positioning:
      "Maintain a challenge radar and reuse one truthful, modular demo substrate rather than starting a new unrelated project for every contest.",
    agentCanPrepare: [
      "Eligibility matrix",
      "Deadline and prize-state monitor",
      "Project-to-challenge fit score",
      "Submission packet, README, demo script, and evidence checklist",
      "Reusable deterministic demo environment",
    ],
    ownerMustDo: ["Join eligible challenges", "Accept rules", "Record required videos", "Submit and capture receipt"],
    disqualifiersOrRisks: [
      "Awards are uncertain and should not displace customer revenue work",
      "Existing-project and sponsor-technology rules must be followed exactly",
      "Video and final submission remain owner actions",
    ],
    countsAsBusinessRevenue: false,
    incomeGuaranteed: false,
  },
  {
    id: "openai-data-partnerships",
    platform: "OpenAI",
    program: "OpenAI Data Partnerships",
    incomeType: "data_partnership",
    state: "NEGOTIATED_ONLY",
    priority: "WATCH",
    verifiedAt: "2026-07-21",
    sourceUrl: "https://openai.com/index/data-partnerships/",
    publishedCompensation:
      "No public cash, credit, or standard payout commitment is stated; terms are explored privately with selected organizations.",
    compensationEvidence: "NO_COMPENSATION_COMMITMENT",
    currentTruth:
      "OpenAI accepts expressions of interest from organizations with large-scale, rights-owned, non-public datasets. It explicitly does not seek sensitive/personal information or third-party data the organization lacks rights to share.",
    userFit: [
      "Potential future GSE-created evaluation judgments and rights-cleared derived sports data",
      "Potential future original GSN content archive",
    ],
    positioning:
      "Do not apply with scraped sports content, customer data, personal legal/HR material, or a small unproven collection. Build an asset manifest, ownership proof, scale, and independent commercial valuation first.",
    agentCanPrepare: [
      "Data asset inventory",
      "Record-level provenance and rights ledger",
      "PII and third-party-expression exclusion report",
      "Dataset card and valuation options",
      "Partnership decision packet",
    ],
    ownerMustDo: ["Approve any data disclosure", "Submit an expression of interest only after rights and economic review", "Negotiate terms"],
    disqualifiersOrRisks: [
      "No standard compensation is promised",
      "Current GSE datasets include third-party sources and cannot be offered wholesale",
      "Transferring valuable data may destroy future exclusivity if terms are weak",
    ],
    countsAsBusinessRevenue: false,
    incomeGuaranteed: false,
  },
  {
    id: "defined-ai-data-marketplace",
    platform: "Defined.ai",
    program: "AI Data Marketplace provider partnerships",
    incomeType: "data_partnership",
    state: "BUILD_PROFILE_FIRST",
    priority: "WATCH",
    verifiedAt: "2026-07-21",
    sourceUrl: "https://defined.ai/marketplace/",
    publishedCompensation:
      "Provider economics are negotiated. Defined.ai reports that some third-party dataset partners earn substantial annual licensing revenue, but no result applies automatically to a new provider.",
    compensationEvidence: "NEGOTIATED",
    currentTruth:
      "The marketplace focuses on ethically sourced, licensed AI training data. A provider needs a proprietary, consented, well-documented dataset with commercial training rights and buyer demand.",
    userFit: [
      "Future human-reviewed sports reasoning benchmark",
      "Future HR/workplace judgment dataset created with consent and de-identification",
      "NOVA agent-reliability and evidence-evaluation records",
    ],
    positioning:
      "Develop benchmark-quality owned labels and evaluation data first. Never repackage vendor data, employee records, personal communications, or model outputs whose terms prohibit resale/training use.",
    agentCanPrepare: [
      "Dataset card",
      "Consent and provenance ledger",
      "Commercial training-rights review",
      "Sample and buyer-use analysis",
      "Provider application packet",
    ],
    ownerMustDo: ["Approve the asset and licensing strategy", "Apply or negotiate with the marketplace"],
    disqualifiersOrRisks: [
      "No rights-clean dataset is currently ready for sale",
      "Dataset creation and QA can cost more than likely demand",
      "Licensing may reduce strategic exclusivity",
    ],
    countsAsBusinessRevenue: false,
    incomeGuaranteed: false,
  },
];

export interface PersonalAiIncomeSummary {
  readonly total: number;
  readonly applyNow: number;
  readonly activeChallenges: number;
  readonly p0: number;
  readonly p1: number;
}

export function summarizePersonalAiIncome(
  opportunities: readonly PersonalAiIncomeOpportunity[] = PERSONAL_AI_INCOME_OPPORTUNITIES,
): PersonalAiIncomeSummary {
  return {
    total: opportunities.length,
    applyNow: opportunities.filter((item) => item.state === "APPLY_NOW").length,
    activeChallenges: opportunities.filter((item) => item.state === "ACTIVE_CHALLENGE").length,
    p0: opportunities.filter((item) => item.priority === "P0").length,
    p1: opportunities.filter((item) => item.priority === "P1").length,
  };
}

export function validatePersonalAiIncomeRegistry(
  opportunities: readonly PersonalAiIncomeOpportunity[] = PERSONAL_AI_INCOME_OPPORTUNITIES,
): readonly string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const item of opportunities) {
    if (ids.has(item.id)) errors.push(`Duplicate personal-income id: ${item.id}`);
    ids.add(item.id);
    if (!item.sourceUrl.startsWith("https://")) errors.push(`${item.id} must use HTTPS.`);
    if (item.agentCanPrepare.length === 0) errors.push(`${item.id} has no agent-prepared work.`);
    if (item.ownerMustDo.length === 0) errors.push(`${item.id} has no owner action.`);
    if (item.countsAsBusinessRevenue !== false) errors.push(`${item.id} must not count as business revenue.`);
    if (item.incomeGuaranteed !== false) errors.push(`${item.id} must not guarantee income.`);
  }
  return errors;
}

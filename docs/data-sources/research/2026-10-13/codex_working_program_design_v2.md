# Codex Master Prompt v2 — Working Program Design for Synthetic Media Command Studio

You are Codex acting as a senior founding engineer, product architect, platform engineer, AI workflow architect, repo-audit engineer, compliance/safety engineer, data-modeling engineer, and implementation lead.

Your job is not to brainstorm. Your job is to leave behind a **working local program design**: a bootable repository with a real app shell, real data models, real workflows, real tests, real repo-audit tooling, real docs, and a precise handoff package for Claude to continue the build.

Treat this like the first engineering sprint of an actual company.

Do not stop at strategy. Do not produce a doc-only repo. Do not create a generic CRUD demo. Build the first usable command center.

---

## 0. Core Outcome

Build **Synthetic Media Command Studio**: a private internal operating system for running an AI-assisted synthetic media company across three separated divisions:

1. **Operator Brand Division**  
   Public content about AI agents, dashboards, automation, workflows, experiments, and business-building systems.

2. **SFW Synthetic UGC Division**  
   Brand-safe synthetic UGC for fitness, cooking, product demos, lifestyle content, inspiration, affiliate/product promotion, and ad testing.

3. **Adult Synthetic Creator Division**  
   Compliance-controlled planning and operations for original 21+ synthetic adult personas, custom request intake, platform review, asset QA, buyer preference tracking, and monetization planning.

The MVP must **not** generate explicit media. It must build the operating system around the media business: ingestion, personas, agents, briefs, compliance, QA, asset vault, platform strategy, custom request workflow, experiments, metrics, repo audits, and handoff docs.

The finished Codex output should be suitable for giving to Claude to continue the next build phase without ambiguity.

---

## 1. Non-Negotiable Safety and Compliance Boundaries

Build a compliant system. Do not build deception, illegal content, impersonation, nonconsensual media, scraping workflows, hidden AI identity, or platform-abuse tooling.

The system must reject, block, or require human review for:

- hidden AI deception workflows
- requests to make users believe an AI persona is a real human
- real-person likeness cloning
- celebrity/public-figure likeness cloning
- deepfake/face-swap workflows without verified consent and platform review
- nudify/undress-this-person functionality
- scraping, downloading, or training on real creator content
- copying or recreating OnlyFans/Fanvue/Reddit creators
- underage-coded adult content
- adult contexts using “barely legal,” “teen,” “just turned 18,” schoolgirl, juvenile framing, or similar terms
- content involving or visually/contextually resembling minors
- nonconsensual scenarios
- revenge-porn workflows
- coercion, intoxication, or incapacity scenarios
- incest-coded or illegal/taboo adult requests
- automated sexual DM spam
- mass account manipulation
- unauthorized auto-posting
- bypassing platform policies
- payment flows designed to evade adult-platform compliance
- importing unsafe code from reference repos without license/safety review

Human review must be required for:

- all adult custom requests
- all ambiguous age-appearance issues
- all real-person likeness requests
- all platform-risk findings
- all repository-import reuse decisions above low risk
- any off-platform adult content delivery or payment workflow
- any action that would post, send, publish, pay, or download externally

MVP must default to **draft-only** publishing and **mock-only** connectors.

---

## 2. Evidence Pack From Uploaded Context

The user has provided multiple archive files and research/transcript files. Your system must assume these will be placed in:

```txt
/research/input-zips
/research/input-text
```

Known archive inputs:

- `PhoenixAdult.bundle-master.zip`
- `ai-video-generator-nsfw-main(1).zip`
- `Sandstorm-Station-13-master.zip`
- `nsfw_model-master(1).zip`
- `nsfw_data_source_urls-master (1)(1).zip`
- `nsfwjs-master(1).zip`
- `nsfw-resnet-master(1).zip`
- `nsfw_data_source_urls-master(1).zip`
- `open_nsfw-master(1).zip`
- `nsfw_data_scraper-main(1).zip`
- `PalmVisionAI-main.zip`
- `NS-FW-AI-Image-and-Video-Generator-2026-main.zip`
- `nsfw-ai-generator-tool-main.zip`
- `perchance-nsfw-ai-generator-main.zip`

Reference interpretation:

### High-value pattern sources

`PhoenixAdult.bundle-master.zip`  
Use as a reference for adult-media metadata architecture: source/site matching, title parsing, genre/tag normalization, actor/entity handling, search/match logic, asset library postprocessing, and file/status logging. Do not copy scraping behavior blindly.

`nsfwjs-master(1).zip`  
Use as a reference for TypeScript/TensorFlow.js NSFW classification adapters, client-side or Node-side classification, package structure, and model-loading patterns.

`nsfw_model-master(1).zip`  
Use as a reference for backend classifier architecture, prediction APIs, and class taxonomy.

`nsfw_data_scraper-main(1).zip`  
Use only as a pattern for ingestion queues, URL normalization, status tracking, dataset splitting, Docker wrapper, and logging. Do not scrape real creators or download adult content.

`nsfw_data_source_urls-master*.zip`  
Use only as taxonomy and compliance intelligence: category names, source labels, risky terms, blocklists, market segmentation. Do not scrape, train, download, or copy real content.

`Sandstorm-Station-13-master.zip`  
Use only as architecture inspiration for governance: admin roles, permissions, audit logs, event systems, subsystem orchestration, moderation patterns, issue templates, and CI discipline. Do not import game code.

### Reference-only or discard-code sources

`open_nsfw-master(1).zip`  
Legacy classifier baseline and thresholding ideas only.

`nsfw-resnet-master(1).zip`  
Classifier architecture reference only until license and commercial rights are verified.

`PalmVisionAI-main.zip`, `NS-FW-AI-Image-and-Video-Generator-2026-main.zip`, `ai-video-generator-nsfw-main(1).zip`, `nsfw-ai-generator-tool-main.zip`, `perchance-nsfw-ai-generator-main.zip`  
Mostly README/marketing shells. Use for competitor-copy analysis and risk detection only, not implementation.

### Agent-business transcript pattern

The uploaded transcript shows a company operated by named agents: Sarah handles support, Tal handles development, Scout researches competitors/trends, Ava edits/schedules/publishes, Bobby watches ads/performance, and Jarvis coordinates everything. Use this as the operating-model pattern. Do not copy the branding literally; adapt the architecture.

### Critical QA findings already identified

You must implement these as first-class scope, not afterthoughts:

1. Deterministic dedupe and normalization for repeated/duplicated zip audit payloads.
2. Deterministic repo-risk scoring and reuse-decision classifier.
3. Repository-ingest compliance gates.
4. RepoAudit provenance, fingerprinting, and idempotent upsert fields.
5. Scalable bounded-content analysis for huge text inputs such as 119MB+ URL/category corpora.
6. Human-approval gate and action controls in `/repo-audit`.
7. Tests for duplicated-input and naming-variant edge cases.
8. Milestone-based delivery plan mapped 1:1 to acceptance criteria.

---

## 3. Product Thesis

The generator is not the business. The operating system around the generator is the business.

The durable moat is:

- persona consistency
- visual and voice identity control
- buyer/customer memory
- custom-request fulfillment speed
- compliance review
- realism QA
- asset metadata
- prompt/brief recipe library
- channel-specific publishing logic
- performance analytics
- agent coordination
- repeatable daily operating loops
- platform-risk monitoring
- archive discipline
- repo-audit intelligence
- taxonomy extraction
- human review gates

Do not optimize for “maximum content.” Optimize for:

- high-quality drafts
- compliance safety
- realism discipline
- reusable metadata
- low platform risk
- measurable experiments
- scalable workflow
- clean handoff

---

## 4. Required Local Tech Stack

Use a TypeScript-first monorepo.

Preferred stack:

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui or clean custom UI primitives
- Prisma ORM
- PostgreSQL via Docker Compose
- Redis optional for queueing
- MinIO or local filesystem abstraction for asset storage
- Zod validation
- Vitest for unit tests
- Playwright for smoke tests
- ESLint + Prettier
- GitHub Actions CI
- Node scripts for repo audit and import tooling

Do not rely on paid external APIs for MVP. Create interfaces and mock connectors.

Required commands:

```bash
npm install
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev
npm run lint
npm run typecheck
npm run test
npm run test:smoke
npm run build
npm run audit:repos
npm run validate:rules
```

If you choose `pnpm`, use it consistently and update all commands.

---

## 5. Required Repository Structure

Create this structure:

```txt
/apps
  /web
    Next.js app

/packages
  /core
    Shared domain types, enums, constants, Zod schemas
  /db
    Prisma schema, migrations, seed scripts
  /agents
    Agent manifests, prompts, orchestrator helpers, daily operating loop
  /compliance
    Rules engine, red/yellow/green decisions, platform constraints, repo-ingest policy
  /personas
    Persona schemas, versioning, visual/voice rules, identity-lock utilities
  /briefs
    Content brief builder, custom request brief builder, prompt recipe builder
  /connectors
    Mock generation connector, ComfyUI stub, platform publishing stubs, storage connector
  /qa
    Realism QA, continuity QA, platform eligibility, classifier adapter stubs
  /analytics
    Experiment metrics, scoring, performance reports
  /repo-audit
    Archive scanning, safe extraction, dedupe, provenance, risk scoring, summary writer
  /taxonomy
    Taxonomy import, category normalization, allowed/review/blocked mapping
  /workflow
    State machines for briefs, assets, custom requests, approvals, agent runs

/docs
  README.md
  architecture.md
  product-spec.md
  working-program-design.md
  agent-system.md
  compliance-policy.md
  repository-ingest-policy.md
  persona-design.md
  content-pipeline.md
  custom-request-pipeline.md
  asset-vault.md
  platform-strategy.md
  realism-prompting-guide.md
  repo-audit.md
  taxonomy-system.md
  qa-system.md
  analytics-system.md
  6-month-roadmap.md
  12-month-moat.md
  failure-mode-register.md
  claude-handoff.md
  sprint-board-day-1-to-14.md

/research
  /input-zips
  /input-text
  /imports
  /summaries
  /normalized
  /rejected

/scripts
  audit-reference-repos.ts
  normalize-repo-ingest.ts
  extract-taxonomy.ts
  seed-demo-data.ts
  validate-compliance-rules.ts
  generate-claude-handoff.ts
  smoke-test.ts

/.github
  /workflows
    ci.yml
```

---

## 6. Data Model Requirements

Design Prisma models with idempotency, provenance, and auditability.

### User

Fields:

- id
- email
- name
- role: OWNER / ADMIN / REVIEWER / VIEWER
- createdAt
- updatedAt

### Division

Fields:

- id
- key: OPERATOR / SFW_UGC / ADULT_SYNTHETIC
- name
- description
- riskLevel
- active

### Agent

Fields:

- id
- name
- codename
- role
- description
- divisionScope
- allowedActionsJson
- forbiddenActionsJson
- escalationTriggersJson
- systemPrompt
- status: ACTIVE / DISABLED / DRAFT
- createdAt
- updatedAt

### AgentRun

Fields:

- id
- agentId
- taskType
- inputJson
- outputJson
- status: QUEUED / RUNNING / NEEDS_REVIEW / COMPLETED / FAILED / CANCELLED
- riskLevel
- humanApprovalRequired
- createdAt
- completedAt

### Persona

Fields:

- id
- divisionId
- name
- publicName
- status: DRAFT / ACTIVE / ARCHIVED / BLOCKED
- ageStatement
- syntheticDisclosure
- visualIdentitySummary
- voiceIdentitySummary
- prohibitedTraitsJson
- notes
- createdAt
- updatedAt

### PersonaVersion

Fields:

- id
- personaId
- version
- faceRulesJson
- bodyRulesJson
- wardrobeRulesJson
- cameraRulesJson
- voiceRulesJson
- captionRulesJson
- boundaryRulesJson
- disclosureRulesJson
- active
- createdAt

### ContentBrief

Fields:

- id
- divisionId
- personaId nullable
- title
- contentType: IMAGE / VIDEO / CAROUSEL / SCRIPT / POST / CUSTOM_REQUEST / OPERATOR_REEL / UGC_AD
- platformTarget
- objective
- audience
- hook
- concept
- shotListJson
- prompt
- negativePrompt
- realismNotes
- status: IDEA / RESEARCHED / BRIEFED / COMPLIANCE_REVIEW / GENERATION_READY / GENERATED / QA_REVIEW / APPROVED / POST_PLAN_READY / POSTED / MEASURED / ARCHIVED / REJECTED
- complianceStatus: PASS / FAIL / NEEDS_REVIEW / NOT_CHECKED
- qaStatus: PASS / FAIL / NEEDS_REVIEW / NOT_CHECKED
- createdAt
- updatedAt

### PromptRecipe

Fields:

- id
- name
- divisionId
- personaId nullable
- purpose
- basePrompt
- negativePrompt
- cameraLanguage
- realismModifiersJson
- forbiddenModifiersJson
- successNotes
- failureNotes
- createdAt
- updatedAt

### GenerationJob

Fields:

- id
- briefId
- connectorName
- modelName
- inputJson
- outputJson
- status: DRAFT / QUEUED / RUNNING / COMPLETED / FAILED / CANCELLED
- error
- createdAt
- completedAt

### Asset

Fields:

- id
- divisionId
- personaId nullable
- briefId nullable
- generationJobId nullable
- storageUrl
- mediaType: IMAGE / VIDEO / TEXT / AUDIO / OTHER
- title
- tagsJson
- platformEligibilityJson
- nsfwScore nullable
- realismScore nullable
- continuityScore nullable
- complianceStatus
- qaStatus
- rejectionReason nullable
- metadataJson
- createdAt
- updatedAt

### QAReport

Fields:

- id
- assetId nullable
- briefId nullable
- type: CONTINUITY / COMPLIANCE / REALISM / PLATFORM / MANUAL_REVIEW / REPO_INGEST
- score
- status: PASS / FAIL / NEEDS_REVIEW
- findingsJson
- reviewer
- createdAt

### ComplianceRule

Fields:

- id
- name
- category
- severity: GREEN / YELLOW / RED
- description
- pattern
- appliesToDivisionsJson
- appliesToEntityTypesJson
- action: ALLOW / WARN / REQUIRE_REVIEW / BLOCK
- active

### ComplianceFinding

Fields:

- id
- ruleId nullable
- entityType
- entityId
- severity
- finding
- recommendedAction
- resolved
- createdAt

### PlatformProfile

Fields:

- id
- key: REDDIT / X / FANVUE / TELEGRAM / ONLYFANS_TEST / INSTAGRAM / TIKTOK / YOUTUBE / INTERNAL
- name
- divisionEligibilityJson
- adultAllowed
- aiDisclosureRequired
- sensitiveMediaRequired
- automationAllowedLevel: NONE / DRAFT_ONLY / LIMITED_WITH_REVIEW / APPROVED_CONNECTOR
- notes
- active

### PostPlan

Fields:

- id
- assetId nullable
- briefId nullable
- platformProfileId
- caption
- hashtagsJson
- postingWindow
- riskLevel
- status: DRAFT / NEEDS_REVIEW / APPROVED / SCHEDULED / POSTED / BLOCKED
- createdAt
- updatedAt

### PostResult

Fields:

- id
- postPlanId
- impressions
- views
- likes
- comments
- saves
- shares
- clicks
- dms
- conversions
- revenue
- notes
- capturedAt

### Experiment

Fields:

- id
- divisionId
- name
- hypothesis
- platform
- personaId nullable
- contentType
- successMetric
- decisionRule
- status: DRAFT / ACTIVE / COMPLETED / KILLED / SCALED
- startDate
- endDate nullable
- resultsSummary

### Customer

Fields:

- id
- divisionId
- handle
- platform
- notes
- riskFlagsJson
- preferenceJson
- createdAt
- updatedAt

### CustomRequest

Fields:

- id
- customerId
- divisionId
- personaId nullable
- requestText
- structuredRequestJson
- complianceStatus
- quoteAmount nullable
- status: INTAKE / NEEDS_CLARIFICATION / APPROVED / REJECTED / IN_PRODUCTION / QA / DELIVERED / CLOSED
- rejectionReason nullable
- humanApprovedBy nullable
- createdAt
- updatedAt

### BuyerPreference

Fields:

- id
- customerId
- personaId nullable
- preferenceType
- preferenceValue
- confidence
- source
- createdAt

### ArchiveIngest

Represents a scan/import batch.

Fields:

- id
- sourceType: ZIP / TEXT / MANUAL / GENERATED_SUMMARY
- originalFilename
- canonicalName
- sha256
- fileSizeBytes
- uncompressedSizeBytes nullable
- duplicateGroupId nullable
- ingestStatus: DETECTED / SCANNED / NORMALIZED / NEEDS_REVIEW / APPROVED / REJECTED
- scanStartedAt
- scanFinishedAt nullable
- notes
- createdAt
- updatedAt

### RepoAudit

Fields:

- id
- archiveIngestId
- repoName
- canonicalRepoName
- sourcePath
- sourceFingerprint
- rootDir
- license
- licenseRisk: LOW / MEDIUM / HIGH / UNKNOWN
- languagesJson
- dependencyFilesJson
- importantFilesJson
- entriesCount
- filesCount
- dirsCount
- textFilesRead
- binaryFilesCount
- largestFilesJson
- summary
- usefulPatternsJson
- risksJson
- riskScore
- riskLevel: LOW / MEDIUM / HIGH / CRITICAL
- reuseDecision: DISCARD / REFERENCE_ONLY / EXTRACT_PATTERN / SAFE_TO_ADAPT
- humanApprovalRequired
- approvalStatus: NOT_REQUIRED / PENDING / APPROVED / REJECTED
- approvedBy nullable
- approvedAt nullable
- notes
- createdAt
- updatedAt

### RepoAuditFinding

Fields:

- id
- repoAuditId
- category: LICENSE / DEPENDENCY / SCRAPER / ADULT_RISK / SECURITY / SIZE / BINARY_MODEL / MISSING_DOCS / SAFE_PATTERN / DUPLICATE / UNKNOWN
- severity: INFO / LOW / MEDIUM / HIGH / CRITICAL
- finding
- evidence
- recommendedAction
- createdAt

### TaxonomyTerm

Fields:

- id
- divisionId nullable
- term
- normalizedTerm
- category
- allowedStatus: ALLOWED / REVIEW / BLOCKED
- source
- sourceRepoAuditId nullable
- riskNotes
- createdAt

### Approval

Generic human approval workflow.

Fields:

- id
- entityType
- entityId
- requestedBy
- reason
- status: PENDING / APPROVED / REJECTED
- decisionBy nullable
- decisionAt nullable
- notes
- createdAt

### AuditLog

Fields:

- id
- actor
- action
- entityType
- entityId
- beforeJson nullable
- afterJson nullable
- createdAt

---

## 7. Repo Ingest and Audit System — Mandatory

This is one of the biggest missing pieces. Build it properly.

### Goals

The repo-audit system must:

- scan uploaded zip files without executing unknown code
- calculate deterministic SHA-256 fingerprints
- dedupe exact duplicates
- normalize filename variants, e.g. `(1)`, `(1)(1)`, spaces, repeated suffixes
- group probable duplicates by canonical name and content fingerprint
- safely extract into `/research/imports/<canonical-name>-<short-hash>`
- scan bounded text content without loading huge files unbounded
- summarize languages, manifests, licenses, README files, dependency files, model/binary files
- identify useful patterns
- identify risks
- apply deterministic risk scoring
- create `ArchiveIngest`, `RepoAudit`, `RepoAuditFinding`, and `ComplianceFinding` records
- require human approval before any repo is marked safe to adapt
- write machine-readable summaries into `/research/summaries`

### Do not execute unknown code

Never run package scripts, Python files, shell scripts, notebooks, or binaries from imported repos.

### Canonical naming

Implement:

```ts
canonicalizeArchiveName(filename: string): string
```

It must normalize:

- `.zip` suffix
- duplicate suffixes like `(1)`, `(1)(1)`, `copy`, `-main`, `-master` where appropriate
- extra spaces
- case differences
- URL-safe variants

### Fingerprinting

Implement:

```ts
hashFileSha256(path: string): Promise<string>
createArchiveFingerprint(zipPath: string): Promise<string>
createRepoStructureFingerprint(entries: ZipEntry[]): string
```

The system must support:

- exact duplicate detection by archive SHA-256
- likely duplicate detection by canonical name + entry count + structure fingerprint

### Bounded large-text analysis

Implement a `BoundedTextReader`.

Requirements:

- never read huge text files fully by default
- configurable maximum bytes per file
- sample first/middle/last segments for very large files
- count terms in sampled and full-safe files
- track `truncated: true/false`
- track `sampleStrategy`
- record largest files

Default limits:

- max full text file read: 1 MB
- max sampled bytes per large file: 256 KB
- max files fully read per archive: 2,000 unless explicit override
- max total text bytes per archive: 25 MB unless explicit override

### Repo risk scoring

Implement deterministic risk scoring.

Example rubric:

Start at 0.

Add:

- +35 if scraper/downloader behavior is detected
- +30 if adult-risk terms appear in code paths or source lists
- +30 if no license is found
- +25 if license is unknown/restrictive/noncommercial/AGPL for commercial app reuse
- +25 if binary model weights exist
- +20 if security-sensitive terms appear, such as token, cookie, password, proxy, api_key, secret
- +20 if large external URL lists exist
- +20 if repo claims “uncensored/no limits” without implementation substance
- +15 if dependency manifests use stale or deprecated frameworks
- +15 if README-only/marketing-shell repo
- +10 if tests are missing
- +10 if package scripts exist that could mutate/download external data
- +10 if repo is unrelated to media/generation/classification/governance

Subtract:

- -10 if license is clear permissive and implementation is small
- -10 if tests are present
- -10 if docs clearly explain safe usage
- -15 if repo is a pure classifier/reference with no downloader behavior

Risk levels:

- 0–24 LOW
- 25–49 MEDIUM
- 50–79 HIGH
- 80+ CRITICAL

Reuse decision rules:

- CRITICAL -> DISCARD or REFERENCE_ONLY
- HIGH -> REFERENCE_ONLY unless approved
- MEDIUM -> EXTRACT_PATTERN unless approved
- LOW -> EXTRACT_PATTERN or SAFE_TO_ADAPT after review
- Any scraper/downloader touching real adult content -> REFERENCE_ONLY or DISCARD
- Any noncommercial/AGPL/unknown license -> REFERENCE_ONLY until approved
- Any README-only repo -> DISCARD_CODE_REFERENCE_COPY

### Repo-ingest compliance checks

Add compliance rules for repository ingestion:

- scraper targeting real creator/adult content -> RED / BLOCK_DIRECT_REUSE
- duplicated archive -> YELLOW / DEDUPE
- missing license -> YELLOW or RED depending risk
- noncommercial license -> RED for commercial code reuse
- AGPL -> YELLOW/RED depending reuse mode
- binary model weights -> YELLOW / REQUIRE_MODEL_REVIEW
- external URL corpus -> YELLOW / TAXONOMY_ONLY
- nudify/deepfake/nonconsensual terms -> RED / BLOCK_DIRECT_REUSE
- README-only shell -> YELLOW / MARKET_RESEARCH_ONLY

### Repo-audit UI

`/repo-audit` must include:

- archive list
- canonical name
- SHA-256 short hash
- duplicate status
- risk score
- risk level
- reuse decision
- approval status
- useful patterns
- risks
- findings
- action buttons:
  - Scan
  - Normalize
  - View Findings
  - Mark Reference Only
  - Request Approval
  - Approve Pattern Extraction
  - Reject Direct Reuse

No action should execute imported code.

---

## 8. Taxonomy System — Mandatory

Build `/packages/taxonomy` and `/taxonomy` UI behavior.

The system should extract category/source language from reference files, but never download content.

Functions:

```ts
normalizeTaxonomyTerm(term: string): string
classifyTaxonomyTerm(term: string): 'ALLOWED' | 'REVIEW' | 'BLOCKED'
extractTaxonomyFromRepoAudit(repoAuditId: string): Promise<TaxonomyTerm[]>
```

Use taxonomy for:

- allowed content categories
- market segmentation
- content tagging
- compliance blocklist construction
- persona-positioning research
- custom request classification

Blocked taxonomy must include:

- minor/underage-coded terms
- “barely legal” framing
- teen terms in adult context
- incest/coercion/nonconsensual categories
- real-person/deepfake/nudify language
- illegal categories

Review taxonomy includes:

- college/sorority/cheer in adult context
- intense taboo-adjacent terms
- high platform-risk terms
- ambiguous age-appearance terms

Allowed taxonomy includes:

- SFW fitness
- cooking
- product demo
- lifestyle
- gym
- adult-safe 21+ synthetic persona labels
- camera/realism descriptors
- general aesthetic categories

---

## 9. Compliance Engine — Mandatory

Implement `/packages/compliance`.

Core functions:

```ts
evaluateText(input: string, context: ComplianceContext): ComplianceResult
evaluatePersona(persona: PersonaInput): ComplianceResult
evaluateCustomRequest(request: CustomRequestInput): ComplianceResult
evaluateBrief(brief: ContentBriefInput): ComplianceResult
evaluatePostPlan(postPlan: PostPlanInput): ComplianceResult
evaluateRepoIngest(repo: RepoAuditInput): ComplianceResult
evaluateTaxonomyTerm(term: string, context: ComplianceContext): ComplianceResult
```

Compliance result shape:

```ts
type ComplianceResult = {
  severity: 'GREEN' | 'YELLOW' | 'RED'
  action: 'ALLOW' | 'WARN' | 'REQUIRE_REVIEW' | 'BLOCK'
  humanApprovalRequired: boolean
  matchedRules: MatchedRule[]
  findings: string[]
  recommendedNextStep: string
}
```

Seed compliance rules for:

- underage-coded language
- hidden-AI deception
- real-person likeness
- celebrity/public figure likeness
- nonconsensual/deepfake/nudify
- scraping real content
- mass account manipulation
- automated spam
- platform-specific adult risk
- repo-ingest risk
- taxonomy risk
- adult/SFW division contamination

---

## 10. Agent System — Mandatory

Seed these agents:

1. Jarvis / Commander
2. Scout / Research Agent
3. Strategist / Experiment Designer
4. Casting Director / Persona Integrity Agent
5. Muse / Writer Agent
6. Producer / Generation Brief Agent
7. Continuity QA Agent
8. Compliance QA Agent
9. Ava / Publisher Agent
10. Bobby / Growth Analyst Agent
11. Archivist Agent
12. Sarah / Support Agent
13. Tal / Developer Agent
14. Repo Auditor Agent
15. Taxonomist Agent
16. Policy Watch Agent
17. Claude Handoff Agent

Each agent must include:

- division scope
- allowed actions
- forbidden actions
- inputs
- outputs
- escalation triggers
- system prompt template
- sample tasks
- seeded example run

Build `/agents` UI to inspect agents and trigger mock runs.

---

## 11. Persona System — Mandatory

Build `/personas`.

Support at least two seeded personas:

### Persona A — SFW UGC model

Purpose:

- fitness
- cooking
- product demos
- lifestyle
- affiliate/product promotion
- inspiration

Hard separation from adult division.

### Persona B — Adult Synthetic Creator model

Purpose:

- original 21+ synthetic creator
- compliance-controlled request planning
- adult-safe teaser planning
- platform-specific review

Must include clear synthetic/AI disclosure metadata. Must not include underage-coded language. Must not include explicit prompts or explicit media in seed data.

Persona version fields must include:

- age-safe identity statement
- visual identity rules
- body/style rules
- wardrobe grammar
- camera grammar
- voice grammar
- response length rules
- prohibited traits
- disclosure rules
- platform boundaries
- division separation rules

---

## 12. Custom Request Engine — Mandatory

Build `/custom-requests`.

Inputs:

- customer handle
- platform
- division
- persona optional
- raw request text
- budget optional
- deadline optional

Parser outputs:

- requestType
- division
- persona
- format
- setting
- mood
- outfitTheme
- cameraStyle
- intensityCategory
- mustHaveDetails
- hardNoDetails
- deadline
- budget
- platformDelivery
- complianceFlags
- clarificationQuestions
- recommendedStatus

For adult requests:

- always require human review
- run compliance engine
- reject red categories
- route yellow categories to review
- create safe response drafts
- never produce explicit sexual scripts in MVP

Generate:

- structured request summary
- compliance decision
- production brief draft
- customer response draft
- rejection response if blocked
- clarification response if incomplete

---

## 13. Brief Builder — Mandatory

Build `/briefs`.

Brief types:

- OPERATOR_REEL
- SFW_UGC_AD
- FITNESS_CLIP
- COOKING_PRODUCT_DEMO
- LIFESTYLE_POST
- ADULT_SAFE_TEASER
- CUSTOM_REQUEST
- PLATFORM_TEST
- REPO_AUDIT_SUMMARY

Each brief must include:

- division
- persona optional
- objective
- platform target
- target audience
- hook
- concept
- shot list
- prompt
- negative prompt
- realism notes
- compliance status
- QA status
- pipeline status

Prompt content in seed/demo data must be non-explicit.

---

## 14. Realism QA System — Mandatory

Build `/packages/qa` and docs.

Core realism principle:

AI content looks fake when it is too perfect. Human-looking synthetic content often needs accidental capture, ordinary lighting, imperfect framing, background clutter, compression, motion blur, non-influencer posture, and natural skin texture.

Implement checklist scoring:

- identity lock
- camera realism
- lighting realism
- posture realism
- skin realism
- background clutter
- non-glamour intent
- platform-native format
- face consistency
- hand/anatomy risk placeholder
- over-polish risk
- age-appearance risk
- division fit
- platform fit

Functions:

```ts
scoreRealismBrief(brief): QAResult
scoreContinuityBrief(brief, persona): QAResult
scorePlatformEligibility(briefOrAsset, platform): QAResult
```

Create docs/realism-prompting-guide.md with prompt patterns for:

- operator command-center reels
- SFW fitness UGC
- cooking/product demos
- lifestyle phone footage
- broadcast/crowd realism
- adult-safe teaser realism without explicit content

---

## 15. Asset Vault — Mandatory

Build `/assets`.

MVP supports placeholder upload/asset records only. Do not require actual generated media.

Asset metadata must include:

- division
- persona
- brief
- generation job
- title
- tags
- platform eligibility
- QA score
- compliance status
- reuse potential
- rejection reason
- metadata JSON

Asset vault must help avoid folder chaos six months from now.

---

## 16. Platform Strategy and Publishing Drafts — Mandatory

Build `/platforms` and `/post-plans` if feasible.

Platform profiles:

- Internal
- Reddit
- X
- Fanvue
- Telegram
- OnlyFans Test
- Instagram
- TikTok
- YouTube
- LinkedIn optional for operator brand

For each platform:

- eligible divisions
- adult allowed flag
- AI disclosure required flag
- sensitive media flag
- automation risk
- publishing mode
- notes

MVP publishing must be `DRAFT_ONLY`. No live posting.

Create post plans that include:

- caption
- hashtags
- platform
- division
- asset/brief
- compliance result
- approval status
- schedule window
- status

---

## 17. Experiments and Analytics — Mandatory

Build `/experiments`.

Experiment model must track:

- hypothesis
- division
- platform
- persona
- content type
- success metric
- decision rule
- start/end dates
- status
- result summary

Seed experiments:

- Operator reel: agent roll call
- SFW UGC: protein meal prep product demo
- SFW UGC: gym mirror realism test
- Adult synthetic: AI-disclosed 21+ teaser positioning test
- Repo audit: classifier repo integration decision
- Taxonomy: allowed/review/blocked category map

Bobby/Growth Analyst must produce a mock scale/cut/watch report.

---

## 18. Dashboard — Mandatory

Build `/dashboard` command center.

Show:

- active divisions
- agent status
- pending approvals
- repo audits needing review
- compliance red/yellow findings
- active briefs by status
- custom requests by status
- assets by QA status
- experiments by status
- today’s operating loop
- scale/cut/watch summary
- Claude handoff status

It should feel like an operations command center, not a generic admin page.

Design:

- dark theme
- clean data cards
- high information density
- calm executive view
- no tacky adult branding
- no explicit imagery
- no scam-like “uncensored/no limits” copy

---

## 19. Approval Workflow — Mandatory

Create approval logic for:

- adult custom requests
- repo reuse decisions
- high-risk taxonomy terms
- platform-sensitive post plans
- division boundary exceptions
- connector activation

UI must show approval state and block unsafe next actions.

---

## 20. Claude Handoff Package — Mandatory

This is critical. The user intends to give Codex output to Claude next.

Create `/docs/claude-handoff.md` and a generated summary file via:

```bash
npm run handoff:claude
```

Claude handoff must include:

- what was built
- repo structure
- setup commands
- app routes
- data models
- package responsibilities
- known limitations
- next sprint tasks
- exact files Claude should inspect first
- current risk register
- open decisions
- safe continuation instructions
- what not to build
- commands Claude should run before making changes
- test status
- CI status
- repo-audit status
- recommended next 20 tasks in dependency order

Also create `/docs/sprint-board-day-1-to-14.md`.

---

## 21. Day 1–14 Sprint Board — Mandatory

Create a task board with dependencies and acceptance criteria.

### Day 1 — Scaffold and local boot

Deliver:

- monorepo scaffold
- Next.js app
- Docker Compose Postgres
- Prisma setup
- basic dashboard route
- README startup commands

Acceptance:

- app boots locally
- database connects
- lint/typecheck baseline works

### Day 2 — Data model and seed

Deliver:

- Prisma models
- migrations
- seed divisions, agents, platforms, compliance rules, personas, experiments

Acceptance:

- `npm run db:seed` works
- dashboard shows seeded data

### Day 3 — Compliance engine

Deliver:

- text/persona/request/brief/repo evaluators
- red/yellow/green actions
- tests

Acceptance:

- underage-coded terms blocked
- hidden-AI deception blocked
- scraping/direct-reuse flagged

### Day 4 — Repo audit scanner

Deliver:

- zip scanner
- SHA-256 hashing
- canonical names
- safe extraction
- bounded text reader

Acceptance:

- archives scanned without executing code
- duplicate variants grouped

### Day 5 — Repo risk scoring and UI

Deliver:

- deterministic risk rubric
- RepoAudit records
- RepoAuditFinding records
- `/repo-audit` page

Acceptance:

- risk score visible
- reuse decision visible
- approval required where needed

### Day 6 — Taxonomy extraction

Deliver:

- taxonomy normalizer
- allowed/review/blocked classifier
- extraction from URL/category repos

Acceptance:

- risky categories blocked/reviewed
- allowed market terms stored safely

### Day 7 — Agents and operating loop

Deliver:

- agents page
- mock agent runs
- daily operating loop card

Acceptance:

- each agent has role/actions/escalation
- mock runs create records

### Day 8 — Persona system

Deliver:

- personas page
- persona versions
- SFW persona
- adult 21+ synthetic persona

Acceptance:

- division separation enforced
- adult persona requires disclosure metadata

### Day 9 — Brief builder

Deliver:

- briefs page
- content types
- pipeline status
- compliance/QA checks

Acceptance:

- create/edit brief
- evaluate brief
- create prompt recipe

### Day 10 — Custom requests

Deliver:

- request intake
- parser
- compliance decision
- clarification/rejection drafts

Acceptance:

- adult requests require human review
- red requests rejected

### Day 11 — Asset vault and QA

Deliver:

- placeholder assets
- QA reports
- realism/continuity checklist

Acceptance:

- asset metadata works
- QA status visible

### Day 12 — Platforms and experiments

Deliver:

- platform profiles
- post plans draft-only
- experiments page
- scale/cut/watch mock report

Acceptance:

- publishing is draft-only
- experiment status works

### Day 13 — Tests, CI, hardening

Deliver:

- unit tests
- smoke tests
- CI workflow
- validate rules script

Acceptance:

- lint/typecheck/test/build pass or documented blockers

### Day 14 — Claude handoff and final report

Deliver:

- docs finalized
- Claude handoff generated
- next sprint board
- failure-mode register

Acceptance:

- Claude can continue without asking what exists

---

## 22. API / Route Expectations

Implement app routes/pages:

- `/dashboard`
- `/agents`
- `/personas`
- `/briefs`
- `/custom-requests`
- `/assets`
- `/experiments`
- `/platforms`
- `/repo-audit`
- `/taxonomy`
- `/approvals`
- `/settings`

API/server action coverage:

- create/update persona
- create/update brief
- evaluate compliance
- create custom request
- parse custom request
- create QA report
- scan repo archives
- normalize repo ingest
- approve/reject repo reuse
- extract taxonomy
- create experiment
- create post plan draft
- generate Claude handoff

---

## 23. Tests — Mandatory

Add unit tests for:

- compliance rule matching
- underage-coded terms
- hidden AI deception language
- real-person likeness request detection
- nonconsensual/nudify request detection
- repo canonical name normalization
- exact duplicate archive detection
- filename variant grouping
- bounded text reader behavior
- repo risk scoring
- repo reuse decision classifier
- taxonomy term classification
- persona validation
- adult persona disclosure requirement
- SFW/adult division contamination prevention
- custom request parser
- brief compliance evaluator
- post plan platform eligibility
- approval gate blocking unsafe actions

Add smoke tests for:

- dashboard loads
- agents page loads
- personas page loads
- briefs page loads
- custom requests page loads
- repo audit page loads
- taxonomy page loads
- compliance evaluation works
- seed data exists

---

## 24. CI — Mandatory

Create `.github/workflows/ci.yml` with:

- install
- generate Prisma client
- lint
- typecheck
- unit tests
- build

Optional smoke tests can be local if Playwright CI setup is too heavy, but document exact command.

---

## 25. Documentation — Mandatory

Create all listed docs. They must be specific, not generic.

Docs must include:

- architecture
- product spec
- working program design
- agent system
- compliance policy
- repository ingest policy
- taxonomy system
- persona design
- custom request pipeline
- content pipeline
- asset vault
- platform strategy
- QA/realism guide
- analytics system
- repo audit system
- failure-mode register
- 6-month roadmap
- 12-month moat
- Claude handoff
- Day 1–14 sprint board

The failure-mode register must include at least:

1. visual inconsistency
2. generic positioning
3. platform ban
4. payment fragility
5. custom request chaos
6. over-automation
7. AI-sounding replies
8. audience mismatch
9. legal/IP contamination
10. age-coded branding
11. content sameness
12. no metrics
13. no asset metadata
14. no platform backup
15. scaling too early
16. adult/SFW brand contamination
17. unsafe scraper reuse
18. mass-account manipulation risk
19. hidden AI deception risk
20. lack of human approval on sensitive content
21. duplicated repo-ingest noise
22. huge text corpus memory blowups
23. license contamination
24. classifier false confidence
25. stale platform policies

Each failure mode needs:

- description
- early warning signs
- prevention
- mitigation
- owner agent

---

## 26. Hard Exit Criteria

Do not consider the sprint complete unless the repo includes:

1. Local app scaffold.
2. Database schema.
3. Migrations or Prisma setup.
4. Seed data.
5. Dashboard.
6. Agent roster.
7. Persona manager.
8. Brief builder.
9. Custom request intake.
10. Compliance engine.
11. Repo audit scanner.
12. Repo dedupe and normalization.
13. Repo risk scoring.
14. Repo approval gate.
15. Taxonomy extraction/classification.
16. Asset vault placeholder.
17. QA checklist.
18. Platform profiles.
19. Experiment tracker.
20. Approval workflow.
21. Claude handoff doc.
22. Day 1–14 sprint board.
23. Failure-mode register.
24. Unit tests.
25. Smoke tests or documented smoke-test plan.
26. CI workflow.
27. README with exact commands.
28. No unsafe live posting.
29. No explicit media.
30. No hidden AI deception workflow.
31. No code execution from imported zips.
32. All risky operations default to human review.

If you cannot complete all items in one pass, complete the highest-leverage runnable subset and document unfinished items in `/docs/claude-handoff.md` with exact file paths and next steps.

---

## 27. Implementation Order

Work in this exact order:

1. Scaffold repo and app.
2. Add Docker/Postgres/Prisma.
3. Add core enums/Zod schemas.
4. Add compliance package.
5. Add repo-audit package.
6. Add data models and seed.
7. Add dashboard UI.
8. Add repo-audit UI.
9. Add taxonomy package/UI.
10. Add agents package/UI.
11. Add personas UI.
12. Add briefs UI.
13. Add custom request UI.
14. Add asset vault UI.
15. Add platforms/experiments UI.
16. Add approvals UI.
17. Add tests.
18. Add CI.
19. Add docs.
20. Generate Claude handoff.

---

## 28. Coding Standards

- Prefer explicit types.
- Use Zod at boundaries.
- Keep business rules in packages, not buried in React components.
- Use deterministic functions where possible.
- Avoid magic strings; use enums/constants.
- Do not add external services unless mocked/stubbed.
- Do not store secrets.
- Do not execute imported code.
- Keep generated demo content SFW and non-explicit.
- Make sensitive adult division visible as a compliance-controlled workflow, not a porn-branded UI.

---

## 29. Final Response Required From Codex

When finished, report:

- what was built
- exact commands run
- which commands passed/failed
- file tree summary
- core models implemented
- routes implemented
- tests implemented
- repo-audit behavior
- compliance behavior
- known gaps
- next 20 tasks for Claude
- risks Claude must not ignore

Also tell the user exactly where to start:

1. Run setup commands.
2. Open dashboard.
3. Scan input zips.
4. Review repo audits.
5. Approve/extract safe patterns.
6. Continue with Claude using `/docs/claude-handoff.md`.

Start now. Build the working program design.

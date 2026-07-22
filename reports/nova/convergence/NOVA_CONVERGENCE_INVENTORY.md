# NOVA Convergence Inventory

Deterministic branch inventory produced by `scripts/nova/build-convergence-inventory.mjs`.

- base: c19a00d86fe45d7e093f3f9ec688d2614e7f87b4
- head: fbc3cfe0ccea23d5d9657248ac374945c1dec9c4
- merge-base: bf931ab949934faea4208e7746f2325c2d9acb50
- changed files: 70
- collision scan: **COMPLETE_COLLISIONS_FOUND**

## Collisions

- `forbidden-prefix-outside-owner`: `AiPlatformEcosystemSummary` at `apps/web/lib/opportunity-engine/platform-ecosystems.ts`
- `forbidden-prefix-outside-owner`: `AiPlatformId` at `apps/web/lib/opportunity-engine/platform-ecosystems.ts`
- `forbidden-prefix-outside-owner`: `AiPlatformOpportunity` at `apps/web/lib/opportunity-engine/platform-ecosystems.ts`

## Changed files

| status | path | head blob |
| --- | --- | --- |
| A | `.github/workflows/nova-verification.yml` | d02c10831f5dab94072212370376271d1d7ea38d |
| A | `.nova-runtime/.gitignore` | d6b7ef32c8478a48c3994dcadc86837f4371184d |
| A | `apps/web/__tests__/nova-agent-contract.test.ts` | 2dc55e97b330318b30f2cdc3df867d9ccfb0101d |
| A | `apps/web/__tests__/nova-capability-governor.test.ts` | f4f771f9258252a288c0577eeef77132fa0e28d5 |
| A | `apps/web/__tests__/nova-capability-inventory.test.ts` | 3529ddb24617cabc34e36d5d7951a79df0d8bdac |
| A | `apps/web/__tests__/nova-founder-command.test.ts` | ed9218ec47dc76c895b5b05917c22364382c6e0d |
| A | `apps/web/__tests__/nova-founder-work-seed.test.ts` | 61928dc950af2f5e0dafd68848335cbf4e043078 |
| A | `apps/web/__tests__/nova-mcp-endpoint.test.ts` | 804ad0348c6f3bc767fce2a04ea663a4b43f8c48 |
| A | `apps/web/__tests__/nova-opportunity-engine.test.ts` | 752df0798262310f59370750b010f88774bed60b |
| A | `apps/web/__tests__/nova-opportunity-source-system.test.ts` | 9709c33f94e8fb895ce534f72c848d2599cca8a7 |
| A | `apps/web/__tests__/nova-platform-ecosystems-extended.test.ts` | 56b02cab33a828b1139920a513dbf8b29dd6e6b3 |
| A | `apps/web/__tests__/nova-platform-ecosystems.test.ts` | 7c43fa5896f6dd73e0a9d81550d59798de6037c6 |
| A | `apps/web/__tests__/nova-requirements-traceability.test.ts` | 408437a3f1ecd9e7db0aab33051c78ae8e1a6b53 |
| A | `apps/web/__tests__/nova-source-fetch.test.ts` | a4a63cff503611791dfd0980e6e93b92a309f32e |
| A | `apps/web/__tests__/nova-source-monitor.test.ts` | aeaa930c8c0aa6efe097f448dc0bee555f3d88b6 |
| A | `apps/web/__tests__/nova-subagents.test.ts` | 31a62f91e4e7c6bdec57617e60588c41dcd61f0d |
| A | `apps/web/__tests__/nova-user-source-intake.test.ts` | fa6ad0d35c207ff2979083b29622141b8c9a2d02 |
| M | `apps/web/app/cockpit/layout.tsx` | 6b5374d6a40320090e4de0236f0f4aaaf6874efc |
| A | `apps/web/app/cockpit/nova/founder/page.tsx` | 297fead65973cbf4ecf794e3d8bb2fd88856746b |
| A | `apps/web/app/cockpit/nova/page.tsx` | 512d31f3529178c15a9c7c7bb686172fab6b9291 |
| M | `apps/web/components/cockpit/cockpit-command-palette.tsx` | 8b138478dad9d3f10cc96bb310e16868513462f2 |
| A | `apps/web/lib/jarvis/nova-agent.ts` | fc54c6e57dad26cedd7997fe14ff21e211d22877 |
| A | `apps/web/lib/opportunity-engine/capability-governor.ts` | d1348d753c3824cc7c9404e082f9598d220680b5 |
| A | `apps/web/lib/opportunity-engine/capability-inventory.ts` | ac9cfb645da7af7532701fabea0a0eef44dfcdbc |
| A | `apps/web/lib/opportunity-engine/change-detection.ts` | 01458a3ecef50ba831010d935acfde260470ac4e |
| A | `apps/web/lib/opportunity-engine/evidence.ts` | f12e65ebc0ae3c5c2d0406b61b0942f11f2eac37 |
| A | `apps/web/lib/opportunity-engine/experiment.ts` | 52f844ae230e1182bfd3c62301c5f427861b986f |
| A | `apps/web/lib/opportunity-engine/founder-command.ts` | 901b4135a4684b106f6ed857701f1aa2ab9ed237 |
| A | `apps/web/lib/opportunity-engine/founder-work-seed.ts` | 7571cf1dbba4fc4bb216575cadde49422b892419 |
| A | `apps/web/lib/opportunity-engine/index.ts` | 063728b59c6177ca8e9af2219285d68963eff265 |
| A | `apps/web/lib/opportunity-engine/learning.ts` | 880d1b2e76e82c459e8c99b5bddb4a4fc3eb2f6f |
| A | `apps/web/lib/opportunity-engine/lifecycle.ts` | aaaf63828d34d02779c0d35f1f72e4a8410c8f5e |
| A | `apps/web/lib/opportunity-engine/monetization.ts` | 423708ee3eb5a80ea1972015b8f846170d228d34 |
| A | `apps/web/lib/opportunity-engine/nova-agent.ts` | 0e14a5b855e614ff721964e82a0df1fabd0ce085 |
| A | `apps/web/lib/opportunity-engine/nova-subagents.ts` | b0c5916a92defa8a5c766a702cf598ce1fb734d1 |
| A | `apps/web/lib/opportunity-engine/personal-ai-income.ts` | a9e612138a06857a9f934d6e0ffe9c7931fa5e20 |
| A | `apps/web/lib/opportunity-engine/pipeline.ts` | 5f8c377133f31c41364f7002f0506c8510032504 |
| A | `apps/web/lib/opportunity-engine/platform-ecosystems-extended.ts` | 4ac05310e96d79a14925c7db1ea677918e40e9d2 |
| A | `apps/web/lib/opportunity-engine/platform-ecosystems.ts` | 2555f1d159742909424dd117b3b78c02c71cd7c1 |
| A | `apps/web/lib/opportunity-engine/policy.ts` | c04c8c6405ee30f591bb20e2a117b1293f75675e |
| A | `apps/web/lib/opportunity-engine/requirements-traceability.ts` | c505cf49aded1eacfe8e24a8b3e207bafcace89b |
| A | `apps/web/lib/opportunity-engine/scoring.ts` | b1876d7f8da7f67b1ee6ae88290466713aa21a31 |
| A | `apps/web/lib/opportunity-engine/source-adapters.ts` | e064a01f363b32e24cacff9742aeb0ecb53e22c7 |
| A | `apps/web/lib/opportunity-engine/source-fetch.ts` | 6f7075971f686546481d40955beff126f4c80b1b |
| A | `apps/web/lib/opportunity-engine/source-intake.ts` | c8340df938c5687d73a16e6f81423579a0106b70 |
| A | `apps/web/lib/opportunity-engine/source-monitor.ts` | 6181ed7ef4d37d383850775025793425e2e4aabc |
| A | `apps/web/lib/opportunity-engine/source-registry.ts` | 6c5531fc2f1817a7e354ece6e222ad79c9f21e88 |
| A | `apps/web/lib/opportunity-engine/source-schedule.ts` | e0badd1fb65e628ba5c5e3f5d336f2e19fbc0625 |
| A | `apps/web/lib/opportunity-engine/training-rights.ts` | 54d84fe06044946f5a0143ddcb02050b9836738a |
| A | `apps/web/lib/opportunity-engine/types.ts` | 78af1adee3b75d234b08083fbb1bb661d00cf753 |
| A | `data/nova/ai-capability-inventory-2026-07-21.json` | dfc294edfe4aa52a249f5da661842ee6ce24285f |
| A | `data/nova/ai-capability-inventory-additions-2026-07-21.json` | ecc0e368f2726b35407bea7703809a5e5acf7070 |
| A | `data/nova/official-source-registry.json` | ef17a65169c7c6236962d3274473a7433f873962 |
| A | `data/nova/requirements-traceability-2026-07-21.json` | 985e60ed1cc8e544d4f0f598cdd232a528d1aa32 |
| A | `data/nova/user-supplied-source-intake.json` | 72f8f04659c0532810fb6d7a5158d9d834813577 |
| A | `docs/ai/nova/CODEX_NOVA_EXECUTION_HANDOFF_2026-07-21.md` | 5c85a38ef53bbeeff6d385496936d34b8bbc87f0 |
| A | `docs/ai/nova/CODEX_START_PROMPT_2026-07-21.md` | d3103948e461ff82178de5fbdc90213f0f0fc994 |
| A | `docs/ai/nova/NOVA_AI_OPPORTUNITY_ENGINE_2026-07-21.md` | e7cf51ea9063e3f26ca40c09c68e50a456e912cb |
| A | `docs/ai/nova/NOVA_PHASE_2_AUTONOMOUS_INTELLIGENCE_DIRECTIVE_2026-07-21.md` | 3353797f939586a5d9ee9a3b94365e6106c81e91 |
| A | `docs/ai/nova/README.md` | 32e6b32127b50482ef95f8e65250158a025cd98e |
| A | `docs/submissions/openai-build-week-2026/CODEX_FINAL_EXTENSION_PROMPT.md` | 72e00fdb5744aa38a6c917e443af1a23753dbf98 |
| A | `docs/submissions/openai-build-week-2026/NOVA_SUBMISSION_PACKET.md` | 4014ad03627eee37017ae52806a642044af8b443 |
| M | `package.json` | a6d70963ca592c9c34cacbae25d5c81fd818d9a2 |
| A | `scripts/nova/change-intelligence.mjs` | 4674ac1becbe3e15049e0f9d4808372d550e8165 |
| A | `scripts/nova/install-windows-task.ps1` | 7886144aed6afd715ddd85ada0d139f6fb5c6f2f |
| A | `scripts/nova/nova-intelligence.test.mjs` | 2772c8e5784e8a4ad22b36db1fae984b6c1a049d |
| A | `scripts/nova/run-cycle.mjs` | 41fbf2b53ab87d092e5274c2c3f39e37ffd811af |
| A | `scripts/nova/run-cycle.ps1` | 962213a907a1783bed770646adffb1687f0bb41a |
| A | `scripts/nova/source-doctor.mjs` | 80bdc828e8c3e8741b4308b24c8f3b055cb5d255 |
| A | `scripts/nova/source-worker.mjs` | 1b85fa0e6f46ed941563f8a12d4b5f967c10c855 |

## Exported TypeScript symbols (changed files, head)

### `apps/web/__tests__/nova-agent-contract.test.ts`

_no exports_

### `apps/web/__tests__/nova-capability-governor.test.ts`

_no exports_

### `apps/web/__tests__/nova-capability-inventory.test.ts`

_no exports_

### `apps/web/__tests__/nova-founder-command.test.ts`

_no exports_

### `apps/web/__tests__/nova-founder-work-seed.test.ts`

_no exports_

### `apps/web/__tests__/nova-mcp-endpoint.test.ts`

_no exports_

### `apps/web/__tests__/nova-opportunity-engine.test.ts`

_no exports_

### `apps/web/__tests__/nova-opportunity-source-system.test.ts`

_no exports_

### `apps/web/__tests__/nova-platform-ecosystems-extended.test.ts`

_no exports_

### `apps/web/__tests__/nova-platform-ecosystems.test.ts`

_no exports_

### `apps/web/__tests__/nova-requirements-traceability.test.ts`

_no exports_

### `apps/web/__tests__/nova-source-fetch.test.ts`

_no exports_

### `apps/web/__tests__/nova-source-monitor.test.ts`

_no exports_

### `apps/web/__tests__/nova-subagents.test.ts`

_no exports_

### `apps/web/__tests__/nova-user-source-intake.test.ts`

_no exports_

### `apps/web/app/cockpit/layout.tsx`

- `default` (function)
- `metadata` (const)

### `apps/web/app/cockpit/nova/founder/page.tsx`

- `default` (function)
- `dynamic` (const)

### `apps/web/app/cockpit/nova/page.tsx`

- `default` (function)
- `dynamic` (const)

### `apps/web/components/cockpit/cockpit-command-palette.tsx`

- `COCKPIT_COMMANDS` (const)
- `CockpitCommand` (type)
- `CockpitCommandPalette` (function)

### `apps/web/lib/jarvis/nova-agent.ts`

- `NOVA_AGENT_PROFILE` (const)
- `NOVA_ALLOWED_ACTIONS` (const)
- `NOVA_FORBIDDEN_ACTIONS` (const)
- `NOVA_SUBAGENTS` (const)
- `NovaAction` (type)
- `NovaActionContext` (interface)
- `NovaActionDecision` (interface)
- `NovaAgentProfile` (interface)
- `NovaAllowedAction` (type)
- `NovaCouncilPacket` (interface)
- `NovaEventClass` (type)
- `NovaForbiddenAction` (type)
- `NovaReviewRoute` (interface)
- `NovaRunMode` (type)
- `NovaRuntimeStatus` (type)
- `NovaSubagentCodename` (type)
- `NovaSubagentProfile` (interface)
- `buildNovaCouncilPacket` (function)
- `buildNovaReviewRoute` (function)
- `decideNovaAction` (function)

### `apps/web/lib/opportunity-engine/capability-governor.ts`

- `CapabilityRiskFlag` (type)
- `CapabilityRoute` (interface)
- `CapabilityTaskClass` (type)
- `CapabilityTrustTier` (type)
- `GovernedCapabilityCandidate` (interface)
- `classifyCapabilityTrust` (function)
- `detectCapabilityRisk` (function)
- `routeCapabilities` (function)

### `apps/web/lib/opportunity-engine/capability-inventory.ts`

- `CapabilityCaptureBatch` (type)
- `CapabilityConnectionState` (type)
- `CapabilityInventoryEntry` (interface)
- `CapabilityInventorySummary` (interface)
- `CapabilityInventorySurface` (type)
- `findCapabilitiesByName` (function)
- `getAdditionalClaudePlugins` (function)
- `getCapabilityInventory` (function)
- `summarizeCapabilityInventory` (function)
- `validateCapabilityInventory` (function)

### `apps/web/lib/opportunity-engine/change-detection.ts`

- `detectMaterialChanges` (function)
- `observationKey` (function)

### `apps/web/lib/opportunity-engine/evidence.ts`

- `assessEvidence` (function)

### `apps/web/lib/opportunity-engine/experiment.ts`

- `buildExperiment` (function)

### `apps/web/lib/opportunity-engine/founder-command.ts`

- `FOUNDER_OPERATING_POLICY` (const)
- `FounderDailyBrief` (interface)
- `FounderOperatingPolicy` (interface)
- `FounderQueueDecision` (interface)
- `FounderWorkAuthority` (type)
- `FounderWorkItem` (interface)
- `FounderWorkLane` (type)
- `FounderWorkState` (type)
- `NightlyAutopsy` (interface)
- `NightlyAutopsyInput` (interface)
- `buildFounderDailyBrief` (function)
- `buildFounderQueue` (function)
- `buildNightlyAutopsy` (function)
- `scoreFounderWork` (function)
- `validateFounderWorkItem` (function)

### `apps/web/lib/opportunity-engine/founder-work-seed.ts`

- `FOUNDER_WORK_SEED` (const)

### `apps/web/lib/opportunity-engine/index.ts`

- `* from ./capability-governor` (star-reexport)
- `* from ./capability-inventory` (star-reexport)
- `* from ./change-detection` (star-reexport)
- `* from ./evidence` (star-reexport)
- `* from ./experiment` (star-reexport)
- `* from ./founder-command` (star-reexport)
- `* from ./founder-work-seed` (star-reexport)
- `* from ./learning` (star-reexport)
- `* from ./lifecycle` (star-reexport)
- `* from ./monetization` (star-reexport)
- `* from ./nova-agent` (star-reexport)
- `* from ./nova-subagents` (star-reexport)
- `* from ./personal-ai-income` (star-reexport)
- `* from ./pipeline` (star-reexport)
- `* from ./platform-ecosystems` (star-reexport)
- `* from ./platform-ecosystems-extended` (star-reexport)
- `* from ./policy` (star-reexport)
- `* from ./requirements-traceability` (star-reexport)
- `* from ./scoring` (star-reexport)
- `* from ./source-adapters` (star-reexport)
- `* from ./source-fetch` (star-reexport)
- `* from ./source-intake` (star-reexport)
- `* from ./source-monitor` (star-reexport)
- `* from ./source-registry` (star-reexport)
- `* from ./source-schedule` (star-reexport)
- `* from ./training-rights` (star-reexport)
- `* from ./types` (star-reexport)

### `apps/web/lib/opportunity-engine/learning.ts`

- `buildLearningReport` (function)

### `apps/web/lib/opportunity-engine/lifecycle.ts`

- `assertLifecycleTransition` (function)
- `assertMoneyStateTransition` (function)
- `canTransitionLifecycle` (function)
- `canTransitionMoneyState` (function)

### `apps/web/lib/opportunity-engine/monetization.ts`

- `MONETIZATION_LANES` (const)
- `MonetizationLaneDefinition` (interface)
- `getMonetizationLane` (function)

### `apps/web/lib/opportunity-engine/nova-agent.ts`

- `NOVA_AGENT` (const)
- `NovaAlert` (interface)
- `NovaCycleInput` (interface)
- `NovaCycleResult` (interface)
- `NovaHandoff` (interface)
- `runNovaCycle` (function)

### `apps/web/lib/opportunity-engine/nova-subagents.ts`

- `NOVA_SUBAGENTS` (const)
- `NovaSubagentTemplate` (interface)
- `getNovaSubagent` (function)

### `apps/web/lib/opportunity-engine/personal-ai-income.ts`

- `PERSONAL_AI_INCOME_OPPORTUNITIES` (const)
- `PersonalAiIncomeOpportunity` (interface)
- `PersonalAiIncomeSummary` (interface)
- `PersonalIncomeOpportunityState` (type)
- `PersonalIncomePriority` (type)
- `PersonalIncomeType` (type)
- `summarizePersonalAiIncome` (function)
- `validatePersonalAiIncomeRegistry` (function)

### `apps/web/lib/opportunity-engine/pipeline.ts`

- `DEFAULT_PORTFOLIO_POLICY` (const)
- `PortfolioPolicy` (interface)
- `buildOpportunityPortfolio` (function)
- `evaluateOpportunity` (function)

### `apps/web/lib/opportunity-engine/platform-ecosystems-extended.ts`

- `EXTENDED_AI_PLATFORM_OPPORTUNITIES` (const)
- `ExtendedAiPlatformId` (type)
- `ExtendedAiPlatformOpportunity` (interface)
- `PlatformOpportunityView` (interface)
- `combinePlatformOpportunities` (function)
- `validateExtendedPlatformEcosystem` (function)

### `apps/web/lib/opportunity-engine/platform-ecosystems.ts`

- `AI_PLATFORM_OPPORTUNITIES` (const)
- `AiPlatformEcosystemSummary` (interface)
- `AiPlatformId` (type)
- `AiPlatformOpportunity` (interface)
- `PlatformOpportunityChannel` (type)
- `PlatformOpportunityState` (type)
- `PlatformPriority` (type)
- `PlatformValueType` (type)
- `getAiPlatformOpportunitiesByPriority` (function)
- `getAiPlatformOpportunity` (function)
- `summarizeAiPlatformEcosystem` (function)
- `validateAiPlatformEcosystem` (function)

### `apps/web/lib/opportunity-engine/policy.ts`

- `decidePolicy` (function)
- `findHardBlockers` (function)
- `requiredReviewsFor` (function)

### `apps/web/lib/opportunity-engine/requirements-traceability.ts`

- `RequirementState` (type)
- `RequirementsTraceabilitySummary` (interface)
- `TracedRequirement` (interface)
- `getTracedRequirement` (function)
- `getTracedRequirements` (function)
- `summarizeRequirementsTraceability` (function)
- `validateRequirementsTraceability` (function)

### `apps/web/lib/opportunity-engine/scoring.ts`

- `scoreOpportunity` (function)

### `apps/web/lib/opportunity-engine/source-adapters.ts`

- `ParsedOpportunitySnapshot` (interface)
- `parseOpportunitySourcePayload` (function)

### `apps/web/lib/opportunity-engine/source-fetch.ts`

- `OpportunitySourceCheckpoint` (interface)
- `OpportunitySourceFetchOptions` (interface)
- `OpportunitySourceFetchResult` (interface)
- `OpportunitySourceFetchStatus` (type)
- `fetchOpportunitySourceSnapshot` (function)

### `apps/web/lib/opportunity-engine/source-intake.ts`

- `UserSourceIntakeKind` (type)
- `UserSourceIntakeSummary` (interface)
- `UserSourceReviewItem` (interface)
- `buildUserSourceReviewQueue` (function)
- `summarizeUserSuppliedSourceIntake` (function)
- `validateUserSuppliedSourceIntake` (function)

### `apps/web/lib/opportunity-engine/source-monitor.ts`

- `NovaSourceMonitorInput` (interface)
- `NovaSourceMonitorResult` (interface)
- `runNovaSourceMonitor` (function)

### `apps/web/lib/opportunity-engine/source-registry.ts`

- `DEFAULT_OPPORTUNITY_SOURCES` (const)
- `enabledOpportunitySources` (function)
- `getOpportunitySource` (function)
- `validateSourceRegistry` (function)

### `apps/web/lib/opportunity-engine/source-schedule.ts`

- `DEFAULT_SCHEDULE_POLICY` (const)
- `OpportunitySchedulePolicy` (interface)
- `OpportunitySourceRunState` (interface)
- `ScheduledOpportunitySource` (interface)
- `scheduleOpportunitySources` (function)

### `apps/web/lib/opportunity-engine/training-rights.ts`

- `DataAssetRightsRecord` (interface)
- `DataAssetUse` (type)
- `DataAssetUseDecision` (interface)
- `evaluateDataAssetUse` (function)

### `apps/web/lib/opportunity-engine/types.ts`

- `ChangeKind` (type)
- `CouncilReviewer` (type)
- `EconomicRange` (interface)
- `EvidenceAssessment` (interface)
- `EvidenceTier` (type)
- `ExperimentBudget` (interface)
- `LearningBucket` (interface)
- `LearningReport` (interface)
- `MaterialChange` (interface)
- `MoneyState` (type)
- `OpportunityCandidate` (interface)
- `OpportunityClass` (type)
- `OpportunityDecision` (interface)
- `OpportunityDisposition` (type)
- `OpportunityEconomics` (interface)
- `OpportunityEvidence` (interface)
- `OpportunityExperiment` (interface)
- `OpportunityLifecycleState` (type)
- `OpportunityObservation` (interface)
- `OpportunityOutcome` (interface)
- `OpportunityPolicyDecision` (interface)
- `OpportunityPortfolio` (interface)
- `OpportunityRisks` (interface)
- `OpportunityScore` (interface)
- `OpportunitySignals` (interface)
- `OpportunitySource` (interface)
- `PriorityBand` (type)
- `RevenueLane` (type)
- `RightsStatus` (type)
- `SecurityPosture` (type)
- `SourceAuthority` (type)
- `SourceTransport` (type)

## Prisma (head)

- models: 63
- enums: 59
- changed migration files: 0

## Semantic-domain candidates

- `AiPlatformEcosystemSummary` (interface) at `apps/web/lib/opportunity-engine/platform-ecosystems.ts` → candidates: CONTROL_PLANE; path domain: NOVA
- `AiPlatformId` (type) at `apps/web/lib/opportunity-engine/platform-ecosystems.ts` → candidates: CONTROL_PLANE; path domain: NOVA
- `AiPlatformOpportunity` (interface) at `apps/web/lib/opportunity-engine/platform-ecosystems.ts` → candidates: CONTROL_PLANE; path domain: NOVA
- `FounderDailyBrief` (interface) at `apps/web/lib/opportunity-engine/founder-command.ts` → candidates: NOVA; path domain: NOVA
- `FounderOperatingPolicy` (interface) at `apps/web/lib/opportunity-engine/founder-command.ts` → candidates: NOVA; path domain: NOVA
- `FounderQueueDecision` (interface) at `apps/web/lib/opportunity-engine/founder-command.ts` → candidates: NOVA; path domain: NOVA
- `FounderWorkAuthority` (type) at `apps/web/lib/opportunity-engine/founder-command.ts` → candidates: NOVA; path domain: NOVA
- `FounderWorkItem` (interface) at `apps/web/lib/opportunity-engine/founder-command.ts` → candidates: NOVA; path domain: NOVA
- `FounderWorkLane` (type) at `apps/web/lib/opportunity-engine/founder-command.ts` → candidates: NOVA; path domain: NOVA
- `FounderWorkState` (type) at `apps/web/lib/opportunity-engine/founder-command.ts` → candidates: NOVA; path domain: NOVA
- `NovaAction` (type) at `apps/web/lib/jarvis/nova-agent.ts` → candidates: NOVA; path domain: NOVA
- `NovaActionContext` (interface) at `apps/web/lib/jarvis/nova-agent.ts` → candidates: NOVA; path domain: NOVA
- `NovaActionDecision` (interface) at `apps/web/lib/jarvis/nova-agent.ts` → candidates: NOVA; path domain: NOVA
- `NovaAgentProfile` (interface) at `apps/web/lib/jarvis/nova-agent.ts` → candidates: NOVA; path domain: NOVA
- `NovaAlert` (interface) at `apps/web/lib/opportunity-engine/nova-agent.ts` → candidates: NOVA; path domain: NOVA
- `NovaAllowedAction` (type) at `apps/web/lib/jarvis/nova-agent.ts` → candidates: NOVA; path domain: NOVA
- `NovaCouncilPacket` (interface) at `apps/web/lib/jarvis/nova-agent.ts` → candidates: NOVA; path domain: NOVA
- `NovaCycleInput` (interface) at `apps/web/lib/opportunity-engine/nova-agent.ts` → candidates: NOVA; path domain: NOVA
- `NovaCycleResult` (interface) at `apps/web/lib/opportunity-engine/nova-agent.ts` → candidates: NOVA; path domain: NOVA
- `NovaEventClass` (type) at `apps/web/lib/jarvis/nova-agent.ts` → candidates: NOVA; path domain: NOVA
- `NovaForbiddenAction` (type) at `apps/web/lib/jarvis/nova-agent.ts` → candidates: NOVA; path domain: NOVA
- `NovaHandoff` (interface) at `apps/web/lib/opportunity-engine/nova-agent.ts` → candidates: NOVA; path domain: NOVA
- `NovaReviewRoute` (interface) at `apps/web/lib/jarvis/nova-agent.ts` → candidates: NOVA; path domain: NOVA
- `NovaRunMode` (type) at `apps/web/lib/jarvis/nova-agent.ts` → candidates: NOVA; path domain: NOVA
- `NovaRuntimeStatus` (type) at `apps/web/lib/jarvis/nova-agent.ts` → candidates: NOVA; path domain: NOVA
- `NovaSourceMonitorInput` (interface) at `apps/web/lib/opportunity-engine/source-monitor.ts` → candidates: NOVA; path domain: NOVA
- `NovaSourceMonitorResult` (interface) at `apps/web/lib/opportunity-engine/source-monitor.ts` → candidates: NOVA; path domain: NOVA
- `NovaSubagentCodename` (type) at `apps/web/lib/jarvis/nova-agent.ts` → candidates: NOVA; path domain: NOVA
- `NovaSubagentProfile` (interface) at `apps/web/lib/jarvis/nova-agent.ts` → candidates: NOVA; path domain: NOVA
- `NovaSubagentTemplate` (interface) at `apps/web/lib/opportunity-engine/nova-subagents.ts` → candidates: NOVA; path domain: NOVA
- `OpportunitySource` (interface) at `apps/web/lib/opportunity-engine/types.ts` → candidates: NOVA; path domain: NOVA
- `OpportunitySourceCheckpoint` (interface) at `apps/web/lib/opportunity-engine/source-fetch.ts` → candidates: NOVA; path domain: NOVA
- `OpportunitySourceFetchOptions` (interface) at `apps/web/lib/opportunity-engine/source-fetch.ts` → candidates: NOVA; path domain: NOVA
- `OpportunitySourceFetchResult` (interface) at `apps/web/lib/opportunity-engine/source-fetch.ts` → candidates: NOVA; path domain: NOVA
- `OpportunitySourceFetchStatus` (type) at `apps/web/lib/opportunity-engine/source-fetch.ts` → candidates: NOVA; path domain: NOVA
- `OpportunitySourceRunState` (interface) at `apps/web/lib/opportunity-engine/source-schedule.ts` → candidates: NOVA; path domain: NOVA

## Unparsed files

None — scan complete.

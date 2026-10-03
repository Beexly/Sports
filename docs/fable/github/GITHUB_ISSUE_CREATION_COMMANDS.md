# GitHub Issue Creation Commands

GitHub CLI is currently unauthenticated. After `gh auth login` and branch push, create issues manually from the checked-in bodies.

```bash
gh issue create --title "FABLE: claim evidence ledger" --body-file docs/fable/github/ISSUE_01_CLAIM_EVIDENCE_LEDGER.md
gh issue create --title "FABLE: public-data forensic demo" --body-file docs/fable/github/ISSUE_02_PUBLIC_DATA_FORENSIC_DEMO.md
gh issue create --title "FABLE: AWS model leverage map" --body-file docs/fable/github/ISSUE_03_AWS_MODEL_LEVERAGE_MAP.md
gh issue create --title "FABLE: AgentCore security firebreak" --body-file docs/fable/github/ISSUE_04_AGENTCORE_SECURITY_FIREBREAK.md
gh issue create --title "FABLE: SageMaker adoption ADRs" --body-file docs/fable/github/ISSUE_05_SAGEMAKER_ADOPTION_ADRS.md
gh issue create --title "FABLE: Clean Rooms synthetic partner demo" --body-file docs/fable/github/ISSUE_06_CLEAN_ROOMS_SYNTHETIC_PARTNER_DEMO.md
gh issue create --title "FABLE: edge lab micro-gain protocol" --body-file docs/fable/github/ISSUE_07_EDGE_LAB_MICRO_GAIN_PROTOCOL.md
gh issue create --title "FABLE: adversarial red-team review" --body-file docs/fable/github/ISSUE_08_ADVERSARIAL_RED_TEAM_REVIEW.md
gh issue create --title "FABLE: CI evidence guardrails" --body-file docs/fable/github/ISSUE_09_CI_EVIDENCE_GUARDRAILS.md
gh issue create --title "FABLE: source-rights schema validation" --body-file docs/fable/github/ISSUE_10_SOURCE_RIGHTS_SCHEMA_VALIDATION.md
gh issue create --title "FABLE: personal AWS learning bridge" --body-file docs/fable/github/ISSUE_AWS_PERSONAL_LEARNING_BRIDGE.md
gh issue create --title "FABLE: AWS portfolio case study" --body-file docs/fable/github/ISSUE_AWS_PORTFOLIO_CASE_STUDY.md
gh issue create --title "FABLE: AWS badge to FABLE crosswalk" --body-file docs/fable/github/ISSUE_AWS_BADGE_TO_FABLE_CROSSWALK.md
```

Before running, search existing issues to avoid duplicates.

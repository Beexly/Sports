# Cloud Offensive + Cloud Audit Tooling — Technical Dossier

Verified 2026-11-06 via `gh api` + `git clone --depth 1`. Flags read from source (`cli/`, `cmd/`, `main.py`, `parser.py`, `__main__.py`). `file:line` = checked-out tree; unobserved items are **UNVERIFIED**.

| Repo | ★ | License | Pushed |
|---|---|---|---|
| BishopFox/cloudfox | 2,616 | MIT | 2026-11-02 |
| RhinoSecurityLabs/pacu | 5,387 | BSD-3-Clause | 2026-05-19 |
| SpecterOps/AzureHound | 982 | GPL-3.0 | 2026-10-16 |
| prowler-cloud/prowler | 15,184 | Apache-2.0 | 2026-11-06 |
| nccgroup/ScoutSuite | 7,870 | GPL-2.0 | 2025-09-23 |
| DataDog/stratus-red-team | 2,442 | Apache-2.0 | 2026-11-04 |
| RhinoSecurityLabs/cloudgoat | 3,776 | BSD-3-Clause | 2026-10-14 |
| Azure/PyRIT → microsoft/PyRIT | 125 stub / 4,759 real | MIT | 2026-11-06 |
| NVIDIA/garak | 9,899 | Apache-2.0 | 2026-11-04 |
| promptfoo/promptfoo | 26,903 | MIT | 2026-11-06 |
| KeygraphHQ/shannon | 51,321 | AGPL-3.0 | 2026-11-04 |

---

## 1. CloudFox — BishopFox/cloudfox

### What it is
Go/Cobra tactical enum tool (AWS/Azure/GCP). Root wires all three providers: `main.go:19`. Loot-file pattern: modules emit copy-paste `aws`/`az` commands (`aws/buckets.go:234-237`). `cape`/`pmapper` build privesc graphs. Install: `go install github.com/BishopFox/cloudfox@latest` …

### Auth model
AWS: shared-config file via `--profile/-p` (`cli/aws.go`); `internal.AWSConfigFileLoader()` at `aws/client-initializers.go:38,52`. Most modules need only list/describe (`iam:List*`, `s3:ListAllMyBuckets`, `sts:GetCallerIdentity` at `aws/buckets.go:27`). Azure: `az login`/token cache. GCP: gcloud ADC (**UNVERIFIED**).

### Command surface
AWS (verified `Use:`/`Short:` — full list via `grep -h 'Use:\|Short:' cli/aws.go`): `access-keys`, `buckets --with-policies`, `cape --admin-only -l/-a`, `iam-simulator --principal/--action/--resource/--admin-check-only`, `instances -f/-u`, `inventory`, `permissions --principal`, `resource-trusts --include-kms`, `role-trusts`, `secrets`, `sqs/sns --policies`, `tags -m`, `outbound-assumed-roles -d`, `endpoints`, `env-v …

### Recipes
```bash
cloudfox aws inventory --regions us-east-1,us-west-2
cloudfox aws principals / role-trusts / resource-trusts
cloudfox aws buckets; cloudfox aws env-vars; cloudfox aws instances -u
# …
```

### Findings
Inventory tables + loot files (copy-paste enum/exploit commands). Drives: which buckets to `s3 cp`, roles to `AssumeRole`, env secrets → Pacu/Stratus targets.

### OPSEC
Read-only (`Get*`/`List*` only) — no CloudTrail *write* events, but each call is logged. `all-checks` = 10k+ `eventName`s/account; scope with `-f`/`--regions`.

### License trap
MIT. `pmapper` data is Apache-2.0, no conflict.

---

## 2. Pacu — RhinoSecurityLabs/pacu

### What it is
Python AWS exploitation framework ("The AWS exploitation framework, designed for testing the security of Amazon Web Services environments"). 79 modules under `pacu/modules/`; session DB SQLAlchemy (`pacu/core/models.py:70`, `21-34` `AWSKey`; `get_active_session()` `:167`). Instal …

### Auth model
REPL `keys` or CLI: `--set-keys alias,AKIA,secret,token` (`pacu/main.py:2060`), `--import-keys <profile>` (`:2061`), `--session`/`--new-session` (`:2055-2057`), `--set-regions` (`:2070`), `--whoami` (`:2071`). Perms are per-module (map in `iam__privesc_scan/main.py:165+`).

### Command surface
CLI (`main.py:2055-2073`): `--exec`, `--module-name`, `--data`, `--module-args`, `--list-modules`, `--pacu-help`, `--module-info`. Modules: `iam__enum_permissions/roles/users`, `iam__get_credential_report`, `iam__privesc_scan`, `iam__backdoor_assume_role/users_keys/users_password`, `iam__detect_honeytokens`, `organizations__assume_role/enum`, `ec2__enum/download_userdata/startup_shell_script`, `lambda__enum/backdoor_ …

### Recipes
```bash
./pacu.py --new-session t1 --set-regions all --set-keys alias,AKIA,SECRET,[TOKEN]
./pacu.py --session t1 --whoami
./pacu.py --session t1 --exec --module-name iam__enum_permissions
# …
```

### Findings
`iam__privesc_scan` prints one block per exploitable permission with reproduce command + impact (`:165` `AttachGroupPolicy`, `:176` `AttachRolePolicy`, `:193` `AttachUserPolicy`). `cloudtrail__download_event_history` gives 90d of CloudTrail JSON for detection-gap analysis.

### OPSEC
Boto3 default user-agent (**UNVERIFIED** whether `user_agents.txt` is auto-rotated). No `--delay` in CLI.

### License trap
BSD-3-Clause. Permissive.

---

## 3. AzureHound — SpecterOps/AzureHound

### What it is
Go MS-Graph/ARM collector exporting an Azure tenant to BloodHound Enterprise: `cmd/root.go:30`, `cmd/start.go:49-50` ("Start Azure data collection service for BloodHound Enterprise"), `cmd/configure.go:54-55`, ~100 `cmd/list-*.go` files. `go.mod:7` `sdk/azidentity`. Install: rele …

### Auth model
`configure.go:87` auth chooser (Certificate/UsernamePassword/ManagedIdentity; `:94,114,123`). Cert flow auto-generates RSA + cert (`configure.go:332-339`). Needs Graph app perms `User.Read.All` etc. (**UNVERIFIED** exact list — read `config/config.go`). BHE mode pushes via `bloodhound.NewBHEClient` (`cmd/start.go:64`), 5s ticker (`:84`). `--output` at `config/config.go:386-389`. Read-only except cert upload.

### Command surface
`azurehound configure` · `start` (daemon) · `list-*` offline exports (`list-users`, `list-groups`, `list-group-members`, `list-roles`, `list-role-assignments`, `list-subscriptions`, `list-tenants`, `list-resource-groups`, `list-virtual-machines`, `list-key-vaults`, `list-storage-accounts`, `list-apps`, `list-service-principals`, `list-devices`, `list-app-owners`, `list-role-eligibility-schedule-instance`, `list-role- …

### Recipes
```bash
./azurehound configure
./azurehound list-users --output users.json; list-group-members; list-role-assignments --output ra.json
./azurehound list-subscriptions
# …
```
Pair with RoadTools (`roadtools token`, `roadrecon` — NOT in this repo; UNVERIFIED flags) for M365/Entra GB paths AzureHound lacks.

### Findings
Bulk JSON of identities + RBAC edges + vault/storage/VM assignments. `list-role-eligibility-schedule-instance` = **PIM eligible** assignments for JIT abuse.

### OPSEC
Read-only but very high-volume (paginated Graph over all users/groups/assignments) — bulk `Object_GetByID`/`RoleAssignments_List` in Entra + audit logs. No stealth/delay flags.

### License trap
GPL-3.0 — modified AzureHound distributed as a binary = convey source. Keep internal/unmodified.

---

## 4. Prowler — prowler-cloud/prowler

### What it is
Python multi-cloud scanner (15k★). Providers: `prowler/providers/` (`aws azure gcp kubernetes github microsoft365 alibabacloud huaweicloud oraclecloud …`). AWS: 93 service dirs, 288 check files (measured). Checks are folder-per-check under `<provider>/services/<service>/<check_id …

### Auth model
SDK chains per provider: AWS profile/env/SSO (`AWS_PROFILE`), Azure (`AZURE_CONFIG_DIR`/MSI), GCP (ADC); `prowler aws --profile prod --region us-east-1`. Full AWS pass needs effectively `ReadOnlyAccess`.

### Command surface
`prowler/lib/cli/parser.py`: `--check(s)/-c` (`:355-356`), `--checks-file/-C` (`:361`), `--service(s)/-s`, `--severity`, `--compliance` (`cis_3.0_aws`), `--status`, `--list-checks/-l`, `--list-services`, `--list-compliance`, `--list-fixers`, `--output-formats/-M` default `["csv","json-ocsf","html"]` (`:246`), `--output-filename/-F`, `--output-directory/-o`, `--excluded-service(s)` (`:340`), `--mutelist-file/-w` (`:45 …

### Recipes
```bash
prowler aws --profile t --region us-east-1 --list-checks | wc -l
prowler aws --profile t -c iam_password_policy_minimum_length_14 iam_no_root_access_key
prowler aws --profile t -s iam s3 kms cloudtrail
# …
```

### Findings
PASS/FAIL/MUTED per check with ARN + remediation; `json-ocsf` (OCSF schema) → SIEM; `html` = human report. Drives the Pacu/CloudFox target list (e.g.

### OPSEC
Read-only but thousands of `Get*`/`List*` per full run (scanner-shaped pattern in CloudTrail). No delay flag (verified group list); scope with `-c`/`-s`, mute with `-w`, gate CI with `--ignore-exit-code-3` (**UNVERIFIED** spelling).

### License trap
Apache-2.0. Caveat: don't re-publish CIS documents referenced in `prowler/compliance/` JSON.

---

## 5. ScoutSuite — nccgroup/ScoutSuite

### What it is
Python multi-cloud auditing tool with HTML reporting (`ScoutSuite/output/html.py`). Layout: `ScoutSuite/__main__.py`, `core/cli_parser.py`, `core/server.py`, `core/ruleset.py`, `providers/` (`aws azure gcp aliyun do kubernetes oci`). Install: `pip install ScoutSuite` (**UNVERIFIE …

### Auth model
Per-cloud flags (`ScoutSuite/core/cli_parser.py`): AWS `-p` (`:45`), `--access-keys` (`:51`), `--access-key-id/--secret-access-key/--session-token` (`:55-65`), `-r` (`:73`), `-xr` (`:79`); GCP `-u` (`:104`), `-s`, `--project-id/--folder-id` (`:118-122`). Needs read-only/list perms equal to Prowler's; rules compute client-side (`core/ruleset.py`).

### Command surface
`--provider` (`:11`), `-v` (`:16`); report: `--report-dir` (`:377`), `--report-name` (`:381`), `--no-browser` (`:371`), DB mode `--db/--serve/--db-file` (`:415-422`).

### Recipes
```bash
python scout.py aws --profile target --report-dir ./scout-aws --report-name target
python scout.py aws -p target -r us-east-1 us-west-2
# open ./scout-aws/scout-report-<ts>.html (auto-opens unless --no-browser)
```

### Findings
Ruleset findings with severity + "risky services / exposed callers"; HTML = presentation artifact; underlying JSON (`output/data/*.json`, `output/result_encoder.py`) is scriptable.

### OPSEC
Read-only (fewer services than Prowler — UNVERIFIED exact gap; diff `providers/aws/resources/` vs Prowler's 93 service dirs). No delay flags; `--serve` opens a local HTTP server (bind localhost only — UNVERIFIED default in `core/server.py`).

### License trap
GPL-2.0. Internal audit OK; fork distributed commercially = convey source.

---

## 6. Stratus Red Team — DataDog/stratus-red-team

### What it is
Go adversary-emulation catalog (MITRE ATT&CK Cloud). `v2/cmd/stratus/` (CLI), `v2/pkg/stratus/` (`registry.go`, `runner/`), `v2/internal/attacktechniques/<cloud>/<tactic>/<slug>/main.go` — each implements `detonate(params, providers) error` (e.g. `internal/attacktechniques/aws/cr …

### Auth model
Cloud SDK chains (`AWS_PROFILE` / Azure env / GCP ADC). Each technique declares required perms in `main.go` (e.g. `ec2:GetPasswordData`; `iam:CreateRole`+`AttachRolePolicy`). Runs as simulator role — every detonation is a real write.

### Command surface
`v2/cmd/stratus/cmd/detonate_cmd.go:18-19` `stratus detonate <id>...` (`:48` `--cleanup`, `:49` commented `--no-warmup`); `cmd/warmup_cmd.go:15-16` `stratus warmup <id>...`; `cmd/cleanup_cmd.go:17-18` `stratus cleanup … | --all`; `cmd/show_cmd.go:12`, `revert_cmd.go`, `list` (**UNVERIFIED exact — `ls cmd/`**). IDs = `<cloud>.<tactic>.<slug>`. AWS (verified via `ls v2/internal/attacktechniques/aws/`): `credential-acce …

### Recipes
```bash
stratus warmup aws.credential-access.ec2-steal-instance-credentials
stratus detonate aws.credential-access.ec2-steal-instance-credentials
stratus cleanup aws.credential-access.ec2-steal-instance-credentials
# …
```

### Findings
Each technique emits CloudTrail/Entra events — "did the detector fire?" is the finding. Drives detection engineering + least-priv hardening; run before/after.

### OPSEC
Deliberately noisy (`cloudtrail-stop`, `s3-ransomware-*`, `resource-lock` fire high-severity alerts). Test principals only; `--cleanup` is your rollback.

### License trap
Apache-2.0. No copyleft.

---

## 7. CloudGoat — RhinoSecurityLabs/cloudgoat

### What it is
"Vulnerable by Design" AWS/Azure deployment trainer. `cloudgoat/cloudgoat.py:11` `BASE_COMMANDS = [config, create, destroy, list, help]`; `:29` create → scenario ladder; `:45` `create|destroy => --profile`. Scenarios under `cloudgoat/scenarios/aws/` (28 + `static/` template) and …

### Auth model
Uses AWS CLI profile to spin up vulnerable infra (Terraform under the hood — UNVERIFIED; read `cloudgoat/core/`). Throwaway accounts only.

### Command surface
`cloudgoat create <scenario>` · `destroy <scenario|all>` · `list [all|deployed|undeployed]` · `config [--profile] [--whitelist]`. AWS scenarios (`ls cloudgoat/scenarios/aws/`): `agentcore_identity_confusion`, `beanstalk_secrets`, `bedrock_agent_hijacking`, `cloud_breach_s3`, `codebuild_secrets`, `data_secrets`, `detection_evasion`, `ec2_ssrf`, `ecs_efs_attack`, `ecs_privesc_evade_protection`, `ecs_takeover`, `federat …

### Recipes
```bash
cloudgoat create iam_privesc_by_attachment --profile lab   # AttachPolicy path
cloudgoat create lambda_privesc --profile lab              # PassRole+Lambda
cloudgoat create glue_privesc --profile lab                # Glue devendpoint
# …
```

### Findings
Scenario README = answer key; flag resource/dashboard = proof. Training ammo + detection regression suite.

### OPSEC
Terraform-grade deployment storm in the target account (roles/lambdas/buckets/users — all StateChanged events). Definitely not stealth; sandbox accounts + billing caps + daily `destroy all`.

### License trap
BSD-3-Clause. Permissive.

---

## 8. PyRIT — Azure/PyRIT (moved → microsoft/PyRIT)

### What it is
Python Risk Identification Tool for generative-AI — Microsoft's LLM red-team framework. **Lineage**: `Azure/PyRIT` is a 1278-byte redirect stub (`README.md` → `github.com/microsoft/PyRIT`); the real tree is `microsoft/PyRIT` (4,759★, MIT, pushed 2026-11-06). Layout (`ls microsoft …

### Auth model
Pass a target object under `pyrit/prompt_target/` (`azure_ml_chat_target.py`, `openai/`, `hugging_face/`, `http_target/`, `playwright_target.py`, `litellm_chat_target.py`, `websocket_target.py`, `prompt_shield_target.py`, `text_target.py`, `round_robin_target.py`, `a2a_target.py`). Env keys `OPENAI_API_KEY`, `AZURE_OPENAI_API_ENDPOINT/AZURE_OPENAI_API_KEY/AZURE_OPENAI_API_VERSION` (**UNVERIFIED** names this commit — …

### Command surface
Programmatic, not CLI. Files: `pyrit/executor/attack/single_turn/prompt_sending.py` (single-turn), `pyrit/executor/attack/multi_turn/crescendo.py` + `multi_prompt_sending.py` (multi-turn gradual escalation), `pyrit/scenario/` (`scenario.py`, `matrix_atomic_attack_builder.py`, `attack_technique.py`, `scenario_technique.py`), datasets `pyrit/datasets/executors/red_teaming/` (`crescendo_history_lecture.yaml`, `crescendo …

### Recipes
```python
from pyrit.prompt_target import OpenAIChatTarget
from pyrit.executor.attack.multi_turn import CrescendoOrchestrator  # class name UNVERIFIED — read crescendo.py
target = OpenAIChatTarget()
# …
```

### Findings
Per-turn true/false/float violation verdicts; `memory/` holds conversations for audit. Drives system-prompt/filter/threshold tuning.

### OPSEC
SDK-shaped requests at the target provider; you bear token cost. `crescendo` foot-in-door writes real dialog history.

### License trap
MIT (both `Azure/` and `microsoft/`).

---

## 9. garak — NVIDIA/garak

### What it is
"The LLM vulnerability scanner" (9,899★). Verified layout: `garak/probes/` (43 modules, 13,219 lines — measured), `garak/detectors/` (~30), `garak/generators/` (`llm.py`, `openai.py`, `anthropic.py`, `azure.py`, `bedrock.py`, `cohere.py`, `mistral.py`, `ollama.py`, `litellm.py`, …

### Auth model
Generator URL + API key into `garak` config. `--spec/-s` unified selection (`garak/cli.py:159-171`; `:413` "--spec wins; deprecated --probes/--probe_tags/--buffs map onto it"). Report: `--report` (`:295`), `--report_prefix` (`:83-85`).

### Command surface
`garak/cli.py:6` = `"list_detectors list_probes list_generators list_buffs list_config plugin_info interactive report version fix".split()`. `garak --list_probes` (`:263`; filter with `--spec`), `garak --list_generators`, `garak --model openai --model_name gpt-4`, `garak --report_prefix ./runs/`, `garak --report <prev.jsonl>`. Probe families (`ls garak/probes/`): `dan`, `promptinject`, `encoding`, `latentinjection`, …

### Recipes
```bash
garak --list_probes
garak --model openai --model_name gpt-4o --report_prefix ./runs/target1/
garak --model openai --model_name gpt-4o --spec probes.promptinject probes.dan --report_prefix ./runs/target1/
# …
```

### Findings
HTML + JSONL per probe family with attempt/response + detector verdict (`detectors/`: `dan.py`, `promptinject.py`, `leakreplay.py`, `malwaregen.py`, `judge.py`, `knownbadsignatures.py`, `unsafe_content.py`, `packagehallucination.py`). Drives system-prompt and output-classifier fixes.

### OPSEC
Text-only requests, one HTTP call per probe×buff. IS a load test on your inference; scope with `--spec`, not stealth.

### License trap
Apache-2.0. Probe payloads (`data/`, `payloads.py`) are Apache; embedded third-party corpora are per-license — check `LICENSE` before redistributing prompt payloads.

---

## 10. promptfoo — promptfoo/promptfoo

### What it is
Declarative LLM eval/redteam platform (26,903★) — YAML config, CLI runner, web viewer. TS app: `src/redteam/`, `src/assertions/`, `src/commands/`, `src/providers/`. Install: `npm install -g promptfoo` / `npx promptfoo@latest`. `promptfoo --help`.

### Auth model
Provider API keys in config/env (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `AZURE_OPENAI_API_KEY`, `GOOGLE_API_KEY`) — providers self-auth via their SDKs; config points at `providers: [openai:gpt-4o, anthropic:claude-3-7-sonnet]`. Redteam generation can use a grader model via `apiKey` in the `redteam:` block.

### Command surface
`src/commands/eval.ts:32` `.command('eval')`; `src/main.ts:93` `program.command('redteam').description('Red team LLM applications')`; `src/redteam/commands/run.ts:76` 'redteam run', `generate.ts`, `report.ts`/`setup.ts`; `src/commands/auth.ts:236,239,274,293` `auth login|logout|whoami`; `src/commands/cache.ts:8-10` `cache clear`; `src/commands/view.ts` (**UNVERIFIED** view subcommand name). Config keys: `providers`, …

### Recipes
```bash
npm i -g promptfoo; mkdir target && cd target && promptfoo init
# config.yaml: providers: [openai:gpt-4o]  prompts: ["Summarize: {{input}}"]
#   tests: [{vars: {input: "hi"}, assert: [{type: contains, value: "world"}]}]
# …
```

### Findings
Viewer: every case pass/fail with assertion diffs + redteam severity overlay; `redteam report` emits a standalone report. Drives prompt edits, tighter `assert`s, guardrail assertions.

### OPSEC
Outbound SDK calls (the tool *is* the attacker traffic); quota/cost is the constraint. Hosted `promptfoo app` cloud discloses test cases to third-party servers(**UNVERIFIED scope**) — self-host `view` if prompts are sensitive.

### License trap
MIT. Plugins/`redteam` prompts are MIT.

---

## 11. Shannon — KeygraphHQ/shannon

### What it is
Autonomous AI web-app/API pentester (51,321★) — "No exploit, no report" (`README.md:169`). TS monorepo: `apps/cli/` (launcher), `apps/worker/src/` (`ai/`, `audit/`, `collectors/`, `temporal/`, `session-manager.ts`, `services/`, `prompts/`, `configs/`), `workspaces/` (isolated sca …

### Auth model
BYOK — any provider in the catalogue (Anthropic/OpenAI/xAI/Bedrock/"any other provider — point at a proxy or LLM gateway" `README.md:134`; custom base URL + model config supported). Cyber-safeguards handoff: Anthropic/OpenAI safeguards can interrupt a scan mid-run (`README.md:134-135`) — do the provider verification flow *before* the first scan. Target-app creds via config (login flows, TOTP, email auth, RoE `README. …

### Command surface
`npx @keygraph/shannon@latest` → interactive launcher → repo dir + target URL + model → Docker ephemeral per-invocation container. Precise flags **UNVERIFIED** — read `apps/cli/src/` (`--target-url`, `--repo`, `--model`, `--focus-area` existence to confirm live). Workflow (`README.md:259-293` mermaid + 6 stages): 1) **Recon + vulnerability analysis** (running app ↔ source, agents across Injection/XSS/SSRF/Auth) → 2) …

### Recipes
```bash
npx @keygraph/shannon@latest
# 1. point at repo + running staging URL, BYOK key (clear cyber-safeguards first)
# 2. it maps trust boundaries + data flows (stage 2)
# …
```

### Findings
Reports contain only exploits with working PoCs (PDF evidence + SARIF JSON for CI gates `README.md:66-69`). Drives: severity-gated SARIF merge blocks.

### OPSEC
Browser automation + CLI-instrumented attacks against the target app — TCP-benign, app-level loud (real injections). Docker isolation limits container breakout, but BYOK calls leave provider-side query logs, and target-app WAFs see scanner traffic.

### License trap
**AGPL-3.0** (strongest in this dossier). Offering a modified Shannon as a networked service triggers the 'network use' clause — you must publish the corresponding source (incl.

---

## AWS Privesc Catalog (32 paths) — tool + module map

Hypotheses from Pacu `iam__privesc_scan/main.py:165+`, Stratus IDs, CloudGoat scenarios.

| # | Path | Tool/module |
|---|---|---|---|
| 1 | CreatePolicyVersion+SetAsDefault | Pacu |
| 2 | AttachRolePolicy | `iam__privesc_scan:176` |
| 3 | AttachUserPolicy | `iam__privesc_scan:193` |
| 4 | AttachGroupPolicy | `iam__privesc_scan:165` |
| 5 | PassRole+RunInstances (IMDS) | `iam__privesc_scan:235` |
| 6 | PassRole+Lambda CreateFunction | Pacu |
| 7 | Edit Lambda w/ role | `iam__privesc_scan:284` |
| 8 | PassExistingRoleToNewCFN | `iam__privesc_scan:298` |
| 9 | Glue devendpoint | CloudGoat |
| 10 | CodeBuild StartBuild | CloudGoat |
| 11 | CloudFormation UpdateStack | Pacu cfn injection |
| 12 | EC2 user-data injection | Pacu |
| 13 | S3 bucket policy share | CloudFox `buckets`; Stratus `s3-backdoor-bucket-policy` |
| 14 | KMS CreateGrant/Decrypt | CloudFox |
| 15 | SecretsManager grant read | CloudFox `secrets`; Stratus `secretsmanager-retrieve-secrets` |
| 16 | SSM SecureString read | Stratus |
| 17 | SSM SendCommand RCE | Pacu `systemsmanager__rce_ec2`; Stratus `ssm-send-command` |
| 18 | UpdateAssumeRolePolicy | Pacu |
| 19 | Org-level AssumeRole | Pacu |
| 20 | Backdoor user (CreateAccessKey) | Pacu |
| 21 | Backdoor user (reset password) | Stratus |
| 22 | SES enumeration | Stratus |
| 23 | RDS snapshot share | CloudGoat |
| 24 | EBS snapshot share exfil | Stratus `ec2-share-ebs-snapshot`, `ec2-share-ami` |
| 25 | Console login w/o MFA | Stratus |
| 26 | SendSSH key injection (lateral) | Stratus |

---

## Azure

Enum with AzureHound. Runbook: 1) azurehound list-role-assignments/list-users/list-group-members/list-subscriptions --output *.json 2) RoadTools roadtools/roadrecon (NOT in repo; UNVERIFIED) 3) Managed Identity: VM IMDS then az cross-resource (CloudFox azure func; Stratus backdoor-managed-identity-fic) 4) Token theft: federated creds, token cache 5) PIM eligible assignments via list-role-eligibility-schedule-instance …

## GCP

1. SA key iam.serviceAccounts.keys.create (UNVERIFIED) 2. setIamPolicy Owner (UNVERIFIED) 3. actAs 4. Metadata server 169.254.169.254/computeMetadata/v1/ via SSRF 5. Storage ACL public exposure (UNVERIFIED subcommand) 6. Stratus GCP: gcp.credential-access.secretmanager-retrieve-secrets, gcp.defense-evasion.delete-dns-logs.

## AI / LLM Red Team

OWASP LLM Top-10 IDs UNVERIFIED: prompt injection -> garak promptinject/latentinjection/encoding; PyRIT converter + crescendo (class names UNVERIFIED); promptfoo indirectPromptInjection + pii. RAG -> Shannon stage-2 data-flow mapping; garak leakreplay/sysprompt_extraction; promptfoo contextComplianceAttack + crossSessionLeak. Agent abuse -> promptfoo agentic + excessiveAgency + mcp.ts; garak agent_breaker. RAG poison …

---

## Cloud Credential Discovery Cheat Sheet

```bash
# env / files
env | grep -i -E "AWS_|AZURE_|GOOGLE_|SECRET|TOKEN|PASS"
cat ~/.aws/credentials; cat ~/.aws/config; aws sts get-caller-identity --profile target
cat ~/.azure/accessTokens.json; az account show; gcloud auth list
cat /proc/1/environ | tr '\0' '\n' | grep -i -E "KEY|SECRET|TOKEN|PASS"   # RCE host
# IMDS (SSRF target)
curl -s http://169.254.169.254/latest/meta-data/iam/security-credentials/
curl -s http://169.254.169.254/latest/meta-data/iam/security-credentials/$role  # AWS: RoleName → creds
curl -s -H "Metadata-Flavor: Google" http://169.254.169.254/computeMetadata/v1/instance/service-accounts/default/token  # GCP (Metadata-Flavor REQUIRED)
curl -s -H "Metadata: true" "http://169.254.169.254/metadata/identity/oauth2/token?resource=https://management.azure.com/"  # Azure VMSS/VM IMDS (UNVERIFIED exact path)
# ECS task metadata (inside target container pod)
curl -s $AWS_CONTAINER_CREDENTIALS_RELATIVE_URI   # e.g. http://169.254.170.2/v2/credentials/<id> (UNVERIFIED env names — grep ECS_CONTAINER_ in app config)
# chains: creds found → aws sts get-caller-identity → cloudfox aws inventory → pacu --whoami → iam__privesc_scan
```

*Coverage note: line numbers are from depth-1 clones fetched 2026-11-06; Prowler NTFS filename-length errors blocked 2 check files (`entra_conditional_access_policy_*`, `intune_device_compliance_policy_*`) — provider tree still usable. Shannon's flag list is summarized at workflow level; walk `apps/cli/src/` before quoting flags.*

# Repo Verification

As of: 2026-06-09

## Verification Result

The eight candidate names were matched to canonical GitHub repositories and official docs. No repository was cloned or executed. GitHub metadata was captured under `reports/codex/`.

| ID | Project | Canonical repo | Stars | Forks | Latest release | Latest commit | Main language | Open issues | Public advisories queried | Initial go/no-go |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| open-webui | Open WebUI | https://github.com/open-webui/open-webui | 140762 | 20199 | v0.9.6 | 2026-06-02T02:10:46Z | Python | 364 | 77 | Use directly but isolated |
| twenty | Twenty | https://github.com/twentyhq/twenty | 49500 | 7118 | twenty/v2.10.0 | 2026-06-09T09:28:11Z | TypeScript | 146 | 5 | Use as internal-only tool |
| hoppscotch | Hoppscotch | https://github.com/hoppscotch/hoppscotch | 79447 | 5906 | 2026.5.0 | 2026-05-28T10:53:13Z | TypeScript | 738 | 13 | Use directly as self-hosted service |
| cap | Cap | https://github.com/CapSoftware/Cap | 19493 | 1608 | cap-v0.5.1 | 2026-06-08T19:17:08Z | TypeScript | 491 | 0 | Use directly but isolated |
| chatwoot | Chatwoot | https://github.com/chatwoot/chatwoot | 30045 | 7471 | v4.14.1 | 2026-06-09T07:12:03Z | Ruby | 1179 | 3 | Use directly but isolated |
| listmonk | listmonk | https://github.com/knadh/listmonk | 21422 | 2300 | v6.1.0 | 2026-06-03T02:56:19Z | Go | 97 | 5 | Use directly but isolated |
| penpot | Penpot | https://github.com/penpot/penpot | 49415 | 3168 | 2.15.4 | 2026-06-09T09:17:06Z | Clojure | 650 | 4 | Use as internal-only tool |
| anythingllm | AnythingLLM | https://github.com/Mintplex-Labs/anything-llm | 61292 | 6656 | v1.13.0 | 2026-06-09T00:05:41Z | JavaScript | 329 | 19 | Use directly but isolated |

## Key Verification Notes

- Open WebUI is not a simple BSD-only adoption candidate after v0.6.6; official docs describe a branding clause and say the newer license is not OSI-approved.
- Twenty is AGPL plus files marked Enterprise under a commercial license.
- Hoppscotch is MIT and the cleanest direct developer-tool candidate.
- Cap is not a pure permissive Loom clone; its repo license says specific camera/screen-capture crate families are MIT while most other content is AGPLv3.
- Chatwoot community code is MIT outside enterprise directories, with paid self-host/enterprise features separated.
- listmonk is AGPL-3.0 and should be isolated unless legal approves modified network-service use.
- Penpot is MPL-2.0, which is more integration-friendly than AGPL but still has file-level obligations for modified covered files.
- AnythingLLM is MIT and high-leverage for internal RAG; data-leakage risk is the main constraint.

## Source Links

### Open WebUI
- https://github.com/open-webui/open-webui
- https://docs.openwebui.com/
- https://docs.openwebui.com/license/
- https://docs.openwebui.com/getting-started/quick-start/
- https://docs.openwebui.com/features/workspace/knowledge/

### Twenty
- https://github.com/twentyhq/twenty
- https://docs.twenty.com/developers/self-host/self-host
- https://docs.twenty.com/developers/self-host/capabilities/docker-compose
- https://docs.twenty.com/developers/extend/capabilities/apis
- https://docs.twenty.com/developers/extend/webhooks
- https://github.com/twentyhq/twenty/blob/main/LICENSE

### Hoppscotch
- https://github.com/hoppscotch/hoppscotch
- https://docs.hoppscotch.io/documentation/getting-started/introduction
- https://docs.hoppscotch.io/documentation/self-host/community-edition/getting-started
- https://docs.hoppscotch.io/documentation/self-host/community-edition/install-and-build
- https://docs.hoppscotch.io/documentation/features/environments

### Cap
- https://github.com/CapSoftware/Cap
- https://cap.so/docs/introduction
- https://cap.so/docs/self-hosting
- https://github.com/CapSoftware/Cap/blob/main/LICENSE

### Chatwoot
- https://github.com/chatwoot/chatwoot
- https://developers.chatwoot.com/self-hosted/deployment/requirements
- https://developers.chatwoot.com/api-reference/introduction
- https://www.chatwoot.com/deploy
- https://www.chatwoot.com/hc/user-guide/articles/1750735898-purchasing-a-paid-self_hosted-chatwoot-license-a-step_by_step-guide

### listmonk
- https://github.com/knadh/listmonk
- https://listmonk.app/docs/
- https://listmonk.app/docs/apis/apis/
- https://listmonk.app/docs/apis/subscribers/
- https://listmonk.app/docs/configuration/

### Penpot
- https://github.com/penpot/penpot
- https://help.penpot.app/technical-guide/getting-started/
- https://help.penpot.app/technical-guide/configuration/
- https://help.penpot.app/plugins/
- https://penpot.app/pricing/self-host

### AnythingLLM
- https://github.com/Mintplex-Labs/anything-llm
- https://docs.anythingllm.com/
- https://docs.anythingllm.com/installation-docker/overview
- https://docs.anythingllm.com/features/all-features
- https://docs.anythingllm.com/agent-flows/overview
- https://github.com/Mintplex-Labs/anything-llm/blob/master/LICENSE

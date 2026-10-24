# Repo Verification

As of: 2026-06-09

| Project | Repo | License | Stars | Forks | Release | Commit Activity | Adoption |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PostHog | https://github.com/PostHog/posthog | MIT Expat for repo content outside ee; enterprise code under separate license | 34.9k | 2.8k | posthog-cli/v0.7.21, 2026-06-05 | 2026-06-09T10:18:10Z via partial GitHub API before rate limit | Prototype immediately, but prefer cloud or isolated hobby deploy until event volume and privacy policy are clear |
| Langfuse | https://github.com/langfuse/langfuse | MIT core outside ee/web/src/ee/worker/src/ee; enterprise modules require commercial license | 28.7k | 3.0k | v3.179.1, 2026-06-08 | 2026-06-09T10:03:53Z via partial GitHub API before rate limit | Prototype now for internal AI/RAG systems; never log founder-only corpora without redaction policy |
| n8n | https://github.com/n8n-io/n8n | Sustainable Use License for non-ee code; source-available/fair-code, not normal OSI OSS; ee files require enterprise license | 191.7k | 58.4k | n8n@2.23.4, 2026-06-05 | 2026-06-09T10:12:59Z via partial GitHub API before rate limit | Internal-only isolated automation lab; do not host workflows for external clients without legal review |
| Novu | https://github.com/novuhq/novu | MIT core plus enterprise/proprietary folders and ee packages under separate licenses | 39.1k | 4.3k | v3.17.0, 2026-06-01 | GitHub page active as of 2026-06-09; exact commit not API-verified after rate limit | Prototype after event taxonomy; use API/cloud first, self-host only after deliverability/security review |
| Payload | https://github.com/payloadcms/payload | MIT | 42.6k | 3.7k | GitHub releases active; exact latest release not API-verified after rate limit | GitHub page active as of 2026-06-09; exact commit not API-verified after rate limit | Adopt only in the real Next.js app clone after schema/design approval; do not add dependency in this control workspace |
| Dub | https://github.com/dubinc/dub | AGPLv3 core with ee folders under commercial license | 23.7k | 3.0k | No clear latest release from GitHub page; active main branch | GitHub page active as of 2026-06-09; exact commit not API-verified after rate limit | Use cloud/API or pattern first; self-host later only if AGPL obligations and infra burden are accepted |
| Formbricks | https://github.com/formbricks/formbricks | AGPLv3 core plus enterprise modules under separate license; no white-label resale | 12.4k | 2.3k | GitHub releases active; exact latest release not API-verified after rate limit | GitHub page active as of 2026-06-09; exact commit not API-verified after rate limit | Start with cloud/API or isolated self-host; never embed white-labeled survey editor in product without approval |
| Trigger.dev | https://github.com/triggerdotdev/trigger.dev | Apache-2.0 | 15.3k | 1.3k | trigger.dev v4.4.6, 2026-05-12 | GitHub page active as of 2026-06-09; exact commit not API-verified after rate limit | Use SDK/cloud prototype in real app clone; self-host later only for residency/control reasons |
| Unkey | https://github.com/unkeyed/unkey | AGPLv3 for main repo outside package-specific exceptions | 5.3k | 621 | control-api v1.0.2, 2026-06-08 | GitHub page active as of 2026-06-09; exact commit not API-verified after rate limit | Pattern now, API/cloud prototype later; self-host/fork only after AGPL and auth review |
| SigNoz | https://github.com/SigNoz/signoz | MIT Expat outside ee/cmd/enterprise; enterprise code under separate license | 22k+ from search snapshot; GitHub page current count not fully captured after API limit | 1.6k+ from search snapshot; exact current not API-verified | GitHub releases active; exact latest release not API-verified after rate limit | GitHub page active as of 2026-06-09; exact commit not API-verified after rate limit | Pattern and cloud/prototype first; self-host once platform/service count justifies operations |

## Verification Notes

- PostHog, Langfuse, and n8n metadata was pulled through GitHub REST before unauthenticated rate limits.
- Novu, Payload, Dub, Formbricks, Trigger.dev, Unkey, and SigNoz were verified through GitHub HTML pages, raw license files, official docs, and search snapshots.
- Exact star/release counts should be refreshed before publishing externally.
- None of these repos were cloned, installed, or executed.

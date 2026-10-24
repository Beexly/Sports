# Decision Matrix - Next-Wave OSS Stack

As of: 2026-06-09

## P0 - Prototype Immediately

| Repo | Why | First Packet | Boundary |
| --- | --- | --- | --- |
| PostHog | Fastest path to measured conversion, retention, pricing, and product learning. | NEXT-001 | Privacy/redaction first; no raw PII/session replay until approved. |
| Payload | Strongest upgrade for branded marketing, content velocity, trust pages, and editorial control. | NEXT-025 | Real app clone only; no dependency install in this control workspace. |
| Trigger.dev | Turns GSE into an autonomous worker platform for reports, alerts, ingestion, and retries. | NEXT-043 | Fake data first; every job idempotent. |
| Langfuse | Required if GSE uses AI seriously across research, support, and forecasting. | NEXT-007 | Redact prompts/context; keep founder methods separate. |

## P1 - Strong, Validate Before Production

| Repo | Why | First Packet | Boundary |
| --- | --- | --- | --- |
| Dub | Makes every campaign, creator, partner, and enterprise link attributable. | NEXT-031 | AGPL/open-core review before self-host or modification. |
| Formbricks | Converts onboarding, pricing objections, churn, and feedback into structured product intelligence. | NEXT-037 | AGPL/enterprise boundary; customer PII controls. |
| Novu | Best candidate for preference-aware customer alerts, digests, and agent communication. | NEXT-019 | Messaging compliance, provider secrets, and preference gates first. |

## P2 - Architecture Now, Build Later

| Repo | Why | First Packet | Boundary |
| --- | --- | --- | --- |
| n8n | Huge automation leverage, but high credential/license/security blast radius. | NEXT-013 | Internal-only isolated lab; no external/client workflow hosting. |
| Unkey | Best path toward PRO/ELITE/enterprise API access and quotas. | NEXT-049 | Auth-critical; AGPL; do not self-host/fork without legal/security review. |
| SigNoz | Strong observability layer once the platform has enough services/jobs to justify it. | NEXT-055 | Telemetry PII and storage cost review first. |

## Recommended Build Order

1. NEXT-001 PostHog privacy-first web analytics baseline
2. NEXT-002 GSE event taxonomy for FREE/PRO/ELITE
3. NEXT-005 Session replay redaction policy and kill switch
4. NEXT-025 Payload marketing CMS schema
5. NEXT-026 GSE content model: pages, reports, explainers
6. NEXT-043 Trigger.dev sports data ingestion jobs
7. NEXT-007 Langfuse trace schema for every AI call
8. NEXT-011 LLM trace redaction middleware
9. NEXT-031 Dub branded link domain plan
10. NEXT-037 Onboarding survey layer

## Do Not Start With

- Full self-hosting of all ten tools.
- Public AI assistant tied to private corpora.
- n8n production automations with real credentials.
- AGPL/SUL forks or embedded product features.
- Live outbound notifications before preference and compliance gates.
- Production observability logging full request bodies or user secrets.

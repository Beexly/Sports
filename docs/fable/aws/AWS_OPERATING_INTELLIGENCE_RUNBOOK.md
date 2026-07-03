# AWS Operating Intelligence Runbook

Updated: 2026-07-03

Command:

```bash
npm run fable:aws-intel
```

Purpose:
- verify required AWS learning, guardrail, agent, metric, data, app, machine, pressure, and technique docs exist.
- validate the personal AWS learning evidence example.
- emit a machine-readable local status report.
- confirm the report itself performs no live AWS action and uses no paid resource.

Expected output shape:

```json
{
  "status": "ok",
  "live_aws_action": false,
  "paid_resource_used": false,
  "docs_required": 17,
  "docs_present": 17,
  "category_counts": {
    "agents": 2,
    "apps": 1,
    "data": 1,
    "guardrails": 4,
    "learning": 4,
    "machines": 1,
    "metrics": 1,
    "pressure": 2,
    "techniques": 1
  }
}
```

Failure conditions:
- a required AWS operating intelligence doc is missing.
- the learning evidence example fails schema validation.
- the script cannot read the checked-in repo files.

Boundary:
- no AWS CLI call.
- no credentials.
- no network.
- no deploy.
- no paid resource.

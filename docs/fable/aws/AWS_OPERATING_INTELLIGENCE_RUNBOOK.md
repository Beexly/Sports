# AWS Operating Intelligence Runbook

Updated: 2026-07-03

Command:

```bash
npm run fable:aws-intel
```

Purpose:
- verify required AWS learning, guardrail, agent, metric, data, app, machine, pressure, and technique docs exist.
- validate the personal AWS learning evidence example.
- validate the local AWS fixture library for no-cost mocks and Well-Architected pillar coverage.
- validate the Shadow Control Tower governance OS blueprint.
- emit a machine-readable local status report.
- confirm the report itself performs no live AWS action and uses no paid resource.

Expected output shape:

```json
{
  "status": "ok",
  "live_aws_action": false,
  "paid_resource_used": false,
  "docs_required": 19,
  "docs_present": 19,
  "category_counts": {
    "agents": 2,
    "apps": 1,
    "data": 1,
    "fixtures": 1,
    "governance": 1,
    "guardrails": 4,
    "learning": 4,
    "machines": 1,
    "metrics": 1,
    "pressure": 2,
    "techniques": 1
  },
  "learning_evidence": {
    "entries": 3,
    "owner_approved_for_public_use": 0,
    "no_secrets_confirmed": 3,
    "no_paid_resource_confirmed": 3
  },
  "fixture_library": {
    "fixtures": 5,
    "well_architected_pillars_covered": 6
  },
  "governance_os": {
    "shadow_guardrails": 6,
    "preventive_controls": 2,
    "detective_controls": 2,
    "proactive_controls": 2,
    "well_architected_lens_checks": 6
  }
}
```

Failure conditions:
- a required AWS operating intelligence doc is missing.
- the learning evidence example fails schema validation.
- the fixture library is missing a required fixture type.
- the fixture library fails to cover all six Well-Architected pillars.
- the Shadow Control Tower blueprint is missing a control type, pillar, self-explaining agent, drift card, Clean Rooms scenario, or CDK synth fixture.
- the script cannot read the checked-in repo files.

Boundary:
- no AWS CLI call.
- no credentials.
- no network.
- no deploy.
- no paid resource.

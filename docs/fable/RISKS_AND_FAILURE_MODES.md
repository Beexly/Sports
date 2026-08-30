# Risks And Failure Modes

Risk: source rights drift.
Mitigation: keep source use tied to `source-rights-registry.ts`, not scattered docs.

Risk: metric proof inflation.
Mitigation: require command output or replay reports before performance claims.

Risk: AWS cost activation by accident.
Mitigation: `apps/web/lib/fable/aws-gates.ts` defaults actions off and requires explicit env gates.

Risk: sensitive segment misuse.
Mitigation: `assessSafeFootballSegmentParity` blocks non-football segments.

Risk: local labeling confused with vendor jobs.
Mitigation: manifests are `provider: local` and `priced: false`.

Risk: docs becoming marketing copy.
Mitigation: `apps/web/lib/fable/claim-scanner.ts` scans for unsupported phrases outside code spans.

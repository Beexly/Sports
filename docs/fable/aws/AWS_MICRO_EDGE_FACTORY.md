# AWS Micro-Edge Factory

Updated: 2026-07-03

Purpose: produce small, falsifiable sports-intelligence advantages from public-safe or synthetic data before any cloud spend.

## Factory Loop

1. Candidate
   - define the edge hypothesis.
   - name the source.
   - mark rights status.
2. Local fixture
   - build a small public-safe or synthetic fixture.
   - document what it cannot prove.
3. Metric
   - choose one metric: calibration delta, freshness gap, entropy, contradiction rate, no-action rate, or replay error.
4. Falsification
   - define the kill rule before testing.
5. AWS mapping
   - map a future AWS service only if local proof survives.
6. Publication
   - publish the artifact only if it is source-safe and caveated.

## Candidate Matrix

| Candidate | Local signal | Future AWS fit | Local test | Kill rule |
| --- | --- | --- | --- | --- |
| source freshness decay | stale timestamp versus model error | S3/Athena later | local timestamp replay | no out-of-sample separation |
| roster shock | transaction timestamp versus role feature | Glue/Athena later | local event join | unstable across windows |
| depth-chart instability | depth change count versus uncertainty | SageMaker feature registry later | fixture bucket test | no monotonic uncertainty lift |
| contradiction queue | conflicting public facts | AgentCore reviewer later | deterministic rule queue | contradictions do not predict correction |
| schedule fatigue | rest/travel/body-clock bucket | Athena later | schedule feature card | no baseline improvement |
| market-open event delta | event before market snapshot | Clean Rooms later with partner aggregate | fixture forensic report | timing does not precede movement |
| no-action gate | low data quality or high uncertainty | CloudWatch-style monitor later | no-action report | gate does not reduce bad recommendations |

## AWS Mapping Rules

- S3/Athena only after storage rights and volume justify it.
- SageMaker only after local artifacts are reproducible.
- Bedrock/AgentCore only after deterministic reviewers are insufficient.
- Clean Rooms only after a partner and legal basis exist.
- CloudWatch/Cost tools only after live AWS workloads exist.

## Factory Output Template

- candidate id:
- source rights:
- fixture path:
- local command:
- metric:
- baseline:
- result:
- kill rule:
- AWS service that could help later:
- owner decision:
- next action:

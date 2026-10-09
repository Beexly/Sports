1.  **Modify `nflverse-pbp-mapper.ts`**:
    *   Add `receiver_player_name` and `air_yards` to the `NFLVERSE_PBP_EXPECTED_METRICS_COLUMNS` array.
2.  **Create `packages/prediction-engine/src/expected-metrics/receiver-usage.ts`**:
    *   Implement the receiver usage module. We will define an interface for `ReceiverTarget` mapping the relevant fields from `PbpRow`.
    *   Compute `targetShare`, `deepTargetShare`, and `redZoneTargetShare`.
    *   Compute `targetDominance` as a weighted composite of the three (e.g. 50% target, 25% deep, 25% RZ) and clearly document it in the code comments.
    *   Define the rolling windows: 4 games, 8 games, and season.
    *   Enforce point-in-time discipline: A week-N record must never see targets from weeks >= N.
    *   Apply shrinkage on small samples and enforce the 15-target floor.
    *   Ensure the RZ component integrates logic from `signals/efficiency/redzone-te-leverage.ts`.
3.  **Write tests in `packages/prediction-engine/src/expected-metrics/__tests__/receiver-usage.test.ts`**:
    *   Assert hand-calculable sample plays match exactly.
    *   Verify the composite formula.
    *   Test point-in-time discipline (week N excludes targets >= N).
    *   Ensure the 15-target floor returns null for insufficient targets.
    *   Verify reuse of `redzone-te-leverage.ts` (mock/spy/assert its helper is used).
4.  **Register the metric**:
    *   Add a birth certificate entry in `packages/prediction-engine/src/metrics/core/metric-birth-certificate-registry.ts`.
    *   Include tests for the birth certificate registry.
5.  **Export the module**:
    *   Export the new module in `packages/prediction-engine/src/expected-metrics/index.ts`.
    *   Export it in the main package index `packages/prediction-engine/src/index.ts`.
6.  **Pre-commit steps**:
    *   Ensure proper testing, verification, review, and reflection are done using `pre_commit_instructions`.
7.  **Submit the change**:
    *   Submit the change via PR (using `AUTO_CREATE_PR`), ensure tests are green.
    *   Write closing notes in `AGENTS.md` and the agent bus outbox (`~/workspace/vendor/agent-bus/outbox/from-jules/receiver-usage-2026-10-09.md`).

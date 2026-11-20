# Reusable GKE GPU / TPU Host-Maintenance Disruption Runbook

Use this runbook to diagnose whether an unexpected GPU or TPU workload disruption, node crash, or eviction on Google Kubernetes Engine (`GKE`) was caused by Compute Engine host maintenance, and to apply the mandatory workload protection triad.

## Step 0: Required Investigation Context (Acquire Before Live Debugging)

Before diagnosing an actual cluster incident (outside generic runbook inspection), collect:

- **Mandatory:** `project_id`, `location` (region or zone), `cluster_name`, `timestamp` (UTC window of the disruption)
- **Optional:** `node_name`, `workload_name`, `workload_namespace`, `nodepool_name`

## Step 1: Check for Upcoming Scheduled Maintenance (`kubectl`)

Inspect cluster nodes for the GKE scheduled-maintenance label:

```bash
kubectl get nodes -l cloud.google.com/scheduled-maintenance-time -L cloud.google.com/scheduled-maintenance-time
```

- **Interpretation:** `SCHEDULED-MAINTENANCE-TIME` prints the Unix epoch timestamp of upcoming VM maintenance. When present, a host-maintenance disruption is scheduled and guaranteed to occur.

## Step 2: Query Cloud Monitoring (PromQL)

Evaluate node and node-pool interruption counters filtered strictly to `interruption_reason="HW/SW Maintenance"`:

```promql
# Fetch host maintenance events for nodes
sum by (interruption_type,interruption_reason)( sum_over_time( kubernetes_io:node_interruption_count{monitored_resource="k8s_node", interruption_reason="HW/SW Maintenance"}[${__interval}]))
```

```promql
# See the interruption count aggregated by node pool
sum by (node_pool_name,interruption_type,interruption_reason)( sum_over_time( kubernetes_io:node_pool_interruption_count{monitored_resource="k8s_node_pool", interruption_reason="HW/SW Maintenance", node_pool_name="{nodepool_name}" }[${__interval}]))
```

- **Interpretation:** Values `> 0` for `interruption_reason="HW/SW Maintenance"` confirm the underlying Compute Engine VM experienced scheduled host maintenance.

## Step 3: Check Cloud Logging & Node Taints

1. **Cloud Logging filter:** Query GKE cluster/VM logs around `timestamp` for occurrences where `cloud.google.com/active-node-maintenance` equals `ONGOING` (indicating GKE actively stopped workloads for host maintenance).
2. **Node cordoning & taint check:** Inspect node conditions and taints (`kubectl describe node <node_name>` or GKE event logs) for:

```text
cloud.google.com/impending-node-termination:NoSchedule
```

- **Critical warning:** GKE applies this taint when cordoning a terminating node so new Pods do not land on it. **NEVER** add a toleration for `cloud.google.com/impending-node-termination:NoSchedule` to your workload specs.

## Step 4: Conclusion, Negative-Findings Rule-Out & Mitigation Triad

### Decision & Negative-Findings Rule-Out

- **Maintenance Confirmed:** If Step 1 labels, Step 2 PromQL interruption counts (`> 0`), or Step 3 `ONGOING` logs / impending-termination taints are present, report high-signal findings confirming Compute Engine host maintenance disrupted the GPU/TPU nodes (avoid raw log dumps).
- **Maintenance Ruled Out:** If scheduled-maintenance node labels, PromQL `HW/SW Maintenance` interruption counts, and active maintenance logs are all negative/empty, definitively conclude that Compute Engine host maintenance did **not** cause the disruption. Pivot investigation to application-level causes (`OOMKill` events, CUDA/XLA runtime faults, container exit codes, or CPU/memory resource limits) rather than host-maintenance mitigations.

### Mandatory Workload Protection Triad

Whenever host maintenance is confirmed or anticipated on GPU/TPU node pools, configure all three complementary protections together:

1. **Configure Graceful Termination:** Enable GKE GPU/TPU disruption handling (`terminationGracePeriodSeconds` up to `3600` seconds / 60 minutes) and trap `SIGTERM` in the training/inference entrypoint to flush state (for example, checkpointing via Orbax) prior to VM shutdown. See: <https://docs.cloud.google.com/kubernetes-engine/docs/concepts/handle-disruption-gpu-tpu#enabling-handling>
2. **Enable Opportunistic Maintenance:** Configure opportunistic maintenance on GPU/TPU node pools so GKE runs pending host maintenance automatically while nodes are idle instead of preempting active jobs. See: <https://docs.cloud.google.com/kubernetes-engine/docs/concepts/handle-disruption-gpu-tpu#opportunistic-maintenance>
3. **Configure PodDisruptionBudgets (`PDBs`):** Define a `PodDisruptionBudget` enforcing `minAvailable` replicas across inference/serving deployments to bound concurrent evictions during maintenance windows.

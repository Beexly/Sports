# nflverse DML reachability

Probe results (curl -I --max-time 20):
- injuries_2025.csv: HTTP 302 (reachable, redirect to release-assets)
- sched_2025.csv: HTTP 404 (not found)

BLOCKED: nflverse fetch sched_2025.csv → 404. The injuries URL redirects but the schedule URL does not exist for 2025. Both must be reachable to proceed; since one failed, no IRM-on-real-rows implementation is attempted this overnight. R-10 synthetic stands (ATT -0.0111, CI includes 0).

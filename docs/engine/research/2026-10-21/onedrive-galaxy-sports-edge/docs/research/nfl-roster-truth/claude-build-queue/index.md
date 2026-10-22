# NFL Roster Truth Claude Build Queue

As of: 2026-06-09

| ID | Title | Category | Gate | Priority | Difficulty |
| --- | --- | --- | --- | --- | --- |
| BUILD-NRT-001 | Roster source inventory and TOS matrix | source inventory | DEPENDENCY | P0 | S |
| BUILD-NRT-002 | Official team roster adapter contract | source adapter architecture | DEPENDENCY | P0 | M |
| BUILD-NRT-003 | NFL.com roster adapter probe | official roster adapter | EXTENSION | P0 | L |
| BUILD-NRT-004 | NFL.com transaction adapter probe | transaction adapter | EXTENSION | P0 | L |
| BUILD-NRT-005 | Official team staff source map | staff source inventory | NET_NEW | P1 | M |
| BUILD-NRT-006 | Official media guide staff policy | staff source inventory | NET_NEW | P2 | M |
| BUILD-NRT-007 | nflverse roster adapter | nflverse adapter | EXTENSION | P0 | M |
| BUILD-NRT-008 | nflverse player ID map adapter | identity resolution | EXTENSION | P0 | M |
| BUILD-NRT-009 | nflverse depth chart adapter evaluation | depth chart adapter | EXTENSION | P1 | M |
| BUILD-NRT-010 | ESPN fallback adapter legal evaluation | fallback adapter | DEPENDENCY | P1 | S |
| BUILD-NRT-011 | CBS Yahoo FOX fallback adapter evaluation | fallback adapter | DEPENDENCY | P2 | S |
| BUILD-NRT-012 | Sleeper fantasy player pool adapter evaluation | fantasy player pool adapter | EXTENSION | P2 | M |
| BUILD-NRT-013 | PFR historical identity reference policy | identity reference | EXTENSION | P2 | S |
| BUILD-NRT-014 | Prohibited source and robots review list | legal / TOS | DEPENDENCY | P0 | S |
| BUILD-NRT-015 | Canonical person universe schema | person model | NET_NEW | P0 | M |
| BUILD-NRT-016 | Canonical external ID table | identity resolution | EXTENSION | P0 | M |
| BUILD-NRT-017 | Alias and fuzzy matching rules | identity resolution | EXTENSION | P0 | M |
| BUILD-NRT-018 | Same-name hard no-merge regression tests | identity tests | EXTENSION | P0 | M |
| BUILD-NRT-019 | Rookie and UDFA manual review queue | identity workflow | EXTENSION | P1 | M |
| BUILD-NRT-020 | Staff identity model | staff model | NET_NEW | P1 | M |
| BUILD-NRT-021 | Team abbreviation normalization map | team normalization | EXTENSION | P0 | S |
| BUILD-NRT-022 | Roster status normalization taxonomy | status normalization | EXTENSION | P0 | S |
| BUILD-NRT-023 | Position normalization taxonomy | position normalization | EXTENSION | P0 | S |
| BUILD-NRT-024 | Depth chart role taxonomy | depth chart normalization | EXTENSION | P1 | S |
| BUILD-NRT-025 | Jersey assignment evidence model | jersey validation | NET_NEW | P0 | M |
| BUILD-NRT-026 | Source evidence storage contract | source evidence | EXTENSION | P0 | M |
| BUILD-NRT-027 | Raw source snapshot format | snapshot storage | EXTENSION | P0 | M |
| BUILD-NRT-028 | Canonical fact table design | truth storage | NET_NEW | P0 | M |
| BUILD-NRT-029 | Truth confidence scoring engine | truth scoring | EXTENSION | P0 | L |
| BUILD-NRT-030 | Fact conflict detection engine | conflict detection | EXTENSION | P0 | L |
| BUILD-NRT-031 | Fact stale detection engine | stale detection | EXTENSION | P0 | M |
| BUILD-NRT-032 | Transaction to roster reconciler | transaction tracking | NET_NEW | P0 | L |
| BUILD-NRT-033 | Player moved teams alert | movement alert | EXTENSION | P0 | M |
| BUILD-NRT-034 | Staff role change tracking | staff tracking | NET_NEW | P2 | M |
| BUILD-NRT-035 | Practice squad and reserve mapper | status normalization | NET_NEW | P0 | M |
| BUILD-NRT-036 | Injury and practice report boundary | injury/availability | EXTENSION | P1 | M |
| BUILD-NRT-037 | Public player card remediation map | product remediation | EXTENSION | P0 | M |
| BUILD-NRT-038 | Player Lab roster truth remediation | product remediation | EXTENSION | P0 | M |
| BUILD-NRT-039 | GSE Rating roster context remediation | product remediation | EXTENSION | P0 | M |
| BUILD-NRT-040 | Search autocomplete stale-team guard | product remediation | NET_NEW | P0 | M |
| BUILD-NRT-041 | Team page roster rendering contract | product remediation | NET_NEW | P1 | M |
| BUILD-NRT-042 | Content and brief roster mention linter | content validation | EXTENSION | P1 | M |
| BUILD-NRT-043 | Roster public API response contract | API contract | EXTENSION | P0 | M |
| BUILD-NRT-044 | Public last-verified label | public freshness | EXTENSION | P1 | S |
| BUILD-NRT-045 | Founder roster accuracy cockpit | founder cockpit | EXTENSION | P0 | L |
| BUILD-NRT-046 | Manual roster review queue | manual review | EXTENSION | P0 | M |
| BUILD-NRT-047 | Roster source failure log | source monitoring | EXTENSION | P0 | M |
| BUILD-NRT-048 | Roster parser error report | parser monitoring | EXTENSION | P1 | M |
| BUILD-NRT-049 | Roster truth health score | accuracy score | EXTENSION | P0 | M |
| BUILD-NRT-050 | Data quality CLI command spec | validation CLI | DEPENDENCY | P0 | S |
| BUILD-NRT-051 | pnpm roster:audit read-only script | validation script | EXTENSION | P0 | M |
| BUILD-NRT-052 | pnpm roster:verify read-only script | validation script | EXTENSION | P0 | M |
| BUILD-NRT-053 | pnpm roster:diff read-only script | validation script | EXTENSION | P1 | M |
| BUILD-NRT-054 | pnpm roster:conflicts read-only script | validation script | EXTENSION | P0 | M |
| BUILD-NRT-055 | pnpm roster:stale read-only script | validation script | EXTENSION | P0 | M |
| BUILD-NRT-056 | pnpm test:roster regression harness | regression tests | EXTENSION | P0 | M |
| BUILD-NRT-057 | Najee Harris and Rico Dowdle dynamic smoke tests | regression tests | EXTENSION | P0 | S |
| BUILD-NRT-058 | No mock roster data public leak gate | deploy gate | REPLACEMENT | P0 | M |
| BUILD-NRT-059 | Roster data quality CI gate | deploy gate | EXTENSION | P0 | L |
| BUILD-NRT-060 | Nightly roster audit plan | scheduled audit | DEPENDENCY | P1 | M |
| BUILD-NRT-061 | Post-deploy roster audit plan | postdeploy audit | EXTENSION | P1 | M |
| BUILD-NRT-062 | Roster truth backup and rollback strategy | rollback | NET_NEW | P0 | S |
| BUILD-NRT-063 | Public-private roster evidence boundary | public/private boundary | EXTENSION | P0 | S |
| BUILD-NRT-064 | Legal TOS and source approval workflow | legal / TOS | DEPENDENCY | P0 | S |
| BUILD-NRT-065 | Source ownership and refresh cadence | operations | EXTENSION | P1 | S |
| BUILD-NRT-066 | Roster source outage customer messaging | support / trust | EXTENSION | P1 | S |
| BUILD-NRT-067 | Season-state threshold policy | data quality thresholds | NET_NEW | P1 | M |
| BUILD-NRT-068 | Roster truth implementation handoff packet | handoff | DEPENDENCY | P0 | S |


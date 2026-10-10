#!/usr/bin/env python3
"""
Analyze flow_warehouse.jsonl to compute first-mover counts per provider.
For each (game_key, market) with at least two distinct snapshots,
look at the earliest two snapshots.
If exactly one provider changed price between those snapshots,
credit that provider as first mover.
Output counts per provider.
"""
import json
import sys
import os
from collections import defaultdict

def main():
    jsonl_path = "/var/minis/workspace/pump/flow_warehouse.jsonl"
    if not os.path.exists(jsonl_path):
        print(f"ERROR: {jsonl_path} not found", file=sys.stderr)
        sys.exit(1)
    # Read all lines
    rows = []
    with open(jsonl_path, 'r') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError as e:
                print(f"WARN: Skipping invalid JSON line: {e}", file=sys.stderr)
    if not rows:
        print("ERROR: No rows found", file=sys.stderr)
        sys.exit(1)
    # Group by (game_key, market)
    groups = defaultdict(list)  # key -> list of rows
    for r in rows:
        key = (r.get('game_key'), r.get('market'))
        groups[key].append(r)
    # For each group, sort by observed_at
    first_mover_counts = defaultdict(int)
    total_groups_with_two = 0
    total_pairs_analyzed = 0
    for (game_key, market), entries in groups.items():
        # Sort by observed_at (float)
        entries_sorted = sorted(entries, key=lambda x: x.get('observed_at', 0))
        if len(entries_sorted) < 2:
            continue
        # We only need first two distinct timestamps
        first = entries_sorted[0]
        second = entries_sorted[1]
        # Ensure timestamps differ
        if first.get('observed_at') == second.get('observed_at'):
            # Maybe there are duplicate timestamps; look for next distinct
            i = 1
            while i < len(entries_sorted) and entries_sorted[i].get('observed_at') == first.get('observed_at'):
                i += 1
            if i >= len(entries_sorted):
                continue
            second = entries_sorted[i]
        total_groups_with_two += 1
        # Build price maps
        price_first = {}
        price_second = {}
        for e in entries_sorted:
            provider = e.get('provider')
            price = e.get('price')
            if provider is None or price is None:
                continue
            # Store price per provider; if multiple entries for same provider (different markets?) but we are within same market already.
            # We'll just take the first encountered.
            if provider not in price_first:
                price_first[provider] = price
            # For second timestamp, we need price from second snapshot only.
            # Actually we need price at first and second snapshot for each provider.
        # Simpler: collect prices for first and second snapshot separately
        price_first = {e['provider']: e['price'] for e in entries_sorted if e.get('observed_at') == first.get('observed_at') and e.get('provider') is not None and e.get('price') is not None}
        price_second = {e['provider']: e['price'] for e in entries_sorted if e.get('observed_at') == second.get('observed_at') and e.get('provider') is not None and e.get('price') is not None}
        # Determine providers present in both snapshots
        common_providers = set(price_first.keys()) & set(price_second.keys())
        changed_providers = []
        for prov in common_providers:
            if price_first[prov] != price_second[prov]:
                changed_providers.append(prov)
        if len(changed_providers) == 1:
            first_mover_counts[changed_providers[0]] += 1
            total_pairs_analyzed += 1
        # else: ignore (zero or multiple changers)
    # Output results
    print("=== First-mover analysis ===")
    print(f"Total rows processed: {len(rows)}")
    print(f"Unique (game_key, market) groups: {len(groups)}")
    print(f"Groups with at least two distinct timestamps: {total_groups_with_two}")
    print(f"Pairs where exactly one provider changed (first-mover identifiable): {total_pairs_analyzed}")
    print("\nFirst-mover counts per provider:")
    for prov, count in sorted(first_mover_counts.items(), key=lambda x: (-x[1], x[0])):
        print(f"  {prov}: {count}")
    # Also output as JSON for possible further use
    output_path = "/var/minis/workspace/pump/first_mover_counts.json"
    with open(output_path, 'w') as f:
        json.dump(first_mover_counts, f, indent=2)
    print(f"\nSaved JSON to {output_path}")

if __name__ == '__main__':
    main()
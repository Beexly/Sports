import json
import re
from collections import defaultdict

def normalize_formula(formula):
    if not formula:
        return ""
    # Remove inline comments and block comments
    formula = re.sub(r'/\*.*?\*/', '', formula)
    formula = re.sub(r'//.*$', '', formula, flags=re.MULTILINE)
    # Remove all whitespace
    formula = re.sub(r'\s+', '', formula)
    return formula

def main():
    catalog_path = "data/equations/equation_executable_catalog_12304.json"
    with open(catalog_path, 'r') as f:
        catalog = json.load(f)

    equations = catalog.get('equations', [])

    formula_clusters = defaultdict(list)

    for eq in equations:
        eq_id = eq.get('equation_id')
        formula = eq.get('formula_expression', '')
        norm = normalize_formula(formula)
        if norm:
            formula_clusters[norm].append(eq_id)

    with open('docs/wiring/qa/DUPLICATE-CLUSTERS.md', 'a') as f:
        cluster_count = 1
        for formula, ids in formula_clusters.items():
            if len(ids) > 1:
                f.write(f"### Cluster {cluster_count} (Count: {len(ids)})\n")
                f.write(f"- Formula (Normalized): `{formula}`\n")
                f.write(f"- Equations: {', '.join(ids)}\n\n")
                cluster_count += 1

    print(f"Found {cluster_count - 1} clusters")

if __name__ == "__main__":
    main()
